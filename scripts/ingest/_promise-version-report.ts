/**
 * Report the extractor-version state of the promise ledger — which candidates
 * are fully current, which still carry stale rows, and which have not been
 * re-extracted at all.
 *
 * WHY: a version bump (promise-extract-v4, PR #510) re-extracts the corpus,
 * but Wayback flakiness makes each run partial, so the DB passes through a
 * mixed-version state on the way to convergence. Two distinct leftovers need
 * distinguishing before anyone considers cleanup:
 *
 *   1. STALE-BESIDE-CURRENT: a candidate HAS current-version rows, and ALSO
 *      older-version rows the current run did not reproduce. Candidates for
 *      pruning — but NOT automatically: an old row may come from a DIFFERENT
 *      Wayback capture (the row id hashes the capture URL), and a promise
 *      made on an earlier page version is still a promise the candidate made.
 *      Pruning semantics are a human decision; this script only surfaces the
 *      rows with their archive URLs so that decision is made with data.
 *   2. NOT-YET-REEXTRACTED: a candidate has ONLY older-version rows — their
 *      site never made it through a corpus-ready spike since the bump. These
 *      must NOT be touched; the fix is another extraction pass, not cleanup.
 *
 * Read-only. No prune flag on purpose (see 1). Runs on the dev machine:
 *   npx tsx --env-file=.env.local scripts/ingest/_promise-version-report.ts
 */

import { sql } from "drizzle-orm";
import { requireDb } from "../../db/client";
import { EXTRACTION_MODEL_VERSION } from "./promise-extract";

interface Row {
  candidate_id: string;
  candidate_name: string | null;
  version: string;
  n: number;
  ids_and_urls: string[];
}

async function main() {
  const db = requireDb();
  const result = await db.execute(
    sql`
    SELECT p.candidate_id, c.full_name AS candidate_name,
           p.extraction_model_version AS version,
           COUNT(*)::int AS n,
           array_agg(p.id || ' ' || p.archive_url ORDER BY p.id) AS ids_and_urls
    FROM candidate_promises p
    LEFT JOIN candidates c ON c.id = p.candidate_id
    GROUP BY p.candidate_id, c.full_name, p.extraction_model_version
    ORDER BY c.full_name, p.extraction_model_version
  `,
  );
  const rows = result.rows as unknown as Row[];

  const byCandidate = new Map<string, Row[]>();
  for (const row of rows) {
    const group = byCandidate.get(row.candidate_id) ?? [];
    group.push(row);
    byCandidate.set(row.candidate_id, group);
  }

  const current: string[] = [];
  const mixed: { name: string; stale: Row[] }[] = [];
  const notReextracted: { name: string; old: Row[] }[] = [];

  for (const group of byCandidate.values()) {
    const name = group[0].candidate_name ?? group[0].candidate_id;
    const hasCurrent = group.some(
      (g) => g.version === EXTRACTION_MODEL_VERSION,
    );
    const stale = group.filter((g) => g.version !== EXTRACTION_MODEL_VERSION);
    if (stale.length === 0) {
      current.push(name);
    } else if (hasCurrent) {
      mixed.push({ name, stale });
    } else {
      notReextracted.push({ name, old: stale });
    }
  }

  const totalByVersion = new Map<string, number>();
  for (const row of rows) {
    totalByVersion.set(
      row.version,
      (totalByVersion.get(row.version) ?? 0) + row.n,
    );
  }

  console.log(`Current extractor version: ${EXTRACTION_MODEL_VERSION}\n`);
  console.log("Promise rows by stored version:");
  for (const [version, n] of [...totalByVersion.entries()].sort()) {
    const marker = version === EXTRACTION_MODEL_VERSION ? "  <- current" : "";
    console.log(`  ${String(n).padStart(4)}  ${version}${marker}`);
  }

  console.log(`\nFully current candidates (${current.length}):`);
  for (const name of current) console.log(`  ok  ${name}`);

  console.log(
    `\nNOT yet re-extracted (${notReextracted.length}) — only old-version rows;` +
      `\nneeds another extraction pass, do NOT clean these up:`,
  );
  for (const { name, old } of notReextracted) {
    const n = old.reduce((t, g) => t + g.n, 0);
    console.log(
      `  wait  ${name}: ${n} rows at ${old.map((g) => g.version).join(", ")}`,
    );
  }

  console.log(
    `\nStale rows BESIDE current rows (${mixed.length} candidates) — the current` +
      `\nrun did not reproduce these; review each (capture may differ) before any prune:`,
  );
  for (const { name, stale } of mixed) {
    console.log(`  review  ${name}:`);
    for (const g of stale) {
      for (const idUrl of g.ids_and_urls) {
        console.log(`    [${g.version}] ${idUrl}`);
      }
    }
  }

  if (mixed.length === 0 && notReextracted.length === 0) {
    console.log(
      "\nConverged: every candidate is fully on the current version.",
    );
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
