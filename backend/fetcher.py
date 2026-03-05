"""
RSS + newspaper4k article fetching logic with retry support.
"""

import asyncio
import logging
import re
from datetime import datetime, timezone
from typing import Optional
import feedparser
import httpx
from newspaper import Article
from pocketbase import pb
from config import MAX_ARTICLES_PER_FEED

logger = logging.getLogger(__name__)

_sem = asyncio.Semaphore(4)

MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 2  # seconds — delays: 2, 4


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


async def _extract_article(url: str) -> dict:
    """Use newspaper4k to download and parse the full article, with retries."""
    loop = asyncio.get_event_loop()
    last_exc: Optional[Exception] = None

    for attempt in range(MAX_RETRIES):
        try:
            return await loop.run_in_executor(None, _download_article, url)
        except Exception as e:
            last_exc = e
            if attempt == MAX_RETRIES - 1:
                break
            delay = RETRY_BACKOFF_BASE * (2 ** attempt)
            logger.warning(
                "Article download %s failed (attempt %d/%d): %s — retrying in %ds",
                url, attempt + 1, MAX_RETRIES, e, delay,
            )
            await asyncio.sleep(delay)

    logger.warning("Article download %s failed after %d attempts: %s", url, MAX_RETRIES, last_exc)
    return {}


def _download_article(url: str) -> dict:
    """Synchronous newspaper4k download (runs in executor). Raises on failure."""
    a = Article(url, language="en", fetch_images=True)
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
    content = extracted.get("content") or description
    author = extracted.get("author") or getattr(entry, "author", "") or ""
    word_count = extracted.get("word_count") or 0
    summary = extracted.get("summary") or description
    keywords = extracted.get("keywords") or ""
    published_at = _parse_date(entry) or datetime.now(timezone.utc).isoformat()

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
            "fetch_status": "fetched" if content else "partial",
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
