# Handoff: promise-pipeline session, 2026-08-17

> **SUPERSEDED, 2026-08-19.** This doc is a point-in-time snapshot — keep it
> as history, don't re-fix what it already lists as open. Since it was
> written: code-review findings 1–6 below were fixed and merged (PR #535,
> "Part 5: fix code-review findings 1-6"). PR #551 (2026-08-19) closed the
> 2022 candidate-website-CAPTURE gap (144/451 -> 408/451, 90%) via FEC-ID
> backfill + Wayback/redirect/Wikidata retries — capture is no longer the
> blocker this doc describes. The 2022 EXTRACT step (turning those captures
> into `candidate_promises` rows) is being run as of this note; see the plan
> doc's Part 5 section for current status.

**For the next Claude session (CLI or web).** Muxin ended the previous
session (claude.ai/code, `session_01RMzTehJJ2BkzZWX6i5KvPs`) after a long
night of Part 5 capture-layer work. This doc is the complete state: what
was built and merged, what is running on her machine, what the code review
found (ranked fixes — **do these first**), and the standing conventions
that keep you from making well-documented mistakes.

The plan this all serves: `docs/DONOR_FRAMING_AND_ACCOUNTABILITY_PLAN.md`,
Part 5 (promise ledger). Its 2026-08-16/17 amendment records tonight's
decisions with rationale.

## Where things stand (merged through PR #533)

Capture-source history, compressed: Wayback kept 503ing (IA outage) →
tried LoC elections web archive as primary (PR #529) → discovered
webarchive.loc.gov is behind a **Cloudflare bot challenge** no script
passes (curl, node fetch, Exa's crawler all tested and blocked; only a
real browser clears it) → Muxin's call: **"we do it ourselves"** →
self-hosted snapshot layer (PR #531) + real-Chrome LoC fetcher (PR #532)
→ live-run fixes (PR #533: FEC hourly-quota pacing, Cloudflare
challenge-wait that doesn't reset itself).

The moving parts, all under `scripts/ingest/`:

- `web-archives.ts` (+tests) — replay-URL plumbing for three archives:
  `wayback` (`/web/<ts>/…`), `loc` (`/all/<ts>/…`), `snapshot`
  (`snapshot://<ts>/<original>`). Everything downstream (made_at, cycle
  derivation, promise ids) keys off this shared shape.
- `site-snapshot-store.ts` (+tests) — local gitignored store
  (`site-snapshots/`): content-addressed page bodies + JSONL manifest;
  reads resolve to the nearest capture of an original URL, archive-style.
- `promise-site-snapshot.ts` (+tests) — captures LIVE campaign sites
  (2026 current cycle) into the store; `--json` emits an
  extraction-ready corpus. Zero third-party dependency.
- `_loc-browser-fetch.ts` — drives a REAL VISIBLE Chrome via Playwright
  to pull 2022 captures from LoC (human may need to click the Cloudflare
  checkbox once per run; cookie persists in
  `site-snapshots/loc-browser-profile/`). Fail-fast if the wall never
  clears. Never exercised successfully yet — the pre-fix version
  steamrolled 31 misses; the fixed version has not been run.
- `_promise-corpus-spike.ts` (+tests) — candidate → FEC Form 1 website →
  capture discovery. `--state ALL` = national (includes the ~80
  no-state-column members in retrospective mode). FEC calls globally
  paced at 1/3.7s (api.data.gov = 1,000 req/HOUR; a national run needs
  ~4,000 → ~4 h by design). LoC lookups circuit-break after first
  failure.
- `promise-extract.ts` (+tests) — the extractor; reads `snapshot://`
  URLs from the local store, Wayback URLs from the network. Four-gate
  verbatim extraction, deterministic ids, resumable, cycle-aware.

DB state: 2026 promise corpus converged (50 v4 + 2 kept v2 rows) plus
tonight's single write (1 promise, Carlos De La Cruz TX-35). The
2022 retrospective has extracted almost nothing yet.

## What Muxin is running on her machine (may be in flight)

1. **LoC 2022 fetch** (no FEC quota; a Chrome window opens; ONE checkbox
   click may be needed — the script now waits up to 120s):
   ```
   npx tsx scripts/ingest/_loc-browser-fetch.ts --corpus spike-tx-2022.json --cycle 2022 --json > /tmp/corpus-tx-2022-loc.json
   npx tsx --env-file=.env.local scripts/ingest/promise-extract.ts --corpus /tmp/corpus-tx-2022-loc.json --dry-run
   ```
   Its per-candidate output is the long-awaited answer to "how much 2022
   does LoC actually hold". If it exits(2) with "the Cloudflare wall
   never cleared" even after a click, LoC needs a fully-manual save path
   (a "manual-import mode" was discussed, not built).
2. **National 2026 run** (started ≥1 h after the last 429 storm so the
   FEC quota resets; ~4 h walk-away):
   ```
   npx tsx --env-file=.env.local scripts/ingest/_promise-corpus-spike.ts --state ALL --skip-wayback --concurrency 1 --json > /tmp/spike-all-2026.json
   npx tsx scripts/ingest/promise-site-snapshot.ts --corpus /tmp/spike-all-2026.json --json > /tmp/corpus-all-2026.json
   npx tsx --env-file=.env.local scripts/ingest/promise-extract.ts --corpus /tmp/corpus-all-2026.json
   ```
   Everything is resumable; re-running the same commands is always safe.

## Code-review findings (2026-08-17, /code-review high) — the work list

Ranked. 1–6 are correctness; fix before or alongside the next runs. All
line numbers drift; anchor on the described code.

1. **`promise-extract.ts` ignores the snapshot `--dir`.** fetchPageSoft
   calls `readSnapshotPage(url)` with no dir, so a corpus captured with
   `--dir /elsewhere` extracts zero promises with only per-page "no
   capture" logs. Add a `--dir`/SNAPSHOT_DIR-aware plumb-through.
   (Harmless today only because Muxin uses the default dir.)
2. **The spike can pin LoC replay URLs the extractor can never fetch.**
   If the spike's LoC path ever succeeds (different network / wall
   lifted), it emits `webarchive.loc.gov` canonicalCaptureUrls; the
   extractor fetches them with plain fetch() → 403 → silent zero-promise
   candidates. Either stop pinning LoC in the spike, or make the
   extractor resolve LoC URLs via the snapshot store / refuse loudly.
3. **Issue-page discovery uses the FEC-filed URL as base, not the
   redirect-followed final URL** (`promise-site-snapshot.ts` and
   `extractCandidate` in `promise-extract.ts`). A site that moved
   domains captures/extracts only its homepage, silently. Use
   `home.finalUrl`'s original as the discovery base.
4. **`selectNearestSnapshot` compares raw 14-digit timestamps
   numerically** — wrong "nearest" across day/month/year boundaries.
   Compare parsed epoch seconds.
5. **Non-numeric `--fec-delay-ms` → NaN silently disables pacing**,
   recreating the quota burn it exists to prevent. Validate and error.
6. **`_loc-browser-fetch.ts` calls every non-ok/404 status a Cloudflare
   challenge** — a plain LoC 503 outage tells the operator to click a
   nonexistent checkbox. Branch on status/title.
7. Reuse: `mapWithConcurrency` (2 copies, already diverged), `arg()` (3
   copies), retry/backoff fetch loop (2 copies with diverging 429
   policy). Extract a shared `scripts/ingest/` helper.
8. Efficiency: model responses JSON.parsed twice per page;
   `quoteAppearsInSource` re-normalizes the ~30K-char page text once per
   promise instead of once per page.
9. **Cost estimate omits `cache_creation_input_tokens`** (1.25× write
   premium) → est_cost_usd systematically understates spend.
10. **Extractor's human summary keys by candidate NAME** — same-named
    candidates merge and a "no promise corpus" line can vanish
    (`--state ALL` makes collisions likely). Key by candidateId.

Also observed live (not a bug, a property): extraction is
**nondeterministic** — Shaun Finnie yielded 2 promises in a dry-run and
0 in the write-run minutes later, so those 2 were never persisted.
Re-running extraction is additive (deterministic ids upsert; nothing
deletes), so a second pass over zero-promise candidates recovers variance
losses. Muxin was offered a `--passes 2` flag; not built. Consider after
findings 1–6.

## Conventions (violating these has bitten before — they're load-bearing)

- Branch: develop on `claude/promise-ledger-corpus-spike-w1tdgi`; after
  each squash-merge, `git fetch origin main && git checkout -B <branch>
origin/main && git push -u origin <branch> --force-with-lease`. Open
  draft PRs; Muxin flips ready + merges fast.
- She runs everything that needs network/DB/secrets on her machine and
  pastes output; sandboxes have no egress to FEC/archives. Ask before
  anything that writes to prod; she runs the write scripts.
- The `security-reviewed` CI label is HER sign-off (gates `db/**`,
  `src/app/api/**`, secret-ish paths) — never self-apply.
- `ANTHROPIC_VOTER_API` is for user-facing chat only; bulk LLM work runs
  on subscription subagents. Known accepted exception:
  `promise-extract.ts` (small, cost-logged runs).
- Ballotpedia stays banned until its licence is confirmed. PolitiFact
  labels are Poynter's copyright: internal, cited, never committed.
  Full-page snapshots stay in the local store, never committed.
- No scheduled check-ins; she merges when ready.
- Migrations are raw SQL applied by hand (no drizzle journal).
- Never auto-click a bot-check checkbox; the human clicks.

## Resume line for the next session

> Read docs/operations/promise-pipeline-handoff-2026-08-17.md and
> continue: fix the code-review findings (1–6 first), then support the
> runs in "What Muxin is running".
