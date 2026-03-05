"use client";

import { getCategoryStyle } from "@/lib/categoryColors";

interface Props {
  category: string;
  label?: string;
  size?: "sm" | "md";
}

export default function CategoryBadge({ category, label, size = "sm" }: Props) {
  const s = getCategoryStyle(category);
  const padClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${padClass} ${s.bg} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {label ?? category}
    </span>
  );
}
