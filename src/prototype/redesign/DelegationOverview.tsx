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
import { useI18n, formatDollars } from "../VoterChoiceApp";
import {
  seatOverviewAlignmentPct,
  seatIssueAlignmentRows,
  type DelegationSeatVM,
  type UserIssue,
} from "./delegationData";

/* 3-way tone for the overview cards (matches SeatCard's design source) */
function dg3(v: number | null): "na" | "good" | "mid" | "bad" {
  return v == null ? "na" : v >= 67 ? "good" : v >= 34 ? "mid" : "bad";
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
  userIssues,
  t,
  onOpen,
}: {
  seat: DelegationSeatVM;
  verdict: "keep" | "replace" | null | undefined;
  userIssues: UserIssue[];
  t: (key: string, vars?: Record<string, unknown>) => string;
  onOpen: (seatId: string) => void;
}) {
  const align = seatOverviewAlignmentPct(seat, userIssues);
  const rows = seatIssueAlignmentRows(seat, userIssues);
  const cand = seat.candidate;
  const cls =
    "cd-card dg-open" +
    (verdict === "keep"
      ? " is-pick"
      : verdict === "replace"
        ? " verdict-replace"
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
        {verdict === "keep" ? (
          <span className="dg-status keep">✓ {t("repCard.worthKeeping")}</span>
        ) : verdict === "replace" ? (
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

      {cand?.fundingMix && (
        <div className="cd-money">
          <div className="cd-money-top">
            <span className="lab">{t("repCard.fundingInfluence")}</span>
            <span className="cd-bars">
              <i
                className="small"
                style={{ width: `${cand.fundingMix.small}%` }}
              />
              <i
                className="large"
                style={{ width: `${cand.fundingMix.large}%` }}
              />
              <i className="pac" style={{ width: `${cand.fundingMix.pac}%` }} />
            </span>
            {typeof cand.totalRaised === "number" && (
              <span className="tot">{formatDollars(cand.totalRaised)}</span>
            )}
          </div>
          <div className="cd-money-note">
            <b>{cand.fundingMix.pac}% PAC-funded</b> · {cand.fundingMix.small}%
            small-dollar
          </div>
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
          {verdict
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
  userIssues,
  onOpen,
  onPrint,
}: {
  seats: DelegationSeatVM[];
  verdicts: Record<string, "keep" | "replace" | undefined>;
  userIssues: UserIssue[];
  onOpen: (seatId: string) => void;
  onPrint?: () => void;
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
          <p className="sub">{t("delegationOverview.sub")}</p>
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
              : t("delegationOverview.printNotReady", { n: total })}
          </button>
        </div>
      </div>

      <div className="dg-grid">
        {upSeats.map((s) => (
          <SeatCard
            key={s.id}
            seat={s}
            verdict={verdicts[s.id]}
            userIssues={userIssues}
            t={t}
            onOpen={onOpen}
          />
        ))}
      </div>

      {excludedSeats.map((s) => (
        <div className="dg-excluded" key={s.id}>
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
        </div>
      ))}
    </div>
  );
}
