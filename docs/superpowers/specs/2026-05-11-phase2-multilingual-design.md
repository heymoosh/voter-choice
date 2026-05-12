# Phase 2: Multilingual Extension (Spanish Language Support) — Design Doc

**Date:** 2026-05-11
**Phase:** 2
**Framework:** Superpowers

---

## Context

The ballot research tool currently serves English-only content. Phase 2 adds Spanish language support via a language toggle. All user-facing text must be available in both languages, including the AI prompt output. The architecture must make adding a 3rd language require only new translation content.

---

## Approaches Considered

### Option A: React Context + Translation Map (Recommended)

Create a `LanguageContext` that holds the current language (`"en"` | `"es"`) and a `t()` lookup function. Translation strings are stored in a dedicated `src/lib/i18n/` module with typed keys. Components call `t("key")` to get the right string. The `generatePrompt` function accepts a `language` parameter and returns the appropriately-localized prompt.

**Pros:** Clean separation of concerns, easy to add languages (just add a translation object), typed keys catch missing translations at compile time, no external dependencies.

**Cons:** Requires threading context through components.

### Option B: next-intl / react-intl library

Use an established i18n library that handles pluralization, date formatting, etc.

**Pros:** Battle-tested, rich formatting support.
**Cons:** Adds external dependency, more complex setup, overkill for 2 languages with no pluralization needs in spec.

### Option C: Prop-drilling language prop

Pass `language` as a prop through every component.

**Pros:** Explicit, no context magic.
**Cons:** Extremely verbose, fragile, not extensible.

**Decision: Option A.** Zero external dependencies, typed, extensible, minimal complexity for the spec requirements.

---

## Architecture

### New Files

- `src/lib/i18n/translations.ts` — All translation strings keyed by `en` and `es`. Typed with `TranslationKey` union type.
- `src/lib/i18n/LanguageContext.tsx` — React context + `LanguageProvider` + `useLanguage()` hook + `usePersistLanguage()` (localStorage).
- `src/lib/i18n/index.ts` — Re-exports for clean import paths.
- `src/lib/ballotPromptTextEs.ts` — Complete Spanish translation of the ballot prompt (stored as full text, not fragments).

### Modified Files

- `src/app/layout.tsx` — Wrap app in `LanguageProvider`; update `lang` attribute dynamically.
- `src/app/page.tsx` — Consume `useLanguage()`; pass language to `generatePrompt`; pass `t` to components needing it.
- `src/lib/generatePrompt.ts` — Accept `language` parameter; switch between English and Spanish prompt text and context block.
- `src/lib/deadlineStatus.ts` — Accept `language` parameter for localized status labels.
- `src/components/ZipForm.tsx` — Use `t()` for labels, placeholder, error messages.
- `src/components/StateInfoCard.tsx` — Use `t()` for section headers, labels; accept `language` for date formatting.
- `src/components/PromptOutput.tsx` — Use `t()` for heading, description, copy button text.
- `src/components/TipsSection.tsx` — Use `t()` for all tips content.
- `src/components/Footer.tsx` — Use `t()` for attribution and share text.
- `src/components/StateSelector.tsx` — Use `t()` for prompt text.

### New Component

- `src/components/LanguageToggle.tsx` — Button with `data-testid="language-toggle"`, keyboard accessible, announces change to screen readers.

### Test Files

- `src/lib/__tests__/i18n.test.ts` — Tests for translation key completeness, `t()` function.
- `src/lib/__tests__/generatePrompt.test.ts` — Extended with Spanish language tests.
- `src/lib/__tests__/deadlineStatus.test.ts` — Extended with Spanish label tests.

---

## Data Flow

```
LanguageProvider (layout)
  └── page.tsx  [reads lang, passes t() + lang to children]
        ├── LanguageToggle [toggles lang, persists to localStorage]
        ├── ZipForm [t() for labels/errors]
        ├── StateSelector [t() for prompt]
        ├── StateInfoCard [t() for labels, lang for date fmt]
        ├── PromptOutput [t() for UI strings]
        ├── TipsSection [t() for tips]
        └── Footer [t() for attribution]

generatePrompt(stateData, zip, today, language)
  → if language==="es": BALLOT_PROMPT_TEXT_ES + Spanish context block
  → if language==="en": BALLOT_PROMPT_TEXT + English context block
```

---

## Key Decisions

1. **Language persists via localStorage** under key `"voter-choice-lang"`. Default: `"en"`.
2. **`lang` attribute on `<html>`** updated via `useEffect` in `LanguageProvider` when language changes.
3. **Screen reader announcement** via `aria-live="polite"` region that gets updated on language switch.
4. **Spanish prompt stored whole** — `src/lib/ballotPromptTextEs.ts` contains the complete translated prompt, not interpolated fragments.
5. **Date formatting** — `toLocaleDateString("es", {...})` for Spanish dates. The `formatDate` functions in `generatePrompt.ts` and `StateInfoCard.tsx` accept a `language` parameter.
6. **Deadline status labels** — `getDeadlineStatus` accepts optional `language` parameter; returns Spanish labels when `"es"`.
7. **Error messages** — defined in `translations.ts` with Spanish equivalents per spec.
8. **No new external dependencies.**

---

## Acceptance Criteria Mapping

| Spec requirement | Implementation |
|---|---|
| Language toggle visible always | `LanguageToggle` in `<header>` inside `page.tsx`, fixed position for scroll |
| Toggle switches all text | All components use `t()` from context |
| Language persists on refresh | localStorage in `LanguageProvider` |
| No state reset on language switch | Language is separate context; zip state unchanged |
| `data-testid="language-toggle"` | Present on toggle element |
| Full Spanish AI prompt | `ballotPromptTextEs.ts` |
| Spanish context block | `generatePrompt` with `language="es"` |
| Date formatting by language | `toLocaleDateString` locale param |
| `lang` attribute updates | `useEffect` in `LanguageProvider` |
| Third language = only new content | Add entry to `translations.ts`, new prompt file |

---

## Out of Scope

Per spec: no auto-detect, no URL routing, no RTL, no data value translation, no chatbot name translation.
