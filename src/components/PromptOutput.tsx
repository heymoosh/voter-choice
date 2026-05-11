"use client";

import { useState, useCallback } from "react";

interface PromptOutputProps {
  promptText: string;
}

export function PromptOutput({ promptText }: PromptOutputProps) {
  const [copied, setCopied] = useState(false);
  const [copyFallback, setCopyFallback] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(promptText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback for browsers without clipboard API
        setCopyFallback(true);
      }
    } catch {
      // Clipboard write failed (e.g. permissions denied)
      setCopyFallback(true);
    }
  }, [promptText]);

  return (
    <section aria-labelledby="prompt-output-heading">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h2
            id="prompt-output-heading"
            className="text-xl font-bold text-gray-900"
          >
            Your Customized Prompt
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Copy this prompt and paste it as your first message in any AI
            chatbot
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="copy-button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:outline-none active:bg-blue-800 transition-colors min-h-[44px] text-sm"
            aria-live="polite"
            aria-label={
              copied ? "Copied to clipboard!" : "Copy prompt to clipboard"
            }
          >
            {copied ? (
              <>
                <span aria-hidden="true">✓</span>
                Copied!
              </>
            ) : (
              <>
                <span aria-hidden="true">📋</span>
                Copy to Clipboard
              </>
            )}
          </button>
          {copied && (
            <span
              data-testid="copy-confirmation"
              role="status"
              aria-live="polite"
              className="text-green-600 text-sm font-medium"
            >
              Copied!
            </span>
          )}
        </div>
      </div>

      {copyFallback && (
        <div
          role="alert"
          className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm"
        >
          Clipboard access unavailable. Select all the text below and press{" "}
          <kbd className="bg-white border border-gray-300 rounded px-1 font-mono text-xs">
            Ctrl+C
          </kbd>{" "}
          /{" "}
          <kbd className="bg-white border border-gray-300 rounded px-1 font-mono text-xs">
            Cmd+C
          </kbd>{" "}
          to copy.
        </div>
      )}

      <div
        data-testid="prompt-output"
        role="region"
        aria-label="Customized ballot research prompt"
        className="bg-gray-50 border border-gray-200 rounded-xl p-5 max-h-96 overflow-y-auto"
      >
        <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
          {promptText}
        </pre>
      </div>
    </section>
  );
}
