"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Search, RefreshCw, Bookmark, X, Menu, Settings, LayoutGrid, List, CheckCheck, Moon, Sun, Download, History } from "lucide-react";
import { triggerRefresh, getStatus, exportSaved } from "@/lib/api";
import type { FetchStatus } from "@/lib/types";
import { useTheme } from "./ThemeProvider";

type ViewStyle = "grid" | "list";

interface Props {
  search: string;
  onSearch: (q: string) => void;
  showSaved: boolean;
  onToggleSaved: () => void;
  onRefreshed?: () => void;
  onOpenMobileSidebar?: () => void;
  viewStyle?: ViewStyle;
  onViewStyleChange?: (style: ViewStyle) => void;
  hasUnread?: boolean;
  onMarkAllRead?: () => void;
}

export default function Header({
  search,
  onSearch,
  showSaved,
  onToggleSaved,
  onRefreshed,
  onOpenMobileSidebar,
  viewStyle = "grid",
  onViewStyleChange,
  hasUnread,
  onMarkAllRead,
}: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [markDone, setMarkDone] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

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

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const blob = await exportSaved();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `saved-articles-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    finally {
      setExporting(false);
    }
  }

  async function handleMarkAllRead() {
    if (!onMarkAllRead) return;
    await onMarkAllRead();
    setMarkDone(true);
    setTimeout(() => setMarkDone(false), 1500);
  }

  return (
    <header className="glass-strong rounded-2xl md:rounded-3xl px-3 py-3 md:px-5 md:py-4 flex items-center gap-2 md:gap-4">
      {/* Mobile menu button */}
      <button
        onClick={onOpenMobileSidebar}
        className="md:hidden flex-shrink-0 p-2 -ml-1 rounded-xl glass active:bg-white/40 transition-all"
        aria-label="Open feed settings"
      >
        <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl md:rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center shadow-lg">
          <span className="text-base md:text-lg">📰</span>
        </div>
        <span className="font-bold text-gray-800 dark:text-gray-100 text-base md:text-lg hidden sm:block">Personal News</span>
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
          className="w-full glass rounded-xl md:rounded-2xl pl-9 pr-9 py-2 md:py-2.5 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-300/60 transition-all"
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
          <Search className="w-4.5 h-4.5 text-gray-600 dark:text-gray-300" />
        </button>
      )}

      {/* Controls */}
      <div className={`flex items-center gap-1.5 md:gap-2 flex-shrink-0 ${searchOpen ? "hidden sm:flex" : ""}`}>
        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 p-2 md:px-3 md:py-2 rounded-xl glass text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-white/40 active:bg-white/50 transition-all"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span className="hidden md:block">{theme === "dark" ? "Light" : "Dark"}</span>
        </button>

        {/* View style toggle */}
        <button
          onClick={() => onViewStyleChange?.(viewStyle === "grid" ? "list" : "grid")}
          className="flex items-center gap-1.5 p-2 md:px-3 md:py-2 rounded-xl glass text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-white/40 active:bg-white/50 transition-all"
          title={viewStyle === "grid" ? "Switch to list view" : "Switch to grid view"}
        >
          {viewStyle === "grid" ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          <span className="hidden md:block">{viewStyle === "grid" ? "List" : "Grid"}</span>
        </button>

        {/* Mark all read */}
        {hasUnread && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 p-2 md:px-3 md:py-2 rounded-xl glass text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-white/40 active:bg-white/50 transition-all"
            title="Mark all visible articles as read"
          >
            <CheckCheck className={`w-4 h-4 ${markDone ? "text-emerald-500" : ""}`} />
            <span className="hidden md:block">{markDone ? "Done!" : "Mark read"}</span>
          </button>
        )}

        <button
          onClick={onToggleSaved}
          className={`flex items-center gap-1.5 p-2 md:px-3 md:py-2 rounded-xl text-sm font-medium transition-all ${
            showSaved
              ? "bg-indigo-100/70 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/30"
              : "glass text-gray-600 dark:text-gray-300 hover:bg-white/40 active:bg-white/50"
          }`}
          title="Show saved articles"
        >
          <Bookmark
            className={`w-4 h-4 transition-all duration-200 ${
              showSaved ? "fill-indigo-500 text-indigo-500 dark:fill-indigo-400 dark:text-indigo-400" : "fill-transparent"
            }`}
          />
          <span className="hidden md:block">Saved</span>
        </button>

        {showSaved && (
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 p-2 md:px-3 md:py-2 rounded-xl glass text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-white/40 active:bg-white/50 transition-all disabled:opacity-60"
            title="Export saved articles as JSON"
          >
            <Download className={`w-4 h-4 ${exporting ? "animate-pulse" : ""}`} />
            <span className="hidden md:block">Export</span>
          </button>
        )}

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 p-2 md:px-3 md:py-2 rounded-xl glass text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-white/40 active:bg-white/50 transition-all disabled:opacity-60"
          title="Refresh all feeds"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          <span className="hidden md:block">Refresh</span>
        </button>

        <Link
          href="/history"
          className="flex items-center gap-1.5 p-2 md:px-3 md:py-2 rounded-xl glass text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-white/40 active:bg-white/50 transition-all"
          title="Read history"
        >
          <History className="w-4 h-4" />
          <span className="hidden md:block">History</span>
        </Link>

        <Link
          href="/manage"
          className="flex items-center gap-1.5 p-2 md:px-3 md:py-2 rounded-xl glass text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-white/40 active:bg-white/50 transition-all"
          title="Manage feeds & categories"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden md:block">Manage</span>
        </Link>
      </div>

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
