"use client";

import { useState } from "react";
import type { AlignmentScore } from "@/lib/types";
import type { Language } from "@/lib/i18n";
import { tStr } from "@/lib/i18n";
import { candidateSlug, alignmentLevel } from "@/lib/alignmentParser";

type AlignmentBannerProps = {
  score: AlignmentScore;
  language?: Language;
};

const levelStyles = {
  strong: {
    bg: "bg-green-50 border-green-300",
    text: "text-green-800",
    badge: "bg-green-100 text-green-800",
  },
  mixed: {
    bg: "bg-amber-50 border-amber-300",
    text: "text-amber-800",
    badge: "bg-amber-100 text-amber-800",
  },
  weak: {
    bg: "bg-red-50 border-red-300",
    text: "text-red-800",
    badge: "bg-red-100 text-red-800",
  },
};

export function AlignmentBanner({
  score,
  language = "en",
}: AlignmentBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const slug = candidateSlug(score.candidate);
  const level = alignmentLevel(score.overall);
  const styles = levelStyles[level];

  const levelLabel =
    level === "strong"
      ? tStr(language, "alignmentStrong")
      : level === "mixed"
        ? tStr(language, "alignmentMixed")
        : tStr(language, "alignmentWeak");

  return (
    <div
      data-testid={`alignment-banner-${slug}`}
      role="region"
      aria-label={`Alignment with ${score.candidate}: ${score.overall} out of 100`}
      className={`border rounded-lg p-4 my-2 ${styles.bg}`}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="font-semibold text-gray-900">{score.candidate}</div>
        <div className="flex items-center gap-3">
          <span
            className={`px-2 py-1 rounded text-sm font-medium ${styles.badge}`}
          >
            {levelLabel}
          </span>
          <span
            data-testid={`alignment-score-overall-${slug}`}
            className={`font-bold text-lg ${styles.text}`}
          >
            {score.overall} / 100
          </span>
          <button
            aria-expanded={expanded}
            aria-controls={`alignment-drill-down-${slug}`}
            onClick={() => setExpanded((v) => !v)}
            className="text-sm text-blue-600 underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
          >
            {expanded
              ? tStr(language, "alignmentCollapseLabel")
              : tStr(language, "alignmentExpandLabel")}
          </button>
        </div>
      </div>

      {expanded && (
        <div
          id={`alignment-drill-down-${slug}`}
          data-testid={`alignment-drill-down-${slug}`}
          className="mt-4 space-y-3"
        >
          <h4 className="font-semibold text-sm text-gray-700">
            {tStr(language, "alignmentBreakdownTitle")} — {score.candidate}
          </h4>
          <p className="text-sm font-medium">
            {tStr(language, "alignmentOverall")}: {score.overall} / 100
          </p>
          {score.issues.map((issue) => {
            const issueSlug = issue.issue.toLowerCase().replace(/\s+/g, "-");
            return (
              <div
                key={issue.issue}
                data-testid={`alignment-issue-row-${slug}-${issueSlug}`}
                tabIndex={0}
                className="border-l-4 border-gray-300 pl-3 py-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">
                    {issue.issue}{" "}
                    <span className="text-gray-500 text-xs font-normal">
                      (you said: {issue.userPriority} priority)
                    </span>
                  </span>
                  <span className="text-sm font-bold">{issue.score} / 100</span>
                </div>
                <p className="text-sm text-gray-700 mt-1">{issue.rationale}</p>
                {issue.sources.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Sources: {issue.sources.join("; ")}
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
