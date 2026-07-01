-- Roll-call tally columns on `votes` (per-vote aggregate counts + result string)
-- and bill lifecycle status on `bills`.
--
-- vote.tally_yea / tally_nay / tally_present / tally_not_voting: chamber-wide
--   headcount for the roll call this individual vote belongs to. NULL when not
--   yet ingested (old rows, state votes). Populated by federal-votes ingest from
--   GovTrack's `total_plus` / `total_minus` / `total_present` / `total_not_voting`
--   fields on the vote object.
--
-- vote.tally_result: human-readable outcome string, e.g. "Passed", "Failed",
--   "Agreed to". Sourced from GovTrack's `result` field. NULL when unavailable.
--   UI formats as "Passed House 232–193" when combined with yea/nay counts.
--
-- bills.bill_status: latest lifecycle stage for the bill, e.g.
--   "Passed House, stalled in Senate", "Signed into law". Sourced from
--   Congress.gov latestAction.text during bill enrichment. NULL when
--   unavailable (state bills, bills not yet enriched). Hide the line in the
--   UI when NULL.

ALTER TABLE "votes" ADD COLUMN IF NOT EXISTS "tally_yea" integer;
--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN IF NOT EXISTS "tally_nay" integer;
--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN IF NOT EXISTS "tally_present" integer;
--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN IF NOT EXISTS "tally_not_voting" integer;
--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN IF NOT EXISTS "tally_result" text;
--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "bill_status" text;
