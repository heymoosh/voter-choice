import type { DeadlineStatus } from "../types/election";
import { translations, type Language } from "./translations";
import { getTodayInLatestUsZone } from "./electionToday";

type StatusColor = DeadlineStatus["color"];

function computeColor(daysLeft: number): StatusColor {
  if (daysLeft < 0) return "passed";
  if (daysLeft <= 3) return "red";
  if (daysLeft <= 14) return "yellow";
  return "green";
}

function computeLabel(daysLeft: number, lang: Language): string {
  const t = translations[lang].deadline;
  if (daysLeft < 0) return t.passed;
  if (daysLeft === 0) return t.today;
  return t.daysLeft(daysLeft);
}

export function getDeadlineStatus(
  dateISO: string,
  todayISO?: string,
  lang: Language = "en",
): DeadlineStatus {
  const today = todayISO ?? getTodayInLatestUsZone();
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
