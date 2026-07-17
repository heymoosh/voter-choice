// @ts-nocheck
"use client";
/* "Missing a rep? Something look wrong? Help us improve our ballot
   accuracy." — the post-launch roster/ballot-error correction channel
   (card "[P1] Ballot-accuracy feedback intake"), Muxin's replacement for
   manually re-combing state sites. Net-new surface, not a design-canvas
   port: reuses the existing .be-modal-overlay/.be-modal chrome
   (HandoffModal.tsx/BudgetModal.tsx) for visual consistency instead of
   inventing a new modal system.

   No auth, no PII beyond whatever the voter types into the message field.
   state/office/district are prefilled from the caller's existing
   address-resolution context (stateCode/office/district props) but stay
   freely editable — the voter is explicitly invited to correct them. */

import React, { useState } from "react";
import { useI18n } from "../VoterChoiceApp";

export function RosterFeedbackWidget({
  stateCode,
  office,
  district,
  contextLabel,
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [stateDraft, setStateDraft] = useState(stateCode || "");
  const [officeDraft, setOfficeDraft] = useState(office || "");
  const [districtDraft, setDistrictDraft] = useState(district || "");
  const [status, setStatus] = useState("idle"); // idle | submitting | done | error

  function openModal() {
    // Re-sync drafts from the latest address-resolution context each time
    // the form opens, so a stale draft from a previously-viewed seat
    // doesn't linger across opens.
    setStateDraft(stateCode || "");
    setOfficeDraft(office || "");
    setDistrictDraft(district || "");
    setMessage("");
    setStatus("idle");
    setOpen(true);
  }

  async function submit(e) {
    e.preventDefault();
    if (!message.trim() || status === "submitting") return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/roster-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          state: stateDraft.trim() || null,
          office: officeDraft.trim() || null,
          district: districtDraft.trim() || null,
          appContext: contextLabel ? { source: contextLabel } : null,
        }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <button
        type="button"
        className="rf-trigger"
        onClick={openModal}
        data-testid="roster-feedback-trigger"
      >
        {t("rosterFeedback.triggerLabel")}
      </button>

      {open && (
        <div
          className="be-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="roster-feedback-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="be-modal rf-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="be-head">
              <div>
                <div className="be-eyebrow">
                  {t("rosterFeedback.modalEyebrow")}
                </div>
                <h3 id="roster-feedback-title">
                  {t("rosterFeedback.modalTitle")}
                </h3>
              </div>
              <button
                type="button"
                className="be-x"
                onClick={() => setOpen(false)}
                aria-label={t("rosterFeedback.close")}
              >
                ×
              </button>
            </header>

            <p className="be-lede">{t("rosterFeedback.modalLede")}</p>

            {status === "done" ? (
              <p className="rf-success" data-testid="roster-feedback-success">
                {t("rosterFeedback.successMessage")}
              </p>
            ) : (
              <form onSubmit={submit} className="rf-form">
                <label className="rf-field">
                  <span className="rf-field-lab">
                    {t("rosterFeedback.messageLabel")}
                  </span>
                  <textarea
                    className="rf-textarea"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t("rosterFeedback.messagePlaceholder")}
                    maxLength={2000}
                    required
                    data-testid="roster-feedback-message"
                  />
                </label>
                <div className="rf-row">
                  <label className="rf-field rf-field-narrow">
                    <span className="rf-field-lab">
                      {t("rosterFeedback.stateLabel")}
                    </span>
                    <input
                      className="rf-input"
                      value={stateDraft}
                      onChange={(e) => setStateDraft(e.target.value)}
                      maxLength={4}
                      data-testid="roster-feedback-state"
                    />
                  </label>
                  <label className="rf-field">
                    <span className="rf-field-lab">
                      {t("rosterFeedback.officeLabel")}
                    </span>
                    <input
                      className="rf-input"
                      value={officeDraft}
                      onChange={(e) => setOfficeDraft(e.target.value)}
                      data-testid="roster-feedback-office"
                    />
                  </label>
                </div>
                <label className="rf-field">
                  <span className="rf-field-lab">
                    {t("rosterFeedback.districtLabel")}
                  </span>
                  <input
                    className="rf-input"
                    value={districtDraft}
                    onChange={(e) => setDistrictDraft(e.target.value)}
                    data-testid="roster-feedback-district"
                  />
                </label>

                {status === "error" && (
                  <p className="rf-error" data-testid="roster-feedback-error">
                    {t("rosterFeedback.errorMessage")}
                  </p>
                )}

                <button
                  type="submit"
                  className="rf-submit"
                  disabled={status === "submitting" || !message.trim()}
                  data-testid="roster-feedback-submit"
                >
                  {status === "submitting"
                    ? t("rosterFeedback.submittingBtn")
                    : t("rosterFeedback.submitBtn")}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
