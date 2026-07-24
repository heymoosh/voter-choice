-- ---------------------------------------------------------------------------
-- bill_cosponsors — who put their name on which federal bill, as sponsor or
-- cosponsor (`role`). Source: Congress.gov API — the bill detail endpoint for
-- the sponsor, /bill/{congress}/{type}/{number}/cosponsors for the cosponsors.
-- Populated by scripts/ingest/bill-cosponsors.ts over the govtrack (federal)
-- rows in `bills`.
--
-- Join basis is the same federal-<BIOGUIDE> candidate-id convention as
-- committee_memberships (bioguide is the key Congress.gov returns). Rows whose
-- candidate_id has no matching `candidates` row are skipped by the ingest,
-- never inserted (the FK below would reject them anyway).
--
-- Read as a bill-participation graph by src/lib/server/collaborators.ts: two
-- members collaborate on a bill when both put their name on it (sponsor OR
-- cosponsor). Storing the sponsor as a role='sponsor' row is what lets the
-- graph capture sponsor↔cosponsor edges — see Part 4 of
-- DONOR_FRAMING_AND_ACCOUNTABILITY_PLAN.md. The (bill_id, candidate_id) unique
-- key still holds: a member is never both sponsor and cosponsor of one bill.
--
-- Additive only: one new table, no existing schema touched. NOT applied to any
-- database by this migration file — ships in the PR, applied separately per
-- repo convention (see PR body).
--
-- Next free migration number as of this branch (based on origin/main): 0018
-- exists, so this is 0019. Verify with `git log --oneline main --
-- db/migrations/` before applying on prod — do not renumber if another
-- migration lands first.
-- ---------------------------------------------------------------------------
CREATE TABLE "bill_cosponsors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" text NOT NULL REFERENCES "bills"("id"),
	"candidate_id" text NOT NULL REFERENCES "candidates"("id"),
	"role" text DEFAULT 'cosponsor' NOT NULL,
	"is_original" boolean DEFAULT false NOT NULL,
	"date_cosponsored" date,
	"source" text DEFAULT 'congress-gov' NOT NULL,
	"source_url" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Idempotency key: one row per (bill, member) — see runBillCosponsorsIngest in
-- bill-cosponsors.ts.
CREATE UNIQUE INDEX "bill_cosponsors_bill_candidate_uidx"
  ON "bill_cosponsors" ("bill_id", "candidate_id");
--> statement-breakpoint
CREATE INDEX "bill_cosponsors_candidate_idx"
  ON "bill_cosponsors" ("candidate_id");
--> statement-breakpoint
CREATE INDEX "bill_cosponsors_bill_idx"
  ON "bill_cosponsors" ("bill_id");
