"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "./ui/Card";
import { Notice } from "./ui/Notice";
import { Button } from "./ui/Button";
import {
  HandoffPackage,
  parseHandoffMarkers,
  buildContinuationPrompt,
  buildClientFallbackHandoff,
} from "./HandoffPackage";
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

function PrivacyNotice({ onStart }: { onStart: () => void }) {
  const { lang } = useLanguage();

  return (
    <div data-testid="chat-privacy-notice" className="mb-4">
      <Notice variant="info">
        <p className="font-semibold mb-2">
          {lang === "es" ? "Antes de comenzar" : "Before we begin"}
        </p>
        <p>
          {lang === "es"
            ? "Tu conversación permanece solo en tu navegador — no la almacenamos. Si cierras o actualizas esta página, tu conversación se perderá. Asegúrate de descargar tu boleta y perfil de votante antes de salir."
            : "Your conversation stays in your browser only \u2014 we don\u2019t store it. If you close or refresh this page, your conversation will be lost. Make sure to download your ballot and voter profile before leaving."}
        </p>
        <div className="mt-3">
          <Button variant="primary" size="md" onClick={onStart}>
            {lang === "es"
              ? "Entendido, empecemos"
              : "Got it, let\u2019s start"}
          </Button>
        </div>
      </Notice>
    </div>
  );
}

function ChatMessageBubble({
  msg,
  isLast,
  isStreaming,
}: {
  msg: ChatMessage;
  isLast: boolean;
  isStreaming: boolean;
}) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <Card className="max-w-[85%]" data-testid="chat-message-user">
          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
        </Card>
      </div>
    );
  }

  return (
    <div data-testid="chat-message-assistant" className="max-w-[85%]">
      <div className="bg-surface-low rounded-sm p-4">
        <div className="text-sm whitespace-pre-wrap prose-sm">
          {msg.content}
          {isStreaming && isLast && (
            <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse" />
          )}
        </div>
      </div>
    </div>
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        data-testid="chat-input"
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={
          lang === "es" ? "Escribe tu respuesta..." : "Type your response..."
        }
        disabled={isStreaming}
        className="flex-1 bg-surface-high border-b-2 border-outline-variant px-3 py-2.5 text-base text-on-surface rounded-sm focus:outline-none focus:border-primary transition-colors placeholder:text-on-surface-muted disabled:opacity-50"
      />
      <button
        data-testid="chat-send"
        type="submit"
        disabled={isStreaming || !input.trim()}
        className="bg-primary text-on-primary px-4 py-2.5 rounded-sm font-semibold min-h-[44px] min-w-[44px] hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transition-colors"
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

/* ── Message list ───────────────────────────────────────────── */

function ChatMessageList({
  messages,
  isStreaming,
  parsedHandoff,
  continuationPrompt,
  clientFallback,
  clientContinuationPrompt,
  messagesEndRef,
}: {
  messages: ChatMessage[];
  isStreaming: boolean;
  parsedHandoff: ReturnType<typeof parseHandoffMarkers>;
  continuationPrompt: string;
  clientFallback: ReturnType<typeof buildClientFallbackHandoff> | null;
  clientContinuationPrompt: string;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { lang } = useLanguage();
  const t = translations[lang];

  return (
    <div className="space-y-4 mb-4 max-h-[60vh] overflow-y-auto pr-1">
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
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(true);
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
    ],
  );

  const startSession = useCallback(() => {
    setShowPrivacyNotice(false);
    setSessionStarted(true);
    const { contextBlock } = getBasePrompt();
    sendMessage(contextBlock, []);
  }, [getBasePrompt, sendMessage]);

  const { basePrompt: fullBasePrompt } = getBasePrompt();
  const handoff = useHandoffState(
    messages,
    isStreaming,
    chatDisabled,
    disabledReason,
    fullBasePrompt,
    zipCode,
  );

  return (
    <div data-testid="chat-window" className="flex flex-col">
      {showPrivacyNotice && <PrivacyNotice onStart={startSession} />}

      {sessionStarted && (
        <>
          <ChatMessageList
            messages={messages}
            isStreaming={isStreaming}
            parsedHandoff={handoff.parsedHandoff}
            continuationPrompt={handoff.continuationPrompt}
            clientFallback={handoff.clientFallback}
            clientContinuationPrompt={handoff.clientContinuationPrompt}
            messagesEndRef={messagesEndRef}
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
