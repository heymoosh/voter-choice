/* SCORECARD — print-ready overhaul.
   White sheet, big headings, DECISIONS lead (not address/districts),
   keep vs replace clearly differentiated (color + icon + verdict pill),
   votes-matched shown as a %, logistics demoted to a footer strip,
   non-2026 seat excluded from the decisions. */
function Scorecard() {
  return (
    <div className="screen" data-palette="white">
      <div className="sheetwrap">
        <div className="sheet">
          <div className="pflag"><i></i><i></i></div>
          <div className="sheet-pad">
            <div className="sheet-mast">
              <div>
                <h1>My Scorecard</h1>
                <div className="mast-sub">Voter Choice · General Election · Nov 3, 2026</div>
              </div>
              <div className="mast-r"><b>Austin, TX</b><br />Precinct 0312<br />Travis County</div>
            </div>

            <div className="sheet-section-lab">My decisions · 2 seats up for election</div>

            <div className="dec">
              <div className="dec-badge replace">⇄</div>
              <div className="dec-main">
                <div className="dec-office">U.S. House · TX-21</div>
                <div className="dec-name"><span className="nm">Replace with J. Marqual</span> <span className="dec-verdict replace">Time to replace</span></div>
                <div className="dec-note">Replacing the incumbent (<b>58% match</b>) · challenger aligns <b>83%</b> on your issues</div>
              </div>
              <div className="dec-score"><div className="ds-pct bad">58%</div><div className="ds-lab">incumbent match</div></div>
            </div>

            <div className="dec">
              <div className="dec-badge keep">✓</div>
              <div className="dec-main">
                <div className="dec-office">U.S. Senate · Class II</div>
                <div className="dec-name"><span className="nm">Keep R. Delgado</span> <span className="dec-verdict keep">Worth keeping</span></div>
                <div className="dec-note">Voted with you on <b>9 of 11</b> key votes · small-donor funded</div>
              </div>
              <div className="dec-score"><div className="ds-pct good">82%</div><div className="ds-lab">votes matched you</div></div>
            </div>

            <div className="sheet-section-lab">Not on your ballot this year</div>
            <div className="dec notup">
              <div className="dec-badge">—</div>
              <div className="dec-main">
                <div className="dec-office">U.S. Senate · Class I</div>
                <div className="dec-name"><span className="nm">Junior Senator</span> <span className="dec-verdict" style={{ background: "oklch(0.95 0.006 260)", color: "oklch(0.50 0.026 260)" }}>Not up until 2028</span></div>
                <div className="dec-note">Shown for context · no decision needed this election</div>
              </div>
            </div>

            <div className="sheet-meta">
              <div className="cell"><div className="k">Registered address</div><div className="v">1100 Congress Ave, Austin, TX 78701</div></div>
              <div className="cell"><div className="k">Your districts</div><div className="v">U.S. House TX-21</div></div>
              <div className="cell"><div className="k">Bring (any one)</div><div className="v">TX driver license · TX ID · U.S. passport</div></div>
              <div className="cell"><div className="k">Early voting</div><div className="v">Oct 19 – Oct 30, 2026</div></div>
            </div>

            <div style={{ marginTop: "18px" }}>
              <div className="k" style={{ fontFamily: "var(--mono)", fontSize: "9px", letterSpacing: "0.08em", textTransform: "uppercase", color: "oklch(0.54 0.026 260)", fontWeight: 600 }}>Judged against your issues</div>
              <div className="sheet-issues"><span className="pill">Healthcare access</span><span className="pill">Housing affordability</span><span className="pill">Government accountability</span></div>
            </div>

            <div className="sheet-foot">
              <span><b>Built with Voter Choice</b> · Free · nonpartisan · voterchoice.app · © 2026 Grey Bird LLC. All Rights Reserved.</span>
              <span>Generated Jun 16, 2026 · Ref VC-7K2Q09 · Page 1 of 1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Scorecard });
