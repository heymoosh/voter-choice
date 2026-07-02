-- ---------------------------------------------------------------------------
-- member_stock_transactions — STOCK Act Periodic Transaction Report (PTR)
-- disclosures for sitting House/Senate members. Populated by
-- scripts/ingest/stock-transactions.ts. INCUMBENTS ONLY — a row only exists
-- once its member is matched to a `candidates` row with is_incumbent = true
-- (House: state+district; Senate: bioguide id).
--
-- HONESTY CONTRACT: the STOCK Act discloses dollar bands, never exact
-- amounts. amount_low/amount_high are the parsed bounds of that band
-- (amount_high is NULL for the open-ended top band, e.g. "Over
-- $50,000,000") — never a fabricated point estimate. amount_range_label
-- keeps the verbatim source string for display. Both transaction_date and
-- disclosure_date are stored (filings can lag the trade by weeks), plus
-- filing_url — the official House Clerk / Senate eFD PTR filing — so every
-- row is independently verifiable.
--
-- Next free migration number as of this branch (based on origin/main):
-- 0011 (chat_usage_metrics) and 0012 (polis_response_vectors) exist, so this
-- is 0013. Verify with `git log --oneline main -- db/migrations/` before
-- applying on prod — do not renumber if another migration lands first.
-- ---------------------------------------------------------------------------
CREATE TABLE "member_stock_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" text NOT NULL REFERENCES "candidates"("id"),
	"bioguide_id" text,
	"chamber" text NOT NULL,
	"ticker" text,
	"asset_description" text NOT NULL,
	"asset_type" text,
	"transaction_type" text NOT NULL,
	"raw_transaction_type" text NOT NULL,
	"amount_low" numeric(14, 2) NOT NULL,
	"amount_high" numeric(14, 2),
	"amount_range_label" text NOT NULL,
	"transaction_date" date NOT NULL,
	"disclosure_date" date,
	"owner" text,
	"filing_url" text NOT NULL,
	"source_dataset" text NOT NULL,
	"external_id" text NOT NULL,
	"raw_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Idempotency key for re-runs (neither source dataset carries a per-row id).
CREATE UNIQUE INDEX "member_stock_transactions_external_id_uidx"
  ON "member_stock_transactions" ("external_id");
--> statement-breakpoint
CREATE INDEX "member_stock_transactions_candidate_idx"
  ON "member_stock_transactions" ("candidate_id");
--> statement-breakpoint
CREATE INDEX "member_stock_transactions_txn_date_idx"
  ON "member_stock_transactions" ("transaction_date");
--> statement-breakpoint
CREATE INDEX "member_stock_transactions_chamber_idx"
  ON "member_stock_transactions" ("chamber");
