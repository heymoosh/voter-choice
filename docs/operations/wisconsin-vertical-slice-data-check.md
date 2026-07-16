# Wisconsin vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: Wisconsin (WI)", parent epic
`c5a813bb` (nationwide official-source congressional roster).

Date: 2026-07-16. Wisconsin's 2026 Partisan Primary (2026-08-11) has **NOT**
happened yet as of this build — 26 days in the future. The general election
is 2026-11-03.

## Bottom line

**GO on the approach.** All 8 WI House districts render correctly end-to-end
when `OFFICIAL_ROSTER_ENABLED` is on, verified against the real Neon staging
branch through the actual `lookupChallengers` code path — **0 mismatches
across all 8 districts plus the (empty, as expected) Senate check.**

**Wisconsin is not Civix-vended** — a static, real-text-layer PDF from the
Wisconsin Elections Commission (WEC), 40 pages, no scanned/image-only pages.
The Civix portal playbook does not apply.

**Wisconsin has NO 2026 US Senate contest.** Wis. Stat. § 8.25(2) anchors
WI's two Senate classes on 6-year cycles starting 1962 and 1964; neither
sequence lands on 2026. Independently confirmed by the complete absence of
any Senate section in the WEC's own ballot access report. This is a
House-only fixture, as expected — no fan-out mistake.

**A new party code (`WGR`, Wisconsin Green) was added**, distinct from
generic `GRE` — the WEC's own official ballot-order document lists Wisconsin
Green as one of five ballot-status recognized parties (REP, DEM, CON, LIB,
WGR) for 2026, so it is treated as a primary-ballot party, not a
general-ballot-only independent. A display-name mapping (`"Wisconsin
Green"`) was also added to `src/lib/server/races.ts`'s `PARTY_NAMES` — this
was caught live during the E2E check below (a candidate rendered with the
raw code `WGR` instead of a name until the mapping was added).

**A non-trivial staleness catch:** the WEC's own ballot access report is
dated June 8, 2026 — a pre-meeting staff *recommendation* memo, not a final
record — and shows four candidates as "Challenged" (pending). All four were
independently resolved from separate, more current, official WEC primary
sources (the June 9, 2026 approved Commission minutes and a June 10, 2026
challenge-resolution memo) — see "How this was verified" below. All four
kept ballot access; none was denied.

**CD7 is an open seat** — the WEC report lists "Incumbent: Tom Tiffany" as a
header but Tiffany does not appear in CD7's candidate list; he filed for
Governor instead (confirmed on the same report and independently
corroborated by contemporaneous Wisconsin press coverage).

**NO-GO on flipping the flag for real users** without Muxin's sign-off —
same standing gate as every other state in this track.

## How this was verified — a static PDF, a stale-snapshot trap, and a live
browser session to resolve it

**The candidate-set source** is the WEC's `D. Ballot Access Report
6.9.2026.pdf` — a real text-layer PDF (`pypdf` extraction confirmed non-blank
text on every one of its 40 pages; no scanned-page mitigation needed, per the
plan doc's scanned-PDF gotcha rule). `curl` with a browser-like `User-Agent`
fetched it directly (HTTP 200, 1.28 MB) — no browser automation needed for
the PDF itself.

**Extraction-mode lesson:** `pypdf`'s default `extract_text()` badly garbles
multi-column tabular layout (e.g. a two-line-wrapped party name like "The
Common Class" reads as plausible but is actually a rendering artifact of
column-flow text extraction). Switching to `extract_text(extraction_mode=
"layout")` (pypdf ≥ 3.x) fixed this — every subsequent transcription pass
used layout mode, not the default flow mode. This is a WI-specific
operational finding worth carrying forward to any future state whose source
is a dense tabular PDF: **default pypdf flow-mode text extraction is not
safe for multi-column tables; use layout mode.**

**The stale-snapshot trap:** the June 9 report itself is a *staff
recommendation* memo prepared in advance of the June 9, 2026 Commission
meeting — it necessarily cannot reflect that meeting's own outcome. Four
candidates were flagged "Challenged" in the report: Rustin Provance (CD3),
Elizabeth Anne Fitzgibbon (CD6), and Mark Christopher Scheffler (CD8, two
separate challenges). Wisconsin's own June 9, 2026 Commission Meeting event
page (`elections.wi.gov/event/commission-meeting-june-9-2026-ballot-access`)
returns HTTP 403 to any non-browser fetch (`curl`, `WebFetch`) — a real
browser session (`mcp__claude-in-chrome__*`) was required to load it and
extract the actual PDF download links (`get_page_text` / `find` /
`read_page`), the same mechanic the Civix playbook describes for a portal
that blocks non-browser fetches, even though this is a plain Drupal site,
not Civix. Once the direct PDF URLs were extracted from the rendered page,
the PDFs themselves fetched fine via `curl`.

- **CD3 (Provance), CD6 (Fitzgibbon), CD8 (Scheffler x2):** resolved via the
  WEC's own **June 9, 2026, Open Session Minutes APPROVED.pdf** — the
  authoritative record of what the Commission actually voted, not a staff
  recommendation. All four: "The Commission finds that Candidate [X]
  submitted [N] valid signatures, and the Commission adds Candidate [X] to
  the list of candidates to be approved for ballot access."
- **CD7 (Clark, Hermening, Alfonso — three separate challenges):** resolved
  via the WEC's own **June 10, 2026 extension-challenges memo**
  ("Ballot Access Challenges for Fall 2026 Elections") — CD7 was one of four
  offices whose filing deadline was extended 72 hours (Tiffany, the sitting
  incumbent, neither filed for re-election nor filed a notification of
  noncandidacy in time), so its challenges ran on a separate, later
  timeline than the June 9 batch. All three: "Ballot access is GRANTED."

No candidate was denied on any challenge — all seven challenged filings
(across four candidates, one challenged twice) kept ballot access.

**Independent-vs-ballot-status-party distinction:** the June 9 report states
plainly (Recommended Motion #2) that "the 11 candidates not representing
ballot-status parties marked 'approved' ... are approved for ballot access
for the November 3, 2026 General Election" — i.e., Wisconsin's independents
bypass the Aug 11 primary entirely and are *already finally certified* for
the general ballot, a materially stronger status than TX's/CO's/OK's
`declared_general_ballot_intent` independents (whose petition-signature
verification was still pending or unconfirmed). Recorded here as
`qualified_for_general_ballot` for WI's 5 certified independents (CD3 x2,
CD4 x1, CD6 x2) — see the fixture's own docblock for the full reasoning.

**Incumbency** was cross-checked against `house.gov`'s "By State and
District" directory (a live browser session, scrolled to the Wisconsin
section per the plan doc's lazy-load note) — confirmed to match the WEC
report's own "Incumbent:" field exactly for all 8 districts: Steil (1),
Pocan (2), Van Orden (3), Moore (4), Fitzgerald (5), Grothman (6), Tiffany
(7, not seeking re-election — see CD7 above), Wied (8). No discrepancy
found.

## Contest inventory

| District | Incumbent | Contested primary(s) | Ballot-status-party filers | Independents (general-ballot certified) |
|---|---|---|---|---|
| WI-01 | Steil (R) | D: 4-way | 5 (4 D + 1 R unopposed) | — |
| WI-02 | Pocan (D) | D: 2-way | 2 (2 D; no R filer) | — |
| WI-03 | Van Orden (R) | D: 2-way | 3 (2 D + 1 R unopposed) | 2 (Kent, Provance) |
| WI-04 | Moore (D) | R: 2-way, D: 2-way | 4 | 1 (Burks) |
| WI-05 | Fitzgerald (R) | none (both unopposed) | 2 | — |
| WI-06 | Grothman (R) | D: 2-way | 4 (2 D + 1 R + 1 WGR, all unopposed except D) | 2 (Thurow, Fitzgibbon) |
| WI-07 | **open seat** | R: 5-way, D: 3-way | 8 | — |
| WI-08 | Wied (R) | D: 3-way | 4 (3 D + 1 R unopposed) | — |

**Total: 37 candidates** (32 primary-ballot-status-party filers + 5
general-ballot-certified independents). Matches the importer's own
self-reported count and the direct staging row-count query below exactly.

## Verification performed

- `npm run check` equivalent (lint + `tsc --noEmit` + full vitest suite):
  clean except one pre-existing, unrelated failure —
  `scripts/design/capture-shared.test.ts` fails to launch a headless Chromium
  browser in this sandboxed environment (`EPERM` on a Mach port rendezvous
  check, a sandbox limitation, not a code defect) — untouched by this build,
  same failure present before any WI changes. 3256 tests passing, 5
  pre-existing `todo`, 0 new failures. `npx eslint` clean (0 errors; one
  pre-existing `complexity` warning on `lookupChallengers` itself, a
  function this build added one data-only line to, not new logic).
- Confirmed via `db/schema.ts` that `ballot_status` is a plain `text` column
  with no CHECK constraint — no migration needed (matches every state since
  migration `0016`).
- WI's 37 rows imported to the isolated Neon **staging** branch
  (`ROSTER_STAGING_DATABASE_URL`, explicitly — never the ambient
  `DATABASE_URL`), re-imported, and confirmed **idempotent by direct
  row-count query** (37 both times, and a full per-district/status/incumbency
  breakdown matching the fixture exactly — not just the importer's own
  self-reported count).
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for all 8 WI House
  districts and the (nonexistent) Senate contest, diffed against the
  fixture. **0 mismatches across all 8 districts.** Full literal output
  (candidate name, party, and provenance as the app would render it):

  ```
  WI-01 — incumbent Bryan Steil (Republican), seekingReelection2026=true
    - Peter Burgelis (Democrat)
    - Mitchell Berman (Democrat)
    - Miguel Aranda (Democrat)
    - Lorenzo J. Santos (Democrat)

  WI-02 — incumbent Mark Pocan (Democrat), seekingReelection2026=true
    - Douglas Alexander (Democrat)

  WI-03 — incumbent Derrick Van Orden (Republican), seekingReelection2026=true
    - Emily Berge (Democrat)
    - Alexander Valiensi Kent (Independent)
    - Rustin Provance (Independent)
    - Rebecca Cooke (Democrat)

  WI-04 — incumbent Gwen Moore (Democrat), seekingReelection2026=true
    - Tim Rogers (Republican)
    - Purnima Nath (Republican)
    - Amy Donahue (Democrat)
    - Arthur Burks (Independent)

  WI-05 — incumbent Scott Fitzgerald (Republican), seekingReelection2026=true
    - Andrew Beck (Democrat)

  WI-06 — incumbent Glenn Grothman (Republican), seekingReelection2026=true
    - Amanda Bell (Democrat)
    - Matthew Arndt (Wisconsin Green)
    - Mike Thurow (Independent)
    - Brad Smith (Democrat)
    - Elizabeth Anne Fitzgibbon (Independent)

  WI-07 — open seat (Tiffany filed for Governor instead)
    - Fred Clark (Democrat)
    - Kevin Hermening (Republican)
    - Don Raihala (Republican)
    - Jessi Ebben (Republican)
    - Ginger Murray (Democrat)
    - Chris Armstrong (Democrat)
    - Niina Baum (Republican)
    - Michael Alfonso (Republican)

  WI-08 — incumbent Tony Wied (Republican), seekingReelection2026=true
    - Mark Christopher Scheffler (Democrat)
    - Katrina deVille (Democrat)
    - Rick Crosson (Democrat)

  U.S. SENATE — no 2026 contest (Wis. Stat. § 8.25(2)) — 0 rows returned,
  as expected.
  ```

  Every returned challenger carried `rosterProvenance.sourceKind ===
  "official_state_roster"`. Matthew Arndt (WI-06) initially rendered as the
  raw code `"WGR"` before the `PARTY_NAMES` display-name mapping was added
  (see "Bottom line" above) — caught and fixed live during this check, then
  re-verified.

- Prod database untouched throughout. `OFFICIAL_ROSTER_ENABLED` was only
  ever set inline for the verification commands above; it is not set
  anywhere persistent (not `.env.local`, not Vercel, not any committed
  file).

## Governing calendar dates (all still-relevant, per the plan doc's standing
requirement)

All sourced from the WEC's own **2026-2027 Calendar of Election Events**
(`elections.wi.gov/sites/default/files/documents/2026_2027%20Election%20Calendar_0.pdf`)
unless noted otherwise:

- **June 1, 2026 (past)** — nomination paper filing deadline (Wis. Stat.
  § 8.15(1)). Already resolved; recorded for completeness only.
- **August 11, 2026** — Partisan Primary (2nd Tuesday in August, Wis. Stat.
  § 5.02(12s)). Every `qualified_for_primary_ballot` candidate above appears
  on this ballot.
- **August 14, 2026 (computed)** — the 7th business day before the 4th
  Tuesday in August (Aug 25, 2026), the pre-general-election withdrawal
  deadline under Wis. Stat. § 8.35(1m) (a candidate who has already
  qualified may withdraw by sworn statement + fee before this date; absent
  withdrawal, a qualified candidate's name must appear on the ballot). Note:
  the same statute also references a separate "June 10 preceding the
  partisan primary" withdrawal window, which — read literally — would
  already have lapsed by this build's date; this fixture does not depend on
  resolving that ambiguity, flagged here for a future session rather than
  asserted with false confidence.
- **August 21, 2026** — county Board of Canvassers completes the canvass of
  the Partisan Primary (10 days after the election, Wis. Stat. § 7.60(5)).
- **August 26, 2026** — last day for the WEC chairperson to certify Partisan
  Primary results (Wis. Stat. § 7.70(3)(a), 3rd Wednesday following the
  election) — this is the date each contested primary's nominee becomes
  final/certified, and this fixture will need a follow-up update
  immediately after (mirroring AZ's same open item).
- **September 17, 2026** — UOCAVA deadline: last day for municipal clerks to
  send absentee ballots to military/overseas electors with valid requests on
  file for the General Election (42 U.S.C. § 1973ff-1, Wis. Stat. §
  7.15(1)(c),(cm)) — the effective hard lock on ballot content for the
  November general.
- **November 3, 2026** — General Election.

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **The Aug 11, 2026 primary has not happened yet.** Every contested-primary
  candidate above is recorded as `qualified_for_primary_ballot`, not a
  determined nominee — mirroring AZ's precedent of not prematurely promoting
  an uncontested filer to nominee status. A follow-up update is needed after
  the WEC's Aug 26, 2026 certification (see calendar above).
- **The Wis. Stat. § 8.35(1m) "June 10 preceding the partisan primary"
  withdrawal-window date is ambiguous** on a literal reading (see calendar
  section above) — not resolved here, flagged for a future session if it
  becomes load-bearing.
- Names are recorded as they appear in the official WEC report; not
  independently re-verified against a third document.

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/wisconsin-vertical-slice-data-check.md`.
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/wi-official-roster-2026.ts`.
- **Official Wisconsin source URLs used:**
  - `https://elections.wi.gov/sites/default/files/documents/D.%20Ballot%20Access%20Report%206.9.2026.pdf`
    (WEC staff's June 8, 2026 ballot-access recommendation report — primary
    candidate-set source)
  - `https://elections.wi.gov/sites/default/files/documents/June%209%2C%202026%2C%20Open%20Session%20Minutes%20APPROVED.pdf`
    (WEC's own approved minutes resolving the CD3/CD6/CD8 challenges)
  - `https://elections.wi.gov/sites/default/files/documents/June%2010%20Extentions%20Ballot%20Access%20Challenge%20Memo__pagenumber.pdf`
    (WEC's own challenge memo resolving the three CD7 challenges)
  - `https://elections.wi.gov/sites/default/files/documents/2026_2027%20Election%20Calendar_0.pdf`
    (WEC's official 2026-2027 election calendar — governing dates above)
  - `https://docs.legis.wisconsin.gov/document/statutes/8.25` (Wis. Stat.
    § 8.25(2) — confirms no WI Senate class is up in 2026)
  - `https://docs.legis.wisconsin.gov/document/statutes/8.35` (Wis. Stat.
    § 8.35(1m) — withdrawal-after-qualifying provision)
  - `https://www.house.gov/representatives` (incumbency cross-check only —
    not a Wisconsin source, cited because it materially confirmed the
    `isIncumbent` data)

## GO/NO-GO verdict

**GO on the approach for Wisconsin — the manual track continues to
generalize (a fifth non-Civix source pattern), and a genuine stale-snapshot
trap (a pre-meeting staff report vs. the Commission's own later-dated
approved minutes) was caught and correctly resolved via primary sources, not
secondary reporting. NO-GO on flipping the flag for real users without
Muxin's sign-off.**

What remains before this reaches real users:

1. **Flag flip** — human sign-off required, same as every other state in
   this track. Nothing in this build enables `OFFICIAL_ROSTER_ENABLED`
   anywhere persistent.
2. **Post-primary follow-up** — after the Aug 26, 2026 WEC certification,
   this fixture needs an update promoting each contested primary's actual
   winner to `qualified_for_general_ballot` (mirrors AZ's identical open
   item).
