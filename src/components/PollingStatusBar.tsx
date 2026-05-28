"use client";

import React, { useState } from "react";
import type { StateElectionData } from "../types/election";
import { useLanguage } from "@/lib/i18n";
import { translations } from "@/lib/translations";
import { DeadlineMeter, type DeadlineMeterRow } from "./DeadlineMeter";

export interface PollingLocation {
  name: string;
  address: string;
  hours: string;
  notes?: string;
  precinct?: string;
}

interface PollingStatusBarProps {
  pollingInfo: PollingLocation;
  stateData: StateElectionData;
  /** DeadlineMeterRows built by the caller via getDeadlineStatus + a labelKey tag.
   *  The row with labelKey === 'deadline.electionDay' drives the countdown. */
  rows: DeadlineMeterRow[];
}

// ── Calendar export ──────────────────────────────────────────────────────────
// Includes LOCATION, DESCRIPTION, and a morning VALARM so the user's calendar
// app reminds them on Election Day.
function downloadIcsForElection(
  stateData: StateElectionData,
  pollingInfo: PollingLocation,
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

// Color → dot bg for the collapsed countdown pill
const countPillDot: Record<string, string> = {
  green: "bg-[oklch(0.62_0.13_145)]",
  yellow: "bg-[oklch(0.78_0.13_90)]",
  red: "bg-vote-red",
  passed: "bg-ink-3",
};

const PREVIEW_COUNT = 3;

/**
 * PollingStatusBar
 *
 * Slim sticky strip immediately below the app nav.
 * Collapsed: pin · polling place name · "N days until Election Day" · Details ▾
 * Expanded:  four-cell grid (Address / Hours / Bring / Deadlines) + action links
 *
 * Intended mount point: between Navigation.tsx and the 3-pane workspace shell
 * (BallotToolClient / ResearchLayout). Only render when pollingInfo is available.
 *
 * NEEDS-KEY: polling.addedToCalendar — EN "Add to Calendar" / ES "Agregar al Calendario"
 * NEEDS-KEY: polling.cardTitle — EN "Your Polling Place" / ES "Tu Lugar de Votación"
 * NEEDS-KEY: polling.cardSource — EN "Source: Google Civic · State election office" / ES "Fuente: Google Civic · Oficina electoral estatal"
 * NEEDS-KEY: polling.bring — EN "What to Bring" / ES "Qué Llevar"
 * NEEDS-KEY: polling.earlyVotingWindow — EN "Early Voting" / ES "Votación Anticipada"
 * NEEDS-KEY: polling.precinct — EN "Precinct" / ES "Precinto"
 */
export function PollingStatusBar({
  pollingInfo,
  stateData,
  rows,
}: PollingStatusBarProps) {
  const { lang } = useLanguage();
  const t = translations[lang];

  const [open, setOpen] = useState(false);
  const [idsExpanded, setIdsExpanded] = useState(false);

  const electionRow = rows.find((r) => r.labelKey === "deadline.electionDay");
  const days = electionRow ? electionRow.daysLeft : null;
  const electionColor = electionRow?.color ?? "green";

  const acceptedIds = stateData.votingRules.acceptedIds ?? [];
  const visibleIds = idsExpanded
    ? acceptedIds
    : acceptedIds.slice(0, PREVIEW_COUNT);
  const hiddenCount = acceptedIds.length - PREVIEW_COUNT;

  function fmtRange(startISO: string, endISO: string): string {
    const opts: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };
    const locale = lang === "es" ? "es-US" : "en-US";
    const start = new Date(startISO + "T00:00:00").toLocaleDateString(
      locale,
      opts,
    );
    const end = new Date(endISO + "T00:00:00").toLocaleDateString(
      locale,
      opts,
    );
    return `${start} – ${end}`;
  }

  const earlyWindowText =
    stateData.earlyVoting.available &&
    stateData.earlyVoting.startDate &&
    stateData.earlyVoting.endDate
      ? fmtRange(
          stateData.earlyVoting.startDate,
          stateData.earlyVoting.endDate,
        )
      : lang === "es"
        ? "No disponible"
        : "Not available";

  // Countdown text in collapsed strip
  // NEEDS-KEY: deadline.passed — EN "Passed" / ES "Pasado"
  // NEEDS-KEY: deadline.today — EN "Today (last day)" / ES "Hoy (último día)"
  const countdownText =
    days == null
      ? lang === "es"
        ? "Día de Elecciones"
        : "Election Day"
      : days < 0
        ? lang === "es"
          ? "Pasado"
          : "Passed"
        : days === 0
          ? lang === "es"
            ? "Hoy (último día)"
            : "Today (last day)"
          : lang === "es"
            ? `${days} días para el día de elecciones`
            : `${days} days until Election Day`;

  // Tailwind: sticky strip background uses oklch(0.97 0.018 170) = civic-tinted paper
  const barBg = open
    ? "bg-paper-2"
    : "bg-[oklch(0.97_0.018_170)] hover:bg-[oklch(0.94_0.025_170)]";

  return (
    <div
      className={`sticky top-0 z-50 border-b border-rule transition-colors ${open ? "bg-paper-2" : "bg-[oklch(0.97_0.018_170)]"}`}
    >
      {/* Collapsed strip — entire row is a button */}
      <button
        type="button"
        className={`flex items-center justify-between w-full gap-4 px-6 py-2.5 transition-colors ${open ? "hover:bg-paper" : "hover:bg-[oklch(0.94_0.025_170)]"}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="psb-panel"
      >
        {/* Left: pin + name + precinct */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0 overflow-hidden">
          <span aria-hidden="true" className="inline-flex text-civic flex-none">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </span>
          <span className="font-semibold text-[13.5px] text-ink whitespace-nowrap overflow-hidden text-ellipsis">
            {pollingInfo.name}
          </span>
          {pollingInfo.precinct && (
            <>
              <span aria-hidden="true" className="text-ink-3">
                ·
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3 whitespace-nowrap hidden sm:inline">
                {/* NEEDS-KEY: polling.precinct */}
                Precinct {pollingInfo.precinct}
              </span>
            </>
          )}
        </div>

        {/* Right: countdown pill + toggle label */}
        <div className="flex items-center gap-2.5 flex-none">
          <span
            className={`inline-flex items-center gap-[7px] font-mono text-[11px] uppercase tracking-[0.08em] text-ink-2`}
          >
            <span
              aria-hidden="true"
              className={`w-[7px] h-[7px] rounded-full ${countPillDot[electionColor]}`}
            />
            {countdownText}
          </span>
          <span aria-hidden="true" className="text-[12px] text-civic whitespace-nowrap">
            {open
              ? lang === "es"
                ? "Ocultar ▴"
                : "Hide details ▴"
              : lang === "es"
                ? "Detalles ▾"
                : "Details ▾"}
          </span>
        </div>
      </button>

      {/* Expanded panel */}
      {open && (
        <div
          id="psb-panel"
          role="region"
          aria-label={
            /* NEEDS-KEY: polling.cardTitle — using fallback */
            lang === "es" ? "Tu Lugar de Votación" : "Your Polling Place"
          }
          className="border-t border-rule-2 bg-paper-2 px-6 pb-[18px] pt-4"
        >
          {/* Action links row — promoted to top so user doesn't have to scroll */}
          <div className="flex items-center flex-wrap gap-2.5 pb-3.5 border-b border-rule-2 mb-4">
            <a
              href={stateData.registration.registrationCheckUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-[7px] bg-paper border border-rule rounded px-3 py-1.5 text-[13px] text-ink-2 hover:border-civic hover:text-civic hover:bg-[oklch(0.97_0.018_170)] transition-colors min-h-[44px]"
            >
              <span
                aria-hidden="true"
                className="inline-grid place-items-center w-[18px] h-[18px] rounded-full bg-civic text-paper-2 text-[10px]"
              >
                ✓
              </span>
              {t.research.checkRegistration}
            </a>
            <button
              type="button"
              className="inline-flex items-center gap-[7px] bg-paper border border-rule rounded px-3 py-1.5 text-[13px] text-ink-2 hover:border-civic hover:text-civic hover:bg-[oklch(0.97_0.018_170)] transition-colors min-h-[44px]"
              onClick={() => downloadIcsForElection(stateData, pollingInfo)}
            >
              <span
                aria-hidden="true"
                className="inline-grid place-items-center w-[18px] h-[18px] rounded-full bg-civic text-paper-2 text-[10px]"
              >
                ↓
              </span>
              {/* NEEDS-KEY: polling.addedToCalendar — EN "Add to Calendar" / ES "Agregar al Calendario" */}
              {lang === "es" ? "Agregar al Calendario" : "Add to Calendar"}
            </button>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pollingInfo.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              title={`Directions to ${pollingInfo.name}`}
              className="inline-flex items-center gap-[7px] bg-paper border border-rule rounded px-3 py-1.5 text-[13px] text-ink-2 hover:border-civic hover:text-civic hover:bg-[oklch(0.97_0.018_170)] transition-colors min-h-[44px]"
            >
              <span
                aria-hidden="true"
                className="inline-grid place-items-center w-[18px] h-[18px] rounded-full bg-civic text-paper-2 text-[10px]"
              >
                →
              </span>
              {t.polling.directions}
            </a>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
              {/* NEEDS-KEY: polling.cardSource */}
              {lang === "es"
                ? "Fuente: Google Civic · Oficina electoral"
                : "Source: Google Civic · State election office"}
            </span>
          </div>

          {/* 4-column grid: Address / Hours / Bring / Deadlines */}
          <div className="grid gap-7" style={{ gridTemplateColumns: "1.4fr 0.9fr 1fr 1.6fr" }}>
            {/* Address */}
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1">
                Address
              </div>
              <div className="text-[14px] leading-snug text-ink">
                {pollingInfo.address}
              </div>
              {pollingInfo.notes && (
                <div className="text-[12px] text-ink-3 mt-1.5 leading-snug">
                  {pollingInfo.notes}
                </div>
              )}
            </div>

            {/* Hours + early voting */}
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1">
                {t.polling.hours}
              </div>
              <div className="text-[14px] leading-snug text-ink">
                {pollingInfo.hours}
              </div>
              <div className="text-[12px] text-ink-3 mt-1.5 leading-snug">
                {/* NEEDS-KEY: polling.earlyVotingWindow */}
                {lang === "es" ? "Votación Anticipada" : "Early Voting"}:{" "}
                {earlyWindowText}
              </div>
            </div>

            {/* What to bring */}
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1">
                {/* NEEDS-KEY: polling.bring */}
                {lang === "es" ? "Qué Llevar" : "What to Bring"}
              </div>
              <div className="text-[14px] leading-snug text-ink">
                <span className="block text-[12px] text-ink-3 mb-1">
                  {lang === "es" ? "Cualquiera de estos:" : "Any one of these:"}
                </span>
                <ul className="list-none p-0 m-0">
                  {visibleIds.map((id) => (
                    <li
                      key={id}
                      className="text-[13.5px] leading-relaxed text-ink py-0.5 before:content-['·'] before:mr-1.5 before:text-ink-3"
                    >
                      {id}
                    </li>
                  ))}
                </ul>
                {hiddenCount > 0 && (
                  <button
                    type="button"
                    className="mt-1 text-[12px] text-civic underline cursor-pointer bg-transparent border-0 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIdsExpanded((v) => !v);
                    }}
                  >
                    {idsExpanded
                      ? lang === "es"
                        ? "Ver menos ▴"
                        : "Show fewer ▴"
                      : lang === "es"
                        ? `Mostrar ${hiddenCount} IDs aceptadas más ▾`
                        : `Show ${hiddenCount} more accepted IDs ▾`}
                  </button>
                )}
              </div>
              <div className="text-[12px] text-ink-3 mt-1.5 leading-snug">
                {lang === "es"
                  ? "Teléfonos prohibidos a menos de 30 m"
                  : "Phones prohibited within 100 ft"}
              </div>
            </div>

            {/* Deadlines */}
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1">
                Deadlines
              </div>
              <DeadlineMeter rows={rows} compact={false} stacked={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
