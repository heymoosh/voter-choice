// @ts-nocheck
"use client";
/* Conversational issue intake at the cold-open stage — replaces the one-shot
   ColdOpenView in the redesign (the legacy app keeps its own). The loop inside
   is the shared IssueConversation (extract → converse → lock).

   Chrome is the Bold Flag "IntakeAsk" artboard, ported verbatim (markup +
   classes) from design-handoff/keystone-canvas's screens-intake.jsx — a flag
   hairline, a full-bleed step-context strip (address left · step marker right),
   and a serif "ask" headline block above the chat. Per the IntakePropose
   artboard the ask headline is cold-open-only: once the first turn lands it is
   replaced by the conversation, so it renders only while the loop is empty.
   The canvas's iq-foot composer and per-turn quick-reply chips are a separate
   follow-up — the composer here stays IssueConversation's shared .co-input. */

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
      updatedFallback: t("intake.updatedFallback"),
      notedFallback: t("intake.notedFallback"),
    },
  });
  const coldOpen = convo.log.length === 0 && convo.issues.length === 0;

  return (
    <>
      <AppNav />
      <div className="iq" data-palette="white">
        <div className="flagbar">
          <i />
          <i />
          <i />
        </div>
        <div className="iq-ctx">
          <span className="b">
            {address} · {contextNote || "your representatives"}
          </span>
          <span className="step">{t("intake.stepStrip")}</span>
        </div>
        <div className="iq-stage">
          <div className="iq-conv">
            {coldOpen && (
              <div className="iq-ask">
                <span className="ask-k kick">
                  <span className="star">★</span> {t("intake.kicker")}
                </span>
                <h1
                  dangerouslySetInnerHTML={{ __html: t("intake.headline") }}
                />
                <p>{t("intake.openerP1")}</p>
                <div className="iq-msg ai">
                  <div className="iq-who">{t("intake.aiWho")}</div>
                  <div className="iq-bubble">
                    <b>{t("intake.openerP2Bold")}</b>
                    {t("intake.openerP2Rest")}
                  </div>
                </div>
              </div>
            )}

            <IssueConversation
              convo={convo}
              primaryLabel={t("intake.primaryBtn")}
              onPrimary={onLock}
              placeholder={t("intake.placeholderFirst")}
            />
          </div>
        </div>
      </div>
    </>
  );
}
