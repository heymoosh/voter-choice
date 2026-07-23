/**
 * src/lib/eligibility.ts
 *
 * Per-seat eligibility resolver for the 2026 redesign's EligibilityNote2 —
 * the evolved party gate, rendered inside each rep card instead of as a
 * blocking modal.
 *
 * Pure derivation over existing `StateElectionData` (no new storage, per the
 * redesign HANDOFF): next upcoming election + primary-participation rules +
 * runoff lock + registration deadlines → { severity, nextLabel, date,
 * ruleHtml, todo }.
 *
 * `ruleHtml` only ever embeds copy from our own state data files (the same
 * strings the party gate already renders) — never user input.
 */

import type { StateElectionData, Election } from "../types/election";
import { getTodayInLatestUsZone } from "./electionToday";

export interface SeatEligibilityInput {
  chamber: "house" | "senate";
  /** From member_stats via /api/delegation; null = unknown. */
  onBallot2026: boolean | null;
  /** Year the seat is next up when NOT on the 2026 ballot (e.g. 2028). */
  nextUpYear?: number | null;
}

export interface SeatEligibility {
  severity: "warn" | "info";
  nextLabel: string;
  date: string;
  ruleHtml: string;
  todo: { text: string; href: string } | null;
  sourceLabel: string;
  sourceUrl: string;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "2026-03-03" → "March 3, 2026" (no Date object — avoids TZ drift). */
export function formatLongDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${month} ${Number(m[3])}, ${m[1]}` : iso;
}

/** "2026-02-02" → "Feb 2" (todo chip copy). */
export function formatShortDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const month = MONTHS[Number(m[2]) - 1]?.slice(0, 3);
  return month ? `${month} ${Number(m[3])}` : iso;
}

function nextUpcomingElection(
  elections: Election[],
  today: string,
): Election | null {
  const upcoming = elections.filter((e) => e.date >= today);
  if (upcoming.length === 0) return null;
  return upcoming.reduce((min, e) => (e.date < min.date ? e : min));
}

// ---------------------------------------------------------------------------
// Rule copy
// ---------------------------------------------------------------------------

function primaryRuleHtml(stateData: StateElectionData): {
  html: string;
  hasPartyConsequence: boolean;
} {
  const participation = stateData.primaryParticipation;
  const runoffLock = Boolean(
    stateData.runoffRules?.hasRunoff &&
    stateData.runoffRules?.partyLockedToFirstRoundPrimary,
  );

  const parts: string[] = [];
  let hasPartyConsequence = runoffLock;

  switch (participation?.type) {
    case "open":
      parts.push(
        `${stateData.stateName} runs an <b>open primary</b> — you may vote in either party's primary.`,
      );
      break;
    case "closed":
      parts.push(
        `${stateData.stateName} runs a <b>closed primary</b> — you can only vote in the primary of the party you're registered with.`,
      );
      hasPartyConsequence = true;
      break;
    case "semi-closed":
      parts.push(
        `${stateData.stateName} runs a <b>semi-closed primary</b> — unaffiliated voters can pick a party's ballot; registered partisans are locked to their own.`,
      );
      hasPartyConsequence = true;
      break;
    case "top-two":
      parts.push(
        `${stateData.stateName} runs a <b>top-two primary</b> — all candidates appear on one ballot, regardless of party.`,
      );
      break;
    default:
      parts.push("This seat is decided in this year's primary and general.");
      break;
  }

  if (runoffLock) {
    parts.push(
      `If it goes to a <b>runoff</b>, you're locked to the <b>same party's</b> runoff ballot.`,
    );
  }

  return { html: parts.join(" "), hasPartyConsequence };
}

function registrationTodo(
  stateData: StateElectionData,
  today: string,
): { text: string; href: string } | null {
  const reg = stateData.registration;
  if (!reg || reg.sameDayRegistration) return null;

  const deadline =
    (reg.online?.available ? reg.online.deadline : null) ??
    reg.inPerson?.deadline ??
    reg.byMail?.deadline ??
    null;
  if (!deadline || deadline < today) return null;

  return {
    text: `Register by ${formatShortDate(deadline)}`,
    href:
      (reg.online?.available && reg.online.url) ||
      reg.registrationCheckUrl ||
      stateData.resources?.stateElectionWebsite ||
      "",
  };
}

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

/**
 * Derive the per-seat eligibility note. `todayOverride` exists for tests —
 * production callers omit it.
 */
export function resolveSeatEligibility(
  stateData: StateElectionData,
  seat: SeatEligibilityInput,
  todayOverride?: string,
): SeatEligibility {
  const today = todayOverride ?? getTodayInLatestUsZone();
  const sourceLabel = `${stateData.stateName} election rules`;
  const sourceUrl =
    stateData.resources?.voterIdInfo ||
    stateData.resources?.stateElectionWebsite ||
    "";

  // Seat not up in 2026 — informational, no action needed.
  if (seat.onBallot2026 === false) {
    const year = seat.nextUpYear ?? null;
    return {
      severity: "info",
      nextLabel: "Not on your 2026 ballot",
      date: year !== null ? `next up ${year}` : "next up after 2026",
      ruleHtml:
        `Senate terms run six years — this seat isn't up until <b>${year ?? "after 2026"}</b>. ` +
        "The record still counts: it's what they're doing with the term you already gave them.",
      todo: null,
      sourceLabel,
      sourceUrl,
    };
  }

  // Unknown ballot status — honest, never invented.
  if (seat.onBallot2026 === null) {
    return {
      severity: "info",
      nextLabel: "Next election",
      date: "unverified",
      ruleHtml:
        "We couldn't verify when this seat is next on your ballot. The record below still counts.",
      todo: null,
      sourceLabel,
      sourceUrl,
    };
  }

  const next = nextUpcomingElection(stateData.elections ?? [], today);
  const todo = registrationTodo(stateData, today);

  if (next && next.isPrimary) {
    const { html, hasPartyConsequence } = primaryRuleHtml(stateData);
    return {
      severity: hasPartyConsequence ? "warn" : "info",
      nextLabel: "Primary",
      date: formatLongDate(next.date),
      ruleHtml: html,
      todo,
      sourceLabel,
      sourceUrl,
    };
  }

  const chamberHtml =
    seat.chamber === "house"
      ? "House seats are up <b>every two years</b> — this seat is on the 2026 ballot."
      : "This seat is on the <b>2026 ballot</b>.";

  return {
    severity: "info",
    nextLabel: next
      ? next.type === "general"
        ? "General"
        : next.name
      : "General",
    date: next ? formatLongDate(next.date) : "November 3, 2026",
    ruleHtml: chamberHtml,
    todo,
    sourceLabel,
    sourceUrl,
  };
}
