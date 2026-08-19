/**
 * scripts/ingest/promise-link.ts
 *
 * Part 5 — promise→action LINKING pipeline (plan: extract → link →
 * adjudicate; this is stage 2). For every row in `candidate_promises`, finds
 * the candidate's actions in the official record — roll-call votes,
 * sponsorships, cosponsorships — on bills carrying the promise's
 * `canonical_issue` tag, and upserts them into `promise_actions`
 * (migration 0021). Only incumbents have official-record rows, so most
 * challenger promises legitimately link to zero actions — that is data
 * ("not_yet_testable" territory for the adjudicator), not a failure.
 *
 * HOW DIRECTION IS RESOLVED (the one non-mechanical input):
 * `promise_actions.direction` is "toward" | "against" — whether the action
 * moves toward keeping the promise. The issue-tag join gives each action a
 * side on the issue's pole axis deterministically (`stance_lens` says what
 * YEA means; a NAY flips it; putting your name on a bill takes the bill's
 * side). But the PROMISE's own side of the axis lives in its text, so this
 * script classifies it once per promise with Claude against the SAME pole
 * vocabulary the bill tagger uses (`renderTaggerPoleBlock` — the two
 * consumers cannot drift). direction = promise side == action side ?
 * "toward" : "against". Promises the model cannot confidently side
 * ("unclear") get NO linked actions and are logged — the rubric's
 * ambiguity-escalation rule (§5) applied at the linking layer: guessing is
 * the sin, flagging is free.
 *
 * PROVENANCE: link_method records the full method + versions
 * (`issue_tag_join+promise-pole-v1+<model>`), so every row says how it was
 * made. Re-linking under a changed prompt bumps LINKER_VERSION.
 *
 * EVIDENCE LEVEL — deliberately conservative: every row this linker writes
 * is labeled "activity", the LOWEST rung of the rubric §3 ladder, including
 * actions on bills that later became law. Upgrading to "advancement"
 * (committee action) or "outcome" (provision in enacted law / promised vote
 * on final passage) requires bill-status evidence this join does not
 * establish per-action, and the rubric's cardinal rule is never to cite a
 * higher rung than the record supports. Under-labeling can only make
 * verdicts more cautious; a future enrichment pass can upgrade rows it can
 * prove.
 *
 * IDEMPOTENT: rows carry no random content, and the table's
 * NULLS NOT DISTINCT unique on (promise_id, action_type, vote_id, bill_id,
 * cosponsor_id) makes re-runs conflict-and-skip. Kill and restart freely.
 *
 * Usage (dev machine; DB required):
 *   npx tsx --env-file=.env.local scripts/ingest/promise-link.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/ingest/promise-link.ts
 *   Flags: --promise <id> (repeatable), --limit N, --dry-run,
 *          --json (emit link rows + pole classifications to stdout).
 *
 * Running this file directly calls the metered Anthropic API for the pole
 * classification and is refused unless ALLOW_METERED_ANTHROPIC_API is set
 * (see the guard at the bottom of this file). For bulk runs, use the
 * subscription path instead, same three-step split as promise-extract.ts:
 *   1. npx tsx --env-file=.env.local scripts/ingest/_promise-link-export.ts \
 *        --out /tmp/link-batches
 *   2. In a Claude Code session: run _promise-link.workflow.js with
 *      args = { batchFiles: <manifest.batchFiles>, resultDir: "/tmp/link-results" }
 *   3. npx tsx --env-file=.env.local scripts/ingest/_promise-link-import.ts \
 *        --batches /tmp/link-batches --results /tmp/link-results
 */

import { pathToFileURL } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { sql } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { promiseActions } from "../../db/schema";
import {
  renderTaggerPoleBlock,
  type Pole,
} from "../../src/lib/alignment/poleVocabulary";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Bump when the pole-classification prompt or linking rules change. */
export const LINKER_VERSION = "promise-pole-v1";

/**
 * Bounded single-label classification against a fixed vocabulary — the same
 * task shape as tag-bills.ts, so the same model tier (see that header's
 * cost reasoning). The high-stakes judgment (verdicts) happens elsewhere.
 */
const LINKER_MODEL = "claude-haiku-4-5-20251001";

/** Recorded on every row: full method provenance. */
export const LINK_METHOD = `issue_tag_join+${LINKER_VERSION}+${LINKER_MODEL}`;

/** Pole classification is a tiny JSON object. */
const MAX_TOKENS = 256;

/** All rows this linker writes sit on the lowest evidence rung. */
const EVIDENCE_LEVEL = "activity";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PromiseRow {
  id: string;
  candidateId: string;
  canonicalIssue: string;
  promiseText: string;
  promiseType: string;
  conditionsDeadline: string | null;
}

export interface VoteMatch {
  voteId: string;
  billId: string;
  voteCast: string;
  stanceLens: string;
}

export interface CosponsorMatch {
  cosponsorId: string;
  billId: string;
  role: string; // "sponsor" | "cosponsor"
  stanceLens: string;
}

export type PromiseSide = Pole | "unclear";

export interface LinkRow {
  promiseId: string;
  actionType: "vote" | "sponsorship" | "cosponsorship";
  voteId: string | null;
  billId: string | null;
  cosponsorId: string | null;
  direction: "toward" | "against";
  evidenceLevel: string;
  linkMethod: string;
}

// ---------------------------------------------------------------------------
// Pure: action side + direction
// ---------------------------------------------------------------------------

/**
 * The side of the issue's pole axis a cast vote takes: YEA takes the bill's
 * `stance_lens` side, NAY takes the opposite. Non-directional casts
 * (present/absent/not_voting) return null — an absence is not evidence of
 * direction and is left for the adjudicator to weigh as absence.
 */
export function voteActionSide(
  voteCast: string,
  stanceLens: string,
): Pole | null {
  const lens: Pole | null =
    stanceLens === "in_favor" || stanceLens === "opposed"
      ? (stanceLens as Pole)
      : null;
  if (!lens) return null;
  if (voteCast === "yea") return lens;
  if (voteCast === "nay") return lens === "in_favor" ? "opposed" : "in_favor";
  return null;
}

/**
 * Sponsoring or cosponsoring takes the bill's side: putting your name on a
 * bill is acting for what YEA on it means.
 */
export function sponsorActionSide(stanceLens: string): Pole | null {
  return stanceLens === "in_favor" || stanceLens === "opposed"
    ? (stanceLens as Pole)
    : null;
}

export function directionFor(
  promiseSide: Pole,
  actionSide: Pole,
): "toward" | "against" {
  return promiseSide === actionSide ? "toward" : "against";
}

/**
 * Assemble the promise_actions rows for one promise given its classified
 * side and its candidate's issue-matched record. Exactly one ref column per
 * row (the schema contract): vote → vote_id; sponsorship/cosponsorship →
 * cosponsor_id + bill_id (bill_id also set for convenience, per the schema
 * comment). Non-directional votes are skipped.
 */
export function buildLinkRows(
  promise: Pick<PromiseRow, "id">,
  promiseSide: Pole,
  voteMatches: VoteMatch[],
  cosponsorMatches: CosponsorMatch[],
): LinkRow[] {
  const rows: LinkRow[] = [];
  for (const v of voteMatches) {
    const side = voteActionSide(v.voteCast, v.stanceLens);
    if (!side) continue;
    rows.push({
      promiseId: promise.id,
      actionType: "vote",
      voteId: v.voteId,
      billId: null,
      cosponsorId: null,
      direction: directionFor(promiseSide, side),
      evidenceLevel: EVIDENCE_LEVEL,
      linkMethod: LINK_METHOD,
    });
  }
  for (const c of cosponsorMatches) {
    const side = sponsorActionSide(c.stanceLens);
    if (!side) continue;
    rows.push({
      promiseId: promise.id,
      actionType: c.role === "sponsor" ? "sponsorship" : "cosponsorship",
      voteId: null,
      billId: c.billId,
      cosponsorId: c.cosponsorId,
      direction: directionFor(promiseSide, side),
      evidenceLevel: EVIDENCE_LEVEL,
      linkMethod: LINK_METHOD,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Pole classification (one Claude call per promise)
// ---------------------------------------------------------------------------

/**
 * System prompt: the tagger's pole vocabulary verbatim (shared renderer —
 * the tagger, the live resolver, and this linker cannot drift), plus the
 * classification contract. Cached across the run.
 */
export function buildPoleSystemPrompt(): string {
  return `You classify which SIDE of a policy issue's pole axis a campaign promise takes, using the pole definitions below — the same definitions used to tag bills, so promise sides and bill sides are directly comparable.

${renderTaggerPoleBlock()}

You will receive one promise: its verbatim text and its canonical issue. Answer which pole the promise's author is committing to advance.

Respond with ONLY a JSON object, no markdown, exactly:
  {"side": "in_favor"} or {"side": "opposed"} or {"side": "unclear"}

Rules:
1. Judge ONLY from the promise text against the pole definitions for its issue. Do not use outside knowledge about the candidate.
2. "unclear" is the correct answer whenever the text does not commit to a side of THIS issue's axis — a promise can be genuine yet directionally unclear (e.g. "I will hold hearings on drug pricing"). Never guess: an unclear promise is flagged for human review, a wrongly-sided one corrupts verdicts.`;
}

export function buildPolePrompt(
  promise: Pick<PromiseRow, "canonicalIssue" | "promiseText">,
): string {
  return `Canonical issue: ${promise.canonicalIssue}
Promise text: ${promise.promiseText}`;
}

/** Parse {"side": ...}; anything malformed or unknown is "unclear". */
export function parsePoleResponse(rawJson: string): PromiseSide {
  const fenceMatch = rawJson.match(/```(?:json)?\s*([\s\S]*?)```/u);
  const cleaned = fenceMatch ? fenceMatch[1].trim() : rawJson.trim();
  try {
    const parsed = JSON.parse(cleaned) as { side?: unknown };
    if (parsed.side === "in_favor" || parsed.side === "opposed") {
      return parsed.side;
    }
  } catch {
    // fall through — malformed means we do not know the side
  }
  return "unclear";
}

async function classifyPromiseSide(
  anthropic: Anthropic,
  systemPrompt: string,
  promise: PromiseRow,
): Promise<PromiseSide> {
  const response = await anthropic.messages.create({
    model: LINKER_MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: "text" as const,
        text: systemPrompt,
        cache_control: { type: "ephemeral" as const },
      },
    ],
    messages: [{ role: "user", content: buildPolePrompt(promise) }],
  });
  const textBlock = response.content.find((b) => b.type === "text");
  return parsePoleResponse(
    textBlock?.type === "text" ? textBlock.text.trim() : "",
  );
}

// ---------------------------------------------------------------------------
// DB reads
// ---------------------------------------------------------------------------

export async function fetchPromises(
  db: DbClient,
  promiseIds: string[],
  limit: number,
): Promise<PromiseRow[]> {
  // IN ${array}, not ANY(${array}): drizzle's sql template expands a JS
  // array to a parenthesized tuple, which only parses after IN.
  const rows =
    promiseIds.length > 0
      ? await db.execute(sql`
          SELECT id, candidate_id, canonical_issue, promise_text,
                 promise_type, conditions_deadline
          FROM candidate_promises
          WHERE id IN ${promiseIds}
        `)
      : await db.execute(sql`
          SELECT id, candidate_id, canonical_issue, promise_text,
                 promise_type, conditions_deadline
          FROM candidate_promises
          ORDER BY candidate_id, id
          LIMIT ${limit}
        `);
  return (rows.rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    candidateId: String(r.candidate_id),
    canonicalIssue: String(r.canonical_issue),
    promiseText: String(r.promise_text),
    promiseType: String(r.promise_type),
    conditionsDeadline:
      r.conditions_deadline === null ? null : String(r.conditions_deadline),
  }));
}

export async function fetchVoteMatches(
  db: DbClient,
  candidateId: string,
  canonicalIssue: string,
): Promise<VoteMatch[]> {
  const rows = await db.execute(sql`
    SELECT v.id AS vote_id, v.bill_id, v.vote_cast, it.stance_lens
    FROM votes v
    JOIN issue_tags it ON it.bill_id = v.bill_id
    WHERE v.candidate_id = ${candidateId}
      AND it.canonical_issue = ${canonicalIssue}
  `);
  return (rows.rows as Record<string, unknown>[]).map((r) => ({
    voteId: String(r.vote_id),
    billId: String(r.bill_id),
    voteCast: String(r.vote_cast),
    stanceLens: String(r.stance_lens),
  }));
}

export async function fetchCosponsorMatches(
  db: DbClient,
  candidateId: string,
  canonicalIssue: string,
): Promise<CosponsorMatch[]> {
  const rows = await db.execute(sql`
    SELECT bc.id AS cosponsor_id, bc.bill_id, bc.role, it.stance_lens
    FROM bill_cosponsors bc
    JOIN issue_tags it ON it.bill_id = bc.bill_id
    WHERE bc.candidate_id = ${candidateId}
      AND it.canonical_issue = ${canonicalIssue}
  `);
  return (rows.rows as Record<string, unknown>[]).map((r) => ({
    cosponsorId: String(r.cosponsor_id),
    billId: String(r.bill_id),
    role: String(r.role),
    stanceLens: String(r.stance_lens),
  }));
}

export async function upsertLinkRows(
  db: DbClient,
  rows: LinkRow[],
  dryRun: boolean,
): Promise<number> {
  if (rows.length === 0) return 0;
  if (dryRun) {
    for (const r of rows) {
      process.stderr.write(
        `[promise-link] dry_run would_upsert promise=${r.promiseId} ` +
          `type=${r.actionType} direction=${r.direction} ` +
          `ref=${r.voteId ?? r.cosponsorId ?? r.billId}\n`,
      );
    }
    return rows.length;
  }
  await db
    .insert(promiseActions)
    .values(
      rows.map((r) => ({
        promiseId: r.promiseId,
        actionType: r.actionType,
        voteId: r.voteId,
        billId: r.billId,
        cosponsorId: r.cosponsorId,
        direction: r.direction,
        evidenceLevel: r.evidenceLevel,
        linkMethod: r.linkMethod,
      })),
    )
    // The NULLS NOT DISTINCT unique makes identical re-runs no-ops.
    .onConflictDoNothing();
  return rows.length;
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

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const asJson = argv.includes("--json");
  const limit = Number(flagValue(argv, "--limit") ?? 10_000);
  const promiseIds = flagValues(argv, "--promise");

  const anthropicApiKey =
    process.env.ANTHROPIC_VOTER_API ?? process.env.ANTHROPIC_API_KEY ?? "";
  if (!anthropicApiKey) {
    process.stderr.write(
      "[promise-link] ANTHROPIC_VOTER_API is not set. Cannot call Claude.\n",
    );
    process.exit(1);
  }

  const db = requireDb();
  const promises = await fetchPromises(db, promiseIds, limit);
  process.stderr.write(
    `[promise-link] ${promises.length} promises to link ` +
      `(method=${LINK_METHOD}${dryRun ? " DRY-RUN" : ""})\n`,
  );

  const anthropic = new Anthropic({ apiKey: anthropicApiKey });
  const systemPrompt = buildPoleSystemPrompt();

  let linked = 0;
  let unclearCount = 0;
  let zeroActionCount = 0;
  let apiErrors = 0;
  const report: {
    promiseId: string;
    side: PromiseSide;
    actions: number;
  }[] = [];

  for (const promise of promises) {
    let side: PromiseSide;
    try {
      side = await classifyPromiseSide(anthropic, systemPrompt, promise);
    } catch (err) {
      apiErrors++;
      process.stderr.write(
        `[promise-link] api_error promise=${promise.id}: ${err instanceof Error ? err.message : String(err)}\n`,
      );
      continue;
    }

    if (side === "unclear") {
      unclearCount++;
      report.push({ promiseId: promise.id, side, actions: 0 });
      process.stderr.write(
        `[promise-link] unclear_side promise=${promise.id} issue=${promise.canonicalIssue} ` +
          `text="${promise.promiseText.slice(0, 80)}" — no actions linked, needs human review\n`,
      );
      continue;
    }

    const [voteMatches, cosponsorMatches] = await Promise.all([
      fetchVoteMatches(db, promise.candidateId, promise.canonicalIssue),
      fetchCosponsorMatches(db, promise.candidateId, promise.canonicalIssue),
    ]);
    const rows = buildLinkRows(promise, side, voteMatches, cosponsorMatches);
    if (rows.length === 0) zeroActionCount++;
    try {
      linked += await upsertLinkRows(db, rows, dryRun);
    } catch (err) {
      process.stderr.write(
        `[promise-link] db_error promise=${promise.id}: ${err instanceof Error ? err.message : String(err)}\n`,
      );
    }
    report.push({ promiseId: promise.id, side, actions: rows.length });
  }

  process.stderr.write(
    `\n[promise-link] done. promises=${promises.length} rows_upserted=${linked}` +
      `${dryRun ? " (dry-run)" : ""} unclear_side=${unclearCount} ` +
      `zero_actions=${zeroActionCount} api_errors=${apiErrors}\n` +
      `[promise-link] zero_actions is EXPECTED for challengers (no official record yet).\n`,
  );

  if (asJson) console.log(JSON.stringify(report, null, 2));
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

// Calls the metered Anthropic API directly — stage 2 of the extract -> link
// -> adjudicate pipeline; see promise-extract.ts's header for why bulk LLM
// work here should not use the metered key. As of 2026-08-19 the
// subscription-workflow replacement is scripts/ingest/_promise-link-export.ts
// -> _promise-link.workflow.js -> _promise-link-import.ts. Manual dev-only
// script (not wired into any GitHub Actions workflow), but gated anyway per
// standing policy — get sign-off before overriding.
const METERED_OVERRIDE_ENV = "ALLOW_METERED_ANTHROPIC_API";

if (isDirectRun && !process.env[METERED_OVERRIDE_ENV]) {
  process.stderr.write(
    "[promise-link] refusing to run: this can call the metered Anthropic API directly.\n" +
      "Use scripts/ingest/_promise-link-export.ts -> _promise-link.workflow.js -> " +
      "_promise-link-import.ts (subscription path) instead, or get explicit sign-off " +
      `and set ${METERED_OVERRIDE_ENV}=1.\n`,
  );
  process.exit(1);
} else if (isDirectRun) {
  main().catch((err) => {
    process.stderr.write(
      `[promise-link] fatal: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
    );
    process.exit(1);
  });
}
