---
status: pending
priority: p1
issue_id: "001"
tags: [code-review, quality, typescript]
dependencies: []
---

# Remove internal exports from date-utils public API

## Problem Statement

Four functions in `src/lib/date-utils.ts` are exported but are purely internal implementation details. Exporting them leaks the internal API, creates false impression of intended external use, and bloats the module's public surface.

## Findings

- `getTodayLocal()` (line 7) — only used internally by `getDaysUntil()`
- `parseDateLocal()` (line 16) — only used internally by `formatDate()` and `getDaysUntil()`
- `getDaysUntil()` (line 33) — only used internally by `formatDeadline()`
- `getDeadlineStatus()` (line 42) — only used internally by `formatDeadline()`
- Only three functions need to be public: `getTodayISO()`, `formatDate()`, `formatDeadline()`
- Confirmed by grepping all imports: no external consumer uses the internal four

## Proposed Solutions

### Option 1: Remove `export` from internal functions

Remove the `export` keyword from `getTodayLocal`, `parseDateLocal`, `getDaysUntil`, `getDeadlineStatus`. Keep `getTodayISO`, `formatDate`, `formatDeadline` exported.

**Pros:** Simple, zero-risk, makes intent clear
**Cons:** None
**Effort:** 10 minutes
**Risk:** Low

## Recommended Action

Implement Option 1 immediately.

## Technical Details

**Affected files:**

- `src/lib/date-utils.ts:7, 16, 33, 42` — remove `export` keyword from four functions

## Acceptance Criteria

- [ ] `getTodayLocal`, `parseDateLocal`, `getDaysUntil`, `getDeadlineStatus` are not exported
- [ ] `getTodayISO`, `formatDate`, `formatDeadline` remain exported
- [ ] `npm run lint` passes with zero errors
- [ ] `npm run build` succeeds

## Work Log

### 2026-03-20 - Discovered in code-simplicity review

**By:** CE Review Pipeline
**Actions:** Identified via simplicity-reviewer and TypeScript reviewer cross-reference
