"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import {
  X,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Clock,
  User,
  Calendar,
  ChevronLeft,
} from "lucide-react";
import { format } from "date-fns";
import type { Article } from "@/lib/types";
import { getArticle, toggleSaved } from "@/lib/api";
import CategoryBadge from "./CategoryBadge";

interface Props {
  articleId: string;
  onClose: () => void;
}

export default function ArticleModal({ articleId, onClose }: Props) {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    getArticle(articleId)
      .then((a) => {
        setArticle(a);
        setSaved(a.is_saved);
      })
      .finally(() => setLoading(false));
  }, [articleId]);

  const stableClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stableClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [stableClose]);

  async function handleSave() {
    if (!article) return;
    try {
      const updated = await toggleSaved(article.id);
      setSaved(updated.is_saved);
    } catch {
      /* ignore */
    }
  }

  const readTime = article?.word_count
    ? `${Math.max(1, Math.round(article.word_count / 200))} min read`
    : null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/30 backdrop-blur-sm"
      onClick={(e) => e.target === overlayRef.current && stableClose()}
    >
      {/* Full-screen on mobile, centered modal on desktop */}
      <div className="glass-reading w-full sm:max-w-3xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-3xl flex flex-col shadow-2xl animate-fadeInUp">
        {/* Mobile header — sticky top bar with back button */}
        <div className="sm:hidden flex items-center justify-between px-3 py-2.5 border-b border-white/30 flex-shrink-0">
          <button
            onClick={stableClose}
            className="flex items-center gap-1 p-1.5 -ml-1 rounded-xl active:bg-white/40 transition-all text-gray-600"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="flex items-center gap-1.5">
            {article && (
              <>
                <button
                  onClick={handleSave}
                  className="p-2 rounded-xl active:bg-white/40 transition-all"
                >
                  {saved ? (
                    <BookmarkCheck className="w-5 h-5 text-indigo-600" />
                  ) : (
                    <Bookmark className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl active:bg-white/40 transition-all"
                >
                  <ExternalLink className="w-5 h-5 text-gray-500" />
                </a>
              </>
            )}
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden sm:flex items-center justify-between p-5 border-b border-white/30 flex-shrink-0">
          <div className="flex items-center gap-2">
            {article && <CategoryBadge category={article.category} size="md" />}
            {article?.expand?.feed_id && (
              <span className="text-sm text-gray-500">
                {article.expand.feed_id.emoji} {article.expand.feed_id.source}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {article && (
              <>
                <button
                  onClick={handleSave}
                  className="p-2 rounded-xl glass hover:bg-white/40 transition-all"
                  title={saved ? "Unsave" : "Save for later"}
                >
                  {saved ? (
                    <BookmarkCheck className="w-4 h-4 text-indigo-600" />
                  ) : (
                    <Bookmark className="w-4 h-4 text-gray-500" />
                  )}
                </button>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl glass hover:bg-white/40 transition-all"
                  title="Open original article"
                >
                  <ExternalLink className="w-4 h-4 text-gray-500" />
                </a>
              </>
            )}
            <button
              onClick={stableClose}
              className="p-2 rounded-xl glass hover:bg-white/40 transition-all"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div ref={contentRef} className="flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="p-6 sm:p-8 space-y-4">
              <div className="h-6 shimmer rounded-full" />
              <div className="h-6 w-4/5 shimmer rounded-full" />
              <div className="h-48 shimmer rounded-2xl" />
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={`h-4 shimmer rounded-full ${i % 3 === 2 ? "w-2/3" : ""}`} />
                ))}
              </div>
            </div>
          ) : article ? (
            <div className="p-5 sm:p-6 md:p-8">
              {/* Mobile category badge */}
              <div className="sm:hidden flex items-center gap-2 mb-3">
                <CategoryBadge category={article.category} size="md" />
                {article.expand?.feed_id && (
                  <span className="text-sm text-gray-500">
                    {article.expand.feed_id.emoji} {article.expand.feed_id.source}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 leading-tight mb-4">
                {article.title}
              </h1>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-gray-500 mb-5 sm:mb-6">
                {article.author && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[150px]">{article.author}</span>
                  </span>
                )}
                {article.published_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(article.published_at), "MMM d, yyyy")}
                  </span>
                )}
                {readTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {readTime}
                  </span>
                )}
              </div>

              {/* Hero image */}
              {article.image_url && (
                <div className="relative h-48 sm:h-64 md:h-80 -mx-5 sm:mx-0 sm:rounded-2xl overflow-hidden mb-5 sm:mb-6">
                  <Image
                    src={article.image_url}
                    alt={article.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}

              {/* Summary box */}
              {article.summary && article.summary !== article.description && (
                <div className="glass rounded-xl sm:rounded-2xl p-4 mb-5 sm:mb-6 border-l-4 border-indigo-300">
                  <p className="text-sm font-medium text-indigo-800 mb-1">Summary</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{article.summary}</p>
                </div>
              )}

              {/* Full content or description */}
              <div className="article-content text-[15px] sm:text-base leading-relaxed">
                {article.content ? (
                  article.content.split("\n").map((para, i) =>
                    para.trim() ? <p key={i}>{para}</p> : <br key={i} />
                  )
                ) : (
                  <p>{article.description}</p>
                )}
              </div>

              {/* Keywords */}
              {article.keywords && (
                <div className="mt-5 sm:mt-6 pt-4 border-t border-white/30 flex flex-wrap gap-2">
                  {article.keywords.split(",").map((kw) => (
                    <span
                      key={kw}
                      className="px-2.5 py-1 text-xs glass rounded-full text-gray-600"
                    >
                      {kw.trim()}
                    </span>
                  ))}
                </div>
              )}

              {/* Original link */}
              <div className="mt-5 sm:mt-6 pt-4 border-t border-white/30 pb-4 sm:pb-0">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-indigo-600 active:text-indigo-800 font-medium py-2"
                >
                  Read full article at {article.expand?.feed_id?.source ?? "source"}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">Article not found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
