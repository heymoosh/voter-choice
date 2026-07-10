# STOP-SHIP fidelity-fix — Build + Validate report (2026-07-09)

Per the STOP-SHIP card (`e840c072-1bd9-4dc0-aebe-8a19867aed03`)'s NEXT SESSION plan and its
HUMAN VISUAL VALIDATION GATE note. This report is evidence for Muxin's own sign-off — **it is
not a verdict, and nothing here should be merged or marked Done on the strength of this report
alone.** Per standing rule (memory `feedback_visual_selfvet_insufficient`): no code-reading or
automated-only check is ever sufficient for visual/design work; every visual claim needs an
actual side-by-side comparison a human looks at.

Worktree: `wt-stop-ship-fidelity-fix-e840c072`, branch `wt/stop-ship-fidelity-fix-e840c072`, off
`main` @ `864a26fd`. All work committed locally on this branch; **nothing pushed, no PR opened**.

## 1. Gate tally — before vs. after

Both runs are real `npm run design:parity-gate -- --all` invocations against the same app code
(only the test-harness files changed between them — see §2). "Before" was captured by
temporarily swapping in the pre-fix `scripts/design/parity-gate.ts` +
`scripts/design/parity-gallery-scenarios.ts` from `864a26fd`, running the gate, then restoring
the committed versions.

| | gated scenarios passed | skipped (not automatable) | total scenarios |
|---|---|---|---|
| **Before** | 16 / 27 | 2 (`05c-candidates-overview`, `10b-polis-contribute`) | 29 |
| **After** | 10 / 24 | 5 (`05c-candidates-overview`, `10a-polis-entry`, `10b-polis-contribute`, `11a-fieldmoneygap`, `11b-scalestates`) | 29 |

The pass count went **down**, on purpose. Net change, scenario by scenario:

- **`05a-candidates-parity`, `06-homehero`, `08d-tipjar`: PASS → FAIL.** These three now have a
  real structural probe (Build step 2) where before they had none — only the STRUCTURAL_WAIVERS
  entry — so nothing but the downscaled visual diff was backing their PASS. All three genuinely
  fail the new check today; verified by running the gate scoped to just these three before this
  became part of the full run.
- **`10a-polis-entry`, `11a-fieldmoneygap`, `11b-scalestates`: PASS → SKIPPED.** These tested UI
  that doesn't exist in the app yet; their old `"proxy"` capture shot a different, already-built
  screen and pixel-diffed it against the real target's canvas ref, which is exactly how they
  silently passed. Flipped to `automatable: "no"` (Build step 1) — they're no longer graded at
  all rather than gradable-but-wrong.
- **`09a-intake-ask`, `09b-intake-propose`, `09c-intake-locked`: PASS → PASS, unchanged by the
  gate** (their structural check is still WAIVED — no class-diff probe applies, and no marker
  probe was added for them this session). What changed is that they are no longer *unaudited*:
  §3 below is a real eyeball comparison, and the honest read is that the gate's PASS on these
  three does not reflect what's actually in the browser (see §4).

So the "after" 10/24 is a smaller, but truthful, number. 6 scenarios that were counted as PASS
before are now either honestly FAILing or honestly un-gradable; the 3 that stayed PASS were
never re-verified by anything stronger than the same downscaled pixel-diff that produced the
first 6 false-passes.

## 2. Files changed

| File | Why |
|---|---|
| `scripts/design/parity-gallery-scenarios.ts` | Build step 1: flip `10a-polis-entry`, `11a-fieldmoneygap`, `11b-scalestates` from `automatable: "proxy"` to `"no"`; removed their `capture()` functions and rewrote their notes to explain why (matches `10b-polis-contribute`'s existing convention). |
| `scripts/design/parity-gate.ts` | Build step 1: removed the now-unneeded `STRUCTURAL_WAIVERS` entries for the 3 scenarios above and fixed `10c`/`10d`'s waiver text, which had cross-referenced `10a`'s (now-deleted) waiver. Build step 2: added a second structural-probe kind (`MarkerProbe`, a discriminated union alongside the renamed `ClassDiffProbe`) and wrote 3 new marker probes for `05a-candidates-parity`, `06-homehero`, `08d-tipjar`; removed their `STRUCTURAL_WAIVERS` entries since they now have a real probe; updated the file header, doc comments, `runStructuralCheck`, and `printReport`'s wording to cover the new probe kind. |
| `.github/workflows/design-parity.yml` | Build step 5: added `include-hidden-files: true` to both `upload-artifact` steps — `actions/upload-artifact@v4` excludes dotfile directories by default, and the gate writes its report/diff-PNGs to `scripts/design/.parity-gate-out/`, so the artifact upload had never actually included them. |
| `docs/design-review/**` (33 files) | Regenerated via `npm run design:review-gallery` against this branch's current state (after Build steps 1+2 landed), so the committed HTML pages + screenshots reflect what's described in this report. One new file: `docs/design-review/screenshots/refs/05c-candidates-overview.png` (a ref image that already existed in `.keystone-canvas-refs/` but had never been copied into this mirror before). |
| `docs/operations/keystone-stopship-validation-2026-07-09.md` | This report (new). |

**Build step 4 (fold `01-orientation-activated`'s gap into card `466d6efb`) was a no-op** — confirmed
by reading `466d6efb`'s CONTEXT text directly: it already names
`01-orientation-activated failing its structural (missing design classNames) check specifically`.
No backlog edit made (out of scope for this worktree per the task boundary — the board is owned
by the orchestrating session).

## 3. Where to look: the design-review artifact

Regenerated at `docs/design-review/` (open `index.html` and click through, or go straight to a
section):

- **`docs/design-review/candidates.html`** — `05a-candidates-parity` (row 1 of the Candidates section)
- **`docs/design-review/homepage.html`** — `06-homehero`
- **`docs/design-review/statics.html`** — `08d-tipjar` (last row, Tip jar)
- **`docs/design-review/intake.html`** — `09a-intake-ask`, `09b-intake-propose`, `09c-intake-locked` (rows 1–3)

Each row shows the canvas reference artboard and the current repo screenshot side by side. Raw
PNGs are also directly under `docs/design-review/screenshots/refs/` and
`docs/design-review/screenshots/repo/` if you'd rather diff them in an image viewer.

## 4. My eyeball read on the 6 scenarios — NOT a final verdict

Rendered/compared each ref-vs-repo pair directly (methodology: same as the earlier session's
audit of the original 10 — look at both images side by side, judge structure/color/typography/
content, not just "roughly similar"). This is my own non-authoritative read; Muxin's is the one
that counts.

| Scenario | My read | What I saw |
|---|---|---|
| **`05a-candidates-parity`** | **FALSE-PASS** | The canvas artboard is a 3-card side-by-side comparison (House / Senate / President) unified by a provenance badge. The repo screenshot is a completely different screen — a single-seat two-column workspace (delegation list + scorecard sidebar), not a multi-seat comparison at all. This is a bigger gap than my structural probe alone captures (which only checks for the missing badge) — the whole artboard concept isn't rendered anywhere in the app today. |
| **`06-homehero`** | **FALSE-PASS** | Canvas is a compact two-column hero: address form on the left, a live "My Scorecard" preview stack on the right, navy/red/blue "Bold Flag" palette, serif display type. Repo is full-width, single-column, no preview panel, a completely different green/cream sans-serif visual system, plus an extra full "How it works" walkthrough section stacked below that isn't part of this artboard. |
| **`08d-tipjar`** | **GENUINELY UNSURE / partial** — closer than the other 5, but not clean | Copy and structure are nearly identical (same headline, same four tip amounts, same "Where it goes" bullets) — the best match of the six. But the color system still diverges (canvas: white/navy/red; repo: cream/forest-green) and the canvas's `$5` "lead" amount is visually emphasized (bold, filled) while the repo's four buttons render identically — confirmed by my new structural probe, which fails specifically on this. I'd call this "same content, wrong skin plus one missing emphasis," not a clean pass — but it's the one case here where reasonable people could land differently. |
| **`09a-intake-ask`** | **FALSE-PASS** | Canvas: serif editorial headline ("What should your representatives be working on?"), navy/red/blue flagbar, distinct "BEFORE YOU MEET YOUR DELEGATION" eyebrow. Repo: no headline at all, just an AI chat bubble + textarea, entirely different cream/green sans-serif system, different nav (order, logo mark, "Tip jar" pill vs. "TIP JAR" outline badge). |
| **`09b-intake-propose`** | **FALSE-PASS** | Content/flow is functionally close (chat message proposing 2 issues, editable issue list, quick-reply chips) but the entire visual system is the same civic/green mismatch as 09a — different card styling, different CTA color (blue "Send" vs. this app's own treatment), monospace all-caps labels not in the canvas at all. |
| **`09c-intake-locked`** | **FALSE-PASS** | Same civic/green vs. Bold-Flag/navy mismatch as 09a/09b. Canvas shows a distinct green confirmation banner ("Your issues are set") as a separate element from the issue-list card plus a full-width blue CTA; repo folds everything into one continuous card with a green (not blue) CTA and no separate confirmation banner. |

**Pattern across all 6:** this isn't 6 unrelated bugs — every one of them shows the same root
cause. The app is still rendering its existing "civic" mood palette (cream background, forest
green accents, monospace all-caps labels) everywhere I looked, not the Keystone "Bold Flag"
system the canvas specifies (white background, navy/red/blue accents, serif display type). That
matches the already-tracked Keystone-redesign epic (design work done in
`design-handoff/`/`claude-code-handoff/`, but the app still hardcodes the civic mood pending a
dedicated build pass) — this report doesn't discover that gap, it just gives 6 fresh, concrete,
side-by-side data points for it.

## 5. typecheck / test / lint

- `npx tsc --noEmit -p .` — clean, no errors.
- `npm run test` (vitest) — 133 test files, 2725 tests passed, 5 todo. No failures.
- `npm run lint` — clean on every file this session touched (`scripts/design/parity-gate.ts`,
  `scripts/design/parity-gallery-scenarios.ts`, `.github/workflows/design-parity.yml`). All
  warnings in the full `npm run lint` output are pre-existing `complexity` warnings in unrelated
  files (e.g. `src/lib/server/delegation.ts`, `src/lib/structured-blocks.ts`), not introduced by
  this branch.

## 6. Status

**Awaiting Muxin's sign-off.** Nothing in this branch should be merged, and the STOP-SHIP card
should not move past `STATUS: Review` on the strength of this report alone — per the card's own
HUMAN VISUAL VALIDATION GATE note, only her explicit approval, after looking at §3's artifact
herself, does that.
