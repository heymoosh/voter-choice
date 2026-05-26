"use client";

import { useLanguage } from "../lib/i18n";

interface LanguageToggleProps {
  /**
   * Visual variant for the toggle.
   *
   * - "floating" (default): fixed-position pill in the upper-right corner.
   *   Kept for back-compat with surfaces that don't host the prototype AppNav.
   * - "inline": flow-positioned pill matching the prototype `.app-nav .lang`
   *   styling — mono micro-label, rounded border, EN · ES copy. Used inside
   *   the prototype AppNav (PageContent).
   */
  variant?: "floating" | "inline";
}

export function LanguageToggle({ variant = "floating" }: LanguageToggleProps) {
  const { lang, setLang } = useLanguage();
  const isEnglish = lang === "en";

  function handleToggle() {
    setLang(isEnglish ? "es" : "en");
  }

  // The label adapts to variant: "EN · ES" mirrors the prototype's nav pill;
  // the legacy floating variant keeps the verbose "Español"/"English" label
  // so existing tests + bookmarks don't drift.
  const label =
    variant === "inline" ? "EN · ES" : isEnglish ? "Español" : "English";

  const className =
    variant === "inline"
      ? "font-mono text-[11px] uppercase tracking-[0.1em] px-3 py-[7px] border border-rule rounded-full text-ink-2 bg-transparent hover:text-ink hover:border-ink-2 transition-colors"
      : "fixed top-4 right-4 z-50 bg-surface-lowest text-on-surface rounded-sm px-3 py-1.5 text-sm font-medium hover:bg-surface-high focus:outline-none focus:ring-2 focus:ring-primary shadow-[0_4px_32px_rgba(27,28,27,0.04)]";

  return (
    <button
      data-testid="language-toggle"
      onClick={handleToggle}
      aria-label={isEnglish ? "Switch to Spanish" : "Cambiar a inglés"}
      className={className}
    >
      {label}
    </button>
  );
}
