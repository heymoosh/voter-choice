# Architecture: Phase 2 — Multilingual Extension

## i18n Architecture Decision

**Approach:** Lightweight React Context (no external library)

**Rationale:** The spec requires translations to be separated from component code and the architecture to support additional languages without structural changes. A custom React Context solution achieves this with zero additional bundle overhead from external i18n libraries.

## New Files

### `src/lib/translations.ts`
- `Translations` interface defining all translatable string keys
- `en` record: English translations
- `es` record: Spanish translations  
- `getTranslation(lang, key)` utility
- Adding a third language = add one new record implementing the interface

### `src/lib/i18n.tsx`
- `LanguageContext` React Context
- `LanguageProvider` component
  - Reads initial language from localStorage on mount
  - Writes to localStorage on language change
  - Updates `document.documentElement.lang` on language change
  - Exports `useLanguage()` hook
- SSR hydration guard: render with default `lang="en"` until client hydrates

### `src/components/LanguageToggle.tsx`
- Fixed-position or header-position toggle button
- `data-testid="language-toggle"`
- `aria-label` describing the action ("Switch to Español" / "Switch to English")
- `aria-live="polite"` region for screen reader announcement
- Keyboard accessible (button element, Enter/Space)

## Modified Files

### `src/app/layout.tsx`
- Wrap children in `<LanguageProvider>`
- Keep static `lang="en"` on `<html>` (SSR default)
- Add `<LanguageToggle>` in header

### `src/app/page.tsx`
- Convert static text to use `useLanguage()` hook and translations
- Pass language to child components as needed

### `src/lib/promptBuilder.ts`
- Add `MAIN_PROMPT_ES` constant: complete fluent Spanish translation
- Modify `buildContextBlock` to accept `lang` param, produce Spanish context block
- Modify `buildPrompt` to accept `lang` param and select correct prompt

### `src/lib/deadlineUtils.ts`
- Modify `formatDate` to accept optional `lang` param
- Modify `getDeadlineLabel` to accept `lang` param, return Spanish labels

### All components
- Import `useLanguage()` hook
- Replace hardcoded strings with `t('key')` pattern from translations

## Data Flow
```
localStorage → LanguageProvider → useLanguage() → components → translated strings
                                              ↓
                                    promptBuilder(lang) → correct prompt
```

## Extensibility
Adding a third language (e.g., Vietnamese):
1. Add `vi` record to `translations.ts` implementing `Translations` interface
2. Add `vi` to the language type union
3. Update the toggle UI to show the third option
No component or logic changes required.
