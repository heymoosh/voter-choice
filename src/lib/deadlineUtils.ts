import type { DeadlineStatus, DeadlineStatusTier } from "@/types";

/**
 * Calculate deadline status relative to today.
 * @param isoDate - ISO date string "YYYY-MM-DD"
 * @returns DeadlineStatus with tier, daysRemaining, label, and date
 */
export function getDeadlineStatus(isoDate: string): DeadlineStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadline = new Date(isoDate + "T00:00:00");
  deadline.setHours(0, 0, 0, 0);

  const diffMs = deadline.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let tier: DeadlineStatusTier;
  let daysRemaining: number | null;
  let label: string;

  if (diffDays < 0) {
    tier = "passed";
    daysRemaining = null;
    label = "Passed";
  } else if (diffDays === 0) {
    tier = "red";
    daysRemaining = 0;
    label = "Today — last day!";
  } else if (diffDays <= 3) {
    tier = "red";
    daysRemaining = diffDays;
    label = `${diffDays} day${diffDays === 1 ? "" : "s"} left`;
  } else if (diffDays <= 14) {
    tier = "yellow";
    daysRemaining = diffDays;
    label = `${diffDays} days left`;
  } else {
    tier = "green";
    daysRemaining = diffDays;
    label = `${diffDays} days left`;
  }

  return { tier, daysRemaining, label, date: isoDate };
}

/**
 * Format an ISO date string to a human-readable date.
 * e.g., "2026-03-03" → "March 3, 2026"
 */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Find the next upcoming election (first election with date >= today).
 */
export function findNextElection<T extends { date: string }>(
  elections: T[],
): T | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const found = elections.find((e) => {
    const electionDate = new Date(e.date + "T00:00:00");
    electionDate.setHours(0, 0, 0, 0);
    return electionDate >= today;
  });
  return found ?? null;
}

/**
 * Check if all registration deadlines have passed.
 */
export function allDeadlinesPassed(registration: {
  online: { deadline: string | null };
  byMail: { deadline: string };
  inPerson: { deadline: string };
}): boolean {
  const deadlines = [
    registration.online.deadline,
    registration.byMail.deadline,
    registration.inPerson.deadline,
  ].filter(Boolean) as string[];

  return deadlines.every((d) => getDeadlineStatus(d).tier === "passed");
}
