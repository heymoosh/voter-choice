"use client";

import React from "react";

/**
 * Phase 6 fix — opt-in re-score offer.
 *
 * After a user locks a theme amendment, this offer asks whether they want
 * the AI to re-evaluate already-decided races against the updated themes.
 * Per UX feedback: "Re-scoring should be an option, not a default. Some
 * people might not even care."
 *
 * Renders inline in the workspace chat thread between the user's amend
 * lock and the (optional) AmendDeltaMessage. Two buttons:
 *
 *   · [Yes, show me the deltas]   → fires onAccept (parent calls
 *                                    submitAmendment, AmendDeltaMessage
 *                                    eventually replaces this offer).
 *   · [No, keep what I have]      → fires onDecline (parent clears the
 *                                    offer; no chat call; themes still
 *                                    updated).
 *
 * When `inFlight=true` (user clicked Yes, re-score in progress), both
 * buttons are disabled and a "Re-scoring…" spinner is shown.
 *
 * The component is "dumb" — it owns no state. The parent (ChatPanel via
 * WorkspaceShell in BallotToolClient) decides whether to mount it and
 * controls the in-flight flag.
 */

export interface AmendRescoreOfferProps {
  /** Name of the newly added theme — interpolated into the offer text. */
  newThemeName: string;
  /** Number of already-decided races that would be re-evaluated. */
  decidedCount: number;
  /** Fired when the user accepts the re-score. */
  onAccept: () => void;
  /** Fired when the user declines (offer is dismissed; themes still updated). */
  onDecline: () => void;
  /** When true, both buttons are disabled and a spinner is shown. */
  inFlight?: boolean;
}

export function AmendRescoreOffer({
  newThemeName,
  decidedCount,
  onAccept,
  onDecline,
  inFlight = false,
}: AmendRescoreOfferProps) {
  const racesNoun = decidedCount === 1 ? "race" : "races";

  return (
    <section
      data-testid="amend-rescore-offer"
      role="region"
      aria-label="Re-score already-decided races?"
      aria-live="polite"
      className="my-3 border-l-4 border-primary bg-surface-low p-4 md:p-5 space-y-3"
    >
      <p className="text-sm text-on-surface">
        Your themes are saved. Want me to re-evaluate the{" "}
        <strong>
          {decidedCount} {racesNoun}
        </strong>{" "}
        you&rsquo;ve already decided against your updated priorities (after
        adding &ldquo;{newThemeName}&rdquo;)?
      </p>
      <div className="flex items-center justify-end gap-3">
        {inFlight && (
          <span
            data-testid="amend-rescore-spinner"
            role="status"
            aria-live="polite"
            className="text-xs italic text-on-surface-muted"
          >
            Re-scoring&hellip;
          </span>
        )}
        <button
          type="button"
          data-testid="amend-rescore-decline"
          onClick={onDecline}
          disabled={inFlight}
          className="text-xs font-bold uppercase tracking-widest text-on-surface-muted hover:text-on-surface underline-offset-4 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
        >
          No, keep what I have
        </button>
        <button
          type="button"
          data-testid="amend-rescore-accept"
          onClick={onAccept}
          disabled={inFlight}
          className="bg-primary text-on-primary px-5 py-3 text-sm font-black uppercase tracking-wide hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition"
        >
          Yes, show me the deltas
        </button>
      </div>
    </section>
  );
}
