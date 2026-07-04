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
  AlignmentDrilldown,
  AllVotesPanel,
  FunderBars,
  formatDollars,
  useI18n,
  escapeHtml,
} from "../VoterChoiceApp";
import { getChallengerResearch, researchChallenger } from "./delegationData";
import { MedianChip, FundingHeadline } from "./MoneyGap";

/** Top 3 donor-industry labels by their existing order (data is already
 *  percent-sorted upstream) — for the collapsed funding summary's "top:
 *  {sectors}" caption [Δ] item G. Excludes named issue-PACs and the
 *  totalReceipts-only placeholder (not a real sector). */
function topIndustries(donorCoalition, n = 3) {
  if (!Array.isArray(donorCoalition)) return [];
  return donorCoalition
    .filter((d) => !d?.isIssuePAC && d?.label !== "total_receipts")
    .slice(0, n)
    .map((d) => d.label);
}

/** Party display metadata, keyed by the raw party name from the data source.
 * A function (not a module-level const) because the display name needs
 * `t()` — party labels are user-facing and must translate. */
export function getPartyMeta2(t) {
  return {
    Republican: { name: t("repCard.partyRepublican"), code: "R", pipClass: "rep" },
    Democrat: { name: t("repCard.partyDemocrat"), code: "D", pipClass: "dem" },
    Independent: { name: t("repCard.partyIndependent"), code: "I", pipClass: "ind" },
  };
}

/* ---- seat-strip helpers [Δ] item C — "{chamber} · {district}" badge +
   "Your Representative · N terms" + "UP {MON YEAR}". Pure presentational
   derivations off fields already on the seat/candidate — no data-layer
   change. Term length is only known for federal House (2yr) / Senate (6yr)
   seats; state legislature seats degrade honestly (role, no term count). */
function seatRoleLabel(seat, t) {
  const isSenate = /senate/i.test(seat.office || "");
  const role = isSenate
    ? t("repCard.roleSenator")
    : t("repCard.roleRepresentative");
  const m = (seat.candidate?.priorRole || "").match(/since (\d{4})/i);
  let terms = null;
  if (m) {
    const years = new Date().getFullYear() - parseInt(m[1], 10);
    const termYears = isSenate
      ? 6
      : /house/i.test(seat.office || "")
        ? 2
        : null;
    if (termYears && years >= 0)
      terms = Math.max(1, Math.round(years / termYears) || 1);
  }
  const label = `${t("repCard.yourPrefix")} ${role}`;
  if (!terms) return label;
  const termWord = terms === 1 ? t("repCard.termWord") : t("repCard.termsWord");
  return `${label} · ${terms} ${termWord}`;
}
function seatUpLabel(nextElection) {
  if (!nextElection?.onBallot2026) return null;
  const m = (nextElection.label || "").match(
    /([A-Za-z]{3})[a-z]*\.?\s+\d+,?\s*(\d{4})/,
  );
  return m ? `${m[1].toUpperCase()} ${m[2]}` : null;
}

/* ---- Attendance band [Δ] — honest omission when not tracked ----
   item F: reframed as a comparison-to-median sentence + a pill verdict
   (matching the reference) rather than a standalone "rarely misses" chip.
   The chamber median PERCENTAGE itself isn't threaded through the current
   member_stats → delegation data contract (only the derived good/mid/bad
   band is) — so the sentence names the direction ("above"/"below"/"near"
   the median) without fabricating a number the backend doesn't expose. */
export function AttendanceBand2({ attendance, researched, level, office }) {
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
  const chamber = /senate/i.test(office || "")
    ? "Senate"
    : /house/i.test(office || "")
      ? "House"
      : "chamber";
  const cmpKey =
    attendance.band === "good"
      ? "attCmpBelow"
      : attendance.band === "bad"
        ? "attCmpAbove"
        : "attCmpNear";
  const pillKey =
    attendance.band === "good"
      ? "attPillAbove"
      : attendance.band === "bad"
        ? "attPillBelow"
        : "attPillNear";
  return (
    <div className="att-band">
      <span
        className="txt"
        dangerouslySetInnerHTML={{
          __html: t("repCard.attendanceCompareLine", {
            pct: escapeHtml(attendance.missedPct),
            cmp: escapeHtml(t(`repCard.${cmpKey}`)),
            chamber: escapeHtml(chamber),
          }),
        }}
      />
      <span className={"att-chip " + attendance.band}>
        {t(`repCard.${pillKey}`)}
      </span>
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

/* ---- Score block [Δ] item E — bordered "VOTED WITH YOU" box: an aggregate
   percentage (colored good/bad) + fraction, then one row per issue with a
   bar colored per THAT issue's own ratio (green ≥50%, else red) — replacing
   the old uniform-navy-bar "Aligns with your issues" banner for the common
   scored-voting-record case. Honest-degradation states (no curated votes
   yet — loading / web-search fallback / no record) delegate straight to the
   shared AlignmentScoreBanner, unchanged, since no reference screenshot
   covers those states and it's also used by the /candidates surface. */
function ScoreBlock({
  candidate,
  alignmentEntry,
  userIssues,
  expandedIssue,
  onToggleIssue,
  anonCtx,
  research,
}) {
  const { t } = useI18n();

  if (alignmentEntry?.scores === null) {
    return (
      <AlignmentScoreBanner
        candidate={candidate}
        alignmentEntry={alignmentEntry}
        userIssues={userIssues}
        expandedIssue={expandedIssue}
        onToggleIssue={onToggleIssue}
        anonCtx={anonCtx}
        research={research}
      />
    );
  }

  const rows = (userIssues || []).map((iss) => {
    const score =
      (alignmentEntry?.scores || []).find(
        (s) => s.canonicalIssue === iss.canonicalIssue,
      ) || null;
    return { issue: iss, score };
  });
  const scoredRows = rows.filter((r) => r.score && r.score.total > 0);
  const kept = scoredRows.reduce((n, r) => n + r.score.kept, 0);
  const total = scoredRows.reduce((n, r) => n + r.score.total, 0);
  const overallPct = total > 0 ? Math.round((kept / total) * 100) : null;
  const overallGood = overallPct !== null && overallPct >= 50;

  return (
    <div className="align-band" data-testid="score-block">
      <div className="align-top">
        <span className="at-lab">{t("repCard.votedWithYouLabel")}</span>
        {overallPct !== null ? (
          <span>
            <span className={"at-pct " + (overallGood ? "good" : "bad")}>
              {overallPct}%
            </span>
            <span className="at-frac">
              {t("repCard.keyVotesFraction", { n: kept, m: total })}
            </span>
          </span>
        ) : (
          <span className="at-frac">{t("repCard.noVotesResearched")}</span>
        )}
      </div>
      <div className="align-rows">
        {rows.map(({ issue, score }, i) => {
          const pct =
            score && score.total > 0
              ? Math.round((score.kept / score.total) * 100)
              : null;
          const good = pct !== null && pct >= 50;
          const hasVotes = !!score?.contributingVotes?.length;
          const isOpen = expandedIssue === issue.canonicalIssue;
          return (
            <React.Fragment
              key={`${i}-${issue.canonicalIssue || issue.interpretation}`}
            >
              <div
                className={
                  "score-row" +
                  (isOpen ? " sel" : "") +
                  (hasVotes ? " has-drill" : "")
                }
                onClick={
                  hasVotes
                    ? () => onToggleIssue(issue.canonicalIssue)
                    : undefined
                }
                role={hasVotes ? "button" : undefined}
                tabIndex={hasVotes ? 0 : undefined}
              >
                <span className="ai">{issue.interpretation}</span>
                <span className="align-track">
                  {pct !== null && (
                    <i
                      className={good ? "good" : "bad"}
                      style={{ width: pct + "%" }}
                    />
                  )}
                </span>
                <span className="av">
                  {score && score.total > 0
                    ? `${score.kept}/${score.total}`
                    : "—"}
                  {hasVotes && (
                    <span className={"caret" + (isOpen ? "" : " dim")}>
                      {isOpen ? "▾" : "▸"}
                    </span>
                  )}
                </span>
              </div>
              {isOpen && hasVotes && (
                <AlignmentDrilldown
                  score={score}
                  candidate={candidate}
                  anonCtx={anonCtx}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
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
          </div>
          <div className="meta">
            {t("repCard.fecFiling", { party: party.name, raised })}
          </div>
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
  return (
    <div className="cv2-issues challengers-strip">
      <div className="cv2-block-head">
        <div className="lab">{t("repCard.runningForSeat")}</div>
        <div className="overall">
          <span className="rp-src-note">{t("repCard.fecRankedByFunds")}</span>
        </div>
      </div>
      {list.map((ch) => (
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
        <span className="seat-office">
          {seat.office} · {seat.districtLabel}
        </span>
        <span className="seat-role">{seatRoleLabel(seat, t)}</span>
        {notUp2026 && (
          <span className="seat-not-up">{t("repCard.notUp2026")}</span>
        )}
        {seat.nextElection &&
          (seatUpLabel(seat.nextElection) ? (
            <span className="seat-next up">
              UP {seatUpLabel(seat.nextElection)}
            </span>
          ) : (
            <span className="seat-next">{seat.nextElection.label}</span>
          ))}
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
}) {
  const { t } = useI18n();
  const [expandedIssue, setExpandedIssue] = useState(null);
  const [allVotesOpen, setAllVotesOpen] = useState(false);
  const [moneyOpen, setMoneyOpen] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 901px)").matches,
  );

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
  const anonCtx = {
    blindMode: blind,
    realLastName: cand.name?.split(" ").pop(),
    alias: seat.blindLabel,
  };
  const last = cand.name.split(" ").pop();
  const notUp2026 = seat.nextElection?.onBallot2026 === false;

  return (
    <div className={"cv2-card rep-card" + (notUp2026 ? " not-up-2026" : "")}>
      {/* Seat strip — office + district + when you can act on it. */}
      <div className="seat-strip">
        <span className="seat-office">
          {seat.office} · {seat.districtLabel}
        </span>
        <span className="seat-role">{seatRoleLabel(seat, t)}</span>
        {notUp2026 && (
          <span className="seat-not-up">{t("repCard.notUp2026")}</span>
        )}
        {seat.nextElection &&
          (seatUpLabel(seat.nextElection) ? (
            <span className="seat-next up">
              UP {seatUpLabel(seat.nextElection)}
            </span>
          ) : (
            <span className="seat-next">{seat.nextElection.label}</span>
          ))}
      </div>

      {/* [Δ] item D — the blind state gets its own presentation (square
          light-blue "?" avatar, "This seat's incumbent" heading, outlined
          top-right "Reveal name" button) matching the reference exactly;
          the shared CandidateCardHeader (also used by the /candidates
          compare surface) still renders the revealed state unchanged. */}
      {blind ? (
        <div className="rcard-head">
          <div className="rcard-avatar" aria-hidden="true">
            ?
          </div>
          <div className="rcard-who">
            <div className="blind">{t("repCard.seatIncumbentHeading")}</div>
            <div className="sub">{t("repCard.seatIncumbentSub")}</div>
          </div>
          <button className="rcard-reveal" onClick={onReveal}>
            {t("repCard.revealNameBtn")}
          </button>
        </div>
      ) : (
        <CandidateCardHeader
          candidate={cand}
          party={party}
          blindMode={blind}
          isRevealed={blindMode && isRevealed}
          alias={seat.blindLabel}
          onReveal={onReveal}
          onHide={onHide}
        />
      )}

      <AttendanceBand2
        attendance={seat.attendance}
        researched={seat.researched}
        level={seat.level}
        office={seat.office}
      />

      {seat.researched ? (
        <ResearchedPositions
          positions={seat.positions}
          userIssues={userIssues}
        />
      ) : (
        <ScoreBlock
          candidate={cand}
          alignmentEntry={seat.alignmentEntry}
          userIssues={userIssues}
          expandedIssue={expandedIssue}
          onToggleIssue={(ci) =>
            setExpandedIssue(expandedIssue === ci ? null : ci)
          }
          anonCtx={anonCtx}
          research={research}
        />
      )}

      {/* Full voting record — the restored AllVotesPanel (every curated vote
          across all issues, filterable, with roll-call links). Same primary
          "evidence" CTA placement the design's CandidateCard used. */}
      {!seat.researched && totalVotes > 0 && (
        <div className="cv2-see-all-bridge">
          <button
            className="cv2-see-all-inline"
            onClick={() => setAllVotesOpen(true)}
            data-testid="see-full-record"
          >
            {t("repCard.seeFullRecord", {
              n: totalVotes,
              votes: t(totalVotes === 1 ? "repCard.vote" : "repCard.votes"),
            })}
          </button>
        </div>
      )}
      <AllVotesPanel
        open={allVotesOpen}
        candidate={cand}
        alignmentEntry={seat.alignmentEntry}
        blindMode={blind}
        alias={seat.blindLabel}
        onClose={() => setAllVotesOpen(false)}
      />

      {/* [Δ] item G — the compact FUNDING summary (segmented small/large/PAC
          bar + total, then "{pac}% PAC-funded · top: sectors") stays visible
          even before "Money trail" is expanded, matching the reference. */}
      {cand.fundingMix && typeof cand.totalRaised === "number" && (
        <div className="money-line">
          <div className="money-top">
            <span className="ml-lab">{t("repCard.fundingLabel")}</span>
            <span className="money-bars">
              <i
                className="small"
                style={{ width: cand.fundingMix.small + "%" }}
              />
              <i
                className="large"
                style={{ width: cand.fundingMix.large + "%" }}
              />
              <i className="pac" style={{ width: cand.fundingMix.pac + "%" }} />
            </span>
            <span className="ml-tot">{formatDollars(cand.totalRaised)}</span>
          </div>
          <div className="money-detail">
            <span className="md-who">
              {t("repCard.pacFundedTop", {
                pct: cand.fundingMix.pac,
                sectors: topIndustries(cand.donorCoalition).join(", "),
              })}
            </span>
          </div>
        </div>
      )}

      {/* Money trail — same progressive-disclosure contract as CandidateCard. */}
      <div className={"cv2-disclose " + (moneyOpen ? "open" : "")}>
        <button
          className="cv2-disclose-toggle"
          aria-expanded={moneyOpen}
          aria-controls={`mt2-${cand.id}`}
          onClick={() => setMoneyOpen((v) => !v)}
        >
          <span className="cv2-disclose-lab">
            <span className="cv2-disclose-eyebrow">
              {t("repCard.fundingInfluence")}
            </span>
            <span className="cv2-disclose-title">
              {t("repCard.moneyTrail")}
            </span>
            <span className="cv2-disclose-summary">
              {typeof cand.totalRaised === "number" && (
                <span className="cv2-disclose-stat">
                  <b>{formatDollars(cand.totalRaised)}</b>{" "}
                  {t("repCard.raisedWord")}
                </span>
              )}
              {/* Collapsed glance — "Raised vs. the median". Renders the dollar
                  amount only (no fabricated baseline) when peerComparison is
                  null. */}
              {typeof cand.totalRaised === "number" &&
                cand.peerComparison != null && (
                  <MedianChip
                    raised={cand.totalRaised}
                    peer={cand.peerComparison}
                  />
                )}
              {cand.fundingMix && (
                <span className="cv2-disclose-mix">
                  {t("repCard.smallDonorsMix", {
                    small: cand.fundingMix.small,
                    large: cand.fundingMix.large,
                    pac: cand.fundingMix.pac,
                  })}
                </span>
              )}
            </span>
          </span>
          <span className="cv2-disclose-chev" aria-hidden="true">
            {moneyOpen ? (
              <>
                {t("repCard.hide")}{" "}
                <span className="cv2-disclose-arrow">▴</span>
              </>
            ) : (
              <>
                {t("repCard.showDetails")}{" "}
                <span className="cv2-disclose-arrow">▾</span>
              </>
            )}
          </span>
        </button>
        <div
          id={`mt2-${cand.id}`}
          className="cv2-disclose-body"
          hidden={!moneyOpen}
        >
          {/* [Δ] item H.1 — "$X raised · cycle" heading + the rose "≈Nx the
              median {chamber} campaign" pill. Renders nothing when
              peerComparison is null (honest — never fabricates a baseline),
              so the dollar-only FunderBars below stays the fallback. */}
          <FundingHeadline
            totalRaised={cand.totalRaised}
            cycle={cand.fundingMix?.cycle}
            peer={cand.peerComparison}
          />
          <FunderBars
            donorCoalition={cand.donorCoalition}
            totalRaised={cand.totalRaised}
            donorSource={cand.donorSource}
            fundingMix={cand.fundingMix}
            userIssues={userIssues}
          />
        </div>
      </div>

      <CanContextSection canContext={seat.canContext} />

      <EligibilityNote2 e={seat.eligibility} />

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
         the inline verdict toggle. */}
      {(() => {
        const hasChallengers = (seat.challengers || []).length > 0;
        const successor = hasChallengers
          ? (seat.challengers || []).find((c) => c.id === pickId)
          : null;
        return (
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
                if (hasChallengers && onOpenDuel) {
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
                  : hasChallengers
                    ? t("repCard.timeToReplaceCompare")
                    : t("repCard.timeToReplace")}
              </span>
            </button>
          </div>
        );
      })()}

      <CardSources seat={seat} />
    </div>
  );
}
