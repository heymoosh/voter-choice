-- ---------------------------------------------------------------------------
-- Part 6a — PAC money attributed to sponsor + industry. Two tables:
-- pac_committees (committee → sponsor → sector, with evidence + status) and
-- pac_candidate_contributions (per committee × candidate × cycle totals).
-- Spec: docs/DONOR_FRAMING_AND_ACCOUNTABILITY_PLAN.md Part 6a, which mandates
-- promoting committees to a first-class table (not growing raw_metadata JSON)
-- with the shape: committee_id → PAC name → parent/sponsor → sector →
-- evidence_url → confidence/status.
--
-- Design rules encoded here, from the plan:
--   * A FILING IS EVIDENCE: `connected_org` comes verbatim from the FEC
--     committee master CONNECTED_ORG field — the committee's own declaration
--     of its sponsor — and `evidence_url` points at the committee's fec.gov
--     page where that filing is visible. Sector classification is OUR
--     inference (keyword mapping over the sponsor name, shared vocabulary
--     with the individual-donor buckets via scripts/ingest/_bucket-mapping.ts)
--     and carries `classification_method` provenance + a `status` gate:
--     'auto' rows may be reclassified by re-runs; 'verified'/'rejected' are
--     human decisions a re-run must never clobber. NULL sector = honestly
--     unclassified, never guessed.
--   * DISPLAY-LAYER ONLY, NEVER FUNDING-MIX MATH: these tables are a named
--     breakdown of money already counted inside the existing "PACs"
--     donor_aggregates bucket. Read paths must never add these amounts to
--     totalRaised or any funding-mix total — that would double-count (same
--     rule as the issue-PAC rows).
--   * IDEMPOTENT: pac_committees upserts on its natural key (the FEC
--     committee id); pac_candidate_contributions carries a composite unique
--     so re-runs replace recomputed totals instead of duplicating (0015/0016
--     roster lesson).
--
-- Additive only: two new tables, no existing schema touched. NOT applied to
-- any database by this migration file — ships in the PR, applied separately
-- per repo convention.
--
-- Next free migration number as of this branch (origin/main): 0021 exists,
-- so this is 0022. Verify with `git log --oneline main -- db/migrations/`
-- before applying on prod — do not renumber if another migration lands first.
-- ---------------------------------------------------------------------------
CREATE TABLE "pac_committees" (
	"committee_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"designation" text,
	"committee_type" text,
	"org_type" text,
	"connected_org" text,
	"sector" text,
	"classification_method" text,
	"status" text DEFAULT 'auto' NOT NULL,
	"evidence_url" text NOT NULL,
	"last_seen_cycle" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "pac_committees_sector_idx" ON "pac_committees" ("sector");
--> statement-breakpoint
CREATE INDEX "pac_committees_connected_org_idx" ON "pac_committees" ("connected_org");
--> statement-breakpoint
CREATE TABLE "pac_candidate_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"committee_id" text NOT NULL REFERENCES "pac_committees"("committee_id"),
	"candidate_id" text NOT NULL REFERENCES "candidates"("id"),
	"election_cycle" text NOT NULL,
	"amount_total" numeric(14,2) NOT NULL,
	"transaction_count" integer NOT NULL,
	"source" text NOT NULL,
	"source_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pac_candidate_contributions_uidx" UNIQUE ("committee_id", "candidate_id", "election_cycle")
);
--> statement-breakpoint
CREATE INDEX "pac_candidate_contributions_candidate_idx" ON "pac_candidate_contributions" ("candidate_id", "election_cycle");
