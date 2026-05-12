"use client";

import React, { useState, useCallback, useId } from "react";
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CANONICAL_ISSUES, KEY_TO_LABEL } from "@/lib/canonicalIssues";
import {
  makeRankedIssues,
  makeSkippedRanking,
  type RankedIssues,
} from "@/lib/issueRanking";
import type { PolisCountData } from "./PolisOverlay";

interface SortableItemProps {
  id: string;
  label: string;
  rank: number;
  total: number;
  polisData?: PolisCountData | null;
  onAnnounce: (message: string) => void;
}

function SortableItem({
  id,
  label,
  rank,
  total,
  polisData,
  onAnnounce,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : undefined,
  };

  const maxCount =
    polisData && Object.values(polisData.issueCounts).length > 0
      ? Math.max(...Object.values(polisData.issueCounts))
      : 0;
  const count = polisData?.issueCounts[id] ?? 0;
  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`issue-rank-item-${id}`}
      className={`flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm select-none ${isDragging ? "border-blue-400 shadow-md" : "border-gray-200"}`}
    >
      <span
        className="text-gray-400 font-mono text-sm w-6 text-right shrink-0"
        aria-hidden="true"
      >
        {rank}
      </span>
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 rounded text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 shrink-0"
        aria-label={`Drag to reorder ${label}. Currently ${rank} of ${total}.`}
        onKeyDown={(e) => {
          if (e.key === " ") {
            onAnnounce(
              `Grabbed ${label}. Use arrow keys to reorder, Space to drop.`,
            );
          }
        }}
      >
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <circle cx="5" cy="4" r="1.5" />
          <circle cx="11" cy="4" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="11" cy="12" r="1.5" />
        </svg>
      </button>
      <span className="flex-1 text-sm font-medium text-gray-800">{label}</span>
      {polisData && maxCount > 0 && (
        <div className="flex items-center gap-2 shrink-0">
          <div
            data-testid={`issue-count-bar-${id}`}
            className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${pct}% of county voters ranked this issue`}
          >
            <div
              className="h-full bg-blue-400 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span
            data-testid={`issue-count-value-${id}`}
            className="text-xs text-gray-500 w-8 text-right"
          >
            {pct}%
          </span>
        </div>
      )}
    </div>
  );
}

interface IssueRankingListProps {
  onConfirm: (ranking: RankedIssues) => void;
  polisData?: PolisCountData | null;
  labels?: {
    heading?: string;
    subheading?: string;
    skipButton?: string;
    confirmButton?: string;
    ariaGrabbed?: string;
    ariaDropped?: (position: number, total: number) => string;
    countyLabel?: string;
    privacyNotice?: string;
  };
}

export default function IssueRankingList({
  onConfirm,
  polisData,
  labels = {},
}: IssueRankingListProps) {
  const [items, setItems] = useState<string[]>(() =>
    CANONICAL_ISSUES.map((i) => i.key),
  );
  const [announcement, setAnnouncement] = useState("");
  const liveRegionId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        setItems((prev) => {
          const oldIndex = prev.indexOf(active.id as string);
          const newIndex = prev.indexOf(over.id as string);
          const updated = arrayMove(prev, oldIndex, newIndex);
          const pos = newIndex + 1;
          const label = KEY_TO_LABEL[active.id as string] ?? String(active.id);
          const msg = labels.ariaDropped
            ? labels.ariaDropped(pos, updated.length)
            : `${label} moved to position ${pos} of ${updated.length}.`;
          setAnnouncement(msg);
          return updated;
        });
      }
    },
    [labels],
  );

  const handleAnnounce = useCallback((msg: string) => {
    setAnnouncement(msg);
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(makeRankedIssues(items));
  }, [items, onConfirm]);

  const handleSkip = useCallback(() => {
    onConfirm(makeSkippedRanking());
  }, [onConfirm]);

  return (
    <section aria-labelledby="issue-ranking-heading" className="space-y-4">
      <div>
        <h2
          id="issue-ranking-heading"
          className="text-xl font-bold text-gray-900"
        >
          {labels.heading ?? "Rank Your Priorities"}
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          {labels.subheading ??
            "Drag the issues below into your preferred order — most important at the top."}
        </p>
      </div>

      {/* Polis county label */}
      {polisData && (
        <p
          data-testid="issue-count-county-label"
          className="text-xs text-gray-500 italic"
        >
          {labels.countyLabel ??
            "Of voters in your county who ranked their issues"}
        </p>
      )}

      {/* aria-live region for DnD announcements */}
      <div
        id={liveRegionId}
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div
            data-testid="issue-ranking-list"
            className="space-y-2"
            role="list"
            aria-label="Issue ranking list"
          >
            {items.map((key, idx) => (
              <div key={key} role="listitem">
                <SortableItem
                  id={key}
                  label={KEY_TO_LABEL[key] ?? key}
                  rank={idx + 1}
                  total={items.length}
                  polisData={polisData}
                  onAnnounce={handleAnnounce}
                />
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Privacy notice */}
      {polisData && (
        <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
          {labels.privacyNotice ??
            "When you rank an issue, we anonymously add to a county-level count. We never store your zip code, your ranking sequence, or anything else — just '+1 in [county] for [issue].'"}
        </p>
      )}

      <div className="flex gap-3 pt-2 flex-wrap">
        <button
          data-testid="issue-rank-skip-button"
          onClick={handleSkip}
          className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm min-h-[44px]"
        >
          {labels.skipButton ?? "Skip — research without priorities"}
        </button>
        <button
          data-testid="issue-rank-confirm-button"
          onClick={handleConfirm}
          className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm min-h-[44px]"
        >
          {labels.confirmButton ?? "These are my priorities"}
        </button>
      </div>
    </section>
  );
}
