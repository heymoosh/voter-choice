"use client";

import { useLanguage } from "@/lib/language-context";

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  const next = language === "en" ? "es" : "en";

  return (
    <button
      data-testid="language-toggle"
      onClick={() => setLanguage(next)}
      className="text-sm text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
      aria-label={`Switch to ${next === "es" ? "Spanish" : "English"}`}
    >
      {t.languageToggle.label}
    </button>
  );
}
