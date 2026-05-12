# Epics and Stories: Phase 4 — Extended Language Support

## Epic 1: i18n Infrastructure Expansion

### Story 1.1: Language type and translation records
**As a** developer  
**I want** to add vi, zh, ar to the Language type and provide complete translation records  
**So that** all UI text can be displayed in the new languages

**Tasks:**
- Add `"vi" | "zh" | "ar"` to `Language` type in `translations.ts`
- Add `vi: Translations`, `zh: Translations`, `ar: Translations` objects with all keys
- Update `getTranslation()` to handle all 5 languages
- Update localStorage validation in `i18n.tsx` to accept vi/zh/ar

**DoD:**
- All 5 language records implement the full `Translations` interface
- `getTranslation()` returns correct string for each language/key combo
- Existing unit tests pass; new tests added for vi/zh/ar completeness

### Story 1.2: Date formatting for 3 new languages
**As a** voter  
**I want** dates formatted per my language conventions  
**So that** registration deadlines and election dates are easy to read

**Tasks:**
- Extend `formatDate()` in `deadlineUtils.ts` with `lang` parameter for vi/zh/ar
- vi: `${day} tháng ${month}, ${year}`
- zh: `${year}年${month}月${day}日`
- ar: `${day} ${MSA-month-name} ${year}`
- Update all callers to pass `lang` where needed

**DoD:**
- Unit tests verify correct format for each language

### Story 1.3: Arabic RTL support
**As an** Arabic-speaking voter  
**I want** the page layout to mirror right-to-left when Arabic is selected  
**So that** I can read naturally

**Tasks:**
- Add RTL effect in `i18n.tsx`: `document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"`
- Add `lang="en" dir="ltr"` SSR defaults to `<html>` in `layout.tsx`
- Add `[dir="rtl"]` CSS utilities in `globals.css` for mirroring layout
- Use Tailwind `rtl:` variants for directional spacing/alignment
- Flip directional icons with CSS `transform: scaleX(-1)` under `[dir="rtl"]`

**DoD:**
- Selecting Arabic sets `html[dir=rtl]`; switching to any other language reverts to `ltr`
- Page layout visually mirrors in RTL
- No RTL artifacts persist after switching away

## Epic 2: Language Selector UI

### Story 2.1: Replace toggle with 5-language selector
**As a** voter  
**I want** to select from 5 language options in a clear selector  
**So that** I can easily switch to my language

**Tasks:**
- Rewrite `LanguageToggle.tsx` to use a `<select>` element
- Options: English, Español, Tiếng Việt, 中文, العربية
- `data-testid="language-toggle"` on the `<select>` element
- `data-testid="language-option-{code}"` on each `<option>` (en, es, vi, zh, ar)
- `<label>` / `aria-label` for accessibility
- Live region for screen reader announcements on language change
- Mobile: native `<select>` is compact; no custom dropdown needed

**DoD:**
- All 5 languages selectable
- data-testid attributes correct
- Keyboard accessible (native select inherits keyboard support)
- Mobile viewport: selector visible and usable

## Epic 3: Prompt and Context Translation

### Story 3.1: Vietnamese prompt translation
**As a** Vietnamese-speaking voter  
**I want** the AI ballot research prompt in Vietnamese  
**So that** the AI responds in Vietnamese

**Tasks:**
- Add `MAIN_PROMPT_VI` constant to `promptBuilder.ts` (formal "bạn" register)
- Add `buildContextBlockVi()` with Vietnamese date formatting
- Update `buildPrompt()` dispatcher

**DoD:**
- Back-translation review: key sections back-translated to English, meaning drift < acceptable threshold
- Civic terms use voter-recognized Vietnamese: phiếu bầu, cuộc bầu cử, địa điểm bỏ phiếu
- `buildPrompt(state, zip, election, "vi")` returns Vietnamese prompt + context

### Story 3.2: Chinese (Simplified) prompt translation
**As a** Chinese-speaking voter  
**I want** the AI ballot research prompt in Simplified Chinese  
**So that** the AI responds in Chinese

**Tasks:**
- Add `MAIN_PROMPT_ZH` constant (informal "你" register, Simplified characters only)
- Add `buildContextBlockZh()` with Chinese date formatting
- Update `buildPrompt()` dispatcher

**DoD:**
- Simplified characters throughout (no Traditional)
- Civic terms: 选票, 选举, 投票站, 候选人
- Back-translation reviewed

### Story 3.3: Arabic prompt translation
**As an** Arabic-speaking voter  
**I want** the AI ballot research prompt in Arabic (MSA)  
**So that** the AI responds in standard Arabic

**Tasks:**
- Add `MAIN_PROMPT_AR` constant (Modern Standard Arabic, no dialect)
- Add `buildContextBlockAr()` with Arabic date formatting
- Update `buildPrompt()` dispatcher

**DoD:**
- MSA throughout, no Egyptian/Levantine/Gulf dialect markers
- Civic terms: ورقة الاقتراع, الانتخابات, مركز التصويت, المرشح
- Back-translation reviewed
- RTL text renders correctly in prompt textarea

## Epic 4: Tests

### Story 4.1: Unit test expansion for 5 languages
**As a** developer  
**I want** unit tests that verify all 5 language translations are complete and correct  
**So that** a missing key is caught before e2e

**Tasks:**
- `translations.test.ts`: loop over all 5 languages, assert all keys non-empty
- `deadlineUtils.test.ts`: add formatDate tests for vi/zh/ar
- `promptBuilder.test.ts`: add context block tests for vi/zh/ar

### Story 4.2: E2e test expansion for new languages
**As a** developer  
**I want** e2e tests that verify the new language functionality in a browser  
**So that** the full stack (UI → state → output) works for each language

**Tasks:**
- Update `e2e/language-toggle.spec.ts`: adapt to selector semantics (was toggle, now select)
- Create `e2e/phase4.spec.ts` with:
  - Language selection for each of the 5 languages
  - Arabic RTL: verify `html[dir=rtl]`, visual mirror
  - Date formatting per language (using mocked state data)
  - Prompt output in each language
  - Language persistence: select Vietnamese → refresh → still Vietnamese
  - State preservation: submit zip → switch language → results still visible
  - Character rendering: verify no replacement characters
