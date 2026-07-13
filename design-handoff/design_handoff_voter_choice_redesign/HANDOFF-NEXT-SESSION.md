# Voter Choice — design session handoff · CONTINUE HERE

> **You are a new session picking up an in-progress redesign.** This file is the
> spine. Read it, then `design-session/DECISIONS.md`, then open
> `design-session/Voter Choice - Keystone Design Session.html` (the canvas).
> We are NOT starting over — one keystone pass is built and reviewed. Your job
> is the next slices.

---

## 0. Orientation (what / where)

- **Product:** Voter Choice 2026 — *"Assess your representatives with AI"* (live:
  voter-choice.vercel.app). Reframed from "fill in your ballot" to **"hold the
  people who already represent you to their record."**
- **Design surface = the `representatives-only` delta** (current direction). The
  design work targets it; the repo files it maps to are in
  `representatives-only/HANDOFF.md` + `uploads/SCOPE.md`. Everything is
  **additive** to that delta — do not touch the "do-not-modify" boundary list.
- **The anchor that unblocked everything:** backlog card `e688d5a6` — *"Claude
  Design session — results-flow clarity, visual hierarchy & color system."*
  ~12 cards `DEPENDS ON` it. This session resolved it.
- **Design tokens** live in `design-session/screens.css` (`[data-palette="warm"]`
  = Civic Activated, `[data-palette="white"]` = Bold Flag, plus the `.act`
  activated-orientation block). Real app tokens: `ballot-ingestion/prototype.css`
  `:root` (IBM Plex Sans / Newsreader / IBM Plex Mono).

---

## 1. The brief — from the kickoff questionnaire ("Claude has some questions")

Carry these answers forward. Status added.

| # | Question | User's answer | Status |
|---|---|---|---|
| 1 | Surface to design on | "See the live app for what's changed" → use the `representatives-only` delta | ✅ locked |
| 2 | Color & activation | "Show me a couple of directions side by side" | ✅ → **Bold Flag** (red-white-blue, white ground), 250th-anniversary energy |
| 3 | How many results-flow directions | "Three" | ✅ built A/B/C → **A (Guided Tour) picked**, rendered activated |
| 4 | What this pass should nail | "Guided orientation screen before rep review" | ✅ built (the anchor fix) |
| 5 | Fidelity | "Key screens at hi-fi (orientation, results, scorecard)" | ✅ those three done — **other screens not yet built** (see §4) |
| 6 | Recent prod changes | "Check the web app" | ✅ confirmed new positioning; designed around it |
| 7 | Non-2026 reps | "Grey, de-emphasized, excluded from scorecard" | ✅ built |

**The operating principle (keep using it):** split work by *coupling*, not order.
Cohesion-critical/design-coupled cards move together as one pass; mechanical &
backend cards run in **parallel** and can't affect look/feel. This is what keeps
it feeling cohesive without doing literally everything at once.

---

## 2. DONE this session (decided + built to hi-fi)

All on the canvas, all mapped to repo files in `DECISIONS.md`.

- ✅ **Guided orientation screen** before rep review *(card `0b9d40c9`)* — picked
  **A · Guided Tour**, rendered **activated** (bright blue stage, white contrast,
  gold/red accents). `OrientationActivated` in `screens-orientation.jsx`.
- ✅ **One-panel results** + rail-as-progress, no left issues panel, no 2nd bar
  *(`335829af`, `9143a622`)*.
- ✅ **Print scorecard discoverable** — unlocks after last seat *(`1f77c3eb`)*.
- ✅ **Non-2026 greyed + excluded** *(`97eda1e0`)*.
- ✅ **Scorecard overhaul** — white, decisions-lead, % matched, **grayscale-safe**
  (shape + icon + text, not color alone) *(`78f5ce94`)*.
- ✅ **Color system** → Bold Flag leaning *(`ffb7a832`)*.
- ✅ **Nav "Methodology" → "How it works"** *(part of `b1a5f64a`)*.
- ✅ **Funding = progressive disclosure** (glance + "Funders & influence ▾",
  full FunderBars on expand — nothing dropped).

### Round 3 review (Muxin) — results detail, now in the package
- ✅ **Funding expansion fully specified** — `FunderPanel`: mix + legend +
  industry breakdown; **PAC definition is a tooltip** on the legend term; the
  honest "we can't yet attribute these PACs" note + source sit at the foot;
  comparison switched challenger-based → **chamber-median**. No invented PACs.
- ✅ **"Select a vote" drilldown** (`VoteDrilldown`/compact `VoteCard`) + **"See
  all votes" sheet** (`AllVotesSheet`, filters) + **bill-detail expansion** (what
  the bill is, tally, status). Canvas Section 2 gained `res-funding`, `res-votes`,
  `res-allvotes`.
- ⚠️ These **evolve** `FunderBars` / `AlignmentDrilldown` / `AllVotesPanel` — not
  "reused verbatim". New fields + states + open Qs: **README §8.1** and
  **DECISIONS §Session 4**; mobile reflow in **RESPONSIVE.md §2**.

### Session 2 add-ons (built)
- ✅ **Design Candidates / "Time to replace" flow** *(card `6a1fb1fb`, P0)* —
  canvas **Section 5**. Unified candidate card (House/Senate/President share one
  card; a **provenance badge** `◆ Roll-call` vs `◇ Researched · cited` carries
  the difference — closes `05b995c8` + `31145699`). Three directions for what
  "replace" opens: **A** inline ranked chooser (evolves `redesign2-replace.jsx`),
  **B** dedicated head-to-head, **C** split shortlist→focus. `screens-candidates.jsx`
  + `candidates.css`. **Down-select still open** (see §3).
- ✅ **Bold Flag applied to the results surface** — Section 2 `res-main` switched
  warm→white; the whole canvas now runs on one palette (Muxin review). Section 3
  relabelled "confirmed", kept as the before/after record.

---

## 3. Open questions to confirm with the user BEFORE the next build

1. ✅ **Orientation A-activated** — confirmed final.
2. ✅ **Bold Flag** — confirmed as THE palette; rolling it across every new
   screen as built (results surface already switched).
3. **Polis placement** — *user is undecided, leaning a standalone nav **tab***
   (vs. the post-decision "Where you stand" moment in `DECISIONS.md`). Resolve
   at the start of the Polis session — it's the only thing gating that build.
4. **Design Candidates — down-select A / B / C.** ✅ **RESOLVED: B · dedicated
   head-to-head compare** (user pick). "Time to replace" opens the full-screen
   duel; wiring notes in `DECISIONS.md`. Remaining open: pick the homepage
   **headline voice** (Activation ★ / Accountability / Provocation).

---

## 4. STILL TO DO — design-coupled (these are the next sessions)

Suggested order. Each should be built into the SAME canvas (new sections) using
the activated Bold-Flag system, so it stays one cohesive document.

- [x] **Design Candidates UX flow** — P0 `6a1fb1fb`. ✅ built (Section 5);
  awaiting A/B/C down-select before repo wiring. Card parity `05b995c8` +
  `31145699` resolved via the provenance-badge unified card.
- [x] **Polis redesign + placement** — `bc774728`. ✅ built (Section 10).
  RESOLVED placement: **not a nav tab.** ⓪ ENTRY POINT — an optional invite card
  that appears once the scorecard's ready (after Print, always skippable); ①
  CONTRIBUTE react to a few statements; ② DISPLAY the "Where America agrees"
  report (foot of Why-Now + shareable). Borrows pol.is directly: a PCA-style
  **opinion map** (voters cluster into groups) that leads into the **consensus
  statements** bridging those groups. Never gates the printout. **Contribute is
  BLIND** — no running tally / per-statement results while voting (avoids
  bandwagon + polarization, per pol.is); disagreeing is recorded but never
  singled out. The report is **neutral + honest** (card iteration): it leads with
  the opinion map and shows common ground only where it cleared 60%+ in every
  group — with a `divided` state for when the room genuinely splits (no forced
  consensus; "depolarizing is seeing each other clearly, not pretending we
  agree"). Files: `screens-polis.jsx` + `polis.css`.
- [ ] **Homepage hero + CTA, de-clutter** — `b4cc1c9e`. ✅ built (Section 6) on
  Bold Flag: fact snippets dropped → Why-Now, CTA states what the site does,
  product-preview right rail, simplified address box (`1850349c`). Open:
  user picks the headline voice.
- [x] **Simplify Registered Address box** — `1850349c`. ✅ done as part of the
  hero (Section 6): label + field + "pull my reps", rest under a "how it works /
  your data" disclosure with numbered steps.
- [ ] **"Lock These In" box bigger / more prominent** — `4b7e5a66`.
- [ ] **Intake / edit-issues visual pass** — ✅ built (Section 9). End-to-end
  "defining your issues" flow on Bold Flag: cold open → AI proposes → **bounded
  disambiguation** (2–4 tappable options, one tap, not a back-and-forth) →
  locked with jurisdiction tags; plus the seeded edit-issues modal + re-score
  delta. The UI now enforces the ≤2-clarifying-Qs goal (card 6cdedfa6) and shows
  jurisdiction inline (9143a622). NOTE: the actual model disambiguation lives in
  `lib/prompts/theme-*` (server-side) — design supplies the affordance; eng must
  emit `disambiguationOptions` for it to light up.
- [x] **"Why Now?" page** — `9031f1ce`. ✅ built (Section 7) on Bold Flag:
  long-form editorial in three movements (problem → 2026 moment → how it works);
  houses the two fact snippets pulled off the hero. Adapted from founder framing.
- [x] **Finish top-bar + footer reorg** — `b1a5f64a`, `c9891a1f`. ✅ done in the
  static-pages pass (Section 8): footer trimmed to brand + "© 2026 Grey Bird LLC",
  Privacy moved right after About, Tip jar + Support de-emphasized after a divider.
- [x] **Roll the editorial template + palette across all shipped surfaces** —
  ✅ built (Section 8). About / How it works / Privacy / Tip jar share one
  `StaticPageVC` editorial shell (masthead + kicker + serif prose) on Bold Flag;
  Loading restyled; footer reorganized. Files: `screens-statics.jsx` +
  `statics.css`. Remaining surface not yet done: the conversational **Intake /
  cold-open** visual pass (its own slice).

## 5. STILL TO DO — mechanical / backend (run in PARALLEL — NOT design work)

Hand these to Claude Code / eng now; they don't block or get blocked by design.

- [ ] Remove Fed/Both/State issue tags — P0 `e2d2a7a0` (design already drops them).
- [ ] Fix edit-issues conversation loop (≤2 clarifying Qs then lock) — P0 `6cdedfa6`.
- [ ] Edit-issues missing in tablet/mobile (left panel unreachable) — P0 `ef8d602c`.
- [ ] Spanish translation only covers top bar — P1 `d8059e2e`. Design note: the
  nav language control is now a **selector** (`EN ▾`), not a hardcoded EN·ES
  toggle — per Muxin, the menu should eventually carry any major US language
  (ties to `2b325135` translations to major languages), not just EN/ES.
- [ ] Settings button is a no-op — P1 `403ed2a6`.
- [ ] Launch ops — security review `850b1220`, reset Polis count `1f5e2506`,
  lower `CHAT_DAILY_SESSION_LIMIT` 100→10 `28bf87ec` (all P0).
- [ ] Alignment quality umbrella `f474c4b8`; voter-issue-events go-live
  `39a6b6e3`; CRS summary plumbing `a06450b8` / `0f890cb0`; translations to major
  languages `2b325135` (blocks on UX finalize `e18e65fd`).

---

## 6. Deliverables index (this session)

```
design-session/
  Voter Choice - Keystone Design Session.html  ← open this (the canvas)
  DECISIONS.md            ← decision → repo-file wiring map + Polis/logistics recs
  canvas-app.jsx          ← assembles the canvas sections/artboards
  screens-orientation.jsx ← SCNav, OrientationA/B/C, OrientationActivated (picked)
  screens-results.jsx     ← ResultsScreen, RepCardFull/Compact, ResultsRail
  screens-scorecard.jsx   ← Scorecard (grayscale-safe)
  screens.css             ← tokens (warm / white / activated) + all screen styles
  design-canvas.jsx       ← starter (do not edit)
```

**To extend:** add a new `screens-*.jsx` per topic, export components to
`window`, add a `<DCSection>` in `canvas-app.jsx`, load the new file in the HTML
before `canvas-app.jsx`. Keep each file < ~1000 lines.
