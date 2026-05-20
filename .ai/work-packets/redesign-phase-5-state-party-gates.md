# Work Packet: redesign-phase-5-state-party-gates

Status: ready
Owner: orchestrator
Source: docs/design/2026-redesign/README.md §5 — Phase 5 (State party gates)
Branch: launch/production

## Intent

Build the state-aware ballot-eligibility gate that appears between address entry and the cold open **only when state rules require it**. Driven by a rules table keyed by `[state, electionType]`. Ship Texas (runoff overlay, §172.087), Pennsylvania (closed primary), and California (top-two) first; rules table is extensible by adding rows. Selection becomes part of every downstream chat call's system prompt as `<ballot_context>`. General elections skip the gate entirely.

## Original User Intent

From `docs/design/2026-redesign/README.md` §5 Phase 5: "Build the gate screen that appears between address entry and cold open **only when state rules require it**. Driven by a rules table keyed by `[state, electionType]`. Ship TX (runoff overlay, §172.087), PA (closed primary), and CA (top-two) first; rules table is extensible by adding rows."

And from the design brief §13 ("State party gates"): "What you're allowed to vote on depends on where you live. Texas runoffs lock you to the party you voted in March. Pennsylvania closes its primaries to registered party members only. California puts every candidate on one ballot regardless of party. Until we know which ballot to use, the chat literally cannot run safely."

## Intent Interpretation

State party gates are non-negotiable #2 made literal: rules live as data, not code. The current app has no party-gate concept; the chat may research races a user isn't actually eligible to vote in (TX runoff after a March DEM primary, PA closed primary for an unaffiliated voter, etc.). The redesign inserts a small gate screen between address entry and the cold open, **driven by a lookup keyed `[state, electionType]`**. If the lookup returns a rule, render the gate; if not, skip entirely.

Three states ship in v1:
- **TX (semi-closed runoff overlay, §172.087):** 5 options — which March primary the user voted in (DEM/REP/none) × which runoff they want. Gate shown only for runoff elections.
- **PA (closed primary, 25 Pa. Code §2812):** read registration party from precinct file. If registered DEM/REP, that's the only ballot; if unaffiliated, show graceful "you cannot vote this primary — here's how to switch for next cycle" path. No choice for the user.
- **CA (top-two, Cal. Const. art. II §5):** no gate. Every voter sees every candidate on a single ballot. The lookup returns "skip gate" so the screen never appears.

Additionally, GA and NY appear in the rules table (per design brief §13) as future entries but aren't required ship targets for v1. The schema must support both "gate with options" rules (TX, GA) and "no gate" rules (CA, general elections), and "blocking" rules (PA / NY closed states for unaffiliated voters).

The user's selection becomes part of every downstream chat call's system prompt as `<ballot_context>{state, county, ballot, electionDate}</ballot_context>` (Phase 1 must already know how to consume this tag). The chat downstream never asks "which party are you voting?" mid-conversation — that question is upstream.

Phase 5 depends on Phase 1 (the `<ballot_context>` schema must be agreed and the prompt fleet must consume it). It produces input to all downstream phases that touch chat behavior.

## Business Logic

Rules:

- Rules live as data in a single lookup keyed `[state, electionType]`. Adding a new state means **adding a row**, never writing new component-code branches. No `if (state === 'TX')` inside components.
- The gate component renders the same shape every time, populated from data: radio list of options + statute box + continue button. Component shape never branches by state.
- If the lookup has no rule for the current `[state, electionType]`, the gate route returns "skip" and the user is sent directly to the cold open.
- Closed-state graceful path: when a state requires registration and the user isn't registered (PA unaffiliated for primary), render an explicit "you cannot vote this primary — here's how to switch for next cycle" screen. Do not hide the constraint; do not lock the user out of seeing it.
- "I'm not sure" is a real answer for ambiguous gates (TX runoff). It routes to an AI-assisted clarification flow that uses the theme-amendment prompt pattern (or a small dedicated micro-prompt) — the chat helps the user figure out their status. Do not lock people out for ambiguity.
- Selection becomes part of the system prompt's `<ballot_context>` tag in every downstream chat call (Phase 1 consumes this).
- Cite the statute. Visible to the user (read like authority, not surveillance). Establishes trust.
- General elections: lookup never matches; gate is never shown. The Nov 3, 2026 election in the project's scope skips the gate by definition.
- Gate selection is **not stored**. It routes the session only; it doesn't get persisted beyond the workspace lifecycle.

Assumptions:

- The current app already knows the user's state (from `src/lib/getStateData.ts`, `src/lib/lookupZip.ts`, `src/lib/lookupCounty.ts`). The election type is derivable from the Civic API or hardcoded for the current election cycle.
- For PA's closed-primary rule, the precinct file may not be available in v1 — fall back to asking the user their registration party with a "we'll trust your answer" framing. Document this as a known gap.

User-confirmed decisions:

- TX, PA, CA ship in v1. GA, NY, and other states are follow-up rows (template included for extensibility).
- Rules live in `getStateData.ts` (extended) or a sibling module — worker decides based on cleanest organization. Either way, the structure is data-driven, not branching code.

Edge cases:

- User changes address mid-session (back to home, re-enter): the gate re-evaluates based on the new state. Selection clears.
- State lookup returns ambiguous result (a county that straddles two states — extremely rare but possible): default to the more conservative rule (the one that requires the gate); document.
- The election type can't be inferred (no clear "primary" / "general" / "runoff" signal from Civic API): default to "general" (no gate), with a debug log surfacing the case.
- "I'm not sure" path: micro-AI-clarification flow returns to the gate with a recommended option pre-selected, not auto-selected. User confirms before continuing.
- Unaffiliated voter in PA: show the "you cannot vote this primary" path with a link to the state's "register to vote / change affiliation" page. Allow them to continue with "skip primary, show me general election context" if applicable.
- Test elections / preview / staging without a real election cycle: gate routes to a "no rule applies" path; chat proceeds with `<ballot_context>` set to a sane default.
- Rules table contains a row with malformed schema (defensive coding): log and fall through to "no gate" rather than throw.

Out of scope:

- Cross-state mobility (military / overseas voters with multiple registrations). v1 assumes one state per session.
- Voter-registration deep links beyond a generic "go to your state's SOS site" target. Per-state SOS URLs can be added as rules-table data later.
- Live precinct-file integration for PA (deferred; ask the user in v1).
- Building gates for every closed-primary state (CT, DE, FL, KY, LA, MD, NV, NM, NJ, NY, NC, OK, OR, PA, SD, WV, WY, plus DC). Ship the 3 named; the table accepts new rows.

## Commercial Readiness

Applicability: launch

Lanes in scope:

- product UX (a new screen in the funnel)
- accessibility/responsive (radio list, statute box, keyboard navigation)
- privacy/data (selection is session-scoped; never persisted beyond localStorage; never sent to model as PII)
- API/contracts (`<ballot_context>` tag schema; Phase 1 must consume)
- legal/compliance prompt (statute citations are factual; verify each rule's citation accuracy)
- deployment/config (feature-flag rollout via `PROMPT_FLEET_V2` or a dedicated `STATE_GATES_V1`)

User decisions needed:

- none before implementation

Assumptions:

- Statute citations are accurate as written in the design brief §13. Worker should cross-check before shipping.

## Operational Reproducibility

Setup:

- `npm install`

Configuration:

- `PROMPT_FLEET_V2` (gates the chat-side `<ballot_context>` consumption)
- optional `STATE_GATES_V1` for the gate UI itself, or piggyback on the same flag

Provider setup:

- no new providers

Infrastructure/deployment:

- Vercel manual deploy via `deploy.yml`

Database migrations:

- not applicable

Manual steps:

- After deploy: simulate each ruleset by setting a test address in each of TX/PA/CA and verifying gate behavior (TX shows 5 options for runoff, none for general; PA shows registration-required path for unaffiliated; CA skips the gate).

Verification:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run e2e` — gate happy paths for TX/PA/CA + general-election skip
- `bash scripts/ai-verify.sh`

Test quality:

- Table-driven unit tests: `(state, electionType) → expected gate component output`. Covers every shipped row.
- Adding a hypothetical new state to the rules table in a test adds exactly one row of test data — no component code changes — and the new gate renders correctly. (Demonstrates rules-as-data discipline.)
- Mutation tests for the lookup function and the `<ballot_context>` serialization.

Critical logic trigger:

- business rule (ballot eligibility is legally meaningful)
- AI behavior (downstream chat depends on correct `<ballot_context>`)

## Scope

Touch:

- `src/lib/getStateData.ts` — extend with the rules table schema and the lookup function. (Or create a sibling module if the existing file's concerns are unrelated.)
- new `src/components/PartyGate.tsx` — the gate screen component (data-driven render).
- new `src/lib/state-rules/types.ts` — `StateRule` type, `GateOption` type, etc.
- new `src/lib/state-rules/rules.ts` — the actual rule rows (TX, PA, CA; placeholder structure for GA, NY).
- new `src/lib/state-rules/lookup.ts` — `(state, electionType) → StateRule | null` function.
- `src/app/PageContent.tsx` — routing inserts gate between address and cold open when lookup returns a rule.
- `src/lib/server/` — possibly new module for the `<ballot_context>` serializer (consumed by Phase 1's prompt route).
- `src/lib/prompts/types.ts` — extend the `<ballot_context>` schema (sketched in Phase 1).
- tests for the rules table, the lookup function, the gate component, and the `<ballot_context>` injection.

Do not touch:

- `main`
- `BALLOT_PROMPT.md` or generated modules (Phase 1/9)
- Cold-open UI (Phase 2)
- Workspace shell (Phase 3)
- Candidate cards (Phase 4)
- Chat conversation logic (Phase 1's prompt routing)

## Ownership Audit

Concern: ballot eligibility rules, gate UI, ballot_context system-prompt context
Existing owner: `src/lib/getStateData.ts` (state data), `src/lib/lookupZip.ts`, `src/lib/lookupCounty.ts`
Neighboring owners:

- routing: `src/app/PageContent.tsx`
- prompt fleet: `src/lib/prompts/` (Phase 1)
- state info card: `src/components/StateInfoCard.tsx`, `src/components/StateSelectorModal.tsx`

Files/modules/docs inspected:

- `docs/design/2026-redesign/README.md` §5 Phase 5
- `docs/design/2026-redesign/Voter Choice Redesign.html` §13 (including rules table for TX, PA, CA, GA, NY)
- `docs/design/2026-redesign/prompts.md` (multi-turn context handling)
- `src/lib/getStateData.ts`
- `src/lib/lookupZip.ts`
- `src/lib/lookupCounty.ts`
- `src/components/StateInfoCard.tsx`
- `src/components/StateSelectorModal.tsx`

Reuse/edit targets:

- `getStateData.ts` is the natural home for state rules — or a sibling module if it becomes too crowded. Worker decides.
- `StateInfoCard.tsx` displays state-level context already; no overlap with the gate screen but worth noting.

New owner needed: yes — `src/lib/state-rules/` directory owns rule data, types, and lookup. `PartyGate.tsx` owns the UI.

Overlap/bloat risks:

- Re-implementing state lookup in multiple places (gate, civic API call, chat injection) — centralize.
- Branching code by state inside `PartyGate.tsx` — this is what non-negotiable #2 prohibits. Component renders shape, data drives content.
- Persisting gate selection somewhere unintended (full session storage, server-side log) — session-scoped only.

Recommendation:

- Build a single `StateRule` type, a single data file (`rules.ts`), a single lookup function. `PartyGate.tsx` accepts a `StateRule` and renders. Easy to test.

Execution constraints:

- Workers must NOT branch on state name inside any component (`PartyGate`, routing, chat). All state-conditional behavior flows through the rules table.
- Workers must NOT remove the "I'm not sure" option from gates that include ambiguity (TX).
- Workers must NOT hide the "you cannot vote this primary" path for unaffiliated voters in closed states — that's the graceful trust-preserving behavior.
- Workers must NOT inject any PII into `<ballot_context>` beyond state/county/electionDate/ballotType.

## Acceptance Criteria

- `src/lib/state-rules/lookup.ts` exposes a function `getStateRule(state, electionType): StateRule | null`.
- Rules table contains rows for: TX (runoff, semi-closed, §172.087, 5 options), PA (primary, closed, §2812, registration-based), CA (any, top-two, no gate). Optional placeholder rows for GA and NY.
- `PartyGate.tsx` renders the gate component populated from a `StateRule`. The component does NOT contain any `if (state === ...)` branching.
- Routing in `src/app/PageContent.tsx`: when the user submits address and the lookup returns a rule, render `PartyGate`. When it returns `null`, route directly to cold open.
- TX runoff election: gate shows 5 radio options + statute citation. User selection routes downstream with `<ballot_context>{state: "TX", ballot: "DEM-runoff" | "REP-runoff"}`.
- PA closed primary for unaffiliated voter: gate shows "you cannot vote this primary" screen with re-registration link. User can opt to continue with general election context.
- CA election: gate is skipped (lookup returns `null` or a "skip" sentinel).
- General election in any state: gate is skipped.
- "I'm not sure" option (TX) routes to a clarification flow that helps determine the user's status.
- The `<ballot_context>` tag content lands in every subsequent chat call's system prompt (verified via the Phase 1 PII-strip + routing tests).
- Adding a new state row to `rules.ts` and a corresponding test case is the **only** code change required to support a new state (asserted by a meta-test or documented as a manual verification step).
- `npm run lint`, `npm run test`, `npm run build` pass.

## Verification

- `npm run lint` clean.
- `npm run test` passing — including table-driven tests for every shipped rule and the gate component.
- `npm run build` successful.
- `npm run e2e` — gate happy paths for TX/PA/CA + general-election skip.
- `bash scripts/ai-verify.sh` clean.
- Manual smoke: each of the 3 shipped states + a general-election control.

## Evidence Plan

Visual evidence:

- Screenshot of TX runoff gate (5 options visible).
- Screenshot of PA closed-primary unaffiliated path.
- Screenshot showing CA skips the gate (address → cold open directly).

Behavior evidence:

- E2E test outputs for each state's gate happy path.
- Test name showing "no rule = skip gate" routing.

Business logic evidence:

- Rule: "Rules as data" — meta-test demonstrating that adding a new state requires only a rules-table row + a test fixture, no component changes. Captured in a PR or commit shown to be component-pure.
- Rule: "Closed-state graceful path" — test fixture with PA + unaffiliated, expected "you cannot vote this primary" screen rendered.
- Rule: "`<ballot_context>` propagation" — test: complete the gate with selection X, verify downstream chat call's system prompt contains `<ballot_context>...X...</ballot_context>`.

Persistence evidence:

- Selection is session-scoped (localStorage); not sent to any server endpoint beyond the chat route's runtime usage.

Auth/security evidence:

- `<ballot_context>` tag content reviewed in test output: no PII (no name, no street, no DOB), only `state, county, ballot, electionDate`.

Commercial readiness evidence:

- Legal/compliance lane: statute citations verified against authoritative source (state SOS or legal database).

Operational evidence:

- `npm run lint`, `npm run test`, `npm run build`, `npm run e2e` output.

Integration evidence:

- Real chat call in preview with a TX-runoff selection; system prompt logged with `<ballot_context>` correctly set.

Regression evidence:

- General election (Nov 3, 2026) in any state: gate is skipped, existing flow proceeds as before.

Proof standard:

- A reviewer can test each of TX/PA/CA and a general election, observe the expected gate behavior in each, and verify the downstream chat receives the correct `<ballot_context>`. Then add a hypothetical state row to `rules.ts` and a fixture, observe that no component code changed.

Non-proof:

- "TX gate renders" alone — must include the no-gate-for-CA and graceful-PA cases.
- A test that asserts the lookup returns a rule but doesn't trace through to the actual system prompt.

## Anti-Solutions

- Do not branch on state name inside any component or routing function. All conditional behavior is driven by rules-table data.
- Do not hide the "you cannot vote this primary" path for unaffiliated voters — the graceful-honesty UX is non-negotiable in closed states.
- Do not remove the "I'm not sure" option from ambiguous gates — locking users out of ambiguity erodes trust.
- Do not persist the gate selection beyond session lifecycle (localStorage tied to the session is fine; server-side storage is not).
- Do not inject PII into `<ballot_context>` — only `state, county, ballot, electionDate`.
- Do not skip the statute citation in the gate UI — it establishes authority and reduces resistance to answering.
- Do not ship a default fallback rule for unrecognized states that *adds* a gate where none is needed — when the lookup returns null, skip the gate.
- Do not allow the rules table schema to drift from what Phase 1's `<ballot_context>` consumer expects.

## Notes

- The design brief §13 includes a rules table with TX, PA, CA, GA, NY entries. TX/PA/CA ship in v1; GA/NY are good template rows for the table even if not user-facing yet (helps future contributors see the pattern).
- The "I'm not sure" clarification flow for TX could use a dedicated micro-prompt or reuse the theme-amendment prompt pattern. Worker decides; document the choice.
- The PA precinct-file lookup is intentionally deferred to ask-the-user in v1. Document this so a future packet can wire the real lookup.
- The rules-table schema should anticipate fields like `gate.options[].label`, `gate.options[].ballotTag`, `statute.code`, `statute.text`, `category` (`open` | `semi-closed` | `closed` | `top-two`). The design brief §13 table is the model.
- Statute citations should be verified — TX §172.087, PA 25 Pa. Code §2812, Cal. Const. art. II §5. A small comment block in `rules.ts` linking to the canonical source helps future-proof.
- Consider exposing the rules table as a public `/state-rules` page (linked from the methodology page) for transparency. Not required for Phase 5 but a small addition.
