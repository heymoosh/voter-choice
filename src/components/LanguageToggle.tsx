"use client";

import { useLanguage } from "@/lib/i18n";
import type { Language } from "@/lib/i18n/translations";

const LANGUAGES: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "zh", label: "中文" },
  { code: "ar", label: "العربية" },
];

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const currentLabel =
    LANGUAGES.find((l) => l.code === language)?.label ?? "English";

  return (
    <div className="relative inline-block">
      {/* Screen reader live region — announces language change */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {currentLabel}
      </div>

      <div className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2">
        <span aria-hidden="true" className="text-sm">
          🌐
        </span>
        <select
          data-testid="language-toggle"
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          aria-label="Select language"
          className="appearance-none bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer pr-1"
        >
          {LANGUAGES.map(({ code, label }) => (
            <option
              key={code}
              value={code}
              data-testid={`language-option-${code}`}
            >
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
