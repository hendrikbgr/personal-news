"""
One-time setup: creates PocketBase collections and seeds feeds.
Run: python setup_db.py
"""

import dns_patch  # noqa: F401 — must be first, patches DNS resolution
import asyncio
import logging
import sys
import httpx
from config import POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD
from feeds_data import FEEDS

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


async def authenticate(client: httpx.AsyncClient) -> str:
    """Get admin auth token, trying both PocketBase v0.21 and v0.22+ endpoints."""
    for endpoint in [
        "/api/admins/auth-with-password",
        "/api/collections/_superusers/auth-with-password",
    ]:
        try:
            resp = await client.post(
                f"{POCKETBASE_URL}{endpoint}",
                json={"identity": POCKETBASE_ADMIN_EMAIL, "password": POCKETBASE_ADMIN_PASSWORD},
            )
            if resp.status_code == 200:
                token = resp.json()["token"]
                logger.info(f"Authenticated via {endpoint}")
                return token
        except Exception:
            pass
    raise RuntimeError("Authentication failed — check credentials in .env")


async def collection_exists(client: httpx.AsyncClient, token: str, name: str) -> bool:
    resp = await client.get(
        f"{POCKETBASE_URL}/api/collections/{name}",
        headers={"Authorization": token},
    )
    return resp.status_code == 200


FEEDS_FIELDS = [
    {"name": "name", "type": "text", "required": True},
    {"name": "url", "type": "url", "required": True},
    {"name": "category", "type": "text", "required": True},
    {"name": "source", "type": "text", "required": False},
    {"name": "emoji", "type": "text", "required": False},
    {"name": "is_active", "type": "bool", "required": False},
    {"name": "created", "type": "autodate", "onCreate": True, "onUpdate": False},
    {"name": "updated", "type": "autodate", "onCreate": True, "onUpdate": True},
]


async def create_feeds_collection(client: httpx.AsyncClient, token: str):
    if await collection_exists(client, token, "feeds"):
        logger.info("Collection 'feeds' already exists — patching fields")
        await _patch_collection_fields(client, token, "feeds", FEEDS_FIELDS)
        return

    schema = {"name": "feeds", "type": "base", "fields": FEEDS_FIELDS}
    resp = await client.post(
        f"{POCKETBASE_URL}/api/collections",
        headers={"Authorization": token, "Content-Type": "application/json"},
        json=schema,
    )
    if resp.status_code in (200, 201):
        logger.info("Created collection 'feeds'")
    else:
        logger.error(f"Failed to create 'feeds': {resp.status_code} {resp.text}")


async def _patch_collection_fields(
    client: httpx.AsyncClient, token: str, name: str, desired_fields: list[dict]
):
    """Ensure a collection has all desired fields, adding any that are missing."""
    resp = await client.get(
        f"{POCKETBASE_URL}/api/collections/{name}",
        headers={"Authorization": token},
    )
    resp.raise_for_status()
    existing = resp.json()
    existing_names = {f["name"] for f in existing.get("fields", [])}
    logger.info(f"Collection '{name}' current fields: {sorted(existing_names)}")
    merged_fields = list(existing.get("fields", []))

    added = []
    for field in desired_fields:
        if field["name"] not in existing_names:
            merged_fields.append(field)
            added.append(field["name"])

    if not added:
        logger.info(f"Collection '{name}' already has all expected fields")
        return

    patch_resp = await client.patch(
        f"{POCKETBASE_URL}/api/collections/{name}",
        headers={"Authorization": token, "Content-Type": "application/json"},
        json={"fields": merged_fields},
    )
    if patch_resp.status_code in (200, 201):
        logger.info(f"Patched '{name}': added fields {added}")
    else:
        logger.error(f"Failed to patch '{name}': {patch_resp.status_code} {patch_resp.text}")


async def get_feeds_collection_id(client: httpx.AsyncClient, token: str) -> str:
    resp = await client.get(
        f"{POCKETBASE_URL}/api/collections/feeds",
        headers={"Authorization": token},
    )
    resp.raise_for_status()
    return resp.json()["id"]


def _articles_fields(feeds_coll_id: str) -> list[dict]:
    return [
        {"name": "title", "type": "text", "required": True},
        {"name": "description", "type": "text", "required": False},
        {"name": "content", "type": "text", "required": False},
        {"name": "summary", "type": "text", "required": False},
        {"name": "keywords", "type": "text", "required": False},
        {"name": "url", "type": "url", "required": True},
        {"name": "image_url", "type": "url", "required": False},
        {"name": "published_at", "type": "date", "required": False},
        {
            "name": "feed_id",
            "type": "relation",
            "collectionId": feeds_coll_id,
            "cascadeDelete": False,
            "maxSelect": 1,
            "minSelect": 0,
        },
        {"name": "category", "type": "text", "required": False},
        {"name": "author", "type": "text", "required": False},
        {"name": "word_count", "type": "number", "required": False},
        {"name": "is_read", "type": "bool", "required": False},
        {"name": "is_saved", "type": "bool", "required": False},
        {"name": "fetch_status", "type": "text", "required": False},
        {"name": "created", "type": "autodate", "onCreate": True, "onUpdate": False},
        {"name": "updated", "type": "autodate", "onCreate": True, "onUpdate": True},
    ]


async def create_articles_collection(client: httpx.AsyncClient, token: str):
    feeds_coll_id = await get_feeds_collection_id(client, token)
    fields = _articles_fields(feeds_coll_id)

    if await collection_exists(client, token, "articles"):
        logger.info("Collection 'articles' already exists — patching fields")
        await _patch_collection_fields(client, token, "articles", fields)
        return

    schema = {"name": "articles", "type": "base", "fields": fields}
    resp = await client.post(
        f"{POCKETBASE_URL}/api/collections",
        headers={"Authorization": token, "Content-Type": "application/json"},
        json=schema,
    )
    if resp.status_code in (200, 201):
        logger.info("Created collection 'articles'")
    else:
        logger.error(f"Failed to create 'articles': {resp.status_code} {resp.text}")


async def seed_feeds(client: httpx.AsyncClient, token: str):
    """Insert all feeds from feeds_data.py if they don't already exist."""
    logger.info(f"Seeding {len(FEEDS)} feeds…")
    created = 0
    skipped = 0

    for feed in FEEDS:
        # Check by URL
        safe_url = feed["url"].replace("'", "\\'")
        resp = await client.get(
            f"{POCKETBASE_URL}/api/collections/feeds/records",
            headers={"Authorization": token},
            params={"filter": f"url='{safe_url}'", "perPage": 1},
        )
        if resp.status_code == 200 and resp.json().get("totalItems", 0) > 0:
            skipped += 1
            continue

        create_resp = await client.post(
            f"{POCKETBASE_URL}/api/collections/feeds/records",
            headers={"Authorization": token, "Content-Type": "application/json"},
            json={**feed, "is_active": False},
        )
        if create_resp.status_code in (200, 201):
            created += 1
        else:
            logger.warning(f"Failed to create feed '{feed['name']}': {create_resp.text}")

    logger.info(f"Feeds: {created} created, {skipped} already existed")


async def main():
    logger.info(f"Connecting to PocketBase at {POCKETBASE_URL}")
    async with httpx.AsyncClient(timeout=30) as client:
        token = await authenticate(client)
        await create_feeds_collection(client, token)
        await create_articles_collection(client, token)
        await seed_feeds(client, token)
    logger.info("Setup complete!")


if __name__ == "__main__":
    asyncio.run(main())
