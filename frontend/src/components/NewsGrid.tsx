"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Newspaper, WifiOff } from "lucide-react";
import type { Article } from "@/lib/types";
import type { ArticleFilters } from "@/lib/api";
import { getArticles } from "@/lib/api";
import NewsCard from "./NewsCard";
import SkeletonCard from "./SkeletonCard";
import ArticleModal from "./ArticleModal";

interface Props {
  filters: ArticleFilters;
  refreshKey?: number;
  sidebarOpen?: boolean;
}

const PAGE_SIZE = 30;

export default function NewsGrid({ filters, refreshKey, sidebarOpen = true }: Props) {
  const [page, setPage] = useState(1);
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Reset when filters change
  useEffect(() => {
    setPage(1);
    setAllArticles([]);
    setHasMore(true);
  }, [filters.category, filters.feedId, filters.search, filters.isSaved, filters.fetchStatus, refreshKey]);

  const swrKey = JSON.stringify({ ...filters, page, refreshKey });

  const { data, isLoading, error } = useSWR(
    swrKey,
    () => getArticles({ ...filters, page, perPage: PAGE_SIZE }),
    {
      revalidateOnFocus: false,
      refreshInterval: 2 * 60 * 1000, // poll every 2 min
      keepPreviousData: true,
      onSuccess(data) {
        setAllArticles((prev) => {
          // On page 1 reset; on later pages append
          if (page === 1) return data.items;
          const ids = new Set(prev.map((a) => a.id));
          const fresh = data.items.filter((a) => !ids.has(a.id));
          return [...prev, ...fresh];
        });
        setHasMore(data.page < data.totalPages);
      },
    }
  );

  // Infinite scroll
  useEffect(() => {
    if (!loaderRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoading) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading]);

  const handleSavedChange = useCallback((updated: Article) => {
    setAllArticles((prev) =>
      prev.map((a) => (a.id === updated.id ? { ...a, is_saved: updated.is_saved } : a))
    );
  }, []);

  const isEmpty = !isLoading && allArticles.length === 0;
  const showSkeletons = isLoading && page === 1;

  return (
    <>
      <div className="flex-1 overflow-y-auto px-1">
        {error && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <WifiOff className="w-10 h-10 mb-3 opacity-50" />
            <p className="font-medium">Could not reach the backend</p>
            <p className="text-sm text-gray-400 mt-1">Make sure the Python server is running on port 8000</p>
          </div>
        )}

        {isEmpty && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Newspaper className="w-12 h-12 mb-4 opacity-30" />
            <p className="font-semibold text-lg">No articles yet</p>
            <p className="text-sm text-gray-400 mt-1 text-center max-w-xs">
              Enable some feeds in the sidebar to start seeing articles here.
              Fresh content loads automatically in the background.
            </p>
          </div>
        )}

        <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 ${
          sidebarOpen ? "xl:grid-cols-3" : "lg:grid-cols-3"
        }`}>
          {showSkeletons
            ? Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)
            : allArticles.map((article) => (
                <NewsCard
                  key={article.id}
                  article={article}
                  onClick={() => setSelectedId(article.id)}
                  onSavedChange={handleSavedChange}
                />
              ))}
        </div>

        {/* Infinite scroll sentinel */}
        <div ref={loaderRef} className="h-12 flex items-center justify-center">
          {isLoading && page > 1 && (
            <div className="w-5 h-5 rounded-full border-2 border-indigo-400/40 border-t-indigo-500 animate-spin" />
          )}
          {!hasMore && allArticles.length > 0 && (
            <p className="text-xs text-gray-400">All caught up ✓</p>
          )}
        </div>
      </div>

      {selectedId && (
        <ArticleModal articleId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </>
  );
}
