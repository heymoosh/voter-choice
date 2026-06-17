-- Migration 0009: de-identified per-session Polis response vectors
--
-- PRIVACY RATIONALE:
--   This table stores what each voter answered on Polis statements so we can
--   cluster "voters who answer alike" into groups. Privacy-by-design:
--
--   1. NO PII: no user_id, no IP address, no email, no name, no cookie value
--      that persists across browser sessions, no device fingerprint. The only
--      "identifier" is session_token — a random UUID generated fresh for each
--      Polis session, discarded by the browser when the tab closes, and never
--      emitted to any other table or log.
--
--   2. Coarse timestamps: recorded_hour is truncated to the hour so responses
--      from the same rough time period cannot be singled out by exact time.
--      Exact millisecond timestamps would let an adversary narrow down a row to
--      "whoever was on the site at 14:23:07.831 on June 17" — an hour bucket
--      makes that linkage infeasible without a separate traffic log.
--
--   3. Unlinkable: session_token is not stored anywhere else in the DB and is
--      NOT the same as the Redis dedupe sessionId (which lives in Redis with a
--      1-hour TTL and is separately discarded). A join across tables cannot
--      re-identify who submitted which vector.
--
--   4. Aggregate-only outputs: the clustering functions that read this table
--      return group-level statistics (cluster shares, consensus percents,
--      divided-state boolean). They never return a row that represents a
--      single person's choices.
--
-- COLLECTION STATUS: NOT ACTIVE.
--   The collection hook (src/lib/polis/collectVector.ts) is written but gated
--   OFF via POLIS_VECTOR_COLLECTION_ENABLED env flag. This migration should be
--   applied only when that flag is ready to be turned on in production.
--
-- COLLISION NOTE: migration 0009 may conflict with in-flight PRs that also
-- add a migration at this number. Verify with `git log --oneline main -- db/migrations/`
-- before applying.

CREATE TABLE "polis_response_vectors" (
  -- Opaque random token generated per-session in the browser; never persisted
  -- to any other table; NOT the same as the Redis dedupe sessionId.
  "session_token"   text NOT NULL,
  -- ISO 3166-2 state code (e.g. "TX"). Kept to allow state-scoped clustering.
  -- NULL when the voter skipped location.
  "state_code"      text,
  -- JSON object: { [statementId: string]: "agree" | "disagree" | "pass" }
  -- Only statements the voter actually answered are included; unanswered
  -- statements are simply absent (not stored as "pass") so the clustering
  -- function can distinguish "skipped" from "actively passed".
  "responses"       jsonb NOT NULL,
  -- Timestamp truncated to the hour (UTC). Prevents time-based re-identification.
  "recorded_hour"   timestamp with time zone NOT NULL,
  "inserted_at"     timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Unique on (session_token): one vector row per Polis session. Re-submissions
-- within the same session are upserted, not inserted again.
CREATE UNIQUE INDEX "polis_response_vectors_token_uidx"
  ON "polis_response_vectors" ("session_token");
--> statement-breakpoint
-- Supports state-scoped clustering queries.
CREATE INDEX "polis_response_vectors_state_idx"
  ON "polis_response_vectors" ("state_code");
--> statement-breakpoint
-- Supports time-windowed clustering (e.g. "last 30 days").
CREATE INDEX "polis_response_vectors_hour_idx"
  ON "polis_response_vectors" ("recorded_hour");
