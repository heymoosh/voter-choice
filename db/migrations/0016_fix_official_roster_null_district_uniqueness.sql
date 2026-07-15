-- ---------------------------------------------------------------------------
-- Fixes a real idempotency bug in official_roster_candidates discovered
-- while building the Texas vertical slice (card 8530a468): the unique index
-- from migration 0015 is a standard CREATE UNIQUE INDEX, and in Postgres,
-- NULL is never considered equal to NULL for uniqueness purposes. Every
-- statewide (Senate) row has district = NULL, so the same senate candidate
-- silently accumulated a NEW duplicate row on every re-run of the importer
-- instead of being upserted — the importer's own idempotency claim was
-- false whenever a state's roster covered a Senate contest. Arizona (house
-- only, 0 Senate contests in 2026) never had a NULL-district row, so this
-- never surfaced during the AZ build.
--
-- Fix: recreate the index with NULLS NOT DISTINCT (Postgres 15+; confirmed
-- available — staging runs PostgreSQL 17), so two rows with the same
-- (state, office, NULL, election_year, name, stage) now correctly collide
-- and upsert instead of duplicating. Non-destructive: no column, table, or
-- data type changes. Existing NULL-district duplicate rows this bug already
-- produced (in this session's staging import/re-import) must be
-- deduplicated separately before or after this migration — this migration
-- only fixes future inserts, it does not retroactively merge existing rows.
--
-- Next free migration number as of this branch (based on origin/main): 0015
-- exists, so this is 0016. Verify with `git log --oneline main --
-- db/migrations/` before applying on prod — do not renumber if another
-- migration lands first.
-- ---------------------------------------------------------------------------
DROP INDEX "official_roster_candidates_seat_name_uidx";
--> statement-breakpoint
CREATE UNIQUE INDEX "official_roster_candidates_seat_name_uidx"
  ON "official_roster_candidates" ("state", "office", "district", "election_year", "name", "stage")
  NULLS NOT DISTINCT;
