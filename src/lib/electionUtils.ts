import type { Election, DeadlineInfo, DeadlineStatus } from "@/types/election";

/**
 * Find the next upcoming election (first election with date >= today).
 * Returns null if no upcoming election found.
 */
export function findNextElection(elections: Election[]): Election | null {
  const today = getTodayIso();
  const upcoming = elections
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] ?? null;
}

/**
 * Get today's date as an ISO string (YYYY-MM-DD) in local time.
 */
export function getTodayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculate deadline status and label for a registration deadline.
 * Returns status color category and human-readable label.
 */
export function getDeadlineStatus(deadline: string | null): DeadlineInfo {
  if (!deadline) {
    return {
      date: "N/A",
      status: "passed",
      label: "Not available",
      daysLeft: null,
    };
  }

  const today = getTodayIso();
  const daysLeft = diffDays(today, deadline);

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

  return {
    date: deadline,
    status,
    label,
    daysLeft,
  };
}

/**
 * Calculate the number of days from startDate to endDate (both ISO strings YYYY-MM-DD).
 * Positive = future, negative = past.
 */
function diffDays(startDate: string, endDate: string): number {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

/**
 * Format an ISO date string (YYYY-MM-DD) to a human-readable form like "March 3, 2026".
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
