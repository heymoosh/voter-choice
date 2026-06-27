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
import { AppNav, AppFooter, PollingStatusBar } from "../VoterChoiceApp";
import { RepCard } from "./RepCard";
import { SeatChat } from "./SeatChat";
import { IssueDeltaBanner } from "./IssueDeltaBanner";
import { issuesForLevel } from "./delegationData";

function tierIntro(section, { userIssues, stateName }) {
  const fedIssues = issuesForLevel(userIssues || [], "federal")
    .filter((i) => i.level === "federal")
    .map((i) => i.interpretation);
  const stateIssues = issuesForLevel(userIssues || [], "state")
    .filter((i) => i.level === "state")
    .map((i) => i.interpretation);
  const list = (xs) => xs.join(" and ");

  const TIERS = {
    "Washington — Federal": {
      place: "WASHINGTON",
      title: "Your seat at the national table",
      what: () => (
        <>
          Three people who write <b>federal</b> law — and answer for it on
          roll-call votes.
          {fedIssues.length > 0 && (
            <>
              {" "}
              Of your priorities, Washington decides <b>{list(fedIssues)}</b>.
            </>
          )}
        </>
      ),
    },
    "State legislature — State": {
      place: (stateName || "STATE").toUpperCase(),
      title: "Closer to home",
      what: () => (
        <>
          Your state legislature decides what Washington doesn't — schools,
          infrastructure, and state law.
          {stateIssues.length > 0 && (
            <>
              {" "}
              Of your priorities, your statehouse holds the pen on{" "}
              <b>{list(stateIssues)}</b>.
            </>
          )}
        </>
      ),
    },
    "Statewide — Executive": {
      place: "STATEWIDE",
      title: "Offices that don't take roll-call votes",
      what: () => (
        <>
          A governor signs and vetoes — there's no voting record to score. So we
          research positions and <b>show the receipts</b> instead of faking an
          alignment number.
        </>
      ),
    },
  };
  return TIERS[section] || TIERS["Washington — Federal"];
}

/* ---- Scorecard pane (BallotPaneInner evolved) ---- */
export function ScorecardPane({
  seats,
  verdicts,
  activeSeatId,
  address,
  issues,
  precinct,
  polisPreview,
  onSelectSeat,
  onPrint,
  onContinueElsewhere,
  onSeeStanding,
  onEditIssues,
}) {
  const doneCount = Object.keys(verdicts).filter((id) =>
    seats.some((s) => s.id === id),
  ).length;
  const canPrint = doneCount > 0;
  const sections = {};
  seats.forEach((s) => {
    (sections[s.section] = sections[s.section] || []).push(s);
  });

  return (
    <>
      <div className="b-head">
        <div className="row">
          <h3>Your scorecard</h3>
          <span className="sub">
            {doneCount}/{seats.length} · Draft
          </span>
        </div>
        <address>
          {address || "—"}
          {precinct ? ` · Precinct ${precinct}` : ""}
        </address>
      </div>

      <div className="b-issues-edit">
        <div className="b-issues-head">
          <span className="b-issues-lab">Your issues</span>
          {onEditIssues && (
            <button
              className="b-issues-btn"
              onClick={onEditIssues}
              data-testid="edit-issues-scorecard"
            >
              Edit
            </button>
          )}
        </div>
        <ol className="b-issues-list">
          {issues.map((iss, i) => (
            <li key={i}>
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
              return (
                <div
                  key={s.id}
                  className={
                    "b-row " +
                    (v ? "done " : "pending ") +
                    (isActive ? "active " : "")
                  }
                  onClick={() => onSelectSeat(s.id)}
                >
                  <div className="ck" />
                  <div>
                    <div className="race">
                      {s.office} · {s.districtLabel}
                    </div>
                    <div className="pick">
                      {v ? (
                        <>
                          {s.candidate?.name ?? s.blindLabel} —{" "}
                          <span className={"verdict-chip " + v}>
                            {v === "keep" ? "WORTH KEEPING" : "TIME TO REPLACE"}
                          </span>
                        </>
                      ) : isActive ? (
                        "Reviewing now…"
                      ) : (
                        "Not yet reviewed"
                      )}
                    </div>
                    {v && s.nextElection && (
                      <div className="why">{s.nextElection.label}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="standing-cta">
        <div className="kick">You're not alone</div>
        <div className="dots">
          <i style={{ background: "var(--civic)", opacity: 0.35 }}></i>
          <i style={{ background: "var(--civic)", opacity: 0.55 }}></i>
          <i style={{ background: "var(--civic)", opacity: 0.8 }}></i>
          <i style={{ background: "var(--civic)", opacity: 0.55 }}></i>
          <i style={{ background: "var(--gold)" }}></i>
        </div>
        <h4>See where you stand</h4>
        <p>
          {polisPreview
            ? `Your priorities, mapped against ${polisPreview.sampleSize.toLocaleString("en-US")} people in ${polisPreview.label} — placed by what they care about, not party. You overlap more than the noise suggests.`
            : "Your priorities, mapped against everyone who's finished this — placed by what they care about, not party. You overlap more than the noise suggests."}
        </p>
        <button onClick={onSeeStanding}>
          See where you stand <span aria-hidden="true">→</span>
        </button>
      </div>

      <div className="b-foot">
        <button className="primary" disabled={!canPrint} onClick={onPrint}>
          <span>Print my scorecard (PDF)</span>
          <span className="arrow">→</span>
        </button>
        <button onClick={onContinueElsewhere}>
          <span>Continue in another chatbot</span>
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
  activeSeatId,
  revealed,
  onReveal,
  onHide,
  onVerdict,
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
}) {
  const activeSeat = seats.find((s) => s.id === activeSeatId) || seats[0];
  const activeIdx = seats.findIndex((s) => s.id === activeSeat.id);
  const doneCount = Object.keys(verdicts).filter((id) =>
    seats.some((s) => s.id === id),
  ).length;
  const progressPct = Math.round((doneCount / seats.length) * 100);
  const intro = tierIntro(activeSeat.section, { userIssues, stateName });

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

  const sections = {};
  seats.forEach((s) => {
    (sections[s.section] = sections[s.section] || []).push(s);
  });

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
      <div
        className="ws-wrap"
        data-mobile-chat={mobileChatOpen ? "open" : "closed"}
      >
        {/* LEFT RAIL */}
        <aside className="ws-rail">
          <div className="progress">
            <div className="top">
              <span>Progress</span>
              <span>
                {doneCount} / {seats.length}
              </span>
            </div>
            <div className="big">{progressPct}% reviewed</div>
            <div className="bar">
              <div className="fill" style={{ width: progressPct + "%" }}></div>
            </div>
          </div>

          <div className="priorities">
            <div className="top">
              <span className="lab">Your issues</span>
              {onEditIssues && (
                <button
                  className="linklike"
                  onClick={onEditIssues}
                  data-testid="edit-issues-rail"
                >
                  Edit
                </button>
              )}
            </div>
            <ol>
              {userIssues.map((iss, i) => (
                <li key={iss.canonicalIssue || i}>{iss.interpretation}</li>
              ))}
            </ol>
          </div>

          {Object.entries(sections).map(([section, ss]) => (
            <div key={section}>
              <div className="seclabel">{section}</div>
              <ul className="race-list">
                {ss.map((s) => (
                  <li
                    key={s.id}
                    className={
                      (verdicts[s.id] ? "done " : "") +
                      (s.id === activeSeat.id ? "active" : "")
                    }
                    onClick={() => selectAndOpen(s.id)}
                  >
                    <span className="ind"></span>
                    <span>
                      {blindMode && !revealed.has(s.id)
                        ? s.blindLabel.replace(/^Your /, "")
                        : s.candidate
                          ? s.candidate.name.split(" ").pop() +
                            " · " +
                            s.office.replace(/^U\.S\.\s+/, "")
                          : s.blindLabel.replace(/^Your /, "")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        {/* CENTER — active seat */}
        <section className="ws-chat rep-center">
          <header className="head rep-center-head">
            <button
              className="ws-mobile-back ws-mobile-back-hide-desktop"
              onClick={() => setMobileChatOpen(false)}
              aria-label="Back to scorecard"
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
              <h2>{intro.title}</h2>
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
            onVerdict={commitVerdict}
            onShowBudgetOptions={onShowBudgetOptions}
          />

          {doneCount === seats.length && (
            <div className="all-done">
              <b>That's your whole delegation.</b> One more thing worth seeing —
              <button className="linklike" onClick={onSeeStanding}>
                where you stand among your neighbors →
              </button>
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
            activeSeatId={activeSeat.id}
            address={address}
            issues={userIssues}
            precinct={pollingInfo?.precinct || ""}
            polisPreview={polisPreview}
            onSelectSeat={selectAndOpen}
            onPrint={onPrint}
            onContinueElsewhere={onContinueElsewhere}
            onSeeStanding={onSeeStanding}
            onEditIssues={onEditIssues}
          />
        </aside>
      </div>
      <AppFooter compact />
    </div>
  );
}
