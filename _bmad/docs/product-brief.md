# Product Brief: Voter Choice — AI Ballot Research Tool

## Vision

A free, single-page web application that empowers U.S. voters to research their specific ballot using AI. The tool eliminates the complexity of finding local election information by combining zip-code-based state lookup with a carefully crafted AI prompt that users paste into any free chatbot.

## Problem Statement

U.S. voters face a fragmented, confusing landscape when trying to research their ballot. Official election websites are inconsistent, candidate information is scattered, and most voters don't know what's actually on their ballot before Election Day. This leads to under-informed voting or voter abstention.

## Solution

A single-page web tool that:
1. Accepts a voter's zip code
2. Looks up their state's election information from static data
3. Generates a customized AI research prompt pre-filled with their state's context
4. Allows them to copy this prompt and paste it into any free AI chatbot (Claude, ChatGPT, Gemini, Grok)

## Target Users

- U.S. voters of all backgrounds and technical levels
- Primarily mobile users (mobile-first design required)
- First-time voters needing extra guidance
- Returning voters wanting efficient ballot research

## Core Features

### MVP (Phase 1)
- Hero section with tool explanation and chatbot links
- Zip code entry with validation (5-digit U.S. zip codes only)
- State election info display (elections, registration deadlines, early voting, ID rules)
- Customized prompt output with state-specific context block
- Copy-to-clipboard with visual confirmation
- Tips section
- Footer with attribution

### Data Coverage (Stub for Experiment)
- Texas (TX) — 73301
- California (CA) — 90210
- New Hampshire (NH) — 03031
- Multi-state zip — 86515 (AZ/NM)

## Hard Requirements

### Privacy & Security (Non-Negotiable)
- No client-side persistence (no localStorage, sessionStorage, cookies, IndexedDB)
- No third-party network requests from rendered page
- No server-side logging of user input
- API keys server-side only
- No eval, no Function(), no dangerouslySetInnerHTML, no unsanitized DOM input

### Accessibility
- WCAG AA compliance
- All interactive elements keyboard-navigable
- Screen reader support with proper ARIA
- Skip-to-content link
- Logical heading hierarchy

### Responsive Design
- Mobile-first (375px minimum)
- Touch targets minimum 44x44px
- Breakpoints: mobile (<640px), tablet (640-1024px), desktop (>1024px)

## Out of Scope
- LLM hosting or chat interface
- User accounts or authentication
- Full 50-state dataset
- Multiple language support
- Analytics or tracking
- Deployment configuration

## Success Metrics
- All e2e Playwright tests pass
- Lint runs without crashing
- Build succeeds without errors
- All 13 required data-testid attributes present
- All registration deadline status indicators accurate
