"use client";

import { useEffect, useRef } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { Language } from "@/lib/i18n/translations";

const LANGUAGE_OPTIONS: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "zh", label: "中文" },
  { code: "ar", label: "العربية" },
];

export function LanguageToggle() {
  const { language, t, setLanguage } = useLanguage();
  const announcerRef = useRef<HTMLSpanElement>(null);
  const prevLanguage = useRef(language);

  // Announce language change to screen readers
  useEffect(() => {
    if (prevLanguage.current !== language && announcerRef.current) {
      announcerRef.current.textContent = t.languageToggleAnnouncement;
      prevLanguage.current = language;
      // Clear announcement after a brief delay so it re-announces on next change
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
      <select
        aria-label="Select language"
        className="language-toggle"
        data-testid="language-toggle"
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
      >
        {LANGUAGE_OPTIONS.map(({ code, label }) => (
          <option
            key={code}
            value={code}
            data-testid={`language-option-${code}`}
          >
            {label}
          </option>
        ))}
      </select>
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
