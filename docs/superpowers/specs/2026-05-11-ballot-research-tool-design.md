# Ballot Research Tool — Design Document

**Date:** 2026-05-11  
**Phase:** 1  
**Framework:** Superpowers  
**Spec Source:** docs/PROJECT_SPEC.md

---

## Goal

A single-page Next.js web application where U.S. voters enter their zip code to see state election information and get a customized AI ballot research prompt they can copy into any free AI chatbot.

## Architecture

**Single Page App (Next.js 15 App Router, React 19)**

The entire UI lives in one page (`src/app/page.tsx`) with sections revealed progressively. State is managed via React `useState` hooks. No external API calls — all data from static JSON files.

### Units

1. **`src/app/page.tsx`** — Root page component. Orchestrates sections.
2. **`src/components/ZipForm.tsx`** — Zip code input + submit. Handles validation. Emits `onSubmit(zip)`.
3. **`src/components/StateSelector.tsx`** — Shown when zip spans multiple states. Emits `onSelect(stateCode)`.
4. **`src/components/StateInfoCard.tsx`** — Displays state election info: election name/date, registration deadlines with status indicators, early voting, voting rules, resource links.
5. **`src/components/PromptOutput.tsx`** — Shows customized prompt + copy button + confirmation. 
6. **`src/components/TipsSection.tsx`** — Static tips content.
7. **`src/components/Footer.tsx`** — Share CTA + attribution.
8. **`src/lib/lookupState.ts`** — Pure function: zip → state codes array (from JSON).
9. **`src/lib/getStateData.ts`** — Pure function: stateCode → state election JSON object.
10. **`src/lib/generatePrompt.ts`** — Pure function: (stateData, zip) → full prompt string.
11. **`src/lib/deadlineStatus.ts`** — Pure function: (isoDate, today) → `{label, color, daysLeft}`.
12. **`src/lib/ballotPromptText.ts`** — Static string export of the BALLOT_PROMPT.md content.

### Data Flow

```
User types zip → ZipForm validates → lookupState(zip) →
  if not found: show not-found-message
  if multi-state: show StateSelector → user picks state
  if single-state or state selected:
    getStateData(stateCode) → StateInfoCard + generatePrompt(stateData, zip) → PromptOutput
```

### Privacy Constraints

- All data is in component state only (`useState`) — cleared on page refresh
- No `localStorage`, `sessionStorage`, cookies
- No external network requests from client
- API keys: not applicable (static data only)

## Components Detail

### ZipForm
- `data-testid="zip-input"` on input
- `data-testid="zip-submit"` on button
- `data-testid="zip-error"` on error message (conditionally rendered)
- Validates: non-empty, exactly 5 digits, numeric
- Submits on button click or Enter key press
- Error messages per spec: "Please enter a zip code" / "Please enter a valid 5-digit zip code"

### StateInfoCard
- `data-testid="state-info"` on container
- `data-testid="election-name"` on election name element
- `data-testid="election-date"` on election date element
- `data-testid="registration-status"` on registration deadlines container
- `data-testid="no-election-message"` shown when no upcoming election
- Deadline status colors: green (>14d), yellow (≤14d), red (≤3d), gray (passed)
- Shows text labels alongside color indicators (accessibility)

### PromptOutput
- `data-testid="prompt-output"` on prompt container
- `data-testid="copy-button"` on copy button
- `data-testid="copy-confirmation"` on confirmation (shown for 2s after copy)
- Clipboard API with fallback (select-all + Ctrl+C/Cmd+C instructions)

### StateSelector
- `data-testid="state-selector"` on selector container
- Select or radio buttons for each state code

## Prompt Generation Logic

From `generatePrompt(stateData, zip)`:
1. Find next upcoming election: first election with `date >= today`
2. Calculate deadline statuses for each registration method
3. Build context block string with all required fields per spec
4. Concatenate: ballotPromptText + "\n\n" + contextBlock

## Error States

| Condition | Component | testid |
|-----------|-----------|--------|
| Empty zip | ZipForm | `zip-error` |
| Invalid format | ZipForm | `zip-error` |
| Zip not found | Page | `not-found-message` |
| Multi-state zip | Page | `state-selector` |
| No upcoming election | StateInfoCard | `no-election-message` |

## Testing Strategy

- **Unit tests (Vitest):** `deadlineStatus.ts`, `generatePrompt.ts`, `lookupState.ts`, `getStateData.ts`
- **E2e tests (Playwright):** shared suite in `e2e/ballot-tool.spec.ts` — all data-testid interactions

## Accessibility

- `<label>` elements for all inputs
- `aria-live="polite"` on error messages
- Skip-to-content link in layout
- Logical heading hierarchy: h1 (page) > h2 (sections) > h3 (subsections)
- WCAG AA color contrast
- 44x44px minimum touch targets

## Selected Approach (from 3 options considered)

**Option A: Single-file page.tsx** — Too large, hard to test units
**Option B: Component per section + lib utils** ✓ **CHOSEN** — Clean boundaries, easy to unit test lib functions, each component has one job
**Option C: Next.js API route for data** — Unnecessary complexity for static data

Option B wins: testable units, clean file organization, YAGNI (no server needed for static data).
