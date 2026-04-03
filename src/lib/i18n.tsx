"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getTranslation } from "./translations";

export type Lang = "en" | "es";

export const LANGUAGE_STORAGE_KEY = "voter-choice-lang";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const defaultContext: LanguageContextValue = {
  lang: "en",
  setLang: () => undefined,
  t: (key: string) => getTranslation("en", key),
};

export const LanguageContext =
  createContext<LanguageContextValue>(defaultContext);

export function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Always initialize to 'en' — NEVER read localStorage here.
  // Server renders 'en'. Client hydrates to 'en' (no mismatch). useEffect then syncs.
  const [lang, setLangState] = useState<Lang>("en");

  // After hydration: read stored preference and apply it
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Lang | null;
      if (stored === "en" || stored === "es") {
        setLangState(stored);
      }
    } catch {
      // localStorage unavailable (private browsing, full storage) — stay on 'en'
    }
  }, []);

  // Sync document lang attribute and persist to localStorage on every lang change
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // localStorage unavailable — continue without persistence
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = useCallback((key: string) => getTranslation(lang, key), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
