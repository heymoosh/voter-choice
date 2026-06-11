/**
 * src/prototype/redesign/delegationData.ts
 *
 * Data layer for the congress-assessment experience (the 2026 redesign).
 * Mirrors realData.ts conventions: thin typed fetch wrappers over the real
 * API routes, mapped into the exact seat shape the design components render
 * (docs/design/2026-redesign/…/redesign2-data.jsx → DELEGATION).
 *
 * Flow: address → POST /api/delegation (Census geocode + sitting members)
 * → per-seat POST /api/race-data (alignment + donors, LLM-free) → seats.
 * Web-search research fallback reuses fetchCandidateResearch (realData.ts).
 */

import { getStateData, getFallbackStateData } from "../../lib/getStateData";
import {
  toBallotLogistics,
  type BallotLogistics,
  type LogisticsSource,
} from "../../lib/civic-logistics";
import type { StateElectionData } from "../../types/election";
import {
  resolveSeatEligibility,
  formatLongDate,
  formatShortDate,
  type SeatEligibility,
} from "../../lib/eligibility";
import { getIssueLevel, type IssueLevel } from "../../lib/canonicalIssues";
import {
  fetchCandidateResearch,
  getChatSessionId,
  type AlignmentScore,
} from "../realData";

// ---------------------------------------------------------------------------
// /api/delegation response (mirrors src/app/api/delegation/route.ts)
// ---------------------------------------------------------------------------

export interface ApiCanSeatContext {
  ratings: Array<{
    rater: string;
    raterType: string;
    rating: string;
    ratingRaw: string | null;
  }>;
  donorTrail: {
    cycleWindow: string;
    totalRaised: number | null;
    cashOnHand: number | null;
    pacSharePct: number | null;
    note: string | null;
  } | null;
  keyVotes: Array<{
    billLabel: string;
    voteCast: string | null;
    voteCastRaw: string | null;
    voteDateRaw: string | null;
    context: string | null;
    proceduralNote: string | null;
    billNarrative: string | null;
  }>;
  snapshotDate: string | null;
  sourceUrl: string | null;
  attribution: { label: string; url: string };
}

export interface ApiSeatChallenger {
  id: string;
  name: string;
  party: string | null;
  totalReceipts: number | null;
}

export interface ApiDelegationSeat {
  seatId: string;
  office: "U.S. House" | "U.S. Senate";
  chamber: "house" | "senate";
  districtLabel: string;
  blindLabel: string;
  candidate: {
    id: string;
    name: string;
    party: string | null;
    priorRole: string | null;
  } | null;
  attendance: { missedPct: number; of: string; band: string } | null;
  onBallot2026: boolean | null;
  nextElectionYear: number | null;
  /** 2026 FEC filers for this seat (empty when seat isn't up / no roster). */
  challengers?: ApiSeatChallenger[];
  /** CAN2026 curated context — display-side only, always attributed. */
  canContext?: ApiCanSeatContext | null;
}

export type DelegationResult =
  | {
      status: "ok";
      stateCode: string;
      stateName: string;
      county: string | null;
      districtLabel: string | null;
      seats: ApiDelegationSeat[];
    }
  | { status: "geocode_failed"; retryable: boolean }
  | { status: "no_representation"; stateCode: string; territoryName: string }
  | {
      status: "db_unavailable";
      stateCode: string;
      county: string | null;
      districtLabel: string | null;
    };

export async function fetchDelegation(
  address: string,
): Promise<DelegationResult> {
  try {
    const res = await fetch("/api/delegation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });
    if (res.status === 502)
      return { status: "geocode_failed", retryable: true };
    if (!res.ok) return { status: "geocode_failed", retryable: true };
    const body = await res.json();
    if (body.status === "geocode_failed") {
      return { status: "geocode_failed", retryable: false };
    }
    return body as DelegationResult;
  } catch {
    return { status: "geocode_failed", retryable: true };
  }
}

// ---------------------------------------------------------------------------
// User issues (ConcernInterpretationEntry from ColdOpenView + level tag)
// ---------------------------------------------------------------------------

export interface UserIssue {
  canonicalIssue?: string;
  interpretation: string;
  stance?: string;
  rank?: number;
  level: IssueLevel;
  quotes?: { label: string; text: string }[];
}

/** Decorate locked cold-open issues with the jurisdiction-lean level tag. */
export function decorateIssues(
  issues: Array<{ canonicalIssue?: string; interpretation?: string }>,
): UserIssue[] {
  return (issues || [])
    .filter((i) => i && (i.interpretation || i.canonicalIssue))
    .map((i) => ({
      ...i,
      interpretation: i.interpretation || i.canonicalIssue || "",
      level: i.canonicalIssue ? getIssueLevel(i.canonicalIssue) : "both",
    }));
}

export function issuesForLevel(
  issues: UserIssue[],
  level: "federal" | "state",
): UserIssue[] {
  return (issues || []).filter((i) => i.level === level || i.level === "both");
}

// ---------------------------------------------------------------------------
// Per-seat card data (/api/race-data with a single-member roster)
// ---------------------------------------------------------------------------

/** Prototype issue `stance` is prose; the API wants a verb (realData.ts). */
function toStance(s?: string): "in_favor" | "opposed" {
  return s && /\b(oppos|against|repeal|block|ban|cut)\b/i.test(s)
    ? "opposed"
    : "in_favor";
}

function toApiIssues(issues: UserIssue[]) {
  return (issues || [])
    .filter((i) => i && i.canonicalIssue)
    .map((i) => ({
      canonicalIssue: i.canonicalIssue as string,
      issueLabel: i.interpretation,
      stance: toStance(i.stance),
    }));
}

interface RaceDataCandidate {
  id: string;
  name: string;
  incumbent: boolean;
  donorCoalition: unknown[] | null;
  donorSource?: { name: string; url: string };
  totalRaised?: number;
  fundingMix?: {
    small: number;
    large: number;
    pac: number;
    total: number;
    cycle: string;
  };
  [k: string]: unknown;
}

interface SeatCardData {
  candidate: RaceDataCandidate | null;
  alignmentEntry: {
    candidateId: string;
    scores: unknown[] | null;
    unavailable?: { reason: string };
  } | null;
}

async function fetchSeatCardData(
  seat: ApiDelegationSeat,
  issues: UserIssue[],
  stateCode: string,
): Promise<SeatCardData> {
  if (!seat.candidate) return { candidate: null, alignmentEntry: null };
  try {
    const res = await fetch("/api/race-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        raceId: seat.seatId,
        raceLabel: `${seat.office} — ${seat.districtLabel}`,
        section: "Federal",
        stateCode,
        candidates: [
          {
            name: seat.candidate.name,
            party: seat.candidate.party ?? undefined,
          },
        ],
        issues: toApiIssues(issues),
      }),
    });
    if (!res.ok) return { candidate: null, alignmentEntry: null };
    const data = await res.json();
    const candidate: RaceDataCandidate | null =
      data?.racePatterns?.candidates?.[0] ?? null;
    const alignmentEntry = data?.alignmentScores?.entries?.[0] ?? null;
    return { candidate, alignmentEntry };
  } catch {
    return { candidate: null, alignmentEntry: null };
  }
}

// ---------------------------------------------------------------------------
// Seat assembly (the design's DELEGATION entry shape)
// ---------------------------------------------------------------------------

export interface DelegationSeatVM {
  id: string;
  section: string;
  level: "federal" | "state";
  office: string;
  districtLabel: string;
  blindLabel: string;
  partyName: string | null;
  researched: boolean;
  nextElection: { label: string; onBallot2026: boolean } | null;
  attendance: { missedPct: number; of: string; band: string } | null;
  eligibility: SeatEligibility;
  candidate: {
    id: string;
    name: string;
    incumbent: boolean;
    priorRole: string | null;
    totalRaised?: number;
    fundingMix?: RaceDataCandidate["fundingMix"];
    donorSource?: { name: string; url: string };
    donorCoalition: unknown[] | null;
  } | null;
  alignmentEntry: SeatCardData["alignmentEntry"];
  /** 2026 filers running for this seat ("Running for this seat in 2026"). */
  challengers: ApiSeatChallenger[];
  /** CAN2026 curated context (null until the CAN ingest runs). */
  canContext: ApiCanSeatContext | null;
}

/** Donor-source codes from /api/donors → reader-facing names. */
const DONOR_SOURCE_NAMES: Record<string, string> = {
  fec: "FEC filings",
  fec_api: "FEC filings",
  followthemoney: "FollowTheMoney",
  "tx-tec": "Texas Ethics Commission",
};

function prettyDonorSource(
  src: { name: string; url: string } | undefined,
): { name: string; url: string } | undefined {
  if (!src) return undefined;
  return { ...src, name: DONOR_SOURCE_NAMES[src.name] ?? src.name };
}

/** "Primary · Mar 3, 2026"-style seat-strip label from the eligibility note. */
function nextElectionLabel(
  eligibility: SeatEligibility,
  onBallot2026: boolean | null,
): { label: string; onBallot2026: boolean } | null {
  if (onBallot2026 === null) return null;
  if (!onBallot2026) return { label: eligibility.date, onBallot2026: false };
  const isoish = eligibility.date.match(/^([A-Z][a-z]+) (\d+), (\d{4})$/);
  const short = isoish
    ? `${isoish[1].slice(0, 3)} ${isoish[2]}, ${isoish[3]}`
    : eligibility.date;
  return { label: `${eligibility.nextLabel} · ${short}`, onBallot2026: true };
}

export function buildSeats(
  delegation: Extract<DelegationResult, { status: "ok" }>,
  cardData: Map<string, SeatCardData>,
  stateData: StateElectionData,
): DelegationSeatVM[] {
  return delegation.seats.map((seat) => {
    const card = cardData.get(seat.seatId);
    const eligibility = resolveSeatEligibility(stateData, {
      chamber: seat.chamber,
      onBallot2026: seat.onBallot2026,
      nextUpYear: seat.nextElectionYear,
    });

    const apiCand = seat.candidate;
    const cardCand = card?.candidate ?? null;

    return {
      id: seat.seatId,
      section: "Washington — Federal",
      level: "federal" as const,
      office: seat.office,
      districtLabel: seat.districtLabel,
      blindLabel: seat.blindLabel,
      partyName: apiCand?.party ?? null,
      researched: false,
      nextElection: nextElectionLabel(eligibility, seat.onBallot2026),
      attendance: seat.attendance,
      eligibility,
      candidate: apiCand
        ? {
            id: cardCand?.id ?? apiCand.id,
            name: apiCand.name,
            // Every delegation member is by definition the sitting incumbent
            // (race-data defaults roster candidates to false).
            incumbent: true,
            priorRole: apiCand.priorRole,
            totalRaised: cardCand?.totalRaised,
            fundingMix: cardCand?.fundingMix,
            donorSource: prettyDonorSource(cardCand?.donorSource),
            donorCoalition: cardCand?.donorCoalition ?? null,
          }
        : null,
      alignmentEntry: card?.alignmentEntry ?? null,
      challengers: seat.challengers ?? [],
      canContext: seat.canContext ?? null,
    };
  });
}

/** Load card data for every seat in parallel (load-once model). */
export async function loadAllSeatCardData(
  delegation: Extract<DelegationResult, { status: "ok" }>,
  issues: UserIssue[],
): Promise<Map<string, SeatCardData>> {
  const out = new Map<string, SeatCardData>();
  await Promise.all(
    delegation.seats.map(async (seat) => {
      out.set(
        seat.seatId,
        await fetchSeatCardData(seat, issues, delegation.stateCode),
      );
    }),
  );
  return out;
}

// ---------------------------------------------------------------------------
// State data + logistics (PollingStatusBar / print sheet inputs)
// ---------------------------------------------------------------------------

export async function loadStateElectionData(
  stateCode: string,
): Promise<StateElectionData> {
  const data = await getStateData(stateCode);
  if (data) return data;
  // States without a populated data file fall back to federal-deadline
  // guidance (same path the legacy app uses).
  return getFallbackStateData(stateCode);
}

export interface DeadlineRow {
  labelKey: string;
  date: string;
  daysLeft: number;
  color: "green" | "yellow" | "red" | "passed";
}

/** Same row math as the prototype's getDeadlineRows, over REAL state data. */
export function deadlineRowsFor(
  stateData: StateElectionData,
  todayIso: string,
): DeadlineRow[] {
  const row = (
    labelKey: string,
    dateISO: string | null,
  ): DeadlineRow | null => {
    if (!dateISO) return null;
    const today = new Date(`${todayIso}T00:00:00`);
    const deadline = new Date(`${dateISO}T00:00:00`);
    const daysLeft = Math.round(
      (deadline.getTime() - today.getTime()) / 86400000,
    );
    const color =
      daysLeft < 0
        ? ("passed" as const)
        : daysLeft <= 3
          ? ("red" as const)
          : daysLeft <= 14
            ? ("yellow" as const)
            : ("green" as const);
    return { labelKey, date: dateISO, daysLeft, color };
  };
  const upcoming = (stateData.elections || []).filter(
    (e) => e.date >= todayIso,
  );
  const next = upcoming.length > 0 ? upcoming[0] : null;
  return [
    row(
      "deadline.registerOnline",
      stateData.registration?.online?.deadline ?? null,
    ),
    row("deadline.earlyVotingStarts", stateData.earlyVoting?.startDate ?? null),
    row("deadline.earlyVotingEnds", stateData.earlyVoting?.endDate ?? null),
    row("deadline.electionDay", next?.date ?? null),
  ].filter((r): r is DeadlineRow => r !== null);
}

export interface PollingInfoVM {
  name: string;
  address: string;
  hours: string;
  notes: string;
  precinct: string;
  /** Provenance: "civic" (real Google Civic data) | "state" | "fallback". */
  source: LogisticsSource;
}

/** Honest polling fallback — shown until/unless civic resolves real data. */
export function pollingFallback(): PollingInfoVM {
  return {
    name: "Look up your polling place",
    address: "",
    hours: "",
    notes: "",
    precinct: "",
    source: "fallback",
  };
}

/**
 * Address → real voting logistics via /api/civic (Google Civic voterinfo),
 * mapped through the honest toBallotLogistics contract. Best-effort: any
 * failure returns null and the caller keeps the fallback. The address is
 * sent to the same /api/civic proxy the ballot flow already uses and is
 * never persisted.
 */
export async function fetchBallotLogistics(
  address: string,
  stateData: StateElectionData | null,
): Promise<BallotLogistics | null> {
  try {
    const res = await fetch("/api/civic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });
    if (!res.ok) return null;
    const body = await res.json();
    if (!body || body.error) return null;
    return toBallotLogistics(body, stateData ?? undefined);
  } catch {
    return null;
  }
}

/**
 * BallotLogistics → the pollingInfo shape the workspace bar + print sheet
 * render. Civic polling place wins; statutory per-state hours fill the
 * hours slot when civic carries none; otherwise the honest fallback.
 */
export function pollingInfoFromLogistics(
  logistics: BallotLogistics | null,
  stateData: StateElectionData | null,
): PollingInfoVM {
  const statutoryHours = stateData?.votingRules?.pollingHours ?? "";
  if (!logistics || !logistics.pollingPlace) {
    return { ...pollingFallback(), hours: statutoryHours };
  }
  const place = logistics.pollingPlace;
  return {
    name: place.name || "Your polling place",
    address: place.address || "",
    hours: place.hours || statutoryHours,
    notes: place.notes || "",
    precinct: "",
    source: logistics.source,
  };
}

// ---------------------------------------------------------------------------
// Web-search research fallback (per-seat; shared cache semantics with the
// legacy app: cache the ATTEMPT so no seat re-fires forever)
// ---------------------------------------------------------------------------

export type SeatResearch =
  | { status: "loading" }
  | { status: "done"; scores: AlignmentScore[] }
  | { status: "unavailable" }
  /** The server refused on the community-budget gate — research is paused,
   *  not failed; the UI offers the budget options instead of a retry. */
  | { status: "budget_blocked" };

const seatResearch = new Map<string, SeatResearch>();

export function getSeatResearch(seatId: string): SeatResearch | undefined {
  return seatResearch.get(seatId);
}

/** Clear the attempt cache so a re-analyze re-fires research. Called when the
 *  voter's canonical-issue set actually changes (an edit-issues apply) —
 *  rerank/rename-only edits must NOT reset, or they'd re-burn research spend
 *  for identical queries. */
export function resetSeatResearch(): void {
  seatResearch.clear();
}

/** Reset hook for tests/start-over. */
export function _resetSeatResearchForTesting(): void {
  seatResearch.clear();
}

/**
 * Fire research for every resolved seat with no DB record. Names go
 * server-side only; results are name-free scores. Render still honors blind
 * mode (the research prop only feeds the alignment surface). Calls
 * `onUpdate` after each settle so the caller can re-render.
 */
export function preloadSeatResearch(
  seats: DelegationSeatVM[],
  issues: UserIssue[],
  stateCode: string,
  onUpdate: () => void,
): void {
  const structuredIssues = (issues || [])
    .filter((i) => i.canonicalIssue)
    .map((i) => ({
      canonicalIssue: i.canonicalIssue as string,
      issueLabel: i.interpretation,
    }));
  if (structuredIssues.length === 0) return;

  for (const seat of seats) {
    if (!seat.candidate) continue;
    if (seat.alignmentEntry && seat.alignmentEntry.scores !== null) continue;
    if (seatResearch.has(seat.id)) continue;
    seatResearch.set(seat.id, { status: "loading" });
    fetchCandidateResearch({
      candidateName: seat.candidate.name,
      jurisdiction: `${seat.office} — ${seat.districtLabel}, ${stateCode}`,
      issues: structuredIssues,
      cycle: "2026",
    }).then((res) => {
      if (res && res.scores && res.scores.length > 0) {
        seatResearch.set(seat.id, { status: "done", scores: res.scores });
      } else if (res?.blocked) {
        seatResearch.set(seat.id, { status: "budget_blocked" });
      } else {
        seatResearch.set(seat.id, { status: "unavailable" });
      }
      onUpdate();
    });
  }
  onUpdate();
}

// ---------------------------------------------------------------------------
// Challenger research — ON-DEMAND only (Muxin, 2026-06-10): fires when the
// voter taps "Research positions" on a challenger row, never preloaded.
// Results persist server-side in candidate_data, so a researched challenger
// renders instantly for every later voter (lookupCandidateData read path).
// ---------------------------------------------------------------------------

const challengerResearchStore = new Map<string, SeatResearch>();

export function getChallengerResearch(
  challengerId: string,
): SeatResearch | undefined {
  return challengerResearchStore.get(challengerId);
}

/** Clear the challenger attempt cache (same contract as resetSeatResearch). */
export function resetChallengerResearch(): void {
  challengerResearchStore.clear();
}

/** Reset hook for tests/start-over. */
export function _resetChallengerResearchForTesting(): void {
  challengerResearchStore.clear();
}

/**
 * Research one challenger's positions on the voter's issues (web search →
 * structured, cited scores; persisted server-side). Same name-handling
 * contract as preloadSeatResearch: the real name goes server-side only and
 * the stored result is name-free issue scores.
 */
export function researchChallenger(
  challenger: ApiSeatChallenger,
  seat: { office: string; districtLabel: string },
  issues: UserIssue[],
  stateCode: string,
  onUpdate: () => void,
): void {
  const structuredIssues = (issues || [])
    .filter((i) => i.canonicalIssue)
    .map((i) => ({
      canonicalIssue: i.canonicalIssue as string,
      issueLabel: i.interpretation,
    }));
  if (structuredIssues.length === 0) return;
  const existing = challengerResearchStore.get(challenger.id);
  if (
    existing &&
    existing.status !== "unavailable" &&
    existing.status !== "budget_blocked"
  )
    return;

  challengerResearchStore.set(challenger.id, { status: "loading" });
  fetchCandidateResearch({
    candidateName: challenger.name,
    jurisdiction: `${seat.office} — ${seat.districtLabel}, ${stateCode}`,
    issues: structuredIssues,
    cycle: "2026",
  }).then((res) => {
    if (res && res.scores && res.scores.length > 0) {
      challengerResearchStore.set(challenger.id, {
        status: "done",
        scores: res.scores,
      });
    } else if (res?.blocked) {
      challengerResearchStore.set(challenger.id, { status: "budget_blocked" });
    } else {
      challengerResearchStore.set(challenger.id, { status: "unavailable" });
    }
    onUpdate();
  });
  onUpdate();
}

// ---------------------------------------------------------------------------
// Re-score deltas — how each seat's aggregate alignment moved after an
// edit-issues apply. Deterministic math over the re-fetched card data (the
// old app's amend deltas were mocked; this is the first real implementation).
// ---------------------------------------------------------------------------

/** Aggregate voting-record alignment for a seat: Σkept/Σtotal across scoreable
 *  rows, as a 0–100 percent. null = no scoreable record (honest gap). */
export function seatAlignmentPct(seat: {
  alignmentEntry: { scores: unknown[] | null } | null;
}): number | null {
  const scores = seat.alignmentEntry?.scores;
  if (!Array.isArray(scores)) return null;
  let kept = 0;
  let total = 0;
  for (const row of scores as Array<Record<string, unknown>>) {
    if (
      row &&
      typeof row.kept === "number" &&
      typeof row.total === "number" &&
      row.total > 0
    ) {
      kept += row.kept;
      total += row.total;
    }
  }
  if (total === 0) return null;
  return Math.round((kept / total) * 100);
}

export interface SeatDelta {
  seatId: string;
  label: string;
  oldPct: number | null;
  newPct: number | null;
  /** Worth a revisit: moved past the 5-point noise floor, or flipped between
   *  scoreable and no-record. */
  significant: boolean;
}

/** Compare per-seat alignment before/after a re-score. `before` is the
 *  snapshot taken from the OLD seats (seatAlignmentPct per seat id). */
export function computeSeatDeltas(
  before: Map<string, number | null>,
  seats: DelegationSeatVM[],
): SeatDelta[] {
  return seats.map((seat) => {
    const oldPct = before.has(seat.id) ? (before.get(seat.id) ?? null) : null;
    const newPct = seatAlignmentPct(seat);
    const flipped = (oldPct === null) !== (newPct === null);
    const moved =
      oldPct !== null && newPct !== null && Math.abs(newPct - oldPct) > 5;
    return {
      seatId: seat.id,
      label: `${seat.office} · ${seat.districtLabel}`,
      oldPct,
      newPct,
      significant: flipped || moved,
    };
  });
}

// ---------------------------------------------------------------------------
// Session-end counters (Polis) — anonymous aggregates, once per session
// ---------------------------------------------------------------------------

let countersSubmitted = false;

/** Reset hook for tests. */
export function _resetCountersForTesting(): void {
  countersSubmitted = false;
}

/**
 * Increment the anonymous session counters once (server dedupes by sessionId
 * too). Fires at the earlier of: all seats verdicted, or first entry to the
 * standing stage. Verdicts are assessments, not picks — never sent.
 */
export async function submitSessionCounters(input: {
  stateCode: string;
  county: string | null;
  issues: UserIssue[];
}): Promise<void> {
  if (countersSubmitted) return;
  countersSubmitted = true;
  try {
    await fetch("/api/counters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: getChatSessionId(),
        stateCode: input.stateCode,
        county: input.county,
        primary: "GENERAL",
        confirmedConcerns: (input.issues || [])
          .filter((i) => i.canonicalIssue)
          .map((i) => ({ canonicalIssue: i.canonicalIssue })),
        picks: [],
      }),
    });
  } catch {
    // Counters are best-effort — never surface a failure to the user.
  }
}

// ---------------------------------------------------------------------------
// Portable scorecard text (save .txt / chatbot handoff)
// ---------------------------------------------------------------------------

/**
 * Plain-text scorecard for download / handoff: issues + per-seat verdicts.
 * Contains no address or personal info beyond what the user typed as issues.
 */
// ---------------------------------------------------------------------------
// Misc formatting shared by the redesign views
// ---------------------------------------------------------------------------

export { formatLongDate, formatShortDate };
