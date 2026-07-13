/* ====================================================
   HOMEPAGE HERO — card b4cc1c9e (+ address simplify 1850349c)
   On the Bold Flag white ground. The two fact snippets are gone
   (they belong on the future "Why Now?" page); the CTA + lede now
   say plainly what the site does; the address box is simplified;
   and the right column previews the actual product.
   ==================================================== */

function HomeHero() {
  return (
    <div className="screen" data-palette="white">
      <div className="vh">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <SCNav />
        <div className="vh-hero">
          <div className="vh-left">
            <span className="vh-eyebrow kick"><span className="star">★</span> Nov 3, 2026 · America's 250th election</span>
            <h1 className="vh-h1">How well are your elected officials really representing you? <em>Get the scorecard.</em></h1>
            <p className="vh-lede">Voter Choice shows you how your <b>senators and representative</b> actually voted on the issues <i>you</i> choose — and who funded them — then turns your verdicts into a <b>scorecard for the polls</b>.</p>

            <div className="vh-addr">
              <div className="vh-addr-lab">
                <span className="l">Your registered address <button className="why" type="button">?</button></span>
                <span className="priv">Stays on this device</span>
              </div>
              <div className="vh-addr-row">
                <input type="text" placeholder="1100 Congress Ave, Austin, TX 78701" defaultValue="" />
                <button className="vh-go">Pull my representatives <span aria-hidden="true">→</span></button>
              </div>
              <div className="vh-disclose">
                <span className="dt">Unsure? How it works · your data <span aria-hidden="true">▾</span></span>
                <div className="vh-steps">
                  <span className="vh-step"><span className="n">1</span> Pull your reps</span>
                  <span className="arw">›</span>
                  <span className="vh-step"><span className="n">2</span> Pick your issues</span>
                  <span className="arw">›</span>
                  <span className="vh-step"><span className="n">3</span> Check the record</span>
                  <span className="arw">›</span>
                  <span className="vh-step"><span className="n">4</span> Print &amp; vote</span>
                </div>
              </div>
            </div>
            <div className="vh-trust"><span>No account</span><span>No tracking</span><span>Address never stored</span></div>
          </div>

          <div className="vh-preview">
            <div className="vh-preview-cap">What you'll get</div>
            <div className="vh-stack">
              {/* scorecard sliver behind */}
              <div className="vh-sheet">
                <div className="pflag"><i></i><i></i></div>
                <div className="vh-sheet-pad">
                  <h5>My Scorecard</h5>
                  <div className="ss-sub">General Election · Nov 3, 2026</div>
                  <div className="ss-row">
                    <div className="ss-badge replace">⇄</div>
                    <div className="ss-tx"><div className="ss-o">U.S. House · TX-21</div><div className="ss-n">Replace</div></div>
                    <div className="ss-pct tone-bad">58%</div>
                  </div>
                  <div className="ss-row">
                    <div className="ss-badge keep">✓</div>
                    <div className="ss-tx"><div className="ss-o">U.S. Senate · Class II</div><div className="ss-n">Keep</div></div>
                    <div className="ss-pct tone-good">82%</div>
                  </div>
                </div>
              </div>
              {/* blind assessment card in front */}
              <div className="vh-rcard">
                <div className="vh-rstrip"><span className="o">U.S. House · TX-21</span><span className="up">Up Nov 2026</span></div>
                <div className="vh-rhead">
                  <div className="vh-rav">?</div>
                  <div className="vh-rwho"><div className="b">This seat's incumbent</div><div className="s">Judge the record, not the name</div></div>
                </div>
                <div className="vh-ralign">
                  <div className="vh-ratop"><span className="lab">Voted with you</span><span className="pct">58%</span></div>
                  <div className="vh-rbars">
                    <div className="vh-rbar"><span className="k">Healthcare access</span><span className="t"><i className="bar-good" style={{ width: "75%" }}></i></span></div>
                    <div className="vh-rbar"><span className="k">Housing affordability</span><span className="t"><i className="bar-bad" style={{ width: "40%" }}></i></span></div>
                  </div>
                </div>
                <div className="vh-rverd">
                  <span className="vh-vb keep">✓ Keep</span>
                  <span className="vh-vb replace">Replace</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- headline voices — the hero copy is high-stakes, so pick one ---- */
function HeadlineVoices() {
  return (
    <div className="screen" data-palette="white">
      <div className="hv">
        <div className="hv-lead">
          <h2>Headline voices — pick the hook</h2>
          <p>Same hero, three framings of what the site does. The recommended one is the activation copy already wired into the hero.</p>
        </div>
        <div className="hv-grid">
          <div className="hv-card pick">
            <div className="hv-tag"><span className="star">★</span> Recommended · Question + CTA</div>
            <h1 className="hv-h">How well are your elected officials really representing you? <em>Get the scorecard.</em></h1>
            <p className="hv-sub">Opens with the question every voter is already asking, then names the payoff. Direct, benefit-led, and nonpartisan.</p>
            <div className="hv-note"><b>Why it wins:</b> leads with the voter's own question and ends on a concrete CTA — the scorecard.</div>
          </div>
          <div className="hv-card">
            <div className="hv-tag">Activation</div>
            <h1 className="hv-h">Three people vote in your name. <em>Today you check their work.</em></h1>
            <p className="hv-sub">Names the stakes in plain language and makes it personal — “your name,” “their work.” The lede carries the mechanism.</p>
            <div className="hv-note"><b>Trade-off:</b> evocative, but says less about <i>what</i> you actually get.</div>
          </div>
          <div className="hv-card">
            <div className="hv-tag">Provocation</div>
            <h1 className="hv-h">Don't re-elect a <span className="red">stranger.</span></h1>
            <p className="hv-sub">Highest-energy, most memorable. Sharper edge — reframes the default (re-election) as the risk. Best if we want the boldest 250th-moment voice.</p>
            <div className="hv-note"><b>Trade-off:</b> more opinionated; test that it still reads nonpartisan.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HomeHero, HeadlineVoices });
