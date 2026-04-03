# Story 1.1: Create Typed Translation Store

Status: done

## Story

As a developer,
I want a typed TypeScript translation store with complete EN and ES records,
so that all UI strings have tested translations and TypeScript enforces completeness at compile time.

## Acceptance Criteria

1. **Given** a `Translations` TypeScript interface is defined with all required keys
   **When** `src/lib/translations.ts` is compiled
   **Then** TypeScript fails compilation if any key is missing from either the EN or ES record

2. **Given** the EN record in translations.ts
   **When** any translation key is accessed via `t(key)`
   **Then** the function returns a non-empty English string (no `undefined` values)

3. **Given** the ES record in translations.ts
   **When** any translation key is accessed via `t(key)`
   **Then** the function returns a non-empty Spanish string (no `undefined` values)

4. **Given** the full set of translation keys
   **When** the keys are enumerated
   **Then** they cover: `hero`, `form` (label/placeholder/submit), `errors` (zipEmpty/zipInvalid/zipNotFound/multiState/deadlinePassed/noElection), `stateInfo` (all field labels and sub-labels), `deadline` (daysLeft/dayLeft/today/tomorrow/passed/notAvailable), `prompt` (heading/instructions/copyButton/copiedButton), `tips` (heading + all tip strings), `footer` (credit), `a11y` (skipToContent/langToggleToEs/langToggleToEn/langChangedToEs/langChangedToEn)

5. **Given** translations.ts as a standalone module
   **When** it is imported
   **Then** it exports `EN: Translations`, `ES: Translations`, and a `getTranslation(lang, key)` utility function

## Tasks / Subtasks

- [x] Write failing test for translations completeness (TDD: test first) (AC: 1, 2, 3, 4)
  - [x] Create `src/__tests__/translations.test.ts`
  - [x] Test: every key in EN is a non-empty string
  - [x] Test: every key in ES is a non-empty string
  - [x] Test: `getTranslation('en', 'form.label')` returns correct English string
  - [x] Test: `getTranslation('es', 'form.label')` returns correct Spanish string
  - [x] Test: `getTranslation('en', 'errors.zipEmpty')` returns correct string
  - [x] Test: `getTranslation('es', 'errors.zipEmpty')` returns correct Spanish string
  - [x] Test: TypeScript enforces completeness (compile-time test via type checking)
- [x] Create `src/lib/translations.ts` with `Translations` interface (AC: 1)
  - [x] Define complete `Translations` TypeScript interface
  - [x] Implement `EN: Translations` record with all English strings
  - [x] Implement `ES: Translations` record with all Spanish strings
  - [x] Export `getTranslation(lang, key)` utility function
- [x] Run tests and verify all pass (AC: 1, 2, 3, 4, 5)
- [x] Run `npx tsc --noEmit` to verify TypeScript compilation (AC: 1)

## Dev Notes

### Critical: TDD Approach Required

**Write the test file FIRST before creating translations.ts.** The test should fail with "Cannot find module" error, then pass after implementation.

Test file path: `src/__tests__/translations.test.ts`
Implementation file path: `src/lib/translations.ts`

### Translations Interface and Complete String Inventory

Below is the COMPLETE string inventory from all Phase 1 components. Implement all keys exactly as specified.

#### Complete Interface Definition

```typescript
// src/lib/translations.ts

export interface Translations {
  hero: {
    headline: string;
    subtitle: string;
  };
  form: {
    label: string;       // sr-only label for zip input
    placeholder: string; // input placeholder text
    submit: string;      // submit button text
    continue: string;    // "Continue" button in StateSelectorModal
  };
  errors: {
    zipEmpty: string;       // "Please enter a zip code"
    zipInvalid: string;     // "Please enter a valid 5-digit zip code"
    zipNotFound: string;    // "We don't have data for this zip code..."
    multiState: string;     // "This zip code spans multiple states..."
    deadlinePassed: string; // "Registration deadlines have passed"
    noElection: string;     // "No upcoming elections found for this state."
    findElectionWebsite: string; // "Find your state election website →"
  };
  stateInfo: {
    lastUpdated: string;           // "Last updated:"
    registrationDeadlines: string; // "Registration Deadlines" (section heading)
    online: string;                // "Online"
    byMail: string;                // "By mail"
    inPerson: string;              // "In person"
    sameDayReg: string;            // "Same-day registration available"
    earlyVoting: string;           // "Early Voting" (section heading)
    earlyVotingNotAvailable: string; // "Not available — absentee voting only"
    voterId: string;               // "Voter ID" (section heading)
    voterIdRequired: string;       // "Required"
    voterIdNotRequired: string;    // "Not required"
    phonesAtPolls: string;         // "Phones at Polls" (section heading)
    electionWebsite: string;       // "Election Website ↗"
    sampleBallot: string;          // "Sample Ballot ↗"
    noElectionMessage: string;     // "No upcoming elections found for"
    checkWebsite: string;          // "election website" (link text after "Check {state}")
  };
  deadline: {
    daysLeft: string;    // "{days} days left" — NOTE: include "{days}" placeholder
    dayLeft: string;     // "1 day left"
    today: string;       // "Today!"
    tomorrow: string;    // "Tomorrow!"
    passed: string;      // "Passed"
    notAvailable: string; // "Not available"
  };
  prompt: {
    heading: string;      // "Your Customized Prompt"
    instructions: string; // "Copy this prompt and paste it as your first message..."
    copyButton: string;   // "Copy to Clipboard"
    copiedButton: string; // "Copied!"
  };
  tips: {
    heading: string; // "Tips for Using AI Ballot Research"
    tip1: string;
    tip2: string;
    tip3: string;
    tip4: string;
    tip5: string;    // warning tip (the AI can make mistakes tip)
  };
  footer: {
    share: string;  // "Share this tool with friends and family"
    credit: string; // "Created by a human using AI tools"
  };
  a11y: {
    skipToContent: string;    // "Skip to main content"
    langToggleToEs: string;   // "Switch to Spanish" (aria-label in EN mode)
    langToggleToEn: string;   // "Switch to English" (aria-label in ES mode)
    langChangedToEs: string;  // "Language changed to Spanish" (aria-live announcement)
    langChangedToEn: string;  // "Language changed to English" (aria-live announcement)
  };
}
```

#### EN Record (exact Phase 1 strings)

```typescript
export const EN: Translations = {
  hero: {
    headline: "Research Your Ballot with AI",
    subtitle: "Enter your zip code, get a customized prompt, and paste it into any free AI chatbot to research every race on your ballot.",
  },
  form: {
    label: "Zip Code",
    placeholder: "Enter your 5-digit zip code",
    submit: "Go",
    continue: "Continue",
  },
  errors: {
    zipEmpty: "Please enter a zip code",
    zipInvalid: "Please enter a valid 5-digit zip code",
    zipNotFound: "We don't have data for this zip code yet. We're working on adding all U.S. zip codes.",
    multiState: "This zip code spans multiple states. Which state are you voting in?",
    deadlinePassed: "Registration deadlines have passed for the next election.",
    noElection: "No upcoming elections found for this state.",
    findElectionWebsite: "Find your state election website →",
  },
  stateInfo: {
    lastUpdated: "Last updated:",
    registrationDeadlines: "Registration Deadlines",
    online: "Online",
    byMail: "By mail",
    inPerson: "In person",
    sameDayReg: "Same-day registration available",
    earlyVoting: "Early Voting",
    earlyVotingNotAvailable: "Not available — absentee voting only",
    voterId: "Voter ID",
    voterIdRequired: "Required",
    voterIdNotRequired: "Not required",
    phonesAtPolls: "Phones at Polls",
    electionWebsite: "Election Website ↗",
    sampleBallot: "Sample Ballot ↗",
    noElectionMessage: "No upcoming elections found for",
    checkWebsite: "election website",
  },
  deadline: {
    daysLeft: "{days} days left",
    dayLeft: "1 day left",
    today: "Today!",
    tomorrow: "Tomorrow!",
    passed: "Passed",
    notAvailable: "Not available",
  },
  prompt: {
    heading: "Your Customized Prompt",
    instructions: "Copy this prompt and paste it as your first message in any AI chatbot",
    copyButton: "Copy to Clipboard",
    copiedButton: "Copied!",
  },
  tips: {
    heading: "Tips for Using AI Ballot Research",
    tip1: "You can say \"I don't know\" or \"I'm not sure where I stand\" — the AI will explain more and help you figure it out",
    tip2: "Ask it to research something for you (\"Can you look up this candidate's voting record?\")",
    tip3: "Ask questions anytime (\"What does this position actually do?\" or \"Why does this matter?\")",
    tip4: "You're not taking a test. You're having a conversation. The AI works with you.",
    tip5: "AI can make mistakes. This is a research starting point. Always verify with official sources — the tool links you to them.",
  },
  footer: {
    share: "Share this tool with friends and family",
    credit: "Created by a human using AI tools",
  },
  a11y: {
    skipToContent: "Skip to main content",
    langToggleToEs: "Switch to Spanish",
    langToggleToEn: "Switch to English",
    langChangedToEs: "Language changed to Spanish",
    langChangedToEn: "Language changed to English",
  },
};
```

#### ES Record (civic Spanish, "tú" voice throughout)

```typescript
export const ES: Translations = {
  hero: {
    headline: "Investiga tu boleta con IA",
    subtitle: "Ingresa tu código postal, obtén un prompt personalizado y pégalo en cualquier chatbot de IA para investigar cada cargo en tu boleta.",
  },
  form: {
    label: "Código postal",
    placeholder: "Ingresa tu código postal de 5 dígitos",
    submit: "Buscar",
    continue: "Continuar",
  },
  errors: {
    zipEmpty: "Por favor ingresa un código postal",
    zipInvalid: "Por favor ingresa un código postal válido de 5 dígitos",
    zipNotFound: "Aún no tenemos datos para este código postal. Estamos trabajando en agregar todos los códigos postales de EE. UU.",
    multiState: "Este código postal abarca varios estados. ¿En qué estado vas a votar?",
    deadlinePassed: "Las fechas límite de registro ya pasaron para la próxima elección.",
    noElection: "No se encontraron próximas elecciones para este estado.",
    findElectionWebsite: "Encuentra el sitio web de elecciones de tu estado →",
  },
  stateInfo: {
    lastUpdated: "Última actualización:",
    registrationDeadlines: "Fechas límite de registro",
    online: "En línea",
    byMail: "Por correo",
    inPerson: "En persona",
    sameDayReg: "Registro el mismo día disponible",
    earlyVoting: "Votación anticipada",
    earlyVotingNotAvailable: "No disponible — solo votación por correo",
    voterId: "Identificación para votar",
    voterIdRequired: "Requerida",
    voterIdNotRequired: "No requerida",
    phonesAtPolls: "Teléfonos en las urnas",
    electionWebsite: "Sitio de elecciones ↗",
    sampleBallot: "Boleta de muestra ↗",
    noElectionMessage: "No se encontraron próximas elecciones para",
    checkWebsite: "sitio web de elecciones",
  },
  deadline: {
    daysLeft: "Quedan {days} días",
    dayLeft: "Queda 1 día",
    today: "¡Hoy!",
    tomorrow: "¡Mañana!",
    passed: "Plazo pasado",
    notAvailable: "No disponible",
  },
  prompt: {
    heading: "Tu Prompt Personalizado",
    instructions: "Copia este prompt y pégalo como tu primer mensaje en cualquier chatbot de IA",
    copyButton: "Copiar en el portapapeles",
    copiedButton: "¡Copiado!",
  },
  tips: {
    heading: "Consejos para usar IA en tu investigación de boleta",
    tip1: "Puedes decir \"No sé\" o \"No estoy seguro/a de mi posición\" — la IA te explicará más y te ayudará a entender",
    tip2: "Pídele que investigue algo por ti (\"¿Puedes buscar el historial de votación de este candidato?\")",
    tip3: "Haz preguntas cuando quieras (\"¿Qué hace realmente este cargo?\" o \"¿Por qué importa esto?\")",
    tip4: "No estás tomando un examen. Estás teniendo una conversación. La IA trabaja contigo.",
    tip5: "La IA puede cometer errores. Este es un punto de partida para tu investigación. Siempre verifica con fuentes oficiales — la herramienta te enlaza a ellas.",
  },
  footer: {
    share: "Comparte esta herramienta con amigos y familiares",
    credit: "Creado por una persona usando herramientas de IA",
  },
  a11y: {
    skipToContent: "Ir al contenido principal",
    langToggleToEs: "Cambiar a Español",
    langToggleToEn: "Cambiar a Inglés",
    langChangedToEs: "Idioma cambiado a español",
    langChangedToEn: "Idioma cambiado a inglés",
  },
};
```

#### getTranslation Utility Function

```typescript
// Nested key lookup: getTranslation('en', 'errors.zipEmpty') → EN.errors.zipEmpty
export function getTranslation(lang: 'en' | 'es', key: string): string {
  const store = lang === 'es' ? ES : EN;
  const value = key.split('.').reduce((obj: unknown, k) => {
    if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[k];
    return undefined;
  }, store as unknown);
  return (typeof value === 'string' && value) ? value : key; // fallback to key itself
}
```

### deadline.daysLeft Placeholder Note

The `deadline.daysLeft` and `deadline.dayLeft` strings use `{days}` as a placeholder:
- EN: `"{days} days left"` 
- ES: `"Quedan {days} días"`

When Story 4.1 updates `getDeadlineLabel`/`getDeadlineStatus`, it will replace `{days}` with the actual number. For this story (1.1), just store the placeholder string as-is in the records. The interpolation logic is NOT part of this story.

### File Structure (Phase 2 — do NOT create these yet)

This story creates ONE new file:
- **`src/lib/translations.ts`** — NEW file

The following files will be created/modified in LATER stories:
- `src/lib/i18n.tsx` — Story 1.2
- `src/components/LanguageToggle.tsx` — Story 2.1
- All component modifications — Stories 3.1–3.3

### TypeScript Enforcement Pattern

The interface + explicit type annotation is the enforcement mechanism:

```typescript
export const EN: Translations = { ... }; // TypeScript FAILS if any key missing
export const ES: Translations = { ... }; // TypeScript FAILS if any key missing
```

Do NOT use `as Translations` cast — that defeats type checking. The explicit `: Translations` annotation is what causes compilation failure on missing keys.

### Test Patterns to Follow

From existing tests in `src/__tests__/`:
- Uses `vitest` (`import { describe, it, expect } from "vitest"`)
- Co-located in `src/__tests__/` directory
- File naming: `translations.test.ts` (no `.tsx` needed — pure TypeScript, no JSX)

### Project Structure Notes

- Existing lib files: `src/lib/date-utils.ts`, `src/lib/generatePrompt.ts`, `src/lib/getStateData.ts`, `src/lib/lookupZip.ts`, `src/lib/types.ts`
- New file fits naturally alongside existing lib files
- **Do NOT modify any existing files in this story** — translations.ts is standalone
- TypeScript config: standard Next.js tsconfig (strict mode enabled)

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Pattern: Translation Key Lookup]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision: TypeScript Enforcement of Translation Completeness]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Translation Key Naming Convention]
- [Source: src/app/page.tsx — hero, tips, footer strings]
- [Source: src/components/ZipForm.tsx — form strings]
- [Source: src/components/StateInfoCard.tsx — stateInfo strings]
- [Source: src/components/PromptOutput.tsx — prompt strings]
- [Source: src/components/BallotToolClient.tsx — error strings]
- [Source: src/components/StateSelectorModal.tsx — multiState, continue strings]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

(none — clean implementation)

### Completion Notes List

- Created `src/lib/translations.ts` with `Translations` TypeScript interface + `EN` and `ES` records (46 leaf string keys each) + `getTranslation()` utility
- Created `src/__tests__/translations.test.ts` with 27 tests: completeness, no-undefined, matching structure, key lookups, fallback behavior
- TDD: tests written first (RED), then implementation (GREEN); 27/27 pass
- Full regression: 77/77 tests pass (50 Phase 1 + 27 new), 0 TypeScript errors
- All 5 acceptance criteria satisfied

### File List

- `src/__tests__/translations.test.ts` (NEW)
- `src/lib/translations.ts` (NEW)
