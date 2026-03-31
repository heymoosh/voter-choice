import type { DeadlineStatus } from "./types";

export function daysUntil(deadline: string, today: Date = new Date()): number {
  const deadlineDate = new Date(deadline + "T00:00:00");
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const diffMs = deadlineDate.getTime() - todayMidnight.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function getDeadlineStatus(
  deadline: string | null,
  today: Date = new Date(),
): DeadlineStatus {
  if (!deadline) return "passed";
  const days = daysUntil(deadline, today);
  if (days < 0) return "passed";
  if (days <= 3) return "urgent";
  if (days <= 14) return "warning";
  return "safe";
}

export function formatDate(isoDate: string): string {
  const date = new Date(isoDate + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getDeadlineLabel(
  deadline: string | null,
  today: Date = new Date(),
): string {
  if (!deadline) return "Not available";
  const days = daysUntil(deadline, today);
  if (days < 0) return "Passed";
  if (days === 0) return "Today!";
  if (days === 1) return "Tomorrow!";
  return `${days} days left`;
}
