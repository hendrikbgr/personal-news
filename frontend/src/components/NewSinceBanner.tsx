"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  count: number;
  onDismiss: () => void;
  onFilter: () => void;
}

export default function NewSinceBanner({ count, onDismiss, onFilter }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 10_000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3 border-l-4 border-indigo-400/70 animate-fadeInUp flex-shrink-0">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex-1">
        ✨ {count} new article{count > 1 ? "s" : ""} since your last visit
      </span>
      <button
        onClick={() => { onFilter(); onDismiss(); }}
        className="flex-shrink-0 px-3 py-1 rounded-lg bg-indigo-500/90 text-white text-xs font-medium hover:bg-indigo-600 transition-all"
      >
        Show new
      </button>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-white/30 transition-all"
      >
        <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </button>
    </div>
  );
}
