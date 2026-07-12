// @ts-nocheck
"use client";
/* Conversational issue intake at the cold-open stage — replaces the one-shot
   ColdOpenView in the redesign (the legacy app keeps its own). The shell,
   context line, and opening copy match the shipped cold open; the loop inside
   is the shared IssueConversation (extract → converse → lock).

   The conversation's "Lock these in" click doesn't finalize directly — it
   gates into IntakeLocked, a distinct pre-lock confirm screen (card "Intake
   locked state: is IntakeLocked meant to ship as its own screen?" —
   decision: yes, ship it as its own step). onLock only fires from that
   screen's own confirm control; its back control returns here without
   losing the conversation. */

import React, { useState } from "react";
import { AppNav, useI18n } from "../VoterChoiceApp";
import { IssueConversation, useIssueConversation } from "./IssueConversation";
import { IntakeLocked } from "./IntakeLocked";

export function IntakeView({
  address,
  savedIssues,
  contextNote,
  onLock,
  onBudgetBlock,
}) {
  const { t } = useI18n();
  const [confirmingLock, setConfirmingLock] = useState(false);
  const convo = useIssueConversation({
    seedIssues: savedIssues && savedIssues.length ? savedIssues : null,
    onBudgetBlock,
    strings: {
      starterAck: t("intake.starterAck"),
      starterThemeSingular: t("intake.starterThemeSingular"),
      starterThemePlural: t("intake.starterThemePlural"),
      errorMsg: t("intake.errorMsg"),
      updatedFallback: t("intake.updatedFallback"),
      notedFallback: t("intake.notedFallback"),
    },
  });

  // Canvas's IqShell renders a real "Step 1 of 3 · ..." label that tracks
  // where the conversation actually is (screens-intake.jsx's IntakeAsk /
  // IntakePropose / IntakeLocked each pass their own `step` string to the
  // shared shell) — not a hardcoded string. Same three states, driven by
  // the same convo/confirmingLock state IssueConversation and IntakeLocked
  // already switch on below.
  const step = confirmingLock
    ? t("intake.stepReady")
    : convo.issues.length > 0
      ? t("intake.stepRefine")
      : t("intake.stepAsk");

  return (
    <>
      <AppNav />
      <div className="coldopen">
        <div className="co-context">
          <b>{address}</b> · {contextNote || "your representatives"}
          <span className="step">{step}</span>
        </div>

        {/* Canvas's IntakeAsk hero (kicker + h1 + intro paragraph) only
            appears before the conversation has started — screens-intake.jsx's
            IntakePropose/IntakeLocked never render it. Gated on log.length
            so it drops away the moment the first exchange lands, same as
            canvas. The intro paragraph reuses the existing openerP1 copy
            (moved out of the AI bubble below) instead of duplicating the
            same framing sentence in both places. */}
        {convo.log.length === 0 && (
          <div className="ask-hero">
            <span className="kick">
              <span className="star" aria-hidden="true">
                ★
              </span>{" "}
              {t("intake.askKicker")}
            </span>
            <h1>
              {t("intake.askH1Lead")}
              <em>{t("intake.askH1Em")}</em>
            </h1>
            <p>{t("intake.openerP1")}</p>
          </div>
        )}

        <div className="msg ai">
          <div className="who">{t("intake.aiWho")}</div>
          <div className="bubble">
            <b>{t("intake.openerP2Bold")}</b>
            {t("intake.openerP2Rest")}
          </div>
        </div>

        {confirmingLock ? (
          <IntakeLocked
            issues={convo.issues}
            setIssues={convo.setIssues}
            log={convo.log}
            onConfirm={onLock}
            onBack={() => setConfirmingLock(false)}
          />
        ) : (
          <IssueConversation
            convo={convo}
            primaryLabel={t("intake.primaryBtn")}
            onPrimary={() => setConfirmingLock(true)}
            placeholder={t("intake.placeholderFirst")}
          />
        )}
      </div>
    </>
  );
}
