"use client";

import { useEffect, useRef } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export function LanguageToggle() {
  const { language, t, toggleLanguage } = useLanguage();
  const announcerRef = useRef<HTMLSpanElement>(null);
  const prevLanguage = useRef(language);

  // Announce language change to screen readers
  useEffect(() => {
    if (prevLanguage.current !== language && announcerRef.current) {
      announcerRef.current.textContent = t.languageToggleAnnouncement;
      prevLanguage.current = language;
      // Clear announcement after a brief delay so it re-announces on next toggle
      const timeout = setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = "";
        }
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [language, t.languageToggleAnnouncement]);

  return (
    <>
      <button
        aria-label={`Switch to ${t.languageToggleLabel}`}
        className="language-toggle"
        data-testid="language-toggle"
        onClick={toggleLanguage}
        type="button"
      >
        {t.languageToggleLabel}
      </button>
      {/* Live region for screen reader announcements */}
      <span
        ref={announcerRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  );
}
