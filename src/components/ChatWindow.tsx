"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/i18n";
import {
  parseBallot,
  parseVoterProfile,
  parseAlignmentScores,
  slugify,
  type AlignmentScoresData,
  type BallotData,
  type VoterProfileData,
} from "@/lib/structured-output";

// ---- Types -----------------------------------------------------------------

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatWindowProps {
  systemPrompt: string;
  onBallotGenerated?: (ballot: BallotData) => void;
  onProfileGenerated?: (profile: VoterProfileData) => void;
  onClose?: () => void;
}

// ---- Alignment Banner Component --------------------------------------------

function AlignmentBanner({ data }: { data: AlignmentScoresData }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function getAlignmentLabel(score: number): string {
    if (score >= 70) return t.alignmentStrong;
    if (score >= 40) return t.alignmentMixed;
    return t.alignmentWeak;
  }

  function getAlignmentColor(score: number): string {
    if (score >= 70) return "bg-green-50 border-green-300 text-green-800";
    if (score >= 40) return "bg-yellow-50 border-yellow-300 text-yellow-800";
    return "bg-red-50 border-red-300 text-red-800";
  }

  function getScoreColor(score: number): string {
    if (score >= 70) return "text-green-700";
    if (score >= 40) return "text-yellow-700";
    return "text-red-700";
  }

  return (
    <div className="my-3 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {data.race}
      </p>
      {data.scores.map((candidate) => {
        const slug = slugify(candidate.candidate);
        const isExpanded = expanded[slug] ?? false;
        const label = getAlignmentLabel(candidate.overall);
        const colorClass = getAlignmentColor(candidate.overall);

        return (
          <div
            key={slug}
            data-testid={`alignment-banner-${slug}`}
            role="region"
            aria-label={`${t.alignmentLabel.replace(":", "")} ${candidate.candidate}: ${candidate.overall} out of 100`}
            className={`rounded-lg border p-3 ${colorClass}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-sm">{candidate.candidate}</p>
                <p className="text-xs mt-0.5">
                  <span className="font-medium">{t.alignmentLabel}</span>{" "}
                  <span
                    data-testid={`alignment-score-overall-${slug}`}
                    className={`font-bold text-base ${getScoreColor(candidate.overall)}`}
                  >
                    {candidate.overall}
                  </span>
                  {" / 100"} — {label}
                </p>
              </div>
              <button
                aria-expanded={isExpanded}
                aria-controls={`alignment-drill-down-${slug}`}
                onClick={() =>
                  setExpanded((prev) => ({ ...prev, [slug]: !isExpanded }))
                }
                className="shrink-0 text-xs underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 rounded"
              >
                {isExpanded ? t.alignmentCollapseBtn : t.alignmentExpandBtn}
              </button>
            </div>

            {isExpanded && (
              <div
                id={`alignment-drill-down-${slug}`}
                data-testid={`alignment-drill-down-${slug}`}
                className="mt-3 pt-3 border-t border-current border-opacity-20 space-y-2"
              >
                <p className="text-xs font-medium">{t.alignmentIssueLabel}</p>
                <p className="text-xs">
                  <span className="font-medium">{t.alignmentOverallLabel}</span>{" "}
                  {candidate.overall} / 100
                </p>
                {candidate.issues.map((issue) => {
                  const issueSlug = slugify(issue.issue);
                  return (
                    <div
                      key={issueSlug}
                      data-testid={`alignment-issue-row-${slug}-${issueSlug}`}
                      tabIndex={0}
                      className="text-xs space-y-0.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{issue.issue}</span>
                        {issue.userPriority && (
                          <span className="text-gray-500">
                            (you said: {issue.userPriority} priority)
                          </span>
                        )}
                        <span
                          className={`ml-auto font-bold ${getScoreColor(issue.score)}`}
                        >
                          {issue.score} / 100
                        </span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">
                        {issue.rationale}
                      </p>
                      {issue.sources.length > 0 && (
                        <p className="text-gray-400">
                          Sources: {issue.sources.join("; ")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---- Message Renderer -------------------------------------------------------

function MessageContent({ content }: { content: string }) {
  const { t } = useLanguage();

  // Parse and render alignment scores blocks
  const parts: React.ReactNode[] = [];
  let remaining = content;
  let idx = 0;

  const blockRegex = /\[ALIGNMENT_SCORES\][\s\S]*?\[\/ALIGNMENT_SCORES\]/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(content)) !== null) {
    const before = content.slice(idx, match.index);
    if (before) {
      parts.push(
        <span key={`text-${idx}`} className="whitespace-pre-wrap">
          {before}
        </span>,
      );
    }

    const result = parseAlignmentScores(match[0]);
    if (result.ok && result.data) {
      parts.push(
        <AlignmentBanner key={`align-${match.index}`} data={result.data} />,
      );
    } else {
      parts.push(
        <p
          key={`align-err-${match.index}`}
          className="text-xs text-amber-700 italic my-1"
        >
          {t.alignmentParseError}
        </p>,
      );
    }
    idx = match.index + match[0].length;
    remaining = content.slice(idx);
  }

  if (remaining) {
    parts.push(
      <span key={`text-end`} className="whitespace-pre-wrap">
        {remaining}
      </span>,
    );
  }

  if (parts.length === 0) {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  return <>{parts}</>;
}

// ---- Main ChatWindow Component ----------------------------------------------

export function ChatWindow({
  systemPrompt,
  onBallotGenerated,
  onProfileGenerated,
  onClose,
}: ChatWindowProps) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [budgetTier, setBudgetTier] = useState<
    "normal" | "warning" | "critical" | "exhausted"
  >("normal");
  const [error, setError] = useState<string | null>(null);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(true);
  const sessionId = useRef<string>(Math.random().toString(36).slice(2));
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check budget on mount
  useEffect(() => {
    fetch("/api/chat", { method: "GET" })
      .then((r) => r.json())
      .then((data: { tier: typeof budgetTier }) => {
        if (data.tier) setBudgetTier(data.tier);
      })
      .catch(() => {});
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setShowPrivacyNotice(false);
    setInput("");
    setError(null);

    const userMessage: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    // Session limit check
    if (updatedMessages.filter((m) => m.role === "user").length > 60) {
      setError(t.chatSessionLimitMsg);
      return;
    }

    setIsStreaming(true);
    const abort = new AbortController();
    abortRef.current = abort;

    let assistantContent = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          systemPrompt,
          sessionId: sessionId.current,
        }),
        signal: abort.signal,
      });

      if (!response.ok) {
        const errData = (await response.json()) as {
          error: string;
          message?: string;
        };
        if (errData.error === "rate_limited" || response.status === 429) {
          setError(t.chatRateLimitMsg);
        } else if (errData.error === "budget_exhausted") {
          setBudgetTier("exhausted");
          setError(t.chatBudgetExhausted);
        } else {
          setError(errData.message ?? t.chatErrorMsg);
        }
        setIsStreaming(false);
        // Remove the empty assistant message
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const eventData = JSON.parse(line.slice(6)) as {
              type: string;
              text?: string;
              budgetTier?: typeof budgetTier;
              message?: string;
            };

            if (eventData.type === "text" && eventData.text) {
              assistantContent += eventData.text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                };
                return updated;
              });
            } else if (eventData.type === "done") {
              if (eventData.budgetTier) {
                setBudgetTier(eventData.budgetTier);
              }
            } else if (eventData.type === "error") {
              setError(eventData.message ?? t.chatErrorMsg);
            }
          } catch {
            // Non-fatal parse error for a single SSE line
          }
        }
      }

      // Check for structured outputs in completed response
      if (assistantContent) {
        const ballotResult = parseBallot(assistantContent);
        if (ballotResult.ok && ballotResult.data && onBallotGenerated) {
          onBallotGenerated(ballotResult.data);
        }

        const profileResult = parseVoterProfile(assistantContent);
        if (profileResult.ok && profileResult.data && onProfileGenerated) {
          onProfileGenerated(profileResult.data);
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(t.chatErrorMsg);
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }, [
    input,
    isStreaming,
    messages,
    systemPrompt,
    t,
    onBallotGenerated,
    onProfileGenerated,
  ]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  return (
    <div
      data-testid="chat-window"
      className="flex flex-col border border-gray-200 rounded-xl bg-white shadow-md overflow-hidden"
      style={{ height: "600px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-blue-700 text-white">
        <h2 className="font-semibold text-sm">{t.chatWindowTitle}</h2>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close chat"
            className="text-white hover:text-blue-200 focus:outline-none focus:ring-2 focus:ring-white rounded"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Budget notices */}
      {budgetTier === "warning" && (
        <div
          data-testid="chat-budget-notice"
          className="px-4 py-2 bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-xs"
        >
          {t.chatBudgetWarning}
        </div>
      )}
      {budgetTier === "critical" && (
        <div
          data-testid="chat-budget-notice"
          className="px-4 py-2 bg-orange-50 border-b border-orange-200 text-orange-800 text-xs"
        >
          {t.chatBudgetCritical}
        </div>
      )}
      {budgetTier === "exhausted" && (
        <div
          data-testid="chat-disabled-message"
          className="px-4 py-3 bg-red-50 border-b border-red-200 text-red-800 text-sm"
        >
          {t.chatBudgetExhausted}
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Privacy notice (shown before first message) */}
        {showPrivacyNotice && (
          <div
            data-testid="chat-privacy-notice"
            className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs"
          >
            {t.chatPrivacyNotice}
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            data-testid={
              msg.role === "user"
                ? "chat-message-user"
                : "chat-message-assistant"
            }
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-blue-700 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {msg.role === "assistant" ? (
                <MessageContent
                  content={
                    msg.content ||
                    (isStreaming && i === messages.length - 1 ? "…" : "")
                  }
                />
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs"
          >
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {budgetTier !== "exhausted" && (
        <div className="border-t border-gray-200 px-3 py-2">
          <div className="flex gap-2 items-end">
            <label htmlFor="chat-input-field" className="sr-only">
              {t.chatInputPlaceholder}
            </label>
            <textarea
              id="chat-input-field"
              ref={inputRef}
              data-testid="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.chatInputPlaceholder}
              disabled={isStreaming}
              rows={2}
              className="flex-1 resize-none px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label={t.chatInputPlaceholder}
            />
            <button
              data-testid="chat-send"
              onClick={() => void sendMessage()}
              disabled={isStreaming || !input.trim()}
              className="px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors min-h-[44px]"
              aria-label={t.chatSendLabel}
            >
              {isStreaming ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                t.chatSendLabel
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      )}
    </div>
  );
}
