"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Clock, ExternalLink, FileText, Rss } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Article } from "@/lib/types";
import { toggleSaved, markRead } from "@/lib/api";
import { getCategoryStyle } from "@/lib/categoryColors";
import CategoryBadge from "./CategoryBadge";
import SaveButton from "./SaveButton";

interface Props {
  article: Article;
  onClick: () => void;
  onSavedChange?: (article: Article) => void;
  onRead?: (id: string) => void;
  viewStyle?: "grid" | "list";
  isFocused?: boolean;
  cardRef?: (el: HTMLElement | null) => void;
}

export default function NewsCard({ article, onClick, onSavedChange, onRead, viewStyle = "grid", isFocused, cardRef }: Props) {
  const [saved, setSaved] = useState(article.is_saved);
  const [savingInFlight, setSavingInFlight] = useState(false);
  const articleRef = useRef<HTMLElement | null>(null);
  const hasFired = useRef(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      localStorage.getItem("auto-mark-read") !== "true" ||
      article.is_read ||
      !articleRef.current
    ) return;

    const el = articleRef.current;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasFired.current) {
          timeout = setTimeout(async () => {
            hasFired.current = true;
            try {
              await markRead(article.id);
              onRead?.(article.id);
            } catch { /* ignore */ }
          }, 1500);
        } else if (!entry.isIntersecting && timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timeout) clearTimeout(timeout);
    };
  }, [article.id, article.is_read, onRead]);

  const s = getCategoryStyle(article.category);
  const readTime = article.word_count
    ? `${Math.max(1, Math.round(article.word_count / 200))} min read`
    : null;

  const publishedLabel = article.published_at
    ? formatDistanceToNow(new Date(article.published_at), { addSuffix: true })
    : "";

  async function handleSave(e: React.MouseEvent) {
    e.stopPropagation();
    if (savingInFlight) return;
    setSavingInFlight(true);
    try {
      const updated = await toggleSaved(article.id);
      setSaved(updated.is_saved);
      onSavedChange?.({ ...article, is_saved: updated.is_saved });
    } catch {
      /* ignore */
    } finally {
      setSavingInFlight(false);
    }
  }

  const focusRing = isFocused ? "ring-2 ring-indigo-400/70 ring-offset-1" : "";

  // ── List view ──────────────────────────────────────────────────────────────
  const mergedRef = (el: HTMLElement | null) => {
    articleRef.current = el;
    cardRef?.(el);
  };

  if (viewStyle === "list") {
    return (
      <article
        ref={mergedRef}
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/10 dark:hover:bg-white/5 transition-colors ${focusRing}`}
      >
        {/* Unread dot */}
        <span className={`w-2 h-2 flex-shrink-0 rounded-full ${!article.is_read ? "bg-indigo-500" : "bg-transparent"}`} />

        {/* Feed emoji */}
        <div className={`w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center text-base ${s.bg}`}>
          {article.expand?.feed_id?.emoji ?? "📰"}
        </div>

        {/* Title */}
        <span className="flex-1 min-w-0 text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
          {article.title}
        </span>

        {/* Meta */}
        <span className="flex items-center gap-2 flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
          {article.expand?.feed_id?.source && (
            <span className="hidden sm:block truncate max-w-[80px]">{article.expand.feed_id.source}</span>
          )}
          {publishedLabel && <span className="hidden md:block">{publishedLabel}</span>}
          {readTime && (
            <span className="hidden lg:flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {readTime}
            </span>
          )}
          {article.fetch_status === "full" ? (
            <span title="Full article"><FileText className="w-3.5 h-3.5 text-emerald-500" /></span>
          ) : (
            <span title="RSS summary"><Rss className="w-3.5 h-3.5 text-amber-500" /></span>
          )}
        </span>

        {/* Save */}
        <SaveButton
          saved={saved}
          onToggle={handleSave}
          size="sm"
          className="flex-shrink-0 p-1.5 rounded-full transition-all hover:scale-110"
        />
      </article>
    );
  }

  // ── Grid view ──────────────────────────────────────────────────────────────
  return (
    <article
      ref={mergedRef}
      onClick={onClick}
      className={`glass-card rounded-2xl overflow-hidden cursor-pointer group animate-fadeInUp ${focusRing}`}
      style={{ boxShadow: `0 4px 24px ${s.glow}`, transform: "translateZ(0)" }}
    >
      {/* Mobile: horizontal layout */}
      <div className="relative flex sm:hidden">
        {/* Thumbnail */}
        <div className="relative w-28 flex-shrink-0 bg-white/20 dark:bg-white/5 rounded-l-2xl overflow-hidden">
          {article.image_url ? (
            <Image
              src={article.image_url}
              alt={article.title}
              fill
              sizes="112px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center text-3xl ${s.bg}`}>
              {article.expand?.feed_id?.emoji ?? "📰"}
            </div>
          )}
          {!article.is_read && (
            <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-indigo-500 shadow-lg" />
          )}
        </div>

        {/* Corner gradient + save button */}
        <div
          className="absolute top-0 right-0 w-16 h-16 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to bottom left, rgba(0,0,0,0.20) 0%, transparent 70%)" }}
        />
        <SaveButton
          saved={saved}
          onToggle={handleSave}
          size="sm"
          className="absolute top-1.5 right-1.5 z-20 p-1.5 rounded-full transition-all active:scale-110"
        />

        {/* Content */}
        <div className="flex-1 min-w-0 p-3 flex flex-col justify-between gap-1.5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CategoryBadge category={article.category} />
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-snug line-clamp-2">
              {article.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {publishedLabel && <span className="truncate">{publishedLabel}</span>}
            {readTime && (
              <span className="flex items-center gap-0.5 flex-shrink-0">
                <Clock className="w-3 h-3" />
                {readTime}
              </span>
            )}
            <span title={article.fetch_status === "full" ? "Full article" : "Summary only"} className="flex-shrink-0">
              {article.fetch_status === "full" ? (
                <FileText className="w-3 h-3 text-emerald-500" />
              ) : (
                <Rss className="w-3 h-3 text-amber-500" />
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Desktop: vertical card layout */}
      <div className="hidden sm:block">
        {/* Image */}
        <div className="relative h-44 bg-white/20 dark:bg-white/5 overflow-hidden rounded-t-2xl">
          {article.image_url ? (
            <Image
              src={article.image_url}
              alt={article.title}
              fill
              sizes="(max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              unoptimized
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center text-5xl ${s.bg}`}>
              {article.expand?.feed_id?.emoji ?? "📰"}
            </div>
          )}
          <div
            className="absolute top-0 right-0 w-24 h-24 pointer-events-none"
            style={{ background: "linear-gradient(to bottom left, rgba(0,0,0,0.20) 0%, transparent 70%)" }}
          />
          <SaveButton
            saved={saved}
            onToggle={handleSave}
            size="sm"
            className="absolute top-2 right-2 z-10 p-1.5 rounded-full transition-all hover:scale-110"
          />
          {!article.is_read && (
            <span className="absolute top-2 left-2 w-2 h-2 rounded-full bg-indigo-500 shadow-lg" />
          )}
        </div>

        {/* Body */}
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <CategoryBadge category={article.category} />
            {article.expand?.feed_id && (
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {article.expand.feed_id.source}
              </span>
            )}
          </div>

          <h3 className="font-semibold text-gray-800 dark:text-gray-100 leading-snug line-clamp-3 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
            {article.title}
          </h3>

          {article.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
              {article.description}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 pt-1">
            {publishedLabel && <span>{publishedLabel}</span>}
            {readTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {readTime}
              </span>
            )}
            {article.fetch_status === "full" ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400" title="Full article available">
                <FileText className="w-3 h-3" />
                Full
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400" title="RSS summary only">
                <Rss className="w-3 h-3" />
                Summary
              </span>
            )}
            <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    </article>
  );
}
