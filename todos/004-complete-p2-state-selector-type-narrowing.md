---
status: pending
priority: p2
issue_id: "004"
tags: [code-review, typescript, quality]
dependencies: []
---

# Fix type narrowing order in handleStateSelect

## Problem Statement

In `BallotToolClient.tsx`, `handleStateSelect` checks `appState.status !== "multi-state"` after destructuring `e.target.value`. TypeScript cannot narrow `appState` to the `multi-state` variant for the `resolveState` call without the guard being first. The current order also reads confusingly.

## Findings

- `src/components/BallotToolClient.tsx:64-68`: guard order means TypeScript doesn't narrow `appState` type before `resolveState` call
- `appState.zip` access on line 68 is technically safe (the runtime check at line 66 protects it) but TypeScript doesn't know that
- Reordering the guard fixes both the type narrowing and readability

## Proposed Solutions

### Option 1: Move status guard before value extraction

```typescript
const handleStateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
  if (appState.status !== "multi-state") return;
  const stateCode = e.target.value;
  if (!stateCode) return;
  resolveState(stateCode, appState.zip);
};
```

**Pros:** TypeScript now narrows `appState` correctly, cleaner logic flow
**Cons:** None
**Effort:** 5 minutes
**Risk:** Low

## Recommended Action

Implement Option 1.

## Technical Details

**Affected files:**

- `src/components/BallotToolClient.tsx:64-68`

## Acceptance Criteria

- [ ] Status guard is first check in `handleStateSelect`
- [ ] TypeScript infers `appState` as `multi-state` variant after guard
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

## Work Log

### 2026-03-20 - Discovered in TypeScript review

**By:** CE Review Pipeline
