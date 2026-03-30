# Data Model: Ballot Research Tool

**Feature**: 002-ballot-research-tool
**Date**: 2026-03-30

## Entities

### ZipToStateMap

```typescript
// src/data/zip-to-state.json (already exists in scaffold)
type ZipToStateMap = Record<string, string[]>
// Key: 5-digit zip code string
// Value: array of 2-letter state abbreviations (length 1 for most, >1 for border zips)
```

**Constraints**:
- Keys MUST be exactly 5 characters, numeric only
- Values MUST be non-empty arrays of valid US state abbreviations

### StateElectionData

```typescript
// src/data/states/<XX>.json (already exists for TX, CA, NH in scaffold)
interface StateElectionData {
  stateCode: string          // 2-letter USPS abbreviation e.g. "TX"
  stateName: string          // Full name e.g. "Texas"
  lastUpdated: string        // ISO date YYYY-MM-DD

  elections: Election[]
  registration: Registration
  earlyVoting: EarlyVoting
  votingRules: VotingRules
  resources: Resources
}

interface Election {
  id: string
  name: string
  date: string               // ISO date YYYY-MM-DD
  type: 'primary' | 'general' | 'runoff' | 'special'
  isPrimary: boolean
  primaryType: 'open' | 'closed' | 'semi-closed' | 'semi-open' | null
}

interface Registration {
  online: {
    available: boolean
    deadline: string | null  // ISO date or null if unavailable
    url: string
  }
  byMail: {
    deadline: string         // ISO date
    sincePostmarked: boolean // true = postmark, false = received
  }
  inPerson: {
    deadline: string         // ISO date
    sincePostmarked: boolean
  }
  sameDayRegistration: boolean
  registrationCheckUrl: string
}

interface EarlyVoting {
  available: boolean
  startDate: string | null   // ISO date, null if no early voting
  endDate: string | null
  notes?: string
}

interface VotingRules {
  idRequired: boolean
  acceptedIds: string[]
  phonesAtPolls: 'prohibited' | 'allowed' | 'varies'
  phonesAtPollsDetail: string
  additionalRules: string[]
}

interface Resources {
  stateElectionWebsite: string
  countyElectionLookup: string
  sampleBallotLookup: string
  pollingPlaceLookup: string
}
```

### DeadlineStatus (derived)

```typescript
type StatusColor = 'green' | 'yellow' | 'red' | 'passed'

interface DeadlineStatus {
  date: string           // ISO date of the deadline
  daysLeft: number       // negative if passed
  label: string          // "X days left" or "Passed"
  color: StatusColor     // derived from daysLeft
}

// Derivation rules:
// daysLeft > 14  → green,  label: "{daysLeft} days left"
// 4 ≤ daysLeft ≤ 14 → yellow, label: "{daysLeft} days left"
// 1 ≤ daysLeft ≤ 3  → red,    label: "{daysLeft} days left"
// daysLeft === 0    → red,    label: "Today (last day)"
// daysLeft < 0      → passed, label: "Passed"
```

### LookupResult (derived, UI state)

```typescript
type LookupResult =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'multi-state'; states: string[] }    // zip spans multiple states
  | { status: 'found'; state: StateElectionData }
  | { status: 'not-found' }
  | { status: 'no-election'; state: StateElectionData }  // state found but no upcoming election
  | { status: 'error'; message: string }
```

### CustomizedPrompt (derived)

```typescript
interface CustomizedPrompt {
  basePrompt: string        // loaded from docs/BALLOT_PROMPT.md
  contextBlock: string      // generated from StateElectionData + zip + today
  fullText: string          // basePrompt + "\n\n" + contextBlock
}
```

## State Transitions

```
idle → loading (on zip submit)
loading → found       (zip in dataset, single state, upcoming election exists)
loading → multi-state (zip maps to multiple states)
loading → not-found   (zip not in dataset)
loading → no-election (state found but no upcoming election date ≥ today)
multi-state → found   (user selects a state)
found → idle          (user clears the form / new search)
```

## Validation Rules

- Zip input: `/^\d{5}$/` — exactly 5 digits
- State code lookup: case-insensitive, uppercase normalization
- "Next upcoming election": first election in array where `date >= todayISO`
  (string comparison valid for ISO dates)
- All deadline comparisons use `todayISO = new Date().toISOString().split('T')[0]`
