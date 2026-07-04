/**
 * _subissue-gold-score.ts — score the sub-issue gold panel and decide the gate.
 *
 * For each sampled bill the tagger gave a non-null facet, compute the 3-juror
 * panel majority (facet | null | "split") and compare:
 *   agree       = panel majority == tagger facet
 *   contradict  = panel majority is a DIFFERENT non-null facet (a real precision error)
 *   unconfirmed = panel majority is null (panel saw no dominant facet)
 *   split       = no 2-juror majority
 * GATE (mirrors the June pole cutover bar): contradiction rate ≤ 5% per facet.
 * A facet that fails ships as sub_issue = NULL (parent fallback) rather than wrong.
 *
 * Read-only; no DB.
 *   npx tsx scripts/ingest/_subissue-gold-score.ts [--max-contradict 0.05]
 */
import { readFileSync, existsSync } from "node:fs";

const DIR = "scripts/ingest/_subissue-gold";
const RESULTS = `${DIR}/_results`;
const FACETS = [
  "drug_prices",
  "coverage_access",
  "provider_costs",
  "senior_care",
  "mental_behavioral_health",
];

function arg(name: string, def: number): number {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : def;
}

function majority(vals: (string | null)[]): string | null | "split" {
  const counts = new Map<string, number>();
  for (const v of vals) counts.set(String(v), (counts.get(String(v)) ?? 0) + 1);
  let best: string | null = null;
  let bestN = 0;
  for (const [k, n] of counts) {
    if (n > bestN) {
      bestN = n;
      best = k;
    }
  }
  if (bestN < 2) return "split";
  return best === "null" ? null : best;
}

function main() {
  const maxContradict = arg("--max-contradict", 0.05);
  const taggerLabels = JSON.parse(
    readFileSync(`${DIR}/_tagger-labels.json`, "utf8"),
  ) as Record<string, string>;

  // bill_id -> [juror1, juror2, juror3] sub_issue
  const jurorVotes: Record<string, (string | null)[]> = {};
  for (const facet of FACETS) {
    const batchId = `gold-${facet}`;
    for (let j = 1; j <= 3; j++) {
      const f = `${RESULTS}/${batchId}.j${j}.json`;
      if (!existsSync(f))
        throw new Error(`missing juror file: ${f} — run the gold oracle first`);
      const data = JSON.parse(readFileSync(f, "utf8"));
      for (const t of data.tags) {
        (jurorVotes[t.bill_id] = jurorVotes[t.bill_id] || []).push(
          t.sub_issue ?? null,
        );
      }
    }
  }

  const per: Record<
    string,
    {
      n: number;
      agree: number;
      contradict: number;
      unconfirmed: number;
      split: number;
    }
  > = {};
  for (const f of FACETS)
    per[f] = { n: 0, agree: 0, contradict: 0, unconfirmed: 0, split: 0 };

  const contradictions: Array<{
    bill_id: string;
    tagger: string;
    panel: string;
  }> = [];
  for (const [billId, tagFacet] of Object.entries(taggerLabels)) {
    const votes = jurorVotes[billId];
    if (!votes || votes.length === 0) continue;
    const p = per[tagFacet];
    p.n++;
    const maj = majority(votes);
    if (maj === "split") p.split++;
    else if (maj === null) p.unconfirmed++;
    else if (maj === tagFacet) p.agree++;
    else {
      p.contradict++;
      contradictions.push({ bill_id: billId, tagger: tagFacet, panel: maj });
    }
  }

  console.log("\n=== Sub-issue gold panel — per-facet results ===");
  let allPass = true;
  const failed: string[] = [];
  for (const f of FACETS) {
    const p = per[f];
    const cr = p.n ? p.contradict / p.n : 0;
    const pass = cr <= maxContradict;
    if (!pass) {
      allPass = false;
      failed.push(f);
    }
    console.log(
      `${pass ? "PASS" : "FAIL"} ${f.padEnd(24)} n=${String(p.n).padStart(3)}  agree=${p.agree}  contradict=${p.contradict} (${(cr * 100).toFixed(1)}%)  unconfirmed=${p.unconfirmed}  split=${p.split}`,
    );
  }
  console.log(
    `\nGate: contradiction ≤ ${(maxContradict * 100).toFixed(0)}% per facet → ${allPass ? "PASS (all facets)" : "FAIL: " + failed.join(", ")}`,
  );
  if (contradictions.length) {
    console.log("\nContradictions (tagger → panel):");
    for (const c of contradictions.slice(0, 40))
      console.log(`  ${c.bill_id}  ${c.tagger} → ${c.panel}`);
    if (contradictions.length > 40)
      console.log(`  …and ${contradictions.length - 40} more`);
  }
  if (failed.length) {
    console.log(
      `\nFAILED facets should ship as sub_issue=NULL: ${failed.join(", ")}`,
    );
    process.exit(3);
  }
}

main();
