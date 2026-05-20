/**
 * GET /api/donors
 *
 * Deterministic donor-coalition lookup: resolves a candidate from the DB
 * and returns aggregated bucket dollar totals plus percent share for a
 * given (candidate, election cycle) pair.
 *
 * This endpoint is hit by the Anthropic lookup_donor_coalition tool callback
 * (via the chat route importing lookupDonorCoalition directly — no extra
 * network hop). It is also callable independently for testing.
 *
 * Rate-limited by IP (same pattern as /api/alignment).
 * Results cached for one hour via Vercel cache headers.
 */

import { NextRequest } from "next/server";
import { checkCounterRateLimit } from "../../../lib/server/counters-rate-limit";
import { lookupDonorCoalition } from "../../../lib/server/donors";

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

/** Election cycle is a 4-digit year — guard against injection. */
const ELECTION_CYCLE_RE = /^\d{4}$/;

function isValidElectionCycle(s: string): boolean {
  return ELECTION_CYCLE_RE.test(s);
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

interface DonorParams {
  candidateName: string;
  stateCode: string;
  jurisdiction: string;
  electionCycle?: string;
}

function parseAndValidateParams(
  searchParams: URLSearchParams,
): DonorParams | Response {
  const candidateName = (searchParams.get("candidate_name") ?? "").trim();
  const stateCode = (searchParams.get("state_code") ?? "")
    .trim()
    .toUpperCase();
  const jurisdiction = (searchParams.get("jurisdiction") ?? "").trim();
  const electionCycleRaw = searchParams.get("election_cycle");
  const electionCycle =
    electionCycleRaw === null ? undefined : electionCycleRaw.trim();

  if (!candidateName || candidateName.length > 200) {
    return Response.json({ error: "Invalid candidate_name" }, { status: 400 });
  }
  if (!stateCode || stateCode.length > 4) {
    return Response.json({ error: "Invalid state_code" }, { status: 400 });
  }
  if (!jurisdiction || !isValidJurisdiction(jurisdiction)) {
    return Response.json({ error: "Invalid jurisdiction" }, { status: 400 });
  }
  if (electionCycle !== undefined && !isValidElectionCycle(electionCycle)) {
    return Response.json(
      { error: "Invalid election_cycle — must be a 4-digit year" },
      { status: 400 },
    );
  }

  return {
    candidateName,
    stateCode,
    jurisdiction,
    electionCycle,
  };
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  // Rate-limit (same IP-based pattern as /api/alignment)
  const ip = getClientIP(request);
  const rateLimitOk = await checkCounterRateLimit(ip);
  if (!rateLimitOk) {
    return Response.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const paramsOrError = parseAndValidateParams(searchParams);
  if (paramsOrError instanceof Response) return paramsOrError;

  const { candidateName, stateCode, jurisdiction, electionCycle } =
    paramsOrError;

  // Defensive cross-check: for state jurisdictions, stateCode must match
  // the state embedded in the jurisdiction string (e.g. state_code=TX must
  // pair with jurisdiction=state-TX-house/senate). Catches client-side bugs
  // early before a DB round-trip.
  if (STATE_JURISDICTION_RE.test(jurisdiction)) {
    const jurisdictionState = jurisdiction.split("-")[1]?.toUpperCase();
    if (jurisdictionState !== stateCode) {
      return Response.json(
        {
          error: `state_code ${stateCode} does not match jurisdiction ${jurisdiction}`,
        },
        { status: 400 },
      );
    }
  }

  // Look up donor coalition (candidate resolution happens inside).
  const result = await lookupDonorCoalition(
    candidateName,
    stateCode,
    jurisdiction,
    electionCycle,
  );

  // Negative results get a shorter cache so new ingests propagate faster.
  const cacheControl = result.found
    ? "public, s-maxage=3600, stale-while-revalidate=300"
    : "public, s-maxage=900, stale-while-revalidate=60";

  return Response.json(result, {
    status: 200,
    headers: { "Cache-Control": cacheControl },
  });
}
