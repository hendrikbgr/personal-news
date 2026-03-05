"use client";

import { useState } from "react";
import useSWR from "swr";
import { Search, RefreshCw, Bookmark, Trash2, X, Menu } from "lucide-react";
import { triggerRefresh, getStatus, resetSaved } from "@/lib/api";
import type { FetchStatus } from "@/lib/types";

interface Props {
  search: string;
  onSearch: (q: string) => void;
  showSaved: boolean;
  onToggleSaved: () => void;
  onRefreshed?: () => void;
  onOpenMobileSidebar?: () => void;
}

export default function Header({
  search,
  onSearch,
  showSaved,
  onToggleSaved,
  onRefreshed,
  onOpenMobileSidebar,
}: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: status } = useSWR<FetchStatus>("status", getStatus, {
    refreshInterval: 30_000,
  });

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await triggerRefresh();
      onRefreshed?.();
    } finally {
      setTimeout(() => setRefreshing(false), 2000);
    }
  }

  async function handleResetSaved() {
    setResetting(true);
    try {
      await resetSaved();
      onRefreshed?.();
    } finally {
      setResetting(false);
      setShowResetConfirm(false);
    }
  }

  return (
    <header className="glass-strong rounded-2xl md:rounded-3xl px-3 py-3 md:px-5 md:py-4 flex items-center gap-2 md:gap-4">
      {/* Mobile menu button */}
      <button
        onClick={onOpenMobileSidebar}
        className="md:hidden flex-shrink-0 p-2 -ml-1 rounded-xl glass active:bg-white/40 transition-all"
        aria-label="Open feed settings"
      >
        <Menu className="w-5 h-5 text-gray-600" />
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl md:rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center shadow-lg">
          <span className="text-base md:text-lg">📰</span>
        </div>
        <span className="font-bold text-gray-800 text-base md:text-lg hidden sm:block">Personal News</span>
      </div>

      {/* Search — full on desktop, expandable on mobile */}
      <div className={`relative transition-all duration-200 ${
        searchOpen ? "flex-1" : "flex-1 hidden sm:block"
      }`}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search articles…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          onBlur={() => { if (!search) setSearchOpen(false); }}
          autoFocus={searchOpen}
          className="w-full glass rounded-xl md:rounded-2xl pl-9 pr-9 py-2 md:py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-300/60 transition-all"
        />
        {search && (
          <button
            onClick={() => { onSearch(""); setSearchOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
          >
            <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Mobile search toggle */}
      {!searchOpen && (
        <button
          onClick={() => setSearchOpen(true)}
          className="sm:hidden flex-shrink-0 p-2 rounded-xl glass active:bg-white/40 transition-all"
          aria-label="Search"
        >
          <Search className="w-4.5 h-4.5 text-gray-600" />
        </button>
      )}

      {/* Controls */}
      <div className={`flex items-center gap-1.5 md:gap-2 flex-shrink-0 ${searchOpen ? "hidden sm:flex" : ""}`}>
        <button
          onClick={onToggleSaved}
          className={`flex items-center gap-1.5 p-2 md:px-3 md:py-2 rounded-xl text-sm font-medium transition-all ${
            showSaved
              ? "bg-indigo-100/70 text-indigo-700 border border-indigo-200/60"
              : "glass text-gray-600 hover:bg-white/40 active:bg-white/50"
          }`}
          title="Show saved articles"
        >
          <Bookmark className="w-4 h-4" />
          <span className="hidden md:block">Saved</span>
        </button>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 p-2 md:px-3 md:py-2 rounded-xl glass text-sm font-medium text-gray-600 hover:bg-white/40 active:bg-white/50 transition-all disabled:opacity-60"
          title="Refresh all feeds"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          <span className="hidden md:block">Refresh</span>
        </button>

        <button
          onClick={() => setShowResetConfirm(true)}
          className="hidden sm:flex items-center gap-1.5 p-2 md:px-3 md:py-2 rounded-xl glass text-sm font-medium text-gray-600 hover:bg-red-50/60 hover:text-red-600 active:bg-red-50/80 transition-all"
          title="Clear all saved articles"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden md:block">Reset Saved</span>
        </button>
      </div>

      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            className="glass-strong rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-sm sm:mx-4 shadow-2xl animate-fadeInUp"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              Delete all articles?
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently delete every article from the database. They will be re-fetched on the next refresh.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2.5 rounded-xl glass text-sm font-medium text-gray-600 hover:bg-white/40 active:bg-white/50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleResetSaved}
                disabled={resetting}
                className="px-4 py-2.5 rounded-xl bg-red-500/90 text-white text-sm font-medium hover:bg-red-600 active:bg-red-700 transition-all disabled:opacity-60"
              >
                {resetting ? "Clearing…" : "Yes, clear all"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status dot */}
      {status?.scheduler_running && (
        <div
          className="flex-shrink-0 flex items-center gap-1.5 text-xs text-gray-400 hidden lg:flex"
          title={`Last updated: ${status.last_run ? new Date(status.last_run).toLocaleTimeString() : "never"}`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </div>
      )}
    </header>
  );
}
