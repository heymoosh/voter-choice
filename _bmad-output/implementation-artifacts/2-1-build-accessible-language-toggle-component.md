# Story 2.1: Build Accessible Language Toggle Component

Status: done

## Story

As a voter visiting the site,
I want a visible, always-accessible language toggle button,
so that I can switch between English and Spanish at any point while using the app.

## Acceptance Criteria

1. **Given** the user is on any part of the page (top, middle, bottom of scroll)
   **When** they look for the language toggle
   **Then** the toggle is visible in the top-right corner (`position: fixed; top: 1rem; right: 1rem`)

2. **Given** the app is in English mode
   **When** the language toggle renders
   **Then** it displays the text "Español" (showing the non-active language)

3. **Given** the app is in Spanish mode
   **When** the language toggle renders
   **Then** it displays the text "English" (showing the non-active language)

4. **Given** the language toggle in English mode
   **When** a user clicks it
   **Then** the app switches to Spanish immediately without a page reload

5. **Given** the language toggle in Spanish mode
   **When** a user clicks it
   **Then** the app switches to English immediately without a page reload

6. **Given** the language toggle
   **When** it renders
   **Then** it has `data-testid="language-toggle"` attribute

7. **Given** a keyboard user tabs to the language toggle
   **When** they press Enter or Space
   **Then** the language switches (same behavior as mouse click)

8. **Given** the language toggle in English mode
   **When** rendered in the DOM
   **Then** it has `aria-label="Switch to Spanish"` (describes the action)

9. **Given** the language toggle in Spanish mode
   **When** rendered in the DOM
   **Then** it has `aria-label="Cambiar a Inglés"` (describes the action in Spanish)

10. **Given** a screen reader user activates the language toggle
    **When** the language switches
    **Then** an `aria-live="polite"` region announces "Idioma cambiado a español" (ES) or "Language changed to English" (EN)

11. **Given** the language toggle
    **When** it receives keyboard focus
    **Then** a visible focus indicator (focus ring) is displayed (not suppressed)

## Tasks / Subtasks

- [x] Write smoke tests for module exports (TDD: test first) (AC: 6)
  - [x] Create `src/__tests__/LanguageToggle.test.ts`
  - [x] Test: module exports `LanguageToggle` as a function
  - [x] Test: component can be imported without error
- [x] Create `src/components/LanguageToggle.tsx` (AC: 1–11)
  - [x] Add `"use client"` directive
  - [x] Import `useLanguage` from `../lib/i18n`
  - [x] Import `getTranslation` from `../lib/translations`
  - [x] Implement `announcement` state for aria-live region
  - [x] Implement `handleToggle` function: compute `newLang`, call `setLang(newLang)`, set announcement using `getTranslation(newLang, key)`
  - [x] Render `<button>` with: `data-testid="language-toggle"`, `aria-label` from `t()`, fixed-position CSS classes, focus ring classes
  - [x] Visible label: `lang === 'en' ? 'Español' : 'English'` (shows non-active language)
  - [x] Render `<div aria-live="polite" aria-atomic="true" className="sr-only">` with announcement text
- [x] Add LanguageToggle to `src/app/page.tsx` (AC: 1, 2, 3, 4, 5)
  - [x] Import `LanguageToggle`
  - [x] Place `<LanguageToggle />` inside `<LanguageProvider>` but before `<div className="min-h-screen...">`
- [x] Run tests and verify all pass
- [x] Run `npx tsc --noEmit` to verify no TypeScript errors

## Dev Notes

### Testing Constraint (Same as Story 1.2)

**vitest environment is `node` — no jsdom, no @testing-library/react.** Unit tests are smoke tests only. All behavioral ACs (click toggles language, aria-label updates, aria-live fires, focus ring visible) are verified by E2e tests in **Story 5.1** and **Story 5.2**.

### Complete LanguageToggle Implementation

```tsx
// src/components/LanguageToggle.tsx
"use client";

import { useState } from "react";
import { useLanguage } from "../lib/i18n";
import { getTranslation } from "../lib/translations";

export default function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();
  const [announcement, setAnnouncement] = useState("");

  function handleToggle() {
    const newLang = lang === "en" ? "es" : "en";
    setLang(newLang);
    // Announcement in the new language (after the switch)
    const key =
      newLang === "es" ? "a11y.langChangedToEs" : "a11y.langChangedToEn";
    setAnnouncement(getTranslation(newLang, key));
  }

  // aria-label describes the action (what will happen), in current language
  const ariaLabel =
    lang === "en" ? t("a11y.langToggleToEs") : t("a11y.langToggleToEn");

  // Visible label: the non-active language
  const label = lang === "en" ? "Español" : "English";

  return (
    <>
      <button
        data-testid="language-toggle"
        onClick={handleToggle}
        aria-label={ariaLabel}
        className="fixed top-4 right-4 z-50 text-sm text-gray-600 hover:text-gray-900 hover:underline focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded px-2 py-1"
      >
        {label}
      </button>
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    </>
  );
}
```

### aria-label Key Lookup Logic

- When `lang === 'en'` → `t('a11y.langToggleToEs')` → EN record: `"Switch to Spanish"` ✓ (AC-8)
- When `lang === 'es'` → `t('a11y.langToggleToEn')` → ES record: `"Cambiar a Inglés"` ✓ (AC-9)

### Announcement Logic

When the user clicks toggle, `setAnnouncement` uses `getTranslation(newLang, key)` — directly querying the NEW language record (not `t()` which uses current lang before React re-render):
- Switching to ES: `getTranslation('es', 'a11y.langChangedToEs')` → `"Idioma cambiado a español"` ✓ (AC-10)
- Switching to EN: `getTranslation('en', 'a11y.langChangedToEn')` → `"Language changed to English"` ✓ (AC-10)

### Focus Ring (AC-11)

The button uses `focus:ring-2 focus:ring-teal-500 focus:ring-offset-2` — consistent with Phase 1 button patterns (see `ZipForm.tsx`, `PromptOutput.tsx`). **Do NOT add `focus:outline-none` without the ring classes** — that would suppress the focus indicator.

### Positioning in page.tsx

The toggle must be inside `<LanguageProvider>` (to access context) but position:fixed means it appears top-right regardless of DOM placement:

```tsx
// app/page.tsx
export default function Home() {
  return (
    <LanguageProvider>
      <LanguageToggle />         {/* fixed position — appears top-right */}
      <div className="min-h-screen flex flex-col">
        ...
      </div>
    </LanguageProvider>
  );
}
```

### CSS Classes Explanation

- `fixed top-4 right-4` → `position: fixed; top: 1rem; right: 1rem` (matches UX spec exactly)
- `z-50` → `z-index: 50` (above content, below modals)
- `text-sm` → 14px font (per UX spec)
- `text-gray-600 hover:text-gray-900 hover:underline` → non-intrusive, hover state
- `focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2` → accessible focus ring (AC-11)
- `rounded px-2 py-1` → touch target padding

### SR-Only Class

Tailwind's `sr-only` class applies:
```css
position: absolute;
width: 1px;
height: 1px;
padding: 0;
margin: -1px;
overflow: hidden;
clip: rect(0, 0, 0, 0);
white-space: nowrap;
border-width: 0;
```
This hides the aria-live div visually while keeping it readable by screen readers.

### Previous Story Intelligence

- Story 1.1: `getTranslation(lang, key)` exported from `src/lib/translations`
- Story 1.2: `useLanguage()` exported from `src/lib/i18n` returns `{ lang, setLang, t }`
- `t('a11y.langToggleToEs')` returns "Switch to Spanish" in EN, "Cambiar a Español" in ES
- `t('a11y.langToggleToEn')` returns "Switch to English" in EN, "Cambiar a Inglés" in ES

### Project Structure Notes

- New file: `src/components/LanguageToggle.tsx`
- Modified: `src/app/page.tsx` (import + placement of `<LanguageToggle />`)
- Test: `src/__tests__/LanguageToggle.test.ts` (smoke tests only)
- Existing components: `BallotToolClient.tsx`, `PromptOutput.tsx`, `StateInfoCard.tsx`, `StateSelectorModal.tsx`, `ZipForm.tsx`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy: New Component: LanguageToggle]
- [Source: _bmad-output/planning-artifacts/architecture.md#Pattern: React Context as Language Bus]
- [Source: src/lib/translations.ts — a11y keys for aria-label and announcements]
- [Source: src/lib/i18n.tsx — useLanguage() hook]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Created `src/components/LanguageToggle.tsx`: fixed-position button (top-4 right-4 z-50), shows non-active language, data-testid, aria-label via t(), aria-live announcement using getTranslation(newLang, key) for correct post-switch language
- Modified `src/app/page.tsx`: added `<LanguageToggle />` inside `<LanguageProvider>` before main content
- 2 smoke tests (exports exist). All behavioral ACs (click, aria, focus ring) verified by E2e Story 5.1/5.2
- 83/83 tests pass, 0 TypeScript errors

### File List

- `src/__tests__/LanguageToggle.test.ts` (NEW)
- `src/components/LanguageToggle.tsx` (NEW)
- `src/app/page.tsx` (MODIFIED — LanguageToggle added)
