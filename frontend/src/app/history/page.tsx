"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import type { Article } from "@/lib/types";
import { getArticles } from "@/lib/api";
import NewsCard from "@/components/NewsCard";
import ArticleModal from "@/components/ArticleModal";

function groupByDate(articles: Article[]): { label: string; items: Article[] }[] {
  const groups: Map<string, Article[]> = new Map();
  for (const a of articles) {
    const date = a.published_at ? new Date(a.published_at) : new Date(a.created);
    let label: string;
    if (isToday(date)) label = "Today";
    else if (isYesterday(date)) label = "Yesterday";
    else label = format(date, "MMM d, yyyy");
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(a);
  }
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

const PAGE_SIZE = 30;

export default function HistoryPage() {
  const [page, setPage] = useState(1);
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  const swrKey = JSON.stringify({ isRead: true, page });

  const { data, isLoading } = useSWR(
    swrKey,
    () => getArticles({ isRead: true, page, perPage: PAGE_SIZE }),
    {
      revalidateOnFocus: false,
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

  const groups = groupByDate(allArticles);

  return (
    <div className="min-h-screen p-3 md:p-4 flex flex-col gap-4 max-w-3xl mx-auto">
      <div className="glass-strong rounded-3xl px-5 py-4 flex items-center gap-4">
        <Link
          href="/"
          className="p-2 rounded-xl glass hover:bg-white/40 transition-all"
          title="Back to dashboard"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">Read History</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Articles you&apos;ve read</p>
        </div>
      </div>

      {isLoading && page === 1 ? (
        <div className="glass-card rounded-2xl overflow-hidden divide-y divide-white/20 dark:divide-white/10">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-7 h-7 shimmer rounded-lg flex-shrink-0" />
              <div className="flex-1 h-4 shimmer rounded-full" />
              <div className="w-20 h-3 shimmer rounded-full flex-shrink-0" />
            </div>
          ))}
        </div>
      ) : groups.length === 0 && !isLoading ? (
        <div className="glass-strong rounded-3xl p-12 text-center">
          <p className="text-4xl mb-3">📖</p>
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">No reading history yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Articles you open will appear here</p>
        </div>
      ) : (
        groups.map(({ label, items }) => (
          <div key={label}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 px-1">
              {label}
            </h2>
            <div className="glass-card rounded-2xl overflow-hidden divide-y divide-white/20 dark:divide-white/10">
              {items.map((article) => (
                <NewsCard
                  key={article.id}
                  article={article}
                  onClick={() => setSelectedId(article.id)}
                  viewStyle="list"
                />
              ))}
            </div>
          </div>
        ))
      )}

      <div ref={loaderRef} className="h-8 flex items-center justify-center">
        {isLoading && page > 1 && (
          <div className="w-5 h-5 rounded-full border-2 border-indigo-400/40 border-t-indigo-500 animate-spin" />
        )}
        {!hasMore && allArticles.length > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">All caught up ✓</p>
        )}
      </div>

      {selectedId && (
        <ArticleModal articleId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
