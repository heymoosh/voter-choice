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
import { AppNav, useI18n, escapeHtml } from "../VoterChoiceApp";
import { isSelectableReplacement } from "../../lib/rosterProvenance";

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
  // Honest ballot-details link for the polling disclosure (Fix 2) and the
  // open-seat no-pick note (Fix 5). Neither pollingInfo (PollingInfoVM) nor
  // BallotLogistics carries a per-voter county name or URL — /api/civic's
  // county field is consumed internally by civic-logistics.ts to parse the
  // congressional district and never propagated out — so a real per-county
  // link (e.g. "Harris County ballot details") isn't derivable here without
  // fabricating one. stateData.resources.countyElectionLookup is the one
  // link this view can show without guessing: the state's own directory to
  // every county's election office, always correct regardless of which
  // county the voter is actually in.
  const countyLookupUrl = stateData?.resources?.countyElectionLookup || null;
  const BallotLookupLink = () =>
    countyLookupUrl ? (
      <a href={countyLookupUrl} target="_blank" rel="noopener noreferrer">
        {t("scorecardPrint.stateBallotLookupLink")}
      </a>
    ) : null;
  // Reps not up for election in 2026 are excluded from the printed scorecard —
  // they stay visible (greyed + labeled) in the workspace, but the takeaway
  // sheet is about who's on your 2026 ballot. onBallot2026 === false only;
  // unverified (null) seats are kept (honest-state rule).
  const scorecardSeats = seats.filter(
    (s) => s.nextElection?.onBallot2026 !== false,
  );
  // The excluded seats themselves, shown as an unscored context section
  // below the decisions (canvas: design-handoff/.../screens-scorecard.jsx
  // "Not on your ballot this year" / .dec.notup) — reference only, no
  // keep/replace verdict and no score readout.
  const notOnBallot = seats.filter(
    (s) => s.nextElection?.onBallot2026 === false,
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
  // The reason line under each decision (canvas screens-scorecard.jsx
  // .dec-note, e.g. "Voted with you on 9 of 11 key votes · small-donor
  // funded"). Composed only from fields the scorecard data shape actually
  // carries — a challenger's own issue-alignment % (canvas's "challenger
  // aligns 83% on your issues" clause) isn't computed anywhere upstream of
  // this view (ApiSeatChallenger only has id/name/party/totalReceipts), so
  // that clause is omitted rather than faked.
  const smallDonorFunded = (mix) =>
    !!mix &&
    mix.small != null &&
    mix.small >= (mix.large ?? 0) &&
    mix.small >= (mix.pac ?? 0);
  // Canvas bolds the evidence numbers within the line (.dec-note b) — e.g.
  // "Voted with you on <b>9 of 11</b> key votes". t()'s {vars} aren't
  // HTML-escaped by design (see escapeHtml's doc comment in
  // VoterChoiceApp.tsx), so callers embedding literal tags in the
  // translation string must escape their own interpolated values before
  // rendering the result via dangerouslySetInnerHTML — same contract
  // RepCard.tsx's attendance line and HandoffModal already follow.
  const reasonLine = (s, v, score) => {
    const parts = [];
    if (v === "keep") {
      if (score)
        parts.push(
          t("scorecardPrint.decisionNoteVotes", {
            kept: escapeHtml(score.kept),
            total: escapeHtml(score.total),
          }),
        );
      if (smallDonorFunded(s.candidate?.fundingMix))
        parts.push(t("scorecardPrint.decisionNoteSmallDonor"));
    } else if (v === "replace" && score) {
      parts.push(
        t("scorecardPrint.decisionNoteIncumbentMatch", {
          pct: escapeHtml(score.pct),
        }),
      );
    }
    return parts.join(" · ");
  };

  const todayIso = new Date().toISOString().slice(0, 10);
  const upcoming = (stateData?.elections || []).filter(
    (e) => e.date >= todayIso,
  );
  const nextElection = upcoming[0] || (stateData?.elections || [])[0] || null;
  // "General Election" / "Primary" / etc. — canvas's mast-sub reads "Voter
  // Choice · General Election · Nov 3, 2026"; derive from the real election
  // type instead of hardcoding "General" so a primary/runoff/special stays
  // honest.
  const electionTypeLabel = nextElection
    ? {
        general: t("scorecardPrint.electionGeneral"),
        primary: t("scorecardPrint.electionPrimary"),
        runoff: t("scorecardPrint.electionRunoff"),
        special: t("scorecardPrint.electionSpecial"),
      }[nextElection.type]
    : null;
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
        {/* Frame 10+11 fix 2 (whiteboard line 589) — phones aren't allowed at
            most polling places, so the print/PDF route is the one that
            actually reaches the ballot box. */}
        <p className="print-why-note">{t("scorecardPrint.printWhyNote")}</p>

        <div className="print-sheet">
          {/* canvas screens-scorecard.jsx .pflag — a flag-stripe accent on
              the sheet itself (also used on the home hero's sheet preview,
              never ported to the print route until now). */}
          <div className="pflag" aria-hidden="true">
            <span></span>
            <span></span>
          </div>
          <header className="ph-head">
            <div className="l">
              {t("scorecardPrint.myScorecard")}
              <small>
                {t("scorecardPrint.brand")}
                {electionTypeLabel ? ` · ${electionTypeLabel}` : ""}
                {nextElection ? ` · ${fmtLong(nextElection.date)}` : ""}
              </small>
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
              {pollingInfo?.source === "civic" && (
                <div className="vm-note" style={{ textAlign: "right" }}>
                  {t("scorecardPrint.pollingAutoMatchDisclosure")}
                </div>
              )}
            </div>
          </header>

          {/* Decisions first (D): the per-seat keep/replace verdicts lead the
              sheet; the logistics block (address, districts, where/when to
              vote) follows below. */}
          <div className="ballot-list">
            {/* Umbrella heading (canvas screens-scorecard.jsx
                .sheet-section-lab) — names the sheet's top-level content
                hierarchy with a real count before the per-race groups. */}
            <div className="sheet-section-lab">
              {t(
                scorecardSeats.length === 1
                  ? "scorecardPrint.myDecisionsOne"
                  : "scorecardPrint.myDecisionsOther",
                { n: scorecardSeats.length },
              )}
            </div>
            {Object.entries(sections).map(([section, ss]) => (
              <div className="ballot-group" key={section}>
                <div className="gtitle">{section}</div>
                {ss.map((s) => {
                  const v = verdicts[s.id];
                  // Open seat (v3 §6b.4): the incumbent isn't running, so a
                  // "replace" verdict here isn't a rejection — it's a
                  // first-time pick for a seat with no incumbent. There's no
                  // "keep" option for an open seat, so this only ever
                  // branches off "replace".
                  const isOpenSeat =
                    v === "replace" &&
                    s.candidate?.seekingReelection2026 === false;
                  if (isOpenSeat) {
                    const pick = (s.challengers || []).find(
                      (c) =>
                        c.id === picks?.[s.id] && isSelectableReplacement(c),
                    );
                    return (
                      <div
                        className="br checked verdict-row open-seat"
                        key={s.id}
                      >
                        <div className="bx">→</div>
                        <div className="br-main">
                          <div className="race-name">
                            {s.office} · {s.districtLabel}
                          </div>
                          <div className="pick-name">
                            {pick?.name}
                            <span className="party verdict-print open-seat">
                              {t("scorecardPrint.openSeatPickLabel")}
                            </span>
                          </div>
                          <div className="my-note">
                            {pick ? (
                              t("scorecardPrint.openSeatPickNote")
                            ) : (
                              <>
                                {t("scorecardPrint.openSeatNoPickNote")}{" "}
                                <BallotLookupLink />
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  const score = scoreFor(s);
                  const note = reasonLine(s, v, score);
                  return (
                    <div className={"br checked verdict-row " + v} key={s.id}>
                      {/* Frame 10+11 fix 1 (whiteboard lines 604/683) — the
                          keep box swaps its pseudo-element checkmark for a
                          real, verbatim inline-SVG check so it centers
                          correctly at print size (see redesign2.css's
                          .bx.bx-svg comment). The whiteboard never renders a
                          "replace" print row and ships no SVG asset for its
                          swap-arrow glyph, so that box keeps the existing
                          .bx pseudo-element (already centered there via
                          redesign2.css's position:static override). */}
                      {v === "keep" ? (
                        <div className="bx bx-svg">
                          <svg
                            viewBox="0 0 16 16"
                            width="16"
                            height="16"
                            fill="none"
                          >
                            <path
                              d="M3 8.6l3.3 3.3L13 4.4"
                              stroke="#fff"
                              strokeWidth="2.3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      ) : (
                        <div className="bx"></div>
                      )}
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
                                (c) =>
                                  c.id === picks?.[s.id] &&
                                  isSelectableReplacement(c),
                              );
                              return pick ? (
                                <span className="pick-successor">
                                  {" → "}
                                  {pick.name}
                                </span>
                              ) : null;
                            })()}
                        </div>
                        {note && (
                          <div
                            className="my-note"
                            dangerouslySetInnerHTML={{ __html: note }}
                          />
                        )}
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

            {notOnBallot.length > 0 && (
              <div className="ballot-group">
                <div className="gtitle">
                  {t("scorecardPrint.notOnBallotHeading")}
                </div>
                {notOnBallot.map((s) => (
                  <div className="br notup" key={s.id}>
                    <div className="bx"></div>
                    <div>
                      <div className="race-name">
                        {s.office} · {s.districtLabel}
                      </div>
                      <div className="pick-name">
                        {s.candidate?.name ?? s.blindLabel}{" "}
                        <span className="verdict-print notup">
                          {s.eligibility?.nextLabel ??
                            t("scorecardPrint.notOnBallotLabel")}
                        </span>
                      </div>
                      <div className="my-note">
                        {s.nextElection ? s.nextElection.label + " · " : ""}
                        {t("scorecardPrint.notOnBallotNote")}
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
              {/* Live canvas screens-scorecard.jsx (2026-07-11 Design edit):
                  .sheet-issues > .si-row > (.pill + .si-juris + .si-quote).
                  Pill reads "N · {short label}"; the quote is optional per
                  issue (canvas's own 3rd example has none) — omitted rather
                  than backfilled with the interpretation line, since a
                  missing quote isn't the same claim as a real one. */}
              <div className="sheet-issues">
                {issues.map((iss, i) => {
                  const quote = iss.quotes?.[0]?.text;
                  const levelTag =
                    iss.level === "both"
                      ? t("scorecardPrint.federalPlusState")
                      : iss.level;
                  return (
                    <div className="si-row" key={iss.canonicalIssue || i}>
                      <span className="pill">
                        {i + 1} · {iss.interpretation}
                      </span>
                      <span className="si-juris">{levelTag}</span>
                      {quote && <span className="si-quote">“{quote}”</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Logistics last (D): where/when to vote sits below the decisions. */}
          <div className="logistics-title">
            {t("scorecardPrint.whereWhenToVote")}
          </div>
          <div className="vm-rows">
            {/* The polling row below already shows the matched address once
                civic resolves a real place, so the separate Address row is
                dropped in that case (avoids printing the address twice).
                When civic hasn't resolved anything, this stays the only
                place the voter's entered address appears. */}
            {pollingInfo?.source !== "civic" && (
              <div className="vm-row">
                <div className="k">{t("scorecardPrint.address")}</div>
                <div className="v">{address}</div>
              </div>
            )}
            <div className="vm-row">
              <div className="k">{t("scorecardPrint.pollingPlace")}</div>
              <div className="v">
                {pollingInfo?.source === "civic" ? (
                  <>
                    <b>
                      {pollingInfo.precinct
                        ? t("scorecardPrint.precinct", {
                            n: pollingInfo.precinct,
                          }) + " — "
                        : ""}
                      {pollingInfo.name}
                    </b>
                    {pollingInfo.address ? ` · ${pollingInfo.address}` : ""}
                    {pollingInfo.hours ? ` · ${pollingInfo.hours}` : ""}
                    <div className="vm-note">
                      {t("scorecardPrint.pollingAutoMatchDisclosure")}{" "}
                      <BallotLookupLink />
                    </div>
                  </>
                ) : (
                  pollingInfo?.name || t("scorecardPrint.checkStateSite")
                )}
              </div>
            </div>
            <div className="vm-row">
              <div className="k">{t("scorecardPrint.yourDistricts")}</div>
              <div className="v">{districtsLine || "—"}</div>
            </div>
            <div className="vm-row">
              <div className="k">{t("scorecardPrint.bringAnyOne")}</div>
              <div className="v">
                <ul className="print-id-cols">
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
            </div>
            <div className="vm-row">
              <div className="k">{t("scorecardPrint.earlyVoting")}</div>
              <div className="v">
                {earlyVoting || t("scorecardPrint.checkStateSite")}
              </div>
            </div>
          </div>

          <footer className="print-foot">
            <div className="l">
              <b>{t("scorecardPrint.builtWith")}</b>
              {t("scorecardPrint.freeNonpartisan")} ·{" "}
              {t("scorecardPrint.copyright")}
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
