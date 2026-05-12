# Tasks: Extended Language Support (Vietnamese, Chinese, Arabic)

**Feature**: extended-language-support
**Generated**: 2026-05-12
**Source**: spec.md + plan.md

---

## Phase A: Types and Infrastructure

- [ ] T001 Extend `src/lib/i18n/types.ts`: change `Locale` from `"en" | "es"` to `"en" | "es" | "vi" | "zh" | "ar"`; extend `languageToggle` interface to include all 5 language switch labels
- [ ] T002 Update `src/lib/i18n/formatDate.ts`: add vi-VN, zh-CN, ar-SA locale mappings; zh uses Intl.DateTimeFormat with year/month/day; ar uses numerals in Latin form
- [ ] T003 Update `src/lib/i18n/en.ts`: add new `languageToggle` keys (switchToVietnamese, switchToChinese, switchToArabic)
- [ ] T004 Update `src/lib/i18n/es.ts`: add same new `languageToggle` keys in Spanish
- [ ] T005 Update `src/lib/i18n/I18nContext.tsx`: add vi/zh/ar to DICTIONARIES map; update localStorage hydration validation to accept all 5 locale codes

---

## Phase B: Translation Dictionaries [US1]

- [ ] T006 [US1] Create `src/lib/i18n/vi.ts`: full Vietnamese Translations implementation — all keys from en.ts translated to Vietnamese (formal bạn register); deadline.daysLeft uses Vietnamese grammar (no pluralization: "còn X ngày")
- [ ] T007 [US1] Create `src/lib/i18n/zh.ts`: full Chinese Simplified Translations implementation — all keys translated; deadline.daysLeft uses Chinese form ("还有X天"); languageToggle uses Chinese labels
- [ ] T008 [US1] Create `src/lib/i18n/ar.ts`: full Arabic Translations implementation — RTL text; deadline.daysLeft handles Arabic dual/plural forms; all labels in MSA

---

## Phase C: Ballot Prompts [US2]

- [ ] T009 [US2] Create `src/lib/ballotPrompt.vi.ts`: complete Vietnamese translation of BALLOT_PROMPT_TEXT using formal "bạn" register; civic terms use standard Vietnamese voter community terminology; export as BALLOT_PROMPT_TEXT_VI
- [ ] T010 [US2] Create `src/lib/ballotPrompt.zh.ts`: complete Chinese Simplified translation using informal "你" register; Simplified characters only; civic terms recognizable to Chinese-speaking voters; export as BALLOT_PROMPT_TEXT_ZH
- [ ] T011 [US2] Create `src/lib/ballotPrompt.ar.ts`: complete MSA Arabic translation; no regional dialect; civic terms use standard Arabic; export as BALLOT_PROMPT_TEXT_AR

---

## Phase D: Prompt Builder Extension [US2]

- [ ] T012 [US2] Update `src/lib/promptBuilder.ts`: extend buildPrompt to select vi/zh/ar prompt files; add context block builders for vi, zh, ar with locale-correct labels and date formatting; ensure all 5 locales handled

---

## Phase E: UI Components [US3]

- [ ] T013 [US3] Replace `src/components/LanguageToggle.tsx` with a 5-option selector: keep `data-testid="language-toggle"` on the container; add `data-testid="language-option-{en|es|vi|zh|ar}"` on each option; display each language in its native script; keyboard accessible (Enter/Space/arrow keys); accessible `aria-label`; fixed position top-right; mobile-friendly (compact dropdown or abbreviated)
- [ ] T014 [US3] Extend `src/components/HtmlLangUpdater.tsx`: in useEffect, also set `document.documentElement.dir = locale === "ar" ? "rtl" : "ltr"` when locale changes

---

## Phase F: Tests

- [ ] T015 Update `src/lib/i18n/__tests__/formatDate.test.ts`: add tests for vi-VN format ("3 tháng 3, 2026"), zh-CN format ("2026年3月3日"), ar-SA format ("3 مارس 2026")
- [ ] T016 Update `src/lib/__tests__/promptBuilder.test.ts`: add tests for vi/zh/ar locale prompt selection and context block labels
- [ ] T017 Add Phase 4 e2e tests to `e2e/ballot-tool.spec.ts`:
  - Language selector is present with all 5 options (data-testid checks)
  - Selecting Vietnamese updates UI text
  - Selecting Chinese updates UI text
  - Selecting Arabic sets dir="rtl" on html element
  - Switching from Arabic back to English reverts dir="ltr"
  - Language persistence: select Vietnamese, reload, verify still Vietnamese
  - State preservation: submit zip, switch language, verify results remain
  - Date format per language (Vietnamese, Chinese in prompt output)

---

## Dependencies

- T006, T007, T008 depend on T001 (Locale type must include vi/zh/ar first)
- T005 depends on T006, T007, T008 (DICTIONARIES can't reference imports that don't exist)
- T009, T010, T011 are independent (new files, no dependencies)
- T012 depends on T009, T010, T011 (imports the new prompt files)
- T013 depends on T001, T005 (needs updated Locale type and context)
- T014 is independent of T013
- T015 depends on T002
- T016 depends on T012
- T017 depends on T013, T014 (e2e tests the complete UI)

## Parallel Opportunities

- T003 and T004 can be written in parallel after T001
- T006, T007, T008 can be written in parallel after T001
- T009, T010, T011 can be written in parallel (no mutual dependencies)
- T015 and T016 can be written in parallel after their respective dependencies
