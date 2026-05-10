"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
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
import {
  parseValuesTagRequestBlock,
  stripValuesTagRequestBlocks,
  hasOpenValuesTagRequestBlock,
  stripPartialValuesTagRequestBlock,
  parseRacePatternsBlock,
  stripRacePatternsBlocks,
  hasOpenRacePatternsBlock,
  stripPartialRacePatternsBlock,
  parseConcernInterpretationBlock,
  stripConcernInterpretationBlocks,
  hasOpenConcernInterpretationBlock,
  stripPartialConcernInterpretationBlock,
} from "../lib/structured-blocks";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

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

interface ChatPanelProps {
  state: StateElectionData;
  zipCode: string;
  pollingData?: PollingDataForPrompt | null;
  onBudgetUpdate?: (budget: BudgetStatus) => void;
  voterProfile?: string | null;
  countyName?: string;
  userSampleBallotText?: string;
  preResearchContext?: string;
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
  const t = translations[lang];
  return (
    <div
      data-testid="values-tag-selector-loading"
      className="my-4 bg-surface-low border-l-4 border-primary/40 p-4 flex items-center gap-3"
    >
      <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
      <span className="text-xs font-bold uppercase tracking-widest text-on-surface-muted">
        {t.research.valuesTagSelectorSubmitting}
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

function RacePatternsLoadingPlaceholder() {
  const { lang } = useLanguage();
  const t = translations[lang];
  return (
    <div
      data-testid="race-patterns-loading"
      className="my-4 bg-surface-low border-l-4 border-primary/40 p-4 flex items-center gap-3"
    >
      <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
      <span className="text-xs font-bold uppercase tracking-widest text-on-surface-muted">
        {t.research.racePatternsSubmitting}
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
    const isOpenBlock = hasOpenRacePatternsBlock(msg.content);
    const parsedDuringStream = parseRacePatternsBlock(msg.content);
    if (isOpenBlock && !parsedDuringStream) {
      const leadIn = stripPartialRacePatternsBlock(msg.content);
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
          <RacePatternsLoadingPlaceholder />
        </article>
      );
    }
    return null;
  }

  if (!msg.content.includes("[/RACE_PATTERNS]")) return null;
  const block = parseRacePatternsBlock(msg.content);
  if (!block) return null;

  // Strip any values-tag-request blocks too — race-patterns wins if both present.
  const prose = stripValuesTagRequestBlocks(
    stripRacePatternsBlocks(msg.content),
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
      />
    </article>
  );
}

/* ── Concern interpretation rendering ───────────────────────── */

function ConcernInterpretationLoadingPlaceholder() {
  const { lang } = useLanguage();
  const t = translations[lang];
  return (
    <div
      data-testid="concern-interpretation-loading"
      className="my-4 bg-surface-low border-l-4 border-primary/40 p-4 flex items-center gap-3"
    >
      <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
      <span className="text-xs font-bold uppercase tracking-widest text-on-surface-muted">
        {t.research.concernInterpretationSubmitting}
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

  // Pin the user's last message at the top when streaming starts
  useEffect(() => {
    if (isStreaming && lastUserMsgRef.current) {
      lastUserMsgRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [isStreaming]);

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

  // Auto-start session on mount
  useEffect(() => {
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

  return (
    <div data-testid="chat-window" className="flex flex-col">
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
          />

          {isStreaming && searchActivity && (
            <SearchActivityIndicator activity={searchActivity} />
          )}

          <ChatStatusBar
            budgetTier={budgetStatus.tier}
            chatDisabled={chatDisabled}
            disabledReason={disabledReason}
            error={error}
          />

          {/* Show portfolio button if ballot is ready but user went back to chat */}
          {ballotReady && !showPortfolio && (
            <button
              onClick={() => setShowPortfolio(true)}
              className="mb-4 w-full bg-primary text-white py-4 font-black text-lg flex items-center justify-center gap-3 hover:opacity-90 active:scale-[0.98] transition-all"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zM8 17h8v-2H8v2zm0-4h8v-2H8v2z" />
              </svg>
              {translations[lang].portfolio.title}
            </button>
          )}

          {!chatDisabled && (
            <div className="sticky bottom-0 z-30 bg-surface-lowest pt-0">
              {messages.length > 1 && (
                <button
                  type="button"
                  data-testid="finish-later-btn"
                  disabled={isStreaming}
                  onClick={() =>
                    sendMessage(t.research.finishLaterPrompt, messages)
                  }
                  className="mb-2 text-xs font-bold uppercase tracking-widest text-on-surface-muted hover:text-primary disabled:opacity-50"
                >
                  {t.research.finishLater}
                </button>
              )}
              <ChatInput
                onSubmit={(msg) => sendMessage(msg, messages)}
                isStreaming={isStreaming}
              />
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
