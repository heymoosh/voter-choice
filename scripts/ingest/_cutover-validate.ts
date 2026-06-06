/**
 * _cutover-validate.ts — the CUTOVER GATE report (READ-ONLY on the Neon alignment branch).
 *
 * Joins the adjudicated oracle consensus (_gold-consensus.json) against pole_v1's held-aside
 * labels (_gold-pv.json) and the OLD issue_tags, and reports per contested issue:
 *
 *   1. INVERSION RATE (the gate) = among bills BOTH oracle & pole_v1 call confidently
 *      (in_favor/opposed), the fraction tagged the OPPOSITE direction. n = that denominator.
 *      GATE = inversion ≤ threshold, FULL STOP (improvement-over-old is a diagnostic, NOT a
 *      gate — under blank-on-fail, gating on "better than old" would blank healthy issues).
 *   2. n alongside every rate (denominators are small — a ≤5% gate on n=20 means "≤1 bill").
 *   3. IMPROVEMENT-VS-OLD (diagnostic): old issue_tags inversion vs oracle on the same bills.
 *   4. COVERAGE-COLLAPSE delta: # candidates scored before (old) vs after (pole_v1 confident).
 *   5. Writes _gold-disagreements.json — every oracle≠pole_v1 bill (title+summary) for adjudication.
 *
 *   npx tsx scripts/ingest/_cutover-validate.ts [threshold]      (threshold default 0.05)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

const BASE = resolve("scripts/ingest/_gold-batches");
const ISSUES = [
  "gun_rights_safety", "immigration", "border_security", "reproductive_rights",
  "public_safety", "crime_public_safety", "environment_climate", "election_integrity",
  "economy_jobs", "education_funding", "property_taxes", "energy_grid",
];
const CONF = new Set(["in_favor", "opposed"]);

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

function fourYearsAgo(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 4);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const threshold = process.argv[2] ? Number(process.argv[2]) : 0.05;
  const consensus = JSON.parse(readFileSync(`${BASE}/_gold-consensus.json`, "utf8")) as Record<
    string, { oracle: string; agreement: number; jurors: string[] }
  >;
  const pv = JSON.parse(readFileSync(`${BASE}/_gold-pv.json`, "utf8")) as Record<
    string, { pole_stance: string; confidence: string | null }
  >;
  if (!existsSync(`${BASE}/_manifest.json`)) throw new Error("run _gold-sample.ts first");
  const manifest = JSON.parse(readFileSync(`${BASE}/_manifest.json`, "utf8")) as Array<{
    issue: string; batchId: string;
  }>;

  // title/summary for the disagreement export
  const billMeta: Record<string, { title: string; summary: string | null }> = {};
  for (const b of manifest) {
    const data = JSON.parse(readFileSync(`${BASE}/${b.batchId}.json`, "utf8")) as {
      bills: Array<{ bill_id: string; title: string; summary: string | null }>;
    };
    for (const x of data.bills) billMeta[`${x.bill_id}|${b.issue}`] = { title: x.title, summary: x.summary };
  }

  const sql = neon(loadUrl());
  const cutoff = fourYearsAgo();

  // OLD issue_tags stance for every gold bill (for the improvement diagnostic)
  const goldKeys = Object.keys(consensus);
  const oldStance: Record<string, string> = {};
  const billIds = [...new Set(goldKeys.map((k) => k.split("|")[0]))];
  const oldRows = (await sql`
    SELECT bill_id, canonical_issue, stance_lens FROM issue_tags
    WHERE bill_id = ANY(${billIds}) AND canonical_issue = ANY(${ISSUES})
  `) as Array<{ bill_id: string; canonical_issue: string; stance_lens: string }>;
  for (const r of oldRows) oldStance[`${r.bill_id}|${r.canonical_issue}`] = r.stance_lens;

  const disagreements: Array<Record<string, unknown>> = [];
  const results: Array<{
    issue: string; n: number; inversions: number; rate: number; pass: boolean;
    pvAbstainOnConf: number; oracleAbstainPvConf: number; oldN: number; oldInv: number;
  }> = [];

  for (const issue of ISSUES) {
    let n = 0, inversions = 0, pvAbstainOnConf = 0, oracleAbstainPvConf = 0;
    let oldN = 0, oldInv = 0;
    for (const key of goldKeys) {
      if (!key.endsWith(`|${issue}`)) continue;
      const o = consensus[key].oracle;
      const p = pv[key]?.pole_stance;
      if (!p) continue;
      // improvement diagnostic: old (always confident) vs oracle-confident
      if (CONF.has(o) && oldStance[key]) {
        oldN++;
        if (oldStance[key] !== o) oldInv++;
      }
      // the gate: confident-both
      if (CONF.has(o) && CONF.has(p)) {
        n++;
        if (o !== p) {
          inversions++;
          disagreements.push({
            issue, bill_id: key.split("|")[0], oracle: o, pole_v1: p,
            kind: "INVERSION", agreement: consensus[key].agreement,
            jurors: consensus[key].jurors, pv_conf: pv[key].confidence,
            old: oldStance[key] ?? null,
            title: billMeta[key]?.title, summary: (billMeta[key]?.summary || "").slice(0, 600),
          });
        }
      } else if (CONF.has(o) && p === "no_score") {
        pvAbstainOnConf++;
        disagreements.push({
          issue, bill_id: key.split("|")[0], oracle: o, pole_v1: p,
          kind: "PV_ABSTAINED_ON_CONFIDENT", agreement: consensus[key].agreement,
          jurors: consensus[key].jurors, old: oldStance[key] ?? null,
          title: billMeta[key]?.title, summary: (billMeta[key]?.summary || "").slice(0, 600),
        });
      } else if (o === "no_score" && CONF.has(p)) {
        oracleAbstainPvConf++;
        disagreements.push({
          issue, bill_id: key.split("|")[0], oracle: o, pole_v1: p,
          kind: "ORACLE_ABSTAINED_PV_CONFIDENT", agreement: consensus[key].agreement,
          jurors: consensus[key].jurors, pv_conf: pv[key].confidence,
          title: billMeta[key]?.title, summary: (billMeta[key]?.summary || "").slice(0, 600),
        });
      }
    }
    const rate = n ? inversions / n : 0;
    results.push({
      issue, n, inversions, rate, pass: n > 0 && rate <= threshold,
      pvAbstainOnConf, oracleAbstainPvConf, oldN, oldInv,
    });
  }

  // Coverage-collapse: distinct candidates scored before (old) vs after (pv confident)
  const coverage: Record<string, { before: number; after: number }> = {};
  for (const issue of ISSUES) {
    const before = (await sql`
      SELECT count(DISTINCT v.candidate_id)::int n FROM votes v
      JOIN issue_tags it ON it.bill_id = v.bill_id
      WHERE it.canonical_issue = ${issue} AND v.vote_date >= ${cutoff}`)[0].n;
    const after = (await sql`
      SELECT count(DISTINCT v.candidate_id)::int n FROM votes v
      JOIN issue_tags_pole_v1 p ON p.bill_id = v.bill_id
      WHERE p.canonical_issue = ${issue} AND p.pole_stance IN ('in_favor','opposed')
        AND v.vote_date >= ${cutoff}`)[0].n;
    coverage[issue] = { before, after };
  }

  writeFileSync(`${BASE}/_gold-disagreements.json`, JSON.stringify(disagreements, null, 2));

  // ---- report ----
  console.log(`=== CUTOVER GATE — per-issue inversion (threshold ${(threshold * 100).toFixed(1)}%) ===`);
  console.log(`(gate = inversion ≤ threshold; improvement-over-old shown as DIAGNOSTIC only)\n`);
  console.log(`issue                 n(conf-both)  inv   rate    GATE   | old: inv/n  | pv→no_score on conf | oracle→no_score on pv-conf`);
  for (const r of results) {
    const oldRate = r.oldN ? `${Math.round((r.oldInv / r.oldN) * 100)}%` : "—";
    console.log(
      `${r.issue.padEnd(20)} ${String(r.n).padStart(8)}   ${String(r.inversions).padStart(3)}  ` +
      `${(r.rate * 100).toFixed(1).padStart(5)}%  ${r.n === 0 ? "  n=0 " : r.pass ? " PASS " : " FAIL "}  | ` +
      `${String(r.oldInv).padStart(2)}/${String(r.oldN).padStart(2)} (${oldRate.padStart(4)}) | ` +
      `${String(r.pvAbstainOnConf).padStart(3)}                 | ${r.oracleAbstainPvConf}`,
    );
  }
  console.log(`\n=== COVERAGE COLLAPSE — distinct candidates scored (4yr window, cutoff ${cutoff}) ===`);
  console.log(`issue                 before(old)  after(pv-confident)  delta`);
  for (const issue of ISSUES) {
    const c = coverage[issue];
    const delta = c.before ? Math.round(((c.after - c.before) / c.before) * 100) : 0;
    console.log(`${issue.padEnd(20)} ${String(c.before).padStart(8)}  ${String(c.after).padStart(12)}        ${delta}%`);
  }
  const failing = results.filter((r) => r.n > 0 && !r.pass).map((r) => r.issue);
  const noData = results.filter((r) => r.n === 0).map((r) => r.issue);
  console.log(`\nPASS: ${results.filter((r) => r.pass).length}/${ISSUES.length}` +
    (failing.length ? ` · FAIL (→ blank): ${failing.join(", ")}` : "") +
    (noData.length ? ` · n=0 (need review): ${noData.join(", ")}` : ""));
  console.log(`Disagreements for adjudication: ${disagreements.length} → _gold-disagreements.json`);
}

main().catch((e) => {
  console.error("VALIDATE FAILED:", e.message);
  process.exit(1);
});
