---
status: pending
priority: p3
issue_id: "006"
tags: [code-review, quality]
dependencies: []
---

# Extract deadline threshold magic numbers to named constants

## Problem Statement

`getDeadlineStatus` in `src/lib/date-utils.ts` uses magic numbers `3` and `14` for deadline status thresholds. These are not self-documenting and require a comment to understand.

## Findings

- `src/lib/date-utils.ts:42-46`: `if (daysRemaining <= 3)` and `if (daysRemaining <= 14)`
- No named constants or comments explaining the thresholds
- Changing thresholds requires knowing which numbers to change

## Proposed Solutions

### Option 1: Named constants at module top

```typescript
const DEADLINE_URGENT_DAYS = 3;
const DEADLINE_WARNING_DAYS = 14;

function getDeadlineStatus(daysRemaining: number): DeadlineStatus {
  if (daysRemaining < 0) return "passed";
  if (daysRemaining <= DEADLINE_URGENT_DAYS) return "urgent";
  if (daysRemaining <= DEADLINE_WARNING_DAYS) return "warning";
  return "safe";
}
```

**Effort:** 5 minutes
**Risk:** Low

## Recommended Action

Option 1.

## Technical Details

**Affected files:**

- `src/lib/date-utils.ts:42-46`

## Acceptance Criteria

- [ ] Magic numbers replaced with named constants
- [ ] `npm run lint` passes

## Work Log

### 2026-03-20 - Discovered in architecture review

**By:** CE Review Pipeline
