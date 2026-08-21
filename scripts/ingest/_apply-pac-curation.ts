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
 *   - "sponsorClass" (migration 0026): who is behind the committee, in the
 *     vocabulary the corporate-PAC pledge is scored in — corporate | trade |
 *     labor | membership | leadership | party | non_connected | unknown.
 *     Written with sponsor_class_method='human', which the bulk ingest is
 *     forbidden to overwrite. This is the ONLY way to resolve a committee the
 *     FEC left ORG_TP blank on (Ernst & Young's and Deloitte's PACs both file
 *     it empty), and each one left 'unknown' blocks a "$0 corporate PAC"
 *     claim for every candidate it gave to.
 *
 *     A sponsorClass row does NOT need a status verdict — classifying who is
 *     behind a committee and ratifying its filed sponsor/sector display are
 *     different judgements, and forcing them to travel together would make a
 *     curator ratify a display claim they were not asked to look at.
 *
 *     GET IT WRONG SAFELY, AND THE CODE HOLDS YOU TO IT. Marking a committee
 *     corporate/trade/unknown only ever BLOCKS a clean badge; marking it
 *     labor/membership/leadership/party/non_connected can CLEAR one, and a
 *     cleared row is effectively permanent — the ingest upsert refuses to
 *     recompute a 'human' row, the backfill skips it, and the queue export
 *     will not re-queue it, so only hand-written SQL could undo a mistake.
 *     This script therefore accepts only the BLOCKING classes by default;
 *     writing a clearing class needs an explicit --allow-clearing, which is
 *     a curator saying "I know this direction is unrecoverable".
 *
 * WHERE THE EVIDENCE LIVES (deliberate, 2026-08-21). A curation file's "note"
 * and "evidenceUrl" keys are read by nothing here: only "summary"/"sourceUrl"
 * are written, into curated_summary/curated_source_url. That is a choice, not
 * a dropped field. curated_summary is rendered to readers by
 * src/lib/server/pac-sponsors.ts, so mapping a curator's private working note
 * into it would change user-visible copy — and this repo is under a design
 * freeze that forbids that. The provenance of each hand classification
 * therefore lives in git, next to the diff that made it, which is a durable
 * and reviewable home. Revisit when the freeze lifts and the display of a
 * curated sponsor note has actually been designed.
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
 *   Add --allow-clearing to permit labor/membership/leadership/party/
 *   non_connected classes — see the badge-clearing note above.
 */

import * as fs from "node:fs";
import { pathToFileURL } from "node:url";
import { sql, type SQL } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { requireDb } from "../../db/client";
import {
  CORPORATE_PLEDGE_CLASSES,
  PAC_SPONSOR_CLASS_LABELS,
} from "../../src/lib/pacSponsorClass";

const VALID_VERDICTS = new Set(["verified", "rejected"]);

/** The full sponsor-class vocabulary, from its single source of truth. */
const ALL_SPONSOR_CLASSES = new Set<string>(
  Object.keys(PAC_SPONSOR_CLASS_LABELS),
);

/**
 * The classes a curation file may write without ceremony: each one can only
 * ever BLOCK a "$0 corporate PAC" badge, never clear one. Everything else in
 * the vocabulary moves in the unrecoverable direction and needs
 * --allow-clearing. Derived from CORPORATE_PLEDGE_CLASSES so that widening or
 * narrowing the pledge scope moves this set with it.
 */
export const BLOCKING_SPONSOR_CLASSES: ReadonlySet<string> = new Set<string>([
  ...CORPORATE_PLEDGE_CLASSES,
  "unknown",
]);

export interface ApplyOptions {
  /** Accept classes that can clear a badge. Off unless a human asked. */
  allowClearing: boolean;
}

const STRICT: ApplyOptions = { allowClearing: false };

interface VerdictInput {
  committeeId: string;
  verdict: string | null;
  sector?: string | null;
  summary?: string | null;
  sourceUrl?: string | null;
  sponsorClass?: string | null;
}

function cleanOptional(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** True when the row asks for anything at all — a status verdict, a sponsor
 *  class, or both. Rows that ask for nothing are skipped, not failed. */
export function rowHasWork(r: VerdictInput): boolean {
  return (
    (r.verdict !== null && r.verdict !== undefined) ||
    cleanOptional(r.sponsorClass) !== null
  );
}

/** Validate one row; returns an error string or null. Strict by default. */
export function rowError(
  r: VerdictInput,
  options: ApplyOptions = STRICT,
): string | null {
  const sponsorClass = cleanOptional(r.sponsorClass);
  const hasVerdict = r.verdict !== null && r.verdict !== undefined;
  // A sponsor-class-only row is legitimate: see the header note on why the
  // two judgements travel separately.
  if (hasVerdict && !VALID_VERDICTS.has(r.verdict as string)) {
    return `invalid verdict "${r.verdict}" — must be "verified" or "rejected"`;
  }
  if (sponsorClass !== null && !ALL_SPONSOR_CLASSES.has(sponsorClass)) {
    return (
      `invalid sponsorClass "${sponsorClass}" — must be one of ` +
      [...ALL_SPONSOR_CLASSES].join(", ")
    );
  }
  if (
    sponsorClass !== null &&
    !options.allowClearing &&
    !BLOCKING_SPONSOR_CLASSES.has(sponsorClass)
  ) {
    return (
      `sponsorClass "${sponsorClass}" can CLEAR a "$0 corporate PAC" badge, ` +
      `and nothing downstream can undo it — the ingest, the backfill and the ` +
      `queue export all refuse to revisit a 'human' row. Pass ` +
      `--allow-clearing if that is genuinely what the evidence supports; ` +
      `otherwise use one of: ${[...BLOCKING_SPONSOR_CLASSES].join(", ")}`
    );
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

/**
 * Build the SET fragments for one row. Validates first — buildSet is exported
 * and callable on its own, and the previous `satisfies string as
 * PacSponsorClass` cast read like a check while asserting nothing at runtime.
 * The vocabulary guard has to be the thing that actually runs.
 */
export function buildSet(
  r: VerdictInput,
  options: ApplyOptions = STRICT,
): SQL[] {
  const error = rowError(r, options);
  if (error !== null) throw new Error(`${r.committeeId}: ${error}`);

  const sets: SQL[] = [sql`updated_at = now()`];
  if (r.verdict !== null && r.verdict !== undefined) {
    sets.push(sql`status = ${r.verdict}`);
  }
  const sponsorClass = cleanOptional(r.sponsorClass);
  if (sponsorClass !== null) {
    sets.push(
      sql`sponsor_class = ${sponsorClass}`,
      // 'human' is the one value the bulk ingest refuses to overwrite, so a
      // curated class survives every later re-run of federal-pac-sponsors.
      sql`sponsor_class_method = 'human'`,
    );
  }
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

export function describe(r: VerdictInput, previousStatus: string): string {
  const parts: string[] = [];
  if (r.verdict !== null && r.verdict !== undefined) {
    parts.push(`${previousStatus} -> ${r.verdict}`);
  }
  const sponsorClass = cleanOptional(r.sponsorClass);
  if (sponsorClass !== null) parts.push(`sponsor_class -> ${sponsorClass}`);
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
  const options: ApplyOptions = {
    allowClearing: process.argv.includes("--allow-clearing"),
  };
  if (!filePath || filePath.startsWith("--")) {
    console.error(
      "Usage: npx tsx _apply-pac-curation.ts <verdicts.json> [--confirm] [--allow-clearing]",
    );
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as VerdictInput[];
  if (!Array.isArray(raw)) {
    console.error("Input must be a JSON array");
    process.exit(1);
  }

  const withVerdict = raw.filter(rowHasWork);
  const skipped = raw.length - withVerdict.length;

  let invalid = 0;
  for (const r of withVerdict) {
    const error = rowError(r, options);
    if (error !== null) {
      console.error(`${r.committeeId}: ${error}`);
      invalid++;
    }
  }
  if (invalid > 0) process.exit(1);

  if (withVerdict.length === 0) {
    console.log(
      `Nothing to apply (${skipped} rows still null) — fill in "verdict" or "sponsorClass" fields first.`,
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
  for (const r of withVerdict) {
    console.log(
      `  ${r.committeeId}: ${describe(r, knownStatus.get(r.committeeId) ?? "?")}`,
    );
  }
  if (!confirm) return;

  // All or nothing. A sponsor-class-only row leaves no status change to eyeball
  // afterwards, so a half-applied file would be invisible: some committees
  // carrying a 'human' class the ingest will never recompute, the rest still
  // queued, and no way to tell which from the outside. db.batch is the
  // atomic primitive on this driver — neon-http has no interactive
  // transaction, so db.transaction() would throw at runtime.
  const updates = withVerdict.map(
    (r) =>
      db.execute(
        sql`UPDATE pac_committees
          SET ${sql.join(buildSet(r, options), sql`, `)}
          WHERE committee_id = ${r.committeeId}`,
      ) as BatchItem<"pg">,
  );
  await db.batch(updates as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
  console.log(
    `Applied ${updates.length} verdict(s). Re-run the queue export to see what's left.`,
  );
}

// Only run when invoked directly — the pure helpers above are imported by
// _apply-pac-curation.test.ts, which must not trigger a database write.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((e) => {
    console.error("Error:", e.message);
    process.exit(1);
  });
}
