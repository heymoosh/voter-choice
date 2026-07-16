# North Dakota vertical slice — built and verified live (official-source pipeline)

Card: `[P0] Import + verify official roster: North Dakota (ND)`
(`docs/operations/voter-choice-backlog.md`), parent epic `c5a813bb`
(nationwide official-source congressional roster). One of the states built
in parallel through this manual track, after Arizona, Texas, Oklahoma,
Alabama, Alaska, Colorado, Connecticut, California, Arkansas, Delaware,
Florida, Hawaii, Louisiana, Maine, Indiana, Georgia, Iowa, Kansas, Idaho,
Maryland, and Kentucky.

Date: 2026-07-16. North Dakota's 2026 primary (2026-06-09) is already
past — this is a **general-ballot state build**: both parties' nominations
were determined outright (each candidate was their party's sole primary
filer, so neither needed a contested primary). The general election is
2026-11-03.

## Bottom line

**GO on the approach for this state.** The single at-large US House seat
renders correctly end-to-end when `OFFICIAL_ROSTER_ENABLED` is on, verified
against the real Neon staging branch through the actual `lookupChallengers`
code path — 0 mismatches. This is one of the structurally simplest states
built through this track so far: one seat, two candidates, no Senate race,
no runoff, no independent/minor-party filer.

**North Dakota is not Civix-vended.** Its official source is the Secretary
of State's own VIP (Voter Information Portal) at
`vip.sos.nd.gov/candidatelist.aspx` — an ASP.NET WebForms application, not
matching Civix's `<subdomain>.<state>elections.civixapps.com` URL pattern
and none of Civix's other recognition signals (no "IvisCbpUi" page title, no
"POWERED BY gocivix.com" footer). See "How this was verified" below for the
portal's own, different set of navigation mechanics (a true ASP.NET
postback dropdown, not Civix's required-filter/rendered-portal pattern).

**No 2026 US Senate race exists in North Dakota** — confirmed two ways: (1)
John Hoeven's Class III seat runs to 2028 and Kevin Cramer's Class II seat
(reelected 2024) runs to 2030, per public record; (2) direct, positive
confirmation from the source itself — the VIP portal's 2026 General
Election "Contest" dropdown lists 39 statewide/legislative/judicial/county
contests and contains no "United States Senator" option at all. This
fixture is therefore house-only, following the same pattern California's
build established for a state with no Senate contest that cycle.

**Only two candidates qualified for the general ballot**, both already
determined by the (uncontested) June 9 primary: Julie Fedorchak (REP,
incumbent) and Trygve Hammer (Democratic-NPL, coded as the existing `DEM`
party code — see the party-code judgment call below). No Libertarian,
independent, or write-in filer appears on the official list as of this
build's retrieval date; the independent-candidate petition window remained
open through August 31, 2026 (see "Known limitations" and the governing
calendar dates below).

**NO-GO on flipping the flag for real users** without Muxin's sign-off —
same standing gate as every prior state in this track.

## How this was verified — an ASP.NET postback portal, no Civix, browser
automation required only for the contest-filter interaction

1. **Locating the correct election.** The VIP portal is keyed by a numeric
   `eid` (election ID) query parameter with no year/type encoded in the URL
   itself. Sequential probing found: `eid=346` = 2026 Primary, `eid=347` = a
   2025 Minot special election (unrelated), **`eid=348` = the 2026 General
   Election** (this fixture's source, confirmed by the page's own "2026
   General Election Contest/Candidate List" heading), `eid=349`/`350`
   errored. `eid=326` (2022 General) was used only to confirm the page
   structure is stable across cycles.
2. **The Contest filter is a true ASP.NET postback, not a URL parameter.**
   Appending `&cid=22055` (the "Representative in Congress" option's value)
   to the URL does nothing — confirmed by directly testing it, and by
   `WebFetch` against the base URL never returning candidate rows across
   three separate attempts (it only ever sees the page's pre-postback
   default state). This build drove the actual dropdown via
   `mcp__claude-in-chrome__javascript_tool`: set
   `document.getElementById('ctl00_ContentPlaceHolder1_ddlContest').value =
   '22055'`, dispatched a `change` event to fire the postback's JS handler,
   then clicked "Search". The resulting "Candidate List Results" table is
   the direct, literal source for this fixture's two rows.
3. **The full statewide Candidate dropdown** (loaded on the same page,
   before any Contest filter is applied) independently lists both
   "Julie Fedorchak" and "Trygve Hammer" among ~700 statewide/legislative/
   county filers — a secondary confirmation that both names are genuine VIP
   portal entries, not artifacts of the filtered view.
4. **Incumbency cross-check**, never guessed from the portal's own party
   label or from this app's FEC-derived `candidates` table:
   `clerk.house.gov/xml/lists/MemberData.xml` (the official US House Clerk
   member data feed — used directly because `house.gov/representatives`
   403'd non-browser access) confirms Julie Fedorchak (R) is North Dakota's
   sitting at-large Representative, elected November 5, 2024, sworn in
   January 3, 2025 — matching the portal's own listing exactly, no
   discrepancy.
5. **Governing calendar dates**, from the SoS's own candidate calendar
   (`sos.nd.gov/elections/candidate/candidate-calendar`) and North Dakota
   Century Code (located via `ndlegis.gov`'s chapter tables of contents,
   text confirmed via web search of the statute's own language):
   - **November 3, 2026** — general election day.
   - **August 31, 2026, 4:00 p.m.** — the "sixty-fourth day before the
     election" under North Dakota law; two distinct deadlines coincide on
     this date: (a) **NDCC § 16.1-12-07** — the deadline for a nominated
     candidate to file written notice declining/withdrawing their
     general-election nomination (voids the certificate of nomination; a
     mailed notice must reach the Secretary of State within 48 hours after
     this deadline); (b) the SoS candidate calendar's own "last day to
     circulate and file petitions for independent candidates" for the
     general election — i.e., the last date a new independent US House
     filer could still join this race. This roster was retrieved
     2026-07-16, well before this date, so the two-candidate field should
     not yet be treated as fully locked.
   - **October 13, 2026, 4:00 p.m.** — write-in candidacy filing deadline
     for the general election (SoS candidate calendar).
   - **No fixed date:** NDCC § 16.1-12-08 governs a vacancy arising after
     ballots are already printed via a sticker-correction mechanism — this
     is event-triggered (a late death/disqualification), not a calendar
     deadline, so there is no date to record for it.

**Party-code judgment call.** North Dakota's Democratic Party is legally
named the "Democratic-NPL Party" — a 1956 merger of the state Democratic
Party with the historical Nonpartisan League — and is the ND-specific
branding of the SAME national Democratic Party organization, not a separate
third party the way Arizona's AIP, Alaska's AKP, California's PF, Florida's
LPF/FFP, or Kentucky's KYP each are (all real, distinct state-recognized
minor parties added to `types.ts`'s `party` union in prior builds). This is
the opposite call from those precedents: Hammer is coded with the existing
`DEM` code rather than a new `NPL` code, since there is no separate
real-world party organization behind the distinction. Fedorchak is coded
`REP` (the portal lists her party as "Republican" verbatim).

## Full candidate-by-candidate comparison

Live output of `lookupChallengers("ND", 0, 2026)` against the staging Neon
branch, `OFFICIAL_ROSTER_ENABLED=1`, compared against the official source
above. Incumbents are correctly excluded from the challenger list the app
renders (same contract as every prior state in this track).

| Seat | Official roster (full contest) | App output (`lookupChallengers`) | Match |
|---|---|---|---|
| At-large US House | Julie Fedorchak (REP, incumbent), Trygve Hammer (DEM) | Hammer (Fedorchak excluded as incumbent), party renders as "Democrat" | ✅ |
| US Senate | No contest this cycle | `[]` | ✅ |

Direct staging row-count query (`select count(*) from
official_roster_candidates where state = 'ND'`) confirms **2 rows** —
matching the importer's self-reported `upserted=2`, and confirmed idempotent
on re-run (still 2, no duplication).

## Known limitations

- This roster reflects the general-election candidate field as of
  2026-07-16. The independent-candidate petition window (through August 31,
  2026, per the governing calendar dates above) was still open at
  retrieval — a new independent US House filer could still be added before
  that date. This build did not open a separate dated `NOT BEFORE`
  follow-up card as part of this session; a future session should add one
  keyed to 2026-08-31 per the epic's standing convention.
- Names/party labels are recorded verbatim from the VIP portal's Candidate
  List Results table; not independently re-verified against a third
  document beyond the incumbency cross-check above — with only two
  candidates in a widely-reported 2024 rematch, contemporaneous news
  coverage (ND Monitor, Wikipedia) was used only as a spot-check, never as
  a primary source, per the SAFETY rule.

## Deliverable file paths (per the standing requirement)

- **This doc:**
  `/Users/Muxin/Documents/GitHub/voter-choice/.claude/worktrees/nd-official-roster/docs/operations/north-dakota-vertical-slice-data-check.md`
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/.claude/worktrees/nd-official-roster/scripts/congressional-rosters/nd-official-roster-2026.ts`
- **Official North Dakota source URL used:**
  - `https://vip.sos.nd.gov/candidatelist.aspx?eid=348` (2026 General
    Election Contest/Candidate List, Contest = "Representative in
    Congress", value `22055`)
- **Supporting sources (cross-checks and calendar dates, not the primary
  candidate-list source):**
  - `https://clerk.house.gov/xml/lists/MemberData.xml` (incumbency
    cross-check)
  - `https://www.sos.nd.gov/elections/candidate/candidate-calendar`
    (governing calendar dates)
  - North Dakota Century Code §§ 16.1-12-07, 16.1-12-08 (via
    `https://ndlegis.gov/cencode/t16-1c12.html` and public statute-text
    search — withdrawal/vacancy provisions)
