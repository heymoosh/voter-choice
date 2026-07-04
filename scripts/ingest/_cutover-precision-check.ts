/**
 * _cutover-precision-check.ts — characterize what the inversion gate does NOT measure.
 * READ-ONLY (branch + the on-disk disagreement file).
 *
 *  (1) The oracle-abstain bucket (pole_v1 confident, oracle no_score) split by pole_v1's OWN
 *      confidence — if mostly "low", the read-path confidence sort + visible vote mitigate;
 *      if "high", pole_v1 is confidently directional where an Opus panel can't be.
 *  (2) The UNMEASURED ship population: confident pole_v1 tags with a NULL summary (title-only).
 *      The gold sample was 100% with-summary, so these ship un-validated by the gate.
 *
 *   npx tsx scripts/ingest/_cutover-precision-check.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

const ISSUES = [
  "gun_rights_safety",
  "immigration",
  "border_security",
  "reproductive_rights",
  "public_safety",
  "crime_public_safety",
  "environment_climate",
  "election_integrity",
  "economy_jobs",
  "education_funding",
  "property_taxes",
  "energy_grid",
];
function loadUrl(): string {
  const raw = readFileSync(".env.alignment", "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (t.startsWith("#") || !t.includes("=")) continue;
    const [k, ...rest] = t.split("=");
    if (k.trim() === "ALIGNMENT_DATABASE_URL")
      return rest
        .join("=")
        .trim()
        .replace(/^["']|["']$/g, "");
  }
  throw new Error("no url");
}

async function main() {
  const BASE = resolve("scripts/ingest/_gold-batches");
  const dis = JSON.parse(
    readFileSync(`${BASE}/_gold-disagreements.json`, "utf8"),
  ) as Array<{
    issue: string;
    kind: string;
    pv_conf?: string;
  }>;

  console.log(
    "=== (1) ORACLE-ABSTAIN bucket (pole_v1 confident, oracle no_score) by pole_v1 confidence ===",
  );
  console.log("issue                 high  med  low  total");
  const byIssue: Record<string, { high: number; medium: number; low: number }> =
    {};
  for (const x of dis) {
    if (x.kind !== "ORACLE_ABSTAINED_PV_CONFIDENT") continue;
    const b = (byIssue[x.issue] ||= { high: 0, medium: 0, low: 0 });
    const c = (x.pv_conf as "high" | "medium" | "low") || "low";
    b[c]++;
  }
  let th = 0,
    tm = 0,
    tl = 0;
  for (const i of ISSUES) {
    const b = byIssue[i] || { high: 0, medium: 0, low: 0 };
    const t = b.high + b.medium + b.low;
    th += b.high;
    tm += b.medium;
    tl += b.low;
    if (t)
      console.log(
        `${i.padEnd(20)} ${String(b.high).padStart(4)} ${String(b.medium).padStart(4)} ${String(b.low).padStart(4)} ${String(t).padStart(6)}`,
      );
  }
  console.log(
    `${"TOTAL".padEnd(20)} ${String(th).padStart(4)} ${String(tm).padStart(4)} ${String(tl).padStart(4)} ${String(th + tm + tl).padStart(6)}`,
  );

  console.log(
    "\n=== (2) UNMEASURED ship population: confident pole_v1 tags by summary presence ===",
  );
  console.log(
    "(gold sample was 100% with-summary; null-summary confident tags ship un-validated)",
  );
  console.log(
    "issue                 confident  withSummary  nullSummary  %null",
  );
  const sql = neon(loadUrl());
  let cAll = 0,
    nAll = 0;
  for (const i of ISSUES) {
    const r = (
      await sql`
      SELECT count(*)::int total,
             count(*) FILTER (WHERE b.summary IS NOT NULL)::int withsum,
             count(*) FILTER (WHERE b.summary IS NULL)::int nullsum
      FROM issue_tags_pole_v1 p JOIN bills b ON b.id = p.bill_id
      WHERE p.canonical_issue = ${i} AND p.pole_stance IN ('in_favor','opposed')`
    )[0] as { total: number; withsum: number; nullsum: number };
    cAll += r.total;
    nAll += r.nullsum;
    const pctNull = r.total ? Math.round((r.nullsum / r.total) * 100) : 0;
    console.log(
      `${i.padEnd(20)} ${String(r.total).padStart(9)}  ${String(r.withsum).padStart(11)}  ${String(r.nullsum).padStart(11)}  ${pctNull}%`,
    );
  }
  console.log(
    `${"TOTAL".padEnd(20)} ${String(cAll).padStart(9)}  ${String(cAll - nAll).padStart(11)}  ${String(nAll).padStart(11)}  ${Math.round((nAll / cAll) * 100)}%`,
  );
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
