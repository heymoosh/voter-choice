---
title: "feat: Add Spanish Language Support (Phase 2 Multilingual Extension)"
type: feat
status: active
date: 2026-05-11
---

# feat: Add Spanish Language Support (Phase 2 Multilingual Extension)

## Overview

Extend the ballot research tool to support both English and Spanish. A language toggle allows users to switch between languages without losing application state or requiring a page reload. All user-facing text — UI labels, error messages, static content, and the AI prompt output — is available in both languages.

## Problem Statement / Motivation

The tool currently serves English-only content. Spanish-speaking voters represent a large segment of the U.S. electorate who would benefit from native-language support. Phase 2 adds Spanish as a first-class language while establishing an extensible i18n architecture.

## Proposed Solution

1. Create a typed translations dictionary (`src/lib/i18n/translations.ts`) with `en` and `es` namespaces
2. Create a React context provider (`src/lib/i18n/LanguageContext.tsx`) that reads/writes `localStorage` and updates the `<html lang>` attribute
3. Create a `LanguageToggle` component (`src/components/LanguageToggle.tsx`) with `data-testid="language-toggle"`
4. Store the Spanish prompt translation as a complete string in `src/lib/i18n/prompts.ts`
5. Update `promptBuilder.ts` to accept a language parameter and use the correct prompt
6. Update `page.tsx` to consume translations and pass language to prompt builder
7. Update `layout.tsx` to wrap children in the language provider
8. Add tips and footer sections that were specified in Phase 1 but minimal in current implementation

## Technical Considerations

### Architecture

- `src/lib/i18n/translations.ts` — typed `Translations` interface + `en`/`es` dictionaries. All UI strings live here; no hardcoded strings in JSX.
- `src/lib/i18n/LanguageContext.tsx` — `"use client"` provider; reads `localStorage` on mount, writes on toggle, calls `document.documentElement.lang = lang`
- `src/components/LanguageToggle.tsx` — renders as `<button>`, keyboard-accessible by default, `data-testid="language-toggle"`
- `src/lib/i18n/prompts.ts` — `BALLOT_PROMPT_EN` (existing BASE_PROMPT value) + `BALLOT_PROMPT_ES` (complete Spanish translation, not interpolated fragments)
- `promptBuilder.ts` — add `language?: "en" | "es"` parameter, select correct prompt; default to `"en"` so existing tests pass

### Language Persistence

- `localStorage.getItem("lang")` → `"en"` | `"es"` — SSR-safe: read in `useEffect` only
- Default: `"en"` on first visit

### Date Formatting

- English: `Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" })`
- Spanish: `Intl.DateTimeFormat("es-ES", { month: "long", day: "numeric", year: "numeric" })` → "3 de marzo de 2026"

### Context Block in Spanish

- Labels and framing text in Spanish per spec example
- Injected values (state names, dates, URLs) remain as-is from JSON

## Acceptance Criteria

- [ ] Language toggle visible at all times, `data-testid="language-toggle"` present
- [ ] Clicking toggle switches all UI text between English and Spanish
- [ ] Language preference persists across page refreshes (localStorage)
- [ ] Switching language does not reset application state (zip results remain)
- [ ] `<html lang>` attribute updates when language changes
- [ ] All UI labels, error messages, static content available in both languages
- [ ] Full AI prompt (Part 1) available in fluent Spanish as complete string
- [ ] Pre-filled context block generates correctly in both languages
- [ ] Date formatting follows language conventions
- [ ] Tips section translated
- [ ] Footer text translated ("Creado por una persona usando herramientas de IA")
- [ ] Language toggle is keyboard-accessible (Enter/Space)
- [ ] Longer Spanish text does not break layouts
- [ ] All Phase 1 e2e tests continue to pass
- [ ] Adding a third language requires only new translation content

## Files to Create

- `src/lib/i18n/translations.ts`
- `src/lib/i18n/LanguageContext.tsx`
- `src/lib/i18n/prompts.ts`
- `src/components/LanguageToggle.tsx`

## Files to Modify

- `src/lib/promptBuilder.ts` — add language parameter
- `src/app/page.tsx` — consume translations, add language toggle, update prompt call
- `src/app/layout.tsx` — wrap with LanguageProvider

## Sources & References

- Spec: `docs/PHASE2_SPEC.md`
- Phase 1 plan: `docs/plans/2026-05-11-001-feat-ballot-research-tool-plan.md`
- Prompt source: `docs/BALLOT_PROMPT.md`
- Existing prompt builder: `src/lib/promptBuilder.ts`
- Existing page: `src/app/page.tsx`
