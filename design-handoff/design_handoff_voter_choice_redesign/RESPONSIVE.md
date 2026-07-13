# Responsive / mobile spec — Voter Choice redesign

> The review mocks are authored at **1180px desktop**. They do **not** show
> mobile, but mobile is a first-class requirement — most voters will hit this on
> a phone, possibly *at the polls*. This file specifies how every surface
> reflows. Implement with the codebase's existing responsive conventions
> (Tailwind breakpoints / container queries). It also closes card **`ef8d602c`**
> (edit-issues unreachable on tablet/mobile).

## Breakpoints
Match the live app (`prototype-c.css` already uses ~900 / ~540):
- **Desktop** ≥ 1024px — the mocks as drawn.
- **Tablet** 640–1023px — multi-column layouts begin collapsing; side rails become top strips or drawers.
- **Mobile** < 640px — everything single-column; primary actions move to a **sticky bottom bar**; secondary chrome hides behind toggles.

## Global rules
- **Top nav (`SCNav`)**: links collapse to a menu button < 640px; keep the brand mark + the `EN ▾` language selector visible. Flag hairline stays full-bleed.
- **Type scale**: serif headlines step down ~30% (hero/mast `52–76px → 30–40px`; section `42px → 26px`). Keep mono labels at their size (they're already small).
- **Touch targets** ≥ 44px (verdict buttons, react buttons, chips, CTAs).
- **Padding**: page gutters `54–90px → 18–20px`.
- **Sticky action bars**: any decision/primary CTA (verdict, print, lock issues, replace) docks to a safe-area-aware bottom bar on mobile rather than living inline.

## Per-screen reflow

**1 · Orientation** — card goes full-width (drop max-width), the 3 steps stay stacked (already), CTA full-width; reduce top/bottom padding.

**2 · Results workspace** *(the hardest one)* — the `1fr / 312px` center+rail grid → **single column**. The right rail (delegation + progress) becomes:
- a **slim progress strip at the top** ("Seat 1 of 2 · 0 decided") that expands into a **bottom sheet / drawer** listing the seats, and
- the rep card is the full-width focus.
- The **"Print my scorecard"** CTA lives in the **sticky bottom bar** (still gated until all seats decided).
- The context strip wraps; **keep the "Edit" issues affordance visible** here (don't bury it) — this is the mobile reachability fix for `ef8d602c`.
- **Funding expansion** (`FunderPanel`): stacks; the mix bar + legend wrap; industry rows go full-width (name / bar / $ · %); the honest PAC note + source sit below the breakdown. The **PAC-definition tooltip becomes a tap-to-open popover** (no hover on touch) — dismiss on outside tap / Esc.
- **Select-a-vote drilldown**: vote cards are full-width; keep the compact two-line layout (bill + verdict on top, note + date/source below).
- **See-all-votes** (`AllVotesSheet`): opens as a **full-screen sheet** on mobile (slide up, own scroll); the filter row becomes a horizontally-scrollable sticky chip strip; a tapped vote expands its bill detail inline; Close docks to a safe-area-aware button.

**5 · Candidate head-to-head (B)** — the two columns (incumbent | challenger) **stack**, OR (preferred) become a **segmented toggle** ("Your rep" / challenger name) that swaps the top card, with the per-issue Δ ledger rendered as full-width rows (issue · rep% → ch% · Δ). The challenger switcher becomes a **horizontally-scrollable chip row**. Keep / Replace dock to the **sticky bottom bar**. The unified `CandCard` is already a single column — just full-width.

**4 · Scorecard** — the sheet is a single column already; it scales to viewport width with side padding. The `repeat(4,1fr)` logistics meta grid → **2-col** (tablet) → **1-col** (mobile). Decisions stack. Print uses `@page` / print stylesheet, not the mobile layout. Keep grayscale-safe encoding.

**6 · Homepage hero** — `1.06fr / 0.94fr` → **single column**: headline, lede, then the **address card**, then the product-preview (consider hiding the stacked preview < 480px to keep it light). Headline `40→28`. Address row: input full-width with the **"Pull my representatives" button full-width beneath it** (not inline). Trust row wraps.

**7 · Why Now (editorial)** — already single column. Mast `76→34`. The `1.6fr/1fr` problem+stats row → stack (stats below copy). The 435/34/1 ballot grid (3-col) → **1-col** stacked. The 3-step "how it works" → 1-col. Consensus/`pr-row` `1fr/300px` → stack (statement above its stat).

**8 · Static pages + footer** — prose is single column already (just reduce `max-width`/padding). Mast scales. **Footer** stacks: brand block above, link row wraps below; keep "© Grey Bird LLC".

**9 · Defining your issues (intake + edit)** — conversation is single column already. Composer + quick-reply chips: chips wrap, composer docks to bottom. **The edit-issues MODAL becomes a full-screen sheet on mobile** (slide up, full height, its own scroll, sticky "Apply & re-score" footer) — never a centered dialog that traps content. This is the core of `ef8d602c`: the edit entry and the modal must be fully reachable and usable on phones/tablets.

**10 · Polis**
- *Entry invite*: the `280px / 1fr` map+copy grid → stack (map on top, smaller, or hidden < 480px); buttons stack.
- *Contribute*: statement cards full-width; the 3 react buttons (`Agree / Disagree / Pass`) stay in a row if they fit, else stack to full-width buttons ≥44px. Still blind — no inline results.
- *Report / opinion map*: the map keeps its aspect but shrinks; on very small screens render fewer dots or a simplified static cluster image (the read is "groups separate, statements bridge", which survives simplification). Consensus rows (`1fr/300px`) stack: statement, then big %, then convergence bar full-width, then the D/R/I chips. The `divided` state's split example stacks the same way.

## Notes
- Prefer **container queries** for the workspace + head-to-head if the codebase supports them (these depend on available column width, not just viewport).
- Respect `prefers-reduced-motion`; entrance animations base on the end-state so print/PDF/reduced-motion show content.
- Re-test the **full flow on a 390px viewport** (iPhone-class) end to end: home → intake → orientation → review → replace/compare → scorecard → (optional) Polis. The replace head-to-head and the edit-issues sheet are the two highest-risk spots.
