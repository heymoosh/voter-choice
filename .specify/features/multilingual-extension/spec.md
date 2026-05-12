# Feature Specification: Multilingual Extension (Spanish Language Support)

**Feature Name**: multilingual-extension
**Created**: 2026-05-11
**Status**: Ready for Planning
**Source**: docs/PHASE2_SPEC.md

---

## Overview

Extend the existing ballot research tool to support both English and Spanish. A user can toggle between languages at any time. All user-facing text — UI labels, instructions, error messages, static content, and the customized AI prompt output — must be available in both languages.

The architecture must make adding a third language straightforward — requiring only new translation content, not structural changes to components or logic.

---

## User Scenarios & Testing

### Language Toggle Flow

1. User visits the page (English is the default)
2. User sees a language toggle (e.g., "EN / ES") in a consistently visible, discoverable position
3. User clicks/activates the toggle
4. All user-facing text updates immediately to Spanish, without a page reload
5. Application state is preserved (any displayed zip code results remain visible)
6. User refreshes the page — language preference is restored from browser storage
7. User switches back to English — all text updates back immediately

### Bilingual Prompt Flow (Spanish)

1. User switches to Spanish
2. User enters a zip code and submits
3. System displays state info card with labels in Spanish (data values remain in English)
4. System generates the AI prompt using the complete Spanish translation of BALLOT_PROMPT.md
5. The pre-filled context block is in Spanish (labels in Spanish, injected data values unchanged)
6. User copies the Spanish prompt and pastes into a chatbot

### Bilingual Error Flow

1. User switches to Spanish
2. User submits empty zip — error message appears in Spanish
3. User submits invalid zip — error appears in Spanish
4. User submits unknown zip — not-found message appears in Spanish

### Phase 1 Regression Flow

1. User loads page in English (default)
2. All Phase 1 acceptance criteria continue to pass unchanged
3. All existing `data-testid` attributes remain present and functional

---

## Functional Requirements

### FR-L01: Language Toggle

The page shall display a language toggle (`data-testid="language-toggle"`) that is visible at all times regardless of scroll position. The toggle shall switch between "English" and "Español". It shall be operable via keyboard (Enter/Space) and announced to screen readers.

### FR-L02: Default Language

Default language shall be English. If no stored preference exists, English is used.

### FR-L03: Language Persistence

The selected language shall be stored in browser storage (localStorage). On page refresh, the stored preference shall be restored before first render.

### FR-L04: State Preservation on Language Switch

Switching language shall NOT reset application state. If a zip code has been submitted and results are displayed, they shall remain displayed after the language toggle is activated.

### FR-L05: All UI Text Translated

Every piece of user-facing text shall be available in both English and Spanish:
- Hero section headline and subtitle
- Chatbot names and link labels (chatbot names — Claude, ChatGPT, etc. — stay in English as proper nouns)
- Zip code input label and placeholder text
- Submit button text
- All error messages (validation errors, zip not found, no upcoming election, etc.)
- State info card labels ("Election," "Registration deadlines," "Early voting," etc.)
- Deadline status indicators ("12 days left," "Passed," etc.)
- State selector prompt
- Copy button text ("Copy to Clipboard" / "Copied!")
- Instructions above the prompt output
- Tips section content
- Footer text
- Accessibility text (skip-to-content, ARIA labels, screen reader announcements)

### FR-L06: Full Spanish Ballot Prompt

In Spanish mode, the main ballot research prompt (Part 1 of the output) shall be a complete, standalone Spanish translation of the full BALLOT_PROMPT.md text. It shall read as fluent, natural Spanish using "tú" (informal) voice. The translation must be stored as a complete document, not assembled from fragments.

### FR-L07: Spanish Context Block

In Spanish mode, the pre-filled context block (Part 2 of the output) shall use Spanish labels and structure. Data values injected from JSON (state names, election names, URLs, dates) shall remain in their original form from the JSON.

### FR-L08: Date Formatting by Language

Dates shall display in U.S. format in English (e.g., "March 3, 2026") and in Spanish format in Spanish (e.g., "3 de marzo de 2026"). Deadline status indicators shall also translate ("12 days left" → "Quedan 12 días", "Passed" → "Vencido").

### FR-L09: Page Language Attribute

When language changes, the page's `lang` attribute shall update accordingly (`lang="en"` ↔ `lang="es"`).

### FR-L10: Accessible Toggle

The language toggle shall be keyboard-navigable and operable via Enter/Space. Language changes shall be announced to screen readers.

### FR-L11: Layout Resilience

The UI shall accommodate Spanish text expansion gracefully at all breakpoints (mobile, tablet, desktop) without broken layouts.

### FR-L12: Translation Architecture

Translation strings shall be separated from component code (not hardcoded in JSX/TSX). Adding a third language shall require only providing new translation content.

---

## Error Messages

| English | Spanish |
|---------|---------|
| "Please enter a zip code" | "Por favor ingresa un código postal" |
| "Please enter a valid 5-digit zip code" | "Por favor ingresa un código postal válido de 5 dígitos" |
| "We don't have data for this zip code yet..." | "Aún no tenemos datos para este código postal..." |
| "This zip code spans multiple states. Which state are you voting in?" | "Este código postal abarca varios estados. ¿En qué estado vas a votar?" |
| "Registration deadlines for this election have passed..." | "Las fechas límite de registro para esta elección ya pasaron..." |
| "No upcoming elections found for [State]..." | "No se encontraron elecciones próximas para [State]..." |

---

## Data Handling Constraints

- State election data values (state names, election names, ID types, voting rule details from JSON) display in English in both language modes
- The `earlyVoting.notes` and `votingRules.phonesAtPollsDetail` fields remain in English for Phase 2 but the display layer must not assume these are always in the UI language
- No changes to data model or JSON schema

---

## Out of Scope

- Translating election data values (state names, election names, accepted ID types, voting rule details from JSON)
- Auto-detecting browser language
- URL-based language routing (e.g., `/es/`)
- Right-to-left (RTL) language support
- More than two languages (architecture must support it; only English and Spanish are implemented)
- Translating chatbot names (Claude, ChatGPT, Gemini, Grok — proper nouns)
- Any changes to the data model or JSON schema

---

## Success Criteria

- All Phase 1 acceptance criteria pass unchanged in English (default) mode
- Language toggle is visible, keyboard-accessible, and switches all UI text without page reload or state loss
- Language preference persists across page refreshes
- Spanish prompt (Part 1) is a complete, fluent Spanish translation
- Spanish context block (Part 2) generates correctly with Spanish labels
- Date formatting follows locale conventions in both languages
- Adding a third language requires only new translation content (no component structural changes)
- `data-testid="language-toggle"` is present on the toggle element

---

## Assumptions

- Browser localStorage is available; if unavailable, default to English silently
- Spanish translation uses "tú" (informal) voice throughout
- The toggle is positioned in the header/nav area, top-right, on both desktop and mobile
- Chatbot proper names (Claude, ChatGPT, Gemini, Grok) are not translated
- Registration data values from JSON (election names, accepted IDs, etc.) are not translated in Phase 2
