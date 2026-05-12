import { DeadlineStatus } from "./types";
import type { Language } from "./translations";

/**
 * Calculate the number of days remaining until a deadline.
 * Negative values indicate the deadline has passed.
 */
export function getDaysRemaining(isoDate: string, today: Date): number {
  const deadline = new Date(isoDate + "T00:00:00");
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const diffMs = deadline.getTime() - todayMidnight.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get the visual status for a registration deadline.
 * - GREEN: > 14 days remaining
 * - YELLOW: 1-14 days remaining
 * - RED: 0-3 days remaining (≤3 days)
 * - PASSED: deadline has passed (negative days)
 */
export function getDeadlineStatus(
  isoDate: string | null,
  today: Date,
): DeadlineStatus {
  if (!isoDate) return DeadlineStatus.PASSED;
  const days = getDaysRemaining(isoDate, today);
  if (days < 0) return DeadlineStatus.PASSED;
  if (days <= 3) return DeadlineStatus.RED;
  if (days <= 14) return DeadlineStatus.YELLOW;
  return DeadlineStatus.GREEN;
}

/**
 * Format a relative deadline label for display.
 * Supports all 5 app languages.
 */
export function getDeadlineLabel(
  isoDate: string | null,
  today: Date,
  lang: Language = "en",
): string {
  if (!isoDate) {
    if (lang === "es") return "No disponible";
    if (lang === "vi") return "Không có sẵn";
    if (lang === "zh") return "不可用";
    if (lang === "ar") return "غير متاح";
    return "Not available";
  }
  const days = getDaysRemaining(isoDate, today);
  if (days < 0) {
    if (lang === "es") return "Vencido";
    if (lang === "vi") return "Đã qua";
    if (lang === "zh") return "已截止";
    if (lang === "ar") return "انتهى";
    return "Passed";
  }
  if (days === 0) {
    if (lang === "es") return "Hoy — Último día";
    if (lang === "vi") return "Hôm nay — Ngày cuối cùng";
    if (lang === "zh") return "今天 — 最后一天";
    if (lang === "ar") return "اليوم — آخر يوم";
    return "Today — Last Day";
  }
  if (days === 1) {
    if (lang === "es") return "Queda 1 día";
    if (lang === "vi") return "Còn 1 ngày";
    if (lang === "zh") return "还剩 1 天";
    if (lang === "ar") return "يوم واحد متبقٍّ";
    return "1 day left";
  }
  if (lang === "es") return `Quedan ${days} días`;
  if (lang === "vi") return `Còn ${days} ngày`;
  if (lang === "zh") return `还剩 ${days} 天`;
  if (lang === "ar") return `${days} أيام متبقية`;
  return `${days} days left`;
}

// Vietnamese month names (tháng = month)
const VI_MONTHS = [
  "tháng 1",
  "tháng 2",
  "tháng 3",
  "tháng 4",
  "tháng 5",
  "tháng 6",
  "tháng 7",
  "tháng 8",
  "tháng 9",
  "tháng 10",
  "tháng 11",
  "tháng 12",
];

// Arabic month names (MSA)
const AR_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

/**
 * Format an ISO date for display.
 * English: "March 3, 2026"
 * Spanish: "3 de marzo de 2026"
 * Vietnamese: "3 tháng 3, 2026"
 * Chinese: "2026年3月3日"
 * Arabic: "3 مارس 2026"
 */
export function formatDate(isoDate: string, lang: Language = "en"): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (lang === "vi") {
    return `${day} ${VI_MONTHS[month - 1]}, ${year}`;
  }
  if (lang === "zh") {
    return `${year}年${month}月${day}日`;
  }
  if (lang === "ar") {
    return `${day} ${AR_MONTHS[month - 1]} ${year}`;
  }

  const locale = lang === "es" ? "es-ES" : "en-US";
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Check if all registration deadlines have passed.
 */
export function allDeadlinesPassed(
  deadlines: (string | null)[],
  today: Date,
): boolean {
  const validDeadlines = deadlines.filter((d) => d !== null) as string[];
  if (validDeadlines.length === 0) return true;
  return validDeadlines.every((d) => getDaysRemaining(d, today) < 0);
}
