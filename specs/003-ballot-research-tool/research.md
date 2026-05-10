# Research: Ballot Research Tool

**Branch**: `003-ballot-research-tool` | **Date**: 2026-05-10

## Decision Log

### 1. Data Loading Strategy

**Decision**: Import state JSON files statically via `import()` in `src/lib/election-data.ts`. Zip-to-state mapping loaded as a static import.  
**Rationale**: All data is local; no network requests needed. Static imports are tree-shaken by Next.js and type-safe with TypeScript. Avoids `fetch()` latency and keeps the privacy guarantee (no zip sent to server).  
**Alternatives considered**: Dynamic `fetch('/api/state?zip=...')` — rejected because it would log zip codes server-side, violating FR-007.

### 2. Multi-State Zip Handling

**Decision**: When zip maps to >1 state, render an inline `<div data-testid="state-selector">` with radio buttons or buttons for each state — no modal overlay.  
**Rationale**: Inline selector is simpler, keyboard-navigable, and screen-reader friendly without focus-trap complexity. The e2e test only checks `data-testid="state-selector"` is visible.  
**Alternatives considered**: Modal dialog — adds focus trap complexity and ARIA role management; not justified for 2-state disambiguation.

### 3. Deadline Urgency Thresholds

**Decision**: Use spec-defined thresholds from `spec.md` Assumptions section:

- ≤7 days: "urgent" (red badge + "Closes soon" text)
- 8–30 days: "approaching" (yellow badge + "Coming up" text)
- > 30 days: "on track" (green badge + "Open" text)
- Deadline passed: "closed" (gray badge + "Closed" text)

**Rationale**: Spec explicitly defines these; deterministic, no ambiguity.

### 4. Clipboard Fallback

**Decision**: Try `navigator.clipboard.writeText()` first; if it throws or is unavailable, display prompt in a `<textarea>` with `data-testid="prompt-output"` (already required by e2e). The textarea is always rendered; when clipboard is available the button copies from it, when unavailable the user manually selects the text.  
**Rationale**: FR-014 requires visible textarea fallback. Having the textarea visible at all times satisfies both paths and simplifies the component.

### 5. Prompt Generation Content

**Decision**: Generate prompt using all available state fields: state name, next election name + date, primary type, registration deadline + status, early voting window (or "not available"), ID requirement, phone policy, and resource links.  
**Rationale**: SC-003 requires no placeholder text; SC-006 requires prompt to contain state-specific content. The vanilla branch implementation confirms this structure works.

### 6. No New Dependencies

**Decision**: Implement with zero new `npm install` dependencies. All needed: TypeScript, React, Tailwind, Next.js — already installed.  
**Rationale**: CLAUDE.md requires exact version pins; adding dependencies creates experiment divergence vs. vanilla. The feature does not require any library beyond the scaffold.

### 7. State Shown for Next Upcoming Election

**Decision**: Show the election with the earliest date that is still in the future (relative to `2026-05-10`). If all elections are past, show the most recent one.  
**Rationale**: Voters need actionable information about the next election, not past ones.
