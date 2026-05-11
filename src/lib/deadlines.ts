import type { DeadlineInfo, DeadlineStatus, Election } from "./types";

/**
 * Calculate the number of days between today and a target date.
 * Returns null if the date is in the past.
 */
export function daysUntil(dateStr: string): number | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays : null;
}

/**
 * Get deadline status based on days remaining.
 * Per spec: green >14 days, yellow ≤14, red ≤3, passed.
 */
export function getDeadlineStatus(dateStr: string): DeadlineStatus {
  const days = daysUntil(dateStr);
  if (days === null) return "passed";
  if (days <= 3) return "red";
  if (days <= 14) return "yellow";
  return "green";
}

/**
 * Build a full DeadlineInfo object for a given date string.
 */
export function calcDeadline(dateStr: string): DeadlineInfo {
  const days = daysUntil(dateStr);
  const status = getDeadlineStatus(dateStr);
  let label: string;
  if (days === null) {
    label = "Passed";
  } else if (days === 0) {
    label = "Today";
  } else if (days === 1) {
    label = "1 day left";
  } else {
    label = `${days} days left`;
  }
  return { date: dateStr, status, daysLeft: days, label };
}

/**
 * Find the next upcoming election (date >= today) from an array of elections.
 */
export function findNextElection(elections: Election[]): Election | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = elections.filter((e) => {
    const d = new Date(e.date + "T00:00:00");
    return d >= today;
  });
  if (upcoming.length === 0) return null;
  return upcoming.sort((a, b) => a.date.localeCompare(b.date))[0];
}

/**
 * Format a date string (ISO) to a human-readable format.
 */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
