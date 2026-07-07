# Phase 1 verification — split & verify the keystone canvas export

**Date:** 2026-07-07 · **Scope:** verify `export-raw.md` → `src/` split integrity only (Phase 1 of `docs/operations/keystone-design-source-plan-2026-07.md`). No copy/porting judgment made here.

## 1 · Split completeness & fidelity

`export-raw.md` contains 19 `=== FILE: <name> (part 1 of 1) ===` blocks; every one is "part 1 of 1" (no multi-part files, so no continuation-boundary risk). All 19 have a corresponding file in `design-handoff/keystone-canvas/src/`.

I extracted the fenced code-block body between each marker's opening/closing ``` ``` `` and byte-diffed it against the corresponding `src/` file. **Result: all 19 files are byte-for-byte identical** to their export-raw.md source block. The mechanical split lost nothing and introduced nothing.

Files: `Voter Choice - Keystone Design Session.html`, `design-canvas.jsx`, `canvas-app.jsx`, `screens-orientation.jsx`, `screens-results.jsx`, `screens-scorecard.jsx`, `screens-candidates.jsx`, `screens-home.jsx`, `screens-whynow.jsx`, `screens-statics.jsx`, `screens-intake.jsx`, `screens-polis.jsx`, `screens.css`, `candidates.css`, `home.css`, `whynow.css`, `statics.css`, `intake.css`, `polis.css`.

**Verdict: split is complete and faithful. No action needed.**

## 2 · Elision / truncation scan

Grepped every `src/*.jsx` and `*.css` for literal `...`, "unchanged", "rest of/omit/truncat/abbreviat/same as before/as above/continued/see above", TODO/FIXME/placeholder-as-elision, and `// ...` / `/* ... */` style stub comments.

- Every `...` hit is a legitimate JS spread operator (`[...CHS]`, `{...s}`, `[...kept, ...srcIds...]`) inside `design-canvas.jsx` / `screens-candidates.jsx` — none are elision markers.
- The 3 "unchanged" hits are prose, not elisions: two code comments about animation/scale state, one UI copy string ("Your keep / replace verdicts are unchanged either way.") in `screens-intake.jsx`.
- "placeholder" hits are all legitimate HTML `placeholder=` attributes on inputs/textareas.
- No TODO/FIXME/XXX, no "rest unchanged," no continuation comments anywhere.

Also checked the shortest screens file, `screens-scorecard.jsx` (76 lines) — read in full, it's a complete real component (mast, two decisions, a "Not up until 2028" not-on-ballot row, meta strip, footer), not a stub.

**Verdict: no elision/truncation markers found. None.**

## 3 · Class-name cross-check

Sampled classes named in `.keystone-canvas-refs/manifest.json` and backtick-quoted tokens in `HANDOFF-EXACT-MATCH.md`, grepped against `src/*.css` + `*.jsx`.

- `flagbar`, `ori-card`, `ori-step`, `.ori` — all present (`screens.css` + `screens-orientation.jsx`), matching manifest artboard 01's annotation and HANDOFF §1.
- `res-context` / context-strip structure — present in `screens-results.jsx` (`<div className="res-context">`) and styled in `screens.css`. This resolves one of the 4 residual gaps noted in memory ("Results context strip") — the canvas source does specify it.
- Intake quick-reply chips (`iq-chips`/`iq-chip`) — present in `screens-intake.jsx`, matching manifest's "quick-reply chips" annotation for artboard 09b.
- Polis structure (`ps-`, `pm-` prefixed classes: `ps-stmt`, `ps-react`, `pm-glab`, etc.) — present and substantive in `screens-polis.jsx`.
- A handful of tokens named in HANDOFF-EXACT-MATCH.md (`rep-center`, `tier-intro`, `ti-place`, `not-up-2026`, `voter-meta-logistics`, `.verdict-print.keep/.replace`, `scorecardPrint.aligned`) do **not** appear in the canvas `src/`. On inspection these are the **repo's own existing implementation** class/i18n-key names (in `RepCard.tsx`, `ScorecardPrintView.tsx`, `redesign2.css` — i.e. HANDOFF-EXACT-MATCH.md documenting what the *repo already does*, confirmed against the canvas structurally), not canvas-side names. Their absence from `design-handoff/keystone-canvas/src/` is expected, not a gap.

Also noted: the manifest has 28 entries/28 PNGs (not "29" as the plan doc's prose says) — a minor description inaccuracy in the plan, not a data problem.

**Verdict: no named-but-genuinely-missing class found.**

## 4 · `screens.css` white-palette block

`.screen[data-palette="white"]` is a complete, standalone rule at lines 63–80 (18 lines, 14 custom properties: `--paper`, `--paper-2`, `--ink`, `--ink-2`, `--ink-3`, `--brand`, `--brand-2`, `--brand-soft`, `--keep`, `--keep-soft`, `--replace`, `--replace-soft`, `--gold`, `--tag-bg`, plus `--rule`/`--rule-2` overrides), commented "PALETTE B — Bold Flag (white ground)." Sibling `[data-palette="warm"]` block (lines 40–55) present too for comparison. Not a stub.

**Verdict: present and complete.**

## 5 · Results / candidates / funding drift vs `design-session/`

- `screens-results.jsx`, `screens-candidates.jsx`, `screens.css`, `candidates.css` — **byte-identical** to the existing `design-handoff/design-session/` copies. No drift; the canvas hadn't moved on these since the last handoff.
- **`screens-funding.jsx` / `funding.css` have no equivalent anywhere in the new export.** `canvas-app.jsx`'s 10 `<DCSection>`s (orientation, results, color, scorecard, candidates, home, whynow, statics, intake, polis) do not include a funding/money-gap comparison section. None of the funding-specific component names (`FieldMoneyGap`, `ScaleStates`, `MoneyGapH2H`, `GapRow`, `MedianAxis`, `MiniBar`, `MedianChip`, `usd`, `multStr`, `band`) or CSS class prefixes (`fs-*`, `fund-*`, `h2hm-*`) from the old `design-session/funding.jsx`/`funding.css` appear anywhere in `design-canvas.jsx`, `canvas-app.jsx`, or any `screens-*.jsx`/`*.css` in the new `src/`. This is a real gap in the export, not a splitting artifact — the export prompt explicitly asked for the "latest from THIS session" funding file and it wasn't delivered, nor does its content live folded into another file.
  - Note: this is distinct from the in-context "Funders & influence ▾" panel (`FunderPanel` in `screens-results.jsx`, styled via `.funder-panel`), which *is* present and unrelated to the standalone money-gap-scale primitive — don't conflate the two.
  - `.keystone-canvas-refs/manifest.json` still documents 3 ref screenshots for this content (`11a-fieldmoneygap.png`, `11b-scalestates.png`, `11c-moneygaph2h.png`), so the ref imagery + the older `design-session/screens-funding.jsx` + `funding.css` remain the only source for those 3 artboards — they simply weren't re-verified/re-exported by this canvas session.

## Overall verdict

**Usable as the porting source of truth**, with one flagged, non-blocking gap:

- The split itself is perfect (byte-identical, zero elisions, all named structural classes present).
- **Open gap for Muxin:** the money-gap comparison primitives (`FieldMoneyGap`, `ScaleStates`, `MoneyGapH2H` — ref screenshots 11a/b/c) were not included in this export and have no equivalent in the new `src/` tree. The existing `design-handoff/design-session/screens-funding.jsx` + `funding.css` remain the only known source for those 3 artboards; they were not re-confirmed as current by this canvas session. If those 3 artboards need porting/verification, either re-run the export prompt against whatever canvas thread holds that section, or explicitly accept the older `design-session/` copies as still-current (they were not contradicted by anything in this export — results/candidates/screens.css/candidates.css all came back byte-identical to their `design-session/` counterparts, suggesting the canvas hadn't moved and the funding file may simply have been in a part of the session this export didn't reach).

Nothing here blocks committing the recovered export — an incomplete-for-one-section recovery is still strictly better than the untracked status quo.
