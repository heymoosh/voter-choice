"use client";

import { useTranslation } from "@/lib/i18n/I18nContext";
import type { Locale } from "@/lib/i18n/types";

const LANGUAGE_OPTIONS: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "zh", label: "中文" },
  { code: "ar", label: "العربية" },
];

export function LanguageToggle() {
  const { locale, setLocale } = useTranslation();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value as Locale;
    setLocale(newLocale);
  };

  const currentOption = LANGUAGE_OPTIONS.find((o) => o.code === locale);

  return (
    <div
      data-testid="language-toggle"
      className="fixed top-4 right-4 z-50"
      role="navigation"
      aria-label="Language selection"
    >
      {/* Accessible native select — invisible overlay on top of visual display */}
      <select
        value={locale}
        onChange={handleChange}
        aria-label="Select language"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        style={{ fontSize: "16px" /* Prevent iOS zoom on focus */ }}
      >
        {LANGUAGE_OPTIONS.map(({ code, label }) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>

      {/* Visual display (pointer-events-none so clicks pass through to select) */}
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus-within:outline focus-within:outline-2 focus-within:outline-blue-500 shadow-sm transition-colors select-none pointer-events-none"
        aria-hidden="true"
      >
        <span className="font-semibold text-blue-600">
          {currentOption?.label ?? "English"}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      {/* Testid anchors for Playwright: one span per language option */}
      <div className="sr-only" aria-hidden="true">
        {LANGUAGE_OPTIONS.map(({ code, label }) => (
          <span key={code} data-testid={`language-option-${code}`}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
