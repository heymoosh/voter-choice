"use client";

/*
 * PollingInfoCard
 *
 * Workspace card that surfaces a voter's polling place, precinct, hours,
 * ID requirements, and deadline countdowns. Previously this data only appeared
 * on the print sheet; this component brings it into the workspace sidebar/rail.
 *
 * Composes the already-built DeadlineMeter component rather than reimplementing
 * date logic.
 *
 * Prop contract:
 *   pollingInfo: PollingInfoCardLocation
 *     name:        string  – polling place name
 *     address:     string  – full street address
 *     precinct?:   string  – precinct number/name
 *     hours:       string  – e.g. "7 AM – 7 PM"
 *     bring?:      string  – override for "what to bring" (falls back to stateData.votingRules.acceptedIds)
 *     earlyWindow?: string – pre-formatted early voting window string; falls back to stateData.earlyVoting
 *
 *   stateData: StateElectionData
 *     Provides pollingPlaceLookup URL, registrationCheckUrl, acceptedIds, earlyVoting,
 *     and election date for the ICS export.
 *
 *   rows: DeadlineMeterRow[]
 *     Built by the caller via getDeadlineStatus + a labelKey tag.
 *     Convention matches DeadlineMeter / PollingStatusBar.
 *
 *   compact?: boolean  (default false)
 *     When true, the body is collapsible (shows a toggle button in the header).
 *     When false (default), the card is always expanded.
 *
 * NEEDS-KEY: polling.cardTitle      — EN "Your Polling Place" / ES "Tu Lugar de Votación"
 * NEEDS-KEY: polling.precinct       — EN "Precinct" / ES "Precinto"
 * NEEDS-KEY: polling.bring          — EN "What to Bring" / ES "Qué Llevar"
 * NEEDS-KEY: polling.earlyVotingWindow — EN "Early Voting" / ES "Votación Anticipada"
 * NEEDS-KEY: polling.directions     — EN "Directions →" / ES "Cómo llegar →"
 * NEEDS-KEY: polling.addedToCalendar — EN "Add to Calendar ↓" / ES "Agregar al Calendario ↓"
 * NEEDS-KEY: polling.cardSource     — EN "Source: Google Civic · State election office" / ES "Fuente: Google Civic · Oficina electoral estatal"
 * NEEDS-KEY: deadline.checkRegistration — EN "Check Registration" / ES "Verificar Registro"
 */

import React, { useState } from "react";
import type { StateElectionData } from "@/types/election";
import { useLanguage } from "@/lib/i18n";
import { translations } from "@/lib/translations";
import {
  DeadlineMeter,
  type DeadlineMeterRow,
} from "@/components/DeadlineMeter";

export interface PollingInfoCardLocation {
  /** Polling place display name */
  name: string;
  /** Full street address */
  address: string;
  /** Precinct number or name (optional) */
  precinct?: string;
  /** Polling hours, e.g. "7 AM – 7 PM" */
  hours: string;
  /** Override "what to bring" label (falls back to acceptedIds from stateData) */
  bring?: string;
  /** Pre-formatted early voting window string (falls back to stateData.earlyVoting) */
  earlyWindow?: string;
  /** Optional notes shown below the address */
  notes?: string;
}

export interface PollingInfoCardProps {
  pollingInfo: PollingInfoCardLocation;
  stateData: StateElectionData;
  /** DeadlineMeterRows built by the caller via getDeadlineStatus + a labelKey tag. */
  rows: DeadlineMeterRow[];
  /**
   * When true the body is collapsible — a toggle button appears in the header.
   * Default: false (always expanded, matching prototype default).
   */
  compact?: boolean;
}

// ── Calendar export ───────────────────────────────────────────────────────────
function downloadIcsForElection(
  stateData: StateElectionData,
  pollingInfo: PollingInfoCardLocation,
): void {
  const el = stateData.elections[0];
  if (!el) return;
  const date = el.date.replace(/-/g, "");
  const acceptedId = stateData.votingRules.acceptedIds?.[0] ?? "photo ID";
  const placeLine =
    pollingInfo.name && pollingInfo.address
      ? `Polling place: ${pollingInfo.name} — ${pollingInfo.address}`
      : pollingInfo.address
        ? `Polling place: ${pollingInfo.address}`
        : "";
  const description = [
    placeLine,
    pollingInfo.hours ? `Hours: ${pollingInfo.hours}` : "",
    `Bring: ${acceptedId}`,
    "",
    "Drafted on Voter Choice.",
  ]
    .filter(Boolean)
    .join("\\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Voter Choice//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:vc-${el.id}@voterchoice.app`,
    `DTSTAMP:${date}T120000Z`,
    `DTSTART;VALUE=DATE:${date}`,
    `SUMMARY:Vote — ${el.name}`,
    pollingInfo.address ? `LOCATION:${pollingInfo.address}` : "",
    `DESCRIPTION:${description}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-PT12H",
    "DESCRIPTION:Election Day tomorrow — bring your ID",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "election-day.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PollingInfoCard({
  pollingInfo,
  stateData,
  rows,
  compact = false,
}: PollingInfoCardProps) {
  const { lang } = useLanguage();
  const t = translations[lang];

  // Default to expanded per prototype: "the card is useful immediately"
  const [expanded, setExpanded] = useState(true);

  // Early voting window: prefer the pre-formatted prop, fall back to stateData
  let earlyWindowText: string;
  if (pollingInfo.earlyWindow !== undefined) {
    earlyWindowText = pollingInfo.earlyWindow;
  } else {
    const ev = stateData.earlyVoting;
    if (ev.available && ev.startDate && ev.endDate) {
      const locale = lang === "es" ? "es-US" : "en-US";
      const opts: Intl.DateTimeFormatOptions = {
        month: "short",
        day: "numeric",
      };
      const start = new Date(ev.startDate + "T00:00:00").toLocaleDateString(
        locale,
        opts,
      );
      const end = new Date(ev.endDate + "T00:00:00").toLocaleDateString(
        locale,
        opts,
      );
      earlyWindowText = `${start} – ${end}`;
    } else {
      earlyWindowText = lang === "es" ? "No disponible" : "Not available";
    }
  }

  // "What to bring": prefer the prop, fall back to acceptedIds list
  const bringText =
    pollingInfo.bring ??
    (stateData.votingRules.acceptedIds?.length
      ? stateData.votingRules.acceptedIds.join(", ")
      : lang === "es"
        ? "Consulta el sitio de tu estado"
        : "Check your state's election website");

  return (
    <section
      className="rounded-lg border border-rule bg-paper overflow-hidden"
      aria-labelledby="poll-card-ttl"
    >
      {/* Header */}
      <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-0">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1">
            {/* NEEDS-KEY: polling.cardTitle */}
            {lang === "es" ? "Tu Lugar de Votación" : "Your Polling Place"}
          </div>
          <h3
            id="poll-card-ttl"
            className="font-serif text-[1.1rem] font-semibold leading-snug text-ink"
          >
            {pollingInfo.name}
          </h3>
        </div>
        {compact && (
          <button
            type="button"
            className="flex-none mt-0.5 flex h-8 w-8 items-center justify-center rounded-md text-[13px] text-ink-3 hover:bg-paper-2 hover:text-ink transition-colors"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            aria-controls="poll-card-body"
          >
            {expanded ? "▴" : "▾"}
          </button>
        )}
      </header>

      {/* Body */}
      {expanded && (
        <div id="poll-card-body">
          {/* Grid: 5 cells matching prototype order — Precinct / Hours / Address(wide) / Bring / EarlyVotingWindow */}
          <div className="grid grid-cols-2 gap-px bg-rule-2 border-t border-rule-2 mt-4 overflow-hidden">
            {/* 1. Precinct */}
            <div className="bg-paper-2 px-4 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1">
                {/* NEEDS-KEY: polling.precinct */}
                {lang === "es" ? "Precinto" : "Precinct"}
              </div>
              <div className="text-[13.5px] leading-snug text-ink">
                {pollingInfo.precinct ??
                  (lang === "es" ? "Ver registro" : "See registration")}
              </div>
            </div>

            {/* 2. Hours */}
            <div className="bg-paper-2 px-4 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1">
                {t.polling.hours}
              </div>
              <div className="text-[13.5px] leading-snug text-ink">
                {pollingInfo.hours}
              </div>
            </div>

            {/* 3. Address — full width */}
            <div className="col-span-2 bg-paper-2 px-4 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1">
                Address
              </div>
              <div className="text-[13.5px] leading-snug text-ink">
                {pollingInfo.address}
              </div>
              {pollingInfo.notes && (
                <div className="text-[12px] text-ink-3 mt-1 leading-snug">
                  {pollingInfo.notes}
                </div>
              )}
            </div>

            {/* 4. What to bring */}
            <div className="bg-paper-2 px-4 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1">
                {/* NEEDS-KEY: polling.bring */}
                {lang === "es" ? "Qué Llevar" : "What to Bring"}
              </div>
              <div className="text-[13.5px] leading-snug text-ink">
                {bringText}
              </div>
            </div>

            {/* 5. Early voting window */}
            <div className="bg-paper-2 px-4 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1">
                {/* NEEDS-KEY: polling.earlyVotingWindow */}
                {lang === "es" ? "Votación Anticipada" : "Early Voting"}
              </div>
              <div className="text-[13.5px] leading-snug text-ink">
                {earlyWindowText}
              </div>
            </div>
          </div>

          {/* DeadlineMeter */}
          <div className="border-t border-rule-2">
            <DeadlineMeter rows={rows} compact={false} stacked={true} />
          </div>

          {/* Action links */}
          <div className="flex flex-wrap gap-2 px-5 py-4 border-t border-rule-2">
            <a
              href={stateData.resources.pollingPlaceLookup}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded border border-rule bg-paper px-3 py-1.5 text-[13px] text-ink-2 hover:border-civic hover:text-civic hover:bg-[oklch(0.97_0.018_170)] transition-colors min-h-[36px]"
            >
              {t.polling.directions} →
            </a>

            <a
              href={stateData.registration.registrationCheckUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded border border-rule bg-paper px-3 py-1.5 text-[13px] text-ink-2 hover:border-civic hover:text-civic hover:bg-[oklch(0.97_0.018_170)] transition-colors min-h-[36px]"
            >
              {/* NEEDS-KEY: deadline.checkRegistration */}
              {t.research.checkRegistration}
            </a>

            <button
              type="button"
              onClick={() => downloadIcsForElection(stateData, pollingInfo)}
              className="inline-flex items-center gap-1.5 rounded border border-rule bg-paper px-3 py-1.5 text-[13px] text-ink-2 hover:border-civic hover:text-civic hover:bg-[oklch(0.97_0.018_170)] transition-colors min-h-[36px]"
            >
              {/* NEEDS-KEY: polling.addedToCalendar */}
              {lang === "es" ? "Agregar al Calendario ↓" : "Add to Calendar ↓"}
            </button>
          </div>

          {/* Footer */}
          <footer className="px-5 pb-4">
            <p className="text-[11px] leading-relaxed text-ink-3">
              {/* NEEDS-KEY: polling.cardSource */}
              {lang === "es"
                ? "Fuente: Google Civic · Oficina electoral estatal"
                : "Source: Google Civic · State election office"}
            </p>
          </footer>
        </div>
      )}
    </section>
  );
}
