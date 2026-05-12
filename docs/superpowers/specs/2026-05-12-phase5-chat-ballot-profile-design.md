# Phase 5 Design: LLM Chat, Downloadable Ballot, Voter Profile, Alignment Scores

**Date:** 2026-05-12
**Phase:** 5
**Framework:** Superpowers
**Status:** Approved (self-approved for automated run)

---

## Overview

Phase 5 adds three interconnected features to the existing voter research tool:
1. **LLM Chat Window** — on-site Claude Sonnet chat via `/api/chat` SSE route
2. **Downloadable Ballot** — printable HTML document from chat or paste/manual entry
3. **Voter Profile** — downloadable `.txt` file, uploadable for returning users
4. **Alignment Score Banners** — per-candidate value alignment display with drill-down

The existing copy-paste flow remains. Chat is an alternative path producing the same outputs.

---

## Approach Selected

**Approach B (Chosen): Core features with all required testids and mocked e2e tests**

- Implements all spec-required features with working UI
- E2e tests mock the Anthropic API via `page.route()` — no real API calls in tests
- Vitest mocks `@anthropic-ai/sdk` for server-side unit tests
- PDF download deferred (stretch goal per spec)
- Deterministic `/api/alignment` backend deferred (spec: out of scope for experiment)

**Why this approach:** Maximizes test coverage and code quality metrics without network flakiness. The spec explicitly requires mocked tests.

---

## Architecture

### New Files

**API Routes:**
- `src/app/api/chat/route.ts` — SSE streaming chat with rate limiting, budget tracking, same-origin check

**Components:**
- `src/components/ChatWindow.tsx` — Chat UI with messages, input, privacy notice, budget alerts
- `src/components/BallotBuilder.tsx` — Path B paste/manual entry + ballot preview + download
- `src/components/VoterProfile.tsx` — Upload input, confirmation, download button
- `src/components/AlignmentBanner.tsx` — Per-candidate score banner + drill-down

**Lib:**
- `src/lib/ballotParser.ts` — Parse `MY BALLOT` block from AI output
- `src/lib/profileParser.ts` — Parse voter profile block
- `src/lib/alignmentParser.ts` — Parse `[ALIGNMENT_SCORES]` JSON block
- `src/lib/budgetTracker.ts` — Server-side monthly spend estimate (in-memory for experiment)
- `src/lib/rateLimiter.ts` — Per-session (60 msg), per-IP concurrent (3), per-IP daily (5)
- `src/lib/chatSystemPrompt.ts` — Build system prompt from ballot data + voter profile

**Tests:**
- `src/lib/__tests__/ballotParser.test.ts`
- `src/lib/__tests__/profileParser.test.ts`
- `src/lib/__tests__/alignmentParser.test.ts`
- `src/lib/__tests__/chatSystemPrompt.test.ts`
- `e2e/phase5-chat.spec.ts`
- `e2e/phase5-ballot.spec.ts`
- `e2e/phase5-profile.spec.ts`

### Modified Files

- `src/app/page.tsx` — Add voter profile upload, chat CTA, ChatWindow, BallotBuilder
- `src/lib/i18n/translations.ts` — Add Phase 5 translation keys for all 5 languages
- `src/lib/types.ts` — Add ChatMessage, AlignmentScore, BallotEntry types

---

## Key Design Decisions

**Rate limiting:** In-memory Map per server instance (stateless enough for experiment; spec says no persistent storage). Tracks: per-IP request count per day, concurrent sessions.

**Budget tracking:** In-memory monthly accumulator. Resets if month changes. Progressive thresholds: 70%=subtle notice, 90%=stronger notice, 100%=chat disabled.

**SSE streaming:** Use `ReadableStream` in the Next.js API route. Client uses `EventSource`-like fetch with `text/event-stream` parsing.

**Ballot parser:** Looks for `MY BALLOT` marker. Lenient whitespace. Falls back to manual entry form on failure.

**Alignment parser:** Looks for `[ALIGNMENT_SCORES]...[/ALIGNMENT_SCORES]`. Uses lenient JSON parse (strips trailing commas). Graceful degradation on failure.

**Prompt injection protection:** Voter profile wrapped in `[BEGIN USER VOTER PROFILE]...[END USER VOTER PROFILE]` and included as first user message.

---

## Data Flow

```
User uploads voter profile → stored in React state → included in system prompt
User clicks "Research My Ballot" CTA → ChatWindow opens
ChatWindow sends conversation + context to /api/chat →
  Server validates (origin, rate limit, budget) →
  Forwards to Claude API with streaming →
  Returns SSE stream to client
Client parses AI output for MY BALLOT + VOTER PROFILE + ALIGNMENT_SCORES markers
→ Renders download buttons + alignment banners
```

---

## i18n

New translation keys added for all 5 languages (EN, ES, VI, ZH, AR):
- `chatCta`, `chatPrivacyNotice`, `chatBudgetNotice`, `chatBudgetExhausted`
- `downloadBallot`, `downloadProfile`, `uploadProfile`, `profileConfirmation`
- `ballotPasteLabel`, `ballotManualEntry`, `alignmentStrong`, `alignmentMixed`, `alignmentWeak`
- `chatDisabledMessage`, `sessionLimitMessage`

---

## Acceptance Criteria

All spec testids present. All e2e tests pass with mocked API. Lint clean.
