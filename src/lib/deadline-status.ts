import type { DeadlineStatus } from "@/types";

/**
 * Compute the deadline status for a given ISO date string relative to today.
 *
 * Color coding:
 * - green: > 14 days remaining
 * - yellow: 1-14 days remaining
 * - red: <= 3 days remaining (overrides yellow)
 * - passed: deadline has passed
 * - na: no deadline available
 */
export function getDeadlineStatus(
  dateStr: string | null | undefined,
  today: Date,
): DeadlineStatus {
  if (!dateStr) {
    return { label: "na", text: "Not available", date: null };
  }

  // Parse as UTC midnight to avoid timezone offset issues
  const deadline = new Date(dateStr + "T00:00:00Z");
  const todayUTC = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  );

  const diffMs = deadline.getTime() - todayUTC.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const formattedDate = deadline.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  if (diffDays < 0) {
    return { label: "passed", text: "Passed", date: formattedDate };
  }

  if (diffDays === 0) {
    return { label: "red", text: "Today — last day!", date: formattedDate };
  }

  if (diffDays <= 3) {
    return {
      label: "red",
      text: `${diffDays} day${diffDays === 1 ? "" : "s"} left`,
      date: formattedDate,
    };
  }

  if (diffDays <= 14) {
    return {
      label: "yellow",
      text: `${diffDays} days left`,
      date: formattedDate,
    };
  }

  return {
    label: "green",
    text: `${diffDays} days left`,
    date: formattedDate,
  };
}

/**
 * Format an ISO date string for display (e.g. "Mar 3, 2026")
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Unknown";
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Check if ALL registration deadlines have passed.
 */
export function allDeadlinesPassed(
  deadlines: (DeadlineStatus | null)[],
): boolean {
  const realDeadlines = deadlines.filter(
    (d): d is DeadlineStatus => d !== null && d.label !== "na",
  );
  if (realDeadlines.length === 0) return false;
  return realDeadlines.every((d) => d.label === "passed");
}
