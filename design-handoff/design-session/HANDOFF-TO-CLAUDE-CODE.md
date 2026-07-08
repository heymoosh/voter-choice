# Voter Choice — handoff to Claude Code (backend wiring + readiness)

> **Audience:** the engineer (Claude Code) wiring the backend behind the
> reviewed design. The design surface is the **`representatives-only` delta**;
> repo-file mappings live in `representatives-only/HANDOFF.md` and
> `uploads/SCOPE.md`. This doc adds (1) the **one new feature** designed this
> session — *raised vs. the median* — with its data contract, and (2) a
> **readiness pass**: the design components, interactions, accessibility, and
> AI-privacy/ethics items to close before launch, each tagged with who owns it.
>
> Convention from the rest of the project: **don't redesign — wire.** Every
> screen, prop shape, and string in the canvas is final unless flagged here.

Legend: **[ENG]** backend/eng only · **[DSN]** needs a design pass first ·
**[BOTH]** designed here, needs eng to light up.

---

## 1. NEW FEATURE — "Raised vs. the median" (the money-gap scale)

**What it is.** Raw dollars ($4.2M) mean little to a voter. The signal is
*relative*: how does this campaign compare to what's normal for the race? The
new primitive plots each campaign against **one labeled median line** and leads
with a **multiple** ("3× the typical U.S. House campaign"). The bar segment past
the line — gold — is the "how much more." See canvas **Section 11**
(`screens-funding.jsx` / `funding.css`): the whole-field scale, the reading
states, and the head-to-head integration.

**Design decisions (locked):**
- **Baseline = the chamber median** (NOT in-race). Confirmed by the user.
  Rationale: a single race has only a handful of candidates, so an in-race
  median is small-N, unstable, and dragged by the incumbent; the chamber median
  is stable, comparable across races, and **available before challengers load**
  (so the incumbent card can show it on its own). The label *always names the
  baseline* ("the typical U.S. House campaign") so it stays honest. The contract
  keeps a `baseline` field for forward-compat, but ship `'chamber-median'`.
- **Neutral, non-moralizing.** Keep/replace use green/red for *alignment*; money
  must not borrow that meaning. The scale uses the **gold accent** for "more"
  and a muted navy for "raised." Below-median reads **"running lean," never
  failure** — being outraised is not a verdict on the candidate.
- **Honesty over false precision.** If there's no usable median (too few
  campaigns filed, or a level we don't track), **hide the comparison and show
  the dollar amount only** — never fabricate a baseline. (Same honesty rule as
  the attendance `null` → "not tracked at state level" case already in the repo.)

### Data contract — extend the donor payload  **[ENG]**

Add a `peerComparison` object to the existing funding/donor response
(`/api/donors` → `lookupDonorCoalition()`, `donor_aggregates`). It hangs next to
`totalRaised` / `fundingMix` on `DELEGATION[].candidate` and on each challenger
in the candidate/compare payload.

```ts
peerComparison: {
  baseline: 'chamber-median', // LOCKED — chamber/office median, not in-race
  office: string,            // "U.S. House" — drives the label
  medianRaised: number,      // dollars, e.g. 1_400_000
  multiple: number,          // raised / medianRaised, e.g. 3.0
  sampleSize: number,        // # campaigns the median is computed over
  cycle: string,             // "2025–26"
  source: string,            // "FEC filings (OpenSecrets aggregation)"
} | null                     // null ⇒ UI hides the comparison, shows $ only
```

- **Where the median comes from:** compute per `office` × `cycle` from FEC bulk
  totals (median of all campaigns for that chamber), cache it; it's not
  per-candidate.
- **Null rules:** return `null` when `sampleSize` is below a floor (suggest < 5)
  or for offices with no reliable filing data (most state/local). Don't guess.
- **The UI already handles** all bands (above / ≈ / lean) and the `null` blank;
  it derives the band from `multiple` (≥1.15 above · 0.85–1.15 ≈ · <0.85 lean).

### Where it renders (wire these surfaces)
| Surface | Component | Repo target |
|---|---|---|
| Incumbent rep card, collapsed money-line | `MedianChip` (the glance) | `RepCard.tsx` money row |
| Incumbent expanded "Funders & influence" | the full scale (replaces the flat `peer` string) | `FunderBars` / money-trail disclosure |
| Candidate cards (parity / shortlist) | `MedianChip` | `CandCard` (`redesign2-card.jsx`) |
| **Head-to-head (direction B, the chosen replace flow)** | `MoneyGapH2H` — ratio + shared scale | the compare view's funding block |

> This **supersedes** the static `peer: "≈3× the median House campaign"` literal
> in `screens-results.jsx` `REP_FUNDING` / the repo's funding label. Same number,
> now a real, sourced, reusable component.

---

## 2. Are we missing design components? — gap analysis

### 2a. Components / states not yet designed  **[DSN]** unless noted
- **AI research streaming + skeleton** — executive "Researched · cited"
  positions are generated live (`/api/research-candidate`, Haiku + web_search).
  Needs a *researching…* / partial / "citation pending" state, not just a
  spinner. Today only the final card exists.
- **Empty / failure states** — address-not-found, district-not-resolvable, no
  contested race, no challenger data yet, donor/median `null`, API error, stale
  data banner. The honesty patterns exist (attendance `null`); generalize them.
- **Rate-limit / community-budget reached** — `CHAT_DAILY_SESSION_LIMIT` drops
  100→10 (`28bf87ec`). The `ByokCard` is the off-ramp; it needs the **wrapper
  state** ("community budget reached → use your key or come back tomorrow"). **[BOTH]**
- **Settings page** — currently a no-op (`403ed2a6`). Needs: language, BYOK,
  **clear my data / data retention**, reset. Ties to the privacy items below.
- **Responsive for the NEW surfaces** — `RESPONSIVE.md` covers shipped screens;
  the new head-to-head, candidate cards, money-gap scale, intake, and Polis need
  mobile/tablet breakpoints. **Known P0:** edit-issues unreachable on tablet
  (`ef8d602c`). The money-gap scale needs a stacked/compact form < ~560px.
- **"Revisit" flagged-seat state** after an issue change re-score — designed in
  Section 9 (intake); confirm the workspace rail shows it. **[BOTH]**
- **Scorecard share / handoff** — `HandoffModal` / `ScorecardPrintView` exist;
  confirm the share + "continue elsewhere" states are covered (the `alert()`
  stubs `onSaveProfile`/`onContinueElsewhere` need real wiring). **[ENG]**

### 2b. Key interactions to spec  **[ENG]** (design is settled)
- **Verdict state machine** — `keep`/`replace` per seat, no candidate "pick";
  rides to scorecard + print; undo; changeable anytime. `verdicts: Record<seatId,'keep'|'replace'>`.
- **Re-score on issue change** — recompute alignment, flag affected seats
  "Revisit", **never silently overwrite an existing verdict** (Section 9 rule).
- **Blind reveal** — name/party hidden by default; reveal is explicit and
  per-card; decide persistence (per-session vs sticky).
- **Progressive disclosure** — funders ▾, all-votes sheet, per-issue vote
  drilldown: open/close + (nice-to-have) deep-link.
- **Median baseline** — chamber median is locked (no user toggle); no UI needed.
- **Chat / ask** — `SeatChat`, `IssueConversation`: streaming, and the
  **≤2-clarifying-question bound** then lock (`6cdedfa6`). Must answer **from the
  records on the cards** (see ethics §2d), with a clean "not in the record" path.
- **Polis contribute** — blind, **no running tally**, disagreement never singled
  out; report aggregates via SQL (`/api/polis/bars` + `/bridges`), no ML.

### 2c. Accessibility checklist  **[BOTH]** — civic info must be WCAG 2.1 AA
- **Color independence** — alignment already pairs color with a number;
  scorecard is grayscale-safe (shape + icon + text). **Verify the new money-gap
  scale + funding-mix bars** carry the read without color: the multiple text, the
  median tick, and "above median / running lean" labels do this — keep them.
- **Contrast** — audit `--ink-3` body text, the gold accent as *text*
  (`--mg-overink` is the darkened gold for text — don't use the fill gold for
  type), badge text, and tone colors on `*-soft` grounds, all ≥ 4.5:1 (3:1 for
  ≥18px/large). 
- **Focus states** — visible ring on every interactive: cards, segmented
  controls, challenger switcher tabs, expandable rows, chips, the PAC tooltip
  term. (The `tip-open` `tabIndex` pattern is a start.)
- **Screen-reader** — the scale ships an `aria-label` per row with the
  plain-language reading ("raised $4.2M, 3× the median of $1.4M"); keep that
  contract on every chart. Add `aria-live` for **re-score** results and
  **streaming AI research**. Label the blind card's purpose ("judge the record").
- **Hit targets ≥ 44px** — verify chips, carets, segmented buttons, switcher
  tabs (cards already comply).
- **Reduced motion** — gate any entrance/transition on
  `prefers-reduced-motion`.
- **Language** — the `EN ▾` selector must drive **full-body translation**, not
  just the top bar (`d8059e2e`); define how **AI-generated** output (researched
  positions, chat) is translated. (`2b325135`, blocked on UX `e18e65fd`.)
- **Forms** — address input: programmatic label, inline error, autocomplete.

### 2d. AI privacy & ethics  **[BOTH]** — the highest-stakes surface
This product scores politicians with AI; the trust bar is high. Much is already
done well — list is "confirm + close the gaps."

**Already strong (preserve, don't regress):**
- Blind-first card ("judge the record, not the person") — the core anti-bias move.
- **Provenance never blended** — roll-call vs `Researched · cited`; researched
  positions already **drop citation-less claims** and carry confidence.
- **Sources on every datum** (`CardSources`: GovTrack, Congress.gov CRS, FEC,
  OpenSecrets) — keep it pointed at whatever actually fed each card.
- **PAC honesty** — "we don't name a PAC we can't attribute to a public agenda."
- **BYOK** — key is **localStorage only, never sent to our server**; with a key,
  live lookups pause (the privacy trade-off is disclosed). Keep that contract.
- **Polis** — blind voting, no bandwagon tally, no forced consensus.

**To close before launch:**
- **Address handling (the only PII input)** — state plainly, in-product (privacy
  page + the address box disclosure + Settings): used to resolve your district,
  **stored for how long / not stored**, and a **"clear my data"** control. **[BOTH]**
- **Chat transcript + session retention** — define retention + deletion; surface it.
- **Polis anonymization** — per-session priority vectors must be anonymized
  before they power the opinion-map dots (noted in `representatives-only/HANDOFF.md`). **[ENG]**
- **AI-content disclosure + error reporting** — researched positions and chat
  answers should be visibly marked AI-generated-and-cited, with a **"flag this"**
  affordance. **[BOTH]**
- **Chat guardrail** — answers must come **from the records on the cards**; ship
  an explicit "I can only answer from this rep's record" refusal path; no
  free-roaming political opinions. **[ENG]**
- **Methodology transparency** — "How it works" must spell out *how a vote maps
  to your issue* and what "with you" means, so the alignment score is auditable
  and defensible against partisan-bias claims. Same for **how the median is
  computed** (link from the scale's source line — the UI already has the slot). **[BOTH]**
- **Security / launch ops** — security review (`850b1220`), reset Polis count
  (`1f5e2506`), lower chat limit (`28bf87ec`). **[ENG]**

---

## 3. Definition of done (for the new feature)
- `peerComparison` returned (or `null`) on incumbent + every challenger funding
  payload; median computed per office×cycle and cached.
- `MedianChip` on rep card + candidate cards; full scale in the funder
  disclosure; `MoneyGapH2H` in the replace/compare flow — all reading from real
  data, `null` hides cleanly.
- The static `peer` string is gone; numbers trace to the source line.
- Scale passes the a11y checks in §2c (aria-label per row, gold-as-text uses the
  darkened token, focus rings, stacked < 560px).

## 4. Backend cards already queued (from HANDOFF-NEXT-SESSION §5)
Remove Fed/Both/State tags (`e2d2a7a0`) · edit-issues loop ≤2 Qs (`6cdedfa6`) ·
edit-issues on tablet (`ef8d602c`) · Spanish full-body (`d8059e2e`) · settings
no-op (`403ed2a6`) · launch ops (`850b1220`/`1f5e2506`/`28bf87ec`) · alignment
quality (`f474c4b8`) · CRS plumbing (`a06450b8`/`0f890cb0`) · translations
(`2b325135`). None block the design; the new median feature slots into the
existing `/api/donors` path.
