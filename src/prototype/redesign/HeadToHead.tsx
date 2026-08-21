// @ts-nocheck
"use client";
/* Head-to-head candidate duel — the "Time to replace" flow (card 6a1fb1fb),
   rebuilt onto the whiteboard's BLIND `.dl-*` markup (work order v4, Frame 5
   "Head-to-head goes BLIND" + Frame 6 challenger empty states + Frame 7's
   shared FundingSources embed). Per repo policy the design is the source of
   truth — markup/class names are the whiteboard's; only data bindings and
   honest empty states are new. This replaces the old `.cmp-*` markup (still
   in public/candidates.css until this lands, see that file's BAND C comment).

   Blind contract (same shape RepCard/DelegationWorkspace already use):
     - `blindMode` — whether the app is in blind mode at all.
     - `revealed: Set<string>` — the SAME set App2 already threads into every
       RepCard, keyed by seat.id for the incumbent (so revealing the rep on
       the card also reveals them here, and vice versa — "the incumbent uses
       the seat's existing reveal state"). Each challenger gets its own key,
       `challengerRevealKey(seat.id, challenger.id)`, in that SAME set — no
       new parent state needed, just pass the existing (blindMode, revealed,
       reveal) through to this component's (blindMode, revealed, onReveal).
     - `onReveal(id)` — same setter App2 already has (`reveal = (id) =>
       setRevealed(p => new Set([...p, id]))`); works unchanged for either
       key shape.
     - Aliases ("This seat's incumbent" / "Candidate A/B/C…") are DISPLAY
       ONLY — every handler below (onKeep/onReplace) still receives the
       real challenger id, so picking while blind records the real pick;
       only the printed/rendered text is aliased.

   Money section (Frame 7): both columns render the UNMODIFIED FundingSources
   component the seat card uses — no bespoke money grid here anymore. A
   challenger only ever carries `totalReceipts` today (no donorCoalition/
   fundingMix — see GAPS-AND-DATA-AUDIT.md §D7), so FundingSources naturally
   renders nothing for them yet; the honest fallback (dollar total + "PACs ·
   not yet traced", or Frame 6's no-FEC-match empty state) covers that gap
   until a challenger-committee crosswalk lands — at which point this file
   needs no changes, FundingSources just starts rendering the real breakdown. */

import React, { useState, useEffect } from "react";
import { formatDollars, useI18n } from "../VoterChoiceApp";
import {
  getChallengerResearch,
  researchChallenger,
  deriveMoneyInfluence,
  deriveVoteLinkage,
} from "./delegationData";
import { buildLedger, overallAlignment } from "./duelAlignment";
import { MoneyGapScale } from "./MoneyGap";
import { FundingSources } from "./FundingSources";
import { MoneyVerdict } from "./MoneyVerdict";
import { isSelectableReplacement } from "../../lib/rosterProvenance";
import { anonymizeText } from "../../lib/anonymizeText";

function cdTone(p) {
  return p == null ? "na" : p >= 67 ? "good" : p >= 34 ? "mid" : "bad";
}

/** `.dl-prov` badge — roll-call vs researched, the whiteboard's unifier
 *  (verbatim `prov-b roll` / `prov-b res` classes). Confidence is appended
 *  only for a researched read that has one (challengers always do once
 *  research completes; an executive incumbent's researched fallback may).
 *  Reuses RepCard's own provRollcall/provResearched keys — same badge
 *  copy, same wording contract either surface. */
function provLabel(basis, conf, t) {
  if (basis === "roll-call")
    return { cls: "roll", text: t("repCard.provRollcall") };
  return {
    cls: "res",
    text: t("repCard.provResearched") + (conf ? " · " + conf : ""),
  };
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

/** Challenger alias by roster position — "Candidate A/B/C…", stable across
 *  renders because it's a pure function of the (stable) filtered challenger
 *  array's index, not of selection or research state. */
function challengerAliasLetter(index) {
  return String.fromCharCode(65 + index);
}
function challengerAlias(index) {
  return "Candidate " + challengerAliasLetter(index);
}

/** Composite reveal-set key for a challenger — lives in the SAME Set the
 *  parent already keys the incumbent by seat.id (see file header). */
function challengerRevealKey(seatId, challengerId) {
  return seatId + "::challenger::" + challengerId;
}

/* ── the incumbent's record, reduced to the shape the duel reads ── */
function incumbentScores(seat) {
  if (seat.researched) return seat.positions || [];
  return seat.alignmentEntry?.scores || [];
}

/** Deduped, name-free-safe evidence list across a candidate's scores — the
 *  source links Frame 5 item 5 locks behind `.dl-lock` while blind. */
function collectEvidence(scores) {
  const seen = new Set();
  const out = [];
  for (const s of scores || []) {
    for (const e of s?.evidence || []) {
      if (e?.url && !seen.has(e.url)) {
        seen.add(e.url);
        out.push(e);
      }
    }
  }
  return out;
}

/** Whole-field money-gap rows — verified roster candidates with real FEC
 * finance totals, highest first. Honest-data: a challenger with no
 * total_receipts row is omitted, never fabricated as $0. Mirrors RepCard.tsx's
 * moneyGapField mapping (that card is dropping these rows — the full field now
 * lives here). MoneyGapScale renders whatever name/pip/tag it's given
 * (including into each row's aria-label), so blind-safety for this whole-field
 * scale is entirely a data-layer concern here: alias index comes from the
 * SAME roster-ordered `challengers` array the tabs use (not this function's
 * own totalReceipts sort order), and `tag` drops the party word while blind
 * (the un-hidden `.mgap-tag` text would otherwise leak party even with the
 * pip dashed and the name aliased). */
function buildMoneyGapField(challengers, t, seatId, blindMode, revealed) {
  return (challengers || [])
    .filter((c) => typeof c.totalReceipts === "number" && c.totalReceipts > 0)
    .map((c) => {
      const idx = challengers.findIndex((x) => x.id === c.id);
      const blind =
        !!blindMode && !revealed.has(challengerRevealKey(seatId, c.id));
      return {
        name: blind ? challengerAlias(idx) : c.name,
        raised: c.totalReceipts,
        pip: blind ? "hid" : PARTY_PIP[c.party] || "ind",
        // Party-free while blind — the un-hidden `.mgap-tag` text would
        // otherwise leak party even with the pip dashed and the name aliased.
        tag: blind
          ? t("headToHead.challengerFallback")
          : t("repCard.challengerTag", {
              party: c.party || t("repCard.partyUnknown"),
            }),
      };
    })
    .sort((a, b) => b.raised - a.raised);
}

const EMPTY_REVEALED = new Set();

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
  blindMode = false,
  revealed = EMPTY_REVEALED,
  onReveal = () => {},
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
  const chIndex = ch ? challengers.findIndex((c) => c.id === ch.id) : -1;
  const chAlias = chIndex >= 0 ? challengerAlias(chIndex) : "";
  const chRevealKey = ch ? challengerRevealKey(seat.id, ch.id) : null;

  const incBlind = !!blindMode && !revealed.has(seat.id);
  const chBlind = !!blindMode && !!chRevealKey && !revealed.has(chRevealKey);
  // Whether the blind-mode chrome (blindbar, per-column reveal buttons) has
  // anything left to say — a stale "vet everyone first" banner once every
  // side is already revealed would be dishonest chrome, not a design gap.
  const anyBlindLeft =
    blindMode &&
    (incBlind ||
      challengers.some(
        (c) => !revealed.has(challengerRevealKey(seat.id, c.id)),
      ));

  function fireResearch() {
    if (!ch) return;
    researchChallenger(ch, seat, userIssues, stateCode, () =>
      setTick((n) => n + 1),
    );
  }

  // On-demand research: fire for the selected challenger if we have no result
  // yet (mirrors ChallengerRow's contract — name goes server-side only).
  useEffect(() => {
    if (!ch) return;
    const existing = getChallengerResearch(ch.id);
    if (!existing) fireResearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  const incScores = incumbentScores(seat);
  const incBasis = seat.researched ? "researched" : "roll-call";
  const incOverall = overallAlignment(incScores);
  const repName = seat.candidate?.name || seat.blindLabel;
  const incPip = PARTY_PIP[seat.partyName] || "ind";
  const incDisplayName = incBlind ? t("repCard.blindSeatIncumbent") : repName;
  const incEvidence =
    incBasis === "researched" ? collectEvidence(incScores) : [];
  const incProv = provLabel(incBasis, null, t);

  const research = ch ? getChallengerResearch(ch.id) : undefined;
  const chDone = research?.status === "done";
  const chScores = chDone ? research.scores : null;
  const chOverall = overallAlignment(chScores);
  const chConf = chDone
    ? (research.scores.find((s) => s.confidence)?.confidence ?? null)
    : null;
  const chPip = (ch && PARTY_PIP[ch.party]) || "ind";
  const chDisplayName = ch ? (chBlind ? chAlias : ch.name) : "";
  const chEvidence = chDone ? collectEvidence(chScores) : [];
  const chProv = provLabel("researched", chConf, t);

  const ledger = buildLedger(incScores, chScores, userIssues);

  // Funding — honest: challengers carry only totalReceipts today (no mix/
  // coalition), so the money column below degrades per Frame 6 state 4 /
  // GAPS §D7 until a challenger-committee crosswalk lands.
  const incRaised =
    typeof seat.candidate?.totalRaised === "number"
      ? seat.candidate.totalRaised
      : null;
  const incPac = seat.candidate?.fundingMix?.pac;
  const chRaised =
    ch && typeof ch.totalReceipts === "number" ? ch.totalReceipts : null;
  const moneyGapField = buildMoneyGapField(
    challengers,
    t,
    seat.id,
    blindMode,
    revealed,
  );
  const incVoteLinkage = deriveVoteLinkage(seat);
  const incMoneyInfluence = deriveMoneyInfluence(seat, userIssues);
  const chVoteLinkage = ch
    ? deriveVoteLinkage({
        candidate: {
          donorCoalition: ch.donorCoalition ?? null,
          fundingMix: ch.fundingMix ?? null,
        },
        alignmentEntry: { scores: chScores },
      })
    : new Map();
  const chMoneyInfluence = ch
    ? deriveMoneyInfluence(
        {
          candidate: { donorCoalition: ch.donorCoalition ?? null },
          alignmentEntry: { scores: chScores },
        },
        userIssues,
      )
    : null;
  // Same guard FundingSources uses internally (donorCoalition + fundingMix +
  // a positive total) — computed locally so the fallback below only shows
  // when FundingSources would otherwise render nothing for this challenger.
  const chHasFullBreakdown = !!(
    ch?.donorCoalition &&
    ch?.fundingMix &&
    typeof chRaised === "number" &&
    chRaised > 0
  );

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
    <div className="delegation">
      <div className="ws-wrap">
        <section className="ws-chat rep-center">
          <div className="flagbar">
            <i></i>
            <i></i>
            <i></i>
          </div>
          <div className="dl">
            <button className="dl-back" onClick={onClose}>
              {t("headToHead.backToScorecard")}
            </button>
            <h2>
              {openSeat ? t("headToHead.openSeatTitle") : t("headToHead.title")}
            </h2>
            <div className="dl-ctx">
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

            {challengers.length === 0 ? (
              <>
                <div className="dl-empty" style={{ marginTop: 16 }}>
                  <div className="k">{t("headToHead.emptyNoRosterKicker")}</div>
                  <div className="t">{t("headToHead.emptyNoRosterTitle")}</div>
                  <div className="s">
                    {t("headToHead.emptyNoRosterSentence")}
                  </div>
                </div>
                <div className="dl-foot">
                  {!openSeat && (
                    <button className="btn btn-keep" onClick={onKeep}>
                      <b>
                        <span className="box" aria-hidden="true" />
                        {verdict === "keep"
                          ? t("headToHead.keepingConfirmed")
                          : t("repCard.worthKeeping")}
                      </b>
                      <small>
                        {t("headToHead.keepButtonSub", { name: repLast })}
                      </small>
                    </button>
                  )}
                  <button
                    className="btn btn-replace"
                    onClick={() => onReplace(null)}
                  >
                    <b>
                      {openSeat
                        ? verdict === "replace"
                          ? t("headToHead.markedOpenSeat")
                          : t("repCard.openSeatMarkChoose")
                        : verdict === "replace"
                          ? t("headToHead.markedToReplace")
                          : t("headToHead.markToReplace")}
                    </b>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="dl-lineup">
                  <span className="dl-pin">
                    <span
                      className={"pip " + (incBlind ? "hid" : incPip)}
                      aria-hidden="true"
                    />
                    <span className="lab">{t("headToHead.pinLabel")}</span>
                    {incDisplayName}
                    {incOverall.pct != null && (
                      <span className="p">{incOverall.pct}%</span>
                    )}
                  </span>
                  <div className="dl-tabs" role="tablist">
                    {challengers.map((c, i) => {
                      const cBlind =
                        !!blindMode &&
                        !revealed.has(challengerRevealKey(seat.id, c.id));
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
                            className={
                              "pip " +
                              (cBlind ? "hid" : PARTY_PIP[c.party] || "ind")
                            }
                          />
                          {cBlind ? challengerAlias(i) : lastName(c.name)}
                          {o != null && <span className="p">{o}%</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {anyBlindLeft && (
                  <div className="dl-blindbar">
                    <svg
                      className="eye"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: t("headToHead.blindbarBody"),
                      }}
                    />
                  </div>
                )}

                <div className="dl-grid">
                  <div className="dl-col">
                    <div className="dl-colhead">
                      <div className="dl-av">
                        {incBlind ? "?" : initial(repName)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="dl-tag">
                          {t("headToHead.tagIncumbentRecord")}
                        </div>
                        <div className="dl-cname">
                          <span
                            className={"pip " + (incBlind ? "hid" : incPip)}
                          />
                          {incDisplayName}
                        </div>
                        <div className="dl-crole">
                          {incBasis === "roll-call"
                            ? t("headToHead.incumbentRoleRollcall")
                            : t("headToHead.incumbentRoleResearched")}
                        </div>
                      </div>
                      {incBlind && (
                        <button
                          className="dl-reveal"
                          onClick={() => onReveal(seat.id)}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="14"
                            height="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                          {t("headToHead.revealButton")}
                        </button>
                      )}
                    </div>
                    <div className="dl-big">
                      {incOverall.pct != null ? (
                        <>
                          <b className={"tone-" + cdTone(incOverall.pct)}>
                            {incOverall.pct}%
                          </b>
                          <span className="lab">
                            {t(
                              incBasis === "roll-call"
                                ? "headToHead.bigLabelRollcall"
                                : "headToHead.bigLabelResearched",
                              { n: userIssues.length },
                            )}
                          </span>
                        </>
                      ) : (
                        <span className="lab">
                          {t("headToHead.noScoreableRecord")}
                        </span>
                      )}
                    </div>
                    <div className="dl-prov">
                      <span className={"prov-b " + incProv.cls}>
                        {incProv.text}
                      </span>
                      {incBasis === "researched" && incEvidence.length > 0 && (
                        <IncumbentSources
                          blind={incBlind}
                          evidence={incEvidence}
                          realLastName={repLast}
                          alias={t("repCard.blindSeatIncumbent")}
                        />
                      )}
                    </div>
                  </div>

                  <div className="dl-col">
                    <div className="dl-colhead">
                      <div className="dl-av">
                        {chBlind
                          ? challengerAliasLetter(chIndex)
                          : initial(ch?.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="dl-tag">
                          {t("headToHead.tagChallenger")}
                        </div>
                        <div className="dl-cname">
                          <span
                            className={"pip " + (chBlind ? "hid" : chPip)}
                          />
                          {chDisplayName}
                        </div>
                        <div className="dl-crole">
                          {chBlind
                            ? t("headToHead.challengerRoleBlind")
                            : `${ch?.party || t("repCard.partyUnknown")} · ${t("headToHead.challengerProvenance")}`}
                        </div>
                      </div>
                      {chBlind && (
                        <button
                          className="dl-reveal"
                          onClick={() => onReveal(chRevealKey)}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="14"
                            height="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                          {t("headToHead.revealButton")}
                        </button>
                      )}
                    </div>
                    <div className="dl-big">
                      {research?.status === "loading" || !research ? (
                        <span className="lab">
                          {t("repCard.lookingUpStatements")}
                        </span>
                      ) : chOverall.pct != null ? (
                        <>
                          <b className={"tone-" + cdTone(chOverall.pct)}>
                            {chOverall.pct}%
                          </b>
                          <span className="lab">
                            {t("headToHead.bigLabelResearched", {
                              n: userIssues.length,
                            })}
                          </span>
                        </>
                      ) : (
                        <span className="lab">
                          {t("headToHead.noCitableRecord")}
                        </span>
                      )}
                    </div>
                    <div className="dl-prov">
                      <span className={"prov-b " + chProv.cls}>
                        {chProv.text}
                      </span>
                      {chDone && chEvidence.length > 0 && (
                        <ChallengerSources
                          blind={chBlind}
                          evidence={chEvidence}
                          realLastName={lastName(ch?.name)}
                          alias={chAlias}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Frame 6 state 1 — always true for every challenger, so it
                    always renders here, independent of research status. */}
                <div className="dl-empty" style={{ marginTop: 14 }}>
                  <div className="k">{t("headToHead.emptyNoOfficeKicker")}</div>
                  <div className="t">{t("headToHead.emptyNoOfficeTitle")}</div>
                  <div
                    className="s"
                    dangerouslySetInnerHTML={{
                      __html: t("headToHead.emptyNoOfficeSentence"),
                    }}
                  />
                </div>

                {research?.status === "unavailable" && (
                  <div
                    className="dl-empty"
                    style={{ marginTop: 12 }}
                    data-testid="duel-research-unavailable"
                  >
                    <div className="k">
                      {t("headToHead.emptyResearchUnavailableKicker")}
                    </div>
                    <div className="t">
                      {t("headToHead.emptyResearchUnavailableTitle", {
                        n: userIssues.length,
                      })}
                    </div>
                    <div className="s">
                      {t("headToHead.emptyResearchUnavailableSentencePrefix")}{" "}
                      <button
                        type="button"
                        className="linklike"
                        onClick={fireResearch}
                      >
                        {t("headToHead.checkAgainLink")}
                      </button>{" "}
                      {t("headToHead.emptyResearchUnavailableSentenceSuffix")}
                    </div>
                  </div>
                )}

                {research?.status === "budget_blocked" && (
                  <div
                    className="dl-empty"
                    style={{ marginTop: 12 }}
                    data-testid="duel-budget-blocked"
                  >
                    <div className="k">
                      {t("headToHead.emptyBudgetPausedKicker")}
                    </div>
                    <div className="t">
                      {t("headToHead.emptyBudgetPausedTitle")}
                    </div>
                    <div className="s">
                      {t("headToHead.emptyBudgetPausedSentence")}{" "}
                      {onShowBudgetOptions && (
                        <button
                          type="button"
                          className="linklike"
                          onClick={() => onShowBudgetOptions(research.upstream)}
                        >
                          {t("repCard.moreOptions")}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="dl-ledger">
                  <div className="dl-lrow">
                    <span style={{ textAlign: "right" }}>
                      {incBlind
                        ? t("headToHead.ledgerIncumbentBlindLabel")
                        : repName}
                    </span>
                    <span></span>
                    <span style={{ textAlign: "center" }}>
                      {t("headToHead.ledgerOnYourIssues")}
                    </span>
                    <span></span>
                    <span>
                      {chBlind
                        ? chAlias
                        : firstName(ch?.name) ||
                          t("headToHead.challengerFallback")}
                    </span>
                  </div>
                  {ledger.map((row, i) => {
                    const incPct = row.inc?.pct;
                    const chPct = row.ch?.pct;
                    const d = row.delta;
                    return (
                      <div className="dl-lrow" key={row.canonicalIssue || i}>
                        <span className="l">
                          {incPct != null
                            ? `${incPct}% · `
                            : t("headToHead.noRecordPrefix")}
                          {row.label}
                        </span>
                        <span
                          className={
                            "dl-v " +
                            (incPct != null
                              ? "tone-" + cdTone(incPct)
                              : "tone-na")
                          }
                        >
                          {incPct != null ? incPct : "—"}
                        </span>
                        <span className="dl-mid">
                          {d != null ? (
                            <span
                              className={
                                "arrow " +
                                (d > 0 ? "up" : d < 0 ? "down" : "even")
                              }
                            >
                              {d > 0
                                ? "▲ +" + d
                                : d < 0
                                  ? "▼ " + d
                                  : t("headToHead.deltaEven")}
                            </span>
                          ) : (
                            <span
                              className="arrow even"
                              title={t("headToHead.noComparableRecordTitle")}
                            >
                              —
                            </span>
                          )}
                        </span>
                        <span
                          className={
                            "dl-v " +
                            (chPct != null
                              ? "tone-" + cdTone(chPct)
                              : "tone-na")
                          }
                        >
                          {research?.status === "loading"
                            ? "…"
                            : chPct != null
                              ? chPct
                              : "—"}
                        </span>
                        <span className="r">
                          {chPct != null
                            ? `${chPct}% · ${researchedVerbPhrase(chPct, t)}`
                            : t("headToHead.noRecordPrefix") + row.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="dl-note">
                  {t("headToHead.ledgerNote")}
                  {anyBlindLeft && t("headToHead.ledgerNoteBlindSuffix")}
                </p>

                {(incRaised != null ||
                  cand?.fundingMix ||
                  chRaised != null) && (
                  <div className="dl-money">
                    <div className="dl-money-h">
                      {t("headToHead.moneyHeading")}
                    </div>
                    <div className="dl-money-sub">
                      {t("headToHead.moneySub")}
                    </div>
                    <div className="dl-money-grid">
                      <div>
                        <div className="dl-mhead">
                          <span className="mav">
                            {incBlind ? "?" : initial(repName)}
                          </span>
                          <div>
                            <b>{incDisplayName}</b>
                            <span className="sub">
                              {incRaised != null
                                ? `${formatDollars(incRaised)} raised`
                                : t("headToHead.fundingNA")}
                              {incPac != null
                                ? t("headToHead.pacMoneySuffix", {
                                    pct: incPac,
                                  })
                                : ""}
                            </span>
                          </div>
                        </div>
                        {incMoneyInfluence ? (
                          <MoneyVerdict influence={incMoneyInfluence} />
                        ) : (
                          <p className="dl-note">
                            {t("headToHead.incumbentNoMoneyLinkage")}
                          </p>
                        )}
                        <FundingSources
                          donorCoalition={cand?.donorCoalition}
                          totalRaised={incRaised}
                          fundingMix={cand?.fundingMix}
                          userIssues={userIssues}
                          voteLinkage={incVoteLinkage}
                        />
                      </div>
                      <div>
                        <div className="dl-mhead">
                          <span className="mav">
                            {chBlind
                              ? challengerAliasLetter(chIndex)
                              : initial(ch?.name)}
                          </span>
                          <div>
                            <b>{chDisplayName}</b>
                            <span className="sub">
                              {chRaised != null
                                ? `${formatDollars(chRaised)} raised`
                                : ""}
                            </span>
                          </div>
                        </div>
                        {chMoneyInfluence ? (
                          <MoneyVerdict influence={chMoneyInfluence} />
                        ) : (
                          <p className="dl-note">
                            {t("headToHead.challengerNoMoneyLinkage", {
                              name: chDisplayName,
                            })}
                          </p>
                        )}
                        {chHasFullBreakdown ? (
                          <FundingSources
                            donorCoalition={ch.donorCoalition}
                            totalRaised={chRaised}
                            fundingMix={ch.fundingMix}
                            userIssues={userIssues}
                            voteLinkage={chVoteLinkage}
                            noRollCallRecord
                          />
                        ) : chRaised != null ? (
                          <div className="srcs" style={{ marginTop: 8 }}>
                            <div className="src" style={{ padding: "10px 0" }}>
                              <span
                                className="src-dot d-unknown"
                                aria-hidden="true"
                              />
                              <span className="src-name">
                                {t("headToHead.pacsUntraced")}
                              </span>
                              <span className="src-amt">
                                {formatDollars(chRaised)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="dl-empty" style={{ marginTop: 8 }}>
                            <div className="k">
                              {t("headToHead.emptyNoFecMatchKicker")}
                            </div>
                            <div className="t">
                              {t("headToHead.emptyNoFecMatchTitle")}
                            </div>
                            <div
                              className="s"
                              dangerouslySetInnerHTML={{
                                __html: t("headToHead.emptyNoFecMatchSentence"),
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {cand?.peerComparison != null &&
                  typeof cand.totalRaised === "number" && (
                    <div className="cmp-field">
                      <div className="cmp-field-head">
                        {t("headToHead.fieldSectionTitle")}
                      </div>
                      <MoneyGapScale
                        subject={{
                          name: incDisplayName,
                          raised: cand.totalRaised,
                          pip: incBlind ? "hid" : incPip,
                        }}
                        field={moneyGapField}
                        peer={cand.peerComparison}
                      />
                    </div>
                  )}

                <div className="dl-foot">
                  {!openSeat && (
                    <button className="btn btn-keep" onClick={onKeep}>
                      <b>
                        <span className="box" aria-hidden="true" />
                        {verdict === "keep"
                          ? t("headToHead.keepingConfirmed")
                          : t("repCard.worthKeeping")}
                      </b>
                      <small>{t("headToHead.keepThisIncumbent")}</small>
                    </button>
                  )}
                  <button
                    className="btn"
                    style={{ background: "var(--navy)", color: "#fff" }}
                    onClick={() => onReplace(ch?.id ?? null)}
                    disabled={!ch}
                  >
                    <b>
                      {verdict === "replace" && pickId === ch?.id
                        ? t("headToHead.picked") + " "
                        : openSeat
                          ? t("headToHead.pickPrefix") + " "
                          : t("headToHead.replaceWithPrefix") + " "}
                      {chDisplayName} <span aria-hidden="true">→</span>
                    </b>
                    <small>
                      {chBlind ? t("headToHead.pickingPrintsRealName") : ""}
                    </small>
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/** Representative band → descriptive phrase for the ledger's right-hand
 *  flanking text. Derivable from duelAlignment's fixed RESEARCHED_BAND
 *  (80/20/50 for in_favor/opposed/mixed) — not new data, just naming the
 *  band the row's pct already came from. */
function researchedVerbPhrase(pct, t) {
  if (pct >= 67) return t("headToHead.verbStatedSupport");
  if (pct <= 34) return t("headToHead.verbStatedOpposition");
  return t("headToHead.verbMixedStated");
}

/** `.dl-prov`'s source-lock affordance for the incumbent's researched
 *  fallback (rare — only executive seats without a roll-call record). Same
 *  contract as ChallengerSources below. */
function IncumbentSources({ blind, evidence, realLastName, alias }) {
  const { t } = useI18n();
  if (blind)
    return <span className="dl-lock">{t("headToHead.sourcesLocked")}</span>;
  return (
    <span className="dl-sources">
      {evidence.slice(0, 3).map((e, i) => (
        <React.Fragment key={e.url}>
          {i > 0 && " · "}
          <a
            href={e.url}
            className="dl-source-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            {anonymizeText(e.summary, {
              blindMode: blind,
              realLastName,
              alias,
            })}
          </a>
        </React.Fragment>
      ))}
    </span>
  );
}

/** Frame 5 item 5 — evidence source links stay locked until reveal (a link
 *  would leak identity even with the visible text aliased). Once revealed,
 *  render the real cited links; the summary text is still run through
 *  anonymizeText defensively (a no-op once blind=false) in case a citation's
 *  own wording repeats the candidate's name. */
function ChallengerSources({ blind, evidence, realLastName, alias }) {
  const { t } = useI18n();
  if (blind)
    return <span className="dl-lock">{t("headToHead.sourcesLocked")}</span>;
  return (
    <span className="dl-sources">
      {evidence.slice(0, 3).map((e, i) => (
        <React.Fragment key={e.url}>
          {i > 0 && " · "}
          <a
            href={e.url}
            className="dl-source-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            {anonymizeText(e.summary, {
              blindMode: blind,
              realLastName,
              alias,
            })}
          </a>
        </React.Fragment>
      ))}
    </span>
  );
}
