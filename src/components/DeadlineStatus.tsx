"use client";

import type { DeadlineResult } from "@/lib/types";

interface DeadlineStatusProps {
  label: string;
  deadline: string | null;
  result: DeadlineResult;
}

const STATUS_STYLES: Record<string, string> = {
  passed: "text-gray-500 bg-gray-100",
  urgent: "text-red-700 bg-red-100",
  warning: "text-yellow-700 bg-yellow-100",
  ok: "text-green-700 bg-green-100",
  na: "text-gray-500 bg-gray-100",
};

export function DeadlineStatus({
  label,
  deadline,
  result,
}: DeadlineStatusProps) {
  const style = STATUS_STYLES[result.status] ?? STATUS_STYLES.na;

  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-sm text-gray-700 min-w-0 flex-1">{label}</span>
      {deadline && <span className="text-xs text-gray-500">{deadline}</span>}
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${style}`}
        aria-label={`${label}: ${result.label}`}
      >
        {result.label}
      </span>
    </div>
  );
}
