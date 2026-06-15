/**
 * scripts/analytics/voter-concerns.ts
 *
 * Prints the three reference analyses over voter_issue_events:
 *   1. Which canonical issues voters in which states care most about.
 *   2. Taxonomy gaps — concerns outside the 15 canonical issues.
 *   3. Stance distribution per canonical issue.
 *
 * The canonical SQL lives alongside this file in voter-concerns.sql.
 *
 * Usage:
 *   DATABASE_URL=<neon-connection-string> npm run db:analytics-concerns
 */

import { requireDb, DatabaseNotConfiguredError } from "../../db/client";
import { sql } from "drizzle-orm";

function printRows(title: string, rows: Record<string, unknown>[]): void {
  console.log(`\n=== ${title} (${rows.length} rows) ===`);
  if (rows.length === 0) {
    console.log("  (no data)");
    return;
  }
  console.table(rows);
}

async function main() {
  let db;
  try {
    db = requireDb();
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      console.error("[analytics] FAIL — DATABASE_URL is not set.");
      process.exit(1);
    }
    throw err;
  }

  // Goal 1: issues by state (top priorities).
  const byState = await db.execute(sql`
    SELECT state_code,
           canonical_issue,
           COUNT(*)                         AS mentions,
           COUNT(*) FILTER (WHERE rank = 1) AS top_priority_mentions,
           ROUND(AVG(rank)::numeric, 2)     AS avg_rank
    FROM voter_issue_events
    WHERE canonical_issue IS NOT NULL
    GROUP BY state_code, canonical_issue
    ORDER BY state_code, mentions DESC
  `);
  printRows("Goal 1 — issues by state", byState.rows ?? []);

  // Goal 2: taxonomy gaps (unmapped concerns).
  const gaps = await db.execute(sql`
    SELECT off_topic_label,
           confidence_level,
           COUNT(*) AS occurrences
    FROM voter_issue_events
    WHERE canonical_issue IS NULL
    GROUP BY off_topic_label, confidence_level
    ORDER BY occurrences DESC
  `);
  printRows("Goal 2 — taxonomy gaps (outside the 15)", gaps.rows ?? []);

  // Goal 3: stance distribution per issue.
  const stances = await db.execute(sql`
    SELECT canonical_issue,
           lower(resolved_stance) AS stance,
           COUNT(*)               AS n
    FROM voter_issue_events
    WHERE canonical_issue IS NOT NULL
      AND resolved_stance IS NOT NULL
    GROUP BY canonical_issue, lower(resolved_stance)
    ORDER BY canonical_issue, n DESC
  `);
  printRows("Goal 3 — stance distribution per issue", stances.rows ?? []);

  process.exit(0);
}

main();
