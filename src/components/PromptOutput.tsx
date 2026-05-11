"use client";

import { useState, useRef } from "react";

interface PromptOutputProps {
  promptText: string;
}

export function PromptOutput({ promptText }: PromptOutputProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "fallback">(
    "idle",
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleCopy() {
    // Clear any previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    try {
      // Try clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(promptText);
        setCopyState("copied");
        timeoutRef.current = setTimeout(() => {
          setCopyState("idle");
        }, 2000);
      } else {
        // Fallback: select text in textarea
        fallbackCopy();
      }
    } catch {
      // If clipboard API fails, try fallback
      fallbackCopy();
    }
  }

  function fallbackCopy() {
    if (textareaRef.current) {
      textareaRef.current.select();
      textareaRef.current.setSelectionRange(0, 99999);
      try {
        document.execCommand("copy");
        setCopyState("copied");
        timeoutRef.current = setTimeout(() => {
          setCopyState("idle");
        }, 2000);
      } catch {
        setCopyState("fallback");
      }
    } else {
      setCopyState("fallback");
    }
  }

  return (
    <section aria-labelledby="prompt-output-heading">
      <div className="mb-4">
        <h2
          id="prompt-output-heading"
          className="text-xl font-bold text-gray-900 mb-2"
        >
          Your Customized Ballot Research Prompt
        </h2>
        <p className="text-sm text-gray-600">
          Copy this prompt and paste it as your first message in any AI chatbot
          (Claude, ChatGPT, Gemini, Grok, etc.)
        </p>
      </div>

      {/* Top copy button */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-500">
          Includes your state&apos;s election info pre-filled
        </div>
        <CopyButton copyState={copyState} onCopy={handleCopy} position="top" />
      </div>

      {/* Prompt text area */}
      <div
        data-testid="prompt-output"
        className="relative rounded-lg border border-gray-200 bg-gray-50 overflow-hidden"
      >
        <textarea
          ref={textareaRef}
          readOnly
          value={promptText}
          aria-label="Customized ballot research prompt"
          className="w-full h-64 sm:h-80 p-4 text-sm text-gray-800 bg-transparent font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
          onClick={(e) => {
            // Select all on click for convenience
            (e.target as HTMLTextAreaElement).select();
          }}
        />
      </div>

      {/* Bottom sticky copy area */}
      <div className="sticky bottom-0 pt-3 pb-1 bg-white/90 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <CopyButton
            copyState={copyState}
            onCopy={handleCopy}
            position="bottom"
            fullWidth
          />
          {copyState === "fallback" && (
            <p className="text-sm text-gray-600 text-center sm:text-left">
              Select the text above, then press{" "}
              <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
                Ctrl+C
              </kbd>{" "}
              /{" "}
              <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
                Cmd+C
              </kbd>{" "}
              to copy
            </p>
          )}
        </div>

        {/* Confirmation indicator */}
        {copyState === "copied" && (
          <div
            data-testid="copy-confirmation"
            role="status"
            aria-live="polite"
            className="mt-2 text-sm text-green-700 text-center font-medium flex items-center justify-center gap-1.5"
          >
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
            Copied to clipboard!
          </div>
        )}
        {/* Hidden placeholder to keep layout stable when not copied */}
        {copyState !== "copied" && (
          <div
            data-testid="copy-confirmation"
            aria-hidden="true"
            className="mt-2 h-5 opacity-0 select-none"
          >
            placeholder
          </div>
        )}
      </div>
    </section>
  );
}

function CopyButton({
  copyState,
  onCopy,
  position,
  fullWidth = false,
}: {
  copyState: "idle" | "copied" | "fallback";
  onCopy: () => void;
  position: "top" | "bottom";
  fullWidth?: boolean;
}) {
  const isCopied = copyState === "copied";

  return (
    <button
      data-testid={position === "bottom" ? "copy-button" : undefined}
      onClick={onCopy}
      className={`
        min-h-[44px] min-w-[44px] px-5 py-2.5 rounded-lg font-semibold text-sm
        transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-offset-2
        ${fullWidth ? "w-full" : ""}
        ${
          isCopied
            ? "bg-green-600 text-white focus:ring-green-500"
            : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus:ring-blue-500"
        }
      `}
      aria-label={
        isCopied ? "Prompt copied to clipboard" : "Copy prompt to clipboard"
      }
    >
      <span className="flex items-center justify-center gap-2">
        {isCopied ? (
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Copy to Clipboard
          </>
        )}
      </span>
    </button>
  );
}
