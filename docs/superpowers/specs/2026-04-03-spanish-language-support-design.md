# Spanish Language Support — Design Spec
**Date:** 2026-04-03
**Phase:** 2
**Framework:** Superpowers

---

## Overview

Extend the ballot research tool to support English and Spanish. A language toggle lets users switch at any time. All UI text, error messages, tips, footer, the full AI prompt, and the pre-filled context block are available in both languages. Application state is preserved when switching. Architecture makes a third language trivially addable.

---

## Architecture

**Chosen approach: React Context + typed translations object**

Three approaches evaluated:

1. **React Context + typed translations** (chosen) — Custom React context holding current language + setter. `translations.ts` exports a `Translations` interface with typed function signatures for interpolated strings. `useLanguage()` hook used in all components. `localStorage` persistence. Zero external dependencies.

2. **i18next/react-i18next** — Mature library but overkill for 2 languages; adds ~20 kB to bundle and an external dependency. Not chosen.

3. **CSS-based visibility toggling** — All strings inline in JSX, show/hide with CSS. No state needed but doesn't handle dynamic content (deadline labels, context block generation), hard to maintain. Not chosen.

React Context is preferred: TypeScript-native, extensible (add `'zh'` to the Language union = done), no dependencies, fast to implement.

---

## New Files

### `src/lib/translations.ts`

Exports:
- `Language = 'en' | 'es'`
- `Translations` interface — all UI strings, with function signatures for interpolated strings:
  - `stateInfoTitle: (stateName: string) => string`
  - `noElectionFound: (stateName: string) => string`
  - `notFoundDescription: (zip: string) => string`
  - `deadlineDaysLeft: (n: number) => string`
- `TRANSLATIONS: Record<Language, Translations>` — complete translations for both languages

String groupings in the interface:
- `skipLink` — skip-to-content link text
- `hero` — title, subtitle, worksWith
- `zipForm` — label, placeholder, submit, loading, errors (required, invalid)
- `stateInfo` — section headers, deadline labels, election labels, urgency labels, link labels
- `notFound` — title, description fn, link text
- `stateSelector` — title, subtitle, cancel
- `promptOutput` — title, instructions, copy, copied, ariaLabel
- `tips` — heading, items array, disclaimer
- `footer` — share, created

### `src/lib/i18n.tsx`

Exports:
- `LanguageContext` — React context
- `LanguageProvider` — wraps app; reads `localStorage` on mount (hydration guard: SSR default = `'en'`), sets `document.documentElement.lang` on change, announces language change via injected `aria-live` region
- `useLanguage()` — returns `{ lang, setLang, t }` where `t = TRANSLATIONS[lang]`

### `src/components/LanguageToggle.tsx`

- Fixed top-right position (`fixed top-4 right-4 z-50`)
- Renders: English → "Español" button; Spanish → "English" button (shows target language)
- `data-testid="language-toggle"`, keyboard accessible (button element), min 44px touch target
- No props — uses `useLanguage()` directly

### `src/components/PageContent.tsx`

Client component extracted from `page.tsx` containing:
- Hero section (headline, subtitle, chatbot links row)
- Tips section
- Footer

Uses `useLanguage()` for all text. Wraps `BallotToolClient`.

---

## Modified Files

### `src/app/page.tsx`

Becomes a thin server component:
- Wraps app in `LanguageProvider`
- Renders `LanguageToggle`
- Renders `PageContent` (client component)
- `metadata` export stays (server-side, English only — server limitation)

### `src/lib/date-utils.ts`

Extend `formatDate` with optional locale parameter:
```typescript
export function formatDate(isoDate: string, locale: string = 'en-US'): string
```
- English: `en-US` → "March 3, 2026"
- Spanish: `es-US` → "3 de marzo de 2026"

Deadline label formatting stays numeric (daysLeft: number) — components format labels via translations.

### `src/lib/prompt-generator.ts`

Add:
- `BALLOT_PROMPT_TEXT_ES` — complete fluent Spanish translation of BALLOT_PROMPT using "tú" voice, ~210 lines, matching all structure/formatting of English original
- `buildContextBlockEs(stateData, zip, today)` — Spanish context block with Spanish structure/labels, English data values (state name, election name, URLs, dates in Spanish format)
- Update `generatePromptText(stateData, zip, today, lang: Language = 'en')` to dispatch to English or Spanish versions

### All components

Each component gains a `t` reference via `useLanguage()` and replaces hardcoded English strings with `t.section.key`. Interpolated strings call the translation function: `t.stateInfo.noElectionFound(stateData.stateName)`.

`StateInfoCard` gets `today` and `lang` available for `formatDate` locale. Deadline label display uses `t.stateInfo.deadlineDaysLeft(n)` etc.

---

## Data Flow

```
LanguageProvider (localStorage → lang state)
  ↓
page.tsx (server shell)
  ├── LanguageToggle (useLanguage → toggles lang, persists to localStorage)
  └── PageContent (useLanguage → hero/tips/footer strings)
        └── BallotToolClient (useLanguage → ZipForm, StateInfoCard, PromptOutput, StateSelectorModal)
              ↓ generatePromptText(stateData, zip, today, lang)
              ↓ buildContextBlock or buildContextBlockEs
```

Language switch: sets context state → localStorage → document.lang → re-renders all consumers → prompt regenerates with new lang.

---

## TDD Plan

All production code preceded by a failing test. Test files alongside source:

1. `src/lib/__tests__/translations.test.ts` — both language keys present, no missing keys, interpolation functions work
2. `src/lib/__tests__/date-utils.test.ts` — add Spanish format tests (`formatDate('2026-03-03', 'es-US')` → `'3 de marzo de 2026'`)
3. `src/lib/__tests__/prompt-generator.test.ts` — add Spanish context block tests, Spanish prompt dispatch
4. Per component: add Spanish text assertions to existing test files (or create new ones if none exist)

---

## Acceptance Verification

All Phase 1 e2e tests (42/42) continue to pass. New behavior verified via:
- `data-testid="language-toggle"` present and clickable
- Language switch updates all visible text
- `localStorage` persistence verified
- `document.documentElement.lang` updated
- Spanish prompt output contains Spanish text
- Spanish date format in context block

---

## What Does NOT Change

- Application logic (zip lookup, deadline calculation, state resolution)
- Data model, JSON schema
- All existing `data-testid` attributes
- Lighthouse/a11y scores
