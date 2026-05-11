# Architecture: Voter Choice — AI Ballot Research Tool

## Stack
- Next.js 15 App Router (TypeScript)
- Tailwind CSS 4
- Static JSON data files
- Vitest (unit tests)
- Playwright (e2e tests)

## Directory Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Main page (server component wrapper)
│   └── globals.css         # Global styles + Tailwind
├── components/
│   ├── BallotTool.tsx      # Main client component ('use client')
│   ├── ZipForm.tsx         # Zip code input form
│   ├── StateInfo.tsx       # State election info card
│   ├── PromptOutput.tsx    # Customized prompt display + copy button
│   ├── StateSelector.tsx   # Multi-state zip selector
│   └── DeadlineStatus.tsx  # Registration deadline status indicator
├── lib/
│   ├── stateData.ts        # Data loading utilities
│   ├── promptBuilder.ts    # Prompt generation logic
│   ├── deadlineUtils.ts    # Deadline calculation logic
│   └── types.ts            # TypeScript interfaces
└── data/
    ├── zip-to-state.json   # Zip code to state mapping
    └── states/
        ├── TX.json
        ├── CA.json
        └── NH.json
```

## Component Architecture

### BallotTool (Client Component)
- Root state manager
- Holds: zipCode, stateData, selectedState, showResult, error
- Orchestrates ZipForm → StateInfo + PromptOutput flow

### ZipForm
- Controlled input for zip code
- Validates on submit: empty, non-numeric, wrong length
- Emits onSubmit(zipCode) to parent

### StateInfo
- Displays state election info card
- Shows election name/date, registration deadlines, early voting
- Uses DeadlineStatus for each deadline

### PromptOutput
- Renders full prompt + context block
- Copy to clipboard with 2s feedback
- Clipboard API with fallback

### StateSelector
- Shown only for multi-state zip codes
- Select element with state options

### DeadlineStatus
- Calculates days remaining from ISO date
- Returns status: green/yellow/red/passed
- Always shows text + color indicator

## Data Flow

1. User enters zip → ZipForm validates → BallotTool.handleSubmit()
2. BallotTool looks up zip in zip-to-state.json
3. If multi-state → show StateSelector
4. Load state JSON from states/{code}.json
5. Find next upcoming election (date >= today)
6. Pass stateData + zip to StateInfo and PromptOutput
7. PromptOutput calls promptBuilder.buildPrompt(stateData, zip, today)

## Key Design Decisions

### Static JSON (no API routes)
Data is static and doesn't require server-side computation. Loading JSON client-side is acceptable for this use case. API keys not needed for lookup.

### Client Component for Interactivity
The entire interactive experience lives in BallotTool as a 'use client' component. Server component (page.tsx) is just a thin wrapper. This keeps state management simple.

### Pure Utility Functions
Prompt building and deadline calculation are pure functions with no side effects. This makes them trivially testable with Vitest.

### Privacy Compliance
No useEffect saving to localStorage. All state lives in React component state only — discarded on unmount.
