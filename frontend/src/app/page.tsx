"use client";

import { useState, useCallback, useEffect } from "react";
import useSWR from "swr";
import { SWRConfig } from "swr";
import { FileText, Rss, LayoutGrid, Calendar } from "lucide-react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import NewsGrid from "@/components/NewsGrid";
import MobileSidebar from "@/components/MobileSidebar";
import type { ArticleFilters } from "@/lib/api";
import { getUnreadCount, markAllRead } from "@/lib/api";

type DateRange = "today" | "24h" | "week" | null;
type ViewStyle = "grid" | "list";

function getPublishedAfter(range: DateRange): string | undefined {
  if (!range) return undefined;
  if (range === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  if (range === "24h") return new Date(Date.now() - 86_400_000).toISOString();
  if (range === "week") return new Date(Date.now() - 7 * 86_400_000).toISOString();
}

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showSaved, setShowSaved] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<"full" | "summary" | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [viewStyle, setViewStyle] = useState<ViewStyle>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("view-style") as ViewStyle) ?? "grid";
    }
    return "grid";
  });

  const publishedAfter = getPublishedAfter(dateRange);

  const filters: ArticleFilters = {
    category: selectedCategory ?? undefined,
    search: search || undefined,
    isSaved: showSaved ? true : undefined,
    fetchStatus: fetchStatus ?? undefined,
    publishedAfter,
  };

  // Unread count for tab title + mark-all-read button
  const { data: unreadCount = 0, mutate: mutateUnread } = useSWR(
    "unreadCount",
    getUnreadCount,
    { refreshInterval: 120_000 }
  );

  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount}) Personal News` : "Personal News";
  }, [unreadCount]);

  const handleRefreshed = useCallback(() => {
    setRefreshKey((k) => k + 1);
    mutateUnread();
  }, [mutateUnread]);

  const handleFeedsChanged = useCallback(() => {
    setTimeout(() => setRefreshKey((k) => k + 1), 2000);
  }, []);

  const handleViewStyleChange = useCallback((style: ViewStyle) => {
    setViewStyle(style);
    localStorage.setItem("view-style", style);
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    await markAllRead({
      category: selectedCategory ?? undefined,
      fetchStatus: fetchStatus ?? undefined,
      publishedAfter,
    });
    setRefreshKey((k) => k + 1);
    mutateUnread();
  }, [selectedCategory, fetchStatus, publishedAfter, mutateUnread]);

  const DATE_PILLS: { value: DateRange; label: string }[] = [
    { value: null, label: "All time" },
    { value: "today", label: "Today" },
    { value: "24h", label: "24h" },
    { value: "week", label: "Week" },
  ];

  return (
    <SWRConfig value={{ revalidateOnFocus: false }}>
      <div className="h-[100dvh] p-2 sm:p-3 md:p-4 flex flex-col gap-2 sm:gap-3">
        {/* Header */}
        <Header
          search={search}
          onSearch={setSearch}
          showSaved={showSaved}
          onToggleSaved={() => setShowSaved((v) => !v)}
          onRefreshed={handleRefreshed}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          viewStyle={viewStyle}
          onViewStyleChange={handleViewStyleChange}
          hasUnread={unreadCount > 0}
          onMarkAllRead={handleMarkAllRead}
        />

        {/* Mobile pills row — fetch status + date range + categories */}
        <div className="md:hidden flex gap-1.5 overflow-x-auto scrollbar-none -mx-2 px-2 pb-0.5 flex-shrink-0">
          {/* Fetch status */}
          <button
            onClick={() => setFetchStatus(null)}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              fetchStatus === null ? "glass-strong text-gray-700 dark:text-gray-200 shadow-sm" : "glass text-gray-500 dark:text-gray-400"
            }`}
          >
            <LayoutGrid className="w-3 h-3" />
          </button>
          <button
            onClick={() => setFetchStatus("full")}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              fetchStatus === "full" ? "glass-strong text-emerald-700 shadow-sm" : "glass text-gray-500 dark:text-gray-400"
            }`}
          >
            <FileText className="w-3 h-3" /> Full
          </button>
          <button
            onClick={() => setFetchStatus("summary")}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              fetchStatus === "summary" ? "glass-strong text-amber-700 shadow-sm" : "glass text-gray-500 dark:text-gray-400"
            }`}
          >
            <Rss className="w-3 h-3" /> RSS
          </button>
          <span className="text-gray-300 dark:text-gray-600 self-center flex-shrink-0 select-none">|</span>
          {/* Date range */}
          {DATE_PILLS.filter((p) => p.value !== null).map(({ value, label }) => (
            <button
              key={value ?? "all"}
              onClick={() => setDateRange(value)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                dateRange === value ? "glass-strong text-indigo-700 dark:text-indigo-300 shadow-sm" : "glass text-gray-500 dark:text-gray-400"
              }`}
            >
              <Calendar className="w-3 h-3" /> {label}
            </button>
          ))}
          {dateRange !== null && (
            <button
              onClick={() => setDateRange(null)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all glass text-gray-500 dark:text-gray-400"
            >
              All time
            </button>
          )}
          <span className="text-gray-300 dark:text-gray-600 self-center flex-shrink-0 select-none">|</span>
          {/* Categories */}
          {[
            { id: null, label: "All", emoji: "📋" },
            { id: "world", label: "World", emoji: "🌍" },
            { id: "technology", label: "Tech", emoji: "💻" },
            { id: "science", label: "Science", emoji: "🧬" },
            { id: "business", label: "Business", emoji: "📊" },
            { id: "health", label: "Health", emoji: "❤️" },
            { id: "sports", label: "Sports", emoji: "⚽" },
            { id: "entertainment", label: "Entmt", emoji: "🎬" },
            { id: "politics", label: "Politics", emoji: "🏛️" },
          ].map(({ id, label, emoji }) => (
            <button
              key={id ?? "all"}
              onClick={() => setSelectedCategory(id)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedCategory === id
                  ? "glass-strong text-indigo-700 dark:text-indigo-300 shadow-sm"
                  : "glass text-gray-600 dark:text-gray-400 active:bg-white/40"
              }`}
            >
              <span>{emoji}</span>
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-3 flex-1 min-h-0 overflow-hidden">
          {/* Sidebar (desktop) */}
          <aside className={`flex-shrink-0 hidden md:block ${sidebarOpen ? "w-60" : "w-auto"}`}>
            <Sidebar
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onFeedsChanged={handleFeedsChanged}
              collapsed={!sidebarOpen}
              onToggleCollapse={() => setSidebarOpen((v) => !v)}
            />
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {/* Desktop filter bar */}
            <div className="hidden md:flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none flex-shrink-0">
              {/* Fetch status */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setFetchStatus(null)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    fetchStatus === null ? "glass-strong text-gray-700 dark:text-gray-200" : "glass text-gray-500 dark:text-gray-400 hover:text-gray-700"
                  }`}
                >
                  <LayoutGrid className="w-3 h-3" /> All
                </button>
                <button
                  onClick={() => setFetchStatus("full")}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    fetchStatus === "full" ? "glass-strong text-emerald-700" : "glass text-gray-500 dark:text-gray-400 hover:text-gray-700"
                  }`}
                >
                  <FileText className="w-3 h-3" /> Full
                </button>
                <button
                  onClick={() => setFetchStatus("summary")}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    fetchStatus === "summary" ? "glass-strong text-amber-700" : "glass text-gray-500 dark:text-gray-400 hover:text-gray-700"
                  }`}
                >
                  <Rss className="w-3 h-3" /> RSS
                </button>
              </div>
              <span className="text-gray-300 dark:text-gray-600 select-none flex-shrink-0">·</span>
              {/* Date range */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {DATE_PILLS.map(({ value, label }) => (
                  <button
                    key={value ?? "all"}
                    onClick={() => setDateRange(value)}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      dateRange === value
                        ? "glass-strong text-indigo-700 dark:text-indigo-300"
                        : "glass text-gray-500 dark:text-gray-400 hover:text-gray-700"
                    }`}
                  >
                    {value !== null && <Calendar className="w-3 h-3" />}
                    {label}
                  </button>
                ))}
              </div>
              <span className="text-gray-300 dark:text-gray-600 select-none flex-shrink-0">·</span>
              {/* Active filter tags */}
              {showSaved && (
                <span className="glass-strong px-3 py-1 rounded-full text-sm text-indigo-700 dark:text-indigo-300 font-medium flex-shrink-0">
                  🔖 Saved
                </span>
              )}
              {search && (
                <span className="glass px-3 py-1 rounded-full text-sm text-gray-600 dark:text-gray-300 flex-shrink-0">
                  Search: &ldquo;{search}&rdquo;
                </span>
              )}
              {!showSaved && !search && (
                <span className="glass px-3 py-1 rounded-full text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                  {selectedCategory ? `Browsing ${selectedCategory}` : "All articles"}
                </span>
              )}
            </div>

            <NewsGrid
              filters={filters}
              refreshKey={refreshKey}
              sidebarOpen={sidebarOpen}
              viewStyle={viewStyle}
            />
          </main>
        </div>
      </div>

      {/* Mobile sidebar drawer */}
      <MobileSidebar
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onFeedsChanged={handleFeedsChanged}
      />
    </SWRConfig>
  );
}
