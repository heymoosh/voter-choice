<!--
SYNC IMPACT REPORT
Version change: 1.0.0 → 1.1.0
Modified principles:
  - Principle I: Accessibility First — added multilingual accessibility rules
    (lang attribute, text-expansion tolerance, screen reader language announcements)
Added sections:
  - Principle VI: Multilingual Architecture (new)
  - Technology Constraints: translation layer separation requirement added
  - Quality Gates: language toggle and translation completeness gates added
Removed sections: None
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ Constitution Check already references principles
  - .specify/templates/spec-template.md ✅ No conflicting constraints
  - .specify/templates/tasks-template.md ✅ Task categories still consistent
Follow-up TODOs: None
-->

# Ballot Research Tool Constitution

## Core Principles

### I. Accessibility First (NON-NEGOTIABLE)

This is a civic tool for ALL voters. Accessibility is a functional requirement, not an
enhancement. Every UI surface MUST meet WCAG AA standards.

- All interactive elements MUST be keyboard-navigable; tab order follows visual flow.
- Form inputs MUST have associated `<label>` elements.
- Color contrast MUST meet WCAG AA (4.5:1 normal text, 3:1 large text).
- Deadline status indicators MUST communicate via text labels ("Passed", "12 days left"),
  NOT color alone.
- Error messages MUST be announced to screen readers via `aria-live="polite"` or
  `role="alert"`.
- A skip-to-content link MUST be present for keyboard users.
- Page MUST have a logical heading hierarchy (h1 > h2 > h3).
- All interactive elements MUST have minimum 44×44 px touch targets on mobile.
- The `lang` attribute on `<html>` MUST reflect the active display language at all times.
- Screen readers MUST be able to detect language changes (via `lang` attribute update).
- Translated text that is longer than its English equivalent MUST NOT break layouts;
  UI components MUST accommodate text expansion gracefully at all breakpoints.

**Rationale**: Voting rights depend on equal access. Inaccessible UI is a broken feature.
Multilingual support extends this principle — Spanish-speaking voters deserve the same
quality of access.

### II. Mobile-First Responsive Design

The tool went viral on Reddit — the majority of users are on phones. All layout and
interaction decisions start from the smallest viewport and scale up.

- Default styles MUST target mobile (< 640px); tablet and desktop are overrides.
- Breakpoints: mobile (< 640px), tablet (640–1024px), desktop (> 1024px).
- The prompt output area MUST be scrollable on mobile without losing the copy button.
- Touch targets MUST be ≥ 44×44 px (enforced by Principle I as well).

**Rationale**: A tool designed desktop-first degrades on the device most voters use.

### III. Static Data — No Backend, No User Data

The tool MUST NOT host or run an LLM, store user data, or make external API calls at
runtime. All election data is served from static JSON files bundled with the app.

- Zip-to-state mapping MUST be a static JSON lookup (`src/data/zip-to-state.json`).
- State election data MUST be static JSON files (`src/data/states/<XX>.json`).
- No analytics, tracking, authentication, or server-side data persistence.
- Adding a new state requires only adding a JSON file — no code changes.

**Rationale**: Privacy, performance, and zero operational cost. The AI conversation
happens in the user's own chatbot session — this tool is a prompt generator only.

### IV. Test-Driven Development (NON-NEGOTIABLE)

Every piece of functionality MUST have a test written BEFORE the implementation.
The Red-Green-Refactor cycle is strictly enforced.

1. Write a failing test — run the test suite and confirm it fails (RED).
2. Write the minimum production code to make it pass (GREEN).
3. Refactor if needed, keeping tests green (REFACTOR).

NO production code may exist without a preceding failing test. This applies to every
component, utility, and data function. Commits MUST follow the RED→GREEN→REFACTOR
sequence.

**Rationale**: The experiment measures framework-driven quality. TDD is the baseline
discipline that all runs must demonstrate.

### V. Accurate Civic Information

Election data MUST be presented accurately and with appropriate caveats.

- Deadline status calculations MUST be deterministic relative to today's date.
- "Passed" status MUST display when the deadline date is strictly before today.
- The "next upcoming election" is the first election with date ≥ today (ISO comparison).
- When no upcoming election is found, a clear message MUST be shown.
- All state election links MUST point to official government sources.
- The tool MUST NOT express political opinions or candidate recommendations.

**Rationale**: Misinformation about voting deadlines has real civic consequences.

### VI. Multilingual Architecture (NON-NEGOTIABLE)

The tool MUST support multiple display languages without duplicating components, pages,
or application logic. Spanish is the required second language for Phase 2.

- Translation content MUST be separated from component code — no hardcoded UI strings
  in JSX/TSX (except internal technical identifiers).
- All user-facing text MUST be served through a translation lookup layer.
- The default language is English; Spanish is toggled explicitly by the user.
- Language preference MUST persist across page refreshes (browser storage — not URL
  parameters or server state).
- Switching language MUST update all UI text immediately, without a page reload, and
  without resetting application state.
- The language toggle MUST be visible and keyboard-accessible at all times (fixed
  position, not hidden behind a menu).
- The language toggle MUST carry `data-testid="language-toggle"`.
- The full AI prompt (BALLOT_PROMPT.md) MUST be available as a complete, fluent
  translation — NOT assembled from string fragments.
- Date formatting MUST follow language conventions: U.S. format for English,
  Spanish format (e.g., "3 de marzo de 2026") for Spanish.
- Adding a third language MUST require only new translation content — no structural
  changes to components or logic.
- Data values from JSON (state names, election names, accepted IDs) remain in English
  for Phase 2; the architecture MUST NOT assume these fields are always in the UI language.

**Rationale**: Millions of U.S. voters are Spanish-dominant. A language toggle that
requires component duplication is a maintenance trap — the architecture must scale.

## Technology Constraints

- **Framework**: Next.js (exact version pinned in `package.json`), TypeScript strict mode.
- **Styling**: Tailwind CSS utility classes; no CSS-in-JS or inline styles.
- **Testing**: Vitest for unit tests; Playwright for e2e tests (shared test suite in
  `e2e/ballot-tool.spec.ts`). All Playwright `data-testid` attributes defined in
  `docs/PROJECT_SPEC.md` and `docs/PHASE2_SPEC.md` MUST be present on correct elements.
- **Linting**: ESLint with `eslint-plugin-complexity` (max cyclomatic complexity 10) and
  Prettier. Zero lint errors required.
- **No global installs**: All tooling MUST be in `node_modules`; no `npm -g` or system pip.
- **Exact version pinning**: All `package.json` dependencies MUST use exact versions.
- **Translation layer**: All UI strings MUST be managed through a typed translation
  interface (e.g., `src/lib/translations.ts`). Components MUST consume translations via
  a context hook — they MUST NOT import translation records directly.

## Quality Gates

A build is not "done" until ALL of the following pass:

- `next build` completes without errors.
- `npm run lint` reports 0 errors.
- All Playwright e2e tests pass (`e2e/ballot-tool.spec.ts`), including language-toggle tests.
- All Vitest unit tests pass, including translation coverage for all keys.
- Lighthouse scores ≥ 90 for Performance, Accessibility, Best Practices, SEO.
- Cyclomatic complexity ≤ 10 per function (enforced by ESLint).
- Language toggle is visible, keyboard-accessible, and `data-testid="language-toggle"` present.
- All UI text has translations for every supported language (no missing keys at runtime).
- Switching language does not reset zip code state or previously loaded election results.

## Governance

This constitution supersedes all other development practices on this branch. Amendments
require a commit documenting: (a) the changed principle, (b) the rationale, and (c) any
migration required for existing code.

- All implementation decisions MUST be checked against these principles before coding.
- Violations found in code review MUST be fixed before merging.
- The `## Constitution Check` gate in `plan.md` MUST reference and validate against these
  principles before Phase 0 research begins.
- This document is the source of truth for the Spec Kit workflow. The `speckit.plan` and
  `speckit.analyze` commands MUST verify compliance with these principles.

**Version**: 1.1.0 | **Ratified**: 2026-03-30 | **Last Amended**: 2026-04-03
