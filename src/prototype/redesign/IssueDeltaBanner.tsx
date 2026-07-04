// @ts-nocheck
"use client";
/* Post-re-score delta banner — the shipped AmendDeltaMessage visuals
   (.amend-delta / .ad-* classes) over REAL deltas (the old app's were
   mocked). Rendered at the top of the center pane after an edit-issues
   apply; "Revisit →" jumps to the seat, verdicts are never cleared. */

import React from "react";
import { useI18n } from "../VoterChoiceApp";

export function IssueDeltaBanner({ deltas, onRevisit, onDismiss }) {
  const { t } = useI18n();
  if (!deltas || deltas.length === 0) return null;
  const significant = deltas.filter((d) => d.significant);

  return (
    <div className="msg ai" data-testid="issue-delta-banner">
      <div className="who">{t("issueDeltaBanner.who")}</div>
      <div className="bubble amend-delta">
        {significant.length === 0 ? (
          <p>
            <b>{t("issueDeltaBanner.noChangeTitle")}</b>{" "}
            {t("issueDeltaBanner.noChangeBody")}
          </p>
        ) : (
          <>
            <p>
              <b>{t("issueDeltaBanner.rescoredTitle")}</b>{" "}
              {t("issueDeltaBanner.rescoredBody")}
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
                      <div className="ad-tag">
                        {t("issueDeltaBanner.revisitTag")}
                      </div>
                      <div className="ad-name">{d.label}</div>
                    </div>
                    <div className="ad-score">
                      <div className="ad-old">
                        {d.oldPct === null
                          ? t("issueDeltaBanner.noRecord")
                          : d.oldPct + "%"}
                      </div>
                      <div className="ad-arrow">
                        {dir === "up" ? "↑" : dir === "down" ? "↓" : "→"}
                      </div>
                      <div className="ad-new">
                        {d.newPct === null
                          ? t("issueDeltaBanner.noRecord")
                          : d.newPct + "%"}
                      </div>
                    </div>
                    <button
                      className="ad-revisit"
                      onClick={() => onRevisit(d.seatId)}
                    >
                      {t("issueDeltaBanner.revisitBtn")}
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="ad-foot">{t("issueDeltaBanner.footNote")}</p>
          </>
        )}
        <div style={{ marginTop: 8 }}>
          <button className="linklike" onClick={onDismiss}>
            {t("issueDeltaBanner.dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
