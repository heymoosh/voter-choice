---
title: "React i18n with Context + localStorage persistence"
date: 2026-05-11
problem: "Add multilingual support (EN/ES) to a Next.js app with language persistence and no page reload"
tags: [i18n, react-context, localStorage, next.js, accessibility]
---

# React i18n with Context + localStorage Persistence

## Problem Solved

Built multilingual support (English/Spanish) for a Next.js 15 voter tool using Compound Engineering workflow. Key challenge: toggle languages without page reload, preserve application state (zip code results), persist preference across refreshes.

## Solution

### Architecture

```
src/lib/i18n/
  translations.ts      — typed Translations interface + en/es dictionaries
  LanguageContext.tsx  — "use client" provider; localStorage read in useEffect (SSR-safe)
  prompts.ts           — complete prompt strings per language (not interpolated fragments)
src/components/
  LanguageToggle.tsx   — button with data-testid, aria-live announcer for screen readers
```

### Key Decisions

1. **Initial state = default language** — avoids SSR/hydration mismatch. localStorage only read in `useEffect`.
2. **Complete prompt translations** — spec required. Long-form prose with voice/tone. Never assemble from fragments.
3. **Language toggle as `<button>`** — keyboard-accessible (Enter/Space) by default. No extra ARIA role needed.
4. **`document.documentElement.lang` update** — triggers in `useEffect` after language state changes, satisfies accessibility requirement.
5. **Prompt rebuild on language change** — separate `useEffect` that fires on `language` dep only (intentionally excludes `result` dep to avoid infinite loops).

### Gotchas

- **`eslint-disable react-hooks/exhaustive-deps`** is intentional in the language-change `useEffect`. `result` is read but not a dep — we only want this effect on language change, not every result update.
- **Complexity warning** in `buildContextBlock` is unavoidable (22 vs limit 10) due to bilingual branching. Pre-existing warnings in `derive.ts` are unrelated to this feature.
- **Phase 1 unit tests still pass** because `buildFullPrompt` defaults `language = "en"` — no test changes needed.

### Pattern for Adding a Third Language

1. Add `"zh"` to the `Language` type union in `translations.ts`
2. Add a `zh: Translations` object
3. Add `BALLOT_PROMPT_ZH` in `prompts.ts` and update `getBallotPrompt` switch
4. Update toggle logic in `LanguageContext.tsx` if cycling through 3+ languages

No component or page changes needed.

## Result

- 42/42 Playwright e2e tests passing (all Phase 1 tests green)
- 5/5 vitest unit tests passing
- Lint exits 0 (warnings are pre-existing)
- Build succeeds with `--turbo` flag
