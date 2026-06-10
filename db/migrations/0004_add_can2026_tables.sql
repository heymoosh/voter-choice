-- Additive: CAN2026 enrichment tables (docs/CAN2026_ENRICHMENT_SCHEMA.md §3).
-- Hand-written (no drizzle-kit journal). Namespaced can_* — a distinct,
-- attributed source (Constitutional Accountability Now / can2026.org),
-- crosswalked into our candidates/bills/votes via NULLABLE FKs. Never touches
-- existing tables. Apply manually to prod Neon before running
-- scripts/ingest/can2026.ts.
CREATE TABLE IF NOT EXISTS "can_ingest_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_url" text NOT NULL,
	"content_updated_label" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"snapshot_date" date NOT NULL,
	"rows_parsed" jsonb,
	"template_version" text,
	"content_checksum" text,
	"notes" text,
	"raw_payload_gzip" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "can_races" (
	"id" text PRIMARY KEY NOT NULL,
	"state" text NOT NULL,
	"chamber" text NOT NULL,
	"district" text,
	"senate_class" text,
	"race_summary" text,
	"race_status" text,
	"is_open_seat" boolean DEFAULT false NOT NULL,
	"can_own_rating" text,
	"can_own_rating_raw" text,
	"overall_state_rating" text,
	"flags" jsonb,
	"retirement_context" text,
	"electoral_baseline" text,
	"election_date" date,
	"primary_date" date,
	"primary_results" jsonb,
	"button_color_hex" text,
	"snapshot_date" date NOT NULL,
	"source_url" text NOT NULL,
	"raw_html" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "can_race_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"race_id" text NOT NULL,
	"rater" text NOT NULL,
	"rater_type" text NOT NULL,
	"rating" text NOT NULL,
	"rating_raw" text,
	"snapshot_date" date NOT NULL,
	"source_url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "can_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"race_id" text,
	"record_type" text NOT NULL,
	"can_name" text NOT NULL,
	"party" text,
	"state" text,
	"incumbent_status" text,
	"next_election_year" integer,
	"primary_result_pct" numeric(5, 2),
	"narrative_summary" text,
	"data_status" text,
	"our_candidate_id" text,
	"match_method" text,
	"match_confidence" numeric(4, 3),
	"snapshot_date" date NOT NULL,
	"source_url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "can_donor_trails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"can_candidate_id" uuid NOT NULL,
	"cycle_window" text NOT NULL,
	"total_raised" numeric(15, 2),
	"cash_on_hand" numeric(15, 2),
	"cash_on_hand_as_of" date,
	"pac_share_pct" numeric(5, 2),
	"note" text,
	"data_status" text,
	"snapshot_date" date NOT NULL,
	"source_url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "can_donor_sectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"donor_trail_id" uuid NOT NULL,
	"sector_label_raw" text NOT NULL,
	"sector_label" text,
	"amount" numeric(15, 2) NOT NULL,
	"rank_in_trail" numeric(4, 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "can_finance_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"can_candidate_id" uuid NOT NULL,
	"metric_label_raw" text NOT NULL,
	"metric_label" text,
	"amount" numeric(15, 2),
	"as_of_date" date,
	"snapshot_date" date NOT NULL,
	"source_url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "can_issue_pac_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"can_candidate_id" uuid NOT NULL,
	"pac_name" text NOT NULL,
	"pac_category" text,
	"amount" numeric(15, 2),
	"window_type" text NOT NULL,
	"cycle_window" text,
	"confirmed" boolean DEFAULT true NOT NULL,
	"note" text,
	"snapshot_date" date NOT NULL,
	"source_url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "can_bill_narratives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"can_key" text NOT NULL,
	"title" text NOT NULL,
	"bill_type" text,
	"narrative" text,
	"procedural_note" text,
	"our_bill_id" text,
	"match_method" text,
	"snapshot_date" date NOT NULL,
	"source_url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "can_candidate_key_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"can_candidate_id" uuid NOT NULL,
	"bill_label" text NOT NULL,
	"data_bill_key" text,
	"bill_narrative_id" uuid,
	"vote_cast" text,
	"vote_cast_raw" text,
	"vote_date_raw" text,
	"vote_date" date,
	"context" text,
	"procedural_note" text,
	"source" text,
	"our_vote_id" uuid,
	"snapshot_date" date NOT NULL,
	"source_url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "can_annotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"annotation_type" text NOT NULL,
	"body" text NOT NULL,
	"disclaimer" text,
	"snapshot_date" date NOT NULL,
	"source_url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "can_citations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"source_org" text NOT NULL,
	"fec_committee_id" text,
	"citation_url" text,
	"citation_date" date,
	"raw_text" text,
	"snapshot_date" date NOT NULL
);
--> statement-breakpoint
-- FK constraints. Postgres has no "ADD CONSTRAINT IF NOT EXISTS"; guard each
-- with a duplicate_object handler so the migration stays re-runnable.
DO $$ BEGIN
	ALTER TABLE "can_race_ratings" ADD CONSTRAINT "can_race_ratings_race_id_can_races_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."can_races"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "can_candidates" ADD CONSTRAINT "can_candidates_race_id_can_races_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."can_races"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "can_candidates" ADD CONSTRAINT "can_candidates_our_candidate_id_candidates_id_fk" FOREIGN KEY ("our_candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "can_donor_trails" ADD CONSTRAINT "can_donor_trails_can_candidate_id_can_candidates_id_fk" FOREIGN KEY ("can_candidate_id") REFERENCES "public"."can_candidates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "can_donor_sectors" ADD CONSTRAINT "can_donor_sectors_donor_trail_id_can_donor_trails_id_fk" FOREIGN KEY ("donor_trail_id") REFERENCES "public"."can_donor_trails"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "can_finance_metrics" ADD CONSTRAINT "can_finance_metrics_can_candidate_id_can_candidates_id_fk" FOREIGN KEY ("can_candidate_id") REFERENCES "public"."can_candidates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "can_issue_pac_contributions" ADD CONSTRAINT "can_issue_pac_contributions_can_candidate_id_can_candidates_id_fk" FOREIGN KEY ("can_candidate_id") REFERENCES "public"."can_candidates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "can_bill_narratives" ADD CONSTRAINT "can_bill_narratives_our_bill_id_bills_id_fk" FOREIGN KEY ("our_bill_id") REFERENCES "public"."bills"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "can_candidate_key_votes" ADD CONSTRAINT "can_candidate_key_votes_can_candidate_id_can_candidates_id_fk" FOREIGN KEY ("can_candidate_id") REFERENCES "public"."can_candidates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "can_candidate_key_votes" ADD CONSTRAINT "can_candidate_key_votes_bill_narrative_id_can_bill_narratives_id_fk" FOREIGN KEY ("bill_narrative_id") REFERENCES "public"."can_bill_narratives"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "can_candidate_key_votes" ADD CONSTRAINT "can_candidate_key_votes_our_vote_id_votes_id_fk" FOREIGN KEY ("our_vote_id") REFERENCES "public"."votes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "can_races_state_idx" ON "can_races" USING btree ("state");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "can_races_chamber_idx" ON "can_races" USING btree ("chamber");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "can_race_ratings_race_rater_snap_uidx" ON "can_race_ratings" USING btree ("race_id","rater","snapshot_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "can_race_ratings_race_idx" ON "can_race_ratings" USING btree ("race_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "can_candidates_our_cand_idx" ON "can_candidates" USING btree ("our_candidate_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "can_candidates_race_idx" ON "can_candidates" USING btree ("race_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "can_candidates_record_type_idx" ON "can_candidates" USING btree ("record_type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "can_donor_trails_cand_window_uidx" ON "can_donor_trails" USING btree ("can_candidate_id","cycle_window");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "can_donor_sectors_trail_sector_uidx" ON "can_donor_sectors" USING btree ("donor_trail_id","sector_label_raw");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "can_finance_metrics_cand_idx" ON "can_finance_metrics" USING btree ("can_candidate_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "can_issue_pac_cand_pac_window_uidx" ON "can_issue_pac_contributions" USING btree ("can_candidate_id","pac_name","window_type","cycle_window");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "can_bill_narratives_key_snap_uidx" ON "can_bill_narratives" USING btree ("can_key","snapshot_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "can_bill_narratives_our_bill_idx" ON "can_bill_narratives" USING btree ("our_bill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "can_key_votes_cand_idx" ON "can_candidate_key_votes" USING btree ("can_candidate_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "can_key_votes_billnarr_idx" ON "can_candidate_key_votes" USING btree ("bill_narrative_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "can_annotations_entity_idx" ON "can_annotations" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "can_annotations_type_idx" ON "can_annotations" USING btree ("annotation_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "can_citations_entity_idx" ON "can_citations" USING btree ("entity_type","entity_id");
