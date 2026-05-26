# Work Packet: redesign-phase-2-free-form-cold-open

Status: **shipped** — free-form cold open live in production. Fix O ("cold-open reflects pasted ballot as confirmed") landed in PR #34; "Use a starter profile" chip shipped in PR #37; "Vote for N" comma-separated race parsing in PR #35; prototype landing + cold-open chrome in PR #39; cold-open card + breadcrumb polish in PR #40; remaining P1/P2 polish in PR #43. `ValuesTagSelector` chip-picker is gone — free-form textarea + AI theme inference is the only entry route. See `docs/REDESIGN_2026_SHIPPED.md`.
Owner: orchestrator
Source: docs/design/2026-redesign/README.md §5 — Phase 2 (Free-form cold open)
Branch: launch/production

## Intent

Replace the issue-picker entry point with a free-form textarea + AI theme inference. The user describes their concerns in their own words; the new theme-extraction prompt (from Phase 1) returns themes as JSON; themes render in the evolved `ConcernInterpretation` view (verbatim quote per entry, confirm/edit/remove); the user reranks via the dnd-kit sortable list lifted from `ValuesTagSelector`; user locks in to enter the workspace.

## Original User Intent

From `docs/design/2026-redesign/README.md` §5 Phase 2 (post-clarification): "Replace the issue-picker entry point with a free-form textarea + AI theme inference. AI returns themes as JSON. Themes render in the evolved `ConcernInterpretation` view (each with verbatim quote, confirm/edit/remove). User then reranks via the dnd-kit sortable list lifted from `ValuesTagSelector`. User locks in."

And from the design brief §7 ("The cold open"): "Real opening: ask an open question, let them write in their own words, then have the AI mirror back the themes it inferred — with the user's exact phrases quoted as evidence. The ranking emerges from *their* language."

## Intent Interpretation

The cold open is the most visible behavioral change in the redesign. The original tool used `ValuesTagSelector` to render a pre-built chip set the user picked from; this is being explicitly removed because "non-partisan, voter's own language" collapses the moment we hand someone an approved-issues list. The replacement is: user writes free-form → app calls the theme-extraction prompt (Phase 1) → renders inferred themes with verbatim user quotes in `ConcernInterpretation` → user reranks/renames/removes via the dnd-kit machinery currently sitting inside `ValuesTagSelector` → locks in → enters workspace.

Crucially, the README's clarified guidance distinguishes between the **chip set** (delete) and the **drag-to-rank machinery** (keep + lift): the `@dnd-kit/sortable` setup, rank badges, free-text input, and the AI-mirror display in `ConcernInterpretation` are exactly the right primitives for the new flow. This packet's worker decides whether to (a) rename `ValuesTagSelector.tsx` → `ThemeRanker.tsx` after stripping the chip set, (b) build a new sibling component and delete the old, or (c) some hybrid — whichever produces the cleanest diff while preserving the lifted machinery.

This phase depends on Phase 1's theme-extraction prompt being available and the JSON parser being in place. Phase 1's introduction of `<theme>` data flowing into downstream `<priorities>` tags means once Phase 2 lands, the workspace (Phase 3) and all subsequent phases consume the same theme shape.

## Business Logic

Rules:

- The cold open never presents a pre-built issue picker. There is no fallback list, no feature-flagged alternative, no "skip to chips" path. The free-form textarea + AI mirror is the only entry route once `PROMPT_FLEET_V2` is on.
- Quotes shown under each theme name are **verbatim phrases from the user's original message**. The AI must not paraphrase; the prompt forbids it; the UI must surface the quote field directly without transformation.
- No artificial slot count. User describes two things → two themes. Five things → five themes. The `MAX_ENTRIES = 3` cap in the old `ValuesTagSelector` is removed for the new flow.
- Theme order is the user's responsibility. The AI returns themes in arbitrary order; the user reranks via drag-to-rank. The locked ranking is what gets shipped into every downstream system prompt's `<priorities>` block.
- Theme amendment after lock is a Phase 6 concern. Phase 2 ships the initial lock-in flow only.
- Two starter chips appear **above the textarea** when it is empty: "Show me an example" (fills sample text) and "Use a starter profile" (loads a saved `.txt`). These are scaffolding for blank-page anxiety, not pre-built issues.
- "Let me rewrite my message" footer button: scraps the inference and reopens the textarea with the original draft preserved.

Assumptions:

- Phase 1 has shipped the theme-extraction prompt and a JSON parser. If Phase 1's flag (`PROMPT_FLEET_V2`) is off, this packet's UI path is also gated off; the legacy `ValuesTagSelector` flow renders.
- The repo already has `@dnd-kit/sortable` wired in `ValuesTagSelector.tsx`. The worker lifts that machinery rather than re-installing or rebuilding.
- `ConcernInterpretation.tsx` already supports a `sourceText` field on entries (per README §3 keep-vs-remove table). The worker reuses it for verbatim quotes.

User-confirmed decisions:

- Lift-vs-rename is the worker's call at `/start-work` (orchestrator left the decision open; either approach is acceptable as long as functionality lands).
- The `[VALUES_TAG_REQUEST]` block in `src/lib/structured-blocks.ts` is retired in **this** packet (Phase 2), not Phase 1 — once the new UI no longer reads from the structured-block contract, the block parsing code is dead and can be removed.
- Spanish locale: legacy `ValuesTagSelector` flow stays available for `es` until a follow-up packet brings the ES theme-extraction prompt online. Document the temporary divergence in code.

Edge cases:

- User submits an empty or whitespace-only message: send button stays disabled.
- AI returns zero themes (extraction failure): show a soft error, let the user rewrite their message, do not pad with defaults.
- AI returns more than 5 themes (the prompt cap is 1–5): truncate and warn; never silently drop.
- User locks in with zero themes: lock-in button is disabled. Themes must exist to enter the workspace.
- AI returns a theme name with advocacy verbs ("fight against", "stand up for") or a party label, in defiance of the prompt: render it raw, let the user rename inline.
- JSON parse error from the model: show a "couldn't parse — try rewriting" path, retry once with a stricter prompt, then surface failure.
- Network failure during extraction: keep the user's draft text in the textarea; show a retry button.
- Long messages (multi-paragraph rants): no character cap on the textarea, but limit the prompt input to ~4000 chars server-side; truncate with notice if exceeded.

Out of scope:

- Theme amendment after lock (Phase 6).
- Spanish-language theme extraction (follow-up).
- Persisting drafts across sessions beyond the existing localStorage pattern.
- Multi-message clarification rounds. v1 is one-shot extraction; user rewrites and re-extracts if unhappy.

## Commercial Readiness

Applicability: launch

Lanes in scope:

- product UX (the most visible interaction change in the redesign)
- accessibility/responsive (textarea, drag-to-rank with keyboard alternatives, theme cards readable on mobile)
- privacy/data (user's free-form message must be PII-stripped before going to the model; only city+state)
- API/contracts (consumes Phase 1's theme-extraction JSON shape)
- legal/compliance prompt (no advocacy framing in UI copy; non-partisan)

User decisions needed:

- none before implementation

Assumptions:

- `@dnd-kit/sortable` versions in `package.json` (`6.3.1` / `10.0.0`) are sufficient; no upgrade needed.

## Operational Reproducibility

Setup:

- `npm install`

Configuration:

- `ANTHROPIC_VOTER_API`
- `PROMPT_FLEET_V2` (must be on for the new cold open path)

Provider setup:

- no new providers

Infrastructure/deployment:

- Vercel manual deploy via `deploy.yml`

Database migrations:

- not applicable

Manual steps:

- After deploy: with `PROMPT_FLEET_V2` off, verify the legacy `ValuesTagSelector` still renders for `es` locale and for users without the flag. With it on, verify the new free-form cold open is the only path.

Verification:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run e2e` — cold open happy path: address → loading → free-form prompt → submit → themes render → rerank → lock → workspace
- `bash scripts/ai-verify.sh`

Test quality:

- Verbatim quote assertion: given a known user message and a mocked theme-extraction response, the rendered theme card must contain the exact quote substring.
- AC-driven test cases for the slot-count rule: 1 theme renders 1 row, 5 themes renders 5 rows, no padding.
- Accessibility tests for keyboard reorder of the dnd-kit list.

Critical logic trigger:

- AI behavior (theme inference contract)
- privacy (PII strip of user message before prompt call)
- business rule (no pre-built picker)

## Scope

Touch:

- `src/components/ConcernInterpretation.tsx` — evolve to accept the new theme-extraction JSON shape. Reuse the `sourceText` field for verbatim quote display.
- `src/components/ValuesTagSelector.tsx` — remove pre-built chip set rendering (`regularItems.map(...)`); lift `SortableItem`, `DndContext`, rank badges, and free-text input into the new flow. Worker decides whether to rename in place or extract to a new component.
- `src/components/ChatPanel.tsx` — wire the cold-open chat panel to render the free-form textarea + AI mirror + themes UI instead of the issue picker.
- `src/lib/structured-blocks.ts` — retire the `[VALUES_TAG_REQUEST]` block parsing once the new flow no longer needs it. Remove the symbol and any unused exports.
- `src/app/PageContent.tsx` — routing changes if any (cold-open view selection).
- new component (or renamed `ValuesTagSelector` → `ThemeRanker`) — owns the lifted dnd-kit machinery.
- tests for ConcernInterpretation, the new ranker, and the cold-open flow integration.

Do not touch:

- `main`
- `BALLOT_PROMPT.md` or generated modules — owned by Phase 1/9
- The chat API route (`src/app/api/chat/route.ts`) beyond what Phase 1 already changed
- `getStateData.ts` or state-rule data (Phase 5)
- The workspace 3-pane layout (Phase 3)

## Ownership Audit

Concern: cold-open user-input UI and theme-inference rendering
Existing owner: `src/components/ValuesTagSelector.tsx` (issue picker), `src/components/ConcernInterpretation.tsx` (AI-mirror display), `src/components/ChatPanel.tsx` (chat shell)
Neighboring owners:

- prompt/JSON contract: `src/lib/prompts/theme-extraction.ts` (Phase 1)
- structured-block contract: `src/lib/structured-blocks.ts` (being retired by this packet)
- routing: `src/app/PageContent.tsx`
- workspace transition: `src/components/BallotToolClient.tsx` (Phase 3)

Files/modules/docs inspected:

- `docs/design/2026-redesign/README.md` §3 (keep-vs-remove table) and §5 Phase 2
- `docs/design/2026-redesign/prompts.md` §1 (theme extraction prompt)
- `docs/design/2026-redesign/Voter Choice Redesign.html` §7
- `docs/design/2026-redesign/prototype/prototype-views.jsx` (ColdOpenView)
- `docs/design/2026-redesign/prototype/prototype-components.jsx` (ThemeRow)
- `src/components/ValuesTagSelector.tsx`
- `src/components/ConcernInterpretation.tsx`
- `src/components/ChatPanel.tsx`
- `src/lib/structured-blocks.ts`

Reuse/edit targets:

- `ConcernInterpretation.tsx` evolves rather than gets replaced.
- `ValuesTagSelector.tsx` is reshaped: chip set dies, dnd-kit machinery survives.
- `ChatPanel.tsx` switches which sub-component it renders during cold open.

New owner needed: arguably yes for the lifted ranker. The worker's choice between "rename ValuesTagSelector" and "new ThemeRanker" determines whether a new file appears. Either is acceptable.

Overlap/bloat risks:

- Keeping the chip-set code path alive in any branch will reintroduce non-negotiable #1.
- Leaving `[VALUES_TAG_REQUEST]` parsing in `structured-blocks.ts` with no caller creates dead code that later coders mistake for active.
- Building a new ranker AND keeping the old `ValuesTagSelector` with rebuilt dnd-kit creates two copies of the sortable list.

Recommendation:

- Worker should produce a single ranker (either renamed or new), single chip-set removal, single retirement of the structured-block contract. If the diff is messy, prefer "delete `ValuesTagSelector`, create `ThemeRanker`" — cleaner reader experience.

Execution constraints:

- Workers must NOT add a pre-built chip set anywhere — not as a fallback, not as a starter, not as a feature-flagged alternative path.
- Workers must NOT paraphrase the AI's quote field in display; render `quotes` as raw verbatim text.
- Workers must NOT introduce a slot-count cap in the new flow (no `MAX_ENTRIES`).
- Workers must NOT remove or modify `ValuesTagSelector` in a way that breaks the legacy `es`-locale path until the ES theme-extraction prompt ships.

## Acceptance Criteria

- With `PROMPT_FLEET_V2` on and `en` locale, the cold open renders a free-form textarea (no issue-chip picker visible anywhere on the page).
- User submits a message; the app calls the chat route with the theme-extraction view; the returned JSON renders as theme cards each with name + 1–2 verbatim quotes from the user's message; the quote text is a substring of the user's message (asserted in test).
- User can rerank themes via drag-to-rank (mouse + keyboard); the displayed rank badges update; the locked order is what enters downstream state.
- User can rename a theme inline; submit/blur commits; Escape reverts.
- User can remove a theme; remaining themes resort and rerank.
- "Let me rewrite my message" reopens the textarea preloaded with the original draft.
- N themes returned by AI = N theme cards rendered. No padding to a fixed count. Test cases for N=1, 2, 5.
- "Lock these in" is disabled when 0 themes remain.
- The pre-built chip set inside `ValuesTagSelector` is no longer reachable via any UI path on `en`+`PROMPT_FLEET_V2`-on.
- `src/lib/structured-blocks.ts` no longer exports or parses `[VALUES_TAG_REQUEST]`; no live caller references it (search verifies zero references).
- `npm run lint`, `npm run test`, `npm run build` pass.
- `npm run e2e` cold-open happy path passes.

## Test Plan

Maps each acceptance criterion to a test file path and the shape of the assertion. Per `docs/ai-coding-practices/guardrails/test-driven-development.md`, tests are written BEFORE implementation and the red phase is verified via `scripts/ai-tdd-red.sh`.

| AC | Test file | Test shape |
|---|---|---|
| Free-form textarea renders; no chip picker on `en`+flag-on | `src/components/ColdOpen.test.tsx` | render the cold-open view with `PROMPT_FLEET_V2=1`; expected: `getByRole('textbox')` exists AND `queryAllByTestId('issue-chip')` is empty; observed: match |
| Theme-extraction JSON parses + renders verbatim quotes | `src/components/ConcernInterpretation.test.tsx` (extend) | input: known user message + mocked theme-extraction JSON; expected: each rendered theme contains a `quote` substring that exists as a substring inside the original user message; observed: per-theme substring match |
| Drag-to-rank (mouse + keyboard) updates locked order | `src/components/ThemeRanker.test.tsx` | input: 3 themes; simulate keyboard reorder (Space + ArrowDown + Space); expected: `onOrderChange` called with new index order AND rank badges reflect new order; observed: match |
| Rename theme: blur commits, Escape reverts | `src/components/ThemeRanker.test.tsx` | input: rendered theme with editable name; fire input change + blur; expected: theme name updated; then fire Escape; expected: name reverts; observed: match |
| Remove theme: remaining themes resort | `src/components/ThemeRanker.test.tsx` | input: 3 themes ranked 1/2/3; remove rank-2; expected: 2 themes remain with rank badges 1/2; observed: match |
| "Let me rewrite my message" restores original draft | `src/components/ColdOpen.test.tsx` | submit message, render themes, click rewrite; expected: textarea visible with original draft preloaded; observed: match |
| N themes returned = N theme cards (no padding) | `src/components/ConcernInterpretation.test.tsx` | parameterized for N ∈ {1, 2, 5}; mock AI response with N themes; expected: rendered count == N; observed: match |
| Lock-in disabled when 0 themes | `src/components/ConcernInterpretation.test.tsx` | render with empty theme array; expected: `getByRole('button', { name: /lock/i })` has `aria-disabled="true"` or `disabled`; observed: match |
| `[VALUES_TAG_REQUEST]` retired from structured-blocks | `src/lib/structured-blocks.test.ts` | expected: `structured-blocks.ts` exports no `VALUES_TAG_REQUEST` symbol; grep test scans `src/` for references and asserts zero callers; observed: zero |
| Theme-extraction inference flow (integration) | `src/components/ColdOpen.integration.test.tsx` | mock `/api/chat` to return canned theme JSON; user types, submits; expected: themes render with verbatim quotes within ~2s; observed: pass |
| E2E cold-open happy path | `e2e/cold-open.spec.ts` | navigate → fill ZIP → fill free-form → submit → see themes → rerank → lock → workspace renders; expected: each step's `data-testid` visible in order; observed: pass |
| AI returns >5 themes: truncate + warn | `src/components/ConcernInterpretation.test.tsx` | mock response with 7 themes; expected: 5 rendered AND warning surface visible; observed: match |
| `npm run lint`, `npm run test`, `npm run build` green | n/a — covered by `bash scripts/ai-verify.sh` | not test-shape applicable; reviewer-enforced |

### Red-phase ritual for this packet

The pre-built chip set is the load-bearing removal; write the chip-absence component test first and red-verify it (the test fails because the chips still render). Then write the verbatim-quote test against `ConcernInterpretation.tsx` extended for the new JSON shape — that test fails because the component doesn't yet read the new shape. The lifted dnd-kit `ThemeRanker.test.tsx` is next — written before the lift completes, fails because the new component doesn't exist. Finally, the structured-blocks retirement test (`grep`-style assertion for zero `VALUES_TAG_REQUEST` references) fails because the symbol still exists. Implement in reverse order — strip the structured block last so the chat path remains compilable through earlier commits. Capture each `ai-tdd-red.sh` output.

## Verification

- `npm run lint` clean.
- `npm run test` passing — including new unit/component tests for the ranker, verbatim-quote rendering, slot-count behavior, and structured-block retirement.
- `npm run build` successful.
- `npm run e2e` cold-open happy path (address → free-form prompt → themes render → rerank → lock → workspace) passes on `PROMPT_FLEET_V2=1`.
- `bash scripts/ai-verify.sh` clean.
- Manual smoke in preview: enter sample address, paste long-form text, observe themes mirroring user words; try drag, rename, remove, lock-in.

## Evidence Plan

Visual evidence:

- Screenshot of the cold-open view with the free-form textarea visible (no chips).
- Screenshot of the themes-card view with at least one rendered theme showing the verbatim user quote.
- Screenshot/video of drag-to-rank in action.

Behavior evidence:

- E2E test name + output for the full cold-open happy path.
- Test names for: rerank-changes-order, rename-commits, remove-resorts, rewrite-restores-draft.

Business logic evidence:

- Rule: "Quotes are verbatim" — test fixture with a known user message + mocked AI response, expected quote text == substring of message, observed match.
- Rule: "No artificial slot count" — N=1, 2, 5 cases; expected N rows, observed N rows.
- Rule: "No pre-built picker" — DOM query asserting no `data-testid="issue-chip"` (or equivalent) elements exist anywhere on the cold-open view.

Persistence evidence:

- Theme state survives a refresh (localStorage) — observed reload behavior.

Auth/security evidence:

- User message is sent through the chat route, which (per Phase 1) strips PII. Re-verify a test case where the user pastes "I live at 123 Main St" — only city+state reaches the model.

Commercial readiness evidence:

- Accessibility lane: keyboard-only flow recorded (Tab to textarea, Enter to send, Tab to ranker, Space + arrows to reorder, Enter to lock).

Operational evidence:

- `npm run lint`, `npm run test`, `npm run build`, `npm run e2e` command output.

Integration evidence:

- Preview deploy URL + screenshot of the cold open with real Anthropic response.

Regression evidence:

- With `PROMPT_FLEET_V2` off, the legacy `ValuesTagSelector` path still renders (specifically for `es` locale until that's also migrated).

Proof standard:

- A reviewer on `PROMPT_FLEET_V2=1` `en` can complete the cold open from blank textarea to locked themes entering the workspace, with the rendered theme quotes provably verbatim from their input, and no chip set anywhere in the DOM.

Non-proof:

- "Themes render" alone — must include the verbatim-quote check.
- A unit test of the ranker without an integration test of the full submit → render → lock cycle.
- "Lint and build pass" alone — the AC pertains to user-visible behavior.

### Captured evidence — Phase 2 PR (2026-05-21)

Branch: `feat/redesign-phase-2-theme-ranker` (shipped as a single PR with Wave A + Wave B + orchestrator polish).

Red-phase artifacts (every test file red-verified via `scripts/ai-tdd-red.sh` before implementation):

- `/tmp/tdd-red-theme-ranker.txt` — 19 fail / 3 pass, rc=0
- `/tmp/tdd-red-concern-interpretation.txt` — 12 fail / 34 pass (legacy preserved), rc=0
- `/tmp/tdd-red-cold-open-input.txt` — 18 fail / 1 pass, rc=0
- `/tmp/tdd-red-cold-open-integration.txt` — 6 fail / 1 pass, rc=0
- E2E spec red phase: spec failed against unchanged app (no `cold-open-textarea` testid)

Orchestrator re-verification (independent — caught Wave A subagent over-reporting "lint matches baseline" with 3 actual errors; cleanup commit `25358a1` resolved):

- `npm run lint`: rc=0 (0 errors; pre-existing complexity warnings unchanged)
- `npm run test`: rc=0 — 58 files / 1195 tests pass (+61 new across ThemeRanker, ConcernInterpretation themes mode, ColdOpenInput, ColdOpen integration)
- `npm run build`: rc=0
- `bash scripts/ai-mutation-check.sh`: rc=0 — mutation score 35.58% (unchanged; new component files not in stryker scope; `prompts/` directory still at 69.38% covered)
- E2E (legacy 47 specs under flag-off): rc=0 (regression preserved)
- E2E cold-open spec under `PROMPT_FLEET_V2=1`: rc=0 (validated locally)

CI workflow update: `.github/workflows/test.yml` adds a second e2e step in the same `e2e` job that runs the cold-open spec with `PROMPT_FLEET_V2=1`. Branch protection's `e2e` required check name unchanged.

AC coverage:

| AC | Where |
|---|---|
| Free-form textarea renders; no chip picker (flag-on en) | `ColdOpenInput.test.tsx` + `ColdOpen.integration.test.tsx` "flag off" |
| Quotes verbatim substrings | `ConcernInterpretation.test.tsx` + integration test substring check |
| Rerank via drag-to-rank | `ThemeRanker.test.tsx` (mouse) + `reorderThemes` unit + e2e (keyboard) |
| Rename: blur commits, Escape reverts | `ThemeRanker.test.tsx` |
| Remove resorts + reranks | `ThemeRanker.test.tsx` |
| "Let me rewrite" restores draft | `ColdOpen.integration.test.tsx` |
| N themes = N cards (1, 2, 5) | `ThemeRanker.test.tsx` + `ConcernInterpretation.test.tsx` (parameterized) |
| Lock-in disabled at 0 themes | `ThemeRanker.test.tsx` |
| AI returns >5 themes: truncate + warn | `ConcernInterpretation.test.tsx` |
| Chip set unreachable under flag-on en | Auto-startSession suppression in `ChatPanel.tsx` + integration test |
| E2E cold-open happy path | `e2e/cold-open.spec.ts` |

**Deferred (documented architectural decision):**

- AC #10 (`[VALUES_TAG_REQUEST]` retirement) — live callers in the flag-off path (`ChatPanel.tsx:443` gates rendering, `:672` strips block from prose). Retiring would break every flag-off user, violating PR 2's AC #1 (flag-off bit-identical). The packet's own anti-solution ("do not break the legacy ES path") forces this defer. Follow-up: a separate packet once ES migrates to the fleet, at which point the structured-block contract can be fully retired.
- Workspace transition after lock-in (Phase 3 owns).
- localStorage theme persistence (the existing `ValuesTagSelector` flow uses an in-chat `[VOTER VALUES]` follow-up message, not localStorage — wave B did not implement a new persistence mechanism; Phase 3 will decide).
- ES-locale cold open (follow-up packet — translations have EN-text stubs).

**Architectural note (`force-dynamic`):**

`src/app/page.tsx` exports `dynamic = "force-dynamic"` so the `process.env.PROMPT_FLEET_V2` read happens at request time. Without this, Next.js would bake the env value into the static page at build time, making runtime flag flips a no-op. Toggling the env in Vercel and redeploying is still required to engage the flag — but once redeployed, the value takes effect immediately on the next request, no rebuild.

## Anti-Solutions

- Do not ship a pre-built issue picker anywhere — not as a fallback, not as a starter chip set, not as a feature-flagged alternative.
- Do not paraphrase or summarize the user's quote on display — render verbatim.
- Do not silently retain `[VALUES_TAG_REQUEST]` parsing in `structured-blocks.ts` once the UI no longer reads it — that's dead code masquerading as live contract.
- Do not introduce a slot-count cap (no `MAX_ENTRIES = 3` or similar in the new flow).
- Do not break the legacy ES path before the ES theme-extraction prompt is ready — keep the old `ValuesTagSelector` reachable for `es` until that follow-up lands.
- Do not pad to a fixed theme count when the AI returns fewer than N.
- Do not block on AI returning >5 themes — truncate and warn, never silently drop.
- Do not allow lock-in with zero themes — disable the button.

## Notes

- The prototype `ColdOpenView` in `docs/design/2026-redesign/prototype/prototype-views.jsx` is a useful reference for UI states: `prompt` (empty), `thinking` (loading), `review` (themes rendered). Don't port the prototype directly — match the existing Tailwind component conventions in `src/`.
- Drag handles in the prototype use `⋮⋮` glyphs; ensure accessible-name and keyboard-equivalent ordering work.
- The "Show me an example" chip should fill the textarea with the `SAMPLE_LONGFORM` content (or an equivalent localized string). The "Use a starter profile" chip is a separate file-picker flow — implement minimally or defer to a follow-up if it materially expands scope.
- The cold open's outgoing user message and the returned theme JSON should be logged (server-side) under a debug flag for triage. Never log PII even server-side.
