---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - docs/PHASE2_SPEC.md
  - docs/PROJECT_SPEC.md
  - _bmad-output/brainstorming/brainstorming-session-2026-04-03-2100.md
date: 2026-04-03
author: Muxin
---

# Product Brief: voter-choice (Phase 2 — Spanish Language Support)

<!-- Generated through BMAD collaborative workflow — Phase 2 -->

## Executive Summary

The voter-choice ballot research tool went viral on Reddit and has proven its core value: helping voters quickly get an AI-generated, personalized ballot guide by entering a zip code. Phase 2 extends this tool to serve Spanish-speaking voters — a large, underserved civic tech audience — by adding full bilingual support (English + Spanish).

The core problem: Spanish-speaking voters currently cannot effectively use the tool because all UI text, instructions, and the AI prompt output are English-only. A Spanish-speaking voter who navigates to the site either gets nothing useful or must struggle through an English interface to generate an English-language chatbot prompt — defeating the purpose.

Phase 2 makes the entire experience bilingual: the UI, error messages, tips, and most critically, the AI prompt output (the core product) will be fully available in Spanish. Language toggles instantly without reload, persists across sessions, and the architecture is designed for easy addition of a third language (Vietnamese, Tagalog, Simplified Chinese) in the future.

---

## Core Vision

### Problem Statement

Spanish-speaking voters are excluded from the ballot research tool's value. All user-facing text — from the zip code input label to the AI chatbot prompt the user copies — is English-only. Approximately 41 million native Spanish speakers live in the US, many of whom are eligible voters. Civic tech tools that serve only English speakers perpetuate democratic participation gaps.

### Problem Impact

- A Spanish-speaking voter cannot understand the tool's instructions or UI labels
- Even if they guess their way to submitting a zip code, the generated prompt is in English — making it useless for Spanish-language chatbot sessions
- The tool signals "this isn't for you" to Spanish-speaking users, reducing trust in civic tech broadly
- The app went viral on Reddit (primarily English-speaking audience) but has untapped reach to Spanish-language communities

### Why Existing Solutions Fall Short

Existing civic information tools for Spanish speakers typically:
- Provide a separate translated website (different URL, often outdated, incomplete)
- Use auto-translation that produces stilted, unnatural Spanish (particularly problematic for civic language)
- Don't translate the core interactive feature — only the static wrapper

The voter-choice tool's unique value is the personalized AI prompt. That value is completely inaccessible to Spanish speakers in the current implementation.

### Proposed Solution

Add a language toggle visible at all times on the page. Activating "Español" mode:
1. Switches all UI text to natural Spanish instantly (no reload, no state loss)
2. Serves the AI chatbot prompt in fluent Spanish (the full prompt + personalized context block, both in Spanish)
3. Persists the preference across browser sessions via localStorage
4. Updates the page's `lang` attribute for screen reader compatibility

The translation architecture uses a typed TypeScript translation store with a `useLanguage()` React hook — no external library, extensible to N languages by adding records.

### Key Differentiators

- **Prompt localization, not just UI localization:** Most i18n efforts translate the chrome but leave the core content (the AI prompt) in English. This implementation translates the highest-value artifact.
- **Fluent civic Spanish:** The Spanish prompt is written as a native Spanish civic guide, not machine-translated. "tú" voice, consistent civic terminology (código postal, fecha límite, boleta).
- **Architecture-first extensibility:** Adding Vietnamese requires only new translation content — zero component changes. Built correctly from the start.
- **No-library approach:** A typed TypeScript object + simple hook covers all needs for a 2-language app. No version drift, no bundle bloat.

---

## Target Users

### Primary Users

**Persona: María, 34, Arizona — First-Time Spanish-Dominant Voter**
- Born in Mexico, US citizen for 3 years, voting for the first time
- Comfortable with smartphones, uses apps in Spanish when available
- Spanish is her primary language; she reads English but finds it mentally taxing
- Currently experiences the ballot tool as "another English-only government website"
- Success: She opens the tool, sees the "Español" toggle, switches, enters her zip code in 5 seconds, and gets a complete Spanish prompt to paste into ChatGPT — her first experience with civic tech that felt built for her

**Persona: Carlos, 52, Texas — Bilingual Voter Who Prefers Spanish for Civic Tasks**
- Born in the US, bilingual, but discusses civic matters in Spanish with family
- Wants to share the tool with his Spanish-dominant parents who can't use English interfaces
- Success: He can send the URL to his mother and tell her to click "Español" — it just works

**Persona: Elena, 28, California — Voter Who Helped Go Viral on Reddit**
- Shared the tool on r/california when it launched
- Active in Spanish-language community groups on WhatsApp
- Success: She can share the tool to her WhatsApp groups knowing it works for Spanish speakers

### Secondary Users

**Civic organizations and canvassers** who share the tool with Spanish-speaking communities. They need to demo the tool quickly in Spanish — a two-click toggle serves this need.

**Screen reader users** who switch language — the `lang` attribute update and `aria-live` announcement makes the language switch fully accessible.

### User Journey

1. **Discovery:** Shared via WhatsApp, community groups, or Reddit — URL lands at English page
2. **Recognition:** User sees "Español" toggle in top-right (always visible, fixed position)
3. **Switch:** One click — all UI text changes to Spanish immediately, no page reload
4. **Enter zip code:** Familiar interaction, now with Spanish labels and placeholder
5. **Get results:** State election info with Spanish labels; prompt output in Spanish
6. **Copy and use:** Pastes Spanish prompt into ChatGPT/Claude — gets a Spanish ballot guide
7. **Return:** localStorage remembers "es" — next visit loads in Spanish automatically

---

## Success Metrics

### User Success Metrics

- **Language toggle engagement:** % of sessions where language is switched to Spanish (baseline: 0% → target: measurable non-zero percentage in first 30 days post-launch)
- **Spanish session completion:** % of Spanish-mode sessions that result in a prompt being copied (should match or approach English-mode completion rate)
- **State preservation:** 100% of sessions — switching language does not clear zip code results (zero regression on this behavior)
- **Return visitor language preference:** Spanish selected on return visit = localStorage persistence is working

### Business Objectives

- Expand the tool's reach to Spanish-speaking voter communities
- Enable civic organizations to use the tool in Spanish-language outreach
- Establish the voter-choice tool as genuinely multilingual civic tech (not a token translation)
- Lay the architectural foundation for a third language (Vietnamese, Tagalog) with minimal effort

### Key Performance Indicators

| KPI | Measurement | Target |
|-----|-------------|--------|
| Spanish session rate | `lang=es` sessions / total sessions | >5% within 30 days |
| Spanish prompt copies | Copy events in Spanish mode | >0 from day 1 |
| Phase 1 regression | All 42 E2e tests pass | 100% |
| New unit tests | Tests covering i18n, translations, prompt Spanish | >30 new tests |
| ESLint | Errors + warnings | 0 |
| Bundle size | First load JS shared | <130 kB |
| Accessibility | WCAG AA compliance | Pass (lang attr, keyboard, contrast) |

---

## MVP Scope

### Core Features

**1. Language Toggle**
- Fixed-position button top-right (`position: fixed`)
- Shows non-default language: "Español" when in English, "English" when in Spanish
- `data-testid="language-toggle"` for E2e tests
- Keyboard accessible (Enter/Space), ARIA label
- localStorage persistence (key: `voter-choice-lang`)
- `document.documentElement.lang` update on switch

**2. i18n Architecture**
- `src/lib/translations.ts` — `Translations` TypeScript interface + EN + ES records
- `src/lib/i18n.tsx` — `LanguageProvider` with SSR hydration guard + `useLanguage()` hook
- No external i18n library
- Error-as-key pattern: components store error translation keys, not translated strings

**3. Full UI Translation**
- All strings in ZipForm, StateInfoCard, PromptOutput, BallotToolClient, page.tsx
- All error messages (validation, zip not found, no election, multi-state selector)
- Tips section, footer, skip-to-content link, ARIA labels
- Date formatting via `Intl.DateTimeFormat` (locale-aware)
- Deadline status strings ("Quedan X días" / "X days left")

**4. Prompt Localization**
- `BALLOT_PROMPT_ES` — full Spanish translation of BALLOT_PROMPT.md, "tú" voice
- `buildContextBlockEs()` — Spanish structural labels, English data values (state, election, dates, URLs)
- `generatePrompt(state, lang?)` — backwards compatible, defaults to 'en'

**5. Tests**
- Unit tests for translations completeness, i18n hook, prompt Spanish output, date locale
- E2e tests for language toggle, Spanish UI rendering, state preservation
- All 42 existing E2e tests must continue to pass

### Out of Scope for MVP

Per PHASE2_SPEC.md explicit exclusions:
- Translating election data values (state names, election names, ID types)
- Auto-detecting browser language preference
- URL-based language routing (`/es/`)
- RTL language support
- More than 2 active languages (architecture supports N; we implement 2)
- Translating chatbot names (Claude, ChatGPT — proper nouns stay in English)
- Changes to data model or JSON schema

### MVP Success Criteria

Phase 2 is "done" when:
- All 42 Phase 1 E2e tests still pass (zero regression)
- Language toggle is visible, keyboard-accessible, and switches all UI text
- Language preference persists across page refreshes
- Switching language does not reset app state (zip results remain)
- Full Spanish prompt (Part 1) available in Spanish mode
- Spanish context block (Part 2) generates correctly
- Date formatting is locale-aware
- Deadline status strings are translated
- `lang` attribute updates on switch
- ESLint: 0 errors, 0 warnings
- New tests cover all new i18n functionality

### Future Vision

- **Phase 3+: Vietnamese, Tagalog, Simplified Chinese** — adding any new language requires only a new record in `translations.ts` + new prompt text. Zero component changes.
- **50-state election data in Spanish** — translating the election data values (city names, election names, voter ID requirements) is a data quality project, not a UI project. Architecture is designed for it.
- **Auto-detect browser language** — detect `navigator.language` on first visit and offer the matching language as default.
- **Community-contributed translations** — open-source translation contributions via a structured CONTRIBUTING.md workflow.
- **Civic Spanish glossary** — publish the terminology decisions (código postal, boleta, fecha límite) as a reusable civic Spanish glossary for the broader civic tech community.

---
