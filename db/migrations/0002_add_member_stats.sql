CREATE TABLE "member_stats" (
	"candidate_id" text PRIMARY KEY NOT NULL,
	"chamber" text NOT NULL,
	"state" text,
	"district" integer,
	"senator_rank" text,
	"missed_votes_pct" numeric(5, 2),
	"votes_eligible" numeric(7, 0),
	"chamber_median_pct" numeric(5, 2),
	"current_term_end" date,
	"senate_class" text,
	"source" text DEFAULT 'govtrack' NOT NULL,
	"source_url" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "member_stats" ADD CONSTRAINT "member_stats_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;
