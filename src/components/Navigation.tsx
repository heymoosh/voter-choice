"use client";

/**
 * Navigation.tsx
 *
 * Ported from prototype AppNavWithChrome (prototype-components-c.jsx lines 298-322),
 * which is the chrome-wrapped canonical form of AppNav (prototype-components.jsx
 * lines 22-69).
 *
 * Intended mount point: src/app/layout.tsx (or the outermost page-tree shell
 * that wraps all routes) as a global header strip above the workspace.
 * Per COMPONENT_MAP.md §2: "No behavior delta."
 *
 * Link row matches AppNavWithChrome (prototype-components-c.jsx:306-311)
 * exactly: How it works → About → Methodology → Privacy. The base AppNav's
 * "The record" link is NOT part of the production nav and is intentionally
 * absent here.
 *
 * NEEDS-KEY (nav.* section is absent from src/lib/translations.ts):
 *   nav.howItWorks  — EN "How it works"      / ES "Cómo funciona"
 *   nav.about       — EN "About"              / ES "Acerca de"
 *   nav.methodology — EN "Methodology"        / ES "Metodología"
 *   nav.privacy     — EN "Privacy"            / ES "Privacidad"
 *   nav.settings    — EN "Settings"           / ES "Ajustes"
 */

import { LanguageToggle } from "@/components/LanguageToggle";

// ---------------------------------------------------------------------------
// Page-name union — mirrors the prototype's nav.current values
// ---------------------------------------------------------------------------
export type NavPage =
  | "home"
  | "howitworks"
  | "therecord"
  | "about"
  | "methodology"
  | "privacy"
  | "app";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface NavigationProps {
  /** Currently active page — sets data-current on <nav>. */
  current?: NavPage;
  /** Called when the brand mark / wordmark is clicked. */
  onBrandClick?: () => void;
  /** Called when a nav link is clicked with the page name. */
  onNavigate?: (page: NavPage) => void;
  /** Called when the Settings cog is clicked. */
  onOpenSettings?: () => void;
}

// ---------------------------------------------------------------------------
// NEEDS-KEY placeholders
// Hardcoded EN/ES literals used until nav.* keys are added to translations.ts.
// Replace each with `translations[lang].nav.<key>` once the section exists.
// ---------------------------------------------------------------------------

// Placeholder helper — renders inline so TypeScript narrows to string.
function navLabel(en: string, _es: string): string {
  // Once nav keys ship, this can be: return translations[lang].nav[key]
  return en;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function Navigation({
  current,
  onBrandClick,
  onNavigate,
  onOpenSettings,
}: NavigationProps) {
  function handleNavLink(page: NavPage) {
    if (onNavigate) onNavigate(page);
  }

  function handleBrandKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (onBrandClick) onBrandClick();
    }
  }

  return (
    <nav
      className="flex items-center justify-between px-14 py-5 border-b border-rule-2 bg-paper"
      data-current={current ?? "app"}
      aria-label="Main"
    >
      {/* ---- Brand ---- */}
      <div
        className="flex items-center gap-[10px] font-serif font-semibold text-[19px] tracking-[-0.01em] text-ink cursor-pointer"
        onClick={onBrandClick}
        role="link"
        tabIndex={0}
        onKeyDown={handleBrandKeyDown}
        aria-label="Voter Choice home"
      >
        {/* "V" mark — 22×22 civic-colored square with rounded corners */}
        <span
          className="w-[22px] h-[22px] bg-civic grid place-items-center text-paper-2 rounded-[4px] font-serif font-semibold text-[14px]"
          aria-hidden="true"
        >
          V
        </span>
        <span>Voter Choice</span>
      </div>

      {/* ---- Nav links ---- */}
      {/* Hidden on mobile (prototype hides .links at ≤640px) */}
      <div className="hidden sm:flex gap-7 text-sm text-ink-2">
        <a
          className="hover:text-ink cursor-pointer"
          onClick={() => handleNavLink("howitworks")}
          role="link"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleNavLink("howitworks");
          }}
        >
          {/* NEEDS-KEY: nav.howItWorks — EN "How it works" / ES "Cómo funciona" */}
          How it works
        </a>
        <a
          className="hover:text-ink cursor-pointer"
          onClick={() => handleNavLink("about")}
          role="link"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleNavLink("about");
          }}
        >
          {/* NEEDS-KEY: nav.about — EN "About" / ES "Acerca de" */}
          About
        </a>
        <a
          className="hover:text-ink cursor-pointer"
          onClick={() => handleNavLink("methodology")}
          role="link"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleNavLink("methodology");
          }}
        >
          {/* NEEDS-KEY: nav.methodology — EN "Methodology" / ES "Metodología" */}
          Methodology
        </a>
        <a
          className="hover:text-ink cursor-pointer"
          onClick={() => handleNavLink("privacy")}
          role="link"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleNavLink("privacy");
          }}
        >
          {/* NEEDS-KEY: nav.privacy — EN "Privacy" / ES "Privacidad" */}
          Privacy
        </a>
      </div>

      {/* ---- Right-hand controls ---- */}
      {/* Hidden on mobile (prototype hides .lang at ≤640px) */}
      <div className="flex items-center gap-[10px]">
        {/* LanguageToggle inline variant matches .app-nav .lang pill */}
        <span className="hidden sm:inline-flex">
          <LanguageToggle variant="inline" />
        </span>

        {/* Settings cog — 34×34 icon-only circular button.
            Raw <button> used instead of ui/Button because the Button
            primitive's variants (primary/cta/ghost) don't produce the
            34px circular pill shape the prototype specifies. */}
        <button
          className="inline-grid place-items-center w-[34px] h-[34px] rounded-full border border-rule bg-transparent text-ink-2 cursor-pointer hover:text-ink hover:border-ink-2 transition-colors"
          onClick={onOpenSettings}
          aria-label={navLabel("Settings", "Ajustes")}
          title={navLabel("Settings", "Ajustes")}
        >
          {/* NEEDS-KEY: nav.settings — EN "Settings" / ES "Ajustes"
              (used for aria-label + title above) */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </nav>
  );
}

export default Navigation;
