---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/product-brief-voter-choice-2026-04-03.md'
  - '_bmad-output/brainstorming/brainstorming-session-2026-04-03-2100.md'
  - 'docs/PHASE2_SPEC.md'
  - 'docs/PROJECT_SPEC.md'
---

# UX Design Specification — voter-choice (Phase 2: Spanish Language Support)

**Author:** Muxin
**Date:** 2026-04-03

---

## 1. UX Discovery Summary

### Product Context (Phase 2 Extension)

Phase 2 extends the existing Phase 1 ballot research tool (single-page civic app, mobile-first, zero-auth) with bilingual support. The UX design must integrate seamlessly into the existing visual design — no layout restructuring, no new pages. The language toggle is the primary new UI element.

**Critical constraint:** The Phase 1 UX is fixed (layout, section order, visual design). Phase 2 UX is additive only.

### Design Goals

1. **Discoverability:** Spanish-speaking users must find the toggle within 3 seconds of landing
2. **Seamlessness:** Language switch feels instant and natural — no loading state, no reload
3. **Integrity:** All app state preserved on switch (user feels in control, not disrupted)
4. **Accessibility:** Toggle is fully operable for keyboard and screen reader users
5. **Extensibility:** Toggle design accommodates a third language with minimal rework

---

## 2. Core Experience Design

### Language Toggle Placement

**Decision: Fixed top-right, always visible**

Rationale:
- Conventional position for language toggles across web standards (W3C, vote.gov, government sites)
- Fixed positioning ensures visibility regardless of scroll (critical for civic tool where user scrolls to read results)
- Top-right is above the fold on all devices — discoverable on first render
- Does not compete with the main content flow (left-aligned hero, centered form)

**Position spec:**
```css
position: fixed;
top: 1rem;
right: 1rem;
z-index: 50; /* above content, below modals */
```

**Visual design:**
- Plain button, no border (underlined text link style or subtle pill)
- Font size: 14px / 0.875rem
- Shows the INACTIVE language ("Español" when current = EN, "English" when current = ES)
- Color: matches body text color with hover underline — non-intrusive but visible
- No flag icons (flags connote nationality, not language; avoids political implications)

---

## 3. Emotional Response & Tone

### English Mode (unchanged from Phase 1)
- Friendly, civic-minded, approachable
- "Here's what you need to research your ballot"

### Spanish Mode
- Same emotional tone, but written for native Spanish speakers
- NOT a translation of English copy — natural Spanish civic register
- "tú" voice throughout (casual, approachable: "Ingresa tu código postal")
- Warm but efficient: this is a civic tool, not a marketing page

**Example voice contrast:**
| English | Spanish |
|---------|---------|
| "Enter your zip code" | "Ingresa tu código postal" |
| "Copy to Clipboard" | "Copiar en el portapapeles" |
| "12 days left" | "Quedan 12 días" |
| "Registration deadlines have passed" | "Las fechas límite de registro ya pasaron" |

---

## 4. Design System

### Existing System (Tailwind CSS — Phase 1)
Phase 2 uses the same Tailwind CSS setup. No new design tokens needed. The language toggle uses existing text styles and colors.

### Translation-Aware Typography
Spanish text averages 20-30% longer than English equivalents. Design guidelines:
- All buttons: `min-width: 0; width: auto` (not fixed widths that clip Spanish text)
- Tip text containers: `flex-wrap: wrap` or `min-height` instead of fixed heights
- Hero headline: allow 2-line wrap on mobile for Spanish (Spanish headlines are longer)
- Error messages: `word-break: break-word` as fallback for very long Spanish phrases
- No truncation (`text-overflow: ellipsis`) on any translated strings

---

## 5. Visual Foundation

### Color (unchanged)
All existing Phase 1 colors apply. The language toggle uses:
- Default state: `text-gray-600` or matching body text
- Hover state: `text-gray-900` + underline
- Focus state: standard browser focus ring (2px outline, 2px offset)

### Toggle States

| State | Visual |
|-------|--------|
| Default | Text: "Español" in body text color |
| Hover | Underline + slight darkening |
| Focus | Visible focus ring (WCAG 2.4.7) |
| Active (press) | Slight opacity reduction |
| After switch | Text changes to "English" — no animation needed |

---

## 6. Design Directions

### Language Toggle: Text-Only vs. Icon+Text

**Decision: Text-only ("Español" / "English")**

Rationale:
- Flag icons carry nationality implications (🇪🇸 = Spain, not Mexico/Colombia/US Spanish speakers)
- Text is universally understood
- Shorter and cleaner
- No icon library dependency

### Toggle Label: Abbreviation vs. Full Name

**Decision: Full language name ("Español" not "ES")**

Rationale:
- "ES" is ambiguous for users unfamiliar with ISO 639 codes
- "Español" is understood by both English and Spanish speakers
- Explicitly confirms the language available, reducing cognitive friction for non-English primary users

### Toggle Feedback: Silent vs. Announced

**Decision: Silent visual + ARIA live region**

Rationale:
- Sighted users: seeing all text change to Spanish is sufficient confirmation
- Screen reader users: `aria-live="polite"` region announces "Idioma cambiado a español" / "Language changed to English"
- No toast notification (intrusive, blocks content)

---

## 7. Defining Experience

### The Key Moment: Language Switch Animation

**Decision: Instant switch, no animation**

Rationale:
- Animation on text replacement creates visual noise (50+ strings changing simultaneously)
- Instant switch feels more "native" — like pressing a keyboard language switch
- Avoids cumulative layout shift (CLS) concerns from sequential text replacement animation
- Performance: synchronous React context update, all components re-render in one pass

### The Critical Edge Case: Error Messages Mid-Switch

**Design decision:** Error messages must reflect the active language at render time, not at submission time.

UX rationale: If a user sees an error in English, switches to Spanish, and the error remains in English, it breaks the illusion that the app is now in Spanish. More importantly, it confuses Spanish-dominant users who don't read English.

Implementation: store error translation keys in state, not translated strings. UI calls `t(errorKey)` on every render.

---

## 8. User Journey Flows

### Journey 1: First-Time Spanish Speaker

```
[Land on English page]
    ↓
[See "Español" in top-right] (≤3 sec discovery)
    ↓
[Click "Español"]
    ↓
[All text → Spanish] (instant, no reload)
[Toggle now shows "English"]
    ↓
[Enter zip code in Spanish context]
    ↓
[Get results with Spanish labels]
    ↓
[Copy Spanish prompt]
    ↓
[Refresh → still in Spanish] (localStorage)
```

### Journey 2: State Preservation Test

```
[Enter zip: 73301 → see TX results in English]
    ↓
[Click "Español"]
    ↓
[TX results remain visible, now with Spanish labels]
["Copiar en el portapapeles" button visible]
    ↓
[Click copy → Spanish prompt copied]
```

### Journey 3: Keyboard User

```
[Tab to "Español" button]
[See visible focus indicator]
    ↓
[Press Enter]
    ↓
[Language switches]
[Screen reader announces via aria-live]
    ↓
[Focus remains on toggle (now labeled "English")]
[Continue tabbing through Spanish UI]
```

---

## 9. Component Strategy

### New Component: LanguageToggle

**Purpose:** Allows user to switch app language between English and Spanish

**Anatomy:**
```
[button.language-toggle]
  └── span (visible label: "Español" / "English")
  └── div[aria-live="polite"][aria-atomic="true"] (hidden, announcement text)
```

**Props/State:**
- `lang: 'en' | 'es'` — current language from context
- `setLang: (lang) => void` — setter from context
- Derived label: current === 'en' ? 'Español' : 'English'
- `aria-label`: "Switch to Spanish" / "Switch to English" (describes action, not current state)

**States:**

| State | Description |
|-------|-------------|
| Default (EN) | Shows "Español", aria-label "Switch to Spanish" |
| Default (ES) | Shows "English", aria-label "Switch to English" |
| Hover | Text underline, cursor pointer |
| Focus | Visible focus ring |
| After click | Immediately shows opposite language label |

**Keyboard behavior:**
- Focusable via Tab
- Activated by Enter or Space (native button behavior)
- Focus does not move on activation (stays on toggle)

**ARIA:**
```html
<button
  data-testid="language-toggle"
  aria-label="Switch to Spanish" <!-- or "Switch to English" -->
  onClick={toggleLanguage}
>
  Español <!-- or English -->
</button>
<div aria-live="polite" aria-atomic="true" className="sr-only">
  <!-- Populated on switch: "Language changed to English" / "Idioma cambiado a español" -->
</div>
```

**Placement in DOM:**
```jsx
// In app layout, above main content
<>
  <LanguageToggle />
  <SkipToContent />
  <main>...</main>
</>
```

### Modified Component: ZipForm

**Change:** All string literals replaced with `t(key)` calls. Error state stores key, not string.

**Error key pattern:**
```typescript
// Before (Phase 1)
setError("Please enter a valid 5-digit zip code")

// After (Phase 2)  
setError('errors.zipInvalid') // key stored in state
// Display: <p>{t(error)}</p> — re-evaluates on language switch
```

### Modified Component: StateInfoCard

**Change:** Field labels ("Election", "Registration deadlines", "Early voting", "Voter ID") use `t(key)`. Data values (election names, dates, ID types) remain unchanged — these come from JSON and stay in English per Phase 2 scope.

**Date formatting:** `formatDate(date, lang)` called at render time using current `lang` from context.

### Modified Component: PromptOutput

**Change:** Section heading, copy button text, instructions use `t(key)`. The prompt content itself is generated by `generatePrompt(state, lang)` — produces Spanish prompt when `lang === 'es'`.

### Modified Component: PageContent (or page.tsx)

**Change:** Hero text, tips array, footer text use `t(key)`. Skip-to-content link text uses `t('a11y.skipToContent')`.

---

## 10. UX Patterns

### Pattern: Live Language Switch

**Trigger:** User clicks `LanguageToggle`
**Effect:** Context updates → all `useLanguage()` consumers re-render with new translations
**Visual:** Text changes synchronously, no flash, no loader
**State impact:** Zero — app state (zip code, results, errors) preserved

### Pattern: Translation Key Error Messages

**Trigger:** Form validation or API response
**Effect:** State stores error key (e.g., `'errors.zipNotFound'`)
**Language switch effect:** Error displays in new language automatically on next render
**Visual:** Error text changes smoothly with rest of UI on language switch

### Pattern: SSR Language Initialization

**Trigger:** Page initial load
**Effect:** Server renders in 'en' (no localStorage access on server)
**Client mount effect:** `useEffect` reads localStorage, updates context if stored preference differs
**Visual:** On first load in 'es' preference: brief 'en' render → switches to 'es' after hydration
**Trade-off:** Acceptable for a civic tool (not a pixel-perfect brand experience); avoids hydration mismatch error which would break the app entirely

### Pattern: Prompt Language Binding

**Trigger:** User submits zip code OR switches language with results visible
**Effect:** `generatePrompt(state, currentLang)` re-runs with current language
**Visual:** Prompt text updates to match UI language (both should always match)

---

## 11. Responsive Design & Accessibility

### Responsive Strategy

**Mobile-first (unchanged from Phase 1)**

Phase 2 adds one new concern: Spanish text is ~30% longer. Each component must be tested at:
- 320px (iPhone SE width, minimum supported)
- 375px (iPhone 14 standard)
- 768px (tablet)
- 1280px (desktop)

**Text overflow prevention:**
- `word-break: break-word` on all translated elements
- `min-width: 0` on flex children containing translated text
- No fixed-width containers for strings (use `max-width` + `width: 100%` pattern)
- Hero headline: `hyphens: auto; lang="es"` on the HTML element (browser handles Spanish hyphenation)

**Language toggle responsive behavior:**
- Mobile: fixed top-right (1rem from top, 1rem from right) — sits above scroll content
- Tablet/Desktop: same — fixed position means no layout collision
- Does not appear in tab order before main content (skip-to-content link comes first)

### Breakpoints (unchanged from Phase 1)

| Breakpoint | Value | Notes |
|-----------|-------|-------|
| Mobile | <640px | Single column, stacked |
| Tablet | 640-1024px | Wider input, card layout |
| Desktop | >1024px | Max-width centered container |

### Accessibility Requirements (Phase 2 additions)

**WCAG 2.1 AA compliance:**

| Criterion | Requirement | Implementation |
|-----------|-------------|----------------|
| 3.1.1 Language of Page | `<html lang>` reflects active language | `document.documentElement.lang = lang` in `useEffect` |
| 4.1.2 Name, Role, Value | Toggle button has accessible name | `aria-label` updated per active language |
| 2.4.7 Focus Visible | Toggle focus indicator visible | Browser default focus ring (not suppressed) |
| 1.4.3 Contrast | Toggle text meets 4.5:1 ratio | Using existing body text color (Phase 1 verified) |
| 1.3.1 Info and Relationships | aria-live for language change | `aria-live="polite" aria-atomic="true"` |
| 2.1.1 Keyboard | Toggle keyboard operable | Native `<button>` element |

**Screen reader experience:**
1. User navigates to toggle (reads `aria-label`: "Switch to Spanish")
2. Activates with Enter/Space
3. `aria-live` region reads: "Idioma cambiado a español"
4. User continues navigating — all labels now in Spanish
5. Switching back: `aria-label` reads "Switch to English", live region reads "Language changed to English"

### Testing Strategy

**Spanish text overflow testing:**
- Check all components in Spanish mode at 320px width
- Specific elements to verify: error messages, deadline status, voter ID strings, copy button, tips

**Keyboard-only test:**
- Tab to toggle, activate, verify focus stays on toggle
- Tab through Spanish UI — all interactive elements reachable

**Screen reader test (automated):**
- `aria-label` present and correct in both modes
- `aria-live` region populated on toggle activation
- `lang` attribute updated

---

## 12. Implementation Guidelines

### Do
- Use `<button>` for the language toggle (not `<div>`, `<a>`, or `<span>`)
- Store the toggle as a fixed-position element outside the main content flow
- Update `document.documentElement.lang` in a `useEffect` that responds to `lang` state
- Test Spanish mode at 320px and 375px on every component

### Don't
- Add animation to the language switch (creates visual noise, CLS)
- Use CSS `white-space: nowrap` on any translated string
- Use flag emoji as the toggle label
- Translate proper nouns (Claude, ChatGPT, state names)
- Store translated strings in component state (store keys, translate at render)

### Translation Key Naming Convention

```typescript
// Organized by component/feature area
{
  hero: { headline, subtitle },
  form: { label, placeholder, submit },
  errors: { zipEmpty, zipInvalid, zipNotFound, multiState, deadlinePassed, noElection },
  stateInfo: { election, registrationDeadlines, earlyVoting, voterId, phones, sampleBallot, county },
  deadline: { daysLeft, passed },
  prompt: { heading, instructions, copyButton, copiedButton },
  tips: { heading, tip1, tip2, tip3 },
  footer: { credit },
  a11y: { skipToContent, langToggleToEs, langToggleToEn, langChangedToEs, langChangedToEn }
}
```
