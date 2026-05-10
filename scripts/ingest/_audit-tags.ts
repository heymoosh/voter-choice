/**
 * scripts/ingest/_audit-tags.ts
 *
 * Phase G — Tag-audit helper (manual QA tool).
 *
 * Samples rows from `issue_tags`, joins to `bills` for context, and prints
 * a human-readable summary to stdout so operators can spot-check tagging
 * quality after an ingest run.
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/_audit-tags.ts
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/_audit-tags.ts --limit 20
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/_audit-tags.ts --canonical-issue=healthcare_affordability
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/_audit-tags.ts --limit 10 --canonical-issue=border_security
 *
 * This script is read-only. It never writes to the database.
 */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { issueTags, bills } from "../../db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuditRow = {
  billId: string;
  canonicalIssue: string;
  stanceLens: string;
  confidence: string | null;
  taggerVersion: string;
  billTitle: string;
  summaryPreview: string;
};

export type AuditConfig = {
  limit: number;
  canonicalIssueFilter: string | null;
};

// ---------------------------------------------------------------------------
// Config resolution
// ---------------------------------------------------------------------------

export function resolveAuditConfig(
  argv: string[] = process.argv,
): AuditConfig {
  const limit = parseLimitFlag(argv) ?? 50;
  const canonicalIssueFilter = parseCanonicalIssueFlag(argv);
  return { limit, canonicalIssueFilter };
}

function parseLimitFlag(argv: string[]): number | null {
  const idx = argv.indexOf("--limit");
  if (idx === -1) return null;
  const value = argv[idx + 1];
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseCanonicalIssueFlag(argv: string[]): string | null {
  for (const arg of argv) {
    if (arg.startsWith("--canonical-issue=")) {
      const value = arg.slice("--canonical-issue=".length).trim();
      return value.length > 0 ? value : null;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// DB query
// ---------------------------------------------------------------------------

/**
 * Sample `limit` rows from issue_tags, joining bills for title + summary.
 * Uses ORDER BY RANDOM() for a genuine random sample — suitable for QA.
 * When canonicalIssueFilter is set, restricts to that issue only.
 */
export async function fetchAuditRows(
  db: DbClient,
  config: AuditConfig,
): Promise<AuditRow[]> {
  // Build the query with an optional canonical_issue filter.
  // We use a raw SQL fragment for ORDER BY RANDOM() since Drizzle
  // does not expose a RANDOM() sort helper out of the box.
  const baseQuery = db
    .select({
      billId: issueTags.billId,
      canonicalIssue: issueTags.canonicalIssue,
      stanceLens: issueTags.stanceLens,
      confidence: issueTags.taggerConfidence,
      taggerVersion: issueTags.taggerVersion,
      billTitle: bills.title,
      billSummary: bills.summary,
    })
    .from(issueTags)
    .innerJoin(bills, sql`${issueTags.billId} = ${bills.id}`);

  const rows = config.canonicalIssueFilter
    ? await baseQuery
        .where(
          sql`${issueTags.canonicalIssue} = ${config.canonicalIssueFilter}`,
        )
        .orderBy(sql`RANDOM()`)
        .limit(config.limit)
    : await baseQuery
        .orderBy(sql`RANDOM()`)
        .limit(config.limit);

  return rows.map((row) => ({
    billId: row.billId,
    canonicalIssue: row.canonicalIssue,
    stanceLens: row.stanceLens,
    confidence: row.confidence,
    taggerVersion: row.taggerVersion,
    billTitle: row.billTitle,
    summaryPreview: (row.billSummary ?? "(no summary)").slice(0, 200),
  }));
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

const SEPARATOR = "─".repeat(72);

/**
 * Format a single audit row as a readable multi-line block.
 */
export function formatAuditRow(row: AuditRow, index: number): string {
  const lines: string[] = [
    `${SEPARATOR}`,
    `[${index + 1}] bill_id        : ${row.billId}`,
    `    canonical_issue: ${row.canonicalIssue}`,
    `    stance_lens    : ${row.stanceLens}`,
    `    confidence     : ${row.confidence ?? "(null)"}`,
    `    tagger_version : ${row.taggerVersion}`,
    `    bill_title     : ${row.billTitle}`,
    `    summary[:200]  : ${row.summaryPreview}`,
  ];
  return lines.join("\n");
}

/**
 * Print all audit rows plus a summary footer.
 */
export function printAuditResults(
  rows: AuditRow[],
  config: AuditConfig,
): void {
  if (rows.length === 0) {
    console.log("[audit-tags] No rows found.");
    if (config.canonicalIssueFilter) {
      console.log(
        `[audit-tags] Filter applied: canonical_issue=${config.canonicalIssueFilter}`,
      );
    }
    return;
  }

  for (let i = 0; i < rows.length; i++) {
    console.log(formatAuditRow(rows[i], i));
  }

  console.log(SEPARATOR);
  console.log(
    `[audit-tags] Sampled ${rows.length} row(s)${
      config.canonicalIssueFilter
        ? ` (filter: canonical_issue=${config.canonicalIssueFilter})`
        : ""
    }. Review for accuracy.`,
  );
}

// ---------------------------------------------------------------------------
// Main entry point (exported for tests)
// ---------------------------------------------------------------------------

export async function auditTags({
  db = requireDb(),
  argv = process.argv,
}: {
  db?: DbClient;
  argv?: string[];
} = {}): Promise<AuditRow[]> {
  const config = resolveAuditConfig(argv);

  process.stderr.write(
    `[audit-tags] sampling limit=${config.limit}${
      config.canonicalIssueFilter
        ? ` canonical_issue=${config.canonicalIssueFilter}`
        : ""
    }\n`,
  );

  const rows = await fetchAuditRows(db, config);
  printAuditResults(rows, config);
  return rows;
}

// ---------------------------------------------------------------------------
// CLI guard
// ---------------------------------------------------------------------------

function isCliExecution(): boolean {
  const entrypoint = process.argv[1];
  if (!entrypoint) return false;
  return import.meta.url === pathToFileURL(resolve(entrypoint)).href;
}

if (isCliExecution()) {
  auditTags().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[audit-tags] fatal: ${message}`);
    process.exitCode = 1;
  });
}
