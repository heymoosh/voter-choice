/**
 * scripts/ingest/_promise-prune-stale-v2.ts
 *
 * One-off prune closing out the promise-extract-v4 convergence (2026-08-16).
 * The _promise-stale-review.ts pass put all 9 leftover v2 rows in front of a
 * human next to each candidate's current rows. Verdicts:
 *
 *   - 7 rows are DUPLICATES — the identical promise (or the v4 extractor's
 *     tighter span of the same sentence) exists among the candidate's current
 *     rows, from the same or a newer capture. Hardcoded below; this script
 *     deletes exactly these, children first (promise_verdicts,
 *     promise_actions), then the promise rows.
 *   - 2 rows are KEPT deliberately (Justin Early, pr_4201475251… and
 *     pr_48bd1ae754…): same capture as his current rows, but the v4 extractor
 *     did not re-emit these two AI promises. They are real promises verbatim
 *     from the page — an extractor-judgment difference, not a duplicate and
 *     not a vanished promise. Old-version rows are valid data (linking and
 *     adjudication join on canonical_issue, not extractor version), so they
 *     stay. NOT A VANISHED-PROMISE CASE: none of the 9 were — every stale row
 *     came from page content that persists in the current captures.
 *
 * DRY-RUN BY DEFAULT — prints what would be deleted. Pass --confirm to
 * actually delete. Runs on the dev machine:
 *   npx tsx --env-file=.env.local scripts/ingest/_promise-prune-stale-v2.ts
 *   npx tsx --env-file=.env.local scripts/ingest/_promise-prune-stale-v2.ts --confirm
 */

import { sql } from "drizzle-orm";
import { requireDb } from "../../db/client";

/** Reviewed 2026-08-16 (stale-review output in-session, Muxin ratified). */
const PRUNE = [
  {
    id: "pr_bffa9151c3ef7317798e902f97b9b995cb5f264e",
    candidate: "Alexander Hale",
    duplicateOf: "pr_6449a13a75c9e4f6b2186b6f3f41a27c48eb1c6b",
    note: "same capture; v4 span 'restoring ICE staffing' under interior_ice_enforcement",
  },
  {
    id: "pr_7cb26e78c178970b3e96612aa544b766d69a8ea6",
    candidate: "Brandon Herrera",
    duplicateOf: "pr_4025bd65a83c313d3c9d635c8c83a0446b122685",
    note: "same capture; v4 row is the superset sentence (concealed carry + red-flag block)",
  },
  {
    id: "pr_a51610ad022c1624dd3000b76e3f2a050ebbab8a",
    candidate: "Craig Goldman",
    duplicateOf: "pr_0987458e25ed7975f7f4f8e770d86fc29f54cfbf",
    note: "identical ESG text; newer capture (2026-06-11 vs 2026-04-13)",
  },
  {
    id: "pr_3a8d3c0907ba3a704b7b7419e601b86f85242043",
    candidate: "Evan Hunt",
    duplicateOf: "pr_7ea656822d298f1171351e3b0e331ab39c45f463",
    note: "identical gerrymandering text; re-filed election_integrity -> redistricting_reform (vocab v2)",
  },
  {
    id: "pr_b7e40aae1f0eb50a11bcd5d078f8d04cb22b3f73",
    candidate: "Rhonda J Hart",
    duplicateOf: "pr_763bbd1f0640ac767f036e7f301da78394f364b9",
    note: "same capture; v4 span is the codify-Roe clause of the same sentence",
  },
  {
    id: "pr_c3b0e60dbc26ef2b29fb78ab6b742886cfcfdb02",
    candidate: "Trever Nehls",
    duplicateOf: "pr_b33b41321fa8ce7ea4240257929db790d7209225",
    note: "same capture; v4 span under curriculum_culture; full compound sentence remains at the archive URL",
  },
  {
    id: "pr_d3253911382139ee2a0dfb158050e30bf645a51d",
    candidate: "Trever Nehls",
    duplicateOf: "pr_40d777d24cb1617472912eecb01f79c00d594c85",
    note: "identical fund-law-enforcement text; same capture",
  },
];

async function main() {
  const confirm = process.argv.includes("--confirm");
  const db = requireDb();
  const ids = PRUNE.map((p) => p.id);
  const idList = sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  );

  const found = await db.execute(
    sql`SELECT id, candidate_id, canonical_issue, left(promise_text, 60) AS text
        FROM candidate_promises WHERE id IN (${idList})`,
  );
  const verdicts = await db.execute(
    sql`SELECT COUNT(*)::int AS n FROM promise_verdicts WHERE promise_id IN (${idList})`,
  );
  const actions = await db.execute(
    sql`SELECT COUNT(*)::int AS n FROM promise_actions WHERE promise_id IN (${idList})`,
  );
  const nVerdicts = (verdicts.rows[0] as { n: number }).n;
  const nActions = (actions.rows[0] as { n: number }).n;

  console.log(
    `${confirm ? "DELETING" : "DRY-RUN (pass --confirm to delete)"}: ` +
      `${found.rows.length}/${PRUNE.length} listed rows exist; ` +
      `${nVerdicts} linked verdict(s), ${nActions} linked action(s) go first.`,
  );
  for (const p of PRUNE) {
    const exists = found.rows.some((r) => (r as { id: string }).id === p.id);
    console.log(
      `  ${exists ? "prune" : "GONE "} ${p.id} (${p.candidate}) — duplicate of ${p.duplicateOf}`,
    );
  }
  if (!confirm) return;

  await db.execute(
    sql`DELETE FROM promise_verdicts WHERE promise_id IN (${idList})`,
  );
  await db.execute(
    sql`DELETE FROM promise_actions WHERE promise_id IN (${idList})`,
  );
  const del = await db.execute(
    sql`DELETE FROM candidate_promises WHERE id IN (${idList}) RETURNING id`,
  );
  console.log(
    `Deleted ${del.rows.length} promise row(s) (+${nVerdicts} verdicts, +${nActions} actions). ` +
      `Re-run _promise-version-report.ts — with the two kept Early rows, it should show ` +
      `exactly 2 old-version rows and call that the converged end state.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
