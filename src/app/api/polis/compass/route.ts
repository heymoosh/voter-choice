/**
 * GET /api/polis/compass
 *
 * PR 10 — national-default. Named-cluster compass.
 *
 * Query params:
 *   ?scope=national                     → nationwide aggregation (DEFAULT)
 *   ?scope=county&stateCode=X&county=Y  → county-only
 *   ?stateCode=X&county=Y               → backward compat: scope=county
 *
 * In v1, BOTH scopes ALWAYS return the `below_threshold` sentinel
 * (clusters + dots arrays empty) because:
 *   1. Per-session priority-rank + statement-response persistence isn't shipped.
 *   2. Offline PCA + cluster labeling pipeline isn't built.
 *   3. ~150 sessions need to accumulate before clustering is meaningful
 *      (POLIS_COMPASS_THRESHOLD, env-overridable; default 150).
 *
 * When the data pipeline lands (Phase 8b+), this handler will compose
 * `CLUSTER_LABELS` + the offline PCA output and return cluster + dot
 * positions. The threshold gating + label hygiene logic is already shipped
 * and tested in `src/lib/server/polis/clusters.ts`.
 *
 * Response contract (v1):
 *   { scope, threshold, count, status: "below_threshold", clusters: [], dots: [] }
 *   County variant also includes `county: string` in the response body.
 *
 * Response contract (v2, future):
 *   { scope, threshold, count, clusters: [{ name, percent, axisX, axisY }, ...],
 *     dots: [{ x, y, cluster }, ...] }
 *
 * Privacy: counts only. NO user_id, session_id, name, address, email.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  fetchCountyOverlapCounts,
  fetchNationalOverlapCounts,
} from "../../../../lib/server/counters";
import { resolveCompassThreshold } from "../../../../lib/server/polis/clusters";

interface CompassResponseBody {
  scope: "national" | "county";
  county?: string;
  threshold: number;
  count: number;
  status?: "below_threshold";
  clusters: Array<{
    name: string;
    percent: number;
    axisX: number;
    axisY: number;
  }>;
  dots: Array<{ x: number; y: number; cluster: string }>;
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
  const { searchParams } = new URL(request.url);
  const scope = resolveScope(searchParams);
  const threshold = resolveCompassThreshold(
    process.env.POLIS_COMPASS_THRESHOLD,
  );

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
    const body: CompassResponseBody = {
      scope: "county",
      county,
      threshold,
      count: overlap.count,
      status: "below_threshold",
      clusters: [],
      dots: [],
    };
    return NextResponse.json(body, { status: 200 });
  }

  // scope === "national"
  const overlap = await fetchNationalOverlapCounts();
  const body: CompassResponseBody = {
    scope: "national",
    threshold,
    count: overlap.count,
    status: "below_threshold",
    clusters: [],
    dots: [],
  };
  return NextResponse.json(body, { status: 200 });
}
