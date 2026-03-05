"""
APScheduler background job for periodic RSS fetching.
"""

import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from config import FETCH_INTERVAL_MINUTES

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None
_is_running = False
_last_run: str | None = None
_last_stats: dict = {}


async def _fetch_job():
    global _last_run, _last_stats
    from fetcher import fetch_all_active_feeds
    from datetime import datetime, timezone

    logger.info("Scheduled fetch triggered")
    _last_run = datetime.now(timezone.utc).isoformat()
    try:
        stats = await fetch_all_active_feeds()
        _last_stats = stats
    except Exception as e:
        logger.error(f"Scheduled fetch error: {e}")


def start_scheduler():
    global _scheduler, _is_running
    if _scheduler and _scheduler.running:
        return

    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(
        _fetch_job,
        trigger=IntervalTrigger(minutes=FETCH_INTERVAL_MINUTES),
        id="rss_fetch",
        name="RSS Feed Fetcher",
        replace_existing=True,
    )
    _scheduler.start()
    _is_running = True
    logger.info(f"Scheduler started — interval: {FETCH_INTERVAL_MINUTES} min")


def stop_scheduler():
    global _scheduler, _is_running
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
    _is_running = False


def get_status() -> dict:
    return {
        "scheduler_running": _scheduler.running if _scheduler else False,
        "fetch_interval_minutes": FETCH_INTERVAL_MINUTES,
        "last_run": _last_run,
        "last_stats": _last_stats,
        "is_fetching": _is_running,
    }


async def trigger_immediate_fetch():
    """Trigger a fetch right now (runs as a background task)."""
    asyncio.create_task(_fetch_job())
