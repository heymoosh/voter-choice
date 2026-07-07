/* ====================================================
   RAISED VS. THE MEDIAN — the money-gap scale
   ----------------------------------------------------
   Turns the nascent "≈3× the median House campaign" string (today a
   flat label in FunderPanel) into a first-class, reusable primitive
   used everywhere money appears: the rep card, the funder panel, and
   — where it matters most — the candidate head-to-head.

   THE DESIGN CALL (flag-able, see post-it + handoff):
   • Baseline = the office/chamber median ("the typical U.S. House
     campaign"). Stable, comparable across races, and available BEFORE
     challengers load. Always labeled so it's honest; the backend can
     swap to the in-race median where a field is large enough.
   • "How much more" leads with a MULTIPLE (3.0×). The bar segment past
     the median line is the excess — gold. Below-median reads as
     "running lean," never failure.
   • Neutral by design. Keep/replace green-red mean alignment; money
     gets the gold accent so the scale informs without moralizing.
   • Null median ⇒ hide the comparison, show the dollar only. Honesty
     over false precision.
   Data mirrors redesign2-data.jsx (TX-21 U.S. House race); names
   fictional. ==================================================== */
const { useState: useStateFn } = React;

/* office/chamber median — matches the existing FunderPanel copy */
const FUND_MEDIAN = 1.4e6;
const FUND_MEDLABEL = "the typical U.S. House campaign";

/* the TX-21 field — raised totals + small/large/PAC mix */
const FIELD = [
  { id: "vance", name: "Theo Vance", pip: "rep", you: true, tag: "Your rep · incumbent", raised: 4.2e6, pac: 46, small: 15 },
  { id: "reyes", name: "Elena Reyes", pip: "dem", tag: "Challenger · Democrat", raised: 1.34e6, pac: 8, small: 61 },
  { id: "dunne", name: "Garrett Dunne", pip: "rep", tag: "Challenger · Republican", raised: 0.41e6, pac: 37, small: 22 },
  { id: "whitfield", name: "Sam Whitfield", pip: "ind", tag: "Challenger · Independent", raised: 0.095e6, pac: 0, small: 88 },
];

function usd(n) {
  if (n == null) return "—";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return "$" + Math.round(n / 1e3) + "K";
  return "$" + n;
}
function multStr(m) { return m >= 1 ? m.toFixed(1).replace(/\.0$/, "") + "×" : m.toFixed(m < 0.1 ? 2 : 1) + "×"; }
function band(m) { return m >= 1.15 ? "above" : m < 0.85 ? "below" : "at"; }

/* ---------------------------------------------------------
   ONE ROW on a shared axis — the core of the scale
   --------------------------------------------------------- */
function GapRow({ c, axisMax, medianPct }) {
  const m = c.raised / FUND_MEDIAN;
  const b = band(m);
  const barPct = Math.max((c.raised / axisMax) * 100, 1.4);
  const overW = Math.max(barPct - medianPct, 0);
  const aria = `${c.name} raised ${usd(c.raised)}, ${b === "below" ? "about " + multStr(m) + " of" : multStr(m) + " times"} the median of ${usd(FUND_MEDIAN)}.`;
  return (
    <div className="mgap-row" role="group" aria-label={aria}>
      <div className="mgap-lab">
        <div className="mgap-nm"><span className={"pip " + c.pip}></span>{c.name}{c.you && <span className="you">You</span>}</div>
        <div className="mgap-tag">{c.tag} · {usd(c.raised)}</div>
      </div>
      <div className="mgap-track">
        <div className={"mgap-bar" + (b === "below" ? " is-below" : "")} style={{ width: barPct + "%" }}></div>
        {b !== "below" && overW > 0.5 && <div className="mgap-over" style={{ left: medianPct + "%", width: overW + "%" }}></div>}
        {b === "below" && <div className="mgap-rem" style={{ left: barPct + "%", width: (medianPct - barPct) + "%" }}></div>}
        <div className="mgap-medline" style={{ left: medianPct + "%" }}></div>
      </div>
      <div className={"mgap-read is-" + b}>
        <b>{multStr(m)}</b>
        <span>{b === "above" ? "above median" : b === "below" ? "running lean" : "≈ median"}</span>
      </div>
    </div>
  );
}

function MedianAxis({ axisMax, medianPct }) {
  return (
    <div className="mgap-axis">
      <span className="mgap-zero">$0</span>
      <div className="mgap-medflag" style={{ left: medianPct + "%" }}>
        <span className="mf-lab">MEDIAN</span>
        <span className="mf-amt">{usd(FUND_MEDIAN)}</span>
        <span className="mf-sub">{FUND_MEDLABEL}</span>
      </div>
      <span className="mgap-max">{usd(axisMax)}</span>
    </div>
  );
}

/* =========================================================
   HERO · the whole field on one scale
   ========================================================= */
function FieldMoneyGap() {
  const axisMax = Math.max(...FIELD.map((c) => c.raised)) * 1.04;
  const medianPct = (FUND_MEDIAN / axisMax) * 100;
  return (
    <div className="screen" data-palette="white">
      <div className="fund-stage">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <header className="fund-head">
          <div>
            <div className="kick">Funding · <span className="star">how much more</span></div>
            <h2>Every campaign for this seat, measured against one line</h2>
          </div>
          <div className="fund-ctx">U.S. House · TX-21 · 2025–26</div>
        </header>
        <div className="mgap">
          <MedianAxis axisMax={axisMax} medianPct={medianPct} />
          <div className="mgap-plot">
            {FIELD.map((c) => <GapRow key={c.id} c={c} axisMax={axisMax} medianPct={medianPct} />)}
          </div>
          <div className="mgap-key">
            <span><i className="base"></i>Raised, up to the median</span>
            <span><i className="over"></i>How much more — above the median</span>
            <span><i className="line"></i>Median · the typical campaign</span>
          </div>
        </div>
        <p className="fund-take">
          Your rep, <b>Theo Vance</b>, has raised <b>3× the typical U.S. House campaign</b> — and <span className="gold">3.1× what his nearest challenger has</span>. The gold is how much sits <b>above the median</b>. <b>Elena Reyes</b> is running right at the median, almost entirely on small donors; the rest of the field well below it.
        </p>
        <div className="fund-src">Baseline · median of all U.S. House campaigns this cycle (FEC filings, OpenSecrets aggregation). <a>How we compute this ↗</a></div>
      </div>
    </div>
  );
}

/* =========================================================
   READING THE SCALE · the states + honesty cases + the chip
   ========================================================= */
function MiniBar({ raised }) {
  const axisMax = 4.2e6 * 1.04, medianPct = (FUND_MEDIAN / axisMax) * 100;
  if (raised == null) return <div className="fs-mini nodata"><span>no comparison shown</span></div>;
  const m = raised / FUND_MEDIAN, b = band(m), barPct = Math.max((raised / axisMax) * 100, 1.4);
  const overW = Math.max(barPct - medianPct, 0);
  return (
    <div className="fs-mini">
      <div className={"mgap-bar" + (b === "below" ? " is-below" : "")} style={{ width: barPct + "%" }}></div>
      {b !== "below" && overW > 0.5 && <div className="mgap-over" style={{ left: medianPct + "%", width: overW + "%" }}></div>}
      {b === "below" && <div className="mgap-rem" style={{ left: barPct + "%", width: (medianPct - barPct) + "%" }}></div>}
      <div className="mgap-medline" style={{ left: medianPct + "%" }}></div>
    </div>
  );
}

function MedianChip({ raised }) {
  if (raised == null) return <span className="median-chip none">No median yet · too few filed</span>;
  const m = raised / FUND_MEDIAN, b = band(m);
  return (
    <span className={"median-chip " + b} title={usd(raised) + " · " + multStr(m) + " the typical campaign"}>
      <span className="mc-bar"><i style={{ width: Math.min((m / 3) * 100, 100) + "%" }}></i><span className="mc-tick"></span></span>
      <span><b>{multStr(m)}</b> median</span>
    </span>
  );
}

function ScaleStates() {
  const rows = [
    { t: "Above the median", m: "3.0× · advantage", raised: 4.2e6, note: <span>The bar runs past the line; the <b>gold</b> is the excess. A structural money advantage — read it next to the funding mix.</span> },
    { t: "About typical", m: "1.0× · at median", raised: 1.34e6, note: <span>Within ±15% of the line. A normal-sized campaign for this office — here, almost all small-dollar.</span> },
    { t: "Running lean", m: "0.29× · outraised", raised: 0.41e6, note: <span>Short of the line, with a dotted reach to it. Outraised — <b>not</b> a verdict on the candidate.</span> },
    { t: "No median to show", m: "honest blank", raised: null, note: <span>Too few campaigns on file (or a level we don't track). We show the dollar amount only — never a fabricated baseline.</span> },
  ];
  return (
    <div className="screen" data-palette="white">
      <div className="fund-stage">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <header className="fund-head">
          <div>
            <div className="kick">Funding · <span className="star">reading the scale</span></div>
            <h2>Four states, one honest read</h2>
          </div>
        </header>
        <div className="fund-states">
          {rows.map((r, i) => (
            <div className={"fs-row" + (r.raised == null ? " nodata" : "")} key={i}>
              <div className="fs-cap"><div className="fc-t">{r.t}</div><div className="fc-m">{r.m}</div></div>
              <MiniBar raised={r.raised} />
              <div className="fs-note">{r.note}</div>
            </div>
          ))}
        </div>
        <div className="fund-chips-lab">The collapsed glance · the inline chip as it sits on a card</div>
        <div className="fund-chips">
          <MedianChip raised={4.2e6} />
          <MedianChip raised={1.34e6} />
          <MedianChip raised={0.41e6} />
          <MedianChip raised={0.095e6} />
          <MedianChip raised={null} />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   IN CONTEXT · the money gap inside direction B (head-to-head)
   ========================================================= */
function MoneyGapH2H() {
  const [sel, setSel] = useStateFn("reyes");
  const inc = FIELD[0];
  const ch = FIELD.find((c) => c.id === sel);
  const axisMax = inc.raised * 1.04;
  const medianPct = (FUND_MEDIAN / axisMax) * 100;
  const ratio = inc.raised / ch.raised;
  const ratioStr = ratio >= 10 ? Math.round(ratio) + "×" : ratio.toFixed(1).replace(/\.0$/, "") + "×";
  const two = [inc, ch];
  return (
    <div className="screen" data-palette="white">
      <div className="h2hm">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <div className="h2hm-top">
          <div>
            <h2>The money gap</h2>
            <div className="ctx">U.S. House · TX-21 · your rep vs. who's running</div>
          </div>
          <div className="h2hm-switch">
            {FIELD.slice(1).map((c) => (
              <button key={c.id} className={sel === c.id ? "on" : ""} onClick={() => setSel(c.id)}>
                <span className={"pip " + c.pip}></span>{c.name.split(" ")[1]}<span className="p">{usd(c.raised)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="h2hm-ratio">
          <div className="big">{ratioStr}<small> more</small></div>
          <div className="txt">
            <b>{inc.name}</b> has out-raised <b>{ch.name}</b> by {ratioStr} this cycle — and sits at <b>3× the typical U.S. House campaign</b>. That gap, more than any single position, is what an incumbent's war chest buys: ads, staff, name recognition.
          </div>
        </div>

        <div className="mgap">
          <MedianAxis axisMax={axisMax} medianPct={medianPct} />
          <div className="mgap-plot">
            {two.map((c) => <GapRow key={c.id} c={c} axisMax={axisMax} medianPct={medianPct} />)}
          </div>
        </div>

        <div className="h2hm-foot">
          <div className="h2hm-pac">
            <div className="blk"><span className="v">{inc.pac}% PAC</span><span className="k">{inc.name.split(" ")[1]} · {usd(inc.raised)}</span></div>
            <span className="vs">vs</span>
            <div className="blk"><span className="v" style={{ color: "var(--keep)" }}>{ch.pac}% PAC</span><span className="k">{ch.name.split(" ")[1]} · {usd(ch.raised)} · {ch.small}% small</span></div>
          </div>
          <div className="h2hm-actions">
            <button className="h2hm-keepbtn">Keep {inc.name.split(" ")[1]}</button>
            <button className="h2hm-repbtn">Replace with {ch.name.split(" ")[1]} <span aria-hidden="true">→</span></button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { FieldMoneyGap, ScaleStates, MoneyGapH2H, MedianChip });
