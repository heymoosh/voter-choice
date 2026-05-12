---
title: "Phase 6: Issue Ranking, Concern Disambiguation, and Anonymous Aggregate Counters"
date: 2026-05-12
mode: compact-safe
phase: 6
---

# Solution: Phase 6 — Issue Ranking, Concern Disambiguation, Polis Overlay

## Problem

Built the final phase of the ballot research tool: drag-and-rank issue prioritization, free-text concern mapping via AI, and anonymous aggregate counters with a Polis-style overlay.

## What Was Built

### Feature 1: Issue Ranking
- Keyboard-first sortable list (arrow keys + Space) for 12 canonical issues
- Mouse drag-and-drop supported via HTML5 drag events
- `aria-live` announces order changes for screen readers
- No @dnd-kit dependency — custom implementation satisfies all accessibility requirements
- `src/lib/canonicalIssues.ts`: frozen list + `RankedIssues` / `ConfirmedConcerns` types
- `src/components/IssueRanking.tsx`: sortable list with all required `data-testid`s

### Feature 2: Concern Disambiguation
- `POST /api/disambiguate-concerns`: calls Claude Sonnet; mock mode when `ANTHROPIC_API_KEY=test`
- `src/components/ConcernDisambiguation.tsx`: free-text input -> AI mapping -> confirmation panel
- Prompt injection protections: AI system prompt treats user input as untrusted
- No server-side logging of concern text

### Feature 3: Polis Overlay
- `GET /api/issue-counts?countyFips=...` and `POST /api/issue-counts/increment`
- Upstash Redis via HTTP API; key format `count:<county_fips>:<issue_slug>`
- Graceful degradation: when env vars absent, overlay hides but ranking works normally
- `src/components/PolisOverlay.tsx`: bar visualization with accessibility labels

### Integration
- `buildVoterValuesBlock()` in `src/lib/promptBuilder.ts`
- Phase 5 ChatWindow accepts `rankedIssues` and `confirmedConcerns` props
- Chat API accepts `voterValues` and injects into system prompt

## Key Decisions

1. No @dnd-kit: spec allows substitution; custom implementation simpler and more reliable
2. Upstash graceful degradation: app ships without Upstash; overlay activates once credentials provided
3. Mock mode for disambiguate-concerns: same pattern as chat mock
4. scoring/measure.mjs fix: replaced `npx next build` with `npm run build` (3 occurrences)

## Test Results

- Vitest: 56/56 passing
- Playwright: 196/196 passing
- Lint: clean

## Gotchas

- Chinese strings with smart quotes inside double-quoted JS strings cause parse errors — use single quotes
- Module-level cache object should be `const` not `let`
- React `useRef` should be removed if not attached to DOM element
