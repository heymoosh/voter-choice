"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  HandoffPackage,
  parseHandoffMarkers,
  buildContinuationPrompt,
  buildClientFallbackHandoff,
} from "./HandoffPackage";
import { BallotActions } from "./BallotActions";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import type { StateElectionData } from "../types/election";
import { generatePrompt } from "../lib/generatePrompt";
import type { PollingDataForPrompt } from "../lib/generatePrompt";
import { extractBallot, extractVoterProfile } from "../lib/ballot-utils";
import { ResearchPortfolio } from "./ResearchPortfolio";
import { MarkdownText } from "./MarkdownText";
import { ValuesTagSelector } from "./ValuesTagSelector";
import type { SubmitPayload, RankedEntry } from "./ValuesTagSelector";
import { RacePatterns } from "./RacePatterns";
import { ProcessingSteps } from "./ProcessingSteps";
import { CompareModal } from "./CompareModal";
import { AllVotesPanel } from "./AllVotesPanel";
import { AITimeoutBanner } from "./AITimeoutBanner";
import { ConcernInterpretation } from "./ConcernInterpretation";
import type { ConcernConfirmation } from "./ConcernInterpretation";
import { ColdOpenInput } from "./ColdOpenInput";
import { parseThemeExtraction } from "../lib/prompts/parse-theme-extraction";
import { parseThemeAmendment } from "../lib/prompts/parse-theme-amendment";
import type {
  Theme,
  RouterView,
  RouterTrigger,
  RaceType,
} from "../lib/prompts/types";
import { ThemeAmendEditor } from "./ThemeAmendEditor";
import { AmendDeltaMessage } from "./AmendDeltaMessage";
import { AmendRescoreOffer } from "./AmendRescoreOffer";
import {
  decideVerdict,
  type VerdictDecision,
  type RescoredRace,
} from "../lib/server/decide-verdict";
import { shouldSuggestAmend } from "../lib/chat-catch-heuristic";
import type { SerializableBallotContext } from "../lib/state-rules/ballot-context";
import { hasByokKey, streamWithByok } from "../lib/anthropic-client-byok";
import { prependSafetyHeader } from "../lib/prompts/safety-header";
import { normalizeCandidateName } from "../lib/normalizeCandidateName";
import { getCandidateIdentity } from "../lib/candidateIdentity";
import { anonymizeText } from "../lib/anonymizeText";
import {
  parseValuesTagRequestBlock,
  stripValuesTagRequestBlocks,
  hasOpenValuesTagRequestBlock,
  stripPartialValuesTagRequestBlock,
  parseRacePatternsBlock,
  stripRacePatternsBlocks,
  hasOpenRacePatternsBlock,
  stripPartialRacePatternsBlock,
  parseAlignmentScoresBlock,
  stripAlignmentScoresBlocks,
  hasOpenAlignmentScoresBlock,
  stripPartialAlignmentScoresBlock,
  parseConcernInterpretationBlock,
  stripConcernInterpretationBlocks,
  hasOpenConcernInterpretationBlock,
  stripPartialConcernInterpretationBlock,
} from "../lib/structured-blocks";
import type {
  AlignmentScoresEntry,
  AlignmentScoresBlock,
  RacePatternsBlock,
  RacePatternsCandidate,
  ConcernInterpretationEntry,
} from "../lib/structured-blocks";
import { getTodayInLatestUsZone } from "../lib/electionToday";
import type { GateVariant } from "./BudgetExhausted";
import type { Race } from "../lib/raceDeriver";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /**
   * P0 #1 (live audit) — when true, the message is part of the conversation
   * payload sent to /api/chat (so the model sees it as context) but is NOT
   * rendered in the visible message list. Used by the workspace auto-fire
   * effect to push a synthetic kickoff user message ("Introduce this race
   * and what's at stake for me.") without showing it to the voter. The
   * model's response streams in as the first VISIBLE bubble.
   */
  hidden?: boolean;
}

/**
 * Cold-open turn state machine (Phase 2 redesign — gated on
 * `promptFleetV2Enabled && lang === "en" && !themesLockedIn`).
 *
 *  - input:    free-form textarea visible; user may type and submit.
 *  - thinking: request in flight; we accumulate the model's text deltas
 *              into a local buffer and parse on done.
 *  - themes:   inferred themes rendered for review (ConcernInterpretation
 *              themes-mode → ThemeRanker).
 *  - error:    JSON parse failure; allow rewrite with the draft preserved.
 *
 * Locked-in state is tracked separately (`themesLockedIn`) because once
 * the user locks themes the cold open exits entirely; the workspace
 * (Phase 3) takes over. For Phase 2 we show a small confirmation panel.
 */
type ColdOpenPhase =
  | { kind: "input"; draft: string }
  | { kind: "thinking"; userText: string }
  | { kind: "themes"; themes: Theme[]; originalUserMessage: string }
  | { kind: "error"; message: string; draft: string };

type BudgetTier = "normal" | "notice" | "soft_close" | "handoff" | "exhausted";

interface BudgetStatus {
  tier: BudgetTier;
  percent: number;
}

type DisabledReason = "budget" | "session_limit" | "rate_limit";

interface SearchActivity {
  status: "searching" | "done";
  query?: string;
}

const SESSION_MESSAGE_LIMIT = 60;

const BUDGET_ERROR_CODES = new Set(["BUDGET_EXHAUSTED", "BUDGET_SOFT_CLOSE"]);
const RATE_ERROR_CODES = new Set([
  "SESSION_LIMIT",
  "CONCURRENT_LIMIT",
  "DAILY_LIMIT",
]);

const VALID_DEV_BUDGET_TIERS: ReadonlySet<BudgetTier> = new Set([
  "normal",
  "notice",
  "soft_close",
  "handoff",
  "exhausted",
]);

/**
 * Workspace mode (Phase 3). When the parent passes `activeRace` AND the
 * cold-open lock-in has happened, ChatPanel renders a workspace-shaped chat
 * with a header (`Race N of M` + label), a stub pick CTA, and an inline
 * WhyPrompt that captures the user's reason. Decisions are committed via the
 * `onCommitDecision` callback — they live in the parent's state, not in
 * ChatPanel.
 */
export interface WorkspaceModeProps {
  activeRace: {
    id: string;
    label: string;
    section: string;
    candidates?: { name: string; party: string }[];
  } | null;
  totalRaces: number;
  activeRaceIndex: number;
  /** Whether the active race already has a committed decision. */
  decided: boolean;
  /**
   * The race id that was active immediately before activeRace.id. Used to
   * inform the chat route's per-race history-reset contract (Phase 1 PR 2).
   * Parent tracks this across remounts via a ref.
   */
  prevActiveRaceId: string | null;
  onCommitDecision: (input: {
    raceId: string;
    raceLabel: string;
    section: string;
    pick: string;
    party?: string;
    whyNote: string;
  }) => void;
  onUnpickDecision: (raceId: string) => void;
  /* ── Phase 6 hooks ──────────────────────────────────────── */
  /**
   * Whether the amend editor is currently open and which entry path opened it.
   * Lifted to BallotToolClient so the editor survives race switches (ChatPanel
   * itself is keyed by activeRace.id and would otherwise wipe local state).
   */
  pendingAmendment?: {
    triggeringMessage?: string;
    candidateNewTheme?: Theme;
    /** "rail" → opened from the workspace rail; "chat" → from a catch chip. */
    entry: "rail" | "chat";
  } | null;
  /** When true, the editor renders its "Re-scoring your races…" state. */
  amendmentInFlight?: boolean;
  /** Currently-locked themes — read by both the editor and the chat-catch heuristic. */
  lockedThemes?: Theme[];
  /**
   * Fired when the user clicks "Lock these changes" in the editor. After PR3
   * this commits themes ONLY — the re-score (if any) happens later via the
   * `AmendRescoreOffer` Accept path. The parent uses this callback to set
   * `pendingRescoreOffer` if there are prior decisions worth re-scoring.
   */
  onAmendmentSave?: (payload: {
    updatedThemes: Theme[];
    newTheme?: Theme;
    suggestedRank?: number;
    /** The triggering message (for chat-catch entries) or undefined. */
    triggeringMessage?: string;
  }) => void;
  /**
   * Fired by ChatPanel right before and after the amend fetch starts/finishes
   * so the parent can flip `amendmentInFlight` and the editor's spinner
   * actually surfaces during the 1-3s rescore window. Without this the
   * spinner is invisible in production because `inFlight` is gated on the
   * parent's state and the fetch resolves before any flip.
   */
  onAmendmentInFlightChange?: (inFlight: boolean) => void;
  /** Fired when the user clicks "Discard amendment". */
  onAmendmentDiscard?: () => void;
  /**
   * Optional lookup: race id → human race label. Lets the amend delta message
   * render "U.S. House — TX-07" instead of the raw "us-house-tx-07" id. The
   * caller (BallotToolClient) builds this from `decisions` so only races the
   * user has actually decided are surfaced.
   */
  raceLabelLookup?: Record<string, string>;
  /**
   * Fired when the AI chat-catch judge decides the user's just-submitted
   * message names a NEW civic concern not covered by the locked themes.
   * After fix J this is driven by POST /api/chat-catch (a small Haiku
   * judgment) rather than a client-side keyword list, so the suggested
   * theme name comes from the model and is neutral by construction
   * (no advocacy verbs, no party labels).
   */
  onChatCatch?: (input: {
    message: string;
    suggestedThemeName: string;
    summary?: string;
  }) => void;
  /**
   * Currently-surfaced chat-catch chip suggestion (when any). When set,
   * ChatPanel renders the inline soft proposal in the message stream.
   */
  chatCatchSuggestion?: {
    triggeringMessage: string;
    candidateNewTheme: Theme;
  } | null;
  /** Fired when the user clicks the chat-catch chip to open the editor. */
  onChatCatchAccept?: () => void;
  /** Fired when the user dismisses the chat-catch chip. */
  onChatCatchDismiss?: () => void;
  /* ── PR3 opt-in re-score offer ──────────────────────────── */
  /**
   * When set, ChatPanel renders an `AmendRescoreOffer` inline asking the
   * user whether to re-evaluate already-decided races against the updated
   * themes. Set by the parent in its `onAmendmentSave` handler IFF there
   * are prior decisions to re-score; cleared by `onRescoreOfferClear`.
   */
  pendingRescoreOffer?: {
    newThemeName: string;
    decidedCount: number;
    updatedThemes: Theme[];
    newTheme?: Theme;
    suggestedRank?: number;
    triggeringMessage?: string;
  } | null;
  /**
   * Fired when the user accepts OR declines the re-score offer (in both
   * cases the offer state should clear; on accept ChatPanel ALSO fires the
   * amend chat call internally before this is called).
   */
  onRescoreOfferClear?: () => void;
  /**
   * Previously-committed decisions on OTHER races in the same session.
   * Used to render the `decidedSummary` slice of `raceContext` for the
   * race-deep-dive builder so the model knows which races are already
   * settled. Optional — when empty/absent the chat payload emits
   * `decidedSummary: "(none)"`.
   *
   * Shape matches `BallotPane.Decision` deliberately (string-typed
   * structural fields only) so the parent can pass its `decisions` state
   * through without any reshape.
   */
  decisions?: ReadonlyArray<{
    raceId: string;
    raceLabel: string;
    section: string;
    pick: string;
    party?: string;
    whyNote: string;
  }>;
  /**
   * Two-letter state code parsed from the uploaded ballot's
   * `election_metadata.jurisdiction` (e.g. "Camden County, NJ" → "NJ"). When
   * present, takes precedence over the ZIP-derived `state.stateCode` for
   * the chat prompt's `<race>` context — the model needs the state field
   * to agree with the candidates roster, and the ballot is closer to
   * ground truth than the home-screen address picker.
   *
   * Prod prompt-conflict story: a NJ ballot upload paired with an
   * ambiguous address (or a session whose state was first set from
   * a different geography) made the prompt assemble
   * `<race> U.S. Senate, TX-Camden </race>` while the candidates roster
   * carried NJ-shaped names (Audubon Borough, county-committee races).
   * The model reasonably halted to clarify instead of emitting cards.
   * This override removes that conflict at the source.
   */
  extractedStateCode?: string | null;
  /**
   * Cards-first data source (PIVOT). The deterministic, LLM-free
   * `/api/race-data` result for the active race, fetched by the parent
   * (WorkspaceShell via `useRaceData`). When present, the workspace center
   * renders candidate cards FROM THIS — not from a parsed chat message. The
   * chat is demoted to the bottom Q&A box. Null until the first fetch
   * resolves (the `raceDataLoading` flag drives the loader meanwhile).
   *
   * Shape mirrors the `RaceData` returned by `/api/race-data`:
   * `{ racePatterns, alignmentScores, legislativeCoverage }`.
   */
  raceData?: {
    racePatterns: RacePatternsBlock;
    alignmentScores: AlignmentScoresBlock | null;
    legislativeCoverage: boolean;
  } | null;
  /** True while the active race's `/api/race-data` fetch is in flight. */
  raceDataLoading?: boolean;
}

interface ChatPanelProps {
  state: StateElectionData;
  zipCode: string;
  pollingData?: PollingDataForPrompt | null;
  onBudgetUpdate?: (budget: BudgetStatus) => void;
  voterProfile?: string | null;
  countyName?: string;
  userSampleBallotText?: string;
  preResearchContext?: string;
  /**
   * Cross-file contract (BallotToolClient.tsx parallel agent).
   * All props below are optional so ResearchLayout callers that omit them
   * keep working without changes.
   */
  /** When true, candidate names are hidden until individually revealed. Default false. */
  blindMode?: boolean;
  /** Set of candidateIds the voter has individually revealed. Default new Set(). */
  revealedCandidates?: Set<string>;
  /** Called when a voter taps "Reveal" on a single candidate card. */
  onRevealCandidate?: (id: string) => void;
  /** Called to toggle blind mode on/off globally. */
  onToggleBlindMode?: () => void;
  /** Issue-level concern interpretations for CompareModal per-issue rows. Default []. */
  issues?: ConcernInterpretationEntry[];
  /** Called when voter re-anonymizes a previously revealed candidate card. */
  onHideCandidate?: (id: string) => void;
  /**
   * Phase 5 — the ballot context emitted by the new PartyGate. When set,
   * every outgoing chat request carries this so the route can inject a
   * `<ballot_context>` tag into the system prompt. Null until the gate
   * resolves (or always-null for flag-off / ES paths that keep the legacy
   * preResearchContext plumbing).
   */
  ballotContext?: SerializableBallotContext | null;
  /** Primary lane for polis counter (derived from runoff gate). */
  primary?: "DEM" | "REP" | "OPEN" | "GENERAL";
  /**
   * Phase 3 — when present, ChatPanel renders the workspace-mode chat (header
   * + pick stub + WhyPrompt). When absent, ChatPanel renders the legacy
   * cold-open/research chat surface.
   */
  workspace?: WorkspaceModeProps;
  /**
   * Phase 3 — fired when the user locks in themes during cold-open. Parents
   * use this to flip into workspace mode. ChatPanel still tracks the lock
   * internally (so the cold-open UI hides correctly) but pushes the themes
   * up so workspace state can land in ElectionResult.
   */
  onLockInThemes?: (themes: Theme[]) => void;
  /**
   * Fired exactly once when the chat transitions from empty to having any
   * message. Used by parents to hide pre-session UI (e.g. ProfileUpload)
   * once the user is actively in a session.
   */
  onChatStarted?: () => void;
  /**
   * Phase 2 redesign — forwarded from page.tsx via the prop chain. Gates
   * the new free-form cold-open UI. The cold-open UI only renders when
   * this is true AND locale is `en` AND the chat is still on its first
   * turn. Otherwise the legacy auto-session + chip-picker flow runs.
   * Defaults to false so callers that haven't adopted the flag keep
   * legacy behavior.
   *
   * See .ai/work-packets/redesign-phase-2-free-form-cold-open.md.
   */
  promptFleetV2Enabled?: boolean;
  /**
   * PR 6 fix D — ballot-before-themes. Defensive gate so the cold-open
   * theme-extraction textarea only renders when a ballot has been confirmed
   * (either Civic returned races OR the user pasted/uploaded one via
   * `BallotLookupNeeded`). Parent (`ElectionResult`) ALSO short-circuits
   * the entire ResearchLayout when ballotStep === "needs-ballot", so this
   * is belt-and-suspenders — but it keeps the cold-open render condition
   * single-sourced inside ChatPanel for readability.
   *
   * Defaults to `true` so legacy flag-off / ES callers (and existing tests)
   * stay unchanged.
   */
  ballotConfirmed?: boolean;
  /**
   * Phase 9 — fired when the chat route returns the structured
   * `{ status: "budget_exhausted", resetAt, handoffPrompt }` response. The
   * parent should mount the BudgetExhausted continuity screen instead of
   * surfacing this as an error. Without this prop ChatPanel falls back to
   * its legacy error surface (so flag-off callers stay unchanged).
   */
  onBudgetExhausted?: (input: {
    handoffPromptText: string;
    resetAt: string;
    variant: GateVariant;
  }) => void;
  /**
   * PR 7 — externally controlled budget-exhausted signal from the parent
   * (BallotToolClient.WorkspaceShell). True when the overlay is mounted or
   * when the parent has otherwise concluded the community budget is out.
   * OR'd with the SSE-tier-derived internal `budgetExhausted` so the
   * workspace chat input shows the disabled-with-notice state even when
   * the overlay was triggered pre-emptively via "Continue elsewhere"
   * (where the SSE tier hasn't necessarily flipped yet).
   *
   * If a BYOK key is set in localStorage, the input stays interactive
   * regardless of this prop — BYOK bypasses the community budget.
   */
  budgetExhausted?: boolean;
  /**
   * The gate variant that triggered the budget-exhausted state, passed
   * from the parent's `budgetOut` state. Controls inline gated-input copy.
   * When `budgetExhausted` is true but this is not supplied (e.g. the SSE
   * tier path), defaults to `"community_budget"`.
   */
  gateVariant?: GateVariant;
  /**
   * PR B — anchored-location context surfaced as a mono breadcrumb above
   * the cold-open chat. Mirrors the prototype's `.co-context` row
   * (e.g. "Camden County, NJ-1 · 6 races on your ballot"). Only rendered
   * during the cold-open phase (`promptFleetV2 && en && !themesLockedIn`).
   * Defaults to undefined for legacy callers; when omitted the breadcrumb
   * simply doesn't render.
   */
  coldOpenContext?: {
    /** City + state OR county + state (PII rule: no street address). */
    cityState: string;
    /** Optional congressional district label, e.g. "NJ-1". */
    district?: string;
    /** Number of races derived for the ballot, used in the breadcrumb. */
    raceCount: number;
  };
}

const SESSION_ID_STORAGE_KEY = "voter-choice:sessionId";

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Initialize the per-browser-session ID. Persists in `sessionStorage` (not
 * localStorage) so the ID survives page reloads / SPA navigations within the
 * tab but resets when the tab/window closes — matching the user's intuition
 * of "one ballot research session". Without this, every reload generated a
 * fresh sessionId and consumed a new slot in the server-side daily quota
 * (CHAT_DAILY_SESSION_LIMIT, default 10), causing the user-reported
 * "daily session limit reached" with monthly budget still remaining. SSR
 * safe: returns a fresh id when `sessionStorage` is unavailable.
 */
function initSessionId(): string {
  if (typeof window === "undefined") return generateSessionId();
  try {
    const existing = window.sessionStorage.getItem(SESSION_ID_STORAGE_KEY);
    if (existing && typeof existing === "string" && existing.length > 0) {
      return existing;
    }
  } catch {
    // sessionStorage unavailable (Safari private mode, etc.) — fall through
    // to fresh id; the user just won't get cross-reload session continuity.
  }
  const fresh = generateSessionId();
  try {
    window.sessionStorage.setItem(SESSION_ID_STORAGE_KEY, fresh);
  } catch {
    // Same fall-through as above.
  }
  return fresh;
}

interface StreamCallbacks {
  onText: (text: string) => void;
  onDone: (budget: BudgetStatus) => void;
  onError: (error: string) => void;
  onSearching?: () => void;
  onSearchingDone?: (query?: string) => void;
}

function processSSELine(line: string, cb: StreamCallbacks) {
  if (!line.startsWith("data: ")) return;
  try {
    const data = JSON.parse(line.slice(6));
    if (data.type === "text") cb.onText(data.text);
    else if (data.type === "done" && data.budget) cb.onDone(data.budget);
    else if (data.type === "error") cb.onError(data.error);
    else if (data.type === "searching") cb.onSearching?.();
    else if (data.type === "searching_done") cb.onSearchingDone?.(data.query);
  } catch {
    // Skip malformed SSE lines
  }
}

async function streamResponse(response: Response, cb: StreamCallbacks) {
  const reader = response.body?.getReader();
  if (!reader) {
    cb.onError("Failed to read response.");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      processSSELine(line, cb);
    }
  }
}

function getDisabledReason(code: string): DisabledReason | null {
  if (BUDGET_ERROR_CODES.has(code)) return "budget";
  if (RATE_ERROR_CODES.has(code)) return "rate_limit";
  return null;
}

/**
 * Map an error code to the GateVariant that controls which copy the
 * BudgetExhausted overlay renders. Consistent with the existing
 * BUDGET_ERROR_CODES / RATE_ERROR_CODES sets.
 */
function getGateVariant(code: string): GateVariant {
  if (BUDGET_ERROR_CODES.has(code)) return "community_budget";
  if (code === "DAILY_LIMIT") return "daily_limit";
  if (code === "CONCURRENT_LIMIT") return "concurrent_limit";
  if (code === "SESSION_LIMIT") return "session_limit";
  if (code === "RATE_LIMIT_UNAVAILABLE") return "service_unavailable";
  // Unknown codes fall back to community_budget (safe default).
  return "community_budget";
}

/**
 * Error codes the API can return that warrant surfacing the full
 * BudgetExhausted overlay (handoff prompt + BYOK + chatbot links) rather
 * than the lesser inline "chat-disabled" text stub. Fix for live bug 3:
 * `DAILY_LIMIT` was rendering as inline text only, leaving the user
 * staring at the message without a way to continue their research.
 */
const OVERLAY_HANDOFF_CODES: ReadonlySet<string> = new Set([
  "BUDGET_EXHAUSTED",
  "BUDGET_SOFT_CLOSE",
  "DAILY_LIMIT",
  "CONCURRENT_LIMIT",
  "SESSION_LIMIT",
  // Transient backing-store outage: still surface the continuity overlay so
  // the user can hand off to another chatbot, but it's deliberately NOT in
  // RATE_ERROR_CODES — the main path treats it as a retryable error rather
  // than hard-disabling chat.
  "RATE_LIMIT_UNAVAILABLE",
]);

function shouldRouteToOverlay(code: string | undefined): boolean {
  return !!code && OVERLAY_HANDOFF_CODES.has(code);
}

/**
 * Default `resetAt` ISO for the BudgetExhausted overlay when the server
 * didn't supply one (e.g. rate-limit 429 paths). DAILY_LIMIT resets at
 * next UTC midnight; the monthly budget resets on the 1st. We use the
 * sooner of "tomorrow UTC midnight" or "next UTC month start", which
 * for daily limits ends up being tomorrow midnight — the more useful
 * value to show in the overlay's countdown.
 */
function defaultRateLimitResetAtISO(): string {
  const next = new Date();
  next.setUTCHours(24, 0, 0, 0);
  return next.toISOString();
}

function getDisabledMessage(
  reason: DisabledReason | null,
  t: (typeof translations)["en"],
): string {
  if (reason === "session_limit") return t.rateLimit.sessionLimit;
  if (reason === "rate_limit") return t.rateLimit.ipLimit;
  return t.budget.exhausted;
}

/**
 * Format the workspace's locked themes as the `themesList` string expected
 * by the race-deep-dive / proposition / amendment prompt builders. Empty
 * themes → empty string; consumers treat empty as "no themes" without any
 * special-casing on the builder side.
 *
 * Module-scoped (not nested in ChatPanel) so the call sites in the
 * workspace chat payload stay at a low cyclomatic complexity.
 */
function formatThemesList(themes: ReadonlyArray<Theme> | undefined): string {
  return (themes ?? []).map((t, i) => `${i + 1}. ${t.name}`).join("; ");
}

/**
 * Format the workspace's prior decisions as the `decidedSummary` string
 * expected by the race-deep-dive prompt builder. Returns "(none)" when
 * there are no decisions yet so the model knows the slate is empty
 * (vs. "data missing"). Each decision renders as
 * `<raceLabel>: <pick> (<party>) — <whyNote>` with party + whyNote
 * suffixes only when present.
 */
function formatDecidedSummary(
  decisions: WorkspaceModeProps["decisions"] | undefined,
): string {
  if (!decisions || decisions.length === 0) return "(none)";
  return decisions
    .map((d) => {
      const partySuffix = d.party ? ` (${d.party})` : "";
      const why = d.whyNote ? ` — ${d.whyNote}` : "";
      return `${d.raceLabel}: ${d.pick}${partySuffix}${why}`;
    })
    .join("\n");
}

/* ── Sub-components ─────────────────────────────────────────── */

function SearchActivityIndicator({ activity }: { activity: SearchActivity }) {
  const { lang } = useLanguage();
  const isSearching = activity.status === "searching";
  const label = isSearching
    ? lang === "es"
      ? "Buscando en la web…"
      : "Searching the web…"
    : lang === "es"
      ? "Búsqueda lista"
      : "Search complete";

  return (
    <div
      data-testid="search-activity-indicator"
      className="mb-4 flex items-center gap-2 text-xs text-on-surface-muted"
    >
      <span
        className={
          "inline-block w-2 h-2 rounded-full " +
          (isSearching ? "bg-primary animate-pulse" : "bg-primary/60")
        }
      />
      <span className="font-medium">{label}</span>
      {activity.query && (
        <span className="italic truncate max-w-xs">
          &ldquo;{activity.query}&rdquo;
        </span>
      )}
    </div>
  );
}

function ChatMessageBubble({
  msg,
  isLast,
  isStreaming,
  isFirstUser,
}: {
  msg: ChatMessage;
  isLast: boolean;
  isStreaming: boolean;
  isFirstUser?: boolean;
}) {
  if (msg.role === "user") {
    // The first user message is the auto-generated context block — show only
    // the intro line (before the first newline) and hide the long payload.
    const displayContent = isFirstUser
      ? msg.content.split("\n")[0]
      : msg.content;

    return (
      <article className="max-w-3xl mx-auto">
        <div className="flex flex-col items-end gap-1.5">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
            You
          </span>
          <div
            className="max-w-md bg-ink text-paper px-4 py-3 text-sm leading-relaxed shadow-sm"
            style={{ borderRadius: "14px 14px 4px 14px" }}
            data-testid="chat-message-user"
          >
            <MarkdownText text={displayContent} />
          </div>
        </div>
      </article>
    );
  }

  const showActions = !isStreaming || !isLast;
  const isCurrentlyStreaming = isStreaming && isLast;
  const displayContent = msg.content;

  return (
    <article data-testid="chat-message-assistant" className="max-w-3xl mx-auto">
      <div className="flex flex-col items-start gap-1.5">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
          Voter Choice · AI
        </span>
        <div
          className="bg-paper-2 border border-rule px-4 py-3 text-sm leading-relaxed text-ink w-full"
          style={{ borderRadius: "4px 14px 14px 14px" }}
        >
          <MarkdownText text={displayContent} />
          {isCurrentlyStreaming && (
            <span className="inline-block w-1.5 h-4 bg-civic ml-0.5 animate-pulse" />
          )}
        </div>
      </div>

      {showActions && <BallotActions content={displayContent} />}
    </article>
  );
}

function ChatInput({
  onSubmit,
  isStreaming,
}: {
  onSubmit: (message: string) => void;
  isStreaming: boolean;
}) {
  const [input, setInput] = useState("");
  const { lang } = useLanguage();
  const t = translations[lang];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-surface-lowest border-2 border-primary/20 focus-within:border-primary transition-colors shadow-xl">
        <div className="p-3 md:p-4 flex flex-col">
          <label
            className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2"
            htmlFor="chat-input"
          >
            {t.research.deepSearchLabel}
          </label>
          <div className="flex items-end gap-2 md:gap-4">
            <textarea
              data-testid="chat-input"
              id="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={t.research.deepSearchPlaceholder}
              disabled={isStreaming}
              rows={2}
              className="flex-1 bg-transparent border-none focus:ring-0 p-0 text-on-surface placeholder:text-on-surface-muted/60 text-sm font-medium resize-none leading-relaxed disabled:opacity-50"
            />
            <button
              data-testid="chat-send"
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="bg-primary text-on-primary p-3 flex items-center justify-center min-h-[44px] min-w-[44px] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transition-colors shrink-0 active:scale-95"
              aria-label={lang === "es" ? "Enviar" : "Send"}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M3.5 10L16.5 3.5L10 16.5L8.5 11.5L3.5 10Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-center mt-3 text-on-surface-muted font-bold uppercase tracking-wider opacity-60">
        {t.research.nonPartisanNotice}
      </p>
    </form>
  );
}

/* ── Cold-open surface (Phase 2) ───────────────────────────── */

/**
 * ColdOpenSurface — render the appropriate cold-open phase. Owns no
 * state beyond what the parent passes in; each phase delegates back to
 * the parent for transitions.
 *
 * The phase machine is in ChatPanel; this component is purely
 * presentational so the parent can compose it inside the existing
 * `chat-window` shell.
 */
function ColdOpenSurface({
  phase,
  onSubmit,
  onLockIn,
  onRewrite,
  onPhaseChange,
  chatDisabled,
  t,
  coldOpenContext,
}: {
  phase: ColdOpenPhase;
  onSubmit: (text: string) => void;
  onLockIn: (themes: Theme[]) => void;
  onRewrite: () => void;
  onPhaseChange: (next: ColdOpenPhase) => void;
  chatDisabled: boolean;
  t: (typeof translations)["en"];
  coldOpenContext?: ChatPanelProps["coldOpenContext"];
}) {
  if (phase.kind === "thinking") {
    return (
      <div
        data-testid="cold-open-thinking"
        className="my-4 bg-paper-2 border border-rule rounded-xl p-4 flex items-center gap-3 animate-pulse"
      >
        <svg
          className="w-4 h-4 text-civic shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
          {t.research.coldOpenThinking}
        </span>
      </div>
    );
  }

  if (phase.kind === "themes") {
    return (
      <ConcernInterpretation
        themes={phase.themes}
        originalUserMessage={phase.originalUserMessage}
        onLockIn={onLockIn}
        onRewrite={onRewrite}
      />
    );
  }

  // input or error
  const draft = phase.kind === "error" ? phase.draft : phase.draft;
  return (
    <div className="space-y-3">
      {/* PR B — anchored-location breadcrumb above the chat. Mono
          micro-label with a civic-green dot. Renders only when the
          parent supplies coldOpenContext (the prototype's `.co-context`
          row from prototype-views.jsx ColdOpenView line 174). */}
      {coldOpenContext && (
        <div
          data-testid="co-context-breadcrumb"
          className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3"
        >
          {/* PR C — civic-green dot from prototype.css `.co-context::before`
              (rule line 348). Tagged with a stable data-testid so the
              cross-PR contract checks can assert presence and color. */}
          <span
            data-testid="co-context-dot"
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full bg-civic"
          />
          <span>
            <b className="font-sans font-semibold text-[13.5px] normal-case tracking-normal text-ink">
              {coldOpenContext.cityState}
            </b>
            {coldOpenContext.district ? (
              <> · {coldOpenContext.district}</>
            ) : null}
            {" · "}
            {t.research.coldOpenContextRaceCount(coldOpenContext.raceCount)}
          </span>
        </div>
      )}
      {/* PR B — static AI opener bubble. Mirrors prototype-views.jsx
          ColdOpenView lines 176-182. Deterministic copy, no LLM call. */}
      <article
        data-testid="cold-open-ai-opener"
        className="flex max-w-3xl mx-auto flex-col items-start gap-1.5"
      >
        <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
          Voter Choice · AI
        </span>
        <div
          className="bg-paper-2 border border-rule px-4 py-3.5 text-[14.5px] leading-relaxed text-ink w-full"
          style={{ borderRadius: "4px 14px 14px 14px" }}
        >
          <p className="m-0">{t.research.coldOpenAiOpenerLead}</p>
          <p className="mt-2.5 m-0 font-semibold">
            {t.research.coldOpenAiOpenerPrompt}
          </p>
        </div>
      </article>
      {phase.kind === "error" && (
        <div
          data-testid="cold-open-error"
          role="status"
          className="bg-paper-2 border border-rule border-l-4 border-l-vote-red rounded p-3 text-xs text-ink-2"
        >
          {phase.message}
        </div>
      )}
      <ColdOpenInput
        initialDraft={draft}
        onSubmit={(text) => {
          onPhaseChange({ kind: "input", draft: text });
          onSubmit(text);
        }}
        onStarterProfileLoaded={(themes, originalText) => {
          // The starter-profile chip bypasses Haiku extraction entirely
          // — the user has already named their priorities on a prior
          // visit, so we jump straight to the themes-confirm step.
          // The lock-in / rewrite flow downstream reads the same shape
          // as a Haiku-extracted themes payload, so no other code path
          // needs to change.
          onPhaseChange({
            kind: "themes",
            themes,
            originalUserMessage: originalText,
          });
        }}
        disabled={chatDisabled}
      />
    </div>
  );
}

/**
 * ColdOpenLockedPanel — confirmation surface shown after lock-in. The
 * workspace transition (Phase 3) takes over here in a follow-up packet;
 * for Phase 2 we render a simple read-only view so the e2e and
 * integration tests have a concrete post-lock target.
 */
function ColdOpenLockedPanel({
  themes,
  t,
}: {
  themes: Theme[];
  t: (typeof translations)["en"];
}) {
  return (
    <section
      data-testid="cold-open-locked"
      className="bg-paper-2 border border-rule rounded-xl p-4 md:p-5 space-y-3"
    >
      <header>
        <h3 className="font-serif text-lg md:text-xl font-semibold text-ink leading-tight tracking-tight">
          {t.research.coldOpenLockedHeading}
        </h3>
        <p className="mt-1 text-xs text-ink-3">
          {t.research.coldOpenLockedSubhead}
        </p>
      </header>
      <ol className="list-decimal pl-6 space-y-1">
        {themes.map((theme, i) => (
          <li
            key={`${i}-${theme.name}`}
            data-testid={`cold-open-locked-theme-${i}`}
            className="font-serif text-base font-semibold text-ink"
          >
            {theme.name}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ── Hooks ──────────────────────────────────────────────────── */

function useHandoffState(
  messages: ChatMessage[],
  isStreaming: boolean,
  chatDisabled: boolean,
  disabledReason: DisabledReason | null,
  basePrompt: string,
  zipCode: string,
) {
  const lastAssistantMsg = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  const parsedHandoff =
    lastAssistantMsg && !isStreaming
      ? parseHandoffMarkers(lastAssistantMsg.content)
      : null;

  const continuationPrompt = parsedHandoff
    ? buildContinuationPrompt(
        basePrompt,
        parsedHandoff.voterProfile,
        parsedHandoff.handoffBlock,
      )
    : "";

  const needsClientFallback =
    chatDisabled &&
    !parsedHandoff &&
    messages.length > 0 &&
    (disabledReason === "budget" || disabledReason === "session_limit");
  const clientFallback = needsClientFallback
    ? buildClientFallbackHandoff(messages, zipCode)
    : null;
  const clientContinuationPrompt = clientFallback
    ? buildContinuationPrompt(
        basePrompt,
        clientFallback.voterProfile,
        clientFallback.handoffBlock,
      )
    : "";

  return {
    parsedHandoff,
    continuationPrompt,
    clientFallback,
    clientContinuationPrompt,
  };
}

/* ── Values tag selector rendering ─────────────────────────── */

function ValuesTagSelectorLoadingPlaceholder() {
  const { lang } = useLanguage();
  const label =
    lang === "es"
      ? "Construyendo selector de temas…"
      : "Building issue picker…";
  return (
    <div
      data-testid="values-tag-selector-loading"
      className="my-4 bg-surface-low border-l-4 border-primary/40 p-4 flex items-center gap-3 animate-pulse"
    >
      <svg
        className="w-4 h-4 text-primary shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      <span className="text-xs font-bold uppercase tracking-widest text-on-surface-muted">
        {label}
      </span>
    </div>
  );
}

function renderValuesTagSelector(
  msg: ChatMessage,
  idx: number,
  isLastAssistant: boolean,
  isStreaming: boolean,
  isSubmitted: boolean,
  submittedRanked: RankedEntry[],
  onSubmit: (selection: SubmitPayload) => void,
): React.ReactElement | null {
  if (msg.role !== "assistant" || !isLastAssistant) return null;

  // Streaming placeholder: half-emitted block during stream
  if (isStreaming) {
    const isOpenBlock = hasOpenValuesTagRequestBlock(msg.content);
    const parsedDuringStream = parseValuesTagRequestBlock(msg.content);
    if (isOpenBlock && !parsedDuringStream) {
      const leadIn = stripPartialValuesTagRequestBlock(msg.content);
      return (
        <article
          key={idx}
          data-testid="chat-message-assistant"
          className="max-w-3xl mx-auto"
        >
          {leadIn && (
            <div className="text-sm leading-relaxed text-on-surface">
              <MarkdownText text={leadIn} />
            </div>
          )}
          <ValuesTagSelectorLoadingPlaceholder />
        </article>
      );
    }
    return null;
  }

  if (!msg.content.includes("[/VALUES_TAG_REQUEST]")) return null;
  const block = parseValuesTagRequestBlock(msg.content);
  if (!block) return null;

  const prose = stripValuesTagRequestBlocks(msg.content);
  return (
    <article
      key={idx}
      data-testid="chat-message-assistant"
      className="max-w-3xl mx-auto space-y-4"
    >
      {prose && (
        <div className="text-sm leading-relaxed text-on-surface">
          <MarkdownText text={prose} />
        </div>
      )}
      <ValuesTagSelector
        block={block}
        isSubmitted={isSubmitted}
        submittedRanked={submittedRanked}
        onSubmit={onSubmit}
      />
    </article>
  );
}

/* ── Race patterns rendering ────────────────────────────────── */

function RacePatternsLoadingPlaceholder({
  variant = "race",
}: {
  variant?: "race" | "alignment";
}) {
  const { lang } = useLanguage();
  const es = lang === "es";
  // This is the slow step the user flagged (2026-05): after issues are locked,
  // the workspace auto-opens the first race and the /api/chat deep-dive streams
  // the candidate cards + alignment scores — a real 10–30s wait. Per product
  // direction we surface the prototype's multi-step processing UI here (the
  // same UI prototype uses for ballot extraction), tuned to the candidate-
  // assessment work. NOT used on the fast ballot upload. `variant` is retained
  // for call-site compatibility; both narrate the same assessment arc.
  // NEEDS-KEY: workspace.assessing* — EN below / ES inline (this component
  // already localized its loader strings inline pre-redesign).
  void variant;
  const content = es
    ? {
        eyebrow: "Evaluando candidatos",
        heading: "Comparando cada candidato con tus prioridades.",
        steps: [
          "Leyendo tus prioridades",
          "Revisando el historial de cada candidato",
          "Calculando la alineación con tus prioridades",
          "Preparando tu comparación de candidatos",
        ],
        hint: "Anthropic está leyendo el historial de cada candidato, comparándolo con las prioridades que clasificaste y midiendo qué tan bien se alinean. Esto suele tardar de 10 a 30 segundos — no actualices; tu progreso se guarda en este dispositivo.",
      }
    : {
        eyebrow: "Assessing candidates",
        heading: "Matching each candidate to your issues.",
        steps: [
          "Reading your issues",
          "Pulling each candidate's record",
          "Scoring alignment with your issues",
          "Building your candidate comparison",
        ],
        hint: "Anthropic is reading each candidate's record, matching it to the issues you ranked, and scoring how well they align. This usually takes 10–30 seconds — don't refresh; your progress is saved on this device.",
      };
  return (
    <div data-testid="race-patterns-loading" className="my-4">
      <ProcessingSteps
        eyebrow={content.eyebrow}
        heading={content.heading}
        steps={content.steps}
        hint={content.hint}
      />
    </div>
  );
}

function renderRacePatterns(
  msg: ChatMessage,
  idx: number,
  isLastAssistant: boolean,
  isStreaming: boolean,
  submittedEntry: { submitted: boolean; pickedId: string | null },
  onPick: (candidateId: string, candidateName: string) => void,
  onSkip: () => void,
  parentIsStreaming: boolean,
  blindMode?: boolean,
  revealedCandidates?: Set<string>,
  onRevealCandidate?: (id: string) => void,
  onCompare?: () => void,
  onSeeAllVotes?: (payload: {
    candidate: RacePatternsCandidate;
    alignmentEntry: AlignmentScoresEntry | undefined;
    blindMode: boolean;
    alias: string;
  }) => void,
  onHideCandidate?: (id: string) => void,
): React.ReactElement | null {
  if (msg.role !== "assistant") return null;

  // Streaming placeholder: half-emitted block during stream. Only applies to
  // the live (last) assistant — a prior assistant message that already
  // carries a finished [RACE_PATTERNS] block must keep rendering its cards
  // once a follow-up turn starts streaming.
  if (isStreaming && isLastAssistant) {
    const isOpenRaceBlock = hasOpenRacePatternsBlock(msg.content);
    const isOpenAlignmentBlock = hasOpenAlignmentScoresBlock(msg.content);
    const parsedDuringStream = parseRacePatternsBlock(msg.content);
    // Show placeholder if any relevant block is open (race or alignment),
    // OR if race block is still being built. When alignment block is open but
    // race block is complete, we still wait for alignment to finish.
    const anyBlockOpen = isOpenRaceBlock || isOpenAlignmentBlock;
    if (anyBlockOpen && (!parsedDuringStream || isOpenAlignmentBlock)) {
      // Strip both partial blocks to get clean lead-in prose
      const leadIn = stripPartialAlignmentScoresBlock(
        stripPartialRacePatternsBlock(msg.content),
      );
      // When race block already parsed and only alignment is still open,
      // show the alignment-scores variant of the skeleton.
      const variant: "race" | "alignment" =
        !isOpenRaceBlock && isOpenAlignmentBlock ? "alignment" : "race";
      return (
        <article
          key={idx}
          data-testid="chat-message-assistant"
          className="max-w-3xl mx-auto"
        >
          {leadIn && (
            <div className="text-sm leading-relaxed text-on-surface">
              <MarkdownText text={leadIn} />
            </div>
          )}
          <RacePatternsLoadingPlaceholder variant={variant} />
        </article>
      );
    }
    return null;
  }

  if (!msg.content.includes("[/RACE_PATTERNS]")) return null;
  const block = parseRacePatternsBlock(msg.content);
  if (!block) return null;

  // Parse the optional sibling alignment scores block (same race)
  let alignmentScoresByCandidate: Map<string, AlignmentScoresEntry> | undefined;
  if (msg.content.includes("[/ALIGNMENT_SCORES]")) {
    const alignmentBlock = parseAlignmentScoresBlock(msg.content);
    if (alignmentBlock && alignmentBlock.race === block.race) {
      alignmentScoresByCandidate = new Map(
        alignmentBlock.entries.map((e) => [e.candidateId, e]),
      );
    }
  }

  // Strip both block types and values-tag-request blocks from prose
  const prose = stripValuesTagRequestBlocks(
    stripAlignmentScoresBlocks(stripRacePatternsBlocks(msg.content)),
  );
  return (
    <article
      key={idx}
      data-testid="chat-message-assistant"
      className="max-w-3xl mx-auto space-y-4"
    >
      {prose && (
        <div className="text-sm leading-relaxed text-on-surface">
          <MarkdownText text={prose} />
        </div>
      )}
      <RacePatterns
        block={block}
        isSubmitted={submittedEntry.submitted}
        pickedCandidateId={submittedEntry.pickedId ?? undefined}
        onPick={onPick}
        onSkip={onSkip}
        isStreaming={parentIsStreaming}
        alignmentScoresByCandidate={alignmentScoresByCandidate}
        blindMode={blindMode}
        revealedCandidates={revealedCandidates}
        onRevealCandidate={onRevealCandidate}
        onCompare={onCompare}
        onSeeAllVotes={onSeeAllVotes}
        onHideCandidate={onHideCandidate}
      />
    </article>
  );
}

/* ── Concern interpretation rendering ───────────────────────── */

function ConcernInterpretationLoadingPlaceholder() {
  const { lang } = useLanguage();
  const label =
    lang === "es"
      ? "Confirmando tus prioridades…"
      : "Confirming your priorities…";
  return (
    <div
      data-testid="concern-interpretation-loading"
      className="my-4 bg-surface-low border-l-4 border-primary/40 p-4 flex items-center gap-3 animate-pulse"
    >
      <svg
        className="w-4 h-4 text-primary shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      <span className="text-xs font-bold uppercase tracking-widest text-on-surface-muted">
        {label}
      </span>
    </div>
  );
}

function renderConcernInterpretation(
  msg: ChatMessage,
  idx: number,
  isLastAssistant: boolean,
  isStreaming: boolean,
  isSubmitted: boolean,
  onConfirm: (confirmations: ConcernConfirmation[]) => void,
  onReinterpret: (rank: number, newText: string) => void,
  onRemove: (rank: number) => void,
): React.ReactElement | null {
  if (msg.role !== "assistant" || !isLastAssistant) return null;

  // Streaming placeholder: half-emitted block during stream
  if (isStreaming) {
    const isOpenBlock = hasOpenConcernInterpretationBlock(msg.content);
    const parsedDuringStream = parseConcernInterpretationBlock(msg.content);
    if (isOpenBlock && !parsedDuringStream) {
      const leadIn = stripPartialConcernInterpretationBlock(msg.content);
      return (
        <article
          key={idx}
          data-testid="chat-message-assistant"
          className="max-w-3xl mx-auto"
        >
          {leadIn && (
            <div className="text-sm leading-relaxed text-on-surface">
              <MarkdownText text={leadIn} />
            </div>
          )}
          <ConcernInterpretationLoadingPlaceholder />
        </article>
      );
    }
    return null;
  }

  if (!msg.content.includes("[/CONCERN_INTERPRETATION]")) return null;
  const block = parseConcernInterpretationBlock(msg.content);
  if (!block) return null;

  // Strip both [CONCERN_INTERPRETATION] and [VALUES_TAG_REQUEST] blocks from prose
  const prose = stripValuesTagRequestBlocks(
    stripConcernInterpretationBlocks(msg.content),
  );
  return (
    <article
      key={idx}
      data-testid="chat-message-assistant"
      className="max-w-3xl mx-auto space-y-4"
    >
      {prose && (
        <div className="text-sm leading-relaxed text-on-surface">
          <MarkdownText text={prose} />
        </div>
      )}
      <ConcernInterpretation
        block={block}
        onConfirm={onConfirm}
        onReinterpret={onReinterpret}
        onRemove={onRemove}
        isSubmitted={isSubmitted}
      />
    </article>
  );
}

/* ── Message list ───────────────────────────────────────────── */

function ChatMessageList({
  messages,
  isStreaming,
  parsedHandoff,
  continuationPrompt,
  clientFallback,
  clientContinuationPrompt,
  messagesEndRef,
  lastUserMsgRef,
  submittedValuesSelectors,
  onSubmitValues,
  submittedRaceFinals,
  onPickRaceFinal,
  onSkipRaceFinal,
  submittedConcernInterpretations,
  onConfirmConcerns,
  onReinterpretConcern,
  onRemoveConcern,
  stateCode,
  county,
  countyName,
  stateName,
  primary,
  blindMode,
  revealedCandidates,
  onRevealCandidate,
  onCompare,
  onSeeAllVotes,
  onHideCandidate,
}: {
  messages: ChatMessage[];
  isStreaming: boolean;
  parsedHandoff: ReturnType<typeof parseHandoffMarkers>;
  continuationPrompt: string;
  clientFallback: ReturnType<typeof buildClientFallbackHandoff> | null;
  clientContinuationPrompt: string;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  lastUserMsgRef: React.RefObject<HTMLDivElement | null>;
  submittedValuesSelectors: Map<number, RankedEntry[]>;
  onSubmitValues: (messageIdx: number, selection: SubmitPayload) => void;
  submittedRaceFinals: Map<number, string | null>;
  onPickRaceFinal: (
    messageIdx: number,
    candidateId: string,
    candidateName: string,
    race: string,
  ) => void;
  onSkipRaceFinal: (messageIdx: number, race: string) => void;
  submittedConcernInterpretations: Map<number, true>;
  onConfirmConcerns: (
    messageIdx: number,
    confirmations: ConcernConfirmation[],
  ) => void;
  onReinterpretConcern: (
    messageIdx: number,
    rank: number,
    newText: string,
  ) => void;
  onRemoveConcern: (messageIdx: number, rank: number) => void;
  stateCode?: string;
  county?: string;
  countyName?: string;
  stateName?: string;
  primary?: "DEM" | "REP" | "OPEN" | "GENERAL";
  blindMode?: boolean;
  revealedCandidates?: Set<string>;
  onRevealCandidate?: (id: string) => void;
  onCompare?: () => void;
  onSeeAllVotes?: (payload: {
    candidate: RacePatternsCandidate;
    alignmentEntry: AlignmentScoresEntry | undefined;
    blindMode: boolean;
    alias: string;
  }) => void;
  onHideCandidate?: (id: string) => void;
}) {
  const { lang } = useLanguage();
  const t = translations[lang];

  // Track first user and last user message indices
  const firstUserIdx = messages.findIndex((m) => m.role === "user");
  const lastUserIdx = messages.reduce(
    (acc, m, i) => (m.role === "user" ? i : acc),
    -1,
  );

  return (
    <div className="space-y-4 pr-1">
      {messages.map((msg, i) => {
        const isLastAssistant =
          msg.role === "assistant" && i === messages.length - 1;

        if (isLastAssistant && !isStreaming && parsedHandoff) {
          return (
            <div key={i} data-testid="chat-message-assistant">
              <HandoffPackage
                parsed={parsedHandoff}
                continuationPrompt={continuationPrompt}
                messages={messages}
                stateCode={stateCode}
                county={county}
                countyName={countyName}
                stateName={stateName}
                primary={primary}
              />
            </div>
          );
        }

        // Dispatch precedence: race-patterns > concern-interpretation > values-tag-selector.
        // Later-game artifacts take precedence over earlier-game ones.
        const submittedEntry = submittedRaceFinals.has(i)
          ? {
              submitted: true,
              pickedId: submittedRaceFinals.get(i) ?? null,
            }
          : { submitted: false, pickedId: null };
        const racePatterns = renderRacePatterns(
          msg,
          i,
          isLastAssistant,
          isStreaming,
          submittedEntry,
          (candidateId, candidateName) => {
            const block = parseRacePatternsBlock(msg.content);
            if (block) {
              onPickRaceFinal(i, candidateId, candidateName, block.race);
            }
          },
          () => {
            const block = parseRacePatternsBlock(msg.content);
            if (block) onSkipRaceFinal(i, block.race);
          },
          isStreaming,
          blindMode,
          revealedCandidates,
          onRevealCandidate,
          onCompare,
          onSeeAllVotes,
          onHideCandidate,
        );
        if (racePatterns) return racePatterns;

        const concernInterpretation = renderConcernInterpretation(
          msg,
          i,
          isLastAssistant,
          isStreaming,
          submittedConcernInterpretations.has(i),
          (confirmations) => onConfirmConcerns(i, confirmations),
          (rank, newText) => onReinterpretConcern(i, rank, newText),
          (rank) => onRemoveConcern(i, rank),
        );
        if (concernInterpretation) return concernInterpretation;

        const valuesSubmittedEntry = submittedValuesSelectors.get(i);
        const valuesSelector = renderValuesTagSelector(
          msg,
          i,
          isLastAssistant,
          isStreaming,
          submittedValuesSelectors.has(i),
          valuesSubmittedEntry ?? [],
          (selection) => onSubmitValues(i, selection),
        );
        if (valuesSelector) return valuesSelector;

        return (
          <div key={i} ref={i === lastUserIdx ? lastUserMsgRef : undefined}>
            <ChatMessageBubble
              msg={msg}
              isLast={i === messages.length - 1}
              isStreaming={isStreaming}
              isFirstUser={i === firstUserIdx}
            />
          </div>
        );
      })}

      {clientFallback && (
        <div>
          <div className="bg-surface-low border-l-4 border-primary p-4 mb-3">
            <p className="font-bold text-sm text-on-surface mb-1">
              {t.handoff.clientFallbackHeader}
            </p>
            <p className="text-sm text-on-surface-muted">
              {t.handoff.clientFallbackBody}
            </p>
          </div>
          <HandoffPackage
            parsed={clientFallback}
            continuationPrompt={clientContinuationPrompt}
          />
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

/* ── Status notices ─────────────────────────────────────────── */

function ChatStatusBar({
  budgetTier,
  chatDisabled,
  disabledReason,
  error,
}: {
  budgetTier: BudgetTier;
  chatDisabled: boolean;
  disabledReason: DisabledReason | null;
  error: string | null;
}) {
  const { lang } = useLanguage();
  const t = translations[lang];

  return (
    <>
      {budgetTier === "notice" && !chatDisabled && (
        <div data-testid="chat-budget-notice" className="mb-3">
          <div className="bg-primary/5 border-l-4 border-primary p-4">
            <p className="text-xs text-on-surface font-medium">
              {t.budget.notice}
            </p>
          </div>
        </div>
      )}

      {chatDisabled && (
        <div data-testid="chat-disabled-message" className="mb-3">
          <div className="bg-accent/10 border-t-4 border-accent p-6">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 mt-0.5 shrink-0 text-accent"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              <div>
                <h4 className="font-black text-base text-on-surface mb-1">
                  {getDisabledMessage(disabledReason, t)}
                </h4>
                <p className="text-xs text-on-surface/70">
                  {t.budget.resetNote}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Non-timeout inline error stub — kept for non-AI-transient errors.
          AITimeoutBanner for transient AI errors is rendered in ChatPanel
          directly (below the ChatMessageList) where retry/handoff state
          is accessible. */}
      {error && !chatDisabled && null /* replaced by AITimeoutBanner below */}
    </>
  );
}

/* ── Phase 3 workspace chat shape ─────────────────────────── */

/**
 * Workspace chat — the centre pane of the Phase 3 3-pane workspace. Renders
 * a small race header (Race N of M + race label), a stub "Pick this
 * candidate" trigger that opens an inline WhyPrompt, and (post-commit) an
 * "Undo pick" affordance. Candidate cards proper land in Phase 4 — this
 * stub exists so Phase 3 can exercise the pick → why → commit → auto-advance
 * loop end to end without depending on the Phase 4 surface.
 *
 * The WhyPrompt scope resets when activeRace changes (keyed render).
 */
function WorkspaceChat({
  workspace,
  budgetExhausted,
  gateVariant = "community_budget",
  messages,
  isStreaming,
  onSendMessage,
  chatDisabled,
  amendmentJournal = [],
  onAmendmentSave,
  onAcceptRescoreOffer,
  blindMode = false,
  onToggleBlindMode,
  revealedCandidates,
  onRevealCandidate,
  onHideCandidate,
  onCompare,
  onSeeAllVotes,
  issues = [],
}: {
  workspace: WorkspaceModeProps;
  budgetExhausted: boolean;
  /** Controls inline gated-input copy when budgetExhausted is true. */
  gateVariant?: GateVariant;
  messages: ChatMessage[];
  isStreaming: boolean;
  onSendMessage: (msg: string) => void;
  chatDisabled: boolean;
  /** Phase 6 — inline amend delta entries rendered below the message list. */
  amendmentJournal?: { newThemeName: string; verdicts: VerdictDecision[] }[];
  /**
   * Phase 6 — commit-only proxy to the parent's onAmendmentSave. After PR3
   * this NO LONGER triggers submitAmendment; lock just commits themes and
   * the parent surfaces the re-score offer.
   */
  onAmendmentSave?: (payload: {
    updatedThemes: Theme[];
    newTheme?: Theme;
    suggestedRank?: number;
  }) => Promise<void> | void;
  /**
   * PR3 — fired when the user clicks "Yes, show me the deltas" on the
   * rescore offer. Runs submitAmendment and clears the offer when done.
   */
  onAcceptRescoreOffer?: () => Promise<void> | void;
  /** Blind mode state — when true, candidate names are hidden. */
  blindMode?: boolean;
  /** Called to toggle blind mode on/off globally. */
  onToggleBlindMode?: () => void;
  /** Set of candidateIds the voter has individually revealed. */
  revealedCandidates?: Set<string>;
  /** Called when a voter taps "Reveal" on a single candidate card. */
  onRevealCandidate?: (id: string) => void;
  /** Called when voter re-anonymizes a previously revealed candidate card. */
  onHideCandidate?: (id: string) => void;
  /** Opens the CompareModal for the active race (card "Compare" action). */
  onCompare?: () => void;
  /** Opens the AllVotesPanel for a candidate (card "See all votes" action). */
  onSeeAllVotes?: (payload: {
    candidate: RacePatternsCandidate;
    alignmentEntry: AlignmentScoresEntry | undefined;
    blindMode: boolean;
    alias: string;
  }) => void;
  /** Issue-level concern interpretations — used to auto-generate why-notes. */
  issues?: ConcernInterpretationEntry[];
}) {
  const {
    activeRace,
    totalRaces,
    activeRaceIndex,
    decided,
    onCommitDecision,
    onUnpickDecision,
  } = workspace;

  if (!activeRace) {
    return (
      <section
        data-testid="workspace-chat"
        role="log"
        aria-label="Voter Choice chat"
        aria-live="polite"
        className="flex h-full flex-col p-6 text-on-surface-muted"
      >
        <p className="text-sm">No race selected.</p>
      </section>
    );
  }

  // Context-aware suggestion chips. Minimal templating per packet §22 —
  // Phase 4 will replace these with candidate-specific options when the
  // real cards land. Fix 1 — display-layer title-case the candidate
  // name so "BOOKER" appears as "Booker" in suggestion chips.
  const isPropositionRace = activeRace.section === "Propositions";

  const firstCandidate = normalizeCandidateName(
    activeRace.candidates?.[0]?.name ?? "",
  );
  // Fall back through the empty case via `||` so the conditional stays
  // a single expression (keeps the parent `WorkspaceChat` complexity at
  // its baseline rather than bumping past the linter's threshold).
  const realLast = firstCandidate.split(/\s+/).pop() || "this candidate";
  // Anonymize the chip LABEL when blind mode is on so the candidate's real
  // name never appears in the workspace UI (blind is the default). The SENT
  // message always uses the real reference so the model still understands.
  const displayLast = blindMode ? "Candidate A" : realLast;
  const suggestions: { id: string; label: string; message: string }[] = [
    {
      id: "show-votes",
      label: `Show me ${displayLast}'s key votes`,
      message: `Show me ${realLast}'s key votes`,
    },
    {
      id: "compare-donors",
      label: "Compare donor bases",
      message: "Compare the candidates' donor bases",
    },
    {
      id: "explain-race",
      label: `Explain ${activeRace.label} in plain terms`,
      message: `Explain ${activeRace.label} in plain terms`,
    },
  ];

  // ANON (defense-in-depth) — free-text assistant answers render as raw
  // markdown (no card), and the chat server prompt is blind-unaware, so a
  // plain answer can name a real candidate even while blind (the default).
  // Scrub every active-race candidate's name → their alias ("Candidate A/B/…")
  // before render. Alias index matches the chips + card (position in
  // activeRace.candidates). We replace the longest forms first (full name)
  // so a full mention collapses as a unit before the bare surname is touched,
  // and only capitalized forms are targeted so common-word surnames ("Long")
  // don't scrub ordinary prose. We anonymize regardless of per-candidate
  // reveal: reveal is a card affordance, and erring toward MORE anonymization
  // never leaks.
  const anonymizeAssistantText = (text: string): string => {
    if (!blindMode) return text;
    return (activeRace.candidates ?? []).reduce((acc, c, idx) => {
      const alias = `Candidate ${String.fromCharCode(65 + idx)}`;
      const raw = (c.name || "").trim();
      const norm = normalizeCandidateName(c.name).trim();
      const targets: string[] = [];
      const pushUnique = (s?: string) => {
        if (s && !targets.includes(s)) targets.push(s);
      };
      pushUnique(norm); // "Cory Booker"
      pushUnique(raw); // "CORY BOOKER"
      pushUnique(norm.split(/\s+/).pop()); // "Booker"
      pushUnique(raw.split(/\s+/).pop()); // "BOOKER"
      return targets.reduce(
        (s, target) =>
          anonymizeText(s, { blindMode: true, realLastName: target, alias }),
        acc,
      );
    }, text);
  };

  // ── Faithful candidate-card wiring (Phase 4 port) ──────────────
  // The workspace center column renders the real <RacePatterns> cards
  // (funding + alignment, anonymized by default) via the shared
  // renderRacePatterns helper — same renderer the cold-open uses. The
  // legacy plain-text fallback only shows when the last assistant message
  // has no [RACE_PATTERNS] block (e.g. generic chat answers).
  const visibleMessages = messages.filter((m) => !m.hidden);
  const lastAssistantIdx = visibleMessages.reduce(
    (acc, m, i) => (m.role === "assistant" ? i : acc),
    -1,
  );
  const lastAssistant =
    lastAssistantIdx >= 0 ? visibleMessages[lastAssistantIdx] : undefined;
  // True when data-driven candidate cards are on screen for the active race.
  // While true, each card's own Pick button is the commit affordance and the
  // fallback stub (WorkspacePickArea) is suppressed. While false (race not
  // covered, data still loading, or a proposition) the stub is the fallback
  // commit affordance. Data-driven now — NOT parsed from a chat message.
  // (Defined after raceCardsBlock below; see the cards-first section.)
  void lastAssistant; // retained for the Q&A transcript helpers below

  // The committed decision for THIS race (if any) — used to mark the
  // matching card as picked and to auto-generate the why-note's issue.
  const activeDecision = workspace.decisions?.find(
    (d) => d.raceId === activeRace.id,
  );
  // First interpreted issue, mirroring the prototype's commitPick: the
  // why-note anchors on the user's top priority when known.
  const topIssue = issues[0]?.interpretation || "my priorities";

  // Post-pick confirmation ("Logged: …") display name. Anonymize while blind
  // so the confirmation bubble never leaks a name the voter chose to keep
  // hidden — consistent with onCardPick's whyNote (alias when blind) and the
  // chip labels. The alias index is the pick's position in activeRace.candidates.
  const loggedPickDisplay = (() => {
    if (!activeDecision) return "";
    const real = normalizeCandidateName(activeDecision.pick);
    if (!blindMode) return real;
    const idx = (activeRace.candidates ?? []).findIndex(
      (c) => normalizeCandidateName(c.name) === real,
    );
    return `Candidate ${String.fromCharCode(65 + (idx < 0 ? 0 : idx))}`;
  })();

  // ── Cards-first data source (PIVOT) ───────────────────────────
  // Candidate cards render from the deterministic `/api/race-data` result
  // the parent fetched (workspace.raceData), NOT from a parsed chat message.
  // The chat below is a pure Q&A box. Propositions (empty roster) don't get
  // data cards — they fall through to the Q&A surface.
  const raceCardsBlock: RacePatternsBlock | null =
    workspace.raceData?.racePatterns &&
    workspace.raceData.racePatterns.candidates.length >= 2
      ? workspace.raceData.racePatterns
      : null;
  // When cards are on screen, their own Pick replaces the fallback stub.
  const hasRacePatternsCard = !!raceCardsBlock;
  // Cards are the PRIMARY middle surface for a candidate race (loading or
  // loaded). When true, the cards take the flex-1 space and the chat (Q&A
  // transcript + input) docks at the BOTTOM with bounded height — the chat is
  // a research box, never the middle. When false (proposition / uncovered /
  // no data), the chat area falls back to filling the space.
  const cardsArePrimary =
    !isPropositionRace && (!!workspace.raceDataLoading || !!raceCardsBlock);
  const raceAlignmentMap: Map<string, AlignmentScoresEntry> | undefined =
    workspace.raceData?.alignmentScores
      ? new Map(
          workspace.raceData.alignmentScores.entries.map((e) => [
            e.candidateId,
            e,
          ]),
        )
      : undefined;
  // The committed pick's id within the data block (to mark its card picked).
  const raceCardsPickedId =
    decided && activeDecision && raceCardsBlock
      ? (raceCardsBlock.candidates.find(
          (c) =>
            normalizeCandidateName(c.name) ===
            normalizeCandidateName(activeDecision.pick),
        )?.id ?? null)
      : null;

  // Card "Pick" → auto-commit a generated why-note (prototype parity: the
  // card pick has NO separate why prompt; that lives only on the stub).
  // Takes the parsed RacePatternsBlock directly (the data block from
  // /api/race-data) — no chat message involved.
  const onCardPick = (
    block: RacePatternsBlock | null,
    candidateId: string,
    candidateName: string,
  ) => {
    const picked = block?.candidates.find((c) => c.id === candidateId);
    // RacePatternsCandidate carries no party; resolve it from the contest's
    // {name, party} list by name (same lookup the stub uses).
    const pickedName = normalizeCandidateName(picked?.name ?? candidateName);
    const partyCode = activeRace.candidates?.find(
      (c) => normalizeCandidateName(c.name) === pickedName,
    )?.party;
    const idx = block?.candidates.findIndex((c) => c.id === candidateId) ?? 0;
    const alias = getCandidateIdentity(
      { id: candidateId, name: candidateName },
      { blindMode, revealed: revealedCandidates, index: idx < 0 ? 0 : idx },
    ).alias;
    const lastName =
      normalizeCandidateName(candidateName).split(/\s+/).pop() || candidateName;
    const whyNote = blindMode
      ? `Candidate ${alias} — strongest record on ${topIssue}.`
      : `${lastName} — strongest record on ${topIssue}.`;
    onCommitDecision({
      raceId: activeRace.id,
      raceLabel: activeRace.label,
      section: activeRace.section,
      pick: candidateName,
      party: partyCode || undefined,
      whyNote,
    });
  };
  // Card "Skip" has no workspace equivalent (navigation lives elsewhere).
  const onCardSkip = () => {};

  return (
    <section
      data-testid="workspace-chat"
      aria-label="Candidate comparison"
      className="flex h-full flex-col overflow-hidden border-x border-rule bg-paper-2"
    >
      <header
        data-testid="workspace-chat-header"
        className="border-b border-rule bg-paper px-7 py-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
              Race {activeRaceIndex + 1} of {totalRaces}
            </div>
            <h2 className="mt-0.5 font-serif text-lg font-semibold tracking-tight text-ink">
              {activeRace.label}
            </h2>
          </div>
          {/* Blind-mode toggle — candidate races only, when handler is provided */}
          {!isPropositionRace && onToggleBlindMode && (
            <button
              type="button"
              data-testid="workspace-chat-blind-toggle"
              onClick={onToggleBlindMode}
              title={
                blindMode
                  ? "Show candidate names" /* NEEDS-KEY: research.blindToggleNamesTitle — EN "Show candidate names" */
                  : "Hide candidate names" /* NEEDS-KEY: research.blindToggleBlindTitle — EN "Hide candidate names" */
              }
              className="mt-0.5 shrink-0 inline-flex items-center gap-1.5 border border-rule rounded-md px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-2 hover:bg-paper-2 active:scale-95 transition"
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {blindMode ? (
                  <>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <path d="M1 1l22 22" />
                  </>
                ) : (
                  <>
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                )}
              </svg>
              <span>
                {
                  blindMode
                    ? "Blind" /* NEEDS-KEY: research.blindToggleBlind — EN "Blind" */
                    : "Names" /* NEEDS-KEY: research.blindToggleNames — EN "Names" */
                }
              </span>
            </button>
          )}
        </div>
      </header>

      {/* ── Cards-first PRIMARY surface (PIVOT) ──────────────────────
          Candidate cards render from the deterministic /api/race-data
          result (workspace.raceData), NOT from a chat message. While the
          fetch is in flight the ProcessingSteps loader is the primary
          surface — the workspace never opens onto an empty/transcript
          state. Propositions + uncovered offices (no ≥2-candidate block)
          fall through to the Q&A surface below. */}
      {cardsArePrimary && (
        <div
          data-testid="workspace-cards"
          className="flex-1 min-h-0 overflow-y-auto px-5 pt-5"
        >
          {workspace.raceDataLoading ? (
            <RacePatternsLoadingPlaceholder variant="race" />
          ) : raceCardsBlock ? (
            <RacePatterns
              block={raceCardsBlock}
              isSubmitted={decided}
              pickedCandidateId={raceCardsPickedId ?? undefined}
              onPick={(candidateId, candidateName) =>
                onCardPick(raceCardsBlock, candidateId, candidateName)
              }
              onSkip={onCardSkip}
              isStreaming={false}
              alignmentScoresByCandidate={raceAlignmentMap}
              blindMode={blindMode}
              revealedCandidates={revealedCandidates}
              onRevealCandidate={onRevealCandidate}
              onCompare={onCompare}
              onSeeAllVotes={onSeeAllVotes}
              onHideCandidate={onHideCandidate}
            />
          ) : null}
        </div>
      )}

      {/* Q&A transcript — the chat is DEMOTED to a bottom research box.
          When cards are the primary surface (candidate race), this docks at
          the BOTTOM with bounded height (border-top) so the cards own the
          middle and the chat reads as a footer research box. When there are
          no cards (proposition / uncovered), it falls back to filling the
          space. User questions + prose answers append here; no card data is
          rendered from messages. Live region is scoped here (the cards above
          are static front-end, not a live log). Parent re-keys ChatPanel by
          activeRace.id, so this clears on race switch. */}
      <div
        data-testid="workspace-chat-messages"
        role="log"
        aria-live="polite"
        aria-label="Research Q&A"
        className={
          cardsArePrimary
            ? "max-h-[38vh] shrink-0 overflow-y-auto border-t border-rule p-4"
            : "flex-1 overflow-y-auto p-4"
        }
      >
        {/* P0 #1 — render hidden messages (synthetic kickoff user message)
            transparently to the conversation payload but skip them in the
            visible list. The placeholder text below the chat input renders
            iff there are zero VISIBLE messages, so the auto-fire kickoff
            doesn't strand the placeholder onscreen during the first stream. */}
        {(() => {
          const visibleMessages = messages.filter((m) => !m.hidden);
          if (
            visibleMessages.length === 0 &&
            amendmentJournal.length === 0 &&
            !(decided && activeDecision) &&
            !workspace.pendingAmendment &&
            !workspace.pendingRescoreOffer &&
            !workspace.chatCatchSuggestion &&
            !isStreaming
          ) {
            // When cards are the primary surface, the bottom input already
            // prompts "Ask anything about {race}…" — don't duplicate it as a
            // transcript placeholder. Render nothing so the bottom dock is
            // just the input cluster until a real Q&A exchange exists.
            return cardsArePrimary ? null : (
              <p className="text-sm text-on-surface-muted">
                Ask anything about {activeRace.label}.
              </p>
            );
          }
          return (
            <>
              {visibleMessages.length > 0 && (
                <ul className="flex flex-col gap-4 list-none p-0">
                  {visibleMessages.map((m, i) => {
                    if (m.role === "user") {
                      return (
                        <li
                          key={i}
                          data-testid="chat-message-user"
                          className="self-end flex flex-col items-end gap-1.5 max-w-md"
                        >
                          <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
                            You
                          </span>
                          <div
                            className="bg-ink text-paper px-4 py-3 text-sm leading-relaxed"
                            style={{ borderRadius: "14px 14px 4px 14px" }}
                          >
                            <MarkdownText text={m.content} />
                          </div>
                        </li>
                      );
                    }
                    // Q&A only: the chat is the demoted follow-up box, so an
                    // assistant turn here is a prose answer — never a card.
                    // Cards render from workspace.raceData above. Any stray
                    // structured block in an answer is stripped to prose as
                    // defense in depth (the cards-first prompt shouldn't emit
                    // one, but a follow-up answer might quote a tag).
                    return (
                      <li
                        key={i}
                        data-testid="chat-message-ai"
                        className="flex flex-col items-start gap-1.5 max-w-2xl"
                      >
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
                          Voter Choice · AI
                        </span>
                        <div
                          className="bg-paper-2 border border-rule px-4 py-3 text-sm leading-relaxed text-ink w-full"
                          style={{ borderRadius: "4px 14px 14px 14px" }}
                        >
                          <MarkdownText
                            text={anonymizeAssistantText(
                              stripPartialAlignmentScoresBlock(
                                stripPartialRacePatternsBlock(
                                  stripAlignmentScoresBlocks(
                                    stripRacePatternsBlocks(m.content),
                                  ),
                                ),
                              ),
                            )}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Phase 6 — chat-catch soft proposal chip. */}
              {workspace.chatCatchSuggestion && !workspace.pendingAmendment && (
                <div
                  data-testid="amend-chat-catch-chip"
                  className="my-3 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                  role="status"
                >
                  <p className="mb-2">
                    I noticed you mentioned{" "}
                    <strong>
                      {workspace.chatCatchSuggestion.candidateNewTheme.name}
                    </strong>{" "}
                    — want to add it as a theme?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="amend-chat-catch-accept"
                      onClick={workspace.onChatCatchAccept}
                      className="bg-amber-600 text-white px-3 py-1.5 text-xs font-bold uppercase tracking-widest hover:bg-amber-700"
                    >
                      Add as a theme
                    </button>
                    <button
                      type="button"
                      data-testid="amend-chat-catch-dismiss"
                      onClick={workspace.onChatCatchDismiss}
                      className="text-xs font-bold uppercase tracking-widest text-on-surface-muted hover:text-rose-700"
                    >
                      Not now
                    </button>
                  </div>
                </div>
              )}

              {/* Phase 6 — inline amend editor (rail or chat-catch entry). */}
              {workspace.pendingAmendment && workspace.lockedThemes && (
                <ThemeAmendEditor
                  currentThemes={workspace.lockedThemes}
                  candidateNewTheme={
                    workspace.pendingAmendment.candidateNewTheme
                  }
                  triggeringMessage={
                    workspace.pendingAmendment.triggeringMessage
                  }
                  decidedRaces={[]}
                  inFlight={workspace.amendmentInFlight}
                  onSave={async (payload) => {
                    if (onAmendmentSave) {
                      await onAmendmentSave(payload);
                    }
                  }}
                  onDiscard={() => workspace.onAmendmentDiscard?.()}
                />
              )}

              {/* PR3 — opt-in re-score offer (rendered between lock + delta). */}
              {workspace.pendingRescoreOffer && (
                <AmendRescoreOffer
                  newThemeName={workspace.pendingRescoreOffer.newThemeName}
                  decidedCount={workspace.pendingRescoreOffer.decidedCount}
                  inFlight={workspace.amendmentInFlight}
                  onAccept={() => {
                    if (onAcceptRescoreOffer) {
                      void onAcceptRescoreOffer();
                    }
                  }}
                  onDecline={() => workspace.onRescoreOfferClear?.()}
                />
              )}

              {/* Phase 6 — past amend delta messages. */}
              {amendmentJournal.map((entry, i) => (
                <AmendDeltaMessage
                  key={`amend-${i}-${entry.newThemeName}`}
                  verdicts={entry.verdicts}
                  newThemeName={entry.newThemeName}
                />
              ))}

              {/* Post-pick confirmation bubble (prototype-views.jsx:626-635).
                  Renders once the active race has a committed decision. The
                  pick name + party are anonymized while blind (see
                  loggedPickDisplay) so the confirmation never leaks a name the
                  voter chose to keep hidden; the why-note is run through the
                  same anonymizer the free-text answers use. */}
              {decided && activeDecision && (
                <div
                  data-testid="workspace-chat-logged"
                  className="mt-4 flex flex-col items-start gap-1.5 max-w-2xl"
                >
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
                    Voter Choice · AI
                  </span>
                  <div
                    className="bg-paper-2 border border-rule px-4 py-3 text-sm leading-relaxed text-ink w-full"
                    style={{ borderRadius: "4px 14px 14px 14px" }}
                  >
                    <p>
                      {/* NEEDS-KEY: research.loggedPrefix — EN "Logged:" */}
                      Logged:{" "}
                      <b>
                        {loggedPickDisplay}
                        {!blindMode && activeDecision.party
                          ? ` (${activeDecision.party})`
                          : ""}
                      </b>{" "}
                      {/* NEEDS-KEY: research.loggedFor — EN "for" */}
                      for {activeRace.label}.
                    </p>
                    {activeDecision.whyNote && (
                      <p className="mt-1 italic text-ink-2">
                        &ldquo;{anonymizeAssistantText(activeDecision.whyNote)}
                        &rdquo;
                      </p>
                    )}
                    <p className="mt-2 text-[13.5px] text-ink-2">
                      {/* NEEDS-KEY: research.loggedEditHint — EN "You can edit the note in the ballot pane any time. Or jump to a different race." */}
                      You can edit the note in the ballot pane any time. Or jump
                      to a different race.
                    </p>
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Stub pick area is the FALLBACK commit affordance — only shown when
          no faithful candidate card is on screen for the active race. When a
          card IS shown, its own Pick / Picked-undo button replaces the stub
          (prototype parity). Tests whose mocked chat emits no RACE_PATTERNS
          block still render the stub and keep exercising its testids. */}
      {!hasRacePatternsCard && (
        <WorkspacePickArea
          activeRace={activeRace}
          decided={decided}
          budgetExhausted={budgetExhausted}
          gateVariant={gateVariant}
          onCommitDecision={onCommitDecision}
          onUnpickDecision={onUnpickDecision}
          blindMode={blindMode}
          revealedCandidates={revealedCandidates}
        />
      )}

      {/* Suggestion chips hidden during streaming OR session-limit / rate-
          limit states; for `budgetExhausted` we keep the input visible-but-
          disabled (PR 7) so the user still sees they have a chat surface,
          not just a black hole. */}
      {!chatDisabled && !budgetExhausted && (
        <div
          data-testid="workspace-chat-suggestions"
          className="flex flex-wrap gap-2 border-t border-rule bg-paper px-5 py-3"
        >
          {/* PR C — sentence-case sans chips per prototype's `.starter-chips
              .sc` styling (sans 12.5px, pill-shaped, paper bg). Mono
              uppercase was reading as a category divider, not an action. */}
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              data-testid={`workspace-chat-suggestion-${s.id}`}
              onClick={() => onSendMessage(s.message)}
              disabled={isStreaming}
              className="rounded-full border border-rule bg-paper-2 px-3 py-1.5 text-[12.5px] text-ink-2 hover:border-ink-3 hover:text-ink disabled:opacity-50 transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/*
       * Chat input visibility (PR 7):
       *   - `chatDisabled` (non-budget reasons: rate/session limit) → hide
       *     entirely; the legacy banner above already explains the gate.
       *   - `budgetExhausted` → keep the input mounted but disabled, with
       *     an explanatory notice. This preserves the visible workspace
       *     state while making the "no chat without BYOK" gate obvious.
       */}
      {!chatDisabled && (
        <WorkspaceChatInput
          onSubmit={onSendMessage}
          isStreaming={isStreaming}
          activeRaceLabel={activeRace.label}
          budgetExhausted={budgetExhausted}
          gateVariant={gateVariant}
          activeRaceIndex={activeRaceIndex}
          totalRaces={totalRaces}
        />
      )}
    </section>
  );
}

function WorkspaceChatInput({
  onSubmit,
  isStreaming,
  activeRaceLabel,
  budgetExhausted,
  gateVariant = "community_budget",
  activeRaceIndex,
  totalRaces,
}: {
  onSubmit: (msg: string) => void;
  isStreaming: boolean;
  activeRaceLabel: string;
  budgetExhausted: boolean;
  gateVariant?: GateVariant;
  activeRaceIndex: number;
  totalRaces: number;
}) {
  const [input, setInput] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming || budgetExhausted) return;
    setInput("");
    onSubmit(trimmed);
  }

  // When budgetExhausted, the input AND send are disabled but visible.
  // The notice text spells out the two recovery paths: copy the handoff
  // prompt and continue elsewhere, OR add a BYOK key. The BudgetExhausted
  // overlay (which may be open, may have been dismissed) is the surface
  // for both actions.
  const inputDisabled = isStreaming || budgetExhausted;

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-outline-variant/30 p-3"
    >
      {budgetExhausted && (
        <p
          data-testid="workspace-chat-budget-notice"
          className="mb-2 text-xs italic text-on-surface-muted"
        >
          {gateVariant === "community_budget"
            ? "Budget exhausted — paste the handoff prompt elsewhere, or add a BYOK key to keep chatting here."
            : "Free-chat limit reached — paste the handoff prompt elsewhere, or add a BYOK key to keep chatting here."}
        </p>
      )}
      <div className="flex items-end gap-2">
        <textarea
          data-testid="workspace-chat-input"
          aria-label="Ask anything about this race"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder={
            budgetExhausted
              ? gateVariant === "community_budget"
                ? "Budget exhausted — copy the handoff prompt or add a BYOK key."
                : "Free-chat limit reached — copy the handoff prompt or add a BYOK key."
              : `Ask anything about ${activeRaceLabel}…`
          }
          disabled={inputDisabled}
          rows={2}
          className="flex-1 border border-outline-variant/30 bg-surface-lowest p-2 text-sm text-on-surface disabled:opacity-50"
        />
        {/* PR C — sentence-case sans Send per prototype.css `.ws-input
            .send` (sans 13.5px font-weight 600). Mono uppercase tracking-
            widest reserved for eyebrow / micro-meta labels. */}
        <button
          type="submit"
          data-testid="workspace-chat-send"
          disabled={isStreaming || budgetExhausted || !input.trim()}
          className="bg-civic px-4 py-2.5 text-[13.5px] font-semibold text-paper-2 hover:bg-civic-2 disabled:opacity-50 rounded-lg"
        >
          Send
        </button>
      </div>
      {/* PR C — auto-saving + race-counter meta row. Mirrors the prototype's
          `.ws-input .meta` (prototype-views.jsx WorkspaceView lines
          466-469). Mono uppercase 10.5px reads as a privacy/orientation
          micro-label, not a CTA. */}
      <div
        data-testid="workspace-chat-input-meta"
        className="mt-2 flex items-center justify-between gap-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3"
      >
        <span>Auto-saving to your device · nothing leaves your browser</span>
        <span>
          Race {activeRaceIndex + 1} / {totalRaces}
        </span>
      </div>
    </form>
  );
}

function WorkspacePickArea({
  activeRace,
  decided,
  budgetExhausted,
  gateVariant = "community_budget",
  onCommitDecision,
  onUnpickDecision,
  blindMode = false,
  revealedCandidates,
}: {
  activeRace: WorkspaceModeProps["activeRace"];
  decided: boolean;
  budgetExhausted: boolean;
  gateVariant?: GateVariant;
  onCommitDecision: WorkspaceModeProps["onCommitDecision"];
  onUnpickDecision: WorkspaceModeProps["onUnpickDecision"];
  /** Blind mode state — when true the stub label is aliased ("Candidate A"). */
  blindMode?: boolean;
  /** Candidate ids the voter has individually revealed. */
  revealedCandidates?: Set<string>;
}) {
  const [whyOpen, setWhyOpen] = useState(false);
  const [whyDraft, setWhyDraft] = useState("");
  const [stagedCandidate, setStagedCandidate] = useState<{
    name: string;
    party: string;
  } | null>(null);

  if (!activeRace) return null;

  // For Phase 3, the "candidate" we pick is either the first candidate from
  // the contest data (when present) or a placeholder. Phase 4 replaces this.
  const firstCandidate =
    activeRace.candidates && activeRace.candidates[0]
      ? activeRace.candidates[0]
      : null;
  const hasRealCandidate = !!firstCandidate;
  const defaultCandidate = firstCandidate ?? {
    name: activeRace.label,
    party: "",
  };

  // ANON — the stub pick area shows whenever no RacePatterns card is on
  // screen (plain-text answer, or the block is still streaming). In blind
  // mode (the default) it must NOT print the real candidate name. Route the
  // visible label through getCandidateIdentity — the single naming source of
  // truth — so it reads "Candidate A" while blind. The real name still rides
  // the committed decision payload below (`pick: stagedCandidate.name`) as
  // transport. With no candidate data we fall back to the race label, which
  // is not a person's name and is shown as-is.
  const displayLabelFor = (c: { name: string }): string => {
    if (!hasRealCandidate) return normalizeCandidateName(c.name);
    const identity = getCandidateIdentity(
      { id: c.name, name: c.name },
      { blindMode, revealed: revealedCandidates, index: 0 },
    );
    return identity.isBlind
      ? identity.aliasLabel
      : normalizeCandidateName(c.name);
  };

  function openWhyFor(c: { name: string; party: string }) {
    setStagedCandidate(c);
    setWhyOpen(true);
  }

  function commit() {
    if (!stagedCandidate) return;
    onCommitDecision({
      raceId: activeRace!.id,
      raceLabel: activeRace!.label,
      section: activeRace!.section,
      pick: stagedCandidate.name,
      party: stagedCandidate.party || undefined,
      whyNote: whyDraft.trim(),
    });
    setWhyOpen(false);
    setStagedCandidate(null);
    setWhyDraft("");
  }

  function cancel() {
    setWhyOpen(false);
    setStagedCandidate(null);
    setWhyDraft("");
  }

  return (
    <div className="flex flex-col gap-3 text-sm p-3 border-t border-rule">
      {budgetExhausted ? (
        <p className="text-ink-3 italic">
          {gateVariant === "community_budget"
            ? "Budget exhausted — see the right pane footer for next steps."
            : "Free-chat limit reached — see the right pane footer for next steps."}
        </p>
      ) : decided ? (
        // PR C — sentence-case sans for the "picked — undo" affordance.
        // Ink bg signals "final" (this race is decided); a return to the
        // mono uppercase treatment here would visually conflate the
        // decision marker with mono micro-labels elsewhere.
        <button
          type="button"
          data-testid="workspace-unpick-trigger"
          data-race-id={activeRace.id}
          onClick={() => onUnpickDecision(activeRace.id)}
          className="self-start bg-ink border border-ink px-4 py-2.5 text-[13px] font-semibold text-paper hover:opacity-90 rounded-lg"
        >
          Picked — undo
        </button>
      ) : (
        // PR C — sentence-case sans for the race-level fallback CTA.
        // Per prototype.css `.cand-actions button.add` (lines 1057-1062)
        // the candidate-add primary uses civic-green sans 13px, not
        // mono uppercase.
        <button
          type="button"
          data-testid="workspace-pick-trigger"
          data-race-id={activeRace.id}
          onClick={() => openWhyFor(defaultCandidate)}
          className="self-start bg-civic px-4 py-2.5 text-[13px] font-semibold text-paper-2 hover:bg-civic-2 rounded-lg"
        >
          {/* ANON + Fix 1 — alias-gated, title-cased display label. While
              blind this reads "Pick Candidate A"; the raw all-caps name is
              preserved on the extraction shape for prompts + print artifact. */}
          Pick {displayLabelFor(defaultCandidate)}
        </button>
      )}

      {whyOpen && stagedCandidate && (
        <div
          data-testid="workspace-why-prompt"
          className="border border-civic bg-paper rounded-xl p-3 flex flex-col gap-2"
        >
          <label
            htmlFor="workspace-why-textarea"
            className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3"
          >
            {/* ANON — alias-gated display label (the real name stays in the
                committed decision payload as transport). */}
            Why are you picking {displayLabelFor(stagedCandidate)}?
          </label>
          <textarea
            id="workspace-why-textarea"
            data-testid="workspace-why-textarea"
            value={whyDraft}
            onChange={(e) => setWhyDraft(e.target.value)}
            rows={3}
            className="w-full border border-rule bg-paper-2 p-2 font-serif text-sm text-ink rounded resize-y focus:outline-none focus:border-civic"
            placeholder="One line you'll see on your printed ballot."
          />
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="workspace-why-commit"
              onClick={commit}
              className="bg-civic px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-paper-2 hover:bg-civic-2 rounded"
            >
              Commit pick
            </button>
            <button
              type="button"
              data-testid="workspace-why-cancel"
              onClick={cancel}
              className="border border-rule px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-2 hover:bg-paper-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */

// eslint-disable-next-line complexity
export function ChatPanel({
  state,
  zipCode,
  pollingData,
  onBudgetUpdate,
  voterProfile,
  countyName,
  userSampleBallotText,
  preResearchContext,
  primary,
  onChatStarted,
  promptFleetV2Enabled = false,
  ballotConfirmed = true,
  workspace,
  onLockInThemes,
  ballotContext,
  onBudgetExhausted,
  budgetExhausted: budgetExhaustedFromParent = false,
  gateVariant: gateVariantFromParent,
  coldOpenContext,
  blindMode = false,
  revealedCandidates = new Set<string>(),
  onRevealCandidate,
  onToggleBlindMode,
  issues = [],
  onHideCandidate,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionStartedRef = useRef(false);

  // ── CompareModal state (one instance, shared across all cards) ──
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareRaceBlock, setCompareRaceBlock] =
    useState<RacePatternsBlock | null>(null);
  const [compareAlignmentMap, setCompareAlignmentMap] = useState<
    Map<string, AlignmentScoresEntry> | undefined
  >(undefined);

  // ── AllVotesPanel state (one instance) ──
  const [allVotesPanelOpen, setAllVotesPanelOpen] = useState(false);
  const [allVotesPayload, setAllVotesPayload] = useState<{
    candidate: RacePatternsCandidate;
    alignmentEntry: AlignmentScoresEntry;
    blindMode: boolean;
    alias: string;
  } | null>(null);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus>({
    tier: "normal",
    percent: 0,
  });
  const [chatDisabled, setChatDisabled] = useState(false);
  const [disabledReason, setDisabledReason] = useState<DisabledReason | null>(
    null,
  );
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [searchActivity, setSearchActivity] = useState<SearchActivity | null>(
    null,
  );
  // submittedValuesSelectors: messageIdx → submitted ranked entries (empty array = skipped)
  const [submittedValuesSelectors, setSubmittedValuesSelectors] = useState<
    Map<number, RankedEntry[]>
  >(() => new Map());
  const [submittedRaceFinals, setSubmittedRaceFinals] = useState<
    Map<number, string | null>
  >(() => new Map());
  // submittedConcernInterpretations: messageIdx → true once the user has confirmed
  const [submittedConcernInterpretations, setSubmittedConcernInterpretations] =
    useState<Map<number, true>>(() => new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastUserMsgRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef(initSessionId());
  const messageCountRef = useRef(0);
  const { lang } = useLanguage();
  const t = translations[lang];

  // Cold-open (Phase 2) state. Only consulted when
  // `promptFleetV2Enabled && lang === "en"`. Initial phase is the
  // empty textarea.
  const [coldOpenPhase, setColdOpenPhase] = useState<ColdOpenPhase>({
    kind: "input",
    draft: "",
  });
  const [themesLockedIn, setThemesLockedIn] = useState<Theme[] | null>(null);
  // Cold-open is the active path while the flag is on, locale is `en`,
  // and we haven't locked themes yet. The legacy auto-session is
  // suppressed in this state so the cold-open textarea is the only
  // way to start the conversation.
  //
  // PR 6 fix D — ALSO require `ballotConfirmed`. The parent gates the
  // entire ResearchLayout on the same signal, so this is defensive: if
  // ChatPanel ever mounts before a ballot is confirmed, the cold-open
  // textarea stays suppressed and the legacy auto-session also stays
  // off (no Haiku tokens wasted).
  const coldOpenActive =
    promptFleetV2Enabled &&
    lang === "en" &&
    ballotConfirmed &&
    themesLockedIn === null;

  // Pin the user's last message at the top when streaming starts
  useEffect(() => {
    if (isStreaming && lastUserMsgRef.current) {
      lastUserMsgRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [isStreaming]);

  // Fire onChatStarted exactly once when the chat transitions from empty to
  // having any message. Parents use this to hide pre-session UI like
  // ProfileUpload once the user is mid-session.
  const chatStartedFiredRef = useRef(false);
  useEffect(() => {
    if (messages.length > 0 && !chatStartedFiredRef.current) {
      chatStartedFiredRef.current = true;
      onChatStarted?.();
    }
  }, [messages.length, onChatStarted]);

  const handleBudgetUpdate = useCallback(
    (budget: BudgetStatus) => {
      setBudgetStatus(budget);
      onBudgetUpdate?.(budget);
    },
    [onBudgetUpdate],
  );

  const getBasePrompt = useCallback(() => {
    return generatePrompt(
      state,
      zipCode,
      undefined,
      lang,
      pollingData ?? undefined,
      countyName,
      userSampleBallotText,
      preResearchContext,
    );
  }, [
    state,
    zipCode,
    lang,
    pollingData,
    countyName,
    userSampleBallotText,
    preResearchContext,
  ]);

  const disableChat = useCallback((reason: DisabledReason) => {
    setChatDisabled(true);
    setDisabledReason(reason);
  }, []);

  const handleApiError = useCallback(
    (errorData: { error?: string; code?: string; budget?: BudgetStatus }) => {
      const reason = getDisabledReason(errorData.code ?? "");
      if (reason) {
        disableChat(reason);
        if (errorData.budget) handleBudgetUpdate(errorData.budget);
      }
      setError(errorData.error || "Failed to connect to chat.");
    },
    [disableChat, handleBudgetUpdate],
  );

  const sendMessage = useCallback(
    async (
      userMessage: string,
      currentMessages: ChatMessage[],
      options?: { hidden?: boolean },
    ) => {
      if (chatDisabled) return;

      setIsStreaming(true);
      setError(null);
      messageCountRef.current += 1;

      if (messageCountRef.current > SESSION_MESSAGE_LIMIT) {
        disableChat("session_limit");
        setIsStreaming(false);
        return;
      }

      const newMessages: ChatMessage[] = [
        ...currentMessages,
        // P0 #1 — `hidden: true` keeps the kickoff user message out of the
        // visible list while still feeding the model the conversation turn.
        {
          role: "user",
          content: userMessage,
          ...(options?.hidden ? { hidden: true } : {}),
        },
      ];
      setMessages(newMessages);

      const { basePrompt } = getBasePrompt();

      // Phase 3 — when in workspace mode, send the request shape Phase 1's
      // router expects: view + activeRace{Type,Id} + prevActiveRaceId, plus
      // a minimal raceContext slice the race-deep-dive / proposition
      // builders need. Without this the chat route falls back to the
      // legacy prompt, even with PROMPT_FLEET_V2 on. See
      // .ai/work-packets/redesign-phase-3-workspace-split.md step 4.
      //
      // Real-fix correction (post PR #41):
      //   - Discriminate proposition vs candidate race on
      //     `Race.section === "Propositions"`, NOT on candidates being empty.
      //     The deriver now propagates candidates; an empty candidates array
      //     on a non-proposition just means the contest data didn't ship a
      //     roster (rare, e.g. paste path with no party labels), and the
      //     race-deep-dive builder can still run with `candidatesJson: "[]"`.
      //   - Always populate `themesList` and `decidedSummary` for candidate
      //     races so the race-deep-dive builder's required-field validation
      //     passes. Pre-fix these were missing, which made the route's
      //     defensive-fallback path serve the legacy v3 prompt instead of
      //     the race-specific builder (UX degradation, not a 500). PR #41
      //     keeps that fallback in place as belt-and-suspenders.
      const workspaceContextBody = (() => {
        const ws = workspace;
        if (!ws?.activeRace) return undefined;
        const isProposition = ws.activeRace.section === "Propositions";
        const view: RouterView = isProposition
          ? "workspace-prop"
          : "workspace-race";
        const raceType: RaceType = isProposition ? "proposition" : "choice";
        // Prefer the state code parsed from the uploaded ballot when
        // present — see WorkspaceModeProps.extractedStateCode for the prod
        // failure mode this guards against (NJ ballot + TX-resolved state →
        // model halts to clarify instead of emitting cards).
        const effectiveStateCode = ws.extractedStateCode || state.stateCode;
        return {
          view,
          activeRaceType: raceType,
          activeRaceId: ws.activeRace.id,
          prevActiveRaceId: ws.prevActiveRaceId ?? undefined,
          // No `trigger` on workspace chat turns: the chat is a prose Q&A box
          // (router default → race-deep-dive). Candidate cards come from
          // /api/race-data, not from a chat turn.
          raceContext: {
            raceLabel: ws.activeRace.label,
            state: effectiveStateCode,
            county: countyName,
            candidatesJson: JSON.stringify(ws.activeRace.candidates ?? []),
            themesList: formatThemesList(ws.lockedThemes),
            decidedSummary: formatDecidedSummary(ws.decisions),
          },
        };
      })();

      // Phase 9 — BYOK precedence: if the user has stored an Anthropic key
      // in localStorage, route the chat directly to api.anthropic.com via
      // the BYOK client. This BYPASSES our /api/chat route entirely so the
      // user's key never reaches the Voter Choice server (asserted by both
      // unit tests + the budget-exhausted e2e network-trace).
      //
      // Per packet: "BYOK precedence: when key set AND community budget
      // has room, user's key is used." — we bias toward respecting the
      // user's choice.
      if (hasByokKey()) {
        // Apply the same nonpartisan safety header the server-side route
        // prepends (Phase 1 — `prependSafetyHeader` in src/lib/prompts).
        // Per packet Notes: "The BYOK chat path should respect the same
        // shared safety header from Phase 1 — even on the user's own key,
        // we don't suddenly become a partisan recommender."
        const byokSystem = prependSafetyHeader(basePrompt);
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
        try {
          // P0 #1 — strip the client-only `hidden` flag (kickoff message).
          const byokMessages = newMessages.map(({ role, content }) => ({
            role,
            content,
          }));
          await streamWithByok(
            {
              systemPrompt: byokSystem,
              messages: byokMessages,
            },
            {
              onText: (text) => {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + text,
                    };
                  }
                  return updated;
                });
              },
              onError: (err) => {
                setSearchActivity(null);
                setError(err);
              },
              onDone: () => {
                setSearchActivity(null);
              },
            },
          );
        } catch (err) {
          setError(err instanceof Error ? err.message : "BYOK stream error");
        } finally {
          setSearchActivity(null);
          setIsStreaming(false);
        }
        return;
      }

      try {
        // P0 #1 — strip the client-only `hidden` flag from the outgoing
        // payload. The server's ChatMessage shape only carries role/content.
        const outgoingMessages = newMessages.map(({ role, content }) => ({
          role,
          content,
        }));
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: outgoingMessages,
            systemPrompt: basePrompt,
            sessionId: sessionIdRef.current,
            messageCount: messageCountRef.current,
            isNewSession: messageCountRef.current === 1,
            ...(voterProfile ? { voterProfile } : {}),
            ...(workspaceContextBody ?? {}),
            ...(ballotContext ? { ballotContext } : {}),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          handleApiError(errorData);
          // Undo message count for retryable errors so user can try again
          const reason = getDisabledReason(errorData.code ?? "");
          if (!reason) {
            messageCountRef.current -= 1;
            // Remove the user message we optimistically added
            setMessages(currentMessages);
          }
          setIsStreaming(false);
          return;
        }

        // Phase 9 — intercept the structured `budget_exhausted` shape. The
        // route now returns 200 with a JSON body (NOT an SSE stream) when
        // the community budget is gone. Reading content-type avoids
        // accidentally trying to parse a stream as JSON or vice versa.
        const ct = response.headers.get("content-type") ?? "";
        if (ct.includes("application/json")) {
          const data = (await response.json()) as {
            status?: string;
            resetAt?: string;
            handoffPrompt?: string;
          };
          if (data?.status === "budget_exhausted") {
            onBudgetExhausted?.({
              handoffPromptText: data.handoffPrompt ?? "",
              resetAt: data.resetAt ?? new Date().toISOString(),
              // JSON `budget_exhausted` shape only returns when the community
              // pool is exhausted — hardcode community_budget.
              variant: "community_budget",
            });
            // Remove the optimistic user message — we're routing to the
            // continuity screen, not surfacing a chat reply.
            setMessages(currentMessages);
            setIsStreaming(false);
            return;
          }
        }

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        await streamResponse(response, {
          onText: (text) => {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + text,
                };
              }
              return updated;
            });
          },
          onDone: (budget) => {
            setSearchActivity(null);
            handleBudgetUpdate(budget);
          },
          onError: (err) => {
            setSearchActivity(null);
            setError(err);
          },
          onSearching: () => setSearchActivity({ status: "searching" }),
          onSearchingDone: (query) =>
            setSearchActivity({ status: "done", query }),
        });
      } catch {
        setError(
          lang === "es"
            ? "Error de conexión. Inténtelo de nuevo."
            : "Connection error. Please try again.",
        );
      } finally {
        setSearchActivity(null);
        setIsStreaming(false);
      }
    },
    [
      chatDisabled,
      getBasePrompt,
      lang,
      handleBudgetUpdate,
      disableChat,
      handleApiError,
      voterProfile,
      workspace,
      state.stateCode,
      countyName,
      ballotContext,
      onBudgetExhausted,
    ],
  );

  /* ── P0 #1: auto-fire race-deep-dive on workspace mount ─────── */

  // PIVOT — the auto-fire kickoff is REMOVED. Pre-pivot, opening a race fired
  // a synthetic "Introduce this race…" turn so the LLM would emit candidate
  // cards. That coupled the cards to a chat message and shipped broken twice
  // (the model narrated tool intent / asked to clarify instead of emitting).
  // Cards now render from the deterministic `/api/race-data` fetch (see the
  // cards-first surface above); the chat is a pure follow-up Q&A box that
  // only fires on the voter's own message. No mount-time chat turn.

  /* ── Cold-open: free-form submit (Phase 2) ─────────────────── */

  /**
   * Submit the free-form cold-open text. Issues a routed request to
   * /api/chat with `view: "cold-open"` and `raceContext.userInput`.
   * Accumulates the model's text-delta SSE events into a local buffer
   * (instead of pushing them into the visible message list) and parses
   * the buffer as JSON when the stream finishes. Successful parse →
   * themes phase. Parse failure → error phase with the draft preserved.
   *
   * No conversation message is pushed for the cold-open turn — the
   * user's raw JSON should NEVER appear as assistant prose, and the
   * user message lives in the cold-open UI (not the chat bubble list).
   */
  const submitColdOpen = useCallback(
    async (userText: string) => {
      if (chatDisabled) return;
      setColdOpenPhase({ kind: "thinking", userText });
      setIsStreaming(true);
      setError(null);
      messageCountRef.current += 1;

      const { basePrompt } = getBasePrompt();
      const buffer: string[] = [];

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user" as const, content: userText }],
            systemPrompt: basePrompt,
            sessionId: sessionIdRef.current,
            messageCount: messageCountRef.current,
            isNewSession: true,
            view: "cold-open" as RouterView,
            raceContext: { userInput: userText },
            ...(voterProfile ? { voterProfile } : {}),
            ...(ballotContext ? { ballotContext } : {}),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          // Fix for live bug 3 — route rate-limit / budget errors to the
          // BudgetExhausted overlay so the cold-open user gets the full
          // handoff continuity surface, not the inline-text stub from
          // `chatDisabled`. Before this fix, hitting DAILY_LIMIT during
          // cold-open showed only the small "daily session limit" text
          // with no prompt / BYOK / chatbot links surfaced.
          if (shouldRouteToOverlay(errorData.code)) {
            onBudgetExhausted?.({
              handoffPromptText: errorData.handoffPrompt ?? "",
              resetAt: errorData.resetAt ?? defaultRateLimitResetAtISO(),
              // Derive the variant from the actual error code so the correct
              // copy renders for rate-limit vs community-budget gates.
              variant: getGateVariant(errorData.code ?? ""),
            });
            messageCountRef.current -= 1;
            setColdOpenPhase({ kind: "input", draft: userText });
            setIsStreaming(false);
            return;
          }
          handleApiError(errorData);
          messageCountRef.current -= 1;
          setColdOpenPhase({
            kind: "error",
            message:
              (errorData?.error as string | undefined) ??
              t.research.coldOpenParseError,
            draft: userText,
          });
          setIsStreaming(false);
          return;
        }

        // Phase 9 — intercept the structured `budget_exhausted` shape on
        // the cold-open path too (sendMessage already does this; this
        // mirrors the same intercept so the overlay opens when the
        // community-budget gate trips during cold-open). Reading
        // content-type avoids parsing a stream as JSON or vice versa.
        const ct = response.headers.get("content-type") ?? "";
        if (ct.includes("application/json")) {
          const data = (await response.json()) as {
            status?: string;
            resetAt?: string;
            handoffPrompt?: string;
          };
          if (data?.status === "budget_exhausted") {
            onBudgetExhausted?.({
              handoffPromptText: data.handoffPrompt ?? "",
              resetAt: data.resetAt ?? defaultRateLimitResetAtISO(),
              // JSON `budget_exhausted` shape only returns when the community
              // pool is exhausted — hardcode community_budget.
              variant: "community_budget",
            });
            messageCountRef.current -= 1;
            setColdOpenPhase({ kind: "input", draft: userText });
            setIsStreaming(false);
            return;
          }
        }

        await streamResponse(response, {
          onText: (text) => {
            buffer.push(text);
          },
          onDone: (budget) => {
            handleBudgetUpdate(budget);
            const raw = buffer.join("");
            try {
              const themes = parseThemeExtraction(raw);
              if (themes.length === 0) {
                setColdOpenPhase({
                  kind: "error",
                  message: t.research.coldOpenParseError,
                  draft: userText,
                });
                return;
              }
              setColdOpenPhase({
                kind: "themes",
                themes,
                originalUserMessage: userText,
              });
            } catch {
              setColdOpenPhase({
                kind: "error",
                message: t.research.coldOpenParseError,
                draft: userText,
              });
            }
          },
          onError: (err) => {
            setError(err);
            setColdOpenPhase({
              kind: "error",
              message: err,
              draft: userText,
            });
          },
        });
      } catch {
        setColdOpenPhase({
          kind: "error",
          message: t.research.coldOpenParseError,
          draft: userText,
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [
      chatDisabled,
      getBasePrompt,
      voterProfile,
      handleApiError,
      handleBudgetUpdate,
      t.research.coldOpenParseError,
      ballotContext,
      onBudgetExhausted,
    ],
  );

  const handleColdOpenLockIn = useCallback(
    (themes: Theme[]) => {
      setThemesLockedIn(themes);
      onLockInThemes?.(themes);
    },
    [onLockInThemes],
  );

  const handleColdOpenRewrite = useCallback(() => {
    setColdOpenPhase((prev) => {
      if (prev.kind === "themes") {
        return { kind: "input", draft: prev.originalUserMessage };
      }
      if (prev.kind === "error") {
        return { kind: "input", draft: prev.draft };
      }
      return prev;
    });
  }, []);

  /* ── Phase 6 — amendment journal + submit ──────────────────── */
  // Inline message stream entries the WorkspaceChat renders below the regular
  // assistant/user messages. Each entry is the result of one amendment cycle
  // (the per-race verdicts + the new theme name). Lives in ChatPanel local
  // state because the journal is a chat-scoped audit trail; BallotToolClient
  // doesn't need to know about it.
  //
  // Scope note: ChatPanel is re-keyed by activeRace.id in the workspace shell,
  // so the journal naturally clears on race switch. This matches the per-race
  // chat scope set by Phase 1 (prompts.md §256). If a session-wide scrollable
  // amendment history surfaces in a future packet, lift this state up to
  // BallotToolClient.
  const [amendmentJournal, setAmendmentJournal] = useState<
    { newThemeName: string; verdicts: VerdictDecision[] }[]
  >([]);

  /**
   * Submit an amendment payload through the chat route (theme-amendment
   * builder). Parses the response, maps each per-race relevance verdict
   * through the pure decideVerdict() function (D-1: relevance only — no
   * alignment scores, no cross-candidate ranking), appends a journal entry,
   * and notifies the parent of the new locked themes.
   */
  const submitAmendment = useCallback(
    async (input: {
      updatedThemes: Theme[];
      newTheme?: Theme;
      suggestedRank?: number;
      triggeringMessage?: string;
    }) => {
      if (chatDisabled) return;
      const decidedRaces = workspace?.activeRace ? [] : []; // see below
      // Build the amendment payload — userInput is the triggering message
      // (rail-entry → synthesize a stub), themesList is post-edit ranking.
      const userInput =
        input.triggeringMessage ??
        (input.newTheme
          ? `${input.newTheme.name}: ${input.newTheme.quotes.join(" / ")}`
          : "Re-rank only, no new theme.");
      const themesList = input.updatedThemes
        .map((th, i) => `${i + 1}. ${th.name}`)
        .join("\n");
      // decidedJson must reflect the parent's full decision list. We rely on
      // BallotToolClient surfacing this via workspace; for v1 the prompt's
      // own verdict math is sufficient and we don't need server-side rescore.
      const decidedJson = JSON.stringify(decidedRaces);

      messageCountRef.current += 1;

      const buffer: string[] = [];
      const trigger: RouterTrigger = input.triggeringMessage
        ? "amend-from-chat"
        : "amend-from-rail";

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user" as const, content: userInput }],
            systemPrompt: "",
            sessionId: sessionIdRef.current,
            messageCount: messageCountRef.current,
            view: "amend" as RouterView,
            trigger,
            raceContext: {
              userInput,
              themesList,
              decidedJson,
            },
            ...(voterProfile ? { voterProfile } : {}),
            ...(ballotContext ? { ballotContext } : {}),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          handleApiError(errorData);
          messageCountRef.current -= 1;
          // Themes still update — per packet edge case: "themes still update
          // [if re-score fails]; verdicts unavailable."
          return { verdicts: [] as VerdictDecision[] };
        }

        await streamResponse(response, {
          onText: (text) => buffer.push(text),
          onDone: (budget) => handleBudgetUpdate(budget),
          onError: (err) => setError(err),
        });

        const raw = buffer.join("");
        try {
          const parsed = parseThemeAmendment(raw);
          // D-1: the amendment prompt returns a per-issue relevance verdict
          // per race — no alignment scores, no cross-candidate ranking. Map
          // each row through decideVerdict (propositions -> N/A; a relevant
          // theme -> REVISIT; otherwise HOLD).
          const verdicts: VerdictDecision[] = parsed.rescored.map((r) => {
            // Look up the human race label from the parent-supplied map when
            // available — falls back to raceId so the row still renders.
            const raceLabel =
              workspace?.raceLabelLookup?.[r.raceId] ?? r.raceId;
            const race: RescoredRace = {
              raceId: r.raceId,
              raceLabel,
              raceType: r.verdict === "N/A" ? "proposition" : "choice",
              relevantToNewTheme: r.verdict === "REVISIT",
            };
            return decideVerdict(race);
          });
          const newThemeName = parsed.newTheme.name;
          setAmendmentJournal((prev) => [...prev, { newThemeName, verdicts }]);
          return { verdicts, newTheme: parsed.newTheme };
        } catch {
          // Parse failed — surface the journal entry with no verdicts so the
          // user still sees an acknowledgement. The themes update upstream
          // regardless.
          setAmendmentJournal((prev) => [
            ...prev,
            {
              newThemeName: input.newTheme?.name ?? "(theme edit)",
              verdicts: [],
            },
          ]);
          return { verdicts: [] as VerdictDecision[] };
        }
      } catch {
        setError(
          lang === "es"
            ? "Error de conexión durante la enmienda."
            : "Connection error during amendment.",
        );
        return { verdicts: [] as VerdictDecision[] };
      }
    },
    [
      chatDisabled,
      handleApiError,
      handleBudgetUpdate,
      voterProfile,
      ballotContext,
      lang,
      workspace,
    ],
  );

  const handleValuesSubmit = useCallback(
    (messageIdx: number, selection: SubmitPayload) => {
      if (submittedValuesSelectors.has(messageIdx) || isStreaming) return;

      let payload: string;
      let submittedRanked: RankedEntry[];

      if (selection === "skipped") {
        payload = "[VOTER VALUES] skipped";
        submittedRanked = [];
      } else {
        // ranked path: JSON-array payload
        const rankedJson = JSON.stringify(selection.ranked);
        payload = `[VOTER VALUES] ranked=${rankedJson}`;
        submittedRanked = selection.ranked;
      }

      setSubmittedValuesSelectors((prev) => {
        const next = new Map(prev);
        next.set(messageIdx, submittedRanked);
        return next;
      });
      sendMessage(payload, messages);
    },
    [submittedValuesSelectors, isStreaming, sendMessage, messages],
  );

  const handleRaceFinalPick = useCallback(
    (
      messageIdx: number,
      candidateId: string,
      candidateName: string,
      race: string,
    ) => {
      if (submittedRaceFinals.has(messageIdx) || isStreaming) return;
      setSubmittedRaceFinals((prev) => {
        const next = new Map(prev);
        next.set(messageIdx, candidateId);
        return next;
      });
      const payload = `[VOTER PICKED] race="${race}" choice="${candidateId}" candidateName="${candidateName}"`;
      sendMessage(payload, messages);
    },
    [submittedRaceFinals, isStreaming, sendMessage, messages],
  );

  const handleRaceFinalSkip = useCallback(
    (messageIdx: number, race: string) => {
      if (submittedRaceFinals.has(messageIdx) || isStreaming) return;
      setSubmittedRaceFinals((prev) => {
        const next = new Map(prev);
        next.set(messageIdx, null);
        return next;
      });
      sendMessage(`[VOTER SKIPPED] race="${race}"`, messages);
    },
    [submittedRaceFinals, isStreaming, sendMessage, messages],
  );

  const handleConfirmConcerns = useCallback(
    (messageIdx: number, confirmations: ConcernConfirmation[]) => {
      if (submittedConcernInterpretations.has(messageIdx) || isStreaming)
        return;
      setSubmittedConcernInterpretations((prev) => {
        const next = new Map(prev);
        next.set(messageIdx, true);
        return next;
      });
      const confirmationsJson = JSON.stringify(confirmations);
      sendMessage(
        `[VOTER CONFIRMED CONCERNS] confirmations=${confirmationsJson}`,
        messages,
      );
    },
    [submittedConcernInterpretations, isStreaming, sendMessage, messages],
  );

  const handleReinterpretConcern = useCallback(
    (messageIdx: number, rank: number, newText: string) => {
      if (isStreaming) return;
      sendMessage(
        `[VOTER REINTERPRET] sourceRank=${rank} newText=${JSON.stringify(newText)}`,
        messages,
      );
    },
    [isStreaming, sendMessage, messages],
  );

  const handleRemoveConcern = useCallback(
    (messageIdx: number, rank: number) => {
      if (isStreaming) return;
      sendMessage(`[VOTER REMOVE_CONCERN] sourceRank=${rank}`, messages);
    },
    [isStreaming, sendMessage, messages],
  );

  const startSession = useCallback(() => {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;
    const { contextBlock } = getBasePrompt();
    sendMessage(contextBlock, []);
  }, [getBasePrompt, sendMessage]);

  // ── Modal open callbacks (passed down through ChatMessageList) ──

  /**
   * Called when the voter clicks "Compare" on any candidate card. Finds the
   * most recent RACE_PATTERNS + ALIGNMENT_SCORES blocks to supply modal data.
   */
  const handleOpenCompare = useCallback(() => {
    // Find the last assistant message that has a RACE_PATTERNS block
    const lastRaceMsg = [...messages]
      .reverse()
      .find(
        (m) => m.role === "assistant" && m.content.includes("[/RACE_PATTERNS]"),
      );
    if (!lastRaceMsg) return;
    const block = parseRacePatternsBlock(lastRaceMsg.content);
    if (!block) return;
    let alignMap: Map<string, AlignmentScoresEntry> | undefined;
    if (lastRaceMsg.content.includes("[/ALIGNMENT_SCORES]")) {
      const alignBlock = parseAlignmentScoresBlock(lastRaceMsg.content);
      if (alignBlock && alignBlock.race === block.race) {
        alignMap = new Map(alignBlock.entries.map((e) => [e.candidateId, e]));
      }
    }
    setCompareRaceBlock(block);
    setCompareAlignmentMap(alignMap);
    setCompareModalOpen(true);
  }, [messages]);

  /**
   * Called when the voter clicks "See all votes →" on a candidate card.
   * Only opens if the candidate has an alignment entry with contributing votes.
   */
  const handleOpenSeeAllVotes = useCallback(
    (payload: {
      candidate: RacePatternsCandidate;
      alignmentEntry: AlignmentScoresEntry | undefined;
      blindMode: boolean;
      alias: string;
    }) => {
      if (!payload.alignmentEntry) return;
      setAllVotesPayload({
        candidate: payload.candidate,
        alignmentEntry: payload.alignmentEntry,
        blindMode: payload.blindMode,
        alias: payload.alias,
      });
      setAllVotesPanelOpen(true);
    },
    [],
  );

  // Auto-start session on mount — suppressed under the Phase 2 cold-open
  // path and under the Phase 3 workspace path. Phase 3 starts the chat
  // from the user's first typed message (or a suggestion chip). The
  // legacy context-block dispatch only happens for flag-off / pre-lock
  // callers.
  useEffect(() => {
    if (coldOpenActive) return;
    if (workspace) return;
    startSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { basePrompt: fullBasePrompt } = getBasePrompt();
  const handoff = useHandoffState(
    messages,
    isStreaming,
    chatDisabled,
    disabledReason,
    fullBasePrompt,
    zipCode,
  );

  // Warn before tab close once the session has started but before handoff is finalized.
  useEffect(() => {
    if (messages.length === 0 || handoff.parsedHandoff) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [messages.length, handoff.parsedHandoff]);

  // Dev-only URL param override for budget tier — lets QA preview the
  // exhausted/handoff/soft_close banners without polluting real budget state.
  // No-op outside development. See task fix E.
  const searchParams = useSearchParams();
  const devBudgetTier: BudgetTier | null = (() => {
    if (process.env.NODE_ENV !== "development") return null;
    const raw = searchParams?.get("devBudget");
    if (!raw) return null;
    return VALID_DEV_BUDGET_TIERS.has(raw as BudgetTier)
      ? (raw as BudgetTier)
      : null;
  })();
  useEffect(() => {
    if (devBudgetTier) {
      console.warn("[dev] budget tier overridden to:", devBudgetTier);
    }
  }, [devBudgetTier]);

  const effectiveTier: BudgetTier = devBudgetTier ?? budgetStatus.tier;

  // When the dev tier override is in an exhausted-class state, also flip the
  // disabled flag so the exhausted banner actually renders (it gates on
  // chatDisabled, not the tier directly).
  const effectiveChatDisabled =
    chatDisabled ||
    (devBudgetTier !== null &&
      (devBudgetTier === "exhausted" ||
        devBudgetTier === "handoff" ||
        devBudgetTier === "soft_close"));
  const effectiveDisabledReason: DisabledReason | null =
    disabledReason ??
    (devBudgetTier !== null && devBudgetTier !== "normal" ? "budget" : null);

  // Budget is exhausted once the tier leaves the safe "normal"/"notice" set.
  // Server flips chatDisabled only after a request actually fails with
  // BUDGET_EXHAUSTED/BUDGET_SOFT_CLOSE — but the SSE `done` event updates
  // budgetStatus.tier earlier, so this gates the bottom buttons during that
  // window too.
  //
  // PR 7 — OR with the parent-controlled `budgetExhausted` prop. The parent
  // (BallotToolClient.WorkspaceShell) sets this when it surfaces the
  // BudgetExhausted overlay — either reactively (server returned the
  // structured shape) or pre-emptively (user clicked "Continue elsewhere").
  // In the pre-emptive case the SSE tier hasn't necessarily flipped, so the
  // internal derivation alone wouldn't gate the input.
  //
  // BYOK bypass — if the user has a key in localStorage, the chat route
  // is irrelevant to them (they hit api.anthropic.com directly) so we
  // never surface the "budget exhausted" disabled state. Recompute on
  // each render so a key saved mid-session unlocks chat immediately.
  const byokActive = hasByokKey();
  const budgetTierExhausted =
    effectiveTier !== "normal" && effectiveTier !== "notice";
  const budgetExhausted =
    (budgetTierExhausted || budgetExhaustedFromParent) && !byokActive;
  // When the parent's `gateVariant` is provided, use it. Otherwise default
  // to `community_budget` (SSE-tier path has no variant signal).
  const effectiveGateVariant: GateVariant =
    gateVariantFromParent ?? "community_budget";

  const fullContent = messages
    .filter((m) => m.role === "assistant")
    .map((m) => m.content)
    .join("\n");

  // Detect ballot completion — auto-show portfolio when ballot is generated
  const ballotContent = !isStreaming ? extractBallot(fullContent) : null;
  const profileContent = !isStreaming ? extractVoterProfile(fullContent) : null;
  const ballotReady = !!ballotContent && !isStreaming;

  // Auto-trigger portfolio view when ballot first appears
  useEffect(() => {
    if (ballotReady && !showPortfolio) {
      setShowPortfolio(true);
    }
    // Only trigger when ballotReady transitions to true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ballotReady]);

  // Get election name for portfolio header
  const upcoming = state.elections.find(
    (e) => e.date >= getTodayInLatestUsZone(),
  );
  const electionName = upcoming?.name;

  // Show portfolio view when ballot is ready and user hasn't gone back to chat
  if (showPortfolio && ballotContent) {
    return (
      <ResearchPortfolio
        ballotText={ballotContent}
        profileText={profileContent}
        pollingData={pollingData ?? null}
        electionName={electionName}
        onBackToChat={() => setShowPortfolio(false)}
      />
    );
  }

  // Phase 3 — when a workspace prop is provided, render the workspace
  // chat shape: a race header (`Race N of M` + label), a chat message
  // body scoped to the active race (parent re-keys ChatPanel by race id
  // so this list naturally resets across races — UI mirrors the server
  // contract Phase 1 set up), context-aware suggestion chips above the
  // input, and the pick stub + WhyPrompt. Exports (print / profile /
  // handoff) live in the BallotPane footer per packet §3.
  if (workspace) {
    return (
      <WorkspaceChat
        workspace={workspace}
        budgetExhausted={budgetExhausted}
        gateVariant={effectiveGateVariant}
        messages={messages}
        isStreaming={isStreaming}
        onSendMessage={async (msg) => {
          // Phase 6 — AI-judged chat-catch (post fix J). Fires server-side
          // via POST /api/chat-catch; runs in PARALLEL with the main /api/chat
          // call so it never blocks the assistant's response. The judgment
          // promise is awaited AFTER sendMessage completes — that way, if the
          // chip should render, it shows up below the assistant's reply
          // rather than racing in above it.
          //
          // Per user feedback that motivated fix J: the previous 19-keyword
          // heuristic pre-determined what users "care about" (and several
          // keywords leaned politically). The AI judge is neutral by
          // construction; we fail closed (no chip) on any failure.
          const chatCatchPromise =
            workspace.onChatCatch &&
            workspace.lockedThemes &&
            !workspace.pendingAmendment &&
            !workspace.chatCatchSuggestion
              ? shouldSuggestAmend({
                  message: msg,
                  currentThemes: workspace.lockedThemes,
                })
              : null;
          await sendMessage(msg, messages);
          if (chatCatchPromise) {
            const verdict = await chatCatchPromise;
            if (
              verdict.suggest &&
              verdict.suggestedThemeName &&
              workspace.onChatCatch
            ) {
              workspace.onChatCatch({
                message: msg,
                suggestedThemeName: verdict.suggestedThemeName,
                ...(verdict.summary ? { summary: verdict.summary } : {}),
              });
            }
          }
        }}
        chatDisabled={effectiveChatDisabled}
        amendmentJournal={amendmentJournal}
        onAmendmentSave={(payload) => {
          // PR3 bridge: lock commits themes ONLY. The re-score (if any)
          // happens through the AmendRescoreOffer Accept path below — per
          // UX feedback "Re-scoring should be an option, not a default."
          if (workspace.onAmendmentSave) {
            workspace.onAmendmentSave({
              updatedThemes: payload.updatedThemes,
              newTheme: payload.newTheme,
              suggestedRank: payload.suggestedRank,
              triggeringMessage: workspace.pendingAmendment?.triggeringMessage,
            });
          }
        }}
        onAcceptRescoreOffer={async () => {
          // PR3 — fires when the user clicks "Yes, show me the deltas" on
          // the rescore offer. Runs submitAmendment with the offer's stored
          // payload, then clears the offer. The inFlight flag surfaces the
          // spinner on AmendRescoreOffer during the 1-3s rescore window.
          const offer = workspace.pendingRescoreOffer;
          if (!offer) return;
          workspace.onAmendmentInFlightChange?.(true);
          try {
            await submitAmendment({
              updatedThemes: offer.updatedThemes,
              newTheme: offer.newTheme,
              suggestedRank: offer.suggestedRank,
              triggeringMessage: offer.triggeringMessage,
            });
          } finally {
            workspace.onAmendmentInFlightChange?.(false);
            workspace.onRescoreOfferClear?.();
          }
        }}
        blindMode={blindMode}
        onToggleBlindMode={onToggleBlindMode}
        revealedCandidates={revealedCandidates}
        onRevealCandidate={onRevealCandidate}
        onHideCandidate={onHideCandidate}
        onCompare={handleOpenCompare}
        onSeeAllVotes={handleOpenSeeAllVotes}
        issues={issues}
      />
    );
  }

  // Build a synthetic Race from the active compareRaceBlock so CompareModal
  // gets its required `race: Race` prop. The Race type only needs id/label/
  // section/decided/candidates — all derivable from the parsed block.
  const compareRace: Race | null = compareRaceBlock
    ? {
        id: compareRaceBlock.race.toLowerCase().replace(/\s+/g, "-"),
        label: compareRaceBlock.race,
        section: "Federal", // safe fallback — CompareModal only uses label
        decided: false,
        candidates: compareRaceBlock.candidates.map((c) => ({
          name: c.name,
          party: "",
        })),
      }
    : null;

  // Determine if the current error is an AI timeout/transient error (not a
  // budget or rate-limit error). Those are shown via ChatStatusBar already.
  // The inline error div (error && !chatDisabled) maps to AI service failures.
  // Show AITimeoutBanner for all non-null errors that didn't disable chat.
  const isAiTransientError = !!error && !effectiveChatDisabled;

  return (
    <div
      data-testid="chat-window"
      role="log"
      aria-label="Voter Choice chat"
      aria-live="polite"
      className="flex flex-col"
    >
      {/* Phase 2 cold-open branch (flag-on + en, pre-lock-in). */}
      {coldOpenActive && (
        <ColdOpenSurface
          phase={coldOpenPhase}
          onSubmit={submitColdOpen}
          onLockIn={handleColdOpenLockIn}
          onRewrite={handleColdOpenRewrite}
          onPhaseChange={setColdOpenPhase}
          chatDisabled={effectiveChatDisabled}
          t={t}
          coldOpenContext={coldOpenContext}
        />
      )}

      {/* Locked-themes confirmation panel (Phase 3 owns workspace
          transition; Phase 2 simply confirms the lock-in landed). */}
      {themesLockedIn !== null && (
        <ColdOpenLockedPanel themes={themesLockedIn} t={t} />
      )}

      {messages.length > 0 && (
        <>
          <ChatMessageList
            messages={messages}
            isStreaming={isStreaming}
            parsedHandoff={handoff.parsedHandoff}
            continuationPrompt={handoff.continuationPrompt}
            clientFallback={handoff.clientFallback}
            clientContinuationPrompt={handoff.clientContinuationPrompt}
            messagesEndRef={messagesEndRef}
            lastUserMsgRef={lastUserMsgRef}
            submittedValuesSelectors={submittedValuesSelectors}
            onSubmitValues={handleValuesSubmit}
            submittedRaceFinals={submittedRaceFinals}
            onPickRaceFinal={handleRaceFinalPick}
            onSkipRaceFinal={handleRaceFinalSkip}
            submittedConcernInterpretations={submittedConcernInterpretations}
            onConfirmConcerns={handleConfirmConcerns}
            onReinterpretConcern={handleReinterpretConcern}
            onRemoveConcern={handleRemoveConcern}
            stateCode={state.stateCode}
            county={countyName}
            countyName={countyName}
            stateName={state.stateName}
            primary={primary}
            blindMode={blindMode}
            revealedCandidates={revealedCandidates}
            onRevealCandidate={onRevealCandidate}
            onCompare={handleOpenCompare}
            onSeeAllVotes={handleOpenSeeAllVotes}
            onHideCandidate={onHideCandidate}
          />

          {isStreaming && searchActivity && (
            <SearchActivityIndicator activity={searchActivity} />
          )}

          <ChatStatusBar
            budgetTier={effectiveTier}
            chatDisabled={effectiveChatDisabled}
            disabledReason={effectiveDisabledReason}
            error={error}
          />

          {/* AITimeoutBanner — rendered for transient AI errors (not budget/
              rate-limit errors, which are gated by chatDisabled). onRetry
              re-sends the last user message; onHandoff scrolls the chat to
              the HandoffPackage (which auto-mounts via clientFallback logic
              when chatDisabled+needsClientFallback). */}
          {isAiTransientError && (
            <div className="mb-3">
              <AITimeoutBanner
                onRetry={() => {
                  // Find the last user message and re-send from before it
                  const lastUserIdx = messages.reduce(
                    (acc, m, i) => (m.role === "user" ? i : acc),
                    -1,
                  );
                  if (lastUserIdx === -1) return;
                  const lastUserMsg = messages[lastUserIdx];
                  if (!lastUserMsg) return;
                  setError(null);
                  void sendMessage(
                    lastUserMsg.content,
                    messages.slice(0, lastUserIdx),
                  );
                }}
                onHandoff={() => {
                  // Force-show the client fallback handoff by disabling chat
                  // with a session_limit reason — the HandoffPackage renders
                  // automatically when chatDisabled && messages.length > 0.
                  setError(null);
                  setChatDisabled(true);
                  setDisabledReason("session_limit");
                }}
              />
            </div>
          )}

          {/*
           * Note: previously rendered a "Your research portfolio" cue button
           * here when ballot is ready but user returned to chat. Removed —
           * portfolio auto-opens on ballotReady, and an extra navigation cue
           * duplicated the content the user just left.
           */}

          {!effectiveChatDisabled && (
            <div className="sticky bottom-0 z-30 bg-surface-lowest pt-0">
              <ChatInput
                onSubmit={(msg) => sendMessage(msg, messages)}
                isStreaming={isStreaming}
              />
              {!budgetExhausted && !isStreaming && !ballotReady && (
                <button
                  type="button"
                  data-testid="generate-profile-btn"
                  onClick={() =>
                    sendMessage(t.research.generateProfilePrompt, messages)
                  }
                  className="mt-3 w-full bg-surface-low border border-outline-variant/40 text-on-surface py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-surface hover:border-primary/60 transition-colors"
                >
                  {t.research.generateProfileButton}
                </button>
              )}
              {messages.length > 1 && !budgetExhausted && !ballotReady && (
                <button
                  type="button"
                  data-testid="finish-later-btn"
                  disabled={isStreaming}
                  onClick={() =>
                    sendMessage(t.research.finishLaterPrompt, messages)
                  }
                  className="mt-2 text-xs font-bold uppercase tracking-widest text-on-surface-muted hover:text-primary disabled:opacity-50"
                >
                  {t.research.finishLater}
                </button>
              )}
              <p className="text-xs text-on-surface-muted text-right mt-1">
                {t.rateLimit.messageCount(
                  messageCountRef.current,
                  SESSION_MESSAGE_LIMIT,
                )}
              </p>
            </div>
          )}
        </>
      )}

      {/* CompareModal — ONE instance, data set when voter clicks "Compare".
          issues: ConcernInterpretationEntry[] — required by CompareModal.
          The concern interpretation block may or may not be in the session;
          pass empty array as safe fallback (modal renders "—" rows). */}
      {compareModalOpen && compareRace && compareRaceBlock && (
        <CompareModal
          open={compareModalOpen}
          race={compareRace}
          issues={issues}
          blindMode={blindMode}
          revealedCandidates={revealedCandidates}
          onRevealCandidate={onRevealCandidate ?? (() => {})}
          onClose={() => setCompareModalOpen(false)}
          racePatterns={compareRaceBlock}
          alignmentScoresByCandidate={compareAlignmentMap}
        />
      )}

      {/* AllVotesPanel — ONE instance, data set when voter clicks "See all votes →". */}
      {allVotesPanelOpen && allVotesPayload && (
        <AllVotesPanel
          open={allVotesPanelOpen}
          candidate={allVotesPayload.candidate}
          alignmentEntry={allVotesPayload.alignmentEntry}
          blindMode={allVotesPayload.blindMode}
          alias={allVotesPayload.alias}
          onClose={() => setAllVotesPanelOpen(false)}
        />
      )}
    </div>
  );
}
