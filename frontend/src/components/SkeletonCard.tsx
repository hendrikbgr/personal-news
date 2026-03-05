"use client";

export default function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="h-44 shimmer rounded-t-2xl" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-20 shimmer rounded-full" />
        <div className="h-4 shimmer rounded-full" />
        <div className="h-4 w-3/4 shimmer rounded-full" />
        <div className="h-3 shimmer rounded-full" />
        <div className="h-3 w-5/6 shimmer rounded-full" />
        <div className="flex gap-2 pt-1">
          <div className="h-3 w-16 shimmer rounded-full" />
          <div className="h-3 w-12 shimmer rounded-full" />
        </div>
      </div>
    </div>
  );
}
