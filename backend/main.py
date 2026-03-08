"""
FastAPI app — personal news dashboard backend.
"""

import dns_patch  # noqa: F401 — must be first, patches DNS resolution
import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from config import PORT
from pocketbase import pb
from fetcher import fetch_all_active_feeds, fetch_feed, _extract_article
import scheduler as sched

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: start scheduler + trigger initial fetch if needed."""
    sched.start_scheduler()
    # Run an initial fetch shortly after startup so data is fresh
    asyncio.create_task(_delayed_initial_fetch())
    yield
    sched.stop_scheduler()


async def _delayed_initial_fetch():
    await asyncio.sleep(3)  # let the app fully start first
    logger.info("Running initial fetch on startup")
    try:
        await fetch_all_active_feeds()
    except Exception as e:
        logger.error(f"Initial fetch failed: {e}")


app = FastAPI(title="Personal News API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Feeds ─────────────────────────────────────────────────────────────────

async def _get_last_article_date(feed_id: str) -> Optional[str]:
    """Get the published_at date of the most recent article for a feed."""
    try:
        r = await pb.list_records("articles", per_page=1, filter=f"feed_id='{feed_id}'", sort="-published_at")
        items = r.get("items", [])
        return items[0]["published_at"] if items else None
    except Exception:
        return None


@app.get("/api/feeds")
async def get_feeds(category: Optional[str] = None):
    """List all feeds, optionally filtered by category."""
    f = f"category='{category}'" if category else ""
    result = await pb.list_records("feeds", per_page=200, filter=f, sort="category,name")
    feeds = result.get("items", [])
    dates = await asyncio.gather(*[_get_last_article_date(feed["id"]) for feed in feeds])
    for feed, date in zip(feeds, dates):
        feed["last_article_at"] = date
    return feeds


@app.post("/api/feeds")
async def create_feed(data: dict = Body(...)):
    """Create a new feed."""
    required = {"name", "url", "category"}
    if not required.issubset(data.keys()):
        raise HTTPException(status_code=400, detail=f"Missing required fields: {required - data.keys()}")
    payload = {
        "name": data["name"],
        "url": data["url"],
        "category": data["category"],
        "source": data.get("source", ""),
        "emoji": data.get("emoji", "📰"),
        "is_active": data.get("is_active", False),
    }
    return await pb.create_record("feeds", payload)


@app.patch("/api/feeds/{feed_id}")
async def update_feed(feed_id: str, data: dict = Body(...)):
    """Update an existing feed."""
    try:
        await pb.get_record("feeds", feed_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Feed not found")
    allowed = {"name", "url", "category", "source", "emoji", "is_active"}
    payload = {k: v for k, v in data.items() if k in allowed}
    return await pb.update_record("feeds", feed_id, payload)


@app.delete("/api/feeds/{feed_id}")
async def delete_feed(feed_id: str):
    """Delete a feed."""
    try:
        await pb.get_record("feeds", feed_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Feed not found")
    await pb.delete_record("feeds", feed_id)
    return {"deleted": feed_id}


@app.post("/api/feeds/{feed_id}/toggle")
async def toggle_feed(feed_id: str, background_tasks: BackgroundTasks):
    """Enable or disable a feed. Immediately triggers a fetch when enabling."""
    try:
        feed = await pb.get_record("feeds", feed_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Feed not found")

    new_state = not feed.get("is_active", False)
    updated = await pb.update_record("feeds", feed_id, {"is_active": new_state})

    if new_state:
        background_tasks.add_task(_fetch_single_feed, updated)

    return updated


async def _fetch_single_feed(feed_record: dict):
    """Background task to fetch one feed."""
    try:
        await fetch_feed(feed_record)
    except Exception as e:
        logger.error(f"Background single-feed fetch error: {e}")


# ── Articles ──────────────────────────────────────────────────────────────

@app.get("/api/articles/export")
async def export_saved_articles():
    """Export all saved articles as a JSON file attachment."""
    all_articles = []
    page = 1
    while True:
        result = await pb.list_records(
            "articles", page=page, per_page=100,
            filter="is_saved=true", sort="-published_at", expand="feed_id",
        )
        items = result.get("items", [])
        if not items:
            break
        all_articles.extend(items)
        if result.get("page", 1) >= result.get("totalPages", 1):
            break
        page += 1
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return JSONResponse(
        content=all_articles,
        headers={"Content-Disposition": f"attachment; filename=saved-articles-{date_str}.json"},
    )


@app.get("/api/articles")
async def get_articles(
    category: Optional[str] = Query(None),
    feed_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    is_saved: Optional[bool] = Query(None),
    is_read: Optional[bool] = Query(None),
    fetch_status: Optional[str] = Query(None),
    published_after: Optional[str] = Query(None),
    active_only: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
):
    """List articles with optional filtering."""
    filters = []
    if active_only:
        filters.append("feed_id.is_active=true")
    if category:
        filters.append(f"category='{category}'")
    if feed_id:
        filters.append(f"feed_id='{feed_id}'")
    if search:
        safe_search = search.replace("'", "\\'")
        filters.append(f"(title~'{safe_search}'||description~'{safe_search}')")
    if is_saved is not None:
        filters.append(f"is_saved={str(is_saved).lower()}")
    if is_read is not None:
        filters.append(f"is_read={str(is_read).lower()}")
    if fetch_status in ("full", "summary"):
        filters.append(f"fetch_status='{fetch_status}'")
    if published_after:
        safe_date = published_after.replace("'", "")
        filters.append(f"published_at >= '{safe_date}'")

    filter_str = "&&".join(filters)
    result = await pb.list_records(
        "articles",
        page=page,
        per_page=per_page,
        filter=filter_str,
        sort="-published_at",
        expand="feed_id",
    )
    return result


@app.get("/api/articles/{article_id}")
async def get_article(article_id: str):
    """Get a single article by ID."""
    try:
        article = await pb.get_record("articles", article_id, expand="feed_id")
    except Exception:
        raise HTTPException(status_code=404, detail="Article not found")

    try:
        await pb.update_record("articles", article_id, {"is_read": True})
    except Exception as e:
        logger.warning(f"Could not mark article {article_id} as read: {e}")

    return article


@app.patch("/api/articles/{article_id}/save")
async def toggle_saved(article_id: str):
    """Toggle the saved state of an article."""
    try:
        article = await pb.get_record("articles", article_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Article not found")

    new_state = not article.get("is_saved", False)
    updated = await pb.update_record("articles", article_id, {"is_saved": new_state})
    return updated


@app.patch("/api/articles/{article_id}/read")
async def mark_read(article_id: str):
    """Mark an article as read."""
    try:
        updated = await pb.update_record("articles", article_id, {"is_read": True})
        return updated
    except Exception:
        raise HTTPException(status_code=404, detail="Article not found")


@app.post("/api/articles/{article_id}/refetch")
async def refetch_article(article_id: str):
    """Re-attempt full article extraction for a summary-only article."""
    try:
        article = await pb.get_record("articles", article_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Article not found")

    url = article.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="Article has no URL")

    extracted = await _extract_article(url)
    full_content = extracted.get("content") or ""
    description = article.get("description") or ""
    has_full = bool(full_content and len(full_content) > len(description) + 50)

    if not has_full:
        return {"success": False, "fetch_status": "summary"}

    updated = await pb.update_record("articles", article_id, {
        "content": full_content,
        "image_url": (extracted.get("image_url") or article.get("image_url") or "")[:2000],
        "author": (extracted.get("author") or article.get("author") or "")[:200],
        "word_count": extracted.get("word_count") or 0,
        "summary": (extracted.get("summary") or article.get("summary") or "")[:2000],
        "keywords": extracted.get("keywords") or article.get("keywords") or "",
        "fetch_status": "full",
    })
    return {"success": True, "fetch_status": "full", "article": updated}


@app.post("/api/articles/mark-all-read")
async def mark_all_read(
    category: Optional[str] = Query(None),
    fetch_status: Optional[str] = Query(None),
    published_after: Optional[str] = Query(None),
):
    """Mark all unread articles as read, respecting current filters."""
    filters = ["is_read=false"]
    if category:
        filters.append(f"category='{category}'")
    if fetch_status in ("full", "summary"):
        filters.append(f"fetch_status='{fetch_status}'")
    if published_after:
        safe_date = published_after.replace("'", "")
        filters.append(f"published_at >= '{safe_date}'")
    filter_str = "&&".join(filters)

    total = 0
    page = 1
    while total < 500:  # safety cap
        result = await pb.list_records("articles", page=page, per_page=100, filter=filter_str)
        items = result.get("items", [])
        if not items:
            break
        for article in items:
            await pb.update_record("articles", article["id"], {"is_read": True})
            total += 1
        if result.get("page", 1) >= result.get("totalPages", 1):
            break
        page += 1
    return {"marked": total}


@app.post("/api/articles/reset-saved")
async def reset_saved():
    """Delete all articles from the database."""
    total = 0
    while True:
        result = await pb.list_records("articles", per_page=100)
        items = result.get("items", [])
        if not items:
            break
        for article in items:
            await pb.delete_record("articles", article["id"])
            total += 1
    return {"deleted": total}


# ── Stats ─────────────────────────────────────────────────────────────────

@app.get("/api/stats")
async def get_stats():
    """Return reading statistics."""
    now = datetime.now(timezone.utc)
    today_midnight = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat().replace("+00:00", "Z")
    week_ago = (now - timedelta(days=7)).isoformat().replace("+00:00", "Z")

    async def read_today_count():
        r = await pb.list_records("articles", per_page=1, filter=f"is_read=true&&updated>='{today_midnight}'")
        return r.get("totalItems", 0)

    async def read_week_data():
        return await pb.list_records("articles", per_page=200, filter=f"is_read=true&&updated>='{week_ago}'")

    async def saved_count():
        r = await pb.list_records("articles", per_page=1, filter="is_saved=true")
        return r.get("totalItems", 0)

    async def active_feeds_count():
        r = await pb.list_records("feeds", per_page=1, filter="is_active=true")
        return r.get("totalItems", 0)

    read_today, week_data, saved_total, active_feeds = await asyncio.gather(
        read_today_count(), read_week_data(), saved_count(), active_feeds_count()
    )

    read_week_items = week_data.get("items", [])
    read_week = week_data.get("totalItems", 0)
    reading_minutes_week = sum(
        max(1, (item.get("word_count") or 0) // 200) for item in read_week_items
    )

    return {
        "read_today": read_today,
        "read_week": read_week,
        "saved_total": saved_total,
        "active_feeds": active_feeds,
        "reading_minutes_week": reading_minutes_week,
    }


# ── Live Logs (SSE) ───────────────────────────────────────────────────────

DOCKER_CONTAINER = "personal-news"
SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}


async def _docker_running() -> bool:
    """Return True if the Docker container is accessible and running."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "docker", "inspect", "--format", "{{.State.Running}}", DOCKER_CONTAINER,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=3)
        return stdout.strip() == b"true"
    except Exception:
        return False


@app.get("/api/logs/stream")
async def stream_logs():
    """Stream live backend logs as Server-Sent Events.

    Tries 'docker logs -f' first (works when running locally with Docker).
    Falls back to attaching a handler to the Python root logger (works
    when running inside the container or without Docker).
    """
    if await _docker_running():
        async def docker_gen():
            proc = await asyncio.create_subprocess_exec(
                "docker", "logs", "-f", "--tail", "200", "--timestamps", DOCKER_CONTAINER,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
            )
            try:
                while True:
                    try:
                        line = await asyncio.wait_for(proc.stdout.readline(), timeout=10)
                        if not line:
                            break
                        yield f"data: {line.decode('utf-8', errors='replace').rstrip()}\n\n"
                    except asyncio.TimeoutError:
                        yield ": keep-alive\n\n"
            finally:
                try:
                    proc.kill()
                except Exception:
                    pass

        return StreamingResponse(docker_gen(), media_type="text/event-stream", headers=SSE_HEADERS)

    # Fallback: attach a queue handler to the root Python logger
    async def process_gen():
        loop = asyncio.get_running_loop()
        queue: asyncio.Queue[str] = asyncio.Queue(maxsize=500)

        class _QueueHandler(logging.Handler):
            def emit(self, record: logging.LogRecord) -> None:
                try:
                    loop.call_soon_threadsafe(
                        queue.put_nowait,
                        self.format(record),
                    )
                except Exception:
                    pass

        handler = _QueueHandler()
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
        root = logging.getLogger()
        root.addHandler(handler)
        try:
            while True:
                try:
                    line = await asyncio.wait_for(queue.get(), timeout=15)
                    yield f"data: {line}\n\n"
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"
        finally:
            root.removeHandler(handler)

    return StreamingResponse(process_gen(), media_type="text/event-stream", headers=SSE_HEADERS)


# ── Refresh ───────────────────────────────────────────────────────────────

@app.post("/api/refresh")
async def manual_refresh(background_tasks: BackgroundTasks):
    """Manually trigger a full refresh of all active feeds."""
    background_tasks.add_task(_run_refresh)
    return {"status": "refresh_started"}


async def _run_refresh():
    try:
        await fetch_all_active_feeds()
    except Exception as e:
        logger.error(f"Manual refresh error: {e}")


@app.get("/api/status")
async def get_status():
    """Get scheduler and fetch status."""
    return sched.get_status()


# ── Categories ────────────────────────────────────────────────────────────

@app.get("/api/categories")
async def get_categories():
    """List all categories from PocketBase, falling back to hardcoded list."""
    try:
        result = await pb.list_records("categories", per_page=100, sort="name")
        items = result.get("items", [])
        if items:
            return [{"id": c["slug"], "name": c["name"], "emoji": c["emoji"], "color": c["color"],
                      "pb_id": c["id"]} for c in items]
    except Exception:
        pass
    from feeds_data import CATEGORIES
    return CATEGORIES


@app.post("/api/categories")
async def create_category(data: dict = Body(...)):
    """Create a new category."""
    required = {"slug", "name"}
    if not required.issubset(data.keys()):
        raise HTTPException(status_code=400, detail=f"Missing required fields: {required - data.keys()}")
    payload = {
        "slug": data["slug"],
        "name": data["name"],
        "emoji": data.get("emoji", "📂"),
        "color": data.get("color", "blue"),
    }
    record = await pb.create_record("categories", payload)
    return {"id": record["slug"], "name": record["name"], "emoji": record["emoji"],
            "color": record["color"], "pb_id": record["id"]}


@app.patch("/api/categories/{pb_id}")
async def update_category(pb_id: str, data: dict = Body(...)):
    """Update an existing category."""
    try:
        await pb.get_record("categories", pb_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Category not found")
    allowed = {"slug", "name", "emoji", "color"}
    payload = {k: v for k, v in data.items() if k in allowed}
    record = await pb.update_record("categories", pb_id, payload)
    return {"id": record["slug"], "name": record["name"], "emoji": record["emoji"],
            "color": record["color"], "pb_id": record["id"]}


@app.delete("/api/categories/{pb_id}")
async def delete_category(pb_id: str):
    """Delete a category."""
    try:
        await pb.get_record("categories", pb_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Category not found")
    await pb.delete_record("categories", pb_id)
    return {"deleted": pb_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
