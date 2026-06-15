CREATE TABLE "voter_issue_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_issue" text,
	"off_topic_label" text,
	"resolved_stance" text,
	"rank" integer,
	"was_off_topic" boolean DEFAULT false NOT NULL,
	"confidence_level" text NOT NULL,
	"state_code" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "voter_issue_events_state_issue_idx" ON "voter_issue_events" ("state_code","canonical_issue");
--> statement-breakpoint
CREATE INDEX "voter_issue_events_issue_idx" ON "voter_issue_events" ("canonical_issue");
