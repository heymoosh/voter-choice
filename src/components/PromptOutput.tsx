"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n";

interface PromptOutputProps {
  promptText: string;
}

function fallbackCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  textarea.value = text;
  document.body.appendChild(textarea);
  try {
    textarea.focus();
    textarea.select();
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export function PromptOutput({ promptText }: PromptOutputProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setCopyFailed(false);

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof window !== "undefined" &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(promptText);
      } else {
        const ok = fallbackCopy(promptText);
        if (!ok) throw new Error("execCommand failed");
      }
      setCopied(true);
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
        timeoutRef.current = null;
      }, 2000);
    } catch {
      setCopyFailed(true);
    }
  }, [promptText]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {t.promptOutput.title}
          </h2>
          <p className="text-sm text-gray-600">{t.promptOutput.instruction}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            data-testid="copy-button"
            onClick={handleCopy}
            aria-label={
              copied ? t.promptOutput.copiedAria : t.promptOutput.copyButton
            }
            className="min-h-[44px] min-w-[140px] rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
          >
            {copied ? t.promptOutput.copied : t.promptOutput.copyButton}
          </button>
          {/* Accessible announcement for screen readers */}
          <span aria-live="polite" aria-atomic="true" className="sr-only">
            {copied ? t.promptOutput.copiedAria : ""}
          </span>
        </div>
      </div>

      {/* Copy confirmation */}
      {copied && (
        <div
          data-testid="copy-confirmation"
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-800"
        >
          {t.promptOutput.copiedMessage}
        </div>
      )}

      {/* Copy fallback message */}
      {copyFailed && (
        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800"
        >
          {t.promptOutput.copyFallback}
        </div>
      )}

      {/* Prompt text output */}
      <div
        data-testid="prompt-output"
        className="max-h-[500px] overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-5"
      >
        <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-gray-800">
          {promptText}
        </pre>
      </div>
    </section>
  );
}
