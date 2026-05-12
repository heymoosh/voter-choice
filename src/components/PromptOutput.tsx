"use client";

import { useState } from "react";
import type { Language } from "@/lib/i18n";
import { tStr } from "@/lib/i18n";

type PromptOutputProps = {
  promptText: string;
  language?: Language;
};

export function PromptOutput({
  promptText,
  language = "en",
}: PromptOutputProps) {
  const [copied, setCopied] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  async function handleCopy() {
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(promptText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch {
        // Fall through to fallback
      }
    }
    // Fallback: select the textarea
    setShowFallback(true);
    const textarea = document.getElementById(
      "prompt-textarea",
    ) as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.select();
    }
  }

  return (
    <section aria-labelledby="prompt-heading" className="space-y-4">
      <div>
        <h2
          id="prompt-heading"
          className="text-xl font-bold text-gray-900 mb-1"
        >
          {tStr(language, "yourPrompt")}
        </h2>
        <p className="text-sm text-gray-600">
          {tStr(language, "promptInstructions")}
        </p>
      </div>

      <div className="relative">
        <div
          data-testid="prompt-output"
          id="prompt-output"
          aria-label={tStr(language, "promptOutputLabel")}
          className="bg-gray-50 border border-gray-200 rounded-xl p-5 max-h-80 overflow-y-auto font-mono text-sm text-gray-800 whitespace-pre-wrap leading-relaxed"
        >
          {promptText}
        </div>

        <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <button
            data-testid="copy-button"
            onClick={handleCopy}
            aria-label={tStr(language, "copyPromptLabel")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg px-6 py-3 text-base min-h-[44px] min-w-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            {copied
              ? tStr(language, "copied")
              : tStr(language, "copyToClipboard")}
          </button>

          {copied && (
            <span
              data-testid="copy-confirmation"
              role="status"
              aria-live="polite"
              className="text-green-600 font-semibold text-sm"
            >
              {tStr(language, "copiedConfirmation")}
            </span>
          )}
        </div>

        {showFallback && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            <p>
              {tStr(language, "fallbackCopy")}{" "}
              <kbd className="font-mono bg-yellow-100 px-1 rounded">Ctrl+C</kbd>{" "}
              {tStr(language, "fallbackCopyOr")}{" "}
              <kbd className="font-mono bg-yellow-100 px-1 rounded">Cmd+C</kbd>{" "}
              {tStr(language, "fallbackCopyEnd")}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
