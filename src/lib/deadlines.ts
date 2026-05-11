import type { DeadlineInfo, DeadlineStatus } from "./types";

/**
 * Calculate deadline status relative to today.
 * Returns color status and days-remaining label.
 */
export function calcDeadline(isoDate: string | null): DeadlineInfo {
  if (!isoDate) {
    return {
      date: null,
      daysLeft: null,
      status: "not-available",
      label: "Not available",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(isoDate + "T00:00:00");
  const diffMs = deadline.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let status: DeadlineStatus;
  let label: string;

  if (daysLeft < 0) {
    status = "passed";
    label = "Passed";
  } else if (daysLeft <= 3) {
    status = "red";
    label =
      daysLeft === 0
        ? "Today!"
        : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
  } else if (daysLeft <= 14) {
    status = "yellow";
    label = `${daysLeft} days left`;
  } else {
    status = "green";
    label = `${daysLeft} days left`;
  }

  return { date: isoDate, daysLeft, status, label };
}

/**
 * Format an ISO date string to a human-readable date.
 * e.g. "2026-03-03" -> "March 3, 2026"
 */
export function formatDate(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Find the next upcoming election from an array, relative to today.
 */
export function findNextElection<T extends { date: string }>(
  elections: T[],
): T | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = elections
    .filter((e) => new Date(e.date + "T00:00:00") >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  return upcoming[0] ?? null;
}
