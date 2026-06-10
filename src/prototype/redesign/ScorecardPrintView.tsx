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
import { AppNav } from "../VoterChoiceApp";

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
  stateData,
  pollingInfo,
  districtsLine,
  onBack,
}) {
  const sections = {};
  seats.forEach((s) => {
    if (!verdicts[s.id]) return;
    (sections[s.section] = sections[s.section] || []).push(s);
  });
  const unreviewed = seats.filter((s) => !verdicts[s.id]);
  const fracFor = (s) => {
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
    return `${kept}/${total} votes matched you`;
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
          <h2>Your printable scorecard</h2>
          <div className="actions">
            <button onClick={onBack}>← Back to scorecard</button>
            <button className="primary" onClick={() => window.print()}>
              Print / save as PDF
            </button>
          </div>
        </div>

        <div className="print-sheet">
          <header className="ph-head">
            <div className="l">
              My Scorecard
              {nextElection ? ` · ${fmtLong(nextElection.date)}` : ""}
              <small>Voter Choice · voterchoice.app</small>
            </div>
            <div className="r">
              {pollingInfo?.precinct && <b>Precinct {pollingInfo.precinct}</b>}
              {pollingInfo?.name}
              <br />
              {pollingInfo?.address && (
                <>
                  {pollingInfo.address}
                  <br />
                </>
              )}
              {pollingInfo?.hours && <>Polls {pollingInfo.hours}</>}
            </div>
          </header>

          <div className="voter-meta">
            <div className="cell">
              <div className="k">Address</div>
              <div className="v" style={{ fontSize: "12px" }}>
                {address}
              </div>
            </div>
            <div className="cell">
              <div className="k">Your districts</div>
              <div className="v" style={{ fontSize: "12px" }}>
                {districtsLine || "—"}
              </div>
            </div>
            <div className="cell cell-bring">
              <div className="k">Bring (any one)</div>
              <ul className="v print-id-list">
                {(stateData?.votingRules?.acceptedIds || []).map((id) => (
                  <li key={id}>{id}</li>
                ))}
                {!stateData?.votingRules?.idRequired && (
                  <li>
                    {stateData?.votingRules?.idNote ||
                      "No ID required for most voters."}
                  </li>
                )}
              </ul>
            </div>
            <div className="cell">
              <div className="k">Early voting</div>
              <div className="v">
                {earlyVoting || "Check your state's site"}
              </div>
            </div>
          </div>

          <div className="ballot-list">
            {Object.entries(sections).map(([section, ss]) => (
              <div className="ballot-group" key={section}>
                <div className="gtitle">{section}</div>
                {ss.map((s) => {
                  const v = verdicts[s.id];
                  const frac = fracFor(s);
                  return (
                    <div className="br checked" key={s.id}>
                      <div className="bx"></div>
                      <div>
                        <div className="race-name">
                          {s.office} · {s.districtLabel}
                        </div>
                        <div className="pick-name">
                          {s.candidate?.name ?? s.blindLabel}
                          <span className={"party verdict-print " + v}>
                            {v === "keep" ? "WORTH KEEPING" : "TIME TO REPLACE"}
                          </span>
                        </div>
                        <div className="my-note">
                          {frac ? frac + " · " : ""}
                          {s.nextElection ? s.nextElection.label : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {unreviewed.length > 0 && (
              <div className="ballot-group">
                <div className="gtitle" style={{ color: "var(--ink-3)" }}>
                  Not yet reviewed
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
                          ? `Review before ${s.nextElection.label.charAt(0).toLowerCase()}${s.nextElection.label.slice(1)}`
                          : "Review before you vote"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="ballot-group" style={{ marginBottom: 0 }}>
              <div className="gtitle">Judged against your issues</div>
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
                      ({iss.level === "both" ? "federal + state" : iss.level})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <footer className="print-foot">
            <div className="l">
              <b>Built with Voter Choice</b>
              Free · non-partisan · voterchoice.app
            </div>
          </footer>
          <div className="print-serial">
            <span>
              Generated{" "}
              {new Date().toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
            <span>
              Ref · VC-{Math.random().toString(36).slice(2, 8).toUpperCase()}
            </span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </div>
    </>
  );
}
