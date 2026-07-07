/* RESULTS — the redesigned review surface.
   One visible panel (center rep card), the right rail doubles as
   progress (Reviewing now / Not yet / Reviewed) — no separate bar,
   no left issues panel. Issues + jurisdiction live in the slim
   context strip. Non-2026 seats are greyed and excluded.
   Parameterized so the same layout renders in either palette.

   [Δ Muxin review] Two detail surfaces added on the Bold Flag system:
     - FunderPanel  — the EXPANDED money trail (FunderBars): funding
       mix + named industries + named PACs. Lives behind the
       "Funders & influence ▾" affordance — progressive disclosure,
       nothing dropped.
     - VoteDrilldown / AllVotesSheet — what "selecting a vote" opens.
       An issue row expands to its contributing votes (how they voted,
       aligned or not, the one-line summary, the source); the full
       record across every issue lives in the "See all votes" sheet.
       It's a lot, so it never shows by default — one tap away. */
const { useState: useStateRes } = React;

/* ---- model (mirrors the live app's alignmentEntry + donor contract) ---- */
const REP_FUNDING = {
  total: "$4.2M",
  cycle: "2025–26 cycle",
  mix: { small: 15, large: 39, pac: 46 },
  peer: "≈3× the median House campaign",
  industries: [
    { label: "Energy & utilities", pct: 28, amt: "$1.18M" },
    { label: "Real estate", pct: 22, amt: "$920k" },
    { label: "Finance & banking", pct: 19, amt: "$790k" },
    { label: "Construction", pct: 11, amt: "$460k" },
    { label: "Defense", pct: 8, amt: "$340k" },
    { label: "All other", pct: 12, amt: "$510k" },
  ],
  /* PAC honesty (Muxin): we don't invent named issue-PACs. We name a PAC
     only when we can attribute it to a public agenda; otherwise we say so
     and point to the categorical industry view below. */
  pacAmt: "$1.9M",
  pacPct: 46,
  pacDef: "Political Action Committee — companies, unions, or advocacy groups that pool donations to back candidates. A high PAC share signals reliance on organized interests over individual voters.",
};

const VOTE_RECORD = [
  {
    issue: "Healthcare access", kept: 3, total: 4, align: "good",
    votes: [
      { bill: "HR 3421", title: "Insulin Price Cap Act", cast: "yea", with: true, date: "Jun 2025", note: "Backed the $35 monthly insulin copay cap for Medicare.", what: "Caps what Medicare enrollees pay for insulin at $35 per month and bars higher cost-sharing on covered insulin products.", tally: "Passed House 232–193", status: "Passed House · stalled in Senate" },
      { bill: "HR 812", title: "ACA Subsidy Extension", cast: "yea", with: true, date: "Jan 2025", note: "Voted to extend the expanded marketplace premium subsidies.", what: "Extends the enhanced ACA marketplace premium subsidies for three more years.", tally: "Passed House 220–209", status: "Signed into law" },
      { bill: "HR 1130", title: "Hospital Price Transparency Act", cast: "yea", with: true, date: "Sep 2024", note: "Supported requiring hospitals to publish real cash prices.", what: "Requires hospitals to publish actual cash and negotiated prices in a machine-readable file.", tally: "Passed House 401–19", status: "Passed House" },
      { bill: "HR 5", title: "Medicaid Block Grant Act", cast: "yea", with: false, date: "Mar 2024", note: "Voted to convert Medicaid funding into capped block grants.", what: "Converts federal Medicaid funding into capped per-state block grants.", tally: "Passed House 215–210", status: "Passed House · failed in Senate" },
    ],
  },
  {
    issue: "Housing affordability", kept: 2, total: 5, align: "bad",
    votes: [
      { bill: "HR 4350", title: "Low-Income Housing Tax Credit Expansion", cast: "yea", with: true, date: "May 2025", note: "Supported expanding the LIHTC for new affordable units.", what: "Expands the Low-Income Housing Tax Credit to finance more affordable rental units.", tally: "Passed House 228–197", status: "Passed House" },
      { bill: "HR 2880", title: "First-Time Homebuyer Credit", cast: "yea", with: true, date: "Nov 2024", note: "Backed a refundable credit for first-time buyers.", what: "Creates a refundable tax credit of up to $15k for qualifying first-time buyers.", tally: "Passed House 219–210", status: "Passed House" },
      { bill: "HR 2", title: "Renter Protection Act", cast: "nay", with: false, date: "Feb 2025", note: "Voted against federal eviction and rent-gouging protections.", what: "Sets federal anti-eviction and rent-gouging protections for federally backed units.", tally: "Failed 201–224", status: "Failed in the House" },
      { bill: "HR 999", title: "Zoning Reform Incentives", cast: "nay", with: false, date: "Aug 2024", note: "Opposed grants tied to easing restrictive local zoning.", what: "Ties federal transit grants to local zoning reforms that allow denser housing.", tally: "Failed 198–230", status: "Failed in the House" },
      { bill: "HR 1450", title: "Public Housing Repair Fund", cast: "nay", with: false, date: "Apr 2024", note: "Voted against the public-housing capital repair fund.", what: "Funds a backlog of capital repairs across the federal public-housing stock.", tally: "Failed 205–222", status: "Failed in the House" },
    ],
  },
  {
    issue: "Government accountability", kept: 2, total: 3, align: "bad",
    votes: [
      { bill: "HR 345", title: "Congressional Stock Trading Ban", cast: "nay", with: false, date: "Mar 2025", note: "Voted against the ban; actively trades individual equities.", what: "Bars members of Congress and their spouses from trading individual stocks.", tally: "Failed 199–228", status: "Failed in the House" },
      { bill: "HR 901", title: "Lobbying Transparency Act", cast: "yea", with: true, date: "Jul 2024", note: "Supported 48-hour lobbyist-contact disclosure.", what: "Requires lobbyists to disclose contacts with members within 48 hours.", tally: "Passed House 240–188", status: "Passed House" },
      { bill: "HRes 60", title: "Term-Limit Disclosure Resolution", cast: "yea", with: true, date: "Feb 2024", note: "Backed the non-binding term-limit disclosure resolution.", what: "Non-binding resolution urging members to disclose their position on term limits.", tally: "Agreed to 250–170", status: "Agreed to" },
    ],
  },
];
const VOTES_TOTAL = VOTE_RECORD.reduce((n, g) => n + g.total, 0);
const VOTES_KEPT = VOTE_RECORD.reduce((n, g) => n + g.kept, 0);

/* ---- one roll-call vote card — compact: bill + verdict on one line,
   the plain-language note + date/source on the next ---- */
function VoteCard({ v }) {
  return (
    <div className={"votecard " + (v.with ? "with" : "against")}>
      <div className="vc-top">
        <span className="vc-num">{v.bill}</span>
        <span className="vc-ttl">{v.title}</span>
        <span className={"vc-cast " + v.cast}>Voted {v.cast === "yea" ? "YEA" : "NAY"}</span>
        <span className={"vc-align " + (v.with ? "with" : "against")}>{v.with ? "✓ With you" : "✗ Against you"}</span>
      </div>
      <div className="vc-line">
        <p className="vc-note">{v.note}</p>
        <span className="vc-meta">{v.date} · <a className="vc-src">GovTrack ↗</a></span>
      </div>
    </div>
  );
}

/* ---- the expanded money trail (FunderBars on the Bold Flag system) ---- */
function FunderPanel() {
  const f = REP_FUNDING;
  return (
    <div className="funder-panel">
      <div className="fp-top">
        <div className="fp-tot">
          <span className="fp-amt">{f.total}</span>
          <span className="fp-lab">raised · {f.cycle}</span>
        </div>
        <span className="fp-peer">{f.peer}</span>
      </div>

      <div className="fp-mix">
        <div className="fp-mixbar">
          <i className="small" style={{ width: f.mix.small + "%" }}></i>
          <i className="large" style={{ width: f.mix.large + "%" }}></i>
          <i className="pac" style={{ width: f.mix.pac + "%" }}></i>
        </div>
        <div className="fp-legend">
          <span><i className="small"></i><b>{f.mix.small}%</b> Small donors <small>&lt;$200</small></span>
          <span><i className="large"></i><b>{f.mix.large}%</b> Large donors <small>≥$200</small></span>
          <span className="leg-pac"><i className="pac"></i><b>{f.mix.pac}%</b> <span className="pac-term tip-open" tabIndex={0}>PACs<span className="pac-tip" role="tooltip"><b>PAC</b>= {f.pacDef}</span></span> <small>groups &amp; lobbies</small></span>
        </div>
      </div>

      <div className="fp-block">
        <div className="fp-sub">Where the money comes from <span className="fp-sub-note">industry breakdown</span></div>
        <div className="fp-inds">
          {f.industries.map((it) => (
            <div className="fp-ind" key={it.label}>
              <span className="fi-name">{it.label}</span>
              <span className="fi-track"><i style={{ width: (it.pct / 28 * 100) + "%" }}></i></span>
              <span className="fi-amt">{it.amt}</span>
              <span className="fi-pct">{it.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* The honest “we can’t yet attribute these PACs” note sits at the foot;
         the PAC *definition* is a tooltip on the “PACs” legend term (Muxin). */}
      <div className="fp-pacblock">
        <div className="fp-pacnote">
          <span className="fp-pacnote-ic" aria-hidden="true">!</span>
          <p>About <b>{f.pacAmt}</b> ({f.pacPct}%) came from PACs, but we haven't yet identified specific issue-PACs behind that money. We only name a PAC when we can attribute it to a public agenda — the industry breakdown above is the categorical view.</p>
        </div>
      </div>

      <div className="fp-src">Source · FEC filings (OpenSecrets aggregation) · {f.cycle}</div>
    </div>
  );
}

/* ---- the "See all votes" full record — it's a lot, so it's one tap away ---- */
function AllVotesSheet({ onClose }) {
  return (
    <div className="avsheet-scrim">
      <div className="avsheet">
        <div className="av-head">
          <div className="av-htext">
            <div className="av-eyebrow">Full voting record</div>
            <h3>{VOTES_KEPT} of {VOTES_TOTAL} key votes matched your position</h3>
          </div>
          <button className="av-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="av-filters">
          <span className="avf active">All {VOTES_TOTAL}</span>
          <span className="avf">✓ With you {VOTES_KEPT}</span>
          <span className="avf">✗ Against you {VOTES_TOTAL - VOTES_KEPT}</span>
          <span className="avf-sep"></span>
          {VOTE_RECORD.map((g) => <span className="avf" key={g.issue}>{g.issue}</span>)}
        </div>
        <div className="av-body">
          {VOTE_RECORD.map((g) => (
            <div className="av-group" key={g.issue}>
              <div className="av-glab">
                <span className="avg-name">{g.issue}</span>
                <span className={"avg-frac " + g.align}>{g.kept}/{g.total} with you</span>
              </div>
              {g.votes.map((v) => {
                const open = v.bill === "HR 3421";
                return (
                  <React.Fragment key={v.bill}>
                    <div className={"av-row " + (v.with ? "with" : "against") + (open ? " open" : "")}>
                      <span className={"avr-flag " + (v.with ? "with" : "against")}>{v.with ? "✓" : "✗"}</span>
                      <span className="avr-bill"><b>{v.bill}</b> · {v.title}</span>
                      <span className={"avr-cast " + v.cast}>{v.cast === "yea" ? "YEA" : "NAY"}</span>
                      <span className="avr-date">{v.date}</span>
                      <span className="avr-chev">{open ? "▾" : "▸"}</span>
                    </div>
                    {open && (
                      <div className="av-detail">
                        <p className="avd-what">{v.what}</p>
                        <div className="avd-meta">
                          <span className="avd-pair"><span className="k">Roll call</span><span className="val">{v.tally}</span></span>
                          <span className="avd-pair"><span className="k">Status</span><span className="val">{v.status}</span></span>
                          <span className="avd-pair"><span className="k">Their vote</span><span className={"val " + (v.with ? "with" : "against")}>Voted {v.cast === "yea" ? "YEA" : "NAY"} · {v.with ? "with you" : "against you"}</span></span>
                        </div>
                        <a className="avd-link">View the official roll-call ↗</a>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          ))}
        </div>
        <div className="av-foot">
          <span>Every vote links to the official roll-call.</span>
          <span className="av-src">Source · GovTrack · Congress.gov (CRS)</span>
        </div>
      </div>
    </div>
  );
}

function RepCardFull({ expand }) {
  const showFunding = expand === "funding";
  const showVotes = expand === "votes";
  return (
    <div className="rcard">
      <div className="rcard-strip">
        <span className="office">U.S. House · TX-21</span>
        <span className="dist">Your Representative · 4 terms</span>
        <span className="next">Up Nov 2026</span>
      </div>
      <div className="rcard-head">
        <div className="rcard-avatar">?</div>
        <div className="rcard-who">
          <div className="blind">This seat's incumbent</div>
          <div className="sub">Name &amp; party hidden — judge the record, not the person</div>
        </div>
        <button className="rcard-reveal">Reveal name</button>
      </div>

      <div className="align-band">
        <div className="align-top">
          <span className="at-lab">Voted with you</span>
          <span><span className="at-pct bad">58%</span><span className="at-frac">7 / 12 key votes</span></span>
        </div>
        <div className="align-rows">
          {showVotes ? (
            <React.Fragment>
              <div className="align-row sel">
                <span className="ai">Healthcare access</span>
                <span className="align-track"><i className="good" style={{ width: "75%" }}></i></span>
                <span className="av">3/4 <span className="caret">▾</span></span>
              </div>
              <div className="align-row"><span className="ai">Housing affordability</span><span className="align-track"><i className="bad" style={{ width: "40%" }}></i></span><span className="av">2/5 <span className="caret dim">▸</span></span></div>
              <div className="align-row"><span className="ai">Government accountability</span><span className="align-track"><i className="bad" style={{ width: "33%" }}></i></span><span className="av">2/3 <span className="caret dim">▸</span></span></div>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <div className="align-row"><span className="ai">Healthcare access</span><span className="align-track"><i className="good" style={{ width: "75%" }}></i></span><span className="av">3/4</span></div>
              <div className="align-row"><span className="ai">Housing affordability</span><span className="align-track"><i className="bad" style={{ width: "40%" }}></i></span><span className="av">2/5</span></div>
              <div className="align-row"><span className="ai">Government accountability</span><span className="align-track"><i className="bad" style={{ width: "33%" }}></i></span><span className="av">2/3</span></div>
            </React.Fragment>
          )}
        </div>
        {showVotes && <VoteDrilldown group={VOTE_RECORD[0]} />}
      </div>

      <div className="att-line"><span>Missed <b>11%</b> of floor votes this term — <b>above</b> the House median (6%)</span><span className="att-tag bad">Below average</span></div>

      {showFunding ? (
        <div className="money-line open">
          <div className="money-top">
            <span className="ml-lab">Funding</span>
            <span className="money-bars"><i className="small" style={{ width: "15%" }}></i><i className="large" style={{ width: "39%" }}></i><i className="pac" style={{ width: "46%" }}></i></span>
            <span className="ml-tot">$4.2M</span>
          </div>
          <div className="money-detail">
            <span className="md-who"><b>46% PAC-funded</b> · top: Energy, Real estate, Finance</span>
          </div>
          <FunderPanel />
        </div>
      ) : (
        <div className="money-line">
          <div className="money-top">
            <span className="ml-lab">Funding</span>
            <span className="money-bars"><i className="small" style={{ width: "15%" }}></i><i className="large" style={{ width: "39%" }}></i><i className="pac" style={{ width: "46%" }}></i></span>
            <span className="ml-tot">$4.2M</span>
          </div>
          <div className="money-detail">
            <span className="md-who"><b>46% PAC-funded</b> · top: Energy, Real estate, Finance</span>
          </div>
        </div>
      )}

      <div className="card-evidence">
        <button>See all 12 votes →</button>
        <button>{showFunding ? "Hide funders ▴" : "Funders & influence ▾"}</button>
      </div>

      <div className="verdicts">
        <button className="vbtn keep"><span className="ck">✓</span> Worth keeping</button>
        <button className="vbtn replace"><span className="ck"></span> Time to replace</button>
      </div>
      <div className="card-sources"><span className="lab">Sources</span><a>GovTrack</a><span>·</span><a>Congress.gov (CRS)</a><span>·</span><a>FEC</a><span>·</span><a>OpenSecrets</a></div>
    </div>
  );
}

/* ---- the per-issue drilldown — the votes behind one issue's score ---- */
function VoteDrilldown({ group }) {
  return (
    <div className="vote-drill">
      <div className="vd-head">
        <span className="vd-lab"><b>{group.issue}</b> · the {group.total} votes behind this score</span>
        <span className="vd-frac">{group.kept} matched · {group.total - group.kept} didn't</span>
      </div>
      <div className="vd-cards">
        {group.votes.map((v) => <VoteCard v={v} key={v.bill} />)}
      </div>
    </div>
  );
}

function RepCardCompact() {
  return (
    <div className="rcard">
      <div className="rcard-strip">
        <span className="office">U.S. House · TX-21</span>
        <span className="next">Up Nov 2026</span>
      </div>
      <div className="rcard-head">
        <div className="rcard-avatar">?</div>
        <div className="rcard-who"><div className="blind">This seat's incumbent</div><div className="sub">Judge the record, not the person</div></div>
      </div>
      <div className="align-band">
        <div className="align-top"><span className="at-lab">Voted with you</span><span><span className="at-pct bad">58%</span><span className="at-frac">7 / 12</span></span></div>
        <div className="align-rows">
          <div className="align-row"><span className="ai">Healthcare access</span><span className="align-track"><i className="good" style={{ width: "75%" }}></i></span><span className="av">3/4</span></div>
          <div className="align-row"><span className="ai">Housing affordability</span><span className="align-track"><i className="bad" style={{ width: "40%" }}></i></span><span className="av">2/5</span></div>
        </div>
      </div>
      <div className="verdicts">
        <button className="vbtn keep"><span className="ck">✓</span> Keep</button>
        <button className="vbtn replace"><span className="ck"></span> Replace</button>
      </div>
    </div>
  );
}

function ResultsRail({ compact }) {
  return (
    <div className="res-rail">
      <div className="rail-head">
        <div className="rh-t">Your delegation</div>
        <div className="rh-prog">
          <span className="rh-dots"><i className="active"></i><i></i></span>
          <span className="rh-count">0 of 2 decided</span>
        </div>
      </div>
      <div className="rail-list">
        <div className="rail-group-lab">Reviewing now</div>
        <div className="rseat active">
          <span className="ri">HR</span>
          <span className="rmeta"><span className="ro">U.S. House · TX-21</span><span className="rn">This seat</span></span>
          <span className="rstatus">Now</span>
        </div>
        <div className="rail-group-lab">Not yet reviewed</div>
        <div className="rseat">
          <span className="ri">SE</span>
          <span className="rmeta"><span className="ro">U.S. Senate · Class II</span><span className="rn">This seat</span></span>
          <span className="rstatus pending">Up next</span>
        </div>
        <div className="rail-group-lab">Not up for election</div>
        <div className="rseat notup">
          <span className="ri">SE</span>
          <span className="rmeta"><span className="ro">U.S. Senate · Class I</span><span className="rn">Junior Senator</span></span>
          <span className="rstatus pending">2028</span>
        </div>
      </div>
      <div className="rail-foot">
        <button className="btn-primary" disabled>Print my scorecard</button>
        <div className="rf-hint">Decide both seats to print · 0 of 2</div>
      </div>
    </div>
  );
}

function ResultsScreen({ palette = "warm", compact = false, expand = null, allVotes = false }) {
  return (
    <div className="screen" data-palette={palette}>
      <div className={"res" + (compact ? " compact" : "")}>
        {!compact && <SCNav />}
        <div className="res-context">
          <span className="rc-back">← Seats</span>
          {!compact && <span className="rc-addr">1100 Congress Ave, Austin, TX 78701</span>}
          <span className="rc-issues">
            <span className="rc-lab">Your issues</span>
            <span className="chip-issue">Healthcare access</span>
            <span className="chip-issue">Housing affordability</span>
            {!compact && <span className="chip-issue">Government accountability</span>}
            <span className="chip-issue edit">Edit</span>
          </span>
        </div>
        <div className="res-main">
          <div className="res-center">
            <div className="res-tier">
              <span className="tp">SEAT 1 OF 2</span>
              <div><h2>Your U.S. House seat <span className="lvl">FEDERAL</span></h2><p>One representative for TX-21. They vote on federal law — healthcare, housing, spending. Here's their record against your issues.</p></div>
            </div>
            {compact ? <RepCardCompact /> : <RepCardFull expand={expand} />}
          </div>
          <ResultsRail compact={compact} />
        </div>
      </div>
      {allVotes && <AllVotesSheet onClose={() => {}} />}
    </div>
  );
}

Object.assign(window, {
  ResultsScreen, RepCardFull, RepCardCompact, ResultsRail,
  FunderPanel, VoteCard, VoteDrilldown, AllVotesSheet,
});
