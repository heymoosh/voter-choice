# Keystone fidelity fix — Phase 4 findings (re-audit the 5 held PRs)

Per `docs/operations/keystone-fidelity-fix-plan-2026-07-08.md` Phase 4. Ran the Phase 1
review-gallery + Phase 2 parity-gate (merged locally on top of each PR branch, none of the
three pushed to `main` yet) against all 5 held PRs. Read-only — nothing merged, nothing fixed.
This replaces the discredited "7/11 clean" tally.

## Cross-cutting: the same 10 baseline gaps appear on all 5 branches

`01-orientation-activated`, `02d-results-allvotes-sheet`, `04-scorecard`, `07-whynow`,
`08a-about`, `08b-howitworks`, `08c-privacy`, `09d-edit-issues`, `10c-polis-report-consensus`,
`10d-polis-report-divided` fail identically regardless of which PR is checked out — confirmed
pre-existing base-repo gaps, not caused by any of the 5 PRs. This list is **not new**: it
matches backlog card `466d6efb` ("Keystone Phase 6: close the 10 gate-flagged design gaps")
word for word, filed in an earlier session before today's STOP-SHIP. That card is being
updated with today's severity data rather than duplicated here.

## Per-PR findings

### PR #230 — `wt/match-the-keystone-design-exactly-d83cf5ec` (the flagship 11-section PR)

**Blocked — needs your call before the gate tooling can even run on this branch.** Merging in
the Phase 1-3 tooling hit a genuine content conflict in `VoterChoiceApp.tsx`, correctly not
guessed:
1. Nav "How it works" link: #230 points it at `howitworks` and removed a duplicate
   "Methodology" link; the tooling branch still points at `methodology`.
2. Homepage hero: #230 has a full rewrite (hardcoded canvas copy, `vh-*` classes); the tooling
   branch has a structurally different i18n-driven `hp-hero hp-hero-solo` version.

Gate ran directly on #230's own branch anyway (it already independently carries an earlier gate
merge): **17/27 pass**, 10 fail — the same 10 baseline gaps, nothing PR #230-specific.
Cross-referencing your original complaints against this branch: Results funding/votes-drilldown
PASS (capture artifact, per Phase 0); Candidates PASS; Homepage hero PASS (nav mismatch is the
live merge-conflict); Scorecard/Why Now/How-it-Works/Polis confirmed still broken; Tip Jar/
Loading PASS (first real screenshots ever taken of these — they're fine).

### PR #236 — Intake locked state

Clean merge, **16/27 pass** (11 fail: the 10 baseline + one minor pre-existing structural nit).
**But this overstates confidence**: the `09c-intake-locked` capture script stops one step before
clicking "Lock these in," so it never actually reaches the new `IntakeLocked.tsx` screen this PR
ships — it PASSes against the *old* pre-lock screen, not the new one. **PR #236's actual
deliverable is unverified by the gate**, not confirmed-good. Everything else it touches (Cold
Open, AI-proposes, apply-and-rescore) checks out fine.

### PR #237 — PolisEntry invite screen

Clean merge, same 16/27 pass / same pattern as #236: `10a-polis-entry` PASSes but its capture
script still clicks the *old* one-line link, never reaching the new PolisEntry screen this PR
ships. **Unverified, not confirmed-good**, same as #236. The Polis clustering/"where it split"
gap you flagged is real but out of scope for this PR — it belongs to #240.

### PR #240 — Polis "where it split" divided-statements section

Clean merge, 16/27 pass, 10 baseline fails including `10c`/`10d`. **Live-verified (read-only,
reverted after) that the feature is actually built correctly**: population-level %, no D/R/I
breakdown, copy matches the approved spec exactly. The gate's FAIL on `10c`/`10d` is **not**
proof of a defect — `parity-gallery-scenarios.ts`'s mock was never updated to feed this PR's
`divided` data (stays empty), so the gate is testing the *absence* of the feature, not its
correctness. Once the mock is fixed, the remaining visual diff (~0.38–0.52) is the **expected,
approved** result of the party-free redesign (canvas shows party-labeled clusters; this repo
deliberately doesn't, per DECISION #116) — that should become a documented waiver, not a
lingering fail.

### PR #243 — Candidates overview (3-card alignment-score summary)

Unpatched gate: **6/27 pass, 17 capture failures.** Root cause confirmed (patched+reverted,
worktree clean): this PR makes the new overview screen the default landing page, but the shared
`reachWorkspace()` capture helper — used by ~20 of the 27 scenarios — still assumes landing
directly on the old single-seat rail. **This will break the entire gate suite for every future
PR the moment #243 merges to main, not just this PR's own scenarios.** With a one-line local
patch to click through the new overview first, PR #243 gates identically to the other 4 (16/27,
same baseline set) — meaning it introduces **zero new regressions**, but the fix needs to ship
alongside or before the merge, not after.

Separately, `05c-candidates-overview` (the scenario written for this exact screen) has **no
capture() function and no canvas ref PNG exists at all** — it cannot be pixel-graded on any
branch, ever, until both are added. Manually inspecting it (temp capture, reverted) shows real,
correct content: 2 scored seat cards with roll-call/funding data, and the third seat rendered as
"Not on your ballot this year · next up 2030" — notably the exact treatment missing from the
*printed* scorecard (`04-scorecard`'s known gap). **Recommend you eyeball this screen's
screenshot directly** since the gate can't grade it yet; the diagnostic worktree
(`voter-choice-worktrees/phase4-audit-243`) still has the regenerated `docs/design-review/`
output if useful.

## What needs your decision (not something I should guess)

1. **PR #230's nav/hero conflict** — pick one: keep #230's hardcoded-copy hero + `howitworks`
   nav target, or the tooling branch's i18n `hp-hero-solo` version + `methodology` target. This
   blocks reconciling #230 with the rest of the STOP-SHIP work.
2. **PR #243's `reachWorkspace()` fix sequencing** — should the shared-helper fix ship as part of
   #243's own PR, or as a same-day companion PR merged immediately after? Either avoids breaking
   the gate for everyone; I didn't want to bundle a fix into someone else's PR without asking.
3. **05c-candidates-overview eyeball approval** — the screen works but can't be automatically
   graded yet; your visual sign-off is the only verification available right now.

## Fix cards filed (mechanical/tooling fixes only — no design judgment calls)

Filed to `Backlog` (not `To Do` — still needs grooming), each depends on this STOP-SHIP card:
- Fix stale `09c-intake-locked` + `10a-polis-entry` gate captures (false-pass, don't reach the
  new screens)
- Fix `10c`/`10d` Polis-report mocks (false-fail) + document the approved party-free waiver
- Fix shared `reachWorkspace()` capture helper before/with #243 (repo-wide breaking risk)
- Wire a real capture() + export a canvas ref PNG for `05c-candidates-overview`

The 10 baseline design gaps are **not** re-filed — they're already tracked on card `466d6efb`,
updated today with this session's severity data.
