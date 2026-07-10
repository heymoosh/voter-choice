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
 * County scope always returns the `below_threshold`/`no_bridges_yet` sentinel:
 * `polis_response_vectors` (the table real bridges are computed from) only
 * records a state code, not a county — there is no per-county statement data
 * to query.
 *
 * National scope composes the real population-level aggregation
 * (`populationAggregate.ts` → `computeBridges`/`computeDivided` from
 * `aggregates.ts`) once BOTH the session-overlap count and the underlying
 * `polis_response_vectors` row count clear their thresholds. Falls back to
 * the honest sentinel when either count is too low, vector collection is
 * disabled, or no statement clears the bridge bar.
 *
 * Response contract:
 *   { scope, threshold, count, bridges[], divided[] }          (v2 success)
 *   { scope, threshold, count, status: "below_threshold",  bridges: [], divided: [] }
 *   { scope, threshold, count, status: "no_bridges_yet",   bridges: [], divided: [] }
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
import {
  fetchPopulationAggregate,
  POPULATION_MIN_ROWS,
} from "../../../../lib/server/polis/populationAggregate";

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
  divided: Array<{
    statement: string;
    agreePercent: number;
    disagreePercent: number;
  }>;
}

/**
 * Compose the national-scope response body once overlap.count has cleared
 * BRIDGES_PER_READING_MIN: look for real bridge/divided statements in the
 * population-level response-vector data, independently gated on
 * POPULATION_MIN_ROWS so a handful of vector rows that happen to agree
 * can't read as a confident bridge just because overlap.count is high.
 */
function resolveNationalBridgesBody(
  overlapCount: number,
  population: Awaited<ReturnType<typeof fetchPopulationAggregate>>,
): BridgesResponseBody {
  const base = {
    scope: "national" as const,
    threshold: BRIDGES_PER_READING_MIN,
    count: overlapCount,
  };

  if (!population || population.count < POPULATION_MIN_ROWS) {
    return { ...base, status: "no_bridges_yet", bridges: [], divided: [] };
  }

  if (population.bridges.length === 0) {
    return {
      ...base,
      status: "no_bridges_yet",
      bridges: [],
      divided: population.divided,
    };
  }

  return { ...base, bridges: population.bridges, divided: population.divided };
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
        divided: [],
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
        divided: [],
      };
      return cachedPolisJson(body);
    }

    // No per-county statement data exists (polis_response_vectors has no
    // county column — see file header) — the sentinel here is honest, not
    // a placeholder awaiting wiring.
    const body: BridgesResponseBody = {
      scope: "county",
      county,
      threshold: BRIDGES_PER_READING_MIN,
      count: overlap.count,
      status: "no_bridges_yet",
      bridges: [],
      divided: [],
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
      divided: [],
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
      divided: [],
    };
    return cachedPolisJson(body);
  }

  // Enough finished sessions overall — look for real bridge/divided
  // statements in the population-level response-vector data (a separate
  // table from the session-overlap counters above).
  const population = await fetchPopulationAggregate();
  return cachedPolisJson(resolveNationalBridgesBody(overlap.count, population));
}
