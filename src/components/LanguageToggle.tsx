"use client";

import { useTranslation } from "@/lib/i18n/I18nContext";
import type { Locale } from "@/lib/i18n/types";

export function LanguageToggle() {
  const { locale, setLocale, t } = useTranslation();

  const handleToggle = () => {
    const next: Locale = locale === "en" ? "es" : "en";
    setLocale(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToggle();
    }
  };

  const ariaLabel =
    locale === "en"
      ? t.languageToggle.switchToSpanish
      : t.languageToggle.switchToEnglish;

  return (
    <button
      data-testid="language-toggle"
      type="button"
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
      aria-pressed={locale === "es"}
      className="fixed top-4 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 focus:outline-2 focus:outline-blue-500 shadow-sm transition-colors"
    >
      <span
        className={
          locale === "en" ? "font-bold text-blue-600" : "text-gray-400"
        }
        aria-hidden="true"
      >
        EN
      </span>
      <span className="text-gray-300" aria-hidden="true">
        /
      </span>
      <span
        className={
          locale === "es" ? "font-bold text-blue-600" : "text-gray-400"
        }
        aria-hidden="true"
      >
        ES
      </span>
    </button>
  );
}
