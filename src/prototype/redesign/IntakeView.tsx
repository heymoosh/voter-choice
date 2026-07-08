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

  return (
    <>
      <AppNav />
      <div className="coldopen">
        <div className="co-context">
          <b>{address}</b> · {contextNote || "your representatives"}
        </div>

        <div className="msg ai">
          <div className="who">{t("intake.aiWho")}</div>
          <div className="bubble">
            <p>{t("intake.openerP1")}</p>
            <p style={{ marginTop: "10px" }}>
              <b>{t("intake.openerP2Bold")}</b>
              {t("intake.openerP2Rest")}
            </p>
          </div>
        </div>

        {confirmingLock ? (
          <IntakeLocked
            issues={convo.issues}
            setIssues={convo.setIssues}
            log={convo.log}
            onConfirm={(locked) => onLock(locked)}
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
