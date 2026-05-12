---
title: feat: Build Ballot Research Tool (Phase 1)
type: feat
status: active
date: 2026-05-11
---

# feat: Build Ballot Research Tool (Phase 1)

## Overview

Build the complete ballot research tool as a single-page Next.js application. Users enter their zip code, see their state's election info, and receive a customized AI prompt they can copy and paste into any free AI chatbot to research their ballot.

## Problem Statement / Motivation

Voters need accessible, privacy-respecting tools to research their ballots. This tool provides a customized prompt that works with any free AI chatbot, including Claude, ChatGPT, Gemini, and Grok.

## Proposed Solution

Single-page Next.js 15 app with:
1. Hero section with chatbot links
2. Zip code input with validation
3. State election info card (after valid zip submission)
4. Customized AI prompt output with copy-to-clipboard
5. Tips section and footer

## Technical Considerations

- **Static JSON data**: All state data in `src/data/` — no external API calls
- **Privacy-first**: No localStorage, no analytics, no server-side user logging
- **Next.js 15 + --turbo**: Use `next build --turbo` to avoid WasmHash webpack bug on Node 22
- **data-testid attributes**: Required by shared Playwright test suite (see PROJECT_SPEC.md)
- **Zip-to-state mapping**: Multi-state zip codes need state selector UI
- **Today's date = 2026-05-11**: Deadline calculations relative to this date

## Acceptance Criteria

- [ ] Hero section with headline, subtitle, chatbot links
- [ ] Zip code input with `data-testid="zip-input"`
- [ ] Submit button with `data-testid="zip-submit"`
- [ ] Inline error display with `data-testid="zip-error"` for validation errors
- [ ] State info card with `data-testid="state-info"` showing election name, date, registration status
- [ ] `data-testid="election-name"` and `data-testid="election-date"` within state-info
- [ ] `data-testid="registration-status"` with deadline status indicators (color + text)
- [ ] Multi-state selector with `data-testid="state-selector"`
- [ ] `data-testid="not-found-message"` for unknown zip codes
- [ ] `data-testid="no-election-message"` for states with no upcoming election
- [ ] Customized prompt output in `data-testid="prompt-output"` with state name and zip code
- [ ] `data-testid="copy-button"` that copies full prompt
- [ ] `data-testid="copy-confirmation"` shown for ~2 seconds after copy
- [ ] Skip-to-content link for accessibility
- [ ] Keyboard navigation (Enter key submits form)
- [ ] Mobile-responsive layout (375px, 768px, 1280px breakpoints)
- [ ] `npm run build` succeeds with `--turbo`
- [ ] `npm run lint` passes
- [ ] `npx vitest run` passes
- [ ] `npx playwright test` passes

## Implementation Tasks

### 1. Fix build script (--turbo flag)
- Edit `package.json` build script: `"build": "next build --turbo"`

### 2. Create utility functions (`src/lib/stateData.ts`)
- `loadZipToState(zip)` — returns state code(s) or null
- `loadStateData(stateCode)` — loads JSON from `src/data/states/`
- `findNextElection(elections)` — first election with date >= today
- `computeDeadlineStatus(dateStr)` — returns days remaining and status (passed/urgent/warning/ok)
- `buildPromptContext(stateData, zip, election)` — generates the pre-filled context block

### 3. Create API route (`src/app/api/state/route.ts`)
- GET `/api/state?zip=73301` → returns state data JSON
- Handles multi-state zips (returns array of state options)
- No user input in server logs

### 4. Build main page component (`src/app/page.tsx`)
- ZipForm component with validation
- StateInfoCard component showing election info
- PromptOutput component with copy functionality
- StateSelector for multi-state zips

### 5. Add static ballot prompt content
- Read BALLOT_PROMPT.md prompt section starting at "You are a nonpartisan civic research assistant..."
- Store as constant in `src/lib/ballotPrompt.ts`

### 6. Vitest unit tests (`src/lib/__tests__/`)
- Test deadline status calculations
- Test next election finding
- Test prompt context generation

## Success Metrics

- All 24 Playwright e2e tests pass
- Vitest unit tests pass
- ESLint: 0 errors
- LOC: ~400-600 application lines

## Dependencies & Risks

- **Node 22 / Next 15 WasmHash bug**: Mitigated by `--turbo` flag on build
- **Multi-state zip (86515 AZ/NM)**: Need AZ and NM stub data or state-selector without full data
- **Today's date 2026-05-11**: TX registration deadlines already passed; app must show "Passed" status

## Sources & References

- Spec: `docs/PROJECT_SPEC.md`
- Ballot prompt: `docs/BALLOT_PROMPT.md`
- State data: `src/data/states/TX.json`, `CA.json`, `NH.json`
- Zip mapping: `src/data/zip-to-state.json`
- E2e tests: `e2e/ballot-tool.spec.ts`
