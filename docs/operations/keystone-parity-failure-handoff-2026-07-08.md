# Keystone parity failure — handoff for triage (2026-07-08)

> **UPDATE (same day):** triage is done — the diagnosis and the fix plan now live in
> `docs/operations/keystone-fidelity-fix-plan-2026-07-08.md` (STOP-SHIP: nothing Keystone
> builds or merges until that plan's Phase 4 re-audit completes). Backlog gate card:
> `e840c072`. This doc remains as the raw incident record.

## Why this doc exists

Muxin reviewed the Keystone design-parity contact sheet for PR #230 today and found near-total
mismatch across almost every major surface — far worse than the "7/11 clean, 4 residual gaps"
read a prior session gave her on 2026-07-07. She's stopping the detailed per-PR review and wants
a fresh model to triage: figure out what actually happened, what's actually broken, and what a
real fix path looks like. This doc is the handoff — her raw findings, the root cause already
confirmed, open questions, and pointers to every artifact. It is deliberately not a fixed plan;
triage this with fresh eyes rather than assuming the prior session's framing was right.

## What Muxin actually found (her words, lightly organized)

Looking at `keystone-contact-sheet.html` (canvas-vs-repo screenshots, 11 sections):

- **Results (workspace)** — lots of mismatch. Missing the right rail structure canvas has. The
  "voted with you" section doesn't match. Can't see ANY funding-expanded data in the repo
  screenshot at all — "how is there no funding data????" (error? bug? lack of data? worrying).
  The per-issue roll-call presentation doesn't match. The "see all votes" sheet doesn't match.
- **Scorecard** — "YIKES does NOT match at all." Layout needs fixing. Missing info the canvas
  shows (e.g. a reference row for a senator not up for election yet — canvas explicitly shows
  this as "Junior Senator · Not up until 2028 · Shown for context," repo has no equivalent
  section on the printable scorecard).
- **Candidates (unified card + head-to-head)** — "YIKES, there's supposed to be cards you see
  before you drill down into any single rep. What happened to that whole UI and UX I provided?"
- **Homepage** — match the canvas exactly; remove the extra section at the bottom the repo
  version has; update the nav links to match canvas's order/labels.
- **Why Now** — the repo screenshot is cut off, can't verify everything got done.
- **How it Works** — styling does not match the canvas.
- **Tip Jar / Loading state** — no repo screenshot exists to even compare against canvas.
- **Intake ("Defining your issues")** — Cold Open doesn't match canvas and should. AI-proposes
  step + quick replies don't match canvas. Locked/ready-to-start doesn't match. Edit-issues from
  the workspace doesn't match. Apply-and-rescore doesn't match.
- **Polis** — "nothing in Polis is created properly."
- **Money-gap scale** — "doesn't look like what it needs to be."

Her meta-questions, verbatim intent:
1. "Did we actually implement the [parity/fidelity gate] backlog item on programmatic fidelity
   before we did this work? Because it didn't seem to work."
2. "If something was detected as a mismatch from my intentions, how come there was no feedback
   loop to fix it until it got to where it needed to be before I reviewed it?"
3. "If there were UI or UX gaps that during development we didn't detect, how come that wasn't
   being flagged?"

## Root cause — already confirmed, don't re-derive this part

A pixel+structural parity gate **does exist**: `scripts/design/parity-gate.ts`, run via
`npm run design:parity-gate`, shipped in PR #242 ("Phase 5 — Keystone parity gate"), **merged to
main 2026-07-08 08:37am** — the same morning the 5 build PRs below were self-vetted as ready.

Two confirmed gaps in that gate:
- **Not wired into CI.** `grep -rn "parity" .github/workflows/*.yml` returns nothing. The gate is
  a standalone script; nothing invokes it automatically on a PR. `.github/workflows/` contains
  `test.yml`, `mutation.yml`, `e2e-legacy-nightly.yml`, `deploy.yml`, and several `ingest-*.yml` —
  none reference the parity gate.
- **Structural coverage is 3 of 27 scenarios.** Its `STRUCTURAL_PROBES` (className-coverage
  check) only covers `01-orientation-activated`, `02a-results-main`, `02b-results-funding-expanded`
  — by the file's own header comment, because most components predate the canvas-export recovery
  and were only ever built functionally-equivalent, not verbatim ports. Expanding coverage to the
  other 24 scenarios is tracked as backlog card `af7fa077` (still `Backlog`, unstarted).

**What this means concretely:** nobody — human or agent — ran this gate, or looked at an actual
rendered screenshot, against PRs #230/#236/#237/#240/#243 before they were marked CI-green and
"self-vet clean" by a code-reading review pass earlier today. That review pass read source diffs
and compared them against text descriptions of the canvas's intent — it never rendered anything.
See memory `feedback_visual_selfvet_insufficient` for the generalized lesson: a code-reading
agent's "faithful to canvas" claim is not visual proof, and should never again be treated as
sufficient evidence that a design-parity PR is ready.

This answers her three meta-questions directly: the gate was built (yes, Q1 — but only that
morning, and only for 3/27 scenarios), but nothing forced it to run (Q2), and the self-vet review
that substituted for it can't see rendering, so gaps went undetected until she looked herself (Q3).

## Artifacts to work from

- **Contact sheet** (11-section canvas-vs-repo, the one Muxin reviewed today): checked out fresh
  at `/private/tmp/claude-501/-Users-Muxin-Documents-GitHub-voter-choice/d289c53d-7f27-4047-8ef7-5f7567435f4d/scratchpad/pr230-view/keystone-contact-sheet.html`
  (branch `wt/match-the-keystone-design-exactly-d83cf5ec`, PR #230). The usual worktree at
  `voter-choice-worktrees/wt-match-the-keystone-design-exactly-d83cf5ec` is unreadable — hits the
  known stale-worktree `EPERM` bug (see memory `project_stale_worktree_permission_denied`), not a
  real git problem; work from the fresh checkout above or cut a new one.
- **Parity gate**: `scripts/design/parity-gate.ts`, `npm run design:parity-gate` (main, post PR #242).
- **Parity gallery** (the finer-grained, 27-scenario tool — different from the 11-shot contact
  sheet above): `scripts/design/parity-gallery.ts` + `scripts/design/parity-gallery-scenarios.ts`,
  `npm run design:parity-gallery` (PR #234, merged).
- **Copy-diff report** (separate PR #233, docs-only, not app code): `design-handoff/keystone-canvas/COPY-DIFF-REPORT.md`.
  Muxin ruled on the bulk of this already; ~11 rows still need her direct call (listed in chat,
  not repeated here — this doc is about the parity/process failure, not the copy ruling).
- **Design source of truth**: `design-handoff/keystone-canvas/HANDOFF-EXACT-MATCH.md` (file map,
  per-section approved-vs-reference table) and `design-handoff/keystone-canvas/src/screens-*.jsx`
  (the recovered canvas source, committed PR #231).
- **The 5 PRs under review today**: #230 (11-section match, flagship), #236 (IntakeLocked),
  #237 (PolisEntry), #240 (Polis divided/where-it-split), #243 (candidates overview + drill-down).
  All still open/draft, all CI-green, none merged.
- **Backlog**: `docs/operations/voter-choice-backlog.md`. Relevant cards: `b7c7178d` (the parent
  epic, "Recover the Keystone design source + stand up the parity pipeline"), `d83cf5ec` (Match
  Keystone Exactly epic, PR #230's card), `af7fa077` (expand STRUCTURAL_PROBES coverage, unstarted).

## Specific technical questions this session should chase down (not yet answered)

- **Results page funding section**: the repo screenshot cuts off right at "FUNDING & INFLUENCE /
  Money trail" with no visible bar/data. Is this (a) a real bug where `FunderPanel`/funding data
  fails to render, (b) missing/absent funding data for the specific test fixture used to capture
  the screenshot, or (c) just a viewport/scroll artifact of how the screenshot was captured? This
  needs a live check (open the actual app, not another static screenshot), because "no funding
  data" would be a serious regression if real.
- **Results right rail counting bug**: the repo's "Your scorecard" box shows a "0/3 · DRAFT"
  header but the "YOUR ISSUES" list directly below only shows 2 numbered issues. Either the
  header count is wrong, or an issue is missing from the list — worth confirming live.
- **Scorecard missing "not on your ballot" section**: confirmed via direct screenshot comparison
  — canvas's printable scorecard has an explicit "NOT ON YOUR BALLOT THIS YEAR" section for a
  seat not up in 2026 (shown for context, no decision needed); the repo's printable scorecard
  (`ScorecardPrintView.tsx`) has no equivalent section at all. This is a real, confirmed gap, not
  a maybe.
- **Candidates overview "YIKES"**: do NOT treat this as a new gap to fix — it's expected. The
  contact sheet for PR #230 has no repo screenshot for the multi-seat overview card
  (`canvas-05a-candidates-card.png` exists, no `repo-05a` equivalent) because that overview
  doesn't exist on #230's branch — it's being built on a **separate** PR (#243,
  `DelegationOverview`/`SeatCard` etc.), which was independently self-vet reviewed today as
  functionally solid (see PR #243 review — two real open questions there: a print-gate
  inconsistency between the overview and the existing seat-rail, and blind-reveal state not
  carrying over from the deep view to the overview cards). Don't re-litigate "where did the
  overview go" — it's in #243, just not merged/visible in #230's contact sheet.
- **Senate seat count fact-check** (Muxin asked for this specifically): researched today — 2026
  Senate elections total **35 seats** (33 regular Class II + 2 specials: Ohio [JD Vance vacancy]
  and Florida [Rubio vacancy]), per Ballotpedia/Wikipedia. Canvas's copy says "34" (doesn't match
  any standard tally found). Repo's copy says "33 Senate seats" (matches the regular-only count,
  defensible but silently excludes the 2 specials). Recommend the repo copy be made precise
  (e.g. "33 regular Senate seats plus 2 special elections") rather than either bare number
  shipping as-is — this is a copy-diff-report item (Why Now section) waiting on this fact-check.

## Suggested first moves (judgment call for the new session, not a mandate)

1. Re-verify Results/Scorecard/Candidates/Homepage/Why Now/Intake/Polis/Money-gap against the
   **running app**, not another static contact sheet — the contact-sheet approach (one screenshot
   per section) has already proven too coarse to catch real gaps (funding cutoff, the 0/3-vs-2
   count, sub-states like Tip Jar/Loading with no repo shot at all).
2. Decide whether to wire `npm run design:parity-gate` into CI now (blocking merge on any
   Keystone-touching PR) before any of #230/#236/#237/#240/#243 proceeds further, and whether to
   prioritize expanding `STRUCTURAL_PROBES` past the initial 3 scenarios (card `af7fa077`) before
   trusting the gate's "pass" on anything else.
3. Re-scope how big the remaining Keystone work actually is now that the true gap list looks much
   larger than "4 residual gaps" — this may warrant Muxin re-deciding the port strategy (e.g.
   section-by-section with a hard visual gate per section, rather than one big PR) rather than
   continuing to iterate on #230 as currently scoped.
