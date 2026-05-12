# Epics and Stories: Phase 2 — Multilingual Extension

## Epic 1: i18n Infrastructure
Establish the translation architecture that all other stories depend on.

### Story 1.1: Translation Data Store
Create `src/lib/translations.ts` with:
- `Language` type union (`'en' | 'es'`)
- `Translations` interface with all translatable string keys
- `en` (English) and `es` (Spanish) translation records
- `getTranslation(lang, key)` utility function

### Story 1.2: Language Context Provider
Create `src/lib/i18n.tsx` with:
- `LanguageContext` React Context
- `LanguageProvider` component (localStorage read/write, html lang update)
- `useLanguage()` hook exporting `{lang, setLang, t}`
- SSR hydration guard

## Epic 2: Language Toggle UI
### Story 2.1: LanguageToggle Component
Create `src/components/LanguageToggle.tsx`:
- Button with `data-testid="language-toggle"`
- Positioned in header, always visible
- Keyboard accessible, ARIA-announced
- Shows current language, allows switching

## Epic 3: Component Translations
### Story 3.1: Page.tsx Static Content
Translate all text in `src/app/page.tsx`: hero headline, subtitle, chatbot links labels, tips, footer

### Story 3.2: ZipForm Translation
Translate input label, placeholder, button text, all error messages

### Story 3.3: StateInfo Translation
Translate all section headings, labels, status text

### Story 3.4: DeadlineStatus Translation
Translate status labels ("Open", "Closing Soon", "Urgent", "Passed") and relative labels ("X days left" → "Quedan X días")

### Story 3.5: StateSelector Translation
Translate the multi-state prompt and button labels

### Story 3.6: PromptOutput Translation
Translate the section heading, instructions, copy button text ("Copy to Clipboard" / "Copied!")

## Epic 4: Prompt Localization
### Story 4.1: Spanish Main Prompt
Add `MAIN_PROMPT_ES` to `src/lib/promptBuilder.ts`: complete fluent Spanish translation of the ballot research prompt

### Story 4.2: Spanish Context Block
Modify `buildContextBlock` and `buildPrompt` to accept `lang` parameter and produce language-appropriate output

### Story 4.3: Localized Date Formatting
Modify `formatDate` and `getDeadlineLabel` in `src/lib/deadlineUtils.ts` to accept `lang` parameter

## Epic 5: Layout Integration
### Story 5.1: Layout Provider Wrapping
Modify `src/app/layout.tsx` to wrap children in `<LanguageProvider>` and include `<LanguageToggle>` in header

## Epic 6: Testing
### Story 6.1: Unit Tests for i18n Infrastructure
Add tests for `translations.ts` and `useLanguage` hook behavior

### Story 6.2: E2E Tests for Language Toggle
Add `e2e/language-toggle.spec.ts` with tests for:
- Toggle visibility and accessibility
- Language switching behavior
- State preservation during switch
- localStorage persistence
- html lang attribute update
