/**
 * scripts/ingest/_promise-stale-review.ts
 *
 * Companion to _promise-version-report.ts for the endgame of an extractor
 * version bump (2026-08-16, promise-extract-v4 convergence): for every
 * candidate carrying BOTH current-version rows and older-version rows, print
 * the stale rows' full promise text next to the candidate's current rows, so
 * the duplicate-vs-vanished call can be made row by row with the actual
 * words in front of you:
 *
 *   - DUPLICATE: the same promise re-extracted from a different capture (row
 *     ids hash the capture URL, so a newer capture mints a new id). Safe to
 *     prune — the current row carries the promise.
 *   - VANISHED: a promise the older capture carried that the current capture
 *     does not. KEEP — a candidate quietly removing a promise is exactly the
 *     accountability signal the ledger exists to record.
 *
 * Read-only; no prune flag on purpose — pruning is a separate, human-ratified
 * step once each row has a verdict. Runs on the dev machine:
 *   npx tsx --env-file=.env.local scripts/ingest/_promise-stale-review.ts
 */

import { sql } from "drizzle-orm";
import { requireDb } from "../../db/client";
import { EXTRACTION_MODEL_VERSION } from "./promise-extract";

interface PromiseRow {
  id: string;
  candidate_id: string;
  candidate_name: string | null;
  canonical_issue: string;
  sub_issue: string | null;
  promise_text: string;
  archive_url: string | null;
  version: string;
}

/** Pull the 14-digit Wayback timestamp out of an archive URL, as a date. */
function captureDate(archiveUrl: string | null): string {
  const m = archiveUrl?.match(/\/web\/(\d{8})\d{6}\//u);
  if (!m) return "no capture date";
  return `${m[1].slice(0, 4)}-${m[1].slice(4, 6)}-${m[1].slice(6, 8)}`;
}

function wrapText(text: string, indent: string): string {
  const words = text.split(/\s+/u);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line.length + word.length + 1 > 88) {
      lines.push(line);
      line = word;
    } else {
      line = line.length === 0 ? word : `${line} ${word}`;
    }
  }
  if (line.length > 0) lines.push(line);
  return lines.map((l) => `${indent}${l}`).join("\n");
}

async function main() {
  const db = requireDb();
  // All promises for candidates that hold at least one current-version row
  // AND at least one row on another version — the "review" bucket from
  // _promise-version-report.ts, now with the text attached.
  const result = await db.execute(
    sql`
    SELECT p.id, p.candidate_id, c.full_name AS candidate_name,
           p.canonical_issue, p.sub_issue, p.promise_text, p.archive_url,
           p.extraction_model_version AS version
    FROM candidate_promises p
    LEFT JOIN candidates c ON c.id = p.candidate_id
    WHERE p.candidate_id IN (
      SELECT candidate_id FROM candidate_promises
      GROUP BY candidate_id
      HAVING COUNT(*) FILTER (WHERE extraction_model_version = ${EXTRACTION_MODEL_VERSION}) > 0
         AND COUNT(*) FILTER (WHERE extraction_model_version <> ${EXTRACTION_MODEL_VERSION}) > 0
    )
    ORDER BY c.full_name, p.extraction_model_version, p.canonical_issue, p.id
  `,
  );
  const rows = result.rows as unknown as PromiseRow[];

  if (rows.length === 0) {
    console.log(
      "No candidate carries both current and stale rows — nothing to review.",
    );
    return;
  }

  const byCandidate = new Map<string, PromiseRow[]>();
  for (const row of rows) {
    const group = byCandidate.get(row.candidate_id) ?? [];
    group.push(row);
    byCandidate.set(row.candidate_id, group);
  }

  console.log(
    `Current extractor version: ${EXTRACTION_MODEL_VERSION}\n` +
      `${byCandidate.size} candidate(s) with stale rows beside current rows.\n` +
      `For each STALE row below, the verdict is either DUPLICATE (same promise\n` +
      `exists among the CURRENT rows — prunable) or VANISHED (no current row says\n` +
      `this — keep as an accountability record).`,
  );

  for (const group of byCandidate.values()) {
    const name = group[0].candidate_name ?? group[0].candidate_id;
    const stale = group.filter((r) => r.version !== EXTRACTION_MODEL_VERSION);
    const current = group.filter((r) => r.version === EXTRACTION_MODEL_VERSION);
    console.log(`\n=== ${name} ===`);
    for (const r of stale) {
      const issue =
        r.sub_issue === null
          ? r.canonical_issue
          : `${r.canonical_issue}/${r.sub_issue}`;
      console.log(
        `  STALE ${r.id} [${r.version}] issue=${issue} capture=${captureDate(r.archive_url)}`,
      );
      console.log(wrapText(`"${r.promise_text}"`, "    "));
    }
    console.log(`  CURRENT rows (${current.length}):`);
    for (const r of current) {
      const issue =
        r.sub_issue === null
          ? r.canonical_issue
          : `${r.canonical_issue}/${r.sub_issue}`;
      console.log(
        `    [${issue}] capture=${captureDate(r.archive_url)} ${r.id}`,
      );
      console.log(wrapText(`"${r.promise_text}"`, "      "));
    }
  }

  console.log(
    "\nDone. Paste this whole output back into the session for per-row verdicts.",
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
