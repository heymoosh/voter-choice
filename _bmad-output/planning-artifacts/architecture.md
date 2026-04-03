---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - '_bmad-output/planning-artifacts/product-brief-voter-choice-2026-04-03.md'
  - 'docs/PHASE2_SPEC.md'
  - 'docs/PROJECT_SPEC.md'
workflowType: 'architecture'
project_name: 'voter-choice'
user_name: 'Muxin'
date: '2026-04-03'
---

# Architecture Decision Document — Phase 2: Spanish Language Support

**Phase context:** Brownfield extension of the Phase 1 ballot tool. All Phase 1 decisions remain in force. This document captures only the new architectural decisions needed for i18n.

---

## 1. System Context

### Phase 1 Foundation (Unchanged)
The Ballot Research Tool is a static single-page Next.js 15 (App Router) application. No external APIs, no database, no authentication. Client Components handle interactive UI. Server Component renders static content. State data loaded via dynamic imports.

### Phase 2 Extension

Phase 2 adds a client-side language layer on top of the existing system:

```
┌──────────────────────────────────────────────────────────┐
│                        Browser                            │
│                                                           │
│  ┌───────────────────────────────────────────────────┐   │
│  │              Next.js Application                   │   │
│  │                                                    │   │
│  │  ┌──────────────────────────────────────────────┐ │   │
│  │  │  LanguageProvider (Client Context)           │ │   │
│  │  │  lang: 'en' | 'es'                           │ │   │
│  │  │  setLang: fn                                  │ │   │
│  │  │  localStorage persistence                     │ │   │
│  │  │                                               │ │   │
│  │  │  ┌────────────────┐  ┌──────────────────┐   │ │   │
│  │  │  │ LanguageToggle │  │  BallotToolClient│   │ │   │
│  │  │  │ (fixed overlay)│  │  ZipForm         │   │ │   │
│  │  │  └────────────────┘  │  StateInfoCard   │   │ │   │
│  │  │                       │  PromptOutput    │   │ │   │
│  │  │  translations.ts ────►│  (all consume   │   │ │   │
│  │  │  EN + ES records      │  useLanguage())  │   │ │   │
│  │  │                       └──────────────────┘   │ │   │
│  │  └──────────────────────────────────────────────┘ │   │
│  │                                                    │   │
│  │  generatePrompt(state, lang?) ─► EN or ES prompt  │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  localStorage (lang preference) ─► Clipboard API         │
└──────────────────────────────────────────────────────────┘
```

### New External Dependencies

- **None.** i18n implemented with pure TypeScript + React Context. No `react-intl`, `i18next`, `next-intl`, or any external library.
- **Browser API added:** `localStorage` for language persistence, `Intl.DateTimeFormat` for locale-aware date formatting (both browser-native, no import needed).

---

## 2. Technology Stack Decisions

### Decision: No i18n Library
**Status:** Decided
**Rationale:** For a 2-language app with ~50 static strings, an i18n library (react-intl, i18next) adds:
- ~20KB bundle size
- Version management overhead
- Learning curve for contributors
- Complex configuration for a simple lookup

**Alternative considered:** next-intl (excellent library, used in production). **Rejected** because it requires App Router route restructuring (`/[locale]/` paths), which conflicts with the spec requirement for client-side language switching without URL changes.

**Decision:** Plain TypeScript object + React Context + simple `t(key)` function. Complete, type-safe, zero dependencies.

### Decision: TypeScript Enforcement of Translation Completeness
**Status:** Decided
**Rationale:** Runtime `undefined` bugs from missing translation keys are silent failures (user sees blank text, not an error). TypeScript eliminates this class of bug at compile time.

**Implementation:**
```typescript
interface Translations {
  hero: { headline: string; subtitle: string };
  form: { label: string; placeholder: string; submit: string };
  errors: {
    zipEmpty: string;
    zipInvalid: string;
    zipNotFound: string;
    multiState: string;
    deadlinePassed: string;
    noElection: string;
  };
  // ... all keys typed
}

export const EN: Translations = { /* must implement all keys */ };
export const ES: Translations = { /* must implement all keys */ };
```

TypeScript compilation fails if either EN or ES omits a key.

### Decision: Client-Side Language State (No URL Parameters)
**Status:** Decided
**Rationale:** Phase 2 spec explicitly excludes URL-based language routing. Language is client state, stored in localStorage. This avoids:
- Next.js i18n routing restructuring
- Server-side rendering for language selection
- URL changes that break sharing (shared URL always loads in stored preference, not a specific language)

### Decision: SSR-Safe Initialization
**Status:** Decided
**Rationale:** Next.js Server Components render on the server, which has no access to `window.localStorage`. If `LanguageProvider` reads localStorage during initial render, it causes a React hydration mismatch error.

**Pattern:** Two-pass initialization:
1. Server render: language = 'en' (hardcoded, no localStorage access)
2. Client hydration: language = 'en' (matches server — no hydration error)
3. After hydration: `useEffect` reads localStorage and updates if preference differs

**Trade-off:** On first render in stored 'es' preference, page briefly renders in English before switching. Acceptable for a civic tool — the alternative (hydration error) breaks the app entirely.

---

## 3. Architecture Patterns

### Pattern: React Context as Language Bus

```typescript
// src/lib/i18n.tsx

type Lang = 'en' | 'es';

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

export const LanguageContext = createContext<LanguageContextValue>(/* default */);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en'); // always 'en' on server

  useEffect(() => {
    // After hydration: sync from localStorage
    const stored = localStorage.getItem('voter-choice-lang') as Lang | null;
    if (stored === 'en' || stored === 'es') setLangState(stored);
  }, []);

  useEffect(() => {
    // Sync lang attribute and localStorage on every change
    document.documentElement.lang = lang;
    localStorage.setItem('voter-choice-lang', lang);
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = useCallback((key: string) => {
    return getTranslation(lang, key) ?? key; // fallback: return key itself
  }, [lang]);

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

**Why React Context (not Zustand/Redux):** Language is a single string. No complex state transitions, no actions, no reducers. React Context is the appropriate tool.

**Why `useCallback` on `setLang` and `t`:** Stable references prevent unnecessary re-renders in child components. `t` changes when `lang` changes — this is expected and desired.

### Pattern: Translation Key Lookup

```typescript
// src/lib/translations.ts

import type { Translations } from './types';

export const EN: Translations = {
  hero: { headline: "Research your ballot...", subtitle: "..." },
  form: { label: "Zip code", placeholder: "Enter zip code", submit: "Find My Ballot" },
  errors: {
    zipEmpty: "Please enter a zip code",
    zipInvalid: "Please enter a valid 5-digit zip code",
    // ...
  },
  // ...
};

export const ES: Translations = {
  hero: { headline: "Investiga tu boleta...", subtitle: "..." },
  form: { label: "Código postal", placeholder: "Ingresa tu código postal", submit: "Encontrar Mi Boleta" },
  errors: {
    zipEmpty: "Por favor ingresa un código postal",
    zipInvalid: "Por favor ingresa un código postal válido de 5 dígitos",
    // ...
  },
  // ...
};

// Nested key lookup: t('errors.zipEmpty') → EN.errors.zipEmpty
function getTranslation(lang: 'en' | 'es', key: string): string | undefined {
  const store = lang === 'es' ? ES : EN;
  return key.split('.').reduce((obj: any, k) => obj?.[k], store);
}
```

**Key format:** Dot-notation nested keys (`'errors.zipEmpty'`, `'hero.headline'`). Enables grouping by feature area.

### Pattern: Error-as-Key (FR-018)

**Problem:** Component state stores error messages. If state stores translated strings:
```typescript
setError("Please enter a zip code") // stored in English
// → user switches to Spanish → error still shows in English
```

**Solution:** State stores translation keys:
```typescript
setError('errors.zipEmpty') // stored as key
// → render: <p>{t(error)}</p>
// → language switch → t() re-evaluates → shows Spanish translation
```

**Where to apply:** Every `setError()` call in `ZipForm.tsx` and any other component that stores error state.

### Pattern: Language-Parameterized Functions

Phase 1 pure functions extended with optional `lang` parameter:

```typescript
// Date formatting
function formatDate(date: string, lang: 'en' | 'es' = 'en'): string {
  return new Intl.DateTimeFormat(
    lang === 'es' ? 'es-MX' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  ).format(new Date(date));
  // en: "April 3, 2026" | es: "3 de abril de 2026"
}

// Deadline status
function getDeadlineStatus(
  deadline: string,
  today: Date = new Date(),
  lang: 'en' | 'es' = 'en'
): DeadlineStatus {
  // ...
  return {
    label: lang === 'es' ? `Quedan ${days} días` : `${days} days left`,
    status: 'upcoming',
  };
}

// Prompt generation
function generatePrompt(
  state: StateElectionData,
  zip: string,
  lang: 'en' | 'es' = 'en'
): string {
  if (lang === 'es') return buildSpanishPrompt(state, zip);
  return buildEnglishPrompt(state, zip);
}
```

**Why default parameters:** Phase 1 callers need zero changes. Existing unit tests pass without modification. Phase 2 adds new tests that pass explicit `lang` argument.

### Pattern: Prompt Storage

```typescript
// src/lib/generatePrompt.ts

const BALLOT_PROMPT_EN: string = /* full English prompt from BALLOT_PROMPT.md */;
const BALLOT_PROMPT_ES: string = /* full Spanish translation, natural "tú" voice */;

function buildContextBlockEn(state: StateElectionData, zip: string): string {
  return `Hello! I'm going to vote in **${state.name}**...`;
}

function buildContextBlockEs(state: StateElectionData, zip: string): string {
  return `¡Hola! Voy a votar en **${state.name}**...`;
}
```

**Key decision:** Both prompt constants are complete strings stored inline in `generatePrompt.ts`. They are NOT generated by string interpolation. Prompts are long-form prose with voice and tone — fragment assembly produces unnatural text.

---

## 4. Project Structure

### New Files (Phase 2)

```
src/
├── lib/
│   ├── translations.ts          # NEW: Translations interface + EN + ES records
│   └── i18n.tsx                 # NEW: LanguageProvider + useLanguage() hook
├── components/
│   └── LanguageToggle.tsx       # NEW: Fixed-position language toggle button
```

### Modified Files (Phase 2)

```
src/
├── lib/
│   ├── date-utils.ts            # MODIFIED: formatDate(date, lang?) — locale-aware
│   ├── getDeadlineStatus.ts     # MODIFIED: getDeadlineStatus(date, today, lang?)
│   └── generatePrompt.ts        # MODIFIED: generatePrompt(state, zip, lang?)
│                                #           + BALLOT_PROMPT_ES constant
│                                #           + buildContextBlockEs()
├── app/
│   └── page.tsx                 # MODIFIED: wraps with LanguageProvider
│                                #           or split into PageContent.tsx (client)
├── components/
│   ├── ZipForm.tsx              # MODIFIED: uses useLanguage(), error-as-key
│   ├── StateInfoCard.tsx        # MODIFIED: uses useLanguage() for labels
│   │                            #           uses formatDate(date, lang)
│   ├── PromptOutput.tsx         # MODIFIED: uses useLanguage(), generatePrompt(lang)
│   └── BallotToolClient.tsx     # MODIFIED: uses useLanguage()
```

### Test Files (Phase 2)

```
src/
├── lib/
│   ├── translations.test.ts     # NEW: completeness, no undefined values
│   ├── i18n.test.tsx            # NEW: hook returns correct strings, lang switching
│   ├── date-utils.test.ts       # EXTENDED: Spanish locale tests added
│   ├── getDeadlineStatus.test.ts# EXTENDED: Spanish output tests added
│   └── generatePrompt.test.ts   # EXTENDED: Spanish prompt output tests
├── components/
│   ├── LanguageToggle.test.tsx  # NEW: renders, toggles, aria-label, data-testid
│   ├── ZipForm.test.tsx         # EXTENDED: error-as-key pattern, Spanish mode
│   └── [other components].tsx  # EXTENDED: Spanish mode rendering tests
e2e/
└── ballot-tool.spec.ts          # EXTENDED: language toggle E2e tests
                                 #  - click toggle, assert Spanish UI
                                 #  - verify state preservation on switch
                                 #  - verify localStorage persistence
```

---

## 5. Integration Boundaries

### Language Context Boundary

The `LanguageProvider` is the single source of truth for language state. **All** components that display translated text must be client components that consume `useLanguage()`.

```
LanguageProvider
├── LanguageToggle (reads lang, calls setLang)
├── BallotToolClient (reads lang, passes to child components)
│   ├── ZipForm (reads lang via useLanguage())
│   ├── StateInfoCard (reads lang via useLanguage())
│   ├── PromptOutput (reads lang via useLanguage())
│   └── StateSelectorModal (reads lang via useLanguage())
└── PageContent (reads lang via useLanguage()) — hero, tips, footer
```

**Note:** `page.tsx` (Server Component) cannot consume context. If it contains any translated strings, it must be refactored to extract them into a client component `PageContent.tsx` that wraps the translated text.

### Data Boundary (Unchanged)

Election data values (state names, election names, voter ID requirements, URLs) come from JSON files and are NOT translated. They render identically in both language modes. This is an explicit Phase 2 scope boundary.

### Prompt Generation Boundary

`generatePrompt(state, zip, lang)` is called in `PromptOutput.tsx` at render time using the current `lang` from context. This ensures the prompt always matches the active UI language.

**Important:** `BallotToolClient` must pass current `lang` to the prompt generator, not cache the prompt string in state. If the prompt string is cached, it won't update on language switch.

```typescript
// Correct: generate at render time
const prompt = generatePrompt(stateData, zip, lang); // lang from useLanguage()

// Incorrect: cache in state (won't update on language switch)
const [prompt, setPrompt] = useState<string>(generatePrompt(stateData, zip, 'en'));
```

---

## 6. Implementation Sequence

### Order of Implementation

1. **`translations.ts`** — Define `Translations` interface and write all EN + ES strings
   - Prerequisite for all other components
   - Write tests first: interface completeness, no undefined values

2. **`i18n.tsx`** — `LanguageProvider` + `useLanguage()` hook
   - SSR hydration guard
   - localStorage read/write
   - `document.documentElement.lang` sync
   - Write tests: hook returns correct strings per lang

3. **`LanguageToggle.tsx`** — Fixed-position toggle component
   - `data-testid="language-toggle"`
   - `aria-label` + `aria-live` for accessibility
   - Write tests: renders, toggles, accessible

4. **`page.tsx`** — Wrap with `LanguageProvider`, add `LanguageToggle`
   - Move translated static strings to `PageContent.tsx` client component if needed

5. **`date-utils.ts` + `getDeadlineStatus.ts`** — Add `lang` parameter
   - Backward-compatible (default = 'en')
   - Write tests: Spanish output correct

6. **`generatePrompt.ts`** — Add `lang` parameter + `BALLOT_PROMPT_ES` + `buildContextBlockEs`
   - Write tests: Spanish prompt well-formed, context block uses Spanish labels

7. **All UI Components** — Update to use `useLanguage()`, error-as-key
   - ZipForm, StateInfoCard, PromptOutput, BallotToolClient
   - Write tests per component

8. **E2e tests** — Language toggle, Spanish UI, state preservation, persistence

### Dependency Graph

```
translations.ts ──────────────────────────────────────┐
i18n.tsx (depends on translations.ts) ────────────────┤
LanguageToggle.tsx (depends on i18n.tsx) ─────────────┤
date-utils.ts (independent) ──────────────────────────┤
getDeadlineStatus.ts (independent) ────────────────────┤
generatePrompt.ts (independent) ───────────────────────┤
                                                        ↓
ZipForm / StateInfoCard / PromptOutput / BallotToolClient
(all depend on i18n.tsx; StateInfoCard also needs date-utils;
 PromptOutput also needs generatePrompt.ts)
                                                        ↓
page.tsx (depends on LanguageProvider from i18n.tsx)
                                                        ↓
E2e tests (depend on complete implementation)
```

---

## 7. Architecture Validation

### FR Coverage Check

| FR | Satisfied by |
|----|-------------|
| FR-001 Language toggle | `LanguageToggle.tsx` + `useLanguage().setLang` |
| FR-002 Always visible | `position: fixed` CSS |
| FR-003 No page reload | React Context update (synchronous re-render) |
| FR-004 State preservation | Language context separate from app state; `stateData` never cleared on lang switch |
| FR-005 Persistence | `localStorage.setItem/getItem` in `LanguageProvider` |
| FR-006 Keyboard accessible | Native `<button>` element |
| FR-007 data-testid | `data-testid="language-toggle"` attribute |
| FR-008/009 English UI | `t(key)` lookup returns EN record |
| FR-011/012 Spanish UI | `t(key)` lookup returns ES record |
| FR-013 Spanish prompt | `generatePrompt(state, zip, 'es')` |
| FR-014 Date locale | `Intl.DateTimeFormat('es-MX')` |
| FR-015 Deadline Spanish | `getDeadlineStatus(date, today, 'es')` |
| FR-016 Full Spanish prompt | `BALLOT_PROMPT_ES` constant |
| FR-017 Spanish context block | `buildContextBlockEs()` |
| FR-018 Live error translation | Error-as-key pattern in ZipForm |
| FR-019 lang attribute | `document.documentElement.lang = lang` in useEffect |
| FR-020 SR announcement | `aria-live="polite"` in LanguageToggle |
| FR-021 Accessible name | `aria-label` on toggle button |
| FR-022 Phase 1 regression | Backward-compatible function signatures |
| FR-023 Existing data-testids | No existing testids removed |
| FR-024 Separation of concerns | translations.ts separate from component files |

### Risk Assessment

| Risk | Mitigation |
|------|-----------|
| SSR hydration mismatch | Two-pass init (always 'en' on first render, useEffect applies stored pref) |
| Missing translation key (runtime undefined) | TypeScript `Translations` interface enforces completeness at compile time |
| Prompt cached in state (doesn't update on lang switch) | Architecture requires generating prompt at render time, documented in integration boundary |
| Spanish text overflow on mobile | PHASE2_SPEC.md requires layout testing; `word-break: break-word` on translated containers |
| localStorage unavailable (private mode, full) | `try/catch` or nullish check in LanguageProvider; default to 'en' |
