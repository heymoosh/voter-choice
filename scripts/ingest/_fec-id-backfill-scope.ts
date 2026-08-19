/**
 * scripts/ingest/_fec-id-backfill-scope.ts
 *
 * Scope check (default) + guarded apply (--apply) for the "123 of 629
 * federal incumbents have a null fec_candidate_id" gap
 * (docs/DONOR_FRAMING_AND_ACCOUNTABILITY_PLAN.md Part 2 / Part 5 open item).
 * It is the reason ~103 of the 2022 promise-ledger candidates land in
 * `_promise-corpus-spike.ts`'s `no_fec_id` bucket even though they are real
 * incumbents with real FEC filings — our own `candidates` row just never got
 * the join key.
 *
 * unitedstates/congress-legislators (CC0, already the source
 * committee-assignments.ts uses) publishes `id.bioguide` and `id.fec` per
 * legislator in legislators-current.yaml — an authoritative identity
 * crosswalk, not a name guess, matching the "a filing/crosswalk is evidence"
 * standard the rest of this pipeline already holds itself to.
 *
 * Default mode only REPORTS how many `federal-<BIOGUIDE>` candidates rows
 * with a null fec_candidate_id have a resolvable bioguide->fec match. --apply
 * performs the UPDATE (approved 2026-08-18) — each write is individually
 * guarded by `fec_candidate_id IS NULL`, so it only fills blanks and is safe
 * to re-run.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/ingest/_fec-id-backfill-scope.ts [--sample N]
 *   npx tsx --env-file=.env.local scripts/ingest/_fec-id-backfill-scope.ts --apply
 */

import yaml from "js-yaml";
import { requireDb } from "../../db/client";
import { candidates } from "../../db/schema";
import { and, eq, isNull, like } from "drizzle-orm";

const LEGISLATORS_FILES = ["legislators-current.yaml", "legislators-historical.yaml"];
const LEGISLATORS_API_URL = (file: string) =>
  `https://api.github.com/repos/unitedstates/congress-legislators/contents/${file}`;

interface LegislatorRecord {
  id?: { bioguide?: string; fec?: string[] };
  name?: { first?: string; last?: string };
}

async function fetchLegislators(file: string): Promise<LegislatorRecord[]> {
  const res = await fetch(LEGISLATORS_API_URL(file), {
    headers: { accept: "application/vnd.github.raw+json" },
  });
  if (!res.ok) {
    throw new Error(`${file} fetch failed: ${res.status}`);
  }
  const text = await res.text();
  const parsed = yaml.load(text);
  if (!Array.isArray(parsed)) throw new Error(`unexpected legislators YAML shape in ${file}`);
  return parsed as LegislatorRecord[];
}

/** legislators-historical.yaml covers departed members; current.yaml wins on overlap. */
async function fetchAllLegislators(): Promise<LegislatorRecord[]> {
  const all: LegislatorRecord[] = [];
  for (const file of [...LEGISLATORS_FILES].reverse()) {
    all.push(...(await fetchLegislators(file)));
  }
  return all;
}

async function main(): Promise<void> {
  const sampleArgIdx = process.argv.indexOf("--sample");
  const sampleSize =
    sampleArgIdx >= 0 ? Number(process.argv[sampleArgIdx + 1]) : 10;

  const legislators = await fetchAllLegislators();
  const bioguideToFec = new Map<string, string>();
  for (const l of legislators) {
    const bioguide = l.id?.bioguide;
    const fecIds = l.id?.fec;
    if (!bioguide || !fecIds || fecIds.length === 0) continue;
    // Most recent filing id is last in the array per congress-legislators convention.
    bioguideToFec.set(bioguide, fecIds[fecIds.length - 1]);
  }
  process.stderr.write(
    `[fec-id-backfill-scope] legislators-current.yaml + legislators-historical.yaml: ` +
      `${legislators.length} rows, ${bioguideToFec.size} with a bioguide+fec crosswalk\n`,
  );

  const db = requireDb();
  const nullRows = await db
    .select({ id: candidates.id, name: candidates.fullName })
    .from(candidates)
    .where(
      and(isNull(candidates.fecCandidateId), like(candidates.id, "federal-%")),
    );

  process.stderr.write(
    `[fec-id-backfill-scope] candidates rows with id LIKE 'federal-%' AND fec_candidate_id IS NULL: ` +
      `${nullRows.length}\n`,
  );

  const matched: { candidateId: string; name: string; bioguide: string; fecId: string }[] = [];
  const unmatched: { candidateId: string; name: string }[] = [];

  for (const row of nullRows) {
    const bioguide = row.id.replace(/^federal-/u, "");
    const fecId = bioguideToFec.get(bioguide);
    if (fecId) {
      matched.push({ candidateId: row.id, name: row.name, bioguide, fecId });
    } else {
      unmatched.push({ candidateId: row.id, name: row.name });
    }
  }

  process.stderr.write(
    `[fec-id-backfill-scope] RESULT: ${matched.length}/${nullRows.length} resolvable via ` +
      `congress-legislators crosswalk, ${unmatched.length} still unmatched (likely not ` +
      `current sitting members, or a bioguide/id mismatch)\n`,
  );

  process.stderr.write(
    `\n[fec-id-backfill-scope] sample of ${Math.min(sampleSize, matched.length)} matches to spot-check:\n`,
  );
  for (const m of matched.slice(0, sampleSize)) {
    process.stderr.write(`  ${m.candidateId} (${m.name}) -> fec_candidate_id=${m.fecId}\n`);
  }

  if (unmatched.length > 0) {
    process.stderr.write(
      `\n[fec-id-backfill-scope] sample of ${Math.min(sampleSize, unmatched.length)} unmatched:\n`,
    );
    for (const u of unmatched.slice(0, sampleSize)) {
      process.stderr.write(`  ${u.candidateId} (${u.name})\n`);
    }
  }

  if (!process.argv.includes("--apply")) return;

  process.stderr.write(
    `\n[fec-id-backfill-scope] --apply: writing ${matched.length} fec_candidate_id values ` +
      `(each guarded by IS NULL)...\n`,
  );
  let updated = 0;
  for (const m of matched) {
    const result = await db
      .update(candidates)
      .set({ fecCandidateId: m.fecId })
      .where(and(eq(candidates.id, m.candidateId), isNull(candidates.fecCandidateId)))
      .returning({ id: candidates.id });
    if (result.length > 0) updated++;
  }
  process.stderr.write(`[fec-id-backfill-scope] applied: ${updated}/${matched.length} rows updated\n`);

  const verify = await db
    .select({ id: candidates.id, fecCandidateId: candidates.fecCandidateId })
    .from(candidates)
    .where(
      and(isNull(candidates.fecCandidateId), like(candidates.id, "federal-%")),
    );
  process.stderr.write(
    `[fec-id-backfill-scope] post-apply: ${verify.length} federal-* rows still null ` +
      `(expected ${nullRows.length - updated})\n`,
  );
}

main().catch((err) => {
  console.error("[fec-id-backfill-scope] fatal:", err);
  process.exit(1);
});
