# Research: Ballot Research Tool

**Feature**: 002-ballot-research-tool
**Date**: 2026-03-30
**Status**: Complete — no NEEDS CLARIFICATION items in spec

## Technology Stack (from scaffold)

**Decision**: Next.js 15.5.12 + React 19.1.0 + TypeScript 5.9.3 (App Router)
**Rationale**: Already installed and configured in the scaffold. App Router enables
React Server Components where appropriate. TypeScript strict mode enforces type safety.
**Alternatives considered**: None — scaffold is fixed per CLAUDE.md.

**Decision**: Tailwind CSS via @tailwindcss/postcss
**Rationale**: Installed in scaffold; utility-first CSS aligns with mobile-first
responsive design and avoids runtime style overhead.

**Decision**: Vitest for unit tests; Playwright for e2e tests
**Rationale**: Both installed in scaffold. Vitest is fast and integrates with
TypeScript/ESM natively. Playwright covers the 13 data-testid assertions required
by the shared test suite.

## Architecture Decisions

**Decision**: Pure client component for all interactive UI; Server Component only for
static layout wrapper (page.tsx)
**Rationale**: Zip code state, prompt text, and copy confirmation are all client-side
state. No server-side data fetching needed — all data is static JSON bundled with the
app.
**Alternatives considered**: Full Server Component with form actions (Next.js 15) —
rejected because clipboard API and copy confirmation require browser APIs unavailable
in server context.

**Decision**: Static JSON imports via `import data from '../../data/states/TX.json'`
or dynamic `fetch('/data/states/TX.json')` — use dynamic fetch pattern
**Rationale**: Importing all state JSON files statically would bundle them all at build
time. Dynamic fetching of just the needed state on zip submission is more efficient and
matches the "static data, no external API" constraint.
**Correction**: Next.js 15 serves files in `public/` statically; however `src/data/`
files can be imported as modules. Use direct TypeScript imports for the small stub
dataset (TX, CA, NH, AZ, NM) — avoids fetch overhead and simplifies testing.

**Decision**: All data utility functions in `src/lib/` as pure functions
**Rationale**: Pure functions (no side effects) are trivially testable with Vitest.
TDD Iron Law requires tests to run before implementation — pure functions make this
straightforward.

**Decision**: React `useState` for zip input, lookup result, and copy state
**Rationale**: Minimal state management; no global store needed. State is local to the
single page component.

## Best Practices for Key Areas

### Deadline Status Calculation
- Compare dates as ISO strings (`YYYY-MM-DD`) using `new Date()` comparisons
- Calculate days difference: `Math.ceil((deadline - today) / 86400000)`
- "Passed" = deadline date strictly before today (not including today)
- Colors: > 14 days → green, 1-14 days → yellow, 0-3 days from a `daysLeft <= 3`
  check → red, passed → gray
- Tests: use fixed reference dates injected as parameter (not `Date.now()`) to ensure
  determinism

### Prompt Generation
- Load base prompt from `docs/BALLOT_PROMPT.md` at module level (static import or
  build-time constant)
- Template injection: string interpolation using TypeScript template literals
- The pre-filled context block exactly follows the format in `docs/PROJECT_SPEC.md`
  Section "Prompt Customization Logic"

### Clipboard API
- Use `navigator.clipboard.writeText()` in a `try/catch`
- Fallback: `document.execCommand('copy')` on a selected textarea (deprecated but
  works in old browsers); if both fail, show "Press Ctrl+C / Cmd+C" message
- The `copy-confirmation` element should use `aria-live="polite"` so screen readers
  announce "Copied!"

### Accessibility
- Skip link: `<a href="#main-content" className="sr-only focus:not-sr-only">Skip to main content</a>`
- All form errors use `role="alert"` for immediate screen reader announcement
- Color-coded deadline statuses always accompanied by text ("X days left" / "Passed")
- Minimum touch target: `min-h-[44px] min-w-[44px]` via Tailwind
