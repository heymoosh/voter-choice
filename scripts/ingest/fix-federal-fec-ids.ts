/**
 * scripts/ingest/fix-federal-fec-ids.ts
 *
 * One-time fix: resolves FEC candidate IDs for federal candidates in the DB
 * whose raw_metadata lacks a fec.candidate_id. Uses FEC name + office + state
 * search to find the matching candidate_id, then patches raw_metadata.
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/fix-federal-fec-ids.ts
 *   DATABASE_URL=<neon> FEC_API_KEY=<key> npx tsx scripts/ingest/fix-federal-fec-ids.ts
 */

import { eq, or, sql } from "drizzle-orm";
import { requireDb } from "../../db/client";
import { candidates } from "../../db/schema";

const FEC_BASE = "https://api.open.fec.gov/v1";
const FEC_API_KEY = process.env.FEC_API_KEY ?? "DEMO_KEY";
const DELAY_MS = 1200; // stay under 1 req/sec for DEMO_KEY

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractState(jurisdiction: string): string {
  // "federal-house" or "federal-senate" — state comes from candidate name
  return "";
}

function extractOffice(jurisdiction: string): "H" | "S" {
  return jurisdiction === "federal-senate" ? "S" : "H";
}

function extractStateFromName(name: string): string {
  // Names like "Rep. Robert Aderholt [R-AL4]" → AL
  const m = name.match(/\[(?:[A-Z])-([A-Z]{2})/);
  return m?.[1] ?? "";
}

function extractLastName(fullName: string): string {
  // "Rep. Robert Aderholt [R-AL4]" → "Aderholt"
  const stripped = fullName.replace(/^(Rep\.|Sen\.)\s+/, "").replace(/\s*\[.*\]$/, "");
  const parts = stripped.trim().split(/\s+/);
  return parts[parts.length - 1] ?? fullName;
}

async function lookupFecId(
  lastName: string,
  state: string,
  office: "H" | "S",
): Promise<string | null> {
  const params = new URLSearchParams({
    q: lastName,
    office,
    state,
    api_key: FEC_API_KEY,
    per_page: "5",
    sort: "-receipts",
  });
  const url = `${FEC_BASE}/candidates/?${params}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as { results?: Array<{ candidate_id: string; name: string }> };
  const results = data.results ?? [];
  if (results.length === 0) return null;
  // Pick best match — first result ordered by receipts descending
  return results[0].candidate_id ?? null;
}

async function main() {
  const db = requireDb();

  // Fetch federal candidates missing FEC IDs in raw_metadata
  const rows = await db
    .select({
      id: candidates.id,
      fullName: candidates.fullName,
      jurisdiction: candidates.jurisdiction,
      rawMetadata: candidates.rawMetadata,
    })
    .from(candidates)
    .where(
      or(
        eq(candidates.jurisdiction, "federal-house"),
        eq(candidates.jurisdiction, "federal-senate"),
      ),
    );

  let resolved = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const meta = (row.rawMetadata ?? {}) as Record<string, unknown>;
    const fec = (meta.fec ?? {}) as Record<string, unknown>;

    // Skip if already has FEC ID
    if (typeof fec.candidate_id === "string" && fec.candidate_id) {
      skipped++;
      continue;
    }

    const office = extractOffice(row.jurisdiction);
    const state = extractStateFromName(row.fullName);
    const lastName = extractLastName(row.fullName);

    if (!state) {
      console.log(`[fix-fec] no_state candidate=${row.id} name="${row.fullName}"`);
      failed++;
      continue;
    }

    await sleep(DELAY_MS);

    const fecId = await lookupFecId(lastName, state, office);
    if (!fecId) {
      console.log(`[fix-fec] not_found candidate=${row.id} name="${row.fullName}"`);
      failed++;
      continue;
    }

    // Patch raw_metadata.fec.candidate_id
    const updated = {
      ...meta,
      fec: { ...(meta.fec as Record<string, unknown> ?? {}), candidate_id: fecId },
    };

    await db
      .update(candidates)
      .set({ rawMetadata: updated })
      .where(eq(candidates.id, row.id));

    console.log(`[fix-fec] resolved candidate=${row.id} fec_id=${fecId}`);
    resolved++;
  }

  console.log(
    `[fix-fec] complete resolved=${resolved} skipped=${skipped} failed=${failed}`,
  );
}

main().catch((e) => {
  console.error("[fix-fec] fatal:", e);
  process.exitCode = 1;
});
