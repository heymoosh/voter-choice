/* Polis close: a per-person map (one dot = one neighbor), clustered by SHARED
   PRIORITY rather than party — so the picture is one big overlapping cloud,
   not two camps. Bridge statements carry the "we agree more than we think" payoff. */

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function gauss(rand) {
  const u1 = Math.max(rand(), 1e-9),
    u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function buildDots(scope) {
  const rand = seeded(scope.seed);
  const dots = [];
  scope.clusters.forEach((c) => {
    for (let i = 0; i < c.n; i++) {
      const spread = 0.2;
      dots.push({
        x: c.center[0] + gauss(rand) * spread,
        y: c.center[1] + gauss(rand) * spread,
        color: c.color,
      });
    }
  });
  return dots;
}
// data [-1,1] → svg [6,94]
const proj = (v) => 50 + v * 44;

function PolisClose({ polis }) {
  const [scopeId, setScopeId] = React.useState(polis.scopes[0].id);
  const scope = polis.scopes.find((s) => s.id === scopeId);
  const dots = React.useMemo(() => buildDots(scope), [scope]);
  const shown = dots.length;
  const fmtN = (n) => n.toLocaleString("en-US");
  return (
    <section className="polis">
      <div className="polis-lede">
        <div className="kick">One last thing</div>
        <h2>You're less divided than you think.</h2>
        <p>
          Every dot is one {scope.dotPhrase} who finished this. They're grouped
          by what they actually prioritize — not by party. Notice how much they
          overlap — and that it stays true as you zoom out.
        </p>
      </div>

      <div className="polis-scope">
        <span className="scope-lab">Zoom</span>
        <div className="seg">
          {polis.scopes.map((s) => (
            <button
              key={s.id}
              className={s.id === scopeId ? "on" : ""}
              onClick={() => setScopeId(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <span className="scope-n">
          {fmtN(scope.sampleSize)} finished sessions
        </span>
      </div>

      <div className="polis-grid">
        <div className="scatter-wrap">
          <svg
            className="scatter"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            style={{ aspectRatio: "1.25 / 1" }}
          >
            {/* soft overlap field */}
            <ellipse
              cx="48"
              cy="44"
              rx="34"
              ry="30"
              fill="oklch(0.4 0.07 170 / 0.05)"
            />
            {dots.map((d, i) => (
              <circle
                key={scope.id + i}
                cx={proj(d.x)}
                cy={proj(-d.y)}
                r="1.15"
                fill={d.color}
                opacity="0.55"
              />
            ))}
            {/* you */}
            <g>
              <rect
                x={proj(scope.you[0]) - 2.2}
                y={proj(-scope.you[1]) - 2.2}
                width="4.4"
                height="4.4"
                rx="0.8"
                fill="var(--gold)"
                stroke="var(--ink)"
                strokeWidth="1.1"
              />
            </g>
            <text
              x={proj(scope.you[0]) + 4}
              y={proj(-scope.you[1]) + 1.4}
              fontSize="3.4"
              fontFamily="var(--mono)"
              fill="var(--ink)"
              fontWeight="600"
            >
              you
            </text>
          </svg>

          <div className="scatter-legend">
            {scope.clusters.map((c) => (
              <span className="lg" key={c.id}>
                <span className="sw" style={{ background: c.color }} />
                {c.name}
              </span>
            ))}
            <span className="lg you">
              <span className="sw" style={{ background: "var(--gold)" }} />
              you
            </span>
          </div>
          <p className="scatter-cap">
            Clusters are named by their shared top priorities, not party
            registration — and roughly one in eight people don't fit any group
            cleanly. The crowded middle is the point.
            {scope.sampleSize > shown
              ? ` Showing a representative ${shown} of ${fmtN(scope.sampleSize)} sessions.`
              : ""}
          </p>
        </div>

        <div className="bridges">
          <h3>Common ground</h3>
          <p className="sub">
            Statements that 80%+ of <i>every</i> cluster {scope.scopePhrase}{" "}
            agreed on — left, right, and unaligned.
          </p>
          {scope.bridges.map((b, i) => (
            <div className="bridge" key={i}>
              <div className="stmt">“{b.stmt}”</div>
              <div className="agree">
                <span className="pct">{b.pct}%</span> agree across the board
                <span className="agree-bar">
                  <span style={{ width: `${b.pct}%` }} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { PolisClose });
