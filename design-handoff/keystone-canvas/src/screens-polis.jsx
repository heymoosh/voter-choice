/* ====================================================
   POLIS — "Where we agree" (card bc774728)
   Two surfaces, no new nav tab:
     PolisStand   → post-decision CONTRIBUTE moment (earned, optional)
     PolisReport  → the "Where America agrees" DISPLAY/report that lives
                    at the foot of the Why-Now page and is shareable.
   The depolarizing read: party lines (D · R · I) CONVERGE on each
   statement. Figures are illustrative. ==================================== */

/* a convergence bar: D/R/I dots clustered on a shared 0–100 track */
function ConvBar({ d, r, i }) {
  const lo = Math.min(d, r, i);
  return (
    <div className="conv">
      <div className="conv-track"></div>
      <div className="conv-fill" style={{ width: lo + "%" }}></div>
      <span className="conv-dot d" style={{ left: d + "%" }}></span>
      <span className="conv-dot r" style={{ left: r + "%" }}></span>
      <span className="conv-dot i" style={{ left: i + "%" }}></span>
    </div>
  );
}

/* ---------- the pol.is-style OPINION MAP (borrowed directly) ----------
   Pol.is runs PCA on everyone's agree/disagree votes → a 2-D map where
   voters who answered alike sit together, forming opinion groups. We
   render that landscape (groups as soft fields + dots), drop a "You"
   marker, and let the consensus statements below read as the bridges
   across the groups. Dots are deterministically generated. */
function pmDots(cx, cy, n, spread, seed) {
  let s = seed; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const out = [];
  for (let k = 0; k < n; k++) {
    const ang = rnd() * 6.283, r = Math.sqrt(rnd()) * spread;
    out.push({ x: Math.max(4, Math.min(96, cx + Math.cos(ang) * r)), y: Math.max(6, Math.min(94, cy + Math.sin(ang) * r * 0.82)) });
  }
  return out;
}
const PM_GROUPS = [
  { id: "a", label: "Group A", note: "lower taxes, secure border", pct: 38, cx: 30, cy: 42, n: 26, spread: 17, cls: "r" },
  { id: "b", label: "Group B", note: "lower drug costs, climate", pct: 37, cx: 70, cy: 38, n: 25, spread: 17, cls: "d" },
  { id: "c", label: "Group C", note: "anti-corruption first", pct: 25, cx: 50, cy: 72, n: 17, spread: 15, cls: "i" },
];
function PolisMap({ compact }) {
  return (
    <div className={"pm-wrap" + (compact ? " compact" : "")}>
      <div className="pm">
        {PM_GROUPS.map((g) => <div key={g.id} className={"pm-blob " + g.cls} style={{ left: g.cx + "%", top: g.cy + "%", width: g.spread * 2.4 + "%", height: g.spread * 2.0 + "%" }}></div>)}
        {PM_GROUPS.map((g) => pmDots(g.cx, g.cy, g.n, g.spread, g.cx * 1000 + g.cy).map((p, i) => (
          <span key={g.id + i} className={"pm-dot " + g.cls} style={{ left: p.x + "%", top: p.y + "%" }}></span>
        )))}
        {PM_GROUPS.map((g) => <span key={"l" + g.id} className="pm-glab" style={{ left: g.cx + "%", top: (g.cy - g.spread - 4) + "%" }}>{g.label} · {g.pct}%</span>)}
        <span className="pm-you" style={{ left: "44%", top: "55%" }}></span>
        <span className="pm-you-lab" style={{ left: "44%", top: "55%" }}>You</span>
      </div>
      {!compact && (
        <div className="pm-cap">
          <div className="pm-key">
            <span><i className="r"></i>Group A · 38%</span>
            <span><i className="d"></i>Group B · 37%</span>
            <span><i className="i"></i>Group C · 25%</span>
            <span className="you"><i></i>You</span>
          </div>
          <p>Each dot is a voter; people who answered alike sit together. We land in different camps — and yet the statements below cleared <b>all three</b>.</p>
        </div>
      )}
    </div>
  );
}

/* ---------- CONTRIBUTE · optional, AFTER the scorecard ---------- */
function PolisStand() {
  return (
    <div className="screen" data-palette="white">
      <div className="ps">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <SCNav />
        <div className="ps-body">
          <div className="ps-inner">
            <span className="ps-k kick"><span className="star">★</span> Your scorecard's ready · this part's optional</span>
            <h1 className="ps-h1">You judged them on the record — <em>not the party.</em></h1>
            <p className="ps-lede">Your scorecard is done and ready to print — this won't touch it. React to a few statements if you like. You answer blind — no running score — and at the end you'll see the full picture: where the groups line up, and where they don't.</p>

            <div className="ps-cards">
              <div className="ps-stmt">
                <p className="q">Members of Congress shouldn't trade individual stocks while in office.</p>
                <div className="ps-react">
                  <button className="ps-btn agree">Agree</button>
                  <button className="ps-btn disagree">Disagree</button>
                  <button className="ps-btn pass">Pass</button>
                </div>
              </div>

              <div className="ps-stmt voted">
                <p className="q">Campaigns depend too much on a handful of big donors.</p>
                <div className="ps-react">
                  <button className="ps-btn agree chosen">✓ You agreed</button>
                  <button className="ps-btn disagree">Disagree</button>
                  <button className="ps-btn pass">Change</button>
                </div>
                <div className="ps-recorded"><span className="rk">✓ Recorded</span> Thanks — that's in. No score, no reveal yet; you'll see the full picture at the end.</div>
              </div>

              <div className="ps-stmt voted">
                <p className="q">I'd rather judge my representative on their record than their party.</p>
                <div className="ps-react">
                  <button className="ps-btn agree">Agree</button>
                  <button className="ps-btn disagree chosen-no">✕ You disagreed</button>
                  <button className="ps-btn pass">Change</button>
                </div>
                <div className="ps-recorded"><span className="rk">✓ Recorded</span> Disagreeing is just as useful — it's in, and we never single you out for it.</div>
              </div>
            </div>
          </div>
        </div>
        <div className="ps-foot">
          <div className="ps-foot-inner">
            <button className="btn-primary">Done — show me the results →</button>
            <span className="prog">2 of 3 answered · anonymous · no running score</span>
            <button className="later">No thanks — back to my scorecard</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- DISPLAY · the honest "where you stand" report ----------
   Neutral by default: leads with the shape of opinion, not a feel-good
   claim. Shows common ground only where it genuinely cleared every group,
   and is honest when it didn't. `divided` renders the low-consensus state. */
function PolisReport({ divided = false }) {
  const rows = divided
    ? [
        { q: "Members of Congress shouldn't trade individual stocks.", src: "9,210 voters · this question", pct: 80, d: 83, r: 77, i: 81 },
      ]
    : [
        { q: "Members of Congress shouldn't trade individual stocks.", src: "12,480 voters · 2026 cycle", pct: 86, d: 88, r: 84, i: 87 },
        { q: "Campaigns depend too much on a handful of big donors.", src: "12,480 voters · 2026 cycle", pct: 79, d: 83, r: 74, i: 80 },
        { q: "I'd rather know my rep's record than their party.", src: "12,480 voters · 2026 cycle", pct: 71, d: 70, r: 69, i: 78 },
        { q: "My representative should hold in-person town halls.", src: "12,480 voters · 2026 cycle", pct: 82, d: 84, r: 79, i: 83 },
      ];
  return (
    <div className="screen" data-palette="white">
      <div className="pr">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <SCNav />
        <div className="pr-wrap">
          <div className="pr-mast">
            <div className="pr-kicker">Where you stand · a Voter Choice finding</div>
            <h1>Here's where we actually <em>stand.</em></h1>
            <p className="pr-lede">No spin and no feel-good headline — just the shape of it. We map every answer honestly: some statements bridged every group, some genuinely split the room, and we show both. Depolarizing isn't pretending we agree — it's seeing each other clearly.</p>
          </div>

          <div className="pr-mapsec">
            <div className="pr-maphead"><span className="k">The landscape</span><h2>We don't all answer alike.</h2></div>
            <PolisMap />
          </div>

          <div className="pr-bridgehead">
            <span className="k">Common ground</span>
            <h2>{divided ? "This cycle, almost nothing bridged every group." : "A few statements cleared every group."}</h2>
            <p className="pr-threshold">A statement appears here only if <b>60%+ of every group</b> — D, R, and I — agreed. {divided ? "Just 1 of 9 cleared that bar this time." : "4 of 9 cleared it; the other 5 split, and we don't dress those up as agreement."}</p>
          </div>

          <div className="pr-list">
            {rows.map((row, k) => (
              <div className="pr-row" key={k}>
                <div className="pr-q">“{row.q}”<span className="src">{row.src}</span></div>
                <div className="pr-stat">
                  <div className="pr-pct">{row.pct}%<span className="ag">agree</span></div>
                  <div className="pr-conv"><ConvBar d={row.d} r={row.r} i={row.i} /></div>
                  <div className="pr-split">
                    <span className="chip d"><i></i>D {row.d}</span>
                    <span className="chip r"><i></i>R {row.r}</span>
                    <span className="chip i"><i></i>I {row.i}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pr-fault">
            <span className="k">Where it split</span>
            <h3>{divided ? "Mostly, the room divided — and that's real." : "And plenty didn't bridge."}</h3>
            <p>{divided
              ? "Eight of nine statements landed the groups far apart. We don't smooth that over or single anyone out — the map above is the honest picture. Here's one split, shown straight:"
              : "Five statements split along group lines. We don't recast those as consensus, and we never surface who voted which way — the map above already shows the shape. Honesty over a number that flatters us."}</p>
            {divided && (
              <div className="pr-row split">
                <div className="pr-q">“Federal spending should be cut across the board.”<span className="src">9,210 voters · this question</span></div>
                <div className="pr-stat">
                  <div className="pr-pct split">51<span className="ag">pt spread</span></div>
                  <div className="pr-conv"><ConvBar d={79} r={28} i={52} /></div>
                  <div className="pr-split">
                    <span className="chip d"><i></i>D 79</span>
                    <span className="chip r"><i></i>R 28</span>
                    <span className="chip i"><i></i>I 52</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pr-foot">
            <div className="meta"><b>Built from 12,480 voters</b> who finished their scorecard · refreshed monthly<br />Anonymous · no profile · you're a tally, never a name.</div>
            <button className="pr-share">Share this finding →</button>
          </div>
          <div className="pr-note">Figures illustrative for this design review. Convergence dots show where each group's agreement lands on a 0–100 scale.</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- ⓪ ENTRY POINT — the optional invite, shown once the scorecard's ready ---------- */
function PolisEntry() {
  return (
    <div className="screen" data-palette="white">
      <div className="ps">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <SCNav />
        <div className="ps-body">
          <div className="ps-inner">
            <div className="pe-done">
              <span className="pe-check">✓</span>
              <div>
                <h1>Your scorecard's ready.</h1>
                <p>Both seats decided. Print it, bring it to the polls — you're set.</p>
              </div>
            </div>
            <div className="pe-actions">
              <button className="btn-primary">Print my scorecard →</button>
              <button className="pe-pdf">Save as PDF</button>
            </div>

            <div className="pe-invite">
              <div className="pe-map"><PolisMap compact /></div>
              <div className="pe-invite-body">
                <span className="k">Before you go · optional</span>
                <h3>See where you stand.</h3>
                <p>You just judged your delegation on the record, not the party. Thousands of others did too — see how your answers line up with everyone else's, where you bridge and where you don't. Anonymous, about a minute, and it never touches your scorecard.</p>
                <div className="pe-cta">
                  <button className="go">See where I stand <span aria-hidden="true">→</span></button>
                  <button className="no">No thanks — I'm done</button>
                  <span className="meta">~1 min · anonymous</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PolisStand, PolisReport, PolisEntry, PolisMap });
