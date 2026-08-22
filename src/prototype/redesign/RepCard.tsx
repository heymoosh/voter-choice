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
import {
  getChallengerResearch,
  researchChallenger,
  deriveMoneyInfluence,
  deriveVoteLinkage,
} from "./delegationData";
import { MoneyGapScale, MoneyHero } from "./MoneyGap";
import { FundingSources, hasScoredVoteLinkage } from "./FundingSources";
import { MoneyVerdict } from "./MoneyVerdict";
import { RevolvingDoorBand } from "./RevolvingDoorBand";
import { TopPacSponsors } from "./TopPacSponsors";
import { OutsideSpending } from "./OutsideSpending";
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

/** "Money we can't trace" md-tile math (work order Frames 2+3 §2 item 5 /
 * GAPS §A "same namedPacTotal/impliedPacTotal math FundingSources already
 * computes"). Deliberately NOT imported from FundingSources.tsx (that file
 * is owned by another lane in this batch) — same formula, recomputed locally
 * off the fields RepCard already receives. Honest-null: no fundingMix / no
 * positive total / nothing actually untraced → omit the tile, never a zero. */
export function deriveUntracedMoneyTile(cand) {
  const fundingMix = cand?.fundingMix;
  const totalRaised = cand?.totalRaised;
  if (!fundingMix || typeof totalRaised !== "number" || totalRaised <= 0)
    return null;
  const issuePacs = (cand.donorCoalition || []).filter((p) => p?.isIssuePAC);
  const namedPacTotal = issuePacs.reduce((s, p) => s + (p.amount || 0), 0);
  const impliedPacTotal = Math.round(totalRaised * (fundingMix.pac / 100));
  const uncatPacTotal = Math.max(0, impliedPacTotal - namedPacTotal);
  if (impliedPacTotal <= 0 || uncatPacTotal <= 0) return null;
  const pctIdentified = Math.round((namedPacTotal / impliedPacTotal) * 100);
  if (pctIdentified >= 100) return null;
  const pct = Math.round((uncatPacTotal / totalRaised) * 100);
  if (pct < 1) return null;
  return { pct, amount: uncatPacTotal };
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
  // Whiteboard copy is "Present for {a} of {b} floor votes — missed just
  // {p}%." — a and b are discrete counts. `attendance.of` is a rendered
  // string ("612 floor votes" or, when the ingest had no eligible-vote
  // count, the honest fallback "floor votes this term") — only the former
  // carries a number we can split into present/total without fabricating
  // one. Parseable → the whiteboard's exact fraction sentence; otherwise
  // degrade to the existing missed-% + descriptor sentence (still honest,
  // just without a count that doesn't exist in the data).
  const ofMatch = /^(\d+) (.+)$/.exec(attendance.of);
  const total = ofMatch ? Number(ofMatch[1]) : null;
  const present =
    total !== null
      ? Math.round(total * ((100 - attendance.missedPct) / 100))
      : null;
  const txtHtml =
    total !== null && present !== null
      ? `Present for <b>${present} of ${total}</b> ${escapeHtml(ofMatch[2])} — missed just <b>${escapeHtml(attendance.missedPct)}%</b>.`
      : t("repCard.attendanceShowsUp", {
          pct: escapeHtml(attendance.missedPct),
          of: escapeHtml(attendance.of),
        });
  return (
    <div className="att-band">
      <span className="att-big">{presentPct}%</span>
      <span className="att-txt" dangerouslySetInnerHTML={{ __html: txtHtml }} />
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

/* ---- Committees [Part 3] — standing committee assignments; honest
   omission when the (confirmed sitting) member has none on file yet. This
   component only ever runs for a resolved incumbent (RepCard returns
   UnresolvedSeatCard before reaching it), so an empty list here always
   means "not on file yet" (federal) or "not tracked at this level" (state)
   — never "not a member of Congress." That copy belongs to the
   challenger/unresolved surfaces once they gain their own committee lookup
   (currently deferred, same as challenger donor data). Same federal/state
   split as AttendanceBand2 above — committees are a federal-only source
   (unitedstates/congress-legislators has no state-legislature coverage). ---- */
export function CommitteesBand({ committees, level }) {
  const { t } = useI18n();
  const list = committees || [];
  if (list.length === 0) {
    return (
      <div className="cmt-outer na">
        <span className="txt">
          {level === "federal"
            ? t("repCard.committeesUnavailableFederal")
            : t("repCard.committeesUnavailableState")}
        </span>
      </div>
    );
  }
  return (
    <div className="cmt-outer cmt-band">
      <ul className="cmt-list">
        {list.map((c) => (
          <li key={c.committeeId} className="cmt-row">
            <span className="cmt-name">
              {c.parentName ? `${c.parentName} — ${c.name}` : c.name}
            </span>
            {c.title && <span className="cmt-title-chip">{c.title}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---- Collaborators [Part 4] — the member's closest cosponsorship partners,
   split cross-party (led first — bipartisan reach is the interesting signal)
   and same-party. Same resolved-incumbent-only guarantee and federal/state
   honest-empty split as CommitteesBand above (cosponsorship is a federal-only
   source). The count is UNWEIGHTED co-cosponsorship — a rough proxy — so the
   band cites the Lugar Center–Georgetown Bipartisan Index as the rigorous
   external benchmark rather than claiming a bipartisanship score of our own.

   ⚠️ FE DESIGN NOT REVIEWED — PROVISIONAL (Muxin, 2026-07-24). This markup was
   built to prove the data path end-to-end; it passed code/render self-vet only,
   NOT a design review, and the layout/copy/IA may be reworked or dropped. Open
   questions before it's treated as shipped design: whether collaborators
   deserve their own numbered step (this §5 pushes Money/Attendance down) vs.
   living inside an existing section or behind a disclosure; whether the
   cross-party-first "Reaches across the aisle" framing is the right editorial
   call; and whether the raw "N bills" chip should surface the unweighted-count
   proxy to readers at all (a designed treatment might show rank only, or lean
   entirely on the Lugar link). The durable part of Part 4 is the data layer
   (ingest + read + schema); this component is a placeholder. See the matching
   note in docs/DONOR_FRAMING_AND_ACCOUNTABILITY_PLAN.md (Part 4 — executed). ---- */
function CollaboratorGroup({ label, people }) {
  const { t } = useI18n();
  return (
    <div className="collab-group">
      <div className="collab-group-label">{label}</div>
      <ul className="cmt-list collab-list">
        {people.map((p) => {
          // Party letter and, for a member who has left Congress, a "former"
          // marker. Departed members appear via 118th-Congress bills they
          // shared with this member — labelled, never dropped, so the real
          // network isn't silently shrunk. See ApiCollaborator.departed.
          const qualifiers = [
            p.party,
            p.departed && t("repCard.collaboratorsFormer"),
          ].filter(Boolean);
          return (
            <li key={p.candidateId} className="cmt-row collab-row">
              <span className="cmt-name">
                {p.name}
                {qualifiers.length > 0 && (
                  <span className="collab-party">
                    {" "}
                    ({qualifiers.join(" · ")})
                  </span>
                )}
              </span>
              <span className="collab-count-chip">
                {t("repCard.collaboratorsSharedBills", { n: p.sharedBills })}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CollaboratorsBand({ collaborators, level }) {
  const { t } = useI18n();
  const net = collaborators || null;
  const hasAny =
    !!net && (net.sameParty.length > 0 || net.crossParty.length > 0);
  if (!hasAny) {
    return (
      <div className="cmt-outer na collab-na">
        <span className="txt">
          {level === "federal"
            ? t("repCard.collaboratorsUnavailableFederal")
            : t("repCard.collaboratorsUnavailableState")}
        </span>
      </div>
    );
  }
  return (
    <div className="cmt-outer collab-band">
      <div className="collab-groups">
        {net.crossParty.length > 0 && (
          <CollaboratorGroup
            label={t("repCard.collaboratorsCrossParty")}
            people={net.crossParty}
          />
        )}
        {net.sameParty.length > 0 && (
          <CollaboratorGroup
            label={t("repCard.collaboratorsSameParty")}
            people={net.sameParty}
          />
        )}
      </div>
      <p className="collab-cite">{t("repCard.collaboratorsCite")}</p>
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
            {research.upstream
              ? t("repCard.liveResearchPausedUpstream")
              : t("repCard.liveResearchPaused")}{" "}
            {onShowBudgetOptions && (
              <button
                className="linklike"
                onClick={() => onShowBudgetOptions(research.upstream)}
              >
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
  // Curated revolving-door record for THIS seat's incumbent — GAPS §5: no
  // ingestion pipeline exists yet, so no caller passes this today. Optional
  // and absent by design; gates both the .rd-band callout and the md-grid
  // revolving-door tile below. Shape: { memberId, org, role, dateDocumented,
  // sourceUrl } (see RevolvingDoorBand.tsx).
  revolvingDoor,
}) {
  const { t } = useI18n();
  // Issue #1 open by default (work order Frames 2+3 §1), the rest closed —
  // matches the whiteboard's default card state. Falls back to nothing open
  // when the top issue has no canonicalIssue to key on (honest degrade, same
  // shape the toggle handler below already tolerates).
  const [expandedIssue, setExpandedIssue] = useState(
    userIssues?.[0]?.canonicalIssue ?? null,
  );
  const [allVotesOpen, setAllVotesOpen] = useState(false);
  // Money expander — collapsed by default (whiteboard Frame 2); Frame 3 is
  // this same state toggled open. Only the deeper "where it comes from" list
  // + why-this-matters band live behind it — the hero/mix/verdict/rd-band
  // stay visible either way.
  const [moneyOpen, setMoneyOpen] = useState(false);

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

  // §2 money-section derivations (work order Frames 2+3) — honest-null
  // helpers from delegationData.ts; every value below can be null/empty and
  // the JSX below degrades accordingly (never a fabricated number).
  const moneyInfluence = deriveMoneyInfluence(seat, userIssues);
  const voteLinkage = deriveVoteLinkage(seat);
  // Canonical check from FundingSources.tsx itself (Frame 7 §2 item 3), not
  // a local re-derivation — this is exactly the "at least one dot strip
  // rendered" gate FundingSources uses internally, so the two can't drift.
  const hasScoredLinkage = hasScoredVoteLinkage(voteLinkage);
  const untracedTile = deriveUntracedMoneyTile(cand);
  const rankedSourcesCount =
    (cand.donorCoalition || []).length +
    (cand.fundingMix?.small > 0 ? 1 : 0) +
    (cand.fundingMix?.large > 0 ? 1 : 0);
  // mny-expander's small line composes only the clauses that actually
  // render below it — "reform votes" / "what PACs get back" never render
  // (GAPS §4/§6: no curated data exists for either, ever), so those clauses
  // are permanently absent rather than conditionally computed.
  const moneyExpanderParts = [
    rankedSourcesCount > 0
      ? t(
          rankedSourcesCount === 1
            ? "repCard.moneyExpanderRankedSourceSingular"
            : "repCard.moneyExpanderRankedSourcePlural",
          { n: rankedSourcesCount },
        )
      : null,
    hasScoredLinkage ? t("repCard.moneyExpanderDidMoneyVote") : null,
    untracedTile
      ? t("repCard.moneyExpanderUntraced", { pct: untracedTile.pct })
      : null,
  ].filter(Boolean);
  const revolvingDoorTile =
    revolvingDoor && revolvingDoor.org && revolvingDoor.role
      ? revolvingDoor
      : null;

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
          heading is the <h2 className="sec-h"> below (no heading wraps the
          whole RepCard, so h2 is the top level for these section headings). */}
      <div className="sec step-alignment">
        <div className="step">
          <span className="step-n" aria-hidden="true">
            1
          </span>
          <div>
            <div className="sec-kick">{t("repCard.stepAlignmentKicker")}</div>
            <h2 className="sec-h">{t("repCard.stepAlignmentHeading")}</h2>
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

        {/* Edit-issues entry (work order Frames 2+3 §1) — restyled onto the
            same mny-expander shell the money section's own expander uses
            (public/redesign2.css .rep-card .mny-expander is generic chrome,
            not money-specific); provoked by the score itself, the
            always-available fallback lives in Settings (nav ⚙). */}
        {onEditIssues && (
          <button
            className="mny-expander"
            data-testid="edit-issues-alignment"
            onClick={onEditIssues}
          >
            <span>
              {t("repCard.editIssuesButtonLabel", { n: userIssues.length })}
              <small>{t("repCard.editIssuesButtonSub")}</small>
            </span>
            <span className="car" aria-hidden="true">
              ✎
            </span>
          </button>
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
            <h2 className="sec-h">{t("repCard.stepMoneyHeading")}</h2>
          </div>
        </div>
        {/* Collapsed-default content (Frame 2) — hero, mix, the shared
            donors'-way verdict, and the revolving-door callout (gated,
            absent today) all stay visible whether or not the expander below
            is open; the subject-vs-median scale moves INSIDE the expander
            (Frame 3 only — MoneyGapScale is no longer unconditional). */}
        <MoneyHero totalRaised={cand.totalRaised} peer={cand.peerComparison} />
        {moneyOpen &&
          cand.peerComparison != null &&
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
        <MoneyVerdict influence={moneyInfluence} />
        <RevolvingDoorBand record={revolvingDoorTile} />

        {!moneyOpen ? (
          <button
            className="mny-expander"
            data-testid="money-expander-toggle"
            onClick={() => setMoneyOpen(true)}
          >
            <span>
              {t("repCard.moneyExpanderLabel")}
              {moneyExpanderParts.length > 0 && (
                <small>{moneyExpanderParts.join(" · ")}</small>
              )}
            </span>
            <span className="car" aria-hidden="true">
              ▼
            </span>
          </button>
        ) : (
          <>
            <button
              className="mny-collapse"
              data-testid="money-expander-toggle"
              style={{ marginTop: 16 }}
              onClick={() => setMoneyOpen(false)}
            >
              <span className="car" aria-hidden="true">
                ▲
              </span>
              {t("repCard.moneyCollapseLabel")}
            </button>
            <FundingSources
              donorCoalition={cand.donorCoalition}
              totalRaised={cand.totalRaised}
              fundingMix={cand.fundingMix}
              userIssues={userIssues}
              voteLinkage={voteLinkage}
              noRollCallRecord={isResearchedBasis(seat)}
            />
            {hasScoredLinkage && (
              <div className="mvc-key" style={{ marginTop: 10 }}>
                <span>
                  <i className="kw" aria-hidden="true" />
                  {t("repCard.mvcKeyDonorsWay")}
                </span>
                <span>
                  <i className="ka" aria-hidden="true" />
                  {t("repCard.mvcKeyAgainstDonor")}
                </span>
              </div>
            )}
            <PacGapCaveat
              issuePacs={(cand.donorCoalition || []).filter(
                (s) => s?.isIssuePAC,
              )}
              fundingMix={cand.fundingMix}
              totalRaised={cand.totalRaised}
            />
            {/* [Part 6a] Names the committees inside the PAC slice the
                caveat above is about. A BREAKDOWN of money already counted
                in the funding mix — never added to totalRaised or the mix
                (plan doc Part 6a). Renders only when
                PAC_TRANSPARENCY_ENABLED is on (the route sends null
                otherwise); an empty list renders its own no-data line. */}
            <TopPacSponsors data={seat.topPacs} />
            {!cand.donorCoalition &&
              !cand.fundingMix &&
              cand.donorUnavailable && (
                <p className="sec-note">{cand.donorUnavailable.reason}.</p>
              )}
            {/* Honest fallback when filings only give a total (no
                small/large/PAC mix, no per-source breakdown) — FunderBars'
                own "sparse" case (data-testid preserved for continuity). */}
            {!cand.fundingMix &&
              typeof cand.totalRaised === "number" &&
              cand.totalRaised > 0 && (
                <p className="sec-note" data-testid="funding-sparse">
                  {t("funderBars.sparseBreakdownNote")}
                </p>
              )}

            {/* "Why this matters" band — editorial, shown for every
                candidate regardless of which democracy tiles have data
                (work order: "if zero tiles AND no .md-why applicability,
                still render .md-why"). Reform-votes and PAC-ROI tiles are
                permanently omitted (GAPS §4/§6: no curated data exists for
                either) — only the untraced-money tile (always derivable
                when funding data exists) and the revolving-door tile
                (citation-gated, same record as rd-band) can ever appear. */}
            <div className="srcs-h" style={{ marginTop: 24 }}>
              {t("repCard.whyThisMattersHeading")}
            </div>
            <div
              className="md-why"
              dangerouslySetInnerHTML={{
                __html: t("repCard.moneyWhySentence"),
              }}
            />
            {(untracedTile || revolvingDoorTile) && (
              <div className="md-grid">
                {untracedTile && (
                  <div className="md-tile" data-testid="md-tile-untraced">
                    <div className="md-k">
                      <span className="ic dark" aria-hidden="true">
                        ?
                      </span>
                      {t("repCard.tileUntracedLabel")}
                    </div>
                    <div className="md-big">
                      {untracedTile.pct}% · {formatDollars(untracedTile.amount)}{" "}
                      <small>{t("repCard.tileUntraceableWord")}</small>
                    </div>
                    <div className="md-txt">
                      {t("repCard.tileUntracedBody")}
                    </div>
                    <div className="md-src">{t("repCard.tileUntracedSrc")}</div>
                  </div>
                )}
                {revolvingDoorTile && (
                  <div className="md-tile" data-testid="md-tile-revolving">
                    <div className="md-k">
                      <span className="ic door" aria-hidden="true">
                        ⟳
                      </span>
                      {t("repCard.tileRevolvingLabel")}
                    </div>
                    <div className="md-big">
                      {t("repCard.tileRevolvingAnnouncedPrefix")}{" "}
                      <small>{revolvingDoorTile.role},</small>{" "}
                      {revolvingDoorTile.org}
                    </div>
                    <div
                      className="md-txt"
                      dangerouslySetInnerHTML={{
                        __html: t("repCard.tileRevolvingBody"),
                      }}
                    />
                    <div className="md-src">
                      {t("repCard.tileRevolvingDocumentedPrefix", {
                        date: revolvingDoorTile.dateDocumented,
                      })}{" "}
                      <a
                        href={revolvingDoorTile.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t("repCard.sourceArrowLink")}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
            <button
              className="mny-collapse"
              style={{ marginTop: 16 }}
              onClick={() => setMoneyOpen(false)}
            >
              <span className="car" aria-hidden="true">
                ▲
              </span>
              {t("repCard.moneyCollapseLabel")}
            </button>
          </>
        )}
      </div>

      {/* [Part 6b] Outside spending — DELIBERATELY OUTSIDE the money section
          above, and never behind its expander. Independent expenditures are
          not this candidate's money and legally cannot be coordinated with
          the campaign, so the block sits in its own bordered container with
          its own explainer, spend-for and spend-against shown as two figures
          that are never summed, netted, or mingled with the funding mix
          (plan doc Part 6b, display rule). Renders only when
          PAC_TRANSPARENCY_ENABLED is on; an empty result renders its own
          per-direction no-data lines. */}
      <OutsideSpending data={seat.outsideSpending} />

      {/* 3 · Attendance */}
      <div className="sec step-attendance">
        <div className="step">
          <span className="step-n" aria-hidden="true">
            3
          </span>
          <div>
            <div className="sec-kick">{t("repCard.stepAttendanceKicker")}</div>
            <h2 className="sec-h">{t("repCard.stepAttendanceHeading")}</h2>
          </div>
        </div>
        <AttendanceBand2
          attendance={seat.attendance}
          researched={seat.researched}
          level={seat.level}
        />
      </div>

      {/* 4 · Committees [Part 3] — what this member has formal jurisdiction
          over; chair/ranking is surfaced via the title chip, since that's
          the actual power lever. Executive/state seats never carry
          committee data (federal-only source), so this only renders
          meaningfully for federal House/Senate seats — CommitteesBand's
          own honest-empty state covers every other case identically. */}
      <div className="sec step-committees">
        <div className="step">
          <span className="step-n" aria-hidden="true">
            4
          </span>
          <div>
            <div className="sec-kick">{t("repCard.stepCommitteesKicker")}</div>
            <h2 className="sec-h">{t("repCard.stepCommitteesHeading")}</h2>
          </div>
        </div>
        <CommitteesBand committees={seat.committees} level={seat.level} />
      </div>

      {/* 5 · Collaborators [Part 4] — who this member most often cosponsors
          bills with, cross-party first. Federal-only source, so this only
          renders meaningfully for federal House/Senate seats —
          CollaboratorsBand's own honest-empty state covers every other case. */}
      <div className="sec step-collaborators">
        <div className="step">
          <span className="step-n" aria-hidden="true">
            5
          </span>
          <div>
            <div className="sec-kick">
              {t("repCard.stepCollaboratorsKicker")}
            </div>
            <h2 className="sec-h">{t("repCard.stepCollaboratorsHeading")}</h2>
          </div>
        </div>
        <CollaboratorsBand
          collaborators={seat.collaborators}
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
              {/* Whiteboard's .verdict grid (work order Frames 2+3, verdict +
                  sources) — same onVerdict/onOpenDuel handlers and
                  data-testid as the prior .cv2-actions pair, just the
                  markup/classes. The main labels keep the existing translated
                  repCard.worthKeeping / repCard.timeToReplace keys (and their
                  undo/change/replacingWith variants); the <small> sublines
                  are repCard.verdictKeepSub / repCard.verdictReplaceSub. */}
              <div className="verdict">
                <button
                  className={
                    "btn btn-keep" + (verdict === "keep" ? " picked" : "")
                  }
                  onClick={() => onVerdict(verdict === "keep" ? null : "keep")}
                >
                  <b>
                    <span className="box" aria-hidden="true">
                      {verdict === "keep" ? "✓" : ""}
                    </span>
                    {verdict === "keep"
                      ? t("repCard.worthKeepingUndo")
                      : `${t("repCard.worthKeeping")}${blind ? "" : " · " + last}`}
                  </b>
                  {verdict !== "keep" && (
                    <small>{t("repCard.verdictKeepSub")}</small>
                  )}
                </button>
                <button
                  className={
                    "btn btn-replace" +
                    (verdict === "replace" ? " picked-replace" : "")
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
                  <b>
                    <span className="box" aria-hidden="true">
                      {verdict === "replace" ? "✕" : ""}
                    </span>
                    {verdict === "replace"
                      ? successor
                        ? t("repCard.replacingWith", { name: successor.name })
                        : t("repCard.timeToReplaceChange")
                      : t("repCard.timeToReplace")}
                  </b>
                  {verdict !== "replace" && (
                    <small>{t("repCard.verdictReplaceSub")}</small>
                  )}
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
