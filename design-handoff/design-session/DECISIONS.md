# Keystone design session — decisions + wiring handoff

**What this is:** the single design pass the backlog's anchor card calls for
(*"Claude Design session — results-flow clarity, visual hierarchy & color
system"*). It resolves the cohesion-critical decisions that ~12 feedback cards
were blocked on. Everything here is drawn on the **representatives-only** delta
(the current direction), not the old ballot-ingestion app.

**How to use it:** this is a *design spec*, not code to port. Each decision
below names the **exact file in the redesign delta** to change and the **repo
target** it maps to (from `representatives-only/HANDOFF.md` + `uploads/SCOPE.md`).
The changes are additive to the delta — they don't touch anything on the
"do-not-modify" boundary list, so they can't regress existing features.

Open `Voter Choice - Keystone Design Session.html` to see all of it on one canvas.

---

## Decisions

### 1. Guided orientation screen *(NEW — the #1 fix)*
A dedicated screen before any rep appears, naming what's about to happen and the
finite scope. **Three directions to choose from** — A Guided Tour (focused card),
B Mission Checklist (plan + delegation preview), C The Briefing (editorial,
more activating). Pick one; they share copy.
- **Wire in:** `redesign2-app.jsx` → `App2` stage router. Add an `"orient"`
  stage between `analyzing` and `workspace`. Repo target: **`src/prototype/redesign/App2.tsx`** (→ `src/app/PageContent.tsx`).
- Closes: *Add a guided orientation screen before rep review* (0b9d40c9).

### 2. Results = one visible panel, rail IS the progress
Removed the left "Your Issues" panel and the separate progress bar. The right
rail's **Reviewing now / Not yet reviewed / Reviewed** groups now *are* the
progress. Issues + jurisdiction moved to a slim context strip up top.
- **Wire in:** `redesign2-workspace.jsx` → `DelegationWorkspace` (drop the
  `.progress` block at lines ~206–210 and the left issues column; keep the rail).
  Repo target: **`DelegationWorkspace.tsx`**.
- Closes: *Reduce panel clutter — one visible panel, simpler progress* (335829af);
  *Show jurisdiction context on the issues page* (9143a622).

### 3. "Print my scorecard" is discoverable
The print CTA lives pinned in the rail foot and **unlocks when all up-for-election
seats are decided** ("Decide both seats to print · 0 of 2") — it can't be missed
after the last rep.
- **Wire in:** `redesign2-workspace.jsx` → `ScorecardPane` foot / rail foot.
- Closes: *Make "Print My Scorecard" discoverable after the last rep* (1f77c3eb).

### 4. Non-2026 representatives greyed + excluded
The Class-I senator (not up until 2028) renders greyed in the rail with a
"Not up for election" group, and is **excluded from the scorecard decisions**
(shown once for context only).
- **Wire in:** `redesign2-card.jsx` / `redesign2-workspace.jsx` rail; scorecard
  exclusion in `redesign2-print.jsx` (`visibleSeats()` + verdict filter).
  Eligibility derives from **`getStateData()`** per HANDOFF — no new storage.
- Closes: *Distinguish + de-emphasize non-2026 representatives* (97eda1e0).

### 5. Scorecard — print-ready overhaul
White sheet; big serif headings; **decisions lead** (address/districts demoted
to a footer strip); **Keep = green check, Replace = red swap** (never the same
checkbox); votes-matched shown as a **%**.
- **Wire in:** `redesign2-print.jsx` → `ScorecardPrintView`. Change `fracFor()`
  to emit a percentage; reorder so decisions render before `voter-meta`.
  Repo target: **`PrintBallot.tsx`** evolution.
- Closes: *Scorecard layout + print-quality overhaul* (78f5ce94).

### 6. Color & activation — two palettes
Same screen, two grounds, honest comparison:
- **A · Civic Activated** — keeps the warm editorial paper; swaps the subdued
  teal `--civic` for a **federal blue** primary and lets **red** carry the
  "replace" weight. Restrained patriotism.
- **B · Bold Flag** — **white** background (prints clean — the scorecard note),
  navy + flag red turned up.
- **Wire in:** the `:root` token block. In the delta, edit `--civic` / add
  `--brand` `--keep` `--replace` in **`prototype.css`** / `redesign2.css`; in the
  repo, express as Tailwind tokens. The exact oklch values are in
  `screens.css` under `[data-palette="warm"]` and `[data-palette="white"]`.
- Closes: *Reconsider color scheme for emotional activation* (ffb7a832).

---

## Folds in for free (P2s that were blocked on this anchor)
- **Homepage headline/CTA** — the activation language ("Three people vote in
  your name. Today you check their work.") and the federal-blue/red system
  give the hero a stronger, clearer direction (b4cc1c9e).
- **Issues-page jurisdiction context** — the `FEDERAL` level tag + tier intro
  copy handle "who controls this" inline (9143a622).
- **Remove Fed/Both/State tags** (e2d2a7a0, P0) — the redesign drops the noisy
  per-issue tags; only a single jurisdiction tag remains on the seat tier header.

## What this pass deliberately does NOT cover (run in parallel — not design-coupled)
These are mechanical/backend and won't affect look & feel:
- Edit-issues conversation loop (6cdedfa6), edit-issues missing in tablet
  (ef8d602c), Spanish body translation (d8059e2e), settings no-op (403ed2a6),
  rate-limit / Polis-reset / security ops.
- **Design Candidates UX flow** (6a1fb1fb) and **Polis redesign** are their own
  sessions — say the word and they're next.

## Note on staleness
The live app's positioning is now **"Assess Your Representatives with AI"**
(confirmed from prod meta). This pass uses that framing. If any recent prod
change conflicts with a screen here, flag it and it's a one-line adjust — the
delta is additive, so nothing here removes a shipped feature.

---

## Round 2 — teammate review resolutions (Muxin)

- **Orientation direction picked.** Layout **A (Guided Tour)** chosen as best of
  the three, rendered **on the Bold Flag white ground** (same UI as results +
  scorecard) with a flag hairline + navy/red accents. See the ★ *Recommended*
  artboard. Build on `OrientationActivated` → the new `"orient"` stage.
- **Color leans Bold Flag** (white ground, bolder red-white-blue) for the 250th
  moment — the activated orientation is built on that system. Wire the
  `[data-palette="white"]` token set as the default in `prototype.css`.
- **Nav: "Methodology" → "How it works"**, linking to the methodology page (the
  brand mark already returns home, so no separate Home link). Edit `SCNav` /
  the repo's `AppNav`. (Closes b1a5f64a's rename.)
- **Scorecard is grayscale-safe.** Keep vs replace now differ by **shape**
  (filled badge + ✓ vs outlined badge + ⇄) and **text**, with a ✓ / ⚠ glyph on
  the %, so it survives a black-and-white printer — not color alone.
- **Funding is progressive disclosure, not removed.** The card shows a glance
  summary (total + small/large/PAC bars + "45% PAC-funded · top industries")
  with a **"Funders & influence ▾"** affordance that expands the full
  `FunderBars` (named PACs + industry breakdown). All prior funding data is
  preserved on expand.
- **Where voting logistics live (answer to the top-bar Q):** intentionally OFF
  the assessment page (kept focused on the rep). Polling place, dates, accepted
  IDs, district + the calendar reminder all live on the **scorecard / printout**
  footer strip. If you want an in-app reminder before print, the natural home is
  a one-line `PollingStatusBar` on the *scorecard pane*, not the review surface.

## Open question — where should Polis live? (my recommendation)
Dropping Polis from the assess flow is right — it was clutter mid-task. But it
shouldn't disappear; depolarization is core. Recommendation:
1. **Primary home: a post-decision "Where you stand" moment** — after the last
   seat is verdicted, *before/at* the scorecard, as its own full-width screen
   (not a cramped side card). That's when the user has earned the payoff and is
   most open to "here's how your priorities map against your neighbors."
2. **Secondary: a standalone "Where America stands" page** off the top nav
   (pairs naturally with the new **"Why now"** page), so it's browsable without
   running the flow — good for sharing + the larger case.
3. Keep it **out** of the per-seat review entirely.
This needs its own session (it's also the *"Redesign Polis for effect"* card,
bc774728) — say the word and it's next, alongside the Design-Candidates flow.

---

## Session 2 — Design Candidates / "Time to replace" flow (card 6a1fb1fb, P0)

Built into the SAME canvas as **Section 5**, on the Bold Flag white ground.
Files: `screens-candidates.jsx` + `candidates.css`.

### Decided
- **One unified candidate card across seat types.** House, Senate, and
  President share a single card; a **provenance badge** carries the only real
  difference — `◆ Roll-call record` (filled) for officeholders vs
  `◇ Researched · cited` (dashed) for executives with no roll-call. Roll-call
  and researched scores are **never blended**. *Resolves the card-parity asks
  05b995c8 (House vs Senate) + 31145699 (President/VP).* User pick: unify.
  - **Wire in:** `redesign2-card.jsx` `RepCard` + `ChallengersStrip` → one
    `CandCard`; drive the badge off `repBasisOf()` in `redesign2-replace.jsx`.

- **What "Replace" opens — three directions on the canvas** *(user asked to
  explore a few; not yet down-selected)*:
  - **A · Inline ranked chooser** — evolves the existing `ReplaceFlow`
    (`redesign2-replace.jsx`): grows under the rep card, incumbent pinned as
    "the bar to beat", challengers ranked & blind-first, each expands to a
    per-issue head-to-head, **select = the replace decision**. Lowest friction,
    keeps the voter in the seat flow.
  - **B · Dedicated head-to-head** — a focused full-screen duel (incumbent vs.
    one challenger), challenger switcher up top, per-issue Δ ledger, funding
    contrast, Keep / Replace at the foot.
  - **C · Split** — a browsable ranked shortlist (left) driving a focused
    compare pane (right). Best for "shop the field, then commit."
  - **Recommendation:** ship **A** as the in-flow default (it's the smallest
    change to the live code), and reuse the **C** focus-pane layout as the
    expanded challenger detail. B is the odd one out — keep only if a standalone
    "compare two" entry point is wanted. *Awaiting user down-select.*

> **DOWN-SELECT (user, this session): B · dedicated head-to-head compare.**
> Picking "Time to replace" navigates to the full-screen duel (`HeadToHead`):
> incumbent vs. one challenger, a challenger switcher up top, per-issue Δ
> ledger, funding contrast, Keep / Replace at the foot. **Wire in:** make the
> `"replace"` verdict in `redesign2-card.jsx` route to a compare view rather
> than growing `ReplaceFlow` inline; the switcher iterates `seat.challengers`,
> selecting one records the successor (rides to scorecard + print). Reuse
> `repIssuePct` / `repOverallPct` from `redesign2-replace.jsx` for the scoring.

### Carried-forward confirmations (locked this session)
- Orientation **A (Guided Tour), activated** — final.
- **Bold Flag** (white ground) is THE palette; roll it across every new screen
  as built.
- Polis stays **out** of the per-seat flow. *Open:* user is weighing a
  standalone **nav tab** for it (vs. the post-decision "Where you stand"
  moment) — to resolve in the Polis session.

### Still open (next sessions, unchanged)
Polis redesign + placement (bc774728), Homepage hero (b4cc1c9e), intake /
address simplify (1850349c, 4b7e5a66), "Why now" page (9031f1ce), top-bar +
footer reorg (b1a5f64a, c9891a1f), palette rollout across shipped surfaces.

---

## Session 3 — Homepage hero (card b4cc1c9e + address simplify 1850349c)

Built into the canvas as **Section 6**. Files: `screens-home.jsx` + `home.css`.

### Decided / built
- **Activated, de-cluttered hero** on the Bold Flag white ground.
  - **The two fact snippets are dropped** from the hero (6 hrs/day fundraising ·
    94% incumbents win) → they move to the **"Why Now?"** page (9031f1ce).
  - **CTA + lede now state what the site does** — headline is the activation
    copy ("Three people vote in your name. Today you check their work."); the
    lede spells out the mechanism (see how your reps voted on *your* issues +
    who funded them → a scorecard for the polls).
  - **Right column previews the product** instead of stats: a blind assessment
    card that becomes a printable scorecard — shows what you get.
- **Registered-address box simplified** (1850349c): label + field + "Pull my
    representatives"; the reassurance + numbered steps fold under one
    "Unsure? How it works · your data ▾" line; trust row trimmed to three dots.
- **Headline voices** artboard offers three framings (Activation ★ /
    Accountability / Provocation) — *user to pick the final hook.*
  - **Wire in:** `HomeView` in `redesign2-shared.jsx` — drop the `.stat-stack`,
    swap the `.hp-hero` headline/lede copy, restructure `.addr-card` per above,
    move the stat blocks to the new Why-Now page component.
