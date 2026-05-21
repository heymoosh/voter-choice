# Work Packet: redesign-phase-1-prompt-refactor

Status: ready
Owner: orchestrator
Source: docs/design/2026-redesign/README.md §5 — Phase 1 (Prompt refactor — data layer)
Branch: launch/production

## Intent

Replace the in-app use of the single 12K `BALLOT_PROMPT.md` with the six-prompt fleet defined in `docs/design/2026-redesign/prompts.md`. The app routes which prompt to send based on the current view (cold-open / workspace-race / workspace-prop / amend / handoff). The old monolithic prompt remains in the repo as the out-of-budget handoff target only.

## Original User Intent

From `docs/design/2026-redesign/README.md` §5 Phase 1: "Replace the in-app use of `BALLOT_PROMPT.md` with the six-prompt fleet in `prompts.md`. Keep the old big prompt only as the out-of-budget handoff target. Route which prompt to send based on current view (cold-open / workspace-race / workspace-prop / amend / handoff)."

And from the design brief §14 ("Rewriting the chat prompt"): "From a 12K-character mega-prompt to a fleet of small task prompts. ~300 tokens per task, max. One job per prompt."

## Intent Interpretation

The current `BALLOT_PROMPT.md` (~12K chars) tries to do every chat job in one system prompt — issue picking, race research, output formatting, handoff generation. Haiku's instruction-following degrades under prompts that big and contradictory ("4–6 bullets" vs. "plain language" vs. "3–4 sentences"). The redesign splits this into a shared safety header (~90 tokens) plus five task prompts (theme extraction, race deep-dive, proposition explainer, theme amendment, handoff generation), each under ~1,200 chars / ~300 tokens, picked by the app based on the user's current view.

The dynamic state (themes, decisions, active race, ballot context from the party gate) injects into `<tag>` blocks server-side, never in the prompt body. PII (full name, address, DOB, etc.) is stripped before injection; only city + state may reach the model. Conversation is multi-turn — the system prompt is rebuilt every turn from current app state, while user/assistant turns accumulate in the `messages` array. Chat scope is per-race: switching the active race clears the message history.

Phase 1 is the data-layer foundation everything else builds on. Phase 2 will consume the new theme-extraction prompt and JSON parser to drive the free-form cold open. Phase 5's party gate emits the `<ballot_context>` tag that Phase 1's prompt fleet must already know how to consume. Phase 6 uses the theme-amendment prompt. Phase 9 uses the handoff prompt and keeps the original `BALLOT_PROMPT.md` alive specifically as the handoff target.

**Subsumes a TDD Phase 1 follow-up.** TDD Phase 1's validation task added a `notice` field to the server-side `AlignmentResult` (when `0 < total < 5`, surfaces a "Limited data: only N relevant votes…" message). The chat layer doesn't yet surface that notice to the user. This packet is the natural home for the surface work — the new "race deep-dive" prompt should include an explicit rule to relay any `notice` from `lookup_alignment`, and the chat-route refactor must include the field in the tool-result payload Claude sees.

## Business Logic

Rules:

- Non-partisan civic research only. Every prompt prepends the shared safety header: no recommendations unless explicitly asked, no invented votes/donations/endorsements, no echoing PII back at the user.
- The cold open never uses a pre-built issue list. Theme extraction is structured around free-form user text only; the prompt body does not contain a hard-coded taxonomy of issues. Verbatim user phrases must appear in the JSON output as `quotes`.
- State rules live in `<ballot_context>` data passed in tags, never in the prompt body. The chat never asks "which party are you voting?" mid-conversation; that question is gated upstream in Phase 5.
- PII filter: only `city, state` may be injected into any prompt. Full street address, name, DOB, phone, ID, voter-registration number — all stripped server-side before the prompt is rendered.
- Per-race scope. The system prompt for race deep-dive is rebuilt every turn from app state. When the user switches the active race, message history clears.
- The handoff prompt produces a self-contained block the user can paste into any chatbot. It uses ONLY data inside `<state>`; never invents new context.

Assumptions:

- The repository already uses `@anthropic-ai/sdk` for the chat route. The fleet prompts target Claude Haiku for in-app calls and remain provider-neutral in shape (system + messages array).
- Spanish prompt support: the existing `ballotPromptEs.generated.ts` exposes the legacy translated prompt. A parallel ES fleet is **out of scope** for Phase 1 — ship EN first, mirror to ES in a follow-up.

User-confirmed decisions:

- Phase 1 introduces the new JSON-emitting theme-extraction prompt and the JSON parser. The structured-block contract in `src/lib/structured-blocks.ts` for `[VALUES_TAG_REQUEST]` is **not** removed in Phase 1 — Phase 2 retires it once nothing in the UI reads from it (see redesign-phase-2-free-form-cold-open.md).
- Ship behind a feature flag `PROMPT_FLEET_V2` so the legacy code path stays the default until validation completes. When the flag is off, the existing `generatePrompt.ts` behavior is unchanged.

Edge cases:

- Token budget exhaustion mid-conversation: the chat route surfaces a structured budget-exhausted state (see redesign-phase-9-out-of-budget-handoff.md). Phase 1 must not throw a 500 on budget exhaustion.
- Empty / partial `<candidates>` block (the legislative-record-empty case): the race deep-dive prompt must already instruct Haiku to say "no record to score yet" cleanly. Same for empty `<decided>`.
- User pastes PII into a chat message: the safety header instructs Haiku not to echo it back, but the server-side PII strip must also redact before the user's message ships to the model.
- The Spanish path (`ballotPromptEs.generated.ts`): when `PROMPT_FLEET_V2` is on and the user's locale is `es`, fall through to the legacy ES prompt for now and log it; document the gap.

Out of scope:

- The Spanish-language fleet build-out (deferred to a follow-up packet).
- Switching providers or moving to AI Gateway (independent decision).
- Session-wide chat history retention. Per-race scope is the v1 contract; v2 may extend.
- Streaming UI changes. Existing streaming behavior in the chat route stays.

## Commercial Readiness

Applicability: launch

Lanes in scope:

- product UX (prompt behavior end-to-end)
- API/contracts (chat route system-prompt shape, tag schema)
- privacy/data (PII strip before prompt assembly)
- legal/compliance prompt (non-partisan framing, no advocacy verbs, citation requirement)
- deployment/config (feature flag rollout)
- observability/support (log which prompt was routed; redact tag contents)

User decisions needed:

- none before implementation

Assumptions:

- The `PROMPT_FLEET_V2` flag is read from `process.env.PROMPT_FLEET_V2` server-side (truthy = on). No client-exposed flag for v1; flip via Vercel env.

## Operational Reproducibility

Setup:

- `npm install`

Configuration:

- `ANTHROPIC_VOTER_API` (existing)
- `PROMPT_FLEET_V2` (new; absent or empty = legacy behavior)

Provider setup:

- no new providers — same Anthropic SDK path

Infrastructure/deployment:

- Vercel deploy via the manual `deploy.yml` workflow on `launch/production`. Add `PROMPT_FLEET_V2` to Vercel preview env first; flip on in production after validation.

Database migrations:

- not applicable

Manual steps:

- After deploying with the flag off, manually flip `PROMPT_FLEET_V2=1` in Vercel and observe the chat route's `prompt_used` log field. Roll back by unsetting the env var if regressions appear.

Verification:

- `npm run lint`
- `npm run test` (includes new unit tests below)
- `npm run build`
- `npm run e2e` (cold open → workspace → handoff path)
- `bash scripts/ai-verify.sh`

Test quality:

- Mutation-style golden-file tests for prompt rendering: input app state → exact rendered prompt string. Any silent prompt drift fails the test.
- Unit tests for the routing function: which prompt is returned for each `(view, raceType, trigger)` tuple.
- PII filter tests with adversarial inputs (full address, SSN-shaped string, DOB).

Critical logic trigger:

- privacy (PII strip)
- AI behavior contract (non-partisan, no invented data)
- business rule (per-race scope, multi-turn rebuild)

## Scope

Touch:

- `src/lib/generatePrompt.ts` — split into a router plus per-task prompt builders. Old single-prompt path remains under the flag-off branch.
- `src/lib/generated/ballotPromptEn.generated.ts` — keep available; mark its purpose as "handoff target only" in a comment header.
- `src/lib/generated/ballotPromptEs.generated.ts` — same.
- `src/app/api/chat/route.ts` — read `view`/`activeRaceType`/`trigger` from the request, route to the new prompt, accumulate messages, strip PII, log `prompt_used`.
- `scripts/generate-ballot-prompt-module.mjs` — extend or duplicate so the new task prompts also generate as modules if the existing build pipeline expects it; otherwise leave alone and check in the new prompts as plain TS strings.
- new `src/lib/prompts/safety-header.ts`
- new `src/lib/prompts/theme-extraction.ts`
- new `src/lib/prompts/race-deep-dive.ts`
- new `src/lib/prompts/proposition.ts`
- new `src/lib/prompts/theme-amendment.ts`
- new `src/lib/prompts/handoff.ts`
- new `src/lib/prompts/router.ts` (view → prompt builder)
- new `src/lib/prompts/pii-strip.ts` (or extend an existing util if one exists)
- tests for each builder and the router (extend `generatePrompt.test.ts` posture)

Do not touch:

- `main` branch — work happens on `launch/production` only
- Vercel workflow (`deploy.yml`)
- The structured-block contract in `src/lib/structured-blocks.ts` (Phase 2 owns its retirement)
- `ValuesTagSelector.tsx` or `ConcernInterpretation.tsx` (Phase 2)
- Streaming response handling
- New AI providers

## Ownership Audit

Concern: chat system-prompt contract and request routing per app view
Existing owner: `src/lib/generatePrompt.ts` and `src/app/api/chat/route.ts`
Neighboring owners:

- structured output contracts: `src/lib/structured-blocks.ts` (Phase 2 owns retirement)
- handoff text: `src/lib/generated/ballotPromptEn.generated.ts` (becomes the handoff target only)
- chat UI: `src/components/ChatPanel.tsx` (Phase 2/3 own UI changes)

Files/modules/docs inspected:

- `docs/design/2026-redesign/README.md`
- `docs/design/2026-redesign/prompts.md`
- `docs/design/2026-redesign/Voter Choice Redesign.html` §14
- `src/lib/generatePrompt.ts`
- `src/lib/generated/ballotPromptEn.generated.ts`
- `src/lib/generated/ballotPromptEs.generated.ts`
- `src/app/api/chat/route.ts`
- `scripts/generate-ballot-prompt-module.mjs`
- `src/lib/structured-blocks.ts`

Reuse/edit targets:

- Extend the existing `generatePrompt.ts` module rather than introducing a parallel "v2 prompt module" — single source of truth.
- Reuse the existing Anthropic SDK call site in `src/app/api/chat/route.ts`; just swap what gets passed to `system`.

New owner needed: no — new prompt files live under `src/lib/prompts/` and are imported by the existing owner

Overlap/bloat risks:

- Duplicating PII strip logic across the route handler and the prompt builders. Centralize in one util.
- Two parallel system prompts in production (legacy and fleet) without flag discipline. Mitigated by `PROMPT_FLEET_V2` gating.
- The generated EN/ES prompt modules and the new TS prompts living in two places. Mitigated by documenting `ballotPromptEn.generated.ts` as the handoff-target-only canonical text.

Recommendation:

- Build the router + prompt builders + PII strip behind the flag. Wire `chat/route.ts` to call the router when the flag is on, the legacy path when off. Add tests for both branches so the flag flip is reversible.

Execution constraints:

- Workers must NOT embed any pre-built issue taxonomy in the theme-extraction prompt body.
- Workers must NOT leak PII beyond city + state into any `<tag>` block.
- Workers must NOT remove `BALLOT_PROMPT.md` or its generated module — Phase 9 still uses it.

## Acceptance Criteria

- With `PROMPT_FLEET_V2` off, all existing tests pass and chat behavior is bit-for-bit unchanged.
- With `PROMPT_FLEET_V2` on, the chat route picks the correct prompt for each view via a unit-testable routing function: cold-open → theme-extraction; workspace + race type `choice` → race deep-dive; workspace + race type `proposition` → proposition; theme amendment triggered → theme-amendment; handoff button or budget-exhausted → handoff.
- Every system prompt sent to Anthropic, regardless of task, begins with the shared safety header (verifiable via golden-file test).
- The PII strip util redacts: street address, name, DOB, phone, email, driver's license, voter registration ID. Only `city, state` survives into `<tag>` blocks. Adversarial unit tests cover at least 10 PII shapes.
- Per-race scope: switching the active race in a request body sent to `/api/chat` results in a fresh `messages` array (no carry-over). Asserted in unit tests.
- Each task prompt body is under 1,500 characters (the prompts.md target is ~1,200 — leaving headroom). Asserted via a length test.
- The original `BALLOT_PROMPT.md` and its generated module remain in the repo and are reachable from the handoff prompt path; deletion is explicitly out of scope.
- The race-deep-dive prompt in the new fleet includes an explicit rule: "If `lookup_alignment` returns a `notice` field, relay it to the voter in plain language before continuing." Verbatim or paraphrased acceptable.
- The chat-route refactor passes the full alignment result (including `notice` when present) to the model, NOT a subset that strips it.
- An integration test runs the chat with a thin-data scenario (fixture: `lookup_alignment` returns `{found:true, kept:1, total:3, notice:"Limited data: only 3..."}`) and asserts Claude's response includes language matching `/limited data/i` or equivalent.
- Build, lint, test pass green on `launch/production`.

## Test Plan

Maps each acceptance criterion to a test file path and the shape of the assertion. Per `docs/ai-coding-practices/guardrails/test-driven-development.md`, tests are written BEFORE implementation and the red phase is verified via `scripts/ai-tdd-red.sh`.

| AC | Test file | Test shape |
|---|---|---|
| Legacy path unchanged when flag off | `src/lib/generatePrompt.test.ts` (existing) | with `PROMPT_FLEET_V2=""`, expected: existing snapshot output matches byte-for-byte; observed: match |
| Routing function picks correct prompt per view | `src/lib/prompts/router.test.ts` | input: `{view, raceType, trigger}` tuples (cold-open / workspace-choice / workspace-prop / amend / handoff); expected: builder symbol matches table; observed: match |
| Every prompt begins with the shared safety header | `src/lib/prompts/__tests__/safety-header.golden.test.ts` | render each builder with a fixture state; expected: rendered output starts with verbatim safety-header text from `prompts.md`; observed: starts-with match |
| Theme-extraction prompt content (golden) | `src/lib/prompts/__tests__/theme-extraction.golden.test.ts` | render builder with stub input; expected: matches `theme-extraction.golden.md`; observed: diff = 0 |
| Race-deep-dive prompt content (golden), includes notice-relay rule | `src/lib/prompts/__tests__/race-deep-dive.golden.test.ts` | render builder; expected: output contains the verbatim notice-relay clause (e.g., `/relay.*notice|notice.*plain language/i`) AND matches golden file; observed: both match |
| Proposition prompt content (golden) | `src/lib/prompts/__tests__/proposition.golden.test.ts` | render builder; expected: matches `proposition.golden.md`; observed: diff = 0 |
| Theme-amendment prompt content (golden) | `src/lib/prompts/__tests__/theme-amendment.golden.test.ts` | render builder; expected: matches `theme-amendment.golden.md`; observed: diff = 0 |
| Handoff prompt content (golden) | `src/lib/prompts/__tests__/handoff.golden.test.ts` | render builder; expected: matches `handoff.golden.md`; observed: diff = 0 |
| PII strip redacts 10+ shapes | `src/lib/prompts/pii-strip.test.ts` | input: fixtures with street address, full name, DOB, phone, email, SSN-shaped, driver's license, voter-reg ID, PO box, full address line; expected: only `city, state` survives; observed: per-fixture match |
| Per-race scope: switching active race resets messages | `src/app/api/chat/route.test.ts` | input: request with `activeRaceId` change from prior turn; expected: outgoing `messages` array empty (no carry-over); observed: empty |
| Each task prompt body under 1,500 characters | `src/lib/prompts/__tests__/length.test.ts` | for each builder, render with stub input; expected: `output.length <= 1500`; observed: pass |
| Chat route passes full alignment result (including `notice`) to model | `src/app/api/chat/route.test.ts` | input: tool result `{found:true, kept:1, total:3, notice:"Limited data..."}`; expected: tool-result block forwarded to Claude contains `notice` field verbatim; observed: present |
| Thin-data integration: Claude relays notice in response | `src/app/api/chat/route.integration.test.ts` (mocked Anthropic) | input: chat turn with `lookup_alignment` returning the thin-data fixture; expected: Claude's response text matches `/limited data/i` (or equivalent); observed: match |
| `BALLOT_PROMPT.md` and generated module remain present | n/a — reviewer-enforced via Scope/Anti-Solutions; not test-shape applicable | grep check `find . -name 'BALLOT_PROMPT.md'` returns the file (regression-lock script optional) |
| `npm run lint`, `npm run test`, `npm run build` green | n/a — covered by `bash scripts/ai-verify.sh` in CI | not test-shape applicable; reviewer-enforced |

### Red-phase ritual for this packet

Build the data layer before the wire-up. Write golden-file tests for each new prompt builder first (one builder = one test); run `bash scripts/ai-tdd-red.sh src/lib/prompts/__tests__/theme-extraction.golden.test.ts` and confirm the red exit before the file at `src/lib/prompts/theme-extraction.ts` exists. Then the router and PII strip (`router.test.ts`, `pii-strip.test.ts`), each red-verified before its implementation lands. The chat-route integration tests come last — once the router and builders are green, write `src/app/api/chat/route.test.ts` for the per-race reset and the notice-forwarding shape, red-verify each, then wire the route to consume the router. Capture every `ai-tdd-red.sh` output into the Evidence Plan.

## Verification

- `npm run lint` clean.
- `npm run test` passing, including the new unit tests in `src/lib/prompts/*.test.ts` and the extended `generatePrompt.test.ts`.
- `npm run build` successful.
- `npm run e2e` happy path (cold open → workspace → handoff button) with `PROMPT_FLEET_V2=1` set in the test env. Verifies the wire-level system-prompt contract via fixture inspection.
- `bash scripts/ai-verify.sh` runs and emits no kit-routing warnings.
- Manual smoke: deploy to preview, flip flag on, run one cold open + one race deep-dive + one handoff and capture the `prompt_used` log line for each.

## Evidence Plan

Visual evidence:

- not applicable — Phase 1 has no UI surface beyond the existing chat. (UI changes belong to Phase 2/3.)

Behavior evidence:

- Test name + output showing the routing function returns the expected prompt builder for each `(view, raceType, trigger)` input.
- Test output showing the assembled system prompt for a fixture app state (golden file).

Business logic evidence:

- Rule: "Only city + state in tags" — adversarial PII test fixture as input, expected stripped output, observed match.
- Rule: "Per-race scope" — request with race-switch flag, expected empty `messages`, observed empty.
- Rule: "Non-partisan safety header on every prompt" — golden-file diff showing the header as prefix on each builder's output.

Persistence evidence:

- not applicable — no client persistence in this packet. (Themes/decisions persistence belongs to Phase 3.)

Auth/security evidence:

- PII strip test names + outputs. Confirm no `<tag>` block content includes street/name/DOB.
- `ANTHROPIC_VOTER_API` continues to be server-only; no client exposure.

Commercial readiness evidence:

- Privacy lane: PII strip tests pass.
- Legal/compliance lane: safety header verbatim matches the prompts.md text.

Operational evidence:

- `npm run lint`, `npm run test`, `npm run build` command output.
- Vercel preview deploy URL + the `prompt_used` log line from a real cold-open call.

Integration evidence:

- Real Anthropic call captured in preview (or VCR fixture in unit test) showing the assembled prompt and a valid response shape.

Regression evidence:

- `npm run test` shows the legacy `generatePrompt.test.ts` cases still pass with the flag off.

Proof standard:

- A reviewer can flip `PROMPT_FLEET_V2` between off and on in preview, observe the prompt fleet engage on, observe legacy behavior off, and see green lint/test/build on both branches. PII tests demonstrate no leakage. Golden-file tests demonstrate the safety header is on every outgoing prompt.

Non-proof:

- "Manually clicked through and it seemed to work" without log output naming the routed prompt.
- A unit test that asserts the prompt builder is *called* but does not snapshot the resulting prompt text.
- Lint/build passing alone — the PII and routing behavior must be asserted by tests.

### Captured evidence — PR 1 (data layer, 2026-05-21)

Branch: `feat/redesign-phase-1-prompts-pr1` (Waves 1a foundation + 1b builders + 1c router).

Red-phase artifacts (each captured via `scripts/ai-tdd-red.sh`, all exited 0 with "confirmed RED — proceed to implementation"):

- `/tmp/tdd-red-safety-header.txt` — 6/7 tests failing on real assertions
- `/tmp/tdd-red-pii-strip.txt` — 18/22 tests failing on real assertions
- `/tmp/tdd-red-theme-extraction.txt`, `/tmp/tdd-red-race-deep-dive.txt`, `/tmp/tdd-red-proposition.txt`, `/tmp/tdd-red-theme-amendment.txt`, `/tmp/tdd-red-handoff.txt` — golden tests confirmed red
- `/tmp/tdd-red-length.txt` — length test red-verified at LIMIT=100 stub, committed at LIMIT=1500
- `/tmp/tdd-red-parse-theme-extraction.txt` — 11 parser tests failing on stub
- `/tmp/tdd-red-router.txt` — 18 router tests failing on stub

Orchestrator re-verification (independent of subagent claims, per Verification Rigor rule):

- `npm run lint`: rc=0 (`/tmp/pr1-final-lint.txt`)
- `npm run test`: rc=0 — 53 files / 1120 tests pass (`/tmp/pr1-final-test.txt`)
- `npm run build`: rc=0 (`/tmp/pr1-final-build.txt`)
- `bash scripts/ai-mutation-check.sh`: rc=0 — **mutation score 35.58%** (up from 26.90% baseline), `prompts/` directory at 69.38% / 70.05% covered. `handoff.ts` 100%, `pii-strip.ts` 68.22% (88 killed, 41 survived), `parse-theme-extraction.ts` 57.14% (24 killed, 17 survived). Survived mutants are eligible for a Phase 2b follow-up but pass the global 22% break threshold. (`/tmp/pr1-mutation-final.txt`)

AC coverage in PR 1:

- AC #2 — `src/lib/prompts/router.test.ts` (18 tuple-table cases including trigger overrides + invalid combos)
- AC #3 — `src/lib/prompts/__tests__/safety-header.golden.test.ts` (verbatim §0 from prompts.md)
- AC #4 — `src/lib/prompts/pii-strip.test.ts` (22 cases: 10 PII shapes + 2 negative `Austin, TX` / `Senate Bill 1` preservation cases — ordering documented in `pii-strip.ts:8-20`)
- AC #6 — `src/lib/prompts/__tests__/length.test.ts`. Builder lengths at typical fixture: theme-extraction 783, race-deep-dive 1348, proposition 1019, theme-amendment 949, handoff 824 (all ≤1500).
- AC #7 — `src/lib/prompts/race-deep-dive.ts` includes the notice-relay rule verbatim in its Rules block; covered by the golden test.
- AC #14 — legacy `src/lib/generated/ballotPromptEn.generated.ts` and `BALLOT_PROMPT.md` untouched; chat route not yet wired (deferred to PR 2).

AC #1 (legacy bit-for-bit unchanged with flag off), #5 (per-race reset), #8 (chat route forwards full alignment result including notice), #9 (thin-data integration test), and #10 (`PROMPT_FLEET_V2` flag wiring) are deferred to PR 2 (chat-route refactor).

## Anti-Solutions

- Do not embed a hard-coded list of approved issues anywhere in the theme-extraction prompt body (this re-introduces non-negotiable #1 by the back door).
- Do not leave `[VALUES_TAG_REQUEST]` structured-block parsing as the active code path for the new flow — Phase 1 introduces the JSON parser; Phase 2 retires the old block.
- Do not delete `src/lib/generated/ballotPromptEn.generated.ts` or `BALLOT_PROMPT.md`. They are the handoff target — required by Phase 9.
- Do not ship without the feature flag. The cutover must be reversible.
- Do not pass full address, name, DOB, or any other PII into a `<tag>` block. City + state only.
- Do not rebuild conversation history server-side from app state and pretend it's the system prompt — system prompt and `messages` array are different concerns.
- Do not introduce a parallel "v2 chat route" — extend `src/app/api/chat/route.ts`.
- Do not hard-code a non-English locale fallback as "English fleet" silently — log it.

## Notes

- The prompts.md file is the canonical source for the prompt body text. Copy verbatim into the per-task builder modules; treat any divergence as a bug.
- Race deep-dive runs many times per session — it's the most-used. Optimize its assembly path for low overhead; the others run once or twice.
- Consider a tiny snapshot util that emits the rendered system prompt to a debug log when `process.env.PROMPT_DEBUG=1` is set, server-side only. Useful for triage in preview.
- The Phase 5 (state party gates) `<ballot_context>` schema needs to be agreed on alongside Phase 1's prompt fleet. Sketch the schema in `src/lib/prompts/types.ts` so Phase 5 has a target.
- The limited-data notice ships server-side as part of TDD Phase 1 (commit `5967ced`). This packet surfaces it via the new prompt fleet — closes the [P1] from `docs/operations/post-launch-backlog.md` ("Alignment returns kept: 0 silently for unmapped concerns").
