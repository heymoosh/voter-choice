"use client";

import React, { useState } from "react";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";

/* ──────────────────────────────────────────────────────────────
 * PrivacyCallout — three-paragraph privacy promise.
 *
 * variant="inline"  → full three-paragraph layout. Used inside
 *                     the polis visualization. Subpoena paragraph
 *                     gets a distinct border/accent treatment.
 * variant="compact" → headline + collapsible expand. Used in
 *                     tab-close banner and brief references.
 * ────────────────────────────────────────────────────────────── */

export interface PrivacyCalloutProps {
  variant?: "inline" | "compact";
}

/* ── Lock icon (inline SVG — no external dependency) ─────────── */

function LockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0 mt-0.5"
    >
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
    </svg>
  );
}

/* ── Inline variant (full three-paragraph) ──────────────────── */

function InlinePrivacyCallout({
  t,
}: {
  t: (typeof translations)["en"]["research"];
}) {
  return (
    <aside
      aria-label="Privacy promise"
      className="mt-4 border border-outline-variant/30 bg-surface-lowest rounded-sm px-4 py-3 space-y-3"
    >
      {/* Header row */}
      <div className="flex items-start gap-2 text-on-surface-muted">
        <LockIcon />
        <div className="space-y-3 flex-1">
          {/* P1 — no accounts, no tracking */}
          <p
            data-testid="privacy-callout-p1"
            className="text-xs text-on-surface leading-relaxed"
          >
            {t.privacyCalloutP1}
          </p>

          {/* P2 — only counts */}
          <p
            data-testid="privacy-callout-p2"
            className="text-xs text-on-surface leading-relaxed"
          >
            {t.privacyCalloutP2}
          </p>

          {/* P3 — subpoena anchor: distinct border + heavier type */}
          <p
            data-testid="privacy-callout-p3"
            role="note"
            aria-label="Legal guarantee: subpoena cannot compel non-existent records"
            className="text-xs font-semibold text-on-surface leading-relaxed border-l-2 border-primary pl-3 py-0.5"
          >
            <strong>{t.privacyCalloutP3}</strong>
          </p>
        </div>
      </div>
    </aside>
  );
}

/* ── Compact variant (headline + expandable) ────────────────── */

function CompactPrivacyCallout({
  t,
}: {
  t: (typeof translations)["en"]["research"];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside aria-label="Privacy promise" className="flex flex-col gap-1.5">
      {/* Headline row */}
      <div className="flex items-center gap-2">
        <LockIcon />
        <p
          data-testid="privacy-callout-compact-headline"
          className="text-xs font-medium text-on-surface-muted leading-snug"
        >
          {t.privacyCalloutCompactHeadline}
        </p>
        <button
          type="button"
          data-testid="privacy-callout-expand-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="text-[10px] font-bold uppercase tracking-widest text-primary shrink-0 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        >
          {expanded
            ? t.privacyCalloutCompactCollapse
            : t.privacyCalloutCompactExpand}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div
          data-testid="privacy-callout-expanded"
          className="pl-6 space-y-2 border-l border-outline-variant/30"
        >
          <p className="text-xs text-on-surface leading-relaxed">
            {t.privacyCalloutP1}
          </p>
          <p className="text-xs text-on-surface leading-relaxed">
            {t.privacyCalloutP2}
          </p>
          <p
            data-testid="privacy-callout-p3"
            role="note"
            aria-label="Legal guarantee: subpoena cannot compel non-existent records"
            className="text-xs font-semibold text-on-surface leading-relaxed border-l-2 border-primary pl-3 py-0.5"
          >
            <strong>{t.privacyCalloutP3}</strong>
          </p>
        </div>
      )}
    </aside>
  );
}

/* ── Main export ─────────────────────────────────────────────── */

export function PrivacyCallout({ variant = "inline" }: PrivacyCalloutProps) {
  const { lang } = useLanguage();
  const t = translations[lang].research;

  if (variant === "compact") {
    return <CompactPrivacyCallout t={t} />;
  }

  return <InlinePrivacyCallout t={t} />;
}
