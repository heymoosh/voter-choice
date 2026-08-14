/**
 * Export every candidate promise, grouped by canonical issue, as the input
 * for the vocabulary-gap review workflow (_vocab-gap.workflow.js).
 *
 * The gap review automates what Muxin was doing by hand on the extraction
 * gold worksheet (2026-08-13): reading each promise against the issue it was
 * filed under and asking "does this actually fit the issue's DEFINITION —
 * or does it reveal a missing id, a missing sub-issue, or a pole that needs
 * splitting?" Her manual pass over 30 TX promises surfaced seven candidates
 * (tariffs, wages/worker-power, Social Security-as-healthcare, education
 * policy vs funding, AI, public-safety enforcement direction, flood
 * mitigation); the corpus will be hundreds of promises across states, so
 * discovery is delegated to subagents and the human role collapses to
 * approving/rejecting the proposed vocabulary changes.
 *
 * Read-only. Runs on the dev machine:
 *   npx tsx --env-file=.env.local scripts/ingest/_export-vocab-gap-input.ts
 * Then, in a Claude Code session in this repo, run
 * scripts/ingest/_vocab-gap.workflow.js (see its header).
 */

import { writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { requireDb } from "../../db/client";
import { CANONICAL_ISSUE_LABELS } from "../../src/lib/canonicalIssues";

const OUT_PATH = "/tmp/vocab-gap-input.json";

interface PromiseRow {
  id: string;
  canonical_issue: string;
  sub_issue: string | null;
  promise_type: string;
  promise_text: string;
  candidate_name: string | null;
  state: string | null;
  district: string | null;
  office: string | null;
}

/** "TX-05" for house rows, "TX senate" for senate, null when unknown. */
function seatLabel(row: PromiseRow): string | null {
  if (!row.state) return null;
  if (row.office === "house" && row.district) {
    return `${row.state}-${row.district}`;
  }
  return row.office ? `${row.state} ${row.office}` : row.state;
}

async function main() {
  const db = requireDb();
  // Column names per db/schema.ts `candidates`: full_name (NOT name), and no
  // seat column — seat is composed from state/district/office (2026-08-14 fix;
  // the original query referenced c.name/c.seat and failed at runtime).
  const result = await db.execute(
    sql`
    SELECT p.id, p.canonical_issue, p.sub_issue, p.promise_type,
           p.promise_text, c.full_name AS candidate_name,
           c.state, c.district, c.office
    FROM candidate_promises p
    LEFT JOIN candidates c ON c.id = p.candidate_id
    ORDER BY p.canonical_issue, p.id
  `,
  );
  const rows = result.rows as unknown as PromiseRow[];

  const byIssue = new Map<string, PromiseRow[]>();
  for (const row of rows) {
    const group = byIssue.get(row.canonical_issue) ?? [];
    group.push(row);
    byIssue.set(row.canonical_issue, group);
  }

  const groups = [...byIssue.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([issueId, promises]) => ({
      issueId,
      label: CANONICAL_ISSUE_LABELS[issueId] ?? issueId,
      knownIssueId: issueId in CANONICAL_ISSUE_LABELS,
      promises: promises.map((p) => ({
        id: p.id,
        subIssue: p.sub_issue,
        promiseType: p.promise_type,
        text: p.promise_text,
        candidate: p.candidate_name,
        seat: seatLabel(p),
      })),
    }));

  writeFileSync(OUT_PATH, JSON.stringify({ groups }, null, 2));
  console.log(
    `Exported ${rows.length} promises in ${groups.length} issue groups -> ${OUT_PATH}`,
  );
  for (const g of groups) {
    console.log(
      `  ${g.issueId}${g.knownIssueId ? "" : "  (NOT IN VOCABULARY)"}: ${g.promises.length}`,
    );
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
