// @ts-nocheck
"use client";
/* VERBATIM port of docs/design/2026-redesign/…/redesign2-workspace.jsx
   (3-pane DelegationWorkspace + ScorecardPane). Port deltas, behavior-only:
     - Babel-scope `useStateW` → useState; window globals (DELEGATION,
       USER_ISSUES2, POLLING_INFO, STATE_ELECTION_DATA, getDeadlineRows,
       POLIS2) → props from delegationData.ts.
     - TIER_INTRO binds issue interpretations from the passed issues and the
       real state name (the design's copy hardcoded the Texas mock).
     - Scorecard precinct renders only when a precinct is known (the
       delegation flow makes no civic call — honest omission).
     - The standing CTA's neighbor count renders only when the polis scope
       is above its privacy threshold (polisPreview prop), with the design's
       copy otherwise generic.
     - onContinueElsewhere comes WIRED via props (the design file had an
       alert() stub; it opens the HandoffModal). The design's "save voting
       plan" CTA was dropped — voting-plan/profile export is no longer part
       of the congress-assessment flow. */

import React, { useState, useEffect } from "react";
import {
  AppNav,
  AppFooter,
  PollingStatusBar,
  useI18n,
} from "../VoterChoiceApp";
import { RepCard } from "./RepCard";
import { SeatChat } from "./SeatChat";
import { IssueDeltaBanner } from "./IssueDeltaBanner";
import { issuesForLevel } from "./delegationData";

/* [Δ] item B (Bold Flag redesign): the federal House/Senate branch now
   renders a SEAT-specific header ("SEAT n OF total" + "Your U.S.
   House/Senate seat" + a FEDERAL pill) instead of the old tier-wide
   "Washington — three people who write federal law" framing, matching the
   reference (.keystone-canvas-refs/02a-results-main.png). State-legislature
   and statewide-executive tiers are untouched — no reference covers them. */
function tierIntro(activeSeat, { stateName, t, seatIdx, totalSeats }) {
  const tr = t || ((k) => k);
  const section = activeSeat.section;
  const STATE_TIERS = {
    "State legislature — State": {
      place: (stateName || "STATE").toUpperCase(),
      title: tr("scorecard.tierStatTitle"),
      what: () => <>{tr("scorecard.tierStatWhat")}</>,
      pill: null,
    },
    "Statewide — Executive": {
      place: "STATEWIDE",
      title: tr("scorecard.tierExecTitle"),
      what: () => (
        <span
          dangerouslySetInnerHTML={{ __html: tr("scorecard.tierExecWhat") }}
        />
      ),
      pill: null,
    },
  };
  if (STATE_TIERS[section]) return STATE_TIERS[section];

  const isSenate = /senate/i.test(activeSeat.office || "");
  return {
    place: tr("scorecard.seatOfTotal", { n: seatIdx + 1, total: totalSeats }),
    title: isSenate
      ? tr("scorecard.yourSenateSeatTitle")
      : tr("scorecard.yourHouseSeatTitle"),
    what: () => (
      <>
        {isSenate
          ? tr("scorecard.senateSeatDesc", { state: stateName || "your state" })
          : tr("scorecard.houseSeatDesc", {
              district: activeSeat.districtLabel || "your district",
            })}
      </>
    ),
    pill: tr("scorecard.federalPill"),
  };
}

/** Last 4-digit year found in a label string ("Jan 3, 2029" → 2029). Pure
 *  presentational parse — no data-layer change — for the rail's "not up for
 *  election" row, which shows the seat's next election YEAR instead of a
 *  status tag (item J of the Bold Flag redesign). */
function yearFromLabel(label) {
  const m = (label || "").match(/(20\d{2})/);
  return m ? m[1] : "";
}

/** Two-letter seat-avatar code for the rail ("HR" / "SE"), item J. */
function seatAvatarCode(office) {
  if (/senate/i.test(office || "")) return "SE";
  if (/house/i.test(office || "")) return "HR";
  return (office || "")
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 2)
    .toUpperCase();
}

/* ---- Scorecard pane (BallotPaneInner evolved) ---- */
export function ScorecardPane({
  seats,
  verdicts,
  picks,
  activeSeatId,
  issues,
  revealed,
  blindMode,
  onSelectSeat,
  onPrint,
  onContinueElsewhere,
  onEditIssues,
}) {
  const { t } = useI18n();
  const doneCount = Object.keys(verdicts).filter((id) =>
    seats.some((s) => s.id === id),
  ).length;
  const canPrint = doneCount > 0;

  // [Δ] item J: the rail IS the progress — three groups (Reviewing now / Not
  // yet reviewed / Not up for election) instead of the old grouping by
  // section (which just repeated "Washington — Federal" for every federal
  // seat). "Reviewing now" is always exactly the active seat; "not up" seats
  // are excluded from "not yet reviewed" even if one happens to be active.
  const reviewingNow = seats.filter((s) => s.id === activeSeatId);
  const notUpForElection = seats.filter(
    (s) => s.nextElection?.onBallot2026 === false && s.id !== activeSeatId,
  );
  const notYetReviewed = seats.filter(
    (s) => s.id !== activeSeatId && s.nextElection?.onBallot2026 !== false,
  );
  const firstUndecidedIdx = notYetReviewed.findIndex((s) => !verdicts[s.id]);
  const groups = [
    {
      key: "reviewing",
      label: t("scorecard.groupReviewingNow"),
      rows: reviewingNow,
    },
    {
      key: "notyet",
      label: t("scorecard.notYetReviewed"),
      rows: notYetReviewed,
    },
    {
      key: "notup",
      label: t("scorecard.groupNotUpForElection"),
      rows: notUpForElection,
    },
  ].filter((g) => g.rows.length > 0);

  const printWord = t(
    seats.length === 2 ? "scorecard.bothSeats" : "scorecard.allSeats",
  );

  return (
    <>
      <div className="rail-head">
        <div className="rh-t">{t("scorecard.heading")}</div>
        <div className="rh-prog">
          <span className="rh-dots">
            {seats.map((s) => (
              <i
                key={s.id}
                className={
                  verdicts[s.id]
                    ? "done"
                    : s.id === activeSeatId
                      ? "active"
                      : ""
                }
              />
            ))}
          </span>
          <span className="rh-count">
            {t("scorecard.decidedCount", { n: doneCount, total: seats.length })}
          </span>
        </div>
      </div>

      {/* Mobile/tablet only (≤1023px, shipped by prototype-c.css) — on
          desktop the issues + Edit control live in the new top context
          strip (item A) so they aren't duplicated here (item J). */}
      <div className="b-issues-edit">
        <div className="b-issues-head">
          <span className="b-issues-lab">{t("scorecard.yourIssues")}</span>
          {onEditIssues && (
            <button
              className="b-issues-btn"
              onClick={onEditIssues}
              data-testid="edit-issues-scorecard"
            >
              {t("scorecard.edit")}
            </button>
          )}
        </div>
        <ol className="b-issues-list">
          {issues.map((iss, i) => (
            <li key={`${i}-${iss.canonicalIssue || iss.interpretation}`}>
              <span className="n">{i + 1}</span>
              {iss.interpretation}
            </li>
          ))}
        </ol>
      </div>

      <div className="rail-list">
        {groups.map((g) => (
          <div key={g.key}>
            <div className="rail-group-lab">{g.label}</div>
            {g.rows.map((s, idxInGroup) => {
              const v = verdicts[s.id];
              const isActive = s.id === activeSeatId;
              const notUp = s.nextElection?.onBallot2026 === false;
              const isRevealedSeat = !blindMode || !!revealed?.has?.(s.id);
              const displayName = isRevealedSeat
                ? (s.candidate?.name ?? s.blindLabel)
                : "This seat";
              const successor =
                v === "replace"
                  ? (s.challengers || []).find((c) => c.id === picks?.[s.id])
                  : null;
              return (
                <div
                  key={s.id}
                  data-testid={`seat-row-${s.id}`}
                  className={
                    "b-row rseat " +
                    (v ? "done " : "pending ") +
                    (v === "replace" ? "replace " : "") +
                    (isActive ? "active " : "") +
                    (notUp ? "not-up-2026 notup " : "")
                  }
                  onClick={() => onSelectSeat(s.id)}
                >
                  <span className="ri">{seatAvatarCode(s.office)}</span>
                  <span className="rmeta">
                    <span className="ro">
                      {s.office} · {s.districtLabel}
                    </span>
                    <span className="rn">{displayName}</span>
                  </span>
                  <span className={"rstatus " + (v || "")}>
                    {v ? (
                      <>
                        <span className={"verdict-chip " + v}>
                          {v === "keep"
                            ? t("scorecard.worthKeeping")
                            : t("scorecard.timeToReplace")}
                        </span>
                        {successor && (
                          <span className="pick-successor">
                            {" → "}
                            {successor.name}
                          </span>
                        )}
                      </>
                    ) : isActive ? (
                      t("scorecard.tagNow")
                    ) : notUp ? (
                      yearFromLabel(s.nextElection?.label)
                    ) : idxInGroup === firstUndecidedIdx ? (
                      t("scorecard.tagUpNext")
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="rail-foot">
        <button className="primary" disabled={!canPrint} onClick={onPrint}>
          <span>{t("scorecard.printBtn")}</span>
          <span className="arrow">→</span>
        </button>
        <div className="rf-hint">
          {t("scorecard.printCaption", {
            word: printWord,
            n: doneCount,
            total: seats.length,
          })}
        </div>
        <button onClick={onContinueElsewhere}>
          <span>{t("scorecard.handoffBtn")}</span>
          <span className="arrow">↗</span>
        </button>
      </div>
    </>
  );
}

/* ---- Workspace ---- */
export function DelegationWorkspace({
  address,
  stateName,
  seats,
  userIssues,
  pollingInfo,
  stateData,
  deadlineRows,
  researchFor,
  polisPreview,
  blindMode,
  verdicts,
  picks,
  activeSeatId,
  revealed,
  onReveal,
  onHide,
  onVerdict,
  onOpenDuel,
  onSelectSeat,
  onPrint,
  onContinueElsewhere,
  onSeeStanding,
  chatMessages,
  chatTimeouts,
  budgetTier,
  onSendChat,
  onRetryChat,
  onShowBudgetOptions,
  onEditIssues,
  onBackToSeats,
  issueDeltas,
  onRevisitSeat,
  onDismissDeltas,
}) {
  const { t } = useI18n();
  const activeSeat = seats.find((s) => s.id === activeSeatId) || seats[0];
  const activeIdx = seats.findIndex((s) => s.id === activeSeat.id);
  const doneCount = Object.keys(verdicts).filter((id) =>
    seats.some((s) => s.id === id),
  ).length;
  const intro = tierIntro(activeSeat, {
    stateName,
    t,
    seatIdx: activeIdx,
    totalSeats: seats.length,
  });

  /* Mobile: same contract as the shipped WorkspaceView — the center pane
     is hidden <768px until a row is tapped, then opens as a fixed overlay
     with a back control. */
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  useEffect(() => {
    setMobileChatOpen(false);
  }, [seats.length]);
  function selectAndOpen(seatId) {
    onSelectSeat(seatId);
    setTimeout(() => setMobileChatOpen(true), 0);
  }

  function commitVerdict(v) {
    onVerdict(activeSeat.id, v);
    if (!v) return;
    setMobileChatOpen(false);
    setTimeout(() => {
      const next = seats.find(
        (s, i) => i > activeIdx && !verdicts[s.id] && s.id !== activeSeat.id,
      );
      if (next) onSelectSeat(next.id);
    }, 600);
  }

  return (
    // `delegation` scopes redesign-only CSS fixes (redesign2.css) so the
    // legacy workspace's shipped rules stay untouched.
    <div className="ws-shell delegation">
      <AppNav />
      <PollingStatusBar
        pollingInfo={pollingInfo}
        stateData={stateData}
        rows={deadlineRows}
      />
      {/* [Δ] item A (Bold Flag redesign): back-link + address (left) and the
          issues chips + Edit (right) — replaces the desktop copy of the
          issues list that used to live only in the scorecard rail (moved
          here per the reference; the mobile/tablet copy inside
          ScorecardPane's .b-issues-edit is untouched). The polling-place
          banner above is a separate, still-needed feature (deadlines/ID
          requirements/early voting) — this strip doesn't replace it. */}
      <div className="res-context">
        <button
          className="rc-back"
          onClick={onBackToSeats}
          disabled={!onBackToSeats}
          data-testid="back-to-seats"
        >
          {t("scorecard.backToSeats")}
        </button>
        <span className="rc-addr">{address || "—"}</span>
        <span className="rc-issues">
          <span className="rc-lab">{t("scorecard.yourIssues")}</span>
          {userIssues.map((iss, i) => (
            <span
              className="chip-issue"
              key={`${i}-${iss.canonicalIssue || iss.interpretation}`}
            >
              {iss.interpretation}
            </span>
          ))}
          {onEditIssues && (
            <button
              className="chip-issue edit"
              onClick={onEditIssues}
              data-testid="edit-issues-topstrip"
            >
              {t("scorecard.edit")}
            </button>
          )}
        </span>
      </div>
      <div
        className="ws-wrap"
        data-mobile-chat={mobileChatOpen ? "open" : "closed"}
      >
        {/* CENTER — active seat */}
        <section className="ws-chat rep-center">
          <header className="head rep-center-head">
            <button
              className="ws-mobile-back ws-mobile-back-hide-desktop"
              onClick={() => setMobileChatOpen(false)}
              aria-label={t("scorecard.backToScorecard")}
            >
              ←
            </button>
            <span className="rep-center-head-lab">
              {activeSeat.office} · {activeSeat.districtLabel}
            </span>
          </header>
          <div className="tier-intro">
            <span className="ti-place">{intro.place}</span>
            <div className="ti-copy">
              <h2>
                {intro.title}
                {intro.pill && <span className="lvl">{intro.pill}</span>}
              </h2>
              <p>{intro.what()}</p>
            </div>
          </div>

          {issueDeltas && (
            <IssueDeltaBanner
              deltas={issueDeltas}
              onRevisit={onRevisitSeat}
              onDismiss={onDismissDeltas}
            />
          )}

          <RepCard
            key={activeSeat.id}
            seat={activeSeat}
            userIssues={issuesForLevel(userIssues, activeSeat.level)}
            stateCode={stateData?.stateCode || ""}
            research={researchFor ? researchFor(activeSeat.id) : undefined}
            blindMode={blindMode}
            isRevealed={revealed.has(activeSeat.id)}
            onReveal={() => onReveal(activeSeat.id)}
            onHide={() => onHide(activeSeat.id)}
            verdict={verdicts[activeSeat.id] || null}
            pickId={picks?.[activeSeat.id] || null}
            onVerdict={commitVerdict}
            onOpenDuel={onOpenDuel}
            onShowBudgetOptions={onShowBudgetOptions}
          />

          {doneCount === seats.length && (
            <div className="all-done" data-testid="all-done">
              <div className="all-done-kick">You're done</div>
              <b>You've reviewed all your representatives.</b>
              <p className="all-done-sub">
                Take your verdicts with you — print a scorecard you can bring to
                the ballot box.
              </p>
              <button
                className="all-done-print"
                onClick={onPrint}
                data-testid="all-done-print"
              >
                <span>Print My Scorecard</span>
                <span className="arrow" aria-hidden="true">
                  →
                </span>
              </button>
              <div className="all-done-also">
                One more thing worth seeing —
                <button className="linklike" onClick={onSeeStanding}>
                  where you stand among your neighbors →
                </button>
              </div>
            </div>
          )}

          {onSendChat && (
            <SeatChat
              key={"chat-" + activeSeat.id}
              seat={activeSeat}
              isRevealed={!blindMode || revealed.has(activeSeat.id)}
              userIssues={issuesForLevel(userIssues, activeSeat.level)}
              messages={chatMessages?.[activeSeat.id]}
              errorState={chatTimeouts?.[activeSeat.id]}
              budgetTier={budgetTier}
              onSend={(text) => onSendChat(activeSeat.id, text)}
              onRetry={() => onRetryChat(activeSeat.id)}
              onHandoff={onContinueElsewhere}
              onShowBudgetOptions={onShowBudgetOptions || onContinueElsewhere}
            />
          )}
        </section>

        {/* RIGHT — scorecard */}
        <aside className="ws-ballot">
          <ScorecardPane
            seats={seats}
            verdicts={verdicts}
            picks={picks}
            activeSeatId={activeSeat.id}
            issues={userIssues}
            revealed={revealed}
            blindMode={blindMode}
            onSelectSeat={selectAndOpen}
            onPrint={onPrint}
            onContinueElsewhere={onContinueElsewhere}
            onEditIssues={onEditIssues}
          />
        </aside>
      </div>
      <AppFooter compact />
    </div>
  );
}
