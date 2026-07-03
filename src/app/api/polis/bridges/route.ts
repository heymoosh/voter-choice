/**
 * GET /api/polis/bridges
 *
 * PR 10 — national-default. Bridge statements (80%+ across every cluster).
 *
 * Query params:
 *   ?scope=national                     → nationwide aggregation (DEFAULT)
 *   ?scope=county&stateCode=X&county=Y  → county-only
 *   ?stateCode=X&county=Y               → backward compat: scope=county
 *
 * In v1, this endpoint always returns the `below_threshold` or
 * `no_bridges_yet` sentinel because per-session statement-response
 * persistence + cluster labels don't exist in the production schema yet.
 * When statement persistence lands (Phase 8b), this handler will compose
 * `computeBridges` from `aggregates.ts` and return the actual bridge list.
 *
 * Response contract:
 *   { scope, threshold, count, bridges[] }                    (v2 success)
 *   { scope, threshold, count, status: "below_threshold",  bridges: [] }
 *   { scope, threshold, count, status: "no_bridges_yet",   bridges: [] }
 *   County variant also includes `county: string` in the response body.
 *
 * Privacy: counts only. NO user_id, session_id, name, address, email.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  fetchCountyOverlapCounts,
  fetchNationalOverlapCounts,
} from "../../../../lib/server/counters";
import {
  guardPolisRequest,
  cachedPolisJson,
} from "../../../../lib/server/polis/route-guard";

/** Minimum session count before the bridges reading is surfaced. */
const BRIDGES_PER_READING_MIN = 50;

interface BridgesResponseBody {
  scope: "national" | "county";
  county?: string;
  threshold: number;
  count: number;
  status?: "below_threshold" | "no_bridges_yet";
  bridges: Array<{
    statement: string;
    clusters: Array<{ name: string; agreementPercent: number }>;
  }>;
}

function resolveScope(searchParams: URLSearchParams): "national" | "county" {
  const raw = (searchParams.get("scope") ?? "").toLowerCase();
  if (raw === "county") return "county";
  if (raw === "national") return "national";
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

    if (overlap.count === 0) {
      const body: BridgesResponseBody = {
        scope: "county",
        county,
        threshold: BRIDGES_PER_READING_MIN,
        count: 0,
        bridges: [],
      };
      return cachedPolisJson(body);
    }

    if (overlap.count < BRIDGES_PER_READING_MIN) {
      const body: BridgesResponseBody = {
        scope: "county",
        county,
        threshold: BRIDGES_PER_READING_MIN,
        count: overlap.count,
        status: "below_threshold",
        bridges: [],
      };
      return cachedPolisJson(body);
    }

    const body: BridgesResponseBody = {
      scope: "county",
      county,
      threshold: BRIDGES_PER_READING_MIN,
      count: overlap.count,
      status: "no_bridges_yet",
      bridges: [],
    };
    return cachedPolisJson(body);
  }

  // scope === "national"
  const overlap = await fetchNationalOverlapCounts();

  if (overlap.count === 0) {
    const body: BridgesResponseBody = {
      scope: "national",
      threshold: BRIDGES_PER_READING_MIN,
      count: 0,
      bridges: [],
    };
    return cachedPolisJson(body);
  }

  if (overlap.count < BRIDGES_PER_READING_MIN) {
    const body: BridgesResponseBody = {
      scope: "national",
      threshold: BRIDGES_PER_READING_MIN,
      count: overlap.count,
      status: "below_threshold",
      bridges: [],
    };
    return cachedPolisJson(body);
  }

  const body: BridgesResponseBody = {
    scope: "national",
    threshold: BRIDGES_PER_READING_MIN,
    count: overlap.count,
    status: "no_bridges_yet",
    bridges: [],
  };
  return cachedPolisJson(body);
}
