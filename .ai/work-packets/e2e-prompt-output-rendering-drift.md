# Work Packet: e2e-prompt-output-rendering-drift

Status: open
Owner: orchestrator
Source: surfaced during `tdd-phase-1a-e2e-ci-compatibility.md` (Phase 1a) — `prompt-output` rendering precondition changed; pre-existing e2e tests broke; skipped in Phase 1a, captured here for follow-up.
Branch: launch/production

## Intent

The `prompt-output` testId is rendered by `<PromptOutput>` inside `ResearchLayout.tsx`, but ONLY when `canStartResearch && budgetChecked && !chatAvailable` — i.e., as the documented fallback when chat is NOT available (budget exhausted, DB unreachable, or similar). When chat IS available, `prompt-output` is not rendered; the chat-window takes over instead.

Several pre-existing e2e tests assume `prompt-output` ALWAYS renders after a valid zip submission — both when chat is available AND when it isn't. Because product behavior changed (or because the tests were never accurate against current product), they fail in CI where the chat availability mode differs from local dev.

Locally with `DATABASE_URL` set, chat IS available → no `prompt-output`. With `CI=1` + `DATABASE_URL`, same. On CI with NO `DATABASE_URL`, chat is unavailable → `prompt-output` SHOULD render — but the tests time out waiting because there's a budget-check round-trip delay AND/OR the tests' helper sequencing also expects `chat-window` (which won't render in this mode).

This packet captures the work to bring these tests back in sync with current rendering preconditions.

## Original User Intent

User-facing: when chat is available, voters use chat. When it isn't (budget out, no DB), they copy a prompt and paste it into their own AI tool — that's the `prompt-output` fallback. The product behavior is correct.

Worker (Phase 1a) was instructed: "diagnosis reveals a latent product bug: fix belongs in a separate packet — skip the test, document the bug, do NOT fix product code in this packet." Phase 1a `.skip()`ed the affected describes and opened this follow-up.

## Affected tests

All skipped in the Phase 1a PR. Listed by spec file:

**`e2e/ballot-tool.spec.ts`:**

| Describe (line) | Cause |
|---|---|
| `Valid zip code — Texas (73301)` (~122) | `beforeEach` waits for `chat-window` AND `prompt-output` — both can't be visible simultaneously |
| `Valid zip code — California (90210)` (~178) | `prompt-output.toContainText(/California/)` — assumes prompt-output always renders |
| `Copy to clipboard` (~218) | Same precondition as Texas — chain breaks at chat-window or prompt-output |
| `Keyboard accessibility › can submit zip code via Enter key` (~276) | Same — runoff gate handled, then chat-window expected attached |

**`e2e/features.spec.ts`:**

| Describe (line) | Cause |
|---|---|
| `Sample ballot upload` (~57) | `goToTexasWorkspace` helper waits for `prompt-output` — never renders when chat is available |
| `Ballot printout popup` (~138) | Same — `goToTexasWorkspace` precondition |
| `Voter profile download` (~183) | Same — `goToTexasWorkspace` precondition |

(Failure population: 4 + 3 = 7 describes × 2 browsers = 14 test instances skipped. NOTE: actual counts may include sub-tests within each describe; verify with `grep '✘' /tmp/e2e-*.txt`.)

## Intent Interpretation

Three reasonable interpretations:

1. **Tests should assert `chat-window` OR `prompt-output` (whichever the current mode renders).** Add a helper that waits for "research workspace ready" by checking for EITHER element. Update each affected test.

2. **Tests should force one mode for determinism.** Mock the chat API to always return `chatAvailable: false` (or true), then the test knows which element to expect.

3. **Tests should assert the chat-window path only** (since that's the happy path), and remove `prompt-output` assertions. The fallback can be tested separately with explicit mode-forcing.

Worker SHOULD: pick #2 or #1 based on what makes the test most stable and least brittle. Option #2 (mocking chat availability) is more deterministic but requires mock infrastructure. Option #1 is simpler but couples the test to whichever fallback mode happens to be active.

## Business Logic

Rules:

- Investigate the FULL product state machine for `chat-window` vs. `prompt-output` rendering. Document in this packet's Notes.
- Confirm via `src/components/ResearchLayout.tsx` (search for `canStartResearch && budgetChecked && !chatAvailable`) that the rendering precondition matches the spec.
- Pick interpretation (#1, #2, or #3) — surface to user for sign-off if uncertain.
- Build a shared helper (`e2e/_helpers.ts` or extend existing files) that handles both rendering modes.
- After the helper is in place, unskip each describe and update accordingly.
- Verify locally with `CI=1 npm run e2e` before pushing.
- All affected tests must pass deterministically across 3 CI runs.

Out of scope:

- Changing what `<ChatPanel>` or `<PromptOutput>` render
- Adding new feature coverage

## Acceptance Criteria

- All affected tests unskipped and passing on CI.
- A shared helper or convention exists for "wait for research workspace" that handles both chat-window and prompt-output paths.
- Notes section documents the state machine: when does chat-window render? When does prompt-output? What forces each?

## Notes

Tests are in `e2e/ballot-tool.spec.ts` and `e2e/features.spec.ts` — search for `test.describe.skip(... [skipped: prompt-output rendering drift, see e2e-prompt-output-rendering-drift packet]`.

Product code: `src/components/ResearchLayout.tsx` lines ~1593-1645 — the two conditional blocks rendering ChatPanel vs. PromptOutput.

Page snapshot evidence: `test-results/features-Sample-ballot-upl-*/error-context.md` (after `CI=1 npm run e2e`) shows the Texas page with chat-window present (count 1) but prompt-output absent (count 0) — confirming `prompt-output` renders only in the fallback path.

This packet was opened by Phase 1a as a strict scope-cap. Phase 1a's mandate was CI compatibility, not test-content updates.
