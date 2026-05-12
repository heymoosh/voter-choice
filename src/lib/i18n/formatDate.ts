import type { Locale } from "./types";

/**
 * Format a YYYY-MM-DD date string according to the given locale.
 * English:    "March 3, 2026"
 * Spanish:    "3 de marzo de 2026"
 * Vietnamese: "3 tháng 3, 2026"
 * Chinese:    "2026年3月3日"
 * Arabic:     "3 مارس 2026"
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

    if (locale === "zh") {
      // Chinese: 2026年3月3日
      const y = date.getUTCFullYear();
      const m = date.getUTCMonth() + 1;
      const d = date.getUTCDate();
      return `${y}年${m}月${d}日`;
    }

    if (locale === "ar") {
      // Arabic: "3 مارس 2026" — use ar-SA with numerals in ASCII (nu=latn)
      return new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      }).format(date);
    }

    const bcp47: Record<Locale, string> = {
      en: "en-US",
      es: "es-MX",
      vi: "vi-VN",
      zh: "zh-CN", // handled above, but included for completeness
      ar: "ar-SA", // handled above, but included for completeness
    };

    return new Intl.DateTimeFormat(bcp47[locale], {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(date);
  } catch {
    return isoDate;
  }
}
