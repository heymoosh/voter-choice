/**
 * GET /api/promises
 *
 * Promise-ledger read path (Part 5): a candidate's declared promises,
 * optionally narrowed to one canonical issue, each with its latest verdict
 * (if adjudicated) and linked official-record actions. Backs the
 * "how they plan to tackle it" click-through off a challenger's top-3
 * issues (see /api/delegation's `topIssues` on challenger objects).
 *
 * Deterministic, LLM-free — a direct read off `candidate_promises` +
 * `promise_verdicts` + `promise_actions` via lookupCandidatePromises.
 *
 * Rate-limited by IP (same pattern as /api/donors).
 */

import { NextRequest } from "next/server";
import { checkCounterRateLimit } from "../../../lib/server/counters-rate-limit";
import { getClientIP } from "../../../lib/server/client-ip";
import { lookupCandidatePromises } from "../../../lib/server/promises";
import { isCanonicalIssueId } from "../../../lib/canonicalIssues";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Same shape race-data.ts accepts for an already-resolved DB id. */
const CANDIDATE_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

interface PromiseParams {
  candidateId: string;
  canonicalIssue?: string;
}

function parseAndValidateParams(
  searchParams: URLSearchParams,
): PromiseParams | Response {
  const candidateId = (searchParams.get("candidateId") ?? "").trim();
  if (!CANDIDATE_ID_RE.test(candidateId)) {
    return Response.json({ error: "Invalid candidateId" }, { status: 400 });
  }

  const issueRaw = (searchParams.get("issue") ?? "").trim();
  if (issueRaw && !isCanonicalIssueId(issueRaw)) {
    return Response.json({ error: "Invalid issue" }, { status: 400 });
  }

  return {
    candidateId,
    canonicalIssue: issueRaw || undefined,
  };
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const rateLimitOk = await checkCounterRateLimit(ip);
  if (!rateLimitOk) {
    return Response.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const paramsOrError = parseAndValidateParams(searchParams);
  if (paramsOrError instanceof Response) return paramsOrError;

  const { candidateId, canonicalIssue } = paramsOrError;

  // Unknown/no-promises candidate degrades to an honest empty list — never
  // a 404 (matches lookupCandidatePromises's own "nothing here" contract).
  const promises = await lookupCandidatePromises(candidateId, canonicalIssue);

  // Negative results get a shorter cache so new extractions propagate faster
  // (same reasoning as /api/donors — the pilot corpus is actively growing).
  const cacheControl =
    promises.length > 0
      ? "public, s-maxage=3600, stale-while-revalidate=300"
      : "public, s-maxage=900, stale-while-revalidate=60";

  return Response.json(
    { status: "ok", promises },
    { status: 200, headers: { "Cache-Control": cacheControl } },
  );
}
