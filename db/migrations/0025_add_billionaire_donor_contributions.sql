-- ---------------------------------------------------------------------------
-- billionaire_donor_contributions — matched itemized FEC individual
-- contributions (Schedule A) from someone on the hand-verified
-- BILLIONAIRE_SEED list (scripts/ingest/_billionaire-seed.ts).
--
-- Two kinds of row, kept as raw facts and never combined into a fabricated
-- total:
--   - committee_type='candidate': direct contribution to a candidate's own
--     principal campaign committee. candidate_id is set.
--   - committee_type='pac': contribution to a Super PAC / outside-spending
--     committee. candidate_id is NULL — a PAC pools money from many donors,
--     so attributing one donor's dollars to a specific race the PAC later
--     spent on would misrepresent the money. independent_expenditures
--     (migration 0023), joined on committee_id, already tracks which
--     candidates a PAC spent FOR/AGAINST.
--
-- Every row carries its own raw FEC fields (donor name/city/state/employer/
-- occupation exactly as filed) plus match_confidence + match_signals so any
-- match — high, medium, or low — is human-auditable. Low-confidence rows are
-- kept, not dropped, so a human reviewer can see a near-miss.
--
-- New table only, no existing rows touched. NOT applied to any database by
-- this migration file — ships in the PR, applied separately per repo
-- convention.
--
-- Next free migration number as of this branch (origin/main): 0024 exists,
-- so this is 0025. Verify with `git log --oneline main -- db/migrations/`
-- before applying on prod — do not renumber if another migration lands first.
-- ---------------------------------------------------------------------------
CREATE TABLE "billionaire_donor_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"billionaire_key" text NOT NULL,
	"billionaire_name" text NOT NULL,
	"committee_id" text NOT NULL,
	"committee_type" text NOT NULL,
	"candidate_id" text REFERENCES "candidates"("id"),
	"election_cycle" text NOT NULL,
	"amount" numeric(14,2) NOT NULL,
	"contribution_date" date,
	"donor_name_raw" text NOT NULL,
	"donor_city" text,
	"donor_state" text,
	"donor_employer" text,
	"donor_occupation" text,
	"match_confidence" text NOT NULL,
	"match_signals" text NOT NULL,
	"fec_sub_id" text NOT NULL,
	"source" text NOT NULL,
	"source_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billionaire_donor_contributions_sub_id_uidx" UNIQUE ("fec_sub_id")
);
--> statement-breakpoint
CREATE INDEX "billionaire_donor_contributions_billionaire_idx" ON "billionaire_donor_contributions" ("billionaire_key", "election_cycle");
--> statement-breakpoint
CREATE INDEX "billionaire_donor_contributions_candidate_idx" ON "billionaire_donor_contributions" ("candidate_id", "election_cycle");
--> statement-breakpoint
CREATE INDEX "billionaire_donor_contributions_committee_idx" ON "billionaire_donor_contributions" ("committee_id", "election_cycle");
