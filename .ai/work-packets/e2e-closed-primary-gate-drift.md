# Work Packet: e2e-closed-primary-gate-drift

Status: open
Owner: orchestrator
Source: surfaced during `tdd-phase-1a-e2e-ci-compatibility.md` (Phase 1a) — closed-primary participation gate broke pre-existing e2e tests; skipped in Phase 1a, captured here for follow-up.
Branch: launch/production

## Intent

A new product feature — the **closed-primary participation gate** (`primary-participation-gate` testId) — now intercepts users in states with closed primaries BEFORE the research workspace (`chat-window`, `prompt-output`) renders. The gate asks the voter to declare their party registration (Democrat / Republican / other recognized party / not registered) before showing them ballot research.

Several pre-existing e2e tests in `e2e/ballot-tool.spec.ts` were authored assuming NO gate existed for these states. They submit a zip code and immediately wait for the research workspace. Because the gate now intercepts, the workspace never renders within the test's timeout budget, and the tests fail. This reproduces locally with `CI=1 npm run e2e` AND on CI — confirming it is product/data drift, not a CI environment issue.

This packet captures the work to bring these tests back in sync with the closed-primary-gate feature.

## Original User Intent

User-facing: voters in closed-primary states should NOT see candidates from the other party's primary, because they cannot vote in it. The participation gate prevents that confusing UX. This is a deliberate, valuable product feature — the tests are the thing that's stale.

Worker (Phase 1a) was instructed: "diagnosis reveals a latent product bug: fix belongs in a separate packet — skip the test, document the bug, do NOT fix product code in this packet." Phase 1a `.skip()`ed the affected describes and opened this follow-up.

## Affected tests

All in `e2e/ballot-tool.spec.ts`, all skipped in the Phase 1a PR:

| Describe (line) | Zip | State | Population gate? |
|---|---|---|---|
| `State coverage — New York (10007)` (~425) | 10007 | NY | yes (closed primary, NY Election Law §6-100) |
| `State coverage — Florida (32399)` (~441) | 32399 | FL | yes (closed primary) |
| `State coverage — New Hampshire (03301)` (~501) | 03301 | NH | yes (semi-closed primary) |
| `State coverage — Arizona via multi-state selector (86515)` (~518) | 86515 → AZ | AZ | yes |
| `State coverage — New Mexico via multi-state selector (86515)` (~538) | 86515 → NM | NM | yes |
| `State coverage — Wyoming (82001)` (~559) | 82001 | WY | yes (closed primary, Wyo. Stat. Ann. §22-5-101) |

(Failure population: 6 describes × 2 browsers = 12 test instances skipped.)

NOT included in this packet: NC — same family but different gating (party-locked runoff, not closed-primary participation). NC has its own packet: `e2e-nc-runoff-gate-data-drift.md`.

## Intent Interpretation

Two reasonable interpretations:

1. **Tests should traverse the gate.** Add a helper (e.g., `resolveClosedPrimaryGate(page, party)`) that picks a participation option, then waits for the research workspace. Update each affected test to call it. This mirrors the existing `resolveTexasRunoffGate` pattern.

2. **Some states' gates may be misconfigured.** If a state shouldn't actually have a closed primary (e.g., if NH is semi-closed and the gate should NOT appear for some flows), that's a product config bug to fix.

Worker SHOULD: confirm via product spec / state law citations that each of the 6 states genuinely has a closed primary requiring the gate. If yes, do #1. If any state's gate is misconfigured, do #2 for that state.

## Business Logic

Rules:

- Investigate BEFORE rewriting tests.
- For each of the 6 states: confirm the gate is correctly shown per real-world primary rules (the data should cite a state statute).
- Build a shared `e2e/_helpers.ts` (or extend the existing test files) with a `resolveClosedPrimaryGate(page, option)` helper. The Texas runoff-gate helper is the closest template.
- After the helper is in place, unskip each describe and update its `beforeEach` or test body to call the helper before waiting for the workspace.
- Verify locally with `CI=1 npm run e2e` before pushing.
- All 6 (× 2 = 12) tests must pass deterministically across 3 CI runs.

Edge cases:

- Multi-state selector (86515): the selector appears BEFORE the gate. Tests must select state (AZ or NM) THEN traverse the gate.
- NH semi-closed: confirm whether the gate appears for ALL party choices or only some. If the gate's behavior differs per state, the helper may need a state-specific option.

Out of scope:

- Adding NEW state coverage tests
- Changing the gate UI
- Adjusting the gate's eligibility logic per state

## Acceptance Criteria

- All 6 (× 2 = 12) tests unskipped and passing on CI.
- Helper is reusable (`resolveClosedPrimaryGate(page, option)` or similar shape).
- No regression on Texas / Georgia runoff-gate tests (which use a different helper).
- Documented in this packet's Notes section: which state's gate corresponds to which statute.

## Notes

Test location: `e2e/ballot-tool.spec.ts` — search for `test.describe.skip(... [skipped: closed-primary gate drift, see e2e-closed-primary-gate-drift packet]`.
Page snapshot evidence: see `test-results/ballot-tool-State-coverage-*` directories after running `CI=1 npm run e2e` from a fresh checkout. The snapshots show `heading "Before we start: {STATE} primary ballot check"` followed by 4 radio options.

Product code that renders the gate: search src/ for `primary-participation-gate` testId (also visible in lint output as `screen.getByTestId("primary-participation-gate")` in unit tests).

This packet was opened by Phase 1a as a strict scope-cap. Phase 1a's mandate was CI compatibility, not test-content updates.
