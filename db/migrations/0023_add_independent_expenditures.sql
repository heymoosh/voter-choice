-- ---------------------------------------------------------------------------
-- Part 6b — super-PAC independent expenditures (FEC Schedule E).
-- One table: independent_expenditures (spender committee × candidate × cycle ×
-- support/oppose → total). Spender identity is NOT duplicated here — it joins
-- to pac_committees (migration 0022), which already carries name →
-- CONNECTED_ORG sponsor → sector → evidence_url → status for every committee.
-- Spec: docs/DONOR_FRAMING_AND_ACCOUNTABILITY_PLAN.md Part 6b.
--
-- Design rules encoded here, from the plan:
--   * NOT THE CANDIDATE'S MONEY — THE LEGALLY LOAD-BEARING RULE. Independent
--     expenditures are absent from candidate receipts by law and cannot be
--     coordinated with the campaign. These amounts must NEVER be added to
--     donor_aggregates, totalRaised, or any funding-mix total, and must render
--     as their own "Outside spending about this race" block. This is why the
--     table is separate from donor_aggregates rather than another bucket_label
--     in it: there is no code path that can accidentally sum it into the mix.
--     (`scripts/ingest/independent-expenditure-isolation.test.ts` enforces it.)
--   * SUPPORT ≠ OPPOSE, NEVER NETTED. `support_oppose` is part of the unique
--     key, so money spent FOR and money spent AGAINST a candidate are two
--     separate rows and two separate figures forever. Nothing in the schema
--     offers a place to store a single combined number. Values are 'support'
--     and 'oppose' only (FEC Schedule E SUP_OPP S/O), enforced by the ingest
--     and unit-tested — house style is app-level enforcement over CHECK
--     constraints (no migration in this repo uses CHECK).
--   * AMOUNTS ARE ITEMIZED-THEN-AGGREGATED. amount_total sums the per-filing
--     expenditure amount (EXP_AMO), never the filer's running aggregate
--     (AGG_AMO), which would multiply-count. expenditure_count is the number
--     of itemized Schedule E rows behind the total.
--   * IDEMPOTENT: composite unique on (committee, candidate, cycle,
--     support_oppose) so re-runs replace recomputed totals instead of
--     duplicating (0015/0016 roster lesson, same as 0022).
--
-- Additive only: one new table, no existing schema touched. NOT applied to any
-- database by this migration file — ships in the PR, applied separately per
-- repo convention.
--
-- Next free migration number as of this branch: 0022 exists, so this is 0023.
-- Verify with `git log --oneline main -- db/migrations/` before applying on
-- prod — do not renumber if another migration lands first.
-- ---------------------------------------------------------------------------
CREATE TABLE "independent_expenditures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"committee_id" text NOT NULL REFERENCES "pac_committees"("committee_id"),
	"candidate_id" text NOT NULL REFERENCES "candidates"("id"),
	"election_cycle" text NOT NULL,
	"support_oppose" text NOT NULL,
	"amount_total" numeric(14,2) NOT NULL,
	"expenditure_count" integer NOT NULL,
	"source" text NOT NULL,
	"source_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "independent_expenditures_uidx" UNIQUE ("committee_id", "candidate_id", "election_cycle", "support_oppose")
);
--> statement-breakpoint
CREATE INDEX "independent_expenditures_candidate_idx" ON "independent_expenditures" ("candidate_id", "election_cycle", "support_oppose");
--> statement-breakpoint
CREATE INDEX "independent_expenditures_committee_idx" ON "independent_expenditures" ("committee_id", "election_cycle");
