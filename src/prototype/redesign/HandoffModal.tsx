// @ts-nocheck
"use client";
/* "Take your scorecard with you" — restored handoff fidelity for the
   assess-congress flow. The cutover's version was a bare textarea + copy
   button; this restores everything the old HandoffPackage offered minus the
   ballot-specific parts (voting-plan CTA stays dropped by design):

     · rich portable prompt (priorities + verdicts with evidence basis +
       remaining seats + 2026 filers — handoffText.ts, deterministic)
     · per-chatbot Copy & open buttons + .txt download (HandoffActions)
     · BYOK card ("or keep going right here with your own key") */

import React, { useMemo, useRef, useState } from "react";
import { useI18n, escapeHtml } from "../VoterChoiceApp";
import { buildScorecardHandoffPrompt } from "./handoffText";
import { HandoffActions } from "./HandoffActions";
import { ByokCard } from "./ByokCard";

export function HandoffModal({
  seats,
  issues,
  verdicts,
  districtsLine,
  stateName,
  researchFor,
  onClose,
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);
  const prompt = useMemo(
    () =>
      buildScorecardHandoffPrompt({
        seats,
        issues,
        verdicts,
        districtsLine,
        stateName,
        researchFor,
      }),
    [seats, issues, verdicts, districtsLine, stateName, researchFor],
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
            <div className="be-eyebrow">{t("handoffModal.eyebrow")}</div>
            <h3 id="handoff-title">{t("handoffModal.title")}</h3>
          </div>
          <button
            className="be-x"
            onClick={onClose}
            aria-label={t("handoffModal.close")}
          >
            ×
          </button>
        </header>

        <p
          className="be-lede"
          dangerouslySetInnerHTML={{
            __html: t("handoffModal.lede", {
              reviewed: escapeHtml(reviewed),
              total: escapeHtml(seats.length),
            }),
          }}
        />

        <div className="be-prompt">
          <div className="be-prompt-head">
            <span className="be-prompt-lab">
              {t("handoffModal.portablePrompt")}
            </span>
            <button className="be-copy" onClick={copyToClipboard}>
              {copied ? t("handoffModal.copied") : t("handoffModal.copy")}
            </button>
          </div>
          <textarea
            ref={textareaRef}
            className="be-prompt-text"
            readOnly
            value={prompt}
          />
        </div>

        <HandoffActions
          prompt={prompt}
          downloadFilename="voter-choice-scorecard.txt"
        />

        <ByokCard onClose={onClose} />

        <footer className="be-foot">{t("handoffModal.footer")}</footer>
      </div>
    </div>
  );
}

export { buildScorecardHandoffPrompt as buildHandoffPrompt };
