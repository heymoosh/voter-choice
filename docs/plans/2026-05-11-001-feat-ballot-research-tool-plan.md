---
title: feat: Build Ballot Research Tool Single-Page App
type: feat
status: active
date: 2026-05-11
---

# feat: Build Ballot Research Tool Single-Page App

## Overview

Build a single-page Next.js 15 application that helps U.S. voters research their ballot. Users enter a zip code, the app looks up election data from static JSON files, and displays customized AI prompt text for them to copy into any free chatbot (Claude, ChatGPT, Gemini, Grok).

## Problem Statement / Motivation

Voters need a simple, privacy-safe tool to research their ballot. The application must work without storing any user data and must degrade gracefully when AI budgets run out (copy-paste experience).

## Proposed Solution

A client-side React component in Next.js that:
1. Accepts zip code input with validation
2. Looks up state data from static JSON
3. Displays election info, registration deadlines with color-coded status
4. Generates customized ballot prompt with state-specific context injected
5. Provides copy-to-clipboard with visual confirmation

## Technical Considerations

### Architecture

- **Next.js 15 App Router** with `"use client"` for interactive components
- **Static JSON data** in `src/data/` — no external API calls
- **TypeScript types** for StateData schema
- **Tailwind CSS** for styling (already configured)
- **No localStorage/sessionStorage** — state in React component memory only

### Files to Create

- `src/types/state.ts` — TypeScript types matching the JSON schema
- `src/lib/stateRegistry.ts` — zip-to-state lookup and state data loader
- `src/lib/promptBuilder.ts` — builds customized prompt with injected context
- `src/lib/deadlineUtils.ts` — deadline calculation and status logic
- `src/app/page.tsx` — main page component (replace default scaffold)
- `src/__tests__/deadlineUtils.test.ts` — unit tests for deadline calculations
- `src/__tests__/promptBuilder.test.ts` — unit tests for prompt building

### Key Implementation Details

- Zip validation: `/^\d{5}$/` pattern
- Multi-state zips (86515 → AZ/NM): show `data-testid="state-selector"` dropdown
- Deadline status colors: >14 days = green, ≤14 = yellow, ≤3 = red, passed = gray
- Copy button: 2-second "Copied!" confirmation with `data-testid="copy-confirmation"`
- Enter key submits form
- All `data-testid` attributes from PROJECT_SPEC.md required

### Privacy Constraints (Hard Requirements)

- No `localStorage`, `sessionStorage`, `IndexedDB`, cookies
- No third-party scripts, analytics, or tracking
- No server-side logging of user input
- API keys server-side only

## System-Wide Impact

- **Interaction graph**: User input → zip validation → state lookup (static JSON) → prompt build → clipboard API
- **Error propagation**: Invalid zip → inline error; unknown zip → not-found message; no election → no-election-message
- **State lifecycle risks**: All state in component memory; unmount clears everything
- **API surface parity**: No external APIs in Phase 1

## Acceptance Criteria

- [ ] Zip code input with `data-testid="zip-input"` accepts only 5-digit numeric values
- [ ] Submit button `data-testid="zip-submit"` triggers lookup
- [ ] Error states show `data-testid="zip-error"` for invalid input
- [ ] `data-testid="not-found-message"` for unknown zip codes
- [ ] `data-testid="state-info"` card shows state name, election name/date, registration deadlines
- [ ] `data-testid="election-name"` and `data-testid="election-date"` within state-info
- [ ] `data-testid="registration-status"` with color-coded deadline indicators
- [ ] `data-testid="state-selector"` dropdown for multi-state zip codes (86515)
- [ ] `data-testid="prompt-output"` shows full customized prompt with state context
- [ ] `data-testid="copy-button"` copies prompt to clipboard
- [ ] `data-testid="copy-confirmation"` shows "Copied!" for 2 seconds
- [ ] Enter key submits form
- [ ] Mobile-first responsive design (375px, 768px, 1280px breakpoints)
- [ ] WCAG AA color contrast
- [ ] Skip-to-content link for keyboard users
- [ ] Logical heading hierarchy h1 > h2 > h3
- [ ] All tests pass (vitest unit + playwright e2e)

## Success Metrics

- All 30+ Playwright e2e tests pass
- Vitest unit tests cover deadline calculations and prompt building
- ESLint runs without errors
- `next build` succeeds

## Dependencies & Risks

- Next.js 15.5.12 WasmHash webpack bug on Node 22.14.0 → Fix: use `--turbo` in build script
- Clipboard API requires HTTPS or localhost → Playwright grants permissions in tests
- Static data for TX, CA, NH, and multi-state 86515 (AZ/NM) must exist

## Sources & References

- Feature spec: `docs/PROJECT_SPEC.md`
- Ballot prompt text: `docs/BALLOT_PROMPT.md`
- State data: `src/data/states/TX.json`, `CA.json`, `NH.json`
- Zip mapping: `src/data/zip-to-state.json`
