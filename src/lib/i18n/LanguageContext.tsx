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
const RTL_LANGUAGES: Language[] = ["ar"];

const ALL_LANGUAGES: Language[] = ["en", "es", "vi", "zh", "ar"];

function isValidLanguage(value: string): value is Language {
  return ALL_LANGUAGES.includes(value as Language);
}

interface LanguageContextValue {
  language: Language;
  t: Translations;
  setLanguage: (lang: Language) => void;
  /** @deprecated Use setLanguage instead */
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANGUAGE,
  t: translations[DEFAULT_LANGUAGE],
  setLanguage: () => undefined,
  toggleLanguage: () => undefined,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  // Read persisted language from localStorage (SSR-safe: runs only on client)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isValidLanguage(stored)) {
        setLanguageState(stored);
      }
    } catch {
      // localStorage unavailable (e.g., private browsing mode)
    }
  }, []);

  // Update <html lang> and <html dir> attributes when language changes
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = RTL_LANGUAGES.includes(language)
      ? "rtl"
      : "ltr";
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Legacy toggle for backward compatibility (en ↔ es)
  const toggleLanguage = useCallback(() => {
    setLanguage(language === "en" ? "es" : "en");
  }, [language, setLanguage]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        t: translations[language],
        setLanguage,
        toggleLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
