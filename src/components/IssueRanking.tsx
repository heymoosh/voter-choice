"use client";

import { useState, useCallback } from "react";
import {
  CANONICAL_ISSUES,
  type RankedIssues,
  type CanonicalIssue,
} from "@/lib/canonicalIssues";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { PolisOverlay } from "@/components/PolisOverlay";

interface IssueRankingProps {
  onRankingComplete: (ranking: RankedIssues) => void;
  countyFips?: string | null;
}

export function IssueRanking({
  onRankingComplete,
  countyFips,
}: IssueRankingProps) {
  const { t } = useLanguage();
  const [issues, setIssues] = useState<CanonicalIssue[]>([...CANONICAL_ISSUES]);
  const [confirmed, setConfirmed] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const announce = useCallback((msg: string) => {
    setAnnouncement(msg);
    setTimeout(() => setAnnouncement(""), 2000);
  }, []);

  const moveItem = useCallback(
    (fromIdx: number, toIdx: number) => {
      setIssues((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        announce(
          `${moved.label} moved to position ${toIdx + 1} of ${next.length}`,
        );
        return next;
      });
    },
    [announce],
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLLIElement>, idx: number) {
    if (e.key === " ") {
      e.preventDefault();
      if (focusedIdx === idx) {
        setFocusedIdx(null);
        announce(`Released ${issues[idx].label}`);
      } else {
        setFocusedIdx(idx);
        announce(
          `Grabbed ${issues[idx].label}. Use arrow keys to move, Space to drop.`,
        );
      }
      return;
    }

    if (focusedIdx === idx) {
      if (e.key === "ArrowUp" && idx > 0) {
        e.preventDefault();
        moveItem(idx, idx - 1);
        setFocusedIdx(idx - 1);
      } else if (e.key === "ArrowDown" && idx < issues.length - 1) {
        e.preventDefault();
        moveItem(idx, idx + 1);
        setFocusedIdx(idx + 1);
      }
    }
  }

  // Mouse drag handlers
  function handleDragStart(idx: number) {
    setDraggingIdx(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (draggingIdx !== null && draggingIdx !== idx) {
      moveItem(draggingIdx, idx);
      setDraggingIdx(idx);
    }
  }

  function handleDragEnd() {
    setDraggingIdx(null);
  }

  function handleSkip() {
    onRankingComplete({
      ordered: [],
      skipped: true,
      timestamp: new Date().toISOString(),
    });
  }

  function handleConfirm() {
    setConfirmed(true);
    onRankingComplete({
      ordered: issues.map((i) => i.key),
      skipped: false,
      timestamp: new Date().toISOString(),
    });
  }

  if (confirmed) {
    const top3 = issues.slice(0, 3);
    return (
      <div className="issue-ranking-confirmed">
        <p className="eyebrow">{t.issueRankTopPriorities}</p>
        <ol className="top-priorities-list">
          {top3.map((issue, i) => (
            <li key={issue.key} className="top-priority-item">
              <span className="priority-number">{i + 1}</span>
              <span>{issue.label}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="issue-ranking-container">
      <h3 className="issue-ranking-title">{t.issueRankingTitle}</h3>
      <p className="issue-ranking-subtitle">{t.issueRankingSubtitle}</p>
      <p className="sr-only">{t.issueRankInstructions}</p>

      {/* ARIA live region for announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {announcement}
      </div>

      <ol
        className="issue-rank-list"
        data-testid="issue-ranking-list"
        aria-label={t.issueRankingTitle}
      >
        {issues.map((issue, idx) => {
          const isTop3 = idx < 3;
          const isGrabbed = focusedIdx === idx;
          return (
            <li
              key={issue.key}
              className={[
                "issue-rank-item",
                isTop3 ? "issue-rank-item--top3" : "",
                isGrabbed ? "issue-rank-item--grabbed" : "",
                draggingIdx === idx ? "issue-rank-item--dragging" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              data-testid={`issue-rank-item-${issue.slug}`}
              aria-label={`${issue.label}, position ${idx + 1}`}
              aria-grabbed={isGrabbed}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              tabIndex={0}
              role="option"
              aria-selected={isGrabbed}
            >
              <span className="rank-number" aria-hidden="true">
                {idx + 1}
              </span>
              <span className="rank-drag-handle" aria-hidden="true">
                ⠿
              </span>
              <span className="rank-label">{issue.label}</span>
              {isTop3 && (
                <span className="rank-top3-badge" aria-hidden="true">
                  ★
                </span>
              )}
              {countyFips && (
                <PolisOverlay issueSlug={issue.slug} countyFips={countyFips} />
              )}
            </li>
          );
        })}
      </ol>

      <div className="issue-rank-actions">
        <button
          className="button button-secondary"
          data-testid="issue-rank-skip-button"
          onClick={handleSkip}
          type="button"
        >
          {t.issueRankSkipButton}
        </button>
        <button
          className="button button-primary"
          data-testid="issue-rank-confirm-button"
          onClick={handleConfirm}
          type="button"
        >
          {t.issueRankConfirmButton}
        </button>
      </div>
    </div>
  );
}
