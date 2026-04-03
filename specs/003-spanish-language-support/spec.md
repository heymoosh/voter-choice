# Feature Specification: Spanish Language Support

**Feature Branch**: `003-spanish-language-support`  
**Created**: 2026-04-03  
**Status**: Draft  
**Input**: User description: "Add Spanish language support per docs/PHASE2_SPEC.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Language Toggle (Priority: P1)

A Spanish-speaking voter visits the ballot research tool. They see a language toggle
prominently placed on the page. They activate it (click, keyboard, or screen reader)
and all page text immediately switches to Spanish without any page reload. Their
previously entered zip code and displayed election results remain visible. If they
refresh the page, the tool remembers their language preference.

**Why this priority**: Language access is the foundational feature. Without the toggle
working, no other translation work is usable. It is the entry point for all Spanish-
speaking users.

**Independent Test**: Load the app in English, enter a zip code to get results, click
the language toggle — all text should switch to Spanish while results remain displayed.

**Acceptance Scenarios**:

1. **Given** a page loaded in English, **When** the user activates the language toggle,
   **Then** all user-facing text switches to Spanish immediately without a page reload
   and without clearing the zip code field or election results.
2. **Given** a user has switched to Spanish, **When** they refresh the page,
   **Then** the page loads in Spanish (language preference is persisted in browser storage).
3. **Given** a page loaded in Spanish, **When** the user activates the language toggle,
   **Then** the page switches back to English.
4. **Given** any scroll position or screen size, **When** the user looks for the toggle,
   **Then** the toggle is visible without scrolling (fixed/always-visible position).
5. **Given** a keyboard-only user, **When** they tab to the language toggle and press
   Enter or Space, **Then** the language switches successfully.

---

### User Story 2 - Translated UI and Prompt Output (Priority: P1)

After switching to Spanish, a voter enters their zip code and submits the form. Every
label, error message, instruction, and status indicator they see is in Spanish. The AI
prompt they copy is a complete, fluent Spanish translation of the ballot research
prompt — including the pre-filled context block with their state's election information.

**Why this priority**: The prompt is the core product. A Spanish speaker who activates
the toggle but gets an English prompt has not been served. This is co-equal P1 with
the toggle.

**Independent Test**: Switch to Spanish, enter a valid zip code, submit → verify the
prompt output area shows the full Spanish prompt with a Spanish context block.

**Acceptance Scenarios**:

1. **Given** the page is in Spanish mode, **When** a user enters a valid zip code and
   submits, **Then** the state info card labels appear in Spanish and the generated
   prompt is the full Spanish ballot-research prompt.
2. **Given** the page is in Spanish mode, **When** the context block is generated,
   **Then** the structure and labels of the context block are in Spanish, while data
   values (state name, election name, URLs) remain in their original form.
3. **Given** the page is in Spanish mode, **When** the user's zip spans multiple states,
   **Then** the state selector prompt appears in Spanish.
4. **Given** the page is in Spanish mode, **When** the user copies the prompt,
   **Then** the copy button label is in Spanish ("Copiar al portapapeles" / "¡Copiado!").

---

### User Story 3 - Spanish Error Messages (Priority: P2)

A Spanish-speaking voter encounters an error condition (invalid zip code, zip not
found, no upcoming elections). All error messages display in Spanish.

**Why this priority**: Error recovery is essential for usability, but secondary to the
happy path.

**Independent Test**: With language set to Spanish, submit an empty form, an invalid
zip, and an unknown zip — verify all error messages appear in Spanish.

**Acceptance Scenarios**:

1. **Given** Spanish mode and an empty zip submission, **When** the user submits,
   **Then** the error "Por favor ingresa un código postal" is displayed.
2. **Given** Spanish mode and an invalid zip (non-5-digit), **When** submitted,
   **Then** the error "Por favor ingresa un código postal válido de 5 dígitos" displays.
3. **Given** Spanish mode and a zip code not in the database, **When** submitted,
   **Then** the error "Aún no tenemos datos para este código postal..." displays.
4. **Given** Spanish mode and a zip with no upcoming elections, **When** submitted,
   **Then** a Spanish message about no upcoming elections is displayed.

---

### User Story 4 - Spanish Date and Status Formatting (Priority: P2)

Election dates and deadline status indicators displayed in Spanish mode follow Spanish
date conventions and are translated.

**Why this priority**: Dates in wrong language/format reduce trust in the tool.

**Independent Test**: Switch to Spanish, look at displayed election dates and deadline
status badges — they should read "3 de marzo de 2026" and "Quedan 12 días", not
"March 3, 2026" or "12 days left".

**Acceptance Scenarios**:

1. **Given** Spanish mode, **When** an election date is displayed,
   **Then** dates follow Spanish format (e.g., "3 de marzo de 2026").
2. **Given** Spanish mode, **When** deadline status is displayed,
   **Then** status indicators use Spanish text (e.g., "Quedan 12 días", "Pasado").

---

### User Story 5 - Tips, Footer, and Accessibility Text Translated (Priority: P3)

The tips section, footer attribution, and accessibility-only text (skip link,
ARIA labels) are all available in Spanish.

**Why this priority**: Lower priority than core flow but required for complete
language coverage. Missing translations here break the principle of uniform language.

**Independent Test**: Switch to Spanish, scroll to tips and footer — verify Spanish
text. Check page source for `lang="es"` on `<html>` and verify skip link text is Spanish.

**Acceptance Scenarios**:

1. **Given** Spanish mode, **When** the tips section is visible,
   **Then** all tip content is displayed in Spanish.
2. **Given** Spanish mode, **When** the footer is visible,
   **Then** footer text reads "Creado por una persona usando herramientas de IA".
3. **Given** Spanish mode, **When** the page `lang` attribute is inspected,
   **Then** `<html lang="es">` is set.
4. **Given** Spanish mode, **When** a keyboard user activates the skip link,
   **Then** the skip link text is in Spanish.

---

### Edge Cases

- What happens when the page loads for the first time with no stored preference?
  → Default to English.
- What if the browser storage is unavailable (private mode, disabled storage)?
  → Gracefully fall back to English on each load; no error thrown.
- What if a translation key is missing for a particular string?
  → Fall back to the English string; do not render a blank or broken label.
- How does the UI handle Spanish text that is significantly longer than English?
  → Layouts must flex to accommodate text expansion without clipping or overflow.
- Does switching language reset the zip input or results?
  → No. Application state is fully preserved on language switch.
- What about active error messages when the language is switched?
  → Active error messages currently displayed MUST update to the new language
    immediately when the toggle is activated — the displayed error string must
    reflect the new language without requiring the user to re-submit.
- What about screen reader users — is the language change announced?
  → Yes. The `lang` attribute update and/or an `aria-live` region must notify
    screen readers of the language change.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The page MUST display a language toggle control visible at all times
  (independent of scroll position), accessible via keyboard, with `data-testid="language-toggle"`.
- **FR-002**: Activating the toggle MUST switch all user-facing text between English
  and Spanish without a page reload.
- **FR-003**: Application state (zip code field value, displayed election results)
  MUST be preserved when the language is switched.
- **FR-004**: Language preference MUST persist across page refreshes using browser
  storage (not URL parameters or server state).
- **FR-005**: The default language on first load MUST be English.
- **FR-006**: All user-facing UI text MUST be available in both English and Spanish,
  including: hero headline/subtitle, form labels, button text, error messages, state
  info card labels, deadline status indicators, state selector prompt, copy button,
  prompt instructions, tips section, footer, and accessibility text (skip link, ARIA labels).
- **FR-007**: The full AI ballot-research prompt (from BALLOT_PROMPT.md) MUST be
  available as a complete, fluent Spanish translation — not assembled from fragments.
- **FR-008**: The pre-filled context block MUST generate with Spanish structure/labels
  in Spanish mode; injected data values (state name, election name, URLs) remain English.
- **FR-009**: Date formatting MUST follow language conventions: U.S. format in English
  ("March 3, 2026"), Spanish format in Spanish ("3 de marzo de 2026").
- **FR-010**: Deadline status indicators MUST display in the selected language.
- **FR-011**: The page `<html>` `lang` attribute MUST reflect the active language
  ("en" or "es") at all times, updating immediately on language switch.
- **FR-012**: All translated text MUST maintain WCAG AA color contrast ratios.
- **FR-013**: Layouts MUST accommodate Spanish text expansion without clipping, overflow,
  or broken layouts at mobile (< 640px), tablet (640–1024px), and desktop (> 1024px).
- **FR-014**: Translation content MUST be separated from component code; no hardcoded
  UI strings in component JSX/TSX files.
- **FR-015**: Adding a third language MUST require only new translation content —
  no structural changes to components or logic.
- **FR-016**: All Phase 1 acceptance criteria (42 Playwright e2e tests) MUST continue
  to pass after Phase 2 implementation.
- **FR-018**: When the language is switched while an error message is actively displayed,
  the error message MUST update immediately to the new language without requiring
  the user to re-submit the form.
- **FR-017**: The `earlyVoting.notes` and `votingRules.phonesAtPollsDetail` data fields
  display in English for Phase 2, but MUST be rendered through the display layer in a
  way that would allow future translation without structural changes.

### Key Entities

- **Language**: An enum value ("en" | "es") representing the active display language.
- **Translations Record**: A typed interface mapping translation keys to strings
  (or functions for interpolated strings), with one record per language.
- **Language Context**: A React context providing the active language and a setter,
  consumed by all translated components via a hook.
- **Translated Prompt**: The full ballot-research prompt text rendered in the active
  language (English BALLOT_PROMPT or Spanish BALLOT_PROMPT_ES).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 42 Phase 1 e2e tests continue to pass after Phase 2 implementation
  (0 regressions).
- **SC-002**: Language toggle activates within 1 interaction (single click or keypress)
  and all text updates are visible within 200ms (no perceptible delay).
- **SC-003**: 100% of user-facing string keys have Spanish translations — no missing
  keys that would cause a blank or untranslated label in Spanish mode.
- **SC-004**: The Spanish prompt output covers 100% of the content in the English
  prompt — no sections omitted or truncated in translation.
- **SC-005**: Language preference persists 100% of the time across page refreshes
  (browser storage mechanism works in standard browser contexts).
- **SC-006**: Zero ESLint errors and zero cyclomatic complexity violations introduced
  by the i18n implementation.
- **SC-007**: First-load JavaScript bundle size increases by ≤ 30 kB compared to
  Phase 1 baseline (translations add minimal overhead).
- **SC-008**: Adding a hypothetical third language requires changes only to translation
  content files — validated by code review that no component or logic files need
  modification for a new language entry.

## Assumptions

- Browser `localStorage` is the persistence mechanism for language preference.
  If unavailable (private mode), graceful fallback to English on each load is acceptable.
- The chatbot names (Claude, ChatGPT, Gemini, etc.) are proper nouns and remain in
  English in both language modes.
- Election data values (state names, election names, accepted ID types, voting rule
  details from JSON) remain in English for Phase 2.
- `earlyVoting.notes` and `phonesAtPollsDetail` field values remain in English for
  Phase 2.
- The `<html lang>` attribute update is sufficient for screen reader language
  announcement; a separate `aria-live` announcement region is a nice-to-have, not required.
- Metadata (`<title>`, `<meta description>`) may remain in English due to Next.js
  server-side export limitations (consistent with other Phase 2 runs).
- URL routing does NOT change — no `/es/` path prefix or query parameter.
