# Phase 5 Implementation Plan: LLM Chat, Ballot Download, Voter Profile

**Branch:** experiment/superpowers-r1
**Date:** 2026-05-12

---

## Step 1: Add Types and i18n Keys

1a. Add types to `src/lib/types.ts`:
  - `ChatMessage { role: "user" | "assistant"; content: string }`
  - `AlignmentIssue { issue: string; userPriority: string; score: number; rationale: string; sources: string[] }`
  - `AlignmentScore { candidate: string; overall: number; issues: AlignmentIssue[] }`
  - `AlignmentScoresBlock { race: string; scores: AlignmentScore[] }`
  - `BallotEntry { race: string; choice: string }`
  - `ParsedBallot { county: string; electionName: string; date: string; entries: BallotEntry[]; reminder?: string }`

1b. Add Phase 5 translation keys to `src/lib/i18n/translations.ts` for all 5 languages.

---

## Step 2: Parsers (TDD first)

2a. Write `src/lib/__tests__/ballotParser.test.ts` with test cases
2b. Implement `src/lib/ballotParser.ts`
2c. Write `src/lib/__tests__/profileParser.test.ts`
2d. Implement `src/lib/profileParser.ts`
2e. Write `src/lib/__tests__/alignmentParser.test.ts` with malformed JSON case
2f. Implement `src/lib/alignmentParser.ts`

---

## Step 3: Server-side Utilities

3a. Implement `src/lib/rateLimiter.ts` — in-memory Maps for per-IP daily and concurrent tracking
3b. Implement `src/lib/budgetTracker.ts` — monthly accumulator, threshold helpers
3c. Implement `src/lib/chatSystemPrompt.ts` — build system prompt from ballot data + language + voter profile
3d. Write `src/lib/__tests__/chatSystemPrompt.test.ts`

---

## Step 4: API Route

4a. Implement `src/app/api/chat/route.ts`:
  - POST handler only
  - Validate origin header (same-origin check)
  - Apply rate limiting (concurrent, daily)
  - Check budget threshold
  - Build system prompt using chatSystemPrompt.ts
  - Stream from Anthropic API via SSE (text/event-stream)
  - Track token usage for budget estimation
  - Never log conversation content

---

## Step 5: Components (TDD for unit tests where applicable)

5a. `src/components/AlignmentBanner.tsx` — banner + drill-down, all required testids
5b. `src/components/BallotBuilder.tsx` — paste area, manual form, preview, download button
5c. `src/components/VoterProfile.tsx` — upload input (txt, 10KB max), confirmation, download button
5d. `src/components/ChatWindow.tsx` — chat UI with streaming, privacy notice, budget alerts, session limit

---

## Step 6: Page Integration

6a. Update `src/app/page.tsx`:
  - Add `VoterProfile` upload section near top (after zip, before results)
  - Add chat CTA button after `PromptOutput`
  - Add `ChatWindow` (conditional on CTA click)
  - Add `BallotBuilder` section after prompt output
  - Wire voter profile state to both chat system prompt and copy-paste prompt

---

## Step 7: E2e Tests (all mocked)

7a. `e2e/phase5-chat.spec.ts` — mock `/api/chat` SSE response, test chat flow
7b. `e2e/phase5-ballot.spec.ts` — paste flow, manual entry, download button
7c. `e2e/phase5-profile.spec.ts` — upload, confirmation, download, size/type validation

---

## Commit Strategy

Each step gets its own commit with prefix `phase5:`.
Final commit `phase5: superpowers` before tagging.
