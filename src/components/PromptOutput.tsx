"use client";

import { useState, useRef } from "react";

interface PromptOutputProps {
  promptText: string;
}

export function PromptOutput({ promptText }: PromptOutputProps) {
  const [copied, setCopied] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(promptText);
    } catch {
      // Fallback: select all text in textarea
      if (textAreaRef.current) {
        textAreaRef.current.select();
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Your Customized Prompt</h2>
        <div className="flex items-center gap-2">
          {copied && (
            <span
              data-testid="copy-confirmation"
              role="status"
              aria-live="polite"
              className="text-green-600 text-sm font-medium flex items-center gap-1"
            >
              ✓ Copied!
            </span>
          )}
          <button
            data-testid="copy-button"
            onClick={handleCopy}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors min-h-[44px]"
            aria-label="Copy prompt to clipboard"
          >
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-3">
        Copy this prompt and paste it as your first message in any AI chatbot.
      </p>
      <textarea
        ref={textAreaRef}
        data-testid="prompt-output"
        readOnly
        value={promptText}
        aria-label="Customized ballot research prompt"
        className="w-full h-64 md:h-96 p-4 border border-gray-200 rounded-xl text-sm font-mono bg-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </section>
  );
}
