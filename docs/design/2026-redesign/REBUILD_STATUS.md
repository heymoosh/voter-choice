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
`feat/prototype-rebuild`. `tsc` clean. **NOT deployed to launch/production**; a
Vercel PREVIEW exists for testing (below). Branch is **local-only — never pushed to
origin** (a same-machine new session inherits all commits from this worktree directly).

### ▶▶ Session 2026-06-05 — shipped + read-this-first
**Shipped (committed, gated green, NOT on launch/production):**
- **F1 large-format misread — fixed via sample-and-reconcile** (`extract-sampler.ts`;
  commits `ed36368`/`2611f48`), verified end-to-end through the real route. Cache
  version bumped to **v3** (evicted poisoned entries). Residual + the rejected tiling
  path documented in `F1_EXTRACTION_HANDOFF.md`.
- **Handoff-modal Print + Save-profile buttons wired** (`a8b864c`) — were dead.
- **Usage-block observability** (`d52dbd9`): `usage-telemetry.ts` `recordBlock` logs a
  `usage.blocked` line + per-reason daily Redis counter (`voter-choice:blocks:<day>:<reason>`)
  at EVERY block point in chat + extract; client now shows distinct messages per code.
- **Backlog heavily updated** from Muxin's preview test — see `docs/operations/post-launch-backlog.md`
  (address-based logistics, hardcoded-TX/Harris sweep, budget-misfire, tip-jar, broadened
  election-data, extraction accuracy).
- **Preview URL (behind Vercel SSO — log in as muxinli):**
  `https://voter-choice-97lt6tilk-mooshs-projects-0635287d.vercel.app`

**⚠️ DO THIS FIRST (likely a regression I introduced):** the **"Community AI budget used
up" modal MISFIRES** — shown to a voter who never chatted. Live budget is only **$0.87
(1.7% of $50)** and the new tracker logged **zero** server blocks → it's a CLIENT-SIDE
misfire, most likely from this session's observability deploy (the `budget_exhausted`
derivation in `realData.ts streamChatReply` / `resolveChatBlock` → `setBudgetExhausted`).
Full write-up in the backlog `[P1] "Community AI budget used up" modal misfires`.

**Deploy mechanics (so the gate doesn't block you):** preview = `vercel deploy --yes --force`
from this worktree. Vercel REJECTS deploys whose HEAD commit author email isn't a linked
account — author deploy-bound commits as `Muxin Li <muxin.li.pro@gmail.com>` (the build-agent
default email is rejected). Pushing `feat/prototype-rebuild` does NOT deploy; only
`launch/production` does.

**Machine state (NOT in git — current as of 2026-06-04):**
- `.env.local` (symlinked → repo-root `.env.local`) now has REAL values for ALL
  keys: `DATABASE_URL` (Neon), `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`,
  `ANTHROPIC_VOTER_API`, `GOOGLE_CIVIC_API_KEY`, `FEC_API_KEY`, and
  `UPSTASH_REDIS_REST_URL` + `_TOKEN`. (User added Anthropic + FEC + fixed a
  malformed Upstash token mid-session.) So locally chat, ballot extraction, civic,
  the FEC funding ingest, AND the durable rate limiter all WORK now.
- ⚠️ The rate limiter behind chat + extract-ballot **FAILS CLOSED**
  (`RATE_LIMIT_UNAVAILABLE`) when Upstash errors/auth-fails — a malformed token
  silently blocked both routes (we hit exactly this; the PDF "wasn't parsing" was
  this, not the Anthropic key). When Upstash is UNSET it falls back to in-memory.
- Dev server: running in the BACKGROUND (`npm run dev`, :3000). Restart after any
  `.env.local` edit — env is read at startup (the key + Upstash fixes only took
  effect after a restart).
- ⚠️ PROD DB write done this session: Booker + Norcross have real FEC
  small/large/PAC funding rows (scoped `db:donors-federal --name booker,norcross`,
  UPSERT-ONLY). Their stale `total_receipts` rows were KEPT (user chose upsert-
  only), so the LIVE app (old code, no read-time filter) now DOUBLE-COUNTS those
  two (~$30M) until the rebuild deploys. Cleanup = re-run with `--drop-legacy`
  (destructive DELETE; gated on explicit approval — auto-gate blocks it otherwise).

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
- `/api/civic` WORKS now (key present). For a June PRIMARY it returns no contests
  → routes to the upload/paste screen (that's how to reach the upload flow).
- PDF upload → `/api/extract-ballot` WORKS now (Anthropic key). NOTE `election_type`
  + `jurisdiction` live under `extraction.election_metadata` (NOT top-level —
  reading top-level silently broke the primary party gate; fixed in `9efc2ee`). A
  primary → party gate fires → pick D/R → `filterRacesByParty` filters to that
  party. Booker/Norcross resolve to REAL DB data; primary challengers don't (→
  the no-record card + on-reveal web research).
- Cold-open: "show me an example" → Send loads PRESET_ISSUES (with
  `canonicalIssue`) → "Lock these in" → real `/api/race-data`. The fake issue
  interpretation is fine for driving.
- ⚠️ Playwright's file-upload tool only accepts paths under the agitated-shockley
  worktree (or its `.playwright-mcp`); copy the test PDF there first.
- Each PDF extraction + each candidate web-research is a real LLM call on the
  community budget — drive deliberately (don't re-extract needlessly).

**Session 2026-06-04 — shipped (all on `feat/prototype-rebuild`, NOT deployed):**
- Chat seam (`mockAIReply` → streaming `/api/chat`): `f20cdb6`, `f0a0d45`.
- Funding mix (FEC small/large/PAC; read-time `computeFundingMix` + propagation +
  scoped prod ingest for Booker/Norcross): `8fe87d8` `8819838` `bdf82db` `8c4c1a8`.
- Blind-mode name-leak fixes (office-only labels + chat-RAG anonymization):
  `c5fae03`; `stateCodeFrom` "MY BALLOT" fix `9ca4c14`.
- Analyzing-loader copy fix `ad023bb`; primary party-gate fix
  (`election_metadata` path) `9efc2ee`.
- On-reveal candidate web research (anonymity-gated PROSE card) `3801176`
  — ⬇️ being REWORKED, see NEXT TASK.

**⏭️ NEXT TASK (new direction — user, 2026-06-04): auto-populate missing candidates.**
Build a persistent store ("our own DB") for candidates whose histories we lack:
**webfetch → populate STRUCTURED, issue-scored data → persist → render via the
SAME issue-based alignment UX (the % bars) as DB candidates.**
- DO NOT change the core UX. NO "web research · not a verified record" prose blob
  — REWORK/remove the `3801176` card path (it shows prose); the new path must feed
  the normal alignment + funding rendering.
- Persistence: user chose a **new prod DB table** (candidate-data / research),
  read by race-data like DB data; key by candidate (name + jurisdiction + cycle).
  (The KV-cache + issue-agnostic options were considered then declined — the user
  explicitly wants issue-based scoring preserved, NOT generic prose.)
- ⚠️ CORE DESIGN PROBLEM to solve first: our alignment % is VOTING-RECORD-based
  (`lookupAlignment` → real votes). Most no-DB candidates are challengers with NO
  voting record → nothing to vote-score → can't honestly say "Aligned on N of M
  votes." Web research surfaces STATED POSITIONS, not votes. So a webfetched score
  is position-based — same UX shape, weaker basis. Decide how to derive + LABEL it
  honestly. `AlignmentScoresEntry.sourceType` (`voting_record` vs other) in
  `structured-blocks.ts` is the likely hook.
- Anonymity: structured scores (kept/total %) are name-AGNOSTIC → blind-safe like
  Booker's (vote narratives already run through `anonymizeText`). So the on-reveal
  gate the prose needed is likely UNNECESSARY here; the webfetch uses the real name
  server-side but the stored RESULT is name-free.

**Other backlog:** `--drop-legacy` cleanup of the Booker/Norcross `total_receipts`
double-count; full federal funding sweep (fuzzy name→FEC resolution risk);
industry breakdown (FEC `by_employer` 404s); full state-rule party-gate UX;
state-specific SOS links + real county.
- **Rich per-state voter-ID lists (user request, 2026-06-04).** `voter-id-rules.ts`
  ships NCSL-verified `idRequired` + category-level `note` for all 50+DC, but a
  fully verified `acceptedIds` LIST only for TX + GA; the other ID-required states
  carry category-level notes (no fabricated specifics — deliberate). Backlog: give
  every state with a wide variety of accepted IDs its own per-state-sourced list
  (state SoS sites), with `lastVerified`/source tracking. Not urgent.
- **F1 — large-format extraction misread. INTERIM stopgap shipped; ROOT-CAUSE FIX
  DEFERRED TO BACKLOG (user, 2026-06-04 — "doesn't affect the majority of ballots/users").**
  Interim: sampling-with-abstention (`extract-sampler.ts`, commits `ed36368`/`2611f48`) —
  large-format ballots extract N=3× + reconcile by majority → mostly honest gaps, but a
  semi-stable hallucination can still leak in the densest column (residual). This is the
  KNOWN limitation of the bake-off's C2 (Sonnet-vision-direct) winner: on NJ Camden it hit
  only 87% candidate completeness, "missing names on the dense REP slates." The PLANNED
  root-cause fix is already in `docs/operations/post-launch-backlog.md`:
  **[P0] run Contender 1 (AWS Textract Forms + Sonnet)** — form-native, the intended v2
  architecture (skipped only for missing AWS creds) — plus the **per-race confidence signal
  + voter-facing "low-confidence extraction" warning**. Sampling stopgap to be revisited
  (likely reverted) once Textract lands. Not urgent; deferred.

> **⚠️ Blind-mode anonymity invariant (commit `c5fae03`).** Candidate names must
> NEVER appear outside the candidate card's reveal control. Two wiring leaks were
> fixed + verified: (a) `parsedTextToContests` no longer puts a candidate name in
> the contest `district` (deriveRaces builds the race LABEL from office+district,
> so a name there leaked into header/rail/ballot/chat-placeholder) — it now groups
> a roster under one office; (b) the chat RAG anonymizes blinded names to
> "Candidate A/B" before sending + adds a BLIND MODE instruction, so the model
> never receives a real name. When adding ANY new seam, re-check both: derived
> labels (office only) and anything sent to the model.
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

## ✅ Phase 2c — chat seam DONE (mockAIReply → real `/api/chat`)

The per-race Q&A box now streams from the real chat route. Last mock in the core
flow is gone.

**Wiring:**
- `realData.ts` adds: `getChatSessionId()` (stable per-tab id, reuses the old
  app's `voter-choice:sessionId` key), `buildRaceChatSystemPrompt(...)` (grounded
  NON-PARTISAN Q&A prompt — serializes the race's REAL racePatterns +
  alignmentScores as JSON + the voter's ranked issues), and `streamChatReply(...)`
  (POSTs `/api/chat`, consumes the SSE protocol `data:{type:text|done|error}`).
- Bundle: `handleSendChat`/`handleRetryChat` are now async. They append the user
  bubble + a fresh empty AI bubble tracked by a unique `_id` (NOT "last" — so
  concurrent sends to one race can't cross-contaminate), stream text into that
  bubble, and on ANY failure drop the bubble + raise `chatTimeouts[raceId]` →
  the prototype's existing `AITimeoutBanner` + retry. `mockAIReply` and its
  keyword-error sim (`/timeout|fail|error/`) are deleted.
  `handleSendChat` also trims any dangling trailing `user` turn (left by a prior
  failed or still-empty in-flight send) before appending the new one, so the
  payload always alternates and never sends `[…, user, user]` (API-rejected).
- **Legacy route path on purpose:** we send NO `view` field, so the route passes
  our `systemPrompt` through verbatim (no server-side prompt fleet / card-block
  builder). The prompt therefore carries its OWN safety framing and forbids
  markdown + bracket blocks (the prototype bubble renders raw text, not Markdown).

**Verified locally (Playwright, paste path):** drove home→address (civic 503)→
paste NJ ballot→cold-open→lock issues→workspace with REAL data (Booker
"11 of 18 votes · 61%", "$16.8M raised"). Sent a chat message:
- POST `/api/chat` fires with the exact contract: keys
  `{messages, systemPrompt, sessionId, messageCount}`, NO `view`, `messages`
  `[{role:"user", content}]`, `messageCount` a number, `systemPrompt` (~4.2k
  chars) containing the real RAG data (`16808282`).
- Local route 500s (blank `ANTHROPIC_VOTER_API`) → `onError` → user bubble stays,
  empty AI bubble removed, `AITimeoutBanner` shows. "Try again" re-fires without
  duplicating the user bubble; payload still ends on the `user` turn.
- **Streaming render + multi-turn verified locally** by injecting a synthetic SSE
  stream at `window.fetch`: text frames concatenate into the bubble, `onDone`
  completes cleanly, a 2nd turn POSTs `[user, assistant, user]` (`messageCount`
  1→3→5). After a forced mid-conversation failure, the next send correctly drops
  the dangling user turn → still valid alternation (no `[…, user, user]`).
- **Only the REAL Anthropic-backed reply is prod-only** (needs the key — same
  constraint as civic/extract). SSE parsing lifts ChatPanel's
  `processSSELine`/`streamResponse`.

⚠️ **Bug found (pre-existing, flagged separately):** `stateCodeFrom` returns "MY"
for ballots whose text starts with "MY BALLOT" (the app's own .txt export header)
— the 2-letter fallback grabs the first uppercase pair. Surfaced as
`research "<race>" in "MY"` in the chat prompt; also affects the party gate +
race-data stateCode. Fix is upstream in `stateCodeFrom`, not the chat code.
(Fixed by a spawned task — `stateCodeFrom` now validates against real state
codes + prefers the trailing match.)

## Phase 3 — funding mix (small/large/PAC) — CODE DONE, DATA WRITE PENDING

**Decision (user):** enrich the prod DB with the real FEC breakdown (not a
read-time-only workaround). The prod Neon DB is shared with the LIVE app, so the
write is deliberate.

**Proven (read-only, FEC public API):** the breakdown is one call away. Booker
2026 = Small $8.1M (60%) / Large $5.0M (37%) / PAC $0.49M (4%); Norcross = PAC-
heavy (51%). FEC totals endpoint: `individual_unitemized` / `individual_itemized`
/ `other_political_committee_contributions`.

**Code shipped (commits `8fe87d8`, `8819838`, `+ propagation fix`; tsc + tests green):**
- `race-data.ts computeFundingMix` → `fundingMix {small,large,pac,total,cycle}`,
  `total = small+large+pac` (immune to any industry double-count). Propagated onto
  the assembled candidate (a follow-up fixed a cherry-pick that dropped it).
- `donors.ts` non-destructive `total_receipts` filter (drops the legacy bucket
  only once a real breakdown exists; never strips a not-yet-ingested candidate).
- `federal-donors.ts`: PAC → clean `"PACs"` bucket (was `"Other"`); `--dry-run`,
  `--name a,b` (SQL filter), `--drop-legacy` (scoped post-upsert total_receipts
  delete — NOT used, see below); **self-resolves FEC ids** via name+office+state
  search (our federal rows have bioguide ids + `[D-NJ]`-style names, no stored
  FEC id — the ingest skipped everyone without this).

**✅ VERIFIED end-to-end on REAL prod data (2026-06-04):** ran the ingest scoped
to Booker + Norcross (`--name booker,norcross`, upsert-only, 12 rows). `/api/race-
data` for Booker returns `fundingMix {small:60,large:37,pac:4,total:13617405,
cycle:"2026 cycle"}`; the rebuild workspace renders the mix bars
("60% small / 37% large / 4% PACs · $13.6M raised"), `total_receipts` filtered
out (no double-count). User supplied the real `FEC_API_KEY` locally (blank by
default — `DEMO_KEY` is rate-limited and 429'd).

**Decisions taken:**
- **Upsert-only (user's call):** `total_receipts` rows were KEPT, not dropped.
  Consequence: the LIVE app (old code, no read-time filter — confirmed it sums all
  buckets) now DOUBLE-COUNTS Booker/Norcross (~$30M) until the rebuild deploys.
  Accepted as temporary. To clean up: run with `--drop-legacy` (a destructive
  DELETE — needs explicit approval; the auto-gate correctly blocked it).

**Remaining:**
- **Full federal sweep** — only Booker + Norcross are enriched. The rest of the
  ballot's federal candidates still show the legacy bar. A full run uses fuzzy
  name→FEC resolution (disambiguation risk, esp. common House names) + changes the
  live app broadly → separate decision.
- **Deferred (separate FEC issue):** industry breakdown — FEC's
  `schedule_a/by_employer` endpoint 404s (even with the real key), so industry
  buckets stay empty. Not needed for the funding-mix bars.

## Data seams to wire (Phase 2) — prototype-app.jsx + prototype-data.jsx

`prototype-data.jsx` header says it: *"shaped to match src/lib/structured-blocks.ts"*.
It IS the contract + the test oracle. The mock globals/accessors to replace:

| Mock symbol | Real source | Notes |
|---|---|---|
| `RACES` (const) | `/api/civic` (+ `/api/extract-ballot`) → `deriveRaces()` | grouped Race[] |
| `getRacePatternsForRace(id)` → `{race,candidates}` | `POST /api/race-data` → `data.racePatterns` | shapes already match |
| `getAlignmentScoresForRace(id)` → `{race,entries}` | same call → `data.alignmentScores` | |
| `mockAIReply(id,text)` | `POST /api/chat` (streaming) | ✅ DONE (Phase 2c) |
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
