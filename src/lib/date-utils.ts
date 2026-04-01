import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import type { DeadlineInfo, DeadlineStatus } from "./types";
import type { Language } from "./translations";
import { translations } from "./translations";

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
  lang: Language = "en",
): DeadlineInfo {
  const t = translations[lang].deadlineStatus;

  if (!deadlineStr) {
    return {
      status: "unavailable",
      daysRemaining: null,
      label: t.unavailable,
    };
  }

  const deadline = startOfDay(parseISODate(deadlineStr));
  const todayStart = startOfDay(today);
  const days = differenceInCalendarDays(deadline, todayStart);

  let status: DeadlineStatus;
  let label: string;

  if (days < 0) {
    status = "passed";
    label = t.passed;
  } else if (days <= 3) {
    status = "red";
    label = t.daysLeft(days);
  } else if (days <= 14) {
    status = "yellow";
    label = t.daysLeft(days);
  } else {
    status = "green";
    label = t.daysLeft(days);
  }

  return { status, daysRemaining: days >= 0 ? days : null, label };
}

/**
 * Format a YYYY-MM-DD date string as a human-readable date.
 * Returns "Not available" for null.
 */
export function formatDate(
  dateStr: string | null,
  lang: Language = "en",
): string {
  if (!dateStr) {
    return translations[lang].stateInfo.notAvailable;
  }
  const date = parseISODate(dateStr);
  const locale = lang === "es" ? "es-US" : "en-US";
  return date.toLocaleDateString(locale, {
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
