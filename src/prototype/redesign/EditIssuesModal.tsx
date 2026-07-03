// @ts-nocheck
"use client";
/* Edit-issues modal — the restored "edit your issues" surface, now
   conversational (same loop as the intake, per the user feedback that drove
   PR-3). Opens any time from the workspace; on Apply the host re-runs the
   deterministic per-seat scoring with the new list. Verdicts are never
   touched — the delta banner flags seats worth revisiting instead. */

import React from "react";
import { useI18n } from "../VoterChoiceApp";
import { IssueConversation, useIssueConversation } from "./IssueConversation";

export function EditIssuesModal({ issues, onApply, onCancel, onBudgetBlock }) {
  const { t } = useI18n();
  const convo = useIssueConversation({
    seedIssues: issues,
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
    <div
      className="amend-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-issues-title"
      onClick={onCancel}
      data-testid="edit-issues-modal"
    >
      <div className="amend-card" onClick={(e) => e.stopPropagation()}>
        <header className="be-head">
          <div>
            <div className="be-eyebrow">{t("editIssues.eyebrow")}</div>
            <h3 id="edit-issues-title">{t("editIssues.heading")}</h3>
          </div>
          <button
            className="be-x"
            onClick={onCancel}
            aria-label={t("editIssues.cancelAriaLabel")}
          >
            ×
          </button>
        </header>

        <p className="be-lede">{t("editIssues.lede")}</p>

        <IssueConversation
          convo={convo}
          primaryLabel={t("editIssues.primaryBtn")}
          onPrimary={onApply}
          placeholder={t("editIssues.placeholder")}
        />

        <footer className="be-foot">
          <button className="linklike" onClick={onCancel}>
            {t("editIssues.cancelLink")}
          </button>
        </footer>
      </div>
    </div>
  );
}
