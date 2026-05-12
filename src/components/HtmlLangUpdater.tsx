"use client";

import { useEffect } from "react";
import { useTranslation } from "@/lib/i18n/I18nContext";

/**
 * Small client component that syncs document.documentElement.lang
 * with the current i18n locale. Mounted inside layout so it always runs.
 */
export function HtmlLangUpdater() {
  const { locale } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
