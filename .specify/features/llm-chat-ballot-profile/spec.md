# Feature Specification: LLM Chat Window, Downloadable Ballot, and Voter Profile

**Feature Name:** llm-chat-ballot-profile
**Status:** Ready for Implementation
**Created:** 2026-05-12
**Phase:** 5

---

## Overview

Add three interconnected features to the voter-choice app: (1) an on-site AI chat interface powered by Claude Sonnet via the Anthropic API, (2) a downloadable printable ballot, and (3) an uploadable/downloadable voter profile. The existing copy-paste flow remains fully functional as an alternative path.

---

## Functional Requirements

### FR-C01: LLM Chat Window
- A chat CTA button appears after the user submits their zip code and data loads
- Clicking the CTA opens a chat panel on the same page without navigation
- Streaming responses — text appears incrementally as the AI generates it
- The system prompt includes: the ballot research prompt, the user's election context, and any uploaded voter profile

### FR-C02: Chat System Prompt
- System prompt includes the full ballot research prompt from `docs/BALLOT_PROMPT.md` in the user's selected language
- System prompt includes the user's full election context (zip, state, county, districts, election dates, ballot contests, candidates, polling location)
- If a voter profile is uploaded, include it wrapped in `[BEGIN USER VOTER PROFILE]...[END USER VOTER PROFILE]` with injection-protection instructions

### FR-C03: Chat API Route
- API route `/api/chat` forwards conversation history to Anthropic API (stateless server side)
- API key is never exposed to the client
- No conversation content is logged server-side
- Same-origin check on requests
- Model: `claude-sonnet-4-6`, max tokens: 4096, temperature: 1, streaming enabled

### FR-C04: Budget Management
- Hard cap: $20/month via Anthropic Console
- App tracks estimated monthly spend by logging input/output token counts
- 0-70%: normal operation, no user messaging
- 70-90%: subtle notice ("Free AI chat may be limited later this month…")
- 90-100%: stronger notice ("Free AI chat is running low…")
- 100%/API rejection: chat disabled, message shown, copy-paste flow becomes primary

### FR-C05: Rate Limiting
- Per-session: max 60 messages; after limit, offer handoff block
- Per-IP concurrent: max 3 sessions
- Per-IP daily: max 5 new sessions
- Friendly rate-limit messaging; never show technical errors

### FR-C06: Privacy and Session Handling
- Full conversation lives in React state only (not persisted)
- Pre-session notice shown before first message is sent
- User warned: refreshing/closing ends session permanently

### FR-B01: Downloadable Ballot
- "Download My Ballot" button appears after ballot is generated (both paths)
- Ballot format: MY BALLOT header, race:pick pairs, propositions, phone policy reminder
- Printable HTML page in a new tab (primary); PDF stretch goal
- Ballot labels translated to user's selected language; candidate names in English
- All required `data-testid` attributes present

### FR-B02: Ballot from Path A (Chat)
- AI generates structured Output A with `MY BALLOT` marker
- Site parses the marker and renders the ballot download

### FR-B03: Ballot from Path B (Copy-Paste)
- New "Build My Ballot" section with a paste textarea for AI output
- If parse fails: friendly error message + manual entry fallback form
- Manual entry: user can type race name → candidate name pairs

### FR-V01: Voter Profile
- "Download My Voter Profile" button appears alongside ballot download
- Profile downloads as `.txt` file in structured human-readable format
- Profile stays under 500 words; AI compresses prior elections

### FR-V02: Profile Upload
- "Returning voter? Upload your voter profile" input at top of page
- Accepts `.txt` files only, max 10KB
- Shows uploaded profile for user confirmation
- Uploaded profile included in chat system prompt (Path A) and copy-paste prompt output (Path B)

### FR-V03: Prompt Injection Protection
- Profile wrapped in `[BEGIN USER VOTER PROFILE]...[END USER VOTER PROFILE]`
- System prompt instructs model to ignore instructions in profile
- Profile delivered as user message, not system prompt

### FR-A01: Alignment Score Banner
- Every candidate in every contested race has an alignment score banner (0-100)
- Color cue with text qualifier: green/Strong ≥ 70, amber/Mixed 40-69, red/Weak < 40
- Banner is a `role="region"` with `aria-label`; expand/collapse uses native button with `aria-expanded`
- Per-issue breakdown: issue name, user priority, score, rationale with source citations

### FR-A02: Structured Output Parsing
- Site parses `[ALIGNMENT_SCORES]` JSON block from AI responses
- If block is malformed/missing: graceful degradation with inline note
- Parser is lenient about whitespace and trailing commas

### FR-I01: Internationalization
- All new UI text available in all 5 languages (EN, ES, VI, ZH, AR)
- Arabic RTL layout works for all new elements
- Ballot labels translated; candidate names remain in English

---

## User Scenarios

### Scenario 1: New voter uses Path A (chat)
1. User enters zip code, sees election data
2. Clicks "Research My Ballot" CTA
3. Sees privacy notice
4. Sends messages; receives streaming responses
5. AI walks through ballot issues one at a time
6. At end, AI generates Output A (ballot) and Output B (profile)
7. User downloads ballot and voter profile

### Scenario 2: Returning voter uploads profile
1. User uploads `.txt` voter profile file
2. Sees confirmation of profile loaded
3. Opens chat; AI acknowledges profile and skips values questions
4. Completes research more quickly

### Scenario 3: Copy-paste voter (Path B)
1. User copies prompt (now includes structured output instructions)
2. Pastes response from external chatbot into "Build My Ballot" area
3. Site renders ballot preview and download button
4. User also pastes voter profile output to download

### Scenario 4: Budget exhausted
1. API rejects request
2. Chat window shows exhaustion message
3. Copy-paste flow becomes the primary path

---

## Success Criteria

- Chat conversations complete without data being stored on the server
- Budget warnings appear at correct thresholds (70%, 90%, 100%)
- Ballot downloads are correctly formatted and printable in all 5 languages
- Voter profile uploads/downloads work for files under 10KB
- Rate limits prevent abuse while allowing normal household usage
- All `data-testid` attributes present for e2e test coverage
- Alignment banners show personalized scores based on user's stated values

---

## Dependencies

- Phase 3: Election data context (zip, candidates, ballot contests)
- Phase 4: i18n system for translation of new UI text
- `docs/BALLOT_PROMPT.md`: System prompt source
- Anthropic API: `claude-sonnet-4-6`
- Environment variable: `ANTHROPIC_API_KEY` (server-side only)

---

## Clarifications

### Session 2026-05-12

- Q: Budget tracking storage mechanism? → A: In-memory per calendar month, reset on first request of new month; no database required.
- Q: Rate limiting storage mechanism? → A: In-memory per-process (acceptable for single-instance Vercel deployment); not shared across instances.
- Q: Alignment score source for Phase 5? → A: LLM inference with web_search; deterministic backend deferred to post-experiment v2.
- Q: Ballot download format? → A: Printable HTML in new tab (primary); PDF is a stretch goal, not required.
- Q: Profile injection protection placement? → A: Profile delivered as a `user` message (not system prompt) per spec to leverage model instruction hierarchy.

---

## Assumptions

- Budget tracking uses in-memory or file-based storage (no database)
- Rate limiting uses in-memory per-process tracking (acceptable for single-instance deployment)
- PDF generation is a stretch goal; printable HTML is the required implementation
- Alignment scores in Phase 5 are LLM-inferred (not from deterministic backend)
