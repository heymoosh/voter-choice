# Work Packet: e2e-nc-runoff-gate-data-drift

Status: open
Owner: orchestrator
Source: surfaced during `tdd-phase-1a-e2e-ci-compatibility.md` (Phase 1a) — NC test fails locally AND on CI for a non-timing reason; skipped in Phase 1a, captured here for follow-up.
Branch: launch/production

## Intent

The e2e test `State coverage — North Carolina (27601) — renders North Carolina-specific data for a NC address` (in `e2e/ballot-tool.spec.ts`) asserts that NC does NOT render a runoff gate. The test was authored when NC's `runoffRules.partyLockedToFirstRoundPrimary` was `false`. Current data (`src/data/states/NC.json`) has `partyLockedToFirstRoundPrimary: true`, so the runoff gate IS rendered for NC zips — matching the gate behavior the test expects to be absent. The test now fails because the assertion no longer matches reality.

This packet captures the work to bring the NC test back in sync with NC's current data. Reproduces locally AND on CI; not a CI environment issue.

## Original User Intent

User-facing: NC voters in real ZIP 27601 land on the research workspace. If NC's runoff is party-locked (as is now configured), they correctly see the runoff gate first. The test's "no runoff gate for NC" assumption is stale.

Worker (Phase 1a) was instructed: "diagnosis reveals a latent product bug: fix belongs in a separate packet — skip the test, document the bug, do NOT fix product code in this packet." Phase 1a `.skip()`ed the test (in `ballot-tool.spec.ts:461` describe block) and opened this follow-up.

## Intent Interpretation

Two reasonable interpretations of what "correct" looks like:

1. **NC's data is right; the test is wrong.** NC genuinely is party-locked under N.C. Gen. Stat. §163-110 (which the data's `ruleExplanation` field confirms). The test should be rewritten to traverse the runoff gate (like Texas/Georgia tests do) and then verify NC-specific prompt content.

2. **NC's data was changed without a test update.** Someone flipped `partyLockedToFirstRoundPrimary` from `false` to `true` without updating the test. In that case, check whether the data change was correct vs. accidental. If correct, do #1; if accidental, revert the data and the test passes as-is.

Worker SHOULD: check git blame on `src/data/states/NC.json` for the `partyLockedToFirstRoundPrimary` change. If the change has a deliberate commit message / source citation, go with interpretation #1 (rewrite test). If the change looks unintentional, surface it back to the user.

The packet does NOT prejudge — investigation comes first.

## Business Logic

Rules:

- Worker investigates BEFORE changing test or data.
- `git log -p src/data/states/NC.json` for the relevant change — what was the commit message? Was there a citation?
- If the data is correct: rewrite the test to traverse the runoff gate (use the `resolveTexasRunoffGate` helper as a template; abstract a generic `resolveRunoffGate(page, state)` if useful for future expansion).
- If the data is wrong: revert the field and unskip the test as-is.
- After fix, unskip the test (remove the `.skip()` modifier in `ballot-tool.spec.ts`).
- Verify locally with `CI=1 npm run e2e` before pushing.

Assumptions:

- The Texas runoff gate behavior is the canonical example of "party-locked runoff." The same flow should apply to NC.
- The data flip likely happened in a 50-state expansion or a data correction; worker confirms via git blame.

Edge cases:

- If `partyLockedToFirstRoundPrimary` is genuinely true for NC, the test name should also be updated to reflect that NC HAS a runoff gate, not "no runoff gate for NC."
- Other states may have the same drift pattern. Worker quickly audits ALL e2e state-coverage tests against current `src/data/states/*.json` to confirm no other tests are about to flake.

Out of scope:

- Restructuring `e2e/ballot-tool.spec.ts` beyond what's needed to unskip NC
- Adding new state coverage tests for unrelated states
- Changing the runoff-gate UI

## Acceptance Criteria

- Worker has read `git log -p src/data/states/NC.json` for the change that flipped `partyLockedToFirstRoundPrimary` to `true`.
- Worker has stated which interpretation applies (data correct → rewrite test; data wrong → revert data).
- The NC test is unskipped and passes both locally (`CI=1 npm run e2e`) and on CI.
- The describe block name in `ballot-tool.spec.ts` no longer says "[TODO: data drift, see Phase 1a notes]".
- No other state-coverage e2e tests regress.

## Notes

Test location: `e2e/ballot-tool.spec.ts:461` (currently `test.describe.skip(...)` with a TODO comment).
Data location: `src/data/states/NC.json` (the `runoffRules.partyLockedToFirstRoundPrimary` field).
Texas template: `e2e/ballot-tool.spec.ts` — `resolveTexasRunoffGate` helper, `Valid zip code — Texas (73301)` describe block.

This packet was opened by Phase 1a as a strict scope-cap. Phase 1a's mandate was CI compatibility, not product/data fixes.
