// @ts-nocheck
"use client";
/* PORT of design-handoff/keystone-canvas/src/screens-delegation.jsx's
   DelegationOverview + SeatCard (§8 · DELEGATION OVERVIEW → DRILL-DOWN) —
   the new 3-card entry point, wired to real seat data instead of the
   design's illustrative DG_SEATS mock. Port deltas, behavior-only:
     - SeatCard's align %, per-issue rows, and provenance basis come from
       seatOverviewAlignmentPct / seatIssueAlignmentRows / seat.researched
       (delegationData.ts) — the SAME formula + lookup the existing deep
       single-seat view (AlignmentScoreBanner) uses, per the card's spec.
     - The design's "Voted with you" / "Aligns with you" split label is
       dropped in favor of this app's real deep-view copy, which never
       makes that distinction ("Aligns with your issues", verbatim from
       AlignmentScoreBanner in VoterChoiceApp.tsx) — reusing the app's own
       existing language rather than importing a distinction the rest of
       the UI doesn't make.
     - "This seat's incumbent" / "Name & party hidden" (design's static
       blind copy) is replaced with seat.blindLabel (e.g. "Your U.S.
       Representative") + the exact "Identity hidden · judge by record"
       string CandidateCardHeader already uses in blind mode, so the
       overview card's blind presentation reads identically to the deep
       view's.
     - Seats with nextElection.onBallot2026 === false are excluded from
       the scored grid and rolled into one .dg-excluded row per seat
       (design only ever showed one hardcoded excluded row).
     - DgProv / dg3 mirror HeadToHead.tsx's ProvBadge / cdTone — same
       small per-screen provenance/tone helpers, duplicated locally per
       that file's existing convention rather than shared.
     - onOpen(seatId) is wired by the caller (DelegationWorkspace) to
       select the seat AND leave overview mode; this component only knows
       "a card was activated," not what navigation follows. */

import React from "react";
import { useI18n, formatDollars, escapeHtml } from "../VoterChoiceApp";
import {
  seatOverviewAlignmentPct,
  seatIssueAlignmentRows,
  deriveMoneyInfluence,
  type DelegationSeatVM,
  type UserIssue,
} from "./delegationData";

/** Untraced-PAC-dollar % for the `{p}% untraced` chip — same math
 *  FundingSources.tsx/PacGapCaveat already compute (namedPacTotal vs.
 *  fundingMix.pac's implied share of totalRaised), duplicated locally
 *  because this component can't import from either of those (out of this
 *  card's file scope). null when there's no fundingMix/totalRaised to
 *  compute a baseline against, or nothing is actually untraced. */
function deriveUntracedPct(
  candidate: {
    donorCoalition?: unknown[] | null;
    fundingMix?: { pac: number } | null;
    totalRaised?: number;
  } | null,
): number | null {
  const donorCoalition = candidate?.donorCoalition;
  const fundingMix = candidate?.fundingMix;
  const totalRaised = candidate?.totalRaised;
  if (
    !Array.isArray(donorCoalition) ||
    !fundingMix ||
    typeof totalRaised !== "number" ||
    totalRaised <= 0
  )
    return null;
  const issuePacs = donorCoalition.filter(
    (s): s is { amount?: number; isIssuePAC?: boolean } =>
      !!s && (s as { isIssuePAC?: boolean }).isIssuePAC === true,
  );
  const namedPacTotal = issuePacs.reduce((s, p) => s + (p.amount || 0), 0);
  const impliedPacTotal = Math.round(totalRaised * (fundingMix.pac / 100));
  const uncatPacTotal = Math.max(0, impliedPacTotal - namedPacTotal);
  if (impliedPacTotal <= 0 || uncatPacTotal <= 0) return null;
  return Math.round((uncatPacTotal / totalRaised) * 100);
}

/* 3-way tone for the overview cards (matches SeatCard's design source) */
function dg3(v: number | null): "na" | "good" | "mid" | "bad" {
  return v == null ? "na" : v >= 67 ? "good" : v >= 34 ? "mid" : "bad";
}

/** Facts-only summary rows for a seat with no user issues yet — reps-first
 *  flow (2026-08-18): the per-issue alignment section only means anything
 *  once the user has issues, so an empty issue list gets an honest,
 *  issue-free substitute composed from data ALREADY on the seat (never a
 *  fabricated score). Same honest-null discipline as the rest of this file:
 *  a field we didn't look up (null) is omitted, a field we looked up and
 *  found empty renders its own explicit "not yet traced" line. */
function seatFactsRows(
  seat: DelegationSeatVM,
  t: (key: string, vars?: Record<string, unknown>) => string,
): string[] {
  const rows: string[] = [];

  const attendance = seat.attendance;
  if (attendance) {
    const presentPct = Math.round((100 - attendance.missedPct) * 10) / 10;
    const bandLabel = (
      {
        good: t("repCard.attendanceGood"),
        mid: t("repCard.attendanceMid"),
        bad: t("repCard.attendanceBad"),
      } as Record<string, string>
    )[attendance.band];
    rows.push(
      t("delegationOverview.factsAttendance", {
        pct: presentPct,
        band: bandLabel,
      }),
    );
  } else {
    rows.push(
      seat.level === "federal"
        ? t("repCard.attendanceUnavailableFederal")
        : t("repCard.attendanceUnavailableState"),
    );
  }

  // topPacs === null ⇒ we didn't look (flag off / unresolved candidate) ⇒
  // omit the row entirely; an object with an empty sponsors array ⇒ we
  // looked and found none ⇒ say so explicitly.
  if (seat.topPacs) {
    const sorted = [...(seat.topPacs.sponsors || [])].sort(
      (a, b) => (b.amount || 0) - (a.amount || 0),
    );
    if (sorted.length === 0) {
      rows.push(t("delegationOverview.factsTopPacsNone"));
    } else {
      const top = sorted.slice(0, 2).map((s) => s.name);
      const extra =
        sorted.length - top.length + (seat.topPacs.hiddenCount || 0);
      rows.push(
        t("delegationOverview.factsTopPacs", { names: top.join(", ") }) +
          (extra > 0
            ? t("delegationOverview.factsTopPacsMore", { n: extra })
            : ""),
      );
    }
  }

  // canContext === null ⇒ CAN2026 hasn't ingested this seat yet ⇒ omit.
  if (seat.canContext) {
    const n = (seat.canContext.keyVotes || []).length;
    rows.push(
      t(
        n === 1
          ? "delegationOverview.factsKeyVotesSingular"
          : "delegationOverview.factsKeyVotesPlural",
        { n },
      ),
    );
  }

  const challengerCount = (seat.challengers || []).length;
  rows.push(
    t(
      challengerCount === 1
        ? "delegationOverview.factsChallengersSingular"
        : "delegationOverview.factsChallengersPlural",
      { n: challengerCount },
    ),
  );

  return rows;
}

/** Provenance badge — the design's unifier (roll-call vs researched).
 *  Mirrors HeadToHead.tsx's ProvBadge exactly. */
function DgProv({ researched }: { researched: boolean }) {
  return researched ? (
    <span className="prov researched">Researched · cited</span>
  ) : (
    <span className="prov rollcall">Roll-call record</span>
  );
}

function SeatCard({
  seat,
  verdict,
  pickId,
  userIssues,
  blindMode,
  revealed,
  t,
  onOpen,
}: {
  seat: DelegationSeatVM;
  verdict: "keep" | "replace" | null | undefined;
  pickId?: string | null;
  userIssues: UserIssue[];
  blindMode?: boolean;
  revealed?: Set<string>;
  t: (key: string, vars?: Record<string, unknown>) => string;
  onOpen: (seatId: string) => void;
}) {
  const align = seatOverviewAlignmentPct(seat, userIssues);
  const rows = seatIssueAlignmentRows(seat, userIssues);
  const cand = seat.candidate;
  const moneyInfluence = deriveMoneyInfluence(seat, userIssues);
  const untracedPct = deriveUntracedPct(cand);
  // Open seat (v3 §6b): the incumbent isn't seeking re-election, so "worth
  // keeping" isn't a real decision — the only path is picking a successor
  // via the duel. Only an explicit `false` triggers this; undefined/null
  // (unknown) renders the normal keep/replace card unchanged.
  const openSeat = cand?.seekingReelection2026 === false;
  const successor = openSeat
    ? (seat.challengers || []).find((c) => c.id === pickId)
    : null;
  // Blind class (Frame 1 item 3): same contract as RepCard's `blind = blindMode
  // && !isRevealed`, resolved here per-seat against the caller's `revealed` set
  // since one overview grid holds many seats at once.
  const blind = !!blindMode && !revealed?.has(seat.id);
  const cls =
    "cd-card dg-open" +
    (blind ? " blind" : "") +
    (verdict === "keep"
      ? " is-pick"
      : verdict === "replace"
        ? " verdict-replace" + (openSeat ? " is-pick" : "")
        : "");

  function activate() {
    onOpen(seat.id);
  }

  return (
    <div
      className={cls}
      data-testid="seat-card"
      role="button"
      tabIndex={0}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      }}
    >
      <div className="cd-seatlab">
        <span className="seat-t">
          {seat.office} · {seat.districtLabel}
        </span>
        {openSeat && successor ? (
          <span className="dg-status successor">
            {t("repCard.overviewSuccessorChip", { name: successor.name })}
          </span>
        ) : verdict === "keep" ? (
          <span className="dg-status keep">✓ {t("repCard.worthKeeping")}</span>
        ) : verdict === "replace" && !openSeat ? (
          <span className="dg-status replace">
            ⇄ {t("repCard.timeToReplace")}
          </span>
        ) : (
          <span className="dg-status todo">
            {t("delegationOverview.notDecided")}
          </span>
        )}
      </div>

      <div className="cd-head">
        <div className="cd-avatar">?</div>
        <div className="cd-who">
          <div className="cd-name">{seat.blindLabel}</div>
          <div className="cd-role">Identity hidden · judge by record</div>
        </div>
      </div>

      <div className="cd-prov-row">
        <DgProv researched={!!seat.researched} />
      </div>

      {openSeat && (
        <div className="cd-openseat">
          <span className="os-kick">{t("repCard.overviewOpenSeatKicker")}</span>
          {successor ? (
            <span
              dangerouslySetInnerHTML={{
                __html: t("repCard.overviewOpenSeatPickedSentence", {
                  name: successor.name,
                }),
              }}
            />
          ) : (
            t("repCard.overviewOpenSeatSentence")
          )}
        </div>
      )}

      {userIssues.length > 0 ? (
        <div className="cd-align">
          <div className="cd-align-top">
            <span className="lab">Aligns with your issues</span>
            <span className={"cd-pct tone-" + dg3(align)}>
              {align == null ? "—" : `${align}%`}
            </span>
          </div>
          {rows.length > 0 && (
            <div className="cd-issues">
              {rows.map((row) => (
                <div className="cd-irow" key={row.label}>
                  <span className="ik">{row.label}</span>
                  <span className="cd-track">
                    <i
                      className={"bar-" + dg3(row.pct)}
                      style={{ width: `${row.pct ?? 0}%` }}
                    />
                  </span>
                  <span className="iv">{row.fraction ?? "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="cd-align cd-facts" data-testid="seat-facts">
          <div className="cd-align-top">
            <span className="lab">{t("delegationOverview.factsHeading")}</span>
          </div>
          <ul className="cd-facts-list">
            {seatFactsRows(seat, t).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {cand?.fundingMix && (
        <>
          <div className="cd-money">
            <div className="cd-money-top">
              <span className="lab">{t("repCard.fundingInfluence")}</span>
              <span className="cd-mixbar">
                {/* Zero-width segments are skipped in the BAR (nothing to
                    paint) but still get a legend entry below — 0% is
                    information, not absence, per the whiteboard mock. */}
                {cand.fundingMix.small > 0 && (
                  <i
                    className="mix-sm"
                    style={{ width: `${cand.fundingMix.small}%` }}
                  />
                )}
                {cand.fundingMix.large > 0 && (
                  <i
                    className="mix-lg"
                    style={{ width: `${cand.fundingMix.large}%` }}
                  />
                )}
                {cand.fundingMix.pac > 0 && (
                  <i
                    className="mix-pac"
                    style={{ width: `${cand.fundingMix.pac}%` }}
                  />
                )}
              </span>
              {typeof cand.totalRaised === "number" && (
                <span className="tot">{formatDollars(cand.totalRaised)}</span>
              )}
            </div>
          </div>
          <div className="cd-mixkey">
            <span>
              <i className="mix-sm" />
              <b>{cand.fundingMix.small}%</b>{" "}
              {t("delegationOverview.mixKeySmallLabel")}{" "}
              <span className="sub">
                {t("delegationOverview.mixKeySmallSub")}
              </span>
            </span>
            <span>
              <i className="mix-lg" />
              <b>{cand.fundingMix.large}%</b>{" "}
              {t("delegationOverview.mixKeyLargeLabel")}{" "}
              <span className="sub">
                {t("delegationOverview.mixKeyLargeSub")}
              </span>
            </span>
            <span>
              <i className="mix-pac" />
              <b>{cand.fundingMix.pac}%</b>{" "}
              {t("delegationOverview.mixKeyPacLabel")}{" "}
              <span className="sub">
                {t("delegationOverview.mixKeyPacSub")}
              </span>
            </span>
          </div>
        </>
      )}

      {moneyInfluence && (
        <div
          className={"cd-influence" + (moneyInfluence.pct < 50 ? " low" : "")}
        >
          <div className="k">
            {t("delegationOverview.moneyInfluenceKicker")}
          </div>
          <div className="big">
            <b>{moneyInfluence.pct}%</b>
            <span
              dangerouslySetInnerHTML={{
                __html:
                  t("delegationOverview.moneyInfluenceSentence", {
                    k: moneyInfluence.k,
                    n: moneyInfluence.n,
                  }) +
                  (moneyInfluence.pct < 50
                    ? t("delegationOverview.moneyInfluenceLowClause")
                    : moneyInfluence.topDollarAgainst
                      ? t("delegationOverview.moneyInfluenceTopDollarClause", {
                          amount: escapeHtml(
                            formatDollars(
                              moneyInfluence.topDollarAgainst.amount,
                            ),
                          ),
                          issue: escapeHtml(
                            moneyInfluence.topDollarAgainst.issue,
                          ),
                        })
                      : ""),
              }}
            />
          </div>
          {/* Reform-votes chip ("{k} of {n} reform votes with you") and the
              revolving-door chip ("⟳ revolving door · documented") are
              omitted here — no curated reform-vote set or revolving-door
              record exists in the data layer yet (GAPS-AND-DATA-AUDIT.md
              §C4/§C5). Wire them in alongside `untracedPct` below once
              those curated fields land on DelegationSeatVM/candidate. */}
          {untracedPct != null && (
            <div className="chips">
              <span className="mut">
                {t("delegationOverview.untracedPctChip", { p: untracedPct })}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="cd-foot">
        <button
          className="cd-select ghost"
          onClick={(e) => {
            e.stopPropagation();
            activate();
          }}
        >
          {openSeat
            ? successor
              ? t("delegationOverview.reopenSeat")
              : t("repCard.overviewSeeWhoRunning")
            : verdict
              ? t("delegationOverview.reopenSeat")
              : t("delegationOverview.reviewSeat")}
        </button>
      </div>
    </div>
  );
}

export function DelegationOverview({
  seats,
  verdicts,
  picks,
  userIssues,
  blindMode,
  revealed,
  onOpen,
  onPrint,
  onTailorIssues,
}: {
  seats: DelegationSeatVM[];
  verdicts: Record<string, "keep" | "replace" | undefined>;
  picks?: Record<string, string | undefined>;
  userIssues: UserIssue[];
  blindMode?: boolean;
  revealed?: Set<string>;
  onOpen: (seatId: string) => void;
  onPrint?: () => void;
  onTailorIssues?: () => void;
}) {
  const { t } = useI18n();
  const upSeats = seats.filter((s) => s.nextElection?.onBallot2026 !== false);
  const excludedSeats = seats.filter(
    (s) => s.nextElection?.onBallot2026 === false,
  );
  const total = upSeats.length;
  const decided = upSeats.filter((s) => verdicts[s.id]).length;
  const ready = total > 0 && decided === total;

  return (
    <div className="dg" data-testid="delegation-overview">
      <div className="dg-ov-head">
        <div className="dg-ov-intro">
          <div className="dg-kicker">★ {t("delegationOverview.kicker")}</div>
          <h2>{t("delegationOverview.heading")}</h2>
          <p className="sub">
            {userIssues.length > 0
              ? t("delegationOverview.sub")
              : t("delegationOverview.subNoIssues")}
          </p>
          {userIssues.length === 0 && onTailorIssues && (
            <button
              type="button"
              className="dg-tailor-cta"
              data-testid="tailor-issues-cta"
              onClick={onTailorIssues}
            >
              {t("delegationOverview.tailorCta")}
            </button>
          )}
        </div>
        <div className="dg-prog">
          <div className="meter">
            <span className="mlab">
              {decided} of {total} decided
            </span>
            <span className="dots">
              {upSeats.map((s) => (
                <i className={verdicts[s.id] ? "done" : ""} key={s.id} />
              ))}
            </span>
          </div>
          <button
            className={"dg-print" + (ready ? " ready" : "")}
            disabled={!ready}
            onClick={onPrint}
          >
            {ready
              ? t("delegationOverview.printReady")
              : // Frame 1 item 4: counts REMAINING seats, not the total.
                // printNotReady/printNotReadySingular (VoterChoiceApp.tsx)
                // carry the singular/plural sentence — same full-key-swap
                // pattern as repCard.vote/repCard.votes.
                t(
                  total - decided === 1
                    ? "delegationOverview.printNotReadySingular"
                    : "delegationOverview.printNotReady",
                  { n: total - decided },
                )}
          </button>
        </div>
      </div>

      <div className="dg-grid">
        {upSeats.map((s) => (
          <SeatCard
            key={s.id}
            seat={s}
            verdict={verdicts[s.id]}
            pickId={picks?.[s.id]}
            userIssues={userIssues}
            blindMode={blindMode}
            revealed={revealed}
            t={t}
            onOpen={onOpen}
          />
        ))}
      </div>

      {excludedSeats.map((s) => (
        <div
          className="dg-excluded"
          key={s.id}
          role="button"
          tabIndex={0}
          onClick={() => onOpen(s.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpen(s.id);
            }
          }}
        >
          <span className="ri">
            {s.office === "U.S. House"
              ? "HR"
              : s.office === "U.S. Senate"
                ? "SE"
                : "—"}
          </span>
          <span className="ex-meta">
            <b>
              {s.office} · {s.districtLabel}
            </b>{" "}
            — {s.blindLabel}
          </span>
          <span className="ex-tag">
            {[t("delegationOverview.excludedNote"), s.nextElection?.label]
              .filter(Boolean)
              .join(" · ")}
          </span>
          {/* Reviewable, never decidable (Muxin, 2026-07-12): the row itself
              is the affordance — no verdict UI, just a way in to the record. */}
          <span className="dg-excluded-open">
            {t("delegationOverview.excludedOpen")}
          </span>
        </div>
      ))}
    </div>
  );
}
