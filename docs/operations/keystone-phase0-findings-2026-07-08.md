# Keystone fidelity fix — Phase 0 findings (live-verify the scares)

Ran per `docs/operations/keystone-fidelity-fix-plan-2026-07-08.md` Phase 0, against PR #230's
branch (`wt/match-the-keystone-design-exactly-d83cf5ec`), driving the real dev server with the
same e2e fixture data (3-seat TX delegation, funding on 2 of 3 seats). No code changes made.

## Confirmed live bugs
None. Funding rendering and the scorecard count are both correct in the running app.

## Capture artifacts (looked broken in the old contact sheet, actually fine live)

1. **"No funding data" — root cause found.** The Results workspace uses a sticky-sidebar layout
   (`.ws-shell { height:100vh; overflow:hidden }`, `public/prototype-c.css` ~L3288) that scrolls
   **internally**. `page.screenshot({fullPage:true})` gets capped at viewport height (1180×1000)
   on this page specifically — confirmed on both an ad-hoc capture and the repo's own
   `parity-gallery.ts` output. **This means Phase 1's plan to reuse `parity-gallery.ts` because
   "it already does fullPage:true" is not sufficient by itself** — it needs to also handle this
   scroll-trapped shell (e.g., temporarily neutralize `overflow:hidden` before capture). Funding
   is also collapsed by default (matches canvas), so a static crop before any interaction showed
   nothing — two compounding causes, not one.
2. **"Why Now cut off" — capture artifact.** Full-page capture (1180×3109) shows the complete
   page; nothing is missing.
3. **"0/3 · DRAFT vs 2 issues listed" — not a counting bug.** `DelegationWorkspace.tsx:111`'s
   `{doneCount}/{seats.length}` counts verdicted seats (3); the "YOUR ISSUES" list below it is an
   unrelated list of the voter's priority issues (2 in this fixture). Verified the count tracks
   correctly through the full verdict flow (0→1→2→3). Code is correct; canvas just never
   juxtaposes these two numbers in the same rail, which is what caused the misread — a real
   layout divergence, not a logic bug.

## Confirmed build gaps (real, feed Phase 4's fix-card list)

4. **Printable scorecard drops the non-2026 seat entirely**, worse than previously understood —
   `ScorecardPrintView.tsx:43-46` filters it out of the printed sheet with no trace, even after
   it's verdicted. Canvas shows it with an explicit "NOT ON YOUR BALLOT THIS YEAR / shown for
   context" row.
5. **Polis group clustering + "Where it split" not built** — live renders one undifferentiated
   cloud with an aggregate %; canvas has 3 labeled clusters with per-group numbers and a separate
   split section. Predates this PR (blocked on a counters-schema change per prior Polis work,
   memory `project_polis_viz_phase1`) — real gap, not a regression.
6. **How it Works styling mismatch** — kicker text, numbered-circle badges, and a subhead
   paragraph all present on canvas, absent/different live.
7. **Nav order/labels mismatch** — order and label set differ from canvas; live also has an
   extra "Support" link and a different language-switcher treatment. Homepage hero content itself
   matches canvas closely. Could not confirm/deny a reported "extra section at the bottom" —
   `.keystone-canvas-refs/` only has one (cropped) homehero frame; the canvas viewer's own pager
   implies a second frame that isn't committed.
8. **Two `parity-gallery-scenarios.ts` scenarios error out silently** on this branch:
   `08b-howitworks` clicks a link that was intentionally renamed/removed; `04-scorecard`'s
   `verdictRow` only verdicts 2 of 3 seats so Print never unlocks and the capture times out. Both
   need fixing before Phase 1/2 can trust the gallery's coverage.

## Screenshot evidence
Full-page captures live in the Phase 0 worker's scratchpad worktree (ephemeral — this diagnostic
step doesn't warrant committing ad-hoc evidence; Phase 1 produces the durable, committed gallery
that supersedes it). Key shots: Results (funding collapsed + expanded + scroll-trap-neutralized
showing full funding mix), scorecard rail close-up, all-verdicted state, print sheet (missing
seat), homepage, How it Works, Why Now (full page), Polis report (no clustering).
