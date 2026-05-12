"use client";

/**
 * Language context provider for the ballot research tool.
 * Wraps the app and provides the current language + toggle function.
 * Language preference is persisted in localStorage.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { type Language, getTranslations, type T } from "./translations";

// ---- Types -----------------------------------------------------------------

interface I18nContextValue {
  lang: Language;
  t: T;
  toggleLanguage: () => void;
}

// ---- Context ---------------------------------------------------------------

const I18nContext = createContext<I18nContextValue | null>(null);

// ---- Provider --------------------------------------------------------------

const STORAGE_KEY = "ballot-tool-language";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "es" || stored === "en") {
      setLang(stored);
    }
    setMounted(true);
  }, []);

  // Update document.documentElement.lang on language change
  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = lang;
    }
  }, [lang, mounted]);

  const toggleLanguage = useCallback(() => {
    setLang((prev) => {
      const next: Language = prev === "en" ? "es" : "en";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  // Use English during SSR to avoid hydration mismatch
  const activeLang: Language = mounted ? lang : "en";
  const t = getTranslations(activeLang);

  return (
    <I18nContext.Provider value={{ lang: activeLang, t, toggleLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}

// ---- Hook ------------------------------------------------------------------

export function useLanguage(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within an I18nProvider");
  }
  return ctx;
}
