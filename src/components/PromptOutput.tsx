"use client";

import { useState, useRef, useCallback } from "react";
import { useLanguage } from "../lib/i18n";

interface PromptOutputProps {
  promptText: string;
}

export default function PromptOutput({ promptText }: PromptOutputProps) {
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLPreElement>(null);
  const { t } = useLanguage();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      if (textRef.current) {
        const range = document.createRange();
        range.selectNodeContents(textRef.current);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  }, [promptText]);

  return (
    <section data-testid="prompt-output" className="my-4">
      <h2 className="text-xl font-bold text-[#1e3a5f] mb-3">
        {t("prompt.heading")}
      </h2>
      <p className="text-sm text-gray-600 mb-3">
        {t("prompt.instructions")}
      </p>

      <div className="relative bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
        <div className="sticky top-0 bg-gray-50 border-b border-gray-200 p-3 flex justify-end z-10">
          <button
            data-testid="copy-button"
            onClick={handleCopy}
            className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg font-semibold hover:bg-[#2a4a73] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors min-h-[44px] text-sm"
          >
            {copied ? (
              <span data-testid="copy-confirmation">{t("prompt.copiedButton")}</span>
            ) : (
              t("prompt.copyButton")
            )}
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-4">
          <pre
            ref={textRef}
            className="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed"
          >
            {promptText}
          </pre>
        </div>
      </div>
    </section>
  );
}
