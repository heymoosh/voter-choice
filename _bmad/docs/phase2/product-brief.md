# Product Brief: Multilingual Extension (Phase 2)

## Product Vision
Extend the Voter Choice ballot research tool to support both English and Spanish, enabling broader access for Spanish-speaking U.S. voters. A user can toggle between languages at any time, with all user-facing text available in both languages and the architecture designed to trivially support additional languages.

## Problem Statement
The current ballot research tool serves only English-speaking voters, excluding tens of millions of Spanish-speaking eligible U.S. voters who could benefit from accessible, nonpartisan ballot research assistance.

## Goals
- Add a visible, accessible language toggle (EN/ES) to the interface
- Translate all UI text, error messages, static content, tips, and footer
- Provide the full ballot research AI prompt in fluent Spanish
- Translate the context block structure while keeping data values in English
- Persist language selection across page refreshes via localStorage
- Update `<html lang>` attribute dynamically when language changes
- Structure the i18n system so adding a third language requires only new translation content

## Non-Goals (Phase 2)
- Auto-detecting browser language
- URL-based language routing
- RTL language support
- Translating election data values (state names, election names, ID types)
- More than two language implementations (architecture supports N)

## Success Criteria
- Language toggle visible and accessible at all times
- All UI text available in English and Spanish
- Full AI prompt available in fluent Spanish
- Language selection persists across refreshes
- Switching language does not reset application state
- `<html lang>` attribute updates on language change
- Zero regressions from Phase 1 acceptance criteria
- Adding a third language requires only new translation content, no structural changes
