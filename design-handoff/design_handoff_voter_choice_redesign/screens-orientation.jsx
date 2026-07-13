/* Shared chrome + ORIENTATION directions (A/B/C) — the keystone "guided entry". */
const { Fragment: Fr } = React;

function SCNav({ palette }) {
  return (
    <div className="sc-nav">
      <div className="sc-brand"><span className="mark">V</span> Voter Choice</div>
      <div className="sc-nav-links">
        <a>About</a>
        <a>Why now</a>
        <a>How it works</a>
        <a>Privacy</a>
        <span className="tip">Tip jar</span>
        <span className="sc-lang">EN <span className="lang-caret" aria-hidden="true">▾</span></span>
      </div>
    </div>
  );
}

/* ---------- A · GUIDED TOUR ----------
   A dedicated full-screen orientation card before any rep appears.
   This is the exact "tell me what's about to happen" ask. */
function OrientationA() {
  return (
    <div className="screen" data-palette="warm">
      <div className="ori">
        <SCNav />
        <div className="ori-body">
          <div className="ori-card">
            <div className="ori-ey"><span className="kick"><span className="star">★</span> Before you start · step 3 of 3</span></div>
            <h1>Here's how you'll <em>assess your delegation</em>.</h1>
            <p className="ori-lede">Three people in Washington answer to your address. You'll look at each one's record — then decide.</p>
            <div className="ori-steps">
              <div className="ori-step"><span className="n">1</span><div><div className="st-t">See the record, not the name</div><div className="st-d">For each seat: how they voted on your issues, how they're funded, and who's influencing them — shown blind, so you judge the record first.</div></div></div>
              <div className="ori-step"><span className="n">2</span><div><div className="st-t">Decide: worth keeping, or time to replace</div><div className="st-d">At the bottom of every card you make one call. If you'd replace them, you can compare the people running for the seat.</div></div></div>
              <div className="ori-step"><span className="n">3</span><div><div className="st-t">Print your scorecard</div><div className="st-d">Do this for everyone up for election, then take a printable scorecard to the polls.</div></div></div>
            </div>
            <div className="ori-cta">
              <button className="btn-primary">Start with your first seat <span aria-hidden="true">→</span></button>
              <span className="ori-meta">~4 min · 2 seats up in 2026</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- B · MISSION CHECKLIST ----------
   Orientation framed as a 3-step plan, with the actual delegation
   previewed on the right so the scope is concrete and finite. */
function OrientationB() {
  return (
    <div className="screen" data-palette="warm">
      <div className="ori">
        <SCNav />
        <div className="mis-body">
          <div className="mis-left">
            <span className="kick"><span className="star">★</span> Your assignment</span>
            <h1>Three seats. One decision each.</h1>
            <p className="lede">You're about to hold your delegation to their record. Here's the whole job, start to finish — no surprises.</p>
            <div className="mis-plan">
              <div className="mis-row lead"><div className="ring">1</div><div><div className="mt">Review the record</div><div className="md">Votes on your issues · funding · influence — shown blind</div></div></div>
              <div className="mis-row"><div className="ring">2</div><div><div className="mt">Keep or replace</div><div className="md">One verdict per seat · compare challengers if you replace</div></div></div>
              <div className="mis-row"><div className="ring">3</div><div><div className="mt">Print your scorecard</div><div className="md">Take your decisions to the polls</div></div></div>
            </div>
            <button className="btn-primary">Begin — review seat 1 <span aria-hidden="true">→</span></button>
          </div>
          <div className="mis-right">
            <div className="rk">Up for your vote · Austin, TX 78701</div>
            <div className="mis-deleg">
              <div className="mis-seat"><span className="sx">HR</span><div><div className="so">U.S. House · TX-21</div><div className="sn">Your Representative</div></div><span className="snote">Up Nov 2026</span></div>
              <div className="mis-seat"><span className="sx">SE</span><div><div className="so">U.S. Senate · Class II</div><div className="sn">Senior Senator</div></div><span className="snote">Up Nov 2026</span></div>
              <div className="mis-seat muted"><span className="sx">SE</span><div><div className="so">U.S. Senate · Class I</div><div className="sn">Junior Senator</div></div><span className="snote">Not up · 2028</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- C · THE BRIEFING ----------
   Editorial front-page "briefing" — leans into the activation the
   feedback asked for, makes the larger case, then sends you in. */
function OrientationC() {
  return (
    <div className="screen" data-palette="white">
      <div className="brief">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <div className="brief-mast">
          <div className="ml"><span>Vol. 2026 · No. 1</span><span>Austin, Texas</span><span>Nonpartisan · Free</span></div>
          <h1>Your Briefing</h1>
        </div>
        <div className="brief-body">
          <div className="brief-lead">
            <div className="dek-k">What you're about to do</div>
            <h2>Three people vote in your name. <em>Today you check their work.</em></h2>
            <p><span className="drop">You'll review each seat's record</span> — how they voted on the issues you chose, who funds them, who's running against them — shown blind, so the record speaks before the name does.</p>
            <p>At the bottom of every card, one call: <b>worth keeping</b>, or <b>time to replace</b>. Finish the seats up for election, then print a scorecard for the polls.</p>
            <button className="btn-primary">Read the first record <span aria-hidden="true">→</span></button>
          </div>
          <div className="brief-aside">
            <div className="brief-stat"><div className="bv">2</div><div className="bd">of your 3 seats are on the ballot this November</div><div className="bc">U.S. House · U.S. Senate</div></div>
            <div className="brief-rule"></div>
            <div className="brief-stat alt"><div className="bv">~4 min</div><div className="bd">to a printable, address-specific scorecard</div><div className="bc">No account · nothing stored</div></div>
          </div>
        </div>
        <div className="brief-foot">
          <span className="bf-note">Judged against: Healthcare access · Housing affordability · Government accountability</span>
          <button className="btn-ghost">Edit my issues</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- A · GUIDED TOUR — ACTIVATED (the resolved pick) ----------
   The layout teammates picked as "best of the three", on the Bold Flag
   white ground (same UI as results/scorecard), activated with a flag
   hairline + red-white-blue accents. NOT a blue stage. */
function OrientationActivated() {
  return (
    <div className="screen" data-palette="white">
      <div className="ori">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <SCNav />
        <div className="ori-body">
          <div className="ori-card activated">
            <div className="ori-ey"><span className="kick"><span className="star">★</span> Before you start · step 3 of 3</span></div>
            <h1>Here's how you'll <em>hold your delegation to account</em>.</h1>
            <p className="ori-lede">Three people in Washington answer to your address. You'll look at each one's record — then decide.</p>
            <div className="ori-steps">
              <div className="ori-step"><span className="n">1</span><div><div className="st-t">See the record, not the name</div><div className="st-d">How they voted on your issues, how they're funded, who's influencing them — shown blind.</div></div></div>
              <div className="ori-step"><span className="n">2</span><div><div className="st-t">Decide: keep, or replace</div><div className="st-d">One call per seat. If you'd replace them, compare the people running.</div></div></div>
              <div className="ori-step"><span className="n">3</span><div><div className="st-t">Print your scorecard</div><div className="st-d">Finish the seats up for election, then take it to the polls.</div></div></div>
            </div>
            <div className="ori-cta">
              <button className="btn-primary">Start with your first seat <span aria-hidden="true">→</span></button>
              <span className="ori-meta">~4 min · 2 seats up in 2026</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SCNav, OrientationA, OrientationB, OrientationC, OrientationActivated });
