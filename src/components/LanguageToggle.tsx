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
      className="fixed top-4 right-4 z-50 bg-surface-lowest text-on-surface rounded-sm px-3 py-1.5 text-sm font-medium hover:bg-surface-high focus:outline-none focus:ring-2 focus:ring-primary shadow-[0_4px_32px_rgba(27,28,27,0.04)]"
    >
      {isEnglish ? "Español" : "English"}
    </button>
  );
}
