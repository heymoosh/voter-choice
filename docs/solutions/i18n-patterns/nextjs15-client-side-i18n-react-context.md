---
title: "Next.js 15 Client-Side i18n with React Context (No Library)"
category: i18n-patterns
date: 2026-04-01
tags: [nextjs, react19, i18n, typescript, translations, accessibility, spanish, localStorage]
module: BallotToolClient
symptom: "Adding multilingual support (English/Spanish) to a Next.js 15 App Router SPA with all strings hardcoded in components"
root_cause: "No i18n infrastructure existed — all ~100 user-facing strings were hardcoded across 8 component files. Needed lightweight solution for 2 languages without external library overhead."
---

# Next.js 15 Client-Side i18n with React Context (No Library)

## Problem Description

Adding Spanish language support to a single-page ballot research tool. All user-facing strings (~100) were hardcoded across components. The app uses Next.js 15 App Router with a mix of server and client components. Required: language toggle, localStorage persistence, `<html lang>` sync, screen reader announcements, and a 210-line AI prompt translated as complete prose.

## Root Cause

No i18n library needed for 2 languages and ~100 strings. External libraries (next-intl, i18next) add routing middleware, URL-based locales, and server-side translation loading — none needed here. A typed React Context with translation objects is simpler and more auditable.

## Solution

### 1. Typed Translation Interface (src/lib/translations.ts)

Define a `Translations` interface mirroring the component tree. Use function signatures for strings with interpolated values:

```typescript
export type Language = "en" | "es";

export interface Translations {
  zipForm: { label: string; errorEmpty: string; errorInvalid: string };
  deadlineStatus: { passed: string; daysLeft: (n: number) => string };
  errors: { noElection: (stateName: string) => string };
  // ... grouped by component/section
}

const en: Translations = { /* all English strings */ };
const es: Translations = { /* all Spanish strings */ };
export const translations: Record<Language, Translations> = { en, es };
```

**Key insight:** Function signatures for interpolated strings (`daysLeft: (n: number) => string`) handle pluralization naturally — each language implements its own logic ("1 day left" vs "Queda 1 día" vs "Quedan 5 días").

### 2. LanguageProvider with Hydration Guard (src/lib/i18n.tsx)

```typescript
"use client";
const I18nContext = createContext<I18nContextValue>(defaultEnglishValue);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("voter-choice-language");
    if (stored === "en" || stored === "es") {
      setLanguageState(stored);
      document.documentElement.lang = stored;
    }
    setMounted(true);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    announceToScreenReader(translations[lang].accessibility.languageChanged);
  }, []);

  // Hydration guard: before mount, render children with default context
  if (!mounted) return <>{children}</>;

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
```

**Critical:** The `if (!mounted) return <>{children}</>` guard prevents hydration mismatch. During SSR and initial client render, `localStorage` isn't available. Children receive the default English context value, which matches the server-rendered HTML. After mount, the real context kicks in.

**Critical:** The default context value must be non-null (use `defaultEnglishValue`, not `null`). If you use `null` and throw in `useLanguage()`, Next.js static generation (prerendering) will crash because components call `useLanguage()` during SSR before the provider mounts.

### 3. Server/Client Component Boundary

`page.tsx` was a server component with hardcoded strings in hero, tips, and footer sections. Solution: extract all translatable content into a `PageContent` client component.

```typescript
// page.tsx (Server Component — thin wrapper)
export default function Home() { return <PageContent />; }

// PageContent.tsx ("use client" — uses useLanguage)
export function PageContent() {
  const { t } = useLanguage();
  return <>{/* hero, tips, footer using t.* */}</>;
}
```

Layout.tsx remains a server component for metadata export but wraps children in LanguageProvider.

### 4. Date Formatting with Locale

```typescript
export function formatDate(dateStr: string | null, lang: Language = "en"): string {
  const locale = lang === "es" ? "es-US" : "en-US";
  return date.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
}
```

**Use `es-US` (not `es-ES`)** for a U.S.-focused app — matches the audience locale.

### 5. Full Prose Prompt Translation

The 210-line AI ballot prompt was translated as complete prose (not interpolated fragments). Per the spec: "piecemeal assembly produces unnatural text." Store as a separate `BALLOT_PROMPT_ES` constant.

### 6. Screen Reader Announcement (WCAG 4.1.3)

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

Called on language switch to announce "Language changed to English" / "Idioma cambiado a español".

## Prevention Tips

- **Always add `"use client"` to components that call hooks** — even if they're only imported from other client components. Future imports from server components will break silently.
- **Never use `null` context default with a throwing guard** in Next.js App Router — static generation prerendering will fail.
- **Use `useCallback` for context functions** passed through providers to prevent unnecessary re-renders.
- **Use `es-US` locale** (not `es-ES`) for U.S. Spanish audience — date formats differ.
- **Text expansion:** Spanish is ~20-30% longer. Replace fixed widths (e.g., `w-20`) with `shrink-0 whitespace-nowrap` and let flex-wrap handle overflow.

## Test Patterns

Existing unit tests (39) and e2e tests (42) all pass without modification — the default language is English, matching all existing test assertions. Language-specific tests can check localStorage persistence and DOM `lang` attribute.
