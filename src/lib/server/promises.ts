/**
 * src/lib/server/promises.ts
 *
 * Read layer for Part 5 — the promise ledger. What a candidate declared they
 * would do (the test, written up front), and — once adjudicated — whether
 * they did it. Rows are written by the promise-extraction pipeline into
 * `candidate_promises` + `promise_actions` + `promise_verdicts` (migration
 * 0021); see db/schema.ts and
 * docs/DONOR_FRAMING_AND_ACCOUNTABILITY_PLAN.md Part 5.
 *
 * PRESENCE-GATING. The corpus is pilot-scale (~50 promises nationally as of
 * 2026-08) — most candidates have none extracted yet. A candidate with zero
 * rows is simply absent from `lookupCandidateTopIssues`'s result map / an
 * empty array from `lookupCandidatePromises` — the same "we looked and
 * there's nothing on file" contract as pac-sponsors.ts / can-context.ts.
 * Callers must not infer "no priorities" from an absence, only "nothing
 * extracted for this candidate yet."
 *
 * `promiseText` is returned VERBATIM — never paraphrased at this layer (the
 * extractor's anti-bias rule: paraphrase, if it ever happens, is
 * presentation-layer only). Verdict vocabulary ("kept" | "attempted_blocked"
 * | "compromise" | "broken" | "not_yet_testable" | "not_yet_rated") is
 * passed through unchanged — no re-mapping here either.
 *
 * Server-only. Never import it from client components.
 */

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import * as schema from "../../../db/schema";

// ---------------------------------------------------------------------------
// Types (client-safe shapes)
// ---------------------------------------------------------------------------

export interface CandidateTopIssue {
  canonicalIssue: string;
  promiseCount: number;
}

/** Most issues shown per candidate on the top-issues surface. */
export const MAX_TOP_ISSUES = 3;

export interface PromiseVerdictSummary {
  verdict: string;
  rationale: string;
  adjudicatedAt: string;
}

export interface PromiseActionSummary {
  actionType: string;
  evidenceLevel: string;
  direction: string;
  /** Exactly one of voteId/billId/cosponsorId is set, per action_type. */
  voteId: string | null;
  billId: string | null;
  cosponsorId: string | null;
}

export interface CandidatePromiseEntry {
  id: string;
  canonicalIssue: string;
  subIssue: string | null;
  /** Verbatim as extracted — never paraphrased. */
  promiseText: string;
  promiseType: string;
  conditionsDeadline: string | null;
  venue: string;
  madeAt: string | null;
  sourceUrl: string;
  archiveUrl: string | null;
  /** Latest adjudication (by adjudicatedAt) if one exists, else null. */
  verdict: PromiseVerdictSummary | null;
  actions: PromiseActionSummary[];
}

// ---------------------------------------------------------------------------
// Top issues
// ---------------------------------------------------------------------------

/**
 * Top canonical issues by promise count, for a set of candidate ids, keyed
 * by candidate id. Candidates with no promises on file are simply absent
 * from the map. DB-not-configured and query failure both degrade to an
 * empty map, like `lookupPacSponsors`.
 */
export async function lookupCandidateTopIssues(
  candidateIds: string[],
): Promise<Map<string, CandidateTopIssue[]>> {
  const result = new Map<string, CandidateTopIssue[]>();
  if (candidateIds.length === 0) return result;

  const db = getDb();
  if (db === DB_NOT_CONFIGURED) return result;

  let rows;
  try {
    rows = await db
      .select({
        candidateId: schema.candidatePromises.candidateId,
        canonicalIssue: schema.candidatePromises.canonicalIssue,
        promiseCount: sql<number>`count(*)`.mapWith(Number),
      })
      .from(schema.candidatePromises)
      .where(inArray(schema.candidatePromises.candidateId, candidateIds))
      .groupBy(
        schema.candidatePromises.candidateId,
        schema.candidatePromises.canonicalIssue,
      );
  } catch (err) {
    console.error(
      "[promises] top-issues lookup failed (degrading to empty):",
      err,
    );
    return result;
  }

  const byCandidate = new Map<string, CandidateTopIssue[]>();
  for (const row of rows) {
    const list = byCandidate.get(row.candidateId) ?? [];
    list.push({
      canonicalIssue: row.canonicalIssue,
      promiseCount: row.promiseCount,
    });
    byCandidate.set(row.candidateId, list);
  }

  for (const [candidateId, list] of byCandidate) {
    // Highest count first; ties broken alphabetically for determinism — the
    // GROUP BY above gives no ordering guarantee across tied counts.
    list.sort(
      (a, b) =>
        b.promiseCount - a.promiseCount ||
        a.canonicalIssue.localeCompare(b.canonicalIssue),
    );
    result.set(candidateId, list.slice(0, MAX_TOP_ISSUES));
  }

  return result;
}

// ---------------------------------------------------------------------------
// Promise detail
// ---------------------------------------------------------------------------

/**
 * Promise rows for one candidate, optionally narrowed to one canonical
 * issue, each carrying its latest verdict (if adjudicated) and linked
 * official-record actions. Empty array for a candidate with no promises on
 * file, an unknown candidate id, or when the DB isn't configured — honest
 * "nothing here," never an error.
 */
export async function lookupCandidatePromises(
  candidateId: string,
  canonicalIssue?: string,
): Promise<CandidatePromiseEntry[]> {
  const db = getDb();
  if (db === DB_NOT_CONFIGURED) return [];

  let promiseRows;
  try {
    promiseRows = await db
      .select()
      .from(schema.candidatePromises)
      .where(
        canonicalIssue
          ? and(
              eq(schema.candidatePromises.candidateId, candidateId),
              eq(schema.candidatePromises.canonicalIssue, canonicalIssue),
            )
          : eq(schema.candidatePromises.candidateId, candidateId),
      );
  } catch (err) {
    console.error(
      "[promises] promise lookup failed (degrading to empty):",
      err,
    );
    return [];
  }
  if (promiseRows.length === 0) return [];

  const promiseIds = promiseRows.map((p) => p.id);

  // Verdicts + actions are optional enrichment: a missing table or a query
  // failure must never hide the promises themselves.
  let verdictRows: {
    promiseId: string;
    verdict: string;
    rationale: string;
    adjudicatedAt: Date;
  }[] = [];
  let actionRows: {
    promiseId: string;
    actionType: string;
    evidenceLevel: string;
    direction: string;
    voteId: string | null;
    billId: string | null;
    cosponsorId: string | null;
  }[] = [];
  try {
    [verdictRows, actionRows] = await Promise.all([
      db
        .select({
          promiseId: schema.promiseVerdicts.promiseId,
          verdict: schema.promiseVerdicts.verdict,
          rationale: schema.promiseVerdicts.rationale,
          adjudicatedAt: schema.promiseVerdicts.adjudicatedAt,
        })
        .from(schema.promiseVerdicts)
        .where(inArray(schema.promiseVerdicts.promiseId, promiseIds))
        .orderBy(desc(schema.promiseVerdicts.adjudicatedAt)),
      db
        .select({
          promiseId: schema.promiseActions.promiseId,
          actionType: schema.promiseActions.actionType,
          evidenceLevel: schema.promiseActions.evidenceLevel,
          direction: schema.promiseActions.direction,
          voteId: schema.promiseActions.voteId,
          billId: schema.promiseActions.billId,
          cosponsorId: schema.promiseActions.cosponsorId,
        })
        .from(schema.promiseActions)
        .where(inArray(schema.promiseActions.promiseId, promiseIds)),
    ]);
  } catch (err) {
    console.error(
      "[promises] verdict/action lookup failed (degrading to promises-only):",
      err,
    );
  }

  // Latest verdict per promise — rows are ordered newest-first, so the first
  // hit per promiseId wins.
  const latestVerdictByPromise = new Map<string, PromiseVerdictSummary>();
  for (const v of verdictRows) {
    if (latestVerdictByPromise.has(v.promiseId)) continue;
    latestVerdictByPromise.set(v.promiseId, {
      verdict: v.verdict,
      rationale: v.rationale,
      adjudicatedAt: v.adjudicatedAt.toISOString(),
    });
  }

  const actionsByPromise = new Map<string, PromiseActionSummary[]>();
  for (const a of actionRows) {
    const list = actionsByPromise.get(a.promiseId) ?? [];
    list.push({
      actionType: a.actionType,
      evidenceLevel: a.evidenceLevel,
      direction: a.direction,
      voteId: a.voteId,
      billId: a.billId,
      cosponsorId: a.cosponsorId,
    });
    actionsByPromise.set(a.promiseId, list);
  }

  return promiseRows.map((p) => ({
    id: p.id,
    canonicalIssue: p.canonicalIssue,
    subIssue: p.subIssue,
    promiseText: p.promiseText,
    promiseType: p.promiseType,
    conditionsDeadline: p.conditionsDeadline,
    venue: p.venue,
    madeAt: p.madeAt,
    sourceUrl: p.sourceUrl,
    archiveUrl: p.archiveUrl,
    verdict: latestVerdictByPromise.get(p.id) ?? null,
    actions: actionsByPromise.get(p.id) ?? [],
  }));
}
