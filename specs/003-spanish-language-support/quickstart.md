# Quickstart: Spanish Language Support

**Branch**: `003-spanish-language-support` | **Date**: 2026-04-03

## Overview

This extends the Phase 1 ballot research tool with Spanish language support. The
implementation adds 3 new files and modifies 8 existing files. All work follows
the TDD Iron Law (RED → GREEN → REFACTOR → COMMIT).

## New Files (create in this order — respects dependencies)

1. **`src/lib/translations.ts`** — all UI strings for `en` and `es`
   - Typed `Translations` interface + `Language` type
   - Complete `en` and `es` records (all keys, no missing values)
   - Exported helper: `useTranslations()` convenience function (or via context)

2. **`src/lib/i18n.tsx`** — React context for language state
   - `LanguageContext` with `{ lang, setLang }`
   - `LanguageProvider` component: initializes to `'en'`, reads `localStorage` in
     `useEffect`, persists on change
   - `useLanguage()` hook — consumer hook

3. **`src/components/LanguageToggle.tsx`** — toggle button
   - Fixed top-right, `z-50`, `data-testid="language-toggle"`
   - Keyboard accessible (button element, not div)
   - Calls `setLang()` from `useLanguage()`

4. **`src/app/PageContent.tsx`** — client component for translated page content
   - Extracts hero section, tips section, and footer from `page.tsx`
   - Consumes `useLanguage()` for all text strings

## Modified Files (update in this order)

5. **`src/lib/generatePrompt.ts`** — add `lang` parameter
   - Add `BALLOT_PROMPT_ES` constant (complete Spanish translation, ~200 lines)
   - Add `buildContextBlockEs()` function for Spanish context block
   - Extend `generatePrompt(state, zip, todayISO?, lang?)` signature

6. **`src/lib/getDeadlineStatus.ts`** — add locale parameter
   - Add optional `locale?: string` parameter (defaults to `'en-US'`)
   - Use `Intl.DateTimeFormat(locale)` for date formatting in the label

7. **`src/app/page.tsx`** — refactor as thin server shell
   - Import `LanguageProvider`, `LanguageToggle`, `PageContent`
   - Wrap with provider; render toggle + page content

8. **`src/components/BallotToolClient.tsx`** — consume language context
   - Add `useLanguage()` call; pass `lang` to `generatePrompt()`
   - Translate error messages (`not-found`, `no-election`, `loading`)

9. **`src/components/ZipForm.tsx`** — consume translations
   - Replace hardcoded strings with `t.zipForm.*` and `t.errors.*`

10. **`src/components/StateInfoCard.tsx`** — consume translations
    - Replace hardcoded labels with `t.stateInfo.*`
    - Pass locale to `getDeadlineStatus()` for date formatting

11. **`src/components/PromptOutput.tsx`** — consume translations
    - Replace copy button strings with `t.promptOutput.*`

12. **`src/components/StateSelectorModal.tsx`** — consume translations
    - Replace prompt text with `t.stateSelector.prompt`

## TDD Sequence

For each file (new or modified):
1. Write failing test first (RED) — run `npm test -- --run` to confirm failure
2. Write minimum implementation to pass (GREEN)
3. Refactor if needed (REFACTOR)
4. Commit: `phase2: <filename> — RED→GREEN`

### Test files to create

- `src/lib/translations.test.ts` — all keys present for both languages; no undefined values
- `src/lib/i18n.test.tsx` — provider renders, hook returns correct lang, setLang updates state
- `src/components/LanguageToggle.test.tsx` — renders, toggle works, keyboard accessible
- (Update) `src/lib/generatePrompt.test.ts` — Spanish prompt generation, context block
- (Update) `src/lib/getDeadlineStatus.test.ts` — Spanish date formatting
- (Update) `src/components/BallotToolClient.test.tsx` — language switch, error messages
- (Update) `src/components/ZipForm.test.tsx` — Spanish error text
- (Update) `src/components/StateInfoCard.test.tsx` — Spanish labels
- (Update) `src/components/PromptOutput.test.tsx` — Spanish copy button
- (Update) `src/components/StateSelectorModal.test.tsx` — Spanish prompt

## Running Tests

```bash
# Unit tests only
npm test -- --run

# Watch mode during development
npm test

# Full measurement (after all work complete)
npm run measure
```

## Key Invariants

- All Phase 1 e2e tests (42 tests) must continue to pass — run before committing
- Zero ESLint errors at all times
- Every new function must have a test written BEFORE the implementation
- No hardcoded UI strings in component JSX/TSX — all strings through translation layer
