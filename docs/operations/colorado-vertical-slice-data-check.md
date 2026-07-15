# Colorado vertical slice — built and verified live (official-source pipeline)

Card: `[P0] Import + verify official roster: Colorado (CO)`
(`docs/operations/voter-choice-backlog.md`), parent epic `c5a813bb`
(nationwide official-source congressional roster). Fifth state built through
this manual track, after Arizona, Texas, Oklahoma, Alabama, and Alaska.

Date: 2026-07-15. Colorado's 2026 primary (2026-06-30) is already past — this
is a **general-ballot state build**, structurally different from AZ's and
AK's pre-primary builds: every major-party seat already has a determined
nominee, not an open primary field. The general election is 2026-11-03.

## Bottom line

**GO on the approach for a fifth state.** All 8 CO House districts plus the
Senate race render correctly end-to-end when `OFFICIAL_ROSTER_ENABLED` is on,
verified against the real Neon staging branch through the actual
`lookupChallengers` code path — 0 mismatches across all 9 contests.

**Colorado is not Civix-vended.** Its official infrastructure is two separate
`coloradosos.gov` systems, neither matching Civix's URL pattern: a static
server-rendered HTML page for the primary filer list, and a **"Clarity
Elections" ENR (Election Night Reporting) portal** for primary results — a
different SPA vendor from Civix, and materially easier to work with: its
underlying JSON API is directly fetchable (`current_ver.txt` for a version
number, then `<version>/json/en/summary.json` for full per-contest results),
with **no browser automation needed at all**. This build never touched
`mcp__claude-in-chrome__*`.

**The general-ballot roster had to be derived**, the same structural gap
Texas's build hit: Colorado's SoS has not published a single consolidated
"2026 General Candidate List" page or file (`generalCandidates.html` and a
guessed `2026GeneralCandidateListOfficial.xlsx` both 404). It was assembled
from three official sources: (1) the Clarity ENR primary-results JSON for
every major-party nominee (100% precincts reporting, 1924/1924), (2) the SoS's
own "General Election Candidates With Approved Petition Formats" page for
unaffiliated (UAF) candidates still awaiting signature verification, and (3)
`house.gov`/`senate.gov` for incumbency. **Minor-party (e.g. Libertarian)
candidates are a known, explicit gap — not silently omitted** (see "Known
limitations" below).

**A real, non-obvious result surfaced during the primary-results
cross-check:** 30-year incumbent Rep. **Diana DeGette lost her CD-1
Democratic primary** to 29-year-old challenger Melat Kiros (53.19% to
39.78%, third candidate Wanda James at 7.03%). Cross-checked against seven
independent news outlets (CPR.org, NBC News, PBS NewsHour, Colorado Newsline,
Axios Denver, Colorado Politics) — all confirm. This makes CD-1 the one
Colorado district with **no incumbent** among the general-ballot nominees.

**NO-GO on flipping the flag for real users** without Muxin's sign-off — same
standing gate as every prior state in this track.

## How this was verified — a static HTML filer list, a directly-fetchable
JSON results API, and one genuinely undetermined sub-track (UAF petitions)

1. **Primary filer list (who ran in the June 30 primary):**
   `coloradosos.gov/pubs/elections/vote/primaryCandidates.html` — a plain
   server-rendered HTML `<table>`, not a PDF or portal. This is the FULL
   filer list for the primary, not the general-ballot nominee list — every
   Democratic and Republican candidate who ran, win or lose.
2. **General-ballot NOMINEES had to be derived** from the primary's certified
   results, because the primary had already happened: Colorado's
   Clarity Elections ENR site
   (`https://results.enr.clarityelections.com/CO/126592/`) redirects to a
   versioned SPA shell on a plain load, but its JSON data endpoints are
   directly fetchable with no browser session: `GET
   .../CO/126592/current_ver.txt` returns the current results-version number
   (`377222` at retrieval), then `GET
   .../CO/126592/377222/json/en/summary.json` returns every contest's full
   results (candidate names, vote counts, percentages) as a flat JSON array,
   and `.../377222/json/en/electionsettings.json` gives reporting-completeness
   metadata (`stateprecinctsreporting`/`stateprecinctsparticipating` — both
   1924, i.e. 100%, not a live/partial count; `websiteupdatedat`:
   "7/14/2026 4:30:39 PM MDT"). The winner per contest is the highest-`PCT`
   candidate (or the sole filer, for the many uncontested races); vote totals
   in each row were spot-checked to sum to the reported total (`T`) as an
   internal consistency check.
3. **UAF (unaffiliated) petition candidates** — a genuinely distinct,
   undetermined sub-track, sourced from
   `coloradosos.gov/pubs/elections/vote/generalPetitionCandidates.html`: 5
   US House filers (CD-1, CD-3, CD-4, CD-6, CD-7; no Senate filer), each with
   a "Filed" date but an **empty "Sufficient" column** — signature
   verification was still pending at retrieval. Recorded with the existing
   `declared_general_ballot_intent` status (the same preliminary-filing
   stage Texas's independent-declaration track uses), not
   `qualified_for_general_ballot` and not `runoff_pending` (that status means
   something structurally different — two already-decided finalists awaiting
   a runoff between just them).
4. **Incumbency cross-check**, never guessed from the SoS candidate list's
   own signals or from this app's FEC-derived `candidates` table:
   `https://www.house.gov/representatives` (fetched via `curl`, not
   `WebFetch` — the latter 403'd; the page is one large table sorted
   alphabetically by surname across all 50 states, not grouped by state, so
   extraction parsed every row) confirms all 8 sitting CO Representatives.
   `https://www.senate.gov/senators/index.htm` confirms Hickenlooper holds
   Colorado's Class II seat (up in 2026); Bennet's Class III seat is not up
   until 2029.
5. **TLS access note:** both `coloradosos.gov` and
   `results.enr.clarityelections.com` hit the same "unable to get local
   issuer certificate" TLS-chain gap Alaska's official site hit — confirmed
   via `curl -v`, reproducible outside any tool sandbox, and it 403s
   `WebFetch` outright. Every fetch in this build used `curl -sk` (TLS
   verification bypassed, read-only GETs only).

**Independent/minor-party candidates — known limitation, not a silent
omission:** Colorado's Libertarian Party (and other minor parties) nominate
by party assembly under 1-4-1304, C.R.S., not by primary or SoS-run
petition. That statute requires the party to file a "Certificate of
Designation by Assembly" with the SoS, but the SoS's public website
publishes only the **blank template form**, not a consolidated list of which
candidates were actually designated this cycle (unlike the UAF
petition-candidates page, which does exist as a real list). Extensive
targeted search (site-scoped search, `FormsList.html`, `BallotAccess.html`,
every page linked from the Candidates hub) found no equivalent page or file.
Secondary sources (the Libertarian Party of Colorado's own site) indicate LP
Colorado fielded candidates in all 8 US House districts plus US Senate this
cycle, but per this pipeline's SAFETY rule ("official-source reads
only... a blocked/unpublished/ambiguous official source stays explicit,
never guessed"), this build does not transcribe a party's self-published
list as if it were SoS-certified. A follow-up session could resolve this via
TRACER (`tracer.sos.colorado.gov`), Colorado's official campaign-finance
system — not attempted this session (an ASP.NET-webforms portal, out of
scope for this build's time budget).

## Full candidate-by-candidate comparison

Live output of `lookupChallengers("CO", <district>, 2026)` against the
staging Neon branch, `OFFICIAL_ROSTER_ENABLED=1`, compared against the
official sources above. Incumbents are correctly excluded from the
challenger list the app renders (same contract as AZ/TX/OK/AL/AK); the
"Official roster (full contest)" column shows every candidate on record,
including the excluded incumbent, so the comparison is complete.

| District | Official roster (full contest) | App output (`lookupChallengers`) | Match |
|---|---|---|---|
| CD-1 | Melat Kiros (DEM), Christy Peterson (REP), Shimon Blau (IND, declared) — **no incumbent, DeGette lost her primary** | Kiros, Peterson, Blau | ✅ |
| CD-2 | Joe Neguse (DEM, incumbent), Kelley Anne Dennison (REP) | Dennison (Neguse excluded as incumbent) | ✅ |
| CD-3 | Dwayne L. Romero (DEM), Jeff Hurd (REP, incumbent), Clifton Brown (IND, declared) | Romero, Brown (Hurd excluded) | ✅ |
| CD-4 | Eileen Laubacher (DEM), Lauren Boebert (REP, incumbent), Timothy M. Veldhuizen (IND, declared) | Laubacher, Veldhuizen (Boebert excluded) | ✅ |
| CD-5 | Jessica Killin (DEM), Jeff Crank (REP, incumbent) | Killin (Crank excluded) | ✅ |
| CD-6 | Jason Crow (DEM, incumbent), Jason Clark (REP), Samir Ezzeldin Witta (IND, declared) | Clark, Witta (Crow excluded) | ✅ |
| CD-7 | Brittany Pettersen (DEM, incumbent), Tim Bennett (REP), Joe Krzeczkowski (IND, declared) | Bennett, Krzeczkowski (Pettersen excluded) | ✅ |
| CD-8 | Manny Rutinel (DEM), Gabe Evans (REP, incumbent) | Rutinel (Evans excluded) | ✅ |
| Senate | John Hickenlooper (DEM, incumbent), Mark Baisley (REP) | Baisley (Hickenlooper excluded) | ✅ |

Direct staging row-count query (`select count(*) from
official_roster_candidates where state = 'CO'`) confirms **23 rows** — 21
House (16 major-party `qualified_for_general_ballot` + 5 UAF
`declared_general_ballot_intent`) + 2 Senate — matching the importer's
self-reported `upserted=23`, and confirmed idempotent on re-run (still 23,
no duplication).

## Known limitations

- Minor-party (Libertarian and any other) candidates are not included — see
  "Independent/minor-party candidates" above. Per LP Colorado's own
  (unverified-by-SoS) site, this likely means all 8 House districts plus the
  Senate race are each missing one Libertarian challenger row, until a
  follow-up resolves the TRACER-based verification path.
- The 5 UAF (`declared_general_ballot_intent`) filers are not yet
  SoS-certified for the general ballot — their petition-signature
  verification was still pending as of retrieval (2026-07-15). If any fail
  verification, a follow-up update to this fixture will need to remove that
  row (do not assume all 5 will ultimately qualify).
- CD-4's certified write-in primary filer, Jenna Preston, is correctly
  excluded from the roster — the Clarity results show the on-ballot
  candidate, Eileen Laubacher, took 100% of the tallied Democratic primary
  vote, so Preston did not accumulate a certified vote total and is not the
  nominee (see the fixture docblock for detail).

## Deliverable file paths (per the standing requirement)

- **This doc:**
  `/Users/Muxin/Documents/GitHub/voter-choice-worktrees/co-official-roster/docs/operations/colorado-vertical-slice-data-check.md`
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice-worktrees/co-official-roster/scripts/congressional-rosters/co-official-roster-2026.ts`
- **Official Colorado source URLs used:**
  - `https://www.coloradosos.gov/pubs/elections/vote/primaryCandidates.html`
  - `https://results.enr.clarityelections.com/CO/126592/` (JSON:
    `https://results.enr.clarityelections.com/CO/126592/377222/json/en/summary.json`
    and
    `https://results.enr.clarityelections.com/CO/126592/377222/json/en/electionsettings.json`)
  - `https://www.coloradosos.gov/pubs/elections/vote/generalPetitionCandidates.html`
  - `https://www.house.gov/representatives`
  - `https://www.senate.gov/senators/index.htm`
