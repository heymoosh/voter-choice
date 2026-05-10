"use client";

import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/translations";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === "en" ? "es" : "en")}
      data-testid="language-toggle"
      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
      aria-label={`Switch to ${language === "en" ? "Spanish" : "English"}`}
    >
      {t("lang.toggle", language)}
    </button>
  );
}
