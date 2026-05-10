"use client";

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
import { useLanguage } from "@/lib/language-context";
import { CANONICAL_ISSUES } from "@/lib/canonical-issues";
import type { CanonicalIssue } from "@/lib/canonical-issues";

interface SortableItemProps {
  issue: CanonicalIssue;
  index: number;
  language: string;
}

function SortableItem({ issue, index, language }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const label = language === "es" ? issue.labelEs : issue.label;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-grab active:cursor-grabbing select-none"
    >
      <span className="text-gray-400 font-mono text-sm w-5">{index + 1}.</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span className="text-gray-400 text-xs">⠿</span>
    </div>
  );
}

interface IssuePriorityRankerProps {
  issues: CanonicalIssue[];
  setIssues: (issues: CanonicalIssue[]) => void;
}

export function IssuePriorityRanker({
  issues,
  setIssues,
}: IssuePriorityRankerProps) {
  const { language } = useLanguage();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = issues.findIndex((i) => i.id === active.id);
      const newIndex = issues.findIndex((i) => i.id === over.id);
      setIssues(arrayMove(issues, oldIndex, newIndex));
    }
  }

  const heading =
    language === "es"
      ? "Ordena tus temas (arrastra para reordenar)"
      : "Rank your issues (drag to reorder)";

  return (
    <div>
      <p className="text-sm text-gray-600 mb-3">{heading}</p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={issues.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {issues.map((issue, index) => (
              <SortableItem
                key={issue.id}
                issue={issue}
                index={index}
                language={language}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

export { CANONICAL_ISSUES };
