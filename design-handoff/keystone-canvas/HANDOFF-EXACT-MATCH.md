# Handoff: match the keystone design EXACTLY

**Audience:** whoever wires `heymoosh/voter-choice` (`src/prototype/redesign/*`) to this canvas.

**The mandate.** `Voter Choice - Keystone Design Session.html` is not a moodboard or
"inspiration" — treat every approved artboard as the frontend spec: exact layout,
exact component structure, exact classes/tokens, exact copy unless flagged below.
Where a canvas artboard and the live repo disagree, **the canvas wins** for anything
visual/structural. The **only** sanctioned deviation is copy that the live app has
already moved past — see §2. Do not "take direction from" the canvas and reinterpret;
port it.

This doc cross-checks `DECISIONS.md` / `HANDOFF-NEXT-SESSION.md` /
`HANDOFF-TO-CLAUDE-CODE.md` (the prior handoffs — still valid, read them for full
rationale) against the actual state of `heymoosh/voter-choice@main` as of this
session. Everything here is grounded in real file reads, not assumption.

---

## 0 · What's approved vs. what's reference-only

The canvas shows options side by side for the record. **Only one artboard per
section is the design.** Ignore the rest when building — they exist so a reviewer
can see what was rejected and why, not as fallback choices.

| Section | Build THIS artboard only | Discard (reference-only) |
|---|---|---|
| 1 · Orientation | **★ Recommended · Guided Tour, activated** (`OrientationActivated`) | A/B/C originals (`OrientationA/B/C`) |
| 2 · Results | **Bold Flag** (`palette="white"`), all 4 states (main / funding expanded / votes drilldown / all-votes sheet) | — (no alt shown here; palette is set by §3) |
| 3 · Color | **B · Bold Flag (white ground)** | A · Civic Activated (warm paper) — kept only as the before/after record |
| 4 · Scorecard | The one grayscale-safe sheet shown | — |
| 5 · Candidates | Unified card (`CandidateParity`) + **B · dedicated head-to-head** (`HeadToHead`) | A · inline ranked chooser, C · split shortlist (down-select already resolved to B) |
| 6 · Homepage | **★ Homepage hero** (`HomeHero`) | — but the **headline voice is still open** (see §3.4) |
| 7 · Why Now | The one editorial page shown | — |
| 8 · Statics | All 5 (About/How it works/Privacy/Tip jar/Loading) | — |
| 9 · Intake | All 5 steps shown (this is a sequence, not alternates) | — |
| 10 · Polis | Entry + Contribute + Report (both `divided` and consensus states are real, not alternates — render whichever the data produces) | — |
| 11 · Money-gap | Field scale + states + chip + head-to-head integration | — |

---

## 1 · Section-by-section wiring, with real repo status

Repo evidence below comes from reading the actual files in `heymoosh/voter-choice@main`
(`src/prototype/redesign/*.tsx`). Status legend: **✅ matches spec** (confirmed by
reading the code) · **⚠️ gap found** (confirmed mismatch, fix it) · **❓ verify**
(component exists and is plausibly right, but I did not read enough of it to confirm
pixel/class parity — check against the canvas before sign-off).

### 1 · Orientation — ⚠️ GAP FOUND
Repo target: `App2.tsx` → `OrientationView` (stage `"orientation"`, already wired
into the router between `coldopen` and `analyzing` — the stage plumbing is correct).

**The component itself does not match `OrientationActivated`.** Today it renders a
bare `<div className="coldopen orientation">` with a kicker/heading/body pulled from
`t("orientation.*")` and a single CTA button — no Bold Flag flag-hairline, no
`ori-card activated` treatment, no numbered 3-step list, no meta line. Port
`screens-orientation.jsx`'s `OrientationActivated` markup verbatim:
- `<div className="flagbar"><i/><i/><i/></div>` hairline
- `ori-card activated` wrapper, `★ Before you start · step 3 of 3` kicker
- The exact 3-step block (`ori-step` × 3, numbered) — copy in §2 may refresh, structure must not
- CTA row: primary button + `~4 min · N seats up in 2026` meta span
Move these strings into the `t("orientation.*")` i18n keys rather than hardcoding,
but the **rendered structure and classes must match `screens.css`'s `.ori`/`.flagbar`
rules exactly** — copy `screens.css` selectors for `.ori`, `.flagbar`, `.ori-card`,
`.ori-step` into `redesign2.css` if they aren't already there.

### 2 · Results — ❓ VERIFY, structurally ✅
Repo target: `DelegationWorkspace.tsx` (workspace shell) + `RepCard.tsx` (the card).
**Confirmed correct:** one visible panel (center `rep-center` = `RepCard` + `SeatChat`);
the right rail (`ScorecardPane`) already **is** the progress — rows render
`reviewingNow` / `notYetReviewed` / a done chip, no separate progress bar, no left
issues panel. Jurisdiction context strip exists (`tier-intro` with `ti-place` +
title + body — matches "slim context strip up top"). Non-2026 seats render
`not-up-2026` with "Not up for election in 2026" label (matches decision #4). Print
button lives in `ScorecardPane`'s foot and is `disabled={!canPrint}` (unlocks after
first verdict — **verify** it should be *all* seats decided, not just one, per
DECISIONS.md #3, and that the button copy shows the "Decide N of M to print" counting
copy from the canvas, not just a static label).
**Needs verification against the canvas (not read this session):** `RepCard.tsx`'s
funding progressive-disclosure ("Funders & influence ▾"), the per-issue vote
drilldown, and the "see all votes" sheet — confirm class names/layout against
`res-funding` / `res-votes` / `res-allvotes` artboards.

### 3 · Color — ⚠️ VERIFY DEFAULT PALETTE
Decision: Bold Flag (white ground) is THE palette, applied everywhere. The canvas's
`--brand`/`--keep`/`--replace`/`--gold` oklch values live in `screens.css` under
`.screen[data-palette="white"]`. **Confirm `public/redesign2.css` defines the same
token values** (not the older `civic` teal palette referenced in
`docs/design-integration/current-app-inventory.md`'s "hard invariants" — that doc
predates this keystone pass and describes `data-palette="civic"` as the body default,
which is now superseded). If `redesign2.css` still ships a teal/warm default, that's
a gap: port the exact oklch values from `screens.css`'s `[data-palette="white"]`
block into whatever `:root`/`.delegation` scope `redesign2.css` uses.

### 4 · Scorecard — ✅ mostly confirmed, ⚠️ one thing to check
Repo target: `ScorecardPrintView.tsx`. **Confirmed correct:** decisions render before
the logistics block (ballot-list first, `voter-meta-logistics` second — matches
"decisions lead, address/districts demoted to a footer strip"); percentage-based
match copy (`scorecardPrint.aligned` with `pct`), not a raw fraction; non-2026 seats
excluded via `onBallot2026 !== false` filter. **Verify:** the grayscale-safe
differentiation (filled badge + ✓ for Keep vs. outlined badge + ⇄ for Replace) is a
CSS concern (`.verdict-print.keep` / `.verdict-print.replace` in `redesign2.css`) —
I could not confirm the icon/shape treatment from the component file alone. Check it
renders distinguishably in black-and-white print preview, matching `Scorecard` in
`screens-scorecard.jsx`.

### 5 · Design Candidates — ❓ VERIFY
Repo targets exist and are named correctly: `RepCard.tsx` (unified card w/
provenance badge), `HeadToHead.tsx` (the down-selected B direction), `duelAlignment.ts`
(scoring). `App2.tsx` confirms `HeadToHead` is wired as a full-screen surface replacing
the workspace when `duelSeatId` is set, opened from "Time to replace" — structurally
matches the decision. **Not read this session:** whether `RepCard`'s provenance
badge (`◆ Roll-call record` filled vs `◇ Researched · cited` dashed) and
`HeadToHead`'s challenger-switcher/per-issue-Δ-ledger/funding-contrast layout match
`CandidateParity` / `HeadToHead` artboards pixel-for-pixel. Verify before sign-off.

### 6 · Homepage — ❓ VERIFY + one open decision
Repo target: `HomeView` in `VoterChoiceApp.tsx` (not read — file is 325KB; locate the
`HomeView` export and diff against `HomeHero`). Confirm: two fact snippets removed
from hero, address box simplified to label + field + "Pull my representatives" with
reassurance folded under one disclosure line, right column previews the product
instead of stats. **Headline voice is NOT locked** — see §3.4, do not ship a final
headline copy choice without the user picking from `HeadlineVoices`.

### 7 · Why Now — ❓ VERIFY
Repo target: `WhyNowPage` (imported in `App2.tsx` from `VoterChoiceApp`, stage
`"whynow"`, wired in nav). Confirm the three-movement structure (problem → 2026
moment → how it works) and that the two fact stats pulled off the homepage hero
(6 hrs/day fundraising · 94% incumbents win) actually live here now.

### 8 · Static pages — ❓ VERIFY
Repo targets: `AboutPage`, `MethodologyPage`, `PrivacyPage`, `TipJarPage` (all
imported from `VoterChoiceApp.tsx` into `App2.tsx`). Confirm they share one editorial
shell (masthead + kicker + serif prose column) per `StaticPageVC` in the canvas, and
that the footer matches the reorg (Privacy right after About, trimmed copyright line,
Tip jar/Support de-emphasized after a divider).
**Nav label — confirmed to check:** decision renames the "Methodology" nav link to
**"How it works"**. In `App2.tsx`, the stage is still named `methodology` and there's
a separate, currently-dead `navigate("howitworks")` branch that just falls back to
`"home"`. **Do not rename the stage or add a new route** — find the nav link array in
`VoterChoiceApp.tsx` (`AppNav`) and change only the *visible label* string from
"Methodology" to "How it works", keeping it pointed at the `methodology` stage. Delete
or repoint the dead `howitworks` branch once you've confirmed nothing else depends on it.

### 9 · Intake / defining your issues — ❓ VERIFY
Repo targets: `IntakeView.tsx`, `IssueConversation.tsx`, `EditIssuesModal.tsx`,
`IssueDeltaBanner.tsx` — all exist and are wired (`App2.tsx`'s `coldopen` stage renders
`IntakeView`; `editIssuesOpen` renders `EditIssuesModal`; `issueDeltas` renders
`IssueDeltaBanner`). Confirm the bounded-disambiguation UI (2–4 tappable quick-reply
options, never a forced multiple-choice) matches `IntakePropose`, and that Apply →
re-score flags seats "Revisit" without touching existing verdicts (this exact
contract is described in `App2.tsx`'s `handleApplyIssues` and looks correctly
implemented: verdicts are untouched, `computeSeatDeltas` produces the revisit flags).

### 10 · Polis — ✅ placement confirmed, ❓ verify visual
Repo targets: `PolisClose.tsx`, `polisAdapter.ts`. **Confirmed correct:** Polis is
NOT a nav tab — it's reached only via `seeStanding()` after the workspace is done
("one more thing worth seeing — where you stand among your neighbors"), and there's
a genuine empty state (`StandingLocked`) when no one else has finished yet, matching
the "never gates the printout, always skippable" rule. **Verify:** the opinion-map +
bridge-statements visual treatment in `PolisClose.tsx` against `PolisStand` /
`PolisReport` artboards, and that contribute stays blind (no running tally).
Per `docs/REDESIGN_2026_SHIPPED.md`, the underlying SQL aggregate pipeline
(priority-overlap bars + bridge statements) may still be a stubbed/honest-empty-state
pending real data — that's expected, not a bug, until the ~150-session threshold is met.

### 11 · Money-gap scale — ✅ CONFIRMED CORRECT
Repo target: `peerComparison.ts`. **This is built exactly to spec** — I read the
full file. `baseline: 'chamber-median'` is locked, band thresholds match exactly
(`≥1.15` above / `<0.85` below / else at), `derivePeerComparison()` returns `null`
whenever `totalRaised` or `chamberMedian` is missing/non-positive (never fabricates
a baseline), and `formatUsd`/`formatMultiple` match the canvas's display rules. Also
present: `MoneyGap.tsx` (the UI — not read this session, but the data layer it
consumes is correct). **Verify only:** that `MoneyGap.tsx`'s `MedianChip` / full scale
/ `MoneyGapH2H` render using the gold-accent-for-"more" / muted-navy-for-"raised"
treatment (never reusing the keep/replace green-red), matching `FieldMoneyGap` /
`ScaleStates` / `MoneyGapH2H` artboards.

---

## 2 · Copy policy — the one place you SHOULD deviate

**Our canvas copy is behind the live codebase.** Where the two disagree, prefer
whichever copy is more current/production-accurate, sourced from the app's real
`t("...")` i18n strings or prod (`voter-choice.vercel.app`) — but only for copy.
Never let a copy update justify changing layout, component structure, class names,
or visual treatment; those come from the canvas, full stop.

Known stale spots to double check against current prod copy before shipping:
- Overall positioning line — DECISIONS.md notes prod confirmed **"Assess Your
  Representatives with AI"** as of the keystone session; re-check it hasn't moved
  again since.
- Any seat-count / "~4 min" / "2 seats up in 2026" meta copy — these are
  address-dependent in the real app (computed from the actual delegation), not
  static; the canvas hardcodes an Austin, TX example for legibility. Wire from real
  data, keep the *format* ("~N min · N seats up in 2026").
- Scorecard footer brand line, print serial format, and any `t("scorecardPrint.*")`
  strings — the canvas's copy may be an earlier draft; the repo's existing i18n
  keys (already present in `ScorecardPrintView.tsx`) are likely more current since
  they've been iterated in-repo. When in doubt, keep the existing repo string and
  only change it if the canvas clearly intends different wording, not just different
  phrasing of the same idea.

If you find a copy conflict that isn't clearly "the repo is more current," flag it
back to design rather than guessing.

---

## 3 · Genuinely open — do NOT build these as final

1. **Homepage headline voice.** Three options on `HeadlineVoices` (Activation ★ /
   Accountability / Provocation) — Activation is the working recommendation but the
   user has not picked. Ask before shipping hero headline copy.
2. **"Lock these in" box, bigger/more prominent** (card `4b7e5a66`) — not designed
   yet in this canvas. Don't invent a treatment; it needs its own pass.
3. **Polis nav placement** was debated (standalone tab vs. post-decision moment) and
   is now **resolved** in favor of NOT a nav tab (§1.10) — historical docs
   (`HANDOFF-NEXT-SESSION.md` §3) show it as still-open, but the later `DECISIONS.md`
   Session 2 + this doc's repo read both confirm the tab idea was dropped. Treat the
   entry-point-after-scorecard placement as final.
4. **Polis Phase 8b data pipeline** (named-cluster compass) needs ~150 finished
   sessions to cluster meaningfully — ship the honest "not enough data yet" state
   until the threshold is met; this is a data-availability gate, not a design gap.
5. Everything in `HANDOFF-NEXT-SESSION.md` §5 (mechanical/backend items — Fed/Both/State
   tag removal, edit-issues ≤2-question loop, tablet edit-issues fix, Spanish
   translation, settings no-op, launch ops) — unrelated to visual fidelity, run in
   parallel, not blocking this handoff.

---

## 4 · Quick file map (canvas file → repo file)

| Canvas source | Repo target |
|---|---|
| `screens-orientation.jsx` → `OrientationActivated` | `App2.tsx` → `OrientationView` |
| `screens-results.jsx` → `ResultsScreen` | `DelegationWorkspace.tsx` + `RepCard.tsx` |
| `screens-scorecard.jsx` → `Scorecard` | `ScorecardPrintView.tsx` |
| `screens-candidates.jsx` → `CandidateParity`, `HeadToHead` | `RepCard.tsx` (badge), `HeadToHead.tsx` |
| `screens-home.jsx` → `HomeHero` | `HomeView` in `VoterChoiceApp.tsx` |
| `screens-whynow.jsx` → `WhyNow` | `WhyNowPage` in `VoterChoiceApp.tsx` |
| `screens-statics.jsx` → `AboutVC`/`HowItWorksVC`/`PrivacyVC`/`TipJarVC`/`LoadingVC` | `AboutPage`/`MethodologyPage`/`PrivacyPage`/`TipJarPage`/`LoadingView` in `VoterChoiceApp.tsx` |
| `screens-intake.jsx` → `IntakeAsk`/`IntakePropose`/`IntakeLocked`/`EditIssues`/`EditRescored` | `IntakeView.tsx`, `IssueConversation.tsx`, `EditIssuesModal.tsx`, `IssueDeltaBanner.tsx` |
| `screens-polis.jsx` → `PolisEntry`/`PolisStand`/`PolisReport` | `PolisClose.tsx`, `polisAdapter.ts` |
| `screens-funding.jsx` → `FieldMoneyGap`/`ScaleStates`/`MoneyGapH2H` | `MoneyGap.tsx`, `peerComparison.ts` |
| Tokens: `screens.css` `[data-palette="white"]` | `public/redesign2.css` (confirm same oklch values) |

---

## 5 · Recommended verification pass

Given the ❓ items above outnumber the confirmed ones, before calling this "matched":
1. Run the app locally, hit every stage in the flow, screenshot each at the same
   viewport as the canvas artboards (1180px content width).
2. Diff screenshot-by-screenshot against the canvas, section by section, using the
   table in §0 as the checklist.
3. Fix `OrientationView` first (§1.1) — it's the one confirmed, concrete gap and it's
   the anchor screen the whole keystone pass was named for.
4. Confirm the palette (§1.3) before anything else — if `redesign2.css` is still on
   the old teal/civic tokens, every downstream screenshot comparison will look "off"
   for a token reason, not a layout reason, and waste review time.
