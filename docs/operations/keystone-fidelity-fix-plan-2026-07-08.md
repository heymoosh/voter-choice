# Keystone fidelity fix plan — 2026-07-08

**Status: STOP-SHIP.** Per Muxin (2026-07-08, live): nothing else gets done or merged —
Keystone or otherwise design-touching — until the two failures below are addressed. The five
open Keystone PRs (#230, #236, #237, #240, #243) stay held drafts. The backlog card
`[P0][GATE] STOP-SHIP: Fix the design-fidelity pipeline` points here and gates every other
Keystone card.

Companion incident writeup (raw findings, artifacts, open questions):
`docs/operations/keystone-parity-failure-handoff-2026-07-08.md`.

---

## The two failures

### Failure 1 — the repo cannot yet produce 1:1 fidelity to design work

Muxin reviewed the canvas-vs-repo contact sheet and found major mismatch on nearly every
surface (Results, Scorecard, Candidates, Homepage, Why Now, How it Works, Intake, Polis,
Money-gap) — after a prior session had reported "7/11 sections clean."

**Diagnosis — the failure chain, each link confirmed against the repo, not assumed:**

1. **Building happened before the spec existed.** Six of ~10 screens had no local JSX design
   source until the canvas export was recovered on 2026-07-07 (PR #231). Most of PR #230's
   build work predates that — those surfaces were *interpreted* from reference PNGs and a
   compiled 2.5MB bundle, which is exactly the "treated the design as a moodboard" failure the
   epic was created to stop.
2. **Verification tooling arrived after the builds, and nothing enforces it.** The parity gate
   (`scripts/design/parity-gate.ts`, `npm run design:parity-gate`, PR #242) merged 2026-07-08
   at 08:37 — the same morning the five PRs were called review-ready. It is wired into **zero**
   CI workflows (`grep -rn parity .github/workflows/*.yml` → nothing), so no PR ever ran it.
   Its structural (className-coverage) check covers **3 of 27** scenarios; the other 24 have no
   structural probe at all (tracked as card `af7fa077`, unstarted). The visual pixel-diff half
   *is* runnable for all scenarios — the 29 ref PNGs in `.keystone-canvas-refs/` are committed
   on main — but nobody ran it either.
3. **Review substituted code-reading for rendering.** The "self-vet clean / faithful to canvas"
   verdicts on the five PRs came from agents reading source diffs against text descriptions of
   the canvas. No agent rendered anything. A code-reading pass can verify wiring and structure;
   it cannot see layout, palette, spacing, or missing visual sections — so it confidently
   passed work that is visually wrong. (Logged as standing guidance: memory
   `feedback_visual_selfvet_insufficient`.)
4. **There was no iterate-until-green loop.** Because the gate wasn't the definition-of-done
   when the work was built, a detected mismatch had nowhere to go: nothing measured fidelity
   during development, so nothing could trigger a fix cycle before human review. The only
   feedback loop that existed was Muxin herself — the most expensive detector, triggered last.

This answers Muxin's three process questions directly: the fidelity-gate backlog item **was**
implemented (Q1) — but only hours before review, unwired, and 3/27 structurally covered; there
was no feedback loop (Q2) because nothing ran the gate; and gaps went unflagged during
development (Q3) because the only checks that ran (unit/e2e/mutation CI + code-reading review)
are all blind to rendering.

### Failure 2 — the page-by-page HTML review artifact doesn't properly load

**Diagnosis — four concrete defects in `keystone-contact-sheet.html` (PR #230 branch):**

1. **It's a 15MB monolithic HTML file with 56 base64-inlined images.** That size chokes or
   badly lags browsers as a local file and exceeds what artifact hosting handles comfortably —
   this is the direct cause of "doesn't properly load." Page-by-page review inside one 15MB
   scroll was never going to work.
2. **Screenshots are viewport-cropped at ~1180×900, not full-page.** Confirmed by inspecting
   the committed PNGs (`contact-sheet-shots/repo-02-results.png`, `repo-04-scorecard.png`,
   `repo-07-whynow.png` are all 900px-tall crops). This is why Why Now appears cut off and why
   the Results funding section shows no data — everything below the fold was simply never
   captured. Muxin's "how is there no funding data????" alarm is at least partly a capture
   artifact — **and cannot be cleared without a live check (Phase 0)**. Note the irony: the
   newer parity-gallery tool already captures `fullPage: true`; the contact sheet uses an
   older capture path and never adopted it. It also violates the recorded 2026-07-07 review-
   format decision ("full app PAGE screenshots ... for ALL artboards every time").
3. **Coverage holes.** No repo-side shot exists for: the Color section, the candidates
   overview (expected — it lives on unmerged PR #243, but the sheet doesn't say so, so it reads
   as a missing feature), Tip Jar, the Loading state, or interaction sub-states (funding
   expanded, votes drill-down, all-votes sheet — states the 28-scenario parity gallery covers
   but the 11-section contact sheet flattens away).
4. **The copy she was first handed lived in an unreadable worktree.** The standing
   `voter-choice-worktrees/*` EPERM bug (memory `project_stale_worktree_permission_denied`)
   made the original path fail outright; a scratchpad re-checkout was needed just to open it.

---

## The fix plan

Phases are ordered; each has a definition-of-done. Nothing merges before Phase 4 completes.
Phases 1–3 are independent enough to parallelize if desired, but 0 comes first (it's an hour
of read-only verification that determines whether there are live data bugs to fix urgently).

### Phase 0 — Live-verify the scares (read-only, no code)

Run the app locally on PR #230's branch and check, with full-page evidence:
- Does the Results funding panel (`FunderPanel` / money trail) actually render data? If not,
  is it a data-fixture problem or a rendering bug? (The screenshot cannot answer this.)
- The Results right-rail scorecard shows "0/3 · DRAFT" but lists only 2 issues — real counting
  bug or fixture artifact?
- Confirm which of Muxin's per-section findings are build gaps vs. capture artifacts, so
  Phase 4's re-audit starts from a truthful baseline.

**DoD:** a short findings note distinguishing confirmed-live bugs / capture artifacts /
confirmed build gaps, with full-page screenshots as evidence.

### Phase 1 — Rebuild the review artifact (fixes Failure 2)

- **Capture engine:** reuse `parity-gallery.ts` (it already does full-page at 1180px) as the
  single capture path; retire the contact sheet's separate viewport-cropped capture code.
- **Coverage:** all 28 gallery scenarios, plus new scenarios for the holes (Tip Jar, Loading
  state, and any interaction sub-state Muxin flagged that isn't yet a scenario). Where a repo
  surface genuinely doesn't exist yet (candidates overview → PR #243; PolisStand), the page
  must say so explicitly with a pointer, never show an empty slot.
- **Format:** an index page + one small HTML page per section, images as separate committed
  PNG files referenced relatively — no base64 monolith. Budget: each page loads instantly
  (< ~2MB HTML). Layout per the 2026-07-07 decision: ref artboard | repo full-page shot side
  by side, changed-in-this-PR badges.
- **Delivery:** committed to the repo at a stable path (so it never depends on a worktree that
  can go EPERM), regenerated by one npm script.
- **DoD:** Muxin can open the index from the main checkout and click through every section
  with nothing cut off and nothing silently missing; the generating session verifies it loads
  (opens it and screenshots the viewer) before handing it over.

### Phase 2 — Make the parity gate enforced, not decorative (fixes Failure 1, tooling half)

- **Wire `design:parity-gate` into CI** as a required check on any PR touching Keystone-mapped
  paths (the HANDOFF-EXACT-MATCH.md §4 file map: `src/prototype/redesign/**`,
  `src/prototype/VoterChoiceApp.tsx`, `public/*.css`, `src/app/**` design files). The ref PNGs
  are already committed, so CI can run it today; the work is the workflow wiring + making the
  run reproducible headlessly (dev-server bring-up, seeded fixtures).
- **Expand `STRUCTURAL_PROBES` from 3 → all portable scenarios** (absorbs card `af7fa077`),
  prioritized by Muxin's flagged surfaces: Results sub-states, Scorecard, Candidates,
  Homepage, Why Now, Intake states, Polis states, Money-gap. Where a surface is intentionally
  not a verbatim class port, record an explicit per-scenario waiver in the gate config instead
  of silently skipping — silence is what allowed 24/27 to go unchecked.
- **Thresholds:** per-scenario visual thresholds tuned on a known-good section first
  (Money-gap, previously confirmed correct) before trusting failures elsewhere.
- **DoD:** a Keystone-touching PR cannot merge with a red gate; `npm run design:parity-gate --
  --all` runs green-or-explained end-to-end in CI.

### Phase 3 — Process change: gate-green before human review (fixes Failure 1, workflow half)

- **Design-card definition-of-done changes.** Every Keystone/design card's `GOAL_CONDITION`
  must name gate scenarios ("parity-gate exit 0 on scenarios X, Y" + full-page before/after
  attached) — prose like "matches the canvas" is no longer an acceptable goal condition.
- **Build workers iterate until green.** A design-build worker runs the gate locally and fixes
  until it passes *before* the PR opens. The literal gate report (exit code + per-scenario
  results) is the required `GOAL_EVIDENCE` — this creates the feedback loop that was missing.
- **Code-reading review is demoted.** A code-reading agent's verdict counts only as a
  structural pre-check. A design PR's self-vet is invalid without (a) the gate report and
  (b) rendered full-page screenshots. (Standing rule, memory
  `feedback_visual_selfvet_insufficient`.)
- **Review artifact regenerates per PR.** The Phase 1 per-section pages are regenerated on
  every design-PR push and linked from the PR body, so what Muxin reviews is always current.
- **DoD:** the conductor skill-flow for design cards encodes the above (goal-gate references
  the parity gate; Step-4 visual checkpoint requires gate output), and one card has been run
  end-to-end under the new flow as proof.

### Phase 4 — Re-audit everything open, then resume

- Run the full gate + regenerate the Phase 1 review artifact against PR #230's branch and the
  four satellite PRs (#236 IntakeLocked, #237 PolisEntry, #240 Polis-divided, #243 candidates
  overview).
- Produce the true per-section gap list (replacing the discredited "7/11 clean" tally), fold in
  Phase 0's findings, and file one fix card per failing section with gate-scenario goal
  conditions.
- Muxin reviews the new artifact section by section; her verdicts decide what merges, what
  gets fixed, and whether #230 continues as one PR or is split per-surface.
- **DoD:** every open Keystone PR has a gate report + Muxin verdict; the STOP-SHIP lifts only
  when she says so.

---

## What this plan explicitly does NOT do

- No code was written for this plan (per instruction: plan only).
- It does not decide fixes for individual sections (Scorecard layout, Results rail, etc.) —
  those become Phase 4 fix cards with gate-backed goal conditions, sized after the re-audit.
- It does not touch the copy-diff report (PR #233) rulings — the ~11 outstanding row rulings
  remain a separate, parallel decision task for Muxin; nothing ships from them under the
  STOP-SHIP anyway.
