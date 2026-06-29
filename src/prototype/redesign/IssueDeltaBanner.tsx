// @ts-nocheck
"use client";
/* Post-re-score delta banner — the shipped AmendDeltaMessage visuals
   (.amend-delta / .ad-* classes) over REAL deltas (the old app's were
   mocked). Rendered at the top of the center pane after an edit-issues
   apply; "Revisit →" jumps to the seat, verdicts are never cleared. */

import React from "react";

export function IssueDeltaBanner({ deltas, onRevisit, onDismiss }) {
  if (!deltas || deltas.length === 0) return null;
  const significant = deltas.filter((d) => d.significant);

  return (
    <div className="msg ai" data-testid="issue-delta-banner">
      <div className="who">Voter Choice · AI</div>
      <div className="bubble amend-delta">
        {significant.length === 0 ? (
          <p>
            <b>Re-scored against your new issues.</b> No member's alignment
            moved past the noise floor — your verdicts stand as-is.
          </p>
        ) : (
          <>
            <p>
              <b>Re-scored.</b> Here's how your delegation shifts against the
              new issue list:
            </p>
            <div className="ad-list">
              {significant.map((d) => {
                const dir =
                  d.newPct === null || d.oldPct === null
                    ? "flat"
                    : d.newPct > d.oldPct
                      ? "up"
                      : d.newPct < d.oldPct
                        ? "down"
                        : "flat";
                return (
                  <div
                    className={"ad-row " + dir + " significant"}
                    key={d.seatId}
                  >
                    <div className="ad-race">
                      <div className="ad-tag">REVISIT</div>
                      <div className="ad-name">{d.label}</div>
                    </div>
                    <div className="ad-score">
                      <div className="ad-old">
                        {d.oldPct === null ? "no record" : d.oldPct + "%"}
                      </div>
                      <div className="ad-arrow">
                        {dir === "up" ? "↑" : dir === "down" ? "↓" : "→"}
                      </div>
                      <div className="ad-new">
                        {d.newPct === null ? "no record" : d.newPct + "%"}
                      </div>
                    </div>
                    <button
                      className="ad-revisit"
                      onClick={() => onRevisit(d.seatId)}
                    >
                      Revisit →
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="ad-foot">
              Only members whose alignment moved more than 5 points (or gained or lost a scoreable record) get a REVISIT flag. Your verdicts are
              unchanged either way.
            </p>
          </>
        )}
        <div style={{ marginTop: 8 }}>
          <button className="linklike" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
