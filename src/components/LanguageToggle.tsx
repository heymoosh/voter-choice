"use client";

import { useLanguage } from "@/lib/i18n";

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  function handleToggle() {
    setLanguage(language === "en" ? "es" : "en");
  }

  return (
    <button
      type="button"
      data-testid="language-toggle"
      onClick={handleToggle}
      aria-label={t.accessibility.languageToggleLabel}
      className="fixed right-4 top-4 z-50 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-blue-400 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      {language === "en" ? "Espa\u00f1ol" : "English"}
    </button>
  );
}
