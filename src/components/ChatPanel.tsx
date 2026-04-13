"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Notice } from "./ui/Notice";
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
}

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function processSSELine(
  line: string,
  onText: (text: string) => void,
  onDone: (budget: BudgetStatus) => void,
  onError: (error: string) => void,
) {
  if (!line.startsWith("data: ")) return;
  try {
    const data = JSON.parse(line.slice(6));
    if (data.type === "text") onText(data.text);
    else if (data.type === "done" && data.budget) onDone(data.budget);
    else if (data.type === "error") onError(data.error);
  } catch {
    // Skip malformed SSE lines
  }
}

async function streamResponse(
  response: Response,
  onText: (text: string) => void,
  onDone: (budget: BudgetStatus) => void,
  onError: (error: string) => void,
) {
  const reader = response.body?.getReader();
  if (!reader) {
    onError("Failed to read response.");
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
      processSSELine(line, onText, onDone, onError);
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

function InlinePrivacyNotice() {
  const { lang } = useLanguage();

  return (
    <div data-testid="chat-privacy-notice" className="mb-4">
      <p className="text-xs text-on-surface-muted text-center">
        {lang === "es"
          ? "Tu conversación permanece solo en tu navegador — no la almacenamos. Descarga tu boleta antes de salir."
          : "Your conversation stays in your browser only \u2014 we don\u2019t store it. Download your ballot before leaving."}
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
      <div className="bg-surface-lowest border-l-4 border-primary p-6 md:p-10 shadow-[0_4px_24px_-10px_rgba(0,0,0,0.05)]">
        {/* Content */}
        <div className="text-sm whitespace-pre-wrap leading-relaxed text-on-surface-variant">
          {parsed.displayText}
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
  state,
}: {
  msg: ChatMessage;
  isLast: boolean;
  isStreaming: boolean;
  isFirstAssistant?: boolean;
  state?: StateElectionData;
}) {
  const { lang } = useLanguage();

  if (msg.role === "user") {
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
            <p
              className="text-xl md:text-2xl font-bold text-on-surface leading-tight tracking-tight"
              data-testid="chat-message-user"
            >
              {msg.content}
            </p>
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
      <div className="bg-surface-lowest border-l-4 border-primary p-6 md:p-10 shadow-sm">
        <div className="text-sm whitespace-pre-wrap leading-relaxed text-on-surface-variant">
          {parsed.displayText}
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
        <div className="p-4 flex flex-col">
          <label
            className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2"
            htmlFor="chat-input"
          >
            {t.research.deepSearchLabel}
          </label>
          <div className="flex items-end gap-4">
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
    <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          disabled={isStreaming}
          onClick={() => onChipClick(chip)}
          className="whitespace-nowrap px-4 py-1.5 rounded-full border border-outline-variant/30 text-xs font-medium text-on-surface-variant hover:bg-surface-low transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {chip}
        </button>
      ))}
    </div>
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
  state,
}: {
  messages: ChatMessage[];
  isStreaming: boolean;
  parsedHandoff: ReturnType<typeof parseHandoffMarkers>;
  continuationPrompt: string;
  clientFallback: ReturnType<typeof buildClientFallbackHandoff> | null;
  clientContinuationPrompt: string;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  state?: StateElectionData;
}) {
  const { lang } = useLanguage();
  const t = translations[lang];

  // Track first assistant message index
  const firstAssistantIdx = messages.findIndex((m) => m.role === "assistant");

  return (
    <div className="space-y-8 mb-4 overflow-y-auto pr-1 pb-20">
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
          <ChatMessageBubble
            key={i}
            msg={msg}
            isLast={i === messages.length - 1}
            isStreaming={isStreaming}
            isFirstAssistant={i === firstAssistantIdx}
            state={state}
          />
        );
      })}

      {clientFallback && (
        <div>
          <Notice variant="warning" className="mb-3">
            <p className="font-semibold mb-1">
              {t.handoff.clientFallbackHeader}
            </p>
            <p>{t.handoff.clientFallbackBody}</p>
          </Notice>
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
          <Notice variant="info">
            <p className="text-xs">{t.budget.notice}</p>
          </Notice>
        </div>
      )}

      {chatDisabled && (
        <div data-testid="chat-disabled-message" className="mb-3">
          <Notice variant="warning">
            <p>{getDisabledMessage(disabledReason, t)}</p>
          </Notice>
        </div>
      )}

      {error && !chatDisabled && (
        <Notice variant="warning" className="mb-3">
          {error}
        </Notice>
      )}
    </>
  );
}

/* ── Main component ─────────────────────────────────────────── */

export function ChatPanel({
  state,
  zipCode,
  pollingData,
  onBudgetUpdate,
  voterProfile,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus>({
    tier: "normal",
    percent: 0,
  });
  const [chatDisabled, setChatDisabled] = useState(false);
  const [disabledReason, setDisabledReason] = useState<DisabledReason | null>(
    null,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef(generateSessionId());
  const messageCountRef = useRef(0);
  const { lang } = useLanguage();
  const t = translations[lang];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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
    );
  }, [state, zipCode, lang, pollingData]);

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
          handleApiError(await response.json());
          setIsStreaming(false);
          return;
        }

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        await streamResponse(
          response,
          (text) => {
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
          (budget) => handleBudgetUpdate(budget),
          (err) => setError(err),
        );
      } catch {
        setError(
          lang === "es"
            ? "Error de conexión. Inténtelo de nuevo."
            : "Connection error. Please try again.",
        );
      } finally {
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
    setSessionStarted(true);
    const { contextBlock } = getBasePrompt();
    sendMessage(contextBlock, []);
  }, [getBasePrompt, sendMessage]);

  // Auto-start session on mount
  useEffect(() => {
    if (!sessionStarted) {
      startSession();
    }
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

  return (
    <div data-testid="chat-window" className="flex flex-col">
      <InlinePrivacyNotice />

      {sessionStarted && (
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
            state={state}
          />

          <ChatStatusBar
            budgetTier={budgetStatus.tier}
            chatDisabled={chatDisabled}
            disabledReason={disabledReason}
            error={error}
          />

          {!chatDisabled && (
            <>
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
