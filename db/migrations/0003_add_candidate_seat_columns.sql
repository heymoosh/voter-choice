-- Additive: structured seat columns on candidates for the FEC 2026 roster
-- ingest (challengers) + incumbent backfill. A "race" is the group key
-- (state, district, office, election_year). Apply manually to prod Neon
-- before running scripts/ingest/federal-candidates.ts.
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "party" text;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "state" text;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "district" text;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "office" text;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "election_year" integer;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "fec_candidate_id" text;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "total_receipts" numeric(15, 2);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "candidates_seat_idx" ON "candidates" USING btree ("state","district","office","election_year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "candidates_fec_id_idx" ON "candidates" USING btree ("fec_candidate_id");
