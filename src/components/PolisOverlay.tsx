"use client";

import { useEffect, useState } from "react";
import { CANONICAL_ISSUES } from "@/lib/canonicalIssues";

type IssueCountsData = {
  countyFips: string;
  issueCounts: Record<string, number>;
  totalRespondents: null;
};

type PolisOverlayProps = {
  countyFips: string;
  countyName?: string;
};

export function PolisOverlay({ countyFips, countyName }: PolisOverlayProps) {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!countyFips) {
      setLoading(false);
      return;
    }

    fetch(`/api/issue-counts?countyFips=${encodeURIComponent(countyFips)}`)
      .then((r) => r.json())
      .then((data: IssueCountsData) => {
        setCounts(data.issueCounts ?? null);
      })
      .catch(() => {
        setCounts(null);
      })
      .finally(() => setLoading(false));
  }, [countyFips]);

  if (loading || !counts) return null;

  const maxCount = Math.max(...Object.values(counts), 1);
  const hasAnyCount = Object.values(counts).some((v) => v > 0);
  if (!hasAnyCount) return null;

  const countyLabel = countyName ?? "your county";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">
          What voters in your area care about
        </h4>
        <span
          data-testid="issue-count-county-label"
          className="text-xs text-gray-400"
        >
          {countyLabel}
        </span>
      </div>

      {/* Privacy disclosure */}
      <p className="text-xs text-gray-400 leading-relaxed">
        When you rank an issue, we anonymously add to a county-level count that
        other voters can see. We never store your zip code, your ranking
        sequence, or anything else — just &ldquo;+1 in {countyLabel} for
        [issue].&rdquo;
      </p>

      <ul className="space-y-2">
        {CANONICAL_ISSUES.map((issue) => {
          const count = counts[issue.slug] ?? 0;
          const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;

          return (
            <li key={issue.slug} className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{issue.key}</span>
                <span
                  data-testid={`issue-count-value-${issue.slug}`}
                  className="text-gray-400"
                  aria-label={`${pct}% relative to top issue`}
                >
                  {pct}%
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${issue.key}: ${pct}% of voters in ${countyLabel}`}
                data-testid={`issue-count-bar-${issue.slug}`}
                className="h-1.5 bg-gray-100 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-blue-400 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                  aria-hidden="true"
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
