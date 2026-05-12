# Phase 4 i18n Extension Design — Vietnamese, Chinese (Simplified), Arabic

**Date:** 2026-05-12
**Phase:** 4
**Framework:** Superpowers
**Spec source:** docs/PHASE4_SPEC.md

---

## Goal

Extend the existing EN/ES ballot research tool to support 5 languages: English, Español, Tiếng Việt, 中文, العربية. Key challenges: Arabic RTL layout, date formatting per locale, language persistence, and ensuring the AI ballot prompt quality in each language.

---

## Approaches Considered

### Option A: Inline expansion of existing translation structure
Extend `translations.ts` to include `vi`, `zh`, `ar` keys in the same `const translations` object. Pros: minimal architecture change, easy to follow existing patterns. Cons: the file gets large; ballot prompt text adds 3 more dedicated files.

### Option B: Split translations into per-language modules with lazy loading
Each language in its own file, dynamically imported. Pros: bundle splitting per language. Cons: async complexity with SSR/Next.js, risk of flash of untranslated content, overengineered for this app size.

### Option C: Keep structure but extract ballot prompts into separate files (recommended)
Same pattern as the EN/ES split (`ballotPromptText.ts` / `ballotPromptTextEs.ts`): add `ballotPromptTextVi.ts`, `ballotPromptTextZh.ts`, `ballotPromptTextAr.ts`. Extend `translations.ts` with the UI strings. This keeps the existing pattern, avoids async complexity, and separates the large prompt text from the UI string map. **Chosen.**

---

## Design

### 1. Type extension

```typescript
// src/lib/i18n/translations.ts
export type Language = "en" | "es" | "vi" | "zh" | "ar";
export const RTL_LANGUAGES = new Set<Language>(["ar"]);
```

### 2. Language context updates

`LanguageContext.tsx`:
- Validate stored lang against all 5 codes
- On language change, set `document.documentElement.lang`
- Set `document.documentElement.dir` = `"rtl"` for Arabic, `"ltr"` for others
- localStorage validation updated to accept all 5 codes

### 3. LanguageToggle → LanguageSelector

Replace toggle button with a `<select>` element (for maximum a11y):
- `data-testid="language-toggle"` (backward compat, required by spec)
- Each `<option>` gets `data-testid="language-option-{code}"`
- Displays each language in its native script
- Fixed top-right, compact, keyboard accessible

### 4. Translations expansion

`translations.ts` gets three new language blocks (`vi`, `zh`, `ar`) with all keys matching `en` and `es`. Functions (like `contextGreeting`) need implementations per language.

`daysLeftLabel()` extended:
- Vietnamese: `"Còn ${n} ngày"` (no pluralization)
- Chinese: `"还有 ${n} 天"` (no pluralization)
- Arabic: `"${n} أيام متبقية"` / `"${n} يوم متبقي"` (n=1: singular, n=2: dual, n>=3: plural)

Date formatting in `generatePrompt.ts`:
- Vietnamese: `"${d} tháng ${m}, ${y}"`
- Chinese: `"${y}年${m}月${d}日"`
- Arabic: Uses `Intl.DateTimeFormat('ar-EG')` for month names

### 5. Ballot prompt text files

Three new files:
- `src/lib/ballotPromptTextVi.ts` — formal "bạn" register
- `src/lib/ballotPromptTextZh.ts` — informal "你", Simplified characters
- `src/lib/ballotPromptTextAr.ts` — Modern Standard Arabic (MSA)

`generatePrompt.ts` updated to select correct prompt text by language.

### 6. RTL CSS

`src/app/globals.css`: leverage CSS logical properties and `[dir="rtl"]` selectors. No Tailwind `rtl:` variant needed (already supported in Tailwind v3+). Use `rtl:` prefix on directional classes where needed.

### 7. E2e tests

New test file: `e2e/phase4-languages.spec.ts` covering:
- Language selection for each of the 5 languages
- Arabic RTL: verify `dir="rtl"` on `html` element
- Date formatting verification per language
- Language persistence across page refresh
- State preservation when switching language after zip code entry
- Character rendering (no replacement characters)

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/i18n/translations.ts` | Add `vi`, `zh`, `ar` language blocks; extend `Language` type; extend `daysLeftLabel()` |
| `src/lib/i18n/LanguageContext.tsx` | RTL support; validate all 5 language codes |
| `src/components/LanguageToggle.tsx` | Replace toggle with `<select>` selector |
| `src/lib/generatePrompt.ts` | Extend `formatDate()` for vi/zh/ar; select correct ballot prompt text |
| `src/lib/ballotPromptTextVi.ts` | NEW: Vietnamese ballot prompt |
| `src/lib/ballotPromptTextZh.ts` | NEW: Chinese (Simplified) ballot prompt |
| `src/lib/ballotPromptTextAr.ts` | NEW: Arabic (MSA) ballot prompt |
| `src/app/globals.css` | RTL layout support |
| `e2e/phase4-languages.spec.ts` | NEW: Phase 4 language e2e tests |
| `src/lib/__tests__/` | Unit tests for formatDate, daysLeftLabel, generatePrompt with new languages |

---

## Acceptance Criteria Coverage

All criteria from PHASE4_SPEC.md are addressed:
- [x] 5-language selector with native scripts
- [x] Immediate language switching, no page reload
- [x] Persistence via localStorage
- [x] `<html lang>` update per language
- [x] Arabic RTL: `dir="rtl"` + layout mirroring via CSS logical properties / `rtl:` Tailwind
- [x] RTL reverts on switch back to LTR language
- [x] All UI text translated in all 5 languages
- [x] AI ballot prompt in all 5 languages
- [x] Context block in selected language with correct date formats
- [x] Grammatically correct day counts per language
- [x] UTF-8 correct rendering (all specified characters)
- [x] `data-testid` backward compat + new `language-option-{code}` IDs
- [x] E2e tests for all required scenarios
