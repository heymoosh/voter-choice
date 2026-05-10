# Work Packet: launch-fifty-state-expansion

Status: Phase 1 ready
Source: `/Users/Muxin/.claude/plans/am-running-e2e-jaunty-crab.md` (approved 2026-05-10).
Branch: launch/production

## Intent

Verify the existing 9-state population works end-to-end via Playwright, then populate the remaining 41 states + DC with research-grade data so every US voter sees state-specific election information instead of the federal-deadline fallback. After this packet, `getStateData(stateCode)` returns a real fixture (not the fallback) for all 50 states + DC.

## Phases

**Phase 1 — Playwright coverage** for all 9 populated states (TX, CA, NY, FL, GA, NC, NH, AZ, NM) + a Wyoming fallback test. Extends `e2e/ballot-tool.spec.ts`. Closes the browser-side regression gap before Phase 2 lands 42 new fixtures.

**Phase 2 — 41 states + DC** via four parallel subagents (NE, SE, MW, W batches), research-grade quality (SoS website + at least one secondary source per state, sources cited inline in fixture top comments).

## Phase 1 deliverables

- Extend `e2e/ballot-tool.spec.ts` with 6 new test blocks: NY, FL, GA, NC, NH, plus a Wyoming fallback case. Existing TX + CA + AZ/NM tests stay.
- Per state: navigate to `/`, enter a sample zip, confirm research view loads, confirm `IdView` renders correct state name, confirm registration deadline matches fixture, confirm runoff gate fires only for TX + GA.
- Wyoming test: confirm graceful fallback (no crash, fallback messaging visible, no runoff gate).
- Reuse existing `fillAddress` / `expectStateLanded` helpers if present; otherwise add small shared helpers.

Sample zips per state:
- NY = 10007 (Manhattan)
- FL = 32399 (Tallahassee)
- GA = 30303 (Atlanta)
- NC = 27601 (Raleigh)
- NH = 03301 (Concord)
- WY (fallback) = 82001 (Cheyenne)

Phase 1 acceptance:
- `npm run e2e` passes; all 9 populated states + Wyoming covered.
- `npm run lint`, `npm run test`, `npm run build` clean.
- No flaky tests (run twice; both pass).

Phase 1 constraints:
- Do NOT touch `src/components/`, server code, or any state fixture in this phase. Phase 1 is browser-side verification only.
- Do NOT add npm dependencies.
- Do NOT touch ES content.

## Phase 2 deliverables

42 new state fixtures populated to research-grade quality. Three edit points per state:
1. `src/data/states/<CODE>.json` — full schema matching `TX.json` template.
2. `src/lib/getStateData.ts` — add to `stateModules` map.
3. `src/lib/lookupZip.ts` — add prefix range tuple(s) to `prefixRanges`.

Plus per-state assertions in `getStateData.test.ts` and zip test in `lookupZip.test.ts`.

### Subagent batching

- **NE Agent** (10 + DC = 11): ME, VT, MA, RI, CT, NJ, DE, MD, PA, DC.
- **SE Agent** (10): AL, AR, KY, LA, MS, OK, SC, TN, VA, WV.
- **MW Agent** (12): IL, IN, IA, KS, MI, MN, MO, NE, ND, OH, SD, WI.
- **W Agent** (10): AK, CO, HI, ID, MT, NV, OR, UT, WA, WY.

Total: 43 jurisdictions across the 4 agents (one batch is 11 due to DC; others 10–12). Region-bucketed for review cohesion only — no functional reason.

### Per-state research-grade requirements

Each fixture's TOP-OF-FILE comment must cite:
- **Primary**: state SoS election website URL.
- **Secondary**: NCSL voter-ID DB / Vote.org / Ballotpedia URL.
- **Date checked** (today's date, 2026-05-10).
- Any discrepancies between sources documented inline.
- For uncertain 2026-cycle dates: `// TODO verify for 2026 cycle` comment + most recent known value (2024 cycle is fine).

### Runoff rules — known party-locked states

Default: `{ hasRunoff: false, partyLockedToFirstRoundPrimary: false }`.
Override only with SoS confirmation. Known legislative-primary runoff states with party-lock: AL, AR, MS, OK, SC, SD (plus already-populated TX, GA).

### Phase 2 acceptance criteria

- 50 states + DC populated. `getStateData(stateCode)` returns non-fallback for every US state code.
- Each new fixture has top-comment with SoS URL + secondary source + date checked.
- `lookupZip.ts` `prefixRanges` covers every state.
- `getStateData.test.ts` has at least one assertion per new state.
- `lookupZip.test.ts` has at least one zip test per new state.
- `npm run lint`, `npm run test`, `npm run build`, `npm run e2e` all green.

### Phase 2 out of scope

- Territories (PR, GU, VI, AS, MP).
- Per-state county-level resources (state-level only).
- Adding Playwright tests for newly-populated states (Phase 1 sample is enough).
- Spanish-path content.
- Any v2 UI / prompt / structured-block changes.

### Phase 2 constraints

- Do NOT touch `src/components/`, server code, prompts, ingest scripts, or v2 UI.
- Do NOT add npm dependencies.
- Do NOT touch ES content.
- Do NOT invent fictional addresses or zip codes — use real values from the SoS or USPS prefix tables.
- Do NOT skip the source citation in the fixture top comment — research-grade discipline.

### Single verifier after Phase 2

Runs at the end with full lint/test/build/e2e + grep audit + spot-check of 5 random new fixtures' source citations + acceptance walk.

## Notes

Reuse contracts:
- Canonical fixture shape: `src/data/states/TX.json` (264 lines).
- Fallback shape contract: `getFallbackStateData()` in `src/lib/getStateData.ts`.
- Runoff rule schema: TX = party-locked, GA = party-locked, NC = open runoff. Use these as references for AL/AR/MS/OK/SC/SD.

Phase order: Phase 1 first → verifier → commit → push. Then Phase 2 with parallel subagents. Then verifier on the combined Phase 2 result → commit → push.
