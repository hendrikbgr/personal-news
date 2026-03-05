"""
FastAPI app — personal news dashboard backend.
"""

import dns_patch  # noqa: F401 — must be first, patches DNS resolution
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware

from config import PORT
from pocketbase import pb
from fetcher import fetch_all_active_feeds, fetch_feed
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

@app.get("/api/feeds")
async def get_feeds(category: Optional[str] = None):
    """List all feeds, optionally filtered by category."""
    f = f"category='{category}'" if category else ""
    result = await pb.list_records("feeds", per_page=200, filter=f, sort="category,name")
    return result.get("items", [])


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
        # Kick off a background fetch immediately
        background_tasks.add_task(_fetch_single_feed, updated)

    return updated


async def _fetch_single_feed(feed_record: dict):
    """Background task to fetch one feed."""
    try:
        await fetch_feed(feed_record)
    except Exception as e:
        logger.error(f"Background single-feed fetch error: {e}")


# ── Articles ──────────────────────────────────────────────────────────────

@app.get("/api/articles")
async def get_articles(
    category: Optional[str] = Query(None),
    feed_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    is_saved: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
):
    """List articles with optional filtering."""
    filters = []
    if category:
        filters.append(f"category='{category}'")
    if feed_id:
        filters.append(f"feed_id='{feed_id}'")
    if search:
        safe_search = search.replace("'", "\\'")
        filters.append(f"(title~'{safe_search}'||description~'{safe_search}')")
    if is_saved is not None:
        filters.append(f"is_saved={str(is_saved).lower()}")

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
    from feeds_data import CATEGORIES
    return CATEGORIES


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
