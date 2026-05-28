"use client";

import React from "react";
import type { DeadlineStatus } from "../types/election";
import { useLanguage } from "@/lib/i18n";

/**
 * A DeadlineStatus row extended with a labelKey so callers can identify rows
 * (e.g. PollingStatusBar finds the election-day row by labelKey) and so the
 * meter can look up the translated label from the translations object.
 *
 * labelKey convention: use the prototype's `deadline.*` key names as opaque
 * identifiers even though those keys don't yet exist in translations.ts.
 * DeadlineMeter falls back to `row.label` (the computed English/ES string
 * from getDeadlineStatus) when the translation key is missing.
 *
 * Supported labelKeys (per COMPONENT_MAP §8):
 *   deadline.registerOnline | deadline.registerByMail | deadline.registerInPerson
 *   deadline.earlyVotingStarts | deadline.earlyVotingEnds | deadline.electionDay
 */
export type DeadlineMeterRow = DeadlineStatus & { labelKey: string };

interface DeadlineMeterProps {
  rows: DeadlineMeterRow[];
  /** true on the compact home strip; false in the workspace panel */
  compact?: boolean;
  /** stacked layout: badge drops below label/date (used inside PollingStatusBar) */
  stacked?: boolean;
}

// Color → Tailwind classes for the dot
const dotColor: Record<DeadlineStatus["color"], string> = {
  green: "bg-[oklch(0.62_0.13_145)]",
  yellow: "bg-[oklch(0.78_0.13_90)]",
  red: "bg-vote-red",
  passed: "bg-ink-3",
};

// Color → Tailwind classes for the status badge
const badgeColor: Record<DeadlineStatus["color"], string> = {
  green: "bg-[oklch(0.94_0.04_145)] text-[oklch(0.34_0.10_145)]",
  yellow: "bg-[oklch(0.95_0.05_90)] text-[oklch(0.40_0.10_90)]",
  red: "bg-[oklch(0.94_0.04_28)] text-[oklch(0.42_0.16_28)]",
  passed: "bg-tag-bg text-ink-3",
};

/**
 * Resolve a human-readable deadline row label.
 *
 * The `deadline.*` translation section does not yet exist in translations.ts
 * (NEEDS-KEY). Until it ships, we fall back to `row.label` which is produced
 * by getDeadlineStatus() and is already localised (EN/ES) via that helper.
 */
function resolveLabel(row: DeadlineMeterRow): string {
  return row.label;
}

function fmtDate(iso: string, lang: string): string {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === "es" ? "es-US" : "en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Render the days-left status string.
 * Reuses `row.label` from getDeadlineStatus (already handles passed/today/N days).
 */
function fmtStatus(row: DeadlineMeterRow, _lang: string): string {
  // row.label is already localized by getDeadlineStatus
  return row.label;
}

export function DeadlineMeter({
  rows,
  compact = false,
  stacked = false,
}: DeadlineMeterProps) {
  const { lang } = useLanguage();

  return (
    <ul
      className={[
        "list-none p-0 m-0",
        compact ? "flex flex-col gap-0" : "flex flex-col gap-0",
      ]
        .join(" ")
        .trim()}
      aria-label="Election deadlines"
    >
      {rows.map((row) => (
        <li
          key={row.labelKey}
          className="grid items-center gap-x-3 gap-y-1.5 px-3.5 py-3 bg-paper-2"
          style={
            stacked
              ? {
                  gridTemplateColumns: "14px 1fr",
                  gridTemplateRows: "auto auto",
                }
              : { gridTemplateColumns: "14px 1fr auto" }
          }
        >
          {/* Dot */}
          <div
            aria-hidden="true"
            className={`w-2.5 h-2.5 rounded-full ${dotColor[row.color]}`}
          />

          {/* Label + date */}
          <div className="min-w-0">
            <div className="text-[13.5px] font-medium text-ink leading-snug">
              {resolveLabel(row)}
            </div>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-3 mt-0.5">
              {fmtDate(row.date, lang)}
            </div>
          </div>

          {/* Status badge */}
          <div
            aria-label={fmtStatus(row, lang)}
            className={[
              "font-mono text-[11px] uppercase tracking-[0.08em]",
              "px-2 py-1 rounded-full whitespace-nowrap",
              stacked ? "col-start-2 justify-self-start" : "",
              badgeColor[row.color],
            ]
              .join(" ")
              .trim()}
          >
            {fmtStatus(row, lang)}
          </div>
        </li>
      ))}
    </ul>
  );
}
