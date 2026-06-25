-- Migration 0009: Add vote_rationales table
--
-- Stores member-stated reasoning for roll-call votes, synthesized from
-- congress-press press releases (https://github.com/dwillis/congress-press).
--
-- Data source:  MIT-licensed bulk JSONL — Copyright (c) 2026 Derek Willis.
-- Attribution:  "congress-press by Derek Willis" must appear wherever
--               rationale text is displayed (enforced by alignment.ts).
--
-- NOTE: This migration is 0009. An in-flight PR on another branch may also
-- claim 0009 — reconcile by renumbering whichever merges second.

CREATE TABLE IF NOT EXISTS "vote_rationales" (
  "id"                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys: one rationale per (candidate, bill).
  -- candidate_id and bill_id join the existing candidates / bills tables.
  "candidate_id"       text NOT NULL REFERENCES "candidates"("id"),
  "bill_id"            text NOT NULL REFERENCES "bills"("id"),

  -- LLM-generated "stated reason" blurb (plain text, ≤3 sentences).
  -- Labeled as stated/inferred — NEVER presented as verified fact.
  -- NULL until the generation step runs.
  "rationale_text"     text,

  -- labeling marker: "stated" (direct quote / paraphrase) |
  -- "inferred" (press release is thematically related but not an explicit vote comment).
  -- NULL when rationale_text is NULL.
  "label"              text,

  -- Press release source URLs from congress-press (array stored as JSONB).
  -- Each element is { url: string, publishedAt: string, title: string }.
  -- Links are required for attribution.
  "press_release_sources"  jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Model/version that generated the rationale (e.g. "claude-haiku-4-5-20251001").
  -- NULL until generated.
  "model_version"      text,

  -- Confidence in the press-release→vote match: "high" | "medium" | "low".
  -- "high" = bill number appears verbatim in press release.
  -- "medium" = bill title keyword + date window match.
  -- "low" = date window only (weakest signal).
  "match_confidence"   text,

  -- ISO-8601 timestamp when the rationale was generated. NULL until generated.
  "generated_at"       timestamp with time zone,

  -- Timestamp when this row was upserted by the ingest.
  "inserted_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"         timestamp with time zone NOT NULL DEFAULT now()
);

-- One rationale per (candidate, bill) — upsert target.
CREATE UNIQUE INDEX IF NOT EXISTS "vote_rationales_cand_bill_uidx"
  ON "vote_rationales" ("candidate_id", "bill_id");

-- Speed up "all rationales for a candidate" lookups (used by alignment.ts join).
CREATE INDEX IF NOT EXISTS "vote_rationales_candidate_idx"
  ON "vote_rationales" ("candidate_id");

-- Speed up "all rationales for a bill" lookups (used by summarize pipeline).
CREATE INDEX IF NOT EXISTS "vote_rationales_bill_idx"
  ON "vote_rationales" ("bill_id");
