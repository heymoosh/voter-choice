# Data Model: Ballot Research Tool

**Branch**: `003-ballot-research-tool` | **Date**: 2026-05-10

All types live in `src/types/election.ts`.

## ZipLookupResult

```typescript
type ZipLookupResult =
  | { status: "single"; stateCode: string }
  | { status: "multi"; stateCodes: string[] }
  | { status: "not-found" }
  | { status: "invalid" };
```

- `invalid`: input is not a 5-digit numeric string
- `not-found`: valid zip not present in `zip-to-state.json`
- `single`: zip maps to exactly one state
- `multi`: zip maps to two or more states

## Election

```typescript
interface Election {
  id: string;
  name: string;
  date: string; // ISO 8601: "YYYY-MM-DD"
  type: "primary" | "runoff" | "general";
  isPrimary: boolean;
  primaryType: "open" | "closed" | "semi-open" | "semi-closed" | null;
}
```

## RegistrationInfo

```typescript
interface RegistrationInfo {
  online: { available: boolean; deadline: string | null; url: string | null };
  byMail: { deadline: string | null; sincePostmarked: boolean };
  inPerson: { deadline: string | null; sincePostmarked: boolean };
  sameDayRegistration: boolean;
  registrationCheckUrl: string;
}
```

## EarlyVoting

```typescript
interface EarlyVoting {
  available: boolean;
  startDate: string | null;
  endDate: string | null;
  notes: string;
}
```

## VotingRules

```typescript
interface VotingRules {
  idRequired: boolean;
  acceptedIds: string[];
  phonesAtPolls: "allowed" | "prohibited" | "varies";
  phonesAtPollsDetail: string;
  additionalRules: string[];
}
```

## StateElectionData (root type for each state JSON file)

```typescript
interface StateElectionData {
  stateCode: string;
  stateName: string;
  lastUpdated: string;
  elections: Election[];
  registration: RegistrationInfo;
  earlyVoting: EarlyVoting;
  votingRules: VotingRules;
  resources: {
    stateElectionWebsite: string;
    countyElectionLookup: string;
    sampleBallotLookup: string;
    pollingPlaceLookup: string;
  };
}
```

## DeadlineStatus (derived, not stored)

```typescript
type DeadlineStatus = "urgent" | "approaching" | "on-track" | "closed";
```

Computed from days-remaining at render time per research.md Decision #3.

## ZipToStateMap

```typescript
type ZipToStateMap = Record<string, string[]>;
```

Loaded from `src/data/zip-to-state.json`.

## Validation Rules

| Field         | Rule                                                                      |
| ------------- | ------------------------------------------------------------------------- |
| zip input     | Matches `/^\d{5}$/` before lookup                                         |
| state JSON    | Loaded via static import; malformed data → catch block → generic error UI |
| election date | Parsed as `new Date(date + "T00:00:00")` to avoid UTC offset issues       |
