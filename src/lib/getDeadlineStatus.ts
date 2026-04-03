import type { DeadlineStatus } from "../types/election";
import type { Language } from "./translations";

type StatusColor = DeadlineStatus["color"];

function computeColor(daysLeft: number): StatusColor {
  if (daysLeft < 0) return "passed";
  if (daysLeft <= 3) return "red";
  if (daysLeft <= 14) return "yellow";
  return "green";
}

function computeLabel(daysLeft: number, lang: Language): string {
  if (lang === "es") {
    if (daysLeft < 0) return "Pasado";
    if (daysLeft === 0) return "Hoy (último día)";
    return `Quedan ${daysLeft} días`;
  }
  if (daysLeft < 0) return "Passed";
  if (daysLeft === 0) return "Today (last day)";
  return `${daysLeft} days left`;
}

export function getDeadlineStatus(
  dateISO: string,
  todayISO?: string,
  lang: Language = "en",
): DeadlineStatus {
  const today = todayISO ?? new Date().toISOString().split("T")[0];
  const deadlineMs = new Date(dateISO).getTime();
  const todayMs = new Date(today).getTime();
  const daysLeft = Math.round((deadlineMs - todayMs) / 86400000);

  return {
    date: dateISO,
    daysLeft,
    label: computeLabel(daysLeft, lang),
    color: computeColor(daysLeft),
  };
}
