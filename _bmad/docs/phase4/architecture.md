# Architecture: Phase 4 — Extended Language Support

## Modified Files

### `src/lib/translations.ts`
- `Language` type: `"en" | "es" | "vi" | "zh" | "ar"`
- Add `vi: Translations`, `zh: Translations`, `ar: Translations` records
- Update `getTranslation()` to switch on all 5 languages
- All 5 records must implement the full `Translations` interface (same keys)

### `src/lib/i18n.tsx`
- `LanguageProvider`: update localStorage hydration to validate all 5 language codes
- Update `useEffect` to set `document.documentElement.lang` (already done)
- Add new effect: set `document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"` on language change
- SSR: initial `lang="en"` and `dir="ltr"` set in `layout.tsx`; hydration corrects on mount

### `src/components/LanguageToggle.tsx` → `LanguageSelector.tsx`
- Replace toggle button with a `<select>` or custom dropdown
- Keep filename as `LanguageToggle.tsx` to minimize diff (rename only if tests require)
- `data-testid="language-toggle"` stays on the container/select element
- Each `<option>` gets `data-testid="language-option-{code}"`
- Option labels in native script: English, Español, Tiếng Việt, 中文, العربية
- Accessible: `<label>` or `aria-label` on select; announces language change to screen reader
- Mobile: native `<select>` is compact by default; works well on small viewports

### `src/lib/deadlineUtils.ts`
- `formatDate(dateStr: string, lang?: Language): string`
- Add cases for `vi`, `zh`, `ar`:
  - vi: `${day} tháng ${month}, ${year}` (Vietnamese month names)
  - zh: `${year}年${month}月${day}日` (numeric, no month names)
  - ar: `${day} ${arabicMonthName} ${year}` (Arabic month names, MSA)
- Keep existing `en` and `es` branches unchanged

### `src/lib/promptBuilder.ts`
- Add `MAIN_PROMPT_VI`, `MAIN_PROMPT_ZH`, `MAIN_PROMPT_AR` constants
- Update `buildPrompt()`: select prompt constant based on `lang`
- Add `buildContextBlockVi()`, `buildContextBlockZh()`, `buildContextBlockAr()`
- Update `buildContextBlock()` dispatcher to branch on all 5 languages

### `src/app/layout.tsx`
- Add `lang="en"` and `dir="ltr"` to `<html>` tag as SSR defaults
- Client-side `LanguageProvider` updates these on mount/language-change

## New Architecture Considerations

### RTL Support
- CSS: add `[dir="rtl"]` variants in `globals.css` for directional utilities
- Tailwind: use `rtl:` variants where needed (Tailwind 3+ supports `rtl:` prefix)
- Icons: use CSS `transform: scaleX(-1)` under `[dir="rtl"]` for directional icons
- No separate RTL stylesheet needed — CSS logical properties + Tailwind rtl: variants handle it

### Translation Quality
- Machine translation for all 3 new languages
- Back-translation verification step: translate vi/zh/ar prompts back to English, compare semantic accuracy
- Civic terminology reviewed: polling place, ballot measure, primary, general election in all 5 languages

### Font Strategy
- System font stack: no custom fonts needed
- Tailwind's default sans-serif stack covers CJK on modern OS (macOS: Hiragino; Windows: SimSun; Linux: Noto)
- Arabic: system Arabic fonts (Geeza Pro on macOS, Times New Roman on Windows fallback to Arabic)
- Vietnamese: diacritics supported in all modern system fonts; set adequate `line-height`

## Data Flow (unchanged from Phase 3)
i18n → LanguageProvider (context) → all components read `t()` hook → no API changes needed

## No New Files Required
All Phase 4 changes are modifications to existing files. No new API routes, no new data files.

## Test File Changes

### `src/lib/__tests__/translations.test.ts`
- Update "en and es have same keys" test to loop over all 5 languages
- Add vi/zh/ar value completeness tests

### `src/lib/__tests__/promptBuilder.test.ts`
- Add tests for vi/zh/ar context blocks and prompts

### `src/lib/__tests__/deadlineUtils.test.ts`
- Add formatDate tests for vi/zh/ar

### `e2e/language-toggle.spec.ts` (updated) + `e2e/phase4.spec.ts` (new)
- Update existing spec: toggle → selector behavioral changes (now uses select)
- New spec: Arabic RTL, date formats, persistence, state preservation per Phase 4 spec
