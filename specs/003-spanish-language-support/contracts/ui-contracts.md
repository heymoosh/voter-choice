# UI Contracts: Spanish Language Support

**Feature**: 003-spanish-language-support
**Date**: 2026-04-03

These contracts define the observable behavior of new and modified components.
They extend (not replace) Phase 1 contracts at `specs/002-ballot-research-tool/contracts/`.

---

## LanguageToggle (new component)

**Renders**: A toggle button, always visible, independent of scroll position.

**Contract**:
- Element has `data-testid="language-toggle"` on the interactive element
- `aria-label` is present and describes the action ("Switch to Spanish" / "Cambiar a inglés")
- When language is "en": button label reads "Español" (offering to switch to Spanish)
- When language is "es": button label reads "English" (offering to switch to English)
- Clicking the button switches the language (inverts current language)
- Activatable via keyboard (Enter and Space both trigger language switch)
- Fixed position: top-right, always visible regardless of scroll
- Does NOT reset any application state on activation

---

## ZipForm (modified — adds translation support)

All Phase 1 ZipForm contracts remain valid. Additions:

**English mode** (unchanged from Phase 1):
- Input label: "Zip code" (or equivalent)
- Placeholder: existing placeholder text
- Submit button: "Find My Ballot Info"
- Empty error: "Please enter a zip code"
- Invalid error: "Please enter a valid 5-digit zip code"

**Spanish mode** (all text switches):
- Submit button: Spanish equivalent
- Empty error: "Por favor ingresa un código postal"
- Invalid error: "Por favor ingresa un código postal válido de 5 dígitos"

---

## StateSelectorModal (modified — adds translation support)

Phase 1 contracts remain valid. Additions:

**Spanish mode**:
- Prompt text: "Este código postal abarca varios estados. ¿En qué estado vas a votar?"

---

## StateInfoCard (modified — adds translation support)

Phase 1 contracts remain valid. Additions:

**Spanish mode** — all label text switches to Spanish:
- "Election" → Spanish equivalent
- "Election type" → Spanish equivalent
- "Registration deadlines" → Spanish equivalent
- "Early voting" → Spanish equivalent
- "Voter ID" → Spanish equivalent
- "Voter ID: Required" / "Not required" → Spanish equivalents
- Deadline status: "X days left" → "Quedan X días" | "Passed" → "Pasado"
- Date values formatted as "3 de marzo de 2026" (not "March 3, 2026")

**Data values** (never translated, both modes):
- State name, election name, accepted IDs, `phonesAtPollsDetail` field value,
  `earlyVoting.notes` field value, URLs — all remain in English

---

## PromptOutput (modified — adds translation support)

Phase 1 contracts remain valid. Additions:

**Spanish mode**:
- "Copy to Clipboard" button text → Spanish equivalent ("Copiar al portapapeles")
- "Copied!" feedback text → Spanish equivalent ("¡Copiado!")
- The prompt text content is the full Spanish BALLOT_PROMPT_ES
- The context block structure and labels are in Spanish; injected data values remain English

---

## BallotToolClient (modified — adds language passthrough)

Phase 1 contracts remain valid. Additions:

- Consumes `useLanguage()` hook; passes `lang` to `generatePrompt()`
- `not-found` error message switches to Spanish in Spanish mode
- `no-election` message switches to Spanish in Spanish mode
- Language switch does NOT cause re-submit or reset the displayed election results
- "Loading..." text switches to Spanish in Spanish mode

---

## PageContent (new client component)

Wraps the hero section, tips section, and footer (all content from `page.tsx`
that contains user-facing text).

**Contract**:
- Consumes `useLanguage()` for all text strings
- Hero headline, subtitle, chatbot links label all switch in Spanish mode
- Tips section title and all 4 tips switch to Spanish
- Disclaimer text switches to Spanish
- Footer: "Created by a human using AI tools." → "Creado por una persona usando herramientas de IA"
- Chatbot proper names (Claude, ChatGPT, Gemini, Grok) never change

---

## Language-Independent Contracts (both modes)

- All Phase 1 `data-testid` attributes remain on their Phase 1 elements
- Application logic (zip lookup, deadline calculation, state data resolution) is identical
- `data-testid="language-toggle"` is present on the toggle element
- `<html lang="en">` when in English mode; `<html lang="es">` when in Spanish mode
- Skip-to-content link text switches to Spanish in Spanish mode
