// @ts-nocheck
"use client";
/* PORT of design-handoff/keystone-canvas/src/screens-polis.jsx → PolisEntry
   (artboard polis-entry). Card: "Polis entry screen — was the dedicated
   PolisEntry invite/preview screen meant to replace today's one-line link?"
   Decision: yes — this screen REPLACES the plain "where you stand among
   your neighbors" text link that used to jump straight to the standing
   report (PolisClose). It's the optional, dedicated invite/preview shown
   once the scorecard is done, with its own accept ("See where I stand")
   and skip ("No thanks — I'm done") controls.

   Port deltas, behavior-only:
     - SCNav (canvas nav) → AppNav (the app's real nav), same substitution
       every other ported full screen makes (HeadToHead, print, standing —
       none of them port SCNav verbatim; it's the app's existing chrome).
     - Design tokens (--brand/--keep/--replace) the canvas authored for the
       Bold Flag white ground are mapped onto the shipped warm-palette
       tokens, scoped to .pe-screen — same pattern candidates.css uses for
       HeadToHead ("Following the MoneyGap precedent... scoped to .cmp").
       No global palette change; that's tracked separately.
     - PolisMap here is illustrative-only (fabricated D/R/I clusters, per
       the canvas file's own "Figures are illustrative" note) — a decorative
       teaser, marked aria-hidden. The REAL map with real data is
       PolisClose, reached only via "See where I stand".
     - "Both seats decided" → wired from the real seat count (canvas
       hardcoded a 2-seat mock), matching the seat-count-from-real-data
       convention used elsewhere (e.g. orientation's "N seats up in 2026").
     - "Print my scorecard" and "Save as PDF" both open the SAME existing
       print flow (ScorecardPrintView already handles Print/Save via the
       browser dialog — there's no separate PDF pipeline).

   HARD CONSTRAINT: this screen never gates the printout. Printing is
   reachable directly from the workspace's own "Print My Scorecard" button
   without ever visiting this screen; this screen's print buttons are a
   convenience that call the exact same onPrint callback, not a new path
   the user is forced through. */

import React from "react";
import { AppNav } from "../VoterChoiceApp";

/* ---------- illustrative-only opinion-map preview ----------
   Deterministic fake dots (borrowed from the canvas's PolisMap) — a teaser
   graphic, not a rendering of real survey data. Decorative: aria-hidden. */
function pmDots(cx, cy, n, spread, seed) {
  let s = seed;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const out = [];
  for (let k = 0; k < n; k++) {
    const ang = rnd() * 6.283;
    const r = Math.sqrt(rnd()) * spread;
    out.push({
      x: Math.max(4, Math.min(96, cx + Math.cos(ang) * r)),
      y: Math.max(6, Math.min(94, cy + Math.sin(ang) * r * 0.82)),
    });
  }
  return out;
}
const PM_GROUPS = [
  { id: "a", cx: 30, cy: 42, n: 26, spread: 17, cls: "r" },
  { id: "b", cx: 70, cy: 38, n: 25, spread: 17, cls: "d" },
  { id: "c", cx: 50, cy: 72, n: 17, spread: 15, cls: "i" },
];
function PolisMapPreview() {
  return (
    <div className="pm-wrap compact" aria-hidden="true">
      <div className="pm">
        {PM_GROUPS.map((g) => (
          <div
            key={g.id}
            className={"pm-blob " + g.cls}
            style={{
              left: g.cx + "%",
              top: g.cy + "%",
              width: g.spread * 2.4 + "%",
              height: g.spread * 2.0 + "%",
            }}
          ></div>
        ))}
        {PM_GROUPS.map((g) =>
          pmDots(g.cx, g.cy, g.n, g.spread, g.cx * 1000 + g.cy).map((p, i) => (
            <span
              key={g.id + i}
              className={"pm-dot " + g.cls}
              style={{ left: p.x + "%", top: p.y + "%" }}
            ></span>
          )),
        )}
        <span className="pm-you" style={{ left: "44%", top: "55%" }}></span>
        <span className="pm-you-lab" style={{ left: "44%", top: "55%" }}>
          You
        </span>
      </div>
    </div>
  );
}

/**
 * The optional Polis invite/preview screen — reached once every seat has a
 * verdict, in place of the old one-line "where you stand among your
 * neighbors" text link.
 *
 *   seatsCount   — how many seats the voter just decided (real data; the
 *                  canvas hardcoded "Both seats decided").
 *   onPrint      — opens the existing print flow (ScorecardPrintView).
 *                  Wired identically for both "Print my scorecard" and
 *                  "Save as PDF" — there is one print surface, and the
 *                  browser's print dialog is how "save as PDF" happens.
 *   onSeeStanding — accept: proceeds to the real standing/report view.
 *   onSkip       — decline / back-to-scorecard: returns to the workspace
 *                  without ever touching the invite.
 */
export function PolisEntry({ seatsCount, onPrint, onSeeStanding, onSkip }) {
  const decidedLine =
    seatsCount === 1 ? "1 seat decided." : `${seatsCount} seats decided.`;

  return (
    <div className="pe-screen" data-palette="white">
      <div className="ps">
        <div className="flagbar">
          <i></i>
          <i></i>
          <i></i>
        </div>
        <AppNav onBrandClick={onSkip} />
        <div className="ps-body">
          <div className="ps-inner">
            <div className="pe-done">
              <span className="pe-check" aria-hidden="true">
                ✓
              </span>
              <div>
                <h1>Your scorecard's ready.</h1>
                <p>
                  {decidedLine} Print it, bring it to the polls — you're set.
                </p>
              </div>
            </div>
            <div className="pe-actions">
              <button
                className="btn-primary"
                onClick={onPrint}
                data-testid="polis-entry-print"
              >
                Print my scorecard <span aria-hidden="true">→</span>
              </button>
              <button className="pe-pdf" onClick={onPrint}>
                Save as PDF
              </button>
            </div>

            <div className="pe-invite">
              <div className="pe-map">
                <PolisMapPreview />
              </div>
              <div className="pe-invite-body">
                <span className="k">Before you go · optional</span>
                <h3>See where you stand.</h3>
                <p>
                  You just judged your delegation on the record, not the party.
                  Thousands of others did too — see how your answers line up
                  with everyone else's, where you bridge and where you don't.
                  Anonymous, about a minute, and it never touches your
                  scorecard.
                </p>
                <div className="pe-cta">
                  <button
                    className="go"
                    onClick={onSeeStanding}
                    data-testid="polis-entry-see-standing"
                  >
                    See where I stand <span aria-hidden="true">→</span>
                  </button>
                  <button
                    className="no"
                    onClick={onSkip}
                    data-testid="polis-entry-skip"
                  >
                    No thanks — I'm done
                  </button>
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
