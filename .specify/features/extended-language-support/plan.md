# Implementation Plan: Extended Language Support (Vietnamese, Chinese, Arabic)

**Feature**: extended-language-support
**Created**: 2026-05-12
**Branch**: experiment/spec-kit-r1
**Spec**: .specify/features/extended-language-support/spec.md

---

## Technical Context

### Tech Stack

- **Framework**: Next.js 15 (App Router) with TypeScript
- **Styling**: Tailwind CSS 4
- **Testing**: Vitest (unit), Playwright (e2e)
- **i18n approach**: Existing custom React context + typed dictionaries — extend to 5 locales
- **RTL support**: CSS logical properties + Tailwind `[dir=rtl]:` variants + HtmlLangUpdater

### Architecture Decision

**Extend the existing i18n infrastructure — no new library needed.**

The Phase 2 architecture was designed to be extensible: `Locale` type in `types.ts`, `DICTIONARIES` map in `I18nContext.tsx`, and `formatDateLocale` in `formatDate.ts` all need locale additions. The `LanguageToggle` component becomes a five-option selector. RTL is handled by extending `HtmlLangUpdater` to also set `dir`.

**Key changes required:**
1. `types.ts` — extend `Locale` type from `"en" | "es"` to `"en" | "es" | "vi" | "zh" | "ar"`; add `languageToggle` keys for new languages
2. `formatDate.ts` — add locale mappings for vi/zh/ar with custom formatting for zh and ar (Intl.DateTimeFormat handles vi/ar; zh needs custom template `Year年Month月Day日`)
3. `en.ts`, `es.ts` — update `languageToggle` section with keys for all 5 languages
4. New: `vi.ts`, `zh.ts`, `ar.ts` — full Translations dictionaries
5. `I18nContext.tsx` — add vi/zh/ar to DICTIONARIES, update storage validation
6. New: `ballotPrompt.vi.ts`, `ballotPrompt.zh.ts`, `ballotPrompt.ar.ts`
7. `promptBuilder.ts` — extend to handle vi/zh/ar locale codes
8. `LanguageToggle.tsx` — replace toggle with 5-option selector, add `language-option-{code}` testids
9. `HtmlLangUpdater.tsx` — also set `dir="rtl"` when locale is `ar`, reset to `ltr` otherwise
10. New e2e tests for Phase 4 scenarios

### RTL Strategy

Use the `dir` attribute on `<html>` combined with Tailwind's logical properties (e.g., `ms-4` for margin-start, `pe-2` for padding-end) where already present, and `[dir=rtl]:` variants for layout-specific flips. Since Tailwind CSS 4 uses logical properties by default for many utilities, RTL support is largely automatic once `dir="rtl"` is set on `<html>`.

### Date Formatting Strategy

- Vietnamese: Intl.DateTimeFormat with `vi-VN` locale produces "3 tháng 3, 2026" naturally
- Chinese: Intl.DateTimeFormat with `zh-CN` produces "2026年3月3日" naturally  
- Arabic: Intl.DateTimeFormat with `ar-SA` in Latin numerals produces "3 مارس 2026"

### Translation Strategy

Machine-generated translations with back-translation review for the ballot prompt (highest-stakes content). UI labels reviewed for natural phrasing. All civic terminology uses standard community-recognized terms.

---

## Implementation Phases

### Phase A: Types and Infrastructure
- Extend `Locale` type to include vi/zh/ar
- Extend `LOCALE_MAP` in formatDate.ts
- Update `languageToggle` keys in en.ts/es.ts for all 5 languages
- Update `I18nContext.tsx` DICTIONARIES map and storage validation

### Phase B: Translation Dictionaries
- Create `vi.ts` — full Vietnamese translations
- Create `zh.ts` — full Chinese (Simplified) translations
- Create `ar.ts` — full Arabic translations

### Phase C: Ballot Prompts
- Create `ballotPrompt.vi.ts` — formal Vietnamese (bạn register)
- Create `ballotPrompt.zh.ts` — informal Chinese (你 register, Simplified)
- Create `ballotPrompt.ar.ts` — Modern Standard Arabic

### Phase D: Prompt Builder Extension
- Extend `buildPrompt` to select vi/zh/ar prompt files
- Extend `buildContextBlock` to dispatch vi/zh/ar context block builders
- Create context block builder functions for each new locale

### Phase E: UI Components
- Replace `LanguageToggle.tsx` with 5-option selector
- Extend `HtmlLangUpdater.tsx` to set `dir` attribute

### Phase F: Tests
- Unit tests for formatDate with new locales
- Unit tests for promptBuilder with new locales
- E2e tests for each language, RTL, persistence, date formats, prompt content

---

## File Change Summary

| File | Change |
|------|--------|
| `src/lib/i18n/types.ts` | Extend Locale type; add new languageToggle keys |
| `src/lib/i18n/formatDate.ts` | Add vi/zh/ar locale mappings |
| `src/lib/i18n/en.ts` | Update languageToggle section |
| `src/lib/i18n/es.ts` | Update languageToggle section |
| `src/lib/i18n/vi.ts` | NEW — Vietnamese translations |
| `src/lib/i18n/zh.ts` | NEW — Chinese translations |
| `src/lib/i18n/ar.ts` | NEW — Arabic translations |
| `src/lib/i18n/I18nContext.tsx` | Add vi/zh/ar to DICTIONARIES |
| `src/lib/ballotPrompt.vi.ts` | NEW — Vietnamese ballot prompt |
| `src/lib/ballotPrompt.zh.ts` | NEW — Chinese ballot prompt |
| `src/lib/ballotPrompt.ar.ts` | NEW — Arabic ballot prompt |
| `src/lib/promptBuilder.ts` | Extend to 5 locales |
| `src/components/LanguageToggle.tsx` | Replace toggle with 5-option selector |
| `src/components/HtmlLangUpdater.tsx` | Add dir="rtl" support |
| `e2e/ballot-tool.spec.ts` | Add Phase 4 language tests |
| `src/lib/i18n/__tests__/formatDate.test.ts` | Add vi/zh/ar date format tests |
| `src/lib/__tests__/promptBuilder.test.ts` | Add vi/zh/ar prompt tests |
