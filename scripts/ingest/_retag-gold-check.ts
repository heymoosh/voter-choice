/**
 * scripts/ingest/_retag-gold-check.ts
 *
 * BEFORE / AFTER validation for the TARGETED re-tag of thin-coverage issues
 * (reproductive_rights, immigration). Pairs with:
 *   - scripts/ingest/_retag-selector.ts  (which bills are in the subset)
 *   - scripts/ingest/tag-bills.ts --force --ids …  (the re-tag run)
 *
 * WHAT IT DOES
 * The full oracle gold gate (_gold-sample.ts → _gold-oracle.workflow.js →
 * scoring) measures pole inversion against a blind human panel and is heavy to
 * run. For a targeted coverage lift we want a fast, automatable regression check:
 * snapshot the targeted subset's tag state, run it BEFORE the re-tag and AFTER,
 * and diff. A healthy lift should:
 *   - increase `taggedForIssue` (coverage went up — the whole point), and
 *   - NOT collapse confidence or flip a large share of stances (regression).
 *
 * The snapshot is intentionally DB-derived and deterministic so two runs are
 * directly comparable. It does NOT replace the oracle gate for a TAGGER_VERSION
 * bump — it is the lightweight gate appropriate for a same-version targeted lift.
 * For a true accuracy gate on the re-tagged subset, feed the selector's ids into
 * the existing oracle harness (see HOW_TO in the snapshot footer / README).
 *
 * READ-ONLY. Never writes.
 *
 * Usage:
 *   # capture BEFORE the re-tag
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/_retag-gold-check.ts reproductive_rights --out /tmp/before.json
 *   # …run the targeted re-tag…
 *   # capture AFTER, and diff against BEFORE
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/_retag-gold-check.ts reproductive_rights --out /tmp/after.json --before /tmp/before.json
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import {
  RETAG_TARGET_STATES,
  buildRetagWhere,
  isRetagIssue,
  selectRetagBillIds,
  type RetagIssue,
} from "./_retag-selector";

// ---------------------------------------------------------------------------
// Snapshot shape
// ---------------------------------------------------------------------------

export type RetagSnapshot = {
  issue: RetagIssue;
  states: readonly string[];
  /** Bills in the targeted subset (state + keyword filter). */
  subsetBills: number;
  /** Subset bills carrying ≥1 issue_tags row for THIS canonical issue. */
  taggedForIssue: number;
  /** Coverage = taggedForIssue / subsetBills (0 when subset empty). */
  coverage: number;
  /** Stance distribution among the subset's tags for this issue. */
  stance: { in_favor: number; opposed: number };
  /** Mean tagger_confidence among the subset's tags for this issue (null when none). */
  meanConfidence: number | null;
};

/**
 * Compute the snapshot for a targeted subset. Read-only.
 *
 * One aggregate query over the subset (defined by buildRetagWhere) LEFT JOINed
 * to issue_tags filtered to this canonical issue.
 */
export async function computeRetagSnapshot(
  db: DbClient,
  issue: RetagIssue,
): Promise<RetagSnapshot> {
  const where = buildRetagWhere(issue);
  const result = await db.execute(sql`
    SELECT
      COUNT(DISTINCT b.id)                                          AS subset_bills,
      COUNT(DISTINCT it.bill_id)                                    AS tagged_for_issue,
      COUNT(*) FILTER (WHERE it.stance_lens = 'in_favor')          AS in_favor,
      COUNT(*) FILTER (WHERE it.stance_lens = 'opposed')           AS opposed,
      AVG(it.tagger_confidence)                                    AS mean_confidence
    FROM bills b
    LEFT JOIN issue_tags it
      ON it.bill_id = b.id AND it.canonical_issue = ${issue}
    WHERE ${where}
  `);

  const row = result.rows[0] as {
    subset_bills: string;
    tagged_for_issue: string;
    in_favor: string;
    opposed: string;
    mean_confidence: string | null;
  };

  const subsetBills = Number(row.subset_bills);
  const taggedForIssue = Number(row.tagged_for_issue);
  return {
    issue,
    states: RETAG_TARGET_STATES[issue],
    subsetBills,
    taggedForIssue,
    coverage: subsetBills > 0 ? taggedForIssue / subsetBills : 0,
    stance: { in_favor: Number(row.in_favor), opposed: Number(row.opposed) },
    meanConfidence:
      row.mean_confidence == null ? null : Number(row.mean_confidence),
  };
}

// ---------------------------------------------------------------------------
// Diff — before vs after
// ---------------------------------------------------------------------------

export type RetagDiff = {
  coverageDelta: number;
  taggedDelta: number;
  confidenceDelta: number | null;
  /** Heuristic regression flags for an operator to eyeball. */
  warnings: string[];
};

/**
 * Compare two snapshots of the SAME subset. Pure.
 *
 * Coverage should go UP (or hold) on a lift; a drop, or a large mean-confidence
 * collapse, is a regression signal worth a human look before shipping.
 */
export function diffRetagSnapshots(
  before: RetagSnapshot,
  after: RetagSnapshot,
): RetagDiff {
  const warnings: string[] = [];
  const coverageDelta = after.coverage - before.coverage;
  const taggedDelta = after.taggedForIssue - before.taggedForIssue;
  const confidenceDelta =
    before.meanConfidence != null && after.meanConfidence != null
      ? after.meanConfidence - before.meanConfidence
      : null;

  if (coverageDelta < 0) {
    warnings.push(
      `coverage DROPPED (${(before.coverage * 100).toFixed(1)}% → ${(after.coverage * 100).toFixed(1)}%) — a lift should not lose coverage`,
    );
  }
  if (confidenceDelta != null && confidenceDelta < -0.1) {
    warnings.push(
      `mean confidence fell ${confidenceDelta.toFixed(3)} (>0.1 drop) — re-tag may be lower quality`,
    );
  }

  return { coverageDelta, taggedDelta, confidenceDelta, warnings };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function argValue(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  return idx === -1 ? undefined : process.argv[idx + 1];
}

function isCliExecution(): boolean {
  const entrypoint = process.argv[1];
  if (!entrypoint) return false;
  return import.meta.url === pathToFileURL(resolve(entrypoint)).href;
}

async function main(): Promise<void> {
  const issueArg = process.argv[2];
  if (!issueArg || !isRetagIssue(issueArg)) {
    console.error(
      "[retag-gold-check] usage: _retag-gold-check.ts <reproductive_rights|immigration> " +
        "[--out file.json] [--before file.json]",
    );
    process.exitCode = 1;
    return;
  }

  const db = requireDb();
  const snapshot = await computeRetagSnapshot(db, issueArg);

  // For traceability, also list the targeted ids so the same subset can be fed
  // to tag-bills --force --ids and to the oracle harness.
  const ids = await selectRetagBillIds(db, issueArg);
  const payload = { ...snapshot, billIds: ids };

  const outFile = argValue("--out");
  if (outFile) {
    writeFileSync(resolve(outFile), JSON.stringify(payload, null, 2));
    console.error(`[retag-gold-check] wrote snapshot → ${outFile}`);
  }

  console.error(
    `[retag-gold-check] issue=${snapshot.issue} subset=${snapshot.subsetBills} ` +
      `tagged=${snapshot.taggedForIssue} coverage=${(snapshot.coverage * 100).toFixed(1)}% ` +
      `stance(in_favor/opposed)=${snapshot.stance.in_favor}/${snapshot.stance.opposed} ` +
      `mean_conf=${snapshot.meanConfidence?.toFixed(3) ?? "n/a"}`,
  );

  const beforeFile = argValue("--before");
  if (beforeFile) {
    const before = JSON.parse(
      readFileSync(resolve(beforeFile), "utf8"),
    ) as RetagSnapshot;
    const diff = diffRetagSnapshots(before, snapshot);
    console.log(
      `[retag-gold-check] DIFF coverageΔ=${(diff.coverageDelta * 100).toFixed(1)}pp ` +
        `taggedΔ=${diff.taggedDelta} ` +
        `confidenceΔ=${diff.confidenceDelta?.toFixed(3) ?? "n/a"}`,
    );
    if (diff.warnings.length) {
      console.log("[retag-gold-check] WARNINGS:");
      for (const w of diff.warnings) console.log(`  - ${w}`);
      process.exitCode = 3;
    } else {
      console.log("[retag-gold-check] OK — no regression flags");
    }
  }
}

if (isCliExecution()) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[retag-gold-check] fatal: ${message}`);
    process.exitCode = 1;
  });
}
