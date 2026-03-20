"use client";

import { useEffect, useRef, useState } from "react";
import { TEST_IDS } from "@/types/testids";

interface PromptOutputProps {
  promptText: string;
}

export function PromptOutput({ promptText }: PromptOutputProps) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const handleCopy = async () => {
    // Cancel any existing confirmation timer (handles rapid clicks)
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }

    try {
      await navigator.clipboard.writeText(promptText);
    } catch {
      // Clipboard unavailable — don't update state
      return;
    }

    setCopied(true);
    copyTimeoutRef.current = setTimeout(() => {
      setCopied(false);
      copyTimeoutRef.current = null;
    }, 2000);
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Your Customized AI Prompt
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Copy this prompt and paste it as your first message in any AI
            chatbot
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            data-testid={TEST_IDS.COPY_BUTTON}
            onClick={handleCopy}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors min-h-[44px]"
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
                <span data-testid={TEST_IDS.COPY_CONFIRMATION}>Copied!</span>
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
        </div>
      </div>

      <div
        data-testid={TEST_IDS.PROMPT_OUTPUT}
        className="bg-gray-50 border border-gray-200 rounded-xl p-4 max-h-96 overflow-y-auto"
        role="region"
        aria-label="Customized ballot research prompt"
      >
        <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
          {promptText}
        </pre>
      </div>
    </section>
  );
}
