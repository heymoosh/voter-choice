# Keystone design-source recovery & parity pipeline — plan

**Date:** 2026-07-07 · **Owner:** Muxin (step 0) + agents (everything after)
**Context:** the recurring failure where implementers "interpret the Keystone design as guidance" instead of porting it, plus a review artifact Muxin couldn't verify against. This doc is the source of truth for fixing both, permanently.
**Companion docs:** `design-handoff/keystone-canvas/HANDOFF-EXACT-MATCH.md` (the porting spec — §2 of it is superseded, see Phase 2 below) · `.keystone-canvas-refs/manifest.json` (29 annotated ref screenshots) · PR #230 (held draft, the current exact-match attempt, 7/11 sections clean).

---

## 1 · Root cause (found 2026-07-07)

The "port the canvas verbatim" mandate was **impossible to follow** for most surfaces:

1. **6 of ~10 screens have no local source code.** `design-handoff/design-session/` holds real JSX for only results, candidates, and funding. Orientation, home, whynow, statics, intake, and polis exist only as ref PNGs plus a 2.5 MB **compiled** canvas bundle (`Voter Choice - Keystone Design Session (Standalone).html`) whose identifiers do not survive compilation — verified by grep: `OrientationActivated`, `HomeHero`, `IntakePropose`, `PolisStand`, `ori-card` etc. appear ~0 times in readable form. Every worker on those screens was reverse-engineering pixels, which *is* interpretation. The rework was a missing-input failure, not a discipline failure.
2. **The spec is invisible to workers.** `design-handoff/` and `.keystone-canvas-refs/` are untracked; conductor workers run in fresh worktrees cut from origin/main and never see them.
3. **The copy policy on disk is stale.** `HANDOFF-EXACT-MATCH.md` §2 says "repo copy wins where more current" — superseded by Muxin's 2026-07-05 ruling and refined again 2026-07-07 (see §2 below).

## 2 · Decisions locked (Muxin, 2026-07-07)

1. **Recover the source**: Muxin exports the missing `screens-*.jsx` + latest CSS from the claude.ai Keystone canvas session using the prompt in §3.
2. **Commit the spec**: once the export lands, commit `design-handoff/` + `.keystone-canvas-refs/` to the repo in one complete-spec commit so every worktree carries it.
3. **Copy is adjudicated, not blanket-verbatim**: the canvas intended lots of new copy, but the repo has also moved. Generate a per-surface copy-diff report (canvas string vs current repo string, annotated with git recency of the repo edit); **Muxin rules on each item before any copy ships.**
4. **Review format**: full app **page** screenshots, **before AND after**, for **all** artboards every time — one row per artboard: ref PNG | app-before | app-after at 1180 px, with a changed-in-this-PR badge. Never a components-only assembled page (the format Muxin couldn't verify).
5. **Homepage headline voice = the design's version** (Activation ★, the canvas recommendation). No longer an open decision.

## 3 · Step 0 — Muxin's canvas export (ATTENDED)

Paste this prompt into the Keystone canvas session on claude.ai; paste the full reply chain (manifest + all file blocks, headers included) into `design-handoff/keystone-canvas/export-raw.md`:

```text
I need to export this design session's source code for engineering handoff. The engineering
repo currently has source for only 3 screens (results, candidates, funding) — everything else
exists only as screenshots, which has forced engineers to reverse-engineer instead of porting.
Your job: produce the complete, verbatim source so they can port exactly.

STEP 1 — Reply first with a MANIFEST ONLY, then stop and wait for my "go":
- Every source file in this session (jsx, css, shared helpers/utils), including any I don't
  list below, with approximate line count and which artboard(s) it renders.
- The exact headline string of the Activation (★ recommended) voice on the HeadlineVoices
  artboard — that voice is now the chosen homepage headline.
- Flag any file whose latest state you're unsure of.

STEP 2 — After I say "go", output every file in manifest order. Format, strictly:
- One fenced code block per file, preceded by a header line: === FILE: <filename> (part N of M) ===
- VERBATIM and COMPLETE. No summaries, no elisions, no "// rest unchanged", no "...", no
  reformatting, no cleanup, no renaming classes, no fixing perceived bugs. The approved
  artboards' exact rendered code is the spec — improvements would corrupt the handoff.
- If a file is too long for one reply, stop mid-file at a clean line break, mark the header
  "(part N of M)", and continue in your next reply when I say "continue".
- Use the version currently rendered on the canvas as the latest state.

Files I know I need (plus anything else in your manifest):
- screens-orientation.jsx
- screens-home.jsx
- screens-whynow.jsx
- screens-statics.jsx
- screens-intake.jsx
- screens-polis.jsx
- screens-results.jsx, screens-candidates.jsx, screens-funding.jsx (latest from THIS session —
  the repo's copies may be stale)
- screens.css (must include the complete [data-palette="white"] Bold Flag token block),
  candidates.css, funding.css
- Any shared components/helpers the screens import
```

## 4 · Execution phases (agent work, after `export-raw.md` exists)

**Phase 1 — Split & verify the export.** Split `export-raw.md` into individual files under `design-handoff/keystone-canvas/src/`. Verify: no elisions/truncation (`...`, "rest unchanged", suspicious short files); class names cross-check against the ref PNG annotations in `.keystone-canvas-refs/manifest.json` and the structures named in `HANDOFF-EXACT-MATCH.md` (`flagbar`, `ori-card`, `ori-step`, etc.); `screens.css` contains the full `[data-palette="white"]` block; diff the re-exported results/candidates/funding files against the `design-session/` copies and flag drift. Then the **one complete-spec commit**: `design-handoff/` + `.keystone-canvas-refs/` (decision §2.2).
*Goal condition:* every file in the export manifest exists in `src/`, verification notes written, spec committed and visible from a fresh worktree.

**Phase 2 — Fix the spec docs.** Update `HANDOFF-EXACT-MATCH.md`: §2 rewritten to the adjudication policy (§2.3 above); §3's headline-voice item marked resolved (Activation ★); §4 file map updated to point at `keystone-canvas/src/` as the porting source (screenshots demoted to verification-only).
*Goal condition:* a worker reading only the handoff doc gets current policy.

**Phase 3 — Copy-diff report for adjudication.** Per surface: canvas string vs current repo `t()`/prod string, side by side, annotated with the git date + PR of the repo edit (recent deliberate edits flagged, e.g. About-page items traced to PRs #126/#127/#128, privacy-data section). Deliverable is a report **for Muxin to rule on line-by-line**; no copy changes ship before his verdicts.
*Goal condition:* report delivered; every divergent string has a Muxin verdict recorded before implementation.

**Phase 4 — Before/after parity gallery (the standing review artifact).** A script (Playwright) that screenshots every app surface mapped to the 29 artboards at 1180 px, and emits a gallery: one row per artboard — ref PNG | before (main) | after (PR branch) — with changed-in-this-PR badges derived from the PR's touched files. Runs the same way for every design PR from now on; replaces ad-hoc contact sheets.
*Goal condition:* one command produces the gallery for any branch pair; Muxin confirms the format answers "what changed, and does the whole page match."

**Phase 5 — Parity gate (definition-of-done).** Two checks wired as the DoD on every design card: (a) structural — rendered DOM class-structure asserted against the design source (now that we have it); (b) visual — pixel-diff vs the ref PNGs with a copy-tolerant threshold. Design cards' goal conditions change from "match the canvas" prose to "diff ≤ threshold vs ref `NN-*.png`". This supersedes/absorbs the class-coverage-checker proposal (backlog card `97685b26`).
*Goal condition:* the gate runs on the already-clean sections (results/funding) and passes; fails on a known-gap section.

**Phase 6 — Resume the exact-match work under the new harness.** Re-verify PR #230's 7 clean sections with the gate; work the 4 residual gaps (Results context strip, Scorecard non-2026 rows, Intake quick-replies `61e728fb`, Polis structure — see the gap notes) as cards with the new DoD. Decide with Muxin: fix in #230 vs land-clean-then-follow-up.

## 5 · Fallback (if the canvas export fails or is incomplete)

Render the standalone bundle with Playwright, navigate to each artboard, and extract `outerHTML` + computed styles per artboard as the canonical spec. Exact markup/classes/tokens, fully programmatic — lower-fidelity provenance than JSX but sufficient for porting and for the Phase 5 structural gate.

## 6 · Explicitly still open (do not build as final)

- **"Lock these in" box** (canvas card `4b7e5a66`) — never designed; needs its own design pass or an explicit v1 descope. Do not invent a treatment.
- **Polis Phase 8b** clustering — data-availability gate (~150 sessions), not a design gap; ship the honest empty state.
- **PR #230 disposition** — Muxin decides at Phase 6.
