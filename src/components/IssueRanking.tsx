"use client";

import { useState, useCallback, useId } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CANONICAL_ISSUES } from "@/lib/canonicalIssues";
import type { RankedIssues } from "@/lib/types";

type SortableItemProps = {
  id: string;
  index: number;
  label: string;
  announcement: string;
};

function SortableItem({ id, index, label, announcement }: SortableItemProps) {
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
      className={`flex items-center gap-3 bg-white border rounded-lg px-4 py-3 cursor-grab select-none ${
        isDragging ? "border-blue-400 shadow-lg" : "border-gray-200"
      }`}
      title={announcement}
      {...attributes}
      {...listeners}
    >
      <span
        className="text-gray-400 font-mono text-sm w-6 text-center flex-shrink-0"
        aria-hidden="true"
      >
        {index + 1}
      </span>
      <span className="flex-1 text-gray-800 font-medium">{label}</span>
      <span className="text-gray-300" aria-hidden="true">
        ⣿
      </span>
    </li>
  );
}

type IssueRankingProps = {
  onConfirm: (ranked: RankedIssues) => void;
};

export function IssueRanking({ onConfirm }: IssueRankingProps) {
  const [items, setItems] = useState(() => CANONICAL_ISSUES.map((i) => i.slug));
  const [announcement, setAnnouncement] = useState("");
  const labelId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        const next = arrayMove(prev, oldIndex, newIndex);

        // Build announcement for screen readers
        const label =
          CANONICAL_ISSUES.find((i) => i.slug === active.id)?.key ?? active.id;
        setAnnouncement(
          `${label} moved to position ${newIndex + 1} of ${next.length}.`,
        );
        return next;
      });
    }
  }, []);

  function handleConfirm() {
    const ordered = items.map(
      (slug) => CANONICAL_ISSUES.find((i) => i.slug === slug)?.key ?? slug,
    );
    onConfirm({
      ordered,
      skipped: false,
      timestamp: new Date().toISOString(),
    });
  }

  function handleSkip() {
    onConfirm({
      ordered: [],
      skipped: true,
      timestamp: new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 id={labelId} className="text-lg font-semibold text-gray-900">
          Rank Your Priorities
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Drag to reorder, or use keyboard: Tab to focus, Space to grab, Arrow
          keys to move, Space to drop.
        </p>
      </div>

      {/* Screen reader live region */}
      <div
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
          <ol
            data-testid="issue-ranking-list"
            aria-labelledby={labelId}
            className="space-y-2"
          >
            {items.map((slug, index) => {
              const label =
                CANONICAL_ISSUES.find((i) => i.slug === slug)?.key ?? slug;
              return (
                <SortableItem
                  key={slug}
                  id={slug}
                  index={index}
                  label={label}
                  announcement={`${label}, position ${index + 1} of ${items.length}. Press Space to grab.`}
                />
              );
            })}
          </ol>
        </SortableContext>
      </DndContext>

      <div className="flex gap-3 pt-2">
        <button
          data-testid="issue-rank-skip-button"
          onClick={handleSkip}
          className="text-sm text-gray-500 hover:text-gray-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        >
          Skip ranking
        </button>
        <button
          data-testid="issue-rank-confirm-button"
          onClick={handleConfirm}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg px-5 py-2 text-sm min-h-[36px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Confirm priorities
        </button>
      </div>
    </div>
  );
}
