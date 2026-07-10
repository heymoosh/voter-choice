/**
 * src/lib/server/polis/clusterMap.ts
 *
 * Thin DB wrapper that loads de-identified `polis_response_vectors` rows and
 * hands them to the pure `assembleClusterMap` (src/lib/polis/pca.ts) to build
 * the pol.is-style opinion MAP the "Where you stand" report renders.
 *
 * State scope loads that state's vectors; national loads all. Returns null when
 * DATABASE_URL is unset OR there aren't enough separated sessions (the pure
 * assembler's own honest-fallback contract), so the route falls back to the
 * single-cloud state — the same convention as `fetchPopulationAggregate`.
 *
 * Privacy: SELECTs only the `responses` column — never session_token,
 * state_code (beyond the WHERE filter), or recorded_hour leaves this module.
 * The current voter's own vector is NOT available here (the endpoint has no
 * per-session responses), so `you` is always null from this path; the FE omits
 * the "You" marker rather than inventing a position.
 */

import { eq } from "drizzle-orm";
import { getDb, DB_NOT_CONFIGURED } from "../../../../db/client";
import { polisResponseVectors } from "../../../../db/schema";
import { assembleClusterMap, type ClusterMap } from "../../polis/pca";
import type { ResponseVector } from "../../polis/clustering";

/**
 * Load response vectors (state-filtered, or all for national) and assemble the
 * opinion map. Null → caller draws the single-cloud fallback.
 */
export async function fetchClusterMap(
  stateCode: string | null,
): Promise<ClusterMap | null> {
  const db = getDb();
  if (db === DB_NOT_CONFIGURED) return null;

  const base = db
    .select({ responses: polisResponseVectors.responses })
    .from(polisResponseVectors);

  const rows = stateCode
    ? await base.where(eq(polisResponseVectors.stateCode, stateCode))
    : await base;

  const vectors = rows.map((r) => r.responses as ResponseVector);
  return assembleClusterMap(vectors);
}
