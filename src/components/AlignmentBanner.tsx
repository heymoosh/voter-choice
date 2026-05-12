"use client";

import React, { useState } from "react";
import type { AlignmentScore } from "@/types/chat";
import { slugify } from "@/lib/alignmentParser";

interface AlignmentBannerLabels {
  strongLabel?: string;
  mixedLabel?: string;
  weakLabel?: string;
  expandButton?: string;
  collapseButton?: string;
  overallLabel?: string;
}

interface AlignmentBannerProps {
  score: AlignmentScore;
  labels?: AlignmentBannerLabels;
}

function getQualifier(
  overall: number,
  labels?: AlignmentBannerLabels,
): { text: string; colorClass: string; bgClass: string } {
  if (overall >= 70) {
    return {
      text: labels?.strongLabel ?? "Strong alignment",
      colorClass: "text-green-700 dark:text-green-400",
      bgClass:
        "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800",
    };
  } else if (overall >= 40) {
    return {
      text: labels?.mixedLabel ?? "Mixed alignment",
      colorClass: "text-amber-700 dark:text-amber-400",
      bgClass:
        "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800",
    };
  } else {
    return {
      text: labels?.weakLabel ?? "Weak alignment",
      colorClass: "text-red-700 dark:text-red-400",
      bgClass:
        "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800",
    };
  }
}

export default function AlignmentBanner({
  score,
  labels,
}: AlignmentBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const candidateSlug = slugify(score.candidate);
  const qualifier = getQualifier(score.overall, labels);

  return (
    <div
      data-testid={`alignment-banner-${candidateSlug}`}
      role="region"
      aria-label={`Alignment with ${score.candidate}: ${score.overall} out of 100`}
      className={`rounded-lg border px-4 py-3 text-xs ${qualifier.bgClass}`}
    >
      {/* Banner header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {score.candidate}
          </span>
          <span className="mx-2 text-gray-400">·</span>
          <span
            data-testid={`alignment-score-overall-${candidateSlug}`}
            className={`font-bold ${qualifier.colorClass}`}
          >
            {labels?.overallLabel ?? "Alignment"}:{" "}
            <span aria-label={`${score.overall} out of 100`}>
              {score.overall} / 100
            </span>
          </span>
          <span className={`ml-2 ${qualifier.colorClass}`}>
            ({qualifier.text})
          </span>
        </div>
        <button
          data-testid={`alignment-drill-down-${candidateSlug}`}
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-controls={`alignment-details-${candidateSlug}`}
          className="text-gray-500 dark:text-gray-400 underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        >
          {expanded
            ? (labels?.collapseButton ?? "Collapse breakdown")
            : (labels?.expandButton ?? "Expand breakdown")}
        </button>
      </div>

      {/* Drill-down */}
      {expanded && (
        <div
          id={`alignment-details-${candidateSlug}`}
          className="mt-3 space-y-3 border-t border-current/10 pt-3"
        >
          <p className="font-semibold text-gray-700 dark:text-gray-300">
            Alignment breakdown — {score.candidate}
          </p>
          {score.issues.map((issue) => {
            const issueSlug = slugify(issue.issue);
            return (
              <div
                key={issueSlug}
                data-testid={`alignment-issue-row-${candidateSlug}-${issueSlug}`}
                className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                tabIndex={0}
              >
                <div className="flex justify-between items-baseline">
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {issue.issue}
                    {issue.userPriority && (
                      <span className="text-gray-500 dark:text-gray-400 font-normal">
                        {" "}
                        (you said: {issue.userPriority} priority)
                      </span>
                    )}
                  </span>
                  <span
                    className={`font-bold ml-4 ${getQualifier(issue.score, labels).colorClass}`}
                  >
                    {issue.score} / 100
                  </span>
                </div>
                {issue.rationale && (
                  <p className="mt-1 text-gray-600 dark:text-gray-400 leading-relaxed">
                    {issue.rationale}
                  </p>
                )}
                {issue.sources && issue.sources.length > 0 && (
                  <p className="mt-1 text-gray-400 dark:text-gray-500 text-xs">
                    Sources: {issue.sources.join(", ")}
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
