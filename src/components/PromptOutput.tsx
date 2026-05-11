"use client";

import { useState, useRef } from "react";

interface PromptOutputProps {
  promptText: string;
}

export default function PromptOutput({ promptText }: PromptOutputProps) {
  const [copied, setCopied] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  async function handleCopy() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(promptText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch {
        // Fall through to fallback
      }
    }
    // Fallback: select the text in the textarea
    if (textAreaRef.current) {
      textAreaRef.current.select();
      setShowFallback(true);
    }
  }

  return (
    <section
      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
      aria-label="Customized ballot research prompt"
    >
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h2 className="text-lg font-bold text-gray-900">
          Your Customized Ballot Research Prompt
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Copy this prompt and paste it as your first message in any AI chatbot
        </p>
      </div>

      <div className="p-6 space-y-4">
        {/* Instructions */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="text-sm text-gray-600">
            <strong>How to use:</strong> Copy below → open any free AI chatbot →
            paste as your first message
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid="copy-button"
              onClick={handleCopy}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px] min-w-[44px]"
              aria-label="Copy prompt to clipboard"
            >
              {copied ? (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
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
                    stroke="currentColor"
                    viewBox="0 0 24 24"
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
                role="status"
                aria-live="polite"
                className="text-sm text-green-700 font-medium"
              >
                ✓ Copied to clipboard!
              </span>
            )}
          </div>
        </div>

        {showFallback && (
          <div
            role="alert"
            aria-live="polite"
            className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3"
          >
            Clipboard not available. The text is selected — press{" "}
            <kbd className="px-1.5 py-0.5 bg-amber-100 rounded text-xs font-mono">
              Ctrl+C
            </kbd>{" "}
            /{" "}
            <kbd className="px-1.5 py-0.5 bg-amber-100 rounded text-xs font-mono">
              Cmd+C
            </kbd>{" "}
            to copy.
          </div>
        )}

        {/* Prompt text area */}
        <div
          data-testid="prompt-output"
          className="relative"
          role="region"
          aria-label="Full ballot research prompt text"
        >
          <textarea
            ref={textAreaRef}
            readOnly
            value={promptText}
            rows={20}
            className="w-full p-4 text-sm font-mono bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 leading-relaxed"
            aria-label="Ballot research prompt — read only, use copy button above"
            aria-readonly="true"
          />
        </div>
      </div>
    </section>
  );
}
