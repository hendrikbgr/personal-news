"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";

interface Props {
  saved: boolean;
  onToggle: (e: React.MouseEvent) => void;
  size?: "sm" | "md" | "lg";
  variant?: "overlay" | "surface";
  className?: string;
}

export default function SaveButton({ saved, onToggle, size = "md", variant = "overlay", className = "" }: Props) {
  const [animating, setAnimating] = useState(false);

  const iconSize = { sm: "w-4 h-4", md: "w-[18px] h-[18px]", lg: "w-5 h-5" }[size];

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!saved) {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 500);
    }
    onToggle(e);
  }

  return (
    <button
      onClick={handleClick}
      className={`group/save bg-transparent border-0 outline-none ${className}`}
      title={saved ? "Unsave" : "Save for later"}
    >
      <span className="relative inline-flex items-center justify-center">
        {animating && (
          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className={`${variant === "overlay" ? "save-burst" : "save-burst-surface"} rounded-full`} />
          </span>
        )}

        <Bookmark
          className={`${iconSize} transition-all duration-200 ${
            variant === "overlay"
              ? `drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] ${
                  saved
                    ? "text-white fill-white"
                    : "text-white/80 fill-transparent group-hover/save:text-white"
                }`
              : saved
                ? "text-indigo-500 fill-indigo-500 drop-shadow-sm"
                : "text-gray-400 fill-transparent group-hover/save:text-gray-600"
          } ${animating ? "save-pop" : ""}`}
          strokeWidth={saved ? 2 : 1.75}
        />
      </span>
    </button>
  );
}
