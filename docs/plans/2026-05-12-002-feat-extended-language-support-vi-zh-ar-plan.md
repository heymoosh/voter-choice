---
title: "feat: Extended Language Support — Vietnamese, Chinese (Simplified), Arabic"
type: feat
status: active
date: 2026-05-12
---

# feat: Extended Language Support — Vietnamese, Chinese (Simplified), Arabic

## Overview

Extend the ballot research tool from English + Spanish (Phase 2) to support five languages: English, Español, Tiếng Việt, 中文, and العربية. This is the Phase 4 i18n scaling test — verifying whether the Phase 2 architecture generalizes to languages with different character sets, text directions, and formatting conventions.

## Problem Statement / Motivation

Phase 2 added Spanish via a binary toggle. Phase 4 tests whether this architecture scales to:
- **Different character sets** — Vietnamese diacritics, Chinese Han characters, Arabic script
- **RTL layout** — Arabic requires right-to-left document direction
- **Date format conventions** — each language uses different date structures
- **Pluralization rules** — Chinese/Vietnamese don't pluralize the same way as English

## Proposed Solution

1. **Language type** — Expand `Language` type from `"en" | "es"` to `"en" | "es" | "vi" | "zh" | "ar"`
2. **Translations** — Add `vi`, `zh`, `ar` translation objects matching the `Translations` interface
3. **LanguageContext** — Replace `toggleLanguage` with `setLanguage(lang)`, add RTL detection, update `<html>` `lang` and `dir` attributes
4. **LanguageToggle** — Replace binary button with a `<select>` dropdown showing each language in its native script
5. **Prompts** — Add full ballot research prompt translations for Vietnamese, Chinese, Arabic
6. **Prompt builder** — Update `promptBuilder.ts` context block to format dates per selected language
7. **E2e tests** — Add Phase 4 tests: language selection, Arabic RTL, date formatting, prompt language, persistence, state preservation

## Technical Approach

### Architecture

- `src/lib/i18n/translations.ts` — expand `Language` union, add `vi`, `zh`, `ar` translation objects
- `src/lib/i18n/LanguageContext.tsx` — replace `toggleLanguage` with `setLanguage`, add RTL logic, persist all 5 languages to localStorage, update `dir` attribute for Arabic
- `src/components/LanguageToggle.tsx` — replace `<button>` with `<select>`, add `language-option-{code}` options
- `src/lib/i18n/prompts.ts` — add `BALLOT_PROMPT_VI`, `BALLOT_PROMPT_ZH`, `BALLOT_PROMPT_AR`
- `src/lib/promptBuilder.ts` — localize date formatting per language
- `e2e/phase4-i18n.spec.ts` — new e2e test file

### RTL Support

When Arabic is selected:
- Set `document.documentElement.dir = "rtl"` in the `useEffect` that updates `lang`
- Revert to `dir = "ltr"` for all other languages
- CSS: rely on logical properties where possible; the `dir` attribute handles most layout mirroring automatically

### Date Formatting

| Language | Format |
|----------|--------|
| en | March 3, 2026 |
| es | 3 de marzo de 2026 (existing) |
| vi | 3 tháng 3, 2026 |
| zh | 2026年3月3日 |
| ar | 3 مارس 2026 |

Implement in `promptBuilder.ts` via a `formatDate(date, lang)` utility function.

### Translation Approach

- Machine translation reviewed by back-translation to English for the ballot prompt
- UI strings: direct translation, natural civic phrasing
- Vietnamese: formal "bạn" register; Chinese: informal "你"; Arabic: Modern Standard Arabic (MSA)

## Acceptance Criteria

- [ ] Language selector shows all 5 languages in native script
- [ ] Switching language updates all UI text immediately without page reload or state loss
- [ ] `data-testid="language-toggle"` remains on the selector (backward compat)
- [ ] `data-testid="language-option-{code}"` on each option (en, es, vi, zh, ar)
- [ ] Selected language persists across page refresh (localStorage)
- [ ] `<html lang>` updates to correct locale code per language
- [ ] Arabic sets `<html dir="rtl">`; switching away reverts to `dir="ltr"`
- [ ] All UI strings translated in all 5 languages
- [ ] Ballot prompt translated in all 5 languages
- [ ] Context block date formatting per language
- [ ] Vietnamese diacritics, Chinese characters, Arabic script render correctly
- [ ] All existing e2e tests pass (no regressions)
- [ ] New Phase 4 e2e tests: language selection × 5, RTL, date format, persistence, state preservation

## Implementation Plan

### Phase 1: Core i18n infrastructure

1. Expand `Language` type to 5 languages in `translations.ts`
2. Add `vi`, `zh`, `ar` translation objects
3. Update `LanguageContext.tsx`:
   - Replace `toggleLanguage` with `setLanguage`
   - Add RTL `dir` attribute management
   - Update localStorage persistence for 5 languages
4. Update `LanguageToggle.tsx` to `<select>` dropdown

### Phase 2: Prompt translations + date formatting

5. Add Vietnamese, Chinese, Arabic ballot prompts to `prompts.ts`
6. Update `getBallotPrompt()` for 5 languages
7. Add `formatDate(date, lang)` utility
8. Update `promptBuilder.ts` context block to use localized dates

### Phase 3: E2e tests

9. Create `e2e/phase4-i18n.spec.ts` with:
   - Language selection for each of 5 languages
   - Arabic RTL verification
   - Date format per language
   - Language persistence
   - State preservation on language switch

## Sources & References

- Phase spec: `docs/PHASE4_SPEC.md`
- Phase 2 multilingual solution: `docs/solutions/phase2-multilingual-i18n-pattern.md`
- Existing translations: `src/lib/i18n/translations.ts`
- Existing prompts: `src/lib/i18n/prompts.ts`
- Existing LanguageContext: `src/lib/i18n/LanguageContext.tsx`
- Existing LanguageToggle: `src/components/LanguageToggle.tsx`
