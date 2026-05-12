# Product Brief: Extended Language Support — Vietnamese, Chinese, Arabic (Phase 4)

## Product Vision
Scale the Voter Choice ballot research tool from 2 languages (English, Spanish) to 5 languages by adding Vietnamese, Simplified Chinese (Mandarin), and Arabic. This is an i18n stress-test: Phase 2 added a single Latin-script language; Phase 4 adds scripts with different character sets, text direction (Arabic RTL), and date formatting conventions.

## Problem Statement
The current tool serves English- and Spanish-speaking voters. Texas alone has 57K+ Vietnamese-speaking voters with limited English proficiency (highest LEP rate of any language group), plus significant Chinese and Arabic-speaking communities. Section 203 of the Voting Rights Act legally requires Vietnamese and Chinese materials in multiple Texas counties. The Arabic community (102K+ statewide) is a significant underserved population without legal requirements.

More technically: Phase 2 proved the i18n architecture works for one additional Latin-script language. Phase 4 tests whether it actually scales — specifically to CJK characters, Arabic script, RTL layout mirroring, and grammatically complex date/deadline constructs.

## Goals
- Replace the English ↔ Spanish toggle with a 5-language selector (English, Español, Tiếng Việt, 中文, العربية)
- Add complete UI translations for Vietnamese, Chinese (Simplified), and Arabic
- Translate the full AI ballot research prompt into all 5 languages with correct register/formality
- Add Arabic RTL layout support: html[dir=rtl], full page mirroring, reversion on language switch
- Extend date formatting per language (Vietnamese: day tháng month; Chinese: Year年Month月Day日; Arabic: day month-name year)
- Language persistence across page refresh (localStorage)
- All existing Phase 1-3 data-testid attributes preserved

## Non-Goals (Phase 4)
- LLM chat window (Phase 5)
- Browser locale auto-detection
- Traditional Chinese (Simplified Mandarin only)
- Regional Arabic dialects (Modern Standard Arabic only)
- Translating API data content (candidate names, ballot titles stay in English)

## Success Criteria
- Language selector shows all 5 options in native script
- Switching language updates all UI text without page reload or state loss
- Arabic selection: html[dir=rtl] set, full layout mirrors, fully reverts on switch back
- All UI text, error messages, labels, instructions translated in all 5 languages
- Full AI ballot research prompt translated in all 5 languages (correct register per spec)
- Context block generates in selected language with correct date format
- Vietnamese diacritics, Chinese characters, Arabic script render correctly in UI and clipboard
- language-option-{code} test IDs present for each language
- All existing e2e tests pass (no regressions — updated where toggle→selector behavior changed)
- New e2e tests: language selection, Arabic RTL, date formats, prompt output, persistence, state preservation
