# Implementation Plan: Spanish Language Support

**Branch**: `003-spanish-language-support` | **Date**: 2026-04-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/003-spanish-language-support/spec.md`

## Summary

Extend the Phase 1 ballot research tool with Spanish language support. A React Context
provider (`LanguageProvider`) manages language state with `localStorage` persistence.
All UI strings are centralized in a typed `translations.ts` module. Three new files
are added (translations, i18n context, LanguageToggle, PageContent) and eight existing
files are extended. Full Spanish prompt (`BALLOT_PROMPT_ES`) stored as a complete
constant. TDD Iron Law applies to every new and modified unit.

## Technical Context

**Language/Version**: TypeScript 5.9.3 (strict mode)
**Primary Dependencies**: Next.js 15.5.12, React 19.1.0, Tailwind CSS
**Storage**: `localStorage` for language preference (client-side only); no new server state
**Testing**: Vitest (unit + component), Playwright (e2e shared suite)
**Target Platform**: Web application (mobile-first, all modern browsers)
**Project Type**: Single-page Next.js App Router application (extending Phase 1)
**Performance Goals**: Language switch < 200ms (client-side React state update — trivially fast)
**Constraints**: No external API calls; WCAG AA maintained; ≤ 30 kB bundle increase
**Scale/Scope**: 2 languages; ~50 translation keys; 4 new files; 8 modified files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Accessibility First | PASS | `lang` attribute updated on switch; toggle keyboard-accessible; skip link translated; WCAG AA maintained; text expansion handled via Tailwind flex |
| II. Mobile-First | PASS | LanguageToggle is `fixed top-4 right-4` — visible on all viewports; text expansion tested at all breakpoints |
| III. Static Data / No Backend | PASS | Language preference in `localStorage` (no server); all translation data bundled statically |
| IV. TDD (NON-NEGOTIABLE) | PASS | Every new file and every modified function gets failing test first; RED→GREEN→REFACTOR→COMMIT sequence enforced |
| V. Accurate Civic Info | PASS | No changes to civic data logic; date formatting uses Intl.DateTimeFormat for accuracy |
| VI. Multilingual Architecture | PASS | Typed `Translations` interface; `LanguageProvider` context; no hardcoded strings in JSX; adding 3rd language = new record in translations.ts only |

All gates PASS. Phase 0 research complete. Phase 1 design complete. Proceed to tasks.

## Project Structure

### Documentation (this feature)

```text
specs/003-spanish-language-support/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── ui-contracts.md  # Phase 1 output
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (from /speckit.tasks)
```

### Source Code

```text
src/
├── app/
│   ├── layout.tsx           # Unchanged (skip link, metadata)
│   ├── page.tsx             # MODIFIED: thin server shell → LanguageProvider + PageContent
│   └── PageContent.tsx      # NEW: client component for hero, tips, footer (translated)
├── components/
│   ├── BallotToolClient.tsx  # MODIFIED: consumes useLanguage(), passes lang to generatePrompt
│   ├── ZipForm.tsx           # MODIFIED: consumes t.zipForm.* and t.errors.*
│   ├── StateInfoCard.tsx     # MODIFIED: consumes t.stateInfo.*, locale-aware dates
│   ├── PromptOutput.tsx      # MODIFIED: consumes t.promptOutput.* for copy button
│   ├── StateSelectorModal.tsx # MODIFIED: consumes t.stateSelector.prompt
│   └── LanguageToggle.tsx    # NEW: fixed toggle button, data-testid="language-toggle"
└── lib/
    ├── translations.ts      # NEW: Language type, Translations interface, en/es records
    ├── i18n.tsx             # NEW: LanguageContext, LanguageProvider, useLanguage() hook
    ├── generatePrompt.ts    # MODIFIED: add lang param, BALLOT_PROMPT_ES, Spanish context
    ├── getDeadlineStatus.ts # MODIFIED: add locale param for Intl.DateTimeFormat
    └── [unchanged Phase 1 lib files]
```

## Phase 0: Research — Completed

See `research.md`. No NEEDS CLARIFICATION items. Key decisions:

- React Context + localStorage (not URL routing, not library)
- Typed TypeScript translation records (not JSON files)
- `localStorage` with try/catch fallback for private mode
- SSR hydration guard: init to `'en'`, read localStorage in `useEffect`
- Fixed top-right LanguageToggle (`fixed top-4 right-4 z-50`)
- Complete `BALLOT_PROMPT_ES` constant (not assembled from fragments)
- `generatePrompt()` extended with optional `lang?: Language` param
- `getDeadlineStatus()` extended with optional `locale?: string` param
- `page.tsx` refactored to server shell + `PageContent` client component

## Phase 1: Design — Completed

### Data Model

See `data-model.md`. Key types:
- `Language = "en" | "es"` — canonical language enum
- `Translations` — typed interface, ~50 keys, functions for interpolated strings
- `LanguageContextValue = { lang, setLang }` — context shape
- Extended `generatePrompt(state, zip, todayISO?, lang?)` signature
- Extended `getDeadlineStatus(dateISO, todayISO, locale?)` signature

### UI Contracts

See `contracts/ui-contracts.md`. Defines:
- `LanguageToggle` — `data-testid`, ARIA, keyboard, fixed position behavior
- All modified components — English unchanged, Spanish text specified for all messages
- Language-independent invariants — Phase 1 test IDs all preserved

### Source Files to Create/Modify (in dependency order)

**New files:**
1. `src/lib/translations.ts` + `translations.test.ts`
2. `src/lib/i18n.tsx` + `i18n.test.tsx`
3. `src/components/LanguageToggle.tsx` + `LanguageToggle.test.tsx`
4. `src/app/PageContent.tsx` + `PageContent.test.tsx`

**Modified files:**
5. `src/lib/generatePrompt.ts` + update `generatePrompt.test.ts`
6. `src/lib/getDeadlineStatus.ts` + update `getDeadlineStatus.test.ts`
7. `src/app/page.tsx` + update `page.test.tsx`
8. `src/components/BallotToolClient.tsx` + update `BallotToolClient.test.tsx`
9. `src/components/ZipForm.tsx` + update `ZipForm.test.tsx`
10. `src/components/StateInfoCard.tsx` + update `StateInfoCard.test.tsx`
11. `src/components/PromptOutput.tsx` + update `PromptOutput.test.tsx`
12. `src/components/StateSelectorModal.tsx` + update `StateSelectorModal.test.tsx`

### TDD Sequence per File

For each file above:
1. Create or update `<name>.test.ts[x]` with failing assertions (RED)
2. Run `npm test -- --run` to confirm failure
3. Create/update implementation to pass tests (GREEN)
4. Refactor if needed, keeping tests green (REFACTOR)
5. Commit `phase2: <name> — RED→GREEN`

## Complexity Tracking

No constitution violations. No complexity justification required.

The `generatePrompt.ts` function's cyclomatic complexity may increase with the added
language branch. If it exceeds 10, extract `buildContextBlockEn()` and
`buildContextBlockEs()` as separate named functions (already planned in data-model.md).
