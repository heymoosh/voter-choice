/* ====================================================
   §8 · DELEGATION OVERVIEW → DRILL-DOWN  (Muxin's Keystone follow-up)
   ----------------------------------------------------
   Resolves the parity gap Code flagged: the canvas established the
   3-card CandidateParity overview, but the repo (DelegationWorkspace)
   only ever renders one seat at a time. Muxin's direction (2026-07-07):
   use the 3-card overview as the ENTRY POINT, and clicking into a card
   opens the deeper single-seat review.

   RESOLVED interaction (recommended, confirmed this session):
     - The overview is the new entry point — every seat scored, at once.
     - Clicking a card opens the EXISTING deep single-seat review
       (same .rcard + rail surface as the results screen) UNCHANGED —
       no new deep-dive design.
     - Two affordances layered on: a "← All seats" back control in the
       context strip, and the seat-strip rail STAYS as in-context lateral
       nav (jump seat→seat without returning to the overview).
     - Non-2026 seats stay greyed + excluded (honors decision 97eda1e0).
     - Verdicts ride along: decide a seat and both the overview and the
       rail update.
   Data is illustrative and consistent with CandidateParity / ResultsScreen.
   ==================================================== */
const { useState: useStateDg } = React;

/* 3-way tone for the overview cards (matches CandidateParity) */
function dg3(v) { return v == null ? "na" : v >= 67 ? "good" : v >= 34 ? "mid" : "bad"; }
/* 2-way tone for the deep align-band (matches RepCardFull: good / bad) */
function dg2(v) { return v >= 60 ? "good" : "bad"; }

function DgProv({ basis, conf }) {
  return basis === "roll-call"
    ? <span className="prov rollcall">Roll-call record</span>
    : <span className="prov researched">Researched · cited{conf ? " · " + conf : ""}</span>;
}

/* the delegation — 3 seats up in 2026, scored; plus one non-2026 seat (excluded) */
const DG_SEATS = [
  {
    id: "house", ri: "HR", office: "U.S. House · TX-21", tier: "Your U.S. House seat", lvl: "FEDERAL",
    blurb: "One representative for TX-21. They vote on federal law — healthcare, housing, spending. Here's their record against your issues.",
    basis: "roll-call", align: 58, frac: "7 / 12 key votes", terms: "Your Representative · 4 terms",
    raised: "$4.2M", mix: { small: 15, large: 39, pac: 46 }, top: "Energy, Real estate, Finance",
    issues: [{ k: "Healthcare access", v: 75, f: "3/4" }, { k: "Housing affordability", v: 40, f: "2/5" }, { k: "Government accountability", v: 33, f: "2/3" }],
  },
  {
    id: "senate", ri: "SE", office: "U.S. Senate · Class II", tier: "Your U.S. Senate seat", lvl: "FEDERAL",
    blurb: "One of your two senators. Six-year terms — this seat is up in 2026. Their record against your issues:",
    basis: "roll-call", align: 82, frac: "18 / 22 key votes", terms: "Senior Senator · since 2015",
    raised: "$22.9M", mix: { small: 43, large: 41, pac: 16 }, top: "Health prof., Education, Tech",
    issues: [{ k: "Healthcare access", v: 88, f: "7/8" }, { k: "Housing affordability", v: 80, f: "4/5" }, { k: "Government accountability", v: 78, f: "7/9" }],
  },
  {
    id: "prez", ri: "PR", office: "U.S. President", tier: "The Presidency", lvl: "EXECUTIVE",
    blurb: "The executive has no roll-call record, so this score is built from researched, cited public positions — never blended with a voting record.",
    basis: "researched", conf: "high", align: 47, frac: "researched positions", terms: "Executive — no roll-call record",
    raised: "$210M", mix: { small: 38, large: 29, pac: 33 }, top: "Finance, Tech, Real estate",
    issues: [{ k: "Healthcare access", v: 50, f: "cited" }, { k: "Housing affordability", v: 50, f: "cited" }, { k: "Government accountability", v: 40, f: "cited" }],
  },
];

/* =========================================================
   OVERVIEW — the new entry point: every seat scored, at once
   ========================================================= */
function SeatCard({ s, verdict, onOpen }) {
  const cls = "cd-card dg-open" + (verdict === "keep" ? " is-pick" : verdict === "replace" ? " verdict-replace" : "");
  const status = verdict === "keep"
    ? <span className="dg-status keep">✓ Worth keeping</span>
    : verdict === "replace"
      ? <span className="dg-status replace">⇄ Time to replace</span>
      : <span className="dg-status todo">Not yet decided</span>;
  return (
    <div className={cls} onClick={() => onOpen(s.id)} role="button" tabIndex={0}>
      <div className="cd-seatlab"><span className="seat-t">{s.office}</span>{status}</div>
      <div className="cd-head">
        <div className="cd-avatar">?</div>
        <div className="cd-who">
          <div className="cd-name">This seat's incumbent</div>
          <div className="cd-role">Name &amp; party hidden — judge the record</div>
        </div>
      </div>
      <div className="cd-prov-row"><DgProv basis={s.basis} conf={s.conf} /></div>

      <div className="cd-align">
        <div className="cd-align-top">
          <span className="lab">{s.basis === "roll-call" ? "Voted with you" : "Aligns with you"}</span>
          <span className={"cd-pct tone-" + dg3(s.align)}>{s.align}%</span>
        </div>
        <div className="cd-issues">
          {s.issues.map((i) => (
            <div className="cd-irow" key={i.k}>
              <span className="ik">{i.k}</span>
              <span className="cd-track"><i className={"bar-" + dg3(i.v)} style={{ width: i.v + "%" }}></i></span>
              <span className="iv">{i.f}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cd-money">
        <div className="cd-money-top">
          <span className="lab">Funding</span>
          <span className="cd-bars"><i className="small" style={{ width: s.mix.small + "%" }}></i><i className="large" style={{ width: s.mix.large + "%" }}></i><i className="pac" style={{ width: s.mix.pac + "%" }}></i></span>
          <span className="tot">{s.raised}</span>
        </div>
        <div className="cd-money-note"><b>{s.mix.pac}% PAC-funded</b> · {s.mix.small}% small-dollar</div>
      </div>

      <div className="cd-foot">
        <button className="cd-select ghost">{verdict ? "Reopen this seat →" : "Review this seat →"}</button>
      </div>
    </div>
  );
}

function DelegationOverview({ verdicts = {}, onOpen = () => {} }) {
  const total = DG_SEATS.length;
  const decided = DG_SEATS.filter((s) => verdicts[s.id]).length;
  const ready = decided === total;
  return (
    <div className="screen" data-palette="white">
      <div className="dg">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <SCNav />
        <div className="dg-ov-head">
          <div className="dg-ov-intro">
            <div className="dg-kicker">★ Your delegation</div>
            <h2>Everyone who represents you — scored.</h2>
            <p className="sub">Scan every seat against your issues at a glance, then open any one to see the record behind the score and decide keep or replace.</p>
          </div>
          <div className="dg-prog">
            <div className="meter">
              <span className="mlab">{decided} of {total} decided</span>
              <span className="dots">{DG_SEATS.map((s) => <i className={verdicts[s.id] ? "done" : ""} key={s.id}></i>)}</span>
            </div>
            <button className={"dg-print" + (ready ? " ready" : "")} disabled={!ready}>{ready ? "Print my scorecard →" : "Decide " + total + " seats to print"}</button>
          </div>
        </div>
        <div className="dg-grid">
          {DG_SEATS.map((s) => <SeatCard key={s.id} s={s} verdict={verdicts[s.id]} onOpen={onOpen} />)}
        </div>
        <div className="dg-excluded">
          <span className="ri">SE</span>
          <span className="ex-meta"><b>U.S. Senate · Class I</b> — Junior Senator</span>
          <span className="ex-tag">Not up until 2028 · greyed &amp; excluded from your scorecard</span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DEEP VIEW — the EXISTING single-seat review, opened from a card.
   Reuses the results surface verbatim (.rcard + .res-rail); adds a
   "← All seats" back and keeps the rail as lateral nav.
   ========================================================= */
function SeatRepCard({ seat, verdict, onVerdict }) {
  return (
    <div className="rcard">
      <div className="rcard-strip">
        <span className="office">{seat.office}</span>
        <span className="dist">{seat.terms}</span>
        <span className="next">Up Nov 2026</span>
      </div>
      <div className="rcard-head">
        <div className="rcard-avatar">?</div>
        <div className="rcard-who"><div className="blind">This seat's incumbent</div><div className="sub">Name &amp; party hidden — judge the record, not the person</div></div>
        <button className="rcard-reveal">Reveal name</button>
      </div>

      <div className="align-band">
        <div className="align-top">
          <span className="at-lab">{seat.basis === "roll-call" ? "Voted with you" : "Aligns with you"}</span>
          <span><span className={"at-pct " + dg2(seat.align)}>{seat.align}%</span><span className="at-frac">{seat.frac}</span></span>
        </div>
        <div className="align-rows">
          {seat.issues.map((i) => (
            <div className="align-row" key={i.k}>
              <span className="ai">{i.k}</span>
              <span className="align-track"><i className={dg2(i.v)} style={{ width: i.v + "%" }}></i></span>
              <span className="av">{i.f}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="money-line">
        <div className="money-top">
          <span className="ml-lab">Funding</span>
          <span className="money-bars"><i className="small" style={{ width: seat.mix.small + "%" }}></i><i className="large" style={{ width: seat.mix.large + "%" }}></i><i className="pac" style={{ width: seat.mix.pac + "%" }}></i></span>
          <span className="ml-tot">{seat.raised}</span>
        </div>
        <div className="money-detail"><span className="md-who"><b>{seat.mix.pac}% PAC-funded</b> · top: {seat.top}</span></div>
      </div>

      <div className="card-evidence">
        <button>See all votes →</button>
        <button>Funders &amp; influence ▾</button>
      </div>

      <div className="verdicts">
        <button className={"vbtn keep" + (verdict === "keep" ? " is-on" : "")} onClick={() => onVerdict(seat.id, "keep")}><span className="ck">✓</span> Worth keeping</button>
        <button className={"vbtn replace" + (verdict === "replace" ? " is-on" : "")} onClick={() => onVerdict(seat.id, "replace")}><span className="ck"></span> Time to replace</button>
      </div>
      <div className="card-sources"><span className="lab">Sources</span><a>GovTrack</a><span>·</span><a>Congress.gov (CRS)</a><span>·</span><a>FEC</a><span>·</span><a>OpenSecrets</a></div>
    </div>
  );
}

function SeatRail({ seats, activeId, verdicts, onSwitch }) {
  const decided = seats.filter((s) => verdicts[s.id]).length;
  return (
    <div className="res-rail">
      <div className="rail-head">
        <div className="rh-t">Your delegation</div>
        <div className="rh-prog">
          <span className="rh-dots">{seats.map((s) => <i className={activeId === s.id ? "active" : verdicts[s.id] ? "done" : ""} key={s.id}></i>)}</span>
          <span className="rh-count">{decided} of {seats.length} decided</span>
        </div>
      </div>
      <div className="rail-list">
        <div className="rail-group-lab">Up for election · 2026</div>
        {seats.map((s) => {
          const v = verdicts[s.id];
          const active = activeId === s.id;
          return (
            <div className={"rseat click" + (active ? " active" : "") + (v ? " done " + v : "")} key={s.id} onClick={() => onSwitch(s.id)}>
              <span className="ri">{s.ri}</span>
              <span className="rmeta"><span className="ro">{s.office}</span><span className="rn">{s.tier}</span></span>
              <span className={"rstatus" + (active ? "" : v ? " " + v : " pending")}>{active ? "Open" : v === "keep" ? "Keep" : v === "replace" ? "Replace" : "Review"}</span>
            </div>
          );
        })}
        <div className="rail-group-lab">Not up for election</div>
        <div className="rseat notup">
          <span className="ri">SE</span>
          <span className="rmeta"><span className="ro">U.S. Senate · Class I</span><span className="rn">Junior Senator</span></span>
          <span className="rstatus pending">2028</span>
        </div>
      </div>
      <div className="rail-foot">
        <button className="btn-primary" disabled={decided < seats.length}>Print my scorecard</button>
        <div className="rf-hint">{decided < seats.length ? "Decide " + seats.length + " seats to print · " + decided + " of " + seats.length : "Ready · " + seats.length + " of " + seats.length + " decided"}</div>
      </div>
    </div>
  );
}

function SeatDeepView({ seat, verdicts, onBack, onSwitch, onVerdict }) {
  const idx = DG_SEATS.findIndex((s) => s.id === seat.id) + 1;
  return (
    <div className="screen" data-palette="white">
      <div className="res dg-deep">
        <SCNav />
        <div className="res-context">
          <span className="rc-back" onClick={onBack} role="button" tabIndex={0}>← All seats</span>
          <span className="rc-issues">
            <span className="rc-lab">Your issues</span>
            <span className="chip-issue">Healthcare access</span>
            <span className="chip-issue">Housing affordability</span>
            <span className="chip-issue">Government accountability</span>
            <span className="chip-issue edit">Edit</span>
          </span>
        </div>
        <div className="res-main">
          <div className="res-center">
            <div className="res-tier">
              <span className="tp">SEAT {idx} OF {DG_SEATS.length}</span>
              <div><h2>{seat.tier} <span className="lvl">{seat.lvl}</span></h2><p>{seat.blurb}</p></div>
            </div>
            <SeatRepCard seat={seat} verdict={verdicts[seat.id]} onVerdict={onVerdict} />
          </div>
          <SeatRail seats={DG_SEATS} activeId={seat.id} verdicts={verdicts} onSwitch={onSwitch} />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   FLOW — overview ⇄ deep view; verdicts persist across both
   ========================================================= */
function DelegationFlow({ initialActive = null }) {
  const [active, setActive] = useStateDg(initialActive);
  const [verdicts, setVerdicts] = useStateDg({ senate: "keep" });
  const onVerdict = (id, v) => setVerdicts((p) => ({ ...p, [id]: p[id] === v ? undefined : v }));
  const seat = DG_SEATS.find((s) => s.id === active);
  return seat
    ? <SeatDeepView seat={seat} verdicts={verdicts} onBack={() => setActive(null)} onSwitch={setActive} onVerdict={onVerdict} />
    : <DelegationOverview verdicts={verdicts} onOpen={setActive} />;
}

Object.assign(window, { DelegationOverview, DelegationFlow, SeatDeepView });
