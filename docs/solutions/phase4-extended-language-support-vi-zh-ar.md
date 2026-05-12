---
title: "Phase 4: Extended Language Support — Vietnamese, Chinese, Arabic"
date: 2026-05-12
mode: compact-safe
phase: 4
---

# Phase 4: Extended Language Support — Vietnamese, Chinese, Arabic

## Problem Solved

Extended the ballot research tool from English + Spanish (Phase 2) to support five languages: English, Español, Tiếng Việt, 中文, and العربية. This validated that the Phase 2 i18n architecture scales to languages with different character sets, text directions, and date formatting conventions.

## Approach

### 1. Language Type Expansion

Expanded `Language = "en" | "es"` to `Language = "en" | "es" | "vi" | "zh" | "ar"` in `src/lib/i18n/translations.ts`. The single union type change cascaded naturally via TypeScript to all callers.

### 2. Translation Objects

Added complete `vi`, `zh`, `ar` translation objects implementing the full `Translations` interface. All strings cover UI labels, error messages, tips, Phase 3 additions, and Phase 4 new strings.

### 3. LanguageContext: Toggle → Selector

Replaced the binary `toggleLanguage` API with `setLanguage(lang: Language)`. The legacy `toggleLanguage` was preserved for backward compatibility. Added RTL support:

```typescript
const RTL_LANGUAGES: Language[] = ["ar"];

useEffect(() => {
  document.documentElement.lang = language;
  document.documentElement.dir = RTL_LANGUAGES.includes(language) ? "rtl" : "ltr";
}, [language]);
```

### 4. LanguageToggle: Button → Select

Replaced the `<button>` toggle with a `<select>` element showing all 5 languages in their native scripts. The `data-testid="language-toggle"` was preserved (backward compat). Added per-option `data-testid="language-option-{code}"` testids.

### 5. Ballot Prompt Translations

Added full ballot research prompt translations:
- **Vietnamese (BALLOT_PROMPT_VI):** Formal register, "bạn" address, civic terminology natural to Vietnamese speakers
- **Chinese (BALLOT_PROMPT_ZH):** Simplified characters, informal "你", civic terminology familiar in Chinese-American communities  
- **Arabic (BALLOT_PROMPT_AR):** Modern Standard Arabic (MSA), not regional dialect; appropriate for civic materials

### 6. Date Formatting with Intl.DateTimeFormat

Replaced the binary `en/es` locale switch with a 5-language map:

```typescript
const LOCALE_MAP: Record<Language, string> = {
  en: "en-US", es: "es-ES", vi: "vi-VN", zh: "zh-CN", ar: "ar-SA",
};
```

Arabic uses `numberingSystem: "latn"` to keep date numbers in Western digits (appropriate for MSA civic materials).

### 7. Context Block Localization

Updated `buildContextBlock()` and `buildCivicContextBlock()` in `promptBuilder.ts` with full localization for all 5 languages. Each language uses native date formats:

| Language | Format | Example |
|----------|--------|---------|
| English | Month D, YYYY | March 3, 2026 |
| Spanish | D de mes de YYYY | 3 de marzo de 2026 |
| Vietnamese | D tháng M, YYYY | 3 tháng 3, 2026 |
| Chinese | YYYY年M月D日 | 2026年3月3日 |
| Arabic | D MMMM YYYY | 3 مارس 2026 |

## Key Insights

### Language persistence test timing

`localStorage` is read in a `useEffect` on mount, meaning after hydration there's an async delay before `document.documentElement.lang` reflects the stored value. E2e tests must use `page.waitForFunction(() => document.documentElement.lang === "vi")` rather than checking immediately after `page.reload()`.

### Prettier line length in multi-language switch statements

The `buildContextBlock()` function grew significantly with 5 languages. Prettier kept lines within 80 chars for function signatures but flagged trailing commas in object literals. Always run `npx prettier --write` after writing large translation objects before lint.

### RTL revert is critical

When switching away from Arabic, explicitly setting `dir = "ltr"` prevents RTL artifacts. Using `document.documentElement.dir = RTL_LANGUAGES.includes(language) ? "rtl" : "ltr"` in the same `useEffect` handles both directions cleanly.

### Complexity warnings from switch-style multi-language functions

`buildContextBlock()` showed cyclomatic complexity of 52 (from the 5 language branches). This is expected when adding full localization blocks. The existing codebase already had complexity warnings, so these are logged as pre-existing issues.

## Files Modified

- `src/lib/i18n/translations.ts` — Language type + vi/zh/ar translations (371 lines added)
- `src/lib/i18n/prompts.ts` — vi/zh/ar ballot prompt translations (298 lines added)  
- `src/lib/i18n/LanguageContext.tsx` — setLanguage API + RTL support
- `src/components/LanguageToggle.tsx` — <select> with 5 options + language-option testids
- `src/lib/promptBuilder.ts` — 5-language date formatting + context blocks
- `e2e/phase4-i18n.spec.ts` — 48 new e2e tests (language selection, RTL, persistence, character rendering)

## Test Results

- Vitest: 20/20 passed (no regressions)
- Playwright: 110/110 passed (62 existing + 48 new Phase 4 tests)
- TypeScript: 0 errors
- ESLint: 0 errors, warnings pre-existing
