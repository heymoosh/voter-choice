/**
 * POST /api/polis/respond
 *
 * Records a voter's blind agree/disagree/pass reactions from the PolisStand
 * step (card fb77d0bb) into `polis_response_vectors` — the SAME table and
 * write path `collectPolisVector` already provides (src/lib/polis/collectVector.ts),
 * not a new table. This replaces the STOPGAP MAPPING that used to live in
 * /api/counters (confirmedConcerns treated as synthetic "agree" answers) —
 * see that route's history for the mapping this retires.
 *
 * Fires once per statement reaction (best-effort, from the client) so a
 * voter who answers a couple of statements and then bails still has those
 * answers recorded — `collectPolisVector`'s upsert-by-sessionToken makes
 * repeat calls from the same PolisStand visit idempotent overwrites, not
 * duplicate rows.
 *
 * Privacy: blind (no per-user identity — sessionToken is an opaque UUID
 * generated fresh per PolisStand visit, distinct from the chat/counters
 * session id, same contract as collectVector.ts), state-level only, and the
 * response-map keys are allowlisted against the fixed POLIS_STATEMENTS
 * catalog (isKnownPolisStatement) so a client can never write an arbitrary
 * key into the table — mirrors /api/counters' isCanonicalIssueId allowlist.
 *
 * Honest state: when POLIS_VECTOR_COLLECTION_ENABLED is off (or the DB isn't
 * configured), this returns outcome "skipped" rather than pretending to
 * store anything — PolisStand reflects that back to the voter instead of
 * showing a false "recorded" confirmation.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  collectPolisVector,
  buildVectorInput,
} from "../../../../lib/polis/collectVector";
import { checkCounterRateLimit } from "../../../../lib/server/counters-rate-limit";
import { getClientIP } from "../../../../lib/server/client-ip";
import { isKnownPolisStatement } from "../../../../lib/polis/statements";

const VALID_ANSWERS = new Set(["agree", "disagree", "pass"]);

interface RespondBody {
  sessionToken: string;
  stateCode: string | null;
  responses: Record<string, "agree" | "disagree" | "pass">;
}

function validateBody(body: unknown): RespondBody | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  if (typeof b.sessionToken !== "string" || b.sessionToken.length === 0)
    return null;
  if (b.sessionToken.length > 128) return null; // Guard oversized tokens

  let stateCode: string | null = null;
  if (typeof b.stateCode === "string" && b.stateCode.length > 0) {
    if (b.stateCode.length > 4) return null; // e.g. "TX", "CA"
    stateCode = b.stateCode.toUpperCase();
  }

  if (!b.responses || typeof b.responses !== "object") return null;
  const rawResponses = b.responses as Record<string, unknown>;

  // Allowlist: only known statement ids ever reach the write path, and only
  // with a valid answer value. Unknown ids or malformed answers are silently
  // dropped — legit clients only ever send ids from POLIS_STATEMENTS.
  const responses: Record<string, "agree" | "disagree" | "pass"> = {};
  for (const [id, answer] of Object.entries(rawResponses)) {
    if (!isKnownPolisStatement(id)) continue;
    if (typeof answer !== "string" || !VALID_ANSWERS.has(answer)) continue;
    responses[id] = answer as "agree" | "disagree" | "pass";
  }
  if (Object.keys(responses).length === 0) return null; // nothing to record

  return { sessionToken: b.sessionToken, stateCode, responses };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIP(request);

  const rateLimitOk = await checkCounterRateLimit(ip);
  if (!rateLimitOk) {
    return NextResponse.json(
      { ok: false, outcome: "error", error: "Rate limit exceeded." },
      { status: 429 },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, outcome: "error", error: "Invalid JSON." },
      { status: 400 },
    );
  }

  const body = validateBody(rawBody);
  if (!body) {
    return NextResponse.json(
      { ok: false, outcome: "error", error: "Invalid request body." },
      { status: 400 },
    );
  }

  // Independently flag-gated here (in addition to collectVector.ts's own
  // internal hard gate) so the wiring itself is visibly and independently
  // flag-controlled — same defensive pattern as /api/counters.
  if (process.env.POLIS_VECTOR_COLLECTION_ENABLED !== "true") {
    return NextResponse.json({ ok: true, outcome: "skipped" }, { status: 200 });
  }

  const result = await collectPolisVector(
    buildVectorInput(body.sessionToken, body.stateCode, body.responses),
  );
  return NextResponse.json(result, { status: 200 });
}
