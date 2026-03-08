"""
RSS + newspaper4k article fetching logic with retry support.
"""

import asyncio
import logging
import random
import re
import threading
from datetime import datetime, timezone
from typing import Optional
import feedparser
import httpx
from newspaper import Article
from pocketbase import pb
from config import MAX_ARTICLES_PER_FEED, PROXY_API_KEY, PROXY_API_BASE

logger = logging.getLogger(__name__)

_sem = asyncio.Semaphore(4)

MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 2  # seconds — delays: 2, 4

# Rotate through realistic browser User-Agent strings to reduce soft blocks
_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
]

_BROWSER_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.google.com/",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}


# ── Proxy pool ────────────────────────────────────────────────────────────────
# Cache a single proxy and reuse it across articles to minimise pool API calls.
# threading.Lock works from both async context and executor threads.

_proxy_lock = threading.Lock()
_proxy_cached: Optional[str] = None
_proxy_uses: int = 0
_PROXY_MAX_USES = 15  # reuse the same proxy for up to this many articles


async def _get_proxy() -> Optional[str]:
    """Return a cached proxy or fetch a fresh one from the pool."""
    global _proxy_cached, _proxy_uses
    with _proxy_lock:
        if _proxy_cached and _proxy_uses < _PROXY_MAX_USES:
            _proxy_uses += 1
            return _proxy_cached
    # Fetch outside the lock so we don't block other coroutines
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(
                f"{PROXY_API_BASE}/get_proxy",
                params={"api_key": PROXY_API_KEY},
            )
            r.raise_for_status()
            proxy = r.json().get("proxy")
        with _proxy_lock:
            _proxy_cached = proxy
            _proxy_uses = 1
        logger.debug("Fetched fresh proxy %s", proxy)
        return proxy
    except Exception as e:
        logger.debug("Proxy pool unavailable: %s", e)
        return None


def _sync_ban_proxy(proxy: str) -> None:
    """Report a bad proxy and clear the cache (sync, runs inside executor)."""
    global _proxy_cached, _proxy_uses
    with _proxy_lock:
        if _proxy_cached == proxy:
            _proxy_cached = None
            _proxy_uses = 0
    try:
        with httpx.Client(timeout=5) as client:
            client.post(
                f"{PROXY_API_BASE}/ban_proxy",
                data={"api_key": PROXY_API_KEY, "proxy_ips": proxy},
            )
        logger.debug("Banned proxy %s", proxy)
    except Exception:
        pass


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_date(entry) -> Optional[str]:
    """Extract ISO date from feed entry."""
    for field in ("published_parsed", "updated_parsed", "created_parsed"):
        val = getattr(entry, field, None)
        if val:
            try:
                dt = datetime(*val[:6], tzinfo=timezone.utc)
                return dt.isoformat()
            except Exception:
                pass
    return datetime.now(timezone.utc).isoformat()


def _first_image(entry) -> Optional[str]:
    """Try to extract an image URL from a feed entry."""
    # media:content
    media = getattr(entry, "media_content", [])
    for m in media:
        if isinstance(m, dict) and m.get("url") and m.get("type", "").startswith("image"):
            return m["url"]
    # enclosures
    for enc in getattr(entry, "enclosures", []):
        if isinstance(enc, dict) and enc.get("type", "").startswith("image"):
            return enc.get("href") or enc.get("url")
    # og:image in summary
    summary = getattr(entry, "summary", "") or ""
    m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', summary)
    if m:
        return m.group(1)
    return None


def _clean_html(html: str) -> str:
    """Strip HTML tags for a plain text description."""
    return re.sub(r"<[^>]+>", "", html or "").strip()[:500]


# ── Article download ──────────────────────────────────────────────────────────

async def _extract_article(url: str) -> dict:
    """
    Download and parse a full article with retries.

    Strategy (minimises proxy pool calls):
      Attempt 1 — direct, no proxy.
      Attempt 2 — fetch one cached proxy; try with proxy.
                  If proxy itself errors, ban it and retry direct.
      Attempt 3 — direct again (proxy already exhausted/banned).
    """
    loop = asyncio.get_event_loop()
    last_exc: Optional[Exception] = None
    proxy: Optional[str] = None

    for attempt in range(MAX_RETRIES):
        # Only fetch a proxy on the second attempt (first is always direct)
        if attempt == 1 and proxy is None:
            proxy = await _get_proxy()

        try:
            current_proxy = proxy if attempt == 1 else None
            return await loop.run_in_executor(None, _download_article, url, current_proxy)
        except Exception as e:
            last_exc = e
            if attempt == MAX_RETRIES - 1:
                break
            # Ban the proxy if it was used and failed on attempt 2
            if attempt == 1 and proxy:
                await loop.run_in_executor(None, _sync_ban_proxy, proxy)
                proxy = None
            delay = RETRY_BACKOFF_BASE * (2 ** attempt)
            logger.warning(
                "Article download %s failed (attempt %d/%d): %s — retrying in %ds",
                url, attempt + 1, MAX_RETRIES, e, delay,
            )
            await asyncio.sleep(delay)

    logger.warning("Article download %s failed after %d attempts: %s", url, MAX_RETRIES, last_exc)
    return {}


def _download_article(url: str, proxy: Optional[str] = None) -> dict:
    """
    Synchronous newspaper4k download (runs in executor). Raises on failure.

    Pre-fetches HTML with httpx (optionally via proxy) then feeds it to
    newspaper4k for parsing. Falls back to newspaper4k's own HTTP if httpx fails.
    """
    ua = random.choice(_USER_AGENTS)
    headers = {**_BROWSER_HEADERS, "User-Agent": ua}
    html: Optional[str] = None

    # -- httpx pre-fetch (with or without proxy) ------------------------------
    client_kwargs: dict = {"timeout": 15, "follow_redirects": True}
    if proxy:
        proxy_url = f"http://{proxy}"
        client_kwargs["proxies"] = {"http://": proxy_url, "https://": proxy_url}

    try:
        with httpx.Client(**client_kwargs) as client:
            resp = client.get(url, headers=headers)
            resp.raise_for_status()
            html = resp.text
    except Exception as e:
        logger.debug("httpx pre-fetch failed for %s (%s) — falling back to newspaper4k", url, e)
        if proxy:
            raise  # let _extract_article handle ban + retry

    # -- newspaper4k parse ----------------------------------------------------
    a = Article(url, language="en", fetch_images=True, memoize_articles=False,
                browser_user_agent=ua, request_timeout=15)

    if html:
        a.download(input_html=html)
    else:
        a.download()

    a.parse()

    summary = ""
    keywords = ""
    try:
        a.nlp()
        summary = a.summary or ""
        keywords = ", ".join(a.keywords[:10]) if a.keywords else ""
    except Exception:
        pass

    return {
        "content": a.text or "",
        "image_url": a.top_image or "",
        "author": ", ".join(a.authors) if a.authors else "",
        "word_count": len(a.text.split()) if a.text else 0,
        "summary": summary,
        "keywords": keywords,
    }


async def fetch_feed(feed_record: dict) -> int:
    """
    Fetch one RSS feed, extract articles, save to PocketBase.
    Returns the number of new articles saved.
    """
    feed_id = feed_record["id"]
    feed_url = feed_record["url"]
    feed_name = feed_record["name"]
    category = feed_record["category"]
    new_count = 0

    logger.info(f"Fetching feed: {feed_name} ({feed_url})")

    parsed = None
    loop = asyncio.get_event_loop()
    for attempt in range(MAX_RETRIES):
        try:
            parsed = await loop.run_in_executor(None, feedparser.parse, feed_url)
            if parsed.bozo and not parsed.entries:
                raise RuntimeError(f"feedparser bozo: {parsed.bozo_exception}")
            break
        except Exception as e:
            if attempt == MAX_RETRIES - 1:
                logger.error("feedparser error for %s after %d attempts: %s", feed_name, MAX_RETRIES, e)
                return 0
            delay = RETRY_BACKOFF_BASE * (2 ** attempt)
            logger.warning(
                "feedparser %s failed (attempt %d/%d): %s — retrying in %ds",
                feed_name, attempt + 1, MAX_RETRIES, e, delay,
            )
            await asyncio.sleep(delay)

    if parsed is None:
        return 0

    entries = parsed.entries[:MAX_ARTICLES_PER_FEED]

    tasks = [_process_entry(entry, feed_id, category) for entry in entries]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    for r in results:
        if r is True:
            new_count += 1
        elif isinstance(r, Exception):
            logger.warning(f"Entry error: {r}")

    logger.info(f"Feed {feed_name}: {new_count} new articles saved")
    return new_count


async def _process_entry(entry, feed_id: str, category: str) -> bool:
    """Process a single RSS entry. Returns True if a new article was saved."""
    url = getattr(entry, "link", None) or getattr(entry, "id", None)
    if not url or not url.startswith("http"):
        return False

    title = getattr(entry, "title", "") or ""
    if not title:
        return False

    # Check for duplicate (gracefully handle missing/incompatible url field)
    safe_url = url.replace("'", "\\'")
    try:
        existing = await pb.record_exists_by_filter("articles", f"url='{safe_url}'")
        if existing:
            return False
    except httpx.HTTPStatusError as e:
        if e.response.status_code != 400:
            raise
        # 400 means the url field may not exist or is incompatible — skip dedup

    # Fetch full article
    async with _sem:
        extracted = await _extract_article(url)
        await asyncio.sleep(0.5)  # gentle rate limiting

    description_html = (
        getattr(entry, "summary", "")
        or getattr(entry, "description", "")
        or ""
    )
    description = _clean_html(description_html)

    image_url = extracted.get("image_url") or _first_image(entry) or ""
    full_content = extracted.get("content") or ""
    content = full_content or description
    author = extracted.get("author") or getattr(entry, "author", "") or ""
    word_count = extracted.get("word_count") or 0
    summary = extracted.get("summary") or description
    keywords = extracted.get("keywords") or ""
    published_at = _parse_date(entry) or datetime.now(timezone.utc).isoformat()
    has_full_article = bool(full_content and len(full_content) > len(description) + 50)

    try:
        await pb.create_record("articles", {
            "title": title[:500],
            "description": description[:1000],
            "content": content,
            "summary": summary[:2000],
            "keywords": keywords,
            "url": url,
            "image_url": image_url[:2000],
            "published_at": published_at,
            "feed_id": feed_id,
            "category": category,
            "author": author[:200],
            "word_count": word_count,
            "is_read": False,
            "is_saved": False,
            "fetch_status": "full" if has_full_article else "summary",
        })
        return True
    except Exception as e:
        # URL might be duplicate (race condition) or other error
        logger.debug(f"Could not save article {url}: {e}")
        return False


async def fetch_all_active_feeds() -> dict:
    """Fetch all active feeds. Returns summary stats."""
    try:
        result = await pb.list_records("feeds", per_page=200, filter="is_active=true")
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 400:
            logger.warning(
                "Filter 'is_active=true' rejected (field may not exist) — fetching all feeds"
            )
            result = await pb.list_records("feeds", per_page=200)
        else:
            raise
    feeds = result.get("items", [])

    if not feeds:
        logger.info("No active feeds found")
        return {"feeds_processed": 0, "new_articles": 0}

    logger.info(f"Starting fetch for {len(feeds)} active feeds")
    counts = await asyncio.gather(*[fetch_feed(f) for f in feeds])
    total = sum(c for c in counts if isinstance(c, int))
    logger.info(f"Fetch complete: {total} new articles across {len(feeds)} feeds")
    return {"feeds_processed": len(feeds), "new_articles": total}
