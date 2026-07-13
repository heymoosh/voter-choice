# Handoff: Voter Choice 2026 — Keystone Redesign

> Prepared for a developer using Claude Code. A self-contained spec for taking
> the design from review to production. Read this top-to-bottom, then open
> `DECISIONS.md` (decision → repo-file wiring) and the `screens-*.jsx` files
> (the exact design code) as you implement each surface.

---

## 1. Overview

**Voter Choice 2026** — *"Assess your representatives with AI."* The product
reframed from "fill in your ballot" to **"hold the people who already represent
you to their record."** A voter enters their address, tells the app what issues
they care about, reviews each member of Congress **blind** (record first, name
hidden) against those issues, decides **keep or replace**, and prints a
scorecard for the polls.

This redesign is one cohesive pass that resolved the backlog's anchor card
(`e688d5a6` — *results-flow clarity, visual hierarchy & color system*) plus ~18
cards that depended on it. It spans the entire product surface: homepage, an
editorial "Why Now" page, guided orientation, the review workspace, candidate /
"replace" flow, the printable scorecard, all static pages + footer, the
"defining your issues" intake/edit flow, and Polis (the opinion map).

## 2. About the design files

**These files are design references, authored in HTML + inline-JSX (Babel/React
in the browser). They are NOT production code to copy.** They render a Figma-style
review canvas (`Voter Choice - Keystone Design Session.html`) using a starter
canvas component. Your job is to **recreate these designs in the real codebase**
— a **Next.js / React + TypeScript** app (`src/app/…`, `src/prototype/redesign/…`)
— using its existing components, patterns, and Tailwind/CSS conventions.

The design code was built against the **`representatives-only` delta**
(`redesign2-*.jsx` files), which themselves mirror the repo's
`src/prototype/redesign/*` modules. So each design screen maps to a known repo
file — see `DECISIONS.md` for the exact wiring per decision, and the
"Screens" table below for the short version.

## 3. Fidelity

**High-fidelity.** Final colors (oklch), typography, spacing, copy, and
interaction intent are all specified. Recreate pixel-faithfully using the
codebase's existing primitives. Where the design reuses an existing shipped
component (noted below), prefer evolving that component over rebuilding.

## 4. Design tokens — "Bold Flag" (the chosen system)

The redesign standardizes on **Bold Flag**: a white ground with a navy-royal
primary and flag-red for "replace"/urgency, restrained for a credible 250th-
anniversary civic tone. Set `[data-palette="white"]` as the **default** token
set (it was one of two compared; Bold Flag won — card `ffb7a832`).

Authoritative values live in `screens.css`. Express as your app's tokens
(Tailwind theme / CSS vars in `prototype.css :root`):

| Token | oklch | Role |
|---|---|---|
| `--paper` | `oklch(1 0 0)` | page background (white — prints clean) |
| `--paper-2` | `oklch(0.985 0.003 258)` | card surface |
| `--ink` | `oklch(0.20 0.035 260)` | primary text |
| `--ink-2` | `oklch(0.37 0.032 260)` | secondary text |
| `--ink-3` | `oklch(0.54 0.026 260)` | muted / mono captions |
| `--brand` | `oklch(0.40 0.155 262)` | navy-royal — primary action, "keep"-adjacent |
| `--brand-2` | `oklch(0.31 0.145 262)` | hover/darker brand |
| `--brand-soft` | `oklch(0.94 0.040 262)` | brand tint backgrounds |
| `--keep` | `oklch(0.44 0.115 159)` | "worth keeping" green |
| `--keep-soft` | `oklch(0.93 0.045 159)` | keep tint |
| `--replace` | `oklch(0.53 0.205 27)` | "time to replace" flag red |
| `--replace-soft` | `oklch(0.94 0.050 27)` | replace tint |
| `--gold` | `oklch(0.72 0.125 76)` | accent (PAC/large-donor bars, independents) |
| `--tag-bg` | `oklch(0.95 0.006 260)` | chip/tag background |
| `--rule` / `--rule-2` | `oklch(0.88 0.006 260)` / `oklch(0.93 0.005 260)` | borders / hairlines |

**Type:** `IBM Plex Sans` (UI/sans), `Newsreader` (editorial serif — headlines,
statements, sheet headings), `IBM Plex Mono` (labels, eyebrows, meta). These
match the live app's families (`ballot-ingestion/prototype.css`).

**Motifs:** a 4px **flag hairline** (`.flagbar`: navy / white / red) at the top
of most surfaces; a `★` kicker in mono; grayscale-safe encoding on the scorecard
(shape + icon + text, never color alone).

## 5. Screens — what to build, where it wires, what it closes

Each design screen lives in a `screens-*.jsx` file (exact markup + the `*.css`
for tokens/layout). "Wire into" is the repo file to evolve (full detail in
`DECISIONS.md`).

| # | Screen (design file) | Wire into (repo) | Closes (backlog) |
|---|---|---|---|
| 1 | **Guided orientation** — `screens-orientation.jsx` `OrientationActivated` (the picked "A · Guided Tour", on Bold Flag) | new `"orient"` stage in `App2.tsx` between `analyzing` and `workspace` | `0b9d40c9` |
| 2 | **Results = one panel + rail-as-progress** — `screens-results.jsx` `ResultsScreen` | `DelegationWorkspace.tsx` (drop left issues panel + separate progress bar; rail groups = progress) | `335829af`, `9143a622` |
| — | **Non-2026 reps greyed + excluded** — in results rail + scorecard | `redesign2-card`/`-workspace` rail; `visibleSeats()` + verdict filter in `-print` | `97eda1e0` |
| — | **Print scorecard discoverable** — rail foot CTA, unlocks after last seat | `ScorecardPane`/rail foot | `1f77c3eb` |
| — | **Funding & record detail (results)** — `screens-results.jsx`: `FunderPanel` (expanded money trail), `VoteDrilldown`/`VoteCard` (select-a-vote), `AllVotesSheet` (full record + filters), bill-detail expansion, PAC-definition **tooltip** | **evolve** (not reuse verbatim) `FunderBars` + `AllVotesPanel` + `AlignmentDrilldown` + the RepCard money-trail disclosure | Muxin review rounds (see DECISIONS §Session 4) |
| 3 | **Color system** — `screens.css` palettes; Bold Flag chosen | `prototype.css :root` → make `[data-palette="white"]` default | `ffb7a832` |
| 4 | **Scorecard, print-ready + grayscale-safe** — `screens-scorecard.jsx` `Scorecard` | `ScorecardPrintView` / `PrintBallot.tsx` (`fracFor()`→%, decisions lead) | `78f5ce94` |
| 5 | **Design Candidates / "replace"** — `screens-candidates.jsx`: unified `CandCard` + **direction B `HeadToHead`** (the picked one) | `redesign2-card.jsx`: route `"replace"` verdict to a full-screen head-to-head; unify RepCard + ChallengersStrip into one `CandCard`; provenance badge from `repBasisOf()`; reuse `repIssuePct`/`repOverallPct` | `6a1fb1fb` (P0), `05b995c8`, `31145699` |
| 6 | **Homepage hero** — `screens-home.jsx` `HomeHero` | `HomeView` in `redesign2-shared.jsx` | `b4cc1c9e`, `1850349c` |
| 7 | **"Why Now?" page** — `screens-whynow.jsx` `WhyNow` | new `WhyNowPage` route off the "Why now" nav link | `9031f1ce` |
| 8 | **Static pages + footer** — `screens-statics.jsx` `StaticPageVC` shell (About / How it works / Privacy / Tip jar), `LoadingVC`, `VCFooter` | `AboutPage`/`MethodologyPage`/`PrivacyPage`/`TipJarPage` (shared `StaticPage`); `AppFooter`; `LoadingView` | `b1a5f64a` (rename Methodology→How it works), `c9891a1f` (footer reorg) |
| 9 | **Defining your issues (intake + edit)** — `screens-intake.jsx` | `IssueConversation.tsx`, `IntakeView`, `EditIssuesModal.tsx` | design side of `6cdedfa6`, `ef8d602c`, `9143a622`, `e2d2a7a0` |
| 10 | **Polis — opinion map + honest report** — `screens-polis.jsx`: `PolisEntry` (⓪ invite), `PolisStand` (① blind contribute), `PolisReport` (② report, incl. `divided` state) | new post-decision moment + a report section on the Why-Now page (NOT a nav tab) | `bc774728` |

## 6. Cross-cutting decisions Code can't infer (read before building)

1. **Bold Flag is the default palette** across every surface (not just new ones).
   White ground, navy primary, flag red for replace/urgency.
2. **Blind-first review.** Incumbents and challengers render anonymized
   ("This seat's incumbent") with a Reveal control — judge the record before the
   name. Carry through results, candidates, and Polis.
3. **"Replace" opens a dedicated head-to-head** (design **B**), not the inline
   ranked list. Picking a challenger in the compare = recording the successor;
   it rides to the scorecard + printout. The earlier inline `ReplaceFlow` and a
   split shortlist were explored (artboards A/C in §5) but **B is the pick.**
4. **One candidate card for all seat types.** House, Senate, President share a
   single card; a **provenance badge** carries the only real difference —
   `◆ Roll-call record` (officeholders, scored on votes) vs `◇ Researched · cited`
   (executives, scored on web-researched positions). **Never blend** the two.
5. **Per-issue jurisdiction tags were removed** (`e2d2a7a0`). Jurisdiction
   context stays at the **seat tier** ("Your U.S. House seat · FEDERAL"), not on
   each issue chip.
6. **Edit-issues disambiguation is a UI affordance, not a prompt hack.** When an
   issue is ambiguous ("the economy", "immigration"), the design surfaces 2–4
   **optional quick replies** under the AI's question — but the **conversation +
   free-text composer stay primary** (the voter must be able to talk, not just
   pick). The actual model behavior (how many clarifying Qs) lives in
   `lib/prompts/theme-extraction` + `theme-refinement` (server-side) — to satisfy
   `6cdedfa6`'s "≤2 clarifying Qs then lock", the prompt should emit
   `disambiguationOptions` for the chips and cap its own questioning. Editing
   must also be reachable on tablet/mobile (`ef8d602c`).
7. **Polis is not a nav tab.** It's two moments: an **optional invite AFTER the
   scorecard is delivered** (never gate the printout) → a **blind contribute**
   step (no running tally / per-statement results while voting — avoids
   bandwagon + polarization, exactly like real pol.is) → a **report** shown on
   the Why-Now page and as a shareable artifact.
8. **The Polis report is neutral + honest.** It leads with a pol.is-style
   **opinion map** (PCA-style clustering: voters who answer alike sit together),
   then shows **common ground only where it cleared 60%+ in *every* group**, and
   is explicit when it didn't (`PolisReport divided` state). It never names who
   voted which way and never forces a "we agree" narrative. *Depolarizing = seeing
   each other clearly, not pretending we agree.*
9. **Nav language control is a selector (`EN ▾`), not an EN·ES toggle** — the menu
   should scale to any major US language (relates to `d8059e2e`, `2b325135`).
10. **Footer trimmed** to brand + "© 2026 Grey Bird LLC", Privacy moved right
    after About, Tip jar/Support de-emphasized (`c9891a1f`).
11. **Mobile is a first-class requirement, not shown in the mocks.** The mocks
    are 1180px desktop; **`RESPONSIVE.md` specifies how every surface reflows**
    (breakpoints, per-screen stacking, sticky action bars, the edit-issues
    full-screen sheet). Most voters are on phones, possibly at the polls — build
    responsive from the start. This also closes `ef8d602c`.
12. **Funding & voting record are progressive disclosure — the detail is now
    fully specified.** Nothing shows by default. "Funders & influence ▾" opens
    the full money trail; tapping an issue opens the votes behind its score;
    "See all votes" opens the full record; tapping a vote opens the bill detail.
    These **evolve** the shipped `FunderBars` / `AlignmentDrilldown` /
    `AllVotesPanel` — they are not reused verbatim. See DECISIONS §Session 4 +
    §8.1 below for the new fields, states, and rules.
13. **PAC honesty.** **Never invent named issue-PACs.** Name a PAC only when it's
    attributable to a public agenda (`donorCoalition[].isIssuePAC`); when none
    are, show the honest "$X (Y%) from PACs we can't yet attribute" note and
    point to the industry breakdown. The PAC **definition is a tooltip** on the
    "PACs" legend term, not body copy. The funding comparison is **chamber-median**
    ("≈3× the median House campaign"), not challenger-based — you can't know a
    challenger before one is selected to compare.

## 7. Backlog map

### ✅ Resolved by this design pass (implement from these mocks)
`e688d5a6` (anchor) · `0b9d40c9` orientation · `335829af` one-panel results ·
`9143a622` jurisdiction context · `1f77c3eb` discoverable print · `97eda1e0`
non-2026 reps · `78f5ce94` scorecard overhaul · `ffb7a832` color system ·
`6a1fb1fb` design candidates (P0) · `05b995c8` House/Senate card unify ·
`31145699` President/VP parity · `bc774728` Polis · `b4cc1c9e` homepage ·
`1850349c` address box · `4b7e5a66` "Lock these in" prominence · `9031f1ce`
Why Now · `b1a5f64a` nav rename + top-bar · `c9891a1f` footer · `e2d2a7a0`
remove Fed/Both/State tags (design drops them).

### 🔧 Eng / backend — NOT design-coupled (run in parallel; design gives the affordance + context)
- `6cdedfa6` (P0) edit-issues conversation loop ≤2 Qs then lock — **prompt-side**
  (design supplies the quick-reply chips contract).
- `ef8d602c` (P0) edit-issues unreachable on tablet/mobile — make the design's
  edit entry reachable on small screens.
- `e2d2a7a0` (P0) remove the Fed/Both/State issue tags in code (design already
  drops them visually).
- `d8059e2e` (P1) Spanish body translation (only top bar today); `2b325135`
  major-language translations (blocks on UX finalize `e18e65fd`).
- `403ed2a6` (P1) Settings button is a no-op.
- Polis data plumbing: the map/report need real aggregated, de-identified
  vote data + the 60%/group consensus threshold logic; reset live Polis count
  `1f5e2506`; lower `CHAT_DAILY_SESSION_LIMIT` 100→10 `28bf87ec`.
- Launch ops: security review `850b1220`.
- Alignment-quality umbrella `f474c4b8`; voter-issue-events go-live `39a6b6e3`;
  CRS summary plumbing `a06450b8` / `0f890cb0`.

## 8. Interactions, state, behavior (highlights)

- **Stage router** (`App2`): `home → loading → coldopen (intake) → analyzing →
  workspace → [post-decision Polis] → print`. Add `orient` before workspace.
- **Blind mode** is global app state; Reveal/Hide per seat.
- **Verdicts** (`keep`/`replace`) + **replacementId** per seat persist to
  `localStorage` (browser-only, per the privacy contract — nothing server-side
  except aggregated Polis tallies).
- **Edit & re-score**: applying a new issue list re-runs deterministic per-seat
  scoring; seats whose alignment moves >5 pts (or gain/lose a scoreable record)
  get a **Revisit** flag — verdicts are never auto-changed.
- **Scorecard unlocks** the print CTA only when all up-for-election seats are
  decided ("Decide both seats to print · 0 of 2").
- **Animations**: entrance reveals should base on the visible end-state and animate
  *from* hidden, gated on reduced-motion, so print/PDF show content.

## 8.1 Results detail — new fields, rules & states

The funding-expansion, vote-drilldown, see-all-votes, and bill-detail surfaces
(`screens-results.jsx`) were added in the Muxin review rounds and **evolve**
shipped components. They need data the backend doesn't fully have yet:

| Field | On | Meaning | Source / how |
|---|---|---|---|
| `vote.what` | each vote | plain-language summary of the bill | CRS summary (CRS plumbing `a06450b8` / `0f890cb0`); fallback = bill title |
| `vote.tally` | each vote | roll-call result, e.g. "Passed House 232–193" | Congress.gov / GovTrack roll-call |
| `vote.status` | each vote | e.g. "Passed House · stalled in Senate" | Congress.gov bill status |
| `vote.alignedWithUser` | each contributing vote | did it match the user's position | derivable from `contributingVotes[].voteCast` (with/against) |
| `funding.chamberMedian` | seat | median raised, this chamber, this cycle | **new** FEC aggregate (per chamber/cycle) |
| `funding.pacTotal` / `pacPct` | candidate | $ + % from PACs | `totalRaised × fundingMix.pac` (computable) |
| `donorCoalition[].isIssuePAC` | donor slice | attributable issue-PAC? | already in live model — gates named-PAC vs honest note |

**States & rules to honor**
- **Named PAC vs honest note** — render named PACs only for `isIssuePAC` slices; if none, show the honest note + industry breakdown. Never fabricate.
- **PAC tooltip** — hover/focus on pointer; **tap-to-open popover on touch**, dismiss on outside tap / Esc.
- **Donor data unavailable** — reuse `FunderBars`' existing `donorUnavailable` honest path (the mocks only show the happy path).
- **See-all filters** — default "All"; filters With you / Against you / per-issue; grouped by issue; empty filter → honest "no votes match"; sort newest-first within a group *(confirm)*.
- **Bill-detail accordion** — every row expandable; **single-open** *(confirm single vs multi with product)*.
- **Vote drilldown** — one issue open at a time; the full issue list stays visible above the detail panel.

**Open (confirm with product/eng):** source + backfill coverage for `vote.what`/`tally`/`status`; availability of the chamber-median aggregate; accordion single- vs multi-open; final PAC-attribution threshold + note copy.

## 9. Files in this bundle

- `Voter Choice - Keystone Design Session.html` — the review canvas (open to see everything)
- `DECISIONS.md` — **decision → repo-file wiring map** (read alongside this)
- `RESPONSIVE.md` — **mobile / responsive spec** (the mocks are desktop-only; this says how every surface reflows + closes `ef8d602c`)
- `screenshots/` — rendered PNGs of each key screen, including the refreshed results-detail set (`02-results`, `02b-results-funding`, `02c-results-select-vote`, `02d-results-all-votes`)
- `HANDOFF-NEXT-SESSION.md` — running session log / status
- `screens-orientation.jsx`, `screens-results.jsx`, `screens-scorecard.jsx`,
  `screens-candidates.jsx`, `screens-home.jsx`, `screens-whynow.jsx`,
  `screens-statics.jsx`, `screens-intake.jsx`, `screens-polis.jsx` — the design code
- `screens.css`, `candidates.css`, `home.css`, `whynow.css`, `statics.css`,
  `intake.css`, `polis.css` — tokens + layout
- `canvas-app.jsx`, `design-canvas.jsx` — the review harness (NOT for production)

## 10. Explicitly out of scope for this design

The mocks use **illustrative/fictional** data (names, %s, dollar figures, voter
counts, Polis tallies). Wire real data sources (GovTrack/Congress.gov, FEC/
OpenSecrets, state ethics commissions, Civic Information API, Polis aggregates).
Names are fictional and must never be attached to real people.
