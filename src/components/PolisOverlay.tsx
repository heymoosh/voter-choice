"use client";

import React from "react";

export interface PolisCountData {
  countyFips: string;
  countyName?: string;
  issueCounts: Record<string, number>;
}

interface PolisOverlayProps {
  issueSlug: string;
  issueLabel: string;
  data: PolisCountData;
  labels?: {
    countyLabel?: string;
  };
}

/**
 * A single Polis-style overlay bar for an issue.
 * Shows count relative to the top-counted issue in the same county.
 */
export function PolisOverlayBar({
  issueSlug,
  issueLabel,
  data,
  labels = {},
}: PolisOverlayProps) {
  const counts = data.issueCounts;
  const values = Object.values(counts);
  if (values.length === 0) return null;

  const maxCount = Math.max(...values);
  if (maxCount === 0) return null;

  const count = counts[issueSlug] ?? 0;
  const pct = Math.round((count / maxCount) * 100);

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center gap-2">
        <div
          data-testid={`issue-count-bar-${issueSlug}`}
          className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${issueLabel}: ${pct}% relative to most popular issue in your county`}
        >
          <div
            className="h-full bg-blue-400 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span
          data-testid={`issue-count-value-${issueSlug}`}
          className="text-xs text-gray-500 w-8 text-right shrink-0"
          aria-hidden="true"
        >
          {pct}%
        </span>
      </div>
      <p
        data-testid="issue-count-county-label"
        className="text-xs text-gray-400"
      >
        {labels.countyLabel ??
          `Of voters in ${data.countyName ?? "your county"} who ranked their issues`}
      </p>
    </div>
  );
}

export default PolisOverlayBar;
