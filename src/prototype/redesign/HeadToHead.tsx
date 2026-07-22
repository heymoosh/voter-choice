// @ts-nocheck
"use client";
/* Head-to-head candidate duel — the "Time to replace" flow (card 6a1fb1fb).
   PORT of claude-code-handoff/design-session/screens-candidates.jsx → the
   down-selected DIRECTION B (`HeadToHead`), brought onto the app's stylesheet
   pipeline (public/candidates.css) and wired to REAL seat data. Per repo
   policy the design is the source of truth — markup/class names are the
   design's; only the data bindings and the honest empty states are new:

     - REP literal → seat.candidate + seat.alignmentEntry (roll-call) or
       seat.positions/research (researched executive — Phase-1 is Congress, so
       this path is the no-DB-record member fallback, never blended).
     - CHS literal → seat.challengers after verified ballot-roster filtering;
       per-challenger alignment comes from on-demand getChallengerResearch()
       (web_search, cited) — fired when a challenger is first selected, with
       the design's loading / "no record" honest states. FEC filing data stays
       separate as campaign-finance evidence.
     - The Δ ledger sources both sides from duelAlignment.buildLedger over the
       USER's issues; a side with no record renders "no record" (delta hidden),
       never a fabricated number.
     - Keep / Replace at the foot record the EXISTING verdict; "Replace with X"
       also records X as the seat's successor pick (rides to scorecard/print). */

import React, { useState, useEffect } from "react";
import { formatDollars, useI18n } from "../VoterChoiceApp";
import { getChallengerResearch, researchChallenger } from "./delegationData";
import { buildLedger, overallAlignment } from "./duelAlignment";
import { MoneyGapScale } from "./MoneyGap";
import { isSelectableReplacement } from "../../lib/rosterProvenance";

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

/** Top named-industry labels from donorCoalition — mirrors
 * RepCard.tsx's topFundingIndustries, same small per-screen helper,
 * duplicated locally per this repo's convention (see RepCard.tsx's
 * ProvBadge comment). */
function topFundingIndustries(donorCoalition, limit = 3) {
  return (donorCoalition || [])
    .filter((s) => s && !s.isIssuePAC && s.label)
    .slice(0, limit)
    .map((s) => s.label);
}

/** Whole-field money-gap rows — verified roster candidates with real FEC
 * finance totals, highest first. Honest-data: a challenger with no
 * total_receipts row is omitted, never fabricated as $0. Mirrors RepCard.tsx's
 * moneyGapField mapping (that card is dropping these rows — the full field now
 * lives here). */
function buildMoneyGapField(challengers, t) {
  return (challengers || [])
    .filter((c) => typeof c.totalReceipts === "number" && c.totalReceipts > 0)
    .sort((a, b) => b.totalReceipts - a.totalReceipts)
    .map((c) => ({
      name: c.name,
      raised: c.totalReceipts,
      pip: PARTY_PIP[c.party] || "ind",
      tag: t("repCard.challengerTag", {
        party: c.party || t("repCard.partyUnknown"),
      }),
    }));
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
  const { t } = useI18n();
  const cand = seat.candidate;
  const challengers = (seat.challengers || []).filter((c) =>
    isSelectableReplacement(c),
  );
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
  const incPip = PARTY_PIP[seat.partyName] || "ind";

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
  const incIndustries = topFundingIndustries(cand?.donorCoalition);
  const moneyGapField = buildMoneyGapField(challengers, t);

  // Explicit seat statement (Muxin: "I cannot tell if this is even
  // accurate... are they running for the same seats?") — names the office,
  // district, and next election in one line. Honest fallback when the
  // election date isn't resolved (should not happen once a duel is
  // reachable, since not-up seats never expose the duel CTA).
  const seatWhen = seat.nextElection?.onBallot2026
    ? seat.nextElection.label
    : null;

  const repLast = lastName(repName);
  // Open seat (v3 §6b): the incumbent isn't seeking re-election — "replace
  // {incumbent}" is the wrong frame (nobody's being rejected). Copy-only
  // swap; the verdict/pick storage underneath is completely unchanged.
  const openSeat = cand?.seekingReelection2026 === false;

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
            <h2>
              {openSeat ? "Who should hold this open seat?" : "Head-to-head"}
            </h2>
            <div className="ctx">
              {seatWhen
                ? t("headToHead.seatStatement", {
                    office: seat.office,
                    district: seat.districtLabel,
                    when: seatWhen,
                  })
                : t("headToHead.seatStatementPlain", {
                    office: seat.office,
                    district: seat.districtLabel,
                  })}
            </div>
          </div>
          {/* Lineup — the incumbent is PINNED (not selectable, not
              dismissable): it's the fixed comparison anchor, never just
              one more chip in the challenger row (Muxin: "What happened
              to him?"). Challenger chips stay selectable as today. */}
          <div className="cmp-lineup">
            <span
              className="cmp-chip-pinned"
              aria-label={
                incOverall.pct != null
                  ? t("headToHead.yourRepPinnedAria", {
                      name: repName,
                      pct: incOverall.pct,
                    })
                  : t("headToHead.yourRepPinnedAriaNoScore", { name: repName })
              }
            >
              <span className={"pip " + incPip} aria-hidden="true" />
              <span className="lab">{t("headToHead.yourRepPinned")}</span>
              {repName}
              {incOverall.pct != null && (
                <span className="p">{incOverall.pct}%</span>
              )}
            </span>
            {challengers.length > 0 && (
              <div
                className="cmp-switch"
                role="tablist"
                aria-label="Challengers running for this seat"
              >
                {challengers.map((c) => {
                  const r = getChallengerResearch(c.id);
                  const o =
                    r?.status === "done"
                      ? overallAlignment(r.scores).pct
                      : null;
                  return (
                    <button
                      key={c.id}
                      role="tab"
                      aria-selected={sel === c.id}
                      className={sel === c.id ? "on" : ""}
                      onClick={() => setSel(c.id)}
                    >
                      <span
                        className={"pip " + (PARTY_PIP[c.party] || "ind")}
                      />
                      {lastName(c.name)}
                      {o != null && <span className="p">{o}%</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {challengers.length === 0 ? (
          <div className="cmp-empty">
            <p>
              No verified replacement roster yet. FEC campaign-finance filings
              are not ballot roster proof, so we won&apos;t present those filers
              as selectable replacements.
            </p>
            <div className="cmp-actions">
              {!openSeat && (
                <button
                  className={"cmp-keepbtn" + (verdict === "keep" ? " on" : "")}
                  onClick={onKeep}
                >
                  {verdict === "keep" ? "✓ Keeping " : "Keep "}
                  {repLast}
                </button>
              )}
              <button
                className={
                  "cmp-repbtn ghost" + (verdict === "replace" ? " on" : "")
                }
                onClick={() => onReplace(null)}
              >
                {openSeat
                  ? verdict === "replace"
                    ? "✓ Marked — I'll choose from my ballot"
                    : "I'll choose from my ballot"
                  : verdict === "replace"
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
                      <span className={"pip " + incPip} />
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
                      {ch?.party || "Party unknown"} ·{" "}
                      {t("headToHead.challengerProvenance")}
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

            {/* Funding comparison — Muxin: "THIS is the place we should
                have shown the whole funding breakdown." Side-by-side mix
                bars + PAC% + top industries for the incumbent, dollar
                total + FEC-filing source for the selected challenger.
                Honest-data: a challenger only ever carries totalReceipts
                (no mix/sectors) — render what exists, never fabricate. */}
            {(incRaised != null || cand?.fundingMix || chRaised != null) && (
              <div className="cmp-money">
                <div className="cmp-money-head">
                  {t("headToHead.moneySectionTitle")}
                </div>
                <div className="cmp-money-grid">
                  <div className="cmp-money-col inc">
                    <div className="cmp-money-name">{repName}</div>
                    {cand?.fundingMix && (
                      <span
                        className="cmp-money-bars"
                        role="img"
                        aria-label="Funding by source type"
                      >
                        <i
                          className="small"
                          style={{ width: cand.fundingMix.small + "%" }}
                        />
                        <i
                          className="large"
                          style={{ width: cand.fundingMix.large + "%" }}
                        />
                        <i
                          className="pac"
                          style={{ width: cand.fundingMix.pac + "%" }}
                        />
                      </span>
                    )}
                    {incRaised != null || incPac != null ? (
                      <div className="cmp-money-stats">
                        {incRaised != null && (
                          <span className="cmp-money-tot">
                            {formatDollars(incRaised)}
                          </span>
                        )}
                        {incPac != null && (
                          <span className="cmp-money-pac">
                            {t("headToHead.moneyPacPct", { pct: incPac })}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="cmp-money-none">
                        {t("headToHead.moneyUnavailable")}
                      </div>
                    )}
                    {incIndustries.length > 0 && (
                      <div className="cmp-money-inds">
                        {t("repCard.moneyTopIndustries", {
                          industries: incIndustries.join(", "),
                        })}
                      </div>
                    )}
                    {cand?.donorSource?.name && (
                      <div className="cmp-money-src">
                        {cand.donorSource.name}
                      </div>
                    )}
                  </div>

                  <div className="cmp-money-col ch">
                    <div className="cmp-money-name">
                      {ch ? ch.name : "Challenger"}
                    </div>
                    {chRaised != null ? (
                      <div className="cmp-money-stats">
                        <span className="cmp-money-tot">
                          {formatDollars(chRaised)}
                        </span>
                      </div>
                    ) : (
                      <div className="cmp-money-none">
                        {t("repCard.noFundsReported")}
                      </div>
                    )}
                    <div className="cmp-money-src">
                      {t("headToHead.financeEvidenceFec")}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Whole-field scale — verified roster candidates with separate
                campaign-finance totals, not just the one selected above
                (relocated from RepCard, which now only shows
                subject-vs-median for the incumbent alone). */}
            {cand?.peerComparison != null &&
              typeof cand.totalRaised === "number" && (
                <div className="cmp-field">
                  <div className="cmp-field-head">
                    {t("headToHead.fieldSectionTitle")}
                  </div>
                  <MoneyGapScale
                    subject={{
                      name: repName,
                      raised: cand.totalRaised,
                      pip: incPip,
                    }}
                    field={moneyGapField}
                    peer={cand.peerComparison}
                  />
                </div>
              )}

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
                {!openSeat && (
                  <button
                    className={
                      "cmp-keepbtn" + (verdict === "keep" ? " on" : "")
                    }
                    onClick={onKeep}
                  >
                    {verdict === "keep" ? "✓ Keeping " : "Keep "}
                    {repLast}
                  </button>
                )}
                <button
                  className={
                    "cmp-repbtn" +
                    (verdict === "replace" && pickId === ch?.id ? " on" : "")
                  }
                  onClick={() => onReplace(ch?.id ?? null)}
                  disabled={!ch}
                >
                  {verdict === "replace" && pickId === ch?.id
                    ? "✓ Picked "
                    : openSeat
                      ? "Pick "
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
