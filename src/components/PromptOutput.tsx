"use client";

import { useState, useRef } from "react";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";

interface PromptOutputProps {
  promptText: string;
}

export function PromptOutput({ promptText }: PromptOutputProps) {
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState(false);
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
    <div className="space-y-2">
      <pre
        data-testid="prompt-output"
        className="whitespace-pre-wrap text-sm bg-surface-high rounded-sm p-4 max-h-96 overflow-y-auto font-mono text-on-surface"
      >
        {promptText}
      </pre>
      <div className="flex items-center gap-3">
        <button
          data-testid="copy-button"
          onClick={handleCopy}
          className="bg-primary text-on-primary px-4 min-h-[44px] min-w-[44px] rounded-sm font-semibold hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
        >
          {copied ? t.promptOutput.copiedButton : t.promptOutput.copyButton}
        </button>
        <span
          data-testid="copy-confirmation"
          aria-live="polite"
          className="text-sm text-primary"
        >
          {confirmationText}
        </span>
      </div>
    </div>
  );
}
