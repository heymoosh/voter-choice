# Story 4.1: Extend Date and Deadline Utilities with Language Parameter

Status: done

## Story

As a developer,
I want `formatDate` and `getDeadlineLabel` to have comprehensive unit tests for their language parameter,
so that the Spanish locale behavior is verified and regressions are caught automatically.

## Acceptance Criteria

1. **Given** `formatDate(date, 'es')` is called
   **When** the date is April 3, 2026
   **Then** it returns "3 de abril de 2026" using `Intl.DateTimeFormat('es-MX')`

2. **Given** `formatDate(date)` is called without a language argument
   **When** the date is April 3, 2026
   **Then** it returns "April 3, 2026" (English default — backward compatible)

3. **Given** `getDeadlineLabel(deadline, today, 'es')` with 12 days remaining
   **When** called
   **Then** it returns "Quedan 12 días"

4. **Given** `getDeadlineLabel(deadline, today, 'es')` with a passed deadline
   **When** called
   **Then** it returns "Plazo pasado"

5. **Given** `getDeadlineLabel(deadline, today)` called without language argument
   **When** called
   **Then** it returns Phase 1 English labels exactly (backward compatible)

6. **Given** all existing unit tests for `formatDate` and `getDeadlineLabel`
   **When** run after this change
   **Then** all tests pass (zero regression)

## Tasks / Subtasks

- [x] Add Spanish locale tests for `formatDate` to `src/__tests__/date-utils.test.ts` (AC: 1, 2)
  - [x] Add test: `formatDate('2026-04-03', 'es')` → `"3 de abril de 2026"`
  - [x] Add test: `formatDate('2026-11-03', 'es')` → Spanish November format
  - [x] Add test: `formatDate('2026-02-15', 'es')` → Spanish February format
  - [x] Add test: `formatDate('2026-04-03', 'en')` → `"April 3, 2026"` (explicit 'en')
  - [x] Add test: `formatDate('2026-04-03')` → `"April 3, 2026"` (default, no lang arg — AC-2)
- [x] Add Spanish label tests for `getDeadlineLabel` to `src/__tests__/date-utils.test.ts` (AC: 3, 4, 5)
  - [x] Add test: `getDeadlineLabel('2026-02-27', today, 'es')` where today=Feb 15 → `"Quedan 12 días"`
  - [x] Add test: `getDeadlineLabel('2026-02-10', today, 'es')` → `"Plazo pasado"`
  - [x] Add test: `getDeadlineLabel('2026-02-15', today, 'es')` → `"¡Hoy!"`
  - [x] Add test: `getDeadlineLabel('2026-02-16', today, 'es')` → `"Queda 1 día"`
  - [x] Add test: `getDeadlineLabel(null, today, 'es')` → `"No disponible"`
  - [x] Add test: `getDeadlineLabel('2026-02-27', today, 'en')` → `"12 days left"` (explicit 'en')
  - [x] Add test: `getDeadlineLabel('2026-02-27', today)` → `"12 days left"` (default, no lang arg — AC-5)
- [x] Run full test suite — verify no regressions and all new tests pass
- [x] Run `npx tsc --noEmit` — verify no TypeScript errors

## Dev Notes

### Critical: Implementation Already Done in Story 3.2

`formatDate` and `getDeadlineLabel` in `src/lib/date-utils.ts` were already extended with the `lang` parameter in Story 3.2 (dependency resolution). **Do NOT modify `src/lib/date-utils.ts`** — only add tests.

Current implementation (already in place):

```typescript
export function formatDate(isoDate: string, lang: "en" | "es" = "en"): string {
  const date = new Date(isoDate + "T00:00:00");
  const locale = lang === "es" ? "es-MX" : "en-US";
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getDeadlineLabel(
  deadline: string | null,
  today: Date = new Date(),
  lang: "en" | "es" = "en",
): string {
  if (!deadline) return lang === "es" ? "No disponible" : "Not available";
  const days = daysUntil(deadline, today);
  if (days < 0) return lang === "es" ? "Plazo pasado" : "Passed";
  if (days === 0) return lang === "es" ? "¡Hoy!" : "Today!";
  if (days === 1) return lang === "es" ? "Queda 1 día" : "Tomorrow!";
  return lang === "es" ? `Quedan ${days} días` : `${days} days left`;
}
```

### Naming Note: Epic Says "getDeadlineStatus" — Actual Function is "getDeadlineLabel"

The epics.md AC references `getDeadlineStatus(deadline, today, 'es')` returning "Quedan 12 días", but `getDeadlineStatus` returns `DeadlineStatus` ("safe"|"warning"|"urgent"|"passed") — a status code, not a label string. The function that returns human-readable labels is `getDeadlineLabel`. The epics had a naming error. Write tests for `getDeadlineLabel` (the function that was actually extended).

### Spanish Date Locale Output

`Intl.DateTimeFormat('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })` output format:
- April 3, 2026 → `"3 de abril de 2026"`
- November 3, 2026 → `"3 de noviembre de 2026"`
- February 15, 2026 → `"15 de febrero de 2026"`

Month names in es-MX: enero, febrero, marzo, abril, mayo, junio, julio, agosto, septiembre, octubre, noviembre, diciembre (all lowercase)

### Test File Structure

Add new `describe` blocks to the existing `src/__tests__/date-utils.test.ts` file. Do NOT create a new file. Pattern:

```typescript
describe("formatDate with lang param", () => {
  it("returns Spanish locale date when lang='es'", () => {
    expect(formatDate("2026-04-03", "es")).toBe("3 de abril de 2026");
  });
  // ... more tests
});

describe("getDeadlineLabel with lang='es'", () => {
  it("returns Spanish label for multiple days remaining", () => {
    expect(getDeadlineLabel("2026-02-27", today, "es")).toBe("Quedan 12 días");
  });
  // ... more tests
});
```

The `today` constant (`new Date("2026-02-15T12:00:00")`) is already defined at the top of the test file — reuse it.

### Existing Tests Must Still Pass (AC-6)

The existing `getDeadlineLabel` tests use the 2-argument signature without `lang`:
```typescript
expect(getDeadlineLabel("2026-02-10", today)).toBe("Passed");
expect(getDeadlineLabel("2026-02-15", today)).toBe("Today!");
expect(getDeadlineLabel("2026-02-16", today)).toBe("Tomorrow!");
expect(getDeadlineLabel("2026-02-20", today)).toBe("5 days left");
expect(getDeadlineLabel(null, today)).toBe("Not available");
```
All of these rely on the default `lang='en'`. They must continue to pass — do NOT modify them.

### Previous Story Intelligence

- Story 3.2 extended `formatDate` and `getDeadlineLabel` — implementation confirmed working (83/83 tests pass)
- Story 3.2 noted: `days===1` returns "Tomorrow!" in EN (not "1 day left") to match Phase 1 behavior
- All 21 existing date-utils tests pass after Story 3.2 changes

### Project Structure Notes

- **Modified:** `src/__tests__/date-utils.test.ts` (add new describe blocks only)
- **Not modified:** `src/lib/date-utils.ts` (implementation already complete)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.1]
- [Source: src/lib/date-utils.ts — current formatDate/getDeadlineLabel implementation]
- [Source: src/__tests__/date-utils.test.ts — existing tests to extend]
- [Source: _bmad-output/implementation-artifacts/3-2-translate-stateinfocard-with-locale-aware-dates.md — Story 3.2 completion notes]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Implementation was already complete in Story 3.2 — this story adds comprehensive unit tests only
- Added `describe("formatDate with lang param")`: 5 tests covering Spanish (April/November/February), explicit 'en', and default no-arg backward compat
- Added `describe("getDeadlineLabel with lang='es'")`: 7 tests covering Quedan X días, Plazo pasado, ¡Hoy!, Queda 1 día, No disponible, explicit 'en', and default no-arg backward compat
- 95/95 tests pass (was 83 + 12 new), 0 TypeScript errors
- Naming discrepancy in epics (getDeadlineStatus vs getDeadlineLabel) noted; tests correctly target getDeadlineLabel

### File List

- `src/__tests__/date-utils.test.ts` (MODIFIED — 12 new tests added)
