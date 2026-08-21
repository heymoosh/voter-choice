// @ts-nocheck
"use client";
/* Community-budget modal for the delegation redesign — the restored
   "budget used up" surface (port of the shipped BudgetExhaustedModal,
   reframed for the assess-congress flow).

   Two ways to keep going:
     1. BYOK — save an Anthropic key, retry the blocked turn right here
        (key stays in the browser; honest degradation copy in ByokCard).
     2. Continue in another chatbot — portable scorecard prompt with
        copy & open buttons.

   Also opened in a softer framing from the budget ribbon ("See options →")
   before anything is actually blocked. */

import React, { useRef, useState } from "react";
import { ByokCard } from "./ByokCard";
import { HandoffActions } from "./HandoffActions";
import { hasByokKey } from "../../lib/anthropic-client-byok";
import { useNav } from "../VoterChoiceApp";

export function BudgetModal({
  /** true → a turn was actually refused; false → opened from the soft ribbon. */
  blocked,
  /** true → the block is Anthropic's shared ACCOUNT hitting its own spend
   *  cap / self-set limit / billing hold (route.ts's
   *  isUpstreamAccountExhausted), NOT our own tracked $50/mo community
   *  budget — that budget may be nowhere near used up. Same continuity flow
   *  either way, but the copy must not blame the wrong thing. */
  upstream = false,
  /** Portable prompt (same builder the handoff modal uses). */
  prompt,
  onClose,
  /** Present when a blocked turn is waiting — wired to replay it via BYOK. */
  onRetryWithKey,
}) {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);
  const [keyReady, setKeyReady] = useState(hasByokKey());
  const nav = useNav();

  function copyToClipboard() {
    if (!textareaRef.current) return;
    textareaRef.current.select();
    try {
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className="be-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-title"
      onClick={onClose}
      data-testid="budget-modal"
    >
      <div className="be-modal" onClick={(e) => e.stopPropagation()}>
        <header className="be-head">
          <div>
            <div className="be-eyebrow">
              {blocked && upstream ? "AI service" : "Community AI budget"}
            </div>
            <h3 id="budget-title">
              {blocked && upstream
                ? "Our shared AI access is temporarily on hold — here's how to keep going."
                : blocked
                  ? "The shared budget is used up — here's how to keep going."
                  : "Keep going — your scorecard is safe."}
            </h3>
          </div>
          <button className="be-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <p className="be-lede">
          {blocked && upstream
            ? "Voter Choice's shared AI access has hit a temporary hold on Anthropic's side — this is NOT the community budget (that's tracked separately and may still be healthy). Everything you've reviewed is still safe on this device. To keep going right now, paste your own Anthropic API key below — free to create, you only pay for what you use."
            : blocked
              ? "The shared community AI budget is used up for this month — this site runs on a fixed monthly pool that everyone shares, and it’s hit its limit. Everything you’ve reviewed is still safe on this device. The budget resets on the 1st of next month. To keep going right now, paste your own Anthropic API key below — free to create, you only pay for what you use."
              : "The community AI budget is running low. Your scorecard is safe either way — here are your options if it runs out:"}
        </p>

        <ByokCard onKeySaved={() => setKeyReady(true)} onClose={onClose} />

        {onRetryWithKey && keyReady && (
          <button
            className="be-ext-btn be-retry-key"
            onClick={onRetryWithKey}
            data-testid="budget-retry-key"
            style={{ marginTop: 8, width: "100%" }}
          >
            <span className="be-ext-ic" aria-hidden="true">
              →
            </span>
            Retry with my key
          </button>
        )}

        <div className="be-prompt" style={{ marginTop: 16 }}>
          <div className="be-prompt-head">
            <span className="be-prompt-lab">
              Or take your scorecard to another chatbot
            </span>
            <button className="be-copy" onClick={copyToClipboard}>
              {copied ? "✓ Copied" : "Copy →"}
            </button>
          </div>
          <textarea
            ref={textareaRef}
            className="be-prompt-text"
            readOnly
            value={prompt}
          />
        </div>

        <HandoffActions prompt={prompt} />

        {blocked && (
          <p className="be-tipjar be-tipjar-modal">
            Voter Choice is free and community-funded. If this helped you,
            consider{" "}
            <a
              onClick={() => {
                nav?.navigate?.("tip");
                onClose?.();
              }}
              role="link"
              tabIndex={0}
              style={{ cursor: "pointer" }}
            >
              leaving a tip
            </a>{" "}
            — it helps keep the shared budget running for others. No pressure.
          </p>
        )}

        <footer className="be-foot">
          Your address never leaves this device. The portable prompt contains
          your issues + verdicts so far — no personally-identifying information.
        </footer>
      </div>
    </div>
  );
}
