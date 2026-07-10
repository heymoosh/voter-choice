-- ---------------------------------------------------------------------------
-- lobbying_issue_activity — LDA LD-2 quarterly lobbying-activity disclosures
-- (client x issue-area x chamber x quarter). Populated by
-- scripts/ingest/lobbying-issue-activity.ts from the lda.gov REST API.
--
-- NOT MEMBER-KEYED, DELIBERATELY: LD-2 filings disclose only the chamber(s)
-- or agency(ies) contacted ("SENATE", "HOUSE OF REPRESENTATIVES", ...),
-- never an individual Member of Congress — there is no field for it on the
-- form. A row here means "this client's lobbyists disclosed contacting the
-- House/Senate on this issue this quarter," never "lobbied Rep./Sen. X."
-- Render accordingly: issue-level context only, never attached to a member.
--
-- License: LDA.gov API Terms of Service require citing the access date and
-- prohibit misrepresenting the data; no non-commercial or no-redistribution
-- restriction (unlike OpenSecrets' aggregated view of the same filings).
--
-- Next free migration number as of this branch (based on origin/main):
-- 0013 (member_stock_transactions) exists, so this is 0014. Verify with
-- `git log --oneline main -- db/migrations/` before applying on prod — do
-- not renumber if another migration lands first.
-- ---------------------------------------------------------------------------
CREATE TABLE "lobbying_issue_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filing_uuid" text NOT NULL,
	"filing_type" text NOT NULL,
	"filing_year" integer NOT NULL,
	"filing_period" text NOT NULL,
	"registrant_name" text NOT NULL,
	"client_name" text NOT NULL,
	"client_description" text,
	"client_state" text,
	"issue_area_code" text NOT NULL,
	"issue_area_label" text NOT NULL,
	"specific_issues" text,
	"chamber" text NOT NULL,
	"income_amount" numeric(14, 2),
	"expenses_amount" numeric(14, 2),
	"filing_url" text NOT NULL,
	"source_dataset" text NOT NULL,
	"external_id" text NOT NULL,
	"raw_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Idempotency key: one row per (filing, issue area, chamber) — see
-- buildLobbyingExternalId in lobbying-issue-activity.ts.
CREATE UNIQUE INDEX "lobbying_issue_activity_external_id_uidx"
  ON "lobbying_issue_activity" ("external_id");
--> statement-breakpoint
CREATE INDEX "lobbying_issue_activity_issue_idx"
  ON "lobbying_issue_activity" ("issue_area_code");
--> statement-breakpoint
CREATE INDEX "lobbying_issue_activity_chamber_idx"
  ON "lobbying_issue_activity" ("chamber");
--> statement-breakpoint
CREATE INDEX "lobbying_issue_activity_period_idx"
  ON "lobbying_issue_activity" ("filing_year", "filing_period");

-- ---------------------------------------------------------------------------
-- member_civic_positions — Financial Disclosure Schedule E ("Positions Held
-- Outside U.S. Government") for sitting Members of Congress: officer,
-- director, trustee, general partner, employee, etc. roles at any
-- organization other than the U.S. government (paid or unpaid; excludes
-- purely honorary and religious/social/fraternal/political organizations).
-- Populated by scripts/ingest/member-civic-positions.ts. SENATE ONLY in this
-- first pass (Senate EFD e-filed HTML is structured/parseable without OCR;
-- House Clerk filings are PDFs, some scanned, needing OCR — deferred to a
-- follow-up card). Bioguide-keyed like member_stock_transactions.
--
-- LEGAL / HONESTY CONTRACT: 5 U.S.C. app. 4 Sec. 105(c)(1),(2) makes it
-- unlawful to use Financial Disclosure Statement data for "any commercial
-- purpose, other than by news and communications media for dissemination to
-- the general public," for credit-rating purposes, or "in the solicitation
-- of money for any political, charitable, or other purpose." This is
-- genuinely ambiguous for a voter-information product and is NOT resolved
-- by this migration. Mitigation (decided by Muxin, 2026-07-08, see
-- docs/research/civic-orgs-lobbying-spike.md): build read-only, and every
-- surfaced row MUST link back to source_filing_url — the official Senate
-- EFD filing — so this app is never the disclosure of record, only a
-- citation-linked pointer to it. Never omit or fabricate source_filing_url.
--
-- Next free migration number: see lobbying_issue_activity header above —
-- this table ships in the same migration file (0014), two CREATE TABLEs.
-- ---------------------------------------------------------------------------
CREATE TABLE "member_civic_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" text NOT NULL REFERENCES "candidates"("id"),
	"bioguide_id" text NOT NULL,
	"chamber" text NOT NULL,
	"entity_name" text NOT NULL,
	"entity_type" text,
	"position_held" text NOT NULL,
	"position_dates" text,
	"comments" text,
	"filing_year" integer NOT NULL,
	"source_filing_url" text NOT NULL,
	"source_dataset" text NOT NULL,
	"external_id" text NOT NULL,
	"raw_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "member_civic_positions_external_id_uidx"
  ON "member_civic_positions" ("external_id");
--> statement-breakpoint
CREATE INDEX "member_civic_positions_candidate_idx"
  ON "member_civic_positions" ("candidate_id");
--> statement-breakpoint
CREATE INDEX "member_civic_positions_filing_year_idx"
  ON "member_civic_positions" ("filing_year");
