# PHASE4_SPEC.md — Extended Language Support (Vietnamese, Chinese, Arabic)

**Version:** 1.0 draft (Cowork planning doc — formalize in Claude Code before execution)
**Status:** Draft
**Last updated:** April 3, 2026

This document describes the desired behavior and outcomes for adding Vietnamese, Chinese (Simplified Mandarin), and Arabic language support to the ballot research tool. It is the shared modification request that all five workflow runs receive in Phase 4. It describes **what** should change, not **how** to implement it.

---

## Overview

Extend the existing English + Spanish ballot research tool to support three additional languages: **Vietnamese**, **Chinese (Simplified Mandarin)**, and **Arabic**. These languages are selected based on Texas voter demographics and legal requirements:

- **Vietnamese** — Required by law in Harris, Tarrant, and Dallas counties (Section 203 of the Voting Rights Act). 57% of Vietnamese speakers in Texas have limited English proficiency — the highest LEP rate of any major language group.
- **Chinese (Simplified Mandarin)** — Required by law in Harris County. 52% of Chinese speakers in Texas have limited English proficiency.
- **Arabic** — 102,491 speakers statewide (4th largest non-English language in Texas). Growing community in Houston and Dallas metro areas. Not legally required but serves a significant underserved population.

This phase is an i18n scaling test. Phase 2 added Spanish to a monolingual app. Phase 4 tests whether that architecture actually scales to languages with different character sets, text directions, date formatting conventions, and string length variations — or whether it was a one-off that needs to be rearchitected.

---

## Language Selector (updated from toggle)

### Behavior Changes

- The Phase 2 English ↔ Spanish toggle must be replaced with a language selector that supports 5 languages
- The selector should display each language in its own script:
  - **English**
  - **Español**
  - **Tiếng Việt**
  - **中文**
  - **العربية**
- Default language remains English
- Switching languages updates ALL user-facing text immediately, without a page reload and without losing application state
- The selected language persists across page refreshes (browser storage)
- The selector is accessible via keyboard and announced to screen readers
- The `<html>` element's `lang` attribute updates to reflect the active language (`en`, `es`, `vi`, `zh`, `ar`)

### Arabic: Right-to-Left (RTL) Support

Arabic is a right-to-left language. When Arabic is selected:

- The `<html>` element's `dir` attribute must be set to `rtl`
- The entire page layout must mirror: navigation, text alignment, form layouts, and reading order should flow right-to-left
- The language selector itself must remain in its conventional position (visually top-right in LTR, which becomes top-left in RTL — this is correct and expected)
- Icons and directional UI elements (arrows, chevrons) should flip
- Numbers remain left-to-right (standard for Arabic text)
- The copy-to-clipboard button and prompt output area should respect RTL text direction

When switching from Arabic back to an LTR language, the layout must fully revert. No RTL artifacts should persist.

### Placement

- Same position as the Phase 2 toggle (top-right, fixed, always visible regardless of scroll)
- On mobile: a compact selector that doesn't consume excessive screen width. A dropdown or abbreviated display is acceptable.
- Must not interfere with or obscure existing UI elements in any language

### Required `data-testid`

The existing `language-toggle` test ID from Phase 2 should remain (the element is now a selector, but the test ID stays for backward compatibility). Additional:

| `data-testid` | Element | Purpose |
|----------------|---------|---------|
| `language-toggle` | The language selector control (unchanged ID) | E2e tests interact with language switching |
| `language-option-{code}` | Individual language options (e.g., `language-option-vi`) | E2e tests select specific languages |

---

## What Gets Translated

### All existing UI text (now in 5 languages)

Everything that was translated into Spanish in Phase 2 must now also be translated into Vietnamese, Chinese, and Arabic. This includes:

- Hero section headline and subtitle
- Zip code input label, placeholder, and submit button
- All error messages
- State info card labels and all field labels
- Deadline status indicators (with correct date formatting per language)
- Copy button text and confirmation
- Instructions and tips
- Footer and data attribution text
- All Phase 3 additions: loading states, error messages, candidate detail labels, polling location labels

### The AI ballot research prompt

The full prompt from `docs/BALLOT_PROMPT.md` must be translated into all 5 languages. This is the most translation-sensitive content in the app — it directly affects the quality of the AI conversation. Translation requirements:

- **Vietnamese:** Use the formal "bạn" register (respectful but not stiff). Vietnamese voters skew older and formal address is appropriate for a civic tool.
- **Chinese (Simplified Mandarin):** Use the informal "你" register (consistent with a helpful tool, not a government document). Simplified characters only (not Traditional).
- **Arabic:** Use Modern Standard Arabic (MSA), not a regional dialect. MSA is understood across all Arabic-speaking communities and is the standard for written civic materials.
- **All languages:** The prompt must read naturally to a native speaker, not like machine translation. Civic terminology (ballot, proposition, primary, general election, polling place) should use the terms voters in that community would actually recognize.

### The pre-filled context block

The context block appended to the prompt (with the user's location, dates, and ballot data from Phase 3) must be generated in the selected language. Date formatting should follow the conventions of each language:

| Language | Date format example | Note |
|----------|-------------------|------|
| English | March 3, 2026 | Month name, day, year |
| Spanish | 3 de marzo de 2026 | Day de month de year (existing) |
| Vietnamese | 3 tháng 3, 2026 | Day tháng month, year |
| Chinese | 2026年3月3日 | Year年month月day日 |
| Arabic | 3 مارس 2026 | Day month-name year (RTL) |

### Deadline status indicators

"12 days remaining" / "Passed" must be translated and should use the grammatically correct form in each language (Vietnamese and Chinese don't pluralize the same way English does; Arabic has dual forms).

---

## Translation Quality

### Source of translations

This spec does not prescribe whether translations are human-produced or machine-generated. That decision is made by the workflow during implementation. However:

- The AI prompt translation is the highest-stakes content. If the workflow uses machine translation, the spec requires a "translation review" step where the AI verifies its own translations by back-translating to English and checking for meaning drift.
- UI labels and error messages are lower-stakes but should still be reviewed for natural phrasing.
- The write-up should document whether each workflow used human translation, machine translation, or a hybrid approach, and any quality issues observed.

### Character encoding

All translations must use UTF-8 encoding. Vietnamese diacritics (ă, â, ê, ô, ơ, ư, đ), Chinese characters, and Arabic script must render correctly in:

- The web UI
- The copied prompt text (clipboard)
- The pre-filled context block
- The printable ballot output (Phase 5)

---

## Layout and Typography Considerations

### Text length variation

Translations vary significantly in length. The UI must handle this without breaking:

| Language | Relative length vs English | Note |
|----------|---------------------------|------|
| Spanish | ~20-30% longer | Already handled in Phase 2 |
| Vietnamese | ~10-20% longer | Diacritics add visual height |
| Chinese | ~30-50% shorter | Denser characters carry more meaning per character |
| Arabic | ~20-30% longer | RTL, different character widths |

- Buttons, labels, and cards should accommodate the longest translation without truncation or overflow
- Chinese text may look sparse in containers sized for English — ensure it still looks intentional, not broken
- Vietnamese diacritics need adequate line-height so characters don't clip

### Font considerations

- The UI should use a font stack that supports all 5 scripts. System font stacks are acceptable (most modern OS include CJK and Arabic fonts).
- If a custom font is used, it must include or fall back to fonts supporting Vietnamese diacritics, CJK characters, and Arabic script.
- Arabic text should use an appropriate Arabic font (not a Latin font attempting to render Arabic).

---

## Acceptance Criteria

- [ ] Language selector displays all 5 languages, each in its native script
- [ ] Switching to any language updates all UI text immediately without page reload or state loss
- [ ] Selected language persists across page refresh
- [ ] `<html lang>` attribute updates correctly for each language
- [ ] Arabic selection sets `dir="rtl"` on `<html>` and the entire layout mirrors correctly
- [ ] Switching from Arabic to any LTR language fully reverts RTL layout
- [ ] All UI text, error messages, labels, and instructions are translated in all 5 languages
- [ ] The full AI ballot research prompt is translated into all 5 languages
- [ ] The pre-filled context block generates in the selected language with correct date formatting
- [ ] Deadline status indicators use grammatically correct forms per language
- [ ] Vietnamese diacritics, Chinese characters, and Arabic script render correctly in UI, clipboard copy, and prompt output
- [ ] All `data-testid` attributes from previous phases still work
- [ ] New `language-option-{code}` test IDs are present for each language
- [ ] Existing e2e tests still pass (no regressions)
- [ ] New e2e tests cover: selecting each language, verifying UI text updates, Arabic RTL layout, date format per language, prompt output in each language
- [ ] Text does not overflow, truncate, or break layout in any language

---

## What This Phase Does NOT Do

- Does NOT add the LLM chat window (that's Phase 5)
- Does NOT add language auto-detection based on browser locale (out of scope — user selects manually)
- Does NOT translate the data content returned by APIs (candidate names, ballot measure titles, etc. remain in English as that's how they appear on the actual ballot)
- Does NOT add Traditional Chinese (only Simplified Mandarin)
- Does NOT add regional Arabic dialects (MSA only)

---

## E2e Test Extensions

New Playwright e2e tests for Phase 4:

- **Language selection for each language:** Click each language option → verify all visible UI text changes
- **Arabic RTL:** Select Arabic → verify `dir="rtl"` on `<html>`, verify layout mirrors (screenshot comparison if available)
- **Date formatting:** For each language, verify the deadline status displays dates in the correct format
- **Prompt output per language:** For each language, submit a zip code → verify the prompt output is in the selected language
- **Language persistence:** Select Vietnamese → refresh page → verify Vietnamese is still active
- **State preservation:** Submit zip code → switch language → verify results remain displayed (not cleared)
- **Character rendering:** Verify Vietnamese diacritics, Chinese characters, and Arabic script appear correctly (no replacement characters or boxes)

**Test environment note:** These tests should use known translation strings (not rely on external translation APIs) so they're deterministic.

---

## Measurement Notes

Phase 4 metrics should capture the Phase 3 → Phase 4 delta. Key signals:

- **Bundle size** — Adding 3 language files with full prompt translations adds meaningful content. Does the workflow lazy-load translations or bundle everything?
- **Code duplication** — With 5 languages, duplicate patterns become more visible. Does the workflow abstract translation lookup or multiply switch statements?
- **Cyclomatic complexity** — RTL support adds conditional logic. Is it cleanly isolated or scattered through components?
- **Test coverage** — Does the workflow test each language, or only test the i18n infrastructure generically?
- **LOC delta** — How much code does each language add? Ideally the marginal cost of language N+1 is small once the i18n infrastructure exists.
