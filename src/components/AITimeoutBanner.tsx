"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n";
import { translations } from "@/lib/translations";
import { ErrorBanner } from "./ErrorBanner";

// NEEDS-KEY: errors.aiTimeoutTitle — EN "[see prototype]" / ES "[see prototype]"
// NEEDS-KEY: errors.aiTimeoutBody  — EN "[see prototype]" / ES "[see prototype]"
// NEEDS-KEY: errors.aiTimeoutRetry — EN "[see prototype]" / ES "[see prototype]"
// NEEDS-KEY: errors.aiTimeoutHandoff — EN "[see prototype]" / ES "[see prototype]"
// NOTE: "Voter Choice · system" who-label is hardcoded (no i18n key in prototype)

// These keys are listed in COMPONENT_MAP §8 but not yet in translations.ts.
// Placeholder literals are used until translations.ts is updated.
const PLACEHOLDERS = {
  en: {
    aiTimeoutTitle: "We hit a snag",
    aiTimeoutBody:
      "The AI took too long to respond. Your session is saved — you haven't lost anything.",
    aiTimeoutRetry: "Try again",
    aiTimeoutHandoff: "Continue in another tool",
  },
  es: {
    aiTimeoutTitle: "Hubo un problema",
    aiTimeoutBody:
      "La IA tardó demasiado en responder. Tu sesión está guardada — no perdiste nada.",
    aiTimeoutRetry: "Intentar de nuevo",
    aiTimeoutHandoff: "Continuar en otra herramienta",
  },
} as const;

export interface AITimeoutBannerProps {
  onRetry: () => void;
  onHandoff: () => void;
}

/**
 * Inline chat message bubble that surfaces when an AI call times out or errors.
 *
 * Ported from prototype-screens-c.jsx `AITimeoutBanner`.
 * Intended mount point: ChatPanel.tsx — rendered inside the messages list
 * as a peer of other `.msg` items when a timeout/error occurs.
 *
 * The outer `.msg.ai-error` wrapper reproduces the prototype shell;
 * `ErrorBanner` handles the colored box + actions inside the bubble.
 */
export function AITimeoutBanner({ onRetry, onHandoff }: AITimeoutBannerProps) {
  const { lang } = useLanguage();

  // Attempt to read from live translations; fall back to placeholder when key
  // doesn't exist (i.e. before translations.ts is updated with Pass C keys).
  const tr = translations[lang] as unknown as Record<string, unknown>;
  const errors = (tr.errors ?? {}) as Record<string, string>;

  const title = errors.aiTimeoutTitle ?? PLACEHOLDERS[lang].aiTimeoutTitle;
  const body = errors.aiTimeoutBody ?? PLACEHOLDERS[lang].aiTimeoutBody;
  const retryLabel = errors.aiTimeoutRetry ?? PLACEHOLDERS[lang].aiTimeoutRetry;
  const handoffLabel =
    errors.aiTimeoutHandoff ?? PLACEHOLDERS[lang].aiTimeoutHandoff;

  return (
    <div
      role="alert"
      className="flex flex-col gap-1"
      data-testid="ai-timeout-banner"
    >
      {/* "who" line — mirrors .msg .who styling in prototype */}
      <div className="text-xs text-ink-3 font-mono">Voter Choice · system</div>

      {/* bubble — transparent/borderless per .msg.ai-error .bubble rule */}
      <div>
        <ErrorBanner
          tone="warn"
          title={title}
          body={body}
          primary={{ label: retryLabel, onClick: onRetry }}
          secondary={{ label: handoffLabel, onClick: onHandoff }}
        />
      </div>
    </div>
  );
}
