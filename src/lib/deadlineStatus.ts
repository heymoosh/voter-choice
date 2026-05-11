import type { DeadlineResult, Election } from "./types";

/**
 * Calculate the deadline status relative to a reference date.
 * @param deadline - ISO date string for the deadline (or null if not available)
 * @param today - Reference date (defaults to today; injectable for testing)
 */
export function getDeadlineStatus(
  deadline: string | null,
  today: Date = new Date(),
): DeadlineResult {
  if (!deadline) {
    return { status: "na", daysRemaining: null, label: "Not available" };
  }

  // Normalize today to midnight local time to avoid time-of-day skew
  const todayNormalized = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const deadlineDate = new Date(deadline + "T00:00:00");

  const diffMs = deadlineDate.getTime() - todayNormalized.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: "passed", daysRemaining: null, label: "Passed" };
  }

  if (diffDays === 0) {
    return { status: "urgent", daysRemaining: 0, label: "Today" };
  }

  if (diffDays <= 3) {
    return {
      status: "urgent",
      daysRemaining: diffDays,
      label: `${diffDays} day${diffDays === 1 ? "" : "s"} left`,
    };
  }

  if (diffDays <= 14) {
    return {
      status: "warning",
      daysRemaining: diffDays,
      label: `${diffDays} days left`,
    };
  }

  return {
    status: "ok",
    daysRemaining: diffDays,
    label: `${diffDays} days left`,
  };
}

/**
 * Format an ISO date string for display (e.g., "March 3, 2026")
 */
export function formatDate(isoDate: string | null): string {
  if (!isoDate) return "N/A";
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Find the next upcoming election from a list.
 * Returns the first election with a date >= today, or null if none found.
 */
export function findNextElection(
  elections: Election[],
  today: Date = new Date(),
): Election | null {
  const todayStr = today.toISOString().split("T")[0];
  const upcoming = elections.filter((e) => e.date >= todayStr);
  if (upcoming.length === 0) return null;
  return upcoming.sort((a, b) => a.date.localeCompare(b.date))[0];
}
