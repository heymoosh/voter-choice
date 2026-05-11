"use client";

import { useState } from "react";

interface PromptOutputProps {
  promptText: string;
}

export function PromptOutput({ promptText }: PromptOutputProps) {
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState(false);

  async function handleCopy() {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(promptText);
        setCopied(true);
        setFallback(false);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback for older browsers
        setFallback(true);
      }
    } catch {
      setFallback(true);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Your Customized AI Prompt
        </h2>
        <p className="text-sm text-gray-600">
          Copy this prompt and paste it as your first message in any AI chatbot
          (Claude, ChatGPT, Gemini, Grok).
        </p>
      </div>

      {fallback && (
        <div
          className="px-6 py-3 bg-amber-50 border-b border-amber-200 text-sm text-amber-800"
          role="alert"
        >
          Clipboard not available. Select all text below and press{" "}
          <kbd className="px-1 bg-amber-100 rounded">Ctrl+C</kbd> /{" "}
          <kbd className="px-1 bg-amber-100 rounded">Cmd+C</kbd> to copy.
        </div>
      )}

      <div className="relative">
        <div
          data-testid="prompt-output"
          className="p-6 font-mono text-sm text-gray-800 bg-gray-50 max-h-[400px] overflow-y-auto whitespace-pre-wrap leading-relaxed"
          aria-label="Customized ballot research prompt"
          role="region"
        >
          {promptText}
        </div>

        <div className="p-4 border-t border-gray-200 bg-white flex items-center gap-3">
          <button
            data-testid="copy-button"
            onClick={handleCopy}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px] flex items-center gap-2"
            aria-label="Copy prompt to clipboard"
          >
            {copied ? (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy to Clipboard
              </>
            )}
          </button>

          {copied && (
            <span
              data-testid="copy-confirmation"
              className="text-sm text-green-600 font-medium"
              role="status"
              aria-live="polite"
            >
              Copied to clipboard!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
