"use client";

import { useState } from "react";
import useSWR from "swr";
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, Rss } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Category, Feed, Stats } from "@/lib/types";
import { getFeeds, getCategories, toggleFeed, getStats } from "@/lib/api";
import { getCategoryStyle } from "@/lib/categoryColors";

function getFeedHealthColor(last?: string): string {
  if (!last) return "bg-gray-300 dark:bg-gray-600";
  const age = Date.now() - new Date(last).getTime();
  if (age < 24 * 3_600_000) return "bg-emerald-400";
  if (age < 72 * 3_600_000) return "bg-amber-400";
  return "bg-red-400";
}

interface Props {
  selectedCategory: string | null;
  onSelectCategory: (c: string | null) => void;
  onFeedsChanged?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ selectedCategory, onSelectCategory, onFeedsChanged, collapsed, onToggleCollapse }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data: categories } = useSWR<Category[]>("categories", getCategories, {
    revalidateOnFocus: false,
  });

  const { data: feeds, mutate: mutateFeeds } = useSWR<Feed[]>("feeds", () => getFeeds(), {
    refreshInterval: 15_000,
  });

  const { data: stats } = useSWR<Stats>("stats", getStats, {
    refreshInterval: 300_000,
  });

  function toggle(catId: string) {
    setExpanded((prev) => ({ ...prev, [catId]: !prev[catId] }));
  }

  async function handleToggleFeed(e: React.MouseEvent, feed: Feed) {
    e.stopPropagation();
    if (togglingId) return;
    setTogglingId(feed.id);
    try {
      await toggleFeed(feed.id);
      await mutateFeeds();
      onFeedsChanged?.();
    } catch {
      /* ignore */
    } finally {
      setTogglingId(null);
    }
  }

  const feedsByCategory = (feeds ?? []).reduce<Record<string, Feed[]>>((acc, f) => {
    (acc[f.category] ??= []).push(f);
    return acc;
  }, {});

  if (collapsed) {
    return (
      <div className="glass-strong rounded-3xl p-2 h-full flex flex-col items-center gap-2">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-xl hover:bg-white/40 transition-all"
          title="Expand sidebar"
        >
          <PanelLeftOpen className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
        <div className="flex flex-col gap-1.5 items-center mt-1">
          <button
            onClick={() => onSelectCategory(null)}
            className={`p-1.5 rounded-lg transition-all ${
              selectedCategory === null ? "glass-strong shadow-sm" : "hover:bg-white/30"
            }`}
            title="All News"
          >
            <span className="text-base">📋</span>
          </button>
          {(categories ?? []).map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`p-1.5 rounded-lg transition-all ${
                selectedCategory === cat.id ? "glass-strong shadow-sm" : "hover:bg-white/30"
              }`}
              title={cat.name}
            >
              <span className="text-base">{cat.emoji}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-strong rounded-3xl p-4 h-full flex flex-col gap-1 overflow-y-auto scrollbar-none sidebar-scroll">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2 mb-2">
        Categories
      </h2>

      <button
        onClick={() => onSelectCategory(null)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          selectedCategory === null
            ? "glass-strong text-indigo-700 dark:text-indigo-300 shadow-sm"
            : "text-gray-600 dark:text-gray-300 hover:bg-white/30"
        }`}
      >
        <span className="text-lg">📋</span>
        All News
      </button>

      {(categories ?? []).map((cat) => {
        const s = getCategoryStyle(cat.id);
        const catFeeds = feedsByCategory[cat.id] ?? [];
        const isOpen = expanded[cat.id] ?? false;
        const activeCount = catFeeds.filter((f) => f.is_active).length;
        const isSelected = selectedCategory === cat.id;

        return (
          <div key={cat.id}>
            <button
              onClick={() => {
                onSelectCategory(cat.id);
                toggle(cat.id);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isSelected
                  ? `${s.bg} ${s.text} shadow-sm`
                  : "text-gray-600 dark:text-gray-300 hover:bg-white/30"
              }`}
            >
              <span className="text-lg">{cat.emoji}</span>
              <span className="flex-1 text-left">{cat.name}</span>
              {activeCount > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${s.bg} ${s.text}`}>
                  {activeCount}
                </span>
              )}
              {isOpen ? (
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              )}
            </button>

            {isOpen && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-white/40 dark:border-white/10 pl-3">
                {catFeeds.map((feed) => (
                  <div
                    key={feed.id}
                    className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg hover:bg-white/20 transition-all"
                  >
                    <span className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 truncate">
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getFeedHealthColor(feed.last_article_at)}`}
                        title={feed.last_article_at ? `Last article: ${formatDistanceToNow(new Date(feed.last_article_at), { addSuffix: true })}` : "No articles yet"}
                      />
                      <span>{feed.emoji}</span>
                      <span className="truncate">{feed.name}</span>
                    </span>
                    <button
                      onClick={(e) => handleToggleFeed(e, feed)}
                      disabled={togglingId === feed.id}
                      className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-all ${
                        feed.is_active ? "bg-indigo-400" : "bg-gray-300 dark:bg-gray-600"
                      } ${togglingId === feed.id ? "opacity-50" : ""}`}
                      title={feed.is_active ? "Disable feed" : "Enable feed"}
                    >
                      <span
                        className={`absolute left-0 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          feed.is_active ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                ))}
                {catFeeds.length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 py-1 px-2">No feeds available</p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {stats && (
        <div className="mt-2 px-3 py-2.5 glass rounded-xl space-y-1">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            📰 {stats.read_today} today · {stats.read_week} this week
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            ⏱ {stats.reading_minutes_week}m read · 🔖 {stats.saved_total} saved
          </p>
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-white/30 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 px-2">
          <Rss className="w-3.5 h-3.5" />
          <span>Enable feeds to start reading</span>
        </div>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-xl hover:bg-white/40 transition-all flex-shrink-0"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
}
