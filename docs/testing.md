# Testing

Verification is tiered — match the check to the change:

| Tier          | When                                          | Command         |
| ------------- | --------------------------------------------- | --------------- |
| Inner loop    | every change                                  | `npm run check` |
| Behavior gate | UI behavior or visible copy changed, run once | `npm run e2e`   |
| Heavy         | CI only — never in-session                    | see below       |

`npm run check` runs lint + `tsc --noEmit` + unit tests. For one file's
logic, `npx vitest run <file>.test.ts` is faster still.

Heavy checks live in CI:

- **Mutation (Stryker)** — required PR check, path-filtered to high-stakes
  logic paths; full-scope run nightly (`.github/workflows/mutation.yml`).
- **E2E** — required PR check, path-filtered to e2e-relevant paths
  (`.github/workflows/test.yml`).
- **Legacy ballot e2e** — nightly anti-rot run for the parked experience
  (`.github/workflows/e2e-legacy-nightly.yml`).

## Design Parity gate — intentional changes

The Design Parity workflow (`.github/workflows/design-parity.yml` →
`scripts/design/parity-gate.ts`) diffs the app against the COMMITTED design
spec: structural probes + waivers in `parity-gate.ts`, capture journeys in
`parity-gallery-scenarios.ts`, ref PNGs in `.keystone-canvas-refs/`. It is a
spec-sync check, not a no-change check — so an intentional design or product
change is only done when the spec moves in the SAME PR:

1. **Probe/waiver** — update the failing entry in
   `scripts/design/parity-gate.ts` and record the ruling + date in its
   note/comment (precedents: 05b's `ignoreMissing: ["rep"]`, 11a's
   STRUCTURAL_WAIVERS ruling entry). A probe that asserts yesterday's ruling
   is a stale spec, not a safety net.
2. **Journey** — if the user flow changed (a button moved/vanished), update
   the shared journey helpers (`e2e/helpers/redesign-mocks.ts` — the parity
   gallery reuses them; never re-inline a copy: the 2026-07-12 run failed on
   exactly such a drifted duplicate).
3. **Ref PNG** — if the artboard itself moved/changed, re-shoot the ref in
   `.keystone-canvas-refs/` from the updated canvas export.

Never merge a red parity gate by re-running it, and never delete a probe
without a documented waiver in its place — the gate's evidence rule blocks
visual-only passes for a reason.

Known probe limitations (learned 2026-07-12, encode new probes accordingly):
data-dependent classes (e.g. party-color tokens) must be `ignoreMissing`, not
required vocabulary; capture journeys must be shared with e2e helpers, not
duplicated; a marker probe encodes a product ruling — date it, and retire it
to a waiver when the ruling changes.

## Duplication Ratchet

`npm run dup:check` (a step inside the `test` job in
`.github/workflows/test.yml`) runs jscpd over `src/**`, `e2e/helpers/**`,
and `scripts/design/**` (the test-harness dirs are included on purpose — a
drifted duplicate of a capture journey broke the design gate on 2026-07-12)
and fails the PR when a change introduces NEW copy-paste duplication: a
file pair sharing clones that isn't in the committed baseline
(`scripts/quality/duplication-baseline.json`), or a baselined pair that
grew. Pre-existing duplication is grandfathered — the gate answers "did
this change copy code?", not "is the codebase clone-free?".

- Fix path: extract the shared component/util instead of copying.
- Intentional duplication (rare — e.g. a deliberate mid-migration fork):
  `npm run dup:baseline`, commit the baseline diff, justify it in the PR.
- When you REMOVE duplication, the gate passes and prints a nudge to run
  `npm run dup:baseline` so the ratchet tightens — do it in the same PR.

## Component Inventory (minimization)

Literal clones aren't the whole duplication problem: two independently
written components can serve the same UI function and then drift out of
sync. Two layers address that:

- `npm run inventory:check` (required, in the `test` job): every component
  file under `src/prototype/redesign/` must have an entry in
  `scripts/quality/component-inventory.md` stating the UI function it
  serves — and a NEW component's entry must say why an existing component
  couldn't serve it. Stale entries (deleted files) fail too.
- `.github/workflows/component-review.yml` (advisory, never required): when
  a PR adds a component file, an AI review compares it against the
  inventory and comments on likely functional overlap. Requires the
  `ANTHROPIC_API_KEY` repo secret; skips silently without it.

Before writing a new component, read the inventory. Extending an existing
component with a prop/variant beats a new file that answers to nobody.

## Issue-Consistency Invariant

The user's locked issues are one data set that must read coherently on
every surface that renders "your issues". Two layers gate it:

- `src/prototype/redesign/voteGroups.test.ts` — unit: the voting-history
  panel's groups (`voteGroupsForUserIssues`) and the seat cards' rows
  (`seatIssueAlignmentRows`) derive the same set/order/labels from the same
  inputs.
- `e2e/redesign-issue-consistency.spec.ts` — rendered: full-list surfaces
  (intake review, IntakeLocked, ballot rail) show every locked issue;
  seat-scoped surfaces (overview card, deep card, all-votes panel) agree
  with each other exactly, with jurisdiction level scoping as the only —
  and consistent — difference. Voteless/unmapped issues render honest
  empty states; they never silently vanish from one surface while showing
  on another.

If a new surface renders the user's issues, derive it from the same
selectors (`issuesForLevel` → `seatIssueAlignmentRows` /
`voteGroupsForUserIssues`) and add it to that spec.

## Red-Phase Helper

The universal `/tdd` command uses this repo-local adapter when it is present.

`scripts/ai-tdd-red.sh <test-file>` verifies the red phase for a new Vitest test:

- exits `0` when at least one test fails, confirming the test targets missing behavior
- exits `1` when all tests pass before implementation, or when Vitest collects no tests

Self-test:

```bash
bash scripts/ai-tdd-red.test.sh
```

## Mutation Testing

CI is the normal gate (`.github/workflows/mutation.yml`): path-filtered on
PRs, full scope nightly. Do not run Stryker in a working session.

For the rare explicit local need, the universal `/code-reviewer` command
uses this repo-local adapter when changed files touch Stryker-scoped paths.
Stryker is scoped to high-stakes logic through `stryker.config.json` and
`tsconfig.stryker.json`. Local wrapper:

```bash
bash scripts/ai-mutation-check.sh
```

Self-test:

```bash
bash scripts/ai-mutation-check.test.sh
```
