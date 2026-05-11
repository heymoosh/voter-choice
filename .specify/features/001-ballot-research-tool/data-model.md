# Data Model: Ballot Research Tool

## Entities

### ZipToStateMap
```typescript
Record<string, string[]>
// key: 5-digit zip code string
// value: array of 2-letter state abbreviation strings
```

### Election
```typescript
{
  id: string;               // e.g., "tx-2026-primary"
  name: string;             // e.g., "2026 Texas Primary Election"
  date: string;             // ISO date string "YYYY-MM-DD"
  type: "primary" | "general" | "runoff" | "special";
  isPrimary: boolean;
  primaryType: "open" | "closed" | "semi-closed" | "semi-open" | null;
}
```

### Registration
```typescript
{
  online: {
    available: boolean;
    deadline: string | null;   // ISO date or null
    url: string;
  };
  byMail: {
    deadline: string;
    sincePostmarked: boolean;
  };
  inPerson: {
    deadline: string;
    sincePostmarked: boolean;
  };
  sameDayRegistration: boolean;
  registrationCheckUrl: string;
}
```

### EarlyVoting
```typescript
{
  available: boolean;
  startDate: string | null;   // ISO date or null
  endDate: string | null;
  notes: string;
}
```

### VotingRules
```typescript
{
  idRequired: boolean;
  acceptedIds: string[];
  phonesAtPolls: "prohibited" | "allowed" | "varies";
  phonesAtPollsDetail: string;
  additionalRules: string[];
}
```

### Resources
```typescript
{
  stateElectionWebsite: string;
  countyElectionLookup: string;
  sampleBallotLookup: string;
  pollingPlaceLookup: string;
}
```

### StateData
```typescript
{
  stateCode: string;           // 2-letter USPS abbreviation
  stateName: string;           // Full state name
  lastUpdated: string;         // ISO date
  elections: Election[];
  registration: Registration;
  earlyVoting: EarlyVoting;
  votingRules: VotingRules;
  resources: Resources;
}
```

### DeadlineStatus
```typescript
{
  status: "green" | "yellow" | "red" | "passed";
  daysRemaining: number | null;  // null if passed
  label: string;                 // e.g., "12 days left" or "Passed"
  date: string;                  // ISO date
}
```

## Key Business Rules

1. **Next Election Selection**: First election in the state's elections array with `date >= today`
2. **Deadline Status Tiers**:
   - `passed`: deadline < today
   - `red`: 1–3 days remaining (≤3)
   - `yellow`: 4–14 days remaining (≤14)
   - `green`: 15+ days remaining (>14)
3. **Multi-state zip**: Any zip with more than one state in its array triggers state selector UI
4. **Unknown zip**: Zip not found in zip-to-state map shows `not-found-message`
5. **No upcoming election**: All elections have dates < today shows `no-election-message`
