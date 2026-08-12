-- ---------------------------------------------------------------------------
-- Part 5 promise-ledger schema — candidate_promises / promise_actions /
-- promise_verdicts. See docs/DONOR_FRAMING_AND_ACCOUNTABILITY_PLAN.md Part 5,
-- which specifies every column here, and docs/PROMISE_ADJUDICATION_RUBRIC.md
-- (the versioned rubric `adjudicator_version` pairs with).
--
-- Sequencing note: the plan gated this migration behind the sourcing spike
-- (run 2026-08-07: corpus-ready 58/111 TX candidates, verdict GO on FEC
-- Form 1 + Wayback — recorded in the plan doc) and behind Muxin's rubric
-- review. The PR carrying this file merges only after that sign-off.
--
-- Design rules encoded here, from the plan:
--   * DECLARE THE TEST AT EXTRACTION: `promise_type` and
--     `conditions_deadline` are written when the promise is extracted,
--     before any outcome is known — never chosen after seeing how things
--     turned out. A promise with no falsifiable action, scope, or deadline
--     is filtered at extraction (rubric's four gates), not stored.
--   * REPRODUCIBILITY: `archive_url` points at the exact Wayback capture the
--     promise was extracted from (canonical-capture policy: last capture at
--     or before election day), or verdicts are unreproducible.
--   * IDEMPOTENT EXTRACTION: candidate_promises.id is a DETERMINISTIC text
--     id computed by the extractor (hash over candidate_id + archive_url +
--     normalized promise text), so re-running extraction upserts on the PK
--     instead of duplicating rows — the 0015/0016 roster lesson applied up
--     front.
--   * EVIDENCE LADDER: promise_actions.evidence_level is the three-label
--     standard (activity < advancement < outcome); a verdict may only cite
--     the highest label the official record actually supports.
--   * CONTROLLABLE-ACTION UNIT: the verdict enum (signed off 2026-07-23) is
--     kept | attempted_blocked | compromise | broken | not_yet_testable |
--     not_yet_rated. `attempted_blocked` = the member took the promised
--     controllable action but other institutions stopped the outcome;
--     "no law materialized" is never by itself `broken`.
--   * NOT_YET_RATED IS VISIBLE: zero rows in promise_verdicts for a promise
--     renders as not-yet-adjudicated, and zero rows in candidate_promises
--     for a candidate renders as "no promise corpus for this candidate" —
--     legitimate states, never blanks.
--
-- Additive only: three new tables, no existing schema touched. NOT applied
-- to any database by this migration file — ships in the PR, applied
-- separately per repo convention (see PR body).
--
-- Next free migration number as of this branch (based on origin/main): 0020
-- exists, so this is 0021. Verify with `git log --oneline main --
-- db/migrations/` before applying on prod — do not renumber if another
-- migration lands first.
-- ---------------------------------------------------------------------------
CREATE TABLE "candidate_promises" (
	"id" text PRIMARY KEY NOT NULL,
	"candidate_id" text NOT NULL REFERENCES "candidates"("id"),
	"canonical_issue" text NOT NULL,
	"sub_issue" text,
	"promise_text" text NOT NULL,
	"made_at" date,
	"venue" text NOT NULL,
	"source_url" text NOT NULL,
	"archive_url" text,
	"extraction_model_version" text NOT NULL,
	"promise_type" text NOT NULL,
	"conditions_deadline" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "candidate_promises_candidate_idx" ON "candidate_promises" ("candidate_id");
--> statement-breakpoint
CREATE INDEX "candidate_promises_issue_idx" ON "candidate_promises" ("canonical_issue", "sub_issue");
--> statement-breakpoint
CREATE TABLE "promise_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promise_id" text NOT NULL REFERENCES "candidate_promises"("id"),
	"action_type" text NOT NULL,
	"vote_id" uuid REFERENCES "votes"("id"),
	"bill_id" text REFERENCES "bills"("id"),
	"cosponsor_id" uuid REFERENCES "bill_cosponsors"("id"),
	"direction" text NOT NULL,
	"evidence_level" text NOT NULL,
	"link_method" text DEFAULT 'issue_tag_join' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promise_actions_link_uidx" UNIQUE NULLS NOT DISTINCT ("promise_id", "action_type", "vote_id", "bill_id", "cosponsor_id")
);
--> statement-breakpoint
CREATE INDEX "promise_actions_promise_idx" ON "promise_actions" ("promise_id");
--> statement-breakpoint
CREATE TABLE "promise_verdicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promise_id" text NOT NULL REFERENCES "candidate_promises"("id"),
	"verdict" text NOT NULL,
	"rationale" text NOT NULL,
	"evidence_refs" jsonb,
	"adjudicator_version" text NOT NULL,
	"adjudicated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promise_verdicts_promise_version_uidx" UNIQUE ("promise_id", "adjudicator_version")
);
--> statement-breakpoint
CREATE INDEX "promise_verdicts_promise_idx" ON "promise_verdicts" ("promise_id");
