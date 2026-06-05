# Hardcoded-Leak Inventory

**Purpose:** spec for Phase-B seam fixes. Every literal TX/Texas/Harris/Houston/handgun/mock
constant that can leak into the rendered UI or print, with `file:line`, leak class, and the
address-derived replacement source.

**Workstream:** WS3 (ws3/logistics branch, 2026-06-05)

**Scope:** `src/prototype/` (demo harness) + `src/components/` + `src/app/` where a literal
leaks into rendered output reachable by a real NJ voter.

**Ground-truth forbidden strings** (from `NJ_GROUND_TRUTH.forbiddenForNj`):
`Texas`, `Harris County`, `Houston`, `TX-7`, `handgun`, `Trini Mendell`, `Precinct 0364`

---

## Summary count

| Class | Count | Description |
|---|---|---|
| A — i18n / view hardcode (always leaks) | 5 | Fixed string literals in i18n dict or JSX that always render with no data-source override |
| B — mock constant (leaks when seam not wired) | 7 | Values in `POLLING_INFO` / `STATE_ELECTION_DATA` that leak when the real-data seam is absent or falls through |
| C — example/tip (leaks into rendered UI) | 2 | "Example address" tips rendered in real error states |
| D — AI prompt hardcode (leaks into LLM context) | 1 | Prompt string that tells the LLM the wrong county/state |

**Total: 15 leak sites**

---

## Class A — i18n / view hardcodes (always leak)

These strings are embedded directly in the i18n translation dictionary or JSX. They render for
every user regardless of address. No seam override exists today.

### A1 — `VoterChoiceApp.tsx:259` — English polling card source line

```
en.polling.cardSource = 'Source · Harris County Elections'
```

**Forbidden strings:** `Harris County`
**Renders at:** `PollingInfoCard` footer (`VoterChoiceApp.tsx:1784`) and `PollingStatusBar`
source line (`VoterChoiceApp.tsx:2088`).
**Fix:** Replace with a dynamic source derived from `pollingData.source.provider` (already
present in `/api/civic` response as `BallotSourceSummary.provider` = "Google Civic Information
API") or the county name from `pollingData.county`. Suggested: `"Source · Google Civic"` as
the always-safe static value, or `"Source · {county} Elections"` when county is available.

---

### A2 — `VoterChoiceApp.tsx:353` — Spanish polling card source line

```
es.polling.cardSource = 'Fuente · Elecciones del Condado de Harris'
```

**Forbidden strings:** `Harris` (embedded in "Condado de Harris")
**Renders at:** same as A1, Spanish locale.
**Fix:** Same as A1 — replace with `"Fuente · Google Civic"` or dynamic county.

---

### A3 — `VoterChoiceApp.tsx:4263` — "See party-gate (TX primary)" dev link

```jsx
<a onClick={onViewPartyGate}>See party-gate (TX primary)</a>
```

**Forbidden strings:** `TX` (abbreviation for Texas), `primary`
**Renders at:** workspace left-rail footer — visible to any logged-in user in the workspace.
**Fix:** This is a developer/demo affordance. Either: (a) remove entirely in production
(gate it with `process.env.NODE_ENV !== 'production'`), or (b) rename to
`"See party-gate (demo)"` to remove the TX reference.

---

### A4 — `VoterChoiceApp.tsx:5392` — `NoContestedView` default county prop

```jsx
county={getRealStateCode() ? 'your county' : 'Harris County'}
```

**Forbidden strings:** `Harris County`
**Renders at:** `NoContestedView` — the "we couldn't find your ballot" screen, line 3350:
`{t('errors.noContestedCountyOffice', { county })}`. Visible when Civic returns no contests.
**When it leaks:** Only when `getRealStateCode()` returns falsy (no address entered or ZIP
lookup failed). This is a real user-reachable path.
**Fix:** Replace fallback with `'your county'` for both branches, or wire the county from
`pollingData.county` (already available from the civic response). The translation key
`errors.noContestedCountyOffice` is `"{county} elections office →"` — `'your county'` renders
safely as "your county elections office →".

---

### A5 — `VoterChoiceApp.tsx:2630` — AI handoff prompt hardcode

```ts
return `I'm researching my Nov 3, 2026 ballot for Harris County, TX.`
```

**Forbidden strings:** `Harris County`, implicit `TX` context
**Renders at:** `buildHandoffPackage` function — the "continue with another AI" clipboard text.
This is rendered into the text the voter copies and pastes into an external chatbot.
**When it leaks:** Any time a voter triggers the "budget exhausted" handoff path.
**Fix:** Replace with `getRealStateCode()` + `countyForPrompt` dynamic values. The real
`BallotToolClient.tsx` already builds a dynamic handoff prompt (`HandoffPackage.tsx`) — this
prototype duplicate should mirror that pattern.

---

## Class B — mock constants (leak when seam not wired)

These are values in `data.tsx` prototype constants. They leak when the real-data seam
(`applyRealRaces`, `getFallbackStateData`, `/api/civic`) is absent or returns nothing.

### B1 — `data.tsx:657-663` — `POLLING_INFO.name/address/precinct`

```js
const POLLING_INFO = {
  name: 'Trini Mendell Elementary',           // line 657
  address: '5750 Hartwick Rd, Houston, TX 77057',  // line 658
  hours: '7:00 AM – 7:00 PM',                 // line 659
  precinct: '0364',                           // line 663
}
```

**Forbidden strings:** `Trini Mendell`, `Houston`, `TX` (in address), `Precinct 0364`
**Renders at:** `PollingStatusBar` name (`VoterChoiceApp.tsx:2047`), address cell
(`:2094`), PollingInfoCard (`:1732`, `:1751`, `:1755`, `:1759`), ICS calendar export.
**When it leaks:** When the workspace view uses `POLLING_INFO` directly (the prototype still
passes this as `pollingInfo` to PollingStatusBar — see `VoterChoiceApp.tsx:4212`).
**Replacement source:** `toBallotLogistics(civicResponse)` → `pollingPlace.{name,address,hours}`.
When civic returns nothing, `pollingPlace` is null — Phase B should render "Find your polling
place at vote.gov" rather than any fabricated location.
**Note:** Hours also mismatch oracle — NJ oracle says `"6:00 AM – 8:00 PM"`, mock says
`"7:00 AM – 7:00 PM"`.

---

### B2 — `data.tsx:756-757` — `STATE_ELECTION_DATA.stateCode/stateName`

```js
const STATE_ELECTION_DATA = {
  stateCode: 'TX',       // line 756
  stateName: 'Texas',    // line 757
```

**Forbidden strings:** `Texas`
**Renders at:** `NoContestedView` (`:5390`) — `STATE_ELECTION_DATA` is passed when
`getRealStateCode()` is falsy (no real address). Also used in `buildHandoffPackage` (indirect).
**When it leaks:** ZIP-only path or when address parsing fails.
**Replacement source:** `getFallbackStateData(stateCode)` — already used in the real code
path when `getRealStateCode()` is truthy. The fix is to ensure the fallback path never falls
through to `STATE_ELECTION_DATA` for an NJ voter.

---

### B3 — `data.tsx:795-803` — `STATE_ELECTION_DATA.votingRules.acceptedIds` (TX handgun license)

```js
acceptedIds: [
  'TX driver license',
  'TX election ID certificate',
  'TX personal ID card',
  'TX concealed handgun license',   // line 799
  ...
]
```

**Forbidden strings:** `handgun` (from `NJ_GROUND_TRUTH.forbiddenForNj`)
**Renders at:** `PollingStatusBar` bring-list (`VoterChoiceApp.tsx:2108-2122`), print sheet
voter-meta cell (`:4729`).
**When it leaks:** When `STATE_ELECTION_DATA` is used instead of `getFallbackStateData()`.
For NJ voters `getFallbackStateData('NJ')` returns `acceptedIds: []` and `idRequired: false`
(from `voter-id-rules.ts:135`) — no "handgun" leak. Leak only occurs on the TX fallback path.
**Replacement source:** `getVoterIdRule(stateCode)` from `voter-id-rules.ts` — already the
correct source via `getFallbackStateData()`.

---

### B4 — `data.tsx:810-813` — `STATE_ELECTION_DATA.resources` (harrisvotes.com URLs)

```js
resources: {
  countyElectionLookup: 'https://www.harrisvotes.com/',        // line 811
  sampleBallotLookup:  'https://www.harrisvotes.com/...',      // line 812
  pollingPlaceLookup:  'https://www.harrisvotes.com/...',      // line 813
}
```

**Forbidden strings:** `harrisvotes` (contains "Harris")
**Renders at:** `NoContestedView` county-office link (`:3344`, `:3348`).
**When it leaks:** When `STATE_ELECTION_DATA` is the stateData prop.
**Replacement source:** `getFallbackStateData(stateCode).resources` — for NJ this would be
`https://www.state.nj.us/state/elections/` or the civic polling-place lookup URL.

---

### B5 — `data.tsx:819-827` — runoff/primary rule text containing "Texas"

```js
ruleExplanation: 'In a Texas primary runoff, you can only vote…'  // line 819
ruleExplanationEn: 'Texas runs a closed primary. …'               // line 825
ruleExplanationEs: 'Texas tiene una primaria cerrada. …'          // line 827
```

**Forbidden strings:** `Texas`
**Renders at:** `PartyGate` explanation text, wherever `ruleExplanation` is surfaced.
**When it leaks:** If `STATE_ELECTION_DATA` is used for gate text instead of
`getFallbackStateData(stateCode).primaryParticipation`.
**Replacement source:** `getFallbackStateData(stateCode).primaryParticipation.ruleExplanationEn`
— NJ's value would be NJ-specific.

---

### B6 — `data.tsx:830-836` — `countyResources['Harris County']`

```js
countyResources: {
  'Harris County': {
    name: 'Harris County',
    ballotLookup: 'https://www.harrisvotes.com/…',
    ...
  }
}
```

**Forbidden strings:** `Harris County`
**Renders at:** Anywhere `countyResources` is keyed by county name.
**When it leaks:** When the county from the civic response is "Harris County" (TX voter) but
`STATE_ELECTION_DATA` is already TX-specific. For NJ voters this key would not match, but the
constant itself should not be present in the fallback path for non-TX states.
**Replacement source:** Civic `county` field → lookup `stateData.countyResources[county]` from
the correct state data file (`src/data/states/NJ.json`).

---

### B7 — `data.tsx:257` — `RACES` candidate `priorRole` containing "TX-7"

```js
priorRole: 'House Rep (TX-7) since 2022 · Energy & Commerce',  // line 257
```

**Forbidden strings:** `TX-7`
**Renders at:** Wherever `priorRole` is surfaced in candidate analysis cards (if the mock
`RACES` data is used instead of live API data).
**When it leaks:** When `applyRealRaces()` has not been called (mock RACES still active).
**Replacement source:** Real candidate data from `/api/race-data` — for NJ voters the races
would be NJ candidates with NJ district labels.

---

## Class C — example/tip address (leaks into rendered UI)

### C1 — `VoterChoiceApp.tsx:3250` — GeocodeFailView address tip

```jsx
<code>5750 Hartwick Rd, Houston TX 77057</code>
```

**Forbidden strings:** `Houston`, `TX` (implicit Texas)
**Renders at:** `GeocodeFailView` — the "couldn't find your address" error screen. Rendered
as a UI tip to help users format their address correctly.
**When it leaks:** When Civic geocode fails (real error path).
**Fix:** Replace with a generic example like `"123 Main St, Anytown ST 00000"` or a
non-TX example that doesn't contain a forbidden string. No dynamic source needed — this is
an illustrative example.

---

### C2 — `src/components/GeocodeFailNotice.tsx:130` — Same tip in real component

```jsx
5750 Hartwick Rd, Houston TX 77057
```

**Forbidden strings:** `Houston`, `TX`
**Renders at:** `GeocodeFailNotice` component — the real (non-prototype) geocode-fail UI.
This is in the production codebase, not the prototype.
**Fix:** Same as C1 — replace with a non-TX example address.

---

## Class D — AI prompt hardcode (leaks into LLM context)

### D1 — `VoterChoiceApp.tsx:2630` — Handoff prompt county/state

(Also listed as A5 above — included here for cross-reference.)

```ts
`I'm researching my Nov 3, 2026 ballot for Harris County, TX.`
```

**Renders at:** The text pasted into external AI chatbots (Claude, ChatGPT, etc.) when the
user triggers the "continue in another chatbot" path.
**Fix:** Use `countyForPrompt` + `stateCode` dynamic values, matching `HandoffPackage.tsx`.

---

## Render-path analysis: what already does NOT leak

The following Texas constants exist but do NOT leak into rendered output for a real NJ user,
because the real-data seam correctly overrides them:

| Constant | Why it doesn't leak |
|---|---|
| `STATE_ELECTION_DATA.stateCode = 'TX'` | Workspace + print use `getFallbackStateData(getRealStateCode())` which overrides to NJ |
| `STATE_ELECTION_DATA.resources.pollingPlaceLookup = harrisvotes` | Print sheet uses `sd.resources.pollingPlaceLookup` where `sd` = `getFallbackStateData(getRealStateCode())` |
| `data.tsx:194` — "former Texas AG" | In mock `RACES` candidate priorRole; overridden when `applyRealRaces()` fires |
| `data.tsx:281` — "Harris County prosecutor" | Same — mock RACES, overridden by real extraction |
| `data.tsx:111-137` — PROPOSITIONS with "Harris County" / "Texas Legislature" | Mock propositions; not added to race list by NJ extraction |
| `VoterChoiceApp.tsx:5396` comment mentioning "Harris County, TX" | In-code comment, not rendered |
| `src/app/api/civic/route.ts:369` — `stateHintsFromAddress("Texas")` | Internal API routing helper, never rendered to UI |
| `src/components/BallotToolClient.tsx` — `TexasRunoffChoice` type | Type definition, never rendered as a string |

---

## Phase-B fix priority

1. **C2** — `GeocodeFailNotice.tsx:130` — Production component (not prototype). Highest
   urgency — fix inline, no seam needed.
2. **A1 / A2** — `VoterChoiceApp.tsx:259/353` — i18n `cardSource` strings render on every
   workspace load. Replace with `"Source · Google Civic"` or dynamic county.
3. **B1** — `data.tsx:657-663` — `POLLING_INFO` mock data. Wire `toBallotLogistics()` output
   from `/api/civic` response into PollingStatusBar. When civic returns nothing, render
   "Find your polling place at vote.gov" with null pollingPlace.
4. **A4** — `VoterChoiceApp.tsx:5392` — `NoContestedView` county fallback. Change to
   `'your county'`.
5. **A3** — `VoterChoiceApp.tsx:4263` — "TX primary" dev link. Gate or rename.
6. **A5 / D1** — `VoterChoiceApp.tsx:2630` — Handoff prompt. Use dynamic values.
7. **B2–B7** — `STATE_ELECTION_DATA` constants. Ensure the ZIP-only / no-address path
   never uses these for an NJ voter.

---

*Generated by WS3 (ws3/logistics branch). Do NOT edit seam files — this doc is a read-only
spec for Phase-B implementation.*
