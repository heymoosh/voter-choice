"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import type { ChatMessage as ChatMessageType, BudgetInfo } from "@/types/chat";
import { parseBallot } from "@/lib/ballotParser";
import { parseVoterProfile } from "@/lib/profileParser";
import { downloadBallotHTML } from "@/lib/ballotDownload";
import { downloadProfileTxt } from "@/lib/profileDownload";
import ChatMessage from "./ChatMessage";
import type { Locale } from "@/lib/i18n/types";

interface ChatWindowLabels {
  privacyNotice?: string;
  inputPlaceholder?: string;
  sendButton?: string;
  budgetNotice70?: string;
  budgetNotice90?: string;
  chatDisabledMessage?: string;
  sessionLimitMessage?: string;
  loadingMessage?: string;
  alignment?: {
    strongLabel?: string;
    mixedLabel?: string;
    weakLabel?: string;
    expandButton?: string;
    collapseButton?: string;
    parseError?: string;
    overallLabel?: string;
  };
  ballot?: {
    downloadButton?: string;
  };
  profile?: {
    downloadButton?: string;
  };
}

interface ChatWindowProps {
  systemPrompt: string;
  locale?: Locale;
  labels?: ChatWindowLabels;
  onClose?: () => void;
}

type SseEvent =
  | { type: "delta"; content: string }
  | { type: "done"; inputTokens: number; outputTokens: number }
  | { type: "error"; message: string };

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export default function ChatWindow({
  systemPrompt,
  locale = "en",
  labels,
  onClose,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [budgetInfo, setBudgetInfo] = useState<BudgetInfo>({
    percentUsed: 0,
    status: "normal",
  });
  const [sessionLimitHit, setSessionLimitHit] = useState(false);
  const [chatDisabled, setChatDisabled] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);

  const sessionIdRef = useRef<string>(generateId());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch budget on mount
  useEffect(() => {
    fetch("/api/budget")
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "exhausted") {
          setChatDisabled(true);
        }
        setBudgetInfo(data);
      })
      .catch(() => {
        // Ignore budget fetch errors
      });
  }, []);

  const lastAssistantMessage = messages.findLast((m) => m.role === "assistant");
  const detectedBallot = lastAssistantMessage
    ? parseBallot(lastAssistantMessage.content)
    : null;
  const detectedProfile = lastAssistantMessage
    ? parseVoterProfile(lastAssistantMessage.content)
    : null;

  const sendMessage = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || isStreaming || chatDisabled || sessionLimitHit) return;

    const userMsg: ChatMessageType = {
      id: generateId(),
      role: "user",
      content,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputValue("");
    setIsStreaming(true);

    // Check session limit
    if (newMessages.length > 60) {
      setSessionLimitHit(true);
      setIsStreaming(false);
      return;
    }

    // Build assistant placeholder
    const assistantId = generateId();
    const assistantMsg: ChatMessageType = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };
    setMessages([...newMessages, assistantMsg]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          systemPrompt,
          sessionId: sessionIdRef.current,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error === "budget_exhausted" || response.status === 429) {
          setChatDisabled(true);
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: errorData.message ?? "An error occurred." }
              : m,
          ),
        );
        setIsStreaming(false);
        return;
      }

      // Update budget from response headers
      const budgetPercent = response.headers.get("X-Budget-Percent");
      const budgetStatus = response.headers.get("X-Budget-Status") as
        | BudgetInfo["status"]
        | null;
      if (budgetPercent && budgetStatus) {
        setBudgetInfo({
          percentUsed: Number(budgetPercent),
          status: budgetStatus,
        });
        if (budgetStatus === "exhausted") {
          setChatDisabled(true);
        }
      }

      // Read SSE stream
      const reader = response.body!.getReader();
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
          const dataStr = line.slice(6);
          try {
            const event = JSON.parse(dataStr) as SseEvent;
            if (event.type === "delta") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + event.content }
                    : m,
                ),
              );
            } else if (event.type === "done") {
              // Token tracking done on server
            } else if (event.type === "error") {
              if (event.message === "budget_exhausted") {
                setChatDisabled(true);
              }
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "Failed to connect. Please check your connection and try again.",
              }
            : m,
        ),
      );
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }, [
    inputValue,
    messages,
    isStreaming,
    chatDisabled,
    sessionLimitHit,
    systemPrompt,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleDownloadBallot = () => {
    if (detectedBallot) {
      downloadBallotHTML(detectedBallot, locale);
    }
  };

  const handleDownloadProfile = () => {
    if (detectedProfile) {
      downloadProfileTxt(detectedProfile);
    }
  };

  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div
      data-testid="chat-window"
      dir={dir}
      className="flex flex-col h-[600px] max-h-[80vh] bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          AI Ballot Research
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close chat"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>

      {/* Budget notice */}
      {budgetInfo.status === "warning" && (
        <div
          data-testid="chat-budget-notice"
          className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-100 text-xs text-yellow-800 dark:text-yellow-200"
        >
          {labels?.budgetNotice70 ??
            "Free AI chat may be limited later this month. You can always use the copy-paste option."}
        </div>
      )}
      {budgetInfo.status === "critical" && (
        <div
          data-testid="chat-budget-notice"
          className="px-4 py-2 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-100 text-xs text-orange-800 dark:text-orange-200"
        >
          {labels?.budgetNotice90 ??
            "Free AI chat is running low this month. Consider using the copy-paste option for an uninterrupted experience."}
        </div>
      )}

      {/* Privacy notice — shown before first message */}
      {!privacyAcknowledged && messages.length === 0 && (
        <div
          data-testid="chat-privacy-notice"
          className="mx-4 mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800"
        >
          <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
            {labels?.privacyNotice ??
              "Your conversation stays in your browser only — we don't store it. If you close or refresh this page, your conversation will be lost. Download your ballot and voter profile before leaving."}
          </p>
          <button
            onClick={() => setPrivacyAcknowledged(true)}
            className="mt-2 text-xs text-blue-700 dark:text-blue-300 underline hover:no-underline"
          >
            Got it
          </button>
        </div>
      )}

      {/* Chat disabled message */}
      {chatDisabled && (
        <div
          data-testid="chat-disabled-message"
          className="mx-4 mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300"
        >
          {labels?.chatDisabledMessage ??
            "Our free AI chat has reached its monthly limit. You can still research your ballot — copy the prompt below and paste it into any free AI chatbot (Claude, ChatGPT, Gemini, Grok)."}
        </div>
      )}

      {/* Session limit message */}
      {sessionLimitHit && (
        <div className="mx-4 mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-xs text-amber-800 dark:text-amber-200">
          {labels?.sessionLimitMessage ??
            "To keep this tool free for everyone, we limit sessions per day. You can continue your research by copying the prompt below."}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            locale={locale}
            alignmentLabels={labels?.alignment}
          />
        ))}
        {isStreaming && (
          <div className="flex justify-start mb-2">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2 text-sm text-gray-500 dark:text-gray-400 italic">
              {labels?.loadingMessage ?? "Thinking..."}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Download buttons when ballot/profile detected */}
      {(detectedBallot || detectedProfile) && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex gap-2 flex-wrap">
          {detectedBallot && (
            <button
              data-testid="download-ballot-btn"
              onClick={handleDownloadBallot}
              className="flex-1 min-w-[160px] px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-md transition-colors"
            >
              {labels?.ballot?.downloadButton ?? "Download / Print My Ballot"}
            </button>
          )}
          {detectedProfile && (
            <button
              data-testid="download-profile-btn"
              onClick={handleDownloadProfile}
              className="flex-1 min-w-[160px] px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-md transition-colors"
            >
              {labels?.profile?.downloadButton ?? "Download My Voter Profile"}
            </button>
          )}
        </div>
      )}

      {/* Input area */}
      {!chatDisabled && !sessionLimitHit && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              data-testid="chat-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={labels?.inputPlaceholder ?? "Type your message..."}
              rows={2}
              className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isStreaming}
            />
            <button
              data-testid="chat-send"
              onClick={sendMessage}
              disabled={isStreaming || !inputValue.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors self-end"
            >
              {labels?.sendButton ?? "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
