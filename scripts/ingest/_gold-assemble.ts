/**
 * _gold-assemble.ts — combine the 3 juror files per batch into ONE oracle label per bill.
 *
 * READ-ONLY on files (no DB). For each (bill_id, issue) in the gold sample, takes the
 * majority of the 3 jurors' pole_stance as the consensus oracle label; records agreement
 * (3/3 unanimous, 2/3 majority, or 0 = three-way split → "uncertain", excluded from the gate).
 *
 * Input:  scripts/ingest/_gold-batches/_manifest.json + _results/<batchId>.j<juror>.json
 * Output: scripts/ingest/_gold-batches/_gold-consensus.json
 *           { "<bill_id>|<issue>": { oracle, agreement, jurors:[s1,s2,s3] } }
 * Also prints inter-rater agreement (the EVAL.md reliability metric) + any coverage gaps.
 *
 *   npx tsx scripts/ingest/_gold-assemble.ts
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const BASE = resolve("scripts/ingest/_gold-batches");
const MAX_JURORS = 3;
const STANCES = ["in_favor", "opposed", "no_score"] as const;

interface JurorTag {
  bill_id: string;
  pole_stance: string;
  confidence: string;
}

function majority(votes: string[]): { oracle: string; agreement: number } {
  const counts: Record<string, number> = {};
  for (const v of votes) counts[v] = (counts[v] || 0) + 1;
  let best = "",
    bestN = 0;
  for (const s of STANCES) if ((counts[s] || 0) > bestN) (best = s), (bestN = counts[s]);
  // agreement = size of the winning bloc; bestN<2 means a 1/1/1 three-way split.
  return { oracle: bestN >= 2 ? best : "uncertain", agreement: bestN };
}

function main() {
  const manifest = JSON.parse(readFileSync(`${BASE}/_manifest.json`, "utf8")) as Array<{
    issue: string;
    batchId: string;
    count: number;
  }>;

  const consensus: Record<string, { oracle: string; agreement: number; jurors: string[] }> = {};
  let totalBills = 0,
    unanimous = 0,
    majorityOnly = 0,
    split = 0,
    missing = 0;
  const dirAgree: Record<string, { agree: number; tot: number }> = {}; // direction-only agreement

  for (const b of manifest) {
    // gather present juror files for this batch
    const jurorTagsById: Record<string, string[]> = {};
    let present = 0;
    for (let j = 1; j <= MAX_JURORS; j++) {
      const p = `${BASE}/_results/${b.batchId}.j${j}.json`;
      if (!existsSync(p)) continue;
      present++;
      const data = JSON.parse(readFileSync(p, "utf8")) as { tags: JurorTag[] };
      for (const t of data.tags) {
        (jurorTagsById[t.bill_id] ||= []).push(t.pole_stance);
      }
    }
    if (present < MAX_JURORS) {
      console.error(`⚠ ${b.batchId}: only ${present}/${MAX_JURORS} juror files present`);
    }

    for (const [bill_id, votes] of Object.entries(jurorTagsById)) {
      totalBills++;
      if (votes.length < MAX_JURORS) missing++;
      const { oracle, agreement } = majority(votes);
      consensus[`${bill_id}|${b.issue}`] = { oracle, agreement, jurors: votes };
      if (agreement === 3) unanimous++;
      else if (agreement === 2) majorityOnly++;
      else split++;
      // direction-only agreement: among jurors that gave a confident (non-no_score) call,
      // did they agree on direction? (the EVAL.md "agreement on direction" reliability check)
      const dir = votes.filter((v) => v !== "no_score");
      if (dir.length >= 2) {
        const allSame = dir.every((v) => v === dir[0]);
        const d = (dirAgree[b.issue] ||= { agree: 0, tot: 0 });
        d.tot++;
        if (allSame) d.agree++;
      }
    }
  }

  writeFileSync(`${BASE}/_gold-consensus.json`, JSON.stringify(consensus, null, 2));

  console.log(`=== ORACLE CONSENSUS (3-juror panel) ===`);
  console.log(`bills: ${totalBills} · unanimous(3/3): ${unanimous} (${pct(unanimous, totalBills)}) · ` +
    `majority(2/3): ${majorityOnly} (${pct(majorityOnly, totalBills)}) · split(1/1/1): ${split}`);
  if (missing) console.log(`⚠ ${missing} bills had <3 juror votes`);
  console.log(`\n=== DIRECTION agreement per issue (jurors with a confident call) ===`);
  for (const [iss, d] of Object.entries(dirAgree).sort()) {
    console.log(`  ${iss.padEnd(20)} ${d.agree}/${d.tot} agree on direction (${pct(d.agree, d.tot)})`);
  }
  console.log(`\nWrote _gold-consensus.json`);
}

function pct(a: number, b: number): string {
  return b ? `${Math.round((a / b) * 100)}%` : "—";
}

main();
