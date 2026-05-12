# Feature Specification: Extended Language Support (Vietnamese, Chinese, Arabic)

**Feature Name**: extended-language-support
**Created**: 2026-05-12
**Status**: Ready for Planning
**Source**: docs/PHASE4_SPEC.md

---

## Overview

Extend the existing bilingual (English/Spanish) ballot research tool to support three additional languages: Vietnamese, Chinese (Simplified Mandarin), and Arabic. These languages serve legally required and underserved Texas voter communities. This phase tests whether the i18n architecture from Phase 2 actually scales to languages with different character sets, text directions, and formatting conventions.

---

## User Scenarios & Testing

### Five-Language Selector Flow

1. User visits the page (English is the default)
2. User sees a language selector displaying five language options, each in its native script: English, Español, Tiếng Việt, 中文, العربية
3. User clicks/selects any language
4. All user-facing text updates immediately to the selected language, without a page reload
5. Application state is preserved (any displayed zip code results remain visible)
6. User refreshes the page — language preference is restored from browser storage
7. User can switch to any other language at any time

### Arabic RTL Flow

1. User selects Arabic (العربية)
2. The entire page layout mirrors right-to-left: navigation, text alignment, reading order
3. The `<html>` element's `dir` attribute changes to `rtl`
4. User switches back to any LTR language — layout fully reverts, no RTL artifacts persist

### Multilingual Prompt Flow

1. User selects Vietnamese
2. User enters a zip code and submits
3. State info card labels appear in Vietnamese; data values remain in English
4. The AI prompt is generated in Vietnamese with correct date formatting (3 tháng 3, 2026)
5. User copies the Vietnamese prompt and pastes into a chatbot

### Deadline Status Translation Flow

1. User selects Chinese
2. Deadline counters display in Chinese using grammatically correct forms (no English pluralization rules)
3. Dates display in Chinese format (2026年3月3日)

### Character Rendering Flow

1. User switches through all five languages
2. Vietnamese diacritics (ă, â, ê), Chinese characters, and Arabic script all render correctly in UI, clipboard copy, and prompt output
3. No replacement characters or boxes appear

### Phase 2/3 Regression Flow

1. User loads page in English (default)
2. All Phase 2 and Phase 3 acceptance criteria continue to pass unchanged
3. All existing `data-testid` attributes remain functional

---

## Functional Requirements

### FR-L01: Language Selector

The page shall display a language selector (`data-testid="language-toggle"`) that is visible at all times regardless of scroll position. The selector shall display all five language options, each labeled in its own script: English, Español, Tiếng Việt, 中文, العربية. Each option shall have `data-testid="language-option-{code}"` (en, es, vi, zh, ar). It shall be operable via keyboard and announced to screen readers.

### FR-L02: Default Language

The default language is English. Language preference persists in browser storage across page refreshes.

### FR-L03: Immediate Language Switch

Switching to any language updates all user-facing text immediately without a page reload and without losing application state (zip results remain displayed).

### FR-L04: HTML Attributes

The `<html lang>` attribute shall reflect the active language code: `en`, `es`, `vi`, `zh`, `ar`. When Arabic is selected, `<html dir="rtl">` shall also be set. When switching away from Arabic, `dir` shall be reset to `ltr`.

### FR-L05: RTL Layout

When Arabic is selected, the entire page layout mirrors right-to-left. All layout, text alignment, and reading order follows RTL conventions. Directional icons/arrows flip. Numbers remain LTR (standard for Arabic text). When switching to any LTR language, layout fully reverts.

### FR-L06: UI Text Translation

All user-facing text shall be available in all five languages: hero section, zip form labels, error messages, state info card labels, deadline status indicators, copy button, instructions, tips, and footer.

### FR-L07: AI Prompt Translation

The full AI ballot research prompt (from docs/BALLOT_PROMPT.md) shall be translated into all five languages. Vietnamese shall use formal "bạn" register. Chinese shall use simplified characters and informal "你" register. Arabic shall use Modern Standard Arabic (MSA).

### FR-L08: Context Block Generation

The pre-filled context block shall be generated in the selected language. Date formatting follows per-language conventions: English (March 3, 2026), Spanish (3 de marzo de 2026), Vietnamese (3 tháng 3, 2026), Chinese (2026年3月3日), Arabic (3 مارس 2026).

### FR-L09: Deadline Status Grammar

Deadline status indicators ("X days remaining", "Passed", "Due today") shall use grammatically correct forms for each language — no English pluralization applied to Vietnamese, Chinese, or Arabic.

### FR-L10: Character Encoding

All five languages shall render correctly in UTF-8: Vietnamese diacritics, CJK characters, and Arabic script shall display correctly in the UI, clipboard copy, and prompt output.

### FR-L11: Layout Stability

The UI shall accommodate text length variation across all five languages without truncation, overflow, or broken layout. Containers sized for English must handle Vietnamese (10-20% longer), Arabic (20-30% longer), and Chinese (30-50% shorter) without breaking.

### FR-L12: Backward Compatibility

All `data-testid` attributes from Phase 1, Phase 2, and Phase 3 remain present and functional. The `language-toggle` testid stays on the selector element for backward compatibility.

---

## Success Criteria

- Users can select any of five languages and see all text update instantly without page reload
- Arabic selection causes complete RTL layout; switching back causes complete LTR revert
- Zero text overflow or truncation in any of the five languages across all screen sizes
- All existing automated tests continue to pass (no regressions)
- The ballot research prompt reads naturally in each language to a native speaker standard
- Language preference persists correctly across page refreshes

---

## Key Entities

- **Locale** — one of: en, es, vi, zh, ar
- **Translations dictionary** — typed TypeScript object implementing the Translations interface for a given locale
- **Language selector** — UI control replacing the Phase 2 toggle; displays five options in native scripts
- **Ballot prompt** — full AI prompt document; one variant per locale
- **Context block** — pre-filled voter data section; locale-aware labels and date formatting

---

## Assumptions

- Translation quality: machine-generated translations reviewed via back-translation for the ballot prompt (highest-stakes content); UI labels generated and self-reviewed
- Font rendering: system font stacks are sufficient for all five scripts on modern OS (no custom font downloads required)
- RTL implementation: CSS logical properties and Tailwind `[dir=rtl]:` variants handle the layout flip without a separate RTL stylesheet
- Arabic date format: Day month-name year without numerals in the month (3 مارس 2026), consistent with civic documents

---

## Out of Scope

- LLM chat window (Phase 5)
- Browser locale auto-detection
- Translating API-returned data (candidate names, ballot measure titles remain in English as they appear on actual ballots)
- Traditional Chinese (Simplified only)
- Regional Arabic dialects (MSA only)
- Adding languages beyond these five
