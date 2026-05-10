# Work Packet: launch-vote-ingestion-pipeline

Status: Phase A ready (Phases B–G queued, gated on phase-by-phase verifier checkpoints)
Owner: orchestrator (Claude Opus, this session) → worker subagents (Sonnet)
Source: `/Users/Muxin/.claude/plans/am-running-e2e-jaunty-crab.md` (approved Packet 6 plan).
Branch: launch/production

## Intent

Replace the per-session LLM `web_search` path for alignment scoring with a deterministic backend lookup against pre-tagged votes ingested from public official sources. The structured `[ALIGNMENT_SCORES]` block schema and all v2 UI stay; only the source of truth flips.

Slice picked: **Packet 6.1 = federal + all 50 states**, with empty-state UX when the backend has no data for a (candidate, canonical issue) pair. Multi-week work, executed across seven phases (A–G) that each land green.

Provisioning: Neon Postgres + OpenStates API key are live in Vercel + Bitwarden Secrets Manager.

## Phase A — Foundation (this packet's first phase)

Goal: get Drizzle + Neon + GitHub Actions skeleton wired so subsequent phases (B–G) can plug in ingest scripts without scaffolding work each time. No real data ingest yet.

### Phase A scope

**New deps (`package.json`):**
- `drizzle-orm` (latest stable, pinned exact)
- `drizzle-kit` (latest stable, pinned exact, devDependency)
- `@neondatabase/serverless` (latest stable, pinned exact)

**New files:**
- `db/schema.ts` — Drizzle schema covering all tables Packet 6 will need (define them now to avoid per-phase migrations). Tables:
  - `candidates` — id (text PK), full_name, source_id (e.g., bioguide id for federal, openstates id for state), jurisdiction (text: `federal-house` / `federal-senate` / `state-XX-house` / `state-XX-senate`), is_incumbent (boolean), raw_metadata (jsonb), inserted_at, updated_at.
  - `candidate_offices` — id (uuid PK), candidate_id FK, office_label, jurisdiction, term_start (date), term_end (date nullable), source_url.
  - `bills` — id (text PK, format: `<source>-<source_id>`, e.g., `govtrack-hr1234-118`), title, summary (text), source (text: `govtrack`/`openstates`/etc.), source_url, jurisdiction (text), introduced_date (date), raw_metadata (jsonb), inserted_at, updated_at.
  - `votes` — id (uuid PK), bill_id FK, candidate_id FK, vote_cast (text: `yea`/`nay`/`present`/`absent`/`not_voting`), vote_date (date), source_url, raw_metadata (jsonb), inserted_at. Unique index on `(bill_id, candidate_id)`.
  - `issue_tags` — id (uuid PK), bill_id FK, canonical_issue (text — joins to `src/lib/canonicalIssues.ts` ids), stance_lens (text: `in_favor`/`opposed` describing what voting yea on this bill *means* for the issue), tagger_version (text: e.g., `claude-opus-4-7-2026-05-09`), tagger_confidence (numeric 0-1 nullable), tagged_at. Unique index on `(bill_id, canonical_issue)`.
  - `donor_aggregates` — id (uuid PK), candidate_id FK, election_cycle (text: e.g., `2026`), bucket_label (text — joins to donor bucket vocabulary in `PATTERN_TAXONOMIES.md`), amount_total (numeric), source (text), source_url, raw_metadata (jsonb), inserted_at. Unique index on `(candidate_id, election_cycle, bucket_label)`.
  - `scorecard_meta` — id (text PK), name, url, partisan_lean (text: `partisan`/`nonpartisan`/`mixed`), contact (text nullable), notes (text nullable). **No per-vote records here.** This is metadata only; per-vote scorecard tags are fetched on-demand later (Packet 6.2+).

  Define indexes:
  - `votes(candidate_id, vote_date)` for date-range queries on a candidate's record.
  - `votes(bill_id)` for joining.
  - `issue_tags(canonical_issue)` for the alignment lookup query.

- `db/client.ts` — Neon serverless client wrapper. Reads `DATABASE_URL` from env. Mirrors the defensive pattern in `src/lib/server/durable-store.ts`: returns a working client when env is set, returns a typed sentinel (or throws a specific error the route can catch) when not. Export a `getDb()` function.

- `drizzle.config.ts` — Drizzle Kit config pointing at `db/schema.ts`, output to `db/migrations/`, dialect: `postgresql`.

- `db/migrations/` — Drizzle generated migrations. Generate the initial migration via `drizzle-kit generate` and commit it.

- `.github/workflows/ingest-federal.yml` *(skeleton — no real ingest yet)* — cron `0 7 * * 0` (Sunday 7am UTC), pulls BWS secrets, runs a no-op `node scripts/ingest/federal-votes.ts` placeholder script that just logs "skeleton; no-op in Phase A." Verifies the workflow itself runs and connects to Neon successfully (read schema_migrations table; no writes).

- `.github/workflows/ingest-states.yml` *(skeleton)* — matrix workflow over the 6 states we have fixtures for (TX, CA, NY, FL, GA, NC) — easy starting point; the matrix expands to all 50 in Phase C. Same no-op script pattern.

- `.github/workflows/ingest-tag-bills.yml` *(skeleton)* — runs after the ingest workflows complete. No-op in Phase A.

- `scripts/ingest/federal-votes.ts`, `scripts/ingest/state-votes.ts`, `scripts/ingest/tag-bills.ts` *(skeleton)* — each: load env, connect to Neon via `db/client.ts`, log a "Phase A skeleton" message, exit 0. Phases B–E populate them.

- `scripts/ingest/_smoke.ts` — connects to Neon, inserts a single test row into `bills`, queries it back, deletes it, exits with the result. Used by Phase A verification + as a CI smoke check.

**Modified files:**
- `package.json` — add deps + a new script `db:generate` (drizzle-kit generate), `db:migrate` (drizzle-kit migrate), `db:smoke` (node scripts/ingest/_smoke.ts).
- `.github/workflows/deploy.yml` — extend BWS secret pull list with `DATABASE_URL` and `OPENSTATES_API_KEY` so the deploy workflow has them available (the app's API routes will need `DATABASE_URL` once Phase F flips the alignment path; harmless to add now).
- `.gitignore` — add `db/migrations/meta/` if drizzle-kit generates anything we shouldn't commit.

**Tests:**
- `db/client.test.ts` — defensive failure mode: when `DATABASE_URL` is unset, `getDb()` returns the sentinel without throwing. Pure unit test — no real connection.
- `scripts/ingest/_smoke.test.ts` is NOT in scope (the smoke is a runtime check; testing it inside vitest would need a real DB connection — defer to CI).

### Phase A acceptance criteria

- `db/schema.ts` defines all seven tables with proper PKs, FKs, unique indexes, and the indexes called out above.
- `db/client.ts` exports `getDb()` that returns a working Neon client when `DATABASE_URL` is set; returns the sentinel when not.
- `drizzle.config.ts` exists, `drizzle-kit generate` produces a clean initial migration, the migration is committed.
- The three GH Actions workflow skeletons exist, run without error (verified by manually triggering one via `gh workflow run` after merge), and pull `DATABASE_URL` + `OPENSTATES_API_KEY` from BWS without failure.
- `npm run lint` clean, `npm run test` green (existing 690 + new 1–2 client tests), `npm run build` succeeds.
- The smoke script can be run locally against the user's Neon connection string and successfully inserts/queries/deletes a row.

### Phase A out of scope

- Any real ingest from GovTrack / Congress.gov / OpenStates / FEC / FollowTheMoney. Phases B–E.
- LLM issue-tagging logic. Phase D.
- The `/api/alignment` endpoint or any app-side cutover. Phase F.
- Spanish path content.

### Phase A constraints

- Do NOT touch `src/components/`, `src/app/api/chat/route.ts`, `docs/BALLOT_PROMPT.md`, or any v2 UI. The schema and DB layer are isolated.
- Do NOT add scorecard per-vote tables (forbidden per plan; cite-don't-republish).
- Do NOT use Vercel Postgres tooling — Neon directly via `@neondatabase/serverless`.
- Do NOT introduce Prisma or Kysely — Drizzle only.
- Do NOT commit any real Neon connection string or API key. Secrets via Vercel env + BWS.

## Phases B–G (queued, not in this execution)

Brief reference; full scope expanded in subsequent packet revisions when each phase starts:

- **Phase B — Federal votes ingest** (GovTrack bulk + Congress.gov incremental)
- **Phase C — State votes ingest** (OpenStates, all 50 states matrix)
- **Phase D — LLM issue-tagging** (batch-tag bills against `canonicalIssues.ts`, cache forever in `issue_tags`)
- **Phase E — Donor ingest** (FEC bulk, FollowTheMoney; bucket-categorize per `PATTERN_TAXONOMIES.md`)
- **Phase F — App cutover** (`/api/alignment` endpoint + new `lookup_alignment` Anthropic tool + prompt rewrite to call the tool instead of `web_search`)
- **Phase G — Verification** (E2E with real candidates per scope, cost telemetry comparison, ingest failure-alerting)

Each phase ends with a verifier checkpoint and a commit + push. Orchestrator pauses for user sign-off before the next phase starts.

## Notes — Phase A subagent execution

Single agent for Phase A — the work is tightly scoped (DB scaffolding, no business logic, no v2 surface impact). Then verifier.

The agent should:
1. Read this packet first.
2. Read `src/lib/server/durable-store.ts` for the defensive-failure pattern.
3. Read `.github/workflows/deploy.yml` for the BWS secret-pull idiom.
4. Read `package.json` and decide on exact pinned versions for the three new deps (latest stable as of 2026-05-09).
5. Implement the scope above. Do not auto-run `drizzle-kit generate` if it requires a live `DATABASE_URL`; if it does, leave a clear runnable command in the report and skip that step locally.
6. Run lint/test/build before reporting.
7. Document any decisions made (e.g., did `drizzle-kit generate` need a live DB? did the smoke script need a connection-string fallback? Are the workflow files runnable without the actual ingest scripts being implemented?).
