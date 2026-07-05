/* ====================================================
   VOTER CHOICE · 2026 redesign — DelegationWorkspace
   ====================================================
   Same 3-pane shell as WorkspaceView (ws-rail / ws-chat /
   ws-ballot — all responsive behavior inherited from
   prototype.css). Changes:
     - rail lists SEATS grouped by section (Washington / Austin /
       Statewide) instead of races; priorities get [Δ] level tags
     - center shows the active seat's RepCard under a tier intro
     - right pane is the live SCORECARD (BallotPane evolved)
   ==================================================== */

const { useState: useStateW, useEffect: useEffectW } = React;

const TIER_INTRO = {
  "Washington — Federal": {
    place: "WASHINGTON",
    title: "Your seat at the national table",
    what: () => (
      <>
        Three people who write <b>federal</b> law — and answer for it on
        roll-call votes. Of your priorities, Washington decides{" "}
        <b>
          {issuesForLevel2("federal")
            .filter((i) => i.level === "federal")
            .map((i) => i.interpretation)
            .join(" and ")}
        </b>
        .
      </>
    ),
  },
  "Austin — State": {
    place: "AUSTIN",
    title: "Closer to home",
    what: () => (
      <>
        Your state legislature decides what Washington doesn't — schools, the
        grid, and <i>since 2022, abortion access</i>. Of your priorities, Austin
        holds the pen on{" "}
        <b>
          {issuesForLevel2("state")
            .filter((i) => i.level === "state")
            .map((i) => i.interpretation)
            .join(" and ")}
        </b>
        .
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

function visibleSeats(scope) {
  return scope === "fed"
    ? DELEGATION.filter((s) => s.section === "Washington — Federal")
    : DELEGATION;
}

/* ---- Scorecard pane (BallotPaneInner evolved) ---- */
function ScorecardPane({
  seats,
  verdicts,
  activeSeatId,
  address,
  issues,
  onSelectSeat,
  onPrint,
  onSaveProfile,
  onContinueElsewhere,
  onSeeStanding,
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
          {address || "—"} · Precinct {POLLING_INFO.precinct}
        </address>
      </div>

      <div className="b-issues-edit">
        <div className="b-issues-head">
          <span className="b-issues-lab">Your issues</span>
        </div>
        <ol className="b-issues-list">
          {issues.map((iss, i) => (
            <li key={i}>
              <span className="n">{i + 1}</span>
              {iss.interpretation}
              <span className={"lvl-tag " + iss.level}>
                {iss.level === "federal"
                  ? "FED"
                  : iss.level === "state"
                    ? "STATE"
                    : "BOTH"}
              </span>
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
                          {s.candidate.name} —{" "}
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
                    {v && <div className="why">{s.nextElection.label}</div>}
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
          <i style={{ background: "oklch(0.58 0.10 160)" }}></i>
          <i style={{ background: "oklch(0.60 0.10 90)" }}></i>
          <i style={{ background: "oklch(0.58 0.11 40)" }}></i>
          <i style={{ background: "oklch(0.55 0.10 280)" }}></i>
          <i style={{ background: "var(--gold)" }}></i>
        </div>
        <h4>See where you stand</h4>
        <p>
          Your priorities, mapped against {POLIS2.scopes[0].sampleSize}{" "}
          neighbors in {POLIS2.scopes[0].label} — grouped by what they care
          about, not party. You overlap more than the noise suggests.
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
        <button onClick={onSaveProfile}>
          <span>Save my voting plan (.txt)</span>
          <span className="arrow">↓</span>
        </button>
        <small className="b-foot-note">
          Your issues and verdicts — no personal info collected.
        </small>
        <button onClick={onContinueElsewhere}>
          <span>Continue in another chatbot</span>
          <span className="arrow">↗</span>
        </button>
      </div>
    </>
  );
}

/* ---- Workspace ---- */
function DelegationWorkspace({
  address,
  scope,
  blindMode,
  verdicts,
  activeSeatId,
  revealed,
  onReveal,
  onHide,
  onVerdict,
  onSelectSeat,
  onPrint,
  onSeeStanding,
}) {
  const seats = visibleSeats(scope);
  const activeSeat = seats.find((s) => s.id === activeSeatId) || seats[0];
  const activeIdx = seats.findIndex((s) => s.id === activeSeat.id);
  const doneCount = Object.keys(verdicts).filter((id) =>
    seats.some((s) => s.id === id),
  ).length;
  const progressPct = Math.round((doneCount / seats.length) * 100);
  const intro = TIER_INTRO[activeSeat.section];

  /* Mobile: same contract as the shipped WorkspaceView — the center pane
     is hidden <768px until a row is tapped, then opens as a fixed overlay
     with a back control. */
  const [mobileChatOpen, setMobileChatOpen] = useStateW(false);
  useEffectW(() => {
    setMobileChatOpen(false);
  }, [scope]);
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
    <div className="ws-shell">
      <AppNav />
      <PollingStatusBar
        pollingInfo={POLLING_INFO}
        stateData={STATE_ELECTION_DATA}
        rows={getDeadlineRows()}
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
            </div>
            <ol>
              {USER_ISSUES2.map((iss) => (
                <li key={iss.canonicalIssue}>
                  {iss.interpretation}
                  <span className={"lvl-tag " + iss.level}>
                    {iss.level === "federal"
                      ? "FED"
                      : iss.level === "state"
                        ? "STATE"
                        : "BOTH"}
                  </span>
                </li>
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
                        : s.candidate.name.split(" ").pop() +
                          " · " +
                          s.office.replace(/^(U\.S\.|Texas)\s+/, "")}
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

          <RepCard
            key={activeSeat.id}
            seat={activeSeat}
            blindMode={blindMode}
            isRevealed={revealed.has(activeSeat.id)}
            onReveal={() => onReveal(activeSeat.id)}
            onHide={() => onHide(activeSeat.id)}
            verdict={verdicts[activeSeat.id] || null}
            onVerdict={commitVerdict}
          />

          {doneCount === seats.length && (
            <div className="all-done">
              <b>That's your whole delegation.</b> One more thing worth seeing —
              <button className="linklike" onClick={onSeeStanding}>
                where you stand among your neighbors →
              </button>
            </div>
          )}
        </section>

        {/* RIGHT — scorecard */}
        <aside className="ws-ballot">
          <ScorecardPane
            seats={seats}
            verdicts={verdicts}
            activeSeatId={activeSeat.id}
            address={address}
            issues={USER_ISSUES2}
            onSelectSeat={selectAndOpen}
            onPrint={onPrint}
            onSaveProfile={() =>
              alert(
                "Stub: downloads your issues + verdicts as .txt (repo: downloadProfileAsText)",
              )
            }
            onContinueElsewhere={() =>
              alert(
                "Stub: handoff prompt → Claude / ChatGPT / Gemini / Grok (repo: HandoffPackage)",
              )
            }
            onSeeStanding={onSeeStanding}
          />
        </aside>
      </div>
    </div>
  );
}

Object.assign(window, { DelegationWorkspace, ScorecardPane });
