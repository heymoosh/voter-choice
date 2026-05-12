---
title: "feat: Phase 5 — LLM Chat Window, Downloadable Ballot, and Voter Profile"
type: feat
status: active
date: 2026-05-12
---

# feat: Phase 5 — LLM Chat Window, Downloadable Ballot, and Voter Profile

## Overview

This is the most complex phase. It adds three interconnected features to the existing ballot research tool:

1. **LLM Chat Window** — On-site AI-powered research powered by Claude Sonnet via Anthropic API, with streaming responses, budget management, and graceful degradation.
2. **Downloadable Ballot** — Printable one-page ballot document generated from chat (Path A) or paste/manual entry (Path B).
3. **Voter Profile** — Downloadable `.txt` profile capturing values/history; uploadable for returning voters.

The existing copy-paste flow remains fully functional. Both paths produce the same outputs.

## Technical Approach

### New Dependencies

- `@anthropic-ai/sdk@0.52.0` — Anthropic streaming client (pinned)

### Architecture

**New files:**
- `src/app/api/chat/route.ts` — SSE streaming chat endpoint with rate limiting + budget tracking
- `src/components/ChatWindow.tsx` — Chat panel (CTA, window, messages, input, streaming)
- `src/components/BallotDownload.tsx` — Ballot download section (Path A + Path B paste + manual fallback)
- `src/components/VoterProfile.tsx` — Profile upload confirmation + download
- `src/components/AlignmentBanner.tsx` — Alignment score banner + drill-down
- `src/lib/budgetTracker.ts` — Server-side in-memory monthly budget estimator
- `src/lib/rateLimit.ts` — Per-IP rate limiting (in-memory)
- `src/lib/ballotParser.ts` — Parse MY BALLOT blocks and ALIGNMENT_SCORES blocks
- `src/lib/profileParser.ts` — Parse MY VOTER PROFILE blocks

**Modified files:**
- `src/app/page.tsx` — Add chat CTA, chat window, ballot/profile sections after ResultCard
- `src/lib/i18n/translations.ts` — Add Phase 5 translation keys for all 5 languages
- `src/lib/promptBuilder.ts` — Append voter profile + structured output instructions to copy-paste prompt

**New e2e tests:**
- `e2e/phase5-chat.spec.ts` — Chat flow, ballot download, profile tests

### API Route (`/api/chat`)

```typescript
// POST /api/chat
// Body: { messages: { role, content }[], language, electionContext, voterProfile? }
// Response: SSE stream (text/event-stream)
// - data: { type: "delta", text: "..." }
// - data: { type: "done" }
// - data: { type: "error", message: "..." }
```

Security:
- Origin header check (same-origin)
- ANTHROPIC_API_KEY server-side only
- No conversation logging

Rate limiting (in-memory Map):
- Per-IP: 3 concurrent sessions
- Per-IP: 5 sessions/day
- Per-session: 60 messages

Budget tracking (in-memory, monthly reset):
- Track estimated spend per month
- MONTHLY_BUDGET = 20.00
- Thresholds: 70% (subtle notice), 90% (stronger notice), 100% (disable chat)
- Use token count estimates: input_tokens * $3/1M + output_tokens * $15/1M for claude-sonnet-4-6

Test/mock mode: when `ANTHROPIC_API_KEY` is absent or equals `test`, return mock SSE response.

### Chat UI Flow

1. After zip submit + data load → show "Research My Ballot" CTA (`data-testid="chat-cta"`)
2. Click CTA → chat panel opens (`data-testid="chat-window"`)
3. Privacy notice shown (`data-testid="chat-privacy-notice"`) before any message
4. User types in `data-testid="chat-input"`, submits via `data-testid="chat-send"`
5. Streaming response renders incrementally in `data-testid="chat-message-assistant"` bubbles
6. When AI generates `MY BALLOT` marker → Download My Ballot button appears
7. When AI generates `MY VOTER PROFILE` marker → Download Voter Profile button appears

### Ballot Parser Logic

- Look for `MY BALLOT` marker in AI message
- Extract structured block up to blank separator
- Parse `Race: Pick` lines
- Parse `Propositions:` section
- Render as printable HTML page (new tab)

### Path B Enhancements

- `data-testid="ballot-paste-input"` textarea to paste AI ballot output
- On valid parse → show ballot preview (`data-testid="ballot-preview"`)
- On invalid → show `data-testid="ballot-manual-entry"` form fallback
- Manual form: add race/choice pairs, generate ballot

### Voter Profile

- Upload: `data-testid="upload-profile-input"` (.txt, max 10KB)
- Confirmation: `data-testid="profile-confirmation"`
- Download: `data-testid="download-profile-btn"`
- Prompt injection: wrapped in `[BEGIN USER VOTER PROFILE]...[END USER VOTER PROFILE]`

### Alignment Banner

- Parse `[ALIGNMENT_SCORES]...json...[/ALIGNMENT_SCORES]` block from AI message
- Render per-candidate: `data-testid="alignment-banner-{slug}"`
- Overall score: `data-testid="alignment-score-overall-{slug}"`
- Expandable: `data-testid="alignment-drill-down-{slug}"`
- Per-issue row: `data-testid="alignment-issue-row-{slug}-{issue-slug}"`
- Colors: green ≥70, amber 40-69, red <40 (paired with text qualifier)

### Translations (all 5 languages)

New keys needed:
- `chatCta`, `chatWindowTitle`, `chatPrivacyNotice`, `chatInputPlaceholder`, `chatSend`
- `chatBudgetNotice70`, `chatBudgetNotice90`, `chatDisabledMessage`
- `downloadBallotBtn`, `downloadProfileBtn`
- `ballotPasteLabel`, `ballotPasteBtn`, `ballotParseError`, `ballotManualEntryTitle`
- `uploadProfileLabel`, `uploadProfileConfirm`, `profileSessionNote`
- `alignmentStrong`, `alignmentMixed`, `alignmentWeak`, `alignmentExpand`, `alignmentCollapse`

## Acceptance Criteria

### LLM Chat
- [ ] Chat CTA appears after zip + data load
- [ ] Chat panel opens without page navigation
- [ ] Privacy notice visible before first message
- [ ] Streaming responses render incrementally via SSE
- [ ] System prompt includes ballot research prompt + election context + voter profile (if uploaded)
- [ ] Rate limits: 60 msg/session, 3 concurrent/IP, 5 sessions/day/IP
- [ ] Budget thresholds: 70% subtle notice, 90% stronger notice, 100% chat disabled
- [ ] API key never in client bundle
- [ ] Mock mode when ANTHROPIC_API_KEY=test (for e2e)

### Downloadable Ballot
- [ ] `download-ballot-btn` appears when ballot generated (both paths)
- [ ] Printable HTML in new tab
- [ ] Path B paste area works
- [ ] Manual entry fallback on parse failure
- [ ] All required data-testid attributes

### Voter Profile
- [ ] Upload .txt up to 10KB
- [ ] >10KB rejected with message
- [ ] Non-.txt rejected with message
- [ ] Confirmation display on upload
- [ ] Included in chat system prompt
- [ ] Included in copy-paste prompt
- [ ] Download as .txt

### Cross-cutting
- [ ] All 5 languages translated for new UI strings
- [ ] Arabic RTL works for new elements
- [ ] Existing e2e tests still pass
- [ ] New e2e tests cover core flows

## Implementation Tasks

### Phase 5a: Infrastructure
- [ ] Add `@anthropic-ai/sdk` dep
- [ ] `src/lib/budgetTracker.ts`
- [ ] `src/lib/rateLimit.ts`
- [ ] `src/app/api/chat/route.ts` with SSE streaming + mock mode
- [ ] `src/lib/ballotParser.ts`
- [ ] `src/lib/profileParser.ts`

### Phase 5b: Components
- [ ] `src/components/ChatWindow.tsx` — full chat UI with streaming
- [ ] `src/components/BallotDownload.tsx` — ballot section (both paths)
- [ ] `src/components/VoterProfile.tsx` — upload + download
- [ ] `src/components/AlignmentBanner.tsx` — banner + drill-down

### Phase 5c: Integration
- [ ] Update `src/app/page.tsx` — wire everything together
- [ ] Update `src/lib/i18n/translations.ts` — add all new keys
- [ ] Update `src/lib/promptBuilder.ts` — voter profile + structured output note
- [ ] Update `src/app/layout.tsx` — ensure ANTHROPIC_API_KEY available server-side

### Phase 5d: Tests
- [ ] `e2e/phase5-chat.spec.ts` — all Phase 5 e2e scenarios

## Dependencies & Risks

- **Streaming + SSE in Next.js 15:** Use `new ReadableStream` with Uint8Array encoding; avoid `TransformStream` BYOB reader issues in Node 22.
- **Mock API for e2e:** ANTHROPIC_API_KEY=test in playwright env; route returns deterministic mock with MY BALLOT + MY VOTER PROFILE blocks.
- **Rate limiting:** In-memory Map works for dev/test. Fine for experiment scope.
- **Budget tracking:** In-memory monthly counter, reset if month changes.

## Sources & References

- **Spec:** `docs/PHASE5_SPEC.md`
- **Ballot prompt:** `docs/BALLOT_PROMPT.md`
- **Phase 4 solution:** `docs/solutions/phase4-extended-language-support-vi-zh-ar.md`
- **Existing translations:** `src/lib/i18n/translations.ts`
- **Existing chat API patterns:** Next.js 15 App Router route handlers with streaming
