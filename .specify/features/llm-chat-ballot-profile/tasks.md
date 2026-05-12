# Tasks: LLM Chat Window, Downloadable Ballot, and Voter Profile

**Feature**: llm-chat-ballot-profile
**Phase**: 5
**Created**: 2026-05-12

---

## Phase 1: Setup

- [ ] T001 Install @anthropic-ai/sdk dependency in package.json (exact version)
- [ ] T002 Add ANTHROPIC_API_KEY to .env.local and .env.example (placeholder); add to load-secrets.sh comments
- [ ] T003 Create src/types/chat.ts with ChatMessage, ChatSession, BudgetStatus, AlignmentScore types

---

## Phase 2: Foundational (Shared Utilities)

- [ ] T004 [P] Create src/lib/chatBudget.ts — module-level monthly spend tracker with thresholds (0%, 70%, 90%, 100%)
- [ ] T005 [P] Create src/lib/rateLimiter.ts — in-memory per-IP tracker (MAX_CONCURRENT=3, MAX_DAILY=5, MAX_MESSAGES=60)
- [ ] T006 [P] Create src/lib/alignmentParser.ts — parse [ALIGNMENT_SCORES]...[/ALIGNMENT_SCORES] block; return null on failure
- [ ] T007 [P] Create src/lib/ballotParser.ts — parse "MY BALLOT" marker from text; return structured BallotData or null
- [ ] T008 [P] Create src/lib/profileParser.ts — parse "=== MY VOTER PROFILE" block from text; return string or null
- [ ] T009 [P] Create src/lib/ballotDownload.ts — generate printable HTML ballot document string (accepts locale)
- [ ] T010 [P] Create src/lib/profileDownload.ts — generate .txt profile content string
- [ ] T011 Extend src/lib/promptBuilder.ts with buildSystemPrompt(stateData, zip, locale, voterProfile?) that includes ballot research prompt + context block + optional voter profile with injection protection
- [ ] T012 Add phase5 i18n keys to src/lib/i18n/types.ts (chat, ballot, profile, alignment sections)
- [ ] T013 [P] Add phase5 English translations to src/lib/i18n/en.ts
- [ ] T014 [P] Add phase5 Spanish translations to src/lib/i18n/es.ts
- [ ] T015 [P] Add phase5 Vietnamese translations to src/lib/i18n/vi.ts
- [ ] T016 [P] Add phase5 Chinese translations to src/lib/i18n/zh.ts
- [ ] T017 [P] Add phase5 Arabic translations to src/lib/i18n/ar.ts

---

## Phase 3: Chat API Route [US1 — LLM Chat Window]

- [ ] T018 [US1] Create src/app/api/chat/route.ts — POST handler: validate origin, enforce rate limits, stream Anthropic API response via SSE, track budget tokens
- [ ] T019 [US1] Create src/app/api/budget/route.ts — GET handler: return current budget percentage and status
- [ ] T020 [P] [US1] Create src/lib/__tests__/chatBudget.test.ts — unit tests for budget threshold logic and monthly reset
- [ ] T021 [P] [US1] Create src/lib/__tests__/rateLimiter.test.ts — unit tests for concurrent session limit, daily limit, message limit

---

## Phase 4: Chat UI Components [US1]

- [ ] T022 [US1] Create src/components/ChatMessage.tsx — single message bubble (data-testid=chat-message-user, chat-message-assistant)
- [ ] T023 [US1] Create src/components/ChatWindow.tsx — full chat panel: privacy notice (data-testid=chat-privacy-notice), message list, input (data-testid=chat-input), send button (data-testid=chat-send), budget notice (data-testid=chat-budget-notice), disabled message (data-testid=chat-disabled-message); handles SSE streaming
- [ ] T024 [US1] Add chat CTA button to src/components/BallotTool.tsx (data-testid=chat-cta) that shows ChatWindow on same page without navigation; visible after election data loads

---

## Phase 5: Alignment Score Feature [US2]

- [ ] T025 [US2] Create src/components/AlignmentBanner.tsx — banner with overall score, color+text qualifier, expand/collapse drill-down; data-testid=alignment-banner-{slug}, alignment-score-overall-{slug}, alignment-drill-down-{slug}, alignment-issue-row-{slug}-{issue}; role="region" aria-label; aria-expanded
- [ ] T026 [US2] Integrate AlignmentBanner into ChatMessage.tsx — parse [ALIGNMENT_SCORES] block from message content and render banners below message; graceful fallback note if malformed
- [ ] T027 [P] [US2] Create src/lib/__tests__/alignmentParser.test.ts — unit tests for valid block, malformed JSON, missing block, lenient whitespace

---

## Phase 6: Downloadable Ballot [US3]

- [ ] T028 [US3] Create src/components/BallotBuilder.tsx — paste textarea (data-testid=ballot-paste-input), parse error message + manual entry fallback (data-testid=ballot-manual-entry), ballot preview (data-testid=ballot-preview), download button (data-testid=download-ballot-btn); uses ballotParser and ballotDownload
- [ ] T029 [US3] Wire "Download My Ballot" button into ChatWindow.tsx — appear when MY BALLOT block detected in last assistant message
- [ ] T030 [P] [US3] Create src/lib/__tests__/ballotParser.test.ts — unit tests for valid ballot, invalid format, missing marker
- [ ] T031 [P] [US3] Create src/lib/__tests__/ballotDownload.test.ts — unit tests for HTML generation in each locale

---

## Phase 7: Voter Profile [US4]

- [ ] T032 [US4] Create src/components/VoterProfilePanel.tsx — file upload input .txt max 10KB (data-testid=upload-profile-input), confirmation display (data-testid=profile-confirmation), download profile button (data-testid=download-profile-btn); error messages for wrong type/oversized
- [ ] T033 [US4] Add VoterProfilePanel to page header area (before/alongside zip input) in src/app/page.tsx or BallotTool.tsx; pass uploaded profile to ChatWindow and buildSystemPrompt
- [ ] T034 [US4] Update buildPrompt in src/lib/promptBuilder.ts to append voter profile to copy-paste prompt output (Path B) when profile is uploaded
- [ ] T035 [P] [US4] Create src/lib/__tests__/profileParser.test.ts — unit tests for valid profile, missing markers, empty content

---

## Phase 8: E2e Tests [US1-US4]

- [ ] T036 Add Phase 5 Playwright tests to e2e/ballot-tool.spec.ts:
  - Chat CTA visible after data load; privacy notice shown before first message
  - Upload valid .txt profile → confirmation shown
  - Upload file > 10KB → rejection message
  - Upload non-.txt file → rejection message
  - Paste ballot output → preview renders → download works
  - Paste invalid text → error + manual entry fallback appear
  - Manual entry form → ballot generates
  - Mock /api/chat at 75% budget → budget notice visible
  - Mock /api/chat at 95% budget → stronger notice visible
  - Mock /api/chat exhausted → chat disabled, copy-paste shown
  - Mock /api/chat streaming response → chat window shows messages
  - "Download My Ballot" button appears in chat after ballot block
  - "Download My Voter Profile" button appears in chat after profile block

---

## Phase 9: Polish & Cross-Cutting

- [ ] T037 Verify all data-testid attributes from PHASE5_SPEC.md are present: chat-cta, chat-window, chat-input, chat-send, chat-message-user, chat-message-assistant, chat-privacy-notice, chat-budget-notice, chat-disabled-message, download-ballot-btn, ballot-preview, ballot-paste-input, ballot-manual-entry, download-profile-btn, upload-profile-input, profile-confirmation
- [ ] T038 Verify Arabic RTL layout works for all new elements (ChatWindow, BallotBuilder, VoterProfilePanel, AlignmentBanner)
- [ ] T039 Run npm run lint and fix all errors
- [ ] T040 Run npx vitest run and fix any test failures

---

## Dependencies

- T003 must complete before T004-T010
- T011-T017 must complete before T018, T022-T034
- T018-T019 must complete before T023 (ChatWindow uses /api/chat)
- T022 must complete before T023
- T023 must complete before T024
- T025-T026 depend on T006 (alignmentParser)
- T028 depends on T007, T009 (ballotParser, ballotDownload)
- T032 depends on T010 (profileDownload)
- T033-T034 depend on T011 (buildSystemPrompt)
- T036 depends on T023, T024, T028, T032 (all UI complete)
- T037-T040 depend on all previous tasks

## Total: 40 tasks
