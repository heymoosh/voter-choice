# F04 — seven-jurisdiction rehearsal review and contract-correction gate

Status: **not fit for national fanout; blocked by F05, F06, and F07.**

Review date: 2026-07-13.

Parent epic: `c5a813bb-9223-4dc1-95aa-65637eb6940b`.

Review input: the merged F03 fixture inventory and verifier in
`scripts/congressional-rosters/f03-source-inventory.ts` and
`scripts/verify-f03-congressional-source-inventory.ts`.

This is a contract review, not a live-source scrape, candidate ingest, or
production readiness determination. It records what F03's repository fixture
proves, what it does not prove, and the exact work that must be complete before
the Wave 3 national inventory cards may be created or run.

## Scoped F03 data verdict

F03 is **structurally clean for its narrow rehearsal scope**: its validator
accepts exactly one explicit inventory record for each of `AL`, `TX`, `CA`,
`DC`, `AK`, `LA`, and `PR`; rejects a missing or out-of-scope jurisdiction; and
rejects the tested unsafe assertion that a filing-only Texas source is a
qualified/certified roster. Its seven records also give each jurisdiction an
explicit availability state rather than an `unknown` placeholder.

That is valuable source-research bookkeeping, but it is **not an exact-contest
coverage proof and not a promotable roster verdict**. F03 has no retrieved raw
artifact, checksum, retrieval result, publication/effective time, candidate
rows, exact-contest join to the F02 oracle, or completeness reconciliation.
The verifier proves the fixture's current field-level invariants, not that a
source is current, complete, or usable for a particular voter.

Accordingly, national fanout is blocked. A jurisdiction can be present in the
inventory without satisfying the roster project's actual acceptance condition:
every expected contest needs an exact official-source path or an evidenced,
honest state.

## Jurisdiction-by-jurisdiction adjudication

| Jurisdiction | F03 evidence state | Scoped verdict | Blocking gap(s) |
| --- | --- | --- | --- |
| AL | `automatable`; Alabama Secretary of State certification landing page, described as qualified/certified | The fixture correctly distinguishes the Alabama dates, including the May/June and August paths, and is the only rehearsal record marked available. It does not prove a roster for any individual contest. | The aggregate `house`/`senate`, dates, and stages cannot identify district, Senate seat, regular/special kind, or party lane; a landing-page assertion is not captured/reproducible evidence. **F05, F06.** |
| TX | `manual_official_import`; Secretary of State candidate-listing information marked filing-only | Correctly non-selectable: a filing list is not certification evidence. | No exact official replacement source, controlling artifact, owner, due date, or calendar trigger is recorded for the manual path. The contract also needs a general source-role/observation/availability invariant, not just the one tested filing-list assertion. **F05, F06, F07.** |
| CA | `manual_official_import`; state-hosted Notice to Candidates treated as filing-only | Correctly refuses to infer a future general roster from the June primary filing notice. | Aggregate primary/general scope does not encode the exact top-two contest path, district/seat, or stage transition. A certified list/sample ballot replacement and its operational controls are absent; the semantic mapping must forbid filing evidence from becoming a roster through any field combination. **F05, F06, F07.** |
| DC | `manual_official_import`; Board of Elections landing page/notice directs users to a candidate list | Correctly keeps the Delegate record manual until an exact official artifact is captured. | The record does not bind the Delegate contest, election/stage, or a captured candidate artifact; `secondary_check` and manual-import semantics are not constrained as a valid combination. The manual queue lacks a controlling artifact, owner, due date, and trigger. **F05, F06, F07.** |
| AK | `manual_official_import`; final candidate-list page with a ballot-eligibility challenge/final-determination reference | Correctly does not auto-promote while the controlling ballot-eligibility issue is unresolved. | The contract does not distinguish a legal challenge from a technical source failure, preserve the controlling artifact, or attach the review to the exact nonpartisan contest/stage. It also lacks semantic-combination rules for a nominal roster that must remain manual. **F05, F06, F07.** |
| LA | `official_roster_not_yet_published`; Candidate Inquiry selector has no congressional names before qualifying | The honest unpublished state is directionally correct: the portal shell must not become a roster. | The claim has no successful configured-channel retrieval result or captured evidence proving absence; it must never be indistinguishable from a portal error. Exact November/December runoff semantics and contest coverage are aggregate only. **F05, F06, F07.** |
| PR | `official_roster_not_yet_published`; CEE landing page described as 2028 guidance/candidacy-intention system, not a roster | Correctly does not treat an intention system as a Resident Commissioner roster. It also surfaces that the rehearsal's 2026 inventory includes a 2028 election context. | The contract must reconcile source-record cycle with the F02 expected-contest scope and explicitly model a jurisdiction with no applicable 2026 contest versus a future contest. It needs an exact Resident Commissioner source path and reproducible evidence before an unpublished state can be operationally used. **F05, F06, F07.** |

## Blocking contract findings

The following are all blocking gaps. They are intentionally separated so a
future national inventory cannot hide an unfinished semantics decision inside
formatting or source research.

1. **Aggregate jurisdiction records are being counted as coverage.** F03
   permits one record per jurisdiction with arrays of office, date, and stage.
   Those arrays do not establish the Cartesian product they appear to describe,
   and cannot represent the F02 identity: district/at-large seat or Senate
   seat, regular/special kind, date, stage, and party lane. They cannot prove
   Alabama's district split, California's exact top-two path, Louisiana's
   runoff path, or the exact Delegate/Resident Commissioner contest. Nor can
   they safely support multiple sources for one jurisdiction: the current
   duplicate-jurisdiction rejection would reject that needed representation.

2. **Evidence is descriptive, not reproducible or operational.** `evidenceUrl`,
   `verifiedAt`, and a prose summary do not retain the artifact/reference,
   checksum, retrieval result/time, or publication/effective time needed to
   reproduce a verdict. An unpublished claim must be backed by a successful
   configured-channel check; an error, login/challenge, or unavailable portal
   must remain a failure/review state. Manual and filing-only paths likewise
   have no required exact official replacement, controlling artifact, owner,
   due date, or calendar trigger. They cannot count complete or promotable.

3. **The contract only enforces a few semantic combinations.** It rejects a
   filing-only observation paired with `qualified_or_certified`, and it
   constrains challenge, not-published, access-blocked, and automatable cases.
   It does not exhaustively validate source role, source format, parser family,
   observation, availability, and coverage state together. Consequently, a
   calendar-only or filing source could be misrepresented through an otherwise
   untested combination; unsupported format/parser pairs are accepted; and
   manual, legal-challenge, technical-failure, and future-cycle/no-applicable-
   contest meanings are not sufficiently distinct.

## Required correction cards

All three cards are blocking corrections from this review. Their goal
conditions are the release criteria for this gate, not optional follow-up.

### F05 — Exact contest-to-official-source coverage contract

Card: `d4446600-b85d-47f1-9e9e-048ca118df9f`.

Model source paths against F02 exact contest identities rather than aggregate
jurisdiction records: district/seat, regular/special kind, date, stage, and
party lane. Permit multiple sources per jurisdiction while rejecting duplicate
source scopes. The seven-jurisdiction matrix must specifically cover the
Alabama split and Louisiana runoff semantics, plus CA, AK, DC, and PR scope.

Pass only when focused tests fail for a missing or wrong district, seat, kind,
date, stage, or party lane and pass only when every F03 expected contest has an
exact official-source path or explicit evidenced state; then `npm run check`
passes.

### F06 — Reproducible official-source evidence and manual-import controls

Card: `09af9aa2-d34f-4d02-a8d9-7682f397ad78`.

Require a captured artifact/reference, checksum, retrieval result/time, and
publication/effective time. Distinguish technical failure from legal challenge.
For manual or filing-only coverage, require the controlling official
replacement artifact/path, owner, due date, calendar trigger, and non-filing
replacement procedure.

Pass only when focused tests reject a not-published claim without successful
evidence and reject every manual/filing-only path lacking those official
replacement controls; then `npm run check` passes.

### F07 — Official-source semantic combination invariants

Card: `4d7a6f37-e18f-4c41-8db8-20e79920db81`.

Enforce valid source-role, format, parser-family, observation, availability,
and coverage-state combinations. Reject unsupported parser/format pairs,
calendar-only or filing sources presented as qualified rosters, and
inconsistent manual/filing/state mappings. Preserve the fail-closed authority
rules: filing and calendar-only evidence never establishes
qualified/certified availability, and manual states remain explicit
review-required states.

Pass only when focused negative tests reject every invalid combination named in
this review while retaining valid official-source records; then `npm run check`
passes.

## Fanout decision and reopening rule

**National source-inventory fanout is blocked.** Do not create, groom, claim,
or run I05–I11—or otherwise treat F03 records as a reusable national coverage
template—until **F05, F06, and F07 all pass their goal conditions** and this
review is revisited against their merged contract. A passing F03 fixture check
alone does not lift this block.

After the corrections merge, rerun the F03 rehearsal suite and verifier using
the new exact-coverage/evidence/semantic rules. Any correction that changes a
jurisdiction's semantic interpretation requires re-adjudicating that
jurisdiction before a fit-for-fanout declaration.
