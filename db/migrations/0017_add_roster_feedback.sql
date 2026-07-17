-- ---------------------------------------------------------------------------
-- roster_feedback — user-submitted "Missing a rep? Something look wrong?"
-- reports from the results/roster surfaces (card "[P1] Ballot-accuracy
-- feedback intake"). This is Muxin's post-launch correction channel for
-- roster/ballot errors, replacing manual re-combing of state sites.
--
-- No auth, no PII beyond whatever free text the voter types into `message`.
-- state/office/district/candidate_ref are prefilled client-side from the
-- voter's existing address-resolution context but are freely editable, so
-- none of them are trustworthy identifiers — same posture as the free-text
-- message itself.
--
-- Additive only: new table, no existing schema touched. NOT applied to any
-- database by this migration file — ships in the PR, applied separately via
-- scripts/ops/db-exec.ts equivalent per repo convention (see PR body).
--
-- Next free migration number as of this branch (based on origin/main): 0016
-- exists, so this is 0017. Verify with `git log --oneline main --
-- db/migrations/` before applying on prod — do not renumber if another
-- migration lands first.
-- ---------------------------------------------------------------------------
CREATE TABLE "roster_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"state" text,
	"office" text,
	"district" text,
	"candidate_ref" text,
	"message" text NOT NULL,
	"app_context" jsonb
);
--> statement-breakpoint
CREATE INDEX "roster_feedback_created_at_idx" ON "roster_feedback" ("created_at");
--> statement-breakpoint
CREATE INDEX "roster_feedback_state_idx" ON "roster_feedback" ("state");
