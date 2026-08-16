/**
 * scripts/ingest/_apply-pac-curation.ts
 *
 * Apply human curation verdicts to pac_committees — the write half of the
 * hand-curation pass (queue built by _export-pac-curation-queue.ts).
 *
 * Input: a JSON array of objects with at least { committeeId, verdict },
 * where verdict is "verified" | "rejected" | null. Optional fields:
 *   - "sector": a non-empty string replaces the sector with
 *     classification_method='human'. Clearing a sector is a rejection of the
 *     claim — use verdict "rejected" for that, not an empty string.
 *   - "summary" + "sourceUrl" (migration 0024): the plain-language
 *     "what this PAC is about / who is behind it" line and its citation.
 *     They travel TOGETHER — a summary without a source link is refused,
 *     because an uncited claim is exactly what this product does not do.
 *
 * Rules enforced here (0022/0024 migration contracts):
 *   - Only status transitions to 'verified'/'rejected' happen — this script
 *     never sets 'auto', so a human verdict is never machine-reverted.
 *   - Rows with verdict null are skipped silently (curate incrementally).
 *   - Unknown committee ids fail loudly, nothing is guessed.
 *
 * DRY-RUN BY DEFAULT — prints what would change. Pass --confirm to write.
 *   npx tsx --env-file=.env.local scripts/ingest/_apply-pac-curation.ts <verdicts.json>
 *   npx tsx --env-file=.env.local scripts/ingest/_apply-pac-curation.ts <verdicts.json> --confirm
 */

import * as fs from "node:fs";
import { sql, type SQL } from "drizzle-orm";
import { requireDb } from "../../db/client";

const VALID_VERDICTS = new Set(["verified", "rejected"]);

interface VerdictInput {
  committeeId: string;
  verdict: string | null;
  sector?: string | null;
  summary?: string | null;
  sourceUrl?: string | null;
}

function cleanOptional(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Validate one row; returns an error string or null. */
function rowError(r: VerdictInput): string | null {
  if (!VALID_VERDICTS.has(r.verdict as string)) {
    return `invalid verdict "${r.verdict}" — must be "verified" or "rejected"`;
  }
  const summary = cleanOptional(r.summary);
  const sourceUrl = cleanOptional(r.sourceUrl);
  if (summary !== null && sourceUrl === null) {
    return "summary provided without sourceUrl — every curated claim must cite its source";
  }
  if (sourceUrl !== null && !/^https?:\/\//u.test(sourceUrl)) {
    return `sourceUrl "${sourceUrl}" is not an http(s) URL`;
  }
  return null;
}

function buildSet(r: VerdictInput): SQL[] {
  const sets: SQL[] = [sql`status = ${r.verdict}`, sql`updated_at = now()`];
  const sector = cleanOptional(r.sector);
  if (sector !== null) {
    sets.push(sql`sector = ${sector}`, sql`classification_method = 'human'`);
  }
  const summary = cleanOptional(r.summary);
  if (summary !== null) {
    sets.push(
      sql`curated_summary = ${summary}`,
      sql`curated_source_url = ${cleanOptional(r.sourceUrl)}`,
    );
  }
  return sets;
}

function describe(r: VerdictInput, previousStatus: string): string {
  const parts = [`${previousStatus} -> ${r.verdict}`];
  const sector = cleanOptional(r.sector);
  if (sector !== null) parts.push(`sector -> ${sector}`);
  const summary = cleanOptional(r.summary);
  if (summary !== null) {
    parts.push(
      `summary -> "${summary.slice(0, 70)}${summary.length > 70 ? "…" : ""}"`,
    );
  }
  return parts.join("; ");
}

async function main() {
  const filePath = process.argv[2];
  const confirm = process.argv.includes("--confirm");
  if (!filePath || filePath.startsWith("--")) {
    console.error(
      "Usage: npx tsx _apply-pac-curation.ts <verdicts.json> [--confirm]",
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

  let invalid = 0;
  for (const r of withVerdict) {
    const error = rowError(r);
    if (error !== null) {
      console.error(`${r.committeeId}: ${error}`);
      invalid++;
    }
  }
  if (invalid > 0) process.exit(1);

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
    console.log(
      `  ${r.committeeId}: ${describe(r, knownStatus.get(r.committeeId) ?? "?")}`,
    );
    if (!confirm) continue;
    await db.execute(
      sql`UPDATE pac_committees
          SET ${sql.join(buildSet(r), sql`, `)}
          WHERE committee_id = ${r.committeeId}`,
    );
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
