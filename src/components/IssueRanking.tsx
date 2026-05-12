"use client";

import React, { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CANONICAL_ISSUES,
  issueKeyToSlug,
  topPriorities,
  type RankedIssues,
} from "@/lib/canonicalIssues";

// ---- Types -----------------------------------------------------------------

interface IssueCounts {
  [issueSlug: string]: number;
}

interface IssueRankingProps {
  countyFips?: string | null;
  onComplete: (ranking: RankedIssues) => void;
}

// ---- Polis Overlay ---------------------------------------------------------

function PolisOverlay({
  issueKey,
  counts,
  maxCount,
  hasData,
}: {
  issueKey: string;
  counts: IssueCounts;
  maxCount: number;
  hasData: boolean;
}) {
  if (!hasData) return null;
  const slug = issueKeyToSlug(issueKey);
  const count = counts[slug] ?? 0;
  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;

  return (
    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
      <div
        data-testid={`issue-count-bar-${slug}`}
        role="progressbar"
        aria-valuenow={count}
        aria-valuemin={0}
        aria-valuemax={maxCount}
        aria-label={`${count} voters in your county ranked ${issueKey}`}
        className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-blue-400 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        data-testid={`issue-count-value-${slug}`}
        className="w-8 text-right tabular-nums"
      >
        {pct}%
      </span>
    </div>
  );
}

// ---- Sortable Item ---------------------------------------------------------

function SortableItem({
  id,
  index,
  issueKey,
  counts,
  maxCount,
  hasCountData,
  announcement,
}: {
  id: string;
  index: number;
  issueKey: string;
  counts: IssueCounts;
  maxCount: number;
  hasCountData: boolean;
  announcement: string;
}) {
  const slug = issueKeyToSlug(issueKey);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-testid={`issue-rank-item-${slug}`}
      className={`flex flex-col px-3 py-2 bg-white border rounded-lg cursor-grab active:cursor-grabbing shadow-sm transition-shadow ${
        isDragging
          ? "shadow-lg border-blue-300"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Rank number */}
        <span
          className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0 ${
            index < 3 ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
          }`}
          aria-hidden="true"
        >
          {index + 1}
        </span>

        {/* Issue label */}
        <span
          className="flex-1 text-sm font-medium text-gray-800"
          {...attributes}
          {...listeners}
          aria-roledescription="sortable item"
          aria-label={`${issueKey}, position ${index + 1} of ${CANONICAL_ISSUES.length}. ${announcement}`}
          tabIndex={0}
        >
          {issueKey}
        </span>

        {/* Drag handle visual */}
        <svg
          className="w-4 h-4 text-gray-300 shrink-0"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M8 6a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm8-16a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </div>

      {/* Polis overlay bar */}
      <PolisOverlay
        issueKey={issueKey}
        counts={counts}
        maxCount={maxCount}
        hasData={hasCountData}
      />
    </li>
  );
}

// ---- IssueRanking ----------------------------------------------------------

export function IssueRanking({ countyFips, onComplete }: IssueRankingProps) {
  const [items, setItems] = useState<string[]>(
    CANONICAL_ISSUES.map((i) => i.key),
  );
  const [announcement, setAnnouncement] = useState("");
  const [counts, setCounts] = useState<IssueCounts>({});
  const [maxCount, setMaxCount] = useState(0);
  const [hasCountData, setHasCountData] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Fetch Polis overlay counts if we have a countyFips
  useEffect(() => {
    if (!countyFips) return;
    const abortCtrl = new AbortController();
    fetch(`/api/issue-counts?countyFips=${encodeURIComponent(countyFips)}`, {
      signal: abortCtrl.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const ic: IssueCounts = data.issueCounts ?? {};
        setCounts(ic);
        const max = Math.max(0, ...Object.values(ic).map(Number));
        setMaxCount(max);
        setHasCountData(Object.keys(ic).length > 0);
      })
      .catch(() => {
        /* graceful degradation */
      });
    return () => abortCtrl.abort();
  }, [countyFips]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((prev) => {
      const oldIndex = prev.indexOf(active.id as string);
      const newIndex = prev.indexOf(over.id as string);
      const next = arrayMove(prev, oldIndex, newIndex);
      const a = `${active.id as string} moved to position ${newIndex + 1}`;
      setAnnouncement(a);
      return next;
    });
  }

  function handleConfirm() {
    // Increment counts for confirmed issues (top 3 as the "ranked" ones)
    if (countyFips) {
      const top3Slugs = topPriorities(items).map(issueKeyToSlug);
      top3Slugs.forEach((slug) => {
        fetch("/api/issue-counts/increment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ countyFips, issueSlug: slug }),
        }).catch(() => {
          /* graceful degradation */
        });
      });
    }

    setConfirmed(true);
    onComplete({
      ordered: items,
      skipped: false,
      timestamp: new Date().toISOString(),
    });
  }

  function handleSkip() {
    setConfirmed(true);
    onComplete({
      ordered: [],
      skipped: true,
      timestamp: new Date().toISOString(),
    });
  }

  if (confirmed) {
    return (
      <div className="p-4 rounded-xl border border-green-200 bg-green-50 text-sm text-green-800">
        Issue ranking saved. Your top priorities will guide the AI discussion.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Rank Your Issues
        </h2>
        <p className="text-sm text-gray-500">
          Drag to reorder, or use arrow keys (Space to grab, Arrow keys to
          move). Top 3 will guide your AI ballot discussion.
        </p>
        {hasCountData && (
          <p
            data-testid="issue-count-county-label"
            className="text-xs text-blue-600 mt-1"
          >
            Bars show how often voters in your county ranked each issue.
            <span className="ml-1 text-gray-400">
              (We only count — no personal data stored.)
            </span>
          </p>
        )}
      </div>

      {/* Screen reader live region */}
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {announcement}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <ol
            data-testid="issue-ranking-list"
            className="space-y-2"
            aria-label="Issue ranking list. Use drag-and-drop or keyboard to reorder."
          >
            {items.map((issueKey, index) => (
              <SortableItem
                key={issueKey}
                id={issueKey}
                index={index}
                issueKey={issueKey}
                counts={counts}
                maxCount={maxCount}
                hasCountData={hasCountData}
                announcement={announcement}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      {/* Hidden but accessible keyboard controls table */}
      <details className="text-xs text-gray-400">
        <summary className="cursor-pointer hover:text-gray-600 focus:outline-none focus:text-gray-600">
          Keyboard instructions
        </summary>
        <ul className="mt-1 space-y-1 list-disc list-inside">
          <li>Tab to an item, press Space to grab</li>
          <li>Arrow Up / Arrow Down to move</li>
          <li>Space or Enter to drop</li>
          <li>Escape to cancel</li>
        </ul>
      </details>

      <div className="flex gap-3 flex-wrap">
        <button
          data-testid="issue-rank-confirm-button"
          onClick={handleConfirm}
          className="px-5 py-2 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors min-h-[44px]"
        >
          Confirm ranking
        </button>
        <button
          data-testid="issue-rank-skip-button"
          onClick={handleSkip}
          className="px-5 py-2 text-gray-600 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors min-h-[44px]"
        >
          Skip (no weighting)
        </button>
      </div>

      {/* Privacy disclosure */}
      <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
        When you rank an issue, we anonymously add to a county-level count that
        other voters can see. We never store your zip code, your ranking
        sequence, or anything else — just &ldquo;+1 in [county] for
        [issue].&rdquo;
      </p>
    </div>
  );
}
