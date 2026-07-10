// @ts-nocheck
"use client";
/* Keystone "Where you stand · a Voter Choice finding" report.

   Ports the design-handoff PolisReport (screens-polis.jsx / polis.css) into the
   live, PARTY-FREE data model (DECISION #116). The canvas draws a party-based
   map (D/R/I convergence, Group A/B/C clusters); we intentionally DO NOT
   replicate that. Instead we keep the app's real semantics and only adopt the
   Keystone editorial chrome, layout, typography, and copy:

     · Opinion map  → the single party-free overlap cloud (one population, one
       hue), gold "You" marker, faint issue-region labels — restyled into the
       Keystone `.pm` gridded card. No party blobs, no k-means/PCA clustering.
     · Common ground → real population-level bridges. Big Newsreader green
       agree-% + a party-free single-track agreement bar (no D/R/I dots/chips).
       Threshold reads population-level ("80%+ of everyone").
     · Where it split → the route's `divided[]`, rendered as an honest
       whole-population agree-vs-disagree split. Muted; no party breakdown.

   Behavior notes:
     - The "You" marker renders only when the scope carries a projection
       (the API returns null when the voter skipped issue intake).
     - Common ground renders only when bridge statements exist; "Where it
       split" only when divided statements exist.
     - Dots are synthetic, one per finished session (aggregate distributions,
       no individual records) — the caption says so explicitly. */

import React from "react";

// data [-1,1] → viewBox coords. The map card is 2:1, so x spans 200 units and
// y spans 100 (uniform scale — preserveAspectRatio="none" on a 2:1 box keeps
// dots round). Keep points off the very edge.
const projX = (v) => Math.max(6, Math.min(194, 100 + v * 84));
const projY = (v) => Math.max(6, Math.min(94, 50 + v * 44));

// Below this many finished sessions the "common ground" read overclaims — too
// few people to say anything — so the masthead switches to honest early-days
// framing. The cloud still renders (one dot per real session).
const LOW_N = 30;

/* Party-free agreement bar: a single population track filled to `pct`, with one
   green marker at the agreement level. Replaces the canvas's D/R/I ConvBar. */
function AgreeBar({ pct }) {
  return (
    <div className="conv" aria-hidden="true">
      <div className="conv-track"></div>
      <div className="conv-fill" style={{ width: pct + "%" }}></div>
      <span className="conv-dot agree" style={{ left: pct + "%" }}></span>
    </div>
  );
}

/* Per-opinion-group convergence bar: one colored dot per opinion group (Group
   A/B/C) at that group's agree% on the statement, on a shared 0–100 track. The
   dot colours are the SAME neutral cluster tokens the opinion map uses (`c0/c1/
   c2` → --cluster-a/b/c), so a Group A dot here matches the Group A dots on the
   map above. On genuine bridges the dots cluster together (they converge); on
   divided statements they spread apart. Party-free (DECISION #116): groups are
   opinion clusters by answer similarity, never D/R/I. */
function GroupConvBar({ groups }) {
  const lo = Math.min(...groups.map((g) => g.agreePct));
  return (
    <div className="conv groups" aria-hidden="true">
      <div className="conv-track"></div>
      <div className="conv-fill neutral" style={{ width: lo + "%" }}></div>
      {groups.map((g) => (
        <span
          key={g.clusterId}
          className={"conv-dot c" + g.clusterId}
          style={{ left: g.agreePct + "%" }}
        ></span>
      ))}
    </div>
  );
}

/* The colored group chips beneath the convergence bar: "● Group A 88 · ● Group
   B 84 · ● Group C 87". Same cluster colours as the map + the dots above. */
function GroupChips({ groups }) {
  return (
    <div className="pr-split">
      {groups.map((g) => (
        <span key={g.clusterId} className={"chip c" + g.clusterId}>
          <i></i>
          {g.label} {g.agreePct}
        </span>
      ))}
    </div>
  );
}

/* Party-free split bar: two whole-population markers — agree (green) and
   disagree (red) — with the fill spanning the gap between them, so the visual
   reads "the room split this far apart" without any party framing. */
function SplitBar({ agreePct, disagreePct }) {
  const lo = Math.min(agreePct, disagreePct);
  const hi = Math.max(agreePct, disagreePct);
  return (
    <div className="conv split" aria-hidden="true">
      <div className="conv-track"></div>
      <div
        className="conv-fill gap"
        style={{ left: lo + "%", width: hi - lo + "%" }}
      ></div>
      <span className="conv-dot agree" style={{ left: agreePct + "%" }}></span>
      <span
        className="conv-dot disagree"
        style={{ left: disagreePct + "%" }}
      ></span>
    </div>
  );
}

/* The real pol.is-style OPINION MAP: PCA-projected sessions clustered by
   answer similarity (k-means) into soft opinion-group fields. Party-free
   (DECISION #116): groups are labelled by SIZE ("Group A/B/C"), never party;
   colours are neutral Bold Flag cluster tokens, never D/R/I. Renders only when
   the API returns a `clusterMap` (enough sessions AND the groups genuinely
   separate) — otherwise we fall back to the single-cloud SVG below, honest
   about not having a real cluster structure to show. */
function ClusterMap({ clusterMap, a11ySummary }) {
  const { dots, clusters, you } = clusterMap;
  return (
    <div className="pm-wrap">
      <div className="pm cluster" role="img" aria-label={a11ySummary}>
        {/* soft opinion-group fields */}
        {clusters.map((g) => (
          <div
            key={"blob" + g.id}
            className={"pm-blob c" + g.id}
            style={{
              left: g.cx + "%",
              top: g.cy + "%",
              width: g.spread * 2.4 + "%",
              height: g.spread * 2.0 + "%",
            }}
          />
        ))}

        {/* one dot per session, coloured by its opinion group */}
        {dots.map((d, i) => (
          <span
            key={"d" + i}
            className={"pm-dot c" + d.cluster}
            style={{ left: d.x + "%", top: d.y + "%" }}
          />
        ))}

        {/* neutral group labels above each field */}
        {clusters.map((g) => (
          <span
            key={"lab" + g.id}
            className="pm-glab"
            style={{
              left: g.cx + "%",
              top: Math.max(3, g.cy - g.spread - 3) + "%",
            }}
          >
            {g.label} · {g.sharePercent}%
          </span>
        ))}

        {/* you — heavy gold marker + pill */}
        {you && (
          <>
            <span
              className="pm-you"
              style={{ left: you.x + "%", top: you.y + "%" }}
            />
            <span
              className="pm-you-lab"
              style={{ left: you.x + "%", top: you.y + "%" }}
            >
              You
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/* The party-free single-population overlap cloud, restyled into the Keystone
   `.pm` gridded card. Shown when no real cluster structure is available (thin
   data, or opinion that hasn't separated into groups). */
function OverlapCloud({ scope, a11ySummary }) {
  return (
    <div className="pm-wrap">
      <div className="pm" role="img" aria-label={a11ySummary}>
        <svg
          className="scatter pm-svg"
          viewBox="0 0 200 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* soft single population field */}
          <ellipse
            cx={projX(0)}
            cy={projY(0)}
            rx="66"
            ry="30"
            className="pm-field"
          />

          {/* the cloud — one neutral hue; density tells the story */}
          {scope.dots.map((d, i) => (
            <circle
              key={scope.id + i}
              cx={projX(d.x)}
              cy={projY(-d.y)}
              r="1.7"
              className="pm-dot"
            />
          ))}

          {/* faint priority-region labels */}
          {scope.issueRegions.map((r, i) => (
            <text
              key={scope.id + "r" + i}
              x={projX(r.x)}
              y={projY(-r.y)}
              className="pm-rlab"
              textAnchor="middle"
            >
              {r.label}
            </text>
          ))}

          {/* you — heavy gold marker */}
          {scope.you && (
            <rect
              x={projX(scope.you[0]) - 2.6}
              y={projY(-scope.you[1]) - 2.6}
              width="5.2"
              height="5.2"
              rx="1.0"
              className="pm-you-mark"
            />
          )}
        </svg>

        {/* "You" pill, positioned in container percentages (matches projX/projY
            since the SVG fills the box with preserveAspectRatio="none"). */}
        {scope.you && (
          <span
            className="pm-you-lab"
            style={{
              left: (projX(scope.you[0]) / 200) * 100 + "%",
              top: projY(-scope.you[1]) + "%",
            }}
          >
            You
          </span>
        )}
      </div>
    </div>
  );
}

/* Prefer the real cluster map when the API produced one; else the honest
   single-cloud fallback. */
function PolisMap({ scope, a11ySummary }) {
  return scope.clusterMap ? (
    <ClusterMap clusterMap={scope.clusterMap} a11ySummary={a11ySummary} />
  ) : (
    <OverlapCloud scope={scope} a11ySummary={a11ySummary} />
  );
}

export function PolisClose({ polis }) {
  const [scopeId, setScopeId] = React.useState(polis.scopes[0].id);
  const scope = polis.scopes.find((s) => s.id === scopeId) || polis.scopes[0];
  const fmtN = (n) => n.toLocaleString("en-US");

  const lowN = scope.sampleSize < LOW_N;
  const headlineStat = scope.overlap?.youShares?.[0] ?? null;
  const mostCommon = scope.overlap?.mostCommon ?? null;
  const bridges = scope.bridges ?? [];
  const divided = scope.divided ?? [];
  const clusterMap = scope.clusterMap ?? null;

  const a11ySummary = clusterMap
    ? `${fmtN(scope.sampleSize)} people finished ${scope.scopePhrase}. Their answers form ${
        clusterMap.clusters.length
      } opinion groups by answer similarity — ${clusterMap.clusters
        .map((g) => `${g.label} at ${g.sharePercent}%`)
        .join(", ")}. Each dot is one anonymous finished session; ${
        clusterMap.you
          ? "you are marked by a gold square."
          : "no group is a party — people are grouped only by how they answered."
      }`
    : `${fmtN(scope.sampleSize)} people finished ${scope.scopePhrase}. ${
        headlineStat
          ? `${headlineStat.percent}% share your top priority, ${headlineStat.issueLabel}.`
          : mostCommon
            ? `Their most shared priority is ${mostCommon.issueLabel} at ${mostCommon.percent}%.`
            : ""
      } Each dot is one anonymous finished session; you are marked by a gold square.`;

  return (
    <section className="polis pr" data-palette="white">
      <div className="pr-wrap">
        {/* ---- masthead ---- */}
        <div className="pr-mast">
          <div className="pr-kicker">
            Where you stand · a Voter Choice finding
          </div>
          {lowN ? (
            <>
              <h1>
                Early days — here&rsquo;s the shape <em>so far.</em>
              </h1>
              <p className="pr-lede">
                Only {fmtN(scope.sampleSize)} {scope.dotPhrase} have finished so
                far — every dot is one of them, and you&rsquo;re in there too.
                We won&rsquo;t call it consensus or division yet; the picture
                sharpens as more people join.
              </p>
            </>
          ) : (
            <>
              <h1>
                Here&rsquo;s where we actually <em>stand.</em>
              </h1>
              <p className="pr-lede">
                No spin and no feel-good headline — just the shape of it. We map
                every answer honestly: some statements found broad common
                ground, some genuinely split the room, and we show both.
                Depolarizing isn&rsquo;t pretending we agree — it&rsquo;s seeing
                each other clearly.
              </p>
            </>
          )}
        </div>

        {/* ---- scope switcher ---- */}
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

        {/* ---- the landscape ---- */}
        <div className="pr-mapsec">
          <div className="pr-maphead">
            <span className="k">The landscape</span>
            <h2>We don&rsquo;t all answer alike.</h2>
          </div>
          <PolisMap scope={scope} a11ySummary={a11ySummary} />
          <div className="pm-cap">
            <div className="pm-key">
              {clusterMap ? (
                <>
                  {clusterMap.clusters.map((g) => (
                    <span key={"key" + g.id}>
                      <i className={"c" + g.id}></i>
                      {g.label} · {g.sharePercent}%
                    </span>
                  ))}
                  {clusterMap.you && (
                    <span className="you">
                      <i></i>You
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span>
                    <i className="dot"></i>Each dot · one finished session
                  </span>
                  <span className="you">
                    <i></i>You
                  </span>
                </>
              )}
            </div>
            {clusterMap ? (
              <p>
                Each dot is one finished session; people who answered alike sit
                together, forming{" "}
                <b>
                  {clusterMap.clusters.length} opinion groups by answer
                  similarity
                </b>{" "}
                — never by party.{" "}
                {clusterMap.you
                  ? "You’re the gold square; you land in a camp like everyone else."
                  : "No group is a party — the split is only in how people answered."}
              </p>
            ) : headlineStat ? (
              <p>
                <b>{headlineStat.percent}%</b> of the {fmtN(scope.sampleSize)}{" "}
                people who finished {scope.scopePhrase} share your top priority
                — <b>{headlineStat.issueLabel}</b>. People who share your
                priorities sit close to you, no matter how they&rsquo;d ever
                vote.
              </p>
            ) : mostCommon ? (
              <p>
                The priority people share most {scope.scopePhrase} is{" "}
                <b>{mostCommon.issueLabel}</b> — {mostCommon.percent}% of{" "}
                {fmtN(scope.sampleSize)} finishers. People who answered alike
                sit together.
              </p>
            ) : (
              <p>
                Each dot is a voter; people who answered alike sit close
                together, no matter how they&rsquo;d ever vote.
              </p>
            )}
            <p className="pm-disc">
              Each dot is a representative rendering of one of{" "}
              {fmtN(scope.sampleSize)} anonymous finished sessions — no
              individual responses are ever stored. People are placed by the
              priorities they share, never by party.
            </p>
          </div>
        </div>

        {/* ---- common ground ---- */}
        {bridges.length > 0 && (
          <>
            <div className="pr-bridgehead">
              <span className="k">Common ground</span>
              <h2>A few statements found real common ground.</h2>
              <p className="pr-threshold">
                A statement appears here only if <b>80%+ of everyone</b> agreed
                — across the whole population, not just one side. We don&rsquo;t
                dress up the ones that split.
              </p>
            </div>

            <div className="pr-list">
              {bridges.map((row, k) => (
                <div className="pr-row" key={k}>
                  <div className="pr-q">
                    &ldquo;{row.stmt}&rdquo;
                    <span className="src">Across everyone who answered</span>
                  </div>
                  <div className="pr-stat">
                    <div className="pr-pct">
                      {row.pct}%<span className="ag">agree</span>
                    </div>
                    <div className="pr-conv">
                      <AgreeBar pct={row.pct} />
                      {row.clusterAgreement?.length ? (
                        <>
                          <GroupConvBar groups={row.clusterAgreement} />
                          <GroupChips groups={row.clusterAgreement} />
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ---- where it split ---- */}
        {divided.length > 0 && (
          <div className="pr-fault">
            <span className="k">Where it split</span>
            <h3>
              {bridges.length === 0
                ? "Mostly, the room divided — and that’s real."
                : "And plenty didn’t bridge."}
            </h3>
            <p>
              {bridges.length === 0
                ? "Almost nothing found broad agreement this time. We don’t smooth that over or single anyone out — the map above is the honest picture. Here’s how the splits landed:"
                : "Some statements split the room. We don’t recast those as consensus, and we never surface who voted which way — the map above already shows the shape. Honesty over a number that flatters us."}
            </p>
            {divided.map((row, k) => {
              const spread = Math.abs(row.agreePct - row.disagreePct);
              return (
                <div className="pr-row split" key={k}>
                  <div className="pr-q">
                    &ldquo;{row.stmt}&rdquo;
                    <span className="src">
                      {row.agreePct}% agree · {row.disagreePct}% disagree
                    </span>
                  </div>
                  <div className="pr-stat">
                    <div className="pr-pct split">
                      {spread}
                      <span className="ag">pt split</span>
                    </div>
                    <div className="pr-conv">
                      <SplitBar
                        agreePct={row.agreePct}
                        disagreePct={row.disagreePct}
                      />
                      {row.clusterAgreement?.length ? (
                        <>
                          <GroupConvBar groups={row.clusterAgreement} />
                          <GroupChips groups={row.clusterAgreement} />
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ---- provenance footer ---- */}
        <div className="pr-foot">
          <div className="meta">
            <b>Built from {fmtN(scope.sampleSize)} finished sessions</b> ·
            refreshed as more people join
            <br />
            Anonymous · no profile · you&rsquo;re a tally, never a name.
          </div>
          <button className="pr-share" type="button">
            Share this finding →
          </button>
        </div>
        <div className="pr-note">
          Figures reflect anonymous aggregate sessions — no individual responses
          are ever stored, and people are never grouped by party.
        </div>
      </div>
    </section>
  );
}
