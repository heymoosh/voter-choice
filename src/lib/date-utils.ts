import type { Election, DeadlineStatus } from "../types/election";

/** Returns the earliest election with date >= today, or null. */
export function getNextElection(
  elections: Election[],
  today: Date,
): Election | null {
  const todayStr = toDateStr(today);
  const upcoming = elections
    .filter((e) => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] ?? null;
}

/** Computes urgency + label for a registration deadline. */
export function computeDeadlineStatus(
  deadline: string | null,
  today: Date,
): DeadlineStatus {
  if (!deadline) {
    return {
      date: null,
      daysLeft: null,
      label: "Not available",
      urgency: "na",
    };
  }

  const todayStr = toDateStr(today);

  if (deadline < todayStr) {
    return { date: deadline, daysLeft: 0, label: "Passed", urgency: "passed" };
  }

  const daysLeft = diffDays(today, parseDate(deadline));

  if (daysLeft === 0) {
    return { date: deadline, daysLeft: 0, label: "Today", urgency: "urgent" };
  }

  const label = daysLeft === 1 ? "1 day left" : `${daysLeft} days left`;

  const urgency = daysLeft <= 3 ? "urgent" : daysLeft <= 14 ? "warning" : "ok";

  return { date: deadline, daysLeft, label, urgency };
}

/** Formats "YYYY-MM-DD" as a locale-aware date string. Defaults to en-US. */
export function formatDate(isoDate: string, locale: string = "en-US"): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

// --- helpers ---

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseDate(iso: string): Date {
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

function diffDays(from: Date, to: Date): number {
  // Normalize both dates via UTC string to avoid timezone shifts
  const fromUTC = parseDate(toDateStr(from)).getTime();
  const toUTC = to.getTime();
  return Math.round((toUTC - fromUTC) / (1000 * 60 * 60 * 24));
}
