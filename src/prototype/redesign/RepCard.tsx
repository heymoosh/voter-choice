// @ts-nocheck
"use client";
/* VERBATIM port of docs/design/2026-redesign/…/redesign/redesign2-card.jsx
   (the vetted Claude Design view layer — appearance/structure unchanged).
   Port deltas, all behavior-only:
     - Babel-scope `useStateR` → useState; window globals → imports/props.
     - Mock-bound TX literals (STATE_ELECTION_DATA, SOURCE_URLS, §172.087)
       → data bindings: eligibility source from the resolver, donor source
       from /api/race-data, record source from the seat's level.
     - `research` prop threads the web_search fallback into the shipped
       AlignmentScoreBanner (same alignment surface as voting-record rows —
       the card-consistency requirement).
     - Unresolved seats (candidate: null) render an honest .cv2-norecord
       card state instead of crashing on mock-guaranteed fields.
     - AttendanceBand2 keeps the design's na-variant; copy generalizes to
       cover a federal member whose stats aren't ingested yet. */

import React, { useState } from "react";
import {
  CandidateCardHeader,
  AlignmentScoreBanner,
  AllVotesPanel,
  FundingMixBar,
  PacGapCaveat,
  formatDollars,
  useI18n,
  escapeHtml,
} from "../VoterChoiceApp";
import { getChallengerResearch, researchChallenger } from "./delegationData";
import { MoneyGapScale, MoneyHero } from "./MoneyGap";
import { FundingSources } from "./FundingSources";
import { isSelectableReplacement } from "../../lib/rosterProvenance";

/** Provenance badge — the design's unifier (roll-call vs researched).
 *  Mirrors HeadToHead.tsx's ProvBadge / DelegationOverview.tsx's DgProv —
 *  same small per-screen helper, duplicated locally per that convention. */
function ProvBadge({ researched }) {
  const { t } = useI18n();
  return researched ? (
    <span className="prov researched">{t("repCard.provResearched")}</span>
  ) : (
    <span className="prov rollcall">{t("repCard.provRollcall")}</span>
  );
}

/** True when a seat's alignment is backed by researched public statements
 * rather than a roll-call voting record — either an executive seat
 * (seat.researched) or a Congress seat whose record hasn't posted yet
 * (alignmentEntry.scores === null + unavailable, the same condition
 * AlignmentScoreBanner branches on internally). */
function isResearchedBasis(seat) {
  return !!(
    seat.researched ||
    (seat.alignmentEntry?.scores === null && seat.alignmentEntry?.unavailable)
  );
}

/** Top named-industry labels from donorCoalition, same slice FunderBars'
 * canvas variant uses for its industry rows (industries.slice(0, n)) —
 * the generic (non-issue-PAC) slices, in data order. */
export function topFundingIndustries(donorCoalition, limit = 3) {
  return (donorCoalition || [])
    .filter((s) => s && !s.isIssuePAC && s.label)
    .slice(0, limit)
    .map((s) => s.label);
}

/** Party display metadata, keyed by the raw party name from the data source.
 * A function (not a module-level const) because the display name needs
 * `t()` — party labels are user-facing and must translate. */
export function getPartyMeta2(t) {
  return {
    Republican: {
      name: t("repCard.partyRepublican"),
      code: "R",
      pipClass: "rep",
    },
    Democrat: { name: t("repCard.partyDemocrat"), code: "D", pipClass: "dem" },
    Independent: {
      name: t("repCard.partyIndependent"),
      code: "I",
      pipClass: "ind",
    },
  };
}

/* ---- Attendance band [Δ] — honest omission when not tracked ---- */
export function AttendanceBand2({ attendance, researched, level }) {
  const { t } = useI18n();
  if (researched) return null;
  if (!attendance) {
    return (
      <div className="att-band na">
        <span className="txt">
          {level === "federal"
            ? t("repCard.attendanceUnavailableFederal")
            : t("repCard.attendanceUnavailableState")}
        </span>
      </div>
    );
  }
  const bandLabel = {
    good: t("repCard.attendanceGood"),
    mid: t("repCard.attendanceMid"),
    bad: t("repCard.attendanceBad"),
  }[attendance.band];
  const presentPct = Math.round((100 - attendance.missedPct) * 10) / 10;
  return (
    <div className="att-band">
      <span className="att-big">{presentPct}%</span>
      <span
        className="txt"
        dangerouslySetInnerHTML={{
          __html: t("repCard.attendanceShowsUp", {
            pct: escapeHtml(attendance.missedPct),
            of: escapeHtml(attendance.of),
          }),
        }}
      />
      <span className={"att-chip " + attendance.band}>{bandLabel}</span>
      <a
        className="att-src cv2-evidence-link"
        href="https://www.govtrack.us/"
        target="_blank"
        rel="noopener noreferrer"
      >
        GovTrack ↗
      </a>
    </div>
  );
}

/* ---- Researched positions — no roll calls; same structure as the
   voting card so both modes are visually identical. ---- */
function ResearchedPositionRow({ issue, pos }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const supports = pos.resolvedStance === "in_favor";
  const opposes = pos.resolvedStance === "opposed";
  // Canonical directional label — same pair the voting-record card uses
  // ("WITH YOU" / "AGAINST YOU"), so House-style researched cards read
  // identically to Senate-style voting-record cards.
  const verb = supports
    ? t("repCard.withYou")
    : opposes
      ? t("repCard.againstYou")
      : t("repCard.mixed");
  // Descriptive verb for the cited-source title (reads as prose, not a badge).
  const titleVerb = supports
    ? t("repCard.supports")
    : opposes
      ? t("repCard.opposes")
      : t("repCard.mixedOn");
  const badgeColor = supports
    ? "var(--civic)"
    : opposes
      ? "var(--vote-red)"
      : "var(--gold)";
  const voteCls = supports ? "yea" : opposes ? "nay" : "other";
  const hasEvidence = (pos.evidence || []).length > 0;
  return (
    <div
      className={
        "cv2-iss-row" +
        (open ? " open" : "") +
        (hasEvidence ? " has-drill" : "")
      }
    >
      <button
        className="cv2-iss-head"
        onClick={hasEvidence ? () => setOpen(!open) : undefined}
        aria-expanded={open}
      >
        <div className="topic">
          <div className="name">{issue.interpretation}</div>
          <div className="meta">
            {t("repCard.fromPublicStatements")}
            {hasEvidence
              ? open
                ? t("repCard.sourceShownBelow")
                : t("repCard.tapForCitedSource")
              : t("repCard.noSourceCurated")}
          </div>
        </div>
        <div className="cv2-ws-col">
          <span className="cv2-ws-badge" style={{ background: badgeColor }}>
            {verb}
          </span>
          <span className="cv2-ws-conf">
            {t("repCard.confidenceSuffix", { level: pos.confidence })}
          </span>
        </div>
      </button>
      {open && hasEvidence && (
        <div className="cv2-drill">
          <div className="cv2-drill-head">
            <span className="lab">{t("repCard.whyThisRead")}</span>
            <span className="meta">{t("repCard.noVotesResearched")}</span>
          </div>
          <div className="cv2-votes">
            {pos.evidence.map((e, i) => (
              <div className="cv2-vote" key={i}>
                <div className="cv2-vote-head">
                  <div className="bill">
                    <span className="num">{t("repCard.webResearch")}</span>
                    <span className="ttl">
                      {titleVerb} {issue.interpretation.toLowerCase()}
                    </span>
                  </div>
                  <div className={"vote-badge " + voteCls}>{verb}</div>
                </div>
                <p className="cv2-vote-narr">“{e.summary}”</p>
                <div className="cv2-vote-cite">
                  <span className="src-chip">
                    {t("repCard.webSearchConfidence", {
                      level: pos.confidence,
                    })}
                  </span>
                  <a
                    href={e.url}
                    className="src-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("repCard.viewSource")}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ResearchedPositions({ positions, userIssues }) {
  const { t } = useI18n();
  const rows = (userIssues || [])
    .map((iss) => {
      const pos = positions.find(
        (p) => p.canonicalIssue === iss.canonicalIssue,
      );
      return pos ? { issue: iss, pos } : null;
    })
    .filter(Boolean);
  return (
    <div className="cv2-issues">
      <div className="cv2-block-head">
        <div className="lab">{t("repCard.whereTheyStand")}</div>
        <div className="overall">
          <span className="rp-src-note">
            {t("repCard.researchedCitedNote")}
          </span>
        </div>
      </div>
      {rows.map(({ issue, pos }, i) => (
        <ResearchedPositionRow
          key={`${i}-${issue.canonicalIssue || issue.interpretation}`}
          issue={issue}
          pos={pos}
        />
      ))}
    </div>
  );
}

/* ---- Eligibility note [Δ] — the evolved PartyGate, attached to the seat.
   Source line binds to the resolver's sourceLabel/sourceUrl (the design's
   hardcoded Texas SoS line was mock data). ---- */
export function EligibilityNote2({ e }) {
  const { t } = useI18n();
  if (!e) return null;
  return (
    <div className={"elig " + (e.severity || "info")}>
      <div className="elig-when">
        <span className="lab">{e.nextLabel}</span>
        <span className="date">{e.date}</span>
      </div>
      <div
        className="elig-rule"
        dangerouslySetInnerHTML={{ __html: e.ruleHtml }}
      />
      {e.todo && (
        <div className="elig-todo">
          →{" "}
          <a href={e.todo.href} target="_blank" rel="noopener noreferrer">
            {e.todo.text}
          </a>{" "}
          {t("repCard.eligibilitySoNotTurnedAway")}
        </div>
      )}
      {e.sourceUrl && (
        <a
          className="elig-src cv2-evidence-link"
          href={e.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("repCard.eligibilitySource", { label: e.sourceLabel })}
        </a>
      )}
    </div>
  );
}

/* ---- Per-card source transparency — bound to what actually fed the card. ---- */
export function CardSources({ seat }) {
  const { t } = useI18n();
  const cand = seat.candidate;
  const record = seat.researched
    ? {
        n: t("repCard.webSearchSourceName"),
        d: t("repCard.positionsCitedPerClaim"),
        u: null,
      }
    : {
        n: "GovTrack",
        d:
          t("repCard.votingRecord") +
          (seat.attendance ? t("repCard.andAttendance") : ""),
        u: "https://www.govtrack.us/",
      };
  const items = [
    record,
    cand?.donorSource
      ? {
          n: cand.donorSource.name,
          d: t("repCard.funding"),
          u: cand.donorSource.url,
        }
      : null,
    seat.eligibility?.sourceUrl
      ? {
          n: seat.eligibility.sourceLabel,
          d: t("repCard.electionRules"),
          u: seat.eligibility.sourceUrl,
        }
      : null,
  ].filter(Boolean);
  return (
    <div className="card-sources">
      <span className="lab">{t("repCard.sourcesLabel")}</span>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="sep">·</span>}
          <span>
            {it.u ? (
              <a href={it.u} target="_blank" rel="noopener noreferrer">
                {it.n}
              </a>
            ) : (
              it.n
            )}{" "}
            ({it.d})
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

/* ---- Challengers — 2026 FEC filers for this seat [Δ new section].
   ON-DEMAND research only (Muxin 2026-06-10): positions load when the voter
   taps the row's research button; results are the same cited web_search
   surface the no-record card uses (ResearchedPositions). Names come from
   public FEC filings — they are different people from the (possibly
   blinded) sitting member, so they render regardless of blind mode. ---- */
function ChallengerRow({
  challenger,
  seat,
  userIssues,
  stateCode,
  onShowBudgetOptions,
}) {
  const { t } = useI18n();
  // Module-level cache holds results across re-mounts; tick re-renders this
  // row when the research promise settles.
  const [, setTick] = useState(0);
  const research = getChallengerResearch(challenger.id);
  const party = getPartyMeta2(t)[challenger.party] || {
    name: challenger.party || t("repCard.partyUnknown"),
    code: "?",
    pipClass: "ind",
  };
  const raised =
    typeof challenger.totalReceipts === "number" && challenger.totalReceipts > 0
      ? t("repCard.raisedSuffix", {
          amount: formatDollars(challenger.totalReceipts),
        })
      : t("repCard.noFundsReported");

  return (
    <div className={"cv2-iss-row" + (research ? " open" : "")}>
      <div className="cv2-iss-head">
        <div className="topic">
          <div className="name">
            <span className={"pip " + party.pipClass} aria-hidden="true" />{" "}
            {challenger.name}
            {challenger.isRunoffPending && (
              <span className="seat-not-up runoff-pending-tag">
                {t("repCard.runoffPendingTag")}
              </span>
            )}
          </div>
          <div className="meta">
            {t("repCard.fecFiling", { party: party.name, raised })}
          </div>
          {challenger.isRunoffPending && (
            <div className="meta runoff-pending-note">
              {t("repCard.runoffPendingNote")}
            </div>
          )}
        </div>
        {!research || research.status === "unavailable" ? (
          <button
            className="cv2-disclose-toggle"
            onClick={() =>
              researchChallenger(challenger, seat, userIssues, stateCode, () =>
                setTick((t) => t + 1),
              )
            }
          >
            {research?.status === "unavailable"
              ? t("repCard.retryResearch")
              : t("repCard.researchPositions")}
          </button>
        ) : research.status === "loading" ? (
          <span className="meta">{t("repCard.lookingUpStatements")}</span>
        ) : null}
      </div>
      {research?.status === "done" && (
        <ResearchedPositions
          positions={research.scores}
          userIssues={userIssues}
        />
      )}
      {research?.status === "unavailable" && (
        <div className="cv2-norecord">
          <p>{t("repCard.noCitableStatements")}</p>
        </div>
      )}
      {research?.status === "budget_blocked" && (
        <div className="cv2-norecord" data-testid="challenger-budget-blocked">
          <p>
            {t("repCard.liveResearchPaused")}{" "}
            {onShowBudgetOptions && (
              <button className="linklike" onClick={onShowBudgetOptions}>
                {t("repCard.moreOptions")}
              </button>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

export function ChallengersStrip({
  seat,
  userIssues,
  stateCode,
  onShowBudgetOptions,
}) {
  const { t } = useI18n();
  const list = seat.challengers || [];
  if (list.length === 0) return null;
  const verifiedRoster = list.filter((ch) => isSelectableReplacement(ch));
  const financeOnly = list.filter((ch) => !isSelectableReplacement(ch));
  return (
    <>
      {verifiedRoster.length > 0 && (
        <div className="cv2-issues challengers-strip">
          <div className="cv2-block-head">
            <div className="lab">{t("repCard.runningForSeat")}</div>
            <div className="overall">
              <span className="rp-src-note">
                {t("repCard.fecRankedByFunds")}
              </span>
            </div>
          </div>
          {verifiedRoster.map((ch) => (
            <ChallengerRow
              key={ch.id}
              challenger={ch}
              seat={seat}
              userIssues={userIssues}
              stateCode={stateCode}
              onShowBudgetOptions={onShowBudgetOptions}
            />
          ))}
        </div>
      )}
      {financeOnly.length > 0 && (
        <div className="cv2-issues challengers-strip finance-only-strip">
          <div className="cv2-block-head">
            <div className="lab">{t("repCard.financeOnlyFilings")}</div>
            <div className="overall">
              <span className="rp-src-note">
                {t("repCard.financeOnlyFilingsNote")}
              </span>
            </div>
          </div>
          {financeOnly.map((ch) => (
            <ChallengerRow
              key={ch.id}
              challenger={ch}
              seat={seat}
              userIssues={userIssues}
              stateCode={stateCode}
              onShowBudgetOptions={onShowBudgetOptions}
            />
          ))}
        </div>
      )}
    </>
  );
}

/* ---- CAN2026 curated context [Δ new section] — race ratings, donor-trail
   prose, key-vote context from can2026.org (Constitutional Accountability
   Now). DISPLAY ONLY: never feeds any score. Renders nothing until the CAN
   ingest has run; every block carries the structural attribution. ---- */
const RATING_LABELS = {
  toss_up: "Toss-up",
  lean_d: "Lean D",
  lean_r: "Lean R",
  likely_d: "Likely D",
  likely_r: "Likely R",
  safe_d: "Safe D",
  safe_r: "Safe R",
};

export function CanContextSection({ canContext }) {
  const [open, setOpen] = useState(false);
  if (!canContext) return null;
  const { ratings, donorTrail, keyVotes, attribution, snapshotDate } =
    canContext;
  return (
    <div className={"cv2-disclose can-context " + (open ? "open" : "")}>
      <button
        className="cv2-disclose-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="cv2-disclose-lab">
          <span className="cv2-disclose-eyebrow">Curated context</span>
          <span className="cv2-disclose-title">
            Race ratings &amp; key votes
          </span>
          <span className="cv2-disclose-summary">
            {ratings.length > 0 && (
              <span className="cv2-disclose-stat">
                {ratings
                  .filter((r) => r.raterType === "forecaster")
                  .slice(0, 3)
                  .map(
                    (r) =>
                      `${r.rater.replace(/_/g, " ")}: ${r.ratingRaw || RATING_LABELS[r.rating] || r.rating}`,
                  )
                  .join(" · ") || null}
              </span>
            )}
          </span>
        </span>
        <span className="cv2-disclose-chev" aria-hidden="true">
          {open ? (
            <>
              Hide <span className="cv2-disclose-arrow">▴</span>
            </>
          ) : (
            <>
              Show details <span className="cv2-disclose-arrow">▾</span>
            </>
          )}
        </span>
      </button>
      {open && (
        <div className="cv2-disclose-body">
          {donorTrail && (
            <div className="cv2-vote">
              <div className="cv2-vote-head">
                <div className="bill">
                  <span className="num">DONOR TRAIL</span>
                  <span className="ttl">{donorTrail.cycleWindow}</span>
                </div>
              </div>
              <p className="cv2-vote-narr">
                {typeof donorTrail.totalRaised === "number" && (
                  <>
                    Raised <b>{formatDollars(donorTrail.totalRaised)}</b>
                    {typeof donorTrail.pacSharePct === "number" && (
                      <> · ~{donorTrail.pacSharePct}% from PACs</>
                    )}
                    {donorTrail.note ? ". " : "."}
                  </>
                )}
                {donorTrail.note}
              </p>
            </div>
          )}
          {keyVotes.map((v, i) => (
            <div className="cv2-vote" key={i}>
              <div className="cv2-vote-head">
                <div className="bill">
                  <span className="num">
                    {(v.voteCastRaw || v.voteCast || "").toUpperCase()}
                  </span>
                  <span className="ttl">{v.billLabel}</span>
                </div>
                {v.voteDateRaw && <span className="meta">{v.voteDateRaw}</span>}
              </div>
              {v.context && <p className="cv2-vote-narr">{v.context}</p>}
              {v.proceduralNote && (
                <p className="cv2-vote-narr">
                  <i>{v.proceduralNote}</i>
                </p>
              )}
              {v.billNarrative && (
                <p className="cv2-vote-narr">{v.billNarrative}</p>
              )}
            </div>
          ))}
          <div className="cv2-vote-cite">
            <span className="src-chip">
              {attribution.label}
              {snapshotDate ? ` · snapshot ${snapshotDate}` : ""}
            </span>
            <a
              href={attribution.url}
              className="src-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              can2026.org →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Honest state for a seat we couldn't resolve to a sitting member ---- */
function UnresolvedSeatCard({
  seat,
  userIssues,
  stateCode,
  onShowBudgetOptions,
}) {
  const { t } = useI18n();
  const notUp2026 = seat.nextElection?.onBallot2026 === false;
  return (
    <div className={"cv2-card rep-card" + (notUp2026 ? " not-up-2026" : "")}>
      <div className="seat-strip">
        <span className="seat-office">{seat.office}</span>
        <span className="seat-district">{seat.districtLabel}</span>
        {notUp2026 && (
          <span className="seat-not-up">{t("repCard.notUp2026")}</span>
        )}
        {seat.nextElection && (
          <span
            className={
              "seat-next " + (seat.nextElection.onBallot2026 ? "up" : "")
            }
          >
            {seat.nextElection.label}
          </span>
        )}
      </div>
      <div className="cv2-prov-row">
        <ProvBadge researched={isResearchedBasis(seat)} />
      </div>
      <div className="cv2-issues">
        <div className="cv2-block-head">
          <div className="lab">{seat.blindLabel}</div>
        </div>
        <div className="cv2-norecord">
          <p>{t("repCard.unresolvedNoMatch")}</p>
          <p>
            {t("repCard.lookThemUpAt")}{" "}
            <a
              href="https://www.govtrack.us/congress/members"
              target="_blank"
              rel="noopener noreferrer"
            >
              GovTrack
            </a>
            .
          </p>
        </div>
      </div>
      <EligibilityNote2 e={seat.eligibility} />
      <ChallengersStrip
        seat={seat}
        userIssues={userIssues}
        stateCode={stateCode}
        onShowBudgetOptions={onShowBudgetOptions}
      />
    </div>
  );
}

/* ---- RepCard ---- */
export function RepCard({
  seat,
  userIssues,
  stateCode,
  research,
  blindMode,
  isRevealed,
  onReveal,
  onHide,
  verdict,
  pickId,
  onVerdict,
  onOpenDuel,
  onShowBudgetOptions,
  onEditIssues,
}) {
  const { t } = useI18n();
  const [expandedIssue, setExpandedIssue] = useState(null);
  const [allVotesOpen, setAllVotesOpen] = useState(false);

  const cand = seat.candidate;
  if (!cand)
    return (
      <UnresolvedSeatCard
        seat={seat}
        userIssues={userIssues}
        stateCode={stateCode}
        onShowBudgetOptions={onShowBudgetOptions}
      />
    );

  const blind = blindMode && !isRevealed;
  // Curated-vote count across all issues — drives the full-record CTA.
  const totalVotes = (seat.alignmentEntry?.scores || []).reduce(
    (n, s) => n + (s?.contributingVotes?.length || 0),
    0,
  );
  const party = getPartyMeta2(t)[seat.partyName] || {
    name: seat.partyName,
    code: "?",
    pipClass: "ind",
  };
  // Muxin's ruling (2026-07-11): "This seat's incumbent" replaces
  // seat.blindLabel ("Your U.S. Representative") for THIS card's blind
  // display only — "makes it clearer who is in the seat vs who is
  // challenging." Scoped to RepCard's own rendering; seat.blindLabel
  // itself (consumed by the scorecard print view, chat, delegation
  // overview, head-to-head duel) is untouched.
  const blindDisplayLabel = t("repCard.blindSeatIncumbent");
  const anonCtx = {
    blindMode: blind,
    realLastName: cand.name?.split(" ").pop(),
    alias: blindDisplayLabel,
  };
  const last = cand.name.split(" ").pop();
  const notUp2026 = seat.nextElection?.onBallot2026 === false;

  return (
    <div className={"cv2-card rep-card" + (notUp2026 ? " not-up-2026" : "")}>
      {/* Seat strip — office + district + when you can act on it. */}
      <div className="seat-strip">
        <span className="seat-office">{seat.office}</span>
        <span className="seat-district">{seat.districtLabel}</span>
        {notUp2026 && (
          <span className="seat-not-up">{t("repCard.notUp2026")}</span>
        )}
        {cand?.seekingReelection2026 === false && (
          <span className="seat-not-up seat-not-seeking-reelection">
            {t("repCard.notSeekingReelection2026")}
          </span>
        )}
        {seat.nextElection && (
          <span
            className={
              "seat-next " + (seat.nextElection.onBallot2026 ? "up" : "")
            }
          >
            {seat.nextElection.label}
          </span>
        )}
      </div>

      <CandidateCardHeader
        candidate={cand}
        party={party}
        blindMode={blind}
        isRevealed={blindMode && isRevealed}
        alias={blindDisplayLabel}
        onReveal={onReveal}
        onHide={onHide}
        variant="canvas"
      />

      <div className="cv2-prov-row">
        <ProvBadge researched={isResearchedBasis(seat)} />
      </div>

      {/* 1 · Alignment — money-redesign step chrome (numbered dot + mono
          kicker + serif heading). Decorative "1" is aria-hidden; the real
          heading is the <div className="sec-h">, not a semantic heading
          element yet — see the a11y pass for promoting these to h2/h3. */}
      <div className="sec step-alignment">
        <div className="step">
          <span className="step-n" aria-hidden="true">
            1
          </span>
          <div>
            <div className="sec-kick">{t("repCard.stepAlignmentKicker")}</div>
            <div className="sec-h">{t("repCard.stepAlignmentHeading")}</div>
          </div>
        </div>
        {!seat.researched && (
          <div className="al-legend">
            <span>
              <i className="i-vote" aria-hidden="true" />
              {t("repCard.legendVote")}
            </span>
            <span>
              <i className="i-money" aria-hidden="true" />
              {t("repCard.legendMoney")}
            </span>
          </div>
        )}
        {seat.researched ? (
          <ResearchedPositions
            positions={seat.positions}
            userIssues={userIssues}
          />
        ) : (
          <AlignmentScoreBanner
            candidate={cand}
            alignmentEntry={seat.alignmentEntry}
            userIssues={userIssues}
            expandedIssue={expandedIssue}
            onToggleIssue={(ci) =>
              setExpandedIssue(expandedIssue === ci ? null : ci)
            }
            anonCtx={anonCtx}
            research={research}
            rowVariant="canvas"
            totalVotes={totalVotes}
            onSeeAllVotes={() => setAllVotesOpen(true)}
            donorCoalition={cand.donorCoalition}
          />
        )}

        {/* Quiet edit-issues entry (v3 §3b) — provoked by the score itself;
            the always-available fallback lives in Settings (nav ⚙). */}
        {onEditIssues && (
          <div className="al-edit">
            {t("repCard.editIssuesFinePrint", { n: userIssues.length })}{" "}
            <a
              role="button"
              tabIndex={0}
              onClick={onEditIssues}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onEditIssues();
                }
              }}
            >
              {t("repCard.editIssuesLink")}
            </a>{" "}
            {t("repCard.editIssuesFinePrintSuffix")}
          </div>
        )}
      </div>

      {/* Full voting record — the restored AllVotesPanel (every curated vote
          across all issues, filterable, with roll-call links). Its trigger
          now lives INSIDE the align-band itself (canvas's .see-all/.see-all-btn,
          wired via AlignmentScoreBanner) — discovery lives with its data,
          not in a detached row (Round-4 ask, 2026-07-12). */}
      <AllVotesPanel
        open={allVotesOpen}
        candidate={cand}
        alignmentEntry={seat.alignmentEntry}
        userIssues={userIssues}
        blindMode={blind}
        alias={blindDisplayLabel}
        onClose={() => setAllVotesOpen(false)}
      />

      <CanContextSection canContext={seat.canContext} />

      {/* 2 · Money — money-redesign v2 Tier B. Always open (no collapse —
          the design's ".mny-hero" leads with the total; the old collapsible
          disclosure + duplicated glance % legend are retired, v3 §2 row 5).
          Hero + subject-scale + mix bar + fused source list + untraced
          caveat, in that order — every view here consumes existing data
          (peerComparison, donorCoalition, fundingMix); nothing re-derived. */}
      <div className="sec step-money">
        <div className="step">
          <span className="step-n" aria-hidden="true">
            2
          </span>
          <div>
            <div className="sec-kick">{t("repCard.stepMoneyKicker")}</div>
            <div className="sec-h">{t("repCard.stepMoneyHeading")}</div>
          </div>
        </div>
        <MoneyHero totalRaised={cand.totalRaised} peer={cand.peerComparison} />
        {cand.peerComparison != null &&
          typeof cand.totalRaised === "number" && (
            <MoneyGapScale
              subject={{
                name: blind ? blindDisplayLabel : cand.name,
                raised: cand.totalRaised,
                pip: party.pipClass,
              }}
              peer={cand.peerComparison}
            />
          )}
        {cand.fundingMix && (
          <div className="mix">
            <FundingMixBar fundingMix={cand.fundingMix} variant="canvas" />
          </div>
        )}
        <FundingSources
          donorCoalition={cand.donorCoalition}
          totalRaised={cand.totalRaised}
          fundingMix={cand.fundingMix}
          userIssues={userIssues}
        />
        <PacGapCaveat
          issuePacs={(cand.donorCoalition || []).filter((s) => s?.isIssuePAC)}
          fundingMix={cand.fundingMix}
          totalRaised={cand.totalRaised}
        />
        {!cand.donorCoalition && !cand.fundingMix && cand.donorUnavailable && (
          <p className="sec-note">{cand.donorUnavailable.reason}.</p>
        )}
      </div>

      {/* 3 · Attendance */}
      <div className="sec step-attendance">
        <div className="step">
          <span className="step-n" aria-hidden="true">
            3
          </span>
          <div>
            <div className="sec-kick">{t("repCard.stepAttendanceKicker")}</div>
            <div className="sec-h">{t("repCard.stepAttendanceHeading")}</div>
          </div>
        </div>
        <AttendanceBand2
          attendance={seat.attendance}
          researched={seat.researched}
          level={seat.level}
        />
      </div>

      {/* The old inline "candidates simply listed below the rep"
          (ChallengersStrip) is retired: choosing "Time to replace" now opens
          the full-screen head-to-head duel (HeadToHead) where the real
          challengers are compared per-issue. The duel is the single
          candidate-evaluation surface. ChallengersStrip remains exported for
          the unresolved-seat fallback only. */}

      {/* Verdict — assessment, not selection. Rides to the scorecard + print.
         .ck is the shipped bordered checkbox; the border IS the box, so we
         leave it empty when unselected and fill it with a mark when set.
         "Time to replace" routes to the duel when challengers exist (the duel
         records the verdict + successor); with no challenger it degrades to
         the inline verdict toggle.

         Not-up-for-2026 seats are reviewable, never decidable (Muxin,
         2026-07-12): no keep/replace here — an info band explains why. */}
      {notUp2026 ? (
        <div className="cv2-notup-band">
          <div className="cv2-notup-eyebrow">{t("repCard.notUp2026")}</div>
          <p className="cv2-notup-text">
            {t("repCard.notUp2026BandSentence", {
              label: seat.nextElection?.label || t("repCard.notUp2026"),
            })}
          </p>
        </div>
      ) : (
        (() => {
          const selectableChallengers = (seat.challengers || []).filter((c) =>
            isSelectableReplacement(c),
          );
          const hasSelectableChallengers = selectableChallengers.length > 0;
          const hasRosterButNoSelectable =
            (seat.challengers || []).length > 0 && !hasSelectableChallengers;
          const successor = hasSelectableChallengers
            ? selectableChallengers.find((c) => c.id === pickId)
            : null;
          const openSeat = cand?.seekingReelection2026 === false;

          // Open seat (v3 §6): "worth keeping" isn't on the ballot — the
          // incumbent's record stays the baseline, the only decision is who's
          // next. Storage is UNCHANGED (still a "replace" verdict + pickId);
          // only rendering branches on the flag.
          if (openSeat) {
            if (verdict === "replace" && successor) {
              return (
                <div className="open-picked">
                  <span className="ck" aria-hidden="true">
                    ✓
                  </span>
                  <span
                    dangerouslySetInnerHTML={{
                      __html: `${t("repCard.openSeatPickedPrefix")} <b>${escapeHtml(successor.name)}</b>`,
                    }}
                  />
                  <button
                    className="chg linklike"
                    data-testid="open-duel"
                    onClick={() => onOpenDuel && onOpenDuel(seat.id)}
                  >
                    {t("repCard.openSeatChange")}
                  </button>
                </div>
              );
            }
            return (
              <>
                {hasRosterButNoSelectable ? (
                  <div
                    className="cv2-notup-band"
                    data-testid="roster-provenance-warning"
                  >
                    <div className="cv2-notup-eyebrow">
                      {t("repCard.rosterNotVerifiedEyebrow")}
                    </div>
                    <p className="cv2-notup-text">
                      {t("repCard.openSeatNoRosterBand")}
                    </p>
                  </div>
                ) : (
                  <div className="open-band">
                    <div className="ob-kick">
                      {t("repCard.openSeatBandKicker")}
                    </div>
                    <p>{t("repCard.openSeatBandBody")}</p>
                    {seat.eligibility?.sourceUrl && (
                      <div className="src">
                        <a
                          href={seat.eligibility.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t("repCard.openSeatBandSource")}
                        </a>
                      </div>
                    )}
                  </div>
                )}
                <button
                  className="btn-open"
                  data-testid="open-duel"
                  onClick={() => {
                    if (hasSelectableChallengers && onOpenDuel) {
                      onOpenDuel(seat.id);
                    } else {
                      // No verified roster yet — the pickless inline mark
                      // (§6c): counts the seat as decided without inventing
                      // a name. Reuses the same no-challenger verdict path
                      // the normal flow already falls back to below.
                      onVerdict(verdict === "replace" ? null : "replace");
                    }
                  }}
                >
                  <b>
                    {hasSelectableChallengers
                      ? t("repCard.openSeatCta")
                      : t("repCard.openSeatMarkChoose")}
                  </b>
                  {hasSelectableChallengers && (
                    <small>{t("repCard.openSeatCtaSub")}</small>
                  )}
                </button>
              </>
            );
          }

          return (
            <>
              {hasRosterButNoSelectable && (
                <div
                  className="cv2-notup-band"
                  data-testid="roster-provenance-warning"
                >
                  <div className="cv2-notup-eyebrow">
                    {t("repCard.rosterNotVerifiedEyebrow")}
                  </div>
                  <p className="cv2-notup-text">
                    {t("repCard.rosterNotVerifiedSentence")}
                  </p>
                </div>
              )}
              <div className="cv2-actions verdicts">
                <button
                  className={"pick " + (verdict === "keep" ? "picked" : "")}
                  onClick={() => onVerdict(verdict === "keep" ? null : "keep")}
                >
                  <span className="ck">{verdict === "keep" ? "✓" : ""}</span>
                  <span>
                    {verdict === "keep"
                      ? t("repCard.worthKeepingUndo")
                      : `${t("repCard.worthKeeping")}${blind ? "" : " · " + last}`}
                  </span>
                </button>
                <button
                  className={
                    "pick replace " +
                    (verdict === "replace" ? "picked-replace" : "")
                  }
                  data-testid="open-duel"
                  onClick={() => {
                    if (hasSelectableChallengers && onOpenDuel) {
                      onOpenDuel(seat.id);
                    } else {
                      onVerdict(verdict === "replace" ? null : "replace");
                    }
                  }}
                >
                  <span className="ck">{verdict === "replace" ? "✕" : ""}</span>
                  <span>
                    {verdict === "replace"
                      ? successor
                        ? t("repCard.replacingWith", { name: successor.name })
                        : t("repCard.timeToReplaceChange")
                      : t("repCard.timeToReplace")}
                  </span>
                </button>
              </div>
            </>
          );
        })()
      )}

      <CardSources seat={seat} />
    </div>
  );
}
