CREATE TABLE "bills" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"source" text NOT NULL,
	"source_url" text NOT NULL,
	"jurisdiction" text NOT NULL,
	"introduced_date" date,
	"raw_metadata" jsonb,
	"inserted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_offices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" text NOT NULL,
	"office_label" text NOT NULL,
	"jurisdiction" text NOT NULL,
	"term_start" date NOT NULL,
	"term_end" date,
	"source_url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"source_id" text NOT NULL,
	"jurisdiction" text NOT NULL,
	"is_incumbent" boolean DEFAULT false NOT NULL,
	"raw_metadata" jsonb,
	"inserted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "donor_aggregates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" text NOT NULL,
	"election_cycle" text NOT NULL,
	"bucket_label" text NOT NULL,
	"amount_total" numeric(15, 2) NOT NULL,
	"source" text NOT NULL,
	"source_url" text NOT NULL,
	"raw_metadata" jsonb,
	"inserted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" text NOT NULL,
	"canonical_issue" text NOT NULL,
	"stance_lens" text NOT NULL,
	"tagger_version" text NOT NULL,
	"tagger_confidence" numeric(4, 3),
	"tagged_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scorecard_meta" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"partisan_lean" text NOT NULL,
	"contact" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" text NOT NULL,
	"candidate_id" text NOT NULL,
	"vote_cast" text NOT NULL,
	"vote_date" date NOT NULL,
	"source_url" text NOT NULL,
	"raw_metadata" jsonb,
	"inserted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candidate_offices" ADD CONSTRAINT "candidate_offices_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donor_aggregates" ADD CONSTRAINT "donor_aggregates_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_tags" ADD CONSTRAINT "issue_tags_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "donor_agg_candidate_cycle_bucket_uidx" ON "donor_aggregates" USING btree ("candidate_id","election_cycle","bucket_label");--> statement-breakpoint
CREATE UNIQUE INDEX "issue_tags_bill_issue_uidx" ON "issue_tags" USING btree ("bill_id","canonical_issue");--> statement-breakpoint
CREATE INDEX "issue_tags_canonical_issue_idx" ON "issue_tags" USING btree ("canonical_issue");--> statement-breakpoint
CREATE UNIQUE INDEX "votes_bill_candidate_uidx" ON "votes" USING btree ("bill_id","candidate_id");--> statement-breakpoint
CREATE INDEX "votes_candidate_date_idx" ON "votes" USING btree ("candidate_id","vote_date");--> statement-breakpoint
CREATE INDEX "votes_bill_idx" ON "votes" USING btree ("bill_id");