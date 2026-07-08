/* ====================================================
   DESIGN CANDIDATES — the "Time to replace" flow
   ----------------------------------------------------
   Brings the successor chooser (was redesign2-replace.jsx) onto the
   Bold Flag white ground, and explores THREE directions for what
   picking "Replace" opens:
     A · inline ranked chooser  (evolves the current approach)
     B · dedicated head-to-head compare screen
     C · split — ranked shortlist → focused compare
   Plus ONE unified candidate card: the provenance badge (roll-call
   vs researched) carries the House / Senate / President difference,
   so it's a single card system across seat types.
   Data is faithful to redesign2-data.jsx (TX-21 House race). Names
   are fictional. ==================================================== */
const { useState: useStateCd } = React;

function cdTone(p) { return p == null ? "na" : p >= 67 ? "good" : p >= 34 ? "mid" : "bad"; }

/* incumbent + challengers for the TX-21 U.S. House seat */
const REP = {
  name: "Theo Vance", role: "U.S. Rep. since 2019", office: "U.S. House · TX-21",
  align: 58, raised: "$4.2M", mix: { small: 15, large: 39, pac: 46 },
  issues: [
    { k: "Healthcare access", v: 75 },
    { k: "Housing affordability", v: 40 },
    { k: "Government accountability", v: 33 },
  ],
};
const CHS = [
  { id: "reyes", name: "Elena Reyes", pip: "dem", party: "Democrat", role: "Community-clinic director · first run",
    why: "Ran a nonprofit clinic for 12 years and says Washington stopped fighting for patients.",
    align: 83, raised: "$1.34M", mix: { small: 61, large: 31, pac: 8 }, conf: "high",
    issues: [{ k: "Healthcare access", v: 92 }, { k: "Housing affordability", v: 78 }, { k: "Government accountability", v: 80 }] },
  { id: "whitfield", name: "Sam Whitfield", pip: "ind", party: "Independent", role: "Small-business owner · first run",
    why: "No party and no PAC money — running on one promise: ban congressional stock trading.",
    align: 61, raised: "$95K", mix: { small: 88, large: 12, pac: 0 }, conf: "high",
    issues: [{ k: "Healthcare access", v: 50 }, { k: "Housing affordability", v: 50 }, { k: "Government accountability", v: 100 }] },
  { id: "dunne", name: "Garrett Dunne", pip: "rep", party: "Republican", role: "Former county sheriff",
    why: "26 years in law enforcement; running to the incumbent's right on border security.",
    align: 34, raised: "$410K", mix: { small: 22, large: 41, pac: 37 }, conf: "medium",
    issues: [{ k: "Healthcare access", v: 25 }, { k: "Housing affordability", v: 33 }, { k: "Government accountability", v: 40 }] },
];

function ProvBadge({ basis, conf }) {
  return basis === "roll-call"
    ? <span className="prov rollcall">Roll-call record</span>
    : <span className="prov researched">Researched · cited{conf ? " · " + conf : ""}</span>;
}

function MiniBars({ mix }) {
  return (
    <span className="cd-bars">
      <i className="small" style={{ width: mix.small + "%" }}></i>
      <i className="large" style={{ width: mix.large + "%" }}></i>
      <i className="pac" style={{ width: mix.pac + "%" }}></i>
    </span>
  );
}

/* =========================================================
   BUILDING BLOCK · unified candidate card across seat types
   ========================================================= */
function CandCard({ c }) {
  return (
    <div className={"cd-card" + (c.pick ? " is-pick" : "") + (c.blind ? " blind" : "")}>
      <div className="cd-seatlab"><span className="seat-t">{c.seat}</span><span>{c.when}</span></div>
      <div className="cd-head">
        <div className="cd-avatar">{c.blind ? "?" : c.initial}</div>
        <div className="cd-who">
          <div className="cd-name">
            {!c.blind && <span className={"pip " + c.pip}></span>}
            {c.blind ? "This seat's incumbent" : c.name}
            {c.pick && <span className="cd-pick-tag">Your pick</span>}
          </div>
          <div className="cd-role">{c.blind ? "Name & party hidden — judge the record" : c.role}</div>
        </div>
      </div>
      <div className="cd-prov-row"><ProvBadge basis={c.basis} conf={c.conf} /></div>

      <div className="cd-align">
        <div className="cd-align-top">
          <span className="lab">{c.basis === "roll-call" ? "Voted with you" : "Aligns with you"}</span>
          <span>
            <span className={"cd-pct tone-" + cdTone(c.align)}>{c.align}%</span>
            {c.delta != null && <span className={"cd-delta " + (c.delta > 0 ? "up" : "down")}>{(c.delta > 0 ? "+" : "") + c.delta} vs rep</span>}
          </span>
        </div>
        <div className="cd-issues">
          {c.issues.map((i, k) => (
            <div className="cd-irow" key={k}>
              <span className="ik">{i.k}</span>
              <span className="cd-track"><i className={"bar-" + cdTone(i.v)} style={{ width: i.v + "%" }}></i></span>
              <span className="iv">{i.v}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cd-money">
        <div className="cd-money-top">
          <span className="lab">Funding</span>
          <MiniBars mix={c.mix} />
          <span className="tot">{c.raised}</span>
        </div>
        <div className="cd-money-note"><b>{c.mix.pac}% PAC-funded</b> · {c.mix.small}% small-dollar</div>
      </div>

      <div className="cd-foot">
        <button className={"cd-select" + (c.ghost ? " ghost" : "")}>{c.cta}</button>
      </div>
    </div>
  );
}

function CandidateParity() {
  const cards = [
    { seat: "U.S. House · TX-21", when: "Up Nov 2026", initial: "T", pip: "rep", name: "Theo Vance",
      role: "U.S. Rep. since 2019", basis: "roll-call", align: 58, raised: "$4.2M",
      mix: { small: 15, large: 39, pac: 46 }, cta: "Review this seat", ghost: true,
      issues: [{ k: "Healthcare access", v: 75 }, { k: "Housing affordability", v: 40 }, { k: "Government accountability", v: 33 }] },
    { seat: "U.S. Senate · Class II", when: "Up Nov 2026", initial: "R", pip: "dem", name: "Rosa Delgado",
      role: "U.S. Senator since 2015", basis: "roll-call", align: 82, raised: "$22.9M", pick: true,
      mix: { small: 43, large: 41, pac: 16 }, cta: "✓ Worth keeping",
      issues: [{ k: "Healthcare access", v: 88 }, { k: "Housing affordability", v: 80 }, { k: "Government accountability", v: 78 }] },
    { seat: "U.S. President", when: "Up Nov 2026", initial: "D", pip: "ind", name: "Dana Whitmore",
      role: "Executive — no roll-call record", basis: "researched", conf: "high", align: 47, raised: "$210M",
      mix: { small: 38, large: 29, pac: 33 }, cta: "Review this seat", ghost: true,
      issues: [{ k: "Healthcare access", v: 50 }, { k: "Housing affordability", v: 50 }, { k: "Government accountability", v: 40 }] },
  ];
  return (
    <div className="screen" data-palette="white">
      <div className="cd-stage">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <div className="cd-explain">
          <h2>One card, every seat.</h2>
          <p>House, Senate, and President share a single card. The <b>provenance badge</b> carries the only real difference — legislators are scored on a <b>roll-call record</b>, executives on <b>researched, cited positions</b> (never blended).</p>
        </div>
        <div className="cd-pair">
          {cards.map((c, i) => <CandCard key={i} c={c} />)}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DIRECTION A · inline ranked chooser (grows under the card)
   ========================================================= */
function ChallengerRow2({ ch, rank, open, picked }) {
  const delta = ch.align - REP.align;
  return (
    <div className={"ch2" + (open ? " open" : "") + (picked ? " is-pick" : "")}>
      <div className="ch2-row">
        <span className="ch2-rank">{rank}</span>
        <div className="ch2-id">
          <div className="ch2-name"><span className={"pip " + ch.pip}></span>{ch.name}{picked && <span className="pick-tag">Your pick</span>}</div>
          <div className="ch2-meta"><ProvBadge basis="researched" conf={ch.conf} /><span>{ch.role}</span></div>
        </div>
        <div className="ch2-scores">
          <div className="ch2-pct"><b className={"tone-" + cdTone(ch.align)}>{ch.align}%</b><span>aligned</span></div>
          <div className="ch2-vs"><span className={"d " + (delta > 0 ? "up" : "down")}>{(delta > 0 ? "+" : "") + delta}</span><small>vs. rep</small></div>
          <span className="ch2-chev">{open ? "▴" : "▾"}</span>
        </div>
      </div>
      {open && (
        <div className="ch2-detail">
          <p className="ch2-why">“{ch.why}”</p>
          <div className="h2h2-colhead"><span>Issue</span><span>Your rep</span><span>{ch.name.split(" ")[0]}</span><span>Δ</span></div>
          <div className="h2h2">
            {ch.issues.map((iss, i) => {
              const inc = REP.issues[i].v, d = iss.v - inc;
              return (
                <div className="h2h2-row" key={i}>
                  <span className="iss">{iss.k}</span>
                  <span className="h2h2-cell"><span className="mini inc"><i className={"bar-" + cdTone(inc)} style={{ width: inc + "%" }}></i></span><span className="v">{inc}</span></span>
                  <span className="h2h2-cell"><span className="mini"><i className={"bar-" + cdTone(iss.v)} style={{ width: iss.v + "%" }}></i></span><span className="v">{iss.v}</span></span>
                  <span className={"delta " + (d > 0 ? "up" : d < 0 ? "down" : "")}>{(d > 0 ? "+" : "") + d}</span>
                </div>
              );
            })}
          </div>
          <div className="ch2-selbar">
            <span className="ch2-selnote">Raised <b>{ch.raised}</b> · {ch.mix.small}% small-dollar · {ch.mix.pac}% PAC</span>
            <button className={"ch2-sel" + (picked ? " is-sel" : "")}>{picked ? "✓ Selected for this seat" : "Select for this seat →"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReplaceInline() {
  const ranked = [...CHS].sort((a, b) => b.align - a.align);
  return (
    <div className="screen" data-palette="white">
      <div className="rf2">
        <div className="rf2-scroll">
          <div className="rf2-banner">
            <span className="x">✕</span>
            <div>
              <div className="bt">You marked this seat “time to replace.”</div>
              <div className="bd">Here's who's running — scored the same way you scored your rep. Selecting someone records your pick.</div>
            </div>
            <button className="undo">Undo</button>
          </div>

          <div className="rf2-inc">
            <div>
              <div className="bar2beat">The bar to beat · your current rep</div>
              <div className="who">{REP.name}</div>
              <div className="meta">{REP.role} · {REP.mix.pac}% PAC-funded</div>
            </div>
            <div className="pct"><b className={"tone-" + cdTone(REP.align)}>{REP.align}%</b><span>on the record</span></div>
          </div>

          <div className="rf2-controls">
            <span className="sortlab">Sort by</span>
            <div className="rf2-seg"><button className="on">Best aligned</button><button>Funding independence</button><button>Funds raised</button></div>
            <span className="count">7 on the ballot · 4 long-shots hidden</span>
          </div>

          <div className="rf2-list">
            {ranked.map((ch, i) => (
              <ChallengerRow2 key={ch.id} ch={ch} rank={i + 1} open={i === 0} picked={i === 0} />
            ))}
          </div>
          <button className="rf2-more">Show all 7 ranked candidates →</button>

          <div className="rf2-confirm">
            <span className="tick">✓</span>
            <span className="t">Your pick to replace this seat: <b>Elena Reyes</b> (+25 vs. your rep). It's on your scorecard — change it anytime.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DIRECTION B · dedicated head-to-head compare screen
   ========================================================= */
function HeadToHead() {
  const [sel, setSel] = useStateCd("reyes");
  const ch = CHS.find((c) => c.id === sel);
  return (
    <div className="screen" data-palette="white">
      <div className="cmp">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <div className="cmp-top">
          <div>
            <h2>Head-to-head</h2>
            <div className="ctx">U.S. House · TX-21 · your rep vs. who's running</div>
          </div>
          <div className="cmp-switch">
            {CHS.map((c) => (
              <button key={c.id} className={sel === c.id ? "on" : ""} onClick={() => setSel(c.id)}>
                <span className={"pip " + c.pip}></span>{c.name.split(" ")[1]}<span className="p">{c.align}%</span>
              </button>
            ))}
          </div>
        </div>

        <div className="cmp-grid">
          <div className="cmp-col inc">
            <div className="cmp-colhead">
              <div className="cmp-av">T</div>
              <div className="cmp-roleline">
                <div className="cmp-tag">The record you have</div>
                <div className="cmp-cname"><span className="pip rep"></span>{REP.name}</div>
                <div className="cmp-crole">{REP.role}</div>
              </div>
            </div>
            <div className="cmp-big"><b className={"tone-" + cdTone(REP.align)}>{REP.align}%</b><span className="lab">voted with you</span></div>
            <div className="cmp-prov-line"><ProvBadge basis="roll-call" /></div>
          </div>
          <div className="cmp-col ch">
            <div className="cmp-colhead">
              <div className="cmp-av">{ch.name[0]}</div>
              <div className="cmp-roleline">
                <div className="cmp-tag">Running to replace them</div>
                <div className="cmp-cname"><span className={"pip " + ch.pip}></span>{ch.name}</div>
                <div className="cmp-crole">{ch.role}</div>
              </div>
            </div>
            <div className="cmp-big"><b className={"tone-" + cdTone(ch.align)}>{ch.align}%</b><span className="lab">aligns with you</span></div>
            <div className="cmp-prov-line"><ProvBadge basis="researched" conf={ch.conf} /></div>
          </div>
        </div>

        <div className="cmp-ledger">
          <div className="cmp-ledgrid">
            <div className="cmp-lrow head"><span>Your rep</span><span></span><span style={{ textAlign: "center" }}>On your issues</span><span></span><span>{ch.name.split(" ")[0]}</span></div>
            {ch.issues.map((iss, i) => {
              const inc = REP.issues[i].v, d = iss.v - inc;
              return (
                <div className="cmp-lrow" key={i}>
                  <span className="cmp-iss-l">{inc}% · {REP.issues[i].k}</span>
                  <span className={"cmp-v tone-" + cdTone(inc)}>{inc}</span>
                  <span className="cmp-mid"><span className={"arrow " + (d > 0 ? "up" : d < 0 ? "down" : "even")}>{d > 0 ? "▲ +" + d : d < 0 ? "▼ " + d : "even"}</span></span>
                  <span className={"cmp-v tone-" + cdTone(iss.v)}>{iss.v}</span>
                  <span className="cmp-iss-r">{iss.v}% · {iss.k}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="cmp-foot">
          <div className="cmp-fund">
            <div className="blk"><span className="v">{REP.mix.pac}% PAC</span><span className="k">your rep · {REP.raised}</span></div>
            <span style={{ fontFamily: "var(--mono)", fontSize: "11px" }}>vs</span>
            <div className="blk"><span className="v tone-good">{ch.mix.pac}% PAC</span><span className="k">{ch.name.split(" ")[0]} · {ch.raised} · {ch.mix.small}% small</span></div>
          </div>
          <div className="cmp-actions">
            <button className="cmp-keepbtn">Keep {REP.name.split(" ")[1]}</button>
            <button className="cmp-repbtn">Replace with {ch.name.split(" ")[1]} <span aria-hidden="true">→</span></button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DIRECTION C · split — ranked shortlist → focused compare
   ========================================================= */
function SplitCompare() {
  const [sel, setSel] = useStateCd("reyes");
  const ranked = [...CHS].sort((a, b) => b.align - a.align);
  const ch = CHS.find((c) => c.id === sel);
  return (
    <div className="screen" data-palette="white">
      <div className="split">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <div className="split-head">
          <h2>Time to replace — who's running for this seat</h2>
          <p>Pick a challenger to compare head-to-head against your current rep.</p>
        </div>
        <div className="split-body">
          <div className="split-list">
            <div className="split-list-lab">On the ballot · ranked by alignment</div>
            <div className="split-items">
              {ranked.map((c, i) => {
                const d = c.align - REP.align;
                return (
                  <div className={"sl-item" + (sel === c.id ? " on" : "")} key={c.id} onClick={() => setSel(c.id)}>
                    <span className="sl-rank">{i + 1}</span>
                    <div className="sl-id">
                      <div className="sl-name"><span className={"pip " + c.pip}></span>{c.name}</div>
                      <div className="sl-meta">{c.party} · {c.raised}</div>
                    </div>
                    <div className="sl-pct"><b className={"tone-" + cdTone(c.align)}>{c.align}%</b><span className={d > 0 ? "up" : "down"}>{(d > 0 ? "+" : "") + d} vs rep</span></div>
                  </div>
                );
              })}
            </div>
            <div className="split-folded">+ 4 long-shots hidden · under $50k raised, no record</div>
            <div className="split-inc">
              <div className="l">The bar to beat</div>
              <div className="r"><span className="nm">{REP.name}</span><span className="pc">{REP.align}%</span></div>
            </div>
          </div>

          <div className="split-focus">
            <div className="sf-head">
              <div className="sf-av">{ch.name[0]}</div>
              <div className="sf-who">
                <div className="sf-name"><span className={"pip " + ch.pip}></span>{ch.name}</div>
                <div className="sf-role">{ch.party} · {ch.role}</div>
                <div style={{ marginTop: "7px" }}><ProvBadge basis="researched" conf={ch.conf} /></div>
              </div>
              <div className="sf-headpct"><b className={"tone-" + cdTone(ch.align)} style={{ color: ch.align >= REP.align ? "var(--keep)" : "var(--replace)" }}>{ch.align}%</b><div className="vs" style={{ color: ch.align >= REP.align ? "var(--keep)" : "var(--replace)" }}>{ch.align - REP.align > 0 ? "+" : ""}{ch.align - REP.align} vs your rep</div></div>
            </div>
            <p className="sf-why">“{ch.why}”</p>

            <div className="sf-sub">Head-to-head on your issues</div>
            <div className="sf-ledger">
              {ch.issues.map((iss, i) => {
                const inc = REP.issues[i].v, d = iss.v - inc;
                return (
                  <div className="sf-lrow" key={i}>
                    <span className="iss">{iss.k}</span>
                    <span className="sf-trk inc"><i className={"bar-" + cdTone(inc)} style={{ width: inc + "%" }}></i></span>
                    <span className="sf-incv">rep {inc}%</span>
                    <span className="sf-trk"><i className={"bar-" + cdTone(iss.v)} style={{ width: iss.v + "%" }}></i></span>
                    <span className={"sf-chv " + (d > 0 ? "tone-good" : "tone-bad")}>{(d > 0 ? "+" : "") + d}</span>
                  </div>
                );
              })}
            </div>

            <div className="sf-money">
              <span className="lab">Funding</span>
              <span className="sf-bars"><i className="small" style={{ width: ch.mix.small + "%" }}></i><i className="large" style={{ width: ch.mix.large + "%" }}></i><i className="pac" style={{ width: ch.mix.pac + "%" }}></i></span>
              <span className="tot">{ch.raised} · {ch.mix.pac}% PAC</span>
            </div>

            <div className="sf-foot">
              <button className="sf-select">Select {ch.name.split(" ")[0]} to replace this seat →</button>
              <button className="sf-chat">Ask about {ch.name.split(" ")[0]}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CandidateParity, ReplaceInline, HeadToHead, SplitCompare });
