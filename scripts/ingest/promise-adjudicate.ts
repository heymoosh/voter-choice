/**
 * scripts/ingest/promise-adjudicate.ts
 *
 * Part 5 — ADJUDICATION pipeline (plan: extract → link → adjudicate; this is
 * stage 3, the last). For every row in `candidate_promises`, produces one
 * row in `promise_verdicts` under the current ADJUDICATOR_VERSION by
 * executing docs/PROMISE_ADJUDICATION_RUBRIC.md (1.0.0). The LLM is NOT the
 * judge — it is an evidence assembler applying that published rubric, and it
 * flags ambiguous cases for human review instead of forcing a verdict.
 *
 * TWO PATHS, ONE RULE ORDER (rubric §4 applies rules in order, first match):
 *
 * 1. DETERMINISTIC not_yet_testable — no LLM, no judgment. The default
 *    testable window for every 2026 promise is THE TERM BEING SOUGHT
 *    (rubric §1 gate 4), which opens 2027-01-03. Until the window opens, NO
 *    promise can be kept or broken — actions taken in the current term are
 *    outside the promised window — so every verdict is not_yet_testable by
 *    rule §4.1, computed in code. This is a real adjudication, recorded
 *    with the same rigor as any other (rubric: "the default state of most
 *    promises early in a term").
 *
 * 2. LLM adjudication — only once the window is open AND linked actions
 *    exist. The model receives the promise (with its PRE-DECLARED test:
 *    promise_type + conditions_deadline, written at extraction before any
 *    outcome was known), the linked official-record actions from
 *    `promise_actions` (each with direction and evidence_level), and the
 *    rubric's §4 rule order — and returns a verdict citing ONLY linked
 *    action ids as evidence. Validation rejects any response citing
 *    evidence ids that are not this promise's linked actions (no fabricated
 *    evidence, mechanically enforced), any unknown verdict, and any verdict
 *    above the evidence rung the promise type requires. Ambiguity (§5)
 *    returns not_yet_rated with the reason recorded.
 *
 * SHIP GATE (rubric §6.4): rows written here are INTERNAL until the gold
 * pass clears (κ ≥ 0.70 human pair, ≥ 90% adjudicator agreement, zero
 * kept↔broken polarity flips) and PROMISE_TRACKER_ENABLED is on. Writing
 * verdicts to the table does not surface them anywhere.
 *
 * VERSIONING: adjudicator_version = "rubric-1.0.0+adj-v1+<model>" — pins
 * the rubric version executed (rubric's versioning rule) plus this
 * script's prompt revision. Re-adjudication under a new version inserts new
 * rows (history preserved via the (promise_id, adjudicator_version)
 * unique); same version upserts in place.
 *
 * Usage (dev machine; DB required):
 *   npx tsx --env-file=.env.local scripts/ingest/promise-adjudicate.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/ingest/promise-adjudicate.ts
 *   Flags: --promise <id> (repeatable), --limit N, --dry-run, --json,
 *          --now YYYY-MM-DD (clock override for testing window logic),
 *          --cycle N (adjudicate against that cycle's promised term — the
 *          2022 retrospective runs --cycle 2022 for the closed 2023-2025
 *          window; default is the 2026 TERM_WINDOW).
 *
 * WHEN THE WINDOW IS OPEN for the run's --cycle (e.g. --cycle 2022, always;
 * --cycle 2026 only after 2027-01-03), running this file directly would call
 * the metered Anthropic API and is refused unless ALLOW_METERED_ANTHROPIC_API
 * is set (see the guard at the bottom of this file). Use the subscription
 * path instead, same three-step split as promise-extract.ts:
 *   1. npx tsx --env-file=.env.local scripts/ingest/_promise-adjudicate-export.ts \
 *        --cycle 2022 --out /tmp/adjudicate-batches
 *   2. In a Claude Code session: run _promise-adjudicate.workflow.js with
 *      args = { batchFiles: <manifest.batchFiles>, resultDir: "/tmp/adjudicate-results" }
 *   3. npx tsx --env-file=.env.local scripts/ingest/_promise-adjudicate-import.ts \
 *        --batches /tmp/adjudicate-batches --results /tmp/adjudicate-results
 * A run whose window is NOT open needs no LLM at all (every verdict is the
 * deterministic not_yet_testable path) — run this file directly for that case.
 */

import { pathToFileURL } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { sql } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { promiseVerdicts } from "../../db/schema";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The rubric version this adjudicator executes, verbatim from the doc. */
export const RUBRIC_VERSION = "rubric-1.1.0";

/** Bump adj-vN whenever the adjudication prompt or rule rendering changes. */
export const ADJUDICATOR_REVISION = "adj-v2";

/**
 * Kept/broken is the contested-judgment stage — the one the gold set grades
 * — so it gets the same model tier as extraction, not Haiku. Volume is tiny
 * (one call per promise WITH actions, none before the window opens).
 */
const ADJUDICATOR_MODEL = "claude-sonnet-5";

export const ADJUDICATOR_VERSION = `${RUBRIC_VERSION}+${ADJUDICATOR_REVISION}+${ADJUDICATOR_MODEL}`;

/** A promised term's testable window (rubric §1 gate 4), ISO date bounds. */
export interface TermWindow {
  start: string;
  end: string;
}

/**
 * The default testable window (rubric §1 gate 4) for the 2026 cycle: the
 * term being sought. House terms for the 120th Congress run 2027-01-03 →
 * 2029-01-03. A promise with an explicit earlier deadline still cannot be
 * KEPT by in-office action before the term starts, so the window floor
 * applies to every campaign_site promise from this cycle.
 *
 * Window-taking functions below default to this constant; callers with a
 * different promised term (the external-calibration harness, the planned
 * --cycle 2022 retrospective) pass their own window instead.
 */
export const TERM_WINDOW: TermWindow = {
  start: "2027-01-03",
  end: "2029-01-03",
};

/**
 * The testable window for the term sought in a given election cycle: it
 * opens the Jan 3 after the election and runs one House term (the rubric's
 * default window). termWindowForCycle(2026) === TERM_WINDOW; the 2022
 * retrospective uses termWindowForCycle(2022) → 2023-01-03 → 2025-01-03,
 * a window that has CLOSED, making every rubric §4 rule reachable.
 */
export function termWindowForCycle(cycle: number): TermWindow {
  return { start: `${cycle + 1}-01-03`, end: `${cycle + 3}-01-03` };
}

const MAX_TOKENS = 2048;

export const VERDICTS = new Set([
  "kept",
  "attempted_blocked",
  "compromise",
  "broken",
  "not_yet_testable",
  "not_yet_rated",
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PromiseWithActions {
  id: string;
  candidateId: string;
  canonicalIssue: string;
  promiseText: string;
  promiseType: string;
  conditionsDeadline: string | null;
  actions: LinkedAction[];
}

export interface LinkedAction {
  actionId: string;
  actionType: string;
  direction: string;
  evidenceLevel: string;
  billId: string | null;
  billTitle: string | null;
  billStatus: string | null;
  voteCast: string | null;
  voteDate: string | null;
}

export interface VerdictRow {
  promiseId: string;
  verdict: string;
  rationale: string;
  /** promise_actions ids cited — every verdict shows its evidence inline. */
  evidenceRefs: string[] | null;
  adjudicatorVersion: string;
}

// ---------------------------------------------------------------------------
// Path 1 — deterministic not_yet_testable (pure)
// ---------------------------------------------------------------------------

/**
 * Rubric §4 rule 1, computed in code: before the promised window opens, no
 * relevant in-window action can exist, so the verdict is not_yet_testable —
 * for every promise, regardless of linked actions (current-term actions are
 * evidence context, not in-window conduct).
 */
export function windowNotYetOpen(
  nowIso: string,
  window: TermWindow = TERM_WINDOW,
): boolean {
  return nowIso < window.start;
}

export function deterministicNotYetTestable(
  promise: Pick<PromiseWithActions, "id" | "conditionsDeadline" | "actions">,
  nowIso: string,
  window: TermWindow = TERM_WINDOW,
): VerdictRow {
  const deadlineNote = promise.conditionsDeadline
    ? ` Declared conditions/deadline: "${promise.conditionsDeadline}".`
    : "";
  const actionNote =
    promise.actions.length > 0
      ? ` ${promise.actions.length} linked official-record action(s) exist from the CURRENT term; they are outside the promised window and cannot yet keep or break the promise.`
      : "";
  return {
    promiseId: promise.id,
    verdict: "not_yet_testable",
    rationale:
      `Rubric §4.1 (${RUBRIC_VERSION}), applied deterministically: the promised window is the term being ` +
      `sought (${window.start} to ${window.end}) and has not opened as of ${nowIso}. ` +
      `No in-window vote, bill, or deadline can have occurred.${deadlineNote}${actionNote}`,
    evidenceRefs:
      promise.actions.length > 0
        ? promise.actions.map((a) => a.actionId)
        : null,
    adjudicatorVersion: ADJUDICATOR_VERSION,
  };
}

// ---------------------------------------------------------------------------
// Path 2 — LLM adjudication (prompt + validation, pure)
// ---------------------------------------------------------------------------

/**
 * Rubric §4's rule order plus the §2/§3 constraints the model must apply.
 * Deliberately restates the rubric rather than paraphrasing it loosely —
 * the rubric doc is the source of truth and this block quotes its logic.
 */
export function buildAdjudicationSystemPrompt(): string {
  return `You adjudicate whether a member of Congress kept a campaign promise, by executing a PUBLISHED RUBRIC (${RUBRIC_VERSION}). You are not the judge — you are an evidence assembler applying the rubric. You may cite ONLY the linked official-record actions provided; never outside knowledge.

THE UNIT OF EVALUATION is the action the member plausibly controlled:
- A promise to VOTE a certain way is kept by casting that vote — even if the bill passed/failed anyway. "No law materialized" is never by itself broken.
- A promise to INTRODUCE/COSPONSOR is kept by the introduction appearing in the record.
- A promise of an OUTCOME is the only type where enactment matters.
- Never credit an outcome they didn't drive; never blame an outcome they couldn't control.

EVIDENCE RUNGS (each action is labeled): activity < advancement < outcome. A verdict may only cite the rung the record supports: vote/introduce_bill promises are keepable at activity; outcome promises require outcome-level evidence.

APPLY THE FIRST MATCHING RULE, IN ORDER:
1. not_yet_testable — no relevant in-window action or deadline has occurred; or a declared condition has not triggered.
2. kept — the pre-declared controllable action occurred, in the promised direction, inside the window, at the required evidence rung. kept means the promise as stated was delivered; if what was delivered is materially narrower than what was promised, that is rule 4, not rule 2 — but do not downgrade a delivered outcome to compromise merely because it arrived through a different legislative vehicle than expected.
3. attempted_blocked — the member took the promised action but other institutions stopped the outcome (died in other chamber, vetoed, lost floor vote).
4. compromise — a materially partial version of the promised outcome was achieved with the member's promised participation. COMPOUND PROMISES (two or more independently testable commitments joined as one — "freeze pay AND hiring"): when at least one component was achieved and at least one clearly was not, that is compromise BY THIS RULE — a compound split is not rule-6 ambiguity.
5. broken — the window closed (or the dispositive vote occurred) and the member took the opposite action or NO controllable action when the opportunity existed. Absence of opportunity is never broken. Two clarifications:
   - INACTION WITH OPPORTUNITY: the member's own measure dying in a chamber their own side controlled, with NO external blocker in the record (no lost floor vote, no other-chamber rejection, no veto), is inaction — broken, not attempted_blocked, and not a flag. Mere introduction does not discharge an outcome promise when the chamber that could have advanced it was their own.
   - CONDUCT PROMISES (a standing practice the member's chamber controls — procedural/transparency pledges): judge conduct at the DISPOSITIVE moments. Adopting an enabling rule and then violating it when it mattered most is broken; the adoption does not offset the violation.
6. not_yet_rated — you cannot cleanly apply a rule above (partial scope overlap, contradictory evidence, judgment call needed). FLAG, DO NOT FORCE: you are never penalized for flagging, only for guessing. But rules 4 and 5 above name three patterns (compound splits, inaction with opportunity, conduct violations) that ARE cleanly decidable — do not flag those.

THE TEST IS PRE-DECLARED: the promise's type and conditions were written at extraction, before any outcome was known. Apply THAT test. If the declared test seems mis-typed, that is a flag (rule 6), not a re-interpretation.

Respond with ONLY a JSON object, no markdown:
{"verdict": "<one of: kept|attempted_blocked|compromise|broken|not_yet_testable|not_yet_rated>", "rationale": "<2-4 sentences citing the rule applied and the specific evidence>", "evidence_action_ids": ["<ids of the linked actions your verdict relies on>"], "ambiguous_reason": "<only when verdict is not_yet_rated: why>"}`;
}

export function renderActionForPrompt(a: LinkedAction): string {
  const parts = [
    `id=${a.actionId}`,
    `type=${a.actionType}`,
    `direction=${a.direction}`,
    `evidence_level=${a.evidenceLevel}`,
  ];
  if (a.voteCast) parts.push(`vote_cast=${a.voteCast}`);
  if (a.voteDate) parts.push(`vote_date=${a.voteDate}`);
  if (a.billTitle) parts.push(`bill="${a.billTitle}"`);
  if (a.billStatus) parts.push(`bill_status="${a.billStatus}"`);
  return `- ${parts.join(" ")}`;
}

export function buildAdjudicationPrompt(
  promise: PromiseWithActions,
  nowIso: string,
  window: TermWindow = TERM_WINDOW,
): string {
  const actions =
    promise.actions.length > 0
      ? promise.actions.map(renderActionForPrompt).join("\n")
      : "(none linked)";
  return `Promise (verbatim): ${promise.promiseText}
Canonical issue: ${promise.canonicalIssue}
PRE-DECLARED test: promise_type=${promise.promiseType}; conditions_deadline=${promise.conditionsDeadline ?? "(default window: the term of office)"}
Window: ${window.start} to ${window.end}; today is ${nowIso}.

Linked official-record actions:
${actions}`;
}

/**
 * Parse and validate the model's verdict. Hard rules, mechanically enforced:
 * unknown verdict → not_yet_rated; cited evidence ids must be a subset of
 * the promise's linked action ids (no fabricated evidence — anything else
 * is downgraded to not_yet_rated with the violation recorded); empty
 * rationale → not_yet_rated.
 */
export function parseAndValidateVerdict(
  rawJson: string,
  promise: PromiseWithActions,
): VerdictRow {
  const flag = (reason: string): VerdictRow => ({
    promiseId: promise.id,
    verdict: "not_yet_rated",
    rationale: `Flagged for human review (${RUBRIC_VERSION} §5): ${reason}`,
    evidenceRefs: null,
    adjudicatorVersion: ADJUDICATOR_VERSION,
  });

  const fenceMatch = rawJson.match(/```(?:json)?\s*([\s\S]*?)```/u);
  const cleaned = fenceMatch ? fenceMatch[1].trim() : rawJson.trim();
  let parsed: Record<string, unknown>;
  try {
    const p = JSON.parse(cleaned) as unknown;
    if (p === null || typeof p !== "object" || Array.isArray(p)) {
      return flag("adjudicator response was not a JSON object");
    }
    parsed = p as Record<string, unknown>;
  } catch {
    return flag("adjudicator response was not valid JSON");
  }

  const verdict = parsed.verdict;
  if (typeof verdict !== "string" || !VERDICTS.has(verdict)) {
    return flag(`unknown verdict "${String(verdict)}"`);
  }

  const rationale =
    typeof parsed.rationale === "string" ? parsed.rationale.trim() : "";
  if (rationale.length < 20) {
    return flag("verdict arrived without a substantive rationale");
  }

  const validIds = new Set(promise.actions.map((a) => a.actionId));
  const rawRefs = Array.isArray(parsed.evidence_action_ids)
    ? parsed.evidence_action_ids
    : [];
  const refs: string[] = [];
  for (const r of rawRefs) {
    if (typeof r !== "string") continue;
    if (!validIds.has(r)) {
      return flag(
        `verdict cited evidence id "${r}" that is not a linked action of this promise`,
      );
    }
    refs.push(r);
  }

  // A kept/attempted_blocked/compromise/broken verdict with zero cited
  // evidence is a rubric violation ("every verdict shows its evidence
  // inline") — except broken-by-inaction, which is still flagged in v1
  // because distinguishing it from missing-evidence requires the human eye.
  if (
    refs.length === 0 &&
    verdict !== "not_yet_testable" &&
    verdict !== "not_yet_rated"
  ) {
    return flag(`verdict "${verdict}" cited no linked evidence`);
  }

  const ambiguousReason =
    typeof parsed.ambiguous_reason === "string" &&
    parsed.ambiguous_reason.trim().length > 0
      ? ` Reason: ${parsed.ambiguous_reason.trim()}`
      : "";

  return {
    promiseId: promise.id,
    verdict,
    rationale:
      verdict === "not_yet_rated"
        ? `${rationale}${ambiguousReason}`
        : rationale,
    evidenceRefs: refs.length > 0 ? refs : null,
    adjudicatorVersion: ADJUDICATOR_VERSION,
  };
}

async function adjudicateWithModel(
  anthropic: Anthropic,
  systemPrompt: string,
  promise: PromiseWithActions,
  nowIso: string,
  window: TermWindow,
): Promise<VerdictRow> {
  const response = await anthropic.messages.create({
    model: ADJUDICATOR_MODEL,
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
        content: buildAdjudicationPrompt(promise, nowIso, window),
      },
    ],
  });
  const textBlock = response.content.find((b) => b.type === "text");
  const rawText = textBlock?.type === "text" ? textBlock.text.trim() : "";
  return parseAndValidateVerdict(rawText, promise);
}

// ---------------------------------------------------------------------------
// DB
// ---------------------------------------------------------------------------

/**
 * cycle, when given, scopes the bulk (no --promise ids) fetch to promises
 * MADE within that cycle's window (made_at, same convention
 * fetchAlreadyExtracted in promise-extract.ts uses: Jan 1 of the odd year
 * through Dec 31 of the cycle year). Without this, a --cycle 2022
 * (retrospective) adjudication run would also sweep in every current-cycle
 * (2026) promise already in the table and judge it against the CLOSED
 * 2023-2025 window — a real, silent mis-adjudication, not just extra work
 * (2026-08-19 finding). Explicit --promise ids bypass the window: a caller
 * naming exact ids is trusted to mean it. NULL made_at rows are excluded
 * from a cycle-scoped fetch (mirrors fetchAlreadyExtracted's false-negative-
 * over-false-positive posture).
 */
export async function fetchPromisesWithActions(
  db: DbClient,
  promiseIds: string[],
  limit: number,
  cycle?: number,
): Promise<PromiseWithActions[]> {
  const promiseRows =
    promiseIds.length > 0
      ? await db.execute(sql`
          SELECT id, candidate_id, canonical_issue, promise_text,
                 promise_type, conditions_deadline
          FROM candidate_promises
          WHERE id IN ${promiseIds}
        `)
      : cycle !== undefined
        ? await db.execute(sql`
          SELECT id, candidate_id, canonical_issue, promise_text,
                 promise_type, conditions_deadline
          FROM candidate_promises
          WHERE made_at IS NOT NULL
            AND made_at >= ${`${cycle - 1}-01-01`}::date
            AND made_at <= ${`${cycle}-12-31`}::date
          ORDER BY candidate_id, id
          LIMIT ${limit}
        `)
        : await db.execute(sql`
          SELECT id, candidate_id, canonical_issue, promise_text,
                 promise_type, conditions_deadline
          FROM candidate_promises
          ORDER BY candidate_id, id
          LIMIT ${limit}
        `);

  const promises = (promiseRows.rows as Record<string, unknown>[]).map(
    (r): PromiseWithActions => ({
      id: String(r.id),
      candidateId: String(r.candidate_id),
      canonicalIssue: String(r.canonical_issue),
      promiseText: String(r.promise_text),
      promiseType: String(r.promise_type),
      conditionsDeadline:
        r.conditions_deadline === null ? null : String(r.conditions_deadline),
      actions: [],
    }),
  );
  if (promises.length === 0) return [];

  const ids = promises.map((p) => p.id);
  const actionRows = await db.execute(sql`
    SELECT pa.id AS action_id, pa.promise_id, pa.action_type, pa.direction,
           pa.evidence_level, pa.bill_id, b.title AS bill_title,
           b.bill_status, v.vote_cast, v.vote_date
    FROM promise_actions pa
    LEFT JOIN votes v ON v.id = pa.vote_id
    LEFT JOIN bills b ON b.id = COALESCE(pa.bill_id, v.bill_id)
    WHERE pa.promise_id IN ${ids}
  `);
  const byPromise = new Map<string, LinkedAction[]>();
  for (const r of actionRows.rows as Record<string, unknown>[]) {
    const list = byPromise.get(String(r.promise_id)) ?? [];
    list.push({
      actionId: String(r.action_id),
      actionType: String(r.action_type),
      direction: String(r.direction),
      evidenceLevel: String(r.evidence_level),
      billId: r.bill_id === null ? null : String(r.bill_id),
      billTitle: r.bill_title === null ? null : String(r.bill_title),
      billStatus: r.bill_status === null ? null : String(r.bill_status),
      voteCast: r.vote_cast === null ? null : String(r.vote_cast),
      voteDate: r.vote_date === null ? null : String(r.vote_date),
    });
    byPromise.set(String(r.promise_id), list);
  }
  for (const p of promises) p.actions = byPromise.get(p.id) ?? [];
  return promises;
}

export async function upsertVerdict(
  db: DbClient,
  row: VerdictRow,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) {
    process.stderr.write(
      `[promise-adjudicate] dry_run would_upsert promise=${row.promiseId} ` +
        `verdict=${row.verdict} evidence=${row.evidenceRefs?.length ?? 0} ` +
        `rationale="${row.rationale.slice(0, 120)}"\n`,
    );
    return;
  }
  await db
    .insert(promiseVerdicts)
    .values({
      promiseId: row.promiseId,
      verdict: row.verdict,
      rationale: row.rationale,
      evidenceRefs: row.evidenceRefs,
      adjudicatorVersion: row.adjudicatorVersion,
    })
    .onConflictDoUpdate({
      target: [promiseVerdicts.promiseId, promiseVerdicts.adjudicatorVersion],
      set: {
        verdict: sql`excluded.verdict`,
        rationale: sql`excluded.rationale`,
        evidenceRefs: sql`excluded.evidence_refs`,
        adjudicatedAt: sql`now()`,
      },
    });
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export function flagValue(argv: string[], flag: string): string | null {
  const idx = argv.indexOf(flag);
  if (idx < 0 || idx + 1 >= argv.length) return null;
  return argv[idx + 1];
}

export function flagValues(argv: string[], flag: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length - 1; i++) {
    if (argv[i] === flag) out.push(argv[i + 1]);
  }
  return out;
}

/**
 * The run's clock + promised-term window, derived from --now/--cycle. Single
 * source of truth shared by main() and the direct-run guard below it, so the
 * guard's "would this call the metered API" decision can never drift from
 * what main() actually computes for the same argv.
 */
export function resolveRunWindow(argv: string[]): {
  nowIso: string;
  window: TermWindow;
  cycle: number | undefined;
} {
  const nowIso =
    flagValue(argv, "--now") ?? new Date().toISOString().slice(0, 10);
  // --cycle N adjudicates against that cycle's promised term (the 2022
  // retrospective: --cycle 2022 → window 2023-01-03..2025-01-03, closed).
  const cycleArg = flagValue(argv, "--cycle");
  let cycle: number | undefined;
  if (cycleArg !== null) {
    const parsed = Number(cycleArg);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      process.stderr.write(
        `[promise-adjudicate] invalid --cycle value "${cycleArg}" — must be a positive integer year.\n`,
      );
      process.exit(1);
    }
    cycle = parsed;
  }
  if (
    flagValues(argv, "--promise").length > 0 &&
    argv.indexOf("--promise") >= 0 &&
    cycleArg === null
  ) {
    process.stderr.write(
      "[promise-adjudicate] warning: --promise given without --cycle — the window defaults to " +
        "the 2026 TERM_WINDOW, which is wrong for a promise from any other cycle. Pass --cycle " +
        "explicitly when retrying a specific non-2026 promise.\n",
    );
  }
  const window = cycle !== undefined ? termWindowForCycle(cycle) : TERM_WINDOW;
  return { nowIso, window, cycle };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const asJson = argv.includes("--json");
  const limit = Number(flagValue(argv, "--limit") ?? 10_000);
  const promiseIds = flagValues(argv, "--promise");
  const { nowIso, window, cycle } = resolveRunWindow(argv);

  const db = requireDb();
  const promises = await fetchPromisesWithActions(db, promiseIds, limit, cycle);
  process.stderr.write(
    `[promise-adjudicate] ${promises.length} promises (version=${ADJUDICATOR_VERSION} ` +
      `now=${nowIso} window=${window.start}..${window.end}${dryRun ? " DRY-RUN" : ""})\n`,
  );

  const preWindow = windowNotYetOpen(nowIso, window);
  let anthropic: Anthropic | null = null;
  let systemPrompt = "";
  if (!preWindow) {
    const anthropicApiKey =
      process.env.ANTHROPIC_VOTER_API ?? process.env.ANTHROPIC_API_KEY ?? "";
    if (!anthropicApiKey) {
      process.stderr.write(
        "[promise-adjudicate] window is open but ANTHROPIC_VOTER_API is not set.\n",
      );
      process.exit(1);
    }
    anthropic = new Anthropic({ apiKey: anthropicApiKey });
    systemPrompt = buildAdjudicationSystemPrompt();
  }

  const counts = new Map<string, number>();
  const report: VerdictRow[] = [];
  for (const promise of promises) {
    let row: VerdictRow;
    if (preWindow) {
      row = deterministicNotYetTestable(promise, nowIso, window);
    } else {
      try {
        row = await adjudicateWithModel(
          anthropic as Anthropic,
          systemPrompt,
          promise,
          nowIso,
          window,
        );
      } catch (err) {
        process.stderr.write(
          `[promise-adjudicate] api_error promise=${promise.id}: ${err instanceof Error ? err.message : String(err)}\n`,
        );
        continue;
      }
    }
    try {
      await upsertVerdict(db, row, dryRun);
      counts.set(row.verdict, (counts.get(row.verdict) ?? 0) + 1);
      report.push(row);
    } catch (err) {
      process.stderr.write(
        `[promise-adjudicate] db_error promise=${promise.id}: ${err instanceof Error ? err.message : String(err)}\n`,
      );
    }
  }

  process.stderr.write(
    `\n[promise-adjudicate] done${dryRun ? " (dry-run)" : ""}. ` +
      `${[...counts.entries()].map(([v, n]) => `${v}=${n}`).join(" ") || "nothing adjudicated"}\n` +
      (preWindow
        ? `[promise-adjudicate] window ${window.start} not yet open — all verdicts deterministic §4.1.\n`
        : ""),
  );
  if (asJson) console.log(JSON.stringify(report, null, 2));
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

// This script calls the metered Anthropic API directly when the
// adjudication window is open for the run's --cycle. As of 2026-08-19 the
// subscription-workflow replacement is scripts/ingest/
// _promise-adjudicate-export.ts -> _promise-adjudicate.workflow.js ->
// _promise-adjudicate-import.ts (same split as promise-extract.ts; see its
// header for why bulk LLM work here should not use the metered key) — use
// that path for any run whose window is actually open (e.g. --cycle 2022).
// A run whose window is NOT open (e.g. today's default --cycle 2026) never
// instantiates the Anthropic client at all (see preWindow above), so it is
// allowed to run directly without the override. Manual dev-only script (not
// wired into any GitHub Actions workflow); the override remains an
// explicit-sign-off escape hatch for small ad-hoc runs only.
const METERED_OVERRIDE_ENV = "ALLOW_METERED_ANTHROPIC_API";

if (isDirectRun) {
  const argv = process.argv.slice(2);
  const { nowIso, window, cycle } = resolveRunWindow(argv);
  const wouldCallMeteredApi = !windowNotYetOpen(nowIso, window);

  if (wouldCallMeteredApi && !process.env[METERED_OVERRIDE_ENV]) {
    process.stderr.write(
      "[promise-adjudicate] refusing to run: this run's window is open, so it would call the " +
        "metered Anthropic API directly. Use scripts/ingest/_promise-adjudicate-export.ts -> " +
        "_promise-adjudicate.workflow.js -> _promise-adjudicate-import.ts (subscription path) " +
        `instead, or get explicit sign-off and set ${METERED_OVERRIDE_ENV}=1.\n`,
    );
    process.exit(1);
  }
  // A bulk (no --promise ids), non-dry-run, cycle-UNSCOPED write is the one
  // remaining footgun once the metered-API guard above is narrowed: it
  // would fetch and re-verdict EVERY cycle's promises under one global
  // window, silently overwriting already-correct verdicts from a different
  // cycle's run (2026-08-19 finding — could have clobbered the 2022
  // retrospective's real verdicts with 2026-window not_yet_testable rows).
  // Require either --dry-run (inspect first) or an explicit --cycle for any
  // real bulk write.
  const isBulkWrite =
    flagValues(argv, "--promise").length === 0 && !argv.includes("--dry-run");
  if (isBulkWrite && cycle === undefined) {
    process.stderr.write(
      "[promise-adjudicate] refusing to run: a bulk write (no --promise ids, no --dry-run) needs " +
        "an explicit --cycle N — an unscoped run would re-verdict every cycle's promises under " +
        "one window and can silently overwrite another cycle's already-correct verdicts. Pass " +
        "--cycle N, or --dry-run to inspect without writing.\n",
    );
    process.exit(1);
  }
  main().catch((err) => {
    process.stderr.write(
      `[promise-adjudicate] fatal: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
    );
    process.exit(1);
  });
}
