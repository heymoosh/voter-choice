// @ts-nocheck
"use client";
/* Edit-issues modal — the restored "edit your issues" surface, now
   conversational (same loop as the intake, per the user feedback that drove
   PR-3). Opens any time from the workspace; on Apply the host re-runs the
   deterministic per-seat scoring with the new list. Verdicts are never
   touched — the delta banner flags seats worth revisiting instead. */

import React from "react";
import { IssueConversation, useIssueConversation } from "./IssueConversation";

export function EditIssuesModal({ issues, onApply, onCancel, onBudgetBlock }) {
  const convo = useIssueConversation({
    seedIssues: issues,
    onBudgetBlock,
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
            <div className="be-eyebrow">Edit your issues</div>
            <h3 id="edit-issues-title">
              Re-rank, rename, add, or remove — or just tell me what's changed.
            </h3>
          </div>
          <button className="be-x" onClick={onCancel} aria-label="Cancel">
            ×
          </button>
        </header>

        <p className="be-lede">
          The verdicts you've already made are kept. When you apply, I re-score
          every member against the new list and flag any whose alignment shifts
          past the noise floor.
        </p>

        <IssueConversation
          convo={convo}
          primaryLabel="Apply & re-score →"
          onPrimary={onApply}
          placeholder="What's changed? More context about what you value, a new issue, a different priority order…"
        />

        <footer className="be-foot">
          <button className="linklike" onClick={onCancel}>
            Cancel — keep my current issues
          </button>
        </footer>
      </div>
    </div>
  );
}
