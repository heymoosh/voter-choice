/**
 * Read-only audit: what fields do we actually HAVE for the people who appear in
 * the collaborator graph? Written to answer "is the data ready to wire a
 * redesigned RepCard §5 to?" before porting Design's source.
 *
 * The current API (src/lib/server/collaborators.ts) exposes only
 * { candidateId, name, party, sharedBills, departed }. Anything a redesign asks
 * for beyond that — a departure year ("D · through 2024"), a state/district
 * next to the name, a denominator so the count can be shown as a share — needs
 * a field we may or may not hold. This tells us which.
 *
 * Run: npx tsx --env-file=.env.local scripts/ingest/_collab-data-audit.ts
 */
import { getDb } from "../../db/client";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb() as never as {
    execute: (q: unknown) => Promise<{ rows?: unknown[] }>;
  };
  const q = async (label: string, text: string) => {
    const r = await db.execute(sql.raw(text));
    console.log("\n### " + label);
    console.dir(r.rows ?? r, { depth: 3 });
  };

  await q(
    "graph size",
    `SELECT (SELECT count(*) FROM bill_cosponsors) AS rows,
            (SELECT count(DISTINCT bill_id) FROM bill_cosponsors) AS bills,
            (SELECT count(DISTINCT candidate_id) FROM bill_cosponsors) AS people`,
  );

  await q(
    "departed collaborators — field coverage",
    `WITH departed AS (
       SELECT DISTINCT c.id, c.state, c.district
       FROM bill_cosponsors bc
       JOIN candidates c ON c.id = bc.candidate_id
       WHERE c.is_incumbent = false
     )
     SELECT count(*) AS departed_in_graph,
            count(state) AS has_state,
            count(district) AS has_district,
            count(*) FILTER (WHERE EXISTS (
              SELECT 1 FROM candidate_offices o
              WHERE o.candidate_id = departed.id AND o.term_end IS NOT NULL
            )) AS has_term_end,
            count(*) FILTER (WHERE EXISTS (
              SELECT 1 FROM member_stats m WHERE m.candidate_id = departed.id
            )) AS has_member_stats
     FROM departed`,
  );

  await q(
    "sitting members in the graph — same fields, for contrast",
    `WITH sitting AS (
       SELECT DISTINCT c.id, c.state, c.district
       FROM bill_cosponsors bc
       JOIN candidates c ON c.id = bc.candidate_id
       WHERE c.is_incumbent = true
     )
     SELECT count(*) AS sitting_in_graph,
            count(state) AS has_state,
            count(district) AS has_district
     FROM sitting`,
  );

  await q(
    "denominator: total distinct bills per member (top 5, then min/median)",
    `SELECT candidate_id, count(DISTINCT bill_id) AS total_bills
     FROM bill_cosponsors GROUP BY candidate_id
     ORDER BY total_bills DESC LIMIT 5`,
  );

  await q(
    "bill date range in the graph (can we say 'since 2023'?)",
    `SELECT min(b.introduced_date) AS earliest, max(b.introduced_date) AS latest,
            count(*) FILTER (WHERE b.introduced_date IS NULL) AS null_dates
     FROM bills b
     WHERE b.id IN (SELECT DISTINCT bill_id FROM bill_cosponsors)`,
  );

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
