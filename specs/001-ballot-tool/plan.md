# Implementation Plan: Ballot Research Tool

**Branch**: `001-ballot-tool` | **Date**: 2026-03-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-ballot-tool/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Single-page Next.js web application that generates customized AI ballot research prompts. Users enter their zip code, the system looks up their state's election information from static JSON data, and generates a personalized prompt pre-filled with state-specific dates, deadlines, and resource links. The user copies this customized prompt to any free AI chatbot. Mobile-first responsive design with WCAG AA accessibility compliance.

## Technical Context

**Language/Version**: TypeScript (Next.js 15.5.12, React 19, Node 22.14.0)
**Primary Dependencies**: Next.js 15.5.12, React 19, TypeScript 5.x, Tailwind CSS (already configured in scaffold)
**Storage**: Static JSON files (zip-to-state.json, state election data files in src/data/)
**Testing**: Playwright 1.52.0 (e2e tests), Vitest 3.2.1 (unit tests if needed), ESLint + Prettier
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge - last 2 years)
**Project Type**: Web application (single-page)
**Performance Goals**: < 3 second initial page load, instant zip lookup from static data, Lighthouse Performance ≥ 90
**Constraints**: Mobile-first (375px viewport minimum), WCAG AA accessibility (Lighthouse Accessibility ≥ 90), all required data-testid attributes for e2e testing, ESLint complexity max 10 (may warn on single-page app)
**Scale/Scope**: Single-page app, 3 state stub data (TX, CA, NH), ~1000 lines application code, 42 Playwright e2e tests must pass

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

No project constitution file exists. Skipping gate checks. Project follows Next.js/React best practices and experiment requirements from EXPERIMENT_DESIGN.md.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── page.tsx              # Main ballot tool UI (single-page app)
│   ├── layout.tsx            # Root layout (existing scaffold)
│   └── globals.css           # Tailwind styles (existing scaffold)
├── types/
│   └── election.ts           # TypeScript interfaces for election data
├── lib/
│   ├── election-data.ts      # Data access layer (load JSON, lookup state)
│   └── prompt-generator.ts   # Generate customized prompt with context block
└── data/
    ├── states/
    │   ├── TX.json           # Texas election data (stub)
    │   ├── CA.json           # California election data (stub)
    │   └── NH.json           # New Hampshire election data (stub)
    └── zip-to-state.json     # Zip → state code mapping (stub)

e2e/
└── ballot-tool.spec.ts       # Playwright e2e tests (existing, 42 tests)

scripts/
└── measure.mjs               # Measurement automation (existing)
```

**Structure Decision**: Next.js App Router structure (existing scaffold). Single-page application implemented in `src/app/page.tsx`. Data layer separated into types, lib (business logic), and data (static JSON). E2e tests and measurement infrastructure already exist from Phase 0.3b.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
