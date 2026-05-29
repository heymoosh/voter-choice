"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n";
import { translations } from "@/lib/translations";

interface SavedSession {
  issues?: unknown[];
  decisions?: Record<string, unknown>;
  address?: string;
}

interface ResumeNudgeProps {
  saved: SavedSession;
  totalRaces: number;
  onResume: () => void;
  onStartOver: () => void;
}

/**
 * ResumeNudge
 *
 * Appears below the address card on the home page when localStorage has a
 * prior draft (decided races > 0 OR issues selected).  Returns null when
 * there is no meaningful session to resume.
 *
 * Intended mount point: src/app/page.tsx — inline section below the address
 * card, above HowItWorksWalkthrough.  No new file required per COMPONENT_MAP §2.
 *
 * Copy is fully wired to translations: landing.returningSubtext is the
 * function-valued form `(decided, total) => string` matching the prototype's
 * "You have a draft ballot saved on this device — {decided} of {total} races
 * decided. Resume now, or start fresh." sentence; returningResume renders
 * "Resume my session →" and returningStartOver "Start over".
 */
export function ResumeNudge({
  saved,
  totalRaces,
  onResume,
  onStartOver,
}: ResumeNudgeProps) {
  const { lang } = useLanguage();
  const t = translations[lang];

  const decided = Object.keys(saved.decisions ?? {}).length;
  const hasDraft = decided > 0 || (saved.issues ?? []).length > 0;
  if (!hasDraft) return null;

  return (
    <aside
      className={[
        "mt-[22px] max-w-[560px]",
        "px-5 pt-[18px] pb-5",
        "border border-civic-soft rounded-[10px]",
        "bg-gradient-to-b from-[oklch(0.97_0.018_170)] to-paper-2",
        // shadow-soft via CSS var — no Tailwind token, use inline style below
      ].join(" ")}
      style={{
        boxShadow:
          "0 1px 0 oklch(0.92 0.012 85), 0 10px 30px -20px oklch(0.18 0.018 240 / 0.12)",
      }}
      role="region"
      aria-label={lang === "es" ? "Retomar sesión" : "Resume your session"}
    >
      {/* Badge */}
      <div className="inline-block font-mono text-[10.5px] uppercase tracking-[0.14em] text-civic mb-2">
        {t.landing.returningBadge}
      </div>

      {/* Headline */}
      <h3 className="font-serif font-semibold text-[22px] tracking-[-0.015em] text-ink m-0 mb-2">
        {t.landing.returningHeadline}
      </h3>

      {/* Subtext — full prototype sentence via the interpolated key. */}
      <p className="m-0 mb-3.5 text-[14px] leading-[1.55] text-ink-2">
        {t.landing.returningSubtext(decided, totalRaces)}
      </p>

      {/* Actions */}
      <div className="flex gap-2.5 flex-wrap">
        <button
          type="button"
          className="bg-civic text-paper-2 border-0 rounded-lg px-[18px] py-[11px] font-semibold text-[14px] cursor-pointer hover:bg-civic-2 transition-colors min-h-[44px]"
          onClick={onResume}
        >
          {t.landing.returningResume}
        </button>
        <button
          type="button"
          className="bg-transparent border border-rule rounded-lg px-4 py-[11px] text-[13.5px] text-ink-2 cursor-pointer hover:border-ink-2 hover:text-ink transition-colors min-h-[44px]"
          onClick={onStartOver}
        >
          {t.landing.returningStartOver}
        </button>
      </div>
    </aside>
  );
}
