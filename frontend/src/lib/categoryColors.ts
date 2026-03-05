/**
 * Pastel color mappings for each category.
 * Used consistently across cards, badges, and the sidebar.
 */

export const CATEGORY_STYLES: Record<
  string,
  {
    bg: string;         // card / badge background
    border: string;     // card border accent
    text: string;       // badge text
    dot: string;        // colored dot
    glow: string;       // subtle box-shadow color (CSS value)
  }
> = {
  world: {
    bg: "bg-blue-100/60",
    border: "border-blue-200/60",
    text: "text-blue-700",
    dot: "bg-blue-400",
    glow: "rgba(147,197,253,0.35)",
  },
  technology: {
    bg: "bg-violet-100/60",
    border: "border-violet-200/60",
    text: "text-violet-700",
    dot: "bg-violet-400",
    glow: "rgba(196,181,253,0.35)",
  },
  science: {
    bg: "bg-emerald-100/60",
    border: "border-emerald-200/60",
    text: "text-emerald-700",
    dot: "bg-emerald-400",
    glow: "rgba(110,231,183,0.35)",
  },
  business: {
    bg: "bg-amber-100/60",
    border: "border-amber-200/60",
    text: "text-amber-700",
    dot: "bg-amber-400",
    glow: "rgba(252,211,77,0.35)",
  },
  health: {
    bg: "bg-rose-100/60",
    border: "border-rose-200/60",
    text: "text-rose-700",
    dot: "bg-rose-400",
    glow: "rgba(253,164,175,0.35)",
  },
  sports: {
    bg: "bg-orange-100/60",
    border: "border-orange-200/60",
    text: "text-orange-700",
    dot: "bg-orange-400",
    glow: "rgba(253,186,116,0.35)",
  },
  entertainment: {
    bg: "bg-pink-100/60",
    border: "border-pink-200/60",
    text: "text-pink-700",
    dot: "bg-pink-400",
    glow: "rgba(249,168,212,0.35)",
  },
  politics: {
    bg: "bg-indigo-100/60",
    border: "border-indigo-200/60",
    text: "text-indigo-700",
    dot: "bg-indigo-400",
    glow: "rgba(165,180,252,0.35)",
  },
};

export function getCategoryStyle(category: string) {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES.world;
}

export const CATEGORY_EMOJIS: Record<string, string> = {
  world: "🌍",
  technology: "💻",
  science: "🧬",
  business: "📊",
  health: "❤️",
  sports: "⚽",
  entertainment: "🎬",
  politics: "🏛️",
};
