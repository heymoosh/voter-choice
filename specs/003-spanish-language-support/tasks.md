# Tasks: Spanish Language Support

**Input**: Design documents from `/specs/003-spanish-language-support/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**TDD REQUIRED**: Constitution Principle IV is NON-NEGOTIABLE. Write failing test first,
confirm RED, then implement GREEN. Every task with a test file must follow RED→GREEN→REFACTOR.

**Commit format**: `phase2: <description> — RED→GREEN` (or `phase2: <description>` for non-test tasks)

---

## Phase 1: Setup

**Purpose**: No new project infrastructure needed — extending an existing Phase 1 app.
One-time preparation before translation work begins.

- [ ] T001 Reset metrics/workflow-log.jsonl for Phase 2 and verify npm install is clean — `metrics/workflow-log.jsonl`

**Checkpoint**: Environment ready for translation work.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core i18n infrastructure that MUST be complete before ANY user story can be implemented.
All components depend on `translations.ts` and `i18n.tsx`.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Write failing tests for `Language` type and `Translations` interface — all keys present for 'en' and 'es', no undefined values in `src/lib/translations.test.ts`
- [ ] T003 Implement `src/lib/translations.ts` — `Language = "en" | "es"`, typed `Translations` interface with all keys (hero, zipForm, loading, errors, stateInfo, stateSelector, promptOutput, tips, footer, a11y), complete `en` record, complete `es` record, exported `translations` Record; confirm GREEN
- [ ] T004 Write failing tests for `LanguageProvider`, `useLanguage()` hook, and localStorage persistence in `src/lib/i18n.test.tsx` — provider renders children, hook returns `{ lang, setLang }`, setLang updates language, localStorage read on mount, setLang persists to localStorage
- [ ] T005 Implement `src/lib/i18n.tsx` — `LanguageContext`, `LanguageProvider` (init to 'en', useEffect reads localStorage, setLang persists), `useLanguage()` hook; confirm GREEN

**Checkpoint**: Translation data layer and React context complete. All user stories can now begin.

---

## Phase 3: User Story 1 — Language Toggle (P1) 🎯 MVP

**Goal**: Toggle visible at all times, switches all text instantly, persists across refreshes,
keyboard accessible, lang attribute on `<html>` updates on switch.

**Independent Test**: Load app in English → see toggle in top-right → click toggle → page
switches to Spanish (all UI text) without reload → refresh → page loads in Spanish.

### Tests for User Story 1

- [ ] T006 [US1] Write failing tests for `LanguageToggle` component in `src/components/LanguageToggle.test.tsx` — renders with `data-testid="language-toggle"`, aria-label present, click calls setLang, keyboard (Enter/Space) triggers toggle, shows "Español" when lang=en, shows "English" when lang=es
- [ ] T007 [US1] Write failing tests for `page.tsx` refactor in `src/app/page.test.tsx` — LanguageProvider wraps content, LanguageToggle renders, PageContent renders

### Implementation for User Story 1

- [ ] T008 [US1] Implement `src/components/LanguageToggle.tsx` — `fixed top-4 right-4 z-50`, `<button>` with `data-testid="language-toggle"`, `aria-label` (context-aware), calls `setLang` via `useLanguage()`; confirm GREEN
- [ ] T009 [US1] Refactor `src/app/page.tsx` — thin server shell: imports `LanguageProvider`, `LanguageToggle`; page body wrapped in `<LanguageProvider>` with `<LanguageToggle />` rendered at top level; `<BallotToolClient />` and page sections inside provider; confirm GREEN
- [ ] T010 [US1] Add `<html lang>` attribute update — in `LanguageProvider` or layout: `useEffect` updates `document.documentElement.lang` on every language change; write test confirming lang="es" is set when Spanish active; confirm GREEN

**Checkpoint**: Language toggle is visible, functional, keyboard-accessible, and persists.
`<html lang>` attribute updates on switch. All Phase 1 e2e tests still pass (`npm test -- --run`).

---

## Phase 4: User Story 2 — Translated UI and Prompt Output (P1)

**Goal**: Every label, instruction, and error on the page is in Spanish when toggled.
Full Spanish ballot-research prompt generated. Spanish context block with Spanish labels.

**Independent Test**: Switch to Spanish → enter valid zip → submit → prompt area shows
full Spanish prompt with Spanish context block structure. All UI labels in Spanish.

### Tests for User Story 2

- [ ] T011 [P] [US2] Write failing tests for `generatePrompt.ts` with `lang='es'` in `src/lib/generatePrompt.test.ts` — returns Spanish base prompt (contains Spanish text), context block starts with "¡Hola!", dates formatted as "3 de marzo de 2026" when lang='es', English prompt unchanged when lang='en'
- [ ] T012 [P] [US2] Write failing tests for `BallotToolClient.tsx` in `src/components/BallotToolClient.test.tsx` — in Spanish mode, passes lang='es' to generatePrompt, loading text in Spanish, not-found message in Spanish, no-election message in Spanish

### Implementation for User Story 2

- [ ] T013 [US2] Extend `src/lib/generatePrompt.ts` — add `BALLOT_PROMPT_ES` complete constant (~200 lines, fluent Spanish, "tú" voice), add `buildContextBlockEs()` for Spanish context block (structure per PHASE2_SPEC.md example), extend `generatePrompt(state, zip, todayISO?, lang?)` to select correct prompt + context block by lang; confirm GREEN
- [ ] T014 [US2] Update `src/components/BallotToolClient.tsx` — consume `useLanguage()`, pass `lang` to `generatePrompt()`, translate loading/not-found/no-election messages using `translations[lang].loading`, `translations[lang].errors.*`; add `useEffect([lang])` to trigger prompt regeneration when language changes while results are displayed; confirm GREEN
- [ ] T015 [P] [US2] Write failing tests for `ZipForm.tsx` in `src/components/ZipForm.test.tsx` — Spanish submit button text, Spanish empty error, Spanish invalid error when lang='es'
- [ ] T016 [P] [US2] Update `src/components/ZipForm.tsx` — consume `useLanguage()`, replace all hardcoded strings with `translations[lang].zipForm.*` and `translations[lang].errors.*`; confirm GREEN
- [ ] T017 [P] [US2] Write failing tests for `PromptOutput.tsx` in `src/components/PromptOutput.test.tsx` — Spanish copy button label, Spanish "Copied!" feedback when lang='es'
- [ ] T018 [P] [US2] Update `src/components/PromptOutput.tsx` — consume `useLanguage()`, replace copy button strings with `translations[lang].promptOutput.*`; confirm GREEN
- [ ] T019 [P] [US2] Write failing tests for `StateSelectorModal.tsx` in `src/components/StateSelectorModal.test.tsx` — Spanish selector prompt text when lang='es'
- [ ] T020 [P] [US2] Update `src/components/StateSelectorModal.tsx` — consume `useLanguage()`, replace prompt text with `translations[lang].stateSelector.prompt`; confirm GREEN

**Checkpoint**: Full Spanish UI + Spanish prompt generation. Switch to Spanish, enter zip,
get full Spanish prompt. All Phase 1 e2e tests still pass.

---

## Phase 5: User Story 3 — Spanish Error Messages (P2)

**Goal**: All error states (empty zip, invalid zip, zip not found, no upcoming elections,
multi-state) display in Spanish when language is set to Spanish.

**Independent Test**: Set language to Spanish → submit empty form → see Spanish error →
enter non-5-digit zip → see Spanish invalid error → enter unknown zip → see Spanish not-found.

### Tests for User Story 3

- [ ] T021 [US3] Write failing tests for exact error string matching in `src/components/ZipForm.test.tsx` and `src/components/BallotToolClient.test.tsx` — verify exact Spanish text per PHASE2_SPEC.md reference translations ("Por favor ingresa un código postal", etc.); additionally test FR-018: given an error currently displayed in ZipForm, when language switches to Spanish, error message updates immediately without re-submit

### Implementation for User Story 3

- [ ] T022 [US3] Verify and finalize Spanish error strings in `src/lib/translations.ts` — compare against PHASE2_SPEC.md reference translations: "Por favor ingresa un código postal", "Por favor ingresa un código postal válido de 5 dígitos", "Aún no tenemos datos para este código postal...", "No se encontraron elecciones próximas para [State]..."; confirm GREEN

**Note**: Most error translation work is already done in Phase 4. This phase validates
exact string matching against the spec reference translations and fills any gaps.

**Checkpoint**: All 6 error scenarios produce correct Spanish text. Phase 1 e2e tests still pass.

---

## Phase 6: User Story 4 — Spanish Date and Status Formatting (P2)

**Goal**: Election dates display as "3 de marzo de 2026" in Spanish mode.
Deadline status indicators read "Quedan X días" / "Pasado" in Spanish.

**Independent Test**: Switch to Spanish → enter valid zip → verify election dates show
Spanish format and deadline status uses Spanish text.

### Tests for User Story 4

- [ ] T023 [US4] Write failing tests for `getDeadlineStatus.ts` in `src/lib/getDeadlineStatus.test.ts` — with locale='es-US', date label formatted as "3 de marzo de 2026"; with locale='en-US' (default), format unchanged
- [ ] T024 [US4] Write failing tests for `StateInfoCard.tsx` in `src/components/StateInfoCard.test.tsx` — Spanish field labels in Spanish mode, date values in Spanish format, deadline status text in Spanish

### Implementation for User Story 4

- [ ] T025 [US4] Extend `src/lib/getDeadlineStatus.ts` — add optional `locale?: string` param (default `'en-US'`), use `Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date)` for the date portion of the label; confirm GREEN
- [ ] T026 [US4] Update `src/components/StateInfoCard.tsx` — consume `useLanguage()`, replace hardcoded field labels with `translations[lang].stateInfo.*`, pass locale to `getDeadlineStatus()`, render deadline status text from `translations[lang].stateInfo.deadlineStatus(days)` / `translations[lang].stateInfo.deadlinePassed`; confirm GREEN

**Checkpoint**: Election dates and status indicators display in Spanish format when Spanish active.
All Phase 1 e2e tests still pass.

---

## Phase 7: User Story 5 — Tips, Footer, and Accessibility Text (P3)

**Goal**: Tips section, footer attribution, skip link, and hero section all in Spanish
when language is set to Spanish. `<html lang="es">` confirmed.

**Independent Test**: Switch to Spanish → scroll to tips/footer → verify Spanish text.
Check DOM: `<html lang="es">`. Skip link text in Spanish.

### Tests for User Story 5

- [ ] T027 [US5] Write failing tests for `PageContent.tsx` in `src/app/PageContent.test.tsx` — hero title in Spanish, all 4 tips in Spanish, footer "Creado por una persona usando herramientas de IA" in Spanish mode; chatbot names (Claude, ChatGPT) unchanged

### Implementation for User Story 5

- [ ] T028 [US5] Create `src/app/PageContent.tsx` — extract hero section, tips section, and footer from `page.tsx`; consume `useLanguage()`, use `translations[lang].*` for all text; chatbot names remain hardcoded as proper nouns; confirm GREEN
- [ ] T029 [US5] Update `src/app/page.tsx` — import and render `<PageContent />` in place of the extracted sections; skip link text now comes from `translations[lang].a11y.skipToContent`; confirm GREEN and no layout regressions

**Checkpoint**: Full page translated. All 5 user stories complete. All Phase 1 e2e tests pass.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verification, cleanup, and measurement after all user stories complete.

- [ ] T030 [P] Run full Vitest suite — `npm test -- --run` — confirm 0 failures; record test count
- [ ] T030a [P] Verify WCAG AA color contrast for all Spanish-mode text — spot-check StateInfoCard labels, ZipForm errors, and PromptOutput in Spanish using browser DevTools or axe; verify text expansion does not cause overflow or clipping at mobile (< 640px), tablet, and desktop breakpoints
- [ ] T031 [P] Run ESLint — `npm run lint` — confirm 0 errors and 0 warnings; fix any violations
- [ ] T032 [P] Run `next build` — confirm 0 build errors; check first-load JS bundle size is ≤ 30 kB above Phase 1 baseline
- [ ] T033 Verify language switch does not reset application state — manual or automated: enter zip, get results, switch language, confirm results still displayed
- [ ] T034 Verify localStorage persistence — manual: switch to Spanish, refresh page, confirm Spanish loads
- [ ] T035 Run `npm run measure` and save JSON report to `metrics/`
- [ ] T036 Run `node scripts/analyze-adherence.mjs` and save adherence report
- [ ] T037 Commit all remaining changes: `phase2: complete — all tests GREEN, 0 lint errors`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 (needs LanguageProvider from i18n.tsx)
- **US2 (Phase 4)**: Depends on Phase 2 AND Phase 3 (LanguageProvider must wrap components)
- **US3 (Phase 5)**: Depends on Phase 4 (error strings built in translations, wired in Phase 4)
- **US4 (Phase 6)**: Depends on Phase 2 (translations needed) — can parallel Phase 3
- **US5 (Phase 7)**: Depends on Phase 2 AND Phase 3 (needs LanguageProvider)
- **Polish (Phase 8)**: Depends on all user story phases complete

### User Story Dependencies

- **US1 (P1)**: Unblocked after Foundational. Start here.
- **US2 (P1)**: Depends on US1 (toggle must exist for components to get language state)
- **US3 (P2)**: Depends on US2 (error strings part of translations, wired in US2 component work)
- **US4 (P2)**: Depends on Foundational only (can parallel US1 on getDeadlineStatus change)
- **US5 (P3)**: Depends on US1 (LanguageProvider must wrap PageContent)

### Within Each User Story

- Failing test MUST be written and confirmed RED before implementation
- Each test file committed as RED commit before implementation commit
- Models/data → services → components (dependency order)
- Story complete + all tests GREEN before moving to next story

### Parallel Opportunities

- T011 and T012 (US2 test writing) can run in parallel
- T015, T017, T019 (component test writing in US2) can run in parallel
- T016, T018, T020 (component implementations in US2) can run in parallel after their tests pass
- T023 and T024 (US4 tests) can run in parallel
- T030, T031, T032 (Polish phase checks) can run in parallel

---

## Parallel Example: User Story 2

```bash
# Launch all US2 component test writing together:
Task T011: "Write failing generatePrompt.ts tests with lang='es'"
Task T012: "Write failing BallotToolClient.tsx language mode tests"

# Once generatePrompt is GREEN, launch component implementations together:
Task T016: "Update ZipForm.tsx with translations"
Task T018: "Update PromptOutput.tsx with translations"
Task T020: "Update StateSelectorModal.tsx with translations"
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002-T005) — CRITICAL
3. Complete Phase 3: User Story 1 (T006-T010)
4. **STOP AND VALIDATE**: Toggle visible, switches language, persists — before any component translations
5. Then expand to US2+

### Incremental Delivery

1. Foundational (T002-T005) → i18n infrastructure ready
2. US1 (T006-T010) → toggle works, page structure correct
3. US2 (T011-T020) → full translation + Spanish prompt
4. US3 (T021-T022) → exact error string verification
5. US4 (T023-T026) → date/status formatting
6. US5 (T027-T029) → tips/footer/hero
7. Polish (T030-T037) → measure and commit

---

## Notes

- [P] tasks = different files, no shared state dependencies — safe to parallelize
- TDD is NON-NEGOTIABLE per Constitution Principle IV — no implementation before RED test
- Commit format: `phase2: <name> — RED→GREEN` for each TDD cycle
- Run `npm test -- --run` after each GREEN implementation to catch regressions
- Phase 1 e2e tests (42 tests) must pass at every checkpoint — if they fail, fix before continuing
- `phonesAtPollsDetail` and `earlyVoting.notes` field values display in English (per spec) — do not translate
- Chatbot names (Claude, ChatGPT, Gemini, Grok) are proper nouns — never translate
