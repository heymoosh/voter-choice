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
import { AppNav, AppFooter, useI18n } from "../VoterChoiceApp";
import { RepCard } from "./RepCard";
import { SeatChat } from "./SeatChat";
import { IssueDeltaBanner } from "./IssueDeltaBanner";
import { DelegationOverview } from "./DelegationOverview";
import { RosterFeedbackWidget } from "./RosterFeedback";
import { issuesForLevel, issuesForSeatCard } from "./delegationData";
import { isSelectableReplacement } from "../../lib/rosterProvenance";

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

/* ---- Scorecard pane (BallotPaneInner evolved) ---- */
export function ScorecardPane({
  seats,
  verdicts,
  picks,
  activeSeatId,
  address,
  issues,
  precinct,
  onSelectSeat,
  onPrint,
  onContinueElsewhere,
  onEditIssues,
}) {
  const { t } = useI18n();
  // Decided-count/total only ever counts seats that CAN be decided — a
  // not-up-2026 seat has no verdict UI, so it must never sit in the
  // denominator (else "N of total decided" gets permanently stuck short).
  const upSeats = seats.filter((s) => s.nextElection?.onBallot2026 !== false);
  const doneCount = Object.keys(verdicts).filter((id) =>
    upSeats.some((s) => s.id === id),
  ).length;
  const canPrint = doneCount > 0;
  const sections = {};
  seats.forEach((s) => {
    (sections[s.section] = sections[s.section] || []).push(s);
  });
  // Lead with a percentage (B): same kept/total roll-up as the print sheet,
  // shown as "% aligned" with the raw count as secondary. Null when there's
  // no scored voting record so the row stays honest (handles total 0 → no NaN).
  const alignFor = (s) => {
    if (s.researched || !s.alignmentEntry?.scores) return null;
    const kept = s.alignmentEntry.scores.reduce(
      (n, sc) => n + (sc.kept ?? 0),
      0,
    );
    const total = s.alignmentEntry.scores.reduce(
      (n, sc) => n + (sc.total ?? 0),
      0,
    );
    if (total === 0) return null;
    return `${Math.round((kept / total) * 100)}% aligned (${kept}/${total} votes)`;
  };

  return (
    <>
      <div className="b-head">
        <div className="row">
          {/* "Your delegation" reuses the overview's own kicker copy
              (DelegationOverview.tsx) — canvas's rail-head title, this
              rail's actual identity being "who you're reviewing," not the
              printable artifact you get at the end. */}
          <h3>{t("delegationOverview.kicker")}</h3>
          <span className="rh-dots">
            {seats.map((s) => (
              <i
                className={
                  s.id === activeSeatId
                    ? "active"
                    : verdicts[s.id]
                      ? "done"
                      : ""
                }
                key={s.id}
              />
            ))}
          </span>
        </div>
        <span className="sub">
          {doneCount}/{upSeats.length} {t("scorecard.decided")}
        </span>
        <address>
          {address || "—"}
          {precinct ? ` · ${t("scorecard.precinct")} ${precinct}` : ""}
        </address>
      </div>

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

      <div className="b-list">
        {Object.entries(sections).map(([section, ss]) => (
          <div key={section}>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "var(--ink-3)",
                padding: "14px 0 4px",
              }}
            >
              {section}
            </div>
            {ss.map((s) => {
              const v = verdicts[s.id];
              const isActive = s.id === activeSeatId;
              const notUp2026 = s.nextElection?.onBallot2026 === false;
              return (
                <div
                  key={s.id}
                  className={
                    "b-row " +
                    (v ? "done " : "pending ") +
                    (isActive ? "active " : "") +
                    (notUp2026 ? "not-up-2026 " : "")
                  }
                  onClick={() => onSelectSeat(s.id)}
                >
                  <div className="ck" />
                  <div>
                    <div className="race">
                      {s.office} · {s.districtLabel}
                    </div>
                    {notUp2026 && (
                      <div className="b-not-up">{t("repCard.notUp2026")}</div>
                    )}
                    <div className="pick">
                      {v ? (
                        <>
                          {s.candidate?.name ?? s.blindLabel} —{" "}
                          <span className={"verdict-chip " + v}>
                            {v === "keep"
                              ? t("scorecard.worthKeeping")
                              : t("scorecard.timeToReplace")}
                          </span>
                          {v === "replace" &&
                            (() => {
                              const pick = (s.challengers || []).find(
                                (c) =>
                                  c.id === picks?.[s.id] &&
                                  isSelectableReplacement(c),
                              );
                              return pick ? (
                                <span className="pick-successor">
                                  {" → "}
                                  {pick.name}
                                </span>
                              ) : null;
                            })()}
                        </>
                      ) : notUp2026 ? (
                        t("scorecard.recordOnly", {
                          label:
                            s.nextElection?.label || t("repCard.notUp2026"),
                        })
                      ) : isActive ? (
                        t("scorecard.reviewingNow")
                      ) : (
                        t("scorecard.notYetReviewed")
                      )}
                    </div>
                    {v && (alignFor(s) || s.nextElection) && (
                      <div className="why">
                        {[alignFor(s), s.nextElection?.label]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="b-foot">
        <button className="primary" disabled={!canPrint} onClick={onPrint}>
          <span>{t("scorecard.printBtn")}</span>
          <span className="arrow">→</span>
        </button>
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

  /* Mobile: same contract as the shipped WorkspaceView — the center pane
     is hidden <768px until a row is tapped, then opens as a fixed overlay
     with a back control. These hooks must run unconditionally on every
     render: this component doesn't remount when overviewOpen toggles
     (App2.tsx renders it at a stable position with no `key`), so calling
     them after the overviewOpen early-return would violate the Rules of
     Hooks and crash on the very transition this feature depends on. */
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  useEffect(() => {
    setMobileChatOpen(false);
  }, [seats.length]);

  if (overviewOpen) {
    return (
      <div className="ws-shell delegation">
        <AppNav />
        <DelegationOverview
          seats={seats}
          verdicts={verdicts}
          userIssues={userIssues}
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

  function selectAndOpen(seatId) {
    onSelectSeat(seatId);
    setTimeout(() => setMobileChatOpen(true), 0);
  }

  function commitVerdict(v) {
    onVerdict(activeSeat.id, v);
    if (!v) return;
    setMobileChatOpen(false);
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
          />

          {/* upSeats.length, not seats.length — a not-up-2026 seat can never
              carry a verdict, so it must not sit in the "all done" denominator. */}
          {doneCount === upSeats.length && (
            <div className="all-done" data-testid="all-done">
              <div className="all-done-kick">{t("scorecard.allDoneKick")}</div>
              <b>{t("scorecard.allDoneHeadline")}</b>
              <p className="all-done-sub">{t("scorecard.allDoneSub")}</p>
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
              <div className="all-done-also">
                {t("scorecard.allDoneAlsoIntro")}
                <button className="linklike" onClick={onSeeStanding}>
                  {t("scorecard.allDoneSeeStanding")}
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
            address={address}
            issues={userIssues}
            precinct={pollingInfo?.precinct || ""}
            onSelectSeat={selectAndOpen}
            onPrint={onPrint}
            onContinueElsewhere={onContinueElsewhere}
            onEditIssues={onEditIssues}
          />
        </aside>
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
