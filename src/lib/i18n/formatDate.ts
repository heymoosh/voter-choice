import type { Locale } from "./types";

const LOCALE_MAP: Record<Locale, string> = {
  en: "en-US",
  es: "es-MX",
};

/**
 * Format a YYYY-MM-DD date string according to the given locale.
 * English: "March 3, 2026"
 * Spanish: "3 de marzo de 2026"
 */
export function formatDateLocale(
  isoDate: string | null | undefined,
  locale: Locale,
): string {
  if (!isoDate) return "";

  try {
    // Parse as UTC date to avoid timezone shifts
    const [year, month, day] = isoDate.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return new Intl.DateTimeFormat(LOCALE_MAP[locale], {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(date);
  } catch {
    return isoDate;
  }
}
