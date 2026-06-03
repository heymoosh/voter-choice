# Prototype-first rebuild — status & plan

**Branch:** `feat/prototype-rebuild` (off `feat/design-integration`). NOT deployed.
`launch/production` is untouched and still serves the old (drifted) app.

**Decision (user, explicit):** stop re-porting the prototype into hand-written
Tailwind components — that re-port DRIFTED (wrong funding bars, misplaced
"see all votes", per-race loader, split races). Instead **run the prototype's
ACTUAL code as the app** and wire its marked data seams to the real backend.
"Go all the way" — incl. backend data gaps (funding mix, curated fields).

---

## ✅ Phase 1 — DONE (commit `a3016dd`)

The prototype IS the app, verbatim, on its own mock data. Verified in local dev
(Playwright): home · cold-open · issue-ranking · 3-pane **workspace** all render
faithfully to the prototype design (Compare in the header, blind Candidate A
card, rail + ballot pane). Screenshots sent to user.

**How it's wired:**
- `prototype/` — authoritative prototype source, copied into the branch (HTML
  load order: shared→i18n→data→data-c→components→components-c→screens→screens-c
  →views→app). **This is the regeneration source.**
- `src/prototype/VoterChoiceApp.tsx` — VERBATIM concatenation of those JSX files
  in load order, as ONE `"use client"` module (`@ts-nocheck`; `ReactDOM.createRoot`
  stripped; `export default App`). React hooks are uniquely aliased per file
  (`useStateA/C/V/S/SC` + bare in components) → zero redeclaration collisions.
- `public/prototype.css` + `public/prototype-c.css` — the prototype's own design
  system, served STATIC via `<link>` in layout (browser-parsed). NOT imported
  through Next's CSS pipeline — Lightning CSS is stricter and rejects the
  (browser-valid) prototype CSS (floating declarations, comment quirks).
- `src/app/layout.tsx` — loads prototype CSS + the exact prototype Google Fonts;
  body `data-mood/palette/treatment="civic/civic/daylight"`. Dropped globals.css.
- `src/app/page.tsx` — mounts `App` client-only (`next/dynamic`, `ssr:false`) in
  `<div id="root">` (it reads localStorage/window at render).

**To regenerate the bundle** after editing `prototype/*.jsx`: re-run the
concat (header + files in HTML order, strip createRoot, append `export default App`).

---

## ✅ Phase 2a — DONE (commit `d0445e1`): race-data seam

- Data layer split into `src/prototype/data.tsx` (ballot bindings now `let` +
  real-data setters); bundle imports from it (ES live-bindings flow real data
  into the verbatim accessors). The bundle is now the **living app code** —
  edited directly, NOT regenerated (prototype/ stays as pristine reference).
- `src/prototype/realData.ts` (typed): `loadAllRaceData` POSTs `/api/race-data`
  per candidate-race, maps response → RACE_PATTERNS/ALIGNMENT_SCORES.
- **Single-load**: `handleLockIssues` shows the prototype's LoadingView once
  ('analyzing' view) while fetching ALL races in parallel, then workspace →
  switching races is instant (fixes the per-race loader). Resume-refetch added.
- Fixed a **prototype bug**: WorkspaceView rail rendered its section-list twice
  (verbatim copy-paste dup) → every race showed twice. Removed.
- TEMP NJ seed for RACES so race-data resolves real candidates; civic seam
  replaces it later.
- Verified local: 3 parallel `/api/race-data` calls on lock-in, cards render
  from the API response (backstop locally — no DB; real data resolves on prod).

**Remaining Phase 2 seams (next):** civic/flow orchestration (address→party
gate→civic→civic-empty→ballot upload→cold-open) which replaces the NJ seed +
carries the party-filter (#25); cold-open issues (text→theme extraction);
chat (`mockAIReply`→`/api/chat`).

## Data seams to wire (Phase 2) — prototype-app.jsx + prototype-data.jsx

`prototype-data.jsx` header says it: *"shaped to match src/lib/structured-blocks.ts"*.
It IS the contract + the test oracle. The mock globals/accessors to replace:

| Mock symbol | Real source | Notes |
|---|---|---|
| `RACES` (const) | `/api/civic` (+ `/api/extract-ballot`) → `deriveRaces()` | grouped Race[] |
| `getRacePatternsForRace(id)` → `{race,candidates}` | `POST /api/race-data` → `data.racePatterns` | shapes already match |
| `getAlignmentScoresForRace(id)` → `{race,entries}` | same call → `data.alignmentScores` | |
| `mockAIReply(id,text)` | `POST /api/chat` (streaming) | |
| `handleSubmitAddress` geocode fake | `/api/civic` | |

**Single-load model (fixes per-race loader, complaint #4):** the prototype runs
`LoadingView` ONCE (`view='loading'` → workspace); `handleSelectRace` only sets
`activeRaceId`. So: fetch race-data for ALL races ONCE after lock-in, populate
`RACE_PATTERNS`/`ALIGNMENT_SCORES`, then show workspace. Switching races = instant.

**Wiring approach:** make `RACES` / `RACE_PATTERNS` / `ALIGNMENT_SCORES` mutable
`let` (start = mock), populate from a typed `realData.ts` fetch layer, bump a
React context version so the verbatim accessors/components re-render. Call sites
are bounded (RACES 20, race-data accessors ~14).

**Flow-orchestration gap:** the prototype's mock flow (home→loading→coldopen→
workspace + geocodefail/nocontested/partygate screens) is SIMPLER than the real
flow (address→party gate for primary states→civic→civic-empty→ballot upload/paste
→cold-open→workspace). The prototype HAS the screens (PartyGate, NoContestedView,
GeocodeFailView); Phase 2 must wire the real SEQUENCE between them (the old
BallotToolClient holds that orchestration logic — reuse the logic, not the UI).

---

## "2 Senate races" — diagnosis (task #25)

NOT a grouping bug. `deriveRaces` already makes one Race per contest with its
candidates grouped. The duplication = the ballot carries BOTH a Democratic and a
Republican Senate **primary** contest (extraction sets `party_context` per
contest). Fix = thread the party-gate selection and FILTER contests to the
user's chosen primary (keep non-partisan/general races). Verify with
`njCamdenDemRepFixture` in `extractionToRaces.test.ts`.

---

## Backend data gaps (Phase 3) — frontend swap does NOT fix these

- **fundingMix {small,large,pac,total,cycle}** — TYPE exists in structured-blocks;
  DB only stored `total_receipts` (the "100%" bars). FEC candidate totals DO
  expose small/large/PAC → bounded ingest enhancement. Confirmed on prod earlier.
- **donorCoalition industry buckets + isIssuePAC/alignsWith** — type supports it;
  data is coarse. Needs per-employer/PAC enrichment (larger).
- **ContributingVote.narrative + named issue-PAC tie-ins** — curated/CAN2026
  editorial content; may not have data — flag what's infeasible.

---

## Retained backend (untouched, reused)
All `/api/*` routes · `src/lib/server/*` · DB + ingest · prompts · extraction ·
`structured-blocks.ts` (the contract). Backend tests stay valuable.

## Cleanup owed (task #27, do near the end)
Delete the drifted old frontend (`RacePatterns.tsx`, `ChatPanel.tsx`,
`BallotToolClient.tsx`, `FunderBars`, `CompareModal`, `AllVotesPanel`,
`WorkspaceRail`, `BallotPane`, `PageContent`, …) + their `*.test.tsx` + e2e specs
(they encode the drift). `page.test.tsx`/`PageContent.test.tsx` already broken by
the new page.tsx. Rewrite frontend tests against the prototype components. Full
gate (tsc/eslint/vitest/build) BEFORE any deploy. Deploy to launch/production
ONLY after the user sees the rebuild and approves.
