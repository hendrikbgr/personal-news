"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Rss,
  FolderOpen,
  AlertTriangle,
  AlignLeft,
  Layers,
  BookOpen,
  Settings2,
} from "lucide-react";
import { type ViewMode, saveViewMode } from "@/components/ArticleModal";
import type { Category, Feed } from "@/lib/types";
import {
  getCategories,
  getFeeds,
  createCategory,
  updateCategory,
  deleteCategory,
  createFeed,
  updateFeed,
  deleteFeed,
  resetSaved,
} from "@/lib/api";

const COLORS = ["blue", "purple", "green", "amber", "rose", "orange", "pink", "indigo"];

const COLOR_PREVIEW: Record<string, string> = {
  blue: "bg-blue-400",
  purple: "bg-violet-400",
  green: "bg-emerald-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
  orange: "bg-orange-400",
  pink: "bg-pink-400",
  indigo: "bg-indigo-400",
};

// ── Category Form ────────────────────────────────────────────────────────

interface CategoryFormData {
  slug: string;
  name: string;
  emoji: string;
  color: string;
}

function CategoryForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: CategoryFormData;
  onSave: (d: CategoryFormData) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<CategoryFormData>(
    initial ?? { slug: "", name: "", emoji: "📂", color: "blue" }
  );

  return (
    <div className="flex flex-col gap-3 p-4 glass rounded-2xl animate-fadeInUp">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Slug (ID)</label>
          <input
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
            placeholder="e.g. world-news"
            disabled={!!initial}
            className="w-full px-3 py-2 rounded-xl glass text-sm outline-none focus:ring-2 focus:ring-indigo-300/60 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. World News"
            className="w-full px-3 py-2 rounded-xl glass text-sm outline-none focus:ring-2 focus:ring-indigo-300/60"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Emoji</label>
          <input
            value={form.emoji}
            onChange={(e) => setForm({ ...form, emoji: e.target.value })}
            className="w-full px-3 py-2 rounded-xl glass text-sm outline-none focus:ring-2 focus:ring-indigo-300/60"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Color</label>
          <div className="flex gap-1.5 flex-wrap pt-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, color: c })}
                className={`w-7 h-7 rounded-full ${COLOR_PREVIEW[c]} transition-all ${
                  form.color === c ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : "opacity-60 hover:opacity-100"
                }`}
                title={c}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 rounded-xl glass text-sm text-gray-600 hover:bg-white/40">
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={!form.slug || !form.name || saving}
          className="px-4 py-1.5 rounded-xl bg-indigo-500/90 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-50"
        >
          {saving ? "Saving…" : initial ? "Update" : "Create"}
        </button>
      </div>
    </div>
  );
}

// ── Feed Form ────────────────────────────────────────────────────────────

interface FeedFormData {
  name: string;
  url: string;
  category: string;
  source: string;
  emoji: string;
}

function FeedForm({
  initial,
  categories,
  onSave,
  onCancel,
  saving,
}: {
  initial?: FeedFormData;
  categories: Category[];
  onSave: (d: FeedFormData) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FeedFormData>(
    initial ?? { name: "", url: "", category: categories[0]?.id ?? "", source: "", emoji: "📰" }
  );

  return (
    <div className="flex flex-col gap-3 p-4 glass rounded-2xl animate-fadeInUp">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Feed Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. BBC World News"
            className="w-full px-3 py-2 rounded-xl glass text-sm outline-none focus:ring-2 focus:ring-indigo-300/60"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">RSS URL</label>
          <input
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://example.com/feed.xml"
            className="w-full px-3 py-2 rounded-xl glass text-sm outline-none focus:ring-2 focus:ring-indigo-300/60"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Category</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full px-3 py-2 rounded-xl glass text-sm outline-none focus:ring-2 focus:ring-indigo-300/60 bg-transparent"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Source Label</label>
          <input
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            placeholder="e.g. BBC"
            className="w-full px-3 py-2 rounded-xl glass text-sm outline-none focus:ring-2 focus:ring-indigo-300/60"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Emoji</label>
          <input
            value={form.emoji}
            onChange={(e) => setForm({ ...form, emoji: e.target.value })}
            className="w-full px-3 py-2 rounded-xl glass text-sm outline-none focus:ring-2 focus:ring-indigo-300/60"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 rounded-xl glass text-sm text-gray-600 hover:bg-white/40">
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={!form.name || !form.url || !form.category || saving}
          className="px-4 py-1.5 rounded-xl bg-indigo-500/90 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-50"
        >
          {saving ? "Saving…" : initial ? "Update" : "Add Feed"}
        </button>
      </div>
    </div>
  );
}

// ── Delete Confirmation Modal ────────────────────────────────────────────

function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="glass-strong rounded-3xl p-6 w-full max-w-sm mx-4 shadow-2xl animate-fadeInUp"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl glass text-sm font-medium text-gray-600 hover:bg-white/40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-red-500/90 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-60"
          >
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────

const VIEW_OPTIONS = [
  {
    value: "summary",
    label: "Summary only",
    desc: "Show the AI-generated summary. Great for quick scanning.",
    icon: <AlignLeft className="w-4 h-4" />,
  },
  {
    value: "both",
    label: "Summary + full article",
    desc: "Show the summary box followed by the full article text.",
    icon: <Layers className="w-4 h-4" />,
  },
  {
    value: "full",
    label: "Full article only",
    desc: "Show the complete article text without the summary box.",
    icon: <BookOpen className="w-4 h-4" />,
  },
];

export default function ManagePage() {
  const { data: categories = [], mutate: mutateCategories } = useSWR("categories", getCategories);
  const { data: feeds = [], mutate: mutateFeeds } = useSWR("feeds", () => getFeeds());

  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("both");

  useEffect(() => {
    const stored = localStorage.getItem("article-view-mode") as ViewMode | null;
    if (stored) setViewMode(stored);
  }, []);

  function handleViewModeChange(mode: ViewMode) {
    setViewMode(mode);
    saveViewMode(mode);
  }
  const [catForm, setCatForm] = useState<"add" | string | null>(null);
  const [feedForm, setFeedForm] = useState<"add" | string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "category" | "feed"; id: string; name: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  // ── Category handlers ──────────────────────────────────────────────

  async function handleSaveCategory(data: CategoryFormData) {
    setSaving(true);
    try {
      if (catForm === "add") {
        await createCategory(data);
      } else if (catForm) {
        await updateCategory(catForm, data);
      }
      await mutateCategories();
      setCatForm(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCategory() {
    if (!confirmDelete || confirmDelete.type !== "category") return;
    setSaving(true);
    try {
      await deleteCategory(confirmDelete.id);
      await mutateCategories();
      setConfirmDelete(null);
    } finally {
      setSaving(false);
    }
  }

  // ── Feed handlers ──────────────────────────────────────────────────

  async function handleSaveFeed(data: FeedFormData) {
    setSaving(true);
    try {
      if (feedForm === "add") {
        await createFeed(data);
      } else if (feedForm) {
        await updateFeed(feedForm, data);
      }
      await mutateFeeds();
      setFeedForm(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteFeed() {
    if (!confirmDelete || confirmDelete.type !== "feed") return;
    setSaving(true);
    try {
      await deleteFeed(confirmDelete.id);
      await mutateFeeds();
      setConfirmDelete(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleResetDatabase() {
    setResetting(true);
    try {
      await resetSaved();
      setShowResetConfirm(false);
    } finally {
      setResetting(false);
    }
  }

  const feedsByCategory = feeds.reduce<Record<string, Feed[]>>((acc, f) => {
    (acc[f.category] ??= []).push(f);
    return acc;
  }, {});

  return (
    <div className="min-h-screen p-3 md:p-4 flex flex-col gap-4 max-w-5xl mx-auto">
      {/* Top bar */}
      <div className="glass-strong rounded-3xl px-5 py-4 flex items-center gap-4">
        <Link
          href="/"
          className="p-2 rounded-xl glass hover:bg-white/40 transition-all"
          title="Back to dashboard"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-800">Manage Feeds &amp; Categories</h1>
          <p className="text-xs text-gray-500">Add, edit, or remove RSS feeds and categories</p>
        </div>
      </div>

      {/* ── Categories ──────────────────────────────────────────────── */}
      <section className="glass-strong rounded-3xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-gray-500" />
            <h2 className="text-base font-bold text-gray-800">Categories</h2>
            <span className="text-xs text-gray-400">({categories.length})</span>
          </div>
          {catForm === null && (
            <button
              onClick={() => setCatForm("add")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/90 text-white text-sm font-medium hover:bg-indigo-600 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          )}
        </div>

        {catForm === "add" && (
          <div className="mb-4">
            <CategoryForm onSave={handleSaveCategory} onCancel={() => setCatForm(null)} saving={saving} />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((cat) => (
            <div key={cat.pb_id ?? cat.id}>
              {catForm === cat.pb_id ? (
                <CategoryForm
                  initial={{ slug: cat.id, name: cat.name, emoji: cat.emoji, color: cat.color }}
                  onSave={handleSaveCategory}
                  onCancel={() => setCatForm(null)}
                  saving={saving}
                />
              ) : (
                <div className="glass rounded-2xl p-3 flex items-center gap-3 group">
                  <span
                    className={`w-10 h-10 rounded-xl ${COLOR_PREVIEW[cat.color] ?? "bg-gray-400"} flex items-center justify-center text-lg flex-shrink-0`}
                  >
                    {cat.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-800 truncate">{cat.name}</p>
                    <p className="text-xs text-gray-400">{cat.id} &middot; {feedsByCategory[cat.id]?.length ?? 0} feeds</p>
                  </div>
                  {cat.pb_id && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setCatForm(cat.pb_id!)}
                        className="p-1.5 rounded-lg hover:bg-white/40 transition-all"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ type: "category", id: cat.pb_id!, name: cat.name })}
                        className="p-1.5 rounded-lg hover:bg-red-50/60 transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Feeds ───────────────────────────────────────────────────── */}
      <section className="glass-strong rounded-3xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Rss className="w-5 h-5 text-gray-500" />
            <h2 className="text-base font-bold text-gray-800">RSS Feeds</h2>
            <span className="text-xs text-gray-400">({feeds.length})</span>
          </div>
          {feedForm === null && (
            <button
              onClick={() => setFeedForm("add")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/90 text-white text-sm font-medium hover:bg-indigo-600 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Feed
            </button>
          )}
        </div>

        {feedForm === "add" && (
          <div className="mb-4">
            <FeedForm categories={categories} onSave={handleSaveFeed} onCancel={() => setFeedForm(null)} saving={saving} />
          </div>
        )}

        <div className="space-y-4">
          {categories.map((cat) => {
            const catFeeds = feedsByCategory[cat.id] ?? [];
            if (catFeeds.length === 0 && feedForm !== "add") return null;

            return (
              <div key={cat.id}>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-2">
                  <span>{cat.emoji}</span> {cat.name}
                  <span className="text-gray-300">({catFeeds.length})</span>
                </h3>
                <div className="space-y-2">
                  {catFeeds.map((feed) => (
                    <div key={feed.id}>
                      {feedForm === feed.id ? (
                        <FeedForm
                          initial={{
                            name: feed.name,
                            url: feed.url,
                            category: feed.category,
                            source: feed.source,
                            emoji: feed.emoji,
                          }}
                          categories={categories}
                          onSave={handleSaveFeed}
                          onCancel={() => setFeedForm(null)}
                          saving={saving}
                        />
                      ) : (
                        <div className="glass rounded-2xl p-3 flex items-center gap-3 group">
                          <span className="text-lg flex-shrink-0">{feed.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-800 truncate">{feed.name}</p>
                            <p className="text-xs text-gray-400 truncate">
                              {feed.source ? `${feed.source} · ` : ""}{feed.url}
                            </p>
                          </div>
                          <span
                            className={`flex-shrink-0 w-2 h-2 rounded-full ${
                              feed.is_active ? "bg-emerald-400" : "bg-gray-300"
                            }`}
                            title={feed.is_active ? "Active" : "Inactive"}
                          />
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setFeedForm(feed.id)}
                              className="p-1.5 rounded-lg hover:bg-white/40 transition-all"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ type: "feed", id: feed.id, name: feed.name })}
                              className="p-1.5 rounded-lg hover:bg-red-50/60 transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Reading Preferences ─────────────────────────────────── */}
      <section className="glass-strong rounded-3xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="w-5 h-5 text-gray-500" />
          <h2 className="text-base font-bold text-gray-800">Reading Preferences</h2>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Article view mode
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {VIEW_OPTIONS.map(({ value, label, desc, icon }) => (
              <button
                key={value}
                onClick={() => handleViewModeChange(value as ViewMode)}
                className={`flex flex-col gap-2 p-4 rounded-2xl border-2 text-left transition-all ${
                  viewMode === value
                    ? "border-indigo-400/70 bg-indigo-50/60"
                    : "border-transparent glass hover:border-white/60"
                }`}
              >
                <div className={`flex items-center gap-2 font-medium text-sm ${
                  viewMode === value ? "text-indigo-700" : "text-gray-700"
                }`}>
                  <span className={viewMode === value ? "text-indigo-500" : "text-gray-400"}>
                    {icon}
                  </span>
                  {label}
                  {viewMode === value && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Danger Zone ────────────────────────────────────────── */}
      <section className="glass-strong rounded-3xl p-5 border border-red-200/40">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h2 className="text-base font-bold text-gray-800">Danger Zone</h2>
        </div>
        <div className="flex items-center justify-between gap-4 glass rounded-2xl p-4">
          <div>
            <p className="text-sm font-medium text-gray-800">Reset Database</p>
            <p className="text-xs text-gray-500">
              Permanently delete all articles. They will be re-fetched on the next refresh.
            </p>
          </div>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex-shrink-0 px-4 py-2 rounded-xl border border-red-300/60 text-sm font-medium text-red-600 hover:bg-red-50/60 active:bg-red-50/80 transition-all"
          >
            Reset Database
          </button>
        </div>
      </section>

      {/* Reset database confirmation modal */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            className="glass-strong rounded-3xl p-6 w-full max-w-sm mx-4 shadow-2xl animate-fadeInUp"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 mb-2">Reset Database?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently delete every article from the database.
              They will be re-fetched on the next refresh.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl glass text-sm font-medium text-gray-600 hover:bg-white/40"
              >
                Cancel
              </button>
              <button
                onClick={handleResetDatabase}
                disabled={resetting}
                className="px-4 py-2 rounded-xl bg-red-500/90 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-60"
              >
                {resetting ? "Clearing…" : "Yes, reset all"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <ConfirmModal
          title={`Delete ${confirmDelete.type === "category" ? "category" : "feed"}?`}
          message={`Are you sure you want to delete "${confirmDelete.name}"? This cannot be undone.`}
          onConfirm={confirmDelete.type === "category" ? handleDeleteCategory : handleDeleteFeed}
          onCancel={() => setConfirmDelete(null)}
          loading={saving}
        />
      )}
    </div>
  );
}
