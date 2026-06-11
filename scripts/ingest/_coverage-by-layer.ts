/**
 * scripts/ingest/_coverage-by-layer.ts
 *
 * P0 of the funding-data-sparseness roadmap (docs/FUNDING_DATA_SPARSENESS.md):
 * turn "funding looks sparse" into a number. Classifies every candidate into
 * the three funding data layers the UI actually distinguishes, so we can see
 * how many candidates are stuck on the top-line `total_receipts` fallback
 * (the `funding-sparse` branch in FunderBars) vs. have a real breakdown.
 *
 * Layers (mirrors the read-time logic in src/lib/server/donors.ts):
 *   • none         — no donor_aggregates rows for the cycle.
 *   • top_line     — has rows but NO small/large/PAC funding-mix bucket
 *                    (typically just legacy `total_receipts`) → renders sparse.
 *   • breakdown    — has ≥1 funding-mix bucket (small / large / PAC).
 * Within `breakdown` we also note how many candidates additionally have
 *   • sectors      — ≥1 industry bucket, and
 *   • issue_pacs   — ≥1 named "Issue-aligned PACs — …" bucket.
 *
 * Read-only. Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/_coverage-by-layer.ts [cycle]
 *   (cycle defaults to "2026")
 */

import { requireDb } from "../../db/client";
import { sql } from "drizzle-orm";
import { DONOR_BUCKET_LABELS } from "./_bucket-mapping";

// Funding-mix bucket labels. Duplicated (not imported from
// src/lib/server/donors.ts FUNDING_MIX_LABELS) to respect the src/ ↔ scripts/
// boundary the codebase keeps — they MUST stay byte-identical to the ingest
// labels in _bucket-mapping.ts.
const FUNDING_MIX_LABELS = new Set<string>([
  "Small individual donors (under $200)",
  "Large individual donors ($200+)",
  "PACs",
]);

// Industry/sector buckets = the canonical vocabulary minus the funding-mix,
// totals, party, self, and catch-all rows. Used only to flag "has sectors".
const SECTOR_LABELS = new Set<string>(
  DONOR_BUCKET_LABELS.filter(
    (l) =>
      !FUNDING_MIX_LABELS.has(l) &&
      l !== "Self-funded" &&
      l !== "Party committees" &&
      l !== "Other",
  ),
);

const ISSUE_PAC_PREFIX = "Issue-aligned PACs";

interface Row {
  geo: string;
  labels: string[] | null;
}

function classify(labels: string[]): "none" | "top_line" | "breakdown" {
  if (labels.length === 0) return "none";
  if (labels.some((l) => FUNDING_MIX_LABELS.has(l))) return "breakdown";
  return "top_line";
}

async function main() {
  const cycle = process.argv[2]?.trim() || "2026";
  const db = requireDb();

  const result = await db.execute(sql`
    SELECT
      CASE
        WHEN c.jurisdiction LIKE 'federal-%' THEN 'FED'
        WHEN c.jurisdiction LIKE 'state-%' THEN SUBSTRING(c.jurisdiction, 7, 2)
        ELSE c.jurisdiction
      END AS geo,
      array_agg(da.bucket_label) FILTER (WHERE da.bucket_label IS NOT NULL) AS labels
    FROM candidates c
    LEFT JOIN donor_aggregates da
      ON da.candidate_id = c.id AND da.election_cycle = ${cycle}
    GROUP BY c.id, geo
  `);

  const rows = result.rows as unknown as Row[];

  // Tallies overall + per geo.
  type Tally = {
    total: number;
    none: number;
    topLine: number;
    breakdown: number;
    withSectors: number;
    withIssuePacs: number;
  };
  const empty = (): Tally => ({
    total: 0,
    none: 0,
    topLine: 0,
    breakdown: 0,
    withSectors: 0,
    withIssuePacs: 0,
  });
  const overall = empty();
  const byGeo = new Map<string, Tally>();

  for (const r of rows) {
    const labels = r.labels ?? [];
    const layer = classify(labels);
    const geo = r.geo || "unknown";
    const t = byGeo.get(geo) ?? empty();

    for (const tal of [overall, t]) {
      tal.total++;
      if (layer === "none") tal.none++;
      else if (layer === "top_line") tal.topLine++;
      else {
        tal.breakdown++;
        if (labels.some((l) => SECTOR_LABELS.has(l))) tal.withSectors++;
        if (labels.some((l) => l.startsWith(ISSUE_PAC_PREFIX)))
          tal.withIssuePacs++;
      }
    }
    byGeo.set(geo, t);
  }

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n * 100) / d) : 0);

  console.log(`Funding-data coverage by layer — cycle ${cycle}`);
  console.log("(candidates with a candidates-table row; cycle-scoped)\n");
  console.log(
    `OVERALL: ${overall.total} candidates\n` +
      `  none (no donor data):        ${overall.none} (${pct(overall.none, overall.total)}%)\n` +
      `  top-line only (sparse UI):   ${overall.topLine} (${pct(overall.topLine, overall.total)}%)\n` +
      `  breakdown (small/large/PAC): ${overall.breakdown} (${pct(overall.breakdown, overall.total)}%)\n` +
      `    ↳ with sector breakdown:   ${overall.withSectors}\n` +
      `    ↳ with named issue-PACs:   ${overall.withIssuePacs}\n`,
  );

  console.log(
    "geo | total | none | top-line | breakdown | sectors | issuePACs",
  );
  for (const geo of [...byGeo.keys()].sort()) {
    const t = byGeo.get(geo)!;
    console.log(
      `${geo}: ${t.total} | none ${t.none} | top-line ${t.topLine} | breakdown ${t.breakdown} | sectors ${t.withSectors} | issuePACs ${t.withIssuePacs}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
