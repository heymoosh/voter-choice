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
import { ConcernInterpretation } from "./ConcernInterpretation";
import type { ConcernConfirmation } from "./ConcernInterpretation";
import { ColdOpenInput } from "./ColdOpenInput";
import { parseThemeExtraction } from "../lib/prompts/parse-theme-extraction";
import { parseThemeAmendment } from "../lib/prompts/parse-theme-amendment";
import type { Theme, RouterView, RouterTrigger } from "../lib/prompts/types";
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
import type { AlignmentScoresEntry } from "../lib/structured-blocks";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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
   * Fired when the chat-catch heuristic decides the user's just-submitted
   * message names a new concern. ChatPanel runs the heuristic client-side;
   * BallotToolClient decides whether to surface the chip and what the
   * candidate-new-theme should look like.
   */
  onChatCatch?: (input: {
    message: string;
    suggestedKeywords: string[];
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
   * Phase 9 — fired when the chat route returns the structured
   * `{ status: "budget_exhausted", resetAt, handoffPrompt }` response. The
   * parent should mount the BudgetExhausted continuity screen instead of
   * surfacing this as an error. Without this prop ChatPanel falls back to
   * its legacy error surface (so flag-off callers stay unchanged).
   */
  onBudgetExhausted?: (input: {
    handoffPromptText: string;
    resetAt: string;
  }) => void;
}

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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

function getDisabledMessage(
  reason: DisabledReason | null,
  t: (typeof translations)["en"],
): string {
  if (reason === "session_limit") return t.rateLimit.sessionLimit;
  if (reason === "rate_limit") return t.rateLimit.ipLimit;
  return t.budget.exhausted;
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
        <div className="flex justify-end">
          <div
            className="max-w-md bg-surface-lowest border border-outline-variant/40 px-4 py-3 text-sm leading-relaxed text-on-surface shadow-sm"
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
      <div className="text-sm leading-relaxed text-on-surface">
        <MarkdownText text={displayContent} />
        {isCurrentlyStreaming && (
          <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse" />
        )}
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
}: {
  phase: ColdOpenPhase;
  onSubmit: (text: string) => void;
  onLockIn: (themes: Theme[]) => void;
  onRewrite: () => void;
  onPhaseChange: (next: ColdOpenPhase) => void;
  chatDisabled: boolean;
  t: (typeof translations)["en"];
}) {
  if (phase.kind === "thinking") {
    return (
      <div
        data-testid="cold-open-thinking"
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
      {phase.kind === "error" && (
        <div
          data-testid="cold-open-error"
          role="status"
          className="bg-amber-50 border-l-4 border-amber-400 p-3 text-xs text-amber-900"
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
      className="bg-surface-low border-l-4 border-primary p-4 md:p-5 space-y-3"
    >
      <header>
        <h3 className="text-base md:text-lg font-black uppercase tracking-wide text-on-surface leading-tight">
          {t.research.coldOpenLockedHeading}
        </h3>
        <p className="mt-1 text-xs text-on-surface-muted">
          {t.research.coldOpenLockedSubhead}
        </p>
      </header>
      <ol className="list-decimal pl-6 space-y-1">
        {themes.map((theme, i) => (
          <li
            key={`${i}-${theme.name}`}
            data-testid={`cold-open-locked-theme-${i}`}
            className="text-sm font-medium text-on-surface"
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
  const label =
    variant === "alignment"
      ? lang === "es"
        ? "Calculando puntajes de alineación…"
        : "Computing alignment scores…"
      : lang === "es"
        ? "Cargando tarjetas de candidatos…"
        : "Loading candidate cards…";
  return (
    <div
      data-testid="race-patterns-loading"
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

function renderRacePatterns(
  msg: ChatMessage,
  idx: number,
  isLastAssistant: boolean,
  isStreaming: boolean,
  submittedEntry: { submitted: boolean; pickedId: string | null },
  onPick: (candidateId: string, candidateName: string) => void,
  onSkip: () => void,
  parentIsStreaming: boolean,
): React.ReactElement | null {
  if (msg.role !== "assistant" || !isLastAssistant) return null;

  // Streaming placeholder: half-emitted block during stream
  if (isStreaming) {
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

      {error && !chatDisabled && (
        <div className="mb-3 bg-surface-low border-l-4 border-accent p-4 text-sm text-on-surface">
          {error}
        </div>
      )}
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
  messages,
  isStreaming,
  onSendMessage,
  chatDisabled,
  amendmentJournal = [],
  onAmendmentSave,
  onAcceptRescoreOffer,
}: {
  workspace: WorkspaceModeProps;
  budgetExhausted: boolean;
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
  // real cards land.
  const firstCandidate = activeRace.candidates?.[0]?.name;
  const lastName = firstCandidate?.split(/\s+/).pop() ?? "this candidate";
  const suggestions: { id: string; label: string }[] = [
    {
      id: "show-votes",
      label: `Show me ${lastName}'s key votes`,
    },
    { id: "compare-donors", label: "Compare donor bases" },
    { id: "explain-race", label: `Explain ${activeRace.label} in plain terms` },
  ];

  return (
    <section
      data-testid="workspace-chat"
      role="log"
      aria-label="Voter Choice chat"
      aria-live="polite"
      className="flex h-full flex-col overflow-hidden bg-surface"
    >
      <header
        data-testid="workspace-chat-header"
        className="border-b border-outline-variant/30 p-4"
      >
        <div className="text-xs font-bold uppercase tracking-widest text-on-surface-muted">
          Race {activeRaceIndex + 1} of {totalRaces}
        </div>
        <h2 className="mt-1 font-black text-lg tracking-tight text-on-surface">
          {activeRace.label}
        </h2>
      </header>

      {/* Chat message body — scoped to active race. Parent re-keys
          ChatPanel by activeRace.id, so messages naturally clear on race
          switch (UI mirrors Phase 1's server contract). */}
      <div
        data-testid="workspace-chat-messages"
        className="flex-1 overflow-y-auto p-4"
      >
        {messages.length === 0 &&
        amendmentJournal.length === 0 &&
        !workspace.pendingAmendment &&
        !workspace.pendingRescoreOffer &&
        !workspace.chatCatchSuggestion ? (
          <p className="text-sm text-on-surface-muted">
            Ask anything about {activeRace.label}.
          </p>
        ) : (
          <>
            {messages.length > 0 && (
              <ul className="flex flex-col gap-3">
                {messages.map((m, i) => (
                  <li
                    key={i}
                    data-testid={
                      m.role === "user"
                        ? "chat-message-user"
                        : "chat-message-ai"
                    }
                    className={
                      m.role === "user"
                        ? "self-end max-w-md bg-surface-lowest border border-outline-variant/40 px-3 py-2 text-sm text-on-surface"
                        : "max-w-2xl text-sm text-on-surface"
                    }
                  >
                    <MarkdownText text={m.content} />
                  </li>
                ))}
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
                candidateNewTheme={workspace.pendingAmendment.candidateNewTheme}
                triggeringMessage={workspace.pendingAmendment.triggeringMessage}
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
          </>
        )}
      </div>

      <WorkspacePickArea
        activeRace={activeRace}
        decided={decided}
        budgetExhausted={budgetExhausted}
        onCommitDecision={onCommitDecision}
        onUnpickDecision={onUnpickDecision}
      />

      {!chatDisabled && (
        <div
          data-testid="workspace-chat-suggestions"
          className="flex flex-wrap gap-2 border-t border-outline-variant/30 p-3"
        >
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              data-testid={`workspace-chat-suggestion-${s.id}`}
              onClick={() => onSendMessage(s.label)}
              disabled={isStreaming}
              className="border border-outline-variant/40 px-3 py-1 text-xs text-on-surface hover:bg-surface-low disabled:opacity-50"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {!chatDisabled && (
        <WorkspaceChatInput
          onSubmit={onSendMessage}
          isStreaming={isStreaming}
          activeRaceLabel={activeRace.label}
        />
      )}
    </section>
  );
}

function WorkspaceChatInput({
  onSubmit,
  isStreaming,
  activeRaceLabel,
}: {
  onSubmit: (msg: string) => void;
  isStreaming: boolean;
  activeRaceLabel: string;
}) {
  const [input, setInput] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    onSubmit(trimmed);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-outline-variant/30 p-3"
    >
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
          placeholder={`Ask anything about ${activeRaceLabel}…`}
          disabled={isStreaming}
          rows={2}
          className="flex-1 border border-outline-variant/30 bg-surface-lowest p-2 text-sm text-on-surface disabled:opacity-50"
        />
        <button
          type="submit"
          data-testid="workspace-chat-send"
          disabled={isStreaming || !input.trim()}
          className="bg-primary px-3 py-2 text-xs font-bold uppercase tracking-widest text-on-primary hover:bg-primary/90 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </form>
  );
}

function WorkspacePickArea({
  activeRace,
  decided,
  budgetExhausted,
  onCommitDecision,
  onUnpickDecision,
}: {
  activeRace: WorkspaceModeProps["activeRace"];
  decided: boolean;
  budgetExhausted: boolean;
  onCommitDecision: WorkspaceModeProps["onCommitDecision"];
  onUnpickDecision: WorkspaceModeProps["onUnpickDecision"];
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
  const defaultCandidate =
    activeRace.candidates && activeRace.candidates[0]
      ? activeRace.candidates[0]
      : { name: activeRace.label, party: "" };

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
    <div className="flex flex-col gap-3 text-sm">
      {budgetExhausted ? (
        <p className="text-on-surface-muted">
          Budget exhausted — see the right pane footer for next steps.
        </p>
      ) : decided ? (
        <button
          type="button"
          data-testid="workspace-unpick-trigger"
          data-race-id={activeRace.id}
          onClick={() => onUnpickDecision(activeRace.id)}
          className="self-start border border-outline-variant/40 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-on-surface hover:bg-surface-low"
        >
          Undo pick
        </button>
      ) : (
        <button
          type="button"
          data-testid="workspace-pick-trigger"
          data-race-id={activeRace.id}
          onClick={() => openWhyFor(defaultCandidate)}
          className="self-start bg-primary px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-on-primary hover:bg-primary/90"
        >
          Pick {defaultCandidate.name}
        </button>
      )}

      {whyOpen && stagedCandidate && (
        <div
          data-testid="workspace-why-prompt"
          className="border border-outline-variant/40 bg-surface-lowest p-3"
        >
          <label
            htmlFor="workspace-why-textarea"
            className="text-xs font-bold uppercase tracking-widest text-on-surface-muted"
          >
            Why are you picking {stagedCandidate.name}?
          </label>
          <textarea
            id="workspace-why-textarea"
            data-testid="workspace-why-textarea"
            value={whyDraft}
            onChange={(e) => setWhyDraft(e.target.value)}
            rows={3}
            className="mt-2 w-full border border-outline-variant/30 bg-surface p-2 text-sm text-on-surface"
            placeholder="One line you'll see on your printed ballot."
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              data-testid="workspace-why-commit"
              onClick={commit}
              className="bg-primary px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-on-primary hover:bg-primary/90"
            >
              Commit pick
            </button>
            <button
              type="button"
              data-testid="workspace-why-cancel"
              onClick={cancel}
              className="border border-outline-variant/40 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-on-surface hover:bg-surface-low"
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
  workspace,
  onLockInThemes,
  ballotContext,
  onBudgetExhausted,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionStartedRef = useRef(false);
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
  const sessionIdRef = useRef(generateSessionId());
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
  const coldOpenActive =
    promptFleetV2Enabled && lang === "en" && themesLockedIn === null;

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
    async (userMessage: string, currentMessages: ChatMessage[]) => {
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
        { role: "user", content: userMessage },
      ];
      setMessages(newMessages);

      const { basePrompt } = getBasePrompt();

      // Phase 3 — when in workspace mode, send the request shape Phase 1's
      // router expects: view + activeRace{Type,Id} + prevActiveRaceId, plus
      // a minimal raceContext slice the race-deep-dive / proposition
      // builders need. Without this the chat route falls back to the
      // legacy prompt, even with PROMPT_FLEET_V2 on. See
      // .ai/work-packets/redesign-phase-3-workspace-split.md step 4.
      const workspaceContextBody = (() => {
        const ws = workspace;
        if (!ws?.activeRace) return undefined;
        const isProposition =
          !ws.activeRace.candidates || ws.activeRace.candidates.length === 0;
        const view: RouterView = isProposition
          ? "workspace-prop"
          : "workspace-race";
        const raceType: RaceType = isProposition ? "proposition" : "choice";
        return {
          view,
          activeRaceType: raceType,
          activeRaceId: ws.activeRace.id,
          prevActiveRaceId: ws.prevActiveRaceId ?? undefined,
          raceContext: {
            raceLabel: ws.activeRace.label,
            state: state.stateCode,
            county: countyName,
            candidatesJson: ws.activeRace.candidates
              ? JSON.stringify(ws.activeRace.candidates)
              : undefined,
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
          await streamWithByok(
            {
              systemPrompt: byokSystem,
              messages: newMessages,
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
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages,
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
   * builder). Parses the response, computes per-race verdicts via the pure
   * decideVerdict() function (falling back to the prompt's `verdictHint` when
   * runtime lacks per-candidate scores), appends a journal entry, and
   * notifies the parent of the new locked themes.
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
          // For v1 the runtime lacks per-candidate scores, so decideVerdict()
          // will always return HOLD without the prompt's hint. Fall back to
          // verdictHint when otherCandidateScores is empty (the v1 path).
          const verdicts: VerdictDecision[] = parsed.rescored.map((r) => {
            // Build a RescoredRace with empty otherCandidateScores. Look up
            // the human race label from the parent-supplied map when
            // available — falls back to raceId so the row still renders.
            const raceLabel =
              workspace?.raceLabelLookup?.[r.raceId] ?? r.raceId;
            const race: RescoredRace = {
              raceId: r.raceId,
              raceLabel,
              raceType: r.verdictHint === "N/A" ? "proposition" : "choice",
              oldScore: r.oldScore,
              newScore: r.newScore,
              otherCandidateScores: [],
            };
            const pure = decideVerdict(race);
            // V1 fallback: when the pure function lacks other-candidate data
            // and the prompt gave a stronger verdict (REVISIT / N/A), prefer
            // the hint. decideVerdict alone would always say HOLD without
            // candidate scores — defeating the feature.
            if (pure.verdict === "HOLD" && r.verdictHint) {
              if (r.verdictHint === "REVISIT" || r.verdictHint === "N/A") {
                return { ...pure, verdict: r.verdictHint };
              }
            }
            return pure;
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
  const budgetExhausted =
    effectiveTier !== "normal" && effectiveTier !== "notice";

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
    (e) => e.date >= new Date().toISOString().split("T")[0],
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
        messages={messages}
        isStreaming={isStreaming}
        onSendMessage={(msg) => {
          // Phase 6 — conservative chat-catch heuristic. Fires CLIENT-SIDE on
          // user-message submit (no server roundtrip). When it suggests a new
          // theme, we surface a soft proposal chip via the parent; otherwise
          // we fall straight through to sendMessage.
          if (
            workspace.onChatCatch &&
            workspace.lockedThemes &&
            !workspace.pendingAmendment &&
            !workspace.chatCatchSuggestion
          ) {
            const verdict = shouldSuggestAmend({
              message: msg,
              currentThemes: workspace.lockedThemes,
            });
            if (verdict.suggest && verdict.suggestedKeywords) {
              workspace.onChatCatch({
                message: msg,
                suggestedKeywords: verdict.suggestedKeywords,
              });
            }
          }
          sendMessage(msg, messages);
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
      />
    );
  }

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
    </div>
  );
}
