/**
 * src/lib/polis/collectVector.ts
 *
 * COLLECTION HOOK — HELD / NOT WIRED
 *
 * This module provides the function that would write a de-identified response
 * vector to `polis_response_vectors` at Polis session-end. It is:
 *
 *   1. Exported so callers can import and eventually wire it.
 *   2. Gated hard-off by POLIS_VECTOR_COLLECTION_ENABLED env flag (must equal
 *      "true" to proceed). Default is off.
 *   3. NOT called from any live path today. The TODO below marks where to wire
 *      it once the migration is applied and the flag is ready to enable.
 *
 * TODO (follow-up card): wire `collectPolisVector` into the counters route
 *   (src/app/api/counters/route.ts) alongside `recordConcernEvents` — call it
 *   after the session counter is incremented successfully and dedupe passed.
 *   Apply migration 0012_add_polis_response_vectors.sql first. Verify that
 *   POLIS_VECTOR_COLLECTION_ENABLED is in the Vercel env config before enabling.
 *
 * PRIVACY GUARANTEES (enforced here):
 *   - session_token is an opaque random UUID passed in by the caller; it is
 *     NOT the same as the Redis dedupe sessionId (different random value,
 *     different lifetime, different purpose).
 *   - recorded_hour truncates the current timestamp to the hour so rows
 *     cannot be singled out by exact time.
 *   - Only statement ids and answer values are stored — no free text, no
 *     verbatim concern descriptions, no IP address, no user account id.
 *   - The DB upsert is idempotent on session_token (ON CONFLICT DO UPDATE).
 */

import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import { polisResponseVectors } from "../../../db/schema";
import type { ResponseVector } from "./clustering";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CollectVectorInput {
  /**
   * Opaque random token generated fresh for this Polis session.
   * MUST NOT be the same as the Redis dedupe sessionId.
   * Caller is responsible for generating this (e.g. crypto.randomUUID()).
   */
  sessionToken: string;
  /** ISO 3166-2 state code, e.g. "TX". Null when voter skipped location. */
  stateCode: string | null;
  /**
   * The voter's answers: { statementId -> "agree" | "disagree" | "pass" }.
   * Only statements the voter actually answered should be included.
   * Empty objects are accepted (results in a no-op after validation).
   */
  responses: ResponseVector;
}

export interface CollectVectorResult {
  ok: boolean;
  /** "skipped" when the flag is off or DB is not configured; "stored" when written. */
  outcome: "skipped" | "stored" | "error";
}

// ---------------------------------------------------------------------------
// Collection function (HELD — NOT WIRED TO ANY LIVE PATH)
// ---------------------------------------------------------------------------

/**
 * Write a de-identified Polis response vector to `polis_response_vectors`.
 *
 * *** COLLECTION IS DISABLED ***
 * This function is a no-op unless POLIS_VECTOR_COLLECTION_ENABLED === "true"
 * AND a DATABASE_URL is configured. Both conditions must be true before any
 * row is written. The function never throws — errors are logged and result in
 * outcome="error".
 *
 * @see CollectVectorInput for privacy contract on each field.
 */
export async function collectPolisVector(
  input: CollectVectorInput,
): Promise<CollectVectorResult> {
  // *** HARD GATE: collection is off by default ***
  if (process.env.POLIS_VECTOR_COLLECTION_ENABLED !== "true") {
    return { ok: true, outcome: "skipped" };
  }

  // Must have at least one answered statement
  if (Object.keys(input.responses).length === 0) {
    return { ok: true, outcome: "skipped" };
  }

  const db = getDb();
  if (db === DB_NOT_CONFIGURED) {
    return { ok: true, outcome: "skipped" };
  }

  try {
    // Truncate current timestamp to the hour (privacy: coarse time bucket)
    const now = new Date();
    const recordedHour = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
      ),
    );

    await db
      .insert(polisResponseVectors)
      .values({
        sessionToken: input.sessionToken,
        stateCode: input.stateCode,
        responses: input.responses,
        recordedHour,
      })
      .onConflictDoUpdate({
        target: polisResponseVectors.sessionToken,
        set: {
          // Allow re-submission within the same session to update answers
          responses: input.responses,
          stateCode: input.stateCode,
        },
      });

    return { ok: true, outcome: "stored" };
  } catch (err) {
    console.error("[polis/collectVector] Insert failed:", err);
    return { ok: false, outcome: "error" };
  }
}

// ---------------------------------------------------------------------------
// Builder helper (pure — testable without DB)
// ---------------------------------------------------------------------------

/**
 * Build a CollectVectorInput from the raw Polis session answers map.
 * Validates that all values are valid Answer types; invalid entries are dropped.
 *
 * This is a pure function — no DB, no side effects.
 */
export function buildVectorInput(
  sessionToken: string,
  stateCode: string | null,
  rawAnswers: Record<string, unknown>,
): CollectVectorInput {
  const VALID_ANSWERS = new Set(["agree", "disagree", "pass"]);
  const responses: ResponseVector = {};
  for (const [stmtId, ans] of Object.entries(rawAnswers)) {
    if (typeof ans === "string" && VALID_ANSWERS.has(ans)) {
      responses[stmtId] = ans as "agree" | "disagree" | "pass";
    }
  }
  return { sessionToken, stateCode, responses };
}
