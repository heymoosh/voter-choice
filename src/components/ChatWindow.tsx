"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  extractVoterProfile,
  parseBallotBlock,
  parseAlignmentScores,
  type ParsedBallot,
  type AlignmentScores,
} from "@/lib/ballotParser";
import { AlignmentBanner } from "./AlignmentBanner";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const MAX_MESSAGES = 60;

interface Message {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

interface ChatWindowProps {
  electionContext: string;
  voterProfile: string | null;
  onBallotGenerated: (ballot: ParsedBallot) => void;
  onProfileGenerated: (profile: string) => void;
}

type BudgetThreshold = "normal" | "warning" | "critical" | "exhausted";

export function ChatWindow({
  electionContext,
  voterProfile,
  onBallotGenerated,
  onProfileGenerated,
}: ChatWindowProps) {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [budgetThreshold, setBudgetThreshold] =
    useState<BudgetThreshold>("normal");
  const [alignmentScores, setAlignmentScores] = useState<AlignmentScores[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];

    // Check session limit
    if (nextMessages.filter((m) => m.role === "user").length > MAX_MESSAGES) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "You've reached the session limit of 60 messages. To keep this tool free for everyone, we limit conversation length. Copy the prompt below and continue in any free AI chatbot.",
        },
      ]);
      return;
    }

    setInput("");
    setMessages(nextMessages);
    setIsLoading(true);

    // Add empty assistant message for streaming
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", isStreaming: true },
    ]);

    abortRef.current = new AbortController();
    let accumulatedText = "";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          language,
          electionContext,
          voterProfile: voterProfile ?? undefined,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errData = (await response.json()) as {
          message?: string;
          error?: string;
        };
        const errorMsg =
          errData.message ??
          errData.error ??
          "Something went wrong. Please try again or use the copy-paste option below.";

        setMessages((prev) =>
          prev.map((m, i) =>
            i === prev.length - 1
              ? { ...m, content: errorMsg, isStreaming: false }
              : m,
          ),
        );
        setIsLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data) continue;

          try {
            const event = JSON.parse(data) as {
              type: string;
              text?: string;
              message?: string;
              threshold?: BudgetThreshold;
            };

            if (event.type === "delta" && event.text) {
              accumulatedText += event.text;
              setMessages((prev) =>
                prev.map((m, i) =>
                  i === prev.length - 1
                    ? { ...m, content: accumulatedText, isStreaming: true }
                    : m,
                ),
              );
            } else if (event.type === "budget" && event.threshold) {
              setBudgetThreshold(event.threshold);
            } else if (event.type === "done") {
              // Parse structured outputs from completed message
              const ballot = parseBallotBlock(accumulatedText);
              if (ballot) onBallotGenerated(ballot);

              const profile = extractVoterProfile(accumulatedText);
              if (profile) onProfileGenerated(profile);

              const alignment = parseAlignmentScores(accumulatedText);
              if (alignment) {
                setAlignmentScores((prev) => [...prev, alignment]);
              }

              setMessages((prev) =>
                prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, isStreaming: false } : m,
                ),
              );
            } else if (event.type === "error") {
              setMessages((prev) =>
                prev.map((m, i) =>
                  i === prev.length - 1
                    ? {
                        ...m,
                        content:
                          event.message ??
                          "An error occurred. Please try again.",
                        isStreaming: false,
                      }
                    : m,
                ),
              );
            }
          } catch {
            // Ignore malformed SSE lines
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // User cancelled
      } else {
        setMessages((prev) =>
          prev.map((m, i) =>
            i === prev.length - 1
              ? {
                  ...m,
                  content:
                    "Connection error. Please try again or use the copy-paste option below.",
                  isStreaming: false,
                }
              : m,
          ),
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    input,
    isLoading,
    messages,
    language,
    electionContext,
    voterProfile,
    onBallotGenerated,
    onProfileGenerated,
  ]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  if (budgetThreshold === "exhausted") {
    return (
      <div className="chat-exhausted" data-testid="chat-disabled-message">
        <p>{t.chatDisabledMessage}</p>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {!isOpen ? (
        <button
          className="button button-primary chat-cta"
          data-testid="chat-cta"
          onClick={() => setIsOpen(true)}
          type="button"
        >
          {t.chatCta}
        </button>
      ) : (
        <div
          className="chat-window"
          data-testid="chat-window"
          role="region"
          aria-label="AI Chat Research"
        >
          {/* Budget notices */}
          {budgetThreshold === "warning" && (
            <div
              className="chat-budget-notice chat-budget-notice--warning"
              data-testid="chat-budget-notice"
            >
              {t.chatBudgetNotice70}
            </div>
          )}
          {budgetThreshold === "critical" && (
            <div
              className="chat-budget-notice chat-budget-notice--critical"
              data-testid="chat-budget-notice"
            >
              {t.chatBudgetNotice90}
            </div>
          )}

          {/* Privacy notice (shown until first message) */}
          {messages.length === 0 && (
            <div
              className="chat-privacy-notice"
              data-testid="chat-privacy-notice"
              role="note"
            >
              {t.chatPrivacyNotice}
            </div>
          )}

          {/* Messages */}
          <div className="chat-messages" aria-live="polite">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`chat-message chat-message--${msg.role}`}
                data-testid={`chat-message-${msg.role}`}
              >
                <div className="chat-message-content">
                  {msg.content}
                  {msg.isStreaming && (
                    <span className="chat-cursor" aria-hidden="true">
                      ▌
                    </span>
                  )}
                </div>
                {/* Render alignment banners inline with assistant messages */}
                {msg.role === "assistant" &&
                  !msg.isStreaming &&
                  (() => {
                    const scores = parseAlignmentScores(msg.content);
                    if (!scores) return null;
                    return (
                      <div className="chat-alignment-banners">
                        {scores.scores.map((c) => (
                          <AlignmentBanner key={c.candidate} candidate={c} />
                        ))}
                      </div>
                    );
                  })()}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-row">
            <textarea
              className="chat-input"
              data-testid="chat-input"
              disabled={isLoading}
              onKeyDown={handleKeyDown}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.chatInputPlaceholder}
              rows={2}
              value={input}
            />
            <button
              className="button button-primary chat-send"
              data-testid="chat-send"
              disabled={isLoading || !input.trim()}
              onClick={() => void sendMessage()}
              type="button"
            >
              {t.chatSend}
            </button>
          </div>
        </div>
      )}

      {/* Alignment banners from accumulated sessions */}
      {alignmentScores.length > 0 && (
        <div className="alignment-banners-section">
          {alignmentScores.map((scoreSet, idx) => (
            <div key={idx}>
              {scoreSet.scores.map((c) => (
                <AlignmentBanner key={c.candidate} candidate={c} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
