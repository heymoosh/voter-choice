"use client";

import { useLanguage } from "@/lib/i18n";

export default function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();

  function handleToggle() {
    setLang(lang === "en" ? "es" : "en");
  }

  return (
    <>
      <button
        data-testid="language-toggle"
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggle();
          }
        }}
        aria-label={t("languageToggleLabel")}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[36px]"
      >
        <span aria-hidden="true">{lang === "en" ? "🌐" : "🌐"}</span>
        <span>{lang === "en" ? "Español" : "English"}</span>
      </button>
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
