# Story 3.1: Translate ZipForm with Error-as-Key Pattern

Status: done

## Story

As a Spanish-speaking voter,
I want the zip code form to appear in Spanish when Spanish is active,
so that I can understand the labels, placeholder, and any error messages in my language.

## Acceptance Criteria

1. **Given** Spanish is the active language
   **When** ZipForm renders
   **Then** the zip code label shows "Código postal", the input placeholder shows "Ingresa tu código postal de 5 dígitos", and the submit button shows "Buscar"

2. **Given** Spanish is active and user submits an empty zip code
   **When** the error appears
   **Then** the error message reads "Por favor ingresa un código postal"

3. **Given** Spanish is active and user submits an invalid zip code
   **When** the error appears
   **Then** the error message reads "Por favor ingresa un código postal válido de 5 dígitos"

4. **Given** an error message is visible in English
   **When** the user switches to Spanish
   **Then** the error message immediately updates to Spanish WITHOUT requiring the user to re-submit the form (FR-018 error-as-key pattern)

5. **Given** ZipForm's error state implementation
   **When** examined in the source code
   **Then** `setError()` in BallotToolClient stores a translation key (e.g., `'errors.zipEmpty'`), NOT a translated string, and ZipForm displays `t(error)` NOT the raw error string

6. **Given** English is the active language
   **When** ZipForm renders
   **Then** all strings match Phase 1 behavior exactly (zero regression): label "Zip Code", placeholder "Enter your 5-digit zip code", button "Go"

## Tasks / Subtasks

- [x] Write test verifying translation keys resolve to correct strings (TDD: test first) (AC: 1, 2, 3, 5)
  - [x] Add tests to `src/__tests__/translations.test.ts` — verify 'errors.zipEmpty', 'errors.zipInvalid', 'form.label', 'form.placeholder', 'form.submit' in both EN and ES
  - [x] Confirm translations.test.ts already passes (keys exist from Story 1.1)
- [x] Modify `src/components/BallotToolClient.tsx` — store translation keys in setError (AC: 5)
  - [x] Change `setError("Please enter a zip code")` → `setError('errors.zipEmpty')`
  - [x] Change `setError("Please enter a valid 5-digit zip code")` → `setError('errors.zipInvalid')`
- [x] Modify `src/components/ZipForm.tsx` — use useLanguage() for all strings (AC: 1, 2, 3, 4, 6)
  - [x] Add `"use client"` directive (already present — verify)
  - [x] Import `useLanguage` from `../lib/i18n`
  - [x] Add `const { t } = useLanguage();` inside component
  - [x] Replace `Zip Code` label with `{t('form.label')}`
  - [x] Replace `placeholder="Enter your 5-digit zip code"` with `placeholder={t('form.placeholder')}`
  - [x] Replace `Go` button text with `{t('form.submit')}`
  - [x] Replace `{error}` display with `{t(error)}` (error is now a translation key)
- [x] Run tests and verify all pass (no regressions)
- [x] Run `npx tsc --noEmit` to verify no TypeScript errors

## Dev Notes

### Architecture: Error-as-Key Pattern (FR-018)

This is the most critical change in this story. The pattern:

**Before (Phase 1 — stores English string):**
```typescript
// BallotToolClient.tsx
setError("Please enter a zip code");   // ← frozen English string in state
// ZipForm.tsx
<div>{error}</div>                      // ← displays frozen string
```

**After (Phase 2 — stores translation key):**
```typescript
// BallotToolClient.tsx
setError('errors.zipEmpty');           // ← key stored in state
// ZipForm.tsx
const { t } = useLanguage();
<div>{t(error)}</div>                  // ← t() re-evaluates on every render
```

**Why this works for AC-4 (live error translation):**
- React re-renders all components consuming LanguageContext when lang changes
- ZipForm re-renders → `t(error)` calls `getTranslation(newLang, 'errors.zipEmpty')`
- Returns Spanish string: "Por favor ingresa un código postal"
- No re-submission needed — just a re-render with the new language

### ZipForm Changes (exact diffs)

Current `ZipForm.tsx`:
```tsx
"use client";
import { useState, FormEvent } from "react";
```

After:
```tsx
"use client";
import { useState, FormEvent } from "react";
import { useLanguage } from "../lib/i18n";
```

Add inside component:
```tsx
export default function ZipForm({ onSubmit, error, onClearError }: ZipFormProps) {
  const [zip, setZip] = useState("");
  const { t } = useLanguage();   // ADD THIS LINE
  // ...
```

Replace hardcoded strings:
```tsx
// label:
<label htmlFor="zip-input" className="sr-only">{t('form.label')}</label>

// placeholder:
placeholder={t('form.placeholder')}

// submit button:
<button ...>{t('form.submit')}</button>

// error display:
<div ...>{t(error)}</div>   // was: {error}
```

### BallotToolClient Changes (exact diffs)

Line 46: `setError("Please enter a zip code")` → `setError('errors.zipEmpty')`
Line 51: `setError("Please enter a valid 5-digit zip code")` → `setError('errors.zipInvalid')`

No other changes to BallotToolClient in this story. The `notFound` message displayed at line 92 is in BallotToolClient's own JSX (not via ZipForm) — that gets translated in Story 3.3.

### TypeScript: t(error) with error as string | null

The `error` prop is `string | null`. Since we only call `t(error)` when `error` is truthy (inside `{error && <div>{t(error)}</div>}`), TypeScript knows `error` is `string` at that point. No null check needed in the t() call.

The `t()` function signature is `t: (key: string) => string` — it accepts any string and falls back to the key itself if not found. This means if somehow a non-key string reaches t(), it will just display the string unchanged (safe fallback).

### Testing Approach

This story's changes can be verified via existing translations.test.ts (key presence) plus regression via the full unit test suite. Full behavioral testing (Spanish form in browser, error key switch) is E2e in Story 5.1.

The AC-5 code inspection check ("setError() stores a key, not a string") is verified by code review, not an automated test.

### Previous Story Intelligence

- Story 1.1: `getTranslation()`, EN, ES exported from `src/lib/translations.ts`
  - EN.errors.zipEmpty = "Please enter a zip code" ✓
  - EN.errors.zipInvalid = "Please enter a valid 5-digit zip code" ✓
  - ES.errors.zipEmpty = "Por favor ingresa un código postal" ✓
  - ES.errors.zipInvalid = "Por favor ingresa un código postal válido de 5 dígitos" ✓
  - EN.form.label = "Zip Code", EN.form.placeholder = "Enter your 5-digit zip code", EN.form.submit = "Go" ✓
  - ES.form.label = "Código postal", ES.form.placeholder = "Ingresa tu código postal de 5 dígitos", ES.form.submit = "Buscar" ✓
- Story 1.2: `useLanguage()` returns `{ lang, setLang, t }` from `src/lib/i18n`
- ZipForm is `"use client"` already — no directive change needed
- ZipForm receives `error: string | null` — no prop type change needed

### Phase 1 Regression Check

EN translations exactly match Phase 1 hardcoded strings:
- `t('form.label')` in EN → "Zip Code" (was `Zip Code` hardcoded)
- `t('form.placeholder')` in EN → "Enter your 5-digit zip code" (was `Enter your 5-digit zip code`)
- `t('form.submit')` in EN → "Go" (was `Go`)
- `t('errors.zipEmpty')` in EN → "Please enter a zip code" (was `"Please enter a zip code"`)
- `t('errors.zipInvalid')` in EN → "Please enter a valid 5-digit zip code" (was `"Please enter a valid 5-digit zip code"`)

All Phase 1 E2e tests use data-testid selectors — no string content assertions that would break.

### Project Structure Notes

- Modified files: `src/components/ZipForm.tsx`, `src/components/BallotToolClient.tsx`
- No new files in this story
- Test file: `src/__tests__/translations.test.ts` — add verification of specific error keys

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Pattern: Error-as-Key (FR-018)]
- [Source: _bmad-output/planning-artifacts/prd.md#FR-018]
- [Source: src/components/ZipForm.tsx — all hardcoded strings to replace]
- [Source: src/components/BallotToolClient.tsx — lines 46, 51 setError calls]
- [Source: src/lib/translations.ts — form.* and errors.* keys verified in Story 1.1]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Modified `src/components/BallotToolClient.tsx`: setError now stores translation keys ('errors.zipEmpty', 'errors.zipInvalid') — FR-018 error-as-key pattern implemented
- Modified `src/components/ZipForm.tsx`: added useLanguage(), t('form.label'), t('form.placeholder'), t('form.submit'), t(error) for live error translation
- Translation keys for EN match Phase 1 hardcoded strings exactly — zero regression
- 83/83 tests pass, 0 TypeScript errors

### File List

- `src/components/ZipForm.tsx` (MODIFIED)
- `src/components/BallotToolClient.tsx` (MODIFIED)
