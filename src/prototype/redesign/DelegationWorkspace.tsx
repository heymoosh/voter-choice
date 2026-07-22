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

import React, { useState } from "react";
import { AppNav, AppFooter, useI18n, escapeHtml } from "../VoterChoiceApp";
import { RepCard } from "./RepCard";
import { SeatChat } from "./SeatChat";
import { IssueDeltaBanner } from "./IssueDeltaBanner";
import { DelegationOverview } from "./DelegationOverview";
import { RosterFeedbackWidget } from "./RosterFeedback";
import { PolisInvitePanel } from "./PolisEntry";
import { issuesForLevel, issuesForSeatCard } from "./delegationData";
import { formatShortDate } from "../../lib/eligibility";

function tierIntro(section, { t }) {
  const tr = t || ((k) => k);
  // lvl backs the single jurisdiction badge on the seat-tier header (canvas
  // screens-results.jsx/screens-delegation.jsx res-tier's ".lvl" pill —
  // DECISIONS.md's "Remove Fed/Both/State tags" note: the redesign drops
  // the noisy per-issue tags; "only a single jurisdiction tag remains on
  // the seat tier header"). The canvas pill is single-tone regardless of
  // level, so .lvl-tag (below) doesn't vary style by jurisdiction either —
  // only the label text changes.
  const TIERS = {
    "Washington — Federal": {
      lvl: tr("scorecard.levelFederal"),
      title: tr("scorecard.tierFedTitle"),
      what: () => (
        <span
          dangerouslySetInnerHTML={{ __html: tr("scorecard.tierFedWhat") }}
        />
      ),
    },
    "State legislature — State": {
      lvl: tr("scorecard.levelState"),
      title: tr("scorecard.tierStatTitle"),
      what: () => <>{tr("scorecard.tierStatWhat")}</>,
    },
    "Statewide — Executive": {
      lvl: tr("scorecard.levelExecutive"),
      title: tr("scorecard.tierExecTitle"),
      what: () => (
        <span
          dangerouslySetInnerHTML={{ __html: tr("scorecard.tierExecWhat") }}
        />
      ),
    },
  };
  return TIERS[section] || TIERS["Washington — Federal"];
}

/* ---- Workspace ---- */
export function DelegationWorkspace({
  address,
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
  issueDeltas,
  onRevisitSeat,
  onDismissDeltas,
  // Navigation layer — 3-card delegation overview vs. the (unchanged) deep
  // single-seat view. Lifted to the caller (not local state) because this
  // component unmounts/remounts across sibling stages (duel, print,
  // standing) — see App2.tsx's seatOverviewOpen.
  overviewOpen,
  onOpenSeat,
  onBackToOverview,
}) {
  const { t } = useI18n();
  // Local, not lifted: purely a display toggle for the polis-invite panel's
  // "No thanks" — dismissing it never touches verdicts/print/handoff, so it
  // doesn't need to survive this component's own unmount/remount cycle.
  const [polisInviteDismissed, setPolisInviteDismissed] = useState(false);

  if (overviewOpen) {
    return (
      <div className="ws-shell delegation">
        <AppNav />
        <DelegationOverview
          seats={seats}
          verdicts={verdicts}
          picks={picks}
          userIssues={userIssues}
          blindMode={blindMode}
          revealed={revealed}
          onOpen={onOpenSeat}
          onPrint={onPrint}
        />
        <div className="rf-affordance-row">
          <RosterFeedbackWidget
            stateCode={stateData?.stateCode}
            contextLabel="delegation-overview"
          />
        </div>
        <AppFooter compact />
      </div>
    );
  }

  const activeSeat = seats.find((s) => s.id === activeSeatId) || seats[0];
  const activeIdx = seats.findIndex((s) => s.id === activeSeat.id);
  const doneCount = Object.keys(verdicts).filter((id) =>
    seats.some((s) => s.id === id),
  ).length;
  const intro = tierIntro(activeSeat.section, { t });
  // "SEAT N OF M" progress eyebrow (canvas res-tier's .tp — screens-delegation.jsx
  // SeatDeepView / screens-results.jsx ResultsScreen). Counted among up-for-
  // election-2026 seats only, matching DelegationOverview's own upSeats filter
  // — this view never shows a not-up-2026 seat as "active", so a seat missing
  // from upSeats here would be a data bug, not a real state to render around.
  const upSeats = seats.filter((s) => s.nextElection?.onBallot2026 !== false);
  const activeSeatOfIdx = upSeats.findIndex((s) => s.id === activeSeat.id) + 1;
  const deadlineRow = (deadlineRows || []).find(
    (r) => r.labelKey === "deadline.registerOnline",
  );
  const electionRow = (deadlineRows || []).find(
    (r) => r.labelKey === "deadline.electionDay",
  );

  function commitVerdict(v) {
    onVerdict(activeSeat.id, v);
    if (!v) return;
    setTimeout(() => {
      // Skip not-up-2026 seats — they have no verdict UI to land on, so
      // auto-advancing into one would strand the flow short of "all done".
      const next = seats.find(
        (s, i) =>
          i > activeIdx &&
          !verdicts[s.id] &&
          s.id !== activeSeat.id &&
          s.nextElection?.onBallot2026 !== false,
      );
      if (next) onSelectSeat(next.id);
    }, 600);
  }

  return (
    // `delegation` scopes redesign-only CSS fixes (redesign2.css) so the
    // legacy workspace's shipped rules stay untouched. `dg-deep` layers the
    // overview's back-control + verdict emphasis onto the reused rail/card
    // chrome below, without touching that chrome itself.
    <div className="ws-shell delegation dg-deep">
      <AppNav />
      <div className="ws-wrap">
        {/* CENTER — active seat */}
        <section className="ws-chat rep-center">
          <header className="head rep-center-head">
            <span className="rep-center-head-lab">
              {activeSeat.office} · {activeSeat.districtLabel}
            </span>
          </header>
          {onBackToOverview && (
            <div className="dg-back-row">
              <span
                className="rc-back"
                onClick={onBackToOverview}
                role="button"
                tabIndex={0}
                data-testid="back-to-overview"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onBackToOverview();
                  }
                }}
              >
                {t("delegationOverview.backToOverview")}
              </span>
            </div>
          )}
          <div className="tier-intro">
            {activeSeatOfIdx > 0 && (
              <span className="ti-place">
                {t("scorecard.seatOfTotal", {
                  n: activeSeatOfIdx,
                  total: upSeats.length,
                })}
              </span>
            )}
            <div className="ti-copy">
              <h2>
                {intro.title}
                <span className="lvl-tag">{intro.lvl}</span>
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
            userIssues={issuesForSeatCard(userIssues, activeSeat)}
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
            onEditIssues={onEditIssues}
          />

          {/* upSeats.length, not seats.length — a not-up-2026 seat can never
              carry a verdict, so it must not sit in the "all done" denominator. */}
          {doneCount === upSeats.length && (
            <div className="all-done" data-testid="all-done">
              <div className="all-done-kick">{t("scorecard.allDoneKick")}</div>
              <b>{t("scorecard.allDoneHeadline")}</b>
              <p className="all-done-sub">
                {t("scorecard.allDoneSub", { n: doneCount })}
              </p>
              <div className="all-done-actions">
                <button
                  className="all-done-print"
                  onClick={onPrint}
                  data-testid="all-done-print"
                >
                  <span>{t("scorecard.allDonePrintBtn")}</span>
                  <span className="arrow" aria-hidden="true">
                    →
                  </span>
                </button>
                <button
                  className="all-done-handoff"
                  onClick={onContinueElsewhere}
                  data-testid="all-done-handoff"
                >
                  <span>{t("repCard.allDoneHandoffBtn")}</span>
                  <span className="ic" aria-hidden="true">
                    ↗
                  </span>
                </button>
              </div>
              {deadlineRow && (
                <div className="all-done-deadline">
                  <span
                    dangerouslySetInnerHTML={{
                      __html:
                        t("repCard.allDoneDeadlineIntro", {
                          date: escapeHtml(formatShortDate(deadlineRow.date)),
                        }) +
                        (electionRow
                          ? t("repCard.allDoneDeadlineElection", {
                              date: escapeHtml(
                                formatShortDate(electionRow.date),
                              ),
                            })
                          : "."),
                    }}
                  />
                  {activeSeat.eligibility?.sourceUrl && (
                    <div className="src">
                      <a
                        href={activeSeat.eligibility.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t("repCard.allDoneDeadlineSource", {
                          label: activeSeat.eligibility.sourceLabel,
                        })}
                      </a>
                    </div>
                  )}
                </div>
              )}
              {!polisInviteDismissed && (
                <PolisInvitePanel
                  onSeeStanding={onSeeStanding}
                  onSkip={() => setPolisInviteDismissed(true)}
                />
              )}
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
      </div>
      <div className="rf-affordance-row">
        <RosterFeedbackWidget
          stateCode={stateData?.stateCode}
          office={activeSeat.office}
          district={activeSeat.districtLabel}
          contextLabel="delegation-workspace"
        />
      </div>
      <AppFooter compact />
    </div>
  );
}
