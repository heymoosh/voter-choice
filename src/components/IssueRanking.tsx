"use client";

import { useState, useCallback } from "react";
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
import { CANONICAL_ISSUES, RankedIssues } from "@/lib/canonicalIssues";

interface SortableItemProps {
  id: string;
  label: string;
  index: number;
}

function SortableItem({ id, label, index }: SortableItemProps) {
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
      data-testid={`issue-rank-item-${id}`}
      className={`flex items-center gap-3 p-3 bg-white border rounded-lg cursor-grab active:cursor-grabbing select-none ${
        isDragging
          ? "shadow-lg border-blue-400"
          : "border-gray-200 hover:border-gray-300"
      }`}
      {...attributes}
      {...listeners}
    >
      <span className="text-gray-400 font-mono text-sm w-6 text-center">
        {index + 1}
      </span>
      <span className="flex-1 text-sm font-medium text-gray-800">{label}</span>
      <span className="text-gray-300" aria-hidden="true">
        ⠿
      </span>
    </li>
  );
}

interface IssueRankingProps {
  onConfirm: (ranking: RankedIssues) => void;
  onSkip: () => void;
  countyFips?: string;
  issueCounts?: Record<string, number>;
}

export default function IssueRanking({
  onConfirm,
  onSkip,
  issueCounts,
}: IssueRankingProps) {
  const [items, setItems] = useState<string[]>(
    CANONICAL_ISSUES.map((i) => i.slug),
  );
  const [announcement, setAnnouncement] = useState("");

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
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newItems = arrayMove(items, oldIndex, newIndex);
        setItems(newItems);

        const movedLabel =
          CANONICAL_ISSUES.find((i) => i.slug === active.id)?.label ??
          active.id;
        setAnnouncement(
          `${movedLabel} moved to position ${newIndex + 1} of ${items.length}`,
        );
      }
    },
    [items],
  );

  const handleConfirm = useCallback(() => {
    onConfirm({
      ordered: items,
      skipped: false,
      timestamp: new Date().toISOString(),
    });
  }, [items, onConfirm]);

  const handleSkip = useCallback(() => {
    onSkip();
  }, [onSkip]);

  // Get top count for Polis overlay normalization
  const maxCount = issueCounts ? Math.max(1, ...Object.values(issueCounts)) : 1;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Rank Your Priorities
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Drag to reorder — most important at the top. Your top 3 will guide the
          AI research assistant.
        </p>
      </div>

      {/* aria-live region for screen reader announcements */}
      <div
        aria-live="polite"
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
            aria-label="Issue priority ranking list"
          >
            {items.map((slug, index) => {
              const issue = CANONICAL_ISSUES.find((i) => i.slug === slug);
              const label = issue?.label ?? slug;
              const count = issueCounts?.[slug] ?? 0;
              const pct = issueCounts
                ? Math.round((count / maxCount) * 100)
                : null;

              return (
                <div key={slug}>
                  <SortableItem id={slug} label={label} index={index} />
                  {pct !== null && (
                    <div className="ml-9 mt-1 mb-1 text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div
                            data-testid={`issue-count-bar-${slug}`}
                            className="bg-blue-400 h-1.5 rounded-full"
                            style={{ width: `${pct}%` }}
                            aria-valuenow={count}
                            aria-valuemin={0}
                            aria-valuemax={maxCount}
                            role="progressbar"
                            aria-label={`${count} voters in your county ranked ${label}`}
                          />
                        </div>
                        <span
                          data-testid={`issue-count-value-${slug}`}
                          className="w-8 text-right"
                        >
                          {pct}%
                        </span>
                      </div>
                      <span
                        data-testid="issue-count-county-label"
                        className="text-xs text-gray-400"
                      >
                        Of voters in your county
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </ol>
        </SortableContext>
      </DndContext>

      {/* Privacy disclosure for Polis overlay */}
      {issueCounts && (
        <p className="text-xs text-gray-400 bg-gray-50 rounded p-2">
          When you rank an issue, we anonymously add to a county-level count
          that other voters can see. We never store your zip code, your ranking
          sequence, or anything else — just &ldquo;+1 in [county] for
          [issue].&rdquo;
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          data-testid="issue-rank-confirm-button"
          onClick={handleConfirm}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Confirm My Priorities
        </button>
        <button
          data-testid="issue-rank-skip-button"
          onClick={handleSkip}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
