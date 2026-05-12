export type DeadlineStatus =
  | "green"
  | "yellow"
  | "red"
  | "passed"
  | "unavailable";

export interface DeadlineInfo {
  date: string | null;
  status: DeadlineStatus;
  label: string;
  daysLeft: number | null;
}

/**
 * Calculates deadline status relative to today.
 * Green: > 14 days remaining
 * Yellow: 1-14 days remaining
 * Red: 1-3 days remaining (more specific)
 * Passed: deadline has passed
 * Unavailable: no deadline date provided
 */
export function getDeadlineInfo(
  deadlineDate: string | null | undefined,
  today: Date = new Date(),
): DeadlineInfo {
  if (!deadlineDate) {
    return {
      date: null,
      status: "unavailable",
      label: "Not available",
      daysLeft: null,
    };
  }

  // Parse as UTC noon to avoid timezone issues
  const deadline = new Date(deadlineDate + "T12:00:00Z");
  const todayNoon = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
      12,
      0,
      0,
    ),
  );

  const diffMs = deadline.getTime() - todayNoon.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return {
      date: deadlineDate,
      status: "passed",
      label: "Passed",
      daysLeft: null,
    };
  }

  if (daysLeft === 0) {
    return {
      date: deadlineDate,
      status: "red",
      label: "Today",
      daysLeft: 0,
    };
  }

  let status: DeadlineStatus;
  let label: string;

  if (daysLeft <= 3) {
    status = "red";
    label = `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
  } else if (daysLeft <= 14) {
    status = "yellow";
    label = `${daysLeft} days left`;
  } else {
    status = "green";
    label = `${daysLeft} days left`;
  }

  return {
    date: deadlineDate,
    status,
    label,
    daysLeft,
  };
}

/**
 * Formats an ISO date string to a human-readable format.
 * e.g., "2026-03-03" → "March 3, 2026"
 */
export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "Unknown";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const [year, month, day] = parts.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Finds the next upcoming election on or after today.
 */
export function getNextElection(
  elections: Array<{
    date: string;
    name: string;
    type: string;
    isPrimary: boolean;
    primaryType: string | null;
  }>,
  today: Date = new Date(),
): {
  date: string;
  name: string;
  type: string;
  isPrimary: boolean;
  primaryType: string | null;
} | null {
  const todayStr = today.toISOString().slice(0, 10);
  const upcoming = elections
    .filter((e) => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] ?? null;
}
