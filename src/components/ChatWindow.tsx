"use client";

import { useEffect, useRef, useState } from "react";
import type {
  BallotData,
  ChatMessage,
  ParsedBallot,
  BudgetStatus,
} from "@/lib/types";
import type { Language } from "@/lib/i18n";
import { tStr } from "@/lib/i18n";
import { parseBallot } from "@/lib/ballotParser";
import { parseAlignmentScores } from "@/lib/alignmentParser";
import { AlignmentBanner } from "./AlignmentBanner";
import { ProfileDownloadButton } from "./VoterProfile";
import { BallotBuilder } from "./BallotBuilder";

type ChatWindowProps = {
  ballotData: BallotData;
  zip: string;
  language?: Language;
  voterProfile: string | null;
};

export function ChatWindow({
  ballotData,
  zip,
  language = "en",
  voterProfile,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus>("ok");
  const [sessionLimitHit, setSessionLimitHit] = useState(false);
  const [parsedBallot, setParsedBallot] = useState<ParsedBallot | null>(null);
  const [parsedProfile, setParsedProfile] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function extractOutputs(fullText: string) {
    // Extract ballot
    const ballot = parseBallot(fullText);
    if (ballot) setParsedBallot(ballot);

    // Extract voter profile
    const profileMatch = fullText.match(
      /===\s*MY VOTER PROFILE[\s\S]*?===\s*END VOTER PROFILE\s*===/i,
    );
    if (profileMatch) setParsedProfile(profileMatch[0]);
  }

  async function handleSend() {
    const text = inputText.trim();
    if (!text || isStreaming || sessionLimitHit) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(newMessages);
    setInputText("");
    setIsStreaming(true);

    let assistantText = "";
    const assistantIdx = newMessages.length;

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: newMessages,
          ballotData,
          zip,
          language,
          voterProfile,
        }),
      });

      if (res.status === 429) {
        const errBody = (await res.json()) as { reason?: string };
        if (errBody.reason === "session_limit") {
          setSessionLimitHit(true);
        }
        setMessages((prev) => {
          const updated = [...prev];
          updated[assistantIdx] = {
            role: "assistant",
            content: tStr(language, "sessionLimitMessage"),
          };
          return updated;
        });
        return;
      }

      if (res.status === 503) {
        setBudgetStatus("exhausted");
        setMessages((prev) => {
          const updated = [...prev];
          updated[assistantIdx] = {
            role: "assistant",
            content: tStr(language, "chatDisabledMessage"),
          };
          return updated;
        });
        return;
      }

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6)) as {
              type: string;
              text?: string;
              budgetStatus?: BudgetStatus;
            };

            if (data.type === "delta" && data.text) {
              assistantText += data.text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[assistantIdx] = {
                  role: "assistant",
                  content: assistantText,
                };
                return updated;
              });
            } else if (data.type === "done") {
              if (data.budgetStatus) setBudgetStatus(data.budgetStatus);
              extractOutputs(assistantText);
            }
          } catch {
            // skip malformed SSE line
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantIdx] = {
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`,
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  // Budget exhausted: show disabled state
  if (budgetStatus === "exhausted") {
    return (
      <div
        data-testid="chat-window"
        className="border border-gray-200 rounded-xl p-5"
      >
        <p
          data-testid="chat-disabled-message"
          className="text-amber-800 font-medium"
        >
          {tStr(language, "chatDisabledMessage")}
        </p>
      </div>
    );
  }

  // Pre-session privacy acceptance
  if (!privacyAccepted) {
    return (
      <div
        data-testid="chat-window"
        className="border border-blue-200 rounded-xl p-5 bg-blue-50 space-y-4"
      >
        <p
          data-testid="chat-privacy-notice"
          className="text-blue-800 text-sm leading-relaxed"
        >
          {tStr(language, "chatPrivacyNotice")}
        </p>
        <button
          onClick={() => setPrivacyAccepted(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg px-5 py-2 text-sm"
        >
          I understand — start chat
        </button>
      </div>
    );
  }

  const alignmentScores = messages
    .filter((m) => m.role === "assistant")
    .flatMap((m) => {
      const block = parseAlignmentScores(m.content);
      return block ? block.scores : [];
    });

  return (
    <div
      data-testid="chat-window"
      className="border border-gray-200 rounded-xl overflow-hidden flex flex-col h-[600px]"
    >
      {/* Budget notice */}
      {(budgetStatus === "warning" || budgetStatus === "critical") && (
        <div
          data-testid="chat-budget-notice"
          className={`px-4 py-2 text-sm ${
            budgetStatus === "critical"
              ? "bg-amber-100 text-amber-800"
              : "bg-yellow-50 text-yellow-800"
          }`}
        >
          {budgetStatus === "critical"
            ? tStr(language, "chatBudgetCritical")
            : tStr(language, "chatBudgetNotice")}
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">
            Your conversation starts here. Ask anything about your ballot.
          </p>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            data-testid={
              msg.role === "user"
                ? "chat-message-user"
                : "chat-message-assistant"
            }
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {msg.content}
              {msg.role === "assistant" &&
                idx === messages.length - 1 &&
                isStreaming && (
                  <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
                )}
            </div>
          </div>
        ))}

        {/* Alignment banners from parsed scores */}
        {alignmentScores.length > 0 && (
          <div className="space-y-2">
            {alignmentScores.map((score) => (
              <AlignmentBanner
                key={score.candidate}
                score={score}
                language={language}
              />
            ))}
          </div>
        )}

        {/* Download buttons when outputs are available */}
        {parsedBallot && (
          <div className="space-y-3 border-t pt-3">
            <BallotBuilder language={language} preloadedBallot={parsedBallot} />
          </div>
        )}

        {parsedProfile && (
          <div className="border-t pt-3">
            <ProfileDownloadButton
              profileContent={parsedProfile}
              language={language}
            />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Session limit message */}
      {sessionLimitHit && (
        <div className="px-4 py-2 bg-amber-50 text-amber-800 text-sm">
          {tStr(language, "sessionLimitMessage")}
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-gray-200 p-3 flex gap-2 items-end">
        <textarea
          ref={inputRef}
          data-testid="chat-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming || sessionLimitHit}
          placeholder={tStr(language, "chatInputPlaceholder")}
          rows={2}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          aria-label={tStr(language, "chatInputPlaceholder")}
        />
        <button
          data-testid="chat-send"
          onClick={() => void handleSend()}
          disabled={isStreaming || !inputText.trim() || sessionLimitHit}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-2 text-sm min-h-[40px]"
        >
          {tStr(language, "chatSend")}
        </button>
      </div>
    </div>
  );
}
