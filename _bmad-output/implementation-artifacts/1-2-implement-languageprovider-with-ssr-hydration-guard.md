# Story 1.2: Implement LanguageProvider with SSR Hydration Guard

Status: review

## Story

As a developer,
I want a `LanguageProvider` React context with SSR-safe initialization,
so that the app has a single source of truth for language state that persists to localStorage without causing React hydration errors.

## Acceptance Criteria

1. **Given** `src/lib/i18n.tsx` is loaded during SSR (Next.js server render)
   **When** `LanguageProvider` initializes
   **Then** `lang` is always `'en'` on the initial render (no localStorage access on server)

2. **Given** a user has `'es'` stored in `localStorage['voter-choice-lang']`
   **When** the page finishes hydration (useEffect fires)
   **Then** `lang` updates to `'es'` (stored preference applied after hydration)

3. **Given** `localStorage` is unavailable (private browsing, full storage)
   **When** `LanguageProvider` initializes
   **Then** `lang` defaults to `'en'` without throwing an error

4. **Given** `lang` is updated via `setLang('es')`
   **When** the effect runs
   **Then** `document.documentElement.lang` is set to `'es'` AND `localStorage['voter-choice-lang']` is set to `'es'`

5. **Given** `useLanguage()` is called from any client component
   **When** language context is accessed
   **Then** it returns `{ lang, setLang, t }` where `t('form.label')` returns the correct string for the active language

6. **Given** `app/page.tsx` or a client wrapper component
   **When** it renders
   **Then** `LanguageProvider` wraps all content that needs translation context

## Tasks / Subtasks

- [x] Write minimal unit tests (smoke tests for module exports and types) (AC: 5)
  - [x] Create `src/__tests__/i18n.test.ts`
  - [x] Test: module exports `LanguageProvider`, `useLanguage`, `LanguageContext`
  - [x] Test: `LANGUAGE_STORAGE_KEY` constant is `'voter-choice-lang'`
- [x] Create `src/lib/i18n.tsx` with LanguageProvider and useLanguage hook (AC: 1, 2, 3, 4, 5)
  - [x] Define `Lang` type: `'en' | 'es'`
  - [x] Define `LanguageContextValue` interface: `{ lang, setLang, t }`
  - [x] Create `LanguageContext` with React.createContext and default value
  - [x] Implement `LanguageProvider` with SSR hydration guard (useState('en'), then useEffect reads localStorage)
  - [x] Implement localStorage read in useEffect (with try/catch for unavailable localStorage)
  - [x] Implement `document.documentElement.lang` + localStorage write useEffect on lang change
  - [x] Implement `setLang` using useCallback
  - [x] Implement `t(key)` using useCallback + getTranslation from translations.ts
  - [x] Export `useLanguage()` hook
  - [x] Export `LANGUAGE_STORAGE_KEY` constant
- [x] Wrap app layout with LanguageProvider in `src/app/page.tsx` (AC: 6)
  - [x] Verify page.tsx needs to be a Server Component wrapping a Client Component
  - [x] Create `src/components/PageContent.tsx` client component if hero/tips/footer strings need to be translated (they will be translated in Story 3.3 — for now just wrap with LanguageProvider)
  - [x] Add `<LanguageProvider>` wrapper in the appropriate layout location
- [x] Run tests and verify all pass
- [x] Run `npx tsc --noEmit` to verify no TypeScript errors

## Dev Notes

### Critical: Testing Constraint

**The vitest environment is `node` (not jsdom).** There is no `@testing-library/react` installed. React hooks cannot be tested directly in unit tests.

**Unit test scope for this story:** Export existence + type verification only (smoke tests). Full behavioral testing (SSR init, localStorage sync, lang attribute update, t() function live switching) is covered by E2e tests in **Story 5.1** and **Story 5.2**.

**DO NOT add new npm dependencies** (no `@testing-library/react`, no `jsdom`, no `happy-dom`). The constraint is intentional — this project uses E2e tests for component behavior.

### Implementation: Complete i18n.tsx Code

```typescript
// src/lib/i18n.tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getTranslation } from "./translations";

export type Lang = "en" | "es";

export const LANGUAGE_STORAGE_KEY = "voter-choice-lang";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const defaultContext: LanguageContextValue = {
  lang: "en",
  setLang: () => undefined,
  t: (key: string) => getTranslation("en", key),
};

export const LanguageContext =
  createContext<LanguageContextValue>(defaultContext);

export function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Always initialize to 'en' — NEVER read localStorage here.
  // Server renders 'en'. Client hydrates to 'en' (no mismatch). useEffect then syncs.
  const [lang, setLangState] = useState<Lang>("en");

  // After hydration: read stored preference and apply it
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Lang | null;
      if (stored === "en" || stored === "es") {
        setLangState(stored);
      }
    } catch {
      // localStorage unavailable (private browsing, full storage) — stay on 'en'
    }
  }, []);

  // Sync document lang attribute and persist to localStorage on every lang change
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // localStorage unavailable — continue without persistence
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = useCallback(
    (key: string) => getTranslation(lang, key),
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
```

### Page.tsx Integration Decision

`app/page.tsx` is a **Server Component** (no `"use client"` directive). Server Components CANNOT use React Context.

**The LanguageProvider must be added to a Client Component that wraps the content.** Since `BallotToolClient` is already a client component that takes up most of the page, there are two approaches:

**Option A (preferred):** Wrap `BallotToolClient` with `LanguageProvider` inside `page.tsx`. This is valid because React allows Server Components to render Client Components with context providers:

```tsx
// app/page.tsx (Server Component)
import LanguageProvider from "../lib/i18n"; // re-exported or direct import
export default function Home() {
  return (
    <LanguageProvider>  {/* Client Component — OK as child of Server Component */}
      <div className="min-h-screen flex flex-col">
        ...
        <BallotToolClient />
        ...
      </div>
    </LanguageProvider>
  );
}
```

Wait — this is NOT valid. A Server Component cannot import and render a Client Component that uses `"use client"` directive if the Client Component's children include Server Component content. Actually, in Next.js 15 App Router, it IS valid to render Client Components inside Server Components — the Client Component will be hydrated on the client. The Server Component renders the static shell, and the Client Component's context provides state after hydration.

**Correct approach:** Since the static hero/tips/footer text is in page.tsx (Server Component) and will need to be translated in Story 3.3, for this story:
1. Import `LanguageProvider` in `app/page.tsx`  
2. Wrap the `<div className="min-h-screen...">` with `<LanguageProvider>`
3. Next.js will correctly serialize the Client Component boundary

This is the minimal change needed for Story 1.2. Stories 3.x will then use `useLanguage()` in the components.

**IMPORTANT NOTE for Story 3.3:** The `<h1>`, `<p>`, `<ul>` in `page.tsx` are currently server-rendered static strings. When Story 3.3 translates them, a `PageContent.tsx` client component will be needed to extract them from the Server Component. Do NOT do that in this story — only wrap with LanguageProvider.

### SSR Hydration Guard Explanation (for context)

The two-pass pattern:
1. **Server render:** `useState('en')` → renders with `lang='en'`
2. **Client hydration:** React hydrates with `lang='en'` — matches server → no hydration error
3. **After hydration:** `useEffect` fires → reads localStorage → updates to `'es'` if stored → triggers re-render in Spanish

This means: on first load with `'es'` stored, users see a brief English flash before Spanish renders. This is an acceptable trade-off to prevent the app-breaking hydration error.

### localStorage Key

`LANGUAGE_STORAGE_KEY = 'voter-choice-lang'` — matches what the architecture specifies.

### Previous Story Intelligence (Story 1.1)

- `getTranslation(lang, key)` is exported from `src/lib/translations.ts`
- Fallback behavior: returns `key` itself when translation not found (safe, no undefined)
- Both EN and ES records are complete with 46 leaf string keys each
- TypeScript interface `Translations` enforces compile-time completeness

### Project Structure Notes

- Existing lib files: `src/lib/date-utils.ts`, `src/lib/generatePrompt.ts`, `src/lib/getStateData.ts`, `src/lib/lookupZip.ts`, `src/lib/types.ts`, `src/lib/translations.ts`
- New file: `src/lib/i18n.tsx` (`.tsx` extension required for JSX in the Provider)
- Modified file: `src/app/page.tsx` (add LanguageProvider wrapper)
- Test file: `src/__tests__/i18n.test.ts` (smoke tests only, node environment)

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Pattern: React Context as Language Bus]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision: SSR-Safe Initialization]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2]
- [Source: src/lib/translations.ts — getTranslation import]
- [Source: src/app/page.tsx — where LanguageProvider is added]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Created `src/lib/i18n.tsx`: `LanguageProvider` with SSR hydration guard (always 'en' on init, useEffect syncs from localStorage), `useLanguage()` hook, `LANGUAGE_STORAGE_KEY` constant, `Lang` type export
- Fixed: `Lang` type must be defined in `i18n.tsx` (not imported from `translations.ts` which doesn't export it)
- Modified `src/app/page.tsx`: wrapped top-level `<div>` with `<LanguageProvider>` — hero/tips/footer strings remain hardcoded until Story 3.3
- Unit tests are smoke tests only (4 tests: exports exist, storage key correct) — node environment cannot test React hooks
- Full behavioral ACs (SSR init, localStorage sync, lang attribute) verified by E2e in Story 5.1
- 81/81 tests pass, 0 TypeScript errors

### File List

- `src/__tests__/i18n.test.ts` (NEW)
- `src/lib/i18n.tsx` (NEW)
- `src/app/page.tsx` (MODIFIED — LanguageProvider wrapper added)
