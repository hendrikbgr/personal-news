"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  onClose: () => void;
}

const SHORTCUTS = [
  { group: "Navigate" },
  { keys: ["J", "↓"], action: "Next article" },
  { keys: ["K", "↑"], action: "Previous article" },
  { keys: ["Esc"], action: "Clear selection" },
  { group: "Article" },
  { keys: ["Enter", "O"], action: "Open article" },
  { keys: ["S"], action: "Save / unsave" },
  { group: "App" },
  { keys: ["?"], action: "Toggle this help" },
];

export default function KeyboardHelp({ onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "?") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: "blur(8px)", background: "rgba(0,0,0,0.35)" }}
      onClick={onClose}
    >
      <div
        className="glass-card rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 text-base">Keyboard shortcuts</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 text-gray-500 dark:text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <table className="w-full text-sm">
          <tbody>
            {SHORTCUTS.map((row, i) => {
              if ("group" in row) {
                return (
                  <tr key={i}>
                    <td colSpan={2} className="pt-4 pb-1.5 first:pt-0 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {row.group}
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={i} className="border-t border-white/10">
                  <td className="py-1.5 pr-4 text-gray-600 dark:text-gray-300">{row.action}</td>
                  <td className="py-1.5 text-right">
                    <span className="inline-flex items-center gap-1">
                      {row.keys.map((k) => (
                        <kbd
                          key={k}
                          className="px-1.5 py-0.5 rounded bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/20 text-xs font-mono text-gray-700 dark:text-gray-200"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="mt-5 text-xs text-gray-400 dark:text-gray-500 text-center">
          Shortcuts are inactive when the search bar is focused
        </p>
      </div>
    </div>
  );
}
