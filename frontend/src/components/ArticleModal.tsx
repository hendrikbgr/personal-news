"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import {
  X,
  ExternalLink,
  Clock,
  User,
  Calendar,
  ChevronLeft,
  FileText,
  Rss,
  Hash,
  BarChart2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type { Article } from "@/lib/types";
import { getArticle, toggleSaved } from "@/lib/api";
import CategoryBadge from "./CategoryBadge";
import SaveButton from "./SaveButton";

interface Props {
  articleId: string;
  onClose: () => void;
}

export default function ArticleModal({ articleId, onClose }: Props) {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

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
    ? Math.max(1, Math.round(article.word_count / 200))
    : null;

  const hasSummary = !!(
    article?.summary && article.summary !== article.description
  );
  const hasFullContent = !!(
    article?.content && article.fetch_status === "full"
  );

  // Split content into non-empty paragraphs, skipping blank lines
  function renderContent(text: string) {
    const paras = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return paras.map((para, i) => <p key={i}>{para}</p>);
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/30 backdrop-blur-sm"
      onClick={(e) => e.target === overlayRef.current && stableClose()}
    >
      <div className="glass-reading w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[92vh] sm:rounded-3xl flex flex-col shadow-2xl animate-fadeInUp">
        {/* Mobile header */}
        <div className="sm:hidden flex items-center justify-between px-3 py-2.5 border-b border-white/30 flex-shrink-0">
          <button
            onClick={stableClose}
            className="flex items-center gap-1 p-1.5 -ml-1 rounded-xl active:bg-white/40 transition-all text-gray-600"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          {article && (
            <div className="flex items-center gap-1.5">
              <SaveButton
                saved={saved}
                onToggle={handleSave}
                size="lg"
                variant="surface"
                className="p-2 rounded-xl active:bg-white/40 transition-all"
              />
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl active:bg-white/40 transition-all"
              >
                <ExternalLink className="w-5 h-5 text-gray-500" />
              </a>
            </div>
          )}
        </div>

        {/* Desktop header */}
        <div className="hidden sm:flex items-center justify-between px-5 py-4 border-b border-white/30 flex-shrink-0">
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
                <SaveButton
                  saved={saved}
                  onToggle={handleSave}
                  size="md"
                  variant="surface"
                  className="p-2 rounded-xl glass hover:bg-white/40 transition-all"
                />
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
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="p-6 sm:p-8 space-y-4">
              <div className="h-6 shimmer rounded-full" />
              <div className="h-6 w-4/5 shimmer rounded-full" />
              <div className="h-48 shimmer rounded-2xl" />
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-4 shimmer rounded-full ${i % 3 === 2 ? "w-2/3" : ""}`}
                  />
                ))}
              </div>
            </div>
          ) : article ? (
            <div className="p-5 sm:p-7">
              {/* Mobile: category + source */}
              <div className="sm:hidden flex items-center gap-2 mb-3">
                <CategoryBadge category={article.category} size="md" />
                {article.expand?.feed_id && (
                  <span className="text-sm text-gray-500">
                    {article.expand.feed_id.emoji}{" "}
                    {article.expand.feed_id.source}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 leading-snug mb-4 tracking-tight">
                {article.title}
              </h1>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-500 mb-5 pb-5 border-b border-white/40">
                {article.author && (
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate max-w-[180px]">{article.author}</span>
                  </span>
                )}
                {article.published_at && (
                  <span
                    className="flex items-center gap-1.5"
                    title={format(new Date(article.published_at), "MMM d, yyyy 'at' h:mm a")}
                  >
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    {formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}
                  </span>
                )}
                {readTime && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    {readTime} min
                    {article.word_count ? (
                      <span className="text-gray-400">
                        · {article.word_count.toLocaleString()} words
                      </span>
                    ) : null}
                  </span>
                )}
                {article.fetch_status === "full" ? (
                  <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                    <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                    Full article
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-amber-500">
                    <Rss className="w-3.5 h-3.5 flex-shrink-0" />
                    RSS only
                  </span>
                )}
              </div>

              {/* Hero image */}
              {article.image_url && (
                <div className="relative h-52 sm:h-72 -mx-5 sm:mx-0 sm:rounded-2xl overflow-hidden mb-6">
                  <Image
                    src={article.image_url}
                    alt={article.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}

              {/* AI summary */}
              {hasSummary && (
                <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-5 mb-6 border-l-4 border-indigo-300/70">
                  <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-2">
                    Summary
                  </p>
                  <p className="text-[15px] text-gray-700 leading-relaxed">
                    {article.summary}
                  </p>
                </div>
              )}

              {/* Full content */}
              <div className="article-content text-[15px] sm:text-base text-gray-700">
                {hasFullContent ? (
                  <>
                    {/* Lead: show RSS description as italic intro if different from content */}
                    {article.description &&
                      !article.content
                        .trim()
                        .startsWith(article.description.trim().slice(0, 60)) && (
                        <p className="text-base text-gray-500 italic mb-4 pb-4 border-b border-white/40">
                          {article.description}
                        </p>
                      )}
                    {renderContent(article.content)}
                  </>
                ) : (
                  <>
                    <p>{article.description}</p>
                    <div className="mt-5 glass rounded-xl p-4 flex items-start gap-3">
                      <Rss className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-500">
                        Only the RSS excerpt is available.{" "}
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-500 underline"
                        >
                          Read the full story at{" "}
                          {article.expand?.feed_id?.source ?? "the source"}
                        </a>
                        .
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Keywords / topics */}
              {article.keywords && (
                <div className="mt-6 pt-5 border-t border-white/40">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
                    <Hash className="w-3 h-3" /> Topics
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {article.keywords.split(",").map((kw) => (
                      <span
                        key={kw}
                        className="px-3 py-1 text-xs glass rounded-full text-gray-600 font-medium"
                      >
                        {kw.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-6 pt-5 border-t border-white/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 sm:pb-0">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  Read at {article.expand?.feed_id?.source ?? "source"}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                {article.word_count && article.fetch_status === "full" && (
                  <span className="flex items-center gap-1.5 text-xs text-gray-400">
                    <BarChart2 className="w-3.5 h-3.5" />
                    {article.word_count.toLocaleString()} words · {readTime} min read
                  </span>
                )}
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
