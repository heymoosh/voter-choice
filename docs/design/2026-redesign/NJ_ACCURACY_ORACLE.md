# NJ Accuracy Oracle — definition of "done"

The gate for the post-upload accuracy program (plan:
`Accurate Ballot After Address + Upload`). **"Done" for any pillar = the output
matches this ground truth for the real NJ address — not "the flow runs."**

- **Ground truth (canonical values):** `src/lib/oracle/nj-ground-truth.ts`
  (transcribed from `.scratch-ballot/GROUND_TRUTH.md`).
- **Machine-checkable part:** `src/lib/oracle/nj-accuracy-oracle.test.ts`
  (`npx vitest run src/lib/oracle/`). Green today = 7; `it.todo` = the open gaps,
  each tagged to its workstream. A WS closes a gap by replacing its
  `it.todo("… [WSn]")` with a real `it(...)`.
- **Rendered-UI / DB / civic part:** this checklist — run during Phase B against
  the real ballot (the E2E drive below). vitest can't see rendered strings, the
  DB, or civic responses, so those checks live here.

Address under test: **Audubon Borough, Camden County, NJ-01** · June-2-2026
PRIMARY · two party ballots (gate must fire).

---

## Per-pillar checklist

### Pillar 1 — what's on my ballot
- [x] NJ election data carries the Nov general; address-path rolls past the
      6/2 primary → general (oracle: green).
- [x] Gate: NJ general → no gate; NJ primary → semi-closed gate fires (green).
- [x] Party filter: DEM voter → no R leakage; REP voter → 4-candidate Senate
      race intact, no D leakage (green).
- [ ] **[Phase B]** DEM ballot renders **exactly 3** scored races (empty
      no-petition County-Committee dropped by `filterRacesByParty`).
- [ ] **[WS1 A3/A4]** Real PDF extraction of the **R-Senate dense column**
      returns the 4 ground-truth names (Lebovics, Murphy, Zdan, Tabor) via
      Textract — OR flags a low-confidence "verify against your official ballot."

### Pillar 2 — candidate analysis
- [ ] **[WS2]** Booker (Senate) + Norcross (House NJ-01) resolve to real
      voting-record alignment (`sourceType:"voting_record"`). Booker reference:
      "11 of 18 votes · 61%".
- [ ] **[WS2 B1]** Every no-record candidate (4 R-Senate, Galdo, all
      commissioners) gets **position-based** analysis rendered in the SAME % bars,
      labeled `sourceType:"web_search"` ("Based on public statements, not voting
      record") with real evidence URLs.
- [ ] **[WS2 B3]** No candidate shows a blank analysis card when a sibling has one.

### Pillar 3 — voting details
- [x] Voter-ID: NJ requires no document for most in-person voters (green).
- [ ] **[WS3 C1]** Logistics block shows congressional district **NJ-01** from the
      address (not "—").
- [ ] **[WS3 C1]** Polling place / hours / early-voting are address-derived from
      civic `voterinfo`, or an honest vote.gov fallback — never a fabricated place.
- [ ] **[WS3 C3 / Phase B]** Rendered workspace + print contain **ZERO** forbidden
      strings (`NJ_GROUND_TRUTH.forbiddenForNj`: Texas, Harris County, Houston,
      TX-7, handgun, Trini Mendell, Precinct 0364).

---

## Phase B E2E drive (the rendered-UI verification)

Local dev `:3000`, real keys present. Per `REBUILD_STATUS.md`: **clear
`localStorage` between drives** (`() => localStorage.clear()` + re-navigate), and
Playwright file-upload paths must sit under the agitated-shockley worktree.

1. **DEM drive** — home → address (Audubon) → civic returns no contests (passed
   primary) → upload the real Camden PDF → party gate fires → pick **Democrat** →
   workspace.
   - Assert: 3 races; Booker + Norcross show real voting-record bars;
     commissioners show position-based (labeled) bars, not blank; district NJ-01;
     NJ polling hours; print has no forbidden strings.
2. **REP drive** — repeat, pick **Republican**.
   - Assert: Senate shows exactly the 4 ground-truth names (or the low-confidence
     flag); Galdo + Stone present; every candidate has labeled position-based
     analysis (all-gap ballot); no forbidden strings.

A pillar is **done** when its checklist boxes are ticked AND its oracle `it.todo`
has become a passing `it(...)`.
