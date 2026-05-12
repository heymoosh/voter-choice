"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import {
  CandidateAlignment,
  slugify,
  getAlignmentLevel,
  getAlignmentColorClass,
  getAlignmentBarColor,
} from "@/lib/alignmentParser";

interface AlignmentBannerProps {
  alignment: CandidateAlignment;
}

export default function AlignmentBanner({ alignment }: AlignmentBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useLanguage();
  const candidateSlug = slugify(alignment.candidate);
  const level = getAlignmentLevel(alignment.overall);
  const colorClass = getAlignmentColorClass(level);
  const barColor = getAlignmentBarColor(level);

  const alignmentLabel =
    level === "strong"
      ? t("alignmentStrong")
      : level === "mixed"
        ? t("alignmentMixed")
        : t("alignmentWeak");

  return (
    <div
      data-testid={`alignment-banner-${candidateSlug}`}
      role="region"
      aria-label={`${t("alignmentOverallLabel")} with ${alignment.candidate}: ${alignment.overall} out of 100`}
      className={`rounded-lg border p-3 mt-2 ${colorClass}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0">
            <span
              data-testid={`alignment-score-overall-${candidateSlug}`}
              className="text-lg font-bold"
            >
              {alignment.overall}
            </span>
            <span className="text-sm font-normal"> / 100</span>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">
              {t("alignmentOverallLabel")}: {alignmentLabel}
            </div>
            <div className="mt-1 h-1.5 w-24 rounded-full bg-gray-200">
              <div
                className={`h-1.5 rounded-full ${barColor}`}
                style={{ width: `${alignment.overall}%` }}
                role="presentation"
              />
            </div>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls={`alignment-drill-down-${candidateSlug}`}
          className="flex-shrink-0 text-xs font-medium underline focus:outline-none focus:ring-2 focus:ring-current rounded"
        >
          {expanded ? t("alignmentCollapseBtn") : t("alignmentExpandBtn")}
        </button>
      </div>

      {expanded && (
        <div
          id={`alignment-drill-down-${candidateSlug}`}
          data-testid={`alignment-drill-down-${candidateSlug}`}
          className="mt-3 space-y-3 border-t border-current border-opacity-20 pt-3"
        >
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            {alignment.candidate} — {t("alignmentOverallLabel")}:{" "}
            {alignment.overall} / 100
          </p>
          {alignment.issues.map((issue) => {
            const issueSlug = slugify(issue.issue);
            const issueLevel = getAlignmentLevel(issue.score);
            return (
              <div
                key={issue.issue}
                data-testid={`alignment-issue-row-${candidateSlug}-${issueSlug}`}
                className="text-sm"
                tabIndex={0}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{issue.issue}</span>
                  <span
                    className={`font-bold ${issueLevel === "strong" ? "text-green-700" : issueLevel === "mixed" ? "text-amber-700" : "text-red-700"}`}
                  >
                    {issue.score} / 100
                  </span>
                </div>
                {issue.userPriority && (
                  <p className="text-xs opacity-70 mt-0.5">
                    ({t("alignmentPriority")}: {issue.userPriority})
                  </p>
                )}
                <p className="mt-1 opacity-90">{issue.rationale}</p>
                {issue.sources.length > 0 && (
                  <p className="text-xs mt-1 opacity-60">
                    {issue.sources.join(" · ")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
