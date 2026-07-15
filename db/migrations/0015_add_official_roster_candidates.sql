-- ---------------------------------------------------------------------------
-- official_roster_candidates — state Secretary-of-State candidate rosters
-- (e.g. azsos.gov's qualified-for-primary PDF), crosswalked to `candidates`
-- but never merged. Governs the candidate SET for a contest when the
-- OFFICIAL_ROSTER_ENABLED flag is on and rows exist for that
-- (state, office, district, electionYear) — see
-- src/lib/server/officialRoster.ts / officialRosterFlag.ts. Additive and
-- read-only from the app's perspective; populated by a separate importer.
-- Full validation: docs/operations/arizona-vertical-slice-data-check.md.
--
-- Next free migration number as of this branch (based on origin/main):
-- 0014 (lobbying_issue_activity + member_civic_positions) exists, so this is
-- 0015. Verify with `git log --oneline main -- db/migrations/` before
-- applying on prod — do not renumber if another migration lands first.
-- ---------------------------------------------------------------------------
CREATE TABLE "official_roster_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state" text NOT NULL,
	"office" text NOT NULL,
	"district" text,
	"election_year" integer NOT NULL,
	"name" text NOT NULL,
	"party" text,
	"is_incumbent" boolean DEFAULT false NOT NULL,
	"ballot_status" text NOT NULL,
	"stage" text NOT NULL,
	"source_url" text NOT NULL,
	"retrieved_at" text NOT NULL,
	"our_candidate_id" text REFERENCES "candidates"("id"),
	"inserted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Idempotent-upsert key: one row per (seat, name, stage).
CREATE UNIQUE INDEX "official_roster_candidates_seat_name_uidx"
  ON "official_roster_candidates" ("state", "office", "district", "election_year", "name", "stage");
--> statement-breakpoint
CREATE INDEX "official_roster_candidates_state_idx"
  ON "official_roster_candidates" ("state");
