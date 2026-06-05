/**
 * _audit-pole-v1.ts — READ-ONLY readiness audit for the alignment re-tag cutover.
 *
 * Connects to the Neon alignment branch via ALIGNMENT_DATABASE_URL in .env.alignment
 * (NEVER production / .env.local) and reports:
 *   - issue_tags_pole_v1 distribution by (canonical_issue, pole_stance)
 *   - old issue_tags distribution by canonical_issue (+ grand total, expect 42,506)
 *   - energy_grid status (re-tagged in pole_v1 yet? how many old rows?)
 *
 * Throwaway / untracked. No writes. Run from the launch-production-federal worktree:
 *   npx tsx scripts/ingest/_audit-pole-v1.ts
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

function loadAlignmentUrl(): string {
  const raw = readFileSync(".env.alignment", "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (t.startsWith("#") || !t.includes("=")) continue;
    const [k, ...rest] = t.split("=");
    if (k.trim() === "ALIGNMENT_DATABASE_URL") {
      return rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }
  throw new Error("ALIGNMENT_DATABASE_URL not found in .env.alignment");
}

async function main() {
  const url = loadAlignmentUrl();
  // Show only the host (no credentials) so we can sanity-check the branch.
  let host = "(unparseable)";
  try {
    host = new URL(url).host;
  } catch {
    /* ignore */
  }
  console.log(`# Connected host: ${host}`);

  const sql = neon(url);

  // 1) Does the corrected table exist, and what's its shape?
  const poleExists = await sql`
    SELECT to_regclass('public.issue_tags_pole_v1') IS NOT NULL AS exists`;
  console.log(`\n## issue_tags_pole_v1 exists: ${poleExists[0].exists}`);

  if (poleExists[0].exists) {
    const poleDist = await sql`
      SELECT canonical_issue, pole_stance, count(*)::int AS n
      FROM issue_tags_pole_v1
      GROUP BY 1, 2
      ORDER BY 1, 2`;
    console.log("\n## issue_tags_pole_v1 by (canonical_issue, pole_stance):");
    for (const r of poleDist) {
      console.log(`  ${r.canonical_issue.padEnd(24)} ${String(r.pole_stance).padEnd(10)} ${r.n}`);
    }
    const poleTotal = await sql`SELECT count(*)::int AS n FROM issue_tags_pole_v1`;
    console.log(`  -- pole_v1 TOTAL: ${poleTotal[0].n}`);

    const poleIssues = await sql`
      SELECT DISTINCT canonical_issue FROM issue_tags_pole_v1 ORDER BY 1`;
    console.log(`\n## Distinct issues re-tagged in pole_v1 (${poleIssues.length}):`);
    console.log("  " + poleIssues.map((r) => r.canonical_issue).join(", "));
  }

  // 2) Old issue_tags distribution (the branch copy; expect grand total 42,506).
  const oldDist = await sql`
    SELECT canonical_issue, count(*)::int AS n
    FROM issue_tags
    GROUP BY 1
    ORDER BY 2 DESC`;
  const oldTotal = await sql`SELECT count(*)::int AS n FROM issue_tags`;
  console.log(`\n## issue_tags (old) by canonical_issue — TOTAL ${oldTotal[0].n} (expect 42,506):`);
  for (const r of oldDist) {
    console.log(`  ${r.canonical_issue.padEnd(28)} ${r.n}`);
  }

  // 3) energy_grid focus — the issue RETAG_PLAN lists but HANDOFF didn't account for.
  const egOld = await sql`SELECT count(*)::int AS n FROM issue_tags WHERE canonical_issue = 'energy_grid'`;
  const egNew = poleExists[0].exists
    ? await sql`SELECT count(*)::int AS n FROM issue_tags_pole_v1 WHERE canonical_issue = 'energy_grid'`
    : [{ n: 0 }];
  console.log(`\n## energy_grid: old issue_tags=${egOld[0].n}  pole_v1=${egNew[0].n}`);
  console.log(
    egNew[0].n === 0 && egOld[0].n > 0
      ? "  -> NOT re-tagged. It is a 12th contested issue and joins Step 1."
      : "  -> accounted for.",
  );
}

main().catch((e) => {
  console.error("AUDIT FAILED:", e.message);
  process.exit(1);
});
