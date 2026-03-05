"""
PocketBase REST API client with automatic token refresh and retry.
"""

import asyncio
import logging
import time
from typing import Any, Optional
import httpx
from config import POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD

logger = logging.getLogger(__name__)

MAX_RETRIES = 4
RETRY_BACKOFF_BASE = 2  # seconds — delays: 2, 4, 8, 16
RETRYABLE_STATUS_CODES = frozenset({429, 500, 502, 503, 504})


def _is_retryable(exc: Exception) -> bool:
    if isinstance(exc, (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout, httpx.PoolTimeout)):
        return True
    if isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code in RETRYABLE_STATUS_CODES:
        return True
    return False


class PocketBaseClient:
    def __init__(self):
        self.base_url = POCKETBASE_URL.rstrip("/")
        self._token: Optional[str] = None
        self._token_expires: float = 0
        self._lock = asyncio.Lock()

    # ── HTTP with retry ───────────────────────────────────────────────

    async def _request(
        self,
        method: str,
        path: str,
        *,
        timeout: int = 15,
        auth: bool = True,
        **kwargs,
    ) -> httpx.Response:
        """Fire an HTTP request with exponential-backoff retry on transient errors."""
        headers = await self._headers() if auth else {"Content-Type": "application/json"}
        url = f"{self.base_url}{path}"
        last_exc: Optional[Exception] = None

        for attempt in range(MAX_RETRIES):
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    resp = await client.request(method, url, headers=headers, **kwargs)
                    resp.raise_for_status()
                    return resp
            except Exception as exc:
                last_exc = exc
                if not _is_retryable(exc) or attempt == MAX_RETRIES - 1:
                    raise
                delay = RETRY_BACKOFF_BASE * (2 ** attempt)
                logger.warning(
                    "PocketBase %s %s failed (attempt %d/%d): %s — retrying in %ds",
                    method, path, attempt + 1, MAX_RETRIES, exc, delay,
                )
                await asyncio.sleep(delay)

        raise last_exc  # unreachable, but keeps type-checker happy

    # ── Auth ──────────────────────────────────────────────────────────

    async def _authenticate(self) -> str:
        """Get a fresh admin auth token."""
        body = {
            "identity": POCKETBASE_ADMIN_EMAIL,
            "password": POCKETBASE_ADMIN_PASSWORD,
        }
        try:
            resp = await self._request(
                "POST", "/api/admins/auth-with-password", json=body, auth=False,
            )
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                resp = await self._request(
                    "POST", "/api/collections/_superusers/auth-with-password",
                    json=body, auth=False,
                )
            else:
                raise
        return resp.json()["token"]

    async def _get_token(self) -> str:
        async with self._lock:
            if not self._token or time.time() > self._token_expires - 60:
                self._token = await self._authenticate()
                self._token_expires = time.time() + 23 * 3600
            return self._token

    async def _headers(self) -> dict:
        token = await self._get_token()
        return {"Authorization": token, "Content-Type": "application/json"}

    # ── Collections ──────────────────────────────────────────────────────

    async def list_collections(self) -> list[dict]:
        resp = await self._request("GET", "/api/collections")
        return resp.json().get("items", [])

    async def create_collection(self, schema: dict) -> dict:
        resp = await self._request("POST", "/api/collections", json=schema)
        return resp.json()

    async def collection_exists(self, name: str) -> bool:
        collections = await self.list_collections()
        return any(c["name"] == name for c in collections)

    # ── Records ──────────────────────────────────────────────────────────

    async def list_records(
        self,
        collection: str,
        page: int = 1,
        per_page: int = 50,
        filter: str = "",
        sort: str = "",
        expand: str = "",
    ) -> dict:
        params: dict[str, Any] = {"page": page, "perPage": per_page}
        if sort:
            params["sort"] = sort
        if filter:
            params["filter"] = filter
        if expand:
            params["expand"] = expand

        resp = await self._request(
            "GET", f"/api/collections/{collection}/records",
            timeout=30, params=params,
        )
        return resp.json()

    async def get_record(self, collection: str, record_id: str, expand: str = "") -> dict:
        params = {}
        if expand:
            params["expand"] = expand
        resp = await self._request(
            "GET", f"/api/collections/{collection}/records/{record_id}",
            params=params,
        )
        return resp.json()

    async def create_record(self, collection: str, data: dict) -> dict:
        resp = await self._request(
            "POST", f"/api/collections/{collection}/records",
            timeout=30, json=data,
        )
        return resp.json()

    async def update_record(self, collection: str, record_id: str, data: dict) -> dict:
        resp = await self._request(
            "PATCH", f"/api/collections/{collection}/records/{record_id}",
            json=data,
        )
        return resp.json()

    async def delete_record(self, collection: str, record_id: str) -> None:
        await self._request(
            "DELETE", f"/api/collections/{collection}/records/{record_id}",
        )

    async def record_exists_by_filter(self, collection: str, filter: str) -> Optional[dict]:
        """Return the first record matching filter, or None."""
        result = await self.list_records(collection, per_page=1, filter=filter)
        items = result.get("items", [])
        return items[0] if items else None

    async def upsert_by_url(self, collection: str, url: str, data: dict) -> tuple[dict, bool]:
        """Create or update a record matched by URL. Returns (record, created)."""
        safe_url = url.replace("'", "\\'")
        existing = await self.record_exists_by_filter(collection, f"url='{safe_url}'")
        if existing:
            updated = await self.update_record(collection, existing["id"], data)
            return updated, False
        created = await self.create_record(collection, data)
        return created, True


# Singleton
pb = PocketBaseClient()
