// @ts-nocheck
"use client";
/* Head-to-head candidate duel — the "Time to replace" flow (card 6a1fb1fb).
   PORT of design-handoff/design-session/screens-candidates.jsx → the
   down-selected DIRECTION B (`HeadToHead`), brought onto the app's stylesheet
   pipeline (public/candidates.css) and wired to REAL seat data. Per repo
   policy the design is the source of truth — markup/class names are the
   design's; only the data bindings and the honest empty states are new:

     - REP literal → seat.candidate + seat.alignmentEntry (roll-call) or
       seat.positions/research (researched executive — Phase-1 is Congress, so
       this path is the no-DB-record member fallback, never blended).
     - CHS literal → seat.challengers (2026 FEC filers); per-challenger
       alignment comes from on-demand getChallengerResearch() (web_search,
       cited) — fired when a challenger is first selected, with the design's
       loading / "no record" honest states.
     - The Δ ledger sources both sides from duelAlignment.buildLedger over the
       USER's issues; a side with no record renders "no record" (delta hidden),
       never a fabricated number.
     - Keep / Replace at the foot record the EXISTING verdict; "Replace with X"
       also records X as the seat's successor pick (rides to scorecard/print). */

import React, { useState, useEffect } from "react";
import { formatDollars } from "../VoterChoiceApp";
import { getChallengerResearch, researchChallenger } from "./delegationData";
import { buildLedger, overallAlignment } from "./duelAlignment";

function cdTone(p) {
  return p == null ? "na" : p >= 67 ? "good" : p >= 34 ? "mid" : "bad";
}

/** Provenance badge — the design's unifier (roll-call vs researched). */
function ProvBadge({ basis, conf }) {
  return basis === "roll-call" ? (
    <span className="prov rollcall">Roll-call record</span>
  ) : (
    <span className="prov researched">
      Researched · cited{conf ? " · " + conf : ""}
    </span>
  );
}

const PARTY_PIP = {
  Republican: "rep",
  Democrat: "dem",
  Independent: "ind",
};

function lastName(name) {
  return (name || "").split(" ").filter(Boolean).pop() || name || "";
}
function firstName(name) {
  return (name || "").split(" ").filter(Boolean)[0] || name || "";
}
function initial(name) {
  return (name || "?").trim().charAt(0).toUpperCase() || "?";
}

/* ── the incumbent's record, reduced to the shape the duel reads ── */
function incumbentScores(seat) {
  if (seat.researched) return seat.positions || [];
  return seat.alignmentEntry?.scores || [];
}

export function HeadToHead({
  seat,
  userIssues,
  stateCode,
  verdict,
  pickId,
  onKeep,
  onReplace,
  onClose,
  onShowBudgetOptions,
}) {
  const challengers = seat.challengers || [];
  const [sel, setSel] = useState(
    () =>
      (pickId && challengers.some((c) => c.id === pickId)
        ? pickId
        : challengers[0]?.id) || null,
  );
  // Re-render when an on-demand challenger research promise settles.
  const [, setTick] = useState(0);
  const ch = challengers.find((c) => c.id === sel) || null;

  // On-demand research: fire for the selected challenger if we have no result
  // yet (mirrors ChallengerRow's contract — name goes server-side only).
  useEffect(() => {
    if (!ch) return;
    const existing = getChallengerResearch(ch.id);
    if (!existing) {
      researchChallenger(ch, seat, userIssues, stateCode, () =>
        setTick((t) => t + 1),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  const incScores = incumbentScores(seat);
  const incBasis = seat.researched ? "researched" : "roll-call";
  const incOverall = overallAlignment(incScores);
  const repName = seat.candidate?.name || seat.blindLabel;

  const research = ch ? getChallengerResearch(ch.id) : undefined;
  const chDone = research?.status === "done";
  const chScores = chDone ? research.scores : null;
  const chOverall = overallAlignment(chScores);
  const chConf = chDone
    ? (research.scores.find((s) => s.confidence)?.confidence ?? null)
    : null;
  const chPip = (ch && PARTY_PIP[ch.party]) || "ind";

  const ledger = buildLedger(incScores, chScores, userIssues);

  // Funding contrast — honest: challengers carry only totalReceipts (no mix),
  // so we show the dollar figure and omit any PAC% we don't have.
  const incRaised =
    typeof seat.candidate?.totalRaised === "number"
      ? seat.candidate.totalRaised
      : null;
  const incPac = seat.candidate?.fundingMix?.pac;
  const chRaised =
    ch && typeof ch.totalReceipts === "number" ? ch.totalReceipts : null;

  const repLast = lastName(repName);

  return (
    <div className="cmp-screen" data-palette="white">
      <div className="cmp">
        <div className="flagbar">
          <i></i>
          <i></i>
          <i></i>
        </div>

        <div className="cmp-top">
          <div>
            <button
              className="cmp-back"
              onClick={onClose}
              aria-label="Back to your scorecard"
            >
              ← Back
            </button>
            <h2>Head-to-head</h2>
            <div className="ctx">
              {seat.office} · {seat.districtLabel} · your rep vs. who's running
            </div>
          </div>
          {challengers.length > 0 && (
            <div
              className="cmp-switch"
              role="tablist"
              aria-label="Challengers running for this seat"
            >
              {challengers.map((c) => {
                const r = getChallengerResearch(c.id);
                const o =
                  r?.status === "done" ? overallAlignment(r.scores).pct : null;
                return (
                  <button
                    key={c.id}
                    role="tab"
                    aria-selected={sel === c.id}
                    className={sel === c.id ? "on" : ""}
                    onClick={() => setSel(c.id)}
                  >
                    <span className={"pip " + (PARTY_PIP[c.party] || "ind")} />
                    {lastName(c.name)}
                    {o != null && <span className="p">{o}%</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {challengers.length === 0 ? (
          <div className="cmp-empty">
            <p>
              No one has filed to run against this seat in our 2026 records yet
              — we'd rather say so than invent a challenger. You can still mark
              the seat below.
            </p>
            <div className="cmp-actions">
              <button
                className={"cmp-keepbtn" + (verdict === "keep" ? " on" : "")}
                onClick={onKeep}
              >
                {verdict === "keep" ? "✓ Keeping " : "Keep "}
                {repLast}
              </button>
              <button
                className={
                  "cmp-repbtn ghost" + (verdict === "replace" ? " on" : "")
                }
                onClick={() => onReplace(null)}
              >
                {verdict === "replace"
                  ? "✕ Marked to replace"
                  : "Mark to replace"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="cmp-grid">
              <div className="cmp-col inc">
                <div className="cmp-colhead">
                  <div className="cmp-av">{initial(repName)}</div>
                  <div className="cmp-roleline">
                    <div className="cmp-tag">The record you have</div>
                    <div className="cmp-cname">
                      <span className="pip rep" />
                      {repName}
                    </div>
                    <div className="cmp-crole">
                      {seat.candidate?.priorRole || seat.office}
                    </div>
                  </div>
                </div>
                <div className="cmp-big">
                  {incOverall.pct != null ? (
                    <>
                      <b className={"tone-" + cdTone(incOverall.pct)}>
                        {incOverall.pct}%
                      </b>
                      <span className="lab">
                        {incBasis === "roll-call"
                          ? "voted with you"
                          : "aligns with you"}
                      </span>
                    </>
                  ) : (
                    <span className="lab">No scoreable record yet</span>
                  )}
                </div>
                <div className="cmp-prov-line">
                  <ProvBadge basis={incBasis} />
                </div>
              </div>

              <div className="cmp-col ch">
                <div className="cmp-colhead">
                  <div className="cmp-av">{initial(ch?.name)}</div>
                  <div className="cmp-roleline">
                    <div className="cmp-tag">Running to replace them</div>
                    <div className="cmp-cname">
                      <span className={"pip " + chPip} />
                      {ch?.name}
                    </div>
                    <div className="cmp-crole">
                      {ch?.party || "Party unknown"} · 2026 FEC filer
                    </div>
                  </div>
                </div>
                <div className="cmp-big">
                  {research?.status === "loading" || !research ? (
                    <span className="lab">Looking up public statements…</span>
                  ) : chOverall.pct != null ? (
                    <>
                      <b className={"tone-" + cdTone(chOverall.pct)}>
                        {chOverall.pct}%
                      </b>
                      <span className="lab">aligns with you</span>
                    </>
                  ) : (
                    <span className="lab">
                      No citable record on your issues
                    </span>
                  )}
                </div>
                <div className="cmp-prov-line">
                  {chDone ? (
                    <ProvBadge basis="researched" conf={chConf} />
                  ) : (
                    <span className="prov researched">Researched · cited</span>
                  )}
                </div>
              </div>
            </div>

            <div className="cmp-ledger">
              <div className="cmp-ledgrid">
                <div className="cmp-lrow head">
                  <span>Your rep</span>
                  <span></span>
                  <span style={{ textAlign: "center" }}>On your issues</span>
                  <span></span>
                  <span>{ch ? firstName(ch.name) : "Challenger"}</span>
                </div>
                {ledger.map((row, i) => {
                  const incPct = row.inc?.pct;
                  const chPct = row.ch?.pct;
                  const d = row.delta;
                  return (
                    <div className="cmp-lrow" key={row.canonicalIssue || i}>
                      <span className="cmp-iss-l">
                        {incPct != null ? `${incPct}% · ` : "no record · "}
                        {row.label}
                      </span>
                      <span
                        className={
                          "cmp-v " +
                          (incPct != null
                            ? "tone-" + cdTone(incPct)
                            : "tone-na")
                        }
                      >
                        {incPct != null ? incPct : "—"}
                      </span>
                      <span className="cmp-mid">
                        {d != null ? (
                          <span
                            className={
                              "arrow " +
                              (d > 0 ? "up" : d < 0 ? "down" : "even")
                            }
                          >
                            {d > 0 ? "▲ +" + d : d < 0 ? "▼ " + d : "even"}
                          </span>
                        ) : (
                          <span
                            className="arrow even"
                            title="No comparable record"
                          >
                            —
                          </span>
                        )}
                      </span>
                      <span
                        className={
                          "cmp-v " +
                          (chPct != null ? "tone-" + cdTone(chPct) : "tone-na")
                        }
                      >
                        {research?.status === "loading"
                          ? "…"
                          : chPct != null
                            ? chPct
                            : "—"}
                      </span>
                      <span className="cmp-iss-r">
                        {chPct != null ? `${chPct}% · ` : "no record · "}
                        {row.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              {chDone && (
                <p className="cmp-ledger-note">
                  Challenger figures are a directional read of researched, cited
                  positions — not a vote tally. Your rep's are roll-call votes.
                </p>
              )}
              {research?.status === "unavailable" && (
                <p className="cmp-ledger-note">
                  No citable public statements found for {firstName(ch?.name)}{" "}
                  on your issues yet — we'd rather show the gap than guess.
                </p>
              )}
              {research?.status === "budget_blocked" && (
                <p
                  className="cmp-ledger-note"
                  data-testid="duel-budget-blocked"
                >
                  Live research is paused — the community AI budget for this
                  month is used up.{" "}
                  {onShowBudgetOptions && (
                    <button className="linklike" onClick={onShowBudgetOptions}>
                      More options →
                    </button>
                  )}
                </p>
              )}
            </div>

            <div className="cmp-foot">
              <div className="cmp-fund">
                <div className="blk">
                  <span className="v">
                    {incPac != null
                      ? `${incPac}% PAC`
                      : incRaised != null
                        ? formatDollars(incRaised)
                        : "Funding n/a"}
                  </span>
                  <span className="k">
                    your rep
                    {incRaised != null ? ` · ${formatDollars(incRaised)}` : ""}
                  </span>
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: "11px" }}>
                  vs
                </span>
                <div className="blk">
                  <span className="v">
                    {chRaised != null
                      ? formatDollars(chRaised)
                      : "No funds reported"}
                  </span>
                  <span className="k">
                    {ch ? firstName(ch.name) : "challenger"} · FEC filing
                  </span>
                </div>
              </div>
              <div className="cmp-actions">
                <button
                  className={"cmp-keepbtn" + (verdict === "keep" ? " on" : "")}
                  onClick={onKeep}
                >
                  {verdict === "keep" ? "✓ Keeping " : "Keep "}
                  {repLast}
                </button>
                <button
                  className={
                    "cmp-repbtn" +
                    (verdict === "replace" && pickId === ch?.id ? " on" : "")
                  }
                  onClick={() => onReplace(ch?.id ?? null)}
                  disabled={!ch}
                >
                  {verdict === "replace" && pickId === ch?.id
                    ? "✓ Replacing with "
                    : "Replace with "}
                  {ch ? lastName(ch.name) : ""}{" "}
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
