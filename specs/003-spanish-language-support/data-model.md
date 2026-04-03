# Data Model: Spanish Language Support

**Branch**: `003-spanish-language-support` | **Date**: 2026-04-03

## New Types (additions to src/types/election.ts or new files)

### Language (new — src/lib/translations.ts)

```typescript
export type Language = "en" | "es";
```

Canonical enum for supported languages. Adding a third language requires only adding
a new value here and a corresponding record in `translations.ts`.

### Translations (new interface — src/lib/translations.ts)

The canonical typed interface for all user-facing strings. All keys must be present
for every language — missing key = TypeScript compile error.

```typescript
export interface Translations {
  // Hero section
  hero: {
    title: string;
    subtitle1: string;
    subtitle2: string;
    worksWith: string;
  };

  // Zip form
  zipForm: {
    label: string;
    placeholder: string;
    submit: string;
  };

  // Loading state
  loading: string;

  // Error messages
  errors: {
    empty: string;
    invalid: string;
    notFound: string;
    noElection: (stateName: string) => string;
    multiState: string;
  };

  // State info card labels
  stateInfo: {
    election: string;
    electionType: string;
    registrationDeadlines: string;
    earlyVoting: string;
    voterId: string;
    voterIdRequired: string;
    voterIdNotRequired: string;
    phonesAtPolls: string;
    sampleBallot: string;
    countyElectionOffice: string;
    earlyVotingNotAvailable: string;
    deadlineStatus: (days: number) => string;  // "12 days left" / "Quedan 12 días"
    deadlinePassed: string;                     // "Passed" / "Pasado"
  };

  // State selector modal
  stateSelector: {
    prompt: string;
    selectButton: string;
  };

  // Prompt output
  promptOutput: {
    title: string;
    instructions: string;
    copyButton: string;
    copiedButton: string;
  };

  // Tips section
  tips: {
    title: string;
    tip1: string;
    tip2: string;
    tip3: string;
    tip4: string;
    disclaimer: string;
  };

  // Footer
  footer: {
    share: string;
    createdBy: string;
    basedOn: string;
    promptLink: string;
  };

  // Accessibility
  a11y: {
    skipToContent: string;
    languageToggleLabel: string;
  };
}
```

### LanguageContextValue (new — src/lib/i18n.tsx)

```typescript
interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
}
```

### Updated generatePrompt signature

```typescript
// Before (Phase 1)
function generatePrompt(
  state: StateElectionData,
  zipCode: string,
  todayISO?: string,
): CustomizedPrompt

// After (Phase 2)
function generatePrompt(
  state: StateElectionData,
  zipCode: string,
  todayISO?: string,
  lang?: Language,
): CustomizedPrompt
```

`lang` defaults to `'en'`. When `'es'`, uses `BALLOT_PROMPT_ES` and Spanish context
block structure. `CustomizedPrompt` type is unchanged.

### Updated getDeadlineStatus signature

```typescript
// Before (Phase 1)
function getDeadlineStatus(
  dateISO: string,
  todayISO: string,
): DeadlineStatus

// After (Phase 2) — label is now locale-aware
function getDeadlineStatus(
  dateISO: string,
  todayISO: string,
  locale?: string,  // 'en-US' | 'es-US', defaults to 'en-US'
): DeadlineStatus
```

The `label` field in `DeadlineStatus` will contain locale-formatted date strings.
Deadline status text ("12 days left" / "Quedan 12 días", "Passed" / "Pasado") is
handled by the translation layer in components, not in `getDeadlineStatus` itself.

## State Transitions

```
Language state machine:
  'en' ──[toggle]──→ 'es'
  'es' ──[toggle]──→ 'en'
  initial: 'en' (SSR) → read localStorage → 'en'|'es' (client hydration)
```

## New Files Summary

| File | Type | Purpose |
|------|------|---------|
| `src/lib/translations.ts` | Translation data | All UI strings for en/es |
| `src/lib/i18n.tsx` | React context | Language state, hook, provider |
| `src/components/LanguageToggle.tsx` | UI component | Toggle button (fixed top-right) |
| `src/app/PageContent.tsx` | Client component | Hero, tips, footer (translated) |

## Modified Files Summary

| File | Change |
|------|--------|
| `src/lib/generatePrompt.ts` | Add `lang` param, `BALLOT_PROMPT_ES`, Spanish context block |
| `src/lib/getDeadlineStatus.ts` | Add `locale` param for date formatting |
| `src/app/page.tsx` | Refactor to server shell + LanguageProvider |
| `src/components/BallotToolClient.tsx` | Consume `useLanguage()`, pass `lang` to generatePrompt |
| `src/components/ZipForm.tsx` | Use `useTranslations()` for labels/errors |
| `src/components/StateInfoCard.tsx` | Use `useTranslations()` for field labels |
| `src/components/PromptOutput.tsx` | Use `useTranslations()` for button text |
| `src/components/StateSelectorModal.tsx` | Use `useTranslations()` for prompt text |
