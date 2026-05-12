"use client";

interface LoadingSkeletonProps {
  label?: string;
}

export function LoadingSkeleton({ label }: LoadingSkeletonProps) {
  return (
    <div
      className="loading-skeleton"
      data-testid="data-loading"
      aria-label={label ?? "Loading election data..."}
      aria-busy="true"
    >
      <div className="skeleton-line skeleton-line-wide" />
      <div className="skeleton-line skeleton-line-medium" />
      <div className="skeleton-line skeleton-line-narrow" />
    </div>
  );
}
