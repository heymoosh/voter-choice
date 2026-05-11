---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
inputDocuments: ["_bmad-output/planning-artifacts/product-brief-voter-choice-2026-05-11.md", "docs/PROJECT_SPEC.md"]
date: "2026-05-11"
author: "Muxin"
status: "Approved"
---

# Product Requirements Document: Voter Choice Ballot Research Tool

## Overview

**Product Name**: Voter Choice  
**Version**: 1.0 (Phase 1 — Experiment Build)  
**Date**: 2026-05-11  
**Status**: Approved for Implementation

A single-page web application that helps U.S. voters research their ballot by generating a customized AI research prompt based on their zip code. The tool shows state-specific election information and provides a ready-to-paste prompt for any free AI chatbot.

---

## Problem Statement

Voters need personalized, privacy-preserving ballot research assistance but existing tools are fragmented, require accounts, or lack jurisdiction-specific context. This tool solves the "context gap" — providing users with the exact election data needed to have a productive conversation with any AI chatbot.

---

## Goals and Success Criteria

### Business Goals
- Provide free, accessible ballot research to U.S. voters
- Operate with zero user data collection
- Support viral sharing via mobile-optimized UX

### Success Criteria (Phase 1)
- All 13 `data-testid` elements present per spec
- Playwright e2e test suite passes
- Build succeeds without errors
- Registration deadline logic correct relative to current date
- Multi-state zip code handling works

---

## User Personas

### Primary: Mobile Voter (Sarah)
First-time or mobile voter who discovers the tool via social media. Needs fast, clear information without friction.

### Primary: Research-Oriented Voter (Marcus)
Wants to understand complex ballot measures. Will use the AI prompt to have a detailed conversation with a chatbot.

### Secondary: Senior Voter (Eleanor)
Uses the election info card directly. Doesn't necessarily interact with AI chatbots.

---

## User Stories

### Epic 1: Zip Code Entry
- US-001: As a voter, I can enter my 5-digit zip code and submit to look up my state's election info
- US-002: As a voter, I see an error message if I submit an empty input
- US-003: As a voter, I see an error message if I enter non-numeric characters
- US-004: As a voter, I see an error message if I enter fewer than 5 digits
- US-005: As a voter, I see a "not found" message if my zip code isn't in the dataset
- US-006: As a voter with a multi-state zip code, I see a state selector to choose my state

### Epic 2: State Election Information
- US-007: As a voter, I see a state info card with the upcoming election name and date
- US-008: As a voter, I see registration deadlines with color-coded status indicators
- US-009: As a voter, I see early voting dates (or "not available" if applicable)
- US-010: As a voter, I see voter ID requirements and phone-at-polls policy
- US-011: As a voter, I see links to my county election office and sample ballot lookup
- US-012: As a voter with all registration deadlines passed, I see an alert to check my registration

### Epic 3: Customized AI Prompt
- US-013: As a voter, I see a customized prompt with my state's election data injected
- US-014: As a voter, I can copy the full prompt to my clipboard with one click
- US-015: As a voter, I see a "Copied!" confirmation that disappears after ~2 seconds
- US-016: As a voter on an older browser, I see a fallback select-all + keyboard copy instruction

### Epic 4: Accessibility and Responsiveness
- US-017: As a keyboard user, I can navigate all interactive elements via Tab
- US-018: As a screen reader user, all errors and dynamic content are announced
- US-019: As a mobile user (375px), the layout renders correctly and copy button stays accessible
- US-020: As a user, I can skip to main content via a skip link

---

## Functional Requirements

### FR-001: Zip Code Input and Validation
- Input accepts only 5-digit numeric strings
- Submit triggers on button click and Enter key
- Validation errors shown in `data-testid="zip-error"` container

### FR-002: Zip-to-State Lookup
- Lookup from `src/data/zip-to-state.json` (static, no API)
- Supports single-state zips (one result) and multi-state zips (array)
- Unknown zip codes show `data-testid="not-found-message"`

### FR-003: State Info Display
- Shows in `data-testid="state-info"` after valid zip submission
- Must contain: election name (`data-testid="election-name"`), election date (`data-testid="election-date"`), registration status (`data-testid="registration-status"`)
- Registration status shows color + text label: green (>14 days), yellow (8-14 days), red (≤3 days), gray (passed)
- When no upcoming election: show `data-testid="no-election-message"`

### FR-004: Prompt Generation
- Combines base ballot prompt with state-specific context block
- State context block format per PROJECT_SPEC.md §Prompt Customization Logic
- Shown in `data-testid="prompt-output"`

### FR-005: Copy to Clipboard
- `data-testid="copy-button"` copies full prompt text
- `data-testid="copy-confirmation"` shown for ~2 seconds after successful copy
- Fallback for browsers without Clipboard API: select text + show manual copy instruction

### FR-006: Multi-State Zip Handling
- `data-testid="state-selector"` shown for multi-state zips
- Selecting a state triggers state info + prompt display for that state

---

## Non-Functional Requirements

### NFR-001: Privacy
- No `localStorage`, `sessionStorage`, `IndexedDB`, cookies, or Cache API for user input
- Zip code lives only in React component state
- No third-party scripts, analytics, or error tracking libraries
- No server-side logging of user input

### NFR-002: Performance
- State lookup from static JSON (near-instant)
- Loading state shown to prevent layout shift
- Mobile-first CSS with minimal bundle size

### NFR-003: Accessibility
- WCAG AA compliance (4.5:1 contrast for text, 3:1 for large text)
- All interactive elements keyboard-navigable
- Form inputs have associated `<label>` elements
- Error messages use `aria-live="polite"` or `role="alert"`
- Skip-to-content link present
- Logical heading hierarchy (h1 > h2 > h3)
- Minimum 44x44px tap targets on mobile

### NFR-004: Responsiveness
- Mobile-first (< 640px), tablet (640-1024px), desktop (> 1024px)
- Prompt output scrollable on mobile without losing copy button

### NFR-005: Security
- No `eval`, `Function()`, `dangerouslySetInnerHTML`
- API keys server-side only (no client bundle exposure)
- All `data-testid` attributes on correct elements per spec

---

## Data Requirements

### Data Model: Zip-to-State
File: `src/data/zip-to-state.json`
Format: `{ "zipCode": ["STATE_CODE", ...] }`

### Data Model: State Election Data
Files: `src/data/states/{STATE_CODE}.json`
Schema: per PROJECT_SPEC.md §State Election Data Schema
States required: TX, CA, NH (+ AZ/NM for multi-state stub)

---

## Technical Architecture Overview

- **Framework**: Next.js 15 App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Data**: Static JSON files (no database)
- **Testing**: Vitest (unit), Playwright (e2e)
- **Build**: `next build --turbo` (required for Node 22.14.0 compatibility)

---

## Acceptance Criteria

All criteria from PROJECT_SPEC.md §Acceptance Criteria apply. Key gate items:
- [ ] All 13 `data-testid` attributes present on correct elements
- [ ] Playwright e2e suite passes (25 tests)
- [ ] `next build --turbo` succeeds
- [ ] ESLint runs without crashing
- [ ] No `localStorage`/`sessionStorage`/cookie usage in client code
