import type { DeadlineInfo } from "../types/state";

export function getDeadlineInfo(
  deadline: string | null,
  today: Date = new Date()
): DeadlineInfo {
  if (!deadline) {
    return {
      date: null,
      status: "passed",
      daysRemaining: null,
      label: "Not available",
    };
  }

  // Parse both dates as UTC to avoid timezone issues
  const deadlineDate = new Date(deadline + "T00:00:00Z");
  const todayUTC = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.round(
    (deadlineDate.getTime() - todayUTC.getTime()) / msPerDay
  );

  if (daysRemaining < 0) {
    return {
      date: deadline,
      status: "passed",
      daysRemaining: null,
      label: "Passed",
    };
  }

  if (daysRemaining === 0) {
    return { date: deadline, status: "red", daysRemaining: 0, label: "Today" };
  }

  if (daysRemaining <= 3) {
    return {
      date: deadline,
      status: "red",
      daysRemaining,
      label: `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left`,
    };
  }

  if (daysRemaining <= 14) {
    return {
      date: deadline,
      status: "yellow",
      daysRemaining,
      label: `${daysRemaining} days left`,
    };
  }

  return {
    date: deadline,
    status: "green",
    daysRemaining,
    label: `${daysRemaining} days left`,
  };
}

export function formatDate(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
