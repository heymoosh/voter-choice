"use client";

import { useState } from "react";
import { useLanguage } from "../lib/i18n";
import { getTranslation } from "../lib/translations";

export default function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();
  const [announcement, setAnnouncement] = useState("");

  function handleToggle() {
    const newLang = lang === "en" ? "es" : "en";
    setLang(newLang);
    // Announcement in the new language (after the switch)
    const key =
      newLang === "es" ? "a11y.langChangedToEs" : "a11y.langChangedToEn";
    setAnnouncement(getTranslation(newLang, key));
  }

  // aria-label describes the action (what will happen), in current language
  const ariaLabel =
    lang === "en" ? t("a11y.langToggleToEs") : t("a11y.langToggleToEn");

  // Visible label: shows the non-active language
  const label = lang === "en" ? "Español" : "English";

  return (
    <>
      <button
        data-testid="language-toggle"
        onClick={handleToggle}
        aria-label={ariaLabel}
        className="fixed top-4 right-4 z-50 text-sm text-gray-600 hover:text-gray-900 hover:underline focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded px-2 py-1"
      >
        {label}
      </button>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </>
  );
}
