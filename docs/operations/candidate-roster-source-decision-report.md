# Candidate roster source-decision report

Status: staged containment for card `c5a813bb-9223-4dc1-95aa-65637eb6940b`.
Date: 2026-07-13.

## Decision

FEC candidate rows are campaign-finance evidence only. They must not be labeled
“on the ballot,” “running for this seat,” or used as selectable replacement
candidates unless an independent current-ballot roster source verifies that
status.

The app now carries additive roster provenance:

- `sourceKind`
- `election`
- `retrievedAt`
- `sourceLinks`
- `confidence`
- `ballotStatus`
- `selectableAsReplacement`

No DB migration is included. Existing FEC rows remain available as financial
history; the containment boundary is implemented in the API model, data
adapters, and replacement UI.

## Source hierarchy

1. Official voter-specific sample ballot from the voter’s state/county/local
   election office.
2. State/county official candidate list for the specific office, district,
   election, and ballot status.
3. Google Civic Information API only when it returns exact official contests
   for the voter’s address/election.
4. User-pasted or user-uploaded/extracted ballot text. Useful for research
   workflow, but user-supplied and not authoritative.
5. Source-links-only or partial official logistics. Useful for directing the
   voter to the right office, but not an authoritative roster.
6. FEC campaign-finance filings. Financial evidence only, never ballot roster
   proof.

Official reference links used for the staged policy:

- FEC candidate registration says federal candidates register and file finance
  reports after raising/spending over $5,000, and separately links “Gaining
  ballot access” as another step: https://www.fec.gov/help-candidates-and-committees/registering-candidate/
- Google Civic voterInfoQuery is address-based and can return contest/candidate
  information; its docs also call out election-id disambiguation and
  `officialOnly`: https://developers.google.com/civic-information/docs/v2/elections/voterInfoQuery
- Vote.gov is the federal entry point for official voting resources and state
  handoff: https://vote.gov

## Freshness and withdrawal rules

- A verified roster must be election-specific and retrieved for the relevant
  address/district/office where applicable.
- Stale rows remain visible only as historical/finance context unless refreshed
  against an official current roster.
- Withdrawn, inactive, or superseded rows must keep their financial history but
  must set `ballotStatus="inactive_withdrawn"` and
  `selectableAsReplacement=false`.
- A row with only FEC filings must set `confidence="finance_only"`,
  `ballotStatus="finance_record_only"`, and
  `selectableAsReplacement=false`.

## Internal source conventions

- `fec_campaign_finance`: finance history only.
- `google_civic`: selectable only when the Civic source confidence is
  `exact_official`, mapped to `official_address_election_tied`.
- `user_pasted_ballot` / `user_uploaded_ballot`: marked
  `unverified_user_supplied`; not authoritative replacement roster data.
- `official_sample_ballot` / `state_county_official_list`: selectable only when
  current-election status is verified and the row is not withdrawn/inactive.

## Fixture cases covered

- Unsafe before state: FEC-only row shown as a replacement comparison candidate.
- Safe FEC-only after state: row preserved as “campaign-finance evidence,” not
  selectable.
- Safe unverified state: pasted/uploaded candidate rosters are threaded through
  the app with user-supplied provenance, not authority.
- Safe verified state: official/current ballot provenance can unlock replacement
  comparison.
- Withdrawn/inactive preservation: source links and finance history can remain,
  but replacement selection stays disabled.

HTML evidence: `docs/operations/candidate-roster-correctness-evidence.html`.

## Verified current-race comparison

The strongest repository-grounded match for the incident is the Texas
statewide Senate race. PR #287's review record explicitly asks whether the UI
is showing “Cornyn vs. Jasmine Crockett”; the earlier roster work also names a
Texas voter and the redesign's live examples are Texas-first. This identifies
the race context, but not the original voter's address.

| Field | Verified value |
| --- | --- |
| State | Texas (`TX`) |
| Office | U.S. Senate |
| District | Statewide |
| Election | 2026 general election, November 3, 2026 |
| Official roster entry point | Texas SOS Current Election Information → Candidate Listing Information: https://www.sos.texas.gov/elections/laws/2026-november-general-election.shtml |
| Official independent filing record | Texas SOS 2026 independent declarations PDF: https://www.sos.texas.gov/elections/forms/2026-independent-declaration-tracking.pdf |
| Comparison oracle | Ballotpedia's Texas U.S. Senate 2026 page, which cites the Texas SOS candidate/results source: https://ballotpedia.org/United_States_Senate_election_in_Texas%2C_2026 |

The comparison oracle's current general-election table lists these candidates:

- James Talarico (D)
- Ken Paxton (R)
- Ted Brown (L)
- Joshua Cain (I)
- Robert Coster (I)
- Camencia Ford (I)
- Johnathan Garza (I)
- William Harper (I)
- Jade Simmons (I)
- Hans Truelson (I)

The rows that explain the observed stale display are not current general-ballot
rows: John Cornyn (R) lost the May 26 Republican runoff, and Jasmine Crockett
(D) lost the March 3 Democratic primary. Ronald Evans (I) is listed as
withdrawn or disqualified. Those rows may remain in finance history, but must
be marked non-selectable and must not be described as “running for this seat”
or “on the ballot.”

This is the verified comparison for the best-supported incident race; it is
not a claim that an address-specific county ballot has been verified. The
production implementation still needs an address/election-tied official
sample ballot before enabling a voter-specific selectable roster.

Fixture interpretation:

- FEC-only fixture: finance evidence is retained but not selectable.
- Official current-roster fixture: only the ten current general-election rows
  above may be selectable for this statewide race.
- Primary-loser/withdrawn rows: retain finance history, but map to an inactive
  ballot state and keep `selectableAsReplacement=false`.
- User-pasted/uploaded fixtures: roster candidates are useful for research but
  remain unverified.
