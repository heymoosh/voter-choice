import type { DeadlineStatus } from "@/types/election";

const DEADLINE_URGENT_DAYS = 3;
const DEADLINE_WARNING_DAYS = 14;

/**
 * Get today's date at midnight in local timezone.
 * Use this for deadline comparisons to avoid UTC drift.
 */
function getTodayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Parse an ISO date string (YYYY-MM-DD) as a local-timezone midnight date.
 * DO NOT use new Date(isoString) — that parses as UTC midnight, causing off-by-one errors.
 */
function parseDateLocal(isoDate: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    throw new Error(`Invalid ISO date format: ${isoDate}`);
  }
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Get today as a YYYY-MM-DD string in local timezone.
 * Safe for ISO string comparisons (e.g., filtering upcoming elections).
 */
export function getTodayISO(): string {
  return new Date().toLocaleDateString("en-CA"); // en-CA locale gives YYYY-MM-DD
}

/**
 * Calculate the number of days until an ISO date, using local timezone.
 * Returns negative values for past dates.
 */
function getDaysUntil(isoDate: string): number {
  const today = getTodayLocal();
  const target = parseDateLocal(isoDate);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/**
 * Determine the visual status for a deadline based on days remaining.
 */
function getDeadlineStatus(daysRemaining: number): DeadlineStatus {
  if (daysRemaining < 0) return "passed";
  if (daysRemaining <= DEADLINE_URGENT_DAYS) return "urgent";
  if (daysRemaining <= DEADLINE_WARNING_DAYS) return "warning";
  return "safe";
}

/**
 * Format an ISO date string to a human-readable format (e.g., "March 3, 2026").
 */
export function formatDate(isoDate: string): string {
  const date = parseDateLocal(isoDate);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format a deadline with its status label.
 * Returns an object with the formatted date, days remaining, and status.
 */
export function formatDeadline(isoDate: string | null): {
  formatted: string;
  daysRemaining: number;
  status: DeadlineStatus;
  label: string;
} | null {
  if (!isoDate) return null;
  const daysRemaining = getDaysUntil(isoDate);
  const status = getDeadlineStatus(daysRemaining);
  const formatted = formatDate(isoDate);

  let label: string;
  if (status === "passed") {
    label = "Passed";
  } else if (daysRemaining === 0) {
    label = "Today";
  } else if (daysRemaining === 1) {
    label = "1 day left";
  } else {
    label = `${daysRemaining} days left`;
  }

  return { formatted, daysRemaining, status, label };
}
