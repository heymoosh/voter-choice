"use client";

import { useEffect } from "react";
import { useTranslation } from "@/lib/i18n/I18nContext";

/**
 * Small client component that syncs document.documentElement.lang and dir
 * with the current i18n locale. Mounted inside layout so it always runs.
 * When Arabic is selected, sets dir="rtl"; all other locales use dir="ltr".
 */
export function HtmlLangUpdater() {
  const { locale } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  return null;
}
