/**
 * _pole-inspect.ts — read-only QA of re-tag result files (no DB).
 *
 * Joins each _results/<batchId>.json back to its batch (titles+summaries) and reports:
 *   - coverage (every result present? count match? bill_ids ⊆ batch?)
 *   - per-issue stance distribution
 *   - EDGE-CASE spotlight: the trap bills where a naive tagger inverts
 *
 *   npx tsx scripts/ingest/_pole-inspect.ts            # all result files present
 *   npx tsx scripts/ingest/_pole-inspect.ts <batchId>… # only these
 */
import { readFileSync, existsSync } from "node:fs";

const DIR = "scripts/ingest/_pole-batches";
type Tag = { bill_id: string; pole_stance: string; confidence: string };
type Bill = { bill_id: string; title: string; summary: string | null };

const TRAPS: Record<string, { label: string; re: RegExp }[]> = {
  energy_grid: [
    { label: "REPEAL/CRA (net-effect)", re: /disapproval|nullif|repeal|rescind|sunset/i },
    { label: "clean energy (→opposed)", re: /renewable|solar|wind|clean energy|electrif|emission/i },
    { label: "nuclear/CCS (→in_favor)", re: /nuclear|carbon capture|carbon-capture|\bccs\b/i },
    { label: "fossil (→in_favor)", re: /oil|gas|coal|drill|pipeline|lease|lng/i },
  ],
  education_funding: [
    { label: "choice/voucher (→opposed)", re: /charter|voucher|scholarship|education savings|\besa\b|school choice|tax credit/i },
    { label: "public funding (→in_favor)", re: /public school|teacher pay|title i|pre-?k|per-pupil|loan forgiv/i },
  ],
  economy_jobs: [
    { label: "outcome-only jobs (→no_score?)", re: /\bjobs?\b|economic growth|workforce|opportunit/i },
    { label: "tax cut/dereg (→opposed)", re: /tax cut|deregulat|right-to-work|right to work/i },
    { label: "min-wage/union (→in_favor)", re: /minimum wage|union|collective bargain|pro act/i },
  ],
  property_taxes: [
    { label: "cap/relief (→in_favor)", re: /\bcap\b|exempt|rollback|relief|reduce|homestead|freeze/i },
    { label: "levy/bond/raise (→opposed)", re: /levy|bond|increase|raise|millage|assessment/i },
  ],
};

function load(file: string) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function main() {
  const manifest = load(`${DIR}/_manifest.json`) as Array<{
    path: string; resultPath: string; issue: string; batchId: string; count: number;
  }>;
  const only = process.argv.slice(2);
  const entries = only.length ? manifest.filter((m) => only.includes(m.batchId)) : manifest;

  const perIssue: Record<string, Record<string, number>> = {};
  const samples: Record<string, { label: string; title: string; stance: string; conf: string }[]> = {};
  let missing = 0;

  for (const m of entries) {
    if (!existsSync(m.resultPath)) {
      console.log(`MISSING result: ${m.batchId}`);
      missing++;
      continue;
    }
    const result = load(m.resultPath) as { tags: Tag[] };
    const batch = load(m.path) as { bills: Bill[] };
    const billIds = new Set(batch.bills.map((b) => b.bill_id));
    const byId = new Map(batch.bills.map((b) => [b.bill_id, b]));
    const tagIds = new Set(result.tags.map((t) => t.bill_id));

    const miss = [...billIds].filter((id) => !tagIds.has(id));
    const extra = [...tagIds].filter((id) => !billIds.has(id));
    if (result.tags.length !== m.count || miss.length || extra.length)
      console.log(`COVERAGE WARN ${m.batchId}: tags=${result.tags.length}/${m.count} missing=${miss.length} extra=${extra.length}`);

    perIssue[m.issue] ??= {};
    samples[m.issue] ??= [];
    for (const t of result.tags) {
      perIssue[m.issue][t.pole_stance] = (perIssue[m.issue][t.pole_stance] ?? 0) + 1;
      const bill = byId.get(t.bill_id);
      if (!bill) continue;
      for (const trap of TRAPS[m.issue] ?? []) {
        if (trap.re.test(bill.title) && samples[m.issue].filter((s) => s.label === trap.label).length < 6) {
          samples[m.issue].push({ label: trap.label, title: bill.title.slice(0, 110), stance: t.pole_stance, conf: t.confidence });
        }
      }
    }
  }

  console.log("\n=== STANCE DISTRIBUTION (per issue) ===");
  for (const issue of Object.keys(perIssue)) {
    const d = perIssue[issue];
    const tot = Object.values(d).reduce((a, b) => a + b, 0);
    const ns = d.no_score ?? 0;
    console.log(`${issue.padEnd(20)} in_favor=${d.in_favor ?? 0} opposed=${d.opposed ?? 0} no_score=${ns} (${Math.round((ns / tot) * 100)}%) · n=${tot}`);
  }

  console.log("\n=== EDGE-CASE SPOTLIGHT (trap bills → assigned stance) ===");
  for (const issue of Object.keys(samples)) {
    console.log(`\n## ${issue}`);
    for (const s of samples[issue]) {
      console.log(`  [${s.stance.padEnd(8)} ${s.conf.padEnd(6)}] (${s.label})  ${s.title}`);
    }
  }
  if (missing) console.log(`\n${missing} result file(s) MISSING.`);
}

main();
