"use client";

import { useState, useRef } from "react";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";

const AI_LINKS = [
  { name: "Claude", url: "https://claude.ai" },
  { name: "ChatGPT", url: "https://chatgpt.com" },
  { name: "Gemini", url: "https://gemini.google.com" },
  { name: "Grok", url: "https://grok.com" },
];

interface PromptOutputProps {
  promptText: string;
}

export function PromptOutput({ promptText }: PromptOutputProps) {
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { lang } = useLanguage();
  const t = translations[lang];

  async function handleCopy() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setFallback(false);

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(promptText);
        setCopied(true);
        timeoutRef.current = setTimeout(() => {
          setCopied(false);
          setFallback(false);
        }, 2000);
      } else {
        throw new Error("Clipboard API unavailable");
      }
    } catch {
      // Fallback: select all text
      setFallback(true);
      setCopied(false);
    }
  }

  const confirmationText = fallback
    ? "Press Ctrl+C / Cmd+C to copy"
    : copied
      ? t.promptOutput.copiedButton
      : "";

  return (
    <div className="bg-surface-lowest border-t-4 border-primary p-4 md:p-6 space-y-4">
      {/* Prompt preview */}
      <div className="relative">
        <pre
          data-testid="prompt-output"
          className={`whitespace-pre-wrap text-[11px] bg-surface-high p-4 font-mono text-on-surface-muted leading-relaxed overflow-hidden transition-all ${
            expanded ? "max-h-none" : "max-h-32"
          }`}
        >
          {promptText}
        </pre>
        {!expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-surface-high to-transparent" />
        )}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
        >
          {expanded
            ? lang === "es"
              ? "Mostrar menos"
              : "Show less"
            : lang === "es"
              ? "Mostrar todo"
              : "Show full prompt"}
        </button>
      </div>

      {/* Copy button */}
      <div className="flex items-center gap-3">
        <button
          data-testid="copy-button"
          onClick={handleCopy}
          className="flex items-center justify-center gap-2 bg-primary text-on-primary px-6 py-3 min-h-[44px] min-w-[44px] font-bold uppercase tracking-widest text-xs hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all active:scale-[0.98]"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
          </svg>
          {copied ? t.promptOutput.copiedButton : t.promptOutput.copyButton}
        </button>
        <span
          data-testid="copy-confirmation"
          aria-live="polite"
          className="text-xs text-primary font-bold"
        >
          {confirmationText}
        </span>
      </div>

      {/* AI links */}
      <div className="pt-4 border-t border-outline-variant/20">
        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-muted mb-3">
          {t.handoff.continueAnalysisOn}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {AI_LINKS.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2 bg-surface-high hover:bg-surface-low transition-colors text-sm font-bold text-on-surface group"
            >
              {link.name}
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className="group-hover:translate-x-0.5 transition-transform text-on-surface-muted"
              >
                <path
                  d="M4.5 11.5L11.5 4.5M11.5 4.5H6M11.5 4.5V10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
