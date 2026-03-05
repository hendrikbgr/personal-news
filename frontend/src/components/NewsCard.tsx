"use client";

import { useState } from "react";
import Image from "next/image";
import { Bookmark, BookmarkCheck, Clock, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Article } from "@/lib/types";
import { toggleSaved } from "@/lib/api";
import { getCategoryStyle } from "@/lib/categoryColors";
import CategoryBadge from "./CategoryBadge";

interface Props {
  article: Article;
  onClick: () => void;
  onSavedChange?: (article: Article) => void;
}

export default function NewsCard({ article, onClick, onSavedChange }: Props) {
  const [saved, setSaved] = useState(article.is_saved);
  const [savingInFlight, setSavingInFlight] = useState(false);

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

  return (
    <article
      onClick={onClick}
      className="glass-card rounded-2xl overflow-hidden cursor-pointer group animate-fadeInUp"
      style={{ boxShadow: `0 4px 24px ${s.glow}` }}
    >
      {/* Mobile: horizontal layout */}
      <div className="flex sm:hidden">
        {/* Thumbnail */}
        <div className="relative w-28 flex-shrink-0 bg-white/20">
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

        {/* Content */}
        <div className="flex-1 min-w-0 p-3 flex flex-col justify-between gap-1.5">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <CategoryBadge category={article.category} />
              <button
                onClick={handleSave}
                className="p-1.5 -mr-1 rounded-full active:bg-white/40 transition-all flex-shrink-0"
              >
                {saved ? (
                  <BookmarkCheck className="w-4 h-4 text-indigo-600" />
                ) : (
                  <Bookmark className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
            <h3 className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2">
              {article.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {publishedLabel && <span className="truncate">{publishedLabel}</span>}
            {readTime && (
              <span className="flex items-center gap-0.5 flex-shrink-0">
                <Clock className="w-3 h-3" />
                {readTime}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Desktop: vertical card layout */}
      <div className="hidden sm:block">
        {/* Image */}
        <div className="relative h-44 bg-white/20 overflow-hidden">
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
          <button
            onClick={handleSave}
            className="absolute top-2 right-2 p-1.5 rounded-full glass transition-all hover:scale-110"
            title={saved ? "Unsave" : "Save"}
          >
            {saved ? (
              <BookmarkCheck className="w-4 h-4 text-indigo-600" />
            ) : (
              <Bookmark className="w-4 h-4 text-gray-500" />
            )}
          </button>
          {!article.is_read && (
            <span className="absolute top-2 left-2 w-2 h-2 rounded-full bg-indigo-500 shadow-lg" />
          )}
        </div>

        {/* Body */}
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <CategoryBadge category={article.category} />
            {article.expand?.feed_id && (
              <span className="text-xs text-gray-500 truncate">
                {article.expand.feed_id.source}
              </span>
            )}
          </div>

          <h3 className="font-semibold text-gray-800 leading-snug line-clamp-3 group-hover:text-indigo-700 transition-colors">
            {article.title}
          </h3>

          {article.description && (
            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
              {article.description}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-gray-500 pt-1">
            {publishedLabel && <span>{publishedLabel}</span>}
            {readTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {readTime}
              </span>
            )}
            <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    </article>
  );
}
