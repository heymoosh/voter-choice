/**
 * GET /api/polis?stateCode=TX&county=Harris&userConcerns=healthcare_affordability,education_funding
 * GET /api/polis?scope=national&userConcerns=…   (2026 redesign — national zoom)
 *
 * Returns the party-free "overlap cloud" aggregate:
 *  - `dots`: one synthetic dot per finished session (capped at MAX_DOTS),
 *    positioned by the priorities people SHARE — never by party. Below the cap
 *    the dot count equals the real sample, so the cloud never overstates how
 *    many people have finished.
 *  - `you`: the voter projected into the same space from their own concerns
 *    (or null when issue intake was skipped).
 *  - `consensus`: the top issues by total count (shared-priority panel).
 *  - `overlap`: the personalized prevalence stat — how many people share the
 *    voter's top priority. This is the emotional payoff ("you're less divided
 *    than you think") and it is computed from real counts.
 *  - `issueRegions`: anchor positions + weights for the most common priorities,
 *    used for faint on-cloud labels and the screen-reader summary.
 *
 * Layout: each canonical issue gets a deterministic anchor on a ring; a dot is
 * placed near the anchor of a dominant issue sampled in proportion to how many
 * people prioritize it, then pulled toward the center so the whole thing reads
 * as ONE overlapping cloud. Positions are arbitrary-but-stable — the visual
 * goal is shared-priority density and overlap, not axis meaning.
 *
 * Privacy: aggregate counts only — no individual record exists. Dots are a
 * representative rendering of the aggregate, not stored responses.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  fetchPolisAggregate,
  fetchNationalPolisAggregate,
  type PolisAggregate,
} from "../../../lib/server/counters";
import {
  getIssueLabel,
  CANONICAL_ISSUE_LABELS,
} from "../../../lib/canonicalIssues";
import {
  guardPolisRequest,
  cachedPolisJson,
} from "../../../lib/server/polis/route-guard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IssueStat {
  canonicalIssue: string;
  issueLabel: string;
  /** Share of finished sessions that prioritize this issue (0–100). */
  percent: number;
}

export interface IssueRegion extends IssueStat {
  /** Anchor position in the same [-1,1] space the dots use. */
  x: number;
  y: number;
}

export interface PolisResponse {
  scope: "county" | "state" | "national";
  sampleSize: number;
  /** Informational only — no longer gates display. */
  thresholdMet: boolean;
  /** One dot per finished session (capped). Party-free: just positions. */
  dots: Array<{ x: number; y: number }>;
  you: { x: number; y: number } | null;
  consensus: IssueStat[];
  overlap: {
    /** Most-shared priority across everyone in scope (or null when empty). */
    mostCommon: IssueStat | null;
    /** The voter's own priorities + how many share each (≤3, ordered). */
    youShares: IssueStat[];
  };
  /** Top shared priorities with anchor positions, for labels + a11y. */
  issueRegions: IssueRegion[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const THRESHOLD = 200; // informational only (kept for the thresholdMet field)
const MAX_DOTS = 1200; // render cap; at or below this, one dot per session
const ISSUE_KEYS = Object.keys(CANONICAL_ISSUE_LABELS);
const ANCHOR_RADIUS = 0.74; // issue anchors sit on this ring
const CENTER_PULL = 0.6; // pull anchors toward center → one cohesive cloud
const JITTER = 0.2; // per-dot Gaussian spread in normalized space

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
const round3 = (v: number) => Math.round(v * 1000) / 1000;

/** Seeded LCG — deterministic dot placement for a given aggregate. */
function seededRandom(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/** Box-Muller: uniform pair → ~standard-normal. */
function gauss(rand: () => number): number {
  const u1 = Math.max(rand(), 1e-10);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Deterministic anchor for a canonical issue: evenly spaced on a ring by its
 * position in the canonical catalog. Unknown ids hash to a stable angle so they
 * still land somewhere consistent.
 */
function issueAnchor(issue: string): [number, number] {
  let idx = ISSUE_KEYS.indexOf(issue);
  let n = ISSUE_KEYS.length;
  if (idx < 0) {
    let h = 0;
    for (let i = 0; i < issue.length; i++)
      h = (h * 31 + issue.charCodeAt(i)) | 0;
    idx = Math.abs(h) % 360;
    n = 360;
  }
  const angle = (2 * Math.PI * idx) / n;
  return [Math.cos(angle) * ANCHOR_RADIUS, Math.sin(angle) * ANCHOR_RADIUS];
}

// ---------------------------------------------------------------------------
// Issue totals (party-free: summed across every primary)
// ---------------------------------------------------------------------------

/** canonicalIssue → number of finished sessions that prioritized it. */
function perIssueTotals(agg: PolisAggregate): Map<string, number> {
  const totals = new Map<string, number>();
  for (const ic of agg.issueCounts) {
    totals.set(
      ic.canonicalIssue,
      (totals.get(ic.canonicalIssue) ?? 0) + ic.count,
    );
  }
  return totals;
}

// ---------------------------------------------------------------------------
// Cloud generation
// ---------------------------------------------------------------------------

/** Build a weighted issue picker over the totals. Returns null when empty. */
function makeIssuePicker(
  totals: Map<string, number>,
  rand: () => number,
): () => string | null {
  const entries = [...totals.entries()].filter(([, c]) => c > 0);
  const sum = entries.reduce((s, [, c]) => s + c, 0);
  if (sum === 0) return () => null;
  return () => {
    let r = rand() * sum;
    for (const [issue, c] of entries) {
      r -= c;
      if (r <= 0) return issue;
    }
    return entries[entries.length - 1][0];
  };
}

/**
 * One dot per finished session (capped at MAX_DOTS). Each dot is placed near
 * the anchor of a dominant issue sampled ∝ how many people prioritize it, then
 * jittered and pulled toward center so the whole thing reads as one cloud.
 */
function generateCloud(
  agg: PolisAggregate,
  totals: Map<string, number>,
  rand: () => number,
): Array<{ x: number; y: number }> {
  if (agg.sampleSize === 0) return [];
  const count = Math.min(agg.sampleSize, MAX_DOTS);
  const pick = makeIssuePicker(totals, rand);
  const dots: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < count; i++) {
    const issue = pick();
    const [ax, ay] = issue ? issueAnchor(issue) : [0, 0];
    const x = clamp(ax * CENTER_PULL + gauss(rand) * JITTER, -1, 1);
    const y = clamp(ay * CENTER_PULL + gauss(rand) * JITTER, -1, 1);
    dots.push({ x: round3(x), y: round3(y) });
  }
  return dots;
}

/**
 * Project "you" as the centroid of the anchors of the voter's own concerns.
 * A multi-issue voter lands centrally (overlapping many priority regions),
 * which is exactly the "you overlap" reading. Null when no concerns.
 */
function projectYou(userConcerns: string[]): { x: number; y: number } | null {
  if (userConcerns.length === 0) return null;
  let sx = 0;
  let sy = 0;
  for (const c of userConcerns) {
    const [ax, ay] = issueAnchor(c);
    sx += ax;
    sy += ay;
  }
  const n = userConcerns.length;
  return {
    x: round3(clamp((sx / n) * CENTER_PULL, -1.2, 1.2)),
    y: round3(clamp((sy / n) * CENTER_PULL, -1.2, 1.2)),
  };
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

function statFor(
  issue: string,
  totals: Map<string, number>,
  sampleSize: number,
): IssueStat {
  const count = totals.get(issue) ?? 0;
  return {
    canonicalIssue: issue,
    issueLabel: getIssueLabel(issue),
    percent: sampleSize > 0 ? Math.round((count / sampleSize) * 100) : 0,
  };
}

function computeOverlap(
  totals: Map<string, number>,
  sampleSize: number,
  userConcerns: string[],
): PolisResponse["overlap"] {
  let mostCommon: IssueStat | null = null;
  let best = 0;
  for (const [issue, count] of totals) {
    if (count > best) {
      best = count;
      mostCommon = statFor(issue, totals, sampleSize);
    }
  }

  const seen = new Set<string>();
  const youShares: IssueStat[] = [];
  for (const c of userConcerns) {
    if (seen.has(c)) continue;
    seen.add(c);
    youShares.push(statFor(c, totals, sampleSize));
    if (youShares.length >= 3) break;
  }

  return { mostCommon, youShares };
}

/** Top shared priorities with anchor positions (faint labels + a11y). */
function computeRegions(
  totals: Map<string, number>,
  sampleSize: number,
): IssueRegion[] {
  return [...totals.entries()]
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([issue]) => {
      const [ax, ay] = issueAnchor(issue);
      return {
        ...statFor(issue, totals, sampleSize),
        x: round3(ax * CENTER_PULL),
        y: round3(ay * CENTER_PULL),
      };
    });
}

/** Top issues by total count across everyone in scope (party-free). */
function computeConsensus(
  totals: Map<string, number>,
  sampleSize: number,
): IssueStat[] {
  if (sampleSize === 0) return [];
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([issue]) => statFor(issue, totals, sampleSize));
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const blocked = await guardPolisRequest(request);
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const scopeParam = searchParams.get("scope");
  const stateCode =
    searchParams.get("stateCode")?.toUpperCase().slice(0, 4) ?? "";
  const county = searchParams.get("county")?.slice(0, 64) ?? null;
  const userConcernsParam = searchParams.get("userConcerns") ?? "";

  if (scopeParam !== "national" && !stateCode) {
    return NextResponse.json(
      { error: "stateCode is required." },
      { status: 400 },
    );
  }

  const userConcerns = userConcernsParam
    ? userConcernsParam
        .split(",")
        .map((s) => s.trim().slice(0, 64))
        .filter(Boolean)
    : [];

  const agg =
    scopeParam === "national"
      ? await fetchNationalPolisAggregate()
      : await fetchPolisAggregate(stateCode, county || null);

  const totals = perIssueTotals(agg);
  const rand = seededRandom(agg.sampleSize * 31 + totals.size + 7);

  const response: PolisResponse = {
    scope: agg.scope,
    sampleSize: agg.sampleSize,
    thresholdMet: agg.sampleSize >= THRESHOLD,
    dots: generateCloud(agg, totals, rand),
    you: projectYou(userConcerns),
    consensus: computeConsensus(totals, agg.sampleSize),
    overlap: computeOverlap(totals, agg.sampleSize, userConcerns),
    issueRegions: computeRegions(totals, agg.sampleSize),
  };

  return cachedPolisJson(response);
}
