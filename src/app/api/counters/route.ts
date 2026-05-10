/**
 * POST /api/counters
 *
 * Increments anonymous aggregate counters at session-end.
 * No individual record is ever written — counters only.
 *
 * Rate-limited by IP to prevent counter spam. Uses the same durable
 * rate-limit infrastructure as the chat route.
 */

import { NextRequest, NextResponse } from "next/server";
import { incrementSessionCounters } from "../../../lib/server/counters";
import { checkCounterRateLimit } from "../../../lib/server/counters-rate-limit";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const VALID_PRIMARIES = new Set(["DEM", "REP", "OPEN", "GENERAL"]);

interface CounterBody {
  sessionId: string;
  stateCode: string;
  county?: string | null;
  primary: "DEM" | "REP" | "OPEN" | "GENERAL";
  confirmedConcerns?: Array<{ canonicalIssue: string }>;
  picks?: Array<{ race: string; candidateId: string }>;
}

function validateBody(body: unknown): CounterBody | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  if (typeof b.sessionId !== "string" || b.sessionId.length === 0) return null;
  if (b.sessionId.length > 128) return null; // Guard oversized session ids

  if (typeof b.stateCode !== "string" || b.stateCode.length === 0) return null;
  if (b.stateCode.length > 4) return null; // e.g. "TX", "CA"

  if (typeof b.primary !== "string" || !VALID_PRIMARIES.has(b.primary))
    return null;

  // county: optional string or null
  const county =
    b.county === null || b.county === undefined
      ? null
      : typeof b.county === "string"
        ? b.county.slice(0, 64)
        : null;

  // confirmedConcerns: optional array of {canonicalIssue: string}
  let confirmedConcerns: Array<{ canonicalIssue: string }> = [];
  if (Array.isArray(b.confirmedConcerns)) {
    confirmedConcerns = b.confirmedConcerns
      .filter(
        (c): c is { canonicalIssue: string } =>
          typeof c === "object" &&
          c !== null &&
          typeof (c as Record<string, unknown>).canonicalIssue === "string",
      )
      .slice(0, 50) // Guard oversized arrays
      .map((c) => ({ canonicalIssue: c.canonicalIssue.slice(0, 64) }));
  }

  // picks: optional array of {race, candidateId}
  let picks: Array<{ race: string; candidateId: string }> = [];
  if (Array.isArray(b.picks)) {
    picks = b.picks
      .filter(
        (p): p is { race: string; candidateId: string } =>
          typeof p === "object" &&
          p !== null &&
          typeof (p as Record<string, unknown>).race === "string" &&
          typeof (p as Record<string, unknown>).candidateId === "string",
      )
      .slice(0, 50)
      .map((p) => ({
        race: p.race.slice(0, 64),
        candidateId: p.candidateId.slice(0, 64),
      }));
  }

  return {
    sessionId: b.sessionId,
    stateCode: b.stateCode.toUpperCase().slice(0, 4),
    county,
    primary: b.primary as "DEM" | "REP" | "OPEN" | "GENERAL",
    confirmedConcerns,
    picks,
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIP(request);

  const rateLimitOk = await checkCounterRateLimit(ip);
  if (!rateLimitOk) {
    return NextResponse.json(
      { ok: false, error: "Rate limit exceeded." },
      { status: 429 },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON." },
      { status: 400 },
    );
  }

  const body = validateBody(rawBody);
  if (!body) {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  const result = await incrementSessionCounters({
    sessionId: body.sessionId,
    stateCode: body.stateCode,
    county: body.county ?? null,
    primary: body.primary,
    confirmedConcerns: body.confirmedConcerns ?? [],
    picks: body.picks ?? [],
  });
  return NextResponse.json(result, { status: 200 });
}
