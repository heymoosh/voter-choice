# Codebase improvement plan — July 2026

**Analysis only. Nothing in this document is approved for execution.** Each item is an
independently schedulable proposal; greenlight per item (or per phase) before any agent starts.

## Scope and method

Four parallel read-only audits (security, reliability/data-integrity, performance,
testing/CI/repo-hygiene) run 2026-07-07, every finding verified against `origin/main`
(f39fa4d) — not the working tree, which was 45 commits behind and missing most of the
July security fixes. This plan **builds on, and does not repeat**, three prior artifacts:

- `docs/operations/refactor-proposal-2026-07.md` (PR #225) — 6 maintainability candidates,
  still pending greenlight. Adopted here as Workstream E with its sequencing intact.
- `docs/security/audit-2026-07.md` — whole-app security audit; its ~13 follow-up cards are
  essentially all Done on main. Only the residuals it did not scope appear here.
- `docs/maturity.md` — the maturity ladder; Stage 2 items (mutation testing, coverage,
  dependency hygiene) are partially done; dependency hygiene is the open rung.

## Where the codebase actually stands

The foundation is stronger than a typical solo project: strict TypeScript with near-zero
escape hatches (5 `: any` outside vendored prototype code, zero `@ts-ignore`), three
required PR checks (`test`/`e2e`/`mutation`) using the always-fire/path-filter pattern,
real-data e2e assertions, a live schema-drift deploy gate, idempotent ingest upserts, and
a security posture that was audited and then actually remediated (denial-of-wallet,
fail-closed budget/limiter, CSP report-only, SHA-pinned workflows).

The real gaps concentrate in five places:

1. **Zero observability** — no error tracking, no health endpoint, no alerting. The class
   of bug behind the 42-day dark-DB incident is guarded only for DB schema drift; every
   other dependency can still silently degrade with nobody paged.
2. **Client error states collapse into misleading empties** — a failed race-data fetch
   renders as a candidate with "no record"; a polis backend error renders as "You're the
   first one here." Both violate the show-thin-records-honestly product principle from the
   opposite direction: they show *false* emptiness.
3. **The hottest API path is slow by construction** — `/api/race-data` is a fully
   sequential per-candidate, per-issue N+1 fan-out, and its cache header is a no-op
   because the route is POST.
4. **No supply-chain scanning** — no Dependabot/Renovate/CodeQL/npm-audit in CI; `npm
   audit` currently reports 2 critical + 13 high advisories (5 reachable from prod deps,
   incl. a PostCSS XSS transitively via `next@15.5.12`, fixed in 15.5.20).
5. **One billable route missed by the budget hardening** — `/api/extract-ballot` calls
   Sonnet vision + Textract but never consults or records against the $50 budget.

Everything else below is leverage, not alarm.

## Already good / recently fixed — do not redo

- Budget + rate-limit hardening: exhausted-tier hard stop on the durable tier, per-round
  tool caps + mid-run budget re-gate (#216), fail-closed durable store in prod (#203),
  hardened `getClientIP` (#215), polis throttle + `KEYS`→`SCAN`, research-candidate
  origin check, SAFETY_HEADER on both prompt paths, untrusted-content framing.
- CI/CD: schema-drift gate (`check-schema-drift.ts --require-db`) fails deploy on drift or
  empty `DATABASE_URL`; workflows SHA-pinned (#223) with `permissions:` blocks (#222);
  commit-author gate; deploy is Actions-only.
- BYOK key handling is clean (browser-only, never touches our API routes); no SQL
  injection (drizzle-parameterized; `sql.raw` only in the operator CLI); no SSRF
  (hardcoded external hosts); `.env*` untracked.
- Client resilience basics: DB failures route to an honest `dberror` stage with retry;
  heavy deps (pdfjs, tesseract, Maps) are lazy-loaded; delegation/member-stats queries are
  properly batched; Anthropic prompt caching is on for system prompt + tools.

---

## Workstream A — security residuals (what the July audit didn't scope)

**A1. Gate `/api/extract-ballot` on the community budget and record its spend.**
`src/app/api/extract-ballot/route.ts` — the only billable AI surface invisible to the $50
cap. It fans out `SAMPLE_COUNT × pages` concurrent vision calls for large-format PDFs
(~line 433) with only origin + per-IP limits. Add `getBudgetStatusAsync` gating,
`recordUsageAsync` for extraction spend, and a pages-per-upload cap.
Effort: M · Risk: medium (touches the upload UX under failure) · **Highest-priority item
in this plan** — it reconstitutes the exact denial-of-wallet shape already fixed twice.

**A2. Add the shared rate limiter to `/api/chat-catch`.**
Only billable route with no per-caller limiter (backstopped by the budget gate, so
bounded). Effort: S · Risk: low.

**A3. Make server-side PII stripping unconditional.**
`applyPiiStrip` no-ops unless `PROMPT_FLEET_V2` is on (`src/app/api/chat/route.ts:634`).
Verify the flag's prod state; if off, raw user text egresses to Anthropic unredacted.
Make `stripPII` unconditional regardless of prompt-fleet flag. Effort: S · Risk: low.

Accepted residuals (no action planned, listed for completeness): admission-time budget
TOCTOU has no cost pre-reservation (bounded overshoot); client-resettable `sessionId`;
CSP is still report-only (promote to enforcing after a soak period — fold into D1's
hygiene cadence).

## Workstream B — reliability and observability

**B1. Minimum observability: health endpoint + error tracking.**
Add `/api/health` probing DB reachability, Redis reachability, and required-secret
presence (returns per-dependency status; wire an external uptime ping to it). Adopt error
tracking — but see **Decision 1** below: capturing request bodies risks capturing voter
addresses, which collides with the privacy posture. A privacy-safe middle ground: Sentry
with `sendDefaultPii: false` + explicit scrubbing, or platform-logs-only plus the health
probe. Effort: M · Risk: low. Candidate for the Go-live launch-gate epic — launching
without it means the next silent degradation is again discovered by accident.

**B2. Honest client error states (the false-empty class).**
- `delegationData.ts:256,263` — race-data failure returns `{candidate:null}`, rendering an
  empty scorecard instead of an "records unavailable — retry" card. Return a distinct
  `{unavailable:true}` marker.
- `polisAdapter.ts:68,71` — backend failure renders as "You're the first one here."
  Distinguish all-failed from genuinely-empty.
- Residual from delegation: map unexpected non-502 network errors to `db_unavailable`
  rather than `geocode_failed` (`delegationData.ts:124`).
Effort: S–M · Risk: low. This is the product-principle twin of "show thin records":
never show false emptiness either.

**B3. Timeouts and duration caps on every user-path dependency.**
- Redis fetch has no timeout (`durable-store.ts:66`) — a *hung* Upstash hangs every chat
  request to the function ceiling. Add `AbortSignal.timeout(3000)`.
- Anthropic clients inherit the SDK's 10-minute default (`chat/route.ts:1772`,
  `extract-vision.ts:290`) — set explicit timeouts under the function limit.
- `/api/chat` sets no `maxDuration` — set one explicitly.
- Census geocode: one retry on network/5xx (has an 8s timeout, no retry).
Effort: S · Risk: low.

**B4. Deploy-gate all required secrets, not just DATABASE_URL.**
`deploy.yml:108` warn-and-skips on empty Anthropic/Google/Upstash secrets. Fail the
deploy, mirroring `--require-db`. (Runtime is now loud per #203, but the deploy still
ships a build that will immediately degrade.) Effort: S · Risk: low.

**B5. Per-candidate fault isolation in `assembleRaceData`.**
One candidate's DB throw 500s the whole race (`race-data.ts:399`), which the client then
renders as null cards (B2). Wrap per-candidate resolution. Effort: S · Risk: low.

**B6. Small integrity/logging fixes.**
Transaction-wrap the `--reset-votes` delete-then-reinsert (`federal-votes.ts:867`,
operator-only path); actually log in the `alignment.ts:864` silent catch (comment claims
it logs; it doesn't); remove or document the dead `db:migrate` script (`package.json:27`
— no journal exists; migrations are applied manually via `db-exec.ts` by policy, so make
the script say so); optional stale-key sweep for shrunk ingest sources. Effort: S each ·
Risk: low.

## Workstream C — performance

Server first (cheap, high leverage, no design implications):

**C1. Make `/api/race-data` cacheable.** It's POST, so its `s-maxage=3600` header is a
no-op (`race-data/route.ts:140,163`) — the expensive assembly runs on every request. The
data is public and per-cycle static: convert to GET with query params (or wrap in
`unstable_cache`). Effort: S–M · Risk: low.

**C2. Parallelize and collapse the race-data fan-out.** Sequential per-candidate loop
(`race-data.ts:399`) × sequential per-issue loop (`:531`) × 2 DB round-trips per issue =
the dominant latency. `Promise.all` both loops; push the issue filter into one
`inArray(issueTags.canonicalIssue, …)` join. **Do after E1 adds route tests** — this is
the data-integrity path the refactor proposal flags as high-risk. Effort: M · Risk:
medium.

**C3. Stop re-resolving candidates.** `resolveCandidateId` pulls the whole chamber
(2,300+ rows) and name-matches in JS, and `race-data.ts:462` passes a *name* to
`lookupDonorCoalition`, which resolves again. Thread the resolved `candidateId` through;
push match tiers into SQL. (Same fix the House mis-resolution incident pointed at —
`resolveCandidateId` is still latently vulnerable for chat/ballot.) Effort: S–M · Risk:
medium (name-matching behavior is voter-facing).

**C4–C6. Cheap server wins.** Cache the per-Congress delegation roster + geocode results
(`unstable_cache`); replace counters' per-key GET loop with `MGET` and the remaining
aggregate scan with a roll-up counter (`counters.ts:561-681`); compute chamber median
with SQL `percentile_cont(0.5)` instead of fetching every candidate's receipts per race
(`chamber-median.ts:70-91`). Effort: S each · Risk: low.

**C7. Prompt/cold-start trims.** Add a `cache_control` breakpoint on the last message
block for multi-round tool loops (history currently reprocessed uncached); lazy-import
the 100 KB generated ballot prompts in the chat route. Effort: S · Risk: low.

Client second — **sequence against the Keystone redesign port** (see Decision 4):

**C8. Stop importing the 6,839-line legacy monolith into the redesign bundle.**
`App2.tsx:17-30` imports 13 symbols (page views, `I18nProvider`, `NavProvider`) from
`VoterChoiceApp.tsx`; a single `'use client'` module doesn't tree-shake, so the whole
legacy app + all 1,987 lines of translations ship in the default bundle. Extract shared
primitives into standalone modules; lazy-load translations per locale. Effort: M–L ·
Risk: medium.

**C9. Fonts and CSS diet.** Move 6 Google-Fonts families to `next/font` (self-hosted,
non-blocking — `globals.css` already expects the variables); stop unconditionally
shipping ~243 KB of render-blocking CSS in `layout.tsx:74-95` (load duel/redesign sheets
per experience flag). Effort: M · Risk: medium (visual).

**C10. Server-render the intake shell.** `page.tsx` mounts everything `ssr:false`; first
paint waits on the full client chunk. Render the above-the-fold intake/skeleton on the
server. Effort: L · Risk: medium.

**C11. Wire a perf budget into CI, or delete the dead tooling.** `@lhci/cli` is installed
but unwired; `npm run measure` points at a script that doesn't exist. Add an LHCI or
bundle-size job (post-C8 so it locks in the win), and fix or remove `measure`.
Effort: S · Risk: low.

## Workstream D — supply chain and CI hygiene

**D1. Dependency scanning + the overdue bump.** Add `.github/dependabot.yml` (npm,
weekly) and an `npm audit --audit-level=high` (or CodeQL) CI step; bump `next` to
≥15.5.20 now for the transitively-reachable PostCSS XSS. This is the open Stage-2
maturity rung. Effort: S · Risk: low.

**D2. Close the admin bypass.** `main` requires `test`/`e2e`/`mutation` but
`enforce_admins:false`, and `deploy.yml` runs only vitest before shipping — an admin push
deploys with no lint/typecheck/e2e having run. Either set `enforce_admins:true`
(**Decision 2** — removes Muxin's own escape hatch) or add lint+typecheck as a deploy
backstop step (no decision needed; do this regardless). Effort: S · Risk: low.

**D3. Small CI fixes.** Use `node-version-file: '.nvmrc'` in all workflows (currently
float on `"22"` while `.nvmrc` pins 22.14.0); reconcile the Stryker `mutate` list against
`src/lib/server/` (it has drifted — `counters.ts`, `durable-store.ts`,
`chat-usage-metrics.ts` mutate-free); fix the stale `launch/production` branch name in
deploy.yml's author-email error text. Effort: S each · Risk: none.

## Workstream E — maintainability (adopts refactor-proposal-2026-07.md)

The 6 candidates and sequencing from `docs/operations/refactor-proposal-2026-07.md`
stand as written: **(#6 tests → #4 shared validation helper → #3 dead-code removal →
#2 rate-limiter consolidation → #1 donor-script consolidation → #5 large-file splits,
only if explicitly greenlit)**. Additions from this audit:

**E1. Widen proposal #6's test targets.** Union with the devx findings: the whole PDF/
vision extraction path (`extract-vision.ts`, `extract-pdfjs.ts`, `extract-prompt.ts`),
`durable-store.ts`, both rate-limit wrappers, and route tests for `race-data` +
`research-candidate` (the two untested routes). These tests are prerequisites for A1, C2,
and proposal #2. Effort: M · Risk: none.

**E2. Docs and root hygiene.** Commit `docs/maturity.md` (it's untracked — the canonical
ladder is not in git); move the 5 superseded specs (`V2_PLAN.md`,
`STITCH_INTEGRATION_PLAN.md`, `PHASE5_SPEC.md`, `SESSION_PROMPTS.md`,
`REDESIGN_2026_SHIPPED.md`) into `docs/archive/`; delete the empty
`docs/User Notes - DO NOT IMPLEMENT.txt`; move root scratch scripts
(`classify-bills.ts`, `verify-batches.ts`, `verify-insert.ts`) into `scripts/ops/` or
delete (they're also proposal-#3 candidates). Effort: S · Risk: none.

**E3. Settle the Tailwind/globals.css question.** `layout.tsx` doesn't import
`globals.css`, yet `design-tokens.test.ts:63` asserts it does and Tailwind 4 is a
dependency — either the tooling is dead (drop it) or the import is missing (restore it).
One decision, five minutes, currently a trap for the next person. Effort: S · Risk: low.

---

## Sequencing

Ordering principle: close the money/safety gaps first, build the safety net second, then
spend it on performance and structure. Tests always land before the risky change they
protect.

**Phase 1 — close the gaps (all S/M, low risk, no design impact):**
A1 (extract-ballot budget gate), A2, A3, B3 (timeouts), B4 (deploy secret gate),
D1 (dependabot + next bump), D2 backstop, D3, E2, E3.

**Phase 2 — see clearly:**
B1 (health + error tracking, pending Decision 1), B2 (honest error states), B5,
E1/proposal-#6 (tests), proposal #4 (validation helper), B6.

**Phase 3 — make it fast (server):**
C1–C7, C11; then proposal #3 (dead code) and proposal #2 (rate-limiter consolidation,
now that its tests exist).

**Phase 4 — structural (each needs explicit greenlight):**
C8–C10 client-bundle/SSR work **folded into or sequenced after the Keystone redesign
port** (Decision 4); proposal #1 (donor scripts); proposal #5 (large-file splits).

## Decisions for Muxin (product/cost/workflow only — everything else defaults as noted)

1. **Error tracking vs privacy posture (B1).** Adopting Sentry (or similar) means an
   external service potentially receiving request context — and delegation requests
   contain voter addresses. Options: (a) Sentry free tier with PII scrubbing forced off
   at the SDK level + a privacy-policy line, (b) health endpoint + platform logs only.
   Default if no preference: (b) now, (a) only with explicit sign-off.
2. **`enforce_admins` on main (D2).** Turning it on closes the deploy-without-checks hole
   but removes your own admin-push escape hatch. The deploy-backstop step ships either
   way; this decision is only about the bypass.
3. **Greenlight the refactor-proposal candidates** — already pending from PR #225; this
   plan sequences them but doesn't approve them.
4. **Client-perf work vs Keystone port (C8–C10).** The bundle/SSR/CSS items rework the
   exact surfaces the Keystone redesign will replace. Recommendation: do the Keystone
   port first and build C8–C10 into it, rather than optimizing a UI about to be
   rewritten. Confirm or flip.

## Suggested backlog cards

Paste-ready titles (bodies on request per greenlight); priorities are proposals:

| Card | Phase |
|---|---|
| [P1][security] Gate /api/extract-ballot on the community budget + record spend + cap pages | 1 |
| [P2][security] Add the shared rate limiter to /api/chat-catch | 1 |
| [P2][security] Make server-side stripPII unconditional (verify PROMPT_FLEET_V2 prod state) | 1 |
| [P1] Timeouts everywhere: Redis AbortSignal, Anthropic client timeout, chat maxDuration, geocode retry | 1 |
| [P1] Deploy-gate all required secrets (fail, don't warn-and-skip) | 1 |
| [P1] Dependabot + npm-audit CI step + bump next ≥15.5.20 | 1 |
| [P2] CI small fixes: node-version-file, Stryker mutate-list reconcile, deploy.yml copy | 1 |
| [P2] Docs/root hygiene: commit maturity.md, archive 5 stale specs, relocate root scratch scripts | 1 |
| [P1] /api/health endpoint + error-tracking decision (Decision 1) | 2 |
| [P1] Honest client error states: race-data unavailable ≠ empty record; polis failure ≠ first visitor | 2 |
| [P2] Per-candidate fault isolation in assembleRaceData | 2 |
| [P1] Tests: extraction path, durable-store, rate-limit wrappers, race-data + research-candidate routes | 2 |
| [P2] Convert /api/race-data to cacheable GET | 3 |
| [P2] Parallelize race-data fan-out + collapse per-issue N+1 (after route tests) | 3 |
| [P2] Thread resolved candidateId through donor lookup; SQL-side name matching | 3 |
| [P3] Cheap server wins: delegation roster cache, counters MGET, SQL chamber median | 3 |
| [P3] Prompt-cache breakpoint on messages + lazy ballot-prompt import | 3 |
| [P3] Wire LHCI/bundle budget into CI; fix or remove dead `measure` script | 3 |
| [P2] Keystone-sequenced: monolith bundle split, next/font, CSS diet, SSR intake (Decision 4) | 4 |
