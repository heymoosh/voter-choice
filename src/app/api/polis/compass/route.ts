/**
 * GET /api/polis/compass?stateCode=TX&county=Travis
 *
 * Phase 8 — named-cluster compass. In v1, ALWAYS returns the
 * `below_threshold` sentinel (clusters + dots arrays empty) because:
 *   1. Per-session priority-rank + statement-response persistence isn't shipped.
 *   2. Offline PCA + cluster labeling pipeline isn't built.
 *   3. ~150 in-county sessions need to accumulate before clustering is
 *      meaningful (POLIS_COMPASS_THRESHOLD, env-overridable; default 150).
 *
 * When the data pipeline lands (Phase 8b+), this handler will compose
 * `CLUSTER_LABELS` + the offline PCA output and return cluster + dot
 * positions. The threshold gating + label hygiene logic is already shipped
 * and tested in `src/lib/server/polis/clusters.ts`.
 *
 * Response contract (v1):
 *   { county, threshold, count, status: "below_threshold", clusters: [], dots: [] }
 *
 * Response contract (v2, future):
 *   { county, threshold, count, clusters: [{ name, percent, axisX, axisY }, ...],
 *     dots: [{ x, y, cluster }, ...] }
 *
 * Privacy: counts only. NO user_id, session_id, name, address, email.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchCountyOverlapCounts } from "../../../../lib/server/counters";
import { resolveCompassThreshold } from "../../../../lib/server/polis/clusters";

interface CompassResponseBody {
  county: string;
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

  const threshold = resolveCompassThreshold(
    process.env.POLIS_COMPASS_THRESHOLD,
  );
  const overlap = await fetchCountyOverlapCounts(stateCode, county);

  // v1: always return below_threshold. Even when the count meets the
  // threshold, PCA + statement persistence aren't shipped — surfacing
  // empty clusters/dots would be dishonest.
  const body: CompassResponseBody = {
    county,
    threshold,
    count: overlap.count,
    status: "below_threshold",
    clusters: [],
    dots: [],
  };
  return NextResponse.json(body, { status: 200 });
}
