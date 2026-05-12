# Implementation Plan: LLM Chat Window, Downloadable Ballot, and Voter Profile

**Feature**: llm-chat-ballot-profile
**Created**: 2026-05-12
**Branch**: experiment/spec-kit-r1
**Spec**: .specify/features/llm-chat-ballot-profile/spec.md

---

## Technical Context

### Tech Stack

- **Framework**: Next.js 15 (App Router) with TypeScript
- **Styling**: Tailwind CSS 4
- **Testing**: Vitest (unit), Playwright (e2e)
- **LLM**: Anthropic `claude-sonnet-4-6` via `@anthropic-ai/sdk`
- **Streaming**: Server-Sent Events (SSE) via Next.js Route Handler
- **Budget tracking**: In-memory per-process (server-side, resets on server restart)
- **Rate limiting**: In-memory per-process (IP-based tracking)
- **i18n**: Existing typed dictionary system (add new keys for Phase 5 UI)

### Architecture Decision

**SSE streaming chat route** with stateless server design:
- `/api/chat` Route Handler receives full conversation history + system prompt context from client
- Uses `@anthropic-ai/sdk` streaming API to forward to Claude
- Returns SSE stream back to client
- No server-side session storage; client owns conversation state

**Budget tracking** via module-level singleton:
- Track monthly token counts in memory; estimate cost from known model pricing
- Reset on first request of a new calendar month
- Progressive thresholds (70%, 90%, 100%) returned in response headers or separate `/api/budget` endpoint

**Alignment score parsing** — shared utility function:
- Parses `[ALIGNMENT_SCORES]...[/ALIGNMENT_SCORES]` block from raw text
- Lenient parser (handles whitespace, trailing commas via JSON5-compatible approach)
- Used by both Path A (chat response stream end) and Path B (paste input)

**Ballot and profile download**:
- Generate printable HTML via client-side string template (no server round-trip)
- Open in new tab via `window.open` with `data:text/html` or blob URL
- Profile download as `.txt` via Blob + anchor click

### Project Structure (additions to Phase 4)

```
src/
  app/
    api/
      chat/
        route.ts          # SSE streaming chat route; rate limiting; budget tracking
      budget/
        route.ts          # GET endpoint returning current budget status (0-100 percentage)
  components/
    ChatWindow.tsx         # Chat panel: privacy notice, message list, input, send button
    ChatMessage.tsx        # Single message bubble (user/assistant) with alignment score parser
    AlignmentBanner.tsx    # Candidate alignment score banner with expand/collapse drill-down
    BallotBuilder.tsx      # Ballot paste area, manual entry form, preview, download button
    VoterProfilePanel.tsx  # Upload profile input, confirmation display, download button
  lib/
    chatBudget.ts          # Module-level budget tracker (monthly spend, thresholds)
    rateLimiter.ts         # In-memory per-IP rate limiting (concurrent sessions, daily limit)
    alignmentParser.ts     # Parses [ALIGNMENT_SCORES] block; graceful fallback
    ballotParser.ts        # Parses "MY BALLOT" marker from chat/paste; graceful fallback
    profileParser.ts       # Parses "=== MY VOTER PROFILE" block from chat/paste
    ballotDownload.ts      # Generates printable HTML for ballot
    profileDownload.ts     # Generates .txt content for voter profile
    __tests__/
      chatBudget.test.ts
      rateLimiter.test.ts
      alignmentParser.test.ts
      ballotParser.test.ts
      profileParser.test.ts
  types/
    chat.ts                # ChatMessage, ChatSession, BudgetStatus types
```

---

## Key Design Decisions

### System Prompt Construction

The chat system prompt is assembled client-side from:
1. `buildPrompt(stateData, zip, locale)` — existing function from `src/lib/promptBuilder.ts`
2. Voter profile (if uploaded) — wrapped in `[BEGIN USER VOTER PROFILE]...[END USER VOTER PROFILE]`
3. Structured output instruction: "When the user has made choices, produce Output A (MY BALLOT) and Output B (MY VOTER PROFILE)..."

The assembled prompt is sent as the `system` parameter of the API call.

### Rate Limiting Implementation

```typescript
// src/lib/rateLimiter.ts
// Map<ip, {activeSessions: number, dailySessions: number, dailyReset: string}>
const ipStore = new Map<string, RateLimitEntry>();
const MAX_CONCURRENT = 3;
const MAX_DAILY = 5;
const MAX_MESSAGES_PER_SESSION = 60;
```

### Budget Tracking

```typescript
// src/lib/chatBudget.ts
// Anthropic pricing: claude-sonnet-4-6 ~$3/1M input, ~$15/1M output tokens
const MONTHLY_BUDGET_USD = 20;
let monthlySpend = { month: currentMonth(), inputTokens: 0, outputTokens: 0 };
```

### Alignment Score Parser

```typescript
// src/lib/alignmentParser.ts
// Extracts block between [ALIGNMENT_SCORES] and [/ALIGNMENT_SCORES]
// Parses JSON content; returns null on failure (graceful degradation)
```

### i18n Extensions

Add to `src/lib/i18n/types.ts` under a new `phase5` key:
```typescript
phase5: {
  chat: {
    ctaButton: string;
    privacyNotice: string;
    inputPlaceholder: string;
    sendButton: string;
    budgetNotice70: string;
    budgetNotice90: string;
    chatDisabledMessage: string;
    sessionLimitMessage: string;
  };
  ballot: {
    pasteAreaLabel: string;
    pasteInstructions: string;
    parseErrorMessage: string;
    manualEntryHeading: string;
    downloadButton: string;
    previewHeading: string;
    disclaimer: string;
  };
  profile: {
    uploadLabel: string;
    uploadPrivacyNotice: string;
    confirmationMessage: string;
    downloadButton: string;
    downloadNote: string;
    sizeError: string;
    typeError: string;
  };
  alignment: {
    strongLabel: string;
    mixedLabel: string;
    weakLabel: string;
    expandButton: string;
    collapseButton: string;
    parseError: string;
  };
}
```

---

## Contracts

### `/api/chat` POST

Request body:
```typescript
{
  messages: Array<{role: "user"|"assistant", content: string}>,
  systemPrompt: string,  // assembled client-side
  sessionId: string,      // uuid generated client-side
}
```

Response: `text/event-stream` SSE
- `data: {"type":"delta","content":"..."}` for streaming text
- `data: {"type":"done","inputTokens":N,"outputTokens":N}` on completion
- `data: {"type":"error","message":"..."}` on error

### `/api/budget` GET

Response:
```typescript
{
  percentUsed: number,  // 0-100
  status: "normal"|"warning"|"critical"|"exhausted"
}
```

---

## E2e Mock Strategy

Playwright tests mock the `/api/chat` endpoint using `page.route('/api/chat', ...)` to return deterministic SSE responses without real API calls. Mock responses include properly formatted `MY BALLOT` and `MY VOTER PROFILE` blocks for downstream testing.

---

## Accessibility

- `AlignmentBanner`: `role="region"`, `aria-label="Alignment with [Name]: [score] out of 100"`
- Expand/collapse: native `<button>` with `aria-expanded`
- Color never used alone: always paired with text qualifier
- RTL support: Tailwind logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`)
