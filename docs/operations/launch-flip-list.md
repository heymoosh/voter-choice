# Launch flip-list

Every candidate "pre-launch dark" surface in the app — code that already
shipped to prod but must stay invisible to real users until a coordinated
go-live flip — plus the operational/config toggles that came up in the same
inventory pass but are **not** part of that flip.

This doc is the flip checklist for **"[P1] EPIC: Go-live launch gate (do
these ONLY when flipping to public)"** (card-id
`0054bb72-cb87-46a6-987d-9cebaeb3e0eb`). That EPIC's other members (lower
`CHAT_DAILY_SESSION_LIMIT`, reset the Polis count, ship translations) stay on
their own cards — this doc only covers env-flag/feature-gate surfaces.

Backing code: `src/lib/launch-flags.ts` (`LAUNCH_FLAG_REGISTRY`). Keep this
table and that registry in sync by hand — there is no codegen between them.

Produced by card **a09a77c8** ("Establish a launch-flag convention for
pre-launch features"), 2026-07-01/02 inventory pass. **Confirmed** entries
still need Muxin's sign-off at PR review before the go-live flip actually
happens; **uncertain** entries need Muxin's classification call first.

---

## How to read this table

- **Status** — `confirmed` = a real not-yet-launched surface, keep OFF until
  go-live. `uncertain` = flagged by the inventory pass, not yet classified.
  `operational` / `already live` = not part of the go-live flip at all (see
  below); listed here only because the inventory pass found them.
- **Flip action** — the exact env var + value to set to turn the surface on.
  None of these have been set. Do not set any of them until go-live.
- **Where** — the primary file that reads the flag.

## Pre-launch dark surfaces (part of the go-live flip)

| Env var                           | Status           | Gates                                                                                                                                                | Flip action                                                                                                                                                                                           | Where                                     |
| --------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `CAN2026_DISPLAY_ENABLED`         | confirmed        | CAN2026 curated context (race ratings, donor trail, key-vote prose) on seat cards                                                                    | Set `CAN2026_DISPLAY_ENABLED=true` (any non-empty string) in Vercel prod env, then redeploy                                                                                                           | `src/lib/server/can-flag.ts`              |
| `VOTER_ISSUE_EVENTS_ENABLED`      | confirmed        | Persisting anonymous voter issue-preference event rows (state + issue + stance, no identifier) to Postgres at session-end                            | Set `VOTER_ISSUE_EVENTS_ENABLED=true` in Vercel prod env, then redeploy                                                                                                                               | `src/lib/server/counters.ts`              |
| `POLIS_VECTOR_COLLECTION_ENABLED` | confirmed        | Writing de-identified Polis response vectors to `polis_response_vectors`                                                                             | Set `POLIS_VECTOR_COLLECTION_ENABLED=true` in Vercel prod env, then redeploy. **Also requires wiring `collectPolisVector()` into a live caller first** — as of this pass it has no caller (see below) | `src/lib/polis/collectVector.ts`          |
| `CHAT_USAGE_METRICS_ENABLED`      | **uncertain**    | Recording per-call chat cost/token usage rows to Postgres (internal telemetry — invisible to voters either way; already wired into `POST /api/chat`) | Set `CHAT_USAGE_METRICS_ENABLED=true` in Vercel prod env, then redeploy                                                                                                                               | `src/lib/server/chat-usage-metrics.ts`    |
| `PAC_TRANSPARENCY_ENABLED`        | **already live** | Part 6 money-transparency blocks on seat cards: "Top PACs and their sponsors" (6a) + "Outside spending about this race" (6b)                         | FLIPPED by Muxin 2026-08-16 — after the live 6b ingest run and the 30-committee curation pass (its two documented blockers). No action at go-live.                                                    | `src/lib/server/pac-transparency-flag.ts` |
| `PROMISE_TRACKER_ENABLED`         | confirmed        | Part 5 promise-ledger kept/broken verdicts (candidate_promises / promise_actions / promise_verdicts) rendered anywhere                              | Do NOT set — gated on rubric §6.4 (independent-annotator gold pass, κ ≥ 0.70, ≥ 90% adjudicator agreement, zero kept↔broken polarity flips) AND Muxin's sign-off regardless of scores. No UI exists yet either way (separate Claude Design session). | `src/lib/server/promise-tracker-flag.ts`  |
| `BILLIONAIRE_DONOR_MATCH_ENABLED` | confirmed        | `billionaire_donor_contributions` (matched itemized FEC donor records against the hand-verified BILLIONAIRE_SEED list) rendered anywhere            | Do NOT set — low-confidence matches (name match, contradicting employer) need human review before any UI decision, which is itself deferred to a separate Claude Design session. No reader/UI exists yet either way.                                | `src/lib/server/billionaire-donor-flag.ts` |
| `NEXT_PUBLIC_LAUNCH_ON_DEVICE_AI` | confirmed        | Dev-only on-device (WebLLM) theme-extraction comparison surface: `/dev/on-device-ai` page + `/api/dev/theme-extraction-compare` reference API route | Do NOT set outside dev/eval — internal spike/eval tool only, no voter-facing feature. Both surfaces return a bare 404 when unset.                                                                                                                     | `src/app/dev/on-device-ai/page.tsx`        |

### Blockers noted during the inventory pass (not flag-related, but block the flip)

- `CAN2026_DISPLAY_ENABLED`: blocked on confirming can2026.org attribution
  terms with the maintainer (per `.env.example` and `docs/operations/can2026-*`
  context). Flipping the flag before that is confirmed is a legal/attribution
  risk, not a code risk.
- `VOTER_ISSUE_EVENTS_ENABLED`: blocked on the privacy-policy update covering
  this collection going live.
- `PAC_TRANSPARENCY_ENABLED`: RESOLVED 2026-08-16 — both blockers cleared
  (live 6b ingest run; 30-committee curation pass with curated summaries +
  citations, migration 0024) and Muxin flipped the flag in Vercel prod. See
  `docs/DONOR_FRAMING_AND_ACCOUNTABILITY_PLAN.md` Part 6.
- `POLIS_VECTOR_COLLECTION_ENABLED`: `collectPolisVector()` is not called
  anywhere yet (see the `TODO` in `src/lib/polis/collectVector.ts` — it needs
  to be wired into `src/app/api/counters/route.ts` alongside
  `recordConcernEvents`). Flipping the env var alone does nothing until that
  wiring lands.

## Not part of the go-live flip (operational / already-resolved)

Found by the same inventory grep; documented here so the flip-list is
provably exhaustive, but none of these should be touched by the go-live EPIC.

| Env var                                                                                                                                                                                                                                                                                                                                                             | Status           | Why it's excluded                                                                                                                                                                                                                                               | Where                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_BALLOT_ENABLED`                                                                                                                                                                                                                                                                                                                                        | operational      | Experience switch, not an unlaunched feature: unset/false already serves the CURRENT live experience (congress-assessment). `true` re-enables the deliberately-parked legacy ballot app for Phase 3 reuse — flipping it ON would be a regression, not a launch. | `src/app/page.tsx`                          |
| `PROMPT_FLEET_V2`                                                                                                                                                                                                                                                                                                                                                   | **already live** | Set in Vercel prod env already (six-prompt-fleet chat system is the live behavior). Do not change its default — out of scope for this card.                                                                                                                     | `src/app/api/chat/route.ts`                 |
| `POLIS_COMPASS_THRESHOLD`                                                                                                                                                                                                                                                                                                                                           | operational      | Numeric tuning value (min session count before real clusters render), not a boolean feature gate. The `/api/polis/compass` endpoint is already live; it just has no data yet.                                                                                   | `src/app/api/polis/compass/route.ts`        |
| `CHAT_DAILY_SESSION_LIMIT` / `CHAT_CONCURRENT_SESSION_LIMIT`                                                                                                                                                                                                                                                                                                        | operational      | Numeric abuse-control config. The daily-limit rollback (100→10) is already its own line item on the Go-live EPIC — a value change, not a flag flip.                                                                                                             | `src/lib/server/rate-limit.ts`              |
| Extraction-detector floors (`EXTRACTION_DETECTOR_DICT_FLOOR`, `_VOCAB_FLOOR`, `_PROPER_NOUN_FLOOR`)                                                                                                                                                                                                                                                                 | operational      | Numeric fraud-detection tuning for ballot-PDF extraction, not a feature switch.                                                                                                                                                                                 | `src/lib/server/extract-detector.ts`        |
| API keys / credentials (`ANTHROPIC_VOTER_API`, `GOOGLE_CIVIC_API_KEY`, `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`, `FEC_API_KEY`, `OPENSTATES_API_KEY`, `CONGRESS_GOV_API_KEY`, `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_REGION`, `KV_REST_API_URL`/`KV_REST_API_TOKEN`, `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`, `DATABASE_URL`, `STRIPE_SECRET_KEY`) | operational      | Credentials/connection strings, not feature gates. `STRIPE_SECRET_KEY` is present in `.env.local` but is not read anywhere in the current codebase — no action needed.                                                                                          | various                                     |
| Ingest/ops-script-only vars (`RATIONALE_DRY_RUN`, `RATIONALE_LIMIT`, `RATIONALE_MODEL`, `STATE`, `SESSION_LIMIT`, `F1_VERIFY_PDF`, `RUNS`, `CERS_SESSION_COOKIE`)                                                                                                                                                                                                   | operational      | Read only by scripts under `scripts/`, run manually/offline — not part of the deployed web app's request path.                                                                                                                                                  | `scripts/ingest/*`, `scripts/_verify-f1.ts` |
| `NODE_ENV` branches (e.g. rate-limit defaults, `LOOKUP_LIMIT` in `src/app/api/civic/route.ts`, `src/app/layout.tsx`)                                                                                                                                                                                                                                                | operational      | Standard dev/prod branching built into Next.js, not an app-defined feature gate.                                                                                                                                                                                | various                                     |

---

## The LAUNCH\_\* convention (for new pre-launch features going forward)

Existing ad-hoc flags above keep their names — this card does not rename or
rewire them (see `src/lib/launch-flags.ts` header for why). For any **new**
pre-launch dark feature from here on:

1. Pick a name: `LAUNCH_<THING>` for a server-only gate, or
   `NEXT_PUBLIC_LAUNCH_<THING>` for a client (build-time-inlined) gate.
2. Add it to `.env.example`, documented as default-OFF, matching the style of
   `CAN2026_DISPLAY_ENABLED` / `VOTER_ISSUE_EVENTS_ENABLED` there.
3. Server-side: gate the surface with
   `isLaunchFlagEnabled("LAUNCH_THING")` from `src/lib/launch-flags.ts`
   (strict `=== "true"`; everything else, including unset, is OFF — see that
   file's tests in `src/lib/launch-flags.test.ts` for the default-OFF/prod
   proof).
   Client-side: Next.js only statically inlines the literal expression
   `process.env.NEXT_PUBLIC_LAUNCH_THING === "true"` written directly at the
   call site (same pattern as `NEXT_PUBLIC_BALLOT_ENABLED` in
   `src/app/page.tsx`) — it cannot be read through a parameterized helper in
   a client bundle.
4. Add a row to `LAUNCH_FLAG_REGISTRY` in `src/lib/launch-flags.ts` and a row
   to this table (`confirmed` once the surface is genuinely pre-launch;
   `uncertain` if you're not sure).
5. When it's time to go live, flip it via the flip actions in this doc as one
   coordinated step under the Go-live EPIC — never flip a single surface's
   flag ad hoc as a side effect of an unrelated change.
