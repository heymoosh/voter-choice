"use client";

import { useLanguage } from "../lib/i18n";

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  const targetLabel = lang === "en" ? "Español" : "English";
  const ariaLabel = lang === "en" ? "Switch to Spanish" : "Cambiar a inglés";

  return (
    <button
      data-testid="language-toggle"
      onClick={() => setLang(lang === "en" ? "es" : "en")}
      aria-label={ariaLabel}
      className="fixed top-4 right-4 z-50 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-400 shadow-sm transition-colors min-h-[44px] min-w-[44px]"
    >
      {targetLabel}
    </button>
  );
}
