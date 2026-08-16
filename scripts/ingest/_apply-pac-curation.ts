/**
 * scripts/ingest/_apply-pac-curation.ts
 *
 * Apply human curation verdicts to pac_committees — the write half of the
 * hand-curation pass (queue built by _export-pac-curation-queue.ts).
 *
 * Input: a JSON array of objects with at least { committeeId, verdict },
 * where verdict is "verified" | "rejected" | null. Optional "sector": a
 * non-empty string replaces the sector with classification_method='human';
 * the string "null" (or JSON null WITH a "clearSector": true flag) is NOT
 * supported on purpose — clearing a sector is a rejection of the claim, so
 * use verdict "rejected" instead.
 *
 * Rules enforced here (from the 0022 migration contract):
 *   - Only status transitions to 'verified'/'rejected' happen — this script
 *     never sets 'auto', so a human verdict is never machine-reverted.
 *   - Rows with verdict null are skipped silently (curate incrementally).
 *   - Unknown committee ids fail loudly, nothing is guessed.
 *
 * DRY-RUN BY DEFAULT — prints what would change. Pass --confirm to write.
 *   npx tsx --env-file=.env.local scripts/ingest/_apply-pac-curation.ts /tmp/pac-curation-queue.json
 *   npx tsx --env-file=.env.local scripts/ingest/_apply-pac-curation.ts /tmp/pac-curation-queue.json --confirm
 */

import * as fs from "node:fs";
import { sql } from "drizzle-orm";
import { requireDb } from "../../db/client";

const VALID_VERDICTS = new Set(["verified", "rejected"]);

interface VerdictInput {
  committeeId: string;
  verdict: string | null;
  sector?: string | null;
}

async function main() {
  const filePath = process.argv[2];
  const confirm = process.argv.includes("--confirm");
  if (!filePath || filePath.startsWith("--")) {
    console.error(
      "Usage: npx tsx _apply-pac-curation.ts <queue.json> [--confirm]",
    );
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as VerdictInput[];
  if (!Array.isArray(raw)) {
    console.error("Input must be a JSON array");
    process.exit(1);
  }

  const withVerdict = raw.filter(
    (r) => r.verdict !== null && r.verdict !== undefined,
  );
  const skipped = raw.length - withVerdict.length;

  const invalid = withVerdict.filter(
    (r) => !VALID_VERDICTS.has(r.verdict as string),
  );
  if (invalid.length > 0) {
    for (const r of invalid) {
      console.error(
        `invalid verdict "${r.verdict}" on ${r.committeeId} — must be "verified" or "rejected"`,
      );
    }
    process.exit(1);
  }

  if (withVerdict.length === 0) {
    console.log(
      `No verdicts to apply (${skipped} rows still null) — fill in "verdict" fields first.`,
    );
    return;
  }

  const db = requireDb();

  // Fail loudly on ids the table does not know.
  const ids = withVerdict.map((r) => r.committeeId);
  const known = await db.execute(
    sql`SELECT committee_id, status FROM pac_committees WHERE committee_id IN ${ids}`,
  );
  const knownStatus = new Map(
    (known.rows as { committee_id: string; status: string }[]).map((r) => [
      r.committee_id,
      r.status,
    ]),
  );
  const unknown = withVerdict.filter((r) => !knownStatus.has(r.committeeId));
  if (unknown.length > 0) {
    for (const r of unknown) {
      console.error(`unknown committee id ${r.committeeId} — nothing applied`);
    }
    process.exit(1);
  }

  console.log(
    `${confirm ? "APPLYING" : "DRY-RUN (pass --confirm to write)"}: ` +
      `${withVerdict.length} verdict(s), ${skipped} row(s) left null (skipped).`,
  );
  let applied = 0;
  for (const r of withVerdict) {
    const sectorOverride =
      typeof r.sector === "string" && r.sector.trim().length > 0
        ? r.sector.trim()
        : null;
    console.log(
      `  ${r.committeeId}: ${knownStatus.get(r.committeeId)} -> ${r.verdict}` +
        (sectorOverride === null ? "" : ` (sector -> ${sectorOverride})`),
    );
    if (!confirm) continue;
    if (sectorOverride === null) {
      await db.execute(
        sql`UPDATE pac_committees
            SET status = ${r.verdict}, updated_at = now()
            WHERE committee_id = ${r.committeeId}`,
      );
    } else {
      await db.execute(
        sql`UPDATE pac_committees
            SET status = ${r.verdict}, sector = ${sectorOverride},
                classification_method = 'human', updated_at = now()
            WHERE committee_id = ${r.committeeId}`,
      );
    }
    applied++;
  }
  if (confirm) {
    console.log(
      `Applied ${applied} verdict(s). Re-run the queue export to see what's left.`,
    );
  }
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
