/**
 * src/lib/server/candidate-data.ts
 *
 * Read/write layer for the `candidate_data` table — web-research-derived
 * positions for no-record candidates (challengers, county commissioners,
 * executive/judicial offices not in our voting-record DB).
 *
 * Key contract:
 *  - `buildCandidateKey(name, jurisdiction, cycle)` — ONE canonical key
 *    builder used on BOTH read and write sides. Same normalization everywhere.
 *  - `lookupCandidateData(key, issues)` — reads stored rows → builds
 *    web_search AlignmentScore[]. Returns [] when no rows or DB not configured.
 *  - `researchAndPersistCandidate(name, jurisdiction, cycle, issues, client)` —
 *    drives the structured research sub-agent, filters citation-less issues,
 *    upserts, returns AlignmentScore[].
 *
 * Server-only. Never import from a client component.
 */

import { eq, and, inArray, sql } from "drizzle-orm";
import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import * as schema from "../../../db/schema";
import { getIssueLabel } from "../canonicalIssues";
import type { AlignmentScore, WebSearchEvidence } from "../structured-blocks";
import {
  runStructuredCandidateResearch,
  type StructuredIssueResult,
} from "./research-sub-agent";
import type Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Key normalization
// ---------------------------------------------------------------------------

/** Build the stable lookup key for a candidate. Exported so race-data.ts and
 *  the API route use the SAME normalization. */
export function buildCandidateKey(
  name: string,
  jurisdiction: string,
  cycle: string,
): string {
  return [name, jurisdiction, cycle]
    .map((s) => s.trim().toLowerCase())
    .join("|");
}

// ---------------------------------------------------------------------------
// URL validation (mirrors structured-blocks.ts sanitizeWebSearchEvidence)
// ---------------------------------------------------------------------------

const URL_RE = /^https?:\/\//;

function hasRealUrl(evidence: { url?: unknown }): boolean {
  return typeof evidence.url === "string" && URL_RE.test(evidence.url);
}

// ---------------------------------------------------------------------------
// DB row → AlignmentScore
// ---------------------------------------------------------------------------

function rowToAlignmentScore(row: {
  canonicalIssue: string;
  resolvedStance: string;
  confidence: string;
  evidence: unknown;
}): AlignmentScore | null {
  // Validate evidence items from DB: keep only those with real URLs.
  const rawEvidence = Array.isArray(row.evidence) ? row.evidence : [];
  const evidence: WebSearchEvidence[] = rawEvidence
    .filter(
      (e): e is { summary: string; url: string } =>
        e !== null &&
        typeof e === "object" &&
        typeof (e as Record<string, unknown>).summary === "string" &&
        hasRealUrl(e as { url?: unknown }),
    )
    .slice(0, 5);

  // Drop citation-less rows at read time too (honesty bar).
  if (evidence.length === 0) return null;

  const confidence =
    row.confidence === "high" ||
    row.confidence === "medium" ||
    row.confidence === "low"
      ? row.confidence
      : "low";

  return {
    canonicalIssue: row.canonicalIssue,
    issueLabel: getIssueLabel(row.canonicalIssue),
    resolvedStance: row.resolvedStance,
    sourceType: "web_search",
    confidence,
    evidence,
  };
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Fetch stored web_search scores for a candidate × issue list.
 *
 * Returns [] when:
 *   - DB is not configured (test / dev without DATABASE_URL)
 *   - No rows exist for this key
 *   - All rows have citation-less evidence (honesty guard)
 */
export async function lookupCandidateData(
  candidateKey: string,
  issues: string[],
): Promise<AlignmentScore[]> {
  const db = getDb();
  if (db === DB_NOT_CONFIGURED) return [];
  if (issues.length === 0) return [];

  const rows = await db
    .select({
      canonicalIssue: schema.candidateData.canonicalIssue,
      resolvedStance: schema.candidateData.resolvedStance,
      confidence: schema.candidateData.confidence,
      evidence: schema.candidateData.evidence,
    })
    .from(schema.candidateData)
    .where(
      and(
        eq(schema.candidateData.candidateKey, candidateKey),
        inArray(schema.candidateData.canonicalIssue, issues),
      ),
    );

  const scores: AlignmentScore[] = [];
  for (const row of rows) {
    const score = rowToAlignmentScore(row);
    if (score) scores.push(score);
  }
  return scores;
}

// ---------------------------------------------------------------------------
// Write (research + persist)
// ---------------------------------------------------------------------------

const RESEARCH_MODEL_VERSION = "claude-haiku-4-5-20251001";

/**
 * Run the structured web research sub-agent for one candidate, persist the
 * results (upsert by candidateKey + canonicalIssue), and return the resulting
 * AlignmentScore[].
 *
 * Issues whose evidence contains no real URLs are DROPPED (not persisted).
 * The DB guard at read time double-enforces this, but filtering here keeps
 * the DB clean.
 *
 * Returns [] when DB is not configured.
 */
export async function researchAndPersistCandidate(
  name: string,
  jurisdiction: string,
  cycle: string,
  issues: Array<{ canonicalIssue: string; issueLabel?: string }>,
  client: Anthropic,
): Promise<AlignmentScore[]> {
  const db = getDb();
  if (db === DB_NOT_CONFIGURED) return [];
  if (issues.length === 0) return [];

  const candidateKey = buildCandidateKey(name, jurisdiction, cycle);

  const researchInput = {
    candidateName: name,
    jurisdiction,
    cycle,
    issues: issues.map((i) => ({
      canonicalIssue: i.canonicalIssue,
      issueLabel: i.issueLabel ?? getIssueLabel(i.canonicalIssue),
    })),
  };

  const { issues: rawIssues } = await runStructuredCandidateResearch(
    researchInput,
    client,
  );

  // Filter: keep only issues that have at least one real-URL evidence item.
  const valid: StructuredIssueResult[] = rawIssues.filter((item) => {
    const realEvidence = (item.evidence ?? []).filter(hasRealUrl);
    return realEvidence.length > 0;
  });

  if (valid.length === 0) return [];

  // Upsert each valid issue row.
  const rows = valid.map((item) => ({
    candidateKey,
    canonicalIssue: item.canonicalIssue,
    resolvedStance: item.resolvedStance,
    confidence: item.confidence,
    evidence: (item.evidence ?? [])
      .filter(hasRealUrl)
      .slice(
        0,
        3,
      ) as unknown as (typeof schema.candidateData.$inferInsert)["evidence"],
    modelVersion: RESEARCH_MODEL_VERSION,
    researchedAt: new Date(),
  }));

  await db
    .insert(schema.candidateData)
    .values(rows)
    .onConflictDoUpdate({
      target: [
        schema.candidateData.candidateKey,
        schema.candidateData.canonicalIssue,
      ],
      set: {
        resolvedStance: sql`excluded.resolved_stance`,
        confidence: sql`excluded.confidence`,
        evidence: sql`excluded.evidence`,
        modelVersion: sql`excluded.model_version`,
        researchedAt: sql`excluded.researched_at`,
      },
    });

  // Build AlignmentScore[] from what we just persisted.
  const scores: AlignmentScore[] = [];
  for (const item of valid) {
    const evidence: WebSearchEvidence[] = (item.evidence ?? [])
      .filter(hasRealUrl)
      .slice(0, 3)
      .map((e) => ({ summary: e.summary, url: e.url }));

    const confidence =
      item.confidence === "high" ||
      item.confidence === "medium" ||
      item.confidence === "low"
        ? item.confidence
        : "low";

    scores.push({
      canonicalIssue: item.canonicalIssue,
      issueLabel: getIssueLabel(item.canonicalIssue),
      resolvedStance: item.resolvedStance,
      sourceType: "web_search",
      confidence,
      evidence,
    });
  }

  return scores;
}
