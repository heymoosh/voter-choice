# Implementation Plan: Ballot Research Tool

**Feature ID:** 001
**Date:** 2026-05-11
**Status:** Ready for Task Generation

---

## Technical Context

- **Framework:** Next.js 15.5.12 (App Router), TypeScript, React 19, Tailwind CSS v4
- **Runtime:** Node 22.14.0
- **Testing:** Vitest (unit), Playwright (e2e)
- **Build:** `next build` (use `--turbo` flag if WasmHash errors occur on Node 22)
- **Linting:** ESLint 9 with Next.js config

---

## Architecture

### Component Structure

```
src/
  app/
    page.tsx              # Root page — BallotResearchTool component
    layout.tsx            # Root layout (skip-to-content link here)
    globals.css           # Tailwind base styles
  components/
    ZipCodeForm.tsx       # Zip input + submit + inline error
    StateInfo.tsx         # State election info card
    RegistrationStatus.tsx # Deadline status indicators
    PromptOutput.tsx      # Full prompt display + copy button
    StateSelector.tsx     # Multi-state picker
    NotFoundMessage.tsx   # Zip not found message
    NoElectionMessage.tsx # No upcoming election message
  lib/
    ballot-prompt.ts      # Ballot prompt text constant (extracted from BALLOT_PROMPT.md)
    lookup.ts             # Zip→state lookup logic
    deadline-status.ts    # Date comparison and status computation
    prompt-builder.ts     # Builds the customized prompt string
  data/
    zip-to-state.json     # Already exists
    states/
      TX.json             # Already exists
      CA.json             # Already exists
      NH.json             # Already exists
  types/
    index.ts              # TypeScript types for StateData, Election, etc.
```

### Key Design Decisions (from research.md)

1. Single page, all state in React `useState`
2. Static JSON imports — no API calls at runtime
3. Ballot prompt text embedded as TypeScript string constant
4. Client-side date computation for deadline statuses
5. Clipboard API with execCommand fallback
6. Tailwind CSS for all styling (mobile-first)

---

## Implementation Phases

### Phase 1: Project Setup
- Verify/update package.json build script (add `--turbo` flag if needed)
- Create TypeScript types in `src/types/index.ts`
- Extract ballot prompt text into `src/lib/ballot-prompt.ts`
- Verify existing stub data JSON files match the schema

### Phase 2: Core Logic (no UI)
- `src/lib/lookup.ts` — zip lookup function
- `src/lib/deadline-status.ts` — deadline status computation
- `src/lib/prompt-builder.ts` — prompt string assembly

### Phase 3: Component Implementation (US1 - Zip Code + State Info)
- `src/components/ZipCodeForm.tsx` — input, submit, error display
- `src/components/StateSelector.tsx` — multi-state picker
- `src/components/RegistrationStatus.tsx` — deadline indicators
- `src/components/StateInfo.tsx` — full state info card
- `src/components/NotFoundMessage.tsx`
- `src/components/NoElectionMessage.tsx`

### Phase 4: Component Implementation (US2 - Prompt Output)
- `src/components/PromptOutput.tsx` — prompt display + copy button + confirmation
- Integrate clipboard API with fallback

### Phase 5: Page Assembly and Accessibility
- `src/app/page.tsx` — wire all components together
- `src/app/layout.tsx` — skip-to-content link, page title, meta
- Verify all data-testid attributes
- Verify heading hierarchy and ARIA attributes
- Verify keyboard navigation and focus management

### Phase 6: Polish and Verification
- Run lint, fix any issues
- Run vitest unit tests
- Run playwright e2e tests
- Fix failures

---

## Acceptance Verification Mapping

| AC from spec.md | Component/File | Verification |
|-----------------|----------------|--------------|
| Zip input and submit | ZipCodeForm | Playwright: zip-input, zip-submit |
| Error for empty/invalid | ZipCodeForm | Playwright: zip-error |
| Not found message | NotFoundMessage | Playwright: not-found-message |
| Multi-state selector | StateSelector | Playwright: state-selector |
| State info card | StateInfo | Playwright: state-info |
| Election name/date | StateInfo | Playwright: election-name, election-date |
| Registration status | RegistrationStatus | Playwright: registration-status |
| Prompt output | PromptOutput | Playwright: prompt-output |
| Copy button | PromptOutput | Playwright: copy-button |
| Copy confirmation | PromptOutput | Playwright: copy-confirmation |
| No election message | NoElectionMessage | Playwright: no-election-message |
| Enter key submit | ZipCodeForm | Playwright keyboard test |
| Mobile responsive | page.tsx + Tailwind | Playwright viewport tests |
| Keyboard navigation | All components | Playwright keyboard tests |
| Skip-to-content | layout.tsx | Manual / Playwright |
| WCAG AA contrast | Tailwind classes | Manual review |

---

## Anti-Solutions

- Do NOT use localStorage, sessionStorage, cookies, or Cache API anywhere
- Do NOT make fetch() calls to external URLs from client code
- Do NOT log zip codes or user input in server-side code
- Do NOT expose API keys in client bundles
- Do NOT use dangerouslySetInnerHTML
- Do NOT create API routes for static data — import JSON directly
