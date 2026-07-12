// @ts-nocheck
"use client";
/* Pre-lock confirm screen — the gate between "the conversational issue loop
   is done" and "issues are actually locked in". Card: "Intake locked state:
   is IntakeLocked meant to ship as its own screen?" — decision 2026-07-07:
   IntakeLocked is a discrete step the chat loop leads INTO, not something
   the loop supersedes; it ships as its own screen between issue-selection
   and the lock actually taking effect.

   PORT of design-handoff/keystone-canvas/src/screens-intake.jsx's
   IntakeLocked (artboard iq-locked, "3 · Locked — jurisdiction summary,
   ready to start"): the AI's closing line, the same editable review card
   the conversation already renders (reused here as IssueReviewCard so
   rename/reorder/remove behave identically in both places), and the ✓ "your
   issues are set" banner — classes (.iq-locked/.tick/.lt/.ls) and copy
   ported verbatim from the canvas's intake.css. Bold Flag's --keep/
   --keep-soft aren't in the global palette yet, so — following the
   candidates.css (.cmp) / redesign2.css (.mgap) precedent — they're mapped
   onto the shipped warm-palette tokens, scoped to this screen only.

   Reached from IntakeView after the conversation's "Lock these in" click;
   onConfirm is what actually finalizes the selection (App2's onLock, which
   advances the stage past intake). onBack returns to the live conversation
   without losing it. */

import React from "react";
import { useI18n } from "../VoterChoiceApp";
import { IssueReviewCard } from "./IssueConversation";
import { issuesForLevel } from "./delegationData";

export function IntakeLocked({ issues, setIssues, log, onConfirm, onBack }) {
  const { t } = useI18n();
  // Same per-issue level IssueRow's pill reads (set at extraction time by
  // themesToIssues) — issuesForLevel's "both" counts toward each bucket,
  // matching how the workspace itself splits an issue's jurisdiction.
  // Issues with no resolved level (custom, no canonicalIssue match) count
  // toward neither — omitted, not guessed.
  const fedCount = issuesForLevel(issues, "federal").length;
  const stateCount = issuesForLevel(issues, "state").length;

  return (
    <div className="issue-locked-confirm" data-testid="issue-locked-confirm">
      {(log || []).map((msg, i) => (
        <div key={"ic-locked-" + i} className={"msg " + msg.who}>
          <div className="who">
            {msg.who === "user" ? t("intake.userWho") : t("intake.aiWho")}
          </div>
          <div className="bubble">{msg.text}</div>
        </div>
      ))}

      <div className="msg ai">
        <div className="who">{t("intake.aiWho")}</div>
        <div className="bubble">{t("intake.lockedIntro")}</div>
      </div>

      <IssueReviewCard issues={issues} setIssues={setIssues} />

      <div className="iq-locked">
        <span className="tick">✓</span>
        <div>
          <div className="lt">{t("intake.lockedBannerTitle")}</div>
          <div className="ls">{t("intake.lockedBannerSub")}</div>
        </div>
        {(fedCount > 0 || stateCount > 0) && (
          <div className="jbreak">
            {fedCount > 0 && (
              <span className="iq-juris fed">
                {t("intake.jbreakFederal", { n: fedCount })}
              </span>
            )}
            {stateCount > 0 && (
              <span className="iq-juris state">
                {t("intake.jbreakState", { n: stateCount })}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="co-input ready" style={{ marginTop: 14 }}>
        <div className="row">
          <button
            type="button"
            className="linklike"
            onClick={onBack}
            data-testid="issue-locked-back"
          >
            {t("intake.lockedBack")}
          </button>
          <button
            type="button"
            className="send lock-cta"
            onClick={() => onConfirm(issues)}
            disabled={issues.length === 0}
            data-testid="issue-locked-confirm-btn"
          >
            <span className="lock-label">{t("intake.primaryBtn")}</span>
            <span className="lock-sub">{t("intake.primarySubLabel")}</span>
          </button>
        </div>
        {/* Canvas's IqComposer renders this privacy note on every intake
            step regardless of state (screens-intake.jsx); the port had
            dropped it on this screen when the back link took its slot in
            the row. */}
        <div className="co-privacy">
          <span className="dot">●</span> {t("intake.inputHint")}
        </div>
      </div>
    </div>
  );
}
