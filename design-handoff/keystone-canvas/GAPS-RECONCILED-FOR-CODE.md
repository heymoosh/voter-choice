# Gaps reconciled — answers back to Claude Code

**Date:** 2026-07-07 · **From:** Claude Design (Keystone canvas session)
**Re:** the 9 proxy/parity gaps flagged in "Proxy gaps to take back to Claude Design"

Short version: **8 of the 9 flagged items were already answered by the canvas
or by Muxin's note — none needed new design except §8.** For each below:
the ruling, why, and exactly what Code should do. The one item that needed new
design (§8) is now built on the canvas — **Section 11 · Delegation overview →
drill-down** (`screens-delegation.jsx` + `delegation.css`).

The parity-gallery tool was right on every row — it captured a real, reachable
app state; it just wasn't the intended one. The intent lives on the canvas.

---

## The one that needed design — now built

### §8 · Candidates overview → deep single-seat drill-down  → **BUILD (designed this session)**

**Ruling (confirms Muxin's 2026-07-07 direction):** the 3-card `CandidateParity`
overview **is** the entry point. Clicking a card opens the **existing** deep
single-seat review — **unchanged, no new deep-dive design.** Two affordances are
layered on:

1. a **"← All seats"** back control in the context strip, and
2. the **seat-strip rail stays** as in-context lateral nav — jump seat→seat
   without returning to the overview.

Verdicts ride along: deciding a seat updates both the overview cards and the
rail. Non-2026 seats stay greyed + excluded (honors `97eda1e0`).

**On the canvas — Section 11:**
- `dg-overview` — the entry screen (every seat scored at once).
- `dg-flow` — **interactive**: click a card → deep view; "← All seats" back;
  rail switches seats; Keep/Replace records a verdict that reflects on the overview.
- `dg-deep` — the drill-down target = the same `.rcard` + progress-rail surface
  the results screen already uses, reused verbatim.

**Wire into (repo):** `DelegationWorkspace.tsx`. Add an **overview view** above
today's single-seat view: render all `visibleSeats()` as `CandidateParity`-style
scored cards; selecting one sets `activeSeatId` and enters the existing deep view.
Keep the seat-strip rail as lateral nav inside a seat; add the "← All seats"
control (clears `activeSeatId` back to the overview). No change to the deep view's
internals — this is a navigation layer on top of `RepCard`/the existing workspace.
Answers card `5192287a-...`.

**Answer to the open sub-question ("does the deep view need to change?"):** No.
The deep view is entered from the overview unchanged; the only additions are the
back affordance and the rail-as-lateral-nav. That keeps this a navigation change,
not a redesign — the smaller build.

---

## Already answered by the canvas — the intent exists; the repo just hasn't built it

These four are **not open design questions.** The canvas already committed the
design; each is an intended feature to build (see README §5–§6). The repo diverged
by not building them. Build them from the existing canvas artboards.

### §2 · IntakeLocked (pre-lock "your issues are set" confirm)  → **BUILD**
Designed on the canvas: **Section 9, artboard `iq-locked`** (`IntakeLocked` in
`screens-intake.jsx`). It's a discrete state (jurisdiction summary + drag-to-rerank
before commit), intended to ship — not superseded. The continuous conversational
loop leads *into* it; it does not replace it. Wire into `IntakeView`/`IssueConversation.tsx`
as a distinct confirm step before lock. Card `c1a43c39-...`.

### §3 · PolisEntry (dedicated invite w/ preview scatter teaser)  → **BUILD (full invite)**
Designed on the canvas: **Section 10, artboard `polis-entry`** (`PolisEntry`).
The fuller invite is the intent — **not** the one-line link. Per decision #7, it's
an optional invite **after** the scorecard/print, never gating the printout. Wire
into the post-decision moment. Card `4936d17b-...`.

### §4 · Polis "where it split" (divided report)  → **BUILD**
Designed on the canvas: **Section 10, artboard `polis-divided`** (`PolisReport divided`).
This is core to the honesty principle (decision #8): show common ground only where
it cleared the bar, and be explicit when the room split — never force consensus.
Build the divided branch in `PolisClose.tsx`. Card `e2455f56-...`.

### §9 · PolisStand (blind agree/disagree/pass step)  → **BUILD**
Designed on the canvas: **Section 10, artboard `polis-stand`** (`PolisStand`).
A real blind-voting contribution step (no running tally while voting — avoids
bandwagon/polarization, per pol.is and decision #7/#8), sits between the invite and
the aggregate report. It genuinely does not exist in the repo yet — build it as a
new post-decision moment. Card `fb77d0bb-...`.

---

## Party-free bridging threshold (tied to §4/§9)  → **RE-EXPRESS AS POPULATION-LEVEL**

The canvas copy described 60%+ within **each** D/R/I group. The shipped app is a
deliberate **party-free** product (decision #116) using an overall-population bar.
**Keep party-free.** Re-express the bridging bar as a **population-level threshold**
(no D/R/I breakdown). The design principle that matters — "common ground only where
it genuinely cleared a high bar, honest when it didn't" — is preserved without
reintroducing party grouping. Update the canvas/report copy to a population-level
framing when you build §4. (No separate card — folds into `e2455f56-...`.)

---

## Resolved as "the simpler shipped version is correct" — canvas agrees

These two are **not** on the canvas, and the canvas already uses the simpler
treatment. The fuller explorations are superseded.

### §5 · Whole-field (3+) money-gap comparison scale  → **DROP (don't build)**
No field scale exists on the canvas or in the repo. The shipped
single-subject-vs-**chamber-median** comparison is the intended design (README §6.13,
§8.1; canvas `FunderPanel`). A 3+ scale would be a new component with no design behind
it — not wanted. Close card `be126dc5-...` as "won't build; superseded by chamber-median."

### §7 · MoneyGapH2H on the head-to-head screen  → **REMOVE as dead code**
The canvas `HeadToHead` (Section 5, artboard `cand-b` — the picked direction B) uses
the **simple PAC-% funding footnote**, not a money-gap scale. That footnote is the
intended treatment. `MoneyGapH2H` is unused exploration — safe to remove. Close card
`0e87d755-...` as "footnote is intended; remove MoneyGapH2H."

---

## No action — design-tool artifacts, not app gaps (doc already had these right)

### §1 · Color (03-color-bold-flag)
Palette-demo card; the Bold Flag tokens are applied live across the app. The
Results-workspace proxy is the correct substitute. Nothing to build.

### §6 · Scale states style guide (11b-scalestates)
A design-reference page enumerating all money-gap states side by side. Production
only ever renders the one state the data produces. Nothing to build.

---

## Backlog cards — dispositions

| Card | Item | Disposition |
|---|---|---|
| `5192287a-...` | §8 Candidates overview | **BUILD** — designed this session (Section 11); nav layer on `DelegationWorkspace` |
| `c1a43c39-...` | §2 IntakeLocked | **BUILD** — from canvas `iq-locked` |
| `4936d17b-...` | §3 PolisEntry | **BUILD** (full invite) — from canvas `polis-entry` |
| `e2455f56-...` | §4 divided + threshold | **BUILD** divided from `polis-divided`; threshold → population-level (party-free) |
| `be126dc5-...` | §5 field money scale | **CLOSE** — won't build (chamber-median supersedes) |
| `0e87d755-...` | §7 MoneyGapH2H | **CLOSE** — footnote is intended; remove dead code |
| `fb77d0bb-...` | §9 PolisStand | **BUILD** — from canvas `polis-stand` |

§1 and §6 need no card (design-tool artifacts), as the doc noted.

---

## Net for Code

- **Build, from existing canvas artboards:** §2, §3, §4 (population-level threshold),
  §9. The designs are done — no product-design call outstanding.
- **Build, newly designed this session:** §8 (Section 11 — a navigation layer, not
  a redesign).
- **Close as won't-build:** §5, §7.
- **No action:** §1, §6.
