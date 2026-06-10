// @ts-nocheck
"use client";

import React, { useMemo, useRef, useState } from "react";
import { downloadProfileAsText } from "../../lib/ballot-utils";
import { buildScorecardProfileText } from "./delegationData";

function buildHandoffPrompt({ seats, issues, verdicts, districtsLine }) {
  const reviewed = seats.filter((seat) => verdicts[seat.id]).length;
  const base = buildScorecardProfileText({
    seats,
    issues,
    verdicts,
    districtsLine,
  });

  return [
    base,
    "",
    "Instructions for the chatbot:",
    `- I have reviewed ${reviewed} of ${seats.length} members so far.`,
    "- Continue from this scorecard. Do not ask me to re-enter my address.",
    "- Help me compare the representatives against my issues using public voting records, donor data, and cited evidence.",
    "- Be explicit when data is missing or uncertain.",
  ].join("\n");
}

export function HandoffModal({
  seats,
  issues,
  verdicts,
  districtsLine,
  onClose,
}) {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);
  const prompt = useMemo(
    () => buildHandoffPrompt({ seats, issues, verdicts, districtsLine }),
    [seats, issues, verdicts, districtsLine],
  );
  const reviewed = seats.filter((seat) => verdicts[seat.id]).length;

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
      aria-labelledby="handoff-title"
      onClick={onClose}
    >
      <div className="be-modal" onClick={(e) => e.stopPropagation()}>
        <header className="be-head">
          <div>
            <div className="be-eyebrow">
              Continue elsewhere - context handoff
            </div>
            <h3 id="handoff-title">Take your scorecard with you.</h3>
          </div>
          <button className="be-x" onClick={onClose} aria-label="Close">
            x
          </button>
        </header>

        <p className="be-lede">
          You have reviewed <b>{reviewed}</b> of {seats.length} representatives.
          Copy this prompt into Claude, ChatGPT, Gemini, or another chatbot to
          keep working from the same context.
        </p>

        <div className="be-prompt">
          <div className="be-prompt-head">
            <span className="be-prompt-lab">Portable prompt</span>
            <button className="be-copy" onClick={copyToClipboard}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <textarea
            ref={textareaRef}
            className="be-prompt-text"
            readOnly
            value={prompt}
          />
        </div>

        <div className="be-extras">
          <button
            className="be-ext-btn"
            onClick={() => downloadProfileAsText(prompt)}
          >
            <span className="be-ext-ic" aria-hidden="true">
              Download
            </span>
            Download prompt as .txt
          </button>
        </div>
      </div>
    </div>
  );
}

export { buildHandoffPrompt };
