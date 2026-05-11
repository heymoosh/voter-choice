# Data Model: Ballot Research Tool

## Entities

### ZipToStateMapping
```
{
  [zipCode: string]: string[]  // array of 2-letter state codes
}
```

### StateData
```
{
  stateCode: string,            // "TX"
  stateName: string,            // "Texas"
  lastUpdated: string,          // ISO date
  elections: Election[],
  registration: Registration,
  earlyVoting: EarlyVoting,
  votingRules: VotingRules,
  resources: Resources
}
```

### Election
```
{
  id: string,
  name: string,
  date: string,                 // ISO date
  type: "primary" | "general" | "runoff" | "special",
  isPrimary: boolean,
  primaryType: "open" | "closed" | "semi-closed" | "semi-open" | null
}
```

### Registration
```
{
  online: {
    available: boolean,
    deadline: string | null,    // ISO date
    url: string
  },
  byMail: {
    deadline: string,
    sincePostmarked: boolean
  },
  inPerson: {
    deadline: string,
    sincePostmarked: boolean
  },
  sameDayRegistration: boolean,
  registrationCheckUrl: string
}
```

### EarlyVoting
```
{
  available: boolean,
  startDate: string | null,     // ISO date
  endDate: string | null,
  notes: string | null
}
```

### VotingRules
```
{
  idRequired: boolean,
  acceptedIds: string[],
  phonesAtPolls: "prohibited" | "allowed" | "varies",
  phonesAtPollsDetail: string,
  additionalRules: string[]
}
```

### Resources
```
{
  stateElectionWebsite: string,
  countyElectionLookup: string,
  sampleBallotLookup: string,
  pollingPlaceLookup: string
}
```

## Derived State (UI Runtime)

### DeadlineStatus
```
{
  label: "green" | "yellow" | "red" | "passed",
  text: string,                 // e.g. "12 days left" | "Passed"
  date: string                  // formatted date string
}
```

### AppState (React state machine)
```
{
  zipCode: string,              // controlled input value
  error: string | null,         // inline validation error
  loading: boolean,             // lookup in progress
  result: LookupResult | null   // null until valid lookup
}
```

### LookupResult
```
{
  type: "single" | "multi" | "not-found",
  states: string[],             // state codes
  selectedState: string | null, // chosen in multi-state case
  stateData: StateData | null,
  nextElection: Election | null
}
```
