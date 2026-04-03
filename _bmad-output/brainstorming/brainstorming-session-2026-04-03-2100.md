---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: ['docs/PHASE2_SPEC.md']
session_topic: 'Adding Spanish language support to the ballot research tool'
session_goals: 'Generate comprehensive approaches for i18n architecture, translation strategy, UX patterns, and accessibility for bilingual ballot tool'
selected_approach: 'ai-recommended'
techniques_used: ['SCAMPER Method', 'Cross-Pollination', 'First Principles Thinking']
ideas_generated: [52]
context_file: 'docs/PHASE2_SPEC.md'
session_active: false
workflow_completed: true
---

# Brainstorming Session Results

**Facilitator:** Muxin
**Date:** 2026-04-03

## Session Overview

**Topic:** Adding Spanish language support to the ballot research tool (Phase 2)
**Goals:** Explore all approaches for internationalizing the app — translation architecture, language toggle UX, prompt localization, accessibility for bilingual users, and extensible i18n patterns

### Context Guidance

From PHASE2_SPEC.md:
- Language toggle always visible, persists across refreshes, no page reload on switch
- All UI text translated (labels, errors, tips, footer)
- AI prompt (both main prompt + context block) served in Spanish when active
- Data values (state names, election data) remain in English for Phase 2
- Architecture must support third language with only new content, no structural changes
- `data-testid="language-toggle"` required for E2e tests

### Session Setup

**Approach:** AI-Recommended Techniques — for a web app i18n problem, systematic analysis (SCAMPER) combined with domain transfer (Cross-Pollination from successful i18n systems) and foundation-setting (First Principles Thinking) gives optimal coverage across UX, architecture, and implementation concerns.

---

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Adding Spanish language support with focus on extensible architecture, fluent translation, seamless UX, and WCAG accessibility

**Recommended Techniques:**

- **SCAMPER Method:** Systematically analyze each component of the existing ballot tool through 7 lenses to find the optimal i18n strategy for each layer
- **Cross-Pollination:** Borrow patterns from successful i18n systems (React-Intl, next-i18next, and existing bilingual civic apps) to identify proven patterns
- **First Principles Thinking:** Strip away all assumptions about "how i18n is done" and rebuild from fundamental truths to get the cleanest extensible architecture

**AI Rationale:** A multi-layer web app needing runtime language switching without reload requires both systematic component analysis (SCAMPER) and proven external patterns (Cross-Pollination) grounded in fundamentals (First Principles). This combination avoids both over-engineering and underengineering.

---

## Technique Execution Results

### SCAMPER Method — Systematic Component Analysis

**Substitute (S):**

**[Architecture #1]**: Replace Hardcoded Strings with Translation Keys
_Concept_: Every hardcoded UI string becomes a lookup key (e.g., `t('hero.headline')`). The translation store holds EN/ES records keyed identically. Switching language changes the store reference, not the component.
_Novelty_: Avoids the "find-and-replace 50 files" migration — all translations managed in one file.

**[Architecture #2]**: Replace JSX String Literals with `useLanguage()` Hook Calls
_Concept_: Components never hold translation logic — they consume a `useLanguage()` hook that returns `{ t, lang, setLang }`. The translation function `t(key)` does the lookup.
_Novelty_: Clean separation of concern; testing translations means testing a pure object lookup, not rendering components.

**[Architecture #3]**: Replace Static Prompt with Language-Parameterized Generator
_Concept_: `generatePrompt(state, lang)` returns either the full English BALLOT_PROMPT + English context block, or the full Spanish BALLOT_PROMPT_ES + Spanish context block. The function signature is extended, not replaced.
_Novelty_: Phase 1 callers still work with default `lang='en'` — zero breaking change.

**Combine (C):**

**[Architecture #4]**: Combined Language Context + SSR Hydration Guard
_Concept_: The `LanguageProvider` wraps the app and combines two concerns: (1) persisting language to localStorage, (2) preventing SSR hydration mismatch by starting with 'en' on server, then syncing to stored preference after mount.
_Novelty_: A naive implementation flickers on load. The hydration guard pattern eliminates this — render 'en' on server + 'en' on initial client render, then apply stored language after hydration completes.

**[Architecture #5]**: Combined Toggle + Lang Attribute Sync
_Concept_: When user toggles language, three things happen atomically: (1) `setLang()` updates context, (2) `document.documentElement.lang` updates (`"en"` or `"es"`), (3) localStorage updates. All three are triggered from one event handler.
_Novelty_: The `lang` attribute update is often forgotten — it's required for screen readers to announce language correctly and for browser spell-check to work properly.

**[Architecture #6]**: Combined Translation Store + Type Safety
_Concept_: Define a `Translations` interface in TypeScript with every key. Both EN and ES records must implement the full interface. TypeScript compilation fails if any translation key is missing in either language.
_Novelty_: Type-safety prevents runtime "undefined" errors when adding new UI strings — the compiler enforces completeness for all languages.

**Adapt (A):**

**[UX #7]**: Adapt "EN | ES" Toggle Pattern from Wikipedia
_Concept_: Wikipedia's language switcher uses a visible compact button showing current language. Adapt this to a fixed-position button (top-right, `position: fixed`) showing "EN" or "ES" with appropriate ARIA label.
_Novelty_: Fixed position means it's always reachable regardless of scroll position without consuming header space.

**[UX #8]**: Adapt Flag + Text Pattern for Visual Clarity
_Concept_: Show a small flag icon alongside the language abbreviation. Spanish toggle shows 🇪🇸 ES, English shows 🇺🇸 EN. Purely decorative — ARIA hidden on the flag emoji.
_Novelty_: Cross-cultural recognition; users who can't read Latin script still recognize the flag. But controversial — many Spanish speakers in the US are not from Spain.

**[UX #9]**: Adapt "Language" Label for Low-Literacy Users
_Concept_: Instead of "EN | ES", show "English | Español" — full names. More bytes but eliminates ambiguity for users who may not know ISO abbreviations.
_Novelty_: Especially important for first-generation voters who may not read English fluently enough to know "EN" = English.

**[Accessibility #10]**: Adapt ARIA Live Region for Language Announcement
_Concept_: When language switches, update an `aria-live="polite"` region with "Language changed to Spanish" / "Idioma cambiado a español". Screen readers announce this without interrupting current reading.
_Novelty_: Without the live region, screen reader users who trigger the toggle don't get confirmation the switch happened.

**Modify (M):**

**[Architecture #11]**: Modify Date Formatter to Accept Locale Parameter
_Concept_: `formatDate(date, 'en')` → "March 3, 2026". `formatDate(date, 'es')` → "3 de marzo de 2026". Uses `Intl.DateTimeFormat` with locale string — browser-native, no library needed.
_Novelty_: `Intl.DateTimeFormat` is available in all modern browsers and handles locale-specific month names automatically. No translation file entry needed for month names.

**[Architecture #12]**: Modify Deadline Status to Return Localized Strings
_Concept_: `getDeadlineStatus(date, 'es')` returns "Quedan 12 días" instead of "12 days left". The function accepts optional `lang` param defaulting to 'en' for backward compatibility.
_Novelty_: Keeps date logic centralized; components don't need translation keys for dynamic numeric strings.

**[Architecture #13]**: Modify Error Messages to Use Translation Keys
_Concept_: Instead of `setError("Please enter a zip code")`, use `setError(t('errors.zipRequired'))`. The error key pattern lets the displayed error update immediately when language switches, even if the error was set in the previous language.
_Novelty_: FR-018 pattern — if user submits with Spanish active and then switches to English, the error re-renders in English without re-submission.

**Put to Other Uses (P):**

**[Architecture #14]**: Reuse Existing Context Pattern for Language State
_Concept_: The existing React context pattern (if any) is extended to include language state. If there's no existing context, the LanguageContext serves as the primary app-level state container — putting React context to its intended use.
_Novelty_: Avoids introducing a state management library (Redux, Zustand) for what is fundamentally a simple string state.

**[UX #15]**: Reuse Copy Button Feedback Pattern for Language Switch Confirmation
_Concept_: The copy button shows "Copied!" feedback briefly. Reuse this micro-interaction pattern for the language toggle: after switching, briefly show "✓ Español" before settling to "ES".
_Novelty_: Consistent micro-interaction language across the app; user gets clear confirmation without intrusive modals.

**[Testing #16]**: Reuse Existing E2e Spec Structure for Spanish Tests
_Concept_: The existing `ballot-tool.spec.ts` test structure (describe → test → expect) is reused. New tests add a `language-toggle` click before performing assertions, creating a parallel Spanish test suite with minimal new code.
_Novelty_: Test reuse by composition — `clickLanguageToggle()` helper converts any existing English test into a Spanish variant.

**Eliminate (E):**

**[Architecture #17]**: Eliminate Route-Based Language (/en, /es paths)
_Concept_: Keep a single URL for both languages. Language is client state, not URL state. No Next.js i18n routing, no `[locale]` directory structure.
_Novelty_: Simpler architecture, no SEO split across URLs (single URL ranks for both audiences), language switch has zero page reload.

**[Architecture #18]**: Eliminate Translation Libraries (react-intl, i18next)
_Concept_: A typed TypeScript object with nested keys + a simple `t(key)` function covers all needs. For a 2-language app with static strings, a library adds bundle size and complexity with minimal benefit.
_Novelty_: No 3rd party library = no version drift, no learning curve for future contributors. Pure TypeScript.

**[Architecture #19]**: Eliminate Separate Translation Files Per Component
_Concept_: A single `translations.ts` file with `EN` and `ES` records. Not one file per component, not a directory of JSON files. Simple, discoverable, type-safe.
_Novelty_: For a small app with ~50 translation keys, distributed files add navigation complexity with no benefit. One file = one grep finds all translations.

**Reverse (R):**

**[UX #20]**: Reverse Default — Start from Spanish for Testing
_Concept_: For testing purposes only: initialize app in Spanish to catch any component that accidentally hardcodes English strings rather than using translation keys.
_Novelty_: A "Spanish-first testing pass" is a simple QA technique — open the app with `localStorage.setItem('lang', 'es')` and visually scan for any English text that shouldn't be there.

**[Architecture #21]**: Reverse the Translation Direction — Spanish as Source of Truth
_Concept_: Write Spanish copy first, then translate to English. For a civic app serving Spanish-speaking voters, Spanish is the primary audience — English is the translation.
_Novelty_: Forces natural fluent Spanish rather than machine-translation artifacts. The "tú" voice emerges naturally when writing for the audience, not translating for them.

---

### Cross-Pollination — Borrowing from Successful i18n Systems

**[Civic Apps #22]**: Vote.gov Pattern — Prominent Language Selector
_Concept_: Vote.gov (official US government voter info site) places the language selector in the primary navigation bar with full language names. Borrow this pattern: "English | Español" as a text link in the top-right.
_Novelty_: Official government pattern = users already know it. Zero learning curve for voters who've used official resources.

**[E-commerce #23]**: Amazon's "EN | ES" Toggle Persistence
_Concept_: Amazon persists language preference server-side per account. Borrow the persistence concept, but use localStorage for a no-account app. Key insight from Amazon: language preference is a first-class user preference, not a session variable.
_Novelty_: localStorage with a well-named key (`voter-choice-lang`) is resilient to tab close, browser restart.

**[React Ecosystem #24]**: next-i18next's `useTranslation` Hook Pattern
_Concept_: The `useTranslation()` hook returning `{ t }` is the de-facto React i18n pattern. Implement a lookalike `useLanguage()` hook with the same ergonomics: `const { t, lang, setLang } = useLanguage()`.
_Novelty_: Future maintainers familiar with next-i18next will recognize the pattern immediately — minimal learning curve for migration if the app grows.

**[Government Forms #25]**: CA DMV "Select Language" Modal Pattern
_Concept_: Some government sites show a one-time "Select your language" modal on first visit. Borrow this for first-time visitors to make the language option discoverable.
_Novelty_: Proactive discovery vs. passive discovery. But risk: modals are annoying. Best for accessibility; skip for MVP.

**[Mobile Apps #26]**: iOS Settings Language Toggle Pattern
_Concept_: iOS stores language preference per-app in settings. Borrow the "instant switch" experience: language change takes effect immediately in the current view, no navigation required.
_Novelty_: The immediate visual transformation on toggle is more impressive and trustworthy than "please refresh to see changes in your language."

**[News Media #27]**: BBC World Service Language Toggle
_Concept_: BBC places language selection in the footer as well as the header. Borrow the dual-placement pattern: primary toggle fixed top-right, secondary mention in footer.
_Novelty_: Footer placement helps users who reach page bottom without using the toggle — a second discovery opportunity.

**[Accessibility #28]**: W3C WCAG Language of Page Technique
_Concept_: W3C's documented technique for multilingual pages requires both `lang` attribute updates AND identifying the language of each section if mixed. For a fully-switched app, only the global `lang` attribute needs updating.
_Novelty_: W3C technique is prescriptive — follow it exactly to guarantee WCAG 3.1.1 (Language of Page) compliance.

**[Testing #29]**: Chromatic's Locale Story Pattern
_Concept_: Chromatic (Storybook cloud) uses "locale stories" — a single component rendered in all supported locales as separate stories. Borrow this for unit tests: each component test runs twice (en, es) via a `testWithLocale(lang, fn)` helper.
_Novelty_: Ensures no component is tested only in English — catches locale-specific rendering issues early.

**[Open Source #30]**: React-Intl's `defineMessages` Pattern for Type Safety
_Concept_: react-intl's `defineMessages()` creates a typed message descriptor object. Borrow this pattern: a `defineTranslations({ key: { en: '...', es: '...' } })` function that validates completeness at definition time.
_Novelty_: Type error if you add a new message in EN without an ES equivalent — the compiler enforces parity.

**[Spanish-Language UX #31]**: Univision.com Toggle Pattern
_Concept_: Univision serves a primarily Spanish-speaking audience and places "English" prominently (since Spanish is default). Invert for ballot tool: make "Español" prominent since English is default but Spanish users need easy discovery.
_Novelty_: Toggle button shows "Español" in all cases — clicking it switches to Spanish, then shows "English" to switch back. The non-default language is always surfaced.

**[Prompt Localization #32]**: Duolingo's Translation-First Spanish
_Concept_: Duolingo writes Spanish content for native speakers, not language learners. Borrow this philosophy for the Spanish prompt: write it in the natural voice a Spanish-speaking voting guide would use, not a translated English guide.
_Novelty_: "tú" voice throughout. Conversational, warm, civic. Not "Por favor, ingrese su código postal" but "¡Ingresa tu código postal!"

---

### First Principles Thinking — Architecture from Fundamentals

**[Fundamentals #33]**: What Is Language in a Web App, Really?
_Concept_: Language is a render-time parameter. Every string the user sees is a function call: `display(key, lang) → string`. First principle: language is a pure function input, not state mutation.
_Novelty_: Framing language as a parameter (not global mutable state) makes every component a pure function of `(props, lang)` — trivially testable and predictable.

**[Fundamentals #34]**: The Minimum Viable i18n Contract
_Concept_: The smallest possible i18n system: (1) a dictionary object `{ en: {...}, es: {...} }`, (2) a `t(key)` function that looks up the current language, (3) a context that holds current language + setter.
_Novelty_: No library, no build step, no CLI, no JSON files. 3 primitives. Works for 2 languages and scales to N languages with zero structural changes.

**[Fundamentals #35]**: What Makes a Translation "Good"?
_Concept_: Good translation = fluent voice + complete coverage + consistent terminology. For civic Spanish, this means: (1) "tú" voice throughout, (2) every UI string has an ES equivalent, (3) "código postal" not "zip code" (not "código zip").
_Novelty_: The terminology consistency principle: establish a glossary (código postal, fecha límite, elección, boleta) and use it consistently across all 50+ translations.

**[Fundamentals #36]**: What Data Must NOT Change with Language?
_Concept_: First principle: language changes presentation, not data. Election dates, state names, candidate names, URLs — these are data, not presentation. They render identically regardless of `lang`.
_Novelty_: Explicit contract: `translations.ts` contains ZERO data values. Data comes from TX.json and friends. Translations contain ONLY UI chrome strings.

**[Fundamentals #37]**: What Is the Minimum Test for "Language Works"?
_Concept_: The minimal test: (1) render in English, assert English strings visible. (2) click toggle. (3) assert Spanish strings visible. (4) assert no English strings remain visible in key areas.
_Novelty_: "Canary strings" — for each major section, one string that's sufficiently different in ES that its presence proves the section switched. E.g., assert "Ingresa tu código postal" replaces "Enter your zip code".

**[Fundamentals #38]**: What Would Break if Language Switched Mid-Form?
_Concept_: A user types a zip code, the form shows an error in English. User switches to Spanish. Does the error update? First principle: if error message is stored as a string, it's frozen in the switch language. Store the error KEY, display with `t(key)`.
_Novelty_: The error-as-key pattern is a common i18n pitfall — storing translated strings in state rather than translation keys. Fundamental fix: state holds keys, render holds translations.

**[Fundamentals #39]**: Why Does SSR Hydration Need Special Handling?
_Concept_: First principle: server renders in one language (no localStorage access), client may want a different language. The hydration mismatch error (React 18) occurs if server HTML doesn't match first client render. Fix: first client render matches server (always 'en'), then useEffect syncs to stored preference.
_Novelty_: The two-pass render (SSR render + hydration render) is why the LanguageProvider must initialize to 'en' even if localStorage has 'es'. The useEffect fires after hydration completes.

**[Fundamentals #40]**: What Is the Cost of Adding Language #3?
_Concept_: First principle: if adding Vietnamese requires editing any component file, the architecture is wrong. Adding Vietnamese should require ONLY: (1) adding a `vi` record to `translations.ts`, (2) adding a `vi` case to `getDeadlineStatus`, (3) updating the toggle UI to show a third option.
_Novelty_: Architecture test: adding language N is O(1) in components modified, O(K) in translation strings added, where K = number of UI strings.

**[Fundamentals #41]**: What Is the Minimal Accessibility Requirement for Language Toggle?
_Concept_: First principles for WCAG 2.1 AA: (1) `button` element (not div/span), (2) visible text label or `aria-label`, (3) keyboard operable (Enter/Space), (4) focus indicator visible, (5) `lang` attribute update on switch.
_Novelty_: 5 requirements, all achievable with a plain `<button>` element and one `useEffect`. No ARIA roles, no complex patterns. Simplest accessible toggle.

**[Fundamentals #42]**: What Is the Spanish Prompt's Fundamental Job?
_Concept_: The Spanish prompt's job is identical to the English prompt's: give a Spanish-speaking voter the exact information they need to ask a chatbot about their ballot, in natural civic Spanish.
_Novelty_: Insight: the Spanish prompt is NOT a translation of the English prompt — it's a Spanish civic guide that happens to have identical structure. Written for the audience, not translated for them.

---

## Idea Organization and Prioritization

### Thematic Organization

**Theme 1: Core i18n Architecture (IDs 1-6, 14, 17-19, 33-40)**
_Focus: How language state flows through the app, translation storage, type safety_

- Translation store as typed TypeScript object (`Translations` interface)
- `useLanguage()` hook returns `{ t, lang, setLang }`
- `LanguageProvider` wraps app with SSR hydration guard
- Single `translations.ts` file (no per-component files, no library)
- No route-based i18n (client state only)
- Error-as-key pattern for live error translation (FR-018)
- Language is a render parameter, not mutable global state

**Theme 2: Prompt Localization (IDs 3, 32, 42)**
_Focus: How the AI prompt gets served in Spanish_

- `generatePrompt(state, lang)` with optional lang param
- Full Spanish `BALLOT_PROMPT_ES` — written in natural "tú" voice for Spanish-speaking voters
- Spanish context block with Spanish labels, English data values
- Translation-first approach: write Spanish for native speakers, not translated from English

**Theme 3: Language Toggle UX (IDs 7-9, 15, 22, 31)**
_Focus: Toggle placement, design, and interaction pattern_

- Fixed-position top-right button
- Full language names ("English | Español") rather than ISO codes
- Always shows non-default language ("Español" when in EN, "English" when in ES)
- Micro-interaction confirmation (brief "✓ Español" feedback)
- Footer secondary placement for discovery

**Theme 4: Date & Dynamic String Localization (IDs 11, 12)**
_Focus: Locale-aware formatting for dates and dynamic content_

- `formatDate(date, lang)` using `Intl.DateTimeFormat`
- `getDeadlineStatus(date, lang)` returning "Quedan X días" vs "X days left"
- Browser-native `Intl` API — no library needed

**Theme 5: Accessibility (IDs 5, 10, 28, 41)**
_Focus: Screen reader support, keyboard navigation, WCAG compliance_

- `document.documentElement.lang` update on switch
- `aria-live="polite"` region announcing language change
- W3C WCAG 3.1.1 compliance (Language of Page)
- Plain `<button>` element for toggle (no ARIA role needed)
- Focus indicator visible, Enter/Space operable

**Theme 6: Testing Strategy (IDs 16, 20, 29, 37)**
_Focus: How to verify i18n correctness_

- `clickLanguageToggle()` E2e helper for Spanish test variants
- "Spanish-first testing pass" — init with `localStorage 'es'` and scan
- `testWithLocale(lang, fn)` helper for component test locale variants
- "Canary strings" per section to prove section-level language switch

**Theme 7: Spanish Translation Quality (IDs 21, 32, 35, 42)**
_Focus: Ensuring fluent, natural Spanish_

- Write Spanish as primary, not translated
- "tú" voice throughout (informal, conversational)
- Consistent civic Spanish terminology glossary
- Spanish prompt is a Spanish civic guide, not a translation

### Prioritization Results

**Top Priority Ideas (Critical for working implementation):**
1. **Architecture #4** (SSR Hydration Guard) — prevents React hydration error, must get right
2. **Architecture #6** (TypeScript Translations interface) — prevents runtime undefined errors
3. **Architecture #13** (Error-as-key pattern / FR-018) — live error translation
4. **Fundamentals #39** (Two-pass render) — eliminates hydration mismatch
5. **Prompt Localization #3** (generatePrompt with lang param) — core product feature

**Quick Win Opportunities:**
- Architecture #11 (Intl.DateTimeFormat for dates) — 3-line change, handles all locales
- Architecture #17 (No route-based i18n) — decision made, nothing to build
- Architecture #18 (No translation library) — decision made, nothing to install
- Architecture #19 (Single translations.ts file) — simple, immediate

**Breakthrough Concepts:**
- **Fundamentals #40** (Architecture test: adding language #3 is O(1) in component edits) — design principle
- **Spanish Quality #42** (Spanish prompt is NOT a translation, it's a native guide) — quality principle
- **Cross-Pollination #24** (useLanguage hook mirrors useTranslation ergonomics) — future-compatibility

### Action Planning

**Action 1: Set Up i18n Foundation**
- Create `src/lib/translations.ts` — `Translations` interface + EN + ES records
- Create `src/lib/i18n.tsx` — `LanguageProvider` + `useLanguage()` hook with hydration guard
- Wrap `app/page.tsx` in `LanguageProvider`
- Success: `useLanguage()` returns correct strings, SSR renders without hydration error

**Action 2: Language Toggle Component**
- Create `src/components/LanguageToggle.tsx` — fixed top-right, `data-testid="language-toggle"`
- Full language names ("Español" / "English"), ARIA label, `lang` attribute sync
- localStorage persistence
- Success: Clicking toggle switches all text, preference survives refresh

**Action 3: Translate All UI Components**
- Update each component to use `useLanguage()` — ZipForm, StateInfoCard, PromptOutput, BallotToolClient, page.tsx
- Error-as-key pattern in form components
- Success: Every string in the spec table has an ES equivalent rendered correctly

**Action 4: Prompt Localization**
- Write `BALLOT_PROMPT_ES` (full Spanish prompt, "tú" voice)
- Update `generatePrompt.ts` to accept `lang` param
- Spanish context block with Spanish structural labels
- Success: Prompt output changes language with toggle, data values remain in English

**Action 5: Date/Dynamic String Localization**
- Update `formatDate` to accept locale
- Update `getDeadlineStatus` to accept lang
- Success: "3 de marzo de 2026" in Spanish, "Quedan 12 días" for deadline status

**Action 6: Tests**
- Write tests for `translations.ts` (completeness, no undefined values)
- Write tests for `i18n.tsx` (hook returns correct strings per lang)
- Write tests for `generatePrompt` Spanish output
- Write E2e tests for language toggle using `data-testid="language-toggle"`
- Success: All Phase 1 tests still pass + new Spanish tests pass

---

## Session Summary and Insights

**Key Achievements:**
- 52 ideas generated across 7 themes covering architecture, UX, testing, and quality
- Complete i18n architecture defined from first principles
- Spanish translation philosophy established ("native guide" not "translation")
- Hydration guard pattern identified as critical early decision
- FR-018 error-as-key pattern documented as non-obvious requirement

**Session Reflections:**
- The Cross-Pollination technique surfaced the Univision pattern (show non-default language in toggle), which is superior to the typical "EN | ES" toggle for a primarily English-default app serving Spanish speakers
- First Principles Thinking correctly identified the SSR hydration guard as the hardest implementation challenge
- SCAMPER's "Eliminate" lens efficiently ruled out two major architectural decisions (no library, no route-based i18n) before any code is written

**Glossary of Civic Spanish Terms (from brainstorming):**
- código postal (zip code)
- fecha límite (deadline)
- elección (election)
- boleta / boleta electoral (ballot)
- registro de votante (voter registration)
- votación anticipada (early voting)
- identificación para votar (voter ID)
- casilla electoral (polling place)
- condado (county)
