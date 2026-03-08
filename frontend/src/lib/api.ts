import type { Article, Category, Feed, FetchStatus, PaginatedResult } from "./types";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Feeds ──────────────────────────────────────────────────────────────────

export const getFeeds = (category?: string): Promise<Feed[]> =>
  req(`/api/feeds${category ? `?category=${category}` : ""}`);

export const createFeed = (data: Partial<Feed>): Promise<Feed> =>
  req("/api/feeds", { method: "POST", body: JSON.stringify(data) });

export const updateFeed = (feedId: string, data: Partial<Feed>): Promise<Feed> =>
  req(`/api/feeds/${feedId}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteFeed = (feedId: string): Promise<{ deleted: string }> =>
  req(`/api/feeds/${feedId}`, { method: "DELETE" });

export const toggleFeed = (feedId: string): Promise<Feed> =>
  req(`/api/feeds/${feedId}/toggle`, { method: "POST" });

// ── Articles ───────────────────────────────────────────────────────────────

export interface ArticleFilters {
  category?: string;
  feedId?: string;
  search?: string;
  isSaved?: boolean;
  fetchStatus?: "full" | "summary";
  publishedAfter?: string;
  page?: number;
  perPage?: number;
}

export const getArticles = (
  filters: ArticleFilters = {}
): Promise<PaginatedResult<Article>> => {
  const p = new URLSearchParams();
  if (filters.category) p.set("category", filters.category);
  if (filters.feedId) p.set("feed_id", filters.feedId);
  if (filters.search) p.set("search", filters.search);
  if (filters.isSaved !== undefined) p.set("is_saved", String(filters.isSaved));
  if (filters.fetchStatus) p.set("fetch_status", filters.fetchStatus);
  if (filters.publishedAfter) p.set("published_after", filters.publishedAfter);
  if (filters.page) p.set("page", String(filters.page));
  if (filters.perPage) p.set("per_page", String(filters.perPage));
  const qs = p.toString();
  return req(`/api/articles${qs ? `?${qs}` : ""}`);
};

export const getArticle = (id: string): Promise<Article> =>
  req(`/api/articles/${id}`);

export const toggleSaved = (id: string): Promise<Article> =>
  req(`/api/articles/${id}/save`, { method: "PATCH" });

export const markRead = (id: string): Promise<Article> =>
  req(`/api/articles/${id}/read`, { method: "PATCH" });

export const resetSaved = (): Promise<{ cleared: number }> =>
  req("/api/articles/reset-saved", { method: "POST" });

export const getUnreadCount = (): Promise<number> =>
  req<{ totalItems: number }>("/api/articles?is_read=false&per_page=1").then(
    (r) => r.totalItems
  );

export const markAllRead = (filters?: {
  category?: string;
  fetchStatus?: string;
  publishedAfter?: string;
}): Promise<{ marked: number }> => {
  const p = new URLSearchParams();
  if (filters?.category) p.set("category", filters.category);
  if (filters?.fetchStatus) p.set("fetch_status", filters.fetchStatus);
  if (filters?.publishedAfter) p.set("published_after", filters.publishedAfter);
  const qs = p.toString();
  return req(`/api/articles/mark-all-read${qs ? `?${qs}` : ""}`, { method: "POST" });
};

// ── Misc ───────────────────────────────────────────────────────────────────

export const getCategories = (): Promise<Category[]> => req("/api/categories");

export const createCategory = (data: { slug: string; name: string; emoji?: string; color?: string }): Promise<Category> =>
  req("/api/categories", { method: "POST", body: JSON.stringify(data) });

export const updateCategory = (pbId: string, data: Partial<Category>): Promise<Category> =>
  req(`/api/categories/${pbId}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteCategory = (pbId: string): Promise<{ deleted: string }> =>
  req(`/api/categories/${pbId}`, { method: "DELETE" });

export const triggerRefresh = (): Promise<{ status: string }> =>
  req("/api/refresh", { method: "POST" });

export const getStatus = (): Promise<FetchStatus> => req("/api/status");
