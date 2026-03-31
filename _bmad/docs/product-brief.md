---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - '_bmad-output/brainstorming/brainstorming-session-2026-03-31-0200.md'
  - 'docs/PROJECT_SPEC.md'
  - 'docs/BALLOT_PROMPT.md'
date: 2026-03-31
author: Muxin
---

# Product Brief: voter-choice

## Executive Summary

The Ballot Research Tool is a single-page web application that bridges the gap between AI chatbots and civic engagement. Voters enter their zip code, the tool looks up their state's election information, and generates a customized AI ballot research prompt pre-filled with local dates, deadlines, links, and rules. The user copies this prompt and pastes it into any free AI chatbot (Claude, ChatGPT, Gemini, Grok) to begin an interactive ballot research session.

This is not an AI chatbot itself — it's a prompt generation tool that leverages the AI tools voters already have access to. It democratizes ballot research by eliminating the need to manually gather election information before starting an AI-assisted research session.

---

## Core Vision

### Problem Statement

U.S. voters who want to use AI chatbots to research their ballot face a cold-start problem: they need to tell the chatbot their state, election dates, registration deadlines, voter ID rules, and other local information before the AI can help effectively. Most voters don't know this information off the top of their head, and gathering it from scattered government websites is tedious and error-prone. This friction prevents voters from using AI tools for one of their most impactful civic activities.

### Problem Impact

- **Information fragmentation:** Election rules vary by state across dozens of dimensions (primary type, registration deadlines, early voting periods, ID requirements, phone policies at polls). No single source aggregates this for AI chatbot use.
- **Time barrier:** Manually researching state election info before even starting a chatbot conversation takes 15-30 minutes — longer than most voters are willing to invest.
- **Error risk:** Voters who guess or use outdated information get less accurate AI responses, potentially missing deadlines or misunderstanding voting rules.
- **Equity gap:** Voters less comfortable with technology or less familiar with their state's election system are least likely to successfully use AI ballot research — the people who would benefit most are least served.

### Why Existing Solutions Fall Short

- **State election websites:** Authoritative but fragmented. Each state has different layouts, terminology, and information architecture. Not designed for AI chatbot input.
- **Voter information aggregators (Vote.org, Ballotpedia):** Provide election info but don't generate AI prompts. Users still need to manually transfer information.
- **AI chatbot direct queries:** Users who ask chatbots "help me research my ballot" get generic responses. Without state-specific context pre-loaded, the AI has to ask many questions before becoming useful.
- **No existing tool** combines election data lookup with AI prompt generation. This is a novel product category.

### Proposed Solution

A zero-friction, single-page web application that:

1. Accepts a 5-digit zip code
2. Instantly looks up state election data from static JSON
3. Displays a summary card with key election info (next election, deadlines, early voting, ID requirements)
4. Generates a customized version of a proven ballot research prompt with all state-specific information pre-filled
5. Provides a one-click copy button so users can paste the prompt directly into any AI chatbot

The entire flow from zip code entry to copied prompt takes under 30 seconds. No accounts, no data storage, no API calls — just static data served fast.

### Key Differentiators

- **Prompt-first design:** The product IS the generated prompt. Everything else (state info display, deadline indicators) is supporting context.
- **Chatbot-agnostic:** Works with any AI chatbot. No vendor lock-in, no API integration needed.
- **Zero friction:** No signup, no data storage, no tracking. Enter zip → copy prompt → paste → research.
- **Open and transparent:** The prompt is visible before copying. Users see exactly what they're sending to the chatbot.
- **Mobile-first civic tool:** Designed for the Reddit-viral scenario — most users will be on phones.
- **Static and fast:** All data is pre-compiled JSON. No server-side computation, no loading delays, no API rate limits.

---

## Target Users

### Primary Users

**1. The Motivated but Overwhelmed Voter ("Jordan")**
- 28 years old, first time voting in a primary election
- Heard about AI ballot research on Reddit/social media
- Wants to make informed decisions but doesn't know where to start
- Comfortable with technology but unfamiliar with election processes
- **Pain point:** Knows AI chatbots exist but doesn't have the election-specific information needed to get useful responses
- **Success moment:** Copies the prompt, pastes it into Claude, and immediately gets a personalized ballot walkthrough without having to research anything first

**2. The Civic Advocate ("Maria")**
- 45 years old, shares voting resources with family and community
- Wants to help others research their ballots using AI tools
- Looks up information for multiple zip codes (family in different states)
- **Pain point:** Helping others use AI chatbots requires explaining how to gather state-specific information first
- **Success moment:** Shares a link with zip code pre-loaded — recipients get customized prompts instantly

**3. The Time-Pressed Voter ("David")**
- 52 years old, votes every election but rarely researches downballot races
- Has 10 minutes between meetings to start ballot research
- Will use desktop at work or phone on commute
- **Pain point:** Doesn't have time to research state election rules before even starting AI-assisted ballot research
- **Success moment:** Enters zip code on phone, copies prompt, pastes into ChatGPT, starts researching in under 60 seconds

### Secondary Users

**Advocacy organizations** that want to embed or share the tool with their constituents. They benefit from increased voter engagement without building their own tools.

### User Journey

1. **Discovery:** User sees the tool shared on social media, in a news article, or by an advocacy organization
2. **Landing:** Arrives at the single-page app. Hero section explains the concept in one sentence.
3. **Input:** Enters zip code (or uses shared link with zip pre-loaded)
4. **Review:** Sees state election info summary card — confirms correct state and upcoming election
5. **Copy:** Clicks "Copy to Clipboard" to copy the customized prompt
6. **Use:** Pastes prompt into any AI chatbot and begins interactive ballot research
7. **Share:** Shares the tool link with friends and family

---

## Success Metrics

### User Success Metrics

- **Prompt copy rate:** Percentage of users who enter a valid zip code AND copy the prompt (target: >60%)
- **Time to copy:** Median time from page load to prompt copy (target: <30 seconds)
- **Error recovery rate:** Percentage of users who encounter an error and successfully retry (target: >80%)
- **Multi-state resolution:** Percentage of multi-state zip users who select a state and proceed (target: >90%)

### Business Objectives

- **Reach:** Number of unique prompt copies per election cycle
- **Viral coefficient:** Average shares per user (social sharing, link sharing)
- **Coverage:** Percentage of U.S. states with complete, accurate data
- **Reliability:** Uptime during election week (target: 99.9%)

### Key Performance Indicators

| KPI | Target | Measurement |
|-----|--------|-------------|
| Lighthouse Performance | ≥90 | Automated via npm run measure |
| Lighthouse Accessibility | ≥90 | Automated via npm run measure |
| E2E Test Pass Rate | 100% | Playwright test suite (42 tests) |
| ESLint Errors | 0 | Automated via npm run measure |
| First Load JS | <120 KB | Next.js bundle analyzer |
| Time to Interactive | <2s on 3G | Lighthouse measurement |

---

## MVP Scope

### Core Features

1. **Zip Code Entry** — Single input field with validation (5-digit numeric), submit button, inline error messages
2. **State Lookup** — Static JSON lookup: zip → state code(s) → state election data
3. **Multi-State Handling** — State selector for zip codes spanning multiple states (e.g., 86515 → AZ/NM)
4. **State Info Display** — Summary card showing: election name/date, registration deadlines with status indicators (green/yellow/red/gray), early voting dates, voter ID requirements, phone-at-polls policy, resource links
5. **Prompt Generation** — Full ballot research prompt (from BALLOT_PROMPT.md) with state-specific context block appended
6. **Copy to Clipboard** — One-click copy with "Copied!" confirmation (2-second timeout)
7. **Hero Section** — Headline, subtitle, supported chatbot logos with links
8. **Tips Section** — Static tips for effective AI ballot research
9. **Footer** — Share CTA, attribution, source link
10. **Responsive Design** — Mobile-first (375px), tablet (768px), desktop (1280px)
11. **Accessibility** — WCAG AA, keyboard navigation, screen reader support, skip-to-content link, ARIA live regions
12. **All 14 data-testid attributes** per PROJECT_SPEC.md

### Out of Scope for MVP

- Hosting or running an LLM
- User accounts, authentication, or data storage
- Full 50-state dataset (stub data for TX, CA, NH only)
- Deployment configuration (Vercel)
- Analytics or tracking
- Multiple language support (Phase 2)
- Geolocation-based zip lookup
- Chatbot deep links or API integration
- Offline/service worker support
- Share-as-link with encoded zip code

### MVP Success Criteria

- All 42 Playwright e2e tests pass
- Lighthouse scores ≥90 across all 4 categories
- ESLint 0 errors
- Production build succeeds (`next build`)
- All 14 data-testid attributes present and functional
- Correct prompt generation for all 3 stub states
- Responsive layout at all 3 breakpoints
- Keyboard navigable with visible focus indicators
- Screen reader accessible with proper announcements

### Future Vision

- **Phase 2:** Spanish language support with i18n architecture
- **Post-experiment:** Full 50-state data, Vercel deployment, social sharing with pre-loaded zip codes
- **Long-term:** Embeddable widget for advocacy organizations, voter profile persistence across elections, chatbot deep links
