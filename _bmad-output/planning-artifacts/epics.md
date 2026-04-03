---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - 'docs/PHASE2_SPEC.md'
---

# voter-choice (Phase 2) - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the Spanish language support extension (Phase 2), decomposing the 24 FRs and NFRs from the PRD into implementable stories organized by user value.

## Requirements Inventory

### Functional Requirements

- FR-001: User can switch the app language between English and Spanish via a visible toggle
- FR-002: The language toggle is visible at all times, regardless of scroll position
- FR-003: Language switch takes effect immediately without a page reload
- FR-004: Language switch does not clear or reset application state (submitted zip code results remain visible)
- FR-005: The selected language persists when the user refreshes the page
- FR-006: The language toggle is keyboard accessible and operable via Enter and Space keys
- FR-007: The toggle has `data-testid="language-toggle"` for automated testing
- FR-008: All UI text is displayed in English when English is active
- FR-009: All error messages are displayed in English when English is active
- FR-010: The AI prompt output is generated in English when English is active
- FR-011: All UI text is displayed in Spanish when Spanish is active
- FR-012: All error messages are displayed in Spanish when Spanish is active
- FR-013: The AI prompt output is generated in Spanish when Spanish is active
- FR-014: Date values are formatted in Spanish locale convention when Spanish is active
- FR-015: Deadline status indicators display in Spanish when Spanish is active
- FR-016: The full ballot prompt (Part 1) is available as a complete, fluent Spanish translation
- FR-017: The pre-filled context block (Part 2) uses Spanish structural labels when Spanish is active, with data values in original form
- FR-018: Error messages update to the active language when language is switched, without re-submission
- FR-019: The page `lang` attribute updates to match the active language when language is switched
- FR-020: Screen readers receive an announcement when the language is switched
- FR-021: The language toggle has an accessible name that describes its purpose in the current language
- FR-022: All Phase 1 acceptance criteria continue to pass after Phase 2 implementation
- FR-023: All existing `data-testid` attributes from Phase 1 remain unchanged
- FR-024: Translation content is stored separately from component code

### NonFunctional Requirements

- NFR-P1: Language switch completes in ≤100ms (client-side re-render, no network call)
- NFR-P2: No additional bundle size from i18n library (zero new dependencies)
- NFR-A1: WCAG 2.1 AA compliance maintained for all new UI elements
- NFR-A2: Toggle passes WCAG 4.1.2 (Name, Role, Value)
- NFR-A3: WCAG 3.1.1 (Language of Page) — `html[lang]` updates on switch
- NFR-A4: Spanish text layout maintains readability at all breakpoints
- NFR-R1: SSR hydration must complete without React hydration mismatch errors
- NFR-R2: localStorage failure must not crash the app (default to 'en')
- NFR-M1: Adding a third language requires changes only to translations.ts and function params — zero component changes
- NFR-M2: TypeScript compilation must fail if any translation key is missing from either language

### Additional Requirements

- Architecture: No i18n library — plain TypeScript typed store + React Context
- Architecture: SSR hydration guard — initialize to 'en' on server, useEffect applies stored preference
- Architecture: Error-as-key pattern — state stores translation keys, not translated strings
- Architecture: `generatePrompt(state, zip, lang?)` — optional lang param, defaults to 'en'
- Architecture: `formatDate(date, lang?)` — uses `Intl.DateTimeFormat`, defaults to 'en'
- Architecture: `getDeadlineStatus(date, today, lang?)` — optional lang param, defaults to 'en'
- Architecture: Implementation sequence — translations.ts first, then i18n.tsx, then LanguageToggle, then page wrapper, then date/prompt utils, then all components

### UX Design Requirements

- UX-DR1: Language toggle fixed position top-right (position: fixed, top: 1rem, right: 1rem, z-index: 50)
- UX-DR2: Toggle shows non-active language ("Español" in EN mode, "English" in ES mode)
- UX-DR3: No flag icons — full language names only ("Español" / "English")
- UX-DR4: Instant switch, no animation — synchronous React context update
- UX-DR5: aria-live="polite" region announces language change to screen readers
- UX-DR6: Spanish text uses `word-break: break-word` — no truncation on any translated strings
- UX-DR7: Toggle aria-label describes the action ("Switch to Spanish" / "Switch to English")
- UX-DR8: Toggle focus ring visible (not suppressed with outline: none)

### FR Coverage Map

FR-001: Epic 2 — Language toggle component with setLang handler
FR-002: Epic 2 — Fixed position CSS
FR-003: Epic 1 — React Context synchronous update
FR-004: Epic 1 — Language context separate from app state
FR-005: Epic 1 — localStorage read/write in LanguageProvider
FR-006: Epic 2 — Native `<button>` element
FR-007: Epic 2 — data-testid attribute on button
FR-008: Epic 3 — EN record in translations.ts used by all components
FR-009: Epic 3 — Error key lookups return EN strings
FR-010: Epic 4 — generatePrompt defaults to 'en'
FR-011: Epic 3 — ES record in translations.ts used by all components
FR-012: Epic 3 — Error key lookups return ES strings
FR-013: Epic 4 — generatePrompt(state, zip, 'es') returns Spanish prompt
FR-014: Epic 4 — formatDate(date, 'es') returns Spanish locale date
FR-015: Epic 4 — getDeadlineStatus(date, today, 'es') returns Spanish strings
FR-016: Epic 4 — BALLOT_PROMPT_ES constant
FR-017: Epic 4 — buildContextBlockEs() function
FR-018: Epic 3 — Error-as-key pattern in ZipForm
FR-019: Epic 1 — document.documentElement.lang = lang in useEffect
FR-020: Epic 2 — aria-live region in LanguageToggle
FR-021: Epic 2 — aria-label updated per active language
FR-022: Epic 5 — All 42 Phase 1 E2e tests run and pass
FR-023: Epic 5 — No existing data-testid attributes removed or modified
FR-024: Epic 1 — translations.ts is a separate file, not inline in components

## Epic List

### Epic 1: i18n Foundation Infrastructure

Establish the language state management foundation that all other epics build upon. After this epic, the app has a `LanguageProvider` that persists language to localStorage, initializes safely on SSR, syncs the `lang` attribute, and exposes `useLanguage()` to all consuming components. The translations store is typed and complete.
**FRs covered:** FR-003, FR-004, FR-005, FR-019, FR-024, NFR-M2, NFR-R1, NFR-R2

### Epic 2: Language Toggle Component

Add the visible, accessible language switch control. After this epic, users can switch language via a fixed-position button that is keyboard operable, has an accessible name, and announces the switch to screen readers.
**FRs covered:** FR-001, FR-002, FR-006, FR-007, FR-020, FR-021, UX-DR1 through UX-DR8

### Epic 3: UI Translation — All Components

Update all UI components (ZipForm, StateInfoCard, PromptOutput, BallotToolClient, page-level content) to use `useLanguage()`. After this epic, switching language changes all UI text including error messages (which update live without re-submission).
**FRs covered:** FR-008, FR-009, FR-011, FR-012, FR-018

### Epic 4: Prompt and Date Localization

Add Spanish prompt output (both main prompt and context block) and locale-aware date/deadline formatting. After this epic, switching to Spanish delivers a complete Spanish experience including the AI prompt the user copies.
**FRs covered:** FR-010, FR-013, FR-014, FR-015, FR-016, FR-017

### Epic 5: Testing, Regression, and Accessibility Verification

Extend the test suite with E2e tests for the language toggle, Spanish UI rendering, state preservation, and localStorage persistence. Verify all 42 Phase 1 tests still pass and accessibility requirements are met.
**FRs covered:** FR-022, FR-023, NFR-A1, NFR-A2, NFR-A3, NFR-A4

---

## Epic 1: i18n Foundation Infrastructure

Establish the core language state management layer. This epic creates the translation data store and the React context that all other epics depend on.

### Story 1.1: Create Typed Translation Store

As a developer,
I want a typed TypeScript translation store with complete EN and ES records,
So that all UI strings have tested translations and TypeScript enforces completeness at compile time.

**Acceptance Criteria:**

**Given** a `Translations` TypeScript interface is defined with all required keys
**When** `src/lib/translations.ts` is compiled
**Then** TypeScript fails compilation if any key is missing from either the EN or ES record

**Given** the EN record in translations.ts
**When** any translation key is accessed via `t(key)`
**Then** the function returns a non-empty English string (no `undefined` values)

**Given** the ES record in translations.ts
**When** any translation key is accessed via `t(key)`
**Then** the function returns a non-empty Spanish string (no `undefined` values)

**Given** the full set of translation keys
**When** the keys are enumerated
**Then** they cover: hero, form (label/placeholder/submit), errors (zipEmpty/zipInvalid/zipNotFound/multiState/deadlinePassed/noElection), stateInfo (all field labels), deadline (daysLeft/passed), prompt (heading/instructions/copyButton/copiedButton), tips (heading + all tip strings), footer (credit), a11y (skipToContent/langToggleToEs/langToggleToEn/langChangedToEs/langChangedToEn)

**Given** translations.ts as a standalone module
**When** it is imported
**Then** it exports `EN: Translations`, `ES: Translations`, and a `getTranslation(lang, key)` utility function

### Story 1.2: Implement LanguageProvider with SSR Hydration Guard

As a developer,
I want a `LanguageProvider` React context with SSR-safe initialization,
So that the app has a single source of truth for language state that persists to localStorage without causing React hydration errors.

**Acceptance Criteria:**

**Given** `src/lib/i18n.tsx` is loaded during SSR (Next.js server render)
**When** `LanguageProvider` initializes
**Then** `lang` is always `'en'` on the initial render (no localStorage access on server)

**Given** a user has `'es'` stored in `localStorage['voter-choice-lang']`
**When** the page finishes hydration (useEffect fires)
**Then** `lang` updates to `'es'` (stored preference applied after hydration)

**Given** `localStorage` is unavailable (private browsing, full storage)
**When** `LanguageProvider` initializes
**Then** `lang` defaults to `'en'` without throwing an error

**Given** `lang` is updated via `setLang('es')`
**When** the effect runs
**Then** `document.documentElement.lang` is set to `'es'` AND `localStorage['voter-choice-lang']` is set to `'es'`

**Given** `useLanguage()` is called from any client component
**When** language context is accessed
**Then** it returns `{ lang, setLang, t }` where `t('form.label')` returns the correct string for the active language

**Given** `app/page.tsx` or a client wrapper component
**When** it renders
**Then** `LanguageProvider` wraps all content that needs translation context

---

## Epic 2: Language Toggle Component

Add the language switch UI element that users interact with to change language. This epic produces a complete, accessible `LanguageToggle` component ready for user testing.

### Story 2.1: Build Accessible Language Toggle Component

As a voter visiting the site,
I want a visible, always-accessible language toggle button,
So that I can switch between English and Spanish at any point while using the app.

**Acceptance Criteria:**

**Given** the user is on any part of the page (top, middle, bottom of scroll)
**When** they look for the language toggle
**Then** the toggle is visible in the top-right corner (position: fixed, top: 1rem, right: 1rem)

**Given** the app is in English mode
**When** the language toggle renders
**Then** it displays the text "Español" (showing the non-active language)

**Given** the app is in Spanish mode
**When** the language toggle renders
**Then** it displays the text "English" (showing the non-active language)

**Given** the language toggle in English mode
**When** a user clicks it
**Then** the app switches to Spanish immediately without a page reload

**Given** the language toggle in Spanish mode
**When** a user clicks it
**Then** the app switches to English immediately without a page reload

**Given** the language toggle
**When** it renders
**Then** it has `data-testid="language-toggle"` attribute

**Given** a keyboard user tabs to the language toggle
**When** they press Enter or Space
**Then** the language switches (same behavior as mouse click)

**Given** the language toggle in English mode
**When** rendered in the DOM
**Then** it has `aria-label="Switch to Spanish"` (describes the action)

**Given** the language toggle in Spanish mode
**When** rendered in the DOM
**Then** it has `aria-label="Cambiar a Inglés"` (describes the action in Spanish)

**Given** a screen reader user activates the language toggle
**When** the language switches
**Then** an `aria-live="polite"` region announces "Idioma cambiado a español" (ES) or "Language changed to English" (EN)

**Given** the language toggle
**When** it receives keyboard focus
**Then** a visible focus indicator (focus ring) is displayed (not suppressed)

---

## Epic 3: UI Translation — All Components

Update all user-facing components to consume `useLanguage()` and display text in the active language. This epic makes the entire UI bilingual — including error messages that update live on language switch.

### Story 3.1: Translate ZipForm with Error-as-Key Pattern

As a Spanish-speaking voter,
I want the zip code form to appear in Spanish when Spanish is active,
So that I can understand the labels, placeholder, and any error messages in my language.

**Acceptance Criteria:**

**Given** Spanish is the active language
**When** ZipForm renders
**Then** the zip code label shows "Código postal"
**And** the input placeholder shows "Ingresa tu código postal"
**And** the submit button shows "Encontrar Mi Boleta" (or equivalent spec translation)

**Given** Spanish is active and user submits an empty zip code
**When** the error appears
**Then** the error message reads "Por favor ingresa un código postal"

**Given** Spanish is active and user submits an invalid zip code
**When** the error appears
**Then** the error message reads "Por favor ingresa un código postal válido de 5 dígitos"

**Given** an error message is visible in English
**When** the user switches to Spanish
**Then** the error message immediately updates to Spanish WITHOUT requiring the user to re-submit the form (FR-018 error-as-key pattern)

**Given** ZipForm's error state implementation
**When** examined in the source code
**Then** `setError()` stores a translation key (e.g., `'errors.zipInvalid'`), NOT a translated string

**Given** English is the active language
**When** ZipForm renders
**Then** all strings match Phase 1 behavior exactly (zero regression)

### Story 3.2: Translate StateInfoCard with Locale-Aware Dates

As a Spanish-speaking voter,
I want the state election information card to show all labels in Spanish and dates in Spanish format,
So that I can read my election information in my language.

**Acceptance Criteria:**

**Given** Spanish is active and state election data is displayed
**When** StateInfoCard renders
**Then** field labels are in Spanish: "Elección", "Fechas límite de registro", "Votación anticipada", "Identificación para votar", etc.

**Given** Spanish is active
**When** an election date is displayed (e.g., registration deadline)
**Then** the date uses Spanish locale format: "3 de abril de 2026" (not "April 3, 2026")

**Given** Spanish is active and a deadline is in the future
**When** deadline status is displayed
**Then** it reads "Quedan X días" (not "X days left")

**Given** Spanish is active and a deadline has passed
**When** deadline status is displayed
**Then** it reads "Plazo pasado" (or equivalent per spec) (not "Passed")

**Given** English is active
**When** StateInfoCard renders
**Then** all field labels and date formats match Phase 1 behavior exactly (zero regression)

**Given** election data values (state names, election names, voter ID types, URLs)
**When** displayed in either language
**Then** these values remain in English (data is not translated per Phase 2 scope)

### Story 3.3: Translate PromptOutput, Page Content, Tips, and Footer

As a Spanish-speaking voter,
I want all remaining UI text (prompt section, tips, footer, skip link) to appear in Spanish,
So that the entire page is consistent in Spanish mode.

**Acceptance Criteria:**

**Given** Spanish is active
**When** the PromptOutput section renders
**Then** the section heading, copy button text ("Copiar en el portapapeles"), and instructions are in Spanish

**Given** user copies the prompt in Spanish mode
**When** the copy button feedback appears
**Then** it shows "¡Copiado!" (not "Copied!")

**Given** Spanish is active
**When** the tips section renders
**Then** all tip content is in Spanish

**Given** Spanish is active
**When** the footer renders
**Then** the attribution reads "Creado por una persona usando herramientas de IA"

**Given** Spanish is active
**When** a screen reader user navigates
**Then** the skip-to-content link reads in Spanish

**Given** English is active
**When** any of these components render
**Then** they display Phase 1 English strings exactly (zero regression)

---

## Epic 4: Prompt and Date Localization

Localize the core product value — the AI chatbot prompt — plus locale-aware date and deadline formatting. This epic ensures the most important output (the copied prompt) is fully in Spanish when Spanish mode is active.

### Story 4.1: Extend Date and Deadline Utilities with Language Parameter

As a developer,
I want `formatDate` and `getDeadlineStatus` to accept an optional language parameter,
So that date display and deadline strings are locale-appropriate without changing Phase 1 callers.

**Acceptance Criteria:**

**Given** `formatDate(date, 'es')` is called
**When** the date is April 3, 2026
**Then** it returns "3 de abril de 2026" using `Intl.DateTimeFormat('es-MX')`

**Given** `formatDate(date)` is called without a language argument
**When** the date is April 3, 2026
**Then** it returns "April 3, 2026" (English default — backward compatible)

**Given** `getDeadlineStatus(deadline, today, 'es')` with 12 days remaining
**When** called
**Then** it returns a status object with label "Quedan 12 días"

**Given** `getDeadlineStatus(deadline, today, 'es')` with a passed deadline
**When** called
**Then** it returns a status object with label "Plazo pasado" (or equivalent)

**Given** `getDeadlineStatus(deadline, today)` called without language argument
**When** called
**Then** it returns Phase 1 English labels exactly (backward compatible)

**Given** all existing unit tests for `formatDate` and `getDeadlineStatus`
**When** run after this change
**Then** all tests pass (zero regression)

### Story 4.2: Add Spanish Ballot Prompt and Context Block

As a Spanish-speaking voter,
I want the AI chatbot prompt to be in natural Spanish when Spanish mode is active,
So that I can paste the prompt into a Spanish-language chatbot session and get useful civic guidance.

**Acceptance Criteria:**

**Given** `generatePrompt(state, zip, 'es')` is called
**When** executed
**Then** it returns a prompt that begins with the Spanish main prompt (`BALLOT_PROMPT_ES`) followed by the Spanish context block

**Given** the Spanish main prompt (`BALLOT_PROMPT_ES`)
**When** examined
**Then** it is a complete translation of BALLOT_PROMPT.md in "tú" (informal) voice
**And** uses consistent civic Spanish terminology: "código postal", "boleta", "fecha límite", "votación anticipada"
**And** is stored as a single complete string constant (NOT assembled from fragments)

**Given** the Spanish context block (`buildContextBlockEs(state, zip)`)
**When** generated for Texas (state code: TX)
**Then** structural labels are in Spanish: "¡Hola! Voy a votar en **Texas**", "Esto es lo que sé sobre mi próxima elección"
**And** data values remain in English: state name "Texas", election name, ID types, URLs

**Given** `generatePrompt(state, zip)` called without language argument
**When** executed
**Then** it returns the Phase 1 English prompt exactly (backward compatible — default lang = 'en')

**Given** PromptOutput component in Spanish mode
**When** state results are displayed
**Then** it calls `generatePrompt(stateData, zip, lang)` using current `lang` from `useLanguage()`
**And** the displayed prompt matches the language of the UI

---

## Epic 5: Testing, Regression, and Accessibility Verification

Validate the complete Phase 2 implementation through E2e tests for the language toggle, regression tests confirming Phase 1 still works, and accessibility checks for new elements.

### Story 5.1: E2e Tests for Language Toggle Functionality

As a QA engineer,
I want E2e tests covering language toggle behavior,
So that language switching is automatically verified against the full app on every CI run.

**Acceptance Criteria:**

**Given** the E2e test suite for the ballot tool
**When** the test file is examined
**Then** it includes tests that click `[data-testid="language-toggle"]` and assert Spanish UI

**Given** an E2e test that clicks the language toggle
**When** the toggle is clicked
**Then** the test asserts Spanish strings are visible (e.g., "Ingresa tu código postal" visible, "Enter your zip code" not visible)

**Given** an E2e test that submits a zip code in English, then clicks the toggle
**When** the language switches
**Then** the test asserts state results remain visible in the new language (state preservation)

**Given** an E2e test that clicks toggle and navigates away
**When** a new page load occurs
**Then** the test asserts the app opens in Spanish (localStorage persistence verified)

**Given** all 42 Phase 1 E2e tests
**When** run after Phase 2 implementation
**Then** all 42 tests pass without modification

**Given** the full E2e test suite (Phase 1 + Phase 2)
**When** run
**Then** total passing count is ≥42 (all Phase 1 tests) plus any new Phase 2 tests

### Story 5.2: Accessibility Verification for Language Features

As a voter using assistive technology,
I want the language toggle to be fully accessible,
So that keyboard users and screen reader users can switch language without barriers.

**Acceptance Criteria:**

**Given** the language toggle is examined for accessibility
**When** a11y tests run
**Then** the toggle is a native `<button>` element (not div/span)
**And** it has an `aria-label` that describes the action (not just the label)
**And** the `aria-label` is in the current active language

**Given** the page is rendered in English
**When** the `<html>` element's `lang` attribute is inspected
**Then** it reads `lang="en"`

**Given** the language toggle is clicked to switch to Spanish
**When** the `<html>` element's `lang` attribute is inspected after the switch
**Then** it reads `lang="es"` (WCAG 3.1.1 Language of Page compliance)

**Given** an `aria-live="polite"` region is present in LanguageToggle
**When** language switches to Spanish
**Then** the live region text updates to "Idioma cambiado a español"

**Given** the language toggle receives keyboard focus
**When** inspected visually
**Then** a focus indicator is visible (ring, outline, or equivalent — not suppressed)

**Given** the ESLint configuration
**When** the complete Phase 2 implementation is linted
**Then** ESLint reports 0 errors and 0 warnings
