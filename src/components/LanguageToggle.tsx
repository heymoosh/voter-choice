"use client";

import { useLanguage } from "@/lib/i18n";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const isEs = language === "es";

  function handleToggle() {
    setLanguage(isEs ? "en" : "es");
  }

  return (
    <>
      {/* Screen reader live region — announces language change */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {isEs ? "Idioma cambiado a español" : "Language changed to English"}
      </div>

      <button
        data-testid="language-toggle"
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggle();
          }
        }}
        aria-label={isEs ? "Switch to English" : "Cambiar a Español"}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors min-h-[36px]"
      >
        <span aria-hidden="true">🌐</span>
        <span>{isEs ? "English" : "Español"}</span>
      </button>
    </>
  );
}
