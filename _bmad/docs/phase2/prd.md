# Product Requirements Document: Phase 2 — Multilingual Extension

## Overview
Add English/Spanish language support to the Voter Choice ballot research tool.

## Functional Requirements

### FR-1: Language Toggle
- A language toggle is visible on the page at all times, regardless of scroll position
- Located in the header/top-right area, accessible without scrolling
- `data-testid="language-toggle"` on the toggle element
- Keyboard-accessible (Enter/Space operable)
- ARIA-announced on language change

### FR-2: Language Switching
- Toggle switches between English ("EN") and Spanish ("ES")
- All user-facing text updates immediately without page reload
- Application state (zip code results) is preserved during language switch

### FR-3: Language Persistence
- Selected language stored in localStorage
- Language preference restored on page refresh
- Default language: English

### FR-4: HTML Lang Attribute
- `<html lang>` attribute updates to "en" or "es" when language changes

### FR-5: Complete UI Translation
All user-facing text is translated:
- Hero section headline and subtitle
- Chatbot links and labels
- Zip code input label and placeholder
- Submit button text
- All error messages
- State info card labels
- Deadline status indicators
- State selector prompt
- Copy button text ("Copy to Clipboard" / "Copied!")
- Instructions above prompt output
- Tips section content
- Footer text
- Accessibility text (skip-to-content, ARIA labels)

### FR-6: AI Prompt Translation (Part 1)
- In English mode: main prompt from BALLOT_PROMPT.md in English
- In Spanish mode: complete fluent Spanish translation stored as constant
- Translation reads as natural Spanish using "tú" voice

### FR-7: Context Block Translation (Part 2)
- In English mode: context block as currently implemented
- In Spanish mode: structure and labels in Spanish, data values remain in English
- "¡Hola! Voy a votar en **[State]**" format

### FR-8: Date Formatting
- English mode: "March 3, 2026" (en-US locale)
- Spanish mode: "3 de marzo de 2026" (es-ES locale)
- Deadline labels: "12 days left" → "Quedan 12 días"

### FR-9: Architecture Extensibility
- Translation content separated from component code (JSON/TS translation files)
- Adding a third language requires only new translation content
- No structural changes to components or logic needed for new languages

## Non-Functional Requirements
- No performance regression from Phase 1
- All Phase 1 data-testid attributes remain unchanged and functional
- WCAG AA contrast maintained in all translated text
- Spanish text expansion does not break layouts at any breakpoint

## Acceptance Criteria
See docs/PHASE2_SPEC.md for complete acceptance criteria.
