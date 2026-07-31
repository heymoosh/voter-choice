# Fix the state ingest, refresh the local dump, and run bill tagging with no paid API

## Context

Two things are broken; one correction to what I told you earlier; and an adversarial review has
since overturned several parts of my first draft. This version reflects the review.

**I got the ingest diagnosis wrong.** It isn't your database dropping connections — it's Open
States' own servers. Their gateway times out at 60 seconds and returns 502s and 504s, and
`fetchOpenStatesJson` (`scripts/ingest/state-votes.ts:485-536`) retries **only HTTP 429**. Anything
else kills that state's run instantly. `scripts/ingest/federal-votes.ts:1226` already has
`RETRYABLE = new Set([502, 503, 504])` plus a network catch; the state script never got it.
Verified across 22 failed jobs: every failure is a 502, 504, or bare `terminated`. Zero database
errors.

**It has been failing for six weeks, not six days.** Roughly 30 of the last 45 scheduled runs
failed — 6/17 through 7/31 with gaps. The alert that should have said so has a literal placeholder
where a secret ID belongs (`bws secret get <INGEST_FAILURE_WEBHOOK_BWS_SECRET_ID>`); bash treats the
`<` as a redirect, `set +e` swallows it, and the step prints "skipping alert" and exits clean.

**Tagging was deliberately killed on 2026-06-28**, not neglected — the weekly job was draining the
front-end API budget. 29,657 bills untagged; 61 arrived last week, none tagged. It must run on the
subscription, never metered.

**And the metered drain button is still armed.** `.github/workflows/ingest-tag-bills.yml` is live on
`main` with `workflow_dispatch` enabled, and `scripts/ingest/tag-bills-batch.ts:46` sets
`FETCH_LIMIT = 65_000` with no cap of any kind. One manual trigger submits all 29,657 bills to the
Batch API. Batch bills on *completion*, so cancelling the collect step doesn't stop the spend.
Disarming that is now the first task, not a follow-up card.

Decisions made: keep the free Open States API daily *and* add a bulk-dump backfill; run tagging as a
`/schedule` cloud routine; refresh the local May-2026 dump to current, scripted, without holding two
copies at once.

---

## Phase 0 — Stop the bleeding, then get visibility

### 0A. Disarm the metered path (do this first, it is a live financial risk)

In `.github/workflows/ingest-tag-bills.yml`: delete the `ANTHROPIC_VOTER_API` Bitwarden block and
replace both `tag-bills-batch.ts` steps with a hard failure pointing at the new routine doc. Add
`if (!explicitLimit) throw` to `tag-bills-batch.ts` so no future caller can run it uncapped.

Also settle the backlog card's first bullet, which was never done: six non-app scripts read
`ANTHROPIC_VOTER_API` (`tag-bills.ts`, `tag-bills-batch.ts`, `classify-bills.ts`,
`_classify-batch.ts`, `generate-rationales.ts`, `summarize-bills.ts`). Only one is scheduled, but
all are one `npx tsx` away. Two app paths — `src/lib/server/extract-vision.ts` and
`src/app/api/research-candidate/route.ts` — are metered but arguably not "front-end user chat";
they need an explicit ruling from you rather than a silent assumption.

### 0B. Know when things stop

**Primary signal is job health, not data freshness.** The review killed my first design here:
`bills.inserted_at` only moves when *new* rows arrive, so a broken job and a quiet August produce
an identical signal. Worse, real inter-arrival gaps on healthy days hit 47.6–49.6h six times in
July alone — a 36h threshold pages on all of them, and alert fatigue rebuilds the exact silence
we're fixing.

**New `scripts/ops/check-ingest-freshness.ts`** — copy the structure of
`scripts/ops/check-stock-watcher-liveness.ts` (pure/impure split, exported `computeExitCode`,
`main(): Promise<number>`, `isInvokedDirectly()` guard, sibling test).

- **Primary:** poll the last N scheduled runs of `ingest-states.yml` via the Actions API and fail on
  repeated `conclusion: failure`. This catches a broken job regardless of whether bills were due.
- **Secondary (loose):** `hoursSinceLastBillInserted` / `hoursSinceLastVoteInserted` at **≥ 60h**
  (two consecutive empty daily runs is normal at 10 states/day).
- **Tags:** `hoursSinceLastTagWritten` — read `issue_tags.tagged_at` (there is no `inserted_at` on
  that table). Derive the threshold as `2 × cadence + slack`, not a constant, so it stays correct
  when tagging goes weekly.
- **`stalled-pipeline`:** bills arriving while no tag has been written. Fires today (61 bills in 7d,
  last tag 1,134h ago), which is its own acceptance test.

`bills.inserted_at` and `votes.inserted_at` both exist, are `NOT NULL DEFAULT now()`, and have zero
nulls in prod — verified.

**New `.github/workflows/check-ingest-freshness.yml`**, cron `0 12 * * *`.

**Alerting — deduped GitHub issue, done properly.** My "GITHUB_TOKEN can't be misconfigured" claim
was wrong twice over. It needs `permissions: { contents: read, issues: write }` (the template
workflow declares none, and every other workflow declares `contents: read`, so copying as-is 403s).
And a bot-authored issue does not subscribe *you* — day one fires via repo-watch, day two onward is
silent. So: set `assignees: [heymoosh]` on creation **and** `@heymoosh` in every comment body. No
`set +e`, no `continue-on-error` — if the alert can't send, the job must go red.

Retrofit the same alert into `ingest-states.yml` as a single `needs: ingest` + `if: failure()`
**summary job**, not inside the 50-way matrix (or it fires ten times on a bad day).

---

## Phase 1 — The ingest fix

### Honest expectations first

The retry does **not** make 7/26 a clean run. That outage was continuous for at least eight minutes
across all ten states; a 4-attempt retry with a 60s abort gives roughly a 4-minute window. Expected
real outcome: **an all-ten failure becomes a four-to-six state failure.** The tail is rescued, the
head is not. That is still a large win across the 30 failed runs, but do not sell it as immunity.

### 1A. `scripts/ingest/_retry.ts` (new)

No reusable retry exists anywhere in the repo — 8+ duplicated private `sleep()` copies and 4 private
fetch-shaped loops. Put it in `scripts/ingest/`; `vitest.config.ts` already globs that path.

```ts
export async function withRetry<T>(fn: (attempt: number) => Promise<T>, o: RetryOptions): Promise<T>;
export function isTransientNetworkError(error: unknown): boolean;   // walks error.cause, depth ≤ 8
export function isRetryableHttpStatus(status: number): boolean;     // 408,425,429,500,502,503,504,522,524
export function flattenErrorChain(error: unknown, maxDepth?): string;
export function sleep(ms: number): Promise<void>;
```

`RetryOptions`: `{ label, op, attempts=4, baseDelayMs=1000, maxDelayMs=30_000,
totalBudgetMs=720_000, jitter=true, isRetryable?, sleep? }`. The **wall-clock budget** matters more
than the attempt count (see 1G) and the injectable `sleep` lets tests run four attempts instantly.

The transient predicate is where the repo currently gets it wrong: the de-facto regex
`/fetch failed|ECONNRESET|ETIMEDOUT/i` matches **none** of the observed failures. Match codes *and*
messages at every level of the cause chain, walking `AggregateError.errors` too — codes
`UND_ERR_SOCKET`, `UND_ERR_CONNECT_TIMEOUT`, `UND_ERR_HEADERS_TIMEOUT`, `UND_ERR_BODY_TIMEOUT`,
`ECONNRESET`, `ECONNREFUSED`, `ETIMEDOUT`, `EPIPE`, `EAI_AGAIN`; messages
`/terminated|other side closed|socket hang up|premature close|fetch failed|Connect Timeout|Headers
Timeout|Body Timeout|The operation was aborted/i`.

### 1B. Fix `fetchOpenStatesJson` — the actual fix

Modify `scripts/ingest/state-votes.ts:485-536`.

1. Add `RETRYABLE_STATUS = new Set([500, 502, 503, 504])` as a branch **alongside** the existing 429
   handler — keep them separate; rate-limit and gateway backoff want different curves.
2. Wrap `await fetcher(...)` **and** `await response.json()` in try/catch, retrying on
   `isTransientNetworkError`. Body reading must be inside the retried unit.
3. `signal: AbortSignal.timeout(60_000)`, env-overridable. **Construct it inside the attempt loop** —
   `AbortSignal.timeout()` counts from creation, so a hoisted signal would abort during the existing
   429 backoff sleep. I originally proposed 45s; the review measured healthy calls at 15–25s but
   degraded-yet-successful calls at 23–25s, so 45s is only ~1.8× the degraded tail. 60s is safer and
   the saving was never the point (504s cluster at 60.3–60.5s, so aborting saves ~25%, not half; the
   502s return in 10–55s where it saves nothing).
4. Log `fetch_attempt`/`fetch_done` with `response_ms` and the flattened cause chain.

### 1C. Retry the jurisdiction call, not just sessions

My first draft proposed per-session fault isolation and claimed it would convert "most" failures into
partial successes. **Wrong target.** `ingestStateVotes` fetches `/jurisdictions` at line 383,
*outside* the session loop, and **12 of 22 sampled failures died there before a single session
existed** (8 of 10 on 7/26; both on 7/29; AR and CT on 7/30). Per-session isolation would have saved
none of them.

So: 1B's retry (which covers the jurisdiction call) is the load-bearing change. Per-session isolation
is still worth doing — wrap each session's bill loop, log `session_failed`, add `sessionsFailed` to
`PlannedStateRows["counts"]`, throw only if every session failed and the plan is empty — but bill it
honestly at roughly 45% of observed failures, not "most".

### 1D. Free 40% request reduction

`fetchOpenStatesBills` (`state-votes.ts:436-462`) checks `yielded >= maxBills` *before* incrementing.
After page 1 yields exactly 20 results the loop exits, but `hasNextPage` is true, so **page 2 is
fetched and entirely discarded** — 20 of the 50 daily requests wasted, and 20 extra chances to draw
a 502. Hoist the budget check into the `while` condition. Drops the day from 50 to 30 requests.

(Related: the rate-limit worry is unfounded. Each state makes 5 requests, not the ~20 the workflow
comment claims; ten states = 50/day against a 250 cap, and zero `rate_limited` lines appear in any
sampled run. Retries cannot convert a partial outage into a rate-limit outage.)

### 1E. Error messages

`safeErrorMessage` (`state-votes.ts:1201`) discards `.cause`, which is why the logs were
undiagnosable. Replace its body with `flattenErrorChain(error)`, keeping the name.

### 1F. Cut from this pass

Do **not** migrate `federal-votes.ts` or `state-votes-from-dump.ts` onto `withRetry`, and do **not**
add retry to `writeStatePlan` yet. `federal-votes.ts` already has the retryable set and isn't
failing; the DB was never the failure (zero DB errors in 22 sampled failures). Both are cleanup that
triples the blast radius of the change you need shipped. Same card as the other eight `sleep()`
copies. The 500→250 vote batch tweak goes with them.

### 1G. Timeouts

`timeout-minutes: 25` — which I proposed — is **below the code's existing worst case**. The
untouched 429 branch has `MAX_RETRIES = 8` with backoff doubling to a 5-minute cap: 22.75 min of
sleep plus request time ≈ **28.7 min** for a single request. A step timeout is a hard kill, and
`writeStatePlan` runs once at the very end, so the state would write nothing — exactly the failure
class we're removing. 429s are currently dormant (zero occurrences sampled), so this is latent, not
active.

Use `timeout-minutes: 40`, give `withRetry` a 12-minute per-state wall-clock budget, and drop the
429 `MAX_RETRIES` from 8 to 5.

Note `ingest-states.yml` sets `max-parallel: 2`, not the "6 parallel jobs" the stale comments in
`state-votes.ts:355,479` claim. With 2-way parallelism a bad day's retries stretch workflow
wall-clock ~5×, so a 75-minute run is normal-under-degradation, not a hang.

### 1H. Tests

- **`_retry.test.ts`** — highest-value test here. Include an explicit regression guard asserting the
  old regex does **not** match `"terminated"` while `isTransientNetworkError` does. Plus classification,
  retry-then-succeed, immediate rethrow on non-transient, capped backoff, budget exhaustion, and
  `flattenErrorChain` terminating on a self-referencing cause cycle.
- **`state-votes.retry.test.ts`** — `ingestStateVotes({ db, fetcher, env })` already takes an
  injectable `fetcher`. Cases: 504 twice on `/jurisdictions` then success → run completes; HTTP 400
  → no retry; `terminated` on session A but B succeeds → `sessionsFailed=1` and B's rows written;
  page-2 is never requested once `maxBills` is met.

### 1I. Concurrency

Add `concurrency: { group: openstates-write, cancel-in-progress: false }` to **both** the daily and
the monthly workflow if you want them mutually exclusive — two different group names never interlock,
so my original per-state group provided zero protection against the monthly job. Simpler alternative:
keep per-state grouping for the daily job only, rely on the schedule separation, and delete the
mutual-exclusion rationale. Phase 2's `fill-gaps` semantics make interleaving safe anyway.

---

## Phase 2 — Bulk-dump backfill

### The "one real unknown" is answered — delete the probe

My first draft gated this phase on a `pg_restore -l` probe and warned the schema dump might not be
publicly addressable. Both halves resolved:

- The big archive **is data-only** (only `TABLE DATA` entries in the TOC).
- The schema dump **is** publicly addressable at
  `https://data.openstates.org/postgres/schema/YYYY-MM-schema.pgdump` — 712 KB, HTTP 200,
  regenerated daily, containing `CREATE TABLE` for all nine tables. This is the same file the work
  packet references as a local `2026-05-schema.pgdump` (696 KB); nobody wrote down where it came from.

So the restore is **two** `pg_restore` calls, not one. Reconstructing DDL from `COPY` headers was
never viable anyway — those give column names and order, but no types, keys, or jsonb declarations.

Also: **daily dumps exist** at `postgres/daily/YYYY-MM-DD-public.pgdump` on a ~30-day rolling window.
Source from `daily/` on the day you run. That caps staleness at ~1 day and retires the whole
"up to 45 days stale" framing.

### Restore recipe

The nine tables have deferred FKs to `opencivicdata_division` and `opencivicdata_post`, which are
**not** in the nine — restoring schema-first fires those constraints at each `COPY` commit. And
`pg_restore` does not exit non-zero on data errors without `--exit-on-error`, so a partial failure
would be invisible (which is how the original local restore may have "succeeded").

```
1. pg_restore --section=pre-data   <schema.pgdump>          # tables only, no indexes/FKs
2. pg_restore --data-only --disable-triggers --exit-on-error \
     -t <the nine tables> <public.pgdump>
3. pg_restore --section=post-data -j 4 <schema.pgdump>      # build indexes/constraints once
```

Step 3 ordering is the single biggest lever on restore time: `opencivicdata_personvote` carries six
indexes, and loading 51M rows against live indexes is far slower than building them at the end. Note
`-j 4` buys nothing on the data load (parallelism is per-TOC-entry and one table dominates) — it
helps only `post-data`. Run the load with `PGOPTIONS="-c maintenance_work_mem=2GB -c
synchronous_commit=off"`.

### `fill-gaps` must be column-level, not row-level

Row-level `onConflictDoNothing()` — my original proposal — **cannot fill a gap**. Concrete failure:
the daily API job inserts a bill with `summary IS NULL` because `/bills?include=abstracts` had none;
the dump *has* that abstract; under row-level DO NOTHING the summary is never written. And
`bills.summary` is exactly what Phase 3's tagger reads. The mode was named for a behaviour it didn't
implement.

Use `onConflictDoUpdate` with column-level coalescing:
`summary: sql\`COALESCE(bills.summary, excluded.summary)\``, same for `title`, `introduced_date`,
`raw_metadata`; leave `updated_at` untouched so the verification step means something.

Also fix the votes guard: both scripts use `excluded.vote_date >= votes.vote_date` — **`>=`, not
`>`**. Same-date rows pass and overwrite the API's richer `source_url`/`raw_metadata` with the dump's
thinner payload. Since same-date is the common case, that guard protects almost nothing. Change to
`>` plus a `source` precedence check.

### The `candidate_offices` id mismatch (real bug, currently live)

Both scripts build the office id from
`deterministicUuid(\`${candidateId}:${jurisdiction}:${termStart}:${session?.id ?? "unknown"}\`)` —
but `session.id` means different things:

- API path (`state-votes.ts:947`): OpenStates v3 session objects carry no `id`, so it falls through
  to the **identifier** (`2026`, `104th`, `57th-2nd-regular` — confirmed in live logs).
- Dump path (`state-votes-from-dump.ts:552`): the database **primary key**.

So the ids never collide, and the monthly sweep will **duplicate** `candidate_offices` rather than
upsert them. This is already happening under today's `overwrite` mode. Fix
`state-votes-from-dump.ts:277` to key off `session?.identifier`, add a one-time de-dupe, and add a
test that pushes the same tuple through both paths and asserts equal ids — that test is what should
have caught it. Candidates, bills, and votes do collide correctly; only offices break.

### Workflow

**New `.github/workflows/ingest-states-dump-monthly.yml`**, cron `0 2 15 * *` (or quarterly —
see below), `timeout-minutes: 330` (the 6-hour job cap is confirmed empirically: run 27903170737 was
cancelled at 6h0m20s).

**Do not use a `services:` block.** A service container starts before your first step, so you can't
prepare `/mnt/pgdata` or inspect a failed init. Use an explicit prep step (`mkdir -p /mnt/pgdata`,
`df -h /mnt` and **fail fast** if short) followed by
`docker run -d --name pg -v /mnt/pgdata:/var/lib/postgresql/data postgres:17`, then `docker exec`.
This would be the repo's first container either way. `ubuntu-24.04` ships the pg 16 client, which
refuses the v1.16 archive — the `postgres:17` image is also what makes the restore possible.

Peak `/mnt` usage under this design: dump 10.7 GB + PGDATA ~13 GB + WAL ~3 GB ≈ **27 GB**. GitHub
*documents* only 14 GB of SSD; the ~65 GB at `/mnt` is an undocumented Azure temp-disk artifact that
has changed before. Hence the fail-fast `df`.

Steps: free disk → resolve date → `curl -fL --retry 5 --retry-all-errors -C -` the schema and data
dumps → three-stage restore → `rm` the data dump → `npm ci` → Bitwarden `DATABASE_URL` →
`DUMP_MODE=fill-gaps npx tsx scripts/ingest/state-votes-from-dump.ts` → upload `dump-progress.json`.

Verify downloads by **byte count against the `HEAD` `content-length` only** — the ETag is a
multipart etag (`…-1277`), not an MD5, so it's an equality token, never a checksum.

### Bounding and cadence

`ingestFromDump` (line 665) swallows per-state errors and exits 0 — make it exit non-zero. Add
`DUMP_STATE_LIMIT` / `DUMP_SKIP_STATES`, write `dump-progress.json` after each state (uploaded on
success and failure), seed skips from a prior artifact.

**Recommend quarterly** (`0 2 15 1,4,7,10 *`). Monthly is ~120 GB/yr from a volunteer nonprofit's
bucket. It's CloudFront-fronted so it's cached egress rather than origin load, but restraint is
still right. `HEAD` first and skip when `content-length` matches the last recorded run.

---

## Phase 2A — Refresh your local dump (approved, scripted)

You approved replacing the stale May-2026 local copy with current data, without holding two large
copies at once, and you want it handled rather than handed to you as a runbook.

**Framing correction:** you never have two *dumps* — you have one dump plus one database. What
transiently doubles is the database, and the numbers say that's fine.

Measured on your machine: **44 GB free** on `/System/Volumes/Data`; the `openstates` DB is 13 GB;
the whole pg cluster at `/usr/local/var/postgresql@17` is 14 GB; pg 17.9 client at
`/usr/local/opt/postgresql@17/bin` (note the work packet's `/opt/homebrew/...` paths are wrong for
this Intel-prefix machine and will 404). No `.pgdump` on disk today.

Peak-disk trace for the safe ordering — download → restore to a new DB → verify → swap → delete:

| step | free after |
|---|---|
| baseline | 44.0 GB |
| download `2026-07-31-public.pgdump` (10.7 GB) | 33.3 GB |
| restore into fresh `openstates_new` (~13 GB + ~3 GB WAL) | **~17–18 GB ← floor** |
| verify | — |
| `DROP DATABASE openstates` | ~30 GB |
| rename `openstates_new` → `openstates` | ~31 GB |
| `rm` the dump | ~41 GB |

Side-by-side fits with ~17 GB to spare, so there is no reason to take the destructive path.
Drop-then-restore-in-place would raise the floor to ~30 GB but destroys the old data before the new
data is proven — it buys 13 GB you don't need.

**New `scripts/ops/refresh-openstates-dump.sh`** — flags `--date YYYY-MM-DD` (default: today),
`--keep-dump`, `--dry-run`, `--pgbin /usr/local/opt/postgresql@17/bin`. Each phase idempotent and
separately re-runnable.

0. **Preconditions.** `df` gate requiring ≥ 30 GB free; `pg_isready`; `HEAD` both dump URLs.
1. **Guard against losing your own work.** Before anything destructive, list non-OpenStates objects
   in the current DB and **stop and ask** if any exist:
   ```sql
   SELECT relname, relkind FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND relkind IN ('r','m','v')
     AND relname NOT LIKE 'opencivicdata\_%' AND relname NOT LIKE 'django\_%';
   ```
   The upstream data is fully re-downloadable (every monthly back to at least `2024-07` still
   returns 200), so the only irreplaceable thing is anything *you* added — helper indexes,
   materialized views, scratch tables from the pole or summary work.
2. **Capture old row counts** for all nine tables, for the verify gate.
3. **Download** schema + data dumps with `-C -` resume (S3 advertises `accept-ranges: bytes`);
   verify byte counts.
4. **`DROP DATABASE IF EXISTS openstates_new; CREATE DATABASE openstates_new;`** then the three-stage
   restore from Phase 2. The live DB is untouched throughout, and the dump stays on disk until after
   the swap — so a mid-restore crash costs a re-restore, never a re-download.
5. **Verify gate:** every table non-empty and `opencivicdata_personvote` ≥ 0.95 × the old count.
   Abort and leave everything alone otherwise.
6. **Swap:** `DROP DATABASE openstates` → `ALTER DATABASE openstates_new RENAME TO openstates`.
7. **Delete the dump** unless `--keep-dump`. Print a before/after summary.

---

## Phase 3 — Tagging as a `/schedule` cloud routine

Backlog card `c86714c6-d3d7-4019-a03d-4d4c6816f7e4` (`docs/operations/voter-choice-backlog.md:52-93`)
is the spec. Routines run on the **subscription** and can reach Neon with `DATABASE_URL` set and
Network access switched to Custom (the default "Trusted" blocks outbound with a 403).

The routine must not run `tag-bills.ts` or `tag-bills-batch.ts` — both construct
`new Anthropic({apiKey})`. Importing `tag-bills.ts` *is* safe: the SDK import is at module scope but
the client is only constructed inside `tagBills()` (line 781).

Reuses the four-phase pattern that produced ~46,000 tags on the subscription at zero cost
(`docs/alignment/ALIGNMENT_LEDGER.md`): **prep** (tsx, DB read) → **workflow** (subagents, files
only) → **assemble** (tsx, files, coverage gate) → **insert** (tsx, DB write).

### 3.1 Selector — version-aware with an allowlist

My first draft proposed a version-agnostic selector. **The review killed it.** It would permanently
orphan the 38,677 bills that already have tags — 34,072 of which have exactly *one* tag, so a bill
with one wrong tag becomes invisible forever — and it deletes the `TAGGER_VERSION` bump mechanism
that `tag-bills.ts:55-58` exists to provide. After the drain, no rubric change could ever be
re-applied.

The infinite-loop risk I cited is also overstated: reusing `fetchUntaggedBills` while writing a
different version string does re-select, but `upsertTags` sets `tagger_version = excluded.tagger_version`
on conflict, so it terminates as soon as one run writes the filtered version. The condition already
exists on main for 642 bills and nobody noticed, because it converges. The cost is subagent time,
not money.

```sql
SELECT b.id, b.title, b.summary, b.jurisdiction FROM bills b
WHERE b.summary IS NOT NULL                                    -- see 3.2
  AND NOT EXISTS (SELECT 1 FROM issue_tags it
                  WHERE it.bill_id = b.id AND it.tagger_version = ANY($2))
  AND NOT EXISTS (SELECT 1 FROM bill_tag_attempts a
                  WHERE a.bill_id = b.id AND a.tagger_version = $3 AND a.attempt_no >= 2)
ORDER BY b.inserted_at DESC NULLS LAST, b.id
LIMIT $1
```

with `ACCEPTED_TAGGER_VERSIONS = ['claude-haiku-4-5-20251001-v1', 'pole-anchored-v1',
'claude-sonnet-4-6-agent-v1']`. No loop (the written version is in the list); a rubric bump is one
string removed from the array.

### 3.2 Tag bills that have summaries first

The newest 2,000 bills by `inserted_at` include **1,308 with `summary IS NULL`** — title only.
Across the whole untagged pool, 14,641 of 29,443 are NULL-summary and 9,360 more are under 200
characters. The rubric's explicit instruction is to abstain when the input is thin, so spending the
drain on title-only bills produces mostly empty results by design.

Filtering `summary IS NOT NULL` cuts the pool from 29,443 to 14,802, halves the work, and removes
the abstain-rate problem at source rather than gating on it. Revisit NULL-summary bills after the
summary-recovery pass the ledger records as the top coverage lever (finding F4).

### 3.3 Replace `skip_reason` with an attempts table

`skip_reason` has **0 rows in prod** across 68,334 bills — the machinery my resume story depended on
has never run. And `inferSkipReason` (`tag-bills.ts:494`) falls back to `non_issue`
*unconditionally*, so every empty result becomes a permanent exclusion, including "we couldn't tell
because there's no summary." Nothing in the repo ever clears it; `src/` never reads it.

**Small additive migration** — `bill_tag_attempts (bill_id, tagger_version, attempt_no, outcome,
attempted_at)`. Record every attempt including abstentions and gate-blocked runs. The selector
excludes at `attempt_no >= 2`, which fixes three things at once: the permanent stall (a bill the
agent can never handle stops consuming a batch slot every run), the gate livelock (3.5), and the
irreversibility of `skip_reason`. Never set `skip_reason` for a NULL-summary bill.

### 3.4 The pipeline files

**`scripts/ingest/_tag-prep-batches.ts`** — selects bills, writes `_tag-batches/{batchId}.json`
(100 bills each, summaries capped at 4,000 chars), `_rubric.md`, `_manifest.json` with an
authoritative `count` per batch, `_run-args.json`, and an empty `_results/`. **Must `rmSync` the
batch dir first**, as `_pole-prep-batches.ts:42` does — otherwise a stale `_results/{batchId}.json`
is read against a new batch of the same id, every id mismatches, everything is dropped, and assemble
exits 2 on every retry forever. All paths absolute (agents don't share prep's cwd). Add the batch
dir to `.gitignore` so a harness auto-commit can't land 40 files in git.

**Write the rubric to a file, don't inline it.** `buildSystemPrompt()` renders 16 issues from the
870-line `src/lib/alignment/poleVocabulary.ts` — 15–20k characters. Inlining creates silent drift
against the source of truth that `poleVocabulary.test.ts` protects. Stamp `POLE_VOCABULARY_VERSION`
into `_run-args.json`.

**`scripts/ingest/_tag-general.workflow.js`** — modeled on `_pole-retag.workflow.js`. The genuinely
new piece: existing workflows emit one label per (bill, issue); the general tagger needs multi-tag.

```json
{ "batchId": "tag-20260802-003",
  "results": [
    { "bill_id": "...", "tags": [
        { "canonical_issue": "healthcare_affordability", "stance_lens": "in_favor", "confidence": 0.92 } ] },
    { "bill_id": "...", "tags": [] }
  ] }
```

Exactly one entry per bill including empty ones; `tags: []` is the explicit abstain signal.

**`scripts/ingest/_tag-assemble.ts`** — the coverage gate. My `results.length === count` check was
**weaker than what's already in the repo** — 100 duplicated bill_ids satisfy it. Use
`_pole-assemble.ts:60-84`'s actual approach:

```ts
const billIds = new Set(batch.bills.map(b => b.bill_id));
// gate on: new Set(results.map(r => r.bill_id)).size === count
//          && results.every(r => billIds.has(r.bill_id))
```

Wrap each file's `JSON.parse` in try/catch and treat a parse failure as **missing**, not fatal —
`_pole-assemble.ts:22` uses a bare parse, so one truncated file throws, exits 1, and the "re-run only
the listed batches" recovery never executes. Then: drop hallucinated ids, validate
`canonical_issue` against `CANONICAL_ISSUE_LABELS` and `stance_lens ∈ {in_favor, opposed}`, clamp
confidence into `[0,1]`, dedupe on `(bill_id, canonical_issue)`, flag any batch that is 100% one
issue, write `_all-tags.json`, and **exit 2** listing incomplete batchIds.

**`scripts/ingest/_tag-insert.ts`** — chunked at 500, single multi-row `onConflictDoUpdate` on
`(billId, canonicalIssue)`, wrapped in `withRetry`. Write attempt rows **before** tags (they're the
cheaper write and the majority signal). Do not build on `insert-issue-tags.ts` — it does one HTTP
round-trip per tag, which at ~30k bills is ~60,000 sequential Neon requests.

Write `TAGGER_VERSION = "claude-sonnet-4-6-agent-v1"`, the string `insert-issue-tags.ts:24` already
uses for subagent-produced rows.

### 3.5 The gate — rebuilt from scratch

**My original gate would have blocked roughly 98% of healthy runs and then livelocked.** All three
thresholds were wrong:

- **">60% empty"** is the rubric's *designed* behaviour. Measured abstain rates on the pole runs I
  cited as precedent: `public_safety` 84%, `election_integrity` 85%, `property_taxes` 64% — and those
  were on pre-filtered relevant bills. The rubric says "when in doubt, abstain."
- **"mean confidence 0.15 below baseline"** — prod baseline is 0.7970; the known-good subagent run
  (`pole-anchored-v1`, n=2,308) averages **0.682**, already 0.115 below and 0.035 from abort. Worse,
  those confidences aren't model outputs — they're three constants (0.400 / 0.650 / 0.900) from a
  low/medium/high mapping. The entire margin is an arbitrary prompt-schema choice.
- **"95/5 stance split at n≥30"** fires on today's healthy corpus: `water_infrastructure` is
  **97.31%** in_favor (P≈0.78 of tripping per run), `healthcare_affordability` 95.00%,
  `housing_affordability` 94.99%. Compounded, P(no issue trips) ≈ **0.02**. And the premise is wrong:
  inversion is a *change* from a prior distribution, not an absolute skew — there is no organized
  anti-water-infrastructure pole.
- **Any gate failure livelocked**, because the selector is fully deterministic with a total
  tie-break: the next run selects the identical bills, produces the identical distribution, fails
  identically, forever, writing nothing.

Replacement — `scripts/ingest/_tag-gold-gate.ts`, **per-issue and non-blocking by default**:

- **Hard block only on unambiguous degeneration:** zero tags total; unique-bill coverage below 95% of
  selected; more than 95% of all tags landing on a single issue.
- **Per-issue soft check:** compare this run's in_favor share for issue X against *that issue's*
  existing corpus share (n ≥ 100). On a large divergence, **quarantine that issue's tags to a file
  for review and insert the rest** — don't abort the run.
- **Report, don't gate, on abstain rate and mean confidence.** Track them across runs; once there's
  history, alert on a *change* rather than an absolute.
- **On any hard block, still write attempt rows** (3.3), so the next run's selection differs and the
  livelock cannot form.

Drop the `_retag-gold-check.ts` spot-check entirely. It's scoped to `reproductive_rights |
immigration`, further narrowed by state and keyword filters — expected yield is ~16 and ~11 tags per
2,000-bill run before intersection, so the before/after diff is 0-vs-0 on most runs. Say plainly
that the DECISION's literal wording can't be honored rather than half-honoring it with decoration.

### 3.6 Probe the routine before trusting it

The ~46,000-tag precedent ran from **interactive sessions, not a routine**. "It worked on the
subscription" is not "it works in a cloud routine with a 20-way subagent fan-out and an undocumented
per-account daily run cap." I gated Phase 2 on a probe and assumed this; apply the same discipline.

Ladder: `TAG_BILLS_PER_RUN=100` (one batch) → 500 → 2,000. Resume across runs is genuinely free
(3.1's selector plus attempt rows), so the failure mode of guessing low is "slower", never "stuck".

| Stage | Cadence | Per run |
|---|---|---|
| Probe | manual, `--dry-run` then live | 100 → 500 |
| Drain | daily | 2,000, raise if stable |
| Upkeep | weekly, Sun 09:00 UTC | 2,000 (~61 new/wk, huge headroom) |

### 3.7 Tests

`_tag-assemble.test.ts` (duplicate-id padding rejected; truncated file treated as missing not fatal;
hallucinated id dropped; confidence 1.4 clamped; stale `_results` cleared), `_tag-gold-gate.test.ts`
(**must include a regression case asserting `water_infrastructure` at its real 97.31% share does not
trip the gate**), `_tag-insert.upsert.test.ts`, `_tag-prep-batches.test.ts` (selector includes the
version allowlist and the attempt cap — the opposite of my original test, which would have cemented
the wrong invariant in CI).

---

## What you have to do by hand

1. **Neon — least-privilege role.** Routine env vars are visible to anyone who can edit the
   environment, so this must not be the prod owner URL:
   ```sql
   CREATE ROLE tagger_rw LOGIN PASSWORD '<generate>';
   GRANT CONNECT ON DATABASE <db> TO tagger_rw;
   GRANT USAGE ON SCHEMA public TO tagger_rw;
   GRANT SELECT ON bills, issue_tags TO tagger_rw;
   GRANT INSERT, UPDATE ON issue_tags TO tagger_rw;
   GRANT INSERT, UPDATE ON bill_tag_attempts TO tagger_rw;
   ```
   No DELETE, no DROP, no access to candidates/votes/donors.
2. **Claude Code → Settings → Environments** — Network access **Custom**, allowlist the Neon host
   (`ep-*.aws.neon.tech`), `registry.npmjs.org`, `github.com`, `objects.githubusercontent.com`.
   Missing the npm/github hosts fails at step 1, not step 6.
3. **Set `DATABASE_URL`** on that environment to the `tagger_rw` string.
4. **`/schedule`** — repo `heymoosh/voter-choice`, branch `main`, cron `0 9 * * 0`, prompt:
   *"Follow docs/operations/tag-bills-routine.md."*
5. **Rule on the two metered app paths** flagged in 0A (`extract-vision.ts`,
   `research-candidate/route.ts`) — in or out of the "front-end only" directive.

---

## Verification

- **Phase 0:** confirm `gh workflow run ingest-tag-bills.yml` now fails closed. Run
  `check-ingest-freshness.ts` against prod — it must report `stalled-pipeline`. Force a failure in a
  scratch branch and confirm an issue appears, is assigned to you, and emails you **on the second
  occurrence too** (the comment path is the one that silently failed in my first design).
- **Phase 1:** `npx vitest run scripts/ingest/_retry.test.ts scripts/ingest/state-votes.*.test.ts`.
  Then `gh workflow run ingest-states.yml -f scope=single -f state=IL` and confirm the logs show
  `fetch_attempt`/`fetch_done` and that only 3 requests are made per state (not 5). Then watch two
  consecutive scheduled runs; success criterion is **fewer failed states**, not zero.
- **Phase 2A:** run with `--dry-run` first; confirm the non-OpenStates-object guard reports clean;
  after the real run, confirm the July row counts exceed May's and the dump file is gone.
- **Phase 2:** one `workflow_dispatch` scoped to a single state; confirm new bills inserted, no
  duplicate `candidate_offices`, and NULL summaries filled while `bills.updated_at` is unchanged.
- **Phase 3:** full pipeline manually at `--limit 100 --dry-run` before any routine exists. Assert
  `env | grep -i anthropic` is empty inside the routine — that, not `--dry-run`, is what proves zero
  API cost. Then 500 live; re-run the freshness check and confirm `stalled-pipeline` clears.

## Known risks

- **The retry does not make Open States reliable.** They are a volunteer nonprofit with a visibly
  degrading free API — 502s and 60-second 504s across four days and eight states, ~30 of the last 45
  runs failed. If the rate keeps climbing, the honest long-term answer is to invert the design: make
  the dump primary and the API an incremental top-up.
- **`/mnt` sizing on GitHub runners is community lore, not contract** — documented storage is 14 GB.
  Fail fast on `df` rather than assume.
- **The routine's max runtime is undocumented.** Mitigated by free resume; start low.
- **The routine writes directly to prod `issue_tags`** with no staging step — the DECISION's explicit
  choice. The rebuilt gate is weaker than the one I first proposed *on purpose*, because the strong
  version blocked everything; it catches degeneration, not subtle rubric error. The full oracle
  harness remains the instrument for a rubric change.

## Separate cards (found, not fixed here)

- **`selectOpenStatesSessions` picks junk sessions** — MO selecting `2018,2026`, VA
  `2018specialII,2027`, FL `2027,2026`; AK, AL, AR report `bills_seen=40 bill_rows=0 vote_events=0`
  on a *clean* run, burning the whole budget on sessions with no vote data. `state-votes.ts:200-235`
  should prefer `active` + `start_date <= today` over raw recency. Phase 2 would mask this, not fix it.
- Migrate the other 8 `sleep()` copies and 4 retry loops onto `_retry.ts`.
- `.ai/work-packets/launch-openstates-bulk-ingest.md` describes the `.pgdump` files as on disk (they
  were deleted 2026-07-23) and uses `/opt/homebrew` paths that don't exist on this machine.

---

# APPENDIX — paste-ready backlog cards

These were added to `docs/operations/voter-choice-backlog.md` under `### General` on 2026-07-31.
Kept here as the source text so a card can be re-derived if one is edited or lost. Card-id comments
are omitted deliberately — the parser assigns them.

---

**[P0] Disarm the uncapped metered bill-tagging path**
- `.github/workflows/ingest-tag-bills.yml` is live on `main` with `workflow_dispatch` enabled and pulls `ANTHROPIC_VOTER_API` from Bitwarden. It runs `scripts/ingest/tag-bills-batch.ts`, which sets `FETCH_LIMIT = 65_000` (line 46) and calls `fetchUntaggedBills(db, FETCH_LIMIT)` with no `--limit`, no `TAGGER_BILL_LIMIT`, and no cap of any kind.
- One manual trigger submits all 29,657 untagged bills to the Anthropic Batch API — the exact 6/21 and 6/28 budget-drain event. Batch bills on COMPLETION, so cancelling the 360-minute `--collect` step does not stop the spend.
- TASK: delete the `ANTHROPIC_VOTER_API` block from the workflow; replace both `tag-bills-batch.ts` steps with a hard failure pointing at the new routine doc; add `if (!explicitLimit) throw` to `tag-bills-batch.ts` so no future caller can run it uncapped.
- ALSO (closes the first bullet of the tagging-cron card, never done): six non-app scripts read the key — `tag-bills.ts`, `tag-bills-batch.ts`, `classify-bills.ts`, `_classify-batch.ts`, `generate-rationales.ts`, `summarize-bills.ts`. Only one is scheduled but all are one `npx tsx` away.
- NEEDS A RULING FROM MUXIN: `src/lib/server/extract-vision.ts` and `src/app/api/research-candidate/route.ts` are metered app paths that are arguably not "front-end user chat" in the narrow sense. In or out of the directive?
- STATUS: To Do
- GOAL_CONDITION: `gh workflow run ingest-tag-bills.yml` fails closed; no uncapped path to the metered API exists in the repo; the six scripts are inventoried in the card with a ruling on the two app paths.

**[P0] Fix state-votes ingest — retry OpenStates 5xx and socket errors**
- ~30 of the last 45 scheduled runs of `ingest-states.yml` failed (6/17 → 7/31). Earlier diagnosis of "Neon connection drops" was WRONG: 22/22 sampled failures are OpenStates 502 / 504 / bare `terminated`, zero DB errors. `response_ms≈60000` on the 504s is their gateway timeout; `terminated` is the same event with the socket dying first.
- ROOT CAUSE: `fetchOpenStatesJson` (`scripts/ingest/state-votes.ts:485-536`) retries ONLY HTTP 429. 502/503/504 fall through to `throw`, and there is no try/catch around `await fetcher(...)` at all. `scripts/ingest/federal-votes.ts:1226` already has `RETRYABLE = new Set([502,503,504])` + a network catch — state-votes is the one file that never got it.
- TASK: new `scripts/ingest/_retry.ts` (`withRetry`, `isTransientNetworkError` walking `error.cause`, `flattenErrorChain`, canonical `sleep`); add a 5xx branch alongside the existing 429 handler; wrap fetch AND `response.json()`; `AbortSignal.timeout(60_000)` constructed INSIDE the loop; fix `safeErrorMessage` to print the cause chain; per-session fault isolation.
- FREE WIN, same file: `fetchOpenStatesBills` (`state-votes.ts:436-462`) checks the budget before incrementing, so page 2 is fetched and entirely discarded after page 1 fills the quota — 20 of 50 daily requests wasted. Hoist the check into the `while` condition (50 → 30 requests/day).
- HONEST EXPECTATION: this does NOT make bad days clean. The 7/26 outage ran continuously ≥8 min; a 4-attempt/60s window is ~4 min. All-ten-states becomes roughly four-to-six. Do not bill it as immunity.
- TIMEOUT TRAP: do NOT set `timeout-minutes: 25` — the untouched 429 branch (`MAX_RETRIES=8`, 5-min cap) has a 28.7-min worst case for ONE request, and a step timeout is a hard kill before `writeStatePlan` ever runs. Use 40, add a 12-min per-state wall-clock budget to `withRetry`, drop 429 retries 8 → 5.
- OUT OF SCOPE (deliberately): migrating `federal-votes.ts` / `state-votes-from-dump.ts` onto `withRetry`, and adding retry to `writeStatePlan`. The DB was never the failure; bundling them triples the blast radius.
- STATUS: To Do
- GOAL_CONDITION: two consecutive scheduled runs land with materially fewer failed states; `_retry.test.ts` includes a regression guard that the old `/fetch failed|ECONNRESET|ETIMEDOUT/i` regex does NOT match `terminated` while the new predicate does.

**[P1] Ingest + tagging failure visibility — job-health check and alerts that actually send**
- Six weeks of daily-ingest failures went unnoticed. `ingest-states.yml`'s alert step runs `bws secret get <INGEST_FAILURE_WEBHOOK_BWS_SECRET_ID>` — bash parses the literal `<` as input redirection, `set +e` swallows it, and the step prints "skipping alert" and exits 0. Every failed job ends that way.
- TASK: new `scripts/ops/check-ingest-freshness.ts` modeled on `scripts/ops/check-stock-watcher-liveness.ts` (pure/impure split, `computeExitCode`, `isInvokedDirectly()` guard, sibling test) + `.github/workflows/check-ingest-freshness.yml` at `0 12 * * *`.
- PRIMARY SIGNAL MUST BE JOB HEALTH, NOT DATA FRESHNESS: `bills.inserted_at` only moves when NEW rows arrive, so a broken job and a quiet August are indistinguishable. Real inter-arrival gaps hit 47.6–49.6h six times in July on healthy days — a 36h threshold pages on all of them. Poll the last N scheduled `conclusion`s via the Actions API; keep freshness as a loose secondary at ≥60h. Read `issue_tags.tagged_at` (there is no `inserted_at` on that table).
- ALERT DELIVERY: deduped GitHub issue via `GITHUB_TOKEN`, NOT the webhook. Requires `permissions: { contents: read, issues: write }` (the template workflow declares none; every other workflow declares `contents: read`, so copying as-is 403s). A bot-authored issue does NOT subscribe Muxin — day 1 fires via repo-watch, day 2 onward is silent. Set `assignees: [heymoosh]` on create AND `@heymoosh` in every comment. No `set +e`, no `continue-on-error`.
- Retrofit into `ingest-states.yml` as a single `needs: ingest` + `if: failure()` SUMMARY job, not inside the 50-way matrix.
- STATUS: To Do
- GOAL_CONDITION: the check reports `stalled-pipeline` against prod today (61 bills in 7d, last tag 1,134h ago); a forced failure in a scratch branch produces an assigned issue that emails on the SECOND occurrence too.

**[P1] Refresh the local OpenStates dump to current (scripted)**
- The local `openstates` Postgres DB is a frozen May-2026 snapshot (13 GB, 9 tables). APPROVED by Muxin 2026-07-31: refresh to current and replace it, without holding two large copies at once, handled by a script rather than a manual runbook.
- MEASURED: 44 GB free on `/System/Volumes/Data`; DB 13 GB; cluster 14 GB at `/usr/local/var/postgresql@17`; pg 17.9 client at `/usr/local/opt/postgresql@17/bin` (the work packet's `/opt/homebrew` paths are wrong for this Intel-prefix machine).
- Side-by-side fits with ~17 GB to spare (floor is during restore), so build the new DB BEFORE dropping the old one. Drop-then-restore would raise the floor to ~30 GB and destroy the old data before the new data is proven — no reason to take it.
- TASK: `scripts/ops/refresh-openstates-dump.sh` with `--date YYYY-MM-DD` (default today), `--keep-dump`, `--dry-run`, `--pgbin`. Order: `df` gate ≥30 GB → guard against destroying user-created objects (stop and ask if any non-`opencivicdata_`/`django_` table, view, or matview exists) → capture old row counts → download schema + data dumps with `-C -` resume → restore into `openstates_new` → verify every table non-empty and `personvote` ≥ 0.95× old → drop + rename → delete dump.
- KEY FACTS: the big archive is DATA-ONLY; the schema lives separately at `https://data.openstates.org/postgres/schema/YYYY-MM-schema.pgdump` (712 KB, regenerated daily) — this is the mystery `2026-05-schema.pgdump` in the work packet. Restore is `--section=pre-data` → `--data-only --disable-triggers --exit-on-error` → `--section=post-data -j 4`. Without `--exit-on-error` a partial restore is silent. Verify downloads by byte count only — the ETag is multipart, not an MD5.
- STATUS: To Do
- GOAL_CONDITION: local `openstates` holds current-month data, row counts exceed the May snapshot, the dump file is deleted, and the script is re-runnable.

**[P2] Quarterly OpenStates bulk-dump backfill in CI**
- The daily API job caps at 20 bills/state/cycle, so bills are silently missed during a busy session. A periodic full-dump pass sweeps them up. `scripts/ingest/state-votes-from-dump.ts` already does dump→Neon for all 50 states and is currently unused.
- DECISION (Muxin, 2026-07-31): run BOTH — fixed daily API job for freshness, plus a dump-based backfill for completeness.
- NO PROBE NEEDED (an earlier draft gated this on one): the archive is data-only and the schema dump IS publicly addressable. Daily dumps also exist at `postgres/daily/YYYY-MM-DD-public.pgdump` on a ~30-day window — source from `daily/` on the day you run and drop the "up to 45 days stale" framing.
- TWO REAL BUGS TO FIX FIRST, both currently live:
  - `candidate_offices` ids do NOT collide between the two scripts. Both build `deterministicUuid(candidateId:jurisdiction:termStart:session.id)`, but the API path resolves `session.id` to the IDENTIFIER (v3 sessions carry no id — logs show `2026`, `104th`, `57th-2nd-regular`) while the dump path uses the DB PRIMARY KEY. The sweep DUPLICATES office rows rather than upserting. Fix `state-votes-from-dump.ts:277` to key off `session?.identifier`, add a one-time de-dupe, and add a both-paths-produce-equal-ids test.
  - Row-level `onConflictDoNothing` CANNOT fill a gap. A bill inserted by the API path with `summary IS NULL` never gets the dump's abstract — and `bills.summary` is exactly what the tagger reads. `fill-gaps` must be COLUMN-level: `summary: COALESCE(bills.summary, excluded.summary)`, same for title/introduced_date/raw_metadata, leaving `updated_at` alone. Also change the votes guard from `>=` to `>` (same-date rows currently pass and overwrite the API's richer payload with the dump's thinner one).
- WORKFLOW: `.github/workflows/ingest-states-dump-monthly.yml`, cron `0 2 15 1,4,7,10 *`, `timeout-minutes: 330` (6h job cap confirmed empirically). Do NOT use a `services:` block — it starts before your first step so you cannot prepare `/mnt/pgdata` or read a failed init. Use a prep step (`mkdir -p`, `df -h /mnt` fail-fast) then `docker run -d ... postgres:17` + `docker exec`. Peak `/mnt` ≈ 27 GB; GitHub only DOCUMENTS 14 GB of SSD and the ~65 GB at `/mnt` is undocumented Azure temp-disk, so fail fast rather than assume. `ubuntu-24.04` ships the pg 16 client, which refuses the v1.16 archive — the postgres:17 image is what makes it possible.
- Make `ingestFromDump` exit non-zero (it currently swallows per-state errors and exits 0); add `DUMP_STATE_LIMIT`/`DUMP_SKIP_STATES` + `dump-progress.json`.
- DEPENDS ON: [P1] Refresh the local OpenStates dump to current (scripted)
- STATUS: Backlog
- GOAL_CONDITION: one dispatch run scoped to a single state inserts missed bills, creates no duplicate `candidate_offices`, fills NULL summaries, and leaves `bills.updated_at` unchanged.

**[P2] `selectOpenStatesSessions` picks junk sessions**
- Live logs: MO selects `2018,2026`; VA `2018specialII,2027`; FL `2027,2026`. AK, AL, AR then report `bills_seen=40 bill_rows=0 vote_events=0` on a CLEAN run — the whole 20-bill budget spent on sessions with no vote data.
- `state-votes.ts:200-235` should prefer sessions by `active` + `start_date <= today` rather than raw recency.
- This worsens the same "bills silently missed" problem the bulk-dump card exists to solve, and the dump would MASK it rather than fix it.
- STATUS: Backlog

**[P3] Migrate duplicated sleep/retry copies onto `_retry.ts`**
- 8+ private `sleep()` copies (`tag-bills.ts:695`, `federal-candidates.ts:180`, `federal-donors.ts:900`, `ks-cfr-donors.ts:78`, `state-donors.ts:575`, `fix-federal-fec-ids.ts:21`, `summarize-bills.ts:396`, `tag-bills-batch.ts:64`, `_summary-pilot.ts:32`) and 4 private fetch-retry loops (`bill-cosponsors.ts:301`, `crs-summaries.ts:189`, `federal-votes.ts:~1226`, `src/lib/server/extract-textract.ts:107`).
- Deliberately excluded from the P0 ingest fix to keep that diff reviewable. Includes adding retry to `writeStatePlan` and the 500→250 vote-batch tweak.
- DEPENDS ON: [P0] Fix state-votes ingest — retry OpenStates 5xx and socket errors
- STATUS: Backlog

---

## Update to EXISTING card `c86714c6-d3d7-4019-a03d-4d4c6816f7e4`

The tagging cloud-routine card already exists at `docs/operations/voter-choice-backlog.md:52-93`.
**Do not create a duplicate** — append these bullets to it. Its DECISION and mechanism survive
review; four of my own design choices did not.

```
- ADVERSARIAL REVIEW (2026-07-31) — four corrections before building:
  - SELECTOR: must be version-AWARE with an allowlist, not version-agnostic. An agnostic selector permanently orphans the 38,677 bills that already have tags (34,072 of them have exactly ONE tag, so one bad tag hides a bill forever) and deletes the TAGGER_VERSION bump mechanism, so no rubric change could ever be re-applied. Use `NOT EXISTS (... AND it.tagger_version = ANY($2))` with `['claude-haiku-4-5-20251001-v1','pole-anchored-v1','claude-sonnet-4-6-agent-v1']`. The infinite-loop risk from reusing `fetchUntaggedBills` is real but converges (upsert sets tagger_version) and already exists on main for 642 bills — it costs subagent time, not money.
  - THE GOLD GATE AS FIRST DESIGNED WOULD BLOCK ~98% OF HEALTHY RUNS, THEN LIVELOCK. ">60% empty" is the rubric's designed abstain behavior (measured 49–85% on the pole runs). "Mean confidence 0.15 below baseline" — the known-good subagent run averages 0.682 vs a 0.797 baseline, already 0.115 below, and those confidences are three constants from a low/med/high mapping, not model output. "95/5 stance split at n≥30" fires on `water_infrastructure` (97.31% in_favor), `healthcare_affordability` (95.00), `housing_affordability` (94.99) — P(no issue trips) ≈ 0.02. And because the selector is fully deterministic, any block re-selects the identical bills and fails identically forever. REPLACE with: hard-block only on unambiguous degeneration (zero tags, <95% unique coverage, >95% of tags on one issue); per-issue comparison against THAT issue's own corpus share, quarantining the offending issue and inserting the rest; report-don't-gate on abstain rate and confidence. Record an attempt row even on a block so the next selection differs.
  - `skip_reason` IS THE WRONG DATA MODEL: 0 rows in prod across 68,334 bills — never exercised. `inferSkipReason` falls back to `non_issue` UNCONDITIONALLY, and 65% of the newest 2,000 bills are NULL-summary, so a first run would permanently stamp ~1,300 bills `non_issue` purely for lacking a summary. Ledger F4 says summary recovery is the top coverage lever; those must stay re-taggable. Replace with an additive `bill_tag_attempts (bill_id, tagger_version, attempt_no, outcome, attempted_at)` table; selector excludes at `attempt_no >= 2`. Fixes the permanent-stall, the gate livelock, and the irreversibility together.
  - TAG BILLS WITH SUMMARIES FIRST: 1,308 of the newest 2,000 are title-only; 14,641 of 29,443 untagged are NULL-summary. Add `summary IS NOT NULL` to the drain selector — cuts the pool to 14,802, halves the work, and removes the abstain-rate problem at source instead of gating on it.
- COVERAGE GATE: `results.length === count` is satisfied by 100 duplicated bill_ids — WEAKER than `_pole-assemble.ts:60-84`, which is already correct. Use a Set of ids plus an in-batch membership check. Wrap each file's JSON.parse in try/catch and treat a parse failure as MISSING, not fatal (a bare parse means one truncated file exits 1 and the "re-run only these batches" recovery never fires). Prep must `rmSync` the batch dir first (per `_pole-prep-batches.ts:42`) or stale `_results` files poison every retry. Add the batch dir to `.gitignore`.
- DROP the `_retag-gold-check.ts` spot-check: it is scoped to reproductive_rights|immigration and further narrowed by state+keyword filters, so expected yield is ~16 and ~11 tags per 2,000-bill run before intersection — the before/after diff is 0-vs-0 on most runs. Say plainly the DECISION's literal wording can't be honored rather than half-honoring it.
- PROBE THE ROUTINE BEFORE TRUSTING IT: the ~46,000-tag precedent ran from INTERACTIVE sessions, not a routine. "It worked on the subscription" is not "it works in a cloud routine with a 20-way fan-out and an undocumented daily run cap." Ladder TAG_BILLS_PER_RUN 100 → 500 → 2,000.
- DEPENDS ON: [P0] Disarm the uncapped metered bill-tagging path
```

