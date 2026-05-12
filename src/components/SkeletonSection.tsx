"use client";

interface SkeletonSectionProps {
  label?: string;
  lines?: number;
}

export function SkeletonSection({ label, lines = 3 }: SkeletonSectionProps) {
  return (
    <div
      data-testid="data-loading"
      role="status"
      aria-label={label || "Loading..."}
      className="animate-pulse space-y-2"
    >
      {label && <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />}
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-3 bg-gray-200 rounded ${i === lines - 1 ? "w-3/4" : "w-full"}`}
        />
      ))}
    </div>
  );
}
