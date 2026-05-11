"use client";
import { useState, useRef } from "react";

interface PromptOutputProps {
  prompt: string;
}

export function PromptOutput({ prompt }: PromptOutputProps) {
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text for manual copy
      if (textRef.current) {
        textRef.current.select();
      }
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-3 gap-4">
        <h2 className="text-lg font-bold text-gray-900">
          Your Customized Research Prompt
        </h2>
        <button
          data-testid="copy-button"
          onClick={handleCopy}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px]"
          aria-label="Copy prompt to clipboard"
        >
          {copied ? (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
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
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy to Clipboard
            </>
          )}
        </button>
      </div>

      {copied && (
        <p
          data-testid="copy-confirmation"
          role="status"
          aria-live="polite"
          className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3"
        >
          Copied! Paste this as your first message in any AI chatbot.
        </p>
      )}

      <p className="text-sm text-gray-600 mb-3">
        Copy this prompt and paste it as your first message in any AI chatbot:
      </p>

      <div
        data-testid="prompt-output"
        className="bg-gray-50 rounded-lg border border-gray-200 p-4 max-h-[400px] overflow-y-auto"
        role="region"
        aria-label="Customized AI ballot research prompt"
      >
        <textarea
          ref={textRef}
          readOnly
          value={prompt}
          className="w-full bg-transparent text-sm text-gray-800 font-mono resize-none outline-none"
          rows={Math.min(prompt.split("\n").length + 2, 20)}
          aria-label="Ballot research prompt text"
        />
      </div>
    </div>
  );
}
