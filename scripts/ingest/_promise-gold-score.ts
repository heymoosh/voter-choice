/**
 * _promise-gold-score.ts — score the promise-ledger gold rounds and decide
 * the rubric §6.4 SHIP GATE.
 *
 * Input: the two annotators' filled CSVs from _promise-gold-sample.ts
 * (labels recorded independently — rubric §6.2). Depending on the round:
 *
 * ROUND 1 — "extraction": reports per-question agreement + Cohen's κ on
 *   is_promise / issue_correct / type_correct, and lists every disagreement
 *   (a disagreement = a genuinely contested extraction → review the capture
 *   together AFTER both labels are recorded; fixes flow into extractor
 *   prompt revisions, never into silent row edits).
 *
 * ROUND 2 — "verdict": the ship gate proper.
 *   - Cohen's κ on the human pair (gate: ≥ 0.70)
 *   - where the humans AGREE, that label is gold; the adjudicator (from
 *     promise_verdicts at --adjudicator-version, or a JSON export) must
 *     match ≥ 90% of gold cases with ZERO kept↔broken polarity flips
 *   - where the humans DISAGREE, the case is contested → not_yet_rated,
 *     excluded from the gold set (rubric §6.3)
 *   GATE PASS requires all three. Behind PROMISE_TRACKER_ENABLED until
 *   Muxin signs off regardless of scores (§6.4).
 *
 * Read-only.
 *   npx tsx scripts/ingest/_promise-gold-score.ts --round extraction \
 *     --a scripts/ingest/_promise-gold/extraction-round.annotator-a.csv \
 *     --b scripts/ingest/_promise-gold/extraction-round.annotator-b.csv
 */

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// ---------------------------------------------------------------------------
// CSV parsing (quoted fields, doubled quotes — matches the sample's writer)
// ---------------------------------------------------------------------------

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== "") rows.push(row);
  }
  return rows;
}

/** rows → per-promise label map for the named column. */
export function labelsByPromise(
  rows: string[][],
  column: string,
): Map<string, string> {
  if (rows.length === 0) return new Map();
  const header = rows[0];
  const idIdx = header.indexOf("promise_id");
  const colIdx = header.indexOf(column);
  if (idIdx < 0 || colIdx < 0) {
    throw new Error(`CSV lacks required columns: promise_id / ${column}`);
  }
  const out = new Map<string, string>();
  for (const row of rows.slice(1)) {
    const id = (row[idIdx] ?? "").trim();
    if (!id) continue;
    out.set(id, (row[colIdx] ?? "").trim().toLowerCase());
  }
  return out;
}

// ---------------------------------------------------------------------------
// Agreement statistics (pure)
// ---------------------------------------------------------------------------

export interface PairedLabels {
  promiseId: string;
  a: string;
  b: string;
}

export function pairLabels(
  a: Map<string, string>,
  b: Map<string, string>,
): PairedLabels[] {
  const out: PairedLabels[] = [];
  for (const [promiseId, labelA] of a) {
    const labelB = b.get(promiseId);
    if (labelB === undefined) continue;
    if (labelA === "" || labelB === "") continue; // unlabeled by either
    out.push({ promiseId, a: labelA, b: labelB });
  }
  return out;
}

export function agreementRate(pairs: PairedLabels[]): number {
  if (pairs.length === 0) return 0;
  return pairs.filter((p) => p.a === p.b).length / pairs.length;
}

/**
 * Cohen's κ for two raters over categorical labels.
 * κ = (p_o − p_e) / (1 − p_e); returns 1 when p_e === 1 (perfect trivial
 * agreement — a degenerate single-category set).
 */
export function cohenKappa(pairs: PairedLabels[]): number {
  if (pairs.length === 0) return 0;
  const po = agreementRate(pairs);
  const countsA = new Map<string, number>();
  const countsB = new Map<string, number>();
  for (const p of pairs) {
    countsA.set(p.a, (countsA.get(p.a) ?? 0) + 1);
    countsB.set(p.b, (countsB.get(p.b) ?? 0) + 1);
  }
  let pe = 0;
  const n = pairs.length;
  const categories = new Set([...countsA.keys(), ...countsB.keys()]);
  for (const c of categories) {
    pe += ((countsA.get(c) ?? 0) / n) * ((countsB.get(c) ?? 0) / n);
  }
  if (pe === 1) return 1;
  return (po - pe) / (1 - pe);
}

/** kept↔broken in either direction — the flips the gate forbids outright. */
export function isPolarityFlip(x: string, y: string): boolean {
  return (x === "kept" && y === "broken") || (x === "broken" && y === "kept");
}

export interface VerdictGateResult {
  humanPairs: number;
  humanKappa: number;
  goldCases: number;
  contestedCases: string[];
  adjudicatorScored: number;
  adjudicatorAgreement: number;
  polarityFlips: string[];
  gates: {
    kappaAtLeast070: boolean;
    agreementAtLeast090: boolean;
    zeroPolarityFlips: boolean;
  };
  pass: boolean;
}

/**
 * The §6.4 ship gate, computed. Human-agreed cases form the gold set;
 * contested cases are excluded (→ not_yet_rated, §6.3). The adjudicator is
 * scored only on gold cases it produced a verdict for.
 */
export function scoreVerdictGate(
  humanPairs: PairedLabels[],
  adjudicator: Map<string, string>,
): VerdictGateResult {
  const humanKappa = cohenKappa(humanPairs);
  const gold = humanPairs.filter((p) => p.a === p.b);
  const contested = humanPairs
    .filter((p) => p.a !== p.b)
    .map((p) => p.promiseId);

  let scored = 0;
  let agreed = 0;
  const flips: string[] = [];
  for (const g of gold) {
    const modelVerdict = adjudicator.get(g.promiseId);
    if (modelVerdict === undefined || modelVerdict === "") continue;
    scored += 1;
    if (modelVerdict === g.a) agreed += 1;
    if (isPolarityFlip(modelVerdict, g.a)) flips.push(g.promiseId);
  }
  const adjudicatorAgreement = scored === 0 ? 0 : agreed / scored;
  const gates = {
    kappaAtLeast070: humanKappa >= 0.7,
    agreementAtLeast090: adjudicatorAgreement >= 0.9,
    zeroPolarityFlips: flips.length === 0,
  };
  return {
    humanPairs: humanPairs.length,
    humanKappa,
    goldCases: gold.length,
    contestedCases: contested,
    adjudicatorScored: scored,
    adjudicatorAgreement,
    polarityFlips: flips,
    gates,
    pass:
      gates.kappaAtLeast070 &&
      gates.agreementAtLeast090 &&
      gates.zeroPolarityFlips,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function flagValue(argv: string[], flag: string): string | null {
  const idx = argv.indexOf(flag);
  if (idx < 0 || idx + 1 >= argv.length) return null;
  return argv[idx + 1];
}

const EXTRACTION_QUESTIONS = [
  "is_promise (yes/no)",
  "issue_correct (yes/no)",
  "type_correct (yes/no)",
];

const VERDICT_COLUMN =
  "verdict (kept/attempted_blocked/compromise/broken/not_yet_testable/not_yet_rated)";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const round = flagValue(argv, "--round") ?? "extraction";
  const pathA = flagValue(argv, "--a");
  const pathB = flagValue(argv, "--b");
  if (!pathA || !pathB) {
    process.stderr.write(
      "[promise-gold-score] --a and --b (the two annotators' filled CSVs) are required.\n",
    );
    process.exit(1);
  }
  const rowsA = parseCsv(readFileSync(pathA, "utf8"));
  const rowsB = parseCsv(readFileSync(pathB, "utf8"));

  if (round === "extraction") {
    for (const question of EXTRACTION_QUESTIONS) {
      const pairs = pairLabels(
        labelsByPromise(rowsA, question),
        labelsByPromise(rowsB, question),
      );
      const kappa = cohenKappa(pairs);
      const rate = agreementRate(pairs);
      console.log(
        `${question}: n=${pairs.length} agreement=${(rate * 100).toFixed(1)}% kappa=${kappa.toFixed(3)}`,
      );
      for (const p of pairs.filter((x) => x.a !== x.b)) {
        console.log(`  disagreement ${p.promiseId}: a=${p.a} b=${p.b}`);
      }
    }
    console.log(
      "\nDisagreements are contested extractions: review the captures TOGETHER now that both labels are recorded; fixes flow into extractor prompt revisions.",
    );
    return;
  }

  if (round === "verdict") {
    const humanPairs = pairLabels(
      labelsByPromise(rowsA, VERDICT_COLUMN),
      labelsByPromise(rowsB, VERDICT_COLUMN),
    );
    // Adjudicator verdicts: JSON export {promiseId: verdict} via --adjudicator.
    const adjPath = flagValue(argv, "--adjudicator");
    const adjudicator = new Map<string, string>(
      adjPath
        ? Object.entries(
            JSON.parse(readFileSync(adjPath, "utf8")) as Record<string, string>,
          )
        : [],
    );
    const result = scoreVerdictGate(humanPairs, adjudicator);
    console.log(JSON.stringify(result, null, 2));
    console.log(
      `\nSHIP GATE (${result.pass ? "PASS" : "FAIL"}): κ=${result.humanKappa.toFixed(3)} (≥0.70: ${result.gates.kappaAtLeast070}) ` +
        `adjudicator=${(result.adjudicatorAgreement * 100).toFixed(1)}% (≥90%: ${result.gates.agreementAtLeast090}) ` +
        `polarity_flips=${result.polarityFlips.length} (zero: ${result.gates.zeroPolarityFlips})`,
    );
    console.log(
      "Contested cases (human disagreement) go to not_yet_rated and are excluded from the gold set (rubric §6.3). " +
        "PROMISE_TRACKER_ENABLED stays off until Muxin signs off regardless of scores (§6.4).",
    );
    return;
  }

  process.stderr.write(
    "[promise-gold-score] --round must be 'extraction' or 'verdict'\n",
  );
  process.exit(1);
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((err) => {
    process.stderr.write(
      `[promise-gold-score] fatal: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  });
}
