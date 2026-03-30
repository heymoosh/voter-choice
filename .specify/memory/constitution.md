<!--
SYNC IMPACT REPORT
Version change: 0.0.0 (template) → 1.0.0 (initial ratification)
Modified principles: N/A (initial adoption)
Added sections:
  - Core Principles (5 principles)
  - Technology Constraints
  - Quality Gates
  - Governance
Removed sections: None (template placeholders replaced)
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ Constitution Check section already present; no update needed
  - .specify/templates/spec-template.md ✅ No conflicting constraints found
  - .specify/templates/tasks-template.md ✅ Task categories consistent with principles
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

**Rationale**: Voting rights depend on equal access. Inaccessible UI is a broken feature.

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

## Technology Constraints

- **Framework**: Next.js (exact version pinned in `package.json`), TypeScript strict mode.
- **Styling**: Tailwind CSS utility classes; no CSS-in-JS or inline styles.
- **Testing**: Vitest for unit tests; Playwright for e2e tests (shared test suite in
  `e2e/ballot-tool.spec.ts`). All Playwright `data-testid` attributes defined in
  `docs/PROJECT_SPEC.md` MUST be present on the correct elements.
- **Linting**: ESLint with `eslint-plugin-complexity` (max cyclomatic complexity 10) and
  Prettier. Zero lint errors required.
- **No global installs**: All tooling MUST be in `node_modules`; no `npm -g` or system pip.
- **Exact version pinning**: All `package.json` dependencies MUST use exact versions.

## Quality Gates

A build is not "done" until ALL of the following pass:

- `next build` completes without errors.
- `npm run lint` reports 0 errors.
- All Playwright e2e tests pass (`e2e/ballot-tool.spec.ts`).
- All Vitest unit tests pass.
- Lighthouse scores ≥ 90 for Performance, Accessibility, Best Practices, SEO.
- Cyclomatic complexity ≤ 10 per function (enforced by ESLint).

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

**Version**: 1.0.0 | **Ratified**: 2026-03-30 | **Last Amended**: 2026-03-30
