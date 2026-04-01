---
title: "feat: Add Spanish Language Support"
type: feat
status: active
date: 2026-04-01
deepened: 2026-04-01
---

# feat: Add Spanish Language Support

## Enhancement Summary

**Deepened on:** 2026-04-01
**Sections enhanced:** 4 (Architecture, Implementation, Technical Considerations, Edge Cases)
**Research sources:** Codebase analysis, existing solution doc (`docs/solutions/build-patterns/`), Next.js 15 i18n patterns

### Key Improvements
1. Hydration mismatch prevention — render children without context until `mounted` state is true
2. Screen reader announcement pattern for language switches (WCAG 4.1.3)
3. Flexible CSS patterns for Spanish text expansion (remove fixed `w-20` widths, use `shrink-0 whitespace-nowrap`)

### New Considerations Discovered
- `useRef(new Date()).current` pattern for stable dates must be preserved (from solution doc)
- Skip-to-content link in layout.tsx must also be translated
- `date-fns parseISO` must continue to be used (never `new Date("YYYY-MM-DD")`) per solution doc

## Overview

Extend the ballot research tool with full Spanish language support. A language toggle lets users switch between English and Espanol at any time. All user-facing text — UI labels, error messages, instructions, tips, footer, the full AI ballot prompt, and the pre-filled context block — must render in the selected language. The architecture must support adding a third language by adding only translation content.

**Spec:** `docs/PHASE2_SPEC.md`

## Problem Statement / Motivation

Phase 2 of the workflow experiment. Every framework branch receives the same modification request: add Spanish language support. This measures how each framework handles extending an existing codebase with a cross-cutting concern (i18n).

## Proposed Solution

Lightweight custom i18n using React Context + typed translation objects. No external i18n library needed — the app has ~100 strings and 2 languages. This avoids dependency bloat and keeps the solution auditable.

### Architecture

```
src/lib/translations.ts     — typed Translation interface + en/es records
src/lib/i18n.tsx             — LanguageProvider context, useLanguage hook, Language type
src/components/LanguageToggle.tsx — toggle button (fixed top-right, keyboard accessible)
src/lib/generatePrompt.ts   — extend with lang param, full Spanish BALLOT_PROMPT, Spanish context block
src/lib/date-utils.ts       — extend formatDate with locale param for Spanish dates
```

**Key design decisions:**
1. **No i18n library** — custom context is simpler for 2 languages with no routing/middleware needs
2. **Complete Spanish BALLOT_PROMPT** — stored as full prose translation, not interpolated fragments (per spec: "piecemeal assembly produces unnatural text")
3. **State data values stay English** — per spec, only labels/structure translate, not election data
4. **localStorage persistence** — language choice persists across refreshes
5. **`document.documentElement.lang` sync** — updates `<html lang="">` on switch for accessibility

### Research Insights — Architecture

**Hydration mismatch prevention:** The LanguageProvider must handle SSR/CSR mismatch. On first render, `localStorage` isn't available. Pattern:
```typescript
const [mounted, setMounted] = useState(false);
useEffect(() => { /* read localStorage, setMounted(true) */ }, []);
if (!mounted) return <>{children}</>; // Skip context until hydrated
```

**Screen reader announcements (WCAG 4.1.3):** When language changes, create a temporary `aria-live="polite"` region:
```typescript
function announceToScreenReader(message: string) {
  const el = document.createElement("div");
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.className = "sr-only";
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}
```

**Existing pattern to preserve** (from `docs/solutions/build-patterns/`):
- `useRef(new Date()).current` for stable `today` reference
- `date-fns parseISO` for all YYYY-MM-DD parsing (never `new Date()`)
- `useRef` + cleanup for clipboard timeout (stale closure prevention)

## Technical Considerations

- **Text expansion:** Spanish text is ~20-30% longer than English. Remove fixed widths (e.g., `w-20` on deadline labels in StateInfoCard). Use `shrink-0 whitespace-nowrap` for labels and let flex-wrap handle overflow.
- **Date formatting:** Use `toLocaleDateString("es-ES", {year: "numeric", month: "long", day: "numeric"})` for Spanish dates (e.g., "3 de marzo de 2026"). Preserve existing `date-fns parseISO` for parsing.
- **Server/client boundary:** page.tsx is a Server Component. The hero, tips, and footer sections have hardcoded English strings. Solution: create a `PageContent` client component that wraps all translatable content and uses `useLanguage()`. The LanguageProvider goes in layout.tsx wrapping `{children}`.
- **Existing solution patterns:** `docs/solutions/build-patterns/nextjs15-react19-static-data-app.md` documents timezone-safe date parsing, stable date refs, stale-closure clipboard — all must be preserved.

## Implementation Phases

### Phase 1: Translation Infrastructure

**1a. Create `src/lib/translations.ts`**

Define a `Translations` TypeScript interface covering every user-facing string. Group by component/section:

```typescript
export type Language = "en" | "es";

export interface Translations {
  meta: { title: string; description: string };
  hero: { headline: string; subtitle: string; worksWith: string };
  zipForm: { label: string; placeholder: string; submit: string; errorEmpty: string; errorInvalid: string };
  stateSelector: { title: string; description: string; label: string; placeholder: string };
  stateInfo: { titleSuffix: string; registrationDeadlines: string; online: string; byMail: string; inPerson: string; postmarkNote: string; receivedNote: string; sameDayAvailable: string; notAvailable: string; earlyVoting: string; earlyVotingNotAvailable: string; voterId: string; idRequired: string; idNotRequired: string; phonesAtPolls: string; sampleBallot: string; countyOffice: string; checkRegistration: string };
  deadlineStatus: { passed: string; daysLeft: (n: number) => string; unavailable: string };
  promptOutput: { title: string; instruction: string; copyButton: string; copied: string; copiedMessage: string; copyFallback: string };
  tips: { title: string; items: string[] };
  footer: { share: string; attribution: string };
  errors: { notFoundTitle: string; notFoundMessage: (zip: string) => string; noElection: (state: string) => string; deadlinesPassed: string };
  prompt: { ballotPrompt: string };
  accessibility: { skipToContent: string; languageToggleLabel: string };
}
```

Populate `en` record by extracting all hardcoded strings from existing components. Populate `es` record with fluent Spanish translations per spec reference table.

**Edge cases for translations:**
- `daysLeft` must handle singular/plural: "1 day left" vs "5 days left" / "Queda 1 día" vs "Quedan 5 días"
- Error messages with interpolated values (zip code, state name) use function signatures
- Tips items array must have exactly the same count in both languages

**1b. Create `src/lib/i18n.tsx`**

LanguageProvider with:
- `useState<Language>("en")` default
- `useEffect` on mount: read localStorage, set language, set `document.documentElement.lang`
- `mounted` guard to prevent hydration mismatch
- `setLanguage` handler: update state + localStorage + `document.documentElement.lang` + screen reader announcement
- Export `useLanguage()` hook returning `{ language, setLanguage, t }`

### Phase 2: Language Toggle Component

**2a. Create `src/components/LanguageToggle.tsx`**

- Fixed position top-right (`fixed top-4 right-4 z-50`)
- `<button>` element with `data-testid="language-toggle"`
- Shows "Espanol" when in English, "English" when in Spanish
- Keyboard accessible (native button, Enter/Space)
- `aria-label` announces action: "Switch to Espanol" / "Cambiar a English"
- Styled to not overlap mobile content (check at 375px width)

### Phase 3: Update Components to Use Translations

**3a. Wrap app in LanguageProvider**

Add `<LanguageProvider>` in `layout.tsx` wrapping `{children}` inside `<body>`.

**3b. Create `src/components/PageContent.tsx` (client component)**

Move hero, tips, and footer markup from `page.tsx` into a `PageContent` client component that uses `useLanguage()` for all strings. `page.tsx` becomes a thin server component that renders `<PageContent />`.

**3c. Update each component:**

| Component | Changes |
|-----------|---------|
| `PageContent.tsx` (new) | Hero, tips, footer using `t.hero.*`, `t.tips.*`, `t.footer.*` |
| `ZipForm.tsx` | Replace hardcoded strings with `t.zipForm.*` |
| `StateSelectorModal.tsx` | Replace strings with `t.stateSelector.*` |
| `StateInfoCard.tsx` | Replace all labels with `t.stateInfo.*`, pass `language` to `getDeadlineStatus` and `formatDate` |
| `PromptOutput.tsx` | Replace strings with `t.promptOutput.*` |
| `BallotToolClient.tsx` | Replace error messages with `t.errors.*`, pass `language` to `generatePrompt` |
| `LanguageToggle.tsx` | Rendered by LanguageProvider or PageContent |

**3d. Update `date-utils.ts`**

Add `language: Language` parameter to `formatDate()`:
- `en`: `toLocaleDateString("en-US", ...)` -> "March 3, 2026"
- `es`: `toLocaleDateString("es-ES", ...)` -> "3 de marzo de 2026"

Update `getDeadlineStatus()` to accept `language` and return translated labels. Use translation functions for pluralization.

**3e. Update `generatePrompt.ts`**

- Add `language: Language` parameter to `generatePrompt()` and `buildContextBlock()`
- Add `BALLOT_PROMPT_ES` constant — complete fluent Spanish translation (~210 lines, "tú" voice)
- Spanish `buildContextBlock`: Spanish labels for each field, Spanish date format, greeting "¡Hola! Voy a votar en **{state}**..."
- Return `language === "es" ? BALLOT_PROMPT_ES : BALLOT_PROMPT` + context block

### Phase 4: Testing & Verification

- `npm run build` — must succeed
- `npx playwright test` — all Phase 1 e2e tests must still pass
- `npm run lint` — 0 errors
- Manual verification: language toggle, persistence, state preservation, `lang` attribute

## Acceptance Criteria

- [ ] Language toggle visible at all times with `data-testid="language-toggle"`
- [ ] All UI text switches between English and Spanish
- [ ] Language persists across page refreshes (localStorage)
- [ ] State doesn't reset on language switch
- [ ] Full Spanish BALLOT_PROMPT (fluent, "tú" voice)
- [ ] Spanish context block with correct format per spec example
- [ ] Spanish date formatting ("3 de marzo de 2026")
- [ ] Deadline status labels in selected language
- [ ] `<html lang="">` updates on switch
- [ ] Keyboard-accessible toggle (Enter/Space)
- [ ] Screen reader announces language change
- [ ] No layout breaks from longer Spanish text at any breakpoint
- [ ] All Phase 1 e2e tests still pass
- [ ] ESLint 0 errors
- [ ] Adding a third language requires only new translation content in translations.ts

## Dependencies & Risks

- **Risk:** Server component boundary — page.tsx hero/tips/footer are server-rendered. Moving to client component increases JS bundle.
- **Mitigation:** String data is ~5-10KB. PageContent client component is a minimal wrapper.
- **Risk:** Spanish BALLOT_PROMPT quality — must be fluent, not machine-translated.
- **Mitigation:** Write complete prose translation with natural "tú" voice, matching tone of English original.
- **Risk:** Hydration mismatch if localStorage language differs from SSR default.
- **Mitigation:** `mounted` guard in LanguageProvider — render without context until hydrated.

## Sources & References

- Spec: `docs/PHASE2_SPEC.md`
- Phase 1 spec: `docs/PROJECT_SPEC.md`
- Existing patterns: `docs/solutions/build-patterns/nextjs15-react19-static-data-app.md`
- Current components: `src/components/`, `src/lib/`
