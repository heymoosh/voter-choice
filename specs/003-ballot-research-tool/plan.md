# Implementation Plan: Ballot Research Tool

**Branch**: `003-ballot-research-tool` | **Date**: 2026-05-10 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/003-ballot-research-tool/spec.md`

## Summary

Build a single-page ballot research tool that accepts a U.S. zip code, looks up state election data from local JSON files, and generates a customized AI research prompt the voter can copy into any AI chatbot. Supports multi-state zip disambiguation, WCAG AA accessibility, and stores no user data server-side. All logic is client-side; state data is served as static JSON.

## Technical Context

**Language/Version**: TypeScript 5.9.3, Node.js 22.14.0  
**Primary Dependencies**: Next.js 15.5.12 (App Router), React 19.1.0, Tailwind CSS 4.2.1  
**Storage**: Local JSON files (`src/data/states/*.json`, `src/data/zip-to-state.json`) — no database  
**Testing**: Vitest 3.2.1 (unit), Playwright 1.52.0 (e2e)  
**Target Platform**: Web browser (mobile-first responsive, ≥375px wide)  
**Project Type**: Single-page web application (Next.js App Router)  
**Performance Goals**: Prompt visible <5 seconds from page load (all local data, effectively instant)  
**Constraints**: WCAG AA, no server-side storage of zip/user input, keyboard-only navigable  
**Scale/Scope**: 3 state data files (TX, CA, NH), 1 multi-state zip (86515 → AZ/NM)

## Constitution Check

_No project constitution defined. Applying constraints from `CLAUDE.md` and `docs/PROJECT_SPEC.md`._

| Constraint                                    | Status                                         |
| --------------------------------------------- | ---------------------------------------------- |
| TypeScript only (no plain JS)                 | PASS                                           |
| ESLint + Prettier enforced                    | PASS                                           |
| Exact version pins in package.json            | PASS — no new dependencies needed              |
| No server-side logging of user input          | PASS — all logic client-side                   |
| WCAG AA accessibility                         | PASS — required by spec FR-008                 |
| data-testid attributes match shared e2e suite | PASS — 12 attributes from test file documented |

**Gate result: PASS** — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-ballot-research-tool/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.tsx           # (existing — add skip-to-content link)
│   ├── globals.css          # (existing)
│   └── page.tsx             # Main page — all ballot tool UI
├── types/
│   └── election.ts          # TypeScript interfaces for state data
├── lib/
│   ├── election-data.ts     # Zip lookup + state data loading
│   └── prompt-generator.ts  # Customized AI prompt generation
└── data/
    ├── zip-to-state.json    # (existing)
    └── states/
        ├── TX.json          # (existing)
        ├── CA.json          # (existing)
        └── NH.json          # (existing)

src/__tests__/
├── election-data.test.ts
└── prompt-generator.test.ts
```

**Structure Decision**: Single Next.js app with all feature logic in `src/lib/` and UI in `src/app/page.tsx`. No new routes needed — single-page tool.

## Required data-testid Attributes

From `e2e/ballot-tool.spec.ts` (shared, cannot be modified):

| Attribute             | Element           | Purpose                         |
| --------------------- | ----------------- | ------------------------------- |
| `zip-input`           | `<input>`         | Zip code text field             |
| `zip-submit`          | `<button>`        | Submit/lookup button            |
| `zip-error`           | `<p>` or `<div>`  | Validation/format error message |
| `not-found-message`   | `<div>`           | Zip not in database message     |
| `state-info`          | `<section>`       | State election details card     |
| `election-name`       | `<span>` or `<p>` | Next election name              |
| `election-date`       | `<span>` or `<p>` | Next election date              |
| `registration-status` | `<div>`           | Registration deadline + urgency |
| `prompt-output`       | `<textarea>`      | Generated AI research prompt    |
| `state-selector`      | `<div>`           | Multi-state disambiguation UI   |
| `copy-button`         | `<button>`        | Copy prompt to clipboard        |
| `copy-confirmation`   | `<span>`          | "Copied!" 2-second feedback     |

## Complexity Tracking

No complexity violations. All work fits in a single Next.js page with two library modules and two test files.
