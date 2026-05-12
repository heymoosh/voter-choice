# Tasks: Multilingual Extension (Spanish Language Support)

**Feature**: multilingual-extension
**Generated**: 2026-05-11
**Source**: spec.md + plan.md

---

## Phase 1: Foundation — i18n Infrastructure

### Story Goal
Create the translation infrastructure: typed dictionaries, context provider, date formatting, Spanish ballot prompt, and toggle/lang components.

- [ ] T001 Create src/lib/i18n/types.ts with Translations interface (full typed shape for all translation keys)
- [ ] T002 [P] Create src/lib/i18n/en.ts with English translations object implementing Translations interface
- [ ] T003 [P] Create src/lib/i18n/es.ts with Spanish translations object implementing Translations interface
- [ ] T004 Create src/lib/i18n/I18nContext.tsx with React context, I18nProvider, and useTranslation hook with localStorage hydration
- [ ] T005 Create src/lib/i18n/formatDate.ts with locale-aware date formatting using Intl.DateTimeFormat (en-US vs es-MX)
- [ ] T006 Create src/lib/ballotPrompt.es.ts with complete, fluent Spanish translation of BALLOT_PROMPT_TEXT (full standalone document, not fragment-interpolated)
- [ ] T007 [P] Create src/components/LanguageToggle.tsx with data-testid="language-toggle", keyboard support (Enter/Space), aria-label, and fixed position in viewport
- [ ] T008 [P] Create src/components/HtmlLangUpdater.tsx as a client component that writes document.documentElement.lang via useEffect when locale changes

---

## Phase 2: Component Updates [US1]

### Story Goal (US1): All UI text in components uses translation hook

- [ ] T009 [US1] Update src/components/ZipForm.tsx to consume useTranslation for input label, placeholder, and submit button text
- [ ] T010 [US1] Update src/components/StateInfoCard.tsx to consume useTranslation for all card labels and formatDate for dates and deadline status labels
- [ ] T011 [US1] Update src/components/StateSelector.tsx to consume useTranslation for the multi-state selector prompt
- [ ] T012 [US1] Update src/components/PromptOutput.tsx to consume useTranslation for copy button text and copied confirmation
- [ ] T013 [US1] Update src/components/TipsSection.tsx to consume useTranslation for section heading and all tip items
- [ ] T014 [US1] Update src/components/Footer.tsx to consume useTranslation for all footer text including share heading, body, and attribution line
- [ ] T015 [US1] Update src/components/BallotTool.tsx to wrap children in I18nProvider, pass locale to loadStateData, update error/loading/not-found messages with useTranslation

---

## Phase 3: Prompt Generation with Locale [US2]

### Story Goal (US2): Prompt builder generates locale-aware output

- [ ] T016 [US2] Update src/lib/promptBuilder.ts to accept a locale parameter ("en" | "es"), select BALLOT_PROMPT_TEXT or BALLOT_PROMPT_TEXT_ES, and generate context block with Spanish labels + formatDate when locale is "es"

---

## Phase 4: Layout Integration [US3]

### Story Goal (US3): Toggle and lang attribute wired into app shell

- [ ] T017 [US3] Update src/app/page.tsx to import LanguageToggle and render it in header area, wrapped in I18nProvider so it reads and writes locale; update hero headline/subtitle/chatbot link labels to use useTranslation
- [ ] T018 [US3] Update src/app/layout.tsx to include HtmlLangUpdater client component

---

## Phase 5: Tests + Polish

- [ ] T019 [P] Add unit tests in src/lib/i18n/__tests__/formatDate.test.ts for en-US and es-MX date formatting
- [ ] T020 [P] Add unit tests in src/lib/i18n/__tests__/I18nContext.test.ts for localStorage hydration and locale switching
- [ ] T021 [P] Update src/lib/__tests__/promptBuilder.test.ts to add tests for Spanish locale prompt and context block generation
- [ ] T022 Verify npm run lint passes with zero errors
- [ ] T023 Verify npx vitest run passes (all existing tests + new tests)
- [ ] T024 Verify npx playwright test passes (all Phase 1 e2e tests pass in default English mode; language-toggle data-testid is present)

---

## Dependencies

- T002, T003 depend on T001 (types.ts must exist first)
- T004 depends on T001, T002, T003
- T009–T015 depend on T004 (I18nContext must be available)
- T016 depends on T006 (Spanish prompt must exist)
- T017, T018 depend on T004, T007, T008
- T019–T021 depend on T004–T006
- T022–T024 depend on all implementation tasks

## Parallel Opportunities

- T002 and T003 can be written in parallel after T001
- T007 and T008 can be written in parallel
- T009–T015 can be written in parallel (different files)
- T019, T020, T021 can be written in parallel
