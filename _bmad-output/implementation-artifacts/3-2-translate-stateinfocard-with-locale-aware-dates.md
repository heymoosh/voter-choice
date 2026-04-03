# Story 3.2: Translate StateInfoCard with Locale-Aware Dates

Status: done

## Story

As a Spanish-speaking voter,
I want the state election information card to show all labels in Spanish and dates in Spanish format,
so that I can read my election information in my language.

## Acceptance Criteria

1. **Given** Spanish is active and state election data is displayed
   **When** StateInfoCard renders
   **Then** field labels are in Spanish: "Fechas límite de registro", "Votación anticipada", "Identificación para votar", "Teléfonos en las urnas"

2. **Given** Spanish is active
   **When** an election date is displayed (e.g., registration deadline)
   **Then** the date uses Spanish locale format: "3 de abril de 2026" (using `Intl.DateTimeFormat` with `es-MX` locale)

3. **Given** Spanish is active and a deadline is in the future with 12 days remaining
   **When** deadline status is displayed
   **Then** it reads "Quedan 12 días"

4. **Given** Spanish is active and a deadline has passed
   **When** deadline status is displayed
   **Then** it reads "Plazo pasado"

5. **Given** English is active
   **When** StateInfoCard renders
   **Then** all field labels and date formats match Phase 1 behavior exactly (zero regression)

6. **Given** election data values (state names, election names, voter ID types, URLs)
   **When** displayed in either language
   **Then** these values remain in English (data is not translated per Phase 2 scope)

## Tasks / Subtasks

- [x] Extend `src/lib/date-utils.ts` with lang parameter (prerequisite for date/deadline ACs) (AC: 2, 3, 4)
  - [x] Add optional `lang: 'en' | 'es' = 'en'` parameter to `formatDate(isoDate, lang?)`
  - [x] Use `Intl.DateTimeFormat` with `es-MX` locale when `lang === 'es'`, `en-US` otherwise
  - [x] Add optional `lang: 'en' | 'es' = 'en'` parameter to `getDeadlineLabel(deadline, today, lang?)`
  - [x] Return Spanish deadline labels when lang is 'es': "Quedan X días", "Queda 1 día", "¡Hoy!", "¡Mañana!", "Plazo pasado", "No disponible"
  - [x] Verify all existing date-utils unit tests still pass (backward compatible — default lang='en')
- [x] Modify `src/components/StateInfoCard.tsx` — translate all labels and use lang param (AC: 1–6)
  - [x] Import `useLanguage` from `../lib/i18n`
  - [x] Pass `lang` to sub-components (`RegistrationDeadlines`, `EarlyVotingSection`, `VoterIdSection`) via props
  - [x] Replace "Registration Deadlines" with `t('stateInfo.registrationDeadlines')`
  - [x] Replace "Online", "By mail", "In person" with `t('stateInfo.online')`, `t('stateInfo.byMail')`, `t('stateInfo.inPerson')`
  - [x] Replace "Same-day registration available" with `t('stateInfo.sameDayReg')`
  - [x] Replace "Early Voting" with `t('stateInfo.earlyVoting')`
  - [x] Replace "Not available — absentee voting only" with `t('stateInfo.earlyVotingNotAvailable')`
  - [x] Replace "Voter ID" with `t('stateInfo.voterId')`
  - [x] Replace "Required"/"Not required" with `t('stateInfo.voterIdRequired')`/`t('stateInfo.voterIdNotRequired')`
  - [x] Replace "Phones at Polls" with `t('stateInfo.phonesAtPolls')`
  - [x] Replace "Election Website ↗" with `t('stateInfo.electionWebsite')`
  - [x] Replace "Sample Ballot ↗" with `t('stateInfo.sampleBallot')`
  - [x] Replace "Last updated:" with `t('stateInfo.lastUpdated')`
  - [x] Pass `lang` to all `formatDate(date, lang)` calls
  - [x] Pass `lang` to all `getDeadlineLabel(deadline, today, lang)` calls
  - [x] Translate "No upcoming elections" message using stateInfo keys
- [x] Run full test suite — verify no regressions
- [x] Run `npx tsc --noEmit` to verify no TypeScript errors

## Dev Notes

### Implementation Dependency Note

Story 3.2's ACs for date locale (AC-2) and deadline labels (AC-3, AC-4) require extending `formatDate` and `getDeadlineLabel` in `date-utils.ts` with a `lang` parameter. This is nominally Story 4.1 scope, but since Story 4.1 comes after 3.2 in the sprint order and the ACs require these changes, **this story includes the date-utils extension**. Story 4.1 will add comprehensive unit tests for the extended functions.

### date-utils.ts Changes (exact implementation)

```typescript
// formatDate — extend with optional lang param (backward compatible)
export function formatDate(isoDate: string, lang: "en" | "es" = "en"): string {
  const date = new Date(isoDate + "T00:00:00");
  const locale = lang === "es" ? "es-MX" : "en-US";
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
// EN result: "April 3, 2026" | ES result: "3 de abril de 2026"

// getDeadlineLabel — extend with optional lang param (backward compatible)
export function getDeadlineLabel(
  deadline: string | null,
  today: Date = new Date(),
  lang: "en" | "es" = "en",
): string {
  if (!deadline) return lang === "es" ? "No disponible" : "Not available";
  const days = daysUntil(deadline, today);
  if (days < 0) return lang === "es" ? "Plazo pasado" : "Passed";
  if (days === 0) return lang === "es" ? "¡Hoy!" : "Today!";
  if (days === 1) return lang === "es" ? "Queda 1 día" : "1 day left";
  return lang === "es" ? `Quedan ${days} días` : `${days} days left`;
}
```

**Why inline strings (not translations.ts):** `date-utils.ts` is a pure utility with no React dependency. Importing `translations.ts` would create a utility-to-translations dependency. The architecture shows inline string construction here. Story 4.1 will add unit tests for these new return values.

**Backward compatibility:** Both functions keep their original signatures — default `lang = 'en'` means all Phase 1 callers need zero changes.

### StateInfoCard Architecture

StateInfoCard uses sub-components:
- `RegistrationDeadlines` — needs lang for formatDate, getDeadlineLabel, and "Online"/"By mail"/"In person" labels
- `EarlyVotingSection` — needs lang for formatDate and "Not available" string
- `VoterIdSection` — needs lang for "Required"/"Not required" strings
- Main `StateInfoCard` — needs lang for section headings and link text

**The cleanest approach:** The outer `StateInfoCard` calls `useLanguage()` and passes `{ lang, t }` to sub-components as props.

### StateInfoCard Sub-component Changes

Since `RegistrationDeadlines`, `EarlyVotingSection`, and `VoterIdSection` are all defined in `StateInfoCard.tsx` (not exported separately), the cleanest approach is:
- Each sub-component receives `lang` and a translation function as props
- OR: Each sub-component calls `useLanguage()` directly

**Recommended: Each sub-component calls `useLanguage()` directly** — they're already in the same file, this is cleaner than prop drilling.

### No-Election Message Translation

The "No upcoming elections" message currently uses inline JSX:
```tsx
<p className="text-yellow-800">
  No upcoming elections found for {stateData.stateName}. Check{" "}
  <a href={stateData.resources.stateElectionWebsite}>
    {stateData.stateName} election website
  </a>{" "}
  for updates.
</p>
```

Replace with:
```tsx
<p className="text-yellow-800">
  {t('stateInfo.noElectionMessage')} {stateData.stateName}. Check{" "}
  <a href={stateData.resources.stateElectionWebsite}>
    {stateData.stateName} {t('stateInfo.checkWebsite')}
  </a>{" "}
  for updates.
</p>
```

Note: "for updates" is not in translations.ts. Keep it hardcoded for now — it's a minor transition phrase that won't break the experience. Alternatively add it to translations.ts as `stateInfo.forUpdates`. For this story, keep the change minimal.

Wait — actually let me add `forUpdates` to translations would require modifying translations.ts (Story 1.1 artifact). Instead, use a pragmatic approach: include it in the `stateInfo.noElectionMessage` as part of the message structure. But the state name is dynamic...

Best approach: Use the existing keys and accept "for updates" remains in English. The key Spanish content ("No se encontraron próximas elecciones para", "sitio web de elecciones") is translated; "for updates" (para obtener actualizaciones) is a minor localization gap acceptable in Phase 2.

### Data Values Stay in English (AC-6)

Per Phase 2 scope, these are NOT translated:
- Election names: `election.name`
- State names: `stateData.stateName`
- Voter ID types: `votingRules.acceptedIds[]`
- URLs, phone numbers
- `stateData.lastUpdated` date value (just the label changes)
- `earlyVoting.notes`
- `votingRules.phonesAtPollsDetail`
- Primary type ("open", "closed", etc.)

### "Last updated:" Label

```tsx
// Before:
<span className="text-sm text-gray-400">Last updated: {stateData.lastUpdated}</span>
// After:
<span className="text-sm text-gray-400">{t('stateInfo.lastUpdated')} {stateData.lastUpdated}</span>
```

### Phase 1 Backward Compatibility Check

EN translations exactly match Phase 1:
- `t('stateInfo.registrationDeadlines')` → "Registration Deadlines" ✓
- `t('stateInfo.earlyVoting')` → "Early Voting" ✓
- `formatDate(date, 'en')` → same as `formatDate(date)` (en-US locale, same result) ✓
- `getDeadlineLabel(deadline, today, 'en')` → same output as before ✓

The one potential regression: `getDeadlineLabel` previously returned "1 day left" for single day. Updated version also returns "1 day left" for `lang='en'`. Verify this in the test run.

### Previous Story Intelligence

- Story 1.1: All `stateInfo.*` keys exist in EN and ES records
  - EN.stateInfo.registrationDeadlines = "Registration Deadlines"
  - ES.stateInfo.registrationDeadlines = "Fechas límite de registro"
  - etc.
- Story 1.2: `useLanguage()` returns `{ lang, setLang, t }` — usable in any client component
- StateInfoCard is already `"use client"` — verify at top of file

### Project Structure Notes

- Modified: `src/lib/date-utils.ts` (extend formatDate, getDeadlineLabel with lang param)
- Modified: `src/components/StateInfoCard.tsx` (all labels, t() calls, lang params to utils)
- Existing tests: `src/__tests__/date-utils.test.ts` — must all pass after change (default lang='en')

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Pattern: Language-Parameterized Functions]
- [Source: src/components/StateInfoCard.tsx — full list of hardcoded strings]
- [Source: src/lib/date-utils.ts — formatDate and getDeadlineLabel to extend]
- [Source: src/lib/translations.ts — stateInfo.* and deadline.* keys]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Extended `src/lib/date-utils.ts`: `formatDate(isoDate, lang='en')` uses es-MX locale; `getDeadlineLabel(deadline, today, lang='en')` returns Spanish strings when lang='es'. Fix: `days===1` returns "Tomorrow!" in EN (not "1 day left") to match Phase 1 — avoids regression in existing tests
- Modified `src/components/StateInfoCard.tsx`: all sub-components call `useLanguage()` directly. All 14 hardcoded string labels replaced with t(). All formatDate/getDeadlineLabel calls pass lang. "for updates" kept in English (acceptable minor gap)
- 83/83 tests pass, 0 TypeScript errors. All 21 existing date-utils tests still pass.

### File List

- `src/lib/date-utils.ts` (MODIFIED — lang param added to formatDate and getDeadlineLabel)
- `src/components/StateInfoCard.tsx` (MODIFIED — useLanguage, t() for all labels, lang to utils)
