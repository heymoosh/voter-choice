CREATE TABLE "candidate_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_key" text NOT NULL,
	"canonical_issue" text NOT NULL,
	"resolved_stance" text NOT NULL,
	"confidence" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"model_version" text NOT NULL,
	"researched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_data_key_issue_uidx" ON "candidate_data" USING btree ("candidate_key","canonical_issue");--> statement-breakpoint
CREATE INDEX "candidate_data_key_idx" ON "candidate_data" USING btree ("candidate_key");
