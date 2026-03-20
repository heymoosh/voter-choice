---
status: pending
priority: p3
issue_id: "005"
tags: [code-review, quality]
dependencies: []
---

# Remove export from generateContextBlock (internal-only function)

## Problem Statement

`generateContextBlock` in `src/lib/prompt-generator.ts` is exported but only called internally by `generateFullPrompt`. Exporting it leaks an implementation detail as public API.

## Findings

- `src/lib/prompt-generator.ts:293`: `export function generateContextBlock(...)`
- Only caller is `generateFullPrompt` on line 334 of the same file
- No external imports of `generateContextBlock` anywhere in the codebase
- Public API should be: `MAIN_PROMPT` (const), `generateFullPrompt` (function)

## Proposed Solutions

### Option 1: Remove export keyword

Remove `export` from `generateContextBlock`. No callers to update.

**Effort:** 2 minutes
**Risk:** Low

## Recommended Action

Option 1.

## Technical Details

**Affected files:**

- `src/lib/prompt-generator.ts:293`

## Acceptance Criteria

- [ ] `generateContextBlock` is not exported
- [ ] `generateFullPrompt` and `MAIN_PROMPT` remain exported
- [ ] `npm run build` succeeds

## Work Log

### 2026-03-20 - Discovered in simplicity review

**By:** CE Review Pipeline
