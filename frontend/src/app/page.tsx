"use client";

import { useState, useCallback } from "react";
import { SWRConfig } from "swr";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import NewsGrid from "@/components/NewsGrid";
import MobileSidebar from "@/components/MobileSidebar";
import type { ArticleFilters } from "@/lib/api";

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showSaved, setShowSaved] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const filters: ArticleFilters = {
    category: selectedCategory ?? undefined,
    search: search || undefined,
    isSaved: showSaved ? true : undefined,
  };

  const handleRefreshed = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleFeedsChanged = useCallback(() => {
    setTimeout(() => setRefreshKey((k) => k + 1), 2000);
  }, []);

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
        />

        {/* Mobile category pills — below header, scrollable */}
        <div className="md:hidden flex gap-1.5 overflow-x-auto scrollbar-none -mx-2 px-2 pb-0.5 flex-shrink-0">
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
                  ? "glass-strong text-indigo-700 shadow-sm"
                  : "glass text-gray-600 active:bg-white/40"
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
            {/* Desktop status line */}
            <div className="hidden md:flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
              {showSaved && (
                <span className="glass-strong px-3 py-1 rounded-full text-sm text-indigo-700 font-medium flex-shrink-0">
                  🔖 Saved
                </span>
              )}
              {search && (
                <span className="glass px-3 py-1 rounded-full text-sm text-gray-600 flex-shrink-0">
                  Search: &ldquo;{search}&rdquo;
                </span>
              )}
              {!showSaved && !search && (
                <span className="glass px-3 py-1 rounded-full text-sm text-gray-500 flex-shrink-0">
                  {selectedCategory
                    ? `Browsing ${selectedCategory}`
                    : "All articles"}
                </span>
              )}
            </div>

            <NewsGrid filters={filters} refreshKey={refreshKey} sidebarOpen={sidebarOpen} />
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
