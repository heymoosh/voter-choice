# Connecticut vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: Connecticut (CT)", parent epic
`c5a813bb` (nationwide official-source congressional roster). Sixth state
through the manual track, after AZ, TX, OK, AL, and AK.

Date: 2026-07-15. Connecticut's 2026 primary (2026-08-11) has **not yet
happened** as of this build — 27 days in the future. The general election is
2026-11-03.

## Bottom line

**GO on the approach for a sixth state.** All 5 CT US House districts render
correctly end-to-end when `OFFICIAL_ROSTER_ENABLED` is on, verified against
the real Neon staging branch through the actual `lookupChallengers` code
path — **0 mismatches across all 5 contests**, including the 3 contests
whose nomination is still pending the August 11 primary.

**Connecticut is not Civix-vended.** Its official congressional-candidate
source is 5 static, text-layer PDFs published directly by the Secretary of
the State (one per district), reachable with plain `curl` — no browser
automation needed. This is a materially easier source than Texas's JS
portal or Oklahoma's results-derivation step, but it introduced a new
operational hazard of its own (see "Parsing gotcha" below).

**Connecticut has 0 US Senate contests in 2026** — Sen. Blumenthal's Class
III seat runs to 2029 and Sen. Murphy's Class I seat to 2031; neither is up
this cycle. Confirmed via web search and consistent with the app's own
senate-side output (falls through to the unchanged, empty FEC path).

**No `runoff_pending` status appears anywhere in this build.** Connecticut
has no runoff mechanism at all (`src/data/states/CT.json`'s
`runoffRules.hasRunoff` is `false`) — a contested CT primary is recorded as
`qualified_for_primary_ballot` only, the same pre-primary pattern AZ and AK
used, not the post-primary runoff-pending pattern OK introduced. No new
`OfficialBallotStatus` value or code change was needed.

**A staging-credential outage blocked the import mid-build and was resolved
without any code change.** `ROSTER_STAGING_DATABASE_URL` in the worktree's
`.env.local` (a symlink to the main checkout's) failed with "password
authentication failed for user 'neondb_owner'" — the same staging-branch
instability flagged after the AK build (see the standing project memory on
this). A fresh `vercel env pull` from the main, Vercel-linked checkout
retrieved a **different, currently-valid** credential (146 vs. the stale
147-character value), and the import succeeded immediately afterward — no
code or schema issue, purely an out-of-band credential rotation this build
had to catch up to.

## How this was verified — a static PDF source with a real transcription
hazard, plus an official-document coverage gap that required independent
secondary corroboration

1. **Candidate SET, convention/15%-threshold route (the primary official
   document):** the Secretary of the State's "2026 Certificate of
   Endorsements" landing page
   (`https://portal.ct.gov/sots/election-services/certificate-of-endorsement/2026-certificate-of-endorsements`)
   links one PDF per US House district, each a bundle of scanned/Docusigned
   "Certificate of Party Endorsement, 15% Eligibility, or Nomination" forms
   — Connecticut's actual legal ballot-access mechanism for the
   convention-endorsed and 15%-delegate-threshold routes (Conn. Gen. Stat.
   § 9-400 et seq.).
2. **Parsing gotcha — plain text extraction is not safe for these PDFs.**
   A first-pass `pypdf` text extraction silently returned a **blank page**
   for Rep. Jahana Hayes' own CD5 endorsement (an image-only scan with no
   embedded text layer) and, on a different page (Amy Chai's CD1
   certificate), extracted the surrounding checkbox LABEL text without
   indicating which box was actually checked — an initial pass mis-assumed
   she was a Democratic candidate before the page was re-rendered as a
   bitmap and read visually, revealing she is in fact the **uncontested
   Republican** CD1 nominee. Every one of the 15 candidate pages across all
   5 PDFs was re-rendered with `pypdfium2` and visually confirmed
   (party checkbox, endorsed/15%/nominated checkbox, signed name) before
   transcription — this is the load-bearing operational lesson for any
   future state whose official source is scanned/Docusigned PDF forms:
   **never trust `pypdf`/`pdfminer` text extraction alone for checkbox-form
   documents.**
3. **KNOWN COVERAGE GAP, disclosed rather than guessed around: 3 primary
   candidates reached the ballot via a legally distinct route (nominating
   petition, filed with the town Registrar of Voters, not the Secretary of
   the State) that is NOT captured by the Certificate-of-Endorsement PDFs.**
   No single consolidated official CT document enumerating petition-route
   primary candidates was located this session — `portal.ct.gov`'s
   "List of Candidates" / "Filed Candidates" pages (under
   Candidate-Lists-for-Office) serve only stale 2008–2014 archives, and no
   per-town aggregation exists online. Three candidates — Ruth Fortune
   (CD1 Democratic primary) and Winter Solomita / Jackson Taddeo-Waite (CD5
   Democratic primary) — are recorded in this fixture on the strength of
   **multiple independent, mutually-corroborating contemporaneous news
   sources** (CT Mirror's candidate-forum coverage, the Lakeville Journal's
   district roundup, and Ballotpedia's district-specific primary pages, all
   naming the same individuals alongside the convention-certified
   candidates), not a single unverified source. This is disclosed explicitly
   as a coverage gap in the official-document trail — not a guess about a
   contest OUTCOME (which the plan's SAFETY rule forbids) — and is the
   correct call under the "nobody gets left out" principle: omitting real,
   well-corroborated primary contestants because the single strongest
   official document doesn't happen to cover their ballot-access route
   would itself be a completeness failure.
4. **Incumbency cross-check**, never guessed from the certificate documents'
   own framing or from this app's own FEC-derived `candidates` table:
   `https://clerk.house.gov/xml/lists/MemberData.xml` (the U.S. House
   Clerk's official member-data feed, publish-date 2026-07-06 — the most
   current official roster available at retrieval) confirms all 5 CT
   incumbents are Democrats seeking re-election with no open seats: John B.
   Larson (CT-01), Joe Courtney (CT-02), Rosa L. DeLauro (CT-03), James A.
   Himes / "Jim Himes" (CT-04), Jahana Hayes (CT-05). No senate.gov/Bioguide
   cross-check was needed or performed, since CT has no 2026 Senate contest.

**Spelling discrepancy, resolved in favor of the official document:** the
CD4 Republican 15%-eligibility certificate is signed "Daniel Meressi"
(matching his own handwritten authorization line on the form), while nearly
every news source spells the surname "Miressi". This fixture follows the
official certificate's spelling, per the source hierarchy's preference for
the legally responsible authority's own document over secondary reporting —
recorded explicitly so a future reconciliation against news coverage isn't
mistaken for a transcription error.

**Independent/minor-party candidates:** none exist yet for any CT
congressional seat. CT's minor-party nomination deadline (per the
certificate form itself) is 2026-09-02 — still in the future — so no
Green/Working Families/Independent congressional filer has been certified
as of this build. No new party code was added to `types.ts`; every row in
this fixture is `DEM` or `REP`.

## Contest inventory

Connecticut has **5 US House districts and 0 US Senate contests in 2026.**

| District | Democratic | Republican | Status |
| --- | --- | --- | --- |
| CD1 | Bronin, Gilchrest, Larson\* (incumbent), Fortune | Chai | Dem primary pending 8/11; Rep uncontested |
| CD2 | Courtney\* (incumbent) | Austin | Both uncontested |
| CD3 | DeLauro\* (incumbent) | Lancia | Both uncontested |
| CD4 | Himes\* (incumbent) | Goldstein, Meressi | Dem uncontested; Rep primary pending 8/11 |
| CD5 | Hayes\* (incumbent), Solomita, Taddeo-Waite | Shea, DeBarros | Both parties' primaries pending 8/11 |

\* sitting incumbent, confirmed via clerk.house.gov, seeking re-election in
every district — no open seats.

## What was built (delta from the AZ/TX/OK/AL/AK pattern)

Most of the existing vertical-slice infrastructure is state-agnostic and
required **no changes**: `official_roster_candidates` table shape,
`officialRoster.ts` reader, `officialRosterFlag.ts`, `rosterProvenance.ts`,
`RepCard.tsx`, and the importer's array-shaped `FIXTURES` map. No new
`OfficialBallotStatus` value, no new party code, and no DB migration were
needed for this build (confirmed by inspecting `db/schema.ts` and staging's
live index definition — no migration has been needed since 0016).

**New / changed for this build:**

- `scripts/congressional-rosters/ct-official-roster-2026.ts` (new) — 17
  House rows across all 5 districts (12 convention-certified + 3
  petition-route + 2 uncontested singles... i.e. 5+2+2+3+5 = 17 total).
  Full sourcing, methodology, and known limitations are in the file's own
  header docblock.
- `scripts/ingest/official-roster.ts` — registered `CT` in `FIXTURES` with
  a single house entry (CT has no senate contest, so no senate entry — the
  same single-entry shape AZ uses).
- `src/lib/server/officialRoster.test.ts` — 63 tests total in the file
  after this addition; new CT-specific coverage: `getOfficialRoster`
  narrowing across all 5 CT districts, a mixed-`ballotStatus`-within-one-
  fixture assertion (CD1's primary-pending rows vs. its uncontested Chai
  row), `isIncumbentSeekingReelection` for all 5 (no open seats),
  `lookupChallengers` wiring (house-only, incumbent exclusion verified for
  every district, CD1's full 4-candidate primary field including the
  petition-route Fortune, and CD2's single-challenger uncontested case).

## Verification performed

- `npm run check` (lint + `tsc --noEmit` + full vitest suite): **clean.**
  162 test files, 3099 tests passing, 5 pre-existing `todo` (no failures),
  3104 total.
- Confirmed via a direct `pg`-backed query (Drizzle `db.execute`, not the
  importer's own count) that staging already has migration `0016`'s `NULLS
  NOT DISTINCT` fix applied — no new migration was needed for this build.
- CT's 17 rows imported to the isolated Neon **staging** branch
  (`ROSTER_STAGING_DATABASE_URL`, explicitly — never the ambient
  `DATABASE_URL`), re-imported, and confirmed idempotent by direct
  row-count query (17 both times, matching the fixture exactly — not just
  the importer's own self-reported count, per the goal condition's explicit
  instruction not to trust that alone). Per-district/status breakdown from
  the direct query: CD1 = 1 general + 4 primary; CD2 = 2 general; CD3 = 2
  general; CD4 = 1 general + 2 primary; CD5 = 5 primary — exactly matching
  the fixture.
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for all 5 CT House
  districts, diffed against the fixture. **0 mismatches across all 5
  contests.** Full literal output (candidate name, party, and provenance as
  the app would render it):

  ```
  CT-01 — incumbent JOHN B. LARSON, seekingReelection2026=true;
  Democratic nomination primary-pending (8/11); Republican side uncontested
    - Luke Bronin (Democrat)
    - Jillian Gilchrest (Democrat)
    - Ruth Fortune (Democrat)  [petition-route — see coverage-gap note above]
    - Amy Chai (Republican)  [uncontested nominee]

  CT-02 — incumbent JOE COURTNEY, seekingReelection2026=true; uncontested
    - George Patrick Austin (Republican)  [uncontested nominee]

  CT-03 — incumbent ROSA L. DELAURO, seekingReelection2026=true; uncontested
    - Christopher Lancia (Republican)  [uncontested nominee]

  CT-04 — incumbent JIM HIMES, seekingReelection2026=true; Democratic side
  uncontested; Republican nomination primary-pending (8/11)
    - Michael Ted Goldstein (Republican)
    - Daniel Meressi (Republican)

  CT-05 — incumbent JAHANA HAYES, seekingReelection2026=true; both parties'
  nominations primary-pending (8/11)
    - Winter Solomita (Democrat)  [petition-route — see coverage-gap note above]
    - Jackson Taddeo-Waite (Democrat)  [petition-route — see coverage-gap note above]
    - Chris Shea (Republican)
    - Jonathan DeBarros (Republican)
  ```

  Every returned challenger carried `rosterProvenance.sourceKind ===
  "official_state_roster"`. Every district's sitting incumbent was
  correctly excluded from that district's own challenger list (already
  shown as the seat's own card). The senate side returned empty for every
  district (CT has 0 senate contests; falls through to the unchanged,
  empty FEC path) — expected, not a bug.

- Prod database untouched throughout. `OFFICIAL_ROSTER_ENABLED` was only
  ever set inline for the verification commands above; it is not set
  anywhere persistent (not `.env.local`, not Vercel, not any committed
  file). No production migration, no production write, no flag flip.

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **3 of 17 candidates (Ruth Fortune, Winter Solomita, Jackson
  Taddeo-Waite) are sourced from multiple independent secondary reports,
  not a single official CT document** — see the "coverage gap" discussion
  above. This is the first state in this track whose official
  Certificate-of-Endorsement documents structurally cannot cover every
  legal ballot-access route (petition candidates file with town Registrars
  of Voters, not the Secretary of the State) — a future session with more
  time could try requesting the underlying petition filings directly from
  the affected towns' registrars, or watch for a SOTS-published
  consolidated primary-ballot list closer to August 11.
- **3 of 5 districts' nominations are undetermined pending the August 11,
  2026 primary** (CD1 Democratic; CD4 Republican; CD5 both parties). This
  fixture will need a follow-up update once that primary is certified —
  unlike Oklahoma's runoff_pending case, Connecticut's contested races
  simply stay `qualified_for_primary_ballot` until the primary itself
  determines the nominee (no runoff mechanism exists in CT).
  **Per Muxin's 2026-07-15 preference recorded on the Oklahoma build**
  ("pick one whose primary AND any runoff are already fully decided" for
  an easier hand-verification), Connecticut does NOT meet that preference —
  it turned out to have 3 contested primaries once petition-route
  candidates were accounted for. Worth flagging for whoever picks the next
  state.
- **No minor-party/independent CT congressional filer exists yet** — CT's
  minor-party deadline (2026-09-02) hasn't passed. Not an omission; nothing
  to record yet.
- Names are recorded as they appear on the official Certificate-of-
  Endorsement forms (or, for the 3 petition-route candidates, as they
  appear consistently across independent secondary sources); not further
  independently re-verified against a third document beyond the
  house.gov Clerk incumbency cross-check.

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/connecticut-vertical-slice-data-check.md`.
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/ct-official-roster-2026.ts`.
- **Official Connecticut source URLs used:**
  - `https://portal.ct.gov/sots/election-services/certificate-of-endorsement/2026-certificate-of-endorsements`
    (Secretary of the State's landing page linking every district's
    Certificate-of-Endorsement PDF bundle)
  - `https://portal.ct.gov/-/media/sots/electionservices/certificates_of_party_endorsement/2026/us-congress/1st-cd-dem--rep-ada.pdf`
  - `https://portal.ct.gov/-/media/sots/electionservices/certificates_of_party_endorsement/2026/us-congress/2nd-cd-dem--rep-ada.pdf`
  - `https://portal.ct.gov/-/media/sots/electionservices/certificates_of_party_endorsement/2026/us-congress/3rd-cd-dem--rep-ada.pdf`
  - `https://portal.ct.gov/-/media/sots/electionservices/certificates_of_party_endorsement/2026/us-congress/4th-cd-dem--rep-ada.pdf`
  - `https://portal.ct.gov/-/media/sots/electionservices/certificates_of_party_endorsement/2026/us-congress/5th-cd-dem--rep-ada.pdf`
  - `https://clerk.house.gov/xml/lists/MemberData.xml` (incumbency
    cross-check only — official U.S. House Clerk member-data feed, not a
    Connecticut source, cited because it materially shaped the
    `isIncumbent` data)

## Operational-navigation section (per the plan doc's standing requirement)

Connecticut's official source is **not** Civix-vended and **not** a single
downloadable structured list — it is 5 separate government PDFs, one per
congressional district, each a bundle of individually scanned or
Docusign-submitted "Certificate of Party Endorsement, 15% Eligibility, or
Nomination" forms.

**Navigation path:** start at
`https://portal.ct.gov/SOTS/Election-Services/Candidate-Lists-for-Office`
(a landing page whose "List of Candidates" / "Filed Candidates" sub-pages
are a dead end — they serve only stale 2008–2014 archives, not 2026 data).
The actual current-cycle document lives at a differently-named page:
`https://portal.ct.gov/sots/election-services/certificate-of-endorsement/2026-certificate-of-endorsements`,
which links one PDF per district by ordinal (1st through 5th). This page
was found via web search for "Connecticut Secretary of State 2026
Certificate of Endorsements," not by browsing site navigation from the
Candidate-Lists-for-Office page — the two page families aren't
cross-linked in an obvious way.

**Tooling:** every PDF fetched with plain `curl -s -L -o <file> <url>` —
no browser automation, no 403s, no JS rendering needed. This is the
easiest fetch mechanic of any state in this track so far.

**The one non-obvious trap:** several individual candidate pages within
each PDF are image-only scans with no embedded text layer (candidates who
submitted a physical wet-signature form that SOTS then scanned, as opposed
to a native-PDF Docusign submission). A first-pass `pypdf`/`pdfminer` text
extraction **silently returns a blank page** for these — it does not error,
it just omits the candidate entirely, which is a dangerous silent-omission
failure mode for a build whose whole purpose is "nobody gets left out."
Worse, on at least one native-text page, the extracted text included every
checkbox's LABEL but gave no indication of which checkbox was actually
marked, risking a mis-transcribed party affiliation. **The reliable
mechanic: render every page as a bitmap (`pypdfium2`, `page.render(scale=2.0
to 3.0).to_pil()`) and visually inspect it before transcribing anything** —
this caught both the blank-Hayes-page omission and the
mis-readable-Chai-party-checkbox risk in this build. A future state whose
source is also scanned/Docusigned PDF forms should budget for this
render-and-visually-read step from the start rather than trusting text
extraction.

**Signal reliability:** the Certificate-of-Endorsement PDFs are fully
reliable for the convention-endorsed and 15%-delegate-threshold ballot-
access route (the party's own chairperson/presiding-officer attestation is
on every form) — but they are **not** a complete enumeration of every
primary-ballot candidate, because Connecticut law provides a second,
parallel ballot-access route (nominating petition to the town Registrar of
Voters) that files through a completely different, and not-publicly-
aggregated, channel. Any future CT rebuild should specifically budget time
to look for a town-clerk-level aggregation or a closer-to-primary SOTS
publication, rather than assuming the Certificate-of-Endorsement PDFs alone
are the complete primary-ballot roster.
