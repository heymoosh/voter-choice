# California vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: California (CA)", parent epic
`c5a813bb-9223-4dc1-95aa-65637eb6940b` (nationwide official-source
congressional roster). No `DEPENDS ON` another state card — this track's
cards can be built in parallel, each from its own worktree.

Date: 2026-07-15. California's June 2, 2026 primary is fully certified
(2026-07-10). The general election is 2026-11-03.

## Bottom line

**GO on the approach for a sixth state.** All 52 CA House districts render
correctly end-to-end when `OFFICIAL_ROSTER_ENABLED` is on, verified against
the real Neon staging branch through the actual `lookupChallengers` code
path — **0 mismatches across all 52 districts**.

California is structurally the most different source this track has built
against so far: a **nonpartisan top-two "jungle primary"** — every candidate
for a seat, regardless of party, runs on one combined June primary ballot,
and the top two vote-getters by raw count (regardless of party) advance to
November. This is not a party-primary system like AZ/TX/OK/AL, and not AK's
top-four. Because the primary is already certified, every district's
top-two is fully determined — `runoff_pending` never applies anywhere in
this fixture, unlike Oklahoma's build.

**This build's own verification pass caught and corrected a real error in
the initial hand-transcription** (see "The CD-40 correction" below) and
surfaced a major, non-obvious structural fact via the incumbency
cross-check: **California's congressional district numbers shifted for a
subset of seats** between the currently-serving Congress and this 2026
ballot, producing five open seats and one incumbent-vs-incumbent collision
(see "The incumbency cross-check" below). Neither finding was in the
research handed off at the start of this build — both surfaced from this
build's own required verification pass.

**NO-GO on fan-out to further states** until the manual track has covered a
few more, and **NO-GO on flipping the flag for real users** without Muxin's
sign-off — same standing gate as every prior state in this track.

## Contest inventory

California has **52 US House districts and no US Senate contest in 2026**
(Sen. Padilla's term runs to 2029, Sen. Schiff's to 2031 — confirmed absent
from the Statement of Vote landing page's own list of 2026 statewide/federal
contests, which lists Governor, Lt. Governor, Secretary of State, Controller,
Treasurer, Attorney General, Insurance Commissioner, Board of Equalization,
US Representative, State Senate (even districts), State Assembly, and
Superintendent of Public Instruction — no US Senate). All 52 House districts
are covered by this fixture.

## Operational navigation — how this build actually worked the CA SoS's PDFs

California's official source is plain PDF (not Civix, not a JS SPA needing
browser automation) — but a large one, spanning 52 districts across two
documents:

1. **Party/bio per candidate:** the CA SoS "Notice to Candidates, June 2,
   2026 Primary Election"
   (`https://elections.cdn.sos.ca.gov/statewide-elections/2026-primary/congress.pdf`)
   — 82 pages, dated per-district March 21-24, 2026.
2. **Vote totals / top-two determination:** the certified "Statement of
   Vote, United States Representative by District"
   (`https://elections.cdn.sos.ca.gov/sov/2026-primary/sov/76-us-rep.pdf`),
   certified 2026-07-10 — 14 pages, county-by-county vote totals plus a
   "District Totals" row and percentage row per candidate.
3. **Confirms no Senate contest:** the Statement of Vote landing page
   (`https://www.sos.ca.gov/elections/prior-elections/statewide-election-results/primary-election-june-2-2026/statement-vote`).

**Tooling note — WebFetch cannot parse these PDFs directly.** A plain
`WebFetch` call against either PDF URL returns only "heavily corrupted...
binary data," the same failure mode the Oklahoma build hit for its filing
PDF. WebFetch does, however, save the raw PDF bytes to a local tool-results
path even when it can't extract text from them. This build recovered by
installing `pypdf` (`pip3 install --user pypdf`, since it wasn't already
present) and extracting text directly from those saved binary files —
`pypdf.PdfReader(...).pages[i].extract_text()` — which worked cleanly on
both documents (19,837 characters from the 14-page Statement of Vote;
79,284 characters from the 82-page Notice to Candidates). No `pdftotext` /
poppler was available in this environment, so `pypdf` was the working
alternative. Both installs and the extraction script needed
`dangerouslyDisableSandbox` — the sandbox's default temp/write restrictions
blocked both `pip3 install` and writing the extracted text to a scratch
file even under the session's own job-tmp directory.

**Structural gotcha in the Statement of Vote's own text layout:** each
page's extracted text ends with a list of district-number footers (e.g.
"2nd Congressional District / 1st Congressional District / 76") that name
the districts appearing on that page, but the page's actual candidate
content appears *before* that footer, in an order that does not always
match districts' natural sequence within the page (a two-column PDF layout
extracts column-major, not left-to-right). The reliable way to parse it
was to track "District Totals" rows (which the SoV always pairs 1:1 with
a preceding party-code row and name block) rather than trust the footer
labels' ordering.

## The CD-40 correction (found during this build's own verification, not present in the initial handoff)

The research handed off at the start of this build already flagged
California's jungle-primary mechanic and gave a pre-computed top-two table,
which this build was explicitly instructed not to blindly trust. Spot-checking
the mandated sample (CD-01, CD-27, and all eight districts flagged as having
two same-party advancers: CD-04, CD-07, CD-11, CD-12, CD-14, CD-29, CD-34,
CD-37) against the certified Statement of Vote matched exactly on every
figure. Continuing on to verify the *entire* 52-district roster (not just
the mandated sample) against the Statement of Vote's raw vote totals — done
by summing each candidate's county-level subtotals against the PDF's own
"District Totals" row and cross-checking the printed percentages — surfaced
one real discrepancy:

**CD-40's true top-two is Ken Calvert (REP, 75,811 votes) and Young Kim
(REP, 44,818 votes) — both Republicans — not Calvert and Esther Kim-Varet
(DEM, 36,072 votes) as the initial hand-transcription had it.** Kim-Varet
placed third. Verified independently:

- Orange + Riverside county subtotals for Calvert (23,001 + 52,810) sum to
  the PDF's own District Totals figure of 75,811. Same check for Kim
  (22,481 + 22,337 = 44,818) and Kim-Varet (15,184 + 20,888 = 36,072).
- The printed percentages (34.9% Calvert, 20.6% Kim, 16.6% Kim-Varet, plus
  14.0% Ramirez, 8.6% Kerr, 2.2% Keissieh, 1.5% Hoffman, 1.5% Linh) sum to
  99.9% (rounding) and rank in exactly this order.

This makes CD-40 a **ninth** two-same-party district for this cycle (eight
two-Democrat districts plus this one two-Republican district), and it is
also an **incumbent-vs-incumbent collision** — see below. The fixture
(`scripts/congressional-rosters/ca-official-roster-2026.ts`) reflects the
corrected result: Kim carries `qualified_for_general_ballot`, Kim-Varet
carries `qualified_for_primary_ballot`. Verified end-to-end against staging
(below): the app correctly excludes both Calvert and Kim as incumbents and
renders Kim-Varet as a challenger.

A secondary, minor correction: the initial handoff's excluded-write-in list
placed "Deborah Kristianto NPP (W/I), 27 votes" in CD-32; the Statement of
Vote actually shows this write-in tally under CD-35 (the Torres/Cargile
district). This doesn't affect the fixture either way — write-in tallies for
names absent from the Notice to Candidates are excluded regardless of which
district they're under — but is noted here in case anyone cross-references
the original research notes.

## The incumbency cross-check — a real, non-obvious redistricting finding

Per this track's standing SAFETY rule, incumbency was never taken from a
candidate's own self-described occupation line in the Notice to Candidates
PDF (many California incumbents self-describe as "Member of Congress,"
"United States Representative," etc. — a hint, never a source). Instead it
was cross-checked against the official US House Clerk's member data feed,
`https://clerk.house.gov/xml/lists/MemberData.xml` (a house.gov-domain
source; parsed with Python's `xml.etree.ElementTree`, 441 total House
members, 52 California rows).

**This surfaced a major, non-obvious structural fact: California's
congressional district numbers shifted for a subset of seats** between the
currently-serving Congress and this 2026 ballot. Matching by raw district
number between the Clerk feed and the 2026 candidate list would have been
silently wrong for a dozen-plus districts. Every incumbent was instead
matched by full name against the *entire* 52-district candidate list, then
assigned to whichever district that name actually appears in. Examples of
the shift: Ami Bera (old CA-06 -> new CD-03), Kevin Kiley (old CA-03 -> new
CD-06 — the two effectively swapped numbers), Linda Sánchez (old CA-38 ->
new CD-41), Ken Calvert (old CA-41 -> new CD-40).

**Five open seats** — no sitting member of Congress, per the Clerk feed,
filed anywhere in the 52-district candidate list (confirmed absent from
both source PDFs, not merely omitted from a district-number match):

- **CD-11** — Nancy Pelosi is not a candidate anywhere in the roster.
- **CD-14** — already vacant under the prior district map; no Clerk
  incumbent maps here under the new map either.
- **CD-26** — Julia Brownley is not a candidate anywhere in the roster.
  Jacqui Irwin (a state legislator, not the sitting member) leads the
  Democratic field instead.
- **CD-38** — no current sitting member maps here. Hilda Solis (a past,
  not current, member of Congress, now a Los Angeles County Supervisor) is
  a candidate but correctly not flagged as an incumbent.
- **CD-48** — Darrell Issa is not a candidate anywhere in the roster.

**CD-40 is a genuine incumbent-vs-incumbent collision**, a direct
consequence of the district renumbering above: sitting Representatives Ken
Calvert (old CA-41) and Young Kim (old CA-40) were both redrawn into the
same new district and both filed there. Both are flagged `isIncumbent: true`
in the fixture. This is a scenario none of the five prior states in this
track (AZ, TX, OK, AL, AK) exercised — `isIncumbentSeekingReelection`
(`src/lib/server/officialRoster.ts`) only checks whether *any* roster row
for the seat is flagged incumbent (`rows.find((r) => r.isIncumbent)`), so
two incumbent rows in one contest doesn't break that function; its
name-mismatch check is a log-only cross-check, never a gate. Verified this
doesn't break the challenger-exclusion wiring either: both Calvert and Kim
are correctly excluded from CD-40's challenger list in the live end-to-end
check below.

## Party-code decisions

Two new codes added to `scripts/congressional-rosters/types.ts`:

- **`NPP`** — "No Party Preference" (Cal. Elec. Code § 2151), California's
  own distinct ballot designation. Not the generic declared-independent
  `IND` already in the enum — mirrors why Alaska's build added `NPA` instead
  of reusing `IND` for its own distinct concept. 88 candidates across the
  roster carry this code.
- **`PF`** — Peace and Freedom, a real California-recognized minor party
  (Helena Pasquarella, CD-24; John Thompson Parker, CD-37). Mirrors the
  AIP/AKP precedent for a state's own recognized minor party.

One judgment call resolved *without* a new code: California's ballot prints
the Green Party's abbreviation as "GRN" (Chris Richardson, CD-03), but this
fixture reuses the **existing** `GRE` code rather than adding a
letter-for-letter match. Unlike NPP/PF, this isn't a distinct legal concept
— it's the same real-world Green Party Alaska's build already represented as
`GRE` (Richard Grayson, US Senate). Adding `GRN` alongside `GRE` would
fragment the enum across two codes for one party without capturing any real
distinction.

Both `races.ts`'s `PARTY_NAMES` display-name map and the fixture's own
`types.ts` union were updated; verified live below that `NPP` renders as
"No Party Preference," `PF` as "Peace and Freedom," and the reused `GRE`
renders as "Green."

## What was built (delta from the AZ/TX/OK/AL/AK pattern)

Most of the existing vertical slice's infrastructure required **no
changes**: `official_roster_candidates` table shape, `officialRoster.ts`
reader, `officialRosterFlag.ts`, `rosterProvenance.ts`, the delegation
open-seat-badge wiring, `RepCard.tsx`, and the importer's array-shaped
`FIXTURES` map.

**New / changed for this build:**

- `scripts/congressional-rosters/types.ts` — two new `party` union values,
  `"NPP"` and `"PF"` (see above). No new `OfficialBallotStatus` value needed
  — California's certified top-two system uses only the two statuses every
  prior state already has.
- `scripts/congressional-rosters/ca-official-roster-2026.ts` (new) — 289
  House rows across all 52 districts. Full sourcing, methodology, the CD-40
  correction, and the redistricting/incumbency findings are in the file's
  own header docblock.
- `scripts/ingest/official-roster.ts` — registered `CA` in `FIXTURES` with
  a single house entry (no senate entry — California has no Senate contest
  this cycle, same single-office shape as Arizona's fixture).
- `src/lib/server/races.ts` — `PARTY_NAMES` gained `NPP` -> "No Party
  Preference" and `PF` -> "Peace and Freedom."
- `src/lib/server/officialRoster.test.ts` — 12 new tests: `getOfficialRoster`
  narrowing (including the CD-40 correction's exact ballot statuses and
  confirming no Senate rows exist), `isIncumbentSeekingReelection` for a
  normal district, all four "no incumbent maps here" open-seat districts
  (CD-11, CD-26, CD-38, CD-48), and the CD-40 two-incumbent case,
  `lookupChallengers` wiring (house-only — 3 db calls, mirroring Arizona's
  single-office shape: official house, empty official senate, empty FEC
  fallback), CD-01's incumbent exclusion, CD-40's both-incumbents-excluded
  case with the corrected Kim-Varet challenger, CD-11's full open-seat
  candidate list, and the three new/reused party-code display-name
  mappings.

No migration was needed — confirmed by inspecting `db/schema.ts:155`:
`ballot_status` is a plain `text` column with no CHECK constraint, same as
every prior state in this track since migration 0016.

## Verification performed

- `npx tsc --noEmit -p .`: clean (after `npm install` — this worktree had no
  `node_modules` yet).
- `npx vitest run src/lib/server/officialRoster.test.ts`: **67 tests
  passing** (55 pre-existing AZ/TX/OK/AL/AK tests + 12 new CA tests).
- CA's 289 rows (all `house`, no `senate`) imported to the isolated Neon
  **staging** branch (`ROSTER_STAGING_DATABASE_URL`, explicitly — never the
  ambient `DATABASE_URL`), re-imported, and confirmed idempotent by direct
  row-count query both times (289 both times — not just the importer's own
  self-reported count, per the goal condition's explicit instruction).
  Direct query also confirmed 52 distinct districts, 0 senate rows.
  - **Note on the staging credential:** the first import attempt failed
    with `password authentication failed for user 'neondb_owner'`. Per this
    track's standing note that a staging auth failure earlier the same day
    (2026-07-15) was a credential problem affecting every state's build,
    not a fixture problem, this was checked before assuming the fixture was
    at fault: comparing the worktree's cached `.env.local` value against a
    fresh `vercel env pull` showed the two values differed (the credential
    had rotated again, 6 hours prior per `vercel env ls`). Re-running the
    import with the freshly-pulled credential succeeded immediately — no
    change to the fixture or importer was needed.
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for all 52 CA House
  districts, diffed against the fixture. **0 mismatches across all 52
  districts**, and every returned challenger carried
  `rosterProvenance.sourceKind === "official_state_roster"`. Full literal
  output for four representative districts (razor-thin, open-seat, and the
  two-incumbent-collision cases):

  ```
  CD-01 — razor-thin (Gallagher 92,975 vs McGuire 92,121); incumbent
  Gallagher excluded
    - Audrey Denney (Democrat)
    - Janice Karrman (Democrat)
    - Mike McGuire (Democrat)
    - Timothy Sean Kelly (No Party Preference)
    - Richard T. Minner (No Party Preference)

  CD-11 — open seat (Pelosi not seeking re-election); no incumbent excluded,
  all 11 candidates render
    - John "Gus" Buffler (Democrat)
    - Saikat Chakrabarti (Democrat)
    - Connie Chan (Democrat)
    - Keith Freedman (Democrat)
    - Omed Hamid (Democrat)
    - Gregory M Haynes (Democrat)
    - Marie Hurabiell (Democrat)
    - Scott Wiener (Democrat)
    - David Ganezer (Republican)
    - Jingchao Xiong (Republican)
    - Nathan Deer (No Party Preference)

  CD-27 — razor-thin (Gibbs 62,758 vs Whitesides 62,214); incumbent
  Whitesides excluded
    - Caleb Norwood (Democrat)
    - Roberto Ramos (Democrat)
    - Jason Gibbs (Republican)

  CD-40 — two-Republican district, incumbent-vs-incumbent collision; BOTH
  Calvert and Kim excluded as incumbents; corrected 3rd-place Kim-Varet
  renders as a challenger
    - Esther Kim-Varet (Democrat)
    - Joe Kerr (Democrat)
    - Claude M Keissieh (Democrat)
    - Francis Xavier Hoffman (Democrat)
    - Lisa Ramirez (Democrat)
    - Nina Linh (No Party Preference)
  ```

- Prod database untouched throughout. `OFFICIAL_ROSTER_ENABLED` was only
  ever set inline for the verification commands above; it is not set
  anywhere persistent (not `.env.local`, not Vercel, not any committed
  file).
- A one-off verification script used to run the live `lookupChallengers`
  diff against staging (`scripts/_verify-ca-e2e.ts`) was deleted after use
  and is not part of this PR's diff.

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **Names are recorded as they appear in the official Notice to Candidates /
  Statement of Vote**; not independently re-verified against a third
  document beyond the incumbency cross-check above. Two attempted
  Ballotpedia spot-checks (CD-40, CD-11) returned no usable content at the
  guessed URLs — not used as evidence either way; the primary-source
  verification above (vote-total arithmetic plus the Clerk feed) stands on
  its own.
- **Independent petition-signature verification status** was not
  separately tracked. Because California's top-two system records every
  candidate — independent or partisan — against the same certified vote
  count, this fixture has no `declared_general_ballot_intent` rows (unlike
  TX/OK's separate independent-declaration tracking); every row is either
  `qualified_for_primary_ballot` or `qualified_for_general_ballot`.
- **No US Senate contest this cycle** — confirmed absent, not omitted; see
  "Contest inventory" above.

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `/Users/Muxin/Documents/GitHub/voter-choice-worktrees/ca-official-roster/docs/operations/california-vertical-slice-data-check.md`
  (lands at `docs/operations/california-vertical-slice-data-check.md` on
  `main` once merged).
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice-worktrees/ca-official-roster/scripts/congressional-rosters/ca-official-roster-2026.ts`
  (lands at `scripts/congressional-rosters/ca-official-roster-2026.ts` on
  `main` once merged).
- **Official California source URLs used:**
  - `https://elections.cdn.sos.ca.gov/statewide-elections/2026-primary/congress.pdf`
    (CA SoS "Notice to Candidates, June 2, 2026 Primary Election" — party
    designation per candidate, all 52 districts)
  - `https://elections.cdn.sos.ca.gov/sov/2026-primary/sov/76-us-rep.pdf`
    (CA SoS certified "Statement of Vote, United States Representative by
    District," certified 2026-07-10 — vote totals used for top-two
    determination and the CD-40 correction)
  - `https://www.sos.ca.gov/elections/prior-elections/statewide-election-results/primary-election-june-2-2026/statement-vote`
    (Statement of Vote landing page — confirms no US Senate contest this
    cycle)
  - `https://clerk.house.gov/xml/lists/MemberData.xml` (incumbency
    cross-check only — the source of the redistricting/open-seat/CD-40
    collision findings above)
  - Ballotpedia (two URLs attempted for CD-40 and CD-11 spot-checks,
    guessed and not resolving to usable content — not used as a source)
- **Operational-navigation section:** written above ("Operational
  navigation — how this build actually worked the CA SoS's PDFs").

## GO/NO-GO verdict

**GO on the approach for a sixth state — the manual track continues to
generalize, now proven against a structurally different top-two primary
system and a real mid-cycle redistricting scenario. NO-GO on proceeding to
more states or real users without further sign-off.**

What remains before this reaches real users or additional states:

1. **Flag flip (prod cutover for any of AZ/TX/OK/AL/AK/CA)** — human
   sign-off required, same as every prior state.
2. **The redistricting finding here may be worth a broader look**: this is
   the first state in this track where a mid-cycle map change materially
   affected incumbency data. If other remaining states also redrew maps for
   2026, their builds should budget time for the same whole-roster
   name-matching approach used here (matching by name across all districts,
   not by raw district number) rather than assuming numbers carried over.
