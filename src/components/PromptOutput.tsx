"use client";

import { useState, useRef } from "react";

interface PromptOutputProps {
  promptText: string;
}

export function PromptOutput({ promptText }: PromptOutputProps) {
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      ? "Copied!"
      : "";

  return (
    <div className="space-y-2">
      <pre
        data-testid="prompt-output"
        className="whitespace-pre-wrap text-sm bg-gray-50 border rounded p-4 max-h-96 overflow-y-auto font-mono"
      >
        {promptText}
      </pre>
      <div className="flex items-center gap-3">
        <button
          data-testid="copy-button"
          onClick={handleCopy}
          className="bg-blue-600 text-white px-4 min-h-[44px] min-w-[44px] rounded font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-800"
        >
          {copied ? "Copied!" : "Copy to Clipboard"}
        </button>
        <span
          data-testid="copy-confirmation"
          aria-live="polite"
          className="text-sm text-green-700"
        >
          {confirmationText}
        </span>
      </div>
    </div>
  );
}
