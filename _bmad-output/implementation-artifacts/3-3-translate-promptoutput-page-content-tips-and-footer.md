# Story 3.3: Translate PromptOutput, Page Content, Tips, and Footer

Status: review

## Story

As a Spanish-speaking voter,
I want all remaining UI text (prompt section, tips, footer, skip link) to appear in Spanish,
so that the entire page is consistent in Spanish mode.

## Acceptance Criteria

1. **Given** Spanish is active
   **When** the PromptOutput section renders
   **Then** the section heading shows "Tu Prompt Personalizado", copy button shows "Copiar en el portapapeles", and instructions show "Copia este prompt y pégalo como tu primer mensaje en cualquier chatbot de IA"

2. **Given** user copies the prompt in Spanish mode
   **When** the copy button feedback appears
   **Then** it shows "¡Copiado!" (not "Copied!")

3. **Given** Spanish is active
   **When** the tips section renders
   **Then** tips heading and all 5 tip texts are in Spanish

4. **Given** Spanish is active
   **When** the footer renders
   **Then** it reads "Comparte esta herramienta con amigos y familiares" and "Creado por una persona usando herramientas de IA"

5. **Given** Spanish is active
   **When** a screen reader user navigates
   **Then** the skip-to-content link reads "Ir al contenido principal" in Spanish

6. **Given** Spanish is active and the zip code is not found
   **When** the not-found message renders
   **Then** it reads "Aún no tenemos datos para este código postal..."

7. **Given** Spanish is active and multiple states are found for a zip
   **When** the state selector renders
   **Then** the heading reads "Este código postal abarca varios estados..." and the button reads "Continuar"

8. **Given** English is active
   **When** any of these components render
   **Then** they display Phase 1 English strings exactly (zero regression)

## Tasks / Subtasks

- [x] Modify `src/components/PromptOutput.tsx` — translate heading, instructions, buttons (AC: 1, 2)
  - [x] Import `useLanguage` from `../lib/i18n`
  - [x] Add `const { t } = useLanguage()` inside component
  - [x] Replace `"Your Customized Prompt"` → `{t('prompt.heading')}`
  - [x] Replace `"Copy this prompt and paste it as your first message in any AI chatbot"` → `{t('prompt.instructions')}`
  - [x] Replace `"Copy to Clipboard"` → `{t('prompt.copyButton')}`
  - [x] Replace `"Copied!"` → `{t('prompt.copiedButton')}` (inside the `data-testid="copy-confirmation"` span)
- [x] Modify `src/components/BallotToolClient.tsx` — translate not-found message (AC: 6)
  - [x] Import `useLanguage` from `../lib/i18n`
  - [x] Add `const { t } = useLanguage()` inside `BallotToolClient` component
  - [x] Replace hardcoded not-found paragraph text → `{t('errors.zipNotFound')}`
  - [x] Replace `"Find your state election website →"` link text → `{t('errors.findElectionWebsite')}`
- [x] Modify `src/components/StateSelectorModal.tsx` — translate multi-state UI (AC: 7)
  - [x] Import `useLanguage` from `../lib/i18n`
  - [x] Add `const { t } = useLanguage()` inside component
  - [x] Replace `"This zip code spans multiple states. Which state are you voting in?"` → `{t('errors.multiState')}`
  - [x] Replace `"Continue"` button text → `{t('form.continue')}`
- [x] Modify `src/app/page.tsx` — translate hero, tips, footer (AC: 3, 4, 8)
  - [x] Add `"use client"` directive at top of file (page.tsx has no `export const metadata` — safe to make client)
  - [x] Add `import { useLanguage } from "../lib/i18n"` (LanguageProvider already imported; add useLanguage to the import)
  - [x] Add `const { t } = useLanguage()` inside `Home` component
  - [x] Replace `"Research Your Ballot with AI"` h1 → `{t('hero.headline')}`
  - [x] Replace subtitle paragraph text → `{t('hero.subtitle')}`
  - [x] Replace `"Tips for Using AI Ballot Research"` h2 → `{t('tips.heading')}`
  - [x] Replace 5 tip texts with `{t('tips.tip1')}` through `{t('tips.tip5')}`
  - [x] Replace `"Share this tool with friends and family"` → `{t('footer.share')}`
  - [x] Replace `"Created by a human using AI tools"` → `{t('footer.credit')}`
- [x] Handle skip-to-content link translation (AC: 5)
  - [x] Create `src/components/SkipLink.tsx` — client component calling `useLanguage()`, renders skip link with `{t('a11y.skipToContent')}`
  - [x] Modify `src/app/layout.tsx`: import SkipLink, replace hardcoded `<a href="#main-content">Skip to main content</a>` with `<SkipLink />`
  - [x] Move `<LanguageProvider>` wrapper from `src/app/page.tsx` to `src/app/layout.tsx` (wrap `{children}` in layout.tsx) so SkipLink has language context
  - [x] Remove `<LanguageProvider>` and its import from `src/app/page.tsx`
- [x] Run full test suite — verify no regressions
- [x] Run `npx tsc --noEmit` — verify no TypeScript errors

## Dev Notes

### Critical: page.tsx → "use client" is Safe

`src/app/page.tsx` does NOT export `metadata` — that's in `src/app/layout.tsx`. Adding `"use client"` to page.tsx is safe and does not affect SEO/metadata.

```tsx
// page.tsx — add at very top:
"use client";
import BallotToolClient from "../components/BallotToolClient";
import LanguageToggle from "../components/LanguageToggle";
import { useLanguage } from "../lib/i18n";  // remove LanguageProvider from import
```

### Critical: LanguageProvider Must Move to layout.tsx for SkipLink

The skip-to-content link lives in `layout.tsx`. For `SkipLink.tsx` to call `useLanguage()`, it must be inside `<LanguageProvider>`. Since layout.tsx wraps page.tsx, move the provider there:

```tsx
// layout.tsx (after change):
import { LanguageProvider } from "../lib/i18n";
import SkipLink from "../components/SkipLink";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#fafaf9] text-[#1f2937] antialiased font-sans">
        <LanguageProvider>
          <SkipLink />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
```

```tsx
// page.tsx (after removing LanguageProvider):
"use client";
import BallotToolClient from "../components/BallotToolClient";
import LanguageToggle from "../components/LanguageToggle";
import { useLanguage } from "../lib/i18n";

const CHATBOTS = [...];

export default function Home() {
  const { t } = useLanguage();
  return (
    <>
      <LanguageToggle />
      <div className="min-h-screen flex flex-col">
        ...
      </div>
    </>
  );
}
```

Note: `export const metadata` in layout.tsx is a Server Component export — this still works even when layout.tsx imports Client Components. Server Components can always import and use Client Components.

### SkipLink Component (exact implementation)

```tsx
// src/components/SkipLink.tsx
"use client";

import { useLanguage } from "../lib/i18n";

export default function SkipLink() {
  const { t } = useLanguage();
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#1e3a5f] focus:text-white focus:rounded-lg"
    >
      {t("a11y.skipToContent")}
    </a>
  );
}
```

### PromptOutput Changes (exact diffs)

Current PromptOutput.tsx is already `"use client"`. Just add:

```tsx
import { useLanguage } from "../lib/i18n";  // add import

// Inside component:
const { t } = useLanguage();  // add after useState declarations

// Replace strings:
<h2 ...>{t("prompt.heading")}</h2>
<p ...>{t("prompt.instructions")}</p>
// Button:
{copied ? (
  <span data-testid="copy-confirmation">{t("prompt.copiedButton")}</span>
) : (
  t("prompt.copyButton")
)}
```

### BallotToolClient Not-Found Translation

```tsx
// Add import:
import { useLanguage } from "../lib/i18n";

// Inside BallotToolClient component, after state declarations:
const { t } = useLanguage();

// Replace notFound JSX:
{notFound && (
  <div data-testid="not-found-message" ...>
    <p className="text-yellow-800">{t("errors.zipNotFound")}</p>
    <a href="https://www.usa.gov/election-office" ...>
      {t("errors.findElectionWebsite")}
    </a>
  </div>
)}
```

### StateSelectorModal Changes

```tsx
// Add import:
import { useLanguage } from "../lib/i18n";

// Inside component:
const { t } = useLanguage();

// Replace strings:
<h3 ...>{t("errors.multiState")}</h3>
<button ...>{t("form.continue")}</button>
```

### Tips Section — 5 Hardcoded Strings

The 5 tips in page.tsx currently use JSX entities (`&quot;`, `&apos;`). The translated strings in translations.ts use regular Unicode quotes/apostrophes — no JSX entity encoding needed for React string children:

```tsx
// Before (last tip has special warning styling):
<li className="flex gap-2">
  <span className="text-teal-600 font-bold">•</span>
  <span>{t("tips.tip1")}</span>
</li>
// ... tips 2-4 similar
<li className="flex gap-2 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
  <span className="text-yellow-600 font-bold">⚠</span>
  <span>{t("tips.tip5")}</span>
</li>
```

The last tip (tip5) keeps its warning styling — only the text changes.

### All Keys Already in translations.ts — No Changes Needed

All translation keys used in this story are already defined in `src/lib/translations.ts` (Story 1.1):
- `prompt.heading`, `prompt.instructions`, `prompt.copyButton`, `prompt.copiedButton`
- `errors.zipNotFound`, `errors.findElectionWebsite`
- `errors.multiState`, `form.continue`
- `hero.headline`, `hero.subtitle`
- `tips.heading`, `tips.tip1`–`tips.tip5`
- `footer.share`, `footer.credit`
- `a11y.skipToContent`

**Do NOT modify translations.ts** — all keys exist.

### Phase 1 Backward Compatibility

EN translations exactly match Phase 1 hardcoded strings:
- `t('prompt.heading')` → "Your Customized Prompt" ✓
- `t('prompt.copyButton')` → "Copy to Clipboard" ✓
- `t('prompt.copiedButton')` → "Copied!" ✓
- `t('hero.headline')` → "Research Your Ballot with AI" ✓
- All tip texts match EN.tips records exactly ✓

### Testing Approach

No new test files required for this story — translations.test.ts already covers all key assertions. The full test suite (83 tests) verifies backward compatibility. TypeScript compilation validates correctness.

The `data-testid` attributes (`copy-button`, `copy-confirmation`, `not-found-message`, `state-selector`, `prompt-output`) are ALL preserved unchanged per FR-023.

### Previous Story Intelligence

- Story 3.2: sub-components called `useLanguage()` directly (same pattern here)
- Story 3.1: `"use client"` was already present in ZipForm — same pattern for PromptOutput and BallotToolClient
- Story 1.2: `useLanguage()` returns `{ lang, setLang, t }` — only `t` needed for this story
- Pattern: `import { useLanguage } from "../lib/i18n"` (not `../../lib/i18n` — these are in `src/components/`)
- LanguageProvider in page.tsx is currently `import { LanguageProvider } from "../lib/i18n"` — when moving to layout.tsx, path changes to `"../lib/i18n"` (layout.tsx is at `src/app/`, one level from `src/lib/`)

### Project Structure Notes

- **Modified:** `src/components/PromptOutput.tsx`
- **Modified:** `src/components/BallotToolClient.tsx`
- **Modified:** `src/components/StateSelectorModal.tsx`
- **Modified:** `src/app/page.tsx` (add "use client", remove LanguageProvider)
- **Modified:** `src/app/layout.tsx` (add LanguageProvider, SkipLink)
- **New:** `src/components/SkipLink.tsx`
- **Not modified:** `src/lib/translations.ts` (all keys already exist)
- **Not modified:** `src/lib/i18n.tsx`, `src/components/LanguageToggle.tsx`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3]
- [Source: src/components/PromptOutput.tsx — 4 hardcoded strings to replace]
- [Source: src/components/BallotToolClient.tsx — notFound hardcoded strings]
- [Source: src/components/StateSelectorModal.tsx — multiState heading + Continue button]
- [Source: src/app/page.tsx — hero/tips/footer hardcoded strings]
- [Source: src/app/layout.tsx — skip-to-content link]
- [Source: src/lib/translations.ts — all required keys confirmed present]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Modified `src/components/PromptOutput.tsx`: added useLanguage(), 4 hardcoded strings replaced with t() calls (heading, instructions, copyButton, copiedButton)
- Modified `src/components/BallotToolClient.tsx`: added useLanguage(), notFound paragraph and link text replaced with t('errors.zipNotFound') and t('errors.findElectionWebsite')
- Modified `src/components/StateSelectorModal.tsx`: added useLanguage(), multi-state heading and Continue button translated
- Modified `src/app/page.tsx`: added "use client", useLanguage(); hero headline/subtitle, tips heading + 5 tips, footer.share/credit all translated; LanguageProvider removed (moved to layout.tsx)
- Created `src/components/SkipLink.tsx`: client component rendering skip link using t('a11y.skipToContent')
- Modified `src/app/layout.tsx`: LanguageProvider now wraps entire app here, SkipLink placed inside provider for language context
- 83/83 tests pass, 0 TypeScript errors

### File List

- `src/components/PromptOutput.tsx` (MODIFIED)
- `src/components/BallotToolClient.tsx` (MODIFIED)
- `src/components/StateSelectorModal.tsx` (MODIFIED)
- `src/app/page.tsx` (MODIFIED — added "use client", useLanguage, removed LanguageProvider)
- `src/app/layout.tsx` (MODIFIED — added LanguageProvider + SkipLink)
- `src/components/SkipLink.tsx` (NEW)
