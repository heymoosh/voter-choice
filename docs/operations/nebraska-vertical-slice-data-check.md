# Nebraska vertical slice — built, staging verification BLOCKED (stale credential)

Card: "[P0] Import + verify official roster: Nebraska (NE)", parent epic
`c5a813bb` (nationwide official-source congressional roster).

Date: 2026-07-15. Nebraska's 2026 primary (May 12, 2026) is fully certified
(the 2026 Primary Canvass Book is published). The general election is
November 3, 2026. Nebraska has a 2026 US Senate contest — Pete Ricketts's
seat, up for a full 6-year term after he won the 2024 special election to
serve the remainder of Ben Sasse's term.

## Deliverable-requirement summary (per the plan doc's standing requirement)

**(a)** Full absolute path to this doc:
`/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/nebraska-vertical-slice-data-check.md`

**(b)** Full absolute path to the fixture file:
`/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/ne-official-roster-2026.ts`

**(c)** Exact, full, untruncated official Nebraska source URLs used:
- `https://sos.nebraska.gov/elections/information-candidates` (candidate information landing page)
- `https://sos.nebraska.gov/sites/default/files/doc/elections/2026/Statewide_Candidate_Filing_List.xlsx` ("General Election Candidates" sheet — determined nominees; "Candidate Petitions" sheet — pending independent/nonpartisan petition filers)
- `https://sos.nebraska.gov/sites/default/files/doc/elections/2026/2026_Primary_Canvass_Book.pdf` (confirms the May 12, 2026 primary is certified)
- `https://sos.nebraska.gov/sites/default/files/doc/elections/2026/2026_Election_Calendar.pdf` (2026 Official Election Calendar, State of Nebraska — source for every governing date in section (e) below)
- `https://www.house.gov/representatives` (incumbency cross-check, House)
- `https://www.senate.gov/states/NE/intro.htm` (incumbency cross-check, Senate)

**(d)** Operational-navigation section — see below.

**(e)** Every still-governing calendar date — see below.

## Bottom line

**Nebraska is NOT Civix-vended.** Its Secretary of State runs a plain
Drupal 10 site (`sos.nebraska.gov`) — no JS-rendered portal, no browser
automation needed anywhere in this build. Every source above was fetched
with a direct, non-browser `curl`.

**The fixture and code are complete and pass `npm run check`.** All 3 NE
House districts + the US Senate race are transcribed (17 rows total: 12
determined general-ballot nominees, 5 pending independent/nonpartisan
petition filers recorded `declared_general_ballot_intent`). 24 new unit
tests added, all passing.

**Staging import and end-to-end verification against the real Neon staging
branch are BLOCKED, not done.** `ROSTER_STAGING_DATABASE_URL` (read from
`.env.local` exactly as instructed, never printed) fails Postgres
authentication (`password authentication failed for user 'neondb_owner'`)
against the isolated staging branch — confirmed with both a plain `SELECT
1` connectivity probe and the real insert, both rejected identically at the
password-auth stage (not a network/DNS/URL-syntax problem — the connection
string parses as a valid URL and reaches a real Neon endpoint). This matches
a known recurring issue (see project memory: "Neon roster_staging reset
incident," "AK roster build blocked on staging credential") where the
staging branch's credential goes stale and Muxin has previously had to
reprovision it. **Fetching a fresh credential via `vercel env pull` was not
attempted as a workaround** — doing so would write Preview-environment
secrets to a file, which this build's own explicit instruction ("never
write the resolved secret to a file... reference it only by variable name")
and the environment's own permission system both block; this build treats
that as a hard boundary, not something to route around.

**Everything that does not require live staging DB access is complete**:
fixture, importer registration, unit tests (154/154 passing, including 24
new NE-specific cases), `npm run check` (lint/typecheck/test all clean
except one pre-existing, unrelated, sandbox-only Playwright flake — see
below), calendar-date research, and this doc. The only remaining steps once
a working `ROSTER_STAGING_DATABASE_URL` is available are: re-run the same
import command, run the row-count query, and run the `lookupChallengers`
end-to-end check — all mechanical, no further research needed.

## How this was built

1. Started from Nebraska's Secretary of State elections page
   (`sos.nebraska.gov/elections`) and its candidate-information landing page
   (`sos.nebraska.gov/elections/information-candidates`). Checked the URL
   pattern and page signatures against the plan doc's Civix checklist first
   — no `.civixapps.com` subdomain, no Civix page titles/footer, a plain
   Drupal 10 site. Not Civix.
2. The landing page's most obviously-named links —
   `.../Candidates/US_House_of_Representatives.pdf` and
   `.../Candidates/US_Senate.pdf` — turned out to be **blank candidate
   filing forms** (the document a candidate mails in to file), not roster
   data. A dead end, confirmed by reading both PDFs in full before ruling
   them out, not assumed from the filename alone.
3. The actual roster data lives in
   `Statewide_Candidate_Filing_List.xlsx`, linked from the same landing
   page, downloaded via `curl` and parsed with `openpyxl` (a plain XLSX,
   no browser needed). Two sheets matter:
   - **"General Election Candidates"** — the certified post-primary
     nominee list (12 rows across House + Senate: 3 major-party nominees
     per House district × 3 districts, minus NE-02's missing incumbent
     row since it's an open seat, plus 3 Senate rows) — the authoritative
     source for every `qualified_for_general_ballot` row.
   - **"Candidate Petitions"** — a distinct tracking sheet for
     independent/nonpartisan candidates pursuing general-ballot access by
     petition (Neb. Rev. Stat. §32-617), each carrying a `Status` column
     ("Circulating" = still gathering signatures, not yet turned in;
     "Pending Verification" = turned in, signature sufficiency under SoS
     review) and a shared statutory `Turn-In Deadline` (Aug 3, 2026). 5
     rows matched a 2026 federal contest: US Senate (Dan Osborn, Pending
     Verification), NE-01 (Austin Ahlman, Circulating), NE-02 (Christopher
     J. Feuerbach, Circulating), NE-03 (Mark Cohen and Macey Budke, both
     Circulating). None promoted past `declared_general_ballot_intent` —
     "Circulating" in particular means the candidate has not even
     completed their petition yet, let alone had it certified.
4. Confirmed the May 12, 2026 primary is fully certified by fetching the
   2026 Primary Canvass Book PDF (published, not a draft/partial).
5. **Party-code transcription**: took the SoS spreadsheet's own `Party (if
   applicable)` labels at face value — "Republican" → `REP`, "Democratic"
   → `DEM`, "Libertarian" → `LIB`, "Legal Marijuana NOW" → a new `LMN`
   code (added to `scripts/congressional-rosters/types.ts` and
   `src/lib/server/races.ts`'s `PARTY_NAMES`, mirroring the AIP/AKP/NPP/
   PF/LPF/FFP precedent of trusting an official source's own label over
   inventing a generic bucket), and "Nonpartisan" (the 5 petition filers)
   → the existing generic `IND` code (a declared independent candidacy,
   matching the TX/OK precedent — not a voter-registration status like
   AK's `NPA`).
6. **Incumbency cross-checked against two independent official sources**,
   never guessed from Nebraska's own spreadsheet or this app's FEC-derived
   `candidates` table:
   - `house.gov`'s "By State and District" member directory (fetched
     directly via `curl`, isolated to the `id="state-nebraska"` table
     section): confirms Mike Flood (NE-01, R) and Adrian Smith (NE-03, R)
     as sitting Representatives who filed for and won their own party's
     2026 primary in the same district they hold. Also confirms Don Bacon
     (NE-02, R) as the *sitting* Representative — and NE-02 has **no**
     incumbent row in either SoS sheet, confirming an open seat (Bacon did
     not file for re-election), not a data gap.
   - `senate.gov`'s official Nebraska senators page
     (`senate.gov/states/NE/intro.htm`): confirms Pete Ricketts as a
     sitting Senator (Deb Fischer's seat is Class I, not up in 2026).
7. Assembled `NE_HOUSE_ROSTER_2026` (13 rows: 4 in NE-01, 4 in NE-02, 5 in
   NE-03) and `NE_SENATE_ROSTER_2026` (4 rows), 17 rows total, and
   registered both in `scripts/ingest/official-roster.ts`'s `FIXTURES`
   map.
8. Checked `db/schema.ts` — no migration needed, `official_roster_candidates`
   remains unchanged since migration 0016 (confirmed, not assumed): the
   `party`/`ballot_status` columns are plain `text` with no CHECK
   constraint, so the new `LMN` code and `IND`/`declared_general_ballot_intent`
   values need no schema change.
9. **`npm run check` (lint + `tsc --noEmit` + full vitest suite): clean.**
   One pre-existing, unrelated failure surfaced on the first run —
   `scripts/design/capture-shared.test.ts` failed to launch a headless
   Chromium instance (`bootstrap_check_in ... Permission denied`) — this is
   a sandbox artifact (mach-port IPC blocked under the sandboxed shell),
   confirmed by re-running that single file with the sandbox disabled,
   where all 3 tests passed cleanly. No NE/official-roster code touches
   that file or Playwright.
10. Added 24 new test cases to `src/lib/server/officialRoster.test.ts`
    (`getOfficialRoster — NE narrowing`, `isIncumbentSeekingReelection —
    NE`, `lookupChallengers — NE wiring`), mirroring the existing ME
    house+senate coverage pattern — including a case confirming NE-02's
    open seat renders with no incumbent excluded, and a case confirming
    the 5 pending petition filers never render as `qualified_for_general_ballot`.
    154/154 tests pass in that file (all states combined).

## Staging import and end-to-end verification — BLOCKED

**Attempted, not completed.** Following the exact pattern used for every
prior state:

```
DATABASE_URL="$(grep '^ROSTER_STAGING_DATABASE_URL=' .env.local | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')" \
  npx tsx scripts/ingest/official-roster.ts --state NE
```

(The `sed` strip is needed because this repo's `.env.local` wraps the value
in literal double quotes — a plain `cut` alone leaves the quote characters
attached, which fails `new URL()` parsing with a generic "not a valid URL"
error. Diagnosed by testing the extracted string's shape — length,
quote/newline/CR presence, `new URL()` validity — without ever printing the
string itself.)

Once the quoting issue was fixed, the import failed with a **Postgres
authentication error**: `password authentication failed for user
'neondb_owner'`. Reproduced identically with a bare `SELECT 1` connectivity
probe (ruling out anything specific to the insert statement or this
table). The connection string itself is syntactically valid (parses as a
URL, resolves to a real `*.neon.tech` host) — this is a genuine stale/
rotated credential, not a transcription or scripting error on this build's
part.

This matches a known, recurring issue documented in project history: the
`roster_staging` Neon branch's credential has broken unexpectedly before
(not on any known TTL) and required Muxin to reprovision the branch and
refresh the Vercel environment variable. **A fresh credential could
plausibly be pulled via `vercel env pull --environment=preview`** (the
mechanism a prior state's build used successfully), but doing so would
write Preview-environment secrets to a file — which both this build's
explicit instruction ("NEVER write the resolved secret to a file... never
write it to a persisted env file") and the runtime's own permission system
treat as a hard boundary, and this build did not attempt to route around
either.

**As a result, the following GOAL_CONDITION items are NOT met and this card
is not ready to merge as-is:**
- Fixture does not yet import to staging (attempted, blocked on
  authentication).
- No direct row-count query against staging has been run.
- No end-to-end `lookupChallengers` check against live staging (flag on)
  has been run.

**What's needed to finish, once unblocked:** refresh
`ROSTER_STAGING_DATABASE_URL` in `.env.local` (or grant explicit permission
to pull a fresh one), then re-run the single import command above, verify
with `SELECT count(*) FROM official_roster_candidates WHERE state='NE'`
(expect 17), and run `lookupChallengers("NE", <1|2|3>, 2026)` with
`OFFICIAL_ROSTER_ENABLED=1` against staging for all 3 districts plus the
Senate seat, comparing output against the fixture. No further research or
code changes are anticipated.

## Standing calendar dates (per the plan doc's requirement (e))

Pulled directly from the official 2026 Nebraska Election Calendar
(`https://sos.nebraska.gov/sites/default/files/doc/elections/2026/2026_Election_Calendar.pdf`):

- **Monday, August 3, 2026, 5 PM** — last day for filing for partisan
  office by petition (Neb. Rev. Stat. §32-617). This is the statutory
  turn-in deadline for all 5 pending independent/nonpartisan petition
  filers on this roster (Osborn, Ahlman, Feuerbach, Cohen, Budke).
- **Monday, August 3, 2026, 5 PM** — last day for a candidate nominated at
  the primary election, or by political party convention or committee, to
  decline the nomination (Neb. Rev. Stat. §32-623). This is Nebraska's
  **candidate-withdrawal deadline** for all 12 already-determined
  major/recognized-minor-party nominees on this roster — a determined
  nominee recorded here could still withdraw up to this date.
- **Friday, September 11, 2026** — last day for the Secretary of State to
  certify candidates, offices, and issues to be placed on the statewide
  **general** election ballot (Neb. Rev. Stat. §32-801). This is
  Nebraska's practical ballot-content-lock date for the 2026 cycle.

A dated re-check card is opened for **2026-08-04** (the day after the
shared Aug 3 petition-turn-in/withdrawal deadline), noting that the full
lock isn't until Sept 11 — see
`docs/operations/voter-choice-backlog.md`, "[P2] Re-check official roster:
Nebraska (NE) — after petition turn-in/withdrawal deadline", per the
epic's NOT-BEFORE date-gate convention.

## Files changed

- `scripts/congressional-rosters/ne-official-roster-2026.ts` (new)
- `scripts/congressional-rosters/types.ts` (added `LMN` party code)
- `scripts/ingest/official-roster.ts` (NE import + `FIXTURES` entry)
- `src/lib/server/officialRoster.test.ts` (NE test coverage)
- `src/lib/server/races.ts` (added `LMN` to `PARTY_NAMES`)
- `docs/operations/voter-choice-backlog.md` (new dated re-check card
  appended under epic `c5a813bb`; the NE card's own STATUS flip to `In
  Progress` was already done before this worktree was cut, per the
  claim-safely protocol)
- This doc (new)

No database migration — `ballot_status`/`party` remain plain `text`
columns with no CHECK constraint (unchanged since migration 0016). No
production mutation, no writes of any kind reached any database this
session (staging import blocked before any write succeeded).
`OFFICIAL_ROSTER_ENABLED` was never set anywhere persistent.
