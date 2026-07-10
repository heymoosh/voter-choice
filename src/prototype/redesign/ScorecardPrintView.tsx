// @ts-nocheck
"use client";
/* VERBATIM port of docs/design/2026-redesign/…/redesign2-print.jsx.
   Port deltas, behavior-only:
     - window globals → props (seats, issues, stateData, pollingInfo).
     - The voter-meta districts line binds to the REAL delegation
       (the design hardcoded "TX-21 · SD-14 · HD-47" mock districts).
     - Polling/early-voting cells render honest fallbacks when the data
       is absent (the delegation flow makes no civic call).
     - Election date comes from the next upcoming election, not [0]. */

import React from "react";
import { AppNav, useI18n } from "../VoterChoiceApp";

function fmtLong(dateIso) {
  return new Date(dateIso + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
function fmtShort(dateIso) {
  return new Date(dateIso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ScorecardPrintView({
  address,
  seats,
  issues,
  verdicts,
  picks,
  stateData,
  pollingInfo,
  districtsLine,
  onBack,
}) {
  const { t } = useI18n();
  // Reps not up for election in 2026 are excluded from the printed scorecard —
  // they stay visible (greyed + labeled) in the workspace, but the takeaway
  // sheet is about who's on your 2026 ballot. onBallot2026 === false only;
  // unverified (null) seats are kept (honest-state rule).
  const scorecardSeats = seats.filter(
    (s) => s.nextElection?.onBallot2026 !== false,
  );
  const sections = {};
  scorecardSeats.forEach((s) => {
    if (!verdicts[s.id]) return;
    (sections[s.section] = sections[s.section] || []).push(s);
  });
  const unreviewed = scorecardSeats.filter((s) => !verdicts[s.id]);
  // Lead with a percentage (B). Falls back to null when there's no scored
  // voting record (researched seats / total 0) so the row stays honest.
  const scoreFor = (s) => {
    if (s.researched || !s.alignmentEntry?.scores) return null;
    const kept = s.alignmentEntry.scores.reduce(
      (n, sc) => n + (sc.kept ?? 0),
      0,
    );
    const total = s.alignmentEntry.scores.reduce(
      (n, sc) => n + (sc.total ?? 0),
      0,
    );
    if (total === 0) return null;
    const pct = Math.round((kept / total) * 100);
    return { pct, kept, total };
  };

  const todayIso = new Date().toISOString().slice(0, 10);
  const upcoming = (stateData?.elections || []).filter(
    (e) => e.date >= todayIso,
  );
  const nextElection = upcoming[0] || (stateData?.elections || [])[0] || null;
  const earlyVoting =
    stateData?.earlyVoting?.available && stateData.earlyVoting.startDate
      ? `${fmtShort(stateData.earlyVoting.startDate)} – ${
          stateData.earlyVoting.endDate
            ? fmtShort(stateData.earlyVoting.endDate)
            : ""
        }`
      : null;

  return (
    <>
      <AppNav onBrandClick={onBack} />
      <div className="print-wrap">
        <div className="print-header">
          <h2>{t("scorecardPrint.heading")}</h2>
          <div className="actions">
            <button onClick={onBack}>
              {t("scorecardPrint.backToScorecard")}
            </button>
            <button className="primary" onClick={() => window.print()}>
              {t("scorecardPrint.printSave")}
            </button>
          </div>
        </div>

        <div className="print-sheet">
          <header className="ph-head">
            <div className="l">
              {t("scorecardPrint.myScorecard")}
              {nextElection ? ` · ${fmtLong(nextElection.date)}` : ""}
              <small>{t("scorecardPrint.brand")}</small>
            </div>
            <div className="r">
              {pollingInfo?.precinct && (
                <b>
                  {t("scorecardPrint.precinct", { n: pollingInfo.precinct })}
                </b>
              )}
              {pollingInfo?.name}
              <br />
              {pollingInfo?.address && (
                <>
                  {pollingInfo.address}
                  <br />
                </>
              )}
              {pollingInfo?.hours && (
                <>
                  {t("scorecardPrint.pollsHours", { hours: pollingInfo.hours })}
                </>
              )}
            </div>
          </header>

          {/* Decisions first (D): the per-seat keep/replace verdicts lead the
              sheet; the logistics block (address, districts, where/when to
              vote) follows below. */}
          <div className="ballot-list">
            {Object.entries(sections).map(([section, ss]) => (
              <div className="ballot-group" key={section}>
                <div className="gtitle">{section}</div>
                {ss.map((s) => {
                  const v = verdicts[s.id];
                  const score = scoreFor(s);
                  const align = score
                    ? t("scorecardPrint.aligned", score)
                    : null;
                  return (
                    <div className={"br checked verdict-row " + v} key={s.id}>
                      <div className="bx"></div>
                      <div className="br-main">
                        <div className="race-name">
                          {s.office} · {s.districtLabel}
                        </div>
                        <div className="pick-name">
                          {s.candidate?.name ?? s.blindLabel}
                          <span className={"party verdict-print " + v}>
                            {v === "keep"
                              ? t("scorecard.worthKeeping")
                              : t("scorecard.timeToReplace")}
                          </span>
                          {v === "replace" &&
                            (() => {
                              const pick = (s.challengers || []).find(
                                (c) => c.id === picks?.[s.id],
                              );
                              return pick ? (
                                <span className="pick-successor">
                                  {" → "}
                                  {pick.name}
                                </span>
                              ) : null;
                            })()}
                        </div>
                        <div className="my-note">
                          {align ? align + " · " : ""}
                          {s.nextElection ? s.nextElection.label : ""}
                        </div>
                      </div>
                      {score && (
                        <div
                          className={
                            "br-score " + (v === "keep" ? "good" : "bad")
                          }
                        >
                          <div className="br-score-pct">{score.pct}%</div>
                          <div className="br-score-lab">
                            {v === "keep"
                              ? t("scorecardPrint.votesMatchedYou")
                              : t("scorecardPrint.incumbentMatch")}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {unreviewed.length > 0 && (
              <div className="ballot-group">
                <div className="gtitle" style={{ color: "var(--ink-3)" }}>
                  {t("scorecard.notYetReviewed")}
                </div>
                {unreviewed.map((s) => (
                  <div className="br" key={s.id}>
                    <div className="bx"></div>
                    <div>
                      <div className="race-name">
                        {s.office} · {s.districtLabel}
                      </div>
                      <div
                        className="pick-name"
                        style={{
                          color: "var(--ink-3)",
                          fontStyle: "italic",
                          fontWeight: 400,
                        }}
                      >
                        {s.nextElection
                          ? t("scorecardPrint.reviewBefore", {
                              label:
                                s.nextElection.label.charAt(0).toLowerCase() +
                                s.nextElection.label.slice(1),
                            })
                          : t("scorecardPrint.reviewBeforeYouVote")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="ballot-group" style={{ marginBottom: 0 }}>
              <div className="gtitle">
                {t("scorecardPrint.judgedAgainstIssues")}
              </div>
              <div
                style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}
              >
                {issues.map((iss, i) => (
                  <div key={iss.canonicalIssue || i}>
                    {i + 1}. {iss.interpretation}{" "}
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        color: "var(--ink-3)",
                      }}
                    >
                      {`(${iss.level === "both" ? t("scorecardPrint.federalPlusState") : iss.level})`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Logistics last (D): where/when to vote sits below the decisions. */}
          <div className="logistics-title">
            {t("scorecardPrint.whereWhenToVote")}
          </div>
          <div className="voter-meta voter-meta-logistics">
            <div className="cell">
              <div className="k">{t("scorecardPrint.address")}</div>
              <div className="v" style={{ fontSize: "12px" }}>
                {address}
              </div>
            </div>
            <div className="cell">
              <div className="k">{t("scorecardPrint.yourDistricts")}</div>
              <div className="v" style={{ fontSize: "12px" }}>
                {districtsLine || "—"}
              </div>
            </div>
            <div className="cell cell-bring">
              <div className="k">{t("scorecardPrint.bringAnyOne")}</div>
              <ul className="v print-id-list">
                {(stateData?.votingRules?.acceptedIds || []).map((id) => (
                  <li key={id}>{id}</li>
                ))}
                {!stateData?.votingRules?.idRequired && (
                  <li>
                    {stateData?.votingRules?.idNote ||
                      t("scorecardPrint.noIdRequired")}
                  </li>
                )}
              </ul>
            </div>
            <div className="cell">
              <div className="k">{t("scorecardPrint.earlyVoting")}</div>
              <div className="v">
                {earlyVoting || t("scorecardPrint.checkStateSite")}
              </div>
            </div>
          </div>

          <footer className="print-foot">
            <div className="l">
              <b>{t("scorecardPrint.builtWith")}</b>
              {t("scorecardPrint.freeNonpartisan")}
            </div>
          </footer>
          <div className="print-serial">
            <span>
              {t("scorecardPrint.generated", {
                datetime: new Date().toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }),
              })}
            </span>
            <span>
              Ref · VC-{Math.random().toString(36).slice(2, 8).toUpperCase()}
            </span>
            <span>{t("scorecardPrint.pageOf")}</span>
          </div>
        </div>
      </div>
    </>
  );
}
