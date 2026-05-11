import { DeadlineStatus } from "./types";

/**
 * Calculate the number of days remaining until a deadline.
 * Negative values indicate the deadline has passed.
 */
export function getDaysRemaining(isoDate: string, today: Date): number {
  const deadline = new Date(isoDate + "T00:00:00");
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const diffMs = deadline.getTime() - todayMidnight.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get the visual status for a registration deadline.
 * - GREEN: > 14 days remaining
 * - YELLOW: 1-14 days remaining
 * - RED: 0-3 days remaining (≤3 days)
 * - PASSED: deadline has passed (negative days)
 */
export function getDeadlineStatus(
  isoDate: string | null,
  today: Date,
): DeadlineStatus {
  if (!isoDate) return DeadlineStatus.PASSED;
  const days = getDaysRemaining(isoDate, today);
  if (days < 0) return DeadlineStatus.PASSED;
  if (days <= 3) return DeadlineStatus.RED;
  if (days <= 14) return DeadlineStatus.YELLOW;
  return DeadlineStatus.GREEN;
}

/**
 * Format a relative deadline label for display.
 */
export function getDeadlineLabel(isoDate: string | null, today: Date): string {
  if (!isoDate) return "Not available";
  const days = getDaysRemaining(isoDate, today);
  if (days < 0) return "Passed";
  if (days === 0) return "Today — Last Day";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

/**
 * Format an ISO date for display (e.g. "March 3, 2026").
 */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Check if all registration deadlines have passed.
 */
export function allDeadlinesPassed(
  deadlines: (string | null)[],
  today: Date,
): boolean {
  const validDeadlines = deadlines.filter((d) => d !== null) as string[];
  if (validDeadlines.length === 0) return true;
  return validDeadlines.every((d) => getDaysRemaining(d, today) < 0);
}
