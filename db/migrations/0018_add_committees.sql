-- ---------------------------------------------------------------------------
-- committees / committee_memberships — standing committee assignments for
-- sitting Members of Congress. Source: unitedstates/congress-legislators
-- (CC0 public domain, thomas_id-keyed: committees-current.yaml +
-- committee-membership-current.yaml). Populated by
-- scripts/ingest/committee-assignments.ts.
--
-- Join basis is the federal-<BIOGUIDE> candidate-id convention that
-- member-stats.ts already uses — NOT member_civic_positions, which is
-- Senate-only and cannot crosswalk the House.
--
-- committees.thomas_id is the source's own id: parent committees use their
-- 4-letter code (e.g. "HSAG"); subcommittees concatenate the parent id with
-- their own numeric suffix (e.g. "HSAG15"), matching how
-- committee-membership-current.yaml keys its rows.
--
-- Additive only: two new tables, no existing schema touched. NOT applied to
-- any database by this migration file — ships in the PR, applied separately
-- per repo convention (see PR body).
--
-- Next free migration number as of this branch (based on origin/main): 0017
-- exists, so this is 0018. Verify with `git log --oneline main --
-- db/migrations/` before applying on prod — do not renumber if another
-- migration lands first.
-- ---------------------------------------------------------------------------
CREATE TABLE "committees" (
	"thomas_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"chamber" text NOT NULL,
	"jurisdiction" text,
	"parent_committee_id" text REFERENCES "committees"("thomas_id"),
	"source" text DEFAULT 'congress-legislators' NOT NULL,
	"source_url" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "committees_parent_idx" ON "committees" ("parent_committee_id");
--> statement-breakpoint
CREATE TABLE "committee_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" text NOT NULL REFERENCES "candidates"("id"),
	"committee_id" text NOT NULL REFERENCES "committees"("thomas_id"),
	"rank" integer,
	"title" text,
	"congress" integer NOT NULL,
	"source" text DEFAULT 'congress-legislators' NOT NULL,
	"source_url" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Idempotency key: one row per (member, committee, congress) — see
-- runCommitteeAssignmentsIngest in committee-assignments.ts.
CREATE UNIQUE INDEX "committee_memberships_member_congress_uidx"
  ON "committee_memberships" ("candidate_id", "committee_id", "congress");
--> statement-breakpoint
CREATE INDEX "committee_memberships_candidate_idx"
  ON "committee_memberships" ("candidate_id");
--> statement-breakpoint
CREATE INDEX "committee_memberships_committee_idx"
  ON "committee_memberships" ("committee_id");
