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
import { computeOverallAlignmentPct, getScoreForIssue } from "../data";
import { derivePeerComparison, type PeerComparison } from "./peerComparison";
import type { RosterProvenance } from "../../lib/rosterProvenance";

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
  rosterProvenance: RosterProvenance;
  /**
   * Part 5 promise-ledger top issues by promise count, for the "how they
   * plan to tackle it" click-through (see /api/promises). Undefined = no
   * promises extracted yet for this candidate — the pilot corpus is small;
   * never render this as "no priorities."
   */
  topIssues?: { canonicalIssue: string; promiseCount: number }[];
}

export interface ApiCommitteeAssignment {
  committeeId: string;
  name: string;
  chamber: string;
  parentName: string | null;
  title: string | null;
  isLeadership: boolean;
  rank: number | null;
}

export interface ApiCollaborator {
  candidateId: string;
  name: string;
  party: "D" | "R" | "I" | null;
  sharedBills: number;
  /**
   * Collaborator has left Congress — labelled "former" rather than dropped,
   * so a member's real 118th-Congress network isn't silently shrunk. Optional
   * so an older cached payload just reads as not-departed.
   */
  departed?: boolean;
}

/** Cosponsorship collaborator network — see DelegationSeat.collaborators. */
export interface ApiCollaboratorNetwork {
  sameParty: ApiCollaborator[];
  crossParty: ApiCollaborator[];
}

/**
 * Part 6a — "Top PACs and their sponsors" (TopPacSponsors.tsx). Names PAC
 * money that is ALREADY inside the funding mix's "PACs" slice; nothing here
 * is ever added to `totalRaised` or to `fundingMix`. Note there is no total
 * field: the block is a breakdown, and the server read path emits no sum.
 */
export type ApiTopPacs = import("./TopPacSponsors").TopPacSponsorsData;

/**
 * Part 6b — "Outside spending about this race" (OutsideSpending.tsx). NOT the
 * candidate's money: independent expenditures cannot legally be coordinated
 * with the campaign. `support` and `oppose` are two figures — never summed,
 * never netted, never folded into the funding mix or `totalRaised`.
 */
export type ApiOutsideSpending =
  import("./OutsideSpending").OutsideSpendingData;

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
    /** false only when an official state roster confirms this incumbent
     *  isn't seeking re-election (open seat) — see officialRoster.ts's
     *  isIncumbentSeekingReelection. Absent/undefined = unknown, treated as
     *  a normal seat everywhere this is read. */
    seekingReelection2026?: boolean;
  } | null;
  attendance: { missedPct: number; of: string; band: string } | null;
  /** Standing committee assignments — see DelegationSeat.committees. */
  committees: ApiCommitteeAssignment[];
  /** Cosponsorship collaborator network — see DelegationSeat.collaborators. */
  collaborators: ApiCollaboratorNetwork | null;
  onBallot2026: boolean | null;
  nextElectionYear: number | null;
  /** 2026 FEC filers for this seat (empty when seat isn't up / no roster). */
  challengers?: ApiSeatChallenger[];
  /** CAN2026 curated context — display-side only, always attributed. */
  canContext?: ApiCanSeatContext | null;
  /**
   * Part 6a block. null ⇒ we didn't look (PAC_TRANSPARENCY_ENABLED off, or no
   * resolved candidate) ⇒ render nothing. An object with an empty `sponsors`
   * array ⇒ we looked and found none ⇒ render the explicit no-data line.
   */
  topPacs?: ApiTopPacs | null;
  /** Part 6b block. Same null vs empty-object contract as `topPacs`. */
  outsideSpending?: ApiOutsideSpending | null;
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
  confidence?: "clear" | "low" | "off_topic";
  rank?: number;
  level: IssueLevel;
  quotes?: { label: string; text: string }[];
}

/** Decorate locked cold-open issues with the jurisdiction-lean level tag. */
export function decorateIssues(
  issues: Array<{
    canonicalIssue?: string;
    interpretation?: string;
    stance?: string;
    confidence?: "clear" | "low" | "off_topic";
  }>,
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

/**
 * Issues to render as alignment rows on a seat's card: level-eligible issues
 * (issuesForLevel), plus any user issue that already has a real scored
 * record for THIS seat's candidate. A static jurisdiction-lean guess
 * (ISSUE_JURISDICTION_LEAN) must never suppress a row the seat's own data
 * proves is real — e.g. an issue tagged "state" that nonetheless has scored
 * federal votes for this candidate (show-thin-records: never hide votes that
 * exist). Bug repro: 2026-07-12 Dallas TX senior senator — "Education
 * keeping pace with AI" tagged education_funding (state lean) was dropped
 * from a federal seat's card despite AllVotesPanel (which reads
 * alignmentEntry.scores directly, unfiltered by level) showing real votes.
 */
export function issuesForSeatCard(
  issues: UserIssue[],
  seat: {
    level: "federal" | "state";
    alignmentEntry: SeatCardData["alignmentEntry"];
  },
): UserIssue[] {
  return (issues || []).filter(
    (i) =>
      i.level === seat.level ||
      i.level === "both" ||
      getScoreForIssue(seat.alignmentEntry, i.canonicalIssue) !== null,
  );
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
  /**
   * Median total raised across this chamber/cycle (House or Senate), from
   * /api/race-data (src/lib/server/chamber-median.ts). Omitted when the sample
   * is too thin to be an honest baseline — drives the "Raised vs. the median"
   * comparison (null ⇒ dollar-only, no fabricated baseline).
   */
  chamberMedian?: number;
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
            // The delegation already resolved this seat to its vote-bearing DB
            // row; pass that id so race-data looks up votes by id instead of
            // re-resolving by name (which can hit a voteless FEC-roster twin).
            candidateId: seat.candidate.id,
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
  /** Standing committee assignments — see DelegationSeat.committees. */
  committees: ApiCommitteeAssignment[];
  /** Cosponsorship collaborator network — see DelegationSeat.collaborators. */
  collaborators: ApiCollaboratorNetwork | null;
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
    /**
     * "Raised vs. the median" — derived from totalRaised + the chamber median.
     * null ⇒ no usable baseline; the UI shows the dollar amount only and never
     * fabricates a baseline (honest-state rule, same as attendance: null).
     */
    peerComparison: PeerComparison | null;
    /** false only when confirmed via official state roster (open seat) —
     *  see ApiDelegationSeat.candidate. Undefined = unknown, normal seat. */
    seekingReelection2026?: boolean;
  } | null;
  alignmentEntry: SeatCardData["alignmentEntry"];
  /** 2026 filers running for this seat ("Running for this seat in 2026"). */
  challengers: ApiSeatChallenger[];
  /** CAN2026 curated context (null until the CAN ingest runs). */
  canContext: ApiCanSeatContext | null;
  /**
   * Part 6a "Top PACs and their sponsors" — a breakdown of the PAC money
   * already counted in `candidate.fundingMix`, never money added to it.
   * null = not looked up (flag off / unresolved) ⇒ the block doesn't render.
   */
  topPacs: ApiTopPacs | null;
  /**
   * Part 6b "Outside spending about this race" — NOT the candidate's money.
   * Deliberately a SEAT-level field sitting apart from `candidate`, whose
   * fields are all campaign receipts: support and oppose are two figures and
   * are never summed, netted, or added to totalRaised / fundingMix.
   */
  outsideSpending: ApiOutsideSpending | null;
}

/** Donor-source codes from /api/donors → reader-facing names. */
const DONOR_SOURCE_NAMES: Record<string, string> = {
  fec: "FEC filings",
  fec_api: "FEC filings",
  fec_bulk: "FEC filings",
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
      committees: seat.committees ?? [],
      collaborators: seat.collaborators ?? null,
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
            // "Raised vs. the median" — null when there is no usable baseline.
            peerComparison: derivePeerComparison({
              totalRaised: cardCand?.totalRaised,
              chamberMedian: cardCand?.chamberMedian,
              office: seat.office,
              // The fallback must already be a complete phrase, matching the
              // real fundingMix.cycle shape (race-data.ts `computeFundingMix`
              // produces e.g. "2026 cycle") — MoneyHero's i18n template
              // renders "{cycle}" verbatim with no separate "cycle" suffix.
              cycle: cardCand?.fundingMix?.cycle ?? "2025–26 cycle",
            }),
            seekingReelection2026: apiCand.seekingReelection2026,
          }
        : null,
      alignmentEntry: card?.alignmentEntry ?? null,
      challengers: seat.challengers ?? [],
      canContext: seat.canContext ?? null,
      topPacs: seat.topPacs ?? null,
      outsideSpending: seat.outsideSpending ?? null,
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
// Delegation-overview per-seat alignment (3-card SeatCard summary) — shares
// the same math/lookup as the deep-view AlignmentScoreBanner / AlignmentIssueRow
// (src/prototype/VoterChoiceApp.tsx) so a seat's score reads identically on
// both the overview card and inside its deep single-seat view.
// ---------------------------------------------------------------------------

/** Overall average alignment % for a seat's card — same average-of-per-issue-
 *  percentages formula as AlignmentScoreBanner, scoped to the issues that
 *  apply at this seat's level (federal vs. state), plus any issue this
 *  seat's data actually scores (issuesForSeatCard — never suppress real
 *  votes behind a static jurisdiction guess). */
export function seatOverviewAlignmentPct(
  seat: Pick<DelegationSeatVM, "alignmentEntry" | "level">,
  userIssues: UserIssue[],
): number | null {
  return computeOverallAlignmentPct(
    seat.alignmentEntry,
    issuesForSeatCard(userIssues, seat),
  );
}

export interface SeatIssueAlignmentRow {
  label: string;
  pct: number | null;
  fraction: string | null;
}

/** Per-issue alignment rows for a seat's overview card bars — same lookup
 *  (getScoreForIssue) and same pct math as AlignmentIssueRow. Every user
 *  issue eligible for this seat (issuesForSeatCard) gets exactly one row;
 *  an issue with no scoreable record renders the honest n/a state below,
 *  never suppressed (show-thin-records). */
export function seatIssueAlignmentRows(
  seat: Pick<DelegationSeatVM, "alignmentEntry" | "level">,
  userIssues: UserIssue[],
): SeatIssueAlignmentRow[] {
  return issuesForSeatCard(userIssues, seat).map((issue) => {
    const score = getScoreForIssue(seat.alignmentEntry, issue.canonicalIssue);
    const hasRecord = !!(score && score.total > 0);
    return {
      label: issue.interpretation,
      pct: hasRecord ? Math.round((score.kept / score.total) * 100) : null,
      fraction: hasRecord ? `${score.kept}/${score.total}` : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Money-influence derivations (money-redesign v2 — GAPS-AND-DATA-AUDIT.md §B1,
// §E). No LDA lobbying-position data exists in this repo, so "did the money
// vote?" is an honest proxy: for each issue-PAC cluster in a seat's
// donorCoalition that has a fixed stance ('in_favor' | 'opposed', never
// 'mixed') on a canonical issue, score the member's CURATED roll-calls for
// that issue — AlignmentScore.contributingVotes, the same 2-6 diagnostic
// votes AllVotesPanel/voteGroups.ts already surface, not the full `total`
// tally (GAPS: "curated votes per issue, not 18 lobbied bills") — against the
// PAC's direction. A voting_record AlignmentScore's `resolvedStance` is
// already the normalized 'in_favor' | 'opposed' the client sent
// (race-data.ts: `resolvedStance: issue.stance`), so it's directly
// comparable to `issuePacStance` with no free-text re-parsing.
//
// ONE core (scorePacVotesForIssue) computes the per-(issue, PAC) dot strip;
// deriveMoneyInfluence sums it across the user's issues and deriveVoteLinkage
// exposes the same per-entity strips for FundingSources — so the overview
// card, the seat card, and the funding-source rows can never drift apart
// (GAPS §E, "same numbers on overview card and seat card").
// ---------------------------------------------------------------------------

/** Minimal donorCoalition slice shape this module reads. Matches the real
 *  /api/race-data payload (race-data.ts `donorFieldsFromResult`): `alignsWith`
 *  + `issuePacStance`. `relevantToIssue` is an older prototype-mock alias,
 *  checked for parity with VoterChoiceApp's `deriveIssuePacAlignment`. */
export interface DonorCoalitionSlice {
  label: string;
  amount?: number;
  percent?: number;
  isIssuePAC?: boolean;
  alignsWith?: string;
  relevantToIssue?: string;
  issuePacStance?: "in_favor" | "opposed" | "mixed";
  fullName?: string;
  advocates?: string;
}

/** The subset of AlignmentScore this module reads. `resolvedStance` and
 *  `contributingVotes` are only populated for voting_record scores — a
 *  research (web_search) score has neither, so it never contributes here
 *  (honest gap, not a bug: GAPS §D9, survive missing data by omission). */
interface MoneyScoreLike {
  canonicalIssue: string;
  resolvedStance?: "in_favor" | "opposed";
  kept?: number;
  total?: number;
  contributingVotes?: Array<{ voteCast?: "with" | "against" }>;
}

function findIssuePacForIssue(
  donorCoalition: DonorCoalitionSlice[] | null | undefined,
  canonicalIssue: string,
): DonorCoalitionSlice | null {
  return (
    (donorCoalition || []).find(
      (s) =>
        s?.isIssuePAC &&
        (s.alignsWith === canonicalIssue ||
          s.relevantToIssue === canonicalIssue),
    ) ?? null
  );
}

export interface PacVoteScore {
  /** Curated votes that went the donors' way. */
  k: number;
  /** Curated votes scored (same denominator for k and userK). */
  n: number;
  /** Of the same n votes, how many went the USER's way ("your way" read). */
  userK: number;
  dots: Array<"w" | "a">;
  conflictsWithUser: boolean;
}

/**
 * Shared core: score one issue's curated contributing votes against one
 * issue-PAC's stance. null (honest gap) when the PAC has no fixed stance
 * ('mixed' / absent), the score has no resolved stance, or there are no
 * curated votes to check — every caller below is honest-null through this
 * single choke point, so the three surfaces can't disagree on WHEN to show
 * a number, only degrade together.
 */
function scorePacVotesForIssue(
  score: MoneyScoreLike | null | undefined,
  pac: DonorCoalitionSlice | null | undefined,
): PacVoteScore | null {
  if (!score?.resolvedStance || !pac?.issuePacStance) return null;
  if (pac.issuePacStance === "mixed") return null;
  const votes = score.contributingVotes || [];
  if (votes.length === 0) return null;

  const conflictsWithUser = pac.issuePacStance !== score.resolvedStance;
  const dots: Array<"w" | "a"> = votes.map((v) => {
    const withUser = v.voteCast === "with";
    const donorsWay = conflictsWithUser ? !withUser : withUser;
    return donorsWay ? "w" : "a";
  });
  return {
    k: dots.filter((d) => d === "w").length,
    n: dots.length,
    userK: votes.filter((v) => v.voteCast === "with").length,
    dots,
    conflictsWithUser,
  };
}

export interface MoneyInfluence {
  /** % of scored votes that went the donors' way. */
  pct: number;
  k: number;
  n: number;
  /** Member's alignment with the USER on the same n votes. */
  yourWayPct: number;
  /** "...including $X against your #1 · {issue}" clause data — null when
   *  not derivable (no rank-1 issue, or no opposing PAC on it). */
  topDollarAgainst: {
    amount: number;
    issue: string;
    canonicalIssue: string;
  } | null;
}

/**
 * The shared money-influence read (money-redesign v2 Frame 1 item 2 /
 * mny-verdict) — the SAME numbers the overview card and seat card both
 * render (GAPS §E). Wording contract for consumers (do not bake into this
 * helper): "{pct}% — on the issues their PAC donors target, this member's
 * votes went the donors' way ({k} of {n} scored votes)."
 * Honest-null: null when donorCoalition/alignmentEntry are missing, or no
 * user issue has both a matching issue-PAC (fixed stance) AND curated votes
 * to score — covers null donorCoalition, empty coalition, PAC clusters with
 * no canonical-issue stance, and a challenger with no roll-calls.
 */
export function deriveMoneyInfluence(
  seat: {
    candidate: { donorCoalition: DonorCoalitionSlice[] | null } | null;
    alignmentEntry: { scores: unknown[] | null } | null;
  },
  userIssues: UserIssue[],
): MoneyInfluence | null {
  const donorCoalition = seat.candidate?.donorCoalition;
  const scores = seat.alignmentEntry?.scores as
    MoneyScoreLike[] | null | undefined;
  if (!donorCoalition || donorCoalition.length === 0 || !Array.isArray(scores))
    return null;

  let k = 0;
  let n = 0;
  let userK = 0;
  for (const issue of userIssues || []) {
    if (!issue.canonicalIssue) continue;
    const score =
      scores.find((s) => s?.canonicalIssue === issue.canonicalIssue) ?? null;
    const pac = findIssuePacForIssue(donorCoalition, issue.canonicalIssue);
    const result = scorePacVotesForIssue(score, pac);
    if (!result) continue;
    k += result.k;
    n += result.n;
    userK += result.userK;
  }
  if (n === 0) return null;

  return {
    pct: Math.round((k / n) * 100),
    k,
    n,
    yourWayPct: Math.round((userK / n) * 100),
    topDollarAgainst: deriveTopDollarAgainst(donorCoalition, userIssues),
  };
}

/** "$X against your #1 issue" clause — the PAC-cluster total for the
 *  rank-1 user issue, ONLY when a matching issue-PAC opposes the user's own
 *  stated stance on it. Independent of vote scoring on purpose (a rank-1
 *  issue with no curated votes yet can still surface this clause). null
 *  when there's no explicit rank-1 issue, no matching PAC, or the PAC's
 *  stance isn't opposed (aligned/unknown ⇒ omit the clause, never invent
 *  a conflict). */
function deriveTopDollarAgainst(
  donorCoalition: DonorCoalitionSlice[],
  userIssues: UserIssue[],
): { amount: number; issue: string; canonicalIssue: string } | null {
  const top = (userIssues || []).find((i) => i.rank === 1 && i.canonicalIssue);
  if (!top || !top.canonicalIssue) return null;
  const pac = findIssuePacForIssue(donorCoalition, top.canonicalIssue);
  if (!pac?.issuePacStance || pac.issuePacStance === "mixed") return null;
  if (pac.issuePacStance === toStance(top.stance)) return null; // aligned
  return {
    amount: pac.amount || 0,
    issue: top.interpretation,
    canonicalIssue: top.canonicalIssue,
  };
}

export type IssueMoneyVerdictCls = "v-with" | "v-mixed" | "v-against";

export interface IssueMoneyVerdict {
  cls: IssueMoneyVerdictCls;
  label: string;
}

/**
 * Per-issue verdict chip (RepCard §1 `.iss-verdict`). Combines the vote side
 * (score.kept/score.total — the member's alignment with the user) with the
 * money side (the matching issue-PAC's stance vs. score.resolvedStance —
 * the same direction comparison deriveMoneyInfluence uses). null when there
 * is no matching issue-PAC with a fixed stance for this score's canonical
 * issue: this chip is specifically a money×vote read, and a pure vote status
 * with no PAC angle is already covered by the seat's regular alignment row.
 *
 * The whiteboard (frames 2-3, `.iss-verdict`) only shows three combinations:
 *   money-conflicts + vote-with-user      → v-mixed  "Votes yes, money says no"
 *   money-conflicts + vote-missing        → v-against "No record, money against"
 *   money-aligns    + vote-with-user      → v-with   "Votes & money align"
 * The other three cells (a scoreable vote that went AGAINST the user, in
 * either money direction) aren't in the design. This function fills them in
 * on the same with/mixed/against severity ladder rather than guessing at
 * unreviewed copy — see the report to Muxin/team-lead for the exact labels.
 */
export function deriveIssueMoneyVerdict(
  score:
    | {
        canonicalIssue?: string;
        resolvedStance?: "in_favor" | "opposed";
        kept?: number;
        total?: number;
      }
    | null
    | undefined,
  pacs: DonorCoalitionSlice[] | null | undefined,
): IssueMoneyVerdict | null {
  const canonicalIssue = score?.canonicalIssue;
  if (!canonicalIssue || !score?.resolvedStance) return null;
  const pac = findIssuePacForIssue(pacs, canonicalIssue);
  if (!pac?.issuePacStance || pac.issuePacStance === "mixed") return null;

  const conflictsWithUser = pac.issuePacStance !== score.resolvedStance;
  const hasVoteRecord =
    typeof score.total === "number" &&
    score.total > 0 &&
    typeof score.kept === "number";
  const voteWithUser = hasVoteRecord ? score.kept! * 2 >= score.total! : null;

  if (conflictsWithUser) {
    if (voteWithUser === null)
      return { cls: "v-against", label: "No record, money against" };
    if (voteWithUser)
      return { cls: "v-mixed", label: "Votes yes, money says no" };
    return { cls: "v-against", label: "Votes no, money against" };
  }
  if (voteWithUser === null)
    return { cls: "v-with", label: "No record, money aligns" };
  if (voteWithUser) return { cls: "v-with", label: "Votes & money align" };
  return { cls: "v-mixed", label: "Votes no, money aligns" };
}

export type VoteLinkageEntry =
  | { kind: "scored"; k: number; n: number; dots: Array<"w" | "a"> }
  | { kind: "unscored" }
  | { kind: "small" }
  | { kind: "large" }
  | { kind: "industry" };

/**
 * Per-funding-entity vote linkage for FundingSources' src-votes sub-block
 * (work order Frame 7) — same underlying scoring as deriveMoneyInfluence
 * (scorePacVotesForIssue), so a PAC's dot strip here always sums to the same
 * k/n that PAC contributed to the overview/seat-card number.
 *
 * Shape: Map<string, VoteLinkageEntry> keyed by the SAME string
 * FundingSources already renders as each row's visible name — fundingMix's
 * small/large rows use the fixed keys "small"/"large"; every donorCoalition
 * slice (issue-PAC or industry) is keyed by its own `label`, which is what
 * FundingSources reads into `r.name` for those rows. A consumer can do
 * `voteLinkage.get(row.key === "small" || row.key === "large" ? row.key :
 * row.name)` with no other plumbing. The two synthetic remainder rows
 * FundingSources computes itself ("industry-other", "pac-untraced") are
 * deliberately NOT in this map — there is no single donorCoalition entity
 * behind a remainder bucket to score, and the whiteboard's own copy for
 * those rows is a static "can't check" sentence, not a computed one.
 */
export function deriveVoteLinkage(seat: {
  candidate: {
    donorCoalition: DonorCoalitionSlice[] | null;
    fundingMix?: { small: number; large: number } | null;
  } | null;
  alignmentEntry: { scores: unknown[] | null } | null;
}): Map<string, VoteLinkageEntry> {
  const out = new Map<string, VoteLinkageEntry>();
  const donorCoalition = seat.candidate?.donorCoalition || [];
  const scores = (seat.alignmentEntry?.scores as MoneyScoreLike[] | null) || [];
  const fundingMix = seat.candidate?.fundingMix;

  if (fundingMix && fundingMix.small > 0) out.set("small", { kind: "small" });
  if (fundingMix && fundingMix.large > 0) out.set("large", { kind: "large" });

  for (const slice of donorCoalition) {
    if (!slice) continue;
    if (!slice.isIssuePAC) {
      out.set(slice.label, { kind: "industry" });
      continue;
    }
    const canonicalIssue = slice.alignsWith || slice.relevantToIssue;
    const score = canonicalIssue
      ? (scores.find((s) => s?.canonicalIssue === canonicalIssue) ?? null)
      : null;
    const result = scorePacVotesForIssue(score, slice);
    out.set(
      slice.label,
      result
        ? { kind: "scored", k: result.k, n: result.n, dots: result.dots }
        : { kind: "unscored" },
    );
  }
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
  issues: UserIssue[];
}): Promise<void> {
  if (countersSubmitted) return;
  countersSubmitted = true;
  try {
    await fetch("/api/counters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // County is intentionally never sent — we collect state-level only.
        sessionId: getChatSessionId(),
        stateCode: input.stateCode,
        primary: "GENERAL",
        // Redis counters: unchanged — mapped issues only.
        confirmedConcerns: (input.issues || [])
          .filter((i) => i.canonicalIssue)
          .map((i) => ({ canonicalIssue: i.canonicalIssue })),
        // Postgres event rows: every entry, including unmapped/off-topic.
        // No identifier, no address — state + issue signal only. The model's
        // short label is sent only for unmapped entries (taxonomy-gap signal);
        // never the voter's verbatim words.
        concernEvents: (input.issues || []).map((i) => ({
          canonicalIssue: i.canonicalIssue ?? null,
          offTopicLabel: i.canonicalIssue ? null : (i.interpretation ?? null),
          stance: i.stance ?? null,
          rank: i.rank ?? null,
          confidence: i.confidence ?? "clear",
          wasOffTopic: i.confidence === "off_topic",
        })),
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
