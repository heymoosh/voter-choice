"use client";

import { useLanguage } from "../lib/i18n";

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  const isEnglish = lang === "en";

  function handleToggle() {
    setLang(isEnglish ? "es" : "en");
  }

  return (
    <button
      data-testid="language-toggle"
      onClick={handleToggle}
      aria-label={isEnglish ? "Switch to Spanish" : "Cambiar a inglés"}
      className="fixed top-4 right-4 z-50 bg-white border border-gray-300 rounded px-3 py-1.5 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
    >
      {isEnglish ? "Español" : "English"}
    </button>
  );
}
