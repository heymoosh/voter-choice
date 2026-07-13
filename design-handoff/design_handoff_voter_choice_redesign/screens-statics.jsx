/* ====================================================
   STATIC / TOP-LEVEL PAGES — editorial template rollout
   About · How it works · Privacy · Tip jar + Loading + footer.
   Copy lifted from the live delta (redesign2-shared.jsx /
   prototype-screens-c.jsx); re-skinned onto the Why-Now editorial
   system so the whole site reads as one publication.
   ==================================================== */

/* reorganized footer (b1a5f64a: Privacy after About · c9891a1f: trim to
   brand + © Grey Bird LLC; Support + Tip jar kept, de-emphasized) */
function VCFooter() {
  return (
    <footer className="vc-foot">
      <div className="vc-foot-brand">
        <span className="b"><span className="mark">V</span> Voter Choice</span>
        <span className="c">Free · nonpartisan · © 2026 Grey Bird LLC. All Rights Reserved.</span>
      </div>
      <nav className="vc-foot-links">
        <a>Privacy</a>
        <a>Terms</a>
      </nav>
    </footer>
  );
}

/* the shared editorial shell every static page now uses */
function StaticPageVC({ eyebrow, title, dek, children }) {
  return (
    <div className="screen" data-palette="white">
      <div className="sp">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <SCNav />
        <div className="sp-body">
          <div className="sp-wrap">
            <div className="sp-back">← Back</div>
            <div className="sp-mast">
              <div className="sp-kicker">{eyebrow}</div>
              <h1>{title}</h1>
              {dek && <p className="dek">{dek}</p>}
            </div>
            <div className="sp-prose">{children}</div>
          </div>
        </div>
        <VCFooter />
      </div>
    </div>
  );
}

function AboutVC() {
  return (
    <StaticPageVC eyebrow="About Voter Choice" title="A free, non-partisan ballot research tool." dek="Built and operated by Grey Bird LLC — a small independent shop closing the gap between what a candidate says and what they actually did.">
      <p>We made Voter Choice because the distance between “what a candidate says in their ads” and “what they actually voted on” has widened every cycle. Voters deserve a tool that closes it.</p>
      <h2>What we do</h2>
      <p>For every race on your ballot we pull the <b>actual voting record</b> of incumbents (Congress.gov, state legislatures), the <b>funding picture</b> (FEC, OpenSecrets, state ethics commissions), and the <b>editorially-curated context</b> behind each vote. We score how each candidate aligns with the issues <i>you</i> told us matter — vote by vote.</p>
      <h2>What we don't do</h2>
      <ul>
        <li><b>No accounts.</b> No sign-up, no email, no password.</li>
        <li><b>No third-party analytics.</b> No ad pixels, no telemetry, no cross-site tracking.</li>
        <li><b>No endorsement.</b> We don't tell you who to vote for — we show you what they've done. The choice is yours.</li>
        <li><b>No data hoarding.</b> Your address, draft picks, and chat live in your browser. Close the tab without saving and it's gone.</li>
      </ul>
      <p>The one thing we deliberately keep: your <b>chosen issues</b> and your <b>state</b> — never your street address — retained de-identified and in aggregate to power <b>Polis</b>, our shared opinion map. Everything else stays on your device.</p>
      <h2>Who pays for this?</h2>
      <p>Server costs, the Anthropic API budget, and the editorial work behind our case files are funded by <b>Grey Bird LLC</b> and a small set of individual donors who explicitly do not buy a say in editorial.</p>
      <h2>Get in touch</h2>
      <p>Reach Grey Bird LLC at <a href="mailto:muxin.li.pro@gmail.com"><code>muxin.li.pro@gmail.com</code></a>. We answer.</p>
    </StaticPageVC>
  );
}

function HowItWorksVC() {
  return (
    <StaticPageVC eyebrow="How it works" title="How we score candidates." dek="Every number on a card traces to your own words and to an official source — never to a guess.">
      <div className="sp-step"><div className="n">1</div><div><h3>Issues come from you</h3><p>When you describe your concerns, we extract canonical issues and a directional stance (“favors lower drug prices”). You confirm, rename, or remove before any scoring happens. We don't pre-bake a list and check boxes against it.</p></div></div>
      <div className="sp-step"><div className="n">2</div><div><h3>Votes come from official roll-call data</h3><p>Federal from <a href="https://www.congress.gov/roll-call-votes" target="_blank" rel="noopener noreferrer">Congress.gov</a>, state from each legislature. For each issue our editors select 2–5 “case file” votes — the bills that most directly test it. No curated case file? The score reads <i>“thin record”</i> instead of guessing.</p></div></div>
      <div className="sp-step"><div className="n">3</div><div><h3>Donor data comes from FEC + state filings</h3><p>Federal from the <a href="https://www.fec.gov" target="_blank" rel="noopener noreferrer">FEC</a> and <a href="https://www.opensecrets.org" target="_blank" rel="noopener noreferrer">OpenSecrets</a>; state from ethics commissions. Named issue PACs are broken out only when they have a public, citable agenda.</p></div></div>
      <div className="sp-step"><div className="n">4</div><div><h3>“With you / against you” is your stance vs. the vote</h3><p>If you favor lower drug prices, a vote FOR Medicare price negotiation reads “WITH YOU”; a vote AGAINST reads “AGAINST YOU.” When the record is mixed, we show the raw vote — never a softened summary.</p></div></div>
      <h2>The AI's role</h2>
      <p>The AI's job is to <b>route and summarize</b>, not to invent. It pulls from our structured database of votes, donors, and narratives. It does not generate vote claims — if a vote isn't in our database, we don't show it.</p>
      <h2>Mistakes</h2>
      <p>We'll make them. When we do, we publish a correction and update the case file. Every claim links to a primary source so you can verify it yourself. Found one? Email <a href="mailto:muxin.li.pro@gmail.com"><code>muxin.li.pro@gmail.com</code></a>.</p>
    </StaticPageVC>
  );
}

function PrivacyVC() {
  return (
    <StaticPageVC eyebrow="Privacy policy" title="What stays here, what doesn't." dek="No analytics, no telemetry, no accounts. Most of what you do never leaves your browser.">
      <p className="sp-meta">Effective April 12, 2026 · Grey Bird LLC</p>
      <h2>Minimal data collection</h2>
      <p>We use no third-party analytics, ad pixels, accounts, or sign-ups. Across visits, your browser's localStorage keeps only your <b>language</b>, your <b>issues</b>, a <b>county-level location</b> (never your street address), and optionally a <b>bring-your-own Anthropic key</b>. Your <b>precise address</b> and <b>in-progress assessment</b> are kept only for the current tab and cleared when you close it.</p>
      <h2>Polis — the shared opinion map</h2>
      <p>When you add your views to <b>Polis</b> (our map of where voters stand), your <b>chosen issues</b> and <b>state-level location</b> are retained on our servers — <b>de-identified and shown only in aggregate</b>, never tied to your street address, name, or chat. It's the one place your data persists beyond your browser, and it exists only so the map can show how your priorities compare to your neighbors'.</p>
      <h2>Your address</h2>
      <p>If you enter a street address it may be used for autocomplete in your browser and is sent to the <b>Google Civic Information API</b> through our server for polling-place lookup. We do not intentionally log or store it on our servers, and we never include it in the AI prompt.</p>
      <h2>Chat conversations</h2>
      <p>Chat exists in browser memory while the page is open and is not intentionally stored or logged by our servers. Messages are sent to the <b>Anthropic API</b> for processing — don't type your name, exact address, phone, or email into chat. See <a href="https://www.anthropic.com/policies/privacy" target="_blank" rel="noopener noreferrer">Anthropic's privacy policy</a>.</p>
      <h2>What we cannot provide</h2>
      <p>We do not create or store a combined record of who you are, where you live, and what you said. If anyone asked us for “who said what and where they live,” we wouldn't have it to give. This doesn't bind infrastructure providers under their own policies.</p>
      <h2>Contact</h2>
      <p>Questions about this policy? <a href="mailto:muxin.li.pro@gmail.com"><code>muxin.li.pro@gmail.com</code></a>.</p>
    </StaticPageVC>
  );
}

function TipJarVC() {
  const amts = [
    { label: "$3", lead: false }, { label: "$5", lead: true }, { label: "$10", lead: false }, { label: "$25", lead: false },
  ];
  return (
    <StaticPageVC eyebrow="Tip jar" title="Keep the community AI budget alive." dek="No ads, no tracking, no data sales. Tips and small individual contributions are the only revenue.">
      <div className="sp-tips">
        {amts.map((a) => <a key={a.label} className={"sp-tip" + (a.lead ? " lead" : "")}>{a.label}</a>)}
      </div>
      <p className="sp-tipnote">One-time card payment · no account needed · Voter Choice never sees your card</p>
      <h2>Where it goes</h2>
      <ul>
        <li><b>Anthropic API spend</b> — the AI chat budget that runs out when too many voters use it at once.</li>
        <li><b>Server + hosting</b> — Vercel plus a small Redis instance for rate-limiting.</li>
      </ul>
      <p>Voter Choice is built by <b>Grey Bird LLC</b>. When the community budget runs out you can bring your own Anthropic key rather than pay us — we'd rather pause than monetize you.</p>
    </StaticPageVC>
  );
}

function LoadingVC() {
  const steps = [
    { t: "Geocoding address", s: "done" },
    { t: "Looking up your precinct", s: "done" },
    { t: "Pulling federal & state races", s: "active" },
    { t: "Loading donor history", s: "" },
  ];
  return (
    <div className="screen" data-palette="white">
      <div className="ldg">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <SCNav />
        <div className="ldg-body">
          <div className="ldg-card">
            <div className="ldg-pulse"><i></i></div>
            <h2>Pulling your representatives.</h2>
            <div className="ldg-addr">1100 Congress Ave, Austin, TX 78701</div>
            <div className="ldg-steps">
              {steps.map((st, i) => (
                <div key={i} className={"ldg-step " + st.s}><span className="ck">{st.s === "done" ? "✓" : ""}</span><span>{st.t}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { VCFooter, StaticPageVC, AboutVC, HowItWorksVC, PrivacyVC, TipJarVC, LoadingVC });
