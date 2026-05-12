"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface IssueCounts {
  [issueSlug: string]: number;
}

interface PolisCountsData {
  countyFips: string;
  issueCounts: IssueCounts;
  totalRespondents: null;
}

interface PolisOverlayProps {
  issueSlug: string;
  countyFips: string;
}

// Cache to avoid re-fetching per component instance
const countsCache: Record<string, PolisCountsData | null> = {};
const cachePromise: Record<string, Promise<PolisCountsData | null>> = {};

async function fetchCounts(
  countyFips: string,
): Promise<PolisCountsData | null> {
  if (countyFips in countsCache) return countsCache[countyFips];
  if (!(countyFips in cachePromise)) {
    cachePromise[countyFips] = fetch(
      `/api/issue-counts?countyFips=${encodeURIComponent(countyFips)}`,
    )
      .then((r) => {
        if (!r.ok) return null;
        return r.json() as Promise<PolisCountsData>;
      })
      .then((data) => {
        countsCache[countyFips] = data;
        return data;
      })
      .catch(() => {
        countsCache[countyFips] = null;
        return null;
      });
  }
  return cachePromise[countyFips];
}

export function PolisOverlay({ issueSlug, countyFips }: PolisOverlayProps) {
  const { t } = useLanguage();
  const [data, setData] = useState<PolisCountsData | null | undefined>(
    undefined,
  );

  useEffect(() => {
    void fetchCounts(countyFips).then(setData);
  }, [countyFips]);

  // Graceful degradation: if loading or failed, don't render
  if (data === undefined || data === null) return null;

  const counts = data.issueCounts;
  const thisCount = counts[issueSlug] ?? 0;
  if (thisCount === 0) return null;

  const maxCount = Math.max(...Object.values(counts).filter((v) => v > 0), 1);
  const pct = Math.round((thisCount / maxCount) * 100);

  return (
    <div
      className="polis-overlay"
      aria-label={`${pct}% ${t.polisOverlayCountyLabel}`}
    >
      <div
        className="polis-bar-track"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${pct}% of voters in your county ranked this issue`}
      >
        <div
          className="polis-bar-fill"
          data-testid={`issue-count-bar-${issueSlug}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className="polis-count-value"
        data-testid={`issue-count-value-${issueSlug}`}
      >
        {pct}%
      </span>
      <span
        className="polis-county-label"
        data-testid="issue-count-county-label"
      >
        {t.polisOverlayCountyLabel}
      </span>
    </div>
  );
}
