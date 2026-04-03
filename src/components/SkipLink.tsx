"use client";

import { useLanguage } from "../lib/i18n";

export default function SkipLink() {
  const { t } = useLanguage();
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#1e3a5f] focus:text-white focus:rounded-lg"
    >
      {t("a11y.skipToContent")}
    </a>
  );
}
