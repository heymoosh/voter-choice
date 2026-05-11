---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: ["docs/PROJECT_SPEC.md"]
date: "2026-05-11"
author: "Muxin"
---

# Product Brief: voter-choice

## Executive Summary

Voter Choice is a free, privacy-first AI-powered ballot research tool for U.S. voters. Users enter their 5-digit zip code to instantly receive state-specific election information and a customized AI research prompt they can paste into any free chatbot (Claude, ChatGPT, Gemini, Grok). The tool requires no accounts, stores no data, and degrades gracefully when AI services are unavailable.

---

## Core Vision

### Problem Statement

Most voters lack easy access to consolidated, personalized ballot research assistance. Existing tools are fragmented, require account creation, or rely on third-party services that compromise voter privacy. Voters need a fast, trustworthy way to get election-specific guidance tailored to their jurisdiction — especially mobile users who discovered the concept through viral social sharing.

### Problem Impact

- Uninformed voters skip races they don't understand, lowering participation in down-ballot contests
- Voters who want AI assistance have no privacy-preserving way to get jurisdiction-specific ballot context
- Current solutions (official election websites, partisian voter guides) are either too dry or too biased
- Mobile users (majority of viral traffic) face particularly poor UX on government election sites

### Why Existing Solutions Fall Short

- Official state websites: accurate but dense, not conversational, mobile-unfriendly
- Partisan voter guides: biased, incomplete, don't cover all races
- General AI chatbots: lack jurisdiction-specific election data and require users to research their own context
- Other civic tech tools: require registration, store personal data, or have limited state coverage

### Proposed Solution

A single-page Next.js web application that:
1. Takes a zip code as the only user input
2. Looks up state election data from a pre-built static JSON dataset
3. Generates a rich, customized AI prompt pre-filled with the voter's specific election context
4. Lets the voter copy that prompt and paste it into any free AI chatbot for conversational research
5. Shows key election dates, deadlines, and voting rules as a standalone information card

### Key Differentiators

- **Zero data retention**: no cookies, no localStorage, no accounts — privacy is architectural
- **Graceful degradation**: works even without a live AI service by providing a copy-paste fallback
- **Jurisdiction-specific context injection**: the prompt is pre-filled with actual election data, not generic instructions
- **Mobile-first**: designed for the viral Reddit/social traffic that drives most usage
- **Accessible by design**: WCAG AA compliance is a hard requirement, not an afterthought

---

## Target Users

### Primary Users

**Sarah, First-Time Texas Voter (age 24)**
- College graduate, recently moved to a new city in Texas
- Sees the tool shared on Reddit the week before voter registration deadline
- Wants to understand primary election rules (open vs. closed, ID requirements)
- Uses her phone almost exclusively; frustrated by official state websites
- Success: enters zip, gets registration deadline with countdown, copies AI prompt, chats with Claude to understand each race

**Marcus, Busy Professional in California (age 38)**
- Knows he should vote but never has time to research all the ballot measures
- Discovers tool via social media link, on his phone during lunch
- Wants to quickly understand what's on his ballot without partisan spin
- Success: enters zip, sees CA voter-by-mail info, copies prompt, gets a neutral briefing on all measures from ChatGPT

**Eleanor, Senior Voter in New Hampshire (age 67)**
- Regular voter, wants to make sure she has the right ID and knows the polling rules
- Son shares the link with her
- Less familiar with AI chatbots; primarily uses the tool for the election info card itself
- Success: enters zip, reads the state info card, confirms she doesn't need a photo ID in NH

### Secondary Users

- **Civic organizations and educators**: share the tool link to help constituents/students research ballots
- **Journalists and researchers**: use the tool to verify state election rules and test AI research quality
- **Accessibility advocates**: test and validate the tool's screen reader and keyboard navigation support

### User Journey

1. **Discovery**: Sees link on social media (Reddit, Twitter/X, Bluesky) or receives it from a friend/organization
2. **Landing**: Arrives at single-page app, immediately sees headline and zip code input
3. **Entry**: Types 5-digit zip code and submits
4. **State Info**: Views election name, registration deadlines with color-coded status, early voting dates, ID rules
5. **Prompt Copy**: Reads the customized AI prompt, clicks "Copy to Clipboard"
6. **AI Chat**: Pastes prompt into their preferred chatbot and begins researching their ballot
7. **Return** (optional): Bookmarks or reshares the tool for future elections

---

## Success Metrics

### Primary Metrics

- **Functional**: All 13 required `data-testid` elements present and tested by shared Playwright suite
- **Correctness**: Prompt output contains accurate state-specific fields (election name, dates, ID rules, links)
- **Deadline calculation**: Color-coded status indicators correctly reflect days-remaining from today's date
- **Multi-state handling**: Zip codes spanning multiple states show a state selector

### Secondary Metrics

- **Accessibility**: Skip-to-content link present, ARIA labels on interactive elements, keyboard navigation works
- **Responsive**: App renders correctly at 375px (mobile), 768px (tablet), 1280px (desktop)
- **Privacy compliance**: No localStorage/sessionStorage/cookie usage in client-side code
- **Error states**: All 6 error conditions (empty, non-numeric, wrong length, not found, multi-state, no election) handled correctly

### Quality Threshold

- Zero build errors (`next build --turbo` succeeds)
- ESLint passes without crashing
- Playwright e2e suite passes (shared 25-test suite)
- Any workflow-generated unit tests pass

---

## Scope

### In Scope (Phase 1)

- Single-page Next.js 15 app with TypeScript and Tailwind CSS
- Zip code entry with validation (5-digit numeric only)
- State election data lookup from static JSON (TX, CA, NH + multi-state stub AZ/NM)
- Registration deadline status calculation (green/yellow/red/gray with text labels)
- Customized AI prompt generation from template + state data
- Copy-to-clipboard with visual confirmation
- All required `data-testid` attributes per PROJECT_SPEC.md
- Accessibility features: skip link, ARIA labels, keyboard navigation, screen reader support
- Responsive design: mobile-first with tablet/desktop breakpoints
- Error states for all defined conditions

### Out of Scope

- LLM hosting or API integration (users paste to their own chatbot)
- User accounts, authentication, or data storage
- Full 50-state dataset (stub for TX, CA, NH + AZ/NM only)
- Deployment/Vercel configuration
- Analytics or tracking
- Multi-language support
