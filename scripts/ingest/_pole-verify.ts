/**
 * _pole-verify.ts — post-insert verification of the re-tag (read-only on the Neon branch).
 *
 * For the 4 newly re-tagged issues, reports:
 *   - 1:1 coverage: pole_v1 count per issue == old issue_tags count (5751/5675/2343/1824)
 *   - old stance_lens → new pole_stance transition matrix (flips, →no_score, unchanged)
 *   - no_score share per issue
 *
 *   npx tsx scripts/ingest/_pole-verify.ts
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const ISSUES = ["education_funding", "economy_jobs", "property_taxes", "energy_grid"];

function loadUrl(): string {
  const raw = readFileSync(".env.alignment", "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (t.startsWith("#") || !t.includes("=")) continue;
    const [k, ...rest] = t.split("=");
    if (k.trim() === "ALIGNMENT_DATABASE_URL")
      return rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("ALIGNMENT_DATABASE_URL not found");
}

async function main() {
  const sql = neon(loadUrl());
  const expected: Record<string, number> = {
    education_funding: 5751,
    economy_jobs: 5675,
    property_taxes: 2343,
    energy_grid: 1824,
  };

  console.log("=== 1:1 COVERAGE (pole_v1 vs old issue_tags) ===");
  for (const issue of ISSUES) {
    const nv = await sql`SELECT count(*)::int n FROM issue_tags_pole_v1 WHERE canonical_issue=${issue}`;
    const ok = nv[0].n === expected[issue] ? "✅" : "❌";
    console.log(`${ok} ${issue.padEnd(20)} pole_v1=${nv[0].n}  expected=${expected[issue]}`);
  }

  console.log("\n=== TRANSITION MATRIX (old stance_lens → new pole_stance) ===");
  for (const issue of ISSUES) {
    const rows = await sql`
      SELECT o.stance_lens AS old, p.pole_stance AS neu, count(*)::int AS n
      FROM issue_tags o
      JOIN issue_tags_pole_v1 p
        ON p.bill_id = o.bill_id AND p.canonical_issue = o.canonical_issue
      WHERE o.canonical_issue = ${issue}
      GROUP BY 1, 2 ORDER BY 1, 2`;
    const tot = rows.reduce((s, r) => s + r.n, 0);
    let flips = 0, toNo = 0, same = 0;
    for (const r of rows) {
      if (r.neu === "no_score") toNo += r.n;
      else if (r.old === r.neu) same += r.n;
      else flips += r.n;
    }
    console.log(
      `\n## ${issue} — n=${tot} · flips=${flips} (${Math.round((flips / tot) * 100)}%) · →no_score=${toNo} (${Math.round((toNo / tot) * 100)}%) · unchanged=${same}`,
    );
    for (const r of rows) console.log(`   ${String(r.old).padEnd(10)} → ${String(r.neu).padEnd(10)} ${r.n}`);
  }
}

main().catch((e) => {
  console.error("VERIFY FAILED:", e.message);
  process.exit(1);
});
