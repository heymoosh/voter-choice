"use client";

import { useLanguage } from "@/lib/i18n";
import type { Language } from "@/lib/translations";

const LANGUAGE_OPTIONS: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "zh", label: "中文" },
  { code: "ar", label: "العربية" },
];

export default function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setLang(e.target.value as Language);
  }

  return (
    <>
      <label htmlFor="language-selector" className="sr-only">
        {t("languageToggleLabel")}
      </label>
      <select
        id="language-selector"
        data-testid="language-toggle"
        value={lang}
        onChange={handleChange}
        className="px-2 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[36px] cursor-pointer"
        aria-label={t("languageToggleLabel")}
      >
        {LANGUAGE_OPTIONS.map(({ code, label }) => (
          <option
            key={code}
            value={code}
            data-testid={`language-option-${code}`}
          >
            {label}
          </option>
        ))}
      </select>
      {/* Screen reader announcement region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {t("languageToggleAnnouncement")}
      </div>
    </>
  );
}
