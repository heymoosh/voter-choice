"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  HandoffPackage,
  parseHandoffMarkers,
  buildContinuationPrompt,
  buildClientFallbackHandoff,
} from "./HandoffPackage";
import { BallotActions } from "./BallotActions";
import { StructuredBlocks } from "./StructuredCards";
import { ResearchProgressBar } from "./ResearchProgress";
import { parseStructuredContent, computeProgress } from "../lib/chatParser";
import type { StructuredBlock } from "../lib/chatParser";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import type { StateElectionData } from "../types/election";
import { generatePrompt } from "../lib/generatePrompt";
import type { PollingDataForPrompt } from "../lib/generatePrompt";
import { extractBallot, extractVoterProfile } from "../lib/ballot-utils";
import { ResearchPortfolio } from "./ResearchPortfolio";
import { MarkdownText } from "./MarkdownText";

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
        <span className="italic truncate max-w-xs">“{activity.query}”</span>
      )}
    </div>
  );
}

function InlinePrivacyNotice() {
  const { lang } = useLanguage();

  return (
    <div data-testid="chat-privacy-notice" className="mb-4">
      <p className="text-xs text-on-surface-muted text-center">
        {lang === "es"
          ? "Privacidad: el chat se envía a Anthropic para responder. No escribas tu nombre, dirección exacta, teléfono, correo electrónico ni otros datos identificables."
          : "Privacy: chat is sent to Anthropic for responses, but we do not include your address in the AI prompt. Do not type your name, exact address, phone, email, or other identifying details."}
      </p>
    </div>
  );
}

// eslint-disable-next-line complexity
function ResearchMemoCard({
  msg,
  isLast,
  isStreaming,
  state,
}: {
  msg: ChatMessage;
  isLast: boolean;
  isStreaming: boolean;
  state?: StateElectionData;
}) {
  const { lang } = useLanguage();
  const t = translations[lang];
  const showActions = !isStreaming || !isLast;

  const upcoming = state?.elections.find(
    (e) => e.date >= new Date().toISOString().split("T")[0],
  );
  const ref = upcoming
    ? `${state?.stateCode}-${upcoming.date}`
    : (state?.stateCode ?? "");

  const parsed = parseStructuredContent(msg.content);

  return (
    <div data-testid="chat-message-assistant">
      <div className="flex items-center gap-2 mb-4">
        <svg
          className="text-primary"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">
          {t.research.memoLabel}{" "}
          {ref ? `\u2022 ${t.research.ballotSelections}` : ""}
        </span>
      </div>
      <div className="bg-surface-lowest border-l-4 border-primary p-4 md:p-10 shadow-[0_4px_24px_-10px_rgba(0,0,0,0.05)]">
        {/* Content */}
        <div className="text-sm leading-relaxed text-on-surface-variant">
          <MarkdownText text={parsed.displayText} />
          {isStreaming && isLast && (
            <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse" />
          )}
        </div>

        {/* Structured cards */}
        {!isStreaming && parsed.blocks.length > 0 && (
          <StructuredBlocks blocks={parsed.blocks} />
        )}

        {/* Verified Sources */}
        {!isStreaming && parsed.blocks.length > 0 && (
          <div className="pt-6 mt-6 border-t border-outline-variant/20">
            <VerifiedSourcesIndicator />
          </div>
        )}

        {/* Status indicators */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface-low p-4 border-b-2 border-outline-variant/30">
            <span className="block text-[10px] font-bold text-accent uppercase mb-1">
              {t.research.statusLabel}
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-sm font-bold text-on-surface">
                {t.research.statusInitialized}
              </span>
            </div>
          </div>
          {state && (
            <div className="bg-surface-low p-4 border-b-2 border-outline-variant/30">
              <span className="block text-[10px] font-bold text-accent uppercase mb-1">
                {t.research.regionLabel}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-on-surface">
                  State of {state.stateName}
                </span>
              </div>
            </div>
          )}
        </div>

        {showActions && <BallotActions content={msg.content} />}
      </div>
    </div>
  );
}

function VerifiedSourcesIndicator() {
  const { lang } = useLanguage();
  const t = translations[lang];

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-muted">
        {t.research.verifiedSources}
      </span>
      <p className="text-xs text-on-surface-muted">
        {t.research.sourcesDisclaimer}
      </p>
    </div>
  );
}

// eslint-disable-next-line complexity
function ChatMessageBubble({
  msg,
  isLast,
  isStreaming,
  isFirstAssistant,
  isFirstUser,
  state,
}: {
  msg: ChatMessage;
  isLast: boolean;
  isStreaming: boolean;
  isFirstAssistant?: boolean;
  isFirstUser?: boolean;
  state?: StateElectionData;
}) {
  const { lang } = useLanguage();

  if (msg.role === "user") {
    // The first user message is the auto-generated context block — show only
    // the intro line (before the first newline) and hide the long payload.
    const displayContent = isFirstUser
      ? msg.content.split("\n")[0]
      : msg.content;

    return (
      <article className="max-w-3xl mx-auto pt-4">
        <div className="flex gap-4 items-start">
          <div className="bg-primary p-2 text-white shrink-0">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">
              {lang === "es"
                ? "ENFOQUE DE INVESTIGACI\u00d3N ACTUAL"
                : "CURRENT RESEARCH FOCUS"}
            </h2>
            <div
              className="text-lg md:text-2xl font-bold text-on-surface leading-tight tracking-tight"
              data-testid="chat-message-user"
            >
              <MarkdownText text={displayContent} />
            </div>
          </div>
        </div>
      </article>
    );
  }

  if (isFirstAssistant) {
    return (
      <ResearchMemoCard
        msg={msg}
        isLast={isLast}
        isStreaming={isStreaming}
        state={state}
      />
    );
  }

  const showActions = !isStreaming || !isLast;
  const isCurrentlyStreaming = isStreaming && isLast;
  const parsed = parseStructuredContent(msg.content);

  return (
    <article data-testid="chat-message-assistant" className="max-w-3xl mx-auto">
      <div className="bg-surface-lowest border-l-4 border-primary p-4 md:p-10 shadow-sm">
        <div className="text-sm leading-relaxed text-on-surface-variant">
          <MarkdownText text={parsed.displayText} />
          {isCurrentlyStreaming && (
            <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse" />
          )}
        </div>

        {/* Structured cards */}
        {!isCurrentlyStreaming && parsed.blocks.length > 0 && (
          <StructuredBlocks blocks={parsed.blocks} />
        )}

        {/* Verified Sources for messages with structured content */}
        {!isCurrentlyStreaming && parsed.blocks.length > 0 && (
          <div className="pt-6 mt-6 border-t border-outline-variant/20">
            <VerifiedSourcesIndicator />
          </div>
        )}

        {showActions && <BallotActions content={msg.content} />}
      </div>
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

function QuickActionChips({
  onChipClick,
  isStreaming,
}: {
  onChipClick: (text: string) => void;
  isStreaming: boolean;
}) {
  const { lang } = useLanguage();
  const t = translations[lang];
  const chips = [
    t.research.chipCounty,
    t.research.chipCandidates,
    t.research.chipBallot,
    t.research.chipNotSure,
  ];

  return (
    <div className="mt-3 flex gap-2 md:gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          disabled={isStreaming}
          onClick={() => onChipClick(chip)}
          className="whitespace-nowrap px-3 md:px-4 py-2 min-h-[36px] rounded-full border border-outline-variant/30 text-xs font-medium text-on-surface-variant hover:bg-surface-low transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}

function OutputRequestButton({
  onClick,
  isStreaming,
}: {
  onClick: () => void;
  isStreaming: boolean;
}) {
  const { lang } = useLanguage();
  const label =
    lang === "es" ? "Generar mi boleta imprimible" : "Generate my printout";
  const helper =
    lang === "es"
      ? "Crea una boleta de una página y mi perfil de votante local."
      : "Create a one-page ballot and my local voter profile.";

  return (
    <button
      type="button"
      data-testid="generate-output-btn"
      disabled={isStreaming}
      onClick={onClick}
      className="mb-3 w-full border-2 border-primary/30 bg-surface-lowest px-4 py-3 text-left hover:border-primary hover:bg-primary/5 disabled:opacity-50 disabled:pointer-events-none transition-colors"
    >
      <span className="block text-sm font-black text-on-surface">{label}</span>
      <span className="block text-xs text-on-surface-muted mt-1">{helper}</span>
    </button>
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
  state,
}: {
  messages: ChatMessage[];
  isStreaming: boolean;
  parsedHandoff: ReturnType<typeof parseHandoffMarkers>;
  continuationPrompt: string;
  clientFallback: ReturnType<typeof buildClientFallbackHandoff> | null;
  clientContinuationPrompt: string;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  lastUserMsgRef: React.RefObject<HTMLDivElement | null>;
  state?: StateElectionData;
}) {
  const { lang } = useLanguage();
  const t = translations[lang];

  // Track first user, first assistant, and last user message indices
  const firstUserIdx = messages.findIndex((m) => m.role === "user");
  const firstAssistantIdx = messages.findIndex((m) => m.role === "assistant");
  const lastUserIdx = messages.reduce(
    (acc, m, i) => (m.role === "user" ? i : acc),
    -1,
  );

  return (
    <div className="space-y-8 mb-4 pr-1 pb-20">
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

        return (
          <div key={i} ref={i === lastUserIdx ? lastUserMsgRef : undefined}>
            <ChatMessageBubble
              msg={msg}
              isLast={i === messages.length - 1}
              isStreaming={isStreaming}
              isFirstAssistant={i === firstAssistantIdx}
              isFirstUser={i === firstUserIdx}
              state={state}
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

  const handleChipClick = useCallback(
    (text: string) => {
      sendMessage(text, messages);
    },
    [sendMessage, messages],
  );

  const handleOutputRequest = useCallback(() => {
    const request =
      lang === "es"
        ? "Genera ahora el Resultado A: Mi Boleta — 1 Página Impresa y el Resultado B: Mi Perfil de Votante. Incluye solo elecciones que he confirmado claramente; marca cualquier contienda pendiente como INDECISO/A. Déjame revisar el perfil antes de guardarlo."
        : "Generate Output A: My Ballot — 1 Page Printout and Output B: My Voter Profile now. Include only choices I have clearly confirmed; mark anything still pending as UNDECIDED. Let me review the profile before I save it.";
    sendMessage(request, messages);
  }, [lang, sendMessage, messages]);

  // Compute research progress from all assistant messages
  const allBlocks: StructuredBlock[] = [];
  const fullContent = messages
    .filter((m) => m.role === "assistant")
    .map((m) => {
      const parsed = parseStructuredContent(m.content);
      allBlocks.push(...parsed.blocks);
      return m.content;
    })
    .join("\n");

  const progress = computeProgress(
    allBlocks,
    messageCountRef.current,
    fullContent,
  );

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
      <InlinePrivacyNotice />

      {messages.length > 0 && (
        <>
          {/* Progress bar — shown once conversation has started */}
          {messages.length > 0 && <ResearchProgressBar progress={progress} />}

          <ChatMessageList
            messages={messages}
            isStreaming={isStreaming}
            parsedHandoff={handoff.parsedHandoff}
            continuationPrompt={handoff.continuationPrompt}
            clientFallback={handoff.clientFallback}
            clientContinuationPrompt={handoff.clientContinuationPrompt}
            messagesEndRef={messagesEndRef}
            lastUserMsgRef={lastUserMsgRef}
            state={state}
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
            <>
              {messages.length > 1 && (
                <OutputRequestButton
                  onClick={handleOutputRequest}
                  isStreaming={isStreaming}
                />
              )}
              <ChatInput
                onSubmit={(msg) => sendMessage(msg, messages)}
                isStreaming={isStreaming}
              />
              <QuickActionChips
                onChipClick={handleChipClick}
                isStreaming={isStreaming}
              />
              <p className="text-xs text-on-surface-muted text-right mt-1">
                {t.rateLimit.messageCount(
                  messageCountRef.current,
                  SESSION_MESSAGE_LIMIT,
                )}
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
