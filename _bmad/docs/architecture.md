# Architecture: Voter Choice — Ballot Research Tool

**Version:** 1.0
**Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4

---

## Architecture Decisions

### AD-001: Static Data, No API Routes
All state election data is served from static JSON files imported at build time. No server-side API routes are needed for the experiment. This keeps the architecture simple and eliminates any server-side latency.

### AD-002: Client Component Architecture
The application is a single-page SPA-style experience using React client components. The page server component renders a layout wrapper; the interactive BallotTool is a "use client" component tree.

### AD-003: Data Layer Separation
State data access logic lives in `src/lib/stateData.ts`. Prompt building lives in `src/lib/promptBuilder.ts`. Deadline calculations in `src/lib/deadlineUtils.ts`. This enables unit testing without React.

### AD-004: No External Network Requests
Per privacy requirements, no third-party libraries or analytics. Data lookup is synchronous from static imports.

---

## Directory Structure

```
src/
  app/
    layout.tsx        # Root layout, metadata, skip-to-content
    page.tsx          # Server component — renders page shell + BallotTool
    globals.css       # Tailwind base styles
  components/
    BallotTool.tsx    # Orchestrator client component — app state machine
    ZipForm.tsx       # Zip input form with validation
    StateInfo.tsx     # State election info card
    StateSelector.tsx # Multi-state dropdown
    DeadlineStatus.tsx # Single deadline row with color + text status
    PromptOutput.tsx  # Prompt display + copy button
    ShareButton.tsx   # Footer share button
  lib/
    types.ts          # TypeScript interfaces for all data types
    stateData.ts      # Zip lookup and state data access
    deadlineUtils.ts  # Deadline calculation and formatting utilities
    promptBuilder.ts  # Context block and full prompt generation
    __tests__/        # Vitest unit tests for lib utilities
  data/
    zip-to-state.json # Zip code → state code mapping
    states/
      TX.json         # Texas election data
      CA.json         # California election data
      NH.json         # New Hampshire election data
e2e/
  ballot-tool.spec.ts # Playwright e2e tests (shared, not modified)
```

---

## State Machine (BallotTool)

```
idle
  → loading (on zip submit)
    → not-found (zip not in dataset)
    → multi-state (zip maps to multiple states)
      → result (on state selection)
    → result (single state found)
```

---

## Data Flow

1. User enters zip code → ZipForm validates → calls BallotTool.handleZipSubmit
2. BallotTool: getStateCodesForZip(zip) → 0 codes = not-found, >1 = multi-state, 1 = proceed
3. getStateData(stateCode) → StateData object
4. findNextElection(elections, today) → Election | null
5. buildPrompt(stateData, zipCode, election) → full prompt string
6. Render StateInfo + PromptOutput components

---

## Component Interfaces

### BallotTool
- No props
- Owns entire app state via useState

### ZipForm
- onSubmit: (zipCode: string) => void
- isLoading?: boolean

### StateInfo
- stateData: StateData
- election: Election | null
- today: Date
- registrationCheckUrl: string

### StateSelector
- stateCodes: string[]
- selectedState: string | null
- onSelect: (stateCode: string) => void

### DeadlineStatus
- label: string
- isoDate: string | null
- today: Date
- additionalInfo?: string

### PromptOutput
- promptText: string

---

## Testing Strategy

- **Unit tests (Vitest):** deadlineUtils, stateData, promptBuilder — pure function testing
- **E2e tests (Playwright):** ballot-tool.spec.ts — shared test suite, covers all data-testid flows
- **Build validation:** `npm run build` with `--turbo` flag for Next.js 15.5.12 WasmHash fix
