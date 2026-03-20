---
status: pending
priority: p2
issue_id: "002"
tags: [code-review, quality, typescript]
dependencies: []
---

# Add ISO date format validation in parseDateLocal

## Problem Statement

`parseDateLocal` in `src/lib/date-utils.ts` does not validate its input format. A malformed ISO date string will produce an `Invalid Date` object that silently propagates through deadline calculations, potentially causing NaN-based display bugs.

## Findings

- `parseDateLocal` (line 16) splits on `-` and maps to Number with no validation
- Malformed input like `"2026-13-45"` or `""` produces `Invalid Date` silently
- `getDaysUntil` would return `NaN`, `getDeadlineStatus` would hit no condition and return undefined behavior
- All date data comes from bundled JSON — low real-world risk, but defensive validation is correct practice

## Proposed Solutions

### Option 1: Throw on invalid format

```typescript
function parseDateLocal(isoDate: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    throw new Error(`Invalid ISO date format: ${isoDate}`);
  }
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}
```

**Pros:** Fails fast with clear error message, easy to debug
**Cons:** Could surface as uncaught error if data is bad
**Effort:** 15 minutes
**Risk:** Low

### Option 2: Return null on invalid input (change signature)

Would require updating all callers. More invasive.

**Effort:** 1 hour
**Risk:** Medium

## Recommended Action

Implement Option 1. Data comes from bundled JSON validated at build time, so throwing is appropriate — bad data is a developer error, not a user error.

## Technical Details

**Affected files:**

- `src/lib/date-utils.ts:16-18` — add regex guard before parsing

## Acceptance Criteria

- [ ] `parseDateLocal` throws with descriptive message on non-`YYYY-MM-DD` input
- [ ] Valid dates still parse correctly
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

## Work Log

### 2026-03-20 - Discovered in TypeScript review

**By:** CE Review Pipeline
