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
  FunderBars,
  formatDollars,
} from "../VoterChoiceApp";
import { getChallengerResearch, researchChallenger } from "./delegationData";
import { MedianChip, MoneyGapScale } from "./MoneyGap";

export const PARTY_META2 = {
  Republican: { name: "Republican", code: "R", pipClass: "rep" },
  Democrat: { name: "Democrat", code: "D", pipClass: "dem" },
  Independent: { name: "Independent", code: "I", pipClass: "ind" },
};

/* ---- Attendance band [Δ] — honest omission when not tracked ---- */
export function AttendanceBand2({ attendance, researched, level }) {
  if (researched) return null;
  if (!attendance) {
    return (
      <div className="att-band na">
        <span className="txt">
          {level === "federal"
            ? "Attendance isn't available for this member yet — we don't fake it."
            : "Attendance isn't reliably tracked at the state level — we don't fake it."}
        </span>
      </div>
    );
  }
  const bandLabel = {
    good: "Rarely misses",
    mid: "About average",
    bad: "Misses a lot",
  }[attendance.band];
  return (
    <div className="att-band">
      <span className="txt">
        Shows up — missed <b>{attendance.missedPct}%</b> of {attendance.of}.
      </span>
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
  const [open, setOpen] = useState(false);
  const supports = pos.resolvedStance === "in_favor";
  const opposes = pos.resolvedStance === "opposed";
  const verb = supports ? "SUPPORTS" : opposes ? "OPPOSES" : "MIXED";
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
            From public statements
            {hasEvidence
              ? open
                ? " · source shown below"
                : " · tap for the cited source"
              : " · no source curated"}
          </div>
        </div>
        <div className="cv2-ws-col">
          <span className="cv2-ws-badge" style={{ background: badgeColor }}>
            {verb}
          </span>
          <span className="cv2-ws-conf">{pos.confidence} confidence</span>
        </div>
      </button>
      {open && hasEvidence && (
        <div className="cv2-drill">
          <div className="cv2-drill-head">
            <span className="lab">Why this read?</span>
            <span className="meta">No votes — researched &amp; cited</span>
          </div>
          <div className="cv2-votes">
            {pos.evidence.map((e, i) => (
              <div className="cv2-vote" key={i}>
                <div className="cv2-vote-head">
                  <div className="bill">
                    <span className="num">WEB RESEARCH</span>
                    <span className="ttl">
                      {verb.charAt(0) + verb.slice(1).toLowerCase()}{" "}
                      {issue.interpretation.toLowerCase()}
                    </span>
                  </div>
                  <div className={"vote-badge " + voteCls}>{verb}</div>
                </div>
                <p className="cv2-vote-narr">“{e.summary}”</p>
                <div className="cv2-vote-cite">
                  <span className="src-chip">
                    Web search · {pos.confidence} confidence
                  </span>
                  <a
                    href={e.url}
                    className="src-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View source →
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
        <div className="lab">Where they stand on your issues</div>
        <div className="overall">
          <span className="rp-src-note">
            researched &amp; cited — no roll-call record
          </span>
        </div>
      </div>
      {rows.map(({ issue, pos }) => (
        <ResearchedPositionRow
          key={issue.canonicalIssue}
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
          so you're not turned away at the polls.
        </div>
      )}
      {e.sourceUrl && (
        <a
          className="elig-src cv2-evidence-link"
          href={e.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Source: {e.sourceLabel} ↗
        </a>
      )}
    </div>
  );
}

/* ---- Per-card source transparency — bound to what actually fed the card. ---- */
export function CardSources({ seat }) {
  const cand = seat.candidate;
  const record = seat.researched
    ? { n: "Web search", d: "positions, cited per claim", u: null }
    : {
        n: "GovTrack",
        d: "voting record" + (seat.attendance ? " & attendance" : ""),
        u: "https://www.govtrack.us/",
      };
  const items = [
    record,
    cand?.donorSource
      ? { n: cand.donorSource.name, d: "funding", u: cand.donorSource.url }
      : null,
    seat.eligibility?.sourceUrl
      ? {
          n: seat.eligibility.sourceLabel,
          d: "election rules",
          u: seat.eligibility.sourceUrl,
        }
      : null,
  ].filter(Boolean);
  return (
    <div className="card-sources">
      <span className="lab">Sources</span>
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
  // Module-level cache holds results across re-mounts; tick re-renders this
  // row when the research promise settles.
  const [, setTick] = useState(0);
  const research = getChallengerResearch(challenger.id);
  const party = PARTY_META2[challenger.party] || {
    name: challenger.party || "Party unknown",
    code: "?",
    pipClass: "ind",
  };
  const raised =
    typeof challenger.totalReceipts === "number" && challenger.totalReceipts > 0
      ? `${formatDollars(challenger.totalReceipts)} raised`
      : "No funds reported";

  return (
    <div className={"cv2-iss-row" + (research ? " open" : "")}>
      <div className="cv2-iss-head">
        <div className="topic">
          <div className="name">
            <span className={"pip " + party.pipClass} aria-hidden="true" />{" "}
            {challenger.name}
          </div>
          <div className="meta">
            {party.name} · {raised} · FEC filing
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
              ? "Retry research"
              : "Research positions"}
          </button>
        ) : research.status === "loading" ? (
          <span className="meta">Looking up public statements…</span>
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
          <p>
            No citable public statements found on your issues — we'd rather say
            so than guess.
          </p>
        </div>
      )}
      {research?.status === "budget_blocked" && (
        <div className="cv2-norecord" data-testid="challenger-budget-blocked">
          <p>
            Live research is paused — the community AI budget for this month is
            used up.{" "}
            {onShowBudgetOptions && (
              <button className="linklike" onClick={onShowBudgetOptions}>
                More options →
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
  const list = seat.challengers || [];
  if (list.length === 0) return null;
  return (
    <div className="cv2-issues challengers-strip">
      <div className="cv2-block-head">
        <div className="lab">Running for this seat in 2026</div>
        <div className="overall">
          <span className="rp-src-note">
            FEC filings · ranked by funds raised
          </span>
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
  const notUp2026 = seat.nextElection?.onBallot2026 === false;
  return (
    <div className={"cv2-card rep-card" + (notUp2026 ? " not-up-2026" : "")}>
      <div className="seat-strip">
        <span className="seat-office">{seat.office}</span>
        <span className="seat-district">{seat.districtLabel}</span>
        {notUp2026 && (
          <span className="seat-not-up">Not up for election in 2026</span>
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
      <div className="cv2-issues">
        <div className="cv2-block-head">
          <div className="lab">{seat.blindLabel}</div>
        </div>
        <div className="cv2-norecord">
          <p>
            We couldn't match this seat to a sitting member in our records —
            we'd rather say so than guess.
          </p>
          <p>
            Look them up directly at{" "}
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
  onVerdict,
  onShowBudgetOptions,
}) {
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
  const party = PARTY_META2[seat.partyName] || {
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
        <span className="seat-office">{seat.office}</span>
        <span className="seat-district">{seat.districtLabel}</span>
        {notUp2026 && (
          <span className="seat-not-up">Not up for election in 2026</span>
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
        alias={seat.blindLabel}
        onReveal={onReveal}
        onHide={onHide}
      />

      <AttendanceBand2
        attendance={seat.attendance}
        researched={seat.researched}
        level={seat.level}
      />

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
            See the full voting record — {totalVotes}{" "}
            {totalVotes === 1 ? "vote" : "votes"} →
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
              Funding &amp; influence
            </span>
            <span className="cv2-disclose-title">Money trail</span>
            <span className="cv2-disclose-summary">
              {typeof cand.totalRaised === "number" && (
                <span className="cv2-disclose-stat">
                  <b>{formatDollars(cand.totalRaised)}</b> raised
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
                  {cand.fundingMix.small}% small donors ·{" "}
                  {cand.fundingMix.large}% large donors · {cand.fundingMix.pac}%
                  PACs
                </span>
              )}
            </span>
          </span>
          <span className="cv2-disclose-chev" aria-hidden="true">
            {moneyOpen ? (
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
        <div
          id={`mt2-${cand.id}`}
          className="cv2-disclose-body"
          hidden={!moneyOpen}
        >
          {/* "Raised vs. the median" — the full scale REPLACES the flat
              "≈3× the median House campaign" string. Renders nothing when
              peerComparison is null, so the dollar-only FunderBars below stays
              the honest fallback. */}
          {cand.peerComparison != null &&
            typeof cand.totalRaised === "number" && (
              <MoneyGapScale
                subject={{
                  name: blind ? seat.blindLabel : cand.name,
                  raised: cand.totalRaised,
                  pip: party.pipClass,
                }}
                peer={cand.peerComparison}
              />
            )}
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

      <ChallengersStrip
        seat={seat}
        userIssues={userIssues}
        stateCode={stateCode}
        onShowBudgetOptions={onShowBudgetOptions}
      />

      {/* Verdict — assessment, not selection. Rides to the scorecard + print.
         .ck is the shipped bordered checkbox; the border IS the box, so we
         leave it empty when unselected and fill it with a mark when set. */}
      <div className="cv2-actions verdicts">
        <button
          className={"pick " + (verdict === "keep" ? "picked" : "")}
          onClick={() => onVerdict(verdict === "keep" ? null : "keep")}
        >
          <span className="ck">{verdict === "keep" ? "✓" : ""}</span>
          <span>
            {verdict === "keep"
              ? "Worth keeping — undo"
              : `Worth keeping${blind ? "" : " · " + last}`}
          </span>
        </button>
        <button
          className={
            "pick replace " + (verdict === "replace" ? "picked-replace" : "")
          }
          onClick={() => onVerdict(verdict === "replace" ? null : "replace")}
        >
          <span className="ck">{verdict === "replace" ? "✕" : ""}</span>
          <span>
            {verdict === "replace"
              ? "Time to replace — undo"
              : "Time to replace"}
          </span>
        </button>
      </div>

      <CardSources seat={seat} />
    </div>
  );
}
