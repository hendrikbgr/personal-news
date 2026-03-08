"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { X, ChevronDown, ChevronRight, Rss } from "lucide-react";
import type { Category, Feed } from "@/lib/types";
import { getFeeds, getCategories, toggleFeed } from "@/lib/api";
import { getCategoryStyle } from "@/lib/categoryColors";

interface Props {
  open: boolean;
  onClose: () => void;
  selectedCategory: string | null;
  onSelectCategory: (c: string | null) => void;
  onFeedsChanged?: () => void;
}

export default function MobileSidebar({
  open,
  onClose,
  selectedCategory,
  onSelectCategory,
  onFeedsChanged,
}: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const { data: categories } = useSWR<Category[]>("categories", getCategories, {
    revalidateOnFocus: false,
  });

  const { data: feeds, mutate: mutateFeeds } = useSWR<Feed[]>("feeds", () => getFeeds(), {
    refreshInterval: 15_000,
  });

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

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

  function handleSelectCategory(id: string | null) {
    onSelectCategory(id);
    onClose();
  }

  const feedsByCategory = (feeds ?? []).reduce<Record<string, Feed[]>>((acc, f) => {
    (acc[f.category] ??= []).push(f);
    return acc;
  }, {});

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 glass-strong rounded-t-3xl shadow-2xl animate-slideUp flex flex-col"
        style={{ maxHeight: "85vh" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-white/30 dark:border-white/10">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Categories & Feeds</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl glass active:bg-white/50 transition-all"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-1">
          {/* All */}
          <button
            onClick={() => handleSelectCategory(null)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
              selectedCategory === null
                ? "glass-strong text-indigo-700 dark:text-indigo-300 shadow-sm"
                : "text-gray-600 dark:text-gray-300 active:bg-white/30"
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
                    handleSelectCategory(cat.id);
                    if (!isOpen) toggle(cat.id);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                    isSelected
                      ? `${s.bg} ${s.text} shadow-sm`
                      : "text-gray-600 dark:text-gray-300 active:bg-white/30"
                  }`}
                >
                  <span className="text-lg">{cat.emoji}</span>
                  <span className="flex-1 text-left">{cat.name}</span>
                  {activeCount > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${s.bg} ${s.text}`}>
                      {activeCount}
                    </span>
                  )}
                  <span
                    onClick={(e) => { e.stopPropagation(); toggle(cat.id); }}
                    className="p-1 -mr-1 rounded-lg active:bg-white/30"
                  >
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 opacity-50" />
                    ) : (
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    )}
                  </span>
                </button>

                {isOpen && (
                  <div className="ml-4 mt-1 mb-2 space-y-0.5 border-l-2 border-white/40 dark:border-white/10 pl-3">
                    {catFeeds.map((feed) => (
                      <div
                        key={feed.id}
                        className="flex items-center justify-between gap-2 py-2.5 px-2 rounded-lg active:bg-white/20 transition-all"
                      >
                        <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 truncate">
                          <span>{feed.emoji}</span>
                          <span className="truncate">{feed.name}</span>
                        </span>
                        <button
                          onClick={(e) => handleToggleFeed(e, feed)}
                          disabled={togglingId === feed.id}
                          className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-all ${
                            feed.is_active ? "bg-indigo-400" : "bg-gray-300 dark:bg-gray-600"
                          } ${togglingId === feed.id ? "opacity-50" : ""}`}
                          title={feed.is_active ? "Disable feed" : "Enable feed"}
                        >
                          <span
                            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              feed.is_active ? "translate-x-5" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                    {catFeeds.length === 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 py-2 px-2">No feeds available</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/30 dark:border-white/10 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <Rss className="w-3.5 h-3.5" />
          <span>Toggle feeds to start reading</span>
        </div>
      </div>
    </div>
  );
}
