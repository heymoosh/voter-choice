/**
 * GET /api/polis/bars
 *
 * PR 10 — national-default. Per user feedback: "Most people share a lot of
 * the same issues and priorities. It will shock them to see how many others
 * are actually truly in the middle and clustered around their shared views
 * on the world, as opposed to the incredibly polarized version of society
 * that we normally see online."
 *
 * Query params:
 *   ?scope=national                     → nationwide aggregation (DEFAULT)
 *   ?scope=county&stateCode=X&county=Y  → county-only ("your county" reading)
 *   ?stateCode=X&county=Y               → backward compat: treated as scope=county
 *   ?userConcerns=a,b,c                 → user theme ids to compute % for
 *
 * Response contract:
 *   { scope, threshold, count, bars[] }              (success)
 *   { scope, threshold, count, status: "below_threshold", bars: [] }
 *   County variant also includes `county: string` in the response body.
 *
 * Privacy: counts and percentages only. NO user_id, session_id, name,
 * address, email, etc.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  fetchCountyOverlapCounts,
  fetchNationalOverlapCounts,
  type CountyOverlapCounts,
} from "../../../../lib/server/counters";
import { getIssueLabel } from "../../../../lib/canonicalIssues";
import { computeOverlapBars } from "../../../../lib/server/polis/aggregates";
import {
  guardPolisRequest,
  cachedPolisJson,
} from "../../../../lib/server/polis/route-guard";

/** Minimum session count before bars are surfaced (applies to both scopes). */
const BARS_PER_READING_MIN = 50;

interface BarsResponseBody {
  scope: "national" | "county";
  county?: string;
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
 * The counters layer is aggregate-only — we don't have per-row session
 * detail. `computeOverlapBars` only needs the *number* of sessions
 * containing each theme. We synthesize a fixture of `count` placeholder
 * sessions; for each user theme, the first `hits` placeholders carry that
 * theme id. The percent math is `(hits / count) * 100`, equivalent in
 * both scopes.
 *
 * Kept compact so the path through `computeOverlapBars` stays the single
 * source of truth for the percent formula.
 */
function barsFromCounts(
  overlap: CountyOverlapCounts,
  userThemes: Array<{ id: string; label: string }>,
): Array<{ themeId: string; theme: string; percent: number }> {
  if (overlap.count === 0) {
    return userThemes.map((t) => ({
      themeId: t.id,
      theme: t.label,
      percent: 0,
    }));
  }

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

/**
 * Resolve the scope from query params. `scope=national` is the default;
 * `scope=county` (or legacy `?stateCode=X&county=Y` without `scope`)
 * requires both stateCode and county.
 */
function resolveScope(searchParams: URLSearchParams): "national" | "county" {
  const raw = (searchParams.get("scope") ?? "").toLowerCase();
  if (raw === "county") return "county";
  if (raw === "national") return "national";
  // Legacy callers: stateCode + county with no scope param → county.
  if (searchParams.get("stateCode") && searchParams.get("county")) {
    return "county";
  }
  return "national";
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const blocked = await guardPolisRequest(request);
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const scope = resolveScope(searchParams);
  const userConcernsParam = searchParams.get("userConcerns") ?? "";
  const userThemes = expandUserConcerns(userConcernsParam);

  if (scope === "county") {
    const stateCode =
      searchParams.get("stateCode")?.toUpperCase().slice(0, 4) ?? "";
    const county = searchParams.get("county")?.slice(0, 64) ?? "";

    if (!stateCode) {
      return NextResponse.json(
        { error: "stateCode is required for scope=county." },
        { status: 400 },
      );
    }
    if (!county) {
      return NextResponse.json(
        { error: "county is required for scope=county." },
        { status: 400 },
      );
    }

    const overlap = await fetchCountyOverlapCounts(stateCode, county);

    if (overlap.count > 0 && overlap.count < BARS_PER_READING_MIN) {
      const body: BarsResponseBody = {
        scope: "county",
        county,
        threshold: BARS_PER_READING_MIN,
        count: overlap.count,
        status: "below_threshold",
        bars: [],
      };
      return cachedPolisJson(body);
    }

    if (overlap.count === 0) {
      const body: BarsResponseBody = {
        scope: "county",
        county,
        threshold: BARS_PER_READING_MIN,
        count: 0,
        bars: [],
      };
      return cachedPolisJson(body);
    }

    const bars = barsFromCounts(overlap, userThemes);
    const body: BarsResponseBody = {
      scope: "county",
      county,
      threshold: BARS_PER_READING_MIN,
      count: overlap.count,
      bars,
    };
    return cachedPolisJson(body);
  }

  // scope === "national"
  const overlap = await fetchNationalOverlapCounts();

  if (overlap.count > 0 && overlap.count < BARS_PER_READING_MIN) {
    const body: BarsResponseBody = {
      scope: "national",
      threshold: BARS_PER_READING_MIN,
      count: overlap.count,
      status: "below_threshold",
      bars: [],
    };
    return cachedPolisJson(body);
  }

  if (overlap.count === 0) {
    const body: BarsResponseBody = {
      scope: "national",
      threshold: BARS_PER_READING_MIN,
      count: 0,
      bars: [],
    };
    return cachedPolisJson(body);
  }

  const bars = barsFromCounts(overlap, userThemes);
  const body: BarsResponseBody = {
    scope: "national",
    threshold: BARS_PER_READING_MIN,
    count: overlap.count,
    bars,
  };
  return cachedPolisJson(body);
}
