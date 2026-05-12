"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { translations } from "./translations";
import type { Language, Translations } from "./translations";

const STORAGE_KEY = "lang";
const DEFAULT_LANGUAGE: Language = "en";

interface LanguageContextValue {
  language: Language;
  t: Translations;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANGUAGE,
  t: translations[DEFAULT_LANGUAGE],
  toggleLanguage: () => undefined,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);

  // Read persisted language from localStorage (SSR-safe: runs only on client)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "es") {
        setLanguage(stored);
      }
    } catch {
      // localStorage unavailable (e.g., private browsing mode)
    }
  }, []);

  // Update <html lang> attribute when language changes
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const toggleLanguage = useCallback(() => {
    setLanguage((current) => {
      const next: Language = current === "en" ? "es" : "en";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // localStorage unavailable
      }
      return next;
    });
  }, []);

  return (
    <LanguageContext.Provider
      value={{ language, t: translations[language], toggleLanguage }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
