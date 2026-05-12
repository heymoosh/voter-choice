# PRD: Phase 4 — Extended Language Support (Vietnamese, Chinese, Arabic)

## Overview
Extend the Voter Choice ballot research tool from 2 languages (English, Spanish) to 5 by adding Vietnamese (Tiếng Việt), Simplified Chinese (中文), and Arabic (العربية). Includes RTL layout support for Arabic, proper date formatting per language, full prompt translation, and updated e2e tests.

## User Stories

### US-1: 5-Language Selector
As a voter, I can select my preferred language from a selector showing all 5 options in their native scripts, so I can use the tool in my primary language.

**Acceptance Criteria:**
- Language selector shows: English, Español, Tiếng Việt, 中文, العربية
- Each option displays in its native script
- `data-testid="language-toggle"` preserved on selector element (backward compat)
- `data-testid="language-option-{code}"` on each option (en, es, vi, zh, ar)
- Selector is keyboard accessible and announced to screen readers
- Default language is English
- Switching any language updates all UI text immediately without page reload
- Existing application state (zip code results) is preserved on language switch

### US-2: Arabic RTL Layout
As an Arabic-speaking voter, when I select Arabic the entire page layout mirrors to right-to-left so I can read naturally.

**Acceptance Criteria:**
- Selecting Arabic sets `html[dir="rtl"]`
- Full page mirroring: navigation, text alignment, form layout, reading order
- Icons and directional elements (arrows, chevrons) flip
- Numbers remain left-to-right (standard Arabic)
- Switching from Arabic to any LTR language fully reverts `dir` to `ltr`
- No RTL artifacts persist after switching away from Arabic

### US-3: Full Prompt Translation
As a non-English speaker, the AI ballot research prompt I copy is fully translated in my selected language so the AI responds in my language.

**Acceptance Criteria:**
- Vietnamese prompt uses formal "bạn" register
- Chinese prompt uses informal "你" register, Simplified characters only
- Arabic prompt uses Modern Standard Arabic (MSA), not regional dialect
- Back-translation review step performed to check meaning drift
- All 5 language prompt variants cover all 7 steps of the original prompt

### US-4: Context Block in Selected Language
As a voter, the pre-filled context block appended to the prompt uses my selected language with correct date formatting.

**Acceptance Criteria:**
- English: "March 3, 2026"
- Spanish: "3 de marzo de 2026" (existing)
- Vietnamese: "3 tháng 3, 2026"
- Chinese: "2026年3月3日"
- Arabic: "3 مارس 2026"
- Deadline status indicators use grammatically correct forms per language (no incorrect plurals)

### US-5: Language Persistence
As a voter, my language preference is remembered across page refreshes.

**Acceptance Criteria:**
- Selected language stored in localStorage
- On page load, localStorage value restored without flash of wrong language
- `html[lang]` attribute updates to: en, es, vi, zh, ar
- For Arabic: `html[dir]` also updates

## Technical Requirements

### Translation Content
- All strings from `src/lib/translations.ts` must have vi, zh, ar records
- All new keys must maintain parity across all 5 languages
- Machine translation must include back-translation verification for prompt content

### Font Stack
- System font stack acceptable: covers CJK and Arabic on modern OS
- Vietnamese diacritics supported (no clipping)
- Line-height sufficient for Vietnamese combining marks

### Required data-testid attributes (Phase 4)
| `data-testid` | Element | Note |
|----------------|---------|------|
| `language-toggle` | Language selector control | Preserved from Phase 2 |
| `language-option-en` | English option | New in Phase 4 |
| `language-option-es` | Spanish option | New in Phase 4 |
| `language-option-vi` | Vietnamese option | New in Phase 4 |
| `language-option-zh` | Chinese option | New in Phase 4 |
| `language-option-ar` | Arabic option | New in Phase 4 |

## Out of Scope
- LLM chat window (Phase 5)
- Browser locale auto-detection
- Traditional Chinese
- Regional Arabic dialects
- Translating API response data (candidate names, ballot titles remain in English)
- Language N+1 beyond the 5 specified
