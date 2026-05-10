# Work Packet: launch-vote-ingestion-pipeline

Status: Phase C ready (Phases A–B landed; Phases D–G queued, gated on phase-by-phase verifier checkpoints)
Owner: orchestrator (Claude Opus, this session) → worker subagents (Sonnet)
Source: `/Users/Muxin/.claude/plans/am-running-e2e-jaunty-crab.md` (approved Packet 6 plan).
Branch: launch/production

## Intent

Replace the per-session LLM `web_search` path for alignment scoring with a deterministic backend lookup against pre-tagged votes ingested from public official sources. The structured `[ALIGNMENT_SCORES]` block schema and all v2 UI stay; only the source of truth flips.

Slice picked: **Packet 6.1 = federal + all 50 states**, with empty-state UX when the backend has no data for a (candidate, canonical issue) pair. Multi-week work, executed across seven phases (A–G) that each land green.

Provisioning: Neon Postgres + OpenStates API key are live in Vercel + Bitwarden Secrets Manager.

## Phase A — Foundation (shipped)

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
  - `issue_tags` — id (uuid PK), bill_id FK, canonical_issue (text — joins to `src/lib/canonicalIssues.ts` ids), stance_lens (text: `in_favor`/`opposed` describing what voting yea on this bill _means_ for the issue), tagger_version (text: e.g., `claude-opus-4-7-2026-05-09`), tagger_confidence (numeric 0-1 nullable), tagged_at. Unique index on `(bill_id, canonical_issue)`.
  - `donor_aggregates` — id (uuid PK), candidate_id FK, election_cycle (text: e.g., `2026`), bucket_label (text — joins to donor bucket vocabulary in `PATTERN_TAXONOMIES.md`), amount_total (numeric), source (text), source_url, raw_metadata (jsonb), inserted_at. Unique index on `(candidate_id, election_cycle, bucket_label)`.
  - `scorecard_meta` — id (text PK), name, url, partisan_lean (text: `partisan`/`nonpartisan`/`mixed`), contact (text nullable), notes (text nullable). **No per-vote records here.** This is metadata only; per-vote scorecard tags are fetched on-demand later (Packet 6.2+).

  Define indexes:

  - `votes(candidate_id, vote_date)` for date-range queries on a candidate's record.
  - `votes(bill_id)` for joining.
  - `issue_tags(canonical_issue)` for the alignment lookup query.

- `db/client.ts` — Neon serverless client wrapper. Reads `DATABASE_URL` from env. Mirrors the defensive pattern in `src/lib/server/durable-store.ts`: returns a working client when env is set, returns a typed sentinel (or throws a specific error the route can catch) when not. Export a `getDb()` function.

- `drizzle.config.ts` — Drizzle Kit config pointing at `db/schema.ts`, output to `db/migrations/`, dialect: `postgresql`.

- `db/migrations/` — Drizzle generated migrations. Generate the initial migration via `drizzle-kit generate` and commit it.

- `.github/workflows/ingest-federal.yml` _(skeleton — no real ingest yet)_ — cron `0 7 * * 0` (Sunday 7am UTC), pulls BWS secrets, runs a no-op `node scripts/ingest/federal-votes.ts` placeholder script that just logs "skeleton; no-op in Phase A." Verifies the workflow itself runs and connects to Neon successfully (read schema_migrations table; no writes).

- `.github/workflows/ingest-states.yml` _(skeleton)_ — matrix workflow over the 6 states we have fixtures for (TX, CA, NY, FL, GA, NC) — easy starting point; the matrix expands to all 50 in Phase C. Same no-op script pattern.

- `.github/workflows/ingest-tag-bills.yml` _(skeleton)_ — runs after the ingest workflows complete. No-op in Phase A.

- `scripts/ingest/federal-votes.ts`, `scripts/ingest/state-votes.ts`, `scripts/ingest/tag-bills.ts` _(skeleton)_ — each: load env, connect to Neon via `db/client.ts`, log a "Phase A skeleton" message, exit 0. Phases B–E populate them.

- `scripts/ingest/_smoke.ts` — connects to Neon, inserts a single test row into `bills`, queries it back, deletes it, exits with the result. Used by Phase A verification + as a CI smoke check.

**Modified files:**

- `package.json` — add deps + a new script `db:generate` (drizzle-kit generate), `db:migrate` (drizzle-kit migrate), `db:smoke` (node scripts/ingest/\_smoke.ts).
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

## Phase B — Federal votes ingest (shipped)

### Intent

Replace the Phase A federal no-op with a deterministic ingest of federal House and Senate roll-call votes from public source data, so the backend alignment store has real federal voting records available before state ingest, issue tagging, donor ingest, and app cutover.

### Original User Intent

Continue voter-choice Packet 6 backend ingestion pipeline on `launch/production`, after Neon schema smoke passed. Phase B should ingest Federal House + Senate roll-call votes from GovTrack JSON data plus Congress.gov for canonical bill text/policy-area tags where available; backfill one previous Congress for incumbents; add `pg` as a dev dependency so future `drizzle-kit migrate` works; run lint/test/build; use subagents for execution and a separate verifier; commit, push, and pause before Phase C.

### Intent Interpretation

This phase populates the existing Phase A `candidates`, `candidate_offices`, `bills`, and `votes` tables only. It does not classify canonical issues, compute alignment scores, call the app, ingest states, ingest donors, or republish advocacy scorecard material. Bill metadata should be enough to support later Phase D tagging: title, summary, source URL, jurisdiction, introduced date, and raw source metadata including GovTrack subjects/top term and Congress.gov policy area when available.

### Business Logic

Rules:

- Preserve no-recommendation discipline: ingestion stores factual public records only.
- Store one vote row per `(bill_id, candidate_id)` because the Phase A schema intentionally has a unique index there; if multiple roll calls relate to the same bill and candidate, keep the latest vote date deterministically and retain source details in `raw_metadata`.
- Candidate IDs are stable federal IDs prefixed with `federal-` and backed by Bioguide when available.
- Vote values normalize to `yea`, `nay`, `present`, `absent`, or `not_voting`.
- Ingest must be idempotent: reruns update existing candidates/bills and do not duplicate votes.
- Cite source URLs; do not store secrets or log connection strings/API keys.

Assumptions:

- Current Congress plus one previous Congress is enough for the Phase B incumbent backfill.
- GovTrack JSON is the primary source for roll-call records. Live verification on 2026-05-10 showed the old `/data/.../data.json` bulk URLs now 404, while `https://www.govtrack.us/api/v2` still returns vote and member-vote JSON.
- If Congress.gov enrichment is unavailable or rate-limited, the ingest still succeeds with GovTrack bill metadata.
- The workflow does not need `OPENSTATES_API_KEY` for federal ingest.

Out of scope:

- State ingestion and all-50-state workflow expansion.
- LLM issue tagging and writes to `issue_tags`.
- Donor ingest and writes to `donor_aggregates`.
- `/api/alignment`, Anthropic tool calls, prompt rewrites, or v2 UI changes.
- Advocacy scorecard per-vote data.
- Spanish path changes.

### Commercial Readiness

Applicability: launch.

Lanes in scope:

- API/contracts: tolerate missing/partial public source data without fabricating records.
- Persistence/recovery: idempotent upserts into Neon.
- Deployment/config: GitHub Actions has the federal ingest command and optional Congress.gov secret only where needed.
- Observability/support: ingest logs factual counts, skipped records, and source failures without sensitive values.

User decisions needed: none for Phase B after `[smoke] PASS` confirmation.

### Operational Reproducibility

Setup:

- `npm install` to pick up the new exact `pg` dev dependency.
- Local dry run without DB should fail clearly when `DATABASE_URL` is missing.

Configuration:

- Required for real ingest: `DATABASE_URL`.
- Optional for Congress.gov enrichment: `CONGRESS_GOV_API_KEY` from BWS secret `306d6600-cd70-492a-9b46-b44600383766`.
- Optional controls: `CONGRESS`, `BACKFILL_CONGRESSES`, `GOVTRACK_BASE_URL`, `GOVTRACK_PAGE_SIZE`, `CONGRESS_GOV_BASE_URL`.

Provider setup:

- No new provider. Uses existing Neon and existing BWS.

Infrastructure/deployment:

- Update `.github/workflows/ingest-federal.yml` to run the real federal ingest and pull the optional Congress.gov key.
- Do not add DATABASE_URL or OPENSTATES_API_KEY pulls to `.github/workflows/deploy.yml` in this phase.

Database migrations:

- No schema migration expected for Phase B.
- Add `pg` as an exact pinned dev dependency so future `npm run db:migrate` uses a websocket-capable Postgres driver instead of the Neon HTTP limitation observed in Phase A.

Manual steps:

- None for this phase; Neon schema was manually applied and smoke-confirmed before execution.

Verification:

- Unit tests for federal ingest parsing/normalization/upsert planning with fixtures and no live network or DB.
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run db:migrate` without `DATABASE_URL` may be checked only for clear local failure; do not attempt live migration.

Critical logic trigger: persistence/integration.

### Scope

Touch:

- `.ai/work-packets/launch-vote-ingestion-pipeline.md`
- `package.json`
- `package-lock.json`
- `scripts/ingest/federal-votes.ts`
- optional helper/test files under `scripts/ingest/`
- `.github/workflows/ingest-federal.yml`

Do not touch:

- `src/components/`
- `src/app/api/chat/route.ts`
- `docs/BALLOT_PROMPT.md`
- `docs/BALLOT_PROMPT_ES.md`
- `scripts/ingest/state-votes.ts` except if a shared helper requires a type-only import adjustment
- `scripts/ingest/tag-bills.ts`
- `.github/workflows/deploy.yml`

### Ownership Audit

Concern: federal vote and bill metadata ingestion into the Packet 6 backend store.
Existing owner: `scripts/ingest/*.ts`, `db/schema.ts`, `db/client.ts`, `db/migrations/`, `drizzle.config.ts`, and `.github/workflows/ingest-*.yml` per `docs/ai-coding-practices/source-of-truth-map.md`.
Neighboring owners:

- `src/lib/canonicalIssues.ts` owns issue IDs only; Phase B may preserve source subjects/policy areas but must not classify canonical issues.
- `docs/SOURCE_TIERS.md` owns source-tier vocabulary, not ingest code.
- `docs/PATTERN_TAXONOMIES.md` owns donor/pattern vocabularies, not federal vote ingestion.
- `/api/alignment` does not exist yet and is Phase F.
  Files/modules/docs inspected:
- `.ai/work-packets/launch-vote-ingestion-pipeline.md`
- `.ai/project-briefs/voter-choice-alignment-engine-v2.md`
- `docs/ai-coding-practices/source-of-truth-map.md`
- `docs/ai-coding-practices/guardrails/ownership-discipline.md`
- `db/schema.ts`
- `db/client.ts`
- `scripts/ingest/federal-votes.ts`
- `.github/workflows/ingest-federal.yml`
- `src/lib/canonicalIssues.ts`
  Reuse/edit targets:
- Replace the Phase A no-op `scripts/ingest/federal-votes.ts`.
- Add local helpers/tests under `scripts/ingest/` only if they reduce real duplication.
- Update the existing federal ingest workflow.
  New owner needed: no.
  Overlap/bloat risks:
- Creating a second federal ingestion path outside `scripts/ingest/`.
- Tagging canonical issues in Phase B before the Phase D owner exists.
- Adding app-side reads before Phase F.
- Duplicating source-tier or canonical-issue vocabularies in code.
  Recommendation: implement a small, testable federal ingest module with exported pure parsing/normalization functions and a CLI `main()` guarded so tests can import safely.
  Execution constraints:
- Do not invent votes, candidates, bill metadata, or issue tags.
- Do not require Congress.gov key for a successful GovTrack ingest.
- Do not log secrets.
- Keep writes idempotent.

### Acceptance Criteria

- `scripts/ingest/federal-votes.ts` fetches GovTrack roll-call/member-vote JSON for House and Senate across current Congress plus one previous Congress by default and upserts rows into `candidates`, `candidate_offices`, `bills`, and `votes`.
- The ingest derives federal candidate IDs from Bioguide IDs where present, stores source IDs and raw vote/member metadata, and sets `jurisdiction` to `federal-house` or `federal-senate`.
- The ingest stores bill rows for bill-related roll calls, using GovTrack bill data as the base and best-effort Congress.gov enrichment when `CONGRESS_GOV_API_KEY` is present.
- The ingest skips non-bill votes with explicit counts in logs and without failing the job.
- Reruns are idempotent and use deterministic conflict handling for candidates, offices, bills, and votes.
- `.github/workflows/ingest-federal.yml` runs the real ingest and pulls the optional Congress.gov BWS secret without changing `deploy.yml`.
- `package.json` and `package-lock.json` include exact pinned `pg` as a dev dependency.
- Focused tests cover vote normalization, bill/candidate ID construction, non-bill skip behavior, and idempotent row planning.

### Verification

- `npm run lint`
- `npm run test`
- `npm run build`
- Review `git diff` for no secrets, no `deploy.yml` changes, no app/UI/prompt changes, and no writes outside the Phase B owner.

### Evidence Plan

Visual evidence: not applicable.
Behavior evidence: test output names for federal ingest parsing/planning and command output showing lint/test/build pass.
Business logic evidence: fixture with bill vote + non-bill vote; expected normalized rows/skips; observed test assertions.
Persistence evidence: code review of Drizzle `onConflictDoUpdate` paths and unique keys; live Neon ingest not required locally because secrets are unavailable in the harness.
Auth/security evidence: diff review confirms no secret values, only BWS UUID references already approved for ingestion workflows plus optional Congress.gov UUID.
Commercial readiness evidence: workflow logs are count-based and secret-safe; ingest succeeds without optional Congress.gov key.
Operational evidence: `pg` added exactly pinned; `db:migrate` path repaired for future schema changes.
Integration evidence: source clients target GovTrack bulk JSON and Congress.gov API endpoints; tests mock network and DB boundaries.
Regression evidence: lint/test/build command outputs.
Proof standard: a reviewer can see the real ingest path, idempotent write strategy, optional enrichment behavior, and green checks without relying on a live secret.
Non-proof: a script that logs success without performing writes; tests that only assert function existence; hardcoded fixture rows presented as actual ingest.

### Anti-Solutions

- Using LLMs to infer vote stance or canonical issue tags in Phase B.
- Hardcoding a small list of bills, candidates, sessions, or roll calls as production data.
- Treating Congress.gov enrichment failure as fatal when GovTrack data is sufficient.
- Writing a second schema or a custom persistence layer outside Drizzle.
- Adding client-facing alignment reads or changing the ballot prompt.
- Adding BWS UUID pulls to `.github/workflows/deploy.yml`.
- Logging `DATABASE_URL`, `CONGRESS_GOV_API_KEY`, or raw environment dumps.

### Notes

Primary source shape references:

- GovTrack vote/member-vote API default: `https://www.govtrack.us/api/v2`.
- Historical GovTrack/unitedstates generated vote JSON path, if a mirror is later configured: `data/[congress]/votes/[session]/[chamber][number]/data.json`.
- GovTrack/unitedstates bill JSON path: `data/[congress]/bills/[bill_type]/[bill_type][number]/data.json`.
- Congress.gov enrichment should use the official bill endpoint only when the optional API key is configured.

## Phase C — State votes ingest (current execution)

### Intent

Replace the Phase A state no-op with a deterministic OpenStates ingest path for state legislative bills and recorded votes, covering all 50 states while allowing a six-state canary/manual run for confidence.

### Original User Intent

Proceed with Packet 6 Phase C after Phase B. The user does not care about the exact rollout mechanics, but wants confidence and wants to ensure all 50 states are definitely covered. If starting with six states helps create the template workflow confidently, start with six; otherwise choose the safest execution pattern.

### Intent Interpretation

Phase C should ship generic state ingest code that works for any state abbreviation and a GitHub Actions workflow that has all 50 states in its executable matrix. The workflow may include a canary/scope control so operators can manually run the original six-state subset before running all 50, but the committed production workflow must not leave the product at six-state-only coverage.

This phase populates the existing Phase A `candidates`, `candidate_offices`, `bills`, and `votes` tables only. It does not classify canonical issues, compute alignment scores, call the app, ingest donors, or republish advocacy scorecard material.

### Business Logic

Rules:

- Preserve no-recommendation discipline: ingestion stores factual public records only.
- State candidate IDs are stable OpenStates IDs prefixed with `openstates-`.
- State bill IDs use the existing Phase A format: `openstates-<safe-source-id>`.
- State jurisdictions are `state-XX-house` or `state-XX-senate` when chamber can be determined; otherwise skip the vote with a counted warning instead of inventing chamber semantics.
- Vote values normalize to `yea`, `nay`, `present`, `absent`, or `not_voting`.
- Ingest must be idempotent: reruns update existing candidates/bills and do not duplicate votes.
- Because the Phase A schema intentionally has unique `(bill_id, candidate_id)`, if the same candidate has multiple recorded votes on the same bill, keep the latest vote date deterministically and retain source details in `raw_metadata`.
- Cite source URLs; do not store secrets or log connection strings/API keys.

Assumptions:

- OpenStates API v3 is the source for state legislative data. Official docs identify `https://v3.openstates.org/` as the root URL, require API keys via `X-API-KEY` or `apikey`, and expose `/jurisdictions`, `/people`, `/bills`, and bill detail endpoints with `votes` includes.
- Current active/recent legislative sessions plus one previous regular session per state is enough for Phase C backfill.
- OpenStates data completeness varies by state. Missing votes, unresolved voters, or chambers should be counted and skipped rather than fabricated.

Out of scope:

- Federal ingest changes beyond shared test/config compatibility.
- LLM issue tagging and writes to `issue_tags`.
- Donor ingest and writes to `donor_aggregates`.
- `/api/alignment`, Anthropic tool calls, prompt rewrites, or v2 UI changes.
- Advocacy scorecard per-vote data.
- Spanish path changes.

### Commercial Readiness

Applicability: launch.

Lanes in scope:

- API/contracts: tolerate missing/partial OpenStates data without fabricating records.
- Persistence/recovery: idempotent upserts into Neon.
- Deployment/config: GitHub Actions can run all 50 states and can run a six-state canary/manual subset.
- Observability/support: ingest logs factual counts, skipped records, and source failures without sensitive values.

User decisions needed: none. User delegated execution mechanics and confirmed all-50-state coverage is the priority.

### Operational Reproducibility

Setup:

- Existing `npm install` path; no new dependency expected.
- Local dry run without `DATABASE_URL` or `OPENSTATES_API_KEY` should fail clearly.

Configuration:

- Required for real ingest: `DATABASE_URL`, `OPENSTATES_API_KEY`.
- Required per workflow leg: `STATE`.
- Optional controls: `OPENSTATES_BASE_URL`, `OPENSTATES_PER_PAGE`, `OPENSTATES_SESSION_COUNT`, `OPENSTATES_SESSION_IDS`, `OPENSTATES_MAX_BILLS`.

Provider setup:

- No new provider. Uses existing Neon and existing OpenStates key in BWS secret `85bad136-3cbc-4062-9ccc-b4460037de19`.

Infrastructure/deployment:

- Update `.github/workflows/ingest-states.yml` to run the real state ingest.
- Workflow must include all 50 state abbreviations in an executable path.
- Workflow may include `scope=canary|all|single` controls, with canary = `TX, CA, NY, FL, GA, NC`.
- Do not add DATABASE_URL or OPENSTATES_API_KEY pulls to `.github/workflows/deploy.yml` in this phase.

Database migrations:

- No schema migration expected for Phase C.

Manual steps:

- None for this phase.

Verification:

- Unit tests for OpenStates parsing/normalization/session selection/upsert planning with fixtures and no live network or DB.
- `npm run lint`
- `npm run test`
- `npm run build`
- Review `git diff` for no secrets, no `deploy.yml` changes, no app/UI/prompt changes, and no writes outside the Phase C owner.

Critical logic trigger: persistence/integration.

### Scope

Touch:

- `.ai/work-packets/launch-vote-ingestion-pipeline.md`
- `scripts/ingest/state-votes.ts`
- optional helper/test files under `scripts/ingest/`
- `.github/workflows/ingest-states.yml`
- `vitest.config.ts` only if needed to include new tests; it already includes `scripts/ingest/**/*.test.ts`.

Do not touch:

- `src/components/`
- `src/app/api/chat/route.ts`
- `docs/BALLOT_PROMPT.md`
- `docs/BALLOT_PROMPT_ES.md`
- `scripts/ingest/tag-bills.ts`
- `.github/workflows/deploy.yml`

### Ownership Audit

Concern: state legislative vote and bill metadata ingestion into the Packet 6 backend store.
Existing owner: `scripts/ingest/*.ts`, `db/schema.ts`, `db/client.ts`, `db/migrations/`, `drizzle.config.ts`, and `.github/workflows/ingest-*.yml` per `docs/ai-coding-practices/source-of-truth-map.md`.
Neighboring owners:

- `src/lib/canonicalIssues.ts` owns issue IDs only; Phase C may preserve OpenStates subjects but must not classify canonical issues.
- `docs/SOURCE_TIERS.md` owns source-tier vocabulary, not ingest code.
- `docs/PATTERN_TAXONOMIES.md` owns donor/pattern vocabularies, not state vote ingestion.
- `/api/alignment` does not exist yet and is Phase F.

Files/modules/docs inspected:

- `.ai/work-packets/launch-vote-ingestion-pipeline.md`
- `.ai/project-briefs/voter-choice-alignment-engine-v2.md`
- `docs/ai-coding-practices/source-of-truth-map.md`
- `db/schema.ts`
- `db/client.ts`
- `scripts/ingest/state-votes.ts`
- `.github/workflows/ingest-states.yml`
- OpenStates API v3 official docs and OpenAPI schema

Reuse/edit targets:

- Replace the Phase A no-op `scripts/ingest/state-votes.ts`.
- Add local helpers/tests under `scripts/ingest/` only if they reduce real duplication.
- Update the existing state ingest workflow.

New owner needed: no.

Overlap/bloat risks:

- Creating a second state ingestion path outside `scripts/ingest/`.
- Tagging canonical issues in Phase C before the Phase D owner exists.
- Adding app-side reads before Phase F.
- Duplicating source-tier or canonical-issue vocabularies in code.

Recommendation: implement a small, testable state ingest module with exported pure parsing/normalization/session-selection helpers and a CLI `main()` guarded so tests can import safely.

Execution constraints:

- Do not invent votes, candidates, bill metadata, sessions, or issue tags.
- Do not log secrets.
- Keep writes idempotent.
- Do not leave workflow coverage at six states only.

### Acceptance Criteria

- `scripts/ingest/state-votes.ts` fetches OpenStates bills with vote data for the requested state and selected sessions, then upserts rows into `candidates`, `candidate_offices`, `bills`, and `votes`.
- The ingest derives state candidate IDs from OpenStates person IDs where present, stores source IDs and raw vote/member metadata, and sets `jurisdiction` to `state-XX-house` or `state-XX-senate`.
- The ingest stores bill rows using OpenStates bill data, including title, subjects/abstracts/sources in `raw_metadata`, source URL, state jurisdiction, and first action date where present.
- The ingest skips votes without resolvable bill, chamber, date, voter, or vote option with explicit counts in logs and without failing the whole state job.
- Reruns are idempotent and use deterministic conflict handling for candidates, offices, bills, and votes.
- `.github/workflows/ingest-states.yml` runs the real ingest, pulls existing BWS `DATABASE_URL` and `OPENSTATES_API_KEY`, and includes an all-50-state executable matrix plus canary/manual controls.
- Focused tests cover vote normalization, state/jurisdiction mapping, bill/candidate ID construction, skip behavior, session selection, and idempotent latest-vote planning.

### Verification

- `npm run lint`
- `npm run test`
- `npm run build`
- Review `git diff` for no secrets, no `deploy.yml` changes, no app/UI/prompt changes, and no writes outside the Phase C owner.

### Evidence Plan

Visual evidence: not applicable.
Behavior evidence: test output names for state ingest parsing/planning and command output showing lint/test/build pass.
Business logic evidence: fixture with bill vote + unresolved-voter/chamber cases; expected normalized rows/skips; observed test assertions.
Persistence evidence: code review of Drizzle `onConflictDoUpdate` paths and unique keys; live Neon ingest not required locally because secrets are unavailable in the harness.
Auth/security evidence: diff review confirms no secret values, only existing BWS UUID references in ingestion workflows.
Commercial readiness evidence: workflow logs are count-based and secret-safe; all 50 states are present in workflow execution path.
Operational evidence: workflow supports canary/manual run plus all-state run.
Integration evidence: source clients target OpenStates API v3 endpoints; tests mock network and DB boundaries.
Regression evidence: lint/test/build command outputs.
Proof standard: a reviewer can see the real ingest path, all-state workflow coverage, idempotent write strategy, and green checks without relying on a live secret.
Non-proof: a script that logs success without performing writes; tests that only assert function existence; hardcoded fixture rows presented as actual ingest; workflow limited to six states only.

### Anti-Solutions

- Using LLMs to infer vote stance or canonical issue tags in Phase C.
- Hardcoding a small list of states, bills, candidates, sessions, or votes as production data.
- Treating missing OpenStates vote/voter/chamber data as permission to fabricate records.
- Writing a second schema or a custom persistence layer outside Drizzle.
- Adding client-facing alignment reads or changing the ballot prompt.
- Adding BWS UUID pulls to `.github/workflows/deploy.yml`.
- Logging `DATABASE_URL`, `OPENSTATES_API_KEY`, or raw environment dumps.

### Notes

Primary source shape references:

- OpenStates API v3 root: `https://v3.openstates.org/`.
- API key accepted via `X-API-KEY` header or `apikey` query parameter.
- `/jurisdictions/{jurisdiction_id}?include=legislative_sessions` provides session metadata.
- `/bills?jurisdiction=<jurisdiction>&session=<session>&include=votes&include=sources&include=abstracts` returns bill/vote records.

## Phases D–G (queued, not in this execution)

Brief reference; full scope expanded in subsequent packet revisions when each phase starts:

- **Phase B — Federal votes ingest** (GovTrack JSON + Congress.gov incremental)
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
