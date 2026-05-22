/**
 * GET /api/polis/bridges?stateCode=TX&county=Travis
 *
 * Phase 8 — bridge statements (80%+ across every cluster). In v1, this
 * endpoint always returns the `below_threshold` or `no_bridges_yet`
 * sentinel because per-session statement-response persistence + cluster
 * labels don't exist in the production schema yet.
 *
 * When statement persistence lands (Phase 8b), this handler will compose
 * `computeBridges` from `src/lib/server/polis/aggregates.ts` and return
 * the actual bridge list. The pure-function logic is already shipped and
 * tested so the round-trip is a route-only change.
 *
 * Response contract:
 *   { county, threshold, count, bridges[] }                    (v2 success)
 *   { county, threshold, count, status: "below_threshold", bridges: [] }
 *   { county, threshold, count, status: "no_bridges_yet",   bridges: [] }
 *
 * Privacy: counts only. NO user_id, session_id, name, address, email.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchCountyOverlapCounts } from "../../../../lib/server/counters";

/** Minimum county session count before the bridges reading is surfaced. */
const BRIDGES_PER_READING_MIN = 50;

interface BridgesResponseBody {
  county: string;
  threshold: number;
  count: number;
  status?: "below_threshold" | "no_bridges_yet";
  bridges: Array<{
    statement: string;
    clusters: Array<{ name: string; agreementPercent: number }>;
  }>;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const stateCode =
    searchParams.get("stateCode")?.toUpperCase().slice(0, 4) ?? "";
  const county = searchParams.get("county")?.slice(0, 64) ?? "";

  if (!stateCode) {
    return NextResponse.json(
      { error: "stateCode is required." },
      { status: 400 },
    );
  }
  if (!county) {
    return NextResponse.json({ error: "county is required." }, { status: 400 });
  }

  const overlap = await fetchCountyOverlapCounts(stateCode, county);

  // Zero-session county: simple empty list (no status sentinel — there's
  // simply nothing here yet; UI surfaces the "your county is just getting
  // started" framing).
  if (overlap.count === 0) {
    const body: BridgesResponseBody = {
      county,
      threshold: BRIDGES_PER_READING_MIN,
      count: 0,
      bridges: [],
    };
    return NextResponse.json(body, { status: 200 });
  }

  // Below the per-reading minimum: explicit below_threshold sentinel.
  if (overlap.count < BRIDGES_PER_READING_MIN) {
    const body: BridgesResponseBody = {
      county,
      threshold: BRIDGES_PER_READING_MIN,
      count: overlap.count,
      status: "below_threshold",
      bridges: [],
    };
    return NextResponse.json(body, { status: 200 });
  }

  // v1: per-session statement responses + cluster labels aren't persisted.
  // Surface the no_bridges_yet sentinel so the UI shows the honest empty
  // state ("no bridge statements yet — needs more data").
  const body: BridgesResponseBody = {
    county,
    threshold: BRIDGES_PER_READING_MIN,
    count: overlap.count,
    status: "no_bridges_yet",
    bridges: [],
  };
  return NextResponse.json(body, { status: 200 });
}
