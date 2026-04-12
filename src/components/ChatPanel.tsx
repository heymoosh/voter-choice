"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "./ui/Card";
import { Notice } from "./ui/Notice";
import { Button } from "./ui/Button";
import { useLanguage } from "../lib/i18n";
import type { StateElectionData } from "../types/election";
import { generatePrompt } from "../lib/generatePrompt";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  state: StateElectionData;
  zipCode: string;
}

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function processSSELine(
  line: string,
  onText: (text: string) => void,
  onError: (error: string) => void,
) {
  if (!line.startsWith("data: ")) return;
  try {
    const data = JSON.parse(line.slice(6));
    if (data.type === "text") onText(data.text);
    else if (data.type === "error") onError(data.error);
  } catch {
    // Skip malformed SSE lines
  }
}

async function streamResponse(
  response: Response,
  onText: (text: string) => void,
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
      processSSELine(line, onText, onError);
    }
  }
}

export function ChatPanel({ state, zipCode }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef(generateSessionId());
  const messageCountRef = useRef(0);
  const { lang } = useLanguage();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(
    async (userMessage: string, currentMessages: ChatMessage[]) => {
      setIsStreaming(true);
      setError(null);
      messageCountRef.current += 1;

      const newMessages: ChatMessage[] = [
        ...currentMessages,
        { role: "user", content: userMessage },
      ];
      setMessages(newMessages);

      const { basePrompt } = generatePrompt(state, zipCode, undefined, lang);

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
          const errorData = await response.json();
          setError(errorData.error || "Failed to connect to chat.");
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
    [state, zipCode, lang],
  );

  const startSession = useCallback(() => {
    setShowPrivacyNotice(false);
    setSessionStarted(true);

    const { contextBlock } = generatePrompt(state, zipCode, undefined, lang);
    sendMessage(contextBlock, []);
  }, [state, zipCode, lang, sendMessage]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    sendMessage(trimmed, messages);
  }

  return (
    <div data-testid="chat-window" className="flex flex-col">
      {/* Privacy Notice */}
      {showPrivacyNotice && (
        <div data-testid="chat-privacy-notice" className="mb-4">
          <Notice variant="info">
            <p className="font-semibold mb-2">
              {lang === "es" ? "Antes de comenzar" : "Before we begin"}
            </p>
            <p>
              {lang === "es"
                ? "Tu conversación permanece solo en tu navegador — no la almacenamos. Si cierras o actualizas esta página, tu conversación se perderá. Asegúrate de descargar tu boleta y perfil de votante antes de salir."
                : "Your conversation stays in your browser only — we don't store it. If you close or refresh this page, your conversation will be lost. Make sure to download your ballot and voter profile before leaving."}
            </p>
            <div className="mt-3">
              <Button variant="primary" size="md" onClick={startSession}>
                {lang === "es" ? "Entendido, empecemos" : "Got it, let's start"}
              </Button>
            </div>
          </Notice>
        </div>
      )}

      {/* Messages */}
      {sessionStarted && (
        <>
          <div className="space-y-4 mb-4 max-h-[60vh] overflow-y-auto pr-1">
            {messages.map((msg, i) => (
              <div key={i}>
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <Card
                      className="max-w-[85%]"
                      data-testid="chat-message-user"
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </Card>
                  </div>
                ) : (
                  <div
                    data-testid="chat-message-assistant"
                    className="max-w-[85%]"
                  >
                    <div className="bg-surface-low rounded-sm p-4">
                      <div className="text-sm whitespace-pre-wrap prose-sm">
                        {msg.content}
                        {isStreaming && i === messages.length - 1 && (
                          <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse" />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Error */}
          {error && (
            <Notice variant="warning" className="mb-3">
              {error}
            </Notice>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              data-testid="chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                lang === "es"
                  ? "Escribe tu respuesta..."
                  : "Type your response..."
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
        </>
      )}
    </div>
  );
}
