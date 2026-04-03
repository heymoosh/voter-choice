---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
inputDocuments:
  - '_bmad-output/planning-artifacts/product-brief-voter-choice-2026-04-03.md'
  - '_bmad-output/brainstorming/brainstorming-session-2026-04-03-2100.md'
  - 'docs/PHASE2_SPEC.md'
  - 'docs/PROJECT_SPEC.md'
  - 'docs/BALLOT_PROMPT.md'
workflowType: 'prd'
classification:
  projectType: 'web-app-extension'
  domain: 'civic-technology'
  complexity: 'low'
  projectContext: 'brownfield'
---

# Product Requirements Document - voter-choice (Phase 2: Spanish Language Support)

**Author:** Muxin
**Date:** 2026-04-03

---

## Executive Summary

The voter-choice ballot research tool adds Spanish language support (Phase 2) to serve Spanish-speaking voters who are currently excluded from its core value. The app currently has 42 E2e tests passing, 0 ESLint errors, and Lighthouse 100/100 scores from Phase 1. Phase 2 adds a bilingual experience without regressions.

**The Core Change:** A language toggle switches the entire app experience — UI chrome, error messages, tips, footer, and most critically the personalized AI prompt output — between English and Spanish. The switch is instant (no reload), stateful (results remain visible), and persistent (localStorage). Architecture ensures adding a third language requires only new translation content, zero component changes.

**What Does NOT Change:** Application logic, data model, page layout, existing `data-testid` attributes, or any Phase 1 acceptance criteria.

---

## Product Vision

### Problem Statement

Spanish-speaking voters cannot effectively use the ballot research tool in its current English-only state. The AI prompt output — the core product value — is entirely in English, making it useless for Spanish-language chatbot sessions.

### Proposed Solution

Full bilingual support (English + Spanish) using a React Context + typed TypeScript translation store. A fixed-position language toggle is always visible. Switching language updates all UI text and the prompt output in real time. The page `lang` attribute updates for screen reader compatibility.

### Key Differentiators

- Prompt localization (not just UI chrome translation)
- Fluent civic Spanish written for native speakers, not machine-translated
- No external i18n library — typed TypeScript, simple, extensible
- SSR hydration guard prevents React hydration mismatch
- Error-as-key pattern enables live error translation (FR-018)

---

## Success Criteria

### User Success

- Spanish-mode sessions result in a usable AI prompt that can be pasted into a Spanish-language chatbot
- Language switch is discoverable (top-right, always visible) and operable by keyboard
- Language preference persists across page refreshes
- App state (zip results) is preserved when language switches

### Technical Success

- 100% of 42 Phase 1 E2e tests continue to pass
- New E2e and unit tests cover all i18n functionality
- ESLint: 0 errors, 0 warnings
- Bundle: shared first load JS ≤130 kB
- Lighthouse accessibility: 100 (WCAG AA maintained)
- `lang` attribute on `<html>` updates correctly on switch

### Business Success

- Spanish-speaking voters can use the tool from day 1 post-launch
- Civic organizations can demonstrate the tool in Spanish outreach
- Architecture is confirmed extensible to a third language

---

## User Journeys

### Journey 1: Spanish-Dominant First-Time Voter (María)

1. Arrives at site via WhatsApp link — sees English interface
2. Notices "Español" toggle in top-right corner (always visible)
3. Clicks toggle — all text switches to Spanish instantly, no reload
4. Enters her zip code in the now-Spanish input field
5. Gets results with Spanish labels, deadline status in Spanish ("Quedan 12 días")
6. Copies Spanish AI prompt and pastes into Claude in Spanish
7. Refreshes page — language is still Spanish (localStorage persisted)

**Critical moment:** Step 2. If the toggle is not discoverable at first glance, María leaves. Fixed top-right position with "Español" text (not icon-only) ensures discoverability.

### Journey 2: Bilingual Voter Switching Mid-Session (Carlos)

1. Enters zip code in English — sees results
2. Realizes his mother is watching — switches to Español
3. **Results remain visible** (state preserved on switch)
4. Clicks "Copiar en el portapapeles" — prompt is in Spanish
5. Switches back to English for himself — results still visible

**Critical moment:** Step 3. App state preservation on language switch is non-negotiable.

### Journey 3: Voter Who Submitted English, Then Switched to Spanish

1. Submits zip code — English error: "Please enter a valid 5-digit zip code"
2. Switches to Spanish
3. Error updates to "Por favor ingresa un código postal válido de 5 dígitos" **without re-submission**

**Critical moment:** Step 3. This is the FR-018 / error-as-key pattern. Errors must be stored as translation keys, not translated strings.

### Journey 4: Screen Reader User Switching Language

1. Navigating with screen reader, finds language toggle (labeled "Cambiar a Español")
2. Activates toggle with Enter/Space
3. Screen reader announces "Idioma cambiado a español" via aria-live region
4. `lang` attribute updates to "es" — screen reader uses Spanish pronunciation rules

---

## Domain Requirements

### Civic Technology

- All translated content must be accurate and usable for civic purposes
- Spanish civic terminology must be consistent: "código postal", "boleta", "fecha límite de registro", "votación anticipada", "identificación para votar"
- Date formatting must follow Spanish locale conventions ("3 de abril de 2026")
- "tú" (informal) voice throughout — consistent with the conversational English original
- Deadline status strings: "Quedan X días" / "Plazo pasado" must be clear to non-technical voters

### Accessibility (WCAG 2.1 AA)

- `<html lang>` attribute must update on language switch (WCAG 3.1.1 — Language of Page)
- Language toggle must be keyboard operable (Enter/Space)
- Language toggle must have visible focus indicator
- `aria-live="polite"` region announces language change
- Toggle must have accessible name in both languages (`aria-label` updates with current language)
- Spanish text that is longer than English equivalent must not break layouts at any breakpoint

---

## Innovation Patterns

### Hydration Guard Pattern

**Why It Matters:** Next.js pre-renders HTML on the server, which has no access to localStorage. If `LanguageProvider` initializes from localStorage on the server, React's hydration diff will fail (server rendered "en", client renders "es" → hydration error).

**Pattern:** `LanguageProvider` initializes to `'en'` unconditionally. After mount, `useEffect` reads localStorage and applies stored preference. This two-pass render eliminates hydration mismatches without page flash.

### Error-as-Key Pattern (FR-018)

**Why It Matters:** React state stores strings. If an error message string is stored in component state, it captures the translated string at the moment of submission. Switching language later does not update the frozen string.

**Pattern:** State stores translation keys (e.g., `'errors.zipInvalid'`), never translated strings. The render layer calls `t(errorKey)` to display — this re-evaluates on every render with current language context, so errors update live on language switch.

### Typed Translation Store

**Why It Matters:** For a 2-language app, missing a translation key causes a runtime `undefined` display bug. TypeScript can prevent this at compile time.

**Pattern:** `Translations` interface defines every key. EN and ES objects must implement `Translations` completely. TypeScript build fails if any key is missing from either language.

---

## Project Type Requirements

**Type:** Web App Extension (brownfield, adding i18n to existing Phase 1 app)

- Must not break any Phase 1 functionality
- All existing `data-testid` attributes must remain unchanged
- New `data-testid="language-toggle"` is additive
- Component interfaces are extended, not replaced (e.g., `generatePrompt(state, lang?)`)
- Default exports and function signatures remain backward compatible

---

## MVP Scope

### In Scope

**1. Translation Infrastructure**
- `src/lib/translations.ts` — `Translations` interface + EN + ES records (all UI strings)
- `src/lib/i18n.tsx` — `LanguageProvider` with SSR hydration guard, `useLanguage()` hook, localStorage persistence
- `document.documentElement.lang` sync on language switch

**2. Language Toggle Component**
- `src/components/LanguageToggle.tsx`
- Fixed position top-right (`position: fixed; top: 1rem; right: 1rem`)
- Shows non-active language: "Español" in English mode, "English" in Spanish mode
- `data-testid="language-toggle"`
- Keyboard accessible (`<button>`, Enter/Space)
- `aria-label` updates with language context
- `aria-live="polite"` region for switch announcement

**3. Component Translation**
All existing components updated to use `useLanguage()`:
- `ZipForm.tsx` — label, placeholder, submit button, all error messages (error-as-key pattern)
- `StateInfoCard.tsx` — all field labels, deadline status strings
- `PromptOutput.tsx` — section headers, copy button, instructions
- `BallotToolClient.tsx` — multi-state selector prompt, state results wrapper
- `app/page.tsx` or `PageContent.tsx` — hero, tips, footer, skip-to-content

**4. Prompt Localization**
- `BALLOT_PROMPT_ES` — complete Spanish translation of BALLOT_PROMPT.md in "tú" voice
- `buildContextBlockEs(state)` — Spanish structural labels, English data values
- `generatePrompt(state, lang?)` extended with optional lang param (defaults to 'en')

**5. Date/Dynamic String Localization**
- `formatDate(date, locale?)` — uses `Intl.DateTimeFormat`, handles en/es locale
- `getDeadlineStatus(date, lang?)` — returns "Quedan X días" / "X days left" etc.

**6. Tests**
- Unit tests: translations completeness, i18n hook, prompt Spanish output, date locale, deadline status Spanish
- E2e tests: toggle click switches language, Spanish UI renders, state preserved on switch, language persists across navigation

### Out of Scope (Phase 2)

Per PHASE2_SPEC.md:
- Translating election data values from JSON (state names, election names, ID types)
- Auto-detecting browser language
- URL-based language routing
- RTL language support
- Third language implementation (architecture supports it; content not created)
- Chatbot name translation (proper nouns)
- Data model changes

---

## Functional Requirements

### Language Toggle

- FR-001: User can switch the app language between English and Spanish via a visible toggle
- FR-002: The language toggle is visible at all times, regardless of scroll position
- FR-003: Language switch takes effect immediately without a page reload
- FR-004: Language switch does not clear or reset application state (submitted zip code results remain visible)
- FR-005: The selected language persists when the user refreshes the page
- FR-006: The language toggle is keyboard accessible and operable via Enter and Space keys
- FR-007: The toggle has `data-testid="language-toggle"` for automated testing

### UI Translation — English Mode

- FR-008: All UI text (labels, placeholders, buttons, instructions, tips, footer) is displayed in English when English is active
- FR-009: All error messages are displayed in English when English is active
- FR-010: The AI prompt output (main prompt + context block) is generated in English when English is active

### UI Translation — Spanish Mode

- FR-011: All UI text (labels, placeholders, buttons, instructions, tips, footer) is displayed in Spanish when Spanish is active
- FR-012: All error messages are displayed in Spanish when Spanish is active
- FR-013: The AI prompt output (main prompt + context block) is generated in Spanish when Spanish is active
- FR-014: Date values are formatted in Spanish locale convention (e.g., "3 de abril de 2026") when Spanish is active
- FR-015: Deadline status indicators display in Spanish (e.g., "Quedan X días", "Plazo pasado") when Spanish is active

### Prompt Localization

- FR-016: The full ballot prompt (Part 1) is available as a complete, fluent Spanish translation
- FR-017: The pre-filled context block (Part 2) uses Spanish structural labels when Spanish is active, with data values (state name, election name, dates, URLs) in their original form
- FR-018: Error messages update to the active language when language is switched, without requiring re-submission of the form

### Accessibility

- FR-019: The page `lang` attribute updates to match the active language when language is switched
- FR-020: Screen readers receive an announcement when the language is switched
- FR-021: The language toggle has an accessible name that describes its purpose in the current language

### Architecture

- FR-022: All Phase 1 acceptance criteria continue to pass after Phase 2 implementation
- FR-023: All existing `data-testid` attributes from Phase 1 remain unchanged
- FR-024: Translation content is stored separately from component code (no hardcoded translated strings in JSX)

---

## Non-Functional Requirements

### Performance

- Language switch must complete in ≤100ms (client-side React re-render, no network call)
- No additional bundle size from translation library (zero new dependencies for i18n)
- Translation data included in initial JS bundle (no lazy loading needed for 2-language app)

### Accessibility

- WCAG 2.1 AA compliance maintained for all new UI elements
- Language toggle passes WCAG 4.1.2 (Name, Role, Value) — `button` element, aria-label, keyboard
- WCAG 3.1.1 (Language of Page) — `html[lang]` attribute updates on switch
- Spanish text layout maintains readability at all breakpoints (Spanish text ~30% longer on average)
- Color contrast ratio ≥4.5:1 for all translated text

### Reliability

- SSR hydration must complete without React hydration mismatch errors
- localStorage failure (private browsing, full storage) must not crash the app — default to 'en'
- Language toggle must work in all supported browsers (Chrome, Firefox, Safari, Edge)

### Maintainability

- Adding a third language requires changes only to `translations.ts` (new record), `getDeadlineStatus` (new case), and toggle UI — zero component changes
- TypeScript compilation must fail if any translation key is missing from either language record
- Civic Spanish terminology must be consistent across all translation keys (use glossary)

---

## Acceptance Criteria Checklist

### Language Toggle
- [ ] Toggle visible at all times, fixed position top-right
- [ ] Clicking toggle switches all UI text between EN and ES
- [ ] Language preference persists across page refreshes
- [ ] Language switch does not reset app state (results remain visible)
- [ ] `data-testid="language-toggle"` present
- [ ] Keyboard accessible (Enter/Space)

### Translated Content
- [ ] All UI labels, instructions, error messages, static content in both languages
- [ ] Full AI prompt (Part 1) available in fluent Spanish
- [ ] Context block (Part 2) generates correctly in both languages
- [ ] Date formatting follows language conventions
- [ ] Deadline status indicators in selected language
- [ ] Tips section translated
- [ ] Footer translated

### Data Handling
- [ ] State election data values display correctly regardless of language
- [ ] Injected data in prompt context block works in both languages
- [ ] No regressions from Phase 1

### Accessibility
- [ ] `html[lang]` attribute updates on language switch
- [ ] Language toggle keyboard-accessible
- [ ] Spanish text does not break layouts at any breakpoint
- [ ] All Phase 1 accessibility requirements still pass

### Architecture
- [ ] Adding a third language requires only new translation content
- [ ] Translation content separated from component code
- [ ] TypeScript enforces translation completeness
