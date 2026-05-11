---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments: ["_bmad-output/planning-artifacts/prd-voter-choice-2026-05-11.md"]
date: "2026-05-11"
author: "Muxin"
---

# Architecture: Voter Choice Ballot Research Tool

## Overview

Single-page Next.js 15 App Router application. All data served from static JSON files. No backend database, no user data persistence, no external API calls from client.

---

## Technology Stack

| Layer | Choice | Version | Rationale |
|-------|--------|---------|-----------|
| Framework | Next.js App Router | 15.5.12 | Specified in PROJECT_SPEC.md; existing scaffold |
| Language | TypeScript | 5.x strict | Type safety, IDE support |
| Styling | Tailwind CSS | v4 | Specified in PROJECT_SPEC.md; utility-first, responsive |
| Runtime | Node.js | 22.14.0 | Pinned per engines field |
| Build | `next build --turbo` | — | Required for Node 22/WasmHash compatibility |
| Unit Tests | Vitest | 3.x | Configured in vitest.config.ts |
| E2E Tests | Playwright | 1.52 | Shared test suite, configured in playwright.config.ts |

---

## File Structure

```
src/
  app/
    layout.tsx          # Root layout — metadata, font loading, skip link
    page.tsx            # Main page (server component wrapper)
    globals.css         # Tailwind base + theme variables
  components/
    ZipCodeForm.tsx     # Zip input, validation, submit handler
    StateInfoCard.tsx   # Election info display (state-info, election-name, etc.)
    PromptOutput.tsx    # Customized prompt display + copy button
    StateSelectorModal.tsx # Multi-state zip selector
    DeadlineStatus.tsx  # Color-coded registration deadline indicator
  lib/
    lookupState.ts      # Zip-to-state lookup function
    generatePrompt.ts   # Prompt template + state data injection
    deadlineStatus.ts   # Date calculation for deadline status
    types.ts            # TypeScript types for state data schema
  data/
    zip-to-state.json   # Zip code to state code mapping
    states/
      TX.json           # Texas election data
      CA.json           # California election data
      NH.json           # New Hampshire election data
```

---

## Data Flow

```
User types zip code
    → ZipCodeForm validates (5-digit numeric)
    → lookupState(zip) → zip-to-state.json
    → Single state: load states/{code}.json
    → Multi-state: show StateSelectorModal
    → StateInfoCard receives state data
    → generatePrompt(stateData, zip) → prompt string
    → PromptOutput displays prompt
    → User clicks copy → navigator.clipboard.writeText()
```

---

## State Management

Pure React hooks (no Redux, no context for this scale):
- `useState` in main page for: zipValue, submittedZip, stateData, multiStateOptions, selectedState, error, copied
- No localStorage, sessionStorage, or IndexedDB usage
- Component state cleared on unmount

---

## Key Architectural Decisions

### AD-001: Client-Side Data Loading
State JSON loaded at build time via `import()` or fetch from `/api/` route. Given privacy constraints and static data, dynamic `import()` of JSON is preferred — avoids any server log exposure of zip codes.

### AD-002: Prompt Generation in `lib/generatePrompt.ts`
Separating prompt generation into a pure function enables unit testing of the critical business logic without browser environment.

### AD-003: Deadline Status Calculation
Pure date arithmetic in `lib/deadlineStatus.ts`. Takes deadline string + "today" parameter (injectable for testing). Returns: `"passed" | "urgent" | "warning" | "ok"` with days remaining.

### AD-004: No Server Components for Interactive Logic
The main interaction (zip entry → state lookup → prompt display) is all client-side. The page.tsx is a thin wrapper; ZipCodeForm and its children are `"use client"` components.

### AD-005: Clipboard Fallback
Try `navigator.clipboard.writeText()`. If it throws (old browser, insecure context), fall back to `document.execCommand('copy')` with selected text. Show appropriate instruction in either case.

---

## Component Interfaces

### ZipCodeForm
```typescript
interface ZipCodeFormProps {
  onSubmit: (zip: string) => void;
}
```

### StateInfoCard
```typescript
interface StateInfoCardProps {
  stateData: StateElectionData;
  zip: string;
}
```

### PromptOutput
```typescript
interface PromptOutputProps {
  promptText: string;
}
```

### StateSelectorModal
```typescript
interface StateSelectorProps {
  stateCodes: string[];
  onSelect: (code: string) => void;
}
```

---

## Security Constraints

- No `dangerouslySetInnerHTML` anywhere
- Prompt text inserted as plain text content only
- No external scripts loaded
- State data files are read-only static assets
