# Refactor proposal — July 2026

## Summary

The codebase is in fine, not alarming, shape: the core money/data paths (chat, alignment,
race-data, delegation) work and are covered by tests, and nothing found here is an active bug.
The mess is concentrated in three predictable places instead: 53 near-identical state
donor-ingest scripts that all reinvent the same helpers, a graveyard of ~65 one-time migration
scripts and a dozen orphaned library modules nobody imports, and a handful of very large
hand-authored files (the chat API route, race-data assembly, delegation resolution) that have
grown several unrelated jobs each. The headline recommendation is: don't do a big-bang
"refactor sprint" — pick off the candidates below independently, cheapest and lowest-risk
first, and treat the two money/security-adjacent gaps (rate-limiter test coverage, donor-script
consolidation) as the highest-leverage use of refactor time if only one gets greenlit.

## Refactor candidates

### 1. Consolidate the 53 state donor-ingest scripts
- **Touches:** `scripts/ingest/*-donors.ts` (all 53 state files)
- **Problem:** Every state script re-implements the same ~150-250 lines from scratch: the
  `SUFFIXES`/`norm()`/`extractLastName()` name-normalization trio (identical in `ak-apoc-donors.ts:78-99`
  and `al-fcpa-donors.ts:79-97`, present in 26-51 of 53 files), a hand-rolled CSV-line parser
  (24 files, byte-identical), an ESM entry-point check (37 files, byte-identical), and the
  aggregate-upsert loop (`onConflictDoUpdate`, 53/53 files). Only CSV column names and each
  state's bucket-classification rules actually differ.
- **Effort:** L (53 files to touch, even if each edit is mechanical)
- **Risk:** Low-medium. The shared logic is well-understood and already proven identical across
  files, but donor money totals are voter-facing, so every state needs a before/after row-count
  and dollar-total diff, not just "it compiles."
- **Careless failure mode:** Silently changing bucket-classification or name-matching behavior
  for one state while "simplifying" it — this would misattribute or drop real donor dollars for
  that state without anyone noticing until an audit.

### 2. Unify the four rate-limiter/spend-guard clones and give them real tests
- **Touches:** `src/lib/server/polis/route-guard.ts:63-86`, `src/lib/server/race-data-rate-limit.ts:32-59`,
  `src/lib/server/counters-rate-limit.ts:20-47`, `src/lib/server/research-spend-limit.ts:28-53`,
  plus `src/lib/server/durable-store.ts` underneath all of them.
- **Problem:** Four modules implement the identical fixed-window limiter (Redis `INCR`+`EXPIRE`,
  in-memory fallback map, fail-open/fail-closed on error) differing only in window/max/key
  prefix — `counters-rate-limit.ts` and `race-data-rate-limit.ts` are line-for-line identical in
  structure. Worse, the limiter guarding a billable route
  (`race-data-rate-limit.ts`, consumed by `research-candidate/route.ts` and `race-data/route.ts`)
  has **zero test coverage of its real fail-open behavior** — the one test that touches it mocks
  it out entirely — and `race-data/route.ts` itself has no test file at all despite ~180 lines of
  validation logic.
- **Effort:** M
- **Risk:** Medium — this code sits directly in front of spend and abuse controls, so any
  consolidation must add tests for the fail-open/fail-closed branch *before* changing behavior,
  not after.
- **Careless failure mode:** Merging the four limiters into one and getting the per-route
  window/max wrong, or flipping a fail-closed route to fail-open, silently reopens the exact
  denial-of-wallet risk the security audit already flagged for `research-candidate`.

### 3. Remove confirmed-dead code
- **Touches:** `scripts/ingest/_*.ts` (~65 of 72 underscore-prefixed one-time migration/audit
  scripts — cutover, pole, sub-issue, gold-sample work all documented as complete), root-level
  scratch scripts (`classify-bills.ts`, `verify-batches.ts`, `verify-insert.ts`), and orphaned
  `src/lib` modules with zero callers anywhere (`i18n.tsx`, `peerComparison.ts`,
  `getDeadlineStatus.ts`, `generatePrompt.ts`, `ballot-json-to-text.ts`, `chat-catch-heuristic.ts`,
  `ballot-utils.ts`, `normalizeCandidateName.ts`, `pdf-extract.ts`, `lookupCounty.ts`,
  `researchMode.tsx`, `useRaceData.ts`).
- **Problem:** Grepping for imports of each file across the whole repo returns zero hits outside
  the file's own test. Several are explicitly documented elsewhere as superseded (e.g.
  `docs/ISSUE_DIRECTIONALITY_DESIGN.md` calls out `_classify-batch.ts` as a byte-identical dupe
  replaced by `tag-bills.ts`).
- **Effort:** M (mostly deletion, but 80+ files to verify individually)
- **Risk:** Low, with two exceptions worth flagging to Muxin rather than just deleting:
  `candidateIdentity.ts` and `anonymizeText.ts` are unused *lib* copies, but their header
  comments describe them as "the single source of truth" for blind-mode identity redaction —
  the app actually uses inline duplicates in `VoterChoiceApp.tsx` instead. Deleting the lib
  versions without deciding whether to wire them in (vs. the inline copies) just papers over an
  open question about which redaction logic is authoritative.
- **Careless failure mode:** Deleting a file that's reached dynamically (dynamic `import()`,
  `npm run` script name, or CI workflow step) rather than via a static import, which grep-based
  verification can miss — worth a second pass checking `package.json` and `.github/workflows/*`
  before removing anything, and a final `npm run build` + test run after.

### 4. Extract a shared API request-validation helper
- **Touches:** `src/app/api/alignment/route.ts:66`, `src/app/api/donors/route.ts:55`,
  `src/app/api/counters/route.ts:37`, `src/app/api/race-data/route.ts:43`,
  `src/app/api/chat/route.ts:1480`.
- **Problem:** Five route files hand-roll the same sequential
  `if (!field || field.length > N) return 400` validation chain for overlapping field types
  (candidate name, state code, election cycle, etc.) with no shared helper — this is also what's
  driving several of the eslint complexity warnings (e.g. `race-data/route.ts` `parseBody`
  complexity 36).
- **Effort:** S
- **Risk:** Low — validation logic is easy to test field-by-field before and after.
- **Careless failure mode:** Subtly loosening or tightening one field's length/format check
  while generalizing it (e.g. a stricter shared regex rejects a previously-valid state code),
  which would surface as a confusing 400 error for real users.

### 5. Split the largest hand-authored files by concern
- **Touches:** `src/app/api/chat/route.ts` (1791 lines — validation, prompt-building, SSE
  streaming, and tool resolution all in one file; `renderBuilder` complexity 32),
  `src/lib/structured-blocks.ts` (1113 lines, 4 independent block families interleaved),
  `src/lib/server/race-data.ts:375-605` (`assembleRaceData`, complexity 30, doing 5 distinct
  jobs per candidate), `src/lib/server/delegation.ts:216-389` (`resolveDelegation`,
  complexity 32), `src/lib/server/alignment.ts` (934 lines, 4 distinct concerns).
- **Problem:** These are the repo's real hand-maintained core logic (not the generated
  `src/prototype/**` files, which are intentionally excluded from this list — they're verbatim
  ports of design code and shouldn't be hand-split). Each file/function bundles multiple
  independent concerns that could be extracted into named helpers with no behavior change.
- **Effort:** L (this is the deepest, most central logic in the app — chat streaming, alignment
  scoring, delegation resolution)
- **Risk:** High. These files sit directly on the money (chat spend) and data-integrity
  (alignment scores, delegation seats shown to a voter) paths, and each has large existing test
  files (`alignment.test.ts` is 1914 lines) that would need to move/split in lockstep.
- **Careless failure mode:** A mechanical-looking split that changes evaluation order (e.g. the
  3-tier alignment fallback chain in `assembleRaceData` — voting record → sibling chamber →
  web-search → research-pending) could silently change what a voter is told about a candidate's
  position.

### 6. Add tests for silent-failure-prone, voter-facing surfaces
- **Touches:** `src/lib/server/extract-vision.ts`, `src/lib/server/extract-pdfjs.ts` (ballot
  extraction — currently only exercised via full mocks), `src/lib/voter-id-rules.ts` (per-state
  voter-ID data, no test at all), `src/lib/prompts/research-candidate-structured.ts` (billable
  research sub-agent prompt, no golden test unlike its sibling prompts).
- **Problem:** These are pure gaps, not code smells — no refactor needed, just tests. A silent
  bug in ballot extraction misinforms a voter about what's on their ballot; wrong voter-ID data
  could get someone turned away at the polls; the untested research prompt both costs money and
  writes directly into voter-facing candidate stances.
- **Effort:** S-M (test-writing only, no production code changes)
- **Risk:** Low — adding tests cannot regress behavior.
- **Careless failure mode:** None to production code; the only risk is time spent writing tests
  that don't actually exercise the real failure modes (e.g. re-mocking the thing you meant to
  test for real).

## Recommended sequencing

1. **#6 (add tests) and #4 (shared validation helper) first** — pure upside, near-zero risk,
   and #6 in particular builds a safety net under #2 and #5 before anyone touches them.
2. **#3 (delete dead code) next** — low risk, immediate clarity win, and shrinks the surface
   area before the bigger structural work below.
3. **#2 (rate-limiter consolidation) third** — money/security-adjacent, so do it only after its
   own tests exist (from step 1), and treat it as higher-leverage than #1 despite similar effort.
4. **#1 (donor-script consolidation) fourth** — highest raw effort (53 files) but mechanical and
   well-isolated from the app's live request paths; a good "grind it out" project once the
   above is settled.
5. **#5 (split the large core files) last, and only if greenlit explicitly** — highest risk,
   touches money and data-integrity paths directly, and should not be bundled with any of the
   above.

**Nothing in this document is approved for execution.** These are independently-schedulable
proposals for Muxin to review; each candidate should be explicitly greenlit (in whole, in part,
or not at all) before any agent starts work on it. None of these touch production data or
require a database migration.
