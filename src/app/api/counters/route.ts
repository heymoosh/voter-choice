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
import {
  incrementSessionCounters,
  recordConcernEvents,
  type ConcernEvent,
} from "../../../lib/server/counters";
import { checkCounterRateLimit } from "../../../lib/server/counters-rate-limit";
import { getClientIP } from "../../../lib/server/client-ip";
import { isCanonicalIssueId } from "../../../lib/canonicalIssues";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const VALID_PRIMARIES = new Set(["DEM", "REP", "OPEN", "GENERAL"]);
const VALID_CONFIDENCE = new Set(["clear", "low", "off_topic"]);

interface CounterBody {
  sessionId: string;
  stateCode: string;
  primary: "DEM" | "REP" | "OPEN" | "GENERAL";
  confirmedConcerns?: Array<{ canonicalIssue: string }>;
  concernEvents?: ConcernEvent[];
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

  // county is intentionally NOT read or stored — we collect state-level only
  // (privacy). Any `county` in the request body is silently dropped here.

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
      .map((c) => ({ canonicalIssue: c.canonicalIssue.slice(0, 64) }))
      // Allow-list: only known canonical issue ids ever reach the Redis-key
      // path. An unknown value, or one bearing key metacharacters (":", "*",
      // …), fails this check and is silently dropped — valid siblings in the
      // same POST are kept. Legit clients only ever send ids the resolver has
      // already validated against CANONICAL_ISSUE_LABELS, so no real traffic
      // is lost.
      .filter((c) => isCanonicalIssueId(c.canonicalIssue));
  }

  // concernEvents: optional array of per-concern event rows (state + issue
  // signal only). Defensive parsing mirrors confirmedConcerns above.
  let concernEvents: ConcernEvent[] = [];
  if (Array.isArray(b.concernEvents)) {
    concernEvents = b.concernEvents
      .filter(
        (c): c is Record<string, unknown> =>
          typeof c === "object" && c !== null,
      )
      .slice(0, 50) // Guard oversized arrays
      .map((c) => {
        const confidence =
          typeof c.confidence === "string" && VALID_CONFIDENCE.has(c.confidence)
            ? (c.confidence as ConcernEvent["confidence"])
            : "clear";
        return {
          canonicalIssue:
            typeof c.canonicalIssue === "string"
              ? c.canonicalIssue.slice(0, 64)
              : null,
          offTopicLabel:
            typeof c.offTopicLabel === "string"
              ? c.offTopicLabel.slice(0, 120)
              : null,
          stance: typeof c.stance === "string" ? c.stance.slice(0, 64) : null,
          rank:
            typeof c.rank === "number" && Number.isFinite(c.rank)
              ? Math.trunc(c.rank)
              : null,
          confidence,
          wasOffTopic: c.wasOffTopic === true || confidence === "off_topic",
        };
      });
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
    primary: b.primary as "DEM" | "REP" | "OPEN" | "GENERAL",
    confirmedConcerns,
    concernEvents,
    picks,
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

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
    // Force state-level only — county location is never collected (privacy).
    county: null,
    primary: body.primary,
    confirmedConcerns: body.confirmedConcerns ?? [],
    picks: body.picks ?? [],
  });

  // Persist anonymous per-concern event rows (best-effort, isolated from the
  // counter result). Gated on !alreadyCounted so the Redis 1-hour dedupe
  // doubles as the event-row dedupe — re-POSTs within the window don't
  // double-write.
  if (!result.alreadyCounted) {
    await recordConcernEvents({
      stateCode: body.stateCode,
      concernEvents: body.concernEvents ?? [],
    });

    // De-identified Polis response-vector collection used to live here as a
    // STOPGAP: confirmedConcerns treated as synthetic "agree" answers, since
    // the real per-statement agree/disagree/pass UI hadn't shipped. That UI
    // now exists (PolisStand, card fb77d0bb) and writes real per-statement
    // answers directly via POST /api/polis/respond — see that route for the
    // collectPolisVector wiring. Nothing to do here anymore.
  }

  return NextResponse.json(result, { status: 200 });
}
