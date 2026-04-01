"use client";

import { useLanguage } from "@/lib/i18n";

export function SkipLink() {
  const { t } = useLanguage();

  return (
    <a
      href="#main-content"
      className="absolute -top-10 left-0 z-50 rounded-br-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white focus:top-0"
    >
      {t.accessibility.skipToContent}
    </a>
  );
}
