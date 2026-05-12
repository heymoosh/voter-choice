"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Locale, Translations } from "./types";
import { en } from "./en";
import { es } from "./es";
import { vi } from "./vi";
import { zh } from "./zh";
import { ar } from "./ar";

const STORAGE_KEY = "voter-choice-language";

const DICTIONARIES: Record<Locale, Translations> = { en, es, vi, zh, ar };

const VALID_LOCALES: Locale[] = ["en", "es", "vi", "zh", "ar"];

interface I18nContextValue {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  t: en,
  setLocale: () => undefined,
});

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && VALID_LOCALES.includes(stored as Locale)) {
        setLocaleState(stored as Locale);
      }
    } catch {
      // localStorage unavailable — stay with default "en"
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      // ignore storage errors
    }
  }, []);

  const value: I18nContextValue = {
    locale,
    t: DICTIONARIES[locale],
    setLocale,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  return useContext(I18nContext);
}
