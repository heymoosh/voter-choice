/* ====================================================
   VOTER CHOICE · 2026 redesign — RepCard
   ====================================================
   Thin wrapper, same pattern as CandidateCard (which it maps
   beside in the repo as src/components/RepCard.tsx):

     CandidateCardHeader   → REUSED (blind mode built in)
     AttendanceBand2       → NEW [Δ] (GovTrack missed-votes %)
     AlignmentScoreBanner  → REUSED (drilldown + narratives intact)
     ResearchedPositions   → NEW (web_search positions for executives)
     Money trail disclose  → REUSED markup contract + FunderBars
     EligibilityNote2      → NEW [Δ] (evolved PartyGate, per-seat)
     Verdict footer        → evolves .cv2-actions Pick → Keep/Replace
   ==================================================== */

const { useState: useStateR } = React;

/* ---- Attendance band [Δ] — federal only; honest omission at state level ---- */
function AttendanceBand2({ attendance, researched }) {
  if (researched) return null;
  if (!attendance) {
    return (
      <div className="att-band na">
        <span className="txt">Attendance isn't reliably tracked at the state level — we don't fake it.</span>
      </div>
    );
  }
  const bandLabel = { good: "Rarely misses", mid: "About average", bad: "Misses a lot" }[attendance.band];
  return (
    <div className="att-band">
      <span className="txt">
        Attendance — missed <b>{attendance.missedPct}%</b> of {attendance.of}.
      </span>
      <span className={"att-chip " + attendance.band}>{bandLabel}</span>
      <a className="att-src cv2-evidence-link" href="https://www.govtrack.us/" target="_blank" rel="noopener noreferrer">GovTrack ↗</a>
    </div>
  );
}

/* ---- Researched positions — executives have no roll calls.
   Renders with the SAME structure as AlignmentScoreBanner +
   AlignmentDrilldown so the governor card is visually identical to a
   voting card: issue rows with a stance badge (shipped .cv2-ws-badge /
   .cv2-ws-conf) where the % column sits, expanding to a cited source
   styled as a .cv2-vote card. ---- */
function ResearchedPositionRow({ issue, pos }) {
  const [open, setOpen] = useStateR(false);
  const supports = pos.resolvedStance === "in_favor";
  const opposes = pos.resolvedStance === "opposed";
  const verb = supports ? "SUPPORTS" : opposes ? "OPPOSES" : "MIXED";
  const badgeColor = supports ? "var(--civic)" : opposes ? "var(--vote-red)" : "var(--gold)";
  const voteCls = supports ? "yea" : opposes ? "nay" : "other";
  const hasEvidence = (pos.evidence || []).length > 0;
  return (
    <div className={"cv2-iss-row" + (open ? " open" : "") + (hasEvidence ? " has-drill" : "")}>
      <button className="cv2-iss-head" onClick={hasEvidence ? () => setOpen(!open) : undefined} aria-expanded={open}>
        <div className="topic">
          <div className="name">{issue.interpretation}</div>
          <div className="meta">From public statements{hasEvidence ? (open ? " · source shown below" : " · tap for the cited source") : " · no source curated"}</div>
        </div>
        <div className="cv2-ws-col">
          <span className="cv2-ws-badge" style={{ background: badgeColor }}>{verb}</span>
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
                    <span className="ttl">{(verb.charAt(0) + verb.slice(1).toLowerCase())} {issue.interpretation.toLowerCase()}</span>
                  </div>
                  <div className={"vote-badge " + voteCls}>{verb}</div>
                </div>
                <p className="cv2-vote-narr">“{e.summary}”</p>
                <div className="cv2-vote-cite">
                  <span className="src-chip">web search · {pos.confidence} confidence</span>
                  <a href={e.url} className="src-link" target="_blank" rel="noopener noreferrer">View source →</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResearchedPositions({ positions, userIssues }) {
  const rows = (userIssues || [])
    .map((iss) => {
      const pos = positions.find((p) => p.canonicalIssue === iss.canonicalIssue);
      return pos ? { issue: iss, pos } : null;
    })
    .filter(Boolean);
  return (
    <div className="cv2-issues">
      <div className="cv2-block-head">
        <div className="lab">Where they stand on your issues</div>
        <div className="overall"><span className="rp-src-note">researched &amp; cited — no roll-call record</span></div>
      </div>
      {rows.map(({ issue, pos }) => <ResearchedPositionRow key={issue.canonicalIssue} issue={issue} pos={pos} />)}
    </div>
  );
}

/* ---- Eligibility note [Δ] — the evolved PartyGate, attached to the seat ---- */
function EligibilityNote2({ e }) {
  if (!e) return null;
  const res = (typeof STATE_ELECTION_DATA !== "undefined" && STATE_ELECTION_DATA.resources) || {};
  const srcUrl = res.voterIdInfo || res.stateElectionWebsite || "https://www.votetexas.gov/";
  return (
    <div className={"elig " + (e.severity || "info")}>
      <div className="elig-when">
        <span className="lab">{e.nextLabel}</span>
        <span className="date">{e.date}</span>
      </div>
      <div className="elig-rule" dangerouslySetInnerHTML={{ __html: e.ruleHtml }} />
      {e.todo && (
        <div className="elig-todo">→ <a href={e.todo.href} onClick={(ev) => ev.preventDefault()}>{e.todo.text}</a> so you're not turned away at the polls.</div>
      )}
      <a className="elig-src cv2-evidence-link" href={srcUrl} target="_blank" rel="noopener noreferrer">Source: Texas Secretary of State · Election Code §172.087 ↗</a>
    </div>
  );
}

/* ---- Per-card source transparency: every datum on the card traces to one. ---- */
const SOURCE_URLS = {
  "GovTrack": "https://www.govtrack.us/",
  "Texas Legislature Online": "https://capitol.texas.gov/",
  "FEC bulk filings": "https://www.fec.gov/data/",
  "Texas Ethics Commission": "https://www.ethics.state.tx.us/",
  "Texas Secretary of State": "https://www.votetexas.gov/",
  "Web search": "#",
};
function CardSources({ seat }) {
  const cand = seat.candidate;
  const recordSrc = seat.level === "federal" ? "GovTrack" : "Texas Legislature Online";
  const items = seat.researched
    ? [
        { n: "Web search", d: "positions, cited per claim" },
        { n: cand.donorSource.name, d: "funding" },
        { n: "Texas Secretary of State", d: "election rules" },
      ]
    : [
        { n: recordSrc, d: "voting record" + (seat.attendance ? " & attendance" : "") },
        { n: cand.donorSource.name, d: "funding" },
        { n: "Texas Secretary of State", d: "election rules" },
      ];
  return (
    <div className="card-sources">
      <span className="lab">Sources</span>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="sep">·</span>}
          <span><a href={SOURCE_URLS[it.n] || "#"} target="_blank" rel="noopener noreferrer">{it.n}</a> ({it.d})</span>
        </React.Fragment>
      ))}
    </div>
  );
}

/* ---- RepCard ---- */
function RepCard({ seat, blindMode, isRevealed, onReveal, onHide, verdict, onVerdict }) {
  const [expandedIssue, setExpandedIssue] = useStateR(null);
  const [moneyOpen, setMoneyOpen] = useStateR(() =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 901px)").matches);

  const cand = seat.candidate;
  const userIssues = issuesForLevel2(seat.level);
  const blind = blindMode && !isRevealed;
  const party = PARTY_META2[seat.partyName] || { name: seat.partyName, code: "?", pipClass: "ind" };
  const anonCtx = { blindMode: blind, realLastName: cand.name?.split(" ").pop(), alias: seat.blindLabel };
  const last = cand.name.split(" ").pop();

  return (
    <div className="cv2-card rep-card">
      {/* Seat strip — office + district + when you can act on it. */}
      <div className="seat-strip">
        <span className="seat-office">{seat.office}</span>
        <span className="seat-district">{seat.districtLabel}</span>
        <span className={"seat-next " + (seat.nextElection.onBallot2026 ? "up" : "")}>{seat.nextElection.label}</span>
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

      <AttendanceBand2 attendance={seat.attendance} researched={seat.researched} />

      {seat.researched ? (
        <ResearchedPositions positions={seat.positions} userIssues={userIssues} />
      ) : (
        <AlignmentScoreBanner
          candidate={cand}
          alignmentEntry={seat.alignmentEntry}
          userIssues={userIssues}
          expandedIssue={expandedIssue}
          onToggleIssue={(ci) => setExpandedIssue(expandedIssue === ci ? null : ci)}
          anonCtx={anonCtx}
        />
      )}

      {/* Money trail — same progressive-disclosure contract as CandidateCard. */}
      <div className={"cv2-disclose " + (moneyOpen ? "open" : "")}>
        <button
          className="cv2-disclose-toggle"
          aria-expanded={moneyOpen}
          aria-controls={`mt2-${cand.id}`}
          onClick={() => setMoneyOpen((v) => !v)}
        >
          <span className="cv2-disclose-lab">
            <span className="cv2-disclose-eyebrow">Funding &amp; influence</span>
            <span className="cv2-disclose-title">Money trail</span>
            <span className="cv2-disclose-summary">
              {typeof cand.totalRaised === "number" && (
                <span className="cv2-disclose-stat"><b>{formatDollars(cand.totalRaised)}</b> raised</span>
              )}
              {cand.fundingMix && (
                <span className="cv2-disclose-mix">
                  {cand.fundingMix.small}% small donors · {cand.fundingMix.large}% large donors · {cand.fundingMix.pac}% PACs
                </span>
              )}
            </span>
          </span>
          <span className="cv2-disclose-chev" aria-hidden="true">
            {moneyOpen ? <>Hide <span className="cv2-disclose-arrow">▴</span></> : <>Show details <span className="cv2-disclose-arrow">▾</span></>}
          </span>
        </button>
        <div id={`mt2-${cand.id}`} className="cv2-disclose-body" hidden={!moneyOpen}>
          <FunderBars
            donorCoalition={cand.donorCoalition}
            totalRaised={cand.totalRaised}
            donorSource={cand.donorSource}
            fundingMix={cand.fundingMix}
            userIssues={userIssues}
          />
        </div>
      </div>

      <EligibilityNote2 e={seat.eligibility} />

      {/* Verdict — assessment, not selection. Rides to the scorecard + print.
         .ck is the shipped bordered checkbox; the border IS the box, so we
         leave it empty when unselected and fill it with a mark when set. */}
      <div className="cv2-actions verdicts">
        <button
          className={"pick " + (verdict === "keep" ? "picked" : "")}
          onClick={() => onVerdict(verdict === "keep" ? null : "keep")}
        >
          <span className="ck">{verdict === "keep" ? "✓" : ""}</span>
          <span>{verdict === "keep" ? "Worth keeping — undo" : `Worth keeping${blind ? "" : " · " + last}`}</span>
        </button>
        <button
          className={"pick replace " + (verdict === "replace" ? "picked-replace" : "")}
          onClick={() => onVerdict(verdict === "replace" ? null : "replace")}
        >
          <span className="ck">{verdict === "replace" ? "✕" : ""}</span>
          <span>{verdict === "replace" ? "Time to replace — undo" : "Time to replace"}</span>
        </button>
      </div>

      <CardSources seat={seat} />
    </div>
  );
}

Object.assign(window, { RepCard, AttendanceBand2, EligibilityNote2, ResearchedPositions });
