ALTER TABLE "issue_tags" ADD COLUMN IF NOT EXISTS "sub_issue" text;
--> statement-breakpoint
ALTER TABLE "issue_tags" ADD COLUMN IF NOT EXISTS "sub_tagger_version" text;
--> statement-breakpoint
ALTER TABLE "issue_tags" ADD COLUMN IF NOT EXISTS "sub_tagger_confidence" numeric(4, 3);
--> statement-breakpoint
ALTER TABLE "voter_issue_events" ADD COLUMN IF NOT EXISTS "sub_issue" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issue_tags_sub_issue_idx" ON "issue_tags" ("canonical_issue","sub_issue");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "voter_issue_events_sub_issue_idx" ON "voter_issue_events" ("canonical_issue","sub_issue");
