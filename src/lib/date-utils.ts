import type { DeadlineStatus } from "./types";

export function daysUntil(deadline: string, today: Date = new Date()): number {
  const deadlineDate = new Date(deadline + "T00:00:00");
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const diffMs = deadlineDate.getTime() - todayMidnight.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function getDeadlineStatus(
  deadline: string | null,
  today: Date = new Date(),
): DeadlineStatus {
  if (!deadline) return "passed";
  const days = daysUntil(deadline, today);
  if (days < 0) return "passed";
  if (days <= 3) return "urgent";
  if (days <= 14) return "warning";
  return "safe";
}

export function formatDate(isoDate: string, lang: "en" | "es" = "en"): string {
  const date = new Date(isoDate + "T00:00:00");
  const locale = lang === "es" ? "es-MX" : "en-US";
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getDeadlineLabel(
  deadline: string | null,
  today: Date = new Date(),
  lang: "en" | "es" = "en",
): string {
  if (!deadline) return lang === "es" ? "No disponible" : "Not available";
  const days = daysUntil(deadline, today);
  if (days < 0) return lang === "es" ? "Plazo pasado" : "Passed";
  if (days === 0) return lang === "es" ? "¡Hoy!" : "Today!";
  if (days === 1) return lang === "es" ? "Queda 1 día" : "Tomorrow!";
  return lang === "es" ? `Quedan ${days} días` : `${days} days left`;
}
