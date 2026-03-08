"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Newspaper, WifiOff } from "lucide-react";
import type { Article } from "@/lib/types";
import type { ArticleFilters } from "@/lib/api";
import { getArticles, toggleSaved } from "@/lib/api";
import NewsCard from "./NewsCard";
import SkeletonCard from "./SkeletonCard";
import ArticleModal from "./ArticleModal";
import KeyboardHelp from "./KeyboardHelp";
import { useKeyboardNav } from "@/lib/useKeyboardNav";

interface Props {
  filters: ArticleFilters;
  refreshKey?: number;
  sidebarOpen?: boolean;
  viewStyle?: "grid" | "list";
}

const PAGE_SIZE = 30;

export default function NewsGrid({ filters, refreshKey, sidebarOpen = true, viewStyle = "grid" }: Props) {
  const [page, setPage] = useState(1);
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

  // Reset when filters change
  useEffect(() => {
    setPage(1);
    setAllArticles([]);
    setHasMore(true);
    cardRefs.current = [];
  }, [filters.category, filters.feedId, filters.search, filters.isSaved, filters.fetchStatus, filters.publishedAfter, refreshKey]);

  const swrKey = JSON.stringify({ ...filters, page, refreshKey });

  const { data, isLoading, error } = useSWR(
    swrKey,
    () => getArticles({ ...filters, page, perPage: PAGE_SIZE }),
    {
      revalidateOnFocus: false,
      refreshInterval: 2 * 60 * 1000,
      keepPreviousData: true,
      onSuccess(data) {
        setAllArticles((prev) => {
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
        if (entry.isIntersecting && !isLoading) setPage((p) => p + 1);
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

  // Keyboard navigation
  const { focusedIndex } = useKeyboardNav({
    count: allArticles.length,
    disabled: !!selectedId || showHelp,
    onOpen: (i) => {
      const a = allArticles[i];
      if (a) setSelectedId(a.id);
    },
    onSave: async (i) => {
      const a = allArticles[i];
      if (!a) return;
      try {
        const updated = await toggleSaved(a.id);
        handleSavedChange({ ...a, is_saved: updated.is_saved });
      } catch { /* ignore */ }
    },
    onHelp: () => setShowHelp(true),
  });

  // Scroll focused card into view
  useEffect(() => {
    if (focusedIndex !== null) {
      cardRefs.current[focusedIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [focusedIndex]);

  const isEmpty = !isLoading && allArticles.length === 0;
  const showSkeletons = isLoading && page === 1;

  return (
    <>
      <div className="flex-1 overflow-y-auto scrollbar-none px-1">
        {error && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
            <WifiOff className="w-10 h-10 mb-3 opacity-50" />
            <p className="font-medium">Could not reach the backend</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Make sure the Python server is running on port 8000</p>
          </div>
        )}

        {isEmpty && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
            <Newspaper className="w-12 h-12 mb-4 opacity-30" />
            <p className="font-semibold text-lg">No articles yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 text-center max-w-xs">
              Enable some feeds in the sidebar to start seeing articles here.
              Fresh content loads automatically in the background.
            </p>
          </div>
        )}

        {viewStyle === "list" ? (
          <div className="glass-card rounded-2xl overflow-hidden divide-y divide-white/20 dark:divide-white/10">
            {showSkeletons
              ? Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-7 h-7 shimmer rounded-lg flex-shrink-0" />
                    <div className="flex-1 h-4 shimmer rounded-full" />
                    <div className="w-20 h-3 shimmer rounded-full flex-shrink-0" />
                  </div>
                ))
              : allArticles.map((article, index) => (
                  <NewsCard
                    key={article.id}
                    article={article}
                    onClick={() => setSelectedId(article.id)}
                    onSavedChange={handleSavedChange}
                    onRead={(id) => setAllArticles(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a))}
                    viewStyle="list"
                    isFocused={focusedIndex === index}
                    cardRef={(el) => { cardRefs.current[index] = el; }}
                  />
                ))}
          </div>
        ) : (
          <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 ${
            sidebarOpen ? "xl:grid-cols-3" : "lg:grid-cols-3"
          }`}>
            {showSkeletons
              ? Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)
              : allArticles.map((article, index) => (
                  <NewsCard
                    key={article.id}
                    article={article}
                    onClick={() => setSelectedId(article.id)}
                    onSavedChange={handleSavedChange}
                    onRead={(id) => setAllArticles(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a))}
                    viewStyle="grid"
                    isFocused={focusedIndex === index}
                    cardRef={(el) => { cardRefs.current[index] = el; }}
                  />
                ))}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={loaderRef} className="h-12 flex items-center justify-center">
          {isLoading && page > 1 && (
            <div className="w-5 h-5 rounded-full border-2 border-indigo-400/40 border-t-indigo-500 animate-spin" />
          )}
          {!hasMore && allArticles.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">All caught up ✓</p>
          )}
        </div>
      </div>

      {selectedId && (
        <ArticleModal articleId={selectedId} onClose={() => setSelectedId(null)} />
      )}
      {showHelp && <KeyboardHelp onClose={() => setShowHelp(false)} />}
    </>
  );
}
