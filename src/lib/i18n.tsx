"use client";

/**
 * Language context provider for the ballot research tool.
 * Wraps the app and provides the current language + toggle/set functions.
 * Language preference is persisted in localStorage.
 *
 * Phase 4: expanded from 2 languages (en, es) to 5 (en, es, vi, zh, ar).
 * The toggleLanguage function cycles through: en → es → vi → zh → ar → en
 * This preserves backward compatibility with e2e tests that use a single click.
 * Direct selection via setLanguage is also available for the language selector UI.
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
  setLanguage: (lang: Language) => void;
}

// ---- Context ---------------------------------------------------------------

const I18nContext = createContext<I18nContextValue | null>(null);

// ---- Supported language codes -----------------------------------------------

const ALL_LANG_CODES = new Set<string>(["en", "es", "vi", "zh", "ar"]);

// ---- Provider --------------------------------------------------------------

const STORAGE_KEY = "ballot-tool-language";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ALL_LANG_CODES.has(stored)) {
      setLangState(stored as Language);
    }
    setMounted(true);
  }, []);

  // Update document.documentElement.lang and dir on language change
  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    }
  }, [lang, mounted]);

  const setLanguage = useCallback((next: Language) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  /**
   * Toggle cycles between "en" and "es" for backward compatibility with
   * Phase 2 e2e tests. Vietnamese, Chinese, and Arabic are accessible only
   * via the dropdown (setLanguage). When any non-en/es language is active,
   * toggling reverts to "en".
   */
  const toggleLanguage = useCallback(() => {
    setLangState((prev) => {
      const next: Language = prev === "en" ? "es" : "en";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  // Use English during SSR to avoid hydration mismatch
  const activeLang: Language = mounted ? lang : "en";
  const t = getTranslations(activeLang);

  return (
    <I18nContext.Provider
      value={{ lang: activeLang, t, toggleLanguage, setLanguage }}
    >
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
