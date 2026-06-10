# Voter Choice — 2026 "record-first" redesign · backend handoff

This folder is the **runnable front end** for the redesign that reframes Voter
Choice from *"fill in your ballot"* to **"hold the people who already represent
you to their record."** Open `Voter Choice Redesign.html` in a browser (no
server — inline Babel). State persists in `localStorage`
(`voter-choice:redesign2`).

> The job for Claude Code is to **wire the backend** — every screen, component,
> prop shape, and piece of copy here is final. Swap the mock literals in
> `redesign2-data.jsx` for the repo's already-built fetches; don't redesign.

---

## What is SHIPPED (reused verbatim) vs NEW

The redesign is built **on top of the existing prototype components**, loaded
straight from `../prototype/`. Do not fork these — they map 1:1 to the repo:

| Shipped (unchanged) | Used for |
|---|---|
| `prototype.css` / `prototype-c.css` | all tokens, card styles, workspace grid, **every responsive breakpoint** |
| `HomeView`, `LoadingView` (`prototype-views.jsx`) | **home page is unchanged** — `address → loading → workspace` |
| `AboutPage` / `MethodologyPage` / `PrivacyPage` / `TipJarPage` | static pages (nav + footer links) |
| `CandidateCardHeader` | rep card header + **blind mode / reveal** |
| `AlignmentScoreBanner` + `AlignmentDrilldown` | per-issue record, drilldown vote cards, narratives |
| `FunderBars` + Money-trail disclosure | funding mix, named PACs, industry breakdown |
| `PollingStatusBar`, `AppNav`, `LanguageToggle`, `I18nProvider`, `NavProvider` | chrome + i18n + nav |
| Print sheet (`PrintView` markup contract) | polling header, accepted-ID list, early-voting window |

**New files (the redesign delta):**

| File | Component(s) | Repo target |
|---|---|---|
| `redesign2-data.jsx` | `DELEGATION`, `USER_ISSUES2`, `POLIS2` (mock) | replace with fetches (below) |
| `redesign2-card.jsx` | `RepCard`, `AttendanceBand2`, `EligibilityNote2`, `ResearchedPositions`, `CardSources` | `src/components/RepCard.tsx` (+ named subcomponents) |
| `redesign2-workspace.jsx` | `DelegationWorkspace`, `ScorecardPane` | `src/components/DelegationWorkspace.tsx`, `ScorecardPane.tsx` (evolve `BallotToolClient`/`BallotPane`) |
| `redesign2-print.jsx` | `ScorecardPrintView` | evolve `src/components/PrintBallot.tsx` |
| `redesign-polis.jsx` | `PolisClose` | rebuild `src/components/PolisOverlay.tsx` |
| `redesign2-app.jsx` | `App2` stage router | `src/app/PageContent.tsx` |
| `redesign2.css` | new surfaces only | express as Tailwind tokens (do NOT copy) |

---

## Mock data → real source (the wiring)

Everything in `redesign2-data.jsx` is shaped to match the repo's existing
TypeScript interfaces and routes. Swap literal → fetch:

| Mock in `redesign2-data.jsx` | Real source (already in repo) |
|---|---|
| `DELEGATION[].candidate` (id, name, party, incumbent) | address → district → **your sitting members**: derive from `candidates` table (`isIncumbent`, `jurisdiction`) + district lookup. `/api/civic` returns the address/polling half. |
| `DELEGATION[].alignmentEntry` (kept/total + `contributingVotes[]` w/ narrative) | `/api/race-data` → `lookupAlignment()` (`src/lib/server/alignment.ts`) over the `votes`/`bills`/`issue_tags` tables |
| `DELEGATION[].candidate.donorCoalition` / `fundingMix` / `totalRaised` | `/api/donors` → `lookupDonorCoalition()` (`donor_aggregates`) |
| `DELEGATION[].attendance` `{ missedPct, of, band }` **[Δ NEW]** | GovTrack member **missed-votes** stat — ingest as a per-member field (a small `member_stats` table). **Do not** derive from our partial `votes` table. Federal only; `attendance: null` ⇒ the card honestly says "not tracked at state level". |
| `DELEGATION[].eligibility` `{ severity, nextLabel, date, ruleHtml, todo }` **[Δ NEW]** | `getStateData()` (`src/lib/getStateData.ts`): `primaryParticipation.type`, `runoffRules.partyLockedToFirstRoundPrimary`, per-election `primaryType` + registration deadlines. This is the **evolved party gate** — rendered per seat, never a blocking modal. |
| `DELEGATION[].positions` (executive) | `/api/research-candidate` → `researchAndPersistCandidate()` (Haiku + `web_search`, cited). Already drops citation-less claims. |
| `USER_ISSUES2[].level` (`federal`/`state`/`both`) **[Δ NEW]** | a jurisdiction-lean tag per canonical issue (small additive map on `canonicalIssues.ts`) — drives the "who controls this" routing in the tier headers + priority tags. |
| `POLIS2.scopes[]` (county/state/national dots + bridges) | `/api/polis/bars` + `/api/polis/bridges` (SQL aggregates — no ML). Per-person dots need anonymized per-session priority vectors; bridges/bars work today. |

`CardSources` (the per-card "SOURCES" footer) is presentational — it just names
the sources above so every datum is traceable. Keep it pointed at whatever
source actually fed the card.

---

## Stubs to replace + new fields

- **Save `.txt` / handoff** — `onSaveProfile` / `onContinueElsewhere` are
  `alert()` stubs. Wire to `downloadProfileAsText` / `HandoffPackage`
  (`src/lib/ballot-utils.ts`) — already in repo.
- **Address → districts** — the one genuinely new lookup: address → state +
  congressional/state-leg district, then resolve incumbents. Everything else
  (`/api/civic`, alignment, donors, polis) already exists.
- **`useStateR` / `useStateW` / `useStateA` prefixes** — Babel multi-file scope
  artifacts; strip back to `useState` on port.
- **Verdict model** — there is **no candidate "Pick"** here. Each seat gets a
  `keep` / `replace` verdict (assessment, not selection). It rides into the
  scorecard + printout. (`verdicts: Record<seatId, 'keep'|'replace'>`.)

## New schema fields summary (`[Δ]`)
- `member_stats.missedVotesPct` (+ chamber median) — GovTrack attendance.
- canonical-issue → `jurisdiction` lean (`federal`/`state`/`both`).
- eligibility resolution is **derived** from existing `getStateData` rules — no
  new storage, just a resolver returning `{ severity, nextLabel, ruleHtml, todo }`.

That's the whole delta. Home, chrome, cards, money trail, print sheet, and i18n
are the shipped repo surfaces; the new work is the delegation/scorecard/polis
layer + the address→delegation resolution.
