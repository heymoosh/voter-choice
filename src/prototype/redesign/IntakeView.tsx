// @ts-nocheck
"use client";
/* Conversational issue intake at the cold-open stage — replaces the one-shot
   ColdOpenView in the redesign (the legacy app keeps its own). The shell,
   context line, and opening copy match the shipped cold open; the loop inside
   is the shared IssueConversation (extract → converse → lock). */

import React from "react";
import { AppNav, useI18n } from "../VoterChoiceApp";
import { IssueConversation, useIssueConversation } from "./IssueConversation";

export function IntakeView({
  address,
  savedIssues,
  contextNote,
  onLock,
  onBudgetBlock,
}) {
  const { t } = useI18n();
  const convo = useIssueConversation({
    seedIssues: savedIssues && savedIssues.length ? savedIssues : null,
    onBudgetBlock,
    strings: {
      starterAck: t("intake.starterAck"),
      starterThemeSingular: t("intake.starterThemeSingular"),
      starterThemePlural: t("intake.starterThemePlural"),
      errorMsg: t("intake.errorMsg"),
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

        <IssueConversation
          convo={convo}
          primaryLabel={t("intake.primaryBtn")}
          onPrimary={onLock}
          placeholder={t("intake.placeholderFirst")}
        />
      </div>
    </>
  );
}
