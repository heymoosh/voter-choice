# Prototype-first rebuild — status & plan

**Branch:** `feat/prototype-rebuild` (off `feat/design-integration`). NOT deployed.
`launch/production` is untouched and still serves the old (drifted) app.

**Decision (user, explicit):** stop re-porting the prototype into hand-written
Tailwind components — that re-port DRIFTED (wrong funding bars, misplaced
"see all votes", per-race loader, split races). Instead **run the prototype's
ACTUAL code as the app** and wire its marked data seams to the real backend.
"Go all the way" — incl. backend data gaps (funding mix, curated fields).

---

## ▶ RESUMING THIS WORK — operational handoff (READ FIRST)

Everything below is the durable plan. This block is the stuff that's NOT in the
commits — machine state + gotchas a fresh session needs.

**Where to work:** worktree `…/.claude/worktrees/design-integration`, branch
`feat/prototype-rebuild`. ~18 commits, `tsc` clean. **NOT deployed**;
`launch/production` untouched.

**Machine state (NOT in git — set during the session):**
- `.env.local` (symlinked: every worktree's `.env.local` → repo-root
  `/Users/Muxin/Documents/GitHub/voter-choice/.env.local`) now has the real
  **`DATABASE_URL`** (Neon, read-only lookups → real Booker/Norcross data) and
  **`NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`** (autocomplete works). `ANTHROPIC_*` and
  `GOOGLE_CIVIC_API_KEY` are still **blank locally** (Vercel marks them sensitive
  → `vercel env pull` returns empty; get values from the source dashboards).
- Dev server: `npm run dev` from the worktree, serves `localhost:3000`. Restart
  after editing `.env.local` (NEXT_PUBLIC vars are read at startup).

**Architecture (the key mental model):**
- `src/prototype/VoterChoiceApp.tsx` is the **living app code** — a one-time
  verbatim concat of `prototype/*.jsx` (UI only), `@ts-nocheck`. Edit it directly
  (NOT auto-regenerated). `prototype/` stays as the pristine reference.
- `src/prototype/data.tsx` (`@ts-nocheck`) = the data seam: mock data + mutable
  `let` ballot bindings + setters (`applyRealRaces`, `applyRaceData`,
  `setRealStateCode`, `setRealElectionType`). ES module **live-bindings** flow
  real data into the verbatim accessors the UI calls.
- `src/prototype/realData.ts` (typed) = the real fetch layer (race-data, civic,
  extract-ballot, party-filter helpers).
- `src/app/page.tsx` mounts the App client-only (`ssr:false`). `layout.tsx` loads
  the prototype CSS via static `<link>` from `/public` (NOT Next's CSS pipeline —
  Lightning CSS rejects the browser-valid prototype CSS).

**Verification recipe (how to drive it):**
- Use Playwright MCP on `localhost:3000`. **Clear `localStorage` between drives**
  (`() => localStorage.clear()` then re-navigate) — the prototype persists
  sessions and will resume mid-flow otherwise.
- `/api/civic` returns **503 locally** (blank key) — EXPECTED; the flow handles it
  by routing to the upload/paste screen. So the **paste path is the
  locally-verifiable ballot path**; PDF upload → `/api/extract-ballot` needs the
  Anthropic key (prod only).
- The cold-open uses the prototype's FAKE issue interpretation (no LLM locally) —
  fine for driving to the workspace. For real alignment scores, the locked issues
  need `canonicalIssue` (the "Use a starter profile" / PRESET_ISSUES path has it).
- ⚠️ legacy gotcha: the OLD e2e ran `npm run start` (prebuilt `.next`) — always
  rebuild before that. The rebuild verifies via `npm run dev` instead.

**Next steps (priority order):**
1. **Chat seam** — `mockAIReply` (in the bundle's App) → real `/api/chat`
   (streaming, needs RAG context for the active race). Last mock in the core flow.
2. **Phase 3** — funding enrichment (FEC small/large/PAC + industry) + curated [Δ].
3. **Polish** (backlog/commits): full state-rule party-gate UX (statute +
   semi-closed lanes via `getStateRule`); autocomplete green-border match;
   general text-paste candidate grouping; state-specific SOS links + real county.
4. **Cleanup** — delete the old drifted app (`BallotToolClient`, `RacePatterns`,
   `ChatPanel`, `FunderBars`, `CompareModal`, …) + their `*.test.tsx`/e2e; keep
   backend tests; full gate; **deploy only after user review**.

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

## Phase 2a — VERIFIED with real data (2026-06-03)

Local `.env.local` now has the real Neon `DATABASE_URL` (symlinked canonical at
repo root; Vercel's sensitive vars pull empty — got it from Neon console). Local
`/api/race-data` resolves Booker (scoreCount + `$16,808,282` raised), and the
re-driven NJ flow renders **real** data in the rebuilt prototype cards:
"Aligned on 11 of 18 votes · 61%" insulin, 56% avg. So Phase 2a is confirmed
end-to-end locally, not just wiring. (DB lookups only; Anthropic/Civic keys still
blank locally — fine, the rebuild drives via paste + example issues.)

## Phase 2b — civic/flow seam (NEXT, fully scoped — no gap)

**Concrete API shapes (from the old app):**
- civic: `POST /api/civic {address}` → `{contests, pollingLocations, …}` →
  `deriveRaces({contests})`. (state for stateCode comes from the civic
  jurisdiction / address.)
- PDF upload: `FormData` field `file` → `POST /api/extract-ballot` →
  `BallotExtraction` → `extractionToRaces(extraction)`.
- text paste: `parseBallotContent(text)` → contests → `deriveRaces({contests})`
  (NO API call for plaintext — see old `BallotLookupNeeded.tsx` ~636).

**Correction:** the prototype is NOT missing the upload screen. `NoContestedView`
(prototype-screens-c.jsx, `data-testid="ballot-lookup-needed"` — same as the old
app) IS the civic-empty → upload/paste ballot screen: textarea (paste) + file
input (upload) + multi-step processing that mocks `/api/extract-ballot`, then
`onBallotConfirmed(source)`. So the whole flow wires to the prototype's own screens.

**Wiring (all pieces exist + are client-safe — `deriveRaces` + `extractionToRaces`
are pure/synchronous):**
- `realData.ts`: add
  - `fetchBallotFromAddress(address)` → POST `/api/civic` → if `contests` →
    `deriveRaces({contests})` → `Race[]`; else `null` (→ upload/paste screen).
  - `fetchBallotFromText(text)` / `fetchBallotFromFile(file)` → POST
    `/api/extract-ballot` → `extractionToRaces(extraction)` → `Race[]`.
- `handleSubmitAddress(addr)` (bundle): `await fetchBallotFromAddress` →
  contests? `applyRealRaces(races)` + `setRealStateCode(state)` + 'loading'→
  coldopen/workspace : route to `'nocontested'` (upload/paste).
- `NoContestedView.beginProcessing(source)`: replace the fake timer with the
  real extract call → `applyRealRaces(races)` → `onBallotConfirmed`.
- Then **party gate + party-filter** (#25): show the `getStateRule(state,
  electionType)` gate for primary states; filter partisan contests to the
  selected party (general → no gate, all candidates). electionType from
  `getStateData.findUpcomingElection()` (note backlog: state JSONs need the
  Nov general so it transitions off primary).
- Remove the TEMP NJ seed in data.tsx once the address/upload path populates RACES.

Old-app reference for the real calls: `BallotToolClient.tsx` (civic POST ~358,
extract-ballot success handler ~501/573, races bridge ~621–636).

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
