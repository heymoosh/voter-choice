"use client";

import { useState, useCallback } from "react";
import { useTranslation } from "@/lib/i18n/I18nContext";

interface PromptOutputProps {
  promptText: string;
}

export function PromptOutput({ promptText }: PromptOutputProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [copyFallback, setCopyFallback] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(promptText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setCopyFallback(true);
      }
    } catch {
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
            {t.prompt.instructions}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="copy-button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:outline-none active:bg-blue-800 transition-colors min-h-[44px] text-sm"
            aria-live="polite"
            aria-label={
              copied ? t.prompt.copiedButton : "Copy prompt to clipboard"
            }
          >
            {copied ? (
              <>
                <span aria-hidden="true">✓</span>
                {t.prompt.copiedButton}
              </>
            ) : (
              <>
                <span aria-hidden="true">📋</span>
                {t.prompt.copyButton}
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
              {t.prompt.copiedButton}
            </span>
          )}
        </div>
      </div>

      {copyFallback && (
        <div
          role="alert"
          className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm"
        >
          {t.prompt.fallbackInstructions}
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
