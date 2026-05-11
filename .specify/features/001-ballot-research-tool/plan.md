# Implementation Plan: Ballot Research Tool

**Feature**: 001 - ballot-research-tool  
**Date**: 2026-05-11  
**Stack**: Next.js 15, TypeScript, Tailwind CSS  

---

## Technical Stack

- **Framework**: Next.js 15 App Router (existing project)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Testing**: Vitest (unit), Playwright (e2e)
- **Data**: Static JSON files (no external API calls)

---

## Research Summary

### Decision: Static JSON data loading approach
- **Decision**: Import state JSON data directly in server components using `import()`
- **Rationale**: Next.js App Router allows dynamic imports and fs reads in server components; no external API needed; data is static and pre-committed
- **Alternatives considered**: API route for data fetching, but unnecessary for static data

### Decision: Client-side date calculation for deadline statuses
- **Decision**: Calculate deadline statuses in a React client component using `Date` comparison against today
- **Rationale**: Status changes based on current date; must be real-time; no server-side caching needed; no user data sent to server
- **Alternatives considered**: Server-side calculation, but would require revalidation logic

### Decision: Clipboard copy mechanism
- **Decision**: Use `navigator.clipboard.writeText()` with a textarea fallback
- **Rationale**: Modern API available in all major browsers; fallback required for Firefox in some contexts; must not use dangerouslySetInnerHTML
- **Alternatives considered**: `document.execCommand('copy')` — deprecated

### Decision: Component architecture
- **Decision**: Single `page.tsx` orchestrator with separate client components for interactive parts
- **Rationale**: Keeps server/client boundary explicit; zip lookup + data loading in server context; interaction in client components; privacy-safe (no user input in server code paths)
- **Alternatives considered**: Fully client-side SPA, but that conflicts with Next.js App Router pattern

---

## Architecture

### File Structure

```
src/
  app/
    page.tsx                    # Main page (server component orchestrator)
    layout.tsx                  # Root layout with metadata
    globals.css                 # Global styles
  components/
    HeroSection.tsx             # Static hero with chatbot links
    ZipLookup.tsx               # Client component: zip input, state lookup, orchestration
    StateInfoCard.tsx           # Displays state election info and registration statuses
    PromptOutput.tsx            # Displays customized prompt with copy button
    TipsSection.tsx             # Static tips content
    Footer.tsx                  # Static footer
  lib/
    zipLookup.ts                # Loads zip-to-state mapping, finds state(s) for a zip
    stateData.ts                # Loads state JSON files by state code
    promptBuilder.ts            # Builds customized prompt from state data + base prompt
    deadlineUtils.ts            # Calculates deadline status (days remaining, color tier)
    ballotPrompt.ts             # Base ballot research prompt text (from docs/BALLOT_PROMPT.md)
  data/
    states/
      TX.json                   # Texas state data (existing)
      CA.json                   # California state data (existing)
      NH.json                   # New Hampshire state data (existing)
    zip-to-state.json           # Zip code mapping (existing)
  types/
    index.ts                    # TypeScript interfaces (StateData, Election, etc.)
```

### Component Data Flow

```
page.tsx (server)
  └─ HeroSection.tsx (server)
  └─ ZipLookup.tsx (client) ──imports──> zipLookup.ts, stateData.ts, promptBuilder.ts
      └─ StateInfoCard.tsx (client) ──uses──> deadlineUtils.ts
      └─ PromptOutput.tsx (client)
  └─ TipsSection.tsx (server)
  └─ Footer.tsx (server)
```

### Key Design Decisions

1. **No server-side user input**: Zip codes are processed entirely client-side. The client imports static JSON directly via `fetch('/api/...')` or dynamic import. No zip code data ever reaches a server log.

2. **Privacy-safe data flow**: State data is fetched as public static JSON. The zip code lives only in React `useState` in `ZipLookup.tsx` and is discarded on unmount.

3. **data-testid discipline**: All test IDs from PROJECT_SPEC.md are implemented on the correct elements. No deviations.

4. **Accessible-first markup**: Semantic HTML throughout. `<form>` with `<label>` for zip input. `role="alert"` for errors. `aria-live="polite"` for status updates.

---

## Data Model

See `data-model.md`.

---

## Implementation Phases

### Phase 1: Setup and Types
- Verify existing project setup (Next.js, Tailwind, TypeScript)
- Create `src/types/index.ts` with TypeScript interfaces
- Verify existing state JSON data structure matches interfaces

### Phase 2: Core Library Functions
- `src/lib/zipLookup.ts` — zip-to-state mapping loader
- `src/lib/stateData.ts` — state JSON loader (server-safe dynamic import)
- `src/lib/deadlineUtils.ts` — deadline status calculator
- `src/lib/ballotPrompt.ts` — base prompt text
- `src/lib/promptBuilder.ts` — prompt customization logic

### Phase 3: UI Components (User Story 1: Zip Lookup + State Info)
- `src/components/ZipLookup.tsx` — client component with form, validation, state management
- `src/components/StateInfoCard.tsx` — election info + deadline status display
- State selector for multi-state zip codes

### Phase 4: Prompt Generation (User Story 2: Prompt Output + Copy)
- `src/components/PromptOutput.tsx` — prompt display + copy button
- Copy to clipboard with 2-second confirmation
- Clipboard fallback for older browsers

### Phase 5: Static Sections + Accessibility Polish
- `src/components/HeroSection.tsx` — hero with chatbot links
- `src/components/TipsSection.tsx` — tips content
- `src/components/Footer.tsx` — footer with share/attribution
- Skip-to-content link in layout
- Full accessibility pass (heading hierarchy, ARIA labels, focus indicators)

### Phase 6: Integration + Wire-up
- `src/app/page.tsx` — compose all components
- `src/app/layout.tsx` — metadata, skip link, semantic structure
- Final lint and build verification
