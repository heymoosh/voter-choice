"use client";

import { useState, useRef } from "react";

interface PromptOutputProps {
  fullPromptText: string;
}

export function PromptOutput({ fullPromptText }: PromptOutputProps) {
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  async function handleCopy() {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullPromptText);
      } else {
        // Fallback: select all text
        if (textRef.current) {
          textRef.current.select();
          document.execCommand("copy");
        }
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select all
      if (textRef.current) {
        textRef.current.select();
      }
    }
  }

  return (
    <section className="w-full space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Your customized ballot research prompt
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Copy this prompt and paste it as your first message in any AI
            chatbot (Claude, ChatGPT, Gemini, Grok, etc.)
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            data-testid="copy-button"
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-lg bg-blue-600 text-white px-5 py-2.5 font-semibold text-sm hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px]"
            aria-label="Copy prompt to clipboard"
          >
            {copied ? (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
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
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
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
              className="text-sm text-green-700 font-medium"
            >
              Copied to clipboard!
            </span>
          )}
        </div>
      </div>

      <div
        data-testid="prompt-output"
        role="region"
        aria-label="Customized ballot research prompt"
        className="relative rounded-xl border border-gray-200 bg-gray-50 overflow-hidden"
      >
        <textarea
          ref={textRef}
          readOnly
          value={fullPromptText}
          rows={12}
          className="w-full bg-transparent p-4 text-sm text-gray-800 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px]"
          aria-label="Ballot research prompt text"
        />
      </div>
    </section>
  );
}
