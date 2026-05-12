"use client";

import { useState } from "react";
import { toSlug, type AlignmentCandidate } from "@/lib/ballotParser";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface AlignmentBannerProps {
  candidate: AlignmentCandidate;
}

export function AlignmentBanner({ candidate }: AlignmentBannerProps) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const slug = toSlug(candidate.candidate);

  const qualifier =
    candidate.overall >= 70
      ? t.alignmentStrong
      : candidate.overall >= 40
        ? t.alignmentMixed
        : t.alignmentWeak;

  const colorClass =
    candidate.overall >= 70
      ? "alignment-banner--green"
      : candidate.overall >= 40
        ? "alignment-banner--amber"
        : "alignment-banner--red";

  return (
    <div
      className={`alignment-banner ${colorClass}`}
      data-testid={`alignment-banner-${slug}`}
      role="region"
      aria-label={`Alignment with ${candidate.candidate}: ${candidate.overall} out of 100`}
    >
      <div className="alignment-banner-header">
        <span className="alignment-candidate-name">{candidate.candidate}</span>
        <span
          className="alignment-score"
          data-testid={`alignment-score-overall-${slug}`}
        >
          {candidate.overall} / 100 — {qualifier}
        </span>
        <button
          aria-expanded={expanded}
          className="button button-ghost alignment-expand-btn"
          onClick={() => setExpanded((v) => !v)}
          type="button"
        >
          {expanded ? t.alignmentCollapse : t.alignmentExpand}
        </button>
      </div>

      {expanded && (
        <div
          className="alignment-drill-down"
          data-testid={`alignment-drill-down-${slug}`}
        >
          <p className="alignment-overall-detail">
            Overall: {candidate.overall} / 100
          </p>
          {candidate.issues.map((issue) => {
            const issueSlug = toSlug(issue.issue);
            return (
              <div
                key={issue.issue}
                className="alignment-issue-row"
                data-testid={`alignment-issue-row-${slug}-${issueSlug}`}
                tabIndex={0}
              >
                <div className="alignment-issue-header">
                  <span className="alignment-issue-name">
                    {issue.issue} (you said: {issue.userPriority} priority)
                  </span>
                  <span className="alignment-issue-score">
                    {issue.score} / 100
                  </span>
                </div>
                <p className="alignment-issue-rationale">{issue.rationale}</p>
                {issue.sources.length > 0 && (
                  <p className="alignment-issue-sources">
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
