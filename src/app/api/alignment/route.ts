/**
 * GET /api/alignment
 *
 * Deterministic alignment lookup: resolves a candidate from the DB and
 * returns kept/total vote counts plus contributing votes for a given
 * (canonicalIssue, resolvedStance) pair.
 *
 * This endpoint is hit by the Anthropic lookup_alignment tool callback
 * (via the chat route importing lookupAlignment directly — no extra
 * network hop). It is also callable independently for testing.
 *
 * Rate-limited by IP (same pattern as /api/counters).
 * Results cached for one hour via Vercel cache headers.
 */

import { NextRequest } from "next/server";
import { checkCounterRateLimit } from "../../../lib/server/counters-rate-limit";
import {
  resolveCandidateId,
  lookupAlignment,
} from "../../../lib/server/alignment";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const VALID_JURISDICTIONS = new Set([
  "federal-house",
  "federal-senate",
  // state-XX-house and state-XX-senate patterns are checked via regex below
]);

const STATE_JURISDICTION_RE = /^state-[A-Z]{2}-(house|senate)$/;

function isValidJurisdiction(j: string): boolean {
  return VALID_JURISDICTIONS.has(j) || STATE_JURISDICTION_RE.test(j);
}

const VALID_RESOLVED_STANCES = new Set(["in_favor", "opposed"]);

function isValidResolvedStance(s: string): s is "in_favor" | "opposed" {
  return VALID_RESOLVED_STANCES.has(s);
}

// Canonical issue ids are lowercase_underscore strings — guard against
// injection while keeping the check loose enough not to miss new issues.
const CANONICAL_ISSUE_RE = /^[a-z][a-z0-9_]{0,63}$/;

function isValidCanonicalIssue(s: string): boolean {
  return CANONICAL_ISSUE_RE.test(s);
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ---------------------------------------------------------------------------
// Parsed params type
// ---------------------------------------------------------------------------

interface AlignmentParams {
  candidateName: string;
  stateCode: string;
  jurisdiction: string;
  canonicalIssue: string;
  resolvedStance: "in_favor" | "opposed";
}

function parseAndValidateParams(
  searchParams: URLSearchParams,
): AlignmentParams | Response {
  const candidateName = (searchParams.get("candidateName") ?? "").trim();
  const stateCode = (searchParams.get("stateCode") ?? "").trim().toUpperCase();
  const jurisdiction = (searchParams.get("jurisdiction") ?? "").trim();
  const canonicalIssue = (searchParams.get("canonicalIssue") ?? "").trim();
  const resolvedStance = (searchParams.get("resolvedStance") ?? "").trim();

  if (!candidateName || candidateName.length > 200) {
    return Response.json({ error: "Invalid candidateName" }, { status: 400 });
  }
  if (!stateCode || stateCode.length > 4) {
    return Response.json({ error: "Invalid stateCode" }, { status: 400 });
  }
  if (!jurisdiction || !isValidJurisdiction(jurisdiction)) {
    return Response.json({ error: "Invalid jurisdiction" }, { status: 400 });
  }
  if (!canonicalIssue || !isValidCanonicalIssue(canonicalIssue)) {
    return Response.json({ error: "Invalid canonicalIssue" }, { status: 400 });
  }
  if (!resolvedStance || !isValidResolvedStance(resolvedStance)) {
    return Response.json(
      { error: "Invalid resolvedStance — must be 'in_favor' or 'opposed'" },
      { status: 400 },
    );
  }

  return {
    candidateName,
    stateCode,
    jurisdiction,
    canonicalIssue,
    resolvedStance,
  };
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  // Rate-limit (same IP-based pattern as /api/counters)
  const ip = getClientIP(request);
  const rateLimitOk = await checkCounterRateLimit(ip);
  if (!rateLimitOk) {
    return Response.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const paramsOrError = parseAndValidateParams(searchParams);
  if (paramsOrError instanceof Response) return paramsOrError;

  const {
    candidateName,
    stateCode,
    jurisdiction,
    canonicalIssue,
    resolvedStance,
  } = paramsOrError;

  // Defensive cross-check: for state jurisdictions, stateCode must match
  // the state embedded in the jurisdiction string (e.g. stateCode=TX must
  // pair with jurisdiction=state-TX-house/senate). Catches client-side bugs
  // early before a DB round-trip.
  if (STATE_JURISDICTION_RE.test(jurisdiction)) {
    const jurisdictionState = jurisdiction.split("-")[1]?.toUpperCase();
    if (jurisdictionState !== stateCode) {
      return Response.json(
        {
          error: `stateCode ${stateCode} does not match jurisdiction ${jurisdiction}`,
        },
        { status: 400 },
      );
    }
  }

  // Resolve candidate
  const candidateId = await resolveCandidateId(candidateName, jurisdiction);
  if (!candidateId) {
    return Response.json(
      {
        found: false,
        unavailable: {
          reason:
            "Candidate not found in our voting record database — this may be a first-time candidate or local race we don't cover yet",
        },
      },
      {
        status: 200,
        headers: {
          // Cache negative results for 15 minutes — they may change as we ingest more data
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=60",
        },
      },
    );
  }

  // Look up alignment
  const result = await lookupAlignment(
    candidateId,
    canonicalIssue,
    resolvedStance,
  );

  return Response.json(result, {
    status: 200,
    headers: {
      // Cache positive results aggressively — same (candidateId, issue, stance)
      // always returns the same answer until next ingest.
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300",
    },
  });
}
