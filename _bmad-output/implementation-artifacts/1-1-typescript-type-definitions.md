# Story 1.1: TypeScript Type Definitions

Status: ready-for-dev

## Story

As a developer,
I want TypeScript interfaces for all state election data structures,
so that the compiler catches data shape errors before runtime.

## Acceptance Criteria

1. Create `src/lib/types.ts` exporting interfaces: `StateElectionData`, `Election`, `Registration`, `RegistrationMethod`, `EarlyVoting`, `VotingRules`, `Resources`
2. All interfaces match the JSON schema in `docs/PROJECT_SPEC.md` exactly (stateCode, stateName, lastUpdated, elections[], registration, earlyVoting, votingRules, resources)
3. `DeadlineStatus` type defined as `'safe' | 'warning' | 'urgent' | 'passed'`
4. Types are importable by all lib functions and components

## Tasks / Subtasks

- [ ] Task 1: Create `src/lib/types.ts` (AC: #1, #2, #3)
  - [ ] Define `Election` interface (id, name, date, type, isPrimary, primaryType)
  - [ ] Define `RegistrationMethod` interface (available?, deadline, url?, sincePostmarked?)
  - [ ] Define `Registration` interface (online, byMail, inPerson, sameDayRegistration, registrationCheckUrl)
  - [ ] Define `EarlyVoting` interface (available, startDate, endDate, notes)
  - [ ] Define `VotingRules` interface (idRequired, acceptedIds, phonesAtPolls, phonesAtPollsDetail, additionalRules)
  - [ ] Define `Resources` interface (stateElectionWebsite, countyElectionLookup, sampleBallotLookup, pollingPlaceLookup)
  - [ ] Define `StateElectionData` interface composing all above
  - [ ] Define `DeadlineStatus` type union
- [ ] Task 2: Verify types match stub data (AC: #4)
  - [ ] Ensure TX.json, CA.json, NH.json are valid against the interfaces

## Dev Notes

- Reference `docs/PROJECT_SPEC.md` lines 96-160 for the complete JSON schema
- Reference `src/data/states/TX.json` for a concrete example
- Architecture decision: Pure function pipeline — all lib functions use these types
- No external dependencies needed — this is pure TypeScript
- File location: `src/lib/types.ts` per architecture doc

### References

- [Source: docs/PROJECT_SPEC.md#State-Election-Data-Schema]
- [Source: _bmad/docs/architecture.md#Data-Architecture]
- [Source: _bmad/docs/prd.md#Technical-Architecture]
