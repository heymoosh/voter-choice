# Proxy gaps to take back to Claude Design — brief + backlog tracking

**Date:** 2026-07-07 · **Why this exists:** the Phase 4 parity-gallery tool (`scripts/design/parity-gallery.ts`, PR #234) found 7 artboards where the repo can only show a "documented proxy" instead of the canvas's actual intended state, Muxin independently flagged a conflict while reviewing PR #233 (the candidates overview), and the copy-diff report (PR #233) surfaced one more structural gap (`PolisStand`) while recording her rulings. **9 sections below** — 7 need a real product-design answer, 2 (Color, Scale states) turned out to need no action at all (design-tool artifacts, not app gaps). In every case, the gap is a **missing or conflicting product feature**, not a tooling limitation — the parity-gallery tool captured a real, reachable app state correctly; it just isn't the state the canvas designed. Each item here has: what's missing, why (confirmed by reading the actual component source, not assumed), and an open product question worth taking back to the Claude Design canvas session. **None of these are auto-buildable** — each needs a product-design call first, which is why each of the 7 actionable ones also gets its own backlog card (see the bottom of this doc) rather than being silently folded into implementation work.

Nothing here is lost or silently dropped — that was the point of building the parity-gallery tool with a `note` field on every scenario in the first place.

---

## 1 · Color (03-color-bold-flag)

**Gap:** the canvas's "Color" artboard is a trimmed palette-demo card — a standalone swatch/token showcase with no equivalent screen in the app. There's nothing to build; the proxy (screenshotting the Results workspace, where the Bold Flag tokens are actually applied live) is the correct substitute.

**Open question for Claude Design:** none — this isn't a gap that needs resolving, it's a documentation-only mismatch (a design-tool artifact, not a missing feature). No action needed beyond noting it.

## 2 · Intake locked state (09c-intake-locked)

**Gap:** the canvas has a distinct **pre-lock confirmation state** — a green "your issues are set" banner with drag-to-rerank still available before the user commits. The repo's intake flow doesn't have this discrete state; it goes straight from the conversational issue-refinement loop to the next screen. The proxy captures the same running-issues UI one turn before Lock, which isn't the same screen.

**Open question for Claude Design:** should there be an explicit "confirm your issues" interstitial before we lock them in and move on, matching the canvas's `IntakeLocked` state? Or was that state a design-in-progress idea that's since been superseded by the repo's continuous conversational flow (in which case, the canvas's copy for it — see COPY-DIFF-REPORT.md §9 — should probably be dropped rather than ported)?

## 3 · Polis entry screen (10a-polis-entry)

**Gap:** the canvas's `PolisEntry` is a dedicated invite/entry screen with its own preview scatter-plot teaser. The repo removed the equivalent entry point — confirmed via `e2e/redesign-core.spec.ts`'s own comment noting "the see where you stand teaser was removed [P1]." The proxy shows the completed workspace's `.all-done` "where you stand" link instead, which is a real but much smaller invite (one line, no preview).

**Open question for Claude Design:** was removing the dedicated entry/preview screen (in favor of a one-line link) a deliberate simplification that should stay, or should the fuller `PolisEntry` invite experience (with the preview scatter teaser) come back? This directly affects how much weight the Polis invite gets in the flow.

## 4 · Polis divided/split report (10d-polis-report-divided)

**Gap:** the canvas's `PolisReport` has a `divided` state — a version of the report that honestly shows statements that *didn't* reach consensus, alongside the ones that did. `PolisClose.tsx` has no such branch: it only ever surfaces statements that already cleared the agreement bar; there's no "where it split" section. The proxy substitutes a bridges mock with one low-agreement statement inside the UI that actually exists, which isn't the same feature.

**Open question for Claude Design:** should the live Polis report add a "where it split" section (statements that *didn't* reach consensus), matching the canvas's more transparent framing? This is tied to item 8 below (Polis's bridging-threshold methodology) — worth resolving together.

## 5 · Field money-gap scale (11a-fieldmoneygap)

**Gap:** the canvas's whole-field view compares 3+ candidates on one scale at once. The repo's `<MoneyGapScale>` (in `RepCard.tsx`) is only ever called with a single subject/peer pair — there's no `field` prop, no code path that renders more than two points on the scale. The proxy uses a single-subject scale populated via a mock median value.

**Open question for Claude Design:** is a whole-field (3+) money comparison scale something we actually want to build, or was that a canvas exploration that the single-subject comparison (which is what shipped) already supersedes? If the field view is wanted, it's a real new component, not a tweak.

## 6 · Scale states style guide (11b-scalestates)

**Gap:** the canvas's artboard is a style-guide page enumerating all 4 possible states of the money-gap scale side by side (for design reference). The real app only ever renders whichever single state the actual data produces — there's no reason to build a "show all 4 states at once" screen in production. The proxy shows the one state our mock data happens to produce.

**Open question for Claude Design:** none needed — this is a design-reference artifact, not a missing product feature. No action required.

## 7 · Money-gap head-to-head (11c-moneygaph2h)

**Gap:** `MoneyGapH2H` (exported from `MoneyGap.tsx`) is not used anywhere outside its own file and its own test — confirmed by `grep`. The real head-to-head/duel screen (`HeadToHead.tsx`) instead shows a simpler PAC-percentage footnote for the funding comparison. The proxy substitutes the regular head-to-head screenshot so the gap is visible instead of silently missing.

**Open question for Claude Design:** was `MoneyGapH2H` meant to be wired into the head-to-head duel screen as the funding-comparison treatment there, and the current PAC-percentage footnote is a placeholder that was never upgraded? Or is the simpler footnote the actual intended design for that screen, and `MoneyGapH2H` is dead code that should be removed?

## 8 · Candidates overview — 3-card summary vs. deep single-seat view (flagged by Muxin, 2026-07-07 — NOT one of the original 7 parity-gallery proxies)

**Gap:** the canvas's `CandidateParity` establishes a **3-card overview screen** — every seat shown at once as a card with its own alignment score, so a voter can scan all their representatives before drilling into any one. The repo has no equivalent screen: `DelegationWorkspace.tsx` renders exactly one seat at a time (`activeSeatId`/`activeSeat`), with a compact seat-strip/rail alongside it (not full alignment-score cards) — confirmed by reading `DelegationWorkspace.tsx` directly. There is no "see all your reps as scored cards, then click into one" flow anywhere in the app today.

**Muxin's direction (recorded verbatim, 2026-07-07):** "I'd want to use the canvas version [the 3-card overview], but then when someone clicks into one of the candidates it ought to open up a deeper review into that person. I'm not quite sure if we've built that logic and flow out and it could be a bigger UI and UX change than I'm thinking off the bat."

**Confirmed by reading the code:** this flow does **not** exist yet. Today the app never shows all three seats as scored summary cards side by side — it goes straight into the single-seat deep view. Building the overview-then-drill-down pattern Muxin describes means: (a) a new overview screen rendering all seats as `CandidateParity`-style cards with alignment scores, (b) a click/tap interaction on each card that opens the existing deep single-seat `RepCard`/`DelegationWorkspace` view for that specific seat, and (c) deciding how this new overview screen relates to the existing seat-strip rail (does the rail become unnecessary, does it stay as in-context navigation once you're inside a seat, or something else). This is a real structural addition, likely on the larger end of the Keystone work — Muxin already flagged this could be bigger than expected.

**Open question for Claude Design:** confirm the intended interaction — does clicking a card in the overview open the *existing* deep-dive view unchanged, or does the deep-dive view itself need to change to accommodate being entered from an overview (e.g., a "back to overview" affordance, replacing today's seat-strip rail)? This shapes how big the build actually is.

## 9 · Polis blind-voting step — PolisStand (surfaced by the copy-diff report, PR #233 §10)

**Gap:** the canvas's `PolisStand` — the post-decision step where a voter reacts blind (agree/disagree/pass, no running score shown) to a handful of statements before seeing the aggregate report — **does not exist anywhere in the repo**. Confirmed by reading `PolisClose.tsx` in full and grepping the codebase for `Agree`/`Disagree`/`Pass`/`PolisStand`-style markup: nothing matches. This is also why the Phase 4 parity-gallery tool marks `10b-polis-contribute` as its one genuinely "not automatable" row — there's no test hook missing, the feature itself was never built. Today's Polis experience only shows the passive aggregate report; there's no step where a voter actually contributes their own reaction to specific statements.

**Also tied to this:** the copy-diff report separately flagged that the canvas's bridging/consensus threshold (statements shown as "common ground" only when 60%+ of **each** party group — D, R, and I — agree) is methodologically different from the repo's current 80%+-of-the-overall-population bar with no party breakdown — which is itself a deliberate, already-shipped party-free product decision (#116). Building `PolisStand` doesn't require resolving the threshold question, but both sit in the same feature area and are worth discussing together.

**Open question for Claude Design:** is `PolisStand` still an intended feature to build — a real blind-voting contribution step before the aggregate report — or has the product direction settled on the aggregate-only experience the repo already ships? If it's still wanted, any updates to the interaction or copy since this canvas session (e.g., how many statements, how "blind" needs to work technically)?

---

## Ready-to-paste prompt for the Claude Design canvas session

If it's easier to raise all of these in one sitting with the canvas session rather than one at a time, here's a bundled prompt:

```text
I'm reviewing where our shipped app diverges from this design session's intent, beyond
plain copy differences. Eight specific things need your read on whether they're settled
design decisions we should build, or exploratory ideas that got superseded:

1. Intake: was IntakeLocked (the pre-lock "your issues are set" confirmation state,
   distinct from the conversational refinement loop) meant to ship as its own screen,
   or was it exploratory?
2. Polis: was PolisEntry (the dedicated invite screen with a preview scatter teaser)
   meant to replace what's now just a one-line inline link, or was the simpler link
   already the intended simplification?
3. Polis: should the report add a "where it split" section showing statements that
   didn't reach consensus, alongside the ones that did?
4. Money-gap: is a whole-field (3+ candidate) comparison scale something you intended
   to ship, or does the single-subject-vs-peer comparison already supersede it?
5. Money-gap: was MoneyGapH2H meant to be the funding-comparison treatment on the
   head-to-head/duel screen specifically, replacing a simpler PAC-percentage footnote?
6. Candidates: confirm the 3-card overview (CandidateParity, all seats with alignment
   scores) is meant to be the entry point, with a click into any card opening the
   existing deep single-seat record view — not a new deep-dive design, just this
   navigation pattern layered on what already exists. Anything about the deep-dive
   view itself that should change once it's entered from an overview instead of being
   the very first thing a voter sees (e.g., a way back to the overview)?
7. Polis bridging: your threshold was 60%+ agreement within EACH of three party groups
   (D/R/I) separately; the shipped app uses 80%+ of the population overall with no
   party breakdown (a deliberate party-free product decision made independently).
   Given the party-free direction, should the bridging bar be re-expressed as a
   population-level threshold, or does re-adding party-group breakdown make sense here?
8. Polis PolisStand (the blind agree/disagree/pass voting step): this doesn't exist
   in the app at all today. Is this still an intended feature to build, and if so,
   any updates to the interaction/copy since this canvas session?
```

## Backlog cards filed for this work

Each actionable item above is filed as its own Backlog card, `DEPENDS ON` the Keystone EPIC so none get picked up before Muxin's Claude Design follow-up resolves the open question:

- §2 Intake locked state — card `c1a43c39-2b51-4bd3-af6c-3e569f6f0695`
- §3 Polis entry screen — card `4936d17b-c6db-47f9-8bce-0beca648cbef`
- §4 Polis "where it split" + bridging threshold — card `e2455f56-6f5c-4aa4-89f5-34f84e5848ff`
- §5 Field money-gap scale — card `be126dc5-23ae-40d2-86a8-5d49a264fc46`
- §7 Money-gap head-to-head (MoneyGapH2H) — card `0e87d755-6f66-4ca9-90da-28990e2f919e`
- §8 Candidates overview (3-card summary + click-through) — card `5192287a-c190-47f0-8d7b-00b013fc76f8`
- §9 Polis blind-voting step (PolisStand) — card `fb77d0bb-74ee-43d6-9b72-cc14c90c8a1b`

§1 (Color) and §6 (Scale states) need no card — both are design-tool artifacts, not app gaps.
