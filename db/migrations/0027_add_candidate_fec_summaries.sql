-- ---------------------------------------------------------------------------
-- Per-candidate FEC summary financials — what makes "$0 corporate PAC money"
-- a FACT rather than a missing row.
--
-- The problem this fixes: scripts/ingest/federal-donors.ts writes the "PACs"
-- donor_aggregates bucket only when the amount is > 0. So a candidate who
-- filed and reported zero PAC contributions is stored EXACTLY like one we
-- never ingested — on prod (2026-08-20) that is 1,573 of 2,594 federal
-- non-incumbents with no PACs row and not a single explicit zero. A claim
-- about absence cannot be built on an absence of rows.
--
-- Source: the FEC "all candidates" bulk file (weball<yy>.zip) — one row per
-- candidate, free, no API key, no rate limit. It carries the two things the
-- claim needs and donor_aggregates cannot express:
--   * OTHER_POL_CMTE_CONTRIB — total PAC contributions, INCLUDING a filed 0.
--   * CVG_END_DT — the date the filing covers through, so every claim can say
--     "through <date> filings" instead of implying it is current forever.
--
-- Deliberately a separate table, NOT more donor_aggregates buckets:
--   * a zero-dollar bucket would render as a $0 bar in the coalition display;
--   * weball has only a TOTAL individual figure (no itemized/unitemized
--     split), so writing it as funding-mix buckets would either clobber the
--     richer per-committee data already ingested or make computeFundingMix
--     report a candidate as "100% PAC" purely because the individual split is
--     absent. This table sits beside the buckets and never feeds totalRaised.
--
-- A candidate MISSING from this table for a cycle has no FEC summary on file —
-- read paths must render that as "no filing yet", never as $0.
--
-- Additive only: one new table, no existing schema touched. NOT applied to any
-- database by this migration file — ships in the PR, applied separately per
-- repo convention.
--
-- Next free migration number as of this branch: 0026 (PR #555, sponsor class)
-- exists, so this is 0027. Verify with `git log --oneline main -- db/migrations/`
-- before applying on prod — do not renumber if another migration lands first.
-- ---------------------------------------------------------------------------
CREATE TABLE "candidate_fec_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" text NOT NULL REFERENCES "candidates"("id"),
	"election_cycle" text NOT NULL,
	"fec_candidate_id" text NOT NULL,
	"total_receipts" numeric(15,2) NOT NULL,
	"individual_total" numeric(15,2) NOT NULL,
	"pac_total" numeric(15,2) NOT NULL,
	"party_total" numeric(15,2) NOT NULL,
	"candidate_self_total" numeric(15,2) NOT NULL,
	"coverage_end_date" date,
	"source" text NOT NULL,
	"source_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_fec_summaries_uidx" UNIQUE ("candidate_id", "election_cycle")
);
--> statement-breakpoint
CREATE INDEX "candidate_fec_summaries_cycle_idx" ON "candidate_fec_summaries" ("election_cycle");
