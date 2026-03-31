---
title: "Next.js 15 + React 19 Static Data App — Ballot Research Tool"
category: build-patterns
date: 2026-03-31
tags: [nextjs, react19, typescript, tailwind4, static-json, clipboard, date-utils, accessibility]
module: BallotToolClient
symptom: "Building a civic SPA with zip-based state lookup, deadline status badges, and copy-to-clipboard"
root_cause: "Multiple architectural decisions required simultaneous correctness: timezone-safe dates, stale-closure-free clipboard, server/client component split, WCAG AA status badges"
---

# Next.js 15 + React 19 Static Data App (Ballot Research Tool)

## Problem Description

Building a single-page civic tool that: looks up a U.S. state from a zip code (static JSON), displays election deadlines with color+text status badges, and generates + copies a customized AI prompt. Required WCAG AA compliance, mobile-first layout, and 42 Playwright e2e tests.

## Root Cause

Several non-obvious pitfalls interact:
1. `new Date("YYYY-MM-DD")` has timezone ambiguity — must use `date-fns parseISO`
2. `const today = new Date()` inside a React component body recreates on every render
3. Clipboard fallback needs `useRef` timeout to avoid stale closures on 2-second reset
4. IIFE patterns in JSX (`(() => {...})()`) are unidiomatic — extract as sub-component

## Solution

### 1. Timezone-safe date parsing (date-utils.ts)

```typescript
import { parseISO, startOfDay, differenceInCalendarDays } from "date-fns";

// ✅ Use date-fns parseISO — never new Date("YYYY-MM-DD")
export function getDeadlineStatus(deadlineStr: string | null, today: Date): DeadlineInfo {
  if (!deadlineStr) return { status: "unavailable", daysRemaining: null, label: "Not available" };
  const deadline = startOfDay(parseISO(deadlineStr));
  const todayStart = startOfDay(today);
  const days = differenceInCalendarDays(deadline, todayStart);
  // green >14, yellow 4-14, red 0-3, passed <0
}

// ✅ Inject today as parameter — pure function, testable with vi.useFakeTimers
export function findNextElection<T extends { date: string }>(elections: T[], today: Date): T | null {
  const todayStart = startOfDay(today);
  const upcoming = elections.filter(e => differenceInCalendarDays(startOfDay(parseISO(e.date)), todayStart) >= 0);
  if (!upcoming.length) return null;
  return upcoming.reduce((a, b) => parseISO(a.date) < parseISO(b.date) ? a : b);
}
```

### 2. Stable `today` in component (BallotToolClient.tsx)

```typescript
// ✅ useRef — stable reference, not recreated on every render
function useToday(): Date {
  return useRef(new Date()).current;
}
```

### 3. Stale-closure-safe clipboard (PromptOutput.tsx)

```typescript
const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const handleCopy = useCallback(async () => {
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      fallbackCopy(text); // document.execCommand
    }
    setCopied(true);
    timeoutRef.current = setTimeout(() => { setCopied(false); }, 2000);
  } catch { /* show fallback message */ }
}, [text]);
useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);
```

### 4. Extract IIFE to sub-component

```typescript
// ❌ Avoid IIFE in JSX
{stage === "found" && (() => { const x = compute(); return <JSX />; })()}

// ✅ Extract as named component
function FoundState({ stateData, zip, today }: Props) {
  const election = findNextElection(stateData.elections, today) as Election | null;
  if (!election) return <NoElectionView ... />;
  return <><StateInfoCard .../><PromptOutput .../></>;
}
```

### 5. WCAG AA deadline status badges

Status must use color + icon + text (not color alone, per WCAG 1.4.1):

```typescript
const styles = { green: "bg-green-100 text-green-800", red: "bg-red-100 text-red-800", ... };
const icons =  { green: "✓", red: "⚠", passed: "✗", unavailable: "—" };
// Render: <span aria-label={info.label}><span aria-hidden>{icon}</span>{info.label}</span>
```

### 6. Server/client split for static JSON

```typescript
// page.tsx — Server Component (no "use client")
// imports static JSON at build time, renders <BallotToolClient>

// BallotToolClient.tsx — "use client"
// All interactive state: zip input, lookup result, selected state
```

## Prevention Tips

- Always use `date-fns parseISO` for YYYY-MM-DD strings from JSON
- Inject `today: Date` as parameter to date utility functions (enables `vi.useFakeTimers`)
- Use `useRef(new Date()).current` for stable dates in components
- Clear setTimeout IDs in `useEffect` cleanup to prevent timer leaks
- IIFE in JSX = sign to extract a sub-component
- Status indicators: always combine color + icon + text for WCAG 1.4.1

## Test Patterns

```typescript
// Vitest date mocking — no fake timers needed when today is injected
it("returns red for 3 days left", () => {
  const result = getDeadlineStatus("2026-04-03", new Date("2026-03-31"));
  expect(result.status).toBe("red");
});

// For clipboard tests:
vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
```
