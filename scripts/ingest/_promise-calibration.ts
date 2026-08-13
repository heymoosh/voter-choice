/**
 * _promise-calibration.ts — EXTERNAL CALIBRATION of the promise adjudicator
 * against professionally-labeled historical cases (rubric §6.1; plan doc
 * "Decision (Muxin, 2026-08-13)": calibrate on labeled history, THEN run the
 * retrospective).
 *
 * WHAT THIS IS: the adjudicator's LLM path has never produced a real verdict
 * — every 2026 promise is deterministically not_yet_testable until the term
 * opens. Before trusting it on the 2022 retrospective, we score it against
 * promises whose outcomes are COMPLETE and already labeled by professionals
 * (PolitiFact's promise meters, the academic Polimeter / Comparative Agendas
 * projects). "Training" = iterating the rubric + adjudication prompt with
 * versioned ADJUDICATOR_REVISION (adj-vN) bumps and re-running this harness —
 * never fine-tuning; every revision stays auditable and reports are stamped
 * with the version they measured.
 *
 * COPYRIGHT DISCIPLINE (recorded in the plan): PolitiFact labels are
 * Poynter's copyright — they are used here for INTERNAL scoring with
 * citation only (source_url is a REQUIRED column) and never republished.
 * The real cases CSV therefore lives in scripts/ingest/_promise-calibration/
 * which is .gitignore'd; only the synthetic fixture under fixtures/ is
 * tracked.
 *
 * INPUT — a hand-assembled CSV (see CALIBRATION_COLUMNS). Each case carries:
 *   - the promise and its DECLARED TEST (promise_type + conditions_deadline),
 *     typed the way our extractor would have typed it;
 *   - its own promised window (window_start/window_end) — historical terms,
 *     not the 2026 TERM_WINDOW;
 *   - actions_json: the official-record actions the linker WOULD have linked
 *     (real votes/bills cited by the professional tracker, translated to our
 *     action shape). The harness assigns synthetic action ids, so the
 *     no-fabricated-evidence rail is exercised exactly as in production;
 *   - source_label (the professional ruling, verbatim, for the audit trail)
 *     and expected_verdict (that ruling mapped onto OUR enum by the person
 *     assembling the CSV).
 *
 * OUTPUT — per-case verdicts from the REAL adjudicator path (same system
 * prompt, same validation rails), scored against expected_verdict:
 * agreement, Cohen's κ, kept↔broken polarity flips (the §6.4 red line), the
 * model's flag rate (not_yet_rated — flagging is safe in production but a
 * high rate here means low usefulness), and a per-expected-label breakdown
 * so systematic misses (e.g. broken-by-inaction, which adj-v1's
 * zero-evidence rail deliberately flags) are visible.
 *
 * Usage (dev machine; needs ANTHROPIC_VOTER_API, no DB):
 *   npx tsx --env-file=.env.local scripts/ingest/_promise-calibration.ts \
 *     --cases scripts/ingest/_promise-calibration/cases.csv
 *   Flags: --cases <csv> (required), --now YYYY-MM-DD (default: today),
 *          --limit N, --dry-run (render prompts, no API), --json <out-path>.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import {
  ADJUDICATOR_VERSION,
  buildAdjudicationPrompt,
  buildAdjudicationSystemPrompt,
  deterministicNotYetTestable,
  parseAndValidateVerdict,
  windowNotYetOpen,
  VERDICTS,
  type LinkedAction,
  type PromiseWithActions,
  type TermWindow,
} from "./promise-adjudicate";
import { PROMISE_TYPES } from "./promise-extract";
import {
  agreementRate,
  cohenKappa,
  isPolarityFlip,
  parseCsv,
  type PairedLabels,
} from "./_promise-gold-score";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CALIBRATION_MODEL = "claude-sonnet-5";
const MAX_TOKENS = 2048;
const OUT_DIR = "scripts/ingest/_promise-calibration";

export const CALIBRATION_COLUMNS = [
  "case_id",
  "source",
  "source_url",
  "source_label",
  "expected_verdict",
  "promise_text",
  "promise_type",
  "conditions_deadline",
  "canonical_issue",
  "window_start",
  "window_end",
  "actions_json",
  "notes",
] as const;

const DIRECTIONS = new Set(["toward", "against"]);
const EVIDENCE_LEVELS = new Set(["activity", "advancement", "outcome"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalibrationAction {
  actionType: string;
  direction: string;
  evidenceLevel: string;
  billTitle: string | null;
  billStatus: string | null;
  voteCast: string | null;
  voteDate: string | null;
}

export interface CalibrationCase {
  caseId: string;
  source: string;
  sourceUrl: string;
  sourceLabel: string;
  expectedVerdict: string;
  promiseText: string;
  promiseType: string;
  conditionsDeadline: string | null;
  canonicalIssue: string;
  window: TermWindow;
  actions: CalibrationAction[];
  notes: string | null;
}

export interface CaseResult {
  caseId: string;
  source: string;
  sourceUrl: string;
  sourceLabel: string;
  expected: string;
  model: string;
  rationale: string;
}

export interface CalibrationReport {
  adjudicatorVersion: string;
  nowIso: string;
  casesPath: string;
  cases: number;
  scored: number;
  apiErrors: string[];
  agreement: number;
  kappa: number;
  polarityFlips: string[];
  flagged: string[];
  flagRate: number;
  agreementExcludingFlags: number;
  byExpected: Record<string, { n: number; agreed: number; flagged: number }>;
  disagreements: CaseResult[];
  results: CaseResult[];
}

// ---------------------------------------------------------------------------
// CSV → cases (pure)
// ---------------------------------------------------------------------------

function parseActionsJson(
  raw: string,
  caseId: string,
  errors: string[],
): CalibrationAction[] | null {
  const trimmed = raw.trim();
  if (trimmed === "") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    errors.push(`${caseId}: actions_json is not valid JSON`);
    return null;
  }
  if (!Array.isArray(parsed)) {
    errors.push(`${caseId}: actions_json must be a JSON array`);
    return null;
  }
  const out: CalibrationAction[] = [];
  for (const [i, entry] of parsed.entries()) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push(`${caseId}: actions_json[${i}] is not an object`);
      return null;
    }
    const a = entry as Record<string, unknown>;
    const actionType = typeof a.action_type === "string" ? a.action_type : "";
    const direction = typeof a.direction === "string" ? a.direction : "";
    const evidenceLevel =
      typeof a.evidence_level === "string" ? a.evidence_level : "";
    if (!actionType) {
      errors.push(`${caseId}: actions_json[${i}] lacks action_type`);
      return null;
    }
    if (!DIRECTIONS.has(direction)) {
      errors.push(
        `${caseId}: actions_json[${i}] direction "${direction}" must be toward|against`,
      );
      return null;
    }
    if (!EVIDENCE_LEVELS.has(evidenceLevel)) {
      errors.push(
        `${caseId}: actions_json[${i}] evidence_level "${evidenceLevel}" must be activity|advancement|outcome`,
      );
      return null;
    }
    const opt = (key: string): string | null =>
      typeof a[key] === "string" && (a[key] as string).trim() !== ""
        ? (a[key] as string)
        : null;
    out.push({
      actionType,
      direction,
      evidenceLevel,
      billTitle: opt("bill_title"),
      billStatus: opt("bill_status"),
      voteCast: opt("vote_cast"),
      voteDate: opt("vote_date"),
    });
  }
  return out;
}

/**
 * Parse + validate the calibration CSV. Invalid rows are reported and
 * EXCLUDED (never silently coerced) — a calibration set with a bad label in
 * it measures nothing.
 */
export function parseCalibrationCases(rows: string[][]): {
  cases: CalibrationCase[];
  errors: string[];
} {
  const cases: CalibrationCase[] = [];
  const errors: string[] = [];
  if (rows.length === 0) return { cases, errors: ["empty CSV"] };

  const header = rows[0];
  const idx = new Map<string, number>();
  for (const col of CALIBRATION_COLUMNS) {
    const i = header.indexOf(col);
    if (i < 0) {
      errors.push(`CSV lacks required column: ${col}`);
    } else {
      idx.set(col, i);
    }
  }
  if (errors.length > 0) return { cases, errors };
  const get = (row: string[], col: string): string =>
    (row[idx.get(col) as number] ?? "").trim();

  const seen = new Set<string>();
  for (const row of rows.slice(1)) {
    const caseId = get(row, "case_id");
    if (!caseId) continue; // blank line
    if (seen.has(caseId)) {
      errors.push(`${caseId}: duplicate case_id`);
      continue;
    }
    seen.add(caseId);
    const rowErrors: string[] = [];

    const sourceUrl = get(row, "source_url");
    if (!sourceUrl) {
      rowErrors.push(
        `${caseId}: source_url is required (labels are used with citation only)`,
      );
    }
    const expectedVerdict = get(row, "expected_verdict").toLowerCase();
    if (!VERDICTS.has(expectedVerdict)) {
      rowErrors.push(
        `${caseId}: expected_verdict "${expectedVerdict}" is not in the verdict enum`,
      );
    }
    const promiseType = get(row, "promise_type").toLowerCase();
    if (!PROMISE_TYPES.has(promiseType)) {
      rowErrors.push(
        `${caseId}: promise_type "${promiseType}" is not in the promise-type enum`,
      );
    }
    const promiseText = get(row, "promise_text");
    if (!promiseText) rowErrors.push(`${caseId}: promise_text is required`);
    const windowStart = get(row, "window_start");
    const windowEnd = get(row, "window_end");
    if (!ISO_DATE.test(windowStart) || !ISO_DATE.test(windowEnd)) {
      rowErrors.push(
        `${caseId}: window_start/window_end must be YYYY-MM-DD dates`,
      );
    } else if (windowStart >= windowEnd) {
      rowErrors.push(`${caseId}: window_start must precede window_end`);
    }
    const actions = parseActionsJson(
      get(row, "actions_json"),
      caseId,
      rowErrors,
    );

    if (rowErrors.length > 0 || actions === null) {
      errors.push(...rowErrors);
      continue;
    }
    cases.push({
      caseId,
      source: get(row, "source"),
      sourceUrl,
      sourceLabel: get(row, "source_label"),
      expectedVerdict,
      promiseText,
      promiseType,
      conditionsDeadline: get(row, "conditions_deadline") || null,
      canonicalIssue: get(row, "canonical_issue") || "(external case)",
      window: { start: windowStart, end: windowEnd },
      actions,
      notes: get(row, "notes") || null,
    });
  }
  return { cases, errors };
}

/**
 * Build the exact input shape the production adjudicator consumes. Action
 * ids are synthetic but REAL to the validator: parseAndValidateVerdict's
 * no-fabricated-evidence rail checks cited ids against these, same as prod.
 */
export function toPromiseWithActions(c: CalibrationCase): PromiseWithActions {
  const actions: LinkedAction[] = c.actions.map((a, i) => ({
    actionId: `act_${c.caseId}_${i + 1}`,
    actionType: a.actionType,
    direction: a.direction,
    evidenceLevel: a.evidenceLevel,
    billId: null,
    billTitle: a.billTitle,
    billStatus: a.billStatus,
    voteCast: a.voteCast,
    voteDate: a.voteDate,
  }));
  return {
    id: `cal_${c.caseId}`,
    candidateId: `cal_${c.caseId}`,
    canonicalIssue: c.canonicalIssue,
    promiseText: c.promiseText,
    promiseType: c.promiseType,
    conditionsDeadline: c.conditionsDeadline,
    actions,
  };
}

// ---------------------------------------------------------------------------
// Scoring (pure)
// ---------------------------------------------------------------------------

export function scoreCalibration(
  results: CaseResult[],
  meta: {
    nowIso: string;
    casesPath: string;
    cases: number;
    apiErrors: string[];
  },
): CalibrationReport {
  const pairs: PairedLabels[] = results.map((r) => ({
    promiseId: r.caseId,
    a: r.expected,
    b: r.model,
  }));
  const flagged = results
    .filter((r) => r.model === "not_yet_rated")
    .map((r) => r.caseId);
  const unflaggedPairs = pairs.filter((p) => p.b !== "not_yet_rated");
  const byExpected: CalibrationReport["byExpected"] = {};
  for (const r of results) {
    const bucket = (byExpected[r.expected] ??= { n: 0, agreed: 0, flagged: 0 });
    bucket.n += 1;
    if (r.model === r.expected) bucket.agreed += 1;
    if (r.model === "not_yet_rated") bucket.flagged += 1;
  }
  return {
    adjudicatorVersion: ADJUDICATOR_VERSION,
    nowIso: meta.nowIso,
    casesPath: meta.casesPath,
    cases: meta.cases,
    scored: results.length,
    apiErrors: meta.apiErrors,
    agreement: agreementRate(pairs),
    kappa: cohenKappa(pairs),
    polarityFlips: pairs
      .filter((p) => isPolarityFlip(p.a, p.b))
      .map((p) => p.promiseId),
    flagged,
    flagRate: results.length === 0 ? 0 : flagged.length / results.length,
    agreementExcludingFlags: agreementRate(unflaggedPairs),
    byExpected,
    disagreements: results.filter((r) => r.model !== r.expected),
    results,
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

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const casesPath = flagValue(argv, "--cases");
  const dryRun = argv.includes("--dry-run");
  const limit = Number(flagValue(argv, "--limit") ?? 10_000);
  const nowIso =
    flagValue(argv, "--now") ?? new Date().toISOString().slice(0, 10);
  if (!casesPath) {
    process.stderr.write(
      "[promise-calibration] --cases <csv> is required (see CALIBRATION_COLUMNS in this file; " +
        "real PolitiFact/Polimeter cases belong in scripts/ingest/_promise-calibration/, untracked).\n",
    );
    process.exit(1);
  }

  const { cases: allCases, errors } = parseCalibrationCases(
    parseCsv(readFileSync(casesPath, "utf8")),
  );
  for (const e of errors) {
    process.stderr.write(`[promise-calibration] invalid_case ${e}\n`);
  }
  const cases = allCases.slice(0, limit);
  if (cases.length === 0) {
    process.stderr.write(
      "[promise-calibration] no valid cases — nothing to score.\n",
    );
    process.exit(1);
  }
  process.stderr.write(
    `[promise-calibration] ${cases.length} cases (version=${ADJUDICATOR_VERSION} now=${nowIso}` +
      `${errors.length > 0 ? ` excluded=${errors.length}` : ""}${dryRun ? " DRY-RUN" : ""})\n`,
  );

  const systemPrompt = buildAdjudicationSystemPrompt();

  if (dryRun) {
    for (const c of cases) {
      const prompt = buildAdjudicationPrompt(
        toPromiseWithActions(c),
        nowIso,
        c.window,
      );
      process.stderr.write(
        `\n[promise-calibration] case=${c.caseId} expected=${c.expectedVerdict} ` +
          `source_label="${c.sourceLabel}" window=${c.window.start}..${c.window.end}\n${prompt}\n`,
      );
    }
    process.stderr.write(
      `\n[promise-calibration] dry-run complete: ${cases.length} prompts rendered, no API calls.\n`,
    );
    return;
  }

  const anthropicApiKey =
    process.env.ANTHROPIC_VOTER_API ?? process.env.ANTHROPIC_API_KEY ?? "";
  if (!anthropicApiKey) {
    process.stderr.write(
      "[promise-calibration] ANTHROPIC_VOTER_API is not set (use --dry-run to preview prompts).\n",
    );
    process.exit(1);
  }
  const anthropic = new Anthropic({ apiKey: anthropicApiKey });

  const results: CaseResult[] = [];
  const apiErrors: string[] = [];
  for (const c of cases) {
    const promise = toPromiseWithActions(c);
    let verdict: string;
    let rationale: string;
    if (windowNotYetOpen(nowIso, c.window)) {
      // Shouldn't happen for historical cases, but apply the same
      // deterministic path production would.
      const row = deterministicNotYetTestable(promise, nowIso, c.window);
      verdict = row.verdict;
      rationale = row.rationale;
    } else {
      try {
        const response = await anthropic.messages.create({
          model: CALIBRATION_MODEL,
          max_tokens: MAX_TOKENS,
          system: [
            {
              type: "text" as const,
              text: systemPrompt,
              cache_control: { type: "ephemeral" as const },
            },
          ],
          messages: [
            {
              role: "user",
              content: buildAdjudicationPrompt(promise, nowIso, c.window),
            },
          ],
        });
        const textBlock = response.content.find((b) => b.type === "text");
        const rawText = textBlock?.type === "text" ? textBlock.text.trim() : "";
        const row = parseAndValidateVerdict(rawText, promise);
        verdict = row.verdict;
        rationale = row.rationale;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(
          `[promise-calibration] api_error case=${c.caseId}: ${msg}\n`,
        );
        apiErrors.push(`${c.caseId}: ${msg}`);
        continue;
      }
    }
    results.push({
      caseId: c.caseId,
      source: c.source,
      sourceUrl: c.sourceUrl,
      sourceLabel: c.sourceLabel,
      expected: c.expectedVerdict,
      model: verdict,
      rationale,
    });
    process.stderr.write(
      `[promise-calibration] case=${c.caseId} expected=${c.expectedVerdict} model=${verdict}` +
        `${verdict !== c.expectedVerdict ? " ← DISAGREE" : ""}\n`,
    );
  }

  const report = scoreCalibration(results, {
    nowIso,
    casesPath,
    cases: cases.length,
    apiErrors,
  });

  const outPath =
    flagValue(argv, "--json") ??
    resolve(OUT_DIR, `report.${ADJUDICATOR_VERSION.replaceAll("+", "_")}.json`);
  mkdirSync(dirname(resolve(outPath)), { recursive: true });
  writeFileSync(resolve(outPath), JSON.stringify(report, null, 2));

  process.stderr.write(
    `\n[promise-calibration] ${ADJUDICATOR_VERSION} on n=${report.scored}: ` +
      `agreement=${(report.agreement * 100).toFixed(1)}% kappa=${report.kappa.toFixed(3)} ` +
      `polarity_flips=${report.polarityFlips.length} flag_rate=${(report.flagRate * 100).toFixed(1)}% ` +
      `agreement_excl_flags=${(report.agreementExcludingFlags * 100).toFixed(1)}%\n`,
  );
  for (const d of report.disagreements) {
    process.stderr.write(
      `[promise-calibration] disagree case=${d.caseId} expected=${d.expected} model=${d.model} (${d.sourceUrl})\n`,
    );
  }
  process.stderr.write(
    `[promise-calibration] report → ${outPath}\n` +
      "[promise-calibration] to iterate: revise the rubric/prompt, bump ADJUDICATOR_REVISION (adj-vN) " +
      "in promise-adjudicate.ts, and re-run — reports are stamped per revision so runs stay comparable. " +
      "The retrospective run waits until agreement/κ/polarity meet the §6.4 bar here.\n",
  );
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((err) => {
    process.stderr.write(
      `[promise-calibration] fatal: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
    );
    process.exit(1);
  });
}
