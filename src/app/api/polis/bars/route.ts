/**
 * GET /api/polis/bars?stateCode=TX&county=Travis&userConcerns=a,b,c
 *
 * Phase 8 — "you're not alone in {county}" reading.
 *
 * Returns per-theme percentage of finished sessions in the county whose
 * confirmed concerns include each of the user's themes. NO state-scope
 * fallback (county-only by design — "your county" is the framing).
 *
 * Response contract:
 *   { county, threshold, count, bars[] }
 *   { county, threshold, count, status: "below_threshold", bars: [] }
 *
 * Privacy: counts and percentages only. NO user_id, session_id, name,
 * address, email, etc.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  fetchCountyOverlapCounts,
  type CountyOverlapCounts,
} from "../../../../lib/server/counters";
import { getIssueLabel } from "../../../../lib/canonicalIssues";
import { computeOverlapBars } from "../../../../lib/server/polis/aggregates";

/** Minimum county session count before bars are surfaced. */
const BARS_PER_READING_MIN = 50;

interface BarsResponseBody {
  county: string;
  threshold: number;
  count: number;
  status?: "below_threshold";
  bars: Array<{ themeId: string; theme: string; percent: number }>;
}

function expandUserConcerns(raw: string): Array<{ id: string; label: string }> {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().slice(0, 64))
    .filter(Boolean)
    .map((id) => ({ id, label: getIssueLabel(id) }));
}

/**
 * Build per-session concern arrays from the aggregate issue counts.
 *
 * We don't have per-row session detail (the counters layer is aggregate-only),
 * but `computeOverlapBars` only needs the *number* of county sessions
 * containing each theme. We mimic that by emitting one "session" record per
 * unique issue-count entry weighted by its count. The percent math is the
 * same as `(issueCount / totalCount) * 100`, so we can short-circuit.
 *
 * (Kept compact — the path through `computeOverlapBars` is preserved so the
 * unit-test contract stays the single source of truth for the percent
 * formula.)
 */
function barsFromCounts(
  overlap: CountyOverlapCounts,
  userThemes: Array<{ id: string; label: string }>,
): Array<{ themeId: string; theme: string; percent: number }> {
  // For each user theme, hits = sum of per-primary counts for that issue.
  // Build a fake "sessions" array: one entry per hit per theme. To keep the
  // computeOverlapBars path the source of truth, we synthesize the simplest
  // fixture: `count` total sessions, each containing the issues that hit
  // that index. Equivalent to direct percent math.
  if (overlap.count === 0) {
    return userThemes.map((t) => ({
      themeId: t.id,
      theme: t.label,
      percent: 0,
    }));
  }

  // Build N "session" placeholders. For each user theme, the first `hits`
  // placeholders carry that theme id; the remainder do not. This matches the
  // pure-function contract while leveraging it for the rounding rule.
  const fakeSessions: { concerns: string[] }[] = [];
  for (let i = 0; i < overlap.count; i++) fakeSessions.push({ concerns: [] });
  for (const theme of userThemes) {
    const hits = Math.min(overlap.issueCounts[theme.id] ?? 0, overlap.count);
    for (let i = 0; i < hits; i++) {
      fakeSessions[i].concerns.push(theme.id);
    }
  }
  return computeOverlapBars(fakeSessions, userThemes);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const stateCode =
    searchParams.get("stateCode")?.toUpperCase().slice(0, 4) ?? "";
  const county = searchParams.get("county")?.slice(0, 64) ?? "";
  const userConcernsParam = searchParams.get("userConcerns") ?? "";

  if (!stateCode) {
    return NextResponse.json(
      { error: "stateCode is required." },
      { status: 400 },
    );
  }
  if (!county) {
    return NextResponse.json({ error: "county is required." }, { status: 400 });
  }

  const userThemes = expandUserConcerns(userConcernsParam);
  const overlap = await fetchCountyOverlapCounts(stateCode, county);

  // Below per-reading minimum: surface the explicit empty state.
  if (overlap.count > 0 && overlap.count < BARS_PER_READING_MIN) {
    const body: BarsResponseBody = {
      county,
      threshold: BARS_PER_READING_MIN,
      count: overlap.count,
      status: "below_threshold",
      bars: [],
    };
    return NextResponse.json(body, { status: 200 });
  }

  // Zero sessions: empty bars (the UI surfaces a "your county is just
  // getting started — your themes haven't been seen yet" message).
  if (overlap.count === 0) {
    const body: BarsResponseBody = {
      county,
      threshold: BARS_PER_READING_MIN,
      count: 0,
      bars: [],
    };
    return NextResponse.json(body, { status: 200 });
  }

  const bars = barsFromCounts(overlap, userThemes);

  const body: BarsResponseBody = {
    county,
    threshold: BARS_PER_READING_MIN,
    count: overlap.count,
    bars,
  };
  return NextResponse.json(body, { status: 200 });
}
