/* ====================================================
   VOTER CHOICE · 2026 redesign — ScorecardPrintView
   ====================================================
   PrintView evolved (maps to src/components/PrintBallot.tsx).
   The polling-place header, voter-meta strip (address / districts /
   accepted IDs / early voting) and @media print behavior are the
   SHIPPED ones — only the body rows change: verdicts on your
   delegation instead of ballot picks.
   ==================================================== */

function ScorecardPrintView({ address, scope, verdicts, onBack }) {
  const seats = visibleSeats(scope);
  const sections = {};
  seats.forEach((s) => {
    if (!verdicts[s.id]) return;
    (sections[s.section] = sections[s.section] || []).push(s);
  });
  const unreviewed = seats.filter((s) => !verdicts[s.id]);
  const fracFor = (s) => {
    if (s.researched || !s.alignmentEntry?.scores) return null;
    const kept = s.alignmentEntry.scores.reduce((n, sc) => n + sc.kept, 0);
    const total = s.alignmentEntry.scores.reduce((n, sc) => n + sc.total, 0);
    return `${kept}/${total} votes matched you`;
  };

  return (
    <>
      <AppNav onBrandClick={onBack} />
      <div className="print-wrap">
        <div className="print-header">
          <h2>Your printable scorecard</h2>
          <div className="actions">
            <button onClick={onBack}>← Back to scorecard</button>
            <button className="primary" onClick={() => window.print()}>
              Print / save as PDF
            </button>
          </div>
        </div>

        <div className="print-sheet">
          <header className="ph-head">
            <div className="l">
              My Scorecard ·{" "}
              {new Date(
                STATE_ELECTION_DATA.elections[0].date + "T00:00:00",
              ).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              <small>Voter Choice · voterchoice.app</small>
            </div>
            <div className="r">
              <b>Precinct {POLLING_INFO.precinct}</b>
              {POLLING_INFO.name}
              <br />
              {POLLING_INFO.address}
              <br />
              Polls {POLLING_INFO.hours}
            </div>
          </header>

          <div className="voter-meta">
            <div className="cell">
              <div className="k">Address</div>
              <div className="v" style={{ fontSize: "12px" }}>
                {address}
              </div>
            </div>
            <div className="cell">
              <div className="k">Your districts</div>
              <div className="v" style={{ fontSize: "12px" }}>
                U.S. House TX-21 · TX Senate SD-14 · TX House HD-47
              </div>
            </div>
            <div className="cell cell-bring">
              <div className="k">Bring (any one)</div>
              <ul className="v print-id-list">
                {STATE_ELECTION_DATA.votingRules.acceptedIds.map((id) => (
                  <li key={id}>{id}</li>
                ))}
              </ul>
            </div>
            <div className="cell">
              <div className="k">Early voting</div>
              <div className="v">
                {new Date(
                  STATE_ELECTION_DATA.earlyVoting.startDate + "T00:00:00",
                ).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}{" "}
                –{" "}
                {new Date(
                  STATE_ELECTION_DATA.earlyVoting.endDate + "T00:00:00",
                ).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>

          <div className="ballot-list">
            {Object.entries(sections).map(([section, ss]) => (
              <div className="ballot-group" key={section}>
                <div className="gtitle">{section}</div>
                {ss.map((s) => {
                  const v = verdicts[s.id];
                  const frac = fracFor(s);
                  return (
                    <div className="br checked" key={s.id}>
                      <div className="bx"></div>
                      <div>
                        <div className="race-name">
                          {s.office} · {s.districtLabel}
                        </div>
                        <div className="pick-name">
                          {s.candidate.name}
                          <span className={"party verdict-print " + v}>
                            {v === "keep" ? "WORTH KEEPING" : "TIME TO REPLACE"}
                          </span>
                        </div>
                        <div className="my-note">
                          {frac ? frac + " · " : ""}
                          {s.nextElection.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {unreviewed.length > 0 && (
              <div className="ballot-group">
                <div className="gtitle" style={{ color: "var(--ink-3)" }}>
                  Not yet reviewed
                </div>
                {unreviewed.map((s) => (
                  <div className="br" key={s.id}>
                    <div className="bx"></div>
                    <div>
                      <div className="race-name">
                        {s.office} · {s.districtLabel}
                      </div>
                      <div
                        className="pick-name"
                        style={{
                          color: "var(--ink-3)",
                          fontStyle: "italic",
                          fontWeight: 400,
                        }}
                      >
                        Review before{" "}
                        {s.nextElection.label.charAt(0).toLowerCase() +
                          s.nextElection.label.slice(1)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="ballot-group" style={{ marginBottom: 0 }}>
              <div className="gtitle">Judged against your issues</div>
              <div
                style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}
              >
                {USER_ISSUES2.map((iss, i) => (
                  <div key={iss.canonicalIssue}>
                    {i + 1}. {iss.interpretation}{" "}
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        color: "var(--ink-3)",
                      }}
                    >
                      ({iss.level === "both" ? "federal + state" : iss.level})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <footer className="print-foot">
            <div className="l">
              <b>Built with Voter Choice</b>
              Free · non-partisan · voterchoice.app
            </div>
          </footer>
          <div className="print-serial">
            <span>
              Generated{" "}
              {new Date().toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
            <span>
              Ref · VC-{Math.random().toString(36).slice(2, 8).toUpperCase()}
            </span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { ScorecardPrintView });
