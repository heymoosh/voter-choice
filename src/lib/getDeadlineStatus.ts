import type { DeadlineStatus } from "../types/election";

type StatusColor = DeadlineStatus["color"];

export function getDeadlineStatus(
  dateISO: string,
  todayISO?: string,
): DeadlineStatus {
  const today = todayISO ?? new Date().toISOString().split("T")[0];
  const deadlineMs = new Date(dateISO).getTime();
  const todayMs = new Date(today).getTime();
  const daysLeft = Math.round((deadlineMs - todayMs) / 86400000);

  let color: StatusColor;
  let label: string;

  if (daysLeft < 0) {
    color = "passed";
    label = "Passed";
  } else if (daysLeft === 0) {
    color = "red";
    label = "Today (last day)";
  } else if (daysLeft <= 3) {
    color = "red";
    label = `${daysLeft} days left`;
  } else if (daysLeft <= 14) {
    color = "yellow";
    label = `${daysLeft} days left`;
  } else {
    color = "green";
    label = `${daysLeft} days left`;
  }

  return { date: dateISO, daysLeft, label, color };
}
