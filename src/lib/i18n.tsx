"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  Language,
  Translations,
  getTranslation,
  interpolate,
} from "./translations";

const STORAGE_KEY = "voter-choice-lang";
const DEFAULT_LANG: Language = "en";
const VALID_LANGS: Language[] = ["en", "es", "vi", "zh", "ar"];

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: keyof Translations, values?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key) => getTranslation(DEFAULT_LANG, key),
});

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  // Start with default lang to avoid SSR hydration mismatch
  const [lang, setLangState] = useState<Language>(DEFAULT_LANG);
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (stored && VALID_LANGS.includes(stored)) {
      setLangState(stored);
    }
    setMounted(true);
  }, []);

  // Update html lang attribute, dir attribute (RTL for Arabic), and localStorage on language change
  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
      localStorage.setItem(STORAGE_KEY, lang);
    }
  }, [lang, mounted]);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
  }, []);

  const t = useCallback(
    (key: keyof Translations, values?: Record<string, string>): string => {
      const raw = getTranslation(lang, key);
      return values ? interpolate(raw, values) : raw;
    },
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
