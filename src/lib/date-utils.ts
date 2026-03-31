import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import type { DeadlineInfo, DeadlineStatus } from "./types";

/**
 * Parse a YYYY-MM-DD date string safely.
 * Using date-fns parseISO avoids timezone ambiguity from new Date("YYYY-MM-DD").
 */
export function parseISODate(dateStr: string): Date {
  return parseISO(dateStr);
}

/**
 * Calculate deadline status relative to today.
 * Pure function — today is injected for testability.
 *
 * Status thresholds:
 *   passed    — deadline is in the past
 *   red       — 0–3 days remaining
 *   yellow    — 4–14 days remaining
 *   green     — 15+ days remaining
 *   unavailable — deadline is null
 */
export function getDeadlineStatus(
  deadlineStr: string | null,
  today: Date,
): DeadlineInfo {
  if (!deadlineStr) {
    return {
      status: "unavailable",
      daysRemaining: null,
      label: "Not available",
    };
  }

  const deadline = startOfDay(parseISODate(deadlineStr));
  const todayStart = startOfDay(today);
  const days = differenceInCalendarDays(deadline, todayStart);

  let status: DeadlineStatus;
  let label: string;

  if (days < 0) {
    status = "passed";
    label = "Passed";
  } else if (days <= 3) {
    status = "red";
    label = days === 1 ? "1 day left" : `${days} days left`;
  } else if (days <= 14) {
    status = "yellow";
    label = `${days} days left`;
  } else {
    status = "green";
    label = `${days} days left`;
  }

  return { status, daysRemaining: days >= 0 ? days : null, label };
}

/**
 * Format a YYYY-MM-DD date string as a human-readable date.
 * Returns "Not available" for null.
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Not available";
  const date = parseISODate(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Find the next upcoming election (date >= today).
 * Returns null if no upcoming elections found.
 */
export function findNextElection<T extends { date: string }>(
  elections: T[],
  today: Date,
): T | null {
  const todayStart = startOfDay(today);
  const upcoming = elections.filter((e) => {
    const electionDate = startOfDay(parseISODate(e.date));
    return differenceInCalendarDays(electionDate, todayStart) >= 0;
  });
  if (upcoming.length === 0) return null;
  return upcoming.reduce((earliest, e) =>
    parseISODate(e.date) < parseISODate(earliest.date) ? e : earliest,
  ) as T;
}
