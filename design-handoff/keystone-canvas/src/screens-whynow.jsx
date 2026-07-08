/* ====================================================
   "WHY NOW?" PAGE — card 9031f1ce
   Long-form editorial making the larger case, on the Bold Flag
   white ground. Copy adapted (not verbatim) from the founder's
   framing: the problem is money's grip on attention; the moment is
   2026; the answer is judging the record, not the messaging.
   Houses the two fact snippets pulled from the homepage hero.
   ==================================================== */

function WhyNow() {
  return (
    <div className="screen" data-palette="white">
      <div className="wn">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <SCNav />
        <div className="wn-main">

          {/* masthead */}
          <div className="wn-mast">
            <span className="ey kick"><span className="star">★</span> The case · America's 250th election</span>
            <h1>Why <em>now</em></h1>
            <p className="dek">We hire Congress to do the work of governing so we can get back to our lives. This year, we get to decide who actually earned the job.</p>
          </div>

          {/* 1 · the problem */}
          <div className="wn-sec">
            <div className="wn-kicker">Here's why</div>
            <h2 className="wn-h2">Your representative spends more time raising money than reading bills.</h2>
            <div className="wn-cols">
              <div className="wn-body">
                <p><span className="lead-in">The job has quietly changed.</span> Members of Congress can spend up to <b>six hours of every working day</b> dialing for dollars — and how much they raise predicts whether they keep their seat better than anything they actually did with it.</p>
                <p>Guess whose calls get returned. The people with the most money to give — donors, PACs, and the handful of industries that can write the biggest checks — buy the one thing every campaign runs on: <b>your attention</b>, repeated until it sticks.</p>
                <p>When fundraising decides elections, representatives answer to their funders, not their constituents. That's the leak. The good news: it's plugged at one place money can't follow — <b>the ballot</b>.</p>
              </div>
              <div className="wn-stats">
                <div className="wn-stat">
                  <div className="v">6<small>hrs / day</small></div>
                  <div className="l">Average time a member of Congress spends fundraising, per call-time guidance shown to incoming freshmen.</div>
                  <div className="cite">Source · Issue One, 2024 · CBS 60 Minutes</div>
                </div>
                <div className="wn-stat red">
                  <div className="v">94<small>%</small></div>
                  <div className="l">of House incumbents who ran for re-election in 2024 won. Without a record check, every November is a coin flip.</div>
                  <div className="cite">Source · OpenSecrets · FEC filings</div>
                </div>
              </div>
            </div>
          </div>

          {/* 2 · why now — the moment, on the brand ground */}
          <div className="wn-sec brand">
            <div className="wn-kicker">Why now</div>
            <h2 className="wn-h2">In November, every House seat and a third of the Senate is on the ballot. <em>We decide who keeps the job.</em></h2>
            <div className="wn-body">
              <p>2026 isn't a quiet midterm. It's the widest opening voters get — the moment the people who've been representing you have to come back and ask for the job again. Wouldn't you want to know who's actually been working on your behalf before you sign off?</p>
            </div>
            <div className="wn-ballot">
              <div className="cell"><div className="v">435</div><div className="l">U.S. House seats up — every single one.</div></div>
              <div className="cell"><div className="v gold">34</div><div className="l">U.S. Senate seats up — a third of the chamber.</div></div>
              <div className="cell"><div className="v">1</div><div className="l">scorecard you bring to the polls, built from your own verdicts.</div></div>
            </div>
          </div>

          {/* 3 · the friction insight — a pull quote */}
          <div className="wn-sec alt">
            <div className="wn-kicker">Why it's hard</div>
            <p className="wn-pull">A ballot asks more than anyone has time for. <em>What do most of us really know about property taxes in our county, or a procedural vote from two years ago?</em> So we fall back on shortcuts — party, yard signs, whatever ad ran the most. Shortcuts are exactly what the money buys.
              <span className="src">The friction is the whole game — so we cut it.</span>
            </p>
          </div>

          {/* 4 · how it works */}
          <div className="wn-sec">
            <div className="wn-kicker">Here's how it works</div>
            <h2 className="wn-h2">Judge them on what they <em>did</em> — not what they said.</h2>
            <div className="wn-steps">
              <div className="wn-step">
                <div className="n">1</div>
                <h3>Pull the record</h3>
                <p>For each of your members of Congress: how they voted, what they opposed, and who funded the campaign — straight from the public record.</p>
                <span className="tag">GovTrack · Congress.gov · FEC</span>
              </div>
              <div className="wn-step">
                <div className="n">2</div>
                <h3>Tell us what you value</h3>
                <p>A short conversation turns what's on your mind into the handful of issues you actually want them measured against.</p>
                <span className="tag">Your issues · your ranking</span>
              </div>
              <div className="wn-step">
                <div className="n">3</div>
                <h3>Get your verdict</h3>
                <p>We summarize each record against your values — shown blind, so the record speaks first — then turn your keep/replace calls into a printable scorecard for the polls.</p>
                <span className="tag">Blind-first · printable</span>
              </div>
            </div>
          </div>

          {/* closing CTA */}
          <div className="wn-cta">
            <h2>Politicians want one thing: to get re-elected.</h2>
            <p>Make that depend on the work — not the war chest. The leverage is yours, and it's on the ballot.</p>
            <button className="btn-primary">Pull my representatives <span aria-hidden="true">→</span></button>
            <div className="sub">No account · no tracking · your address never leaves your device</div>
          </div>

        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WhyNow });
