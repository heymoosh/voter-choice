// @ts-nocheck
"use client";
/* Party-free "overlap cloud" standing map.
   Every dot is one finished session, placed by the priorities people SHARE —
   never by party. "you" is projected from the voter's own concerns, and the
   headline stat reports how many people share their top priority.

   Behavior notes:
     - The "you" marker renders only when the scope carries a projection
       (the API returns null when the voter skipped issue intake).
     - The bridges panel renders only when bridge statements exist (the
       bridges API is sentinel-only until statement persistence lands).
     - Dots are synthetic, one per session, generated from aggregate
       distributions — the caption says so explicitly (no individual records). */

import React from "react";

// data [-1,1] → svg [6,94]
const proj = (v) => 50 + v * 44;

// Below this many finished sessions the "less divided" read overclaims — too
// few people to say anything about division — so the lede switches to honest
// early-days framing. The cloud still renders (one dot per real session).
const LOW_N = 30;

export function PolisClose({ polis }) {
  const [scopeId, setScopeId] = React.useState(polis.scopes[0].id);
  const scope = polis.scopes.find((s) => s.id === scopeId) || polis.scopes[0];
  const fmtN = (n) => n.toLocaleString("en-US");

  const lowN = scope.sampleSize < LOW_N;
  const headlineStat = scope.overlap?.youShares?.[0] ?? null;
  const mostCommon = scope.overlap?.mostCommon ?? null;
  const extraShares = (scope.overlap?.youShares ?? []).slice(1);

  const titleId = `polis-title-${scope.id}`;
  const descId = `polis-desc-${scope.id}`;
  const a11ySummary = `${fmtN(scope.sampleSize)} people finished ${scope.scopePhrase}. ${
    headlineStat
      ? `${headlineStat.percent}% share your top priority, ${headlineStat.issueLabel}.`
      : mostCommon
        ? `Their most shared priority is ${mostCommon.issueLabel} at ${mostCommon.percent}%.`
        : ""
  } You are marked by a gold square.`;

  return (
    <section className="polis">
      <div className="polis-lede">
        {lowN ? (
          <>
            <div className="kick">Just getting started</div>
            <h2>Early days where you are.</h2>
            <p>
              Only {fmtN(scope.sampleSize)} {scope.dotPhrase} have finished so
              far — every dot is one of them, and you&rsquo;re in there too. The
              picture sharpens as more people join.
            </p>
          </>
        ) : (
          <>
            <div className="kick">One last thing</div>
            <h2>You&rsquo;re less divided than you think.</h2>
            <p>
              Every dot is one {scope.dotPhrase} who finished this — and
              you&rsquo;re somewhere in the middle of them. People who share
              your priorities sit close to you, no matter how they&rsquo;d ever
              vote.
            </p>
          </>
        )}
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

      {/* Solo layout: no bridges → cloud takes left 62%, stat panel takes right 38%.
          With bridges: original 1.35fr / 1fr split, stat stays inside scatter-wrap. */}
      <div
        className={`polis-grid${scope.bridges.length === 0 ? " polis-grid--solo" : ""}`}
      >
        <div className="scatter-wrap">
          <svg
            className="scatter"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            style={{ aspectRatio: "5 / 4" }}
            role="img"
            aria-labelledby={`${titleId} ${descId}`}
          >
            <title id={titleId}>
              How your priorities overlap with others {scope.scopePhrase}
            </title>
            <desc id={descId}>{a11ySummary}</desc>

            {/* soft overlap field */}
            <ellipse
              cx="48"
              cy="44"
              rx="34"
              ry="30"
              fill="oklch(0.4 0.07 170 / 0.05)"
            />

            {/* the cloud — one neutral hue; density tells the story */}
            {scope.dots.map((d, i) => (
              <circle
                key={scope.id + i}
                cx={proj(d.x)}
                cy={proj(-d.y)}
                r="1.5"
                fill="var(--civic)"
                opacity="0.45"
              />
            ))}

            {/* faint priority-region labels */}
            {scope.issueRegions.map((r, i) => (
              <text
                key={scope.id + "r" + i}
                x={proj(r.x)}
                y={proj(-r.y)}
                fontSize="3.2"
                fontFamily="var(--mono)"
                fill="var(--ink-3)"
                opacity="0.65"
                textAnchor="middle"
              >
                {r.label}
              </text>
            ))}

            {/* you */}
            {scope.you && (
              <>
                <rect
                  x={proj(scope.you[0]) - 3.0}
                  y={proj(-scope.you[1]) - 3.0}
                  width="6.0"
                  height="6.0"
                  rx="1.0"
                  fill="var(--gold)"
                  stroke="var(--ink)"
                  strokeWidth="1.4"
                />
                <text
                  x={proj(scope.you[0]) + 5.2}
                  y={proj(-scope.you[1]) + 1.8}
                  fontSize="4.5"
                  fontFamily="var(--mono)"
                  fill="var(--ink)"
                  fontWeight="600"
                >
                  you
                </text>
              </>
            )}
          </svg>

          {/* When bridges are present, stat stays inside the scatter card (original layout).
              When solo, stat moves to the right column (rendered below the grid). */}
          {scope.bridges.length > 0 && (headlineStat || mostCommon) && (
            <div className="overlap-stat">
              {headlineStat ? (
                <div className="overlap-head">
                  <span className="num">{headlineStat.percent}%</span>
                  <p>
                    of the {fmtN(scope.sampleSize)} people who finished{" "}
                    {scope.scopePhrase} share your top priority —{" "}
                    <strong>{headlineStat.issueLabel}</strong>.
                  </p>
                </div>
              ) : (
                <p className="overlap-alt">
                  The priority people share most {scope.scopePhrase} is{" "}
                  <strong>{mostCommon.issueLabel}</strong> —{" "}
                  {mostCommon.percent}% of {fmtN(scope.sampleSize)} finishers.
                </p>
              )}
              {extraShares.length > 0 && (
                <ul className="you-shares">
                  {extraShares.map((s, i) => (
                    <li key={`${i}-${s.canonicalIssue}`}>
                      {s.issueLabel}
                      <span className="pct">{s.percent}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <p className="scatter-cap">
            Each dot is a representative rendering of one of{" "}
            {fmtN(scope.sampleSize)} anonymous finished sessions — no individual
            responses are ever stored. People are placed by the priorities they
            share, never by party.
          </p>
        </div>

        {/* Right column: bridges when present, else the big stat panel */}
        {scope.bridges.length > 0 ? (
          <div className="bridges">
            <h3>Common ground</h3>
            <p className="sub">
              Statements that 80%+ of people {scope.scopePhrase} agreed on —
              across every kind of voter.
            </p>
            {scope.bridges.map((b, i) => (
              <div className="bridge" key={i}>
                <div className="stmt">&ldquo;{b.stmt}&rdquo;</div>
                <div className="agree">
                  <span className="pct">{b.pct}%</span> agree across the board
                  <span className="agree-bar">
                    <span style={{ width: `${b.pct}%` }} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : headlineStat || mostCommon ? (
          <div className="overlap-stat">
            {headlineStat ? (
              <div className="overlap-head">
                <span className="num">{headlineStat.percent}%</span>
                <p>
                  of the {fmtN(scope.sampleSize)} people who finished{" "}
                  {scope.scopePhrase} share your top priority —{" "}
                  <strong>{headlineStat.issueLabel}</strong>.
                </p>
              </div>
            ) : (
              <p className="overlap-alt">
                The priority people share most {scope.scopePhrase} is{" "}
                <strong>{mostCommon.issueLabel}</strong> — {mostCommon.percent}%
                of {fmtN(scope.sampleSize)} finishers.
              </p>
            )}
            {extraShares.length > 0 && (
              <ul className="you-shares">
                {extraShares.map((s, i) => (
                  <li key={`${i}-${s.canonicalIssue}`}>
                    {s.issueLabel}
                    <span className="pct">{s.percent}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
