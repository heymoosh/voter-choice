"use client";

import { useState, useRef } from "react";

interface Props {
  prompt: string;
}

export default function PromptOutput({ prompt }: Props) {
  const [copied, setCopied] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  async function handleCopy() {
    try {
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(prompt);
        showCopied();
      } else {
        // Fallback: select text and prompt keyboard copy
        fallbackCopy();
      }
    } catch {
      fallbackCopy();
    }
  }

  function fallbackCopy() {
    if (textAreaRef.current) {
      textAreaRef.current.select();
      textAreaRef.current.setSelectionRange(
        0,
        textAreaRef.current.value.length,
      );
      // Show keyboard instructions
      setCopied(false);
      // Focus the textarea so user can press Ctrl+C / Cmd+C
      textAreaRef.current.focus();
    }
  }

  function showCopied() {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section
      aria-label="Customized ballot research prompt"
      className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
    >
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Your Customized Prompt
      </h2>
      <p className="text-gray-600 text-sm mb-4">
        Copy this prompt and paste it as your first message in any AI chatbot
        (Claude, ChatGPT, Gemini, or Grok).
      </p>

      <div className="relative">
        <textarea
          ref={textAreaRef}
          data-testid="prompt-output"
          readOnly
          value={prompt}
          aria-label="Customized ballot research prompt text"
          aria-multiline="true"
          className="w-full h-64 sm:h-80 p-4 text-sm font-mono bg-gray-50 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-600 overflow-y-auto"
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          data-testid="copy-button"
          onClick={handleCopy}
          aria-label="Copy prompt to clipboard"
          className="flex items-center gap-2 bg-blue-700 text-white rounded-lg px-5 py-3 text-base font-semibold min-h-[44px] hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-colors"
        >
          {copied ? (
            <>
              <svg
                aria-hidden="true"
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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
                aria-hidden="true"
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                />
              </svg>
              Copy to Clipboard
            </>
          )}
        </button>

        {copied && (
          <span
            data-testid="copy-confirmation"
            role="status"
            aria-live="polite"
            className="text-green-700 font-medium text-sm"
          >
            Copied to clipboard!
          </span>
        )}
      </div>
    </section>
  );
}
