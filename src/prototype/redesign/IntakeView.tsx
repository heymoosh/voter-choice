// @ts-nocheck
"use client";
/* Conversational issue intake — reached from the delegation overview's
   optional "Tailor to your issues" entry point (reps-first flow, 2026-08-18
   product decision: issues are no longer a forced gate before seeing your
   representatives). The shell, context line, and opening copy match the
   shipped cold open; the loop inside is the shared IssueConversation
   (extract → converse → lock).

   The conversation's "Lock these in" click finalizes directly (onLock) —
   the IntakeLocked pre-lock confirm screen and the guided orientation
   interstitial that used to sit between it and the workspace are both
   dropped from this path (fewer clicks was the point of the flow change).
   IntakeLocked's own editable review card (IssueReviewCard) isn't lost:
   IssueConversation already renders the same component inline as the
   themes card. IntakeLocked.tsx itself stays in the tree unused, in case a
   future entry point wants a distinct confirm step again. */

import React from "react";
import { AppNav, useI18n } from "../VoterChoiceApp";
import { IssueConversation, useIssueConversation } from "./IssueConversation";

export function IntakeView({
  address,
  savedIssues,
  contextNote,
  onLock,
  onBudgetBlock,
  // Only passed when there's an existing workspace to return to (tailoring
  // from an already-populated delegation, not the forced first-run path).
  onCancel,
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

  // Canvas's IqShell renders a real "Step 1 of ..." label that tracks where
  // the conversation actually is. Locking now finalizes directly (no
  // IntakeLocked confirm screen in between), so only the two live states —
  // asking vs. refining — apply here.
  const step =
    convo.issues.length > 0 ? t("intake.stepRefine") : t("intake.stepAsk");

  return (
    <>
      <AppNav />
      <div className="coldopen">
        <div className="co-context">
          <b>{address}</b> · {contextNote || "your representatives"}
          <span className="step">{step}</span>
          {onCancel && (
            <button
              type="button"
              className="linklike"
              onClick={onCancel}
              data-testid="intake-cancel"
            >
              {t("intake.cancelLabel")}
            </button>
          )}
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

        <IssueConversation
          convo={convo}
          primaryLabel={t("intake.primaryBtn")}
          primarySubLabel={t("intake.primarySubLabel")}
          onPrimary={onLock}
          placeholder={t("intake.placeholderFirst")}
        />
      </div>
    </>
  );
}
