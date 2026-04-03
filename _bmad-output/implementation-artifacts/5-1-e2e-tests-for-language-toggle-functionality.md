# Story 5.1: E2e Tests for Language Toggle Functionality

Status: done

## Story

As a QA engineer,
I want E2e tests covering language toggle behavior,
so that language switching is automatically verified against the full app on every CI run.

## Acceptance Criteria

1. **Given** the E2e test suite
   **When** the test file is examined
   **Then** it includes tests that click `[data-testid="language-toggle"]` and assert Spanish UI text is visible

2. **Given** an E2e test that clicks the language toggle
   **When** the toggle is clicked
   **Then** the test asserts Spanish strings are visible (e.g., placeholder contains "código postal") and English strings are not

3. **Given** an E2e test that submits a zip code in English then clicks the toggle
   **When** the language switches
   **Then** the test asserts state results remain visible (state preservation — no data loss on switch)

4. **Given** an E2e test that clicks toggle and reloads the page
   **When** a new page load occurs
   **Then** the test asserts the app opens in Spanish (localStorage persistence verified)

5. **Given** all 42 Phase 1 E2e tests
   **When** run after Phase 2 implementation
   **Then** all 42 tests pass without modification

6. **Given** the full E2e suite (Phase 1 + Phase 2)
   **When** run
   **Then** total passing count is ≥ 42 (Phase 1) + new Phase 2 tests

## Tasks / Subtasks

- [x] Add Phase 2 language toggle tests to `e2e/ballot-tool.spec.ts` (AC: 1, 2, 3, 4)
  - [x] Add `test.describe("Language toggle")` block
  - [x] Test: toggle is visible on page load (`data-testid="language-toggle"`)
  - [x] Test: clicking toggle switches to Spanish — placeholder becomes "código postal" (or similar Spanish text visible)
  - [x] Test: clicking toggle twice returns to English
  - [x] Test: submitting TX zip in English, then clicking toggle — state info card still visible (AC-3 state preservation)
  - [x] Test: localStorage persistence — click toggle to Spanish, reload page, assert Spanish UI is active (AC-4)
- [x] Verify all 42 Phase 1 tests still pass (AC: 5, 6)
  - [x] Run full E2e suite via `npm run e2e` (or `npx playwright test`)
  - [x] Confirm total passing ≥ 42 + new tests

## Dev Notes

### E2e File Location and Constraints

The existing file is `e2e/ballot-tool.spec.ts`. Add new `test.describe` block(s) at the end of the file. **Do NOT modify any existing tests** — the Phase 1 tests are measurement infrastructure.

### Language Toggle data-testid

`data-testid="language-toggle"` is on the `<button>` element in `src/components/LanguageToggle.tsx`. Use:
```typescript
const toggle = page.getByTestId("language-toggle");
```

### localStorage Persistence Test Pattern

The `playwright.config.ts` sets `baseURL: "http://127.0.0.1:3000"`. For localStorage tests, use Playwright's `page.evaluate()` to read localStorage, or simply reload and assert UI state:

```typescript
test("persists Spanish after page reload", async ({ page }) => {
  await page.goto("/");
  // Click toggle to switch to Spanish
  await page.getByTestId("language-toggle").click();
  // Reload the page
  await page.reload();
  // Assert Spanish UI (toggle now shows "English" since Spanish is active)
  const toggle = page.getByTestId("language-toggle");
  await expect(toggle).toContainText("English");
});
```

**Note:** localStorage persistence depends on `LanguageProvider`'s `useEffect` writing to `localStorage['voter-choice-lang']` and reading it on hydration. This works in Playwright's Chromium since it persists localStorage across reloads within the same browser context.

### Spanish String Assertions

After clicking toggle to Spanish, assert visible Spanish strings. Use strings that are definitely in the DOM:
- Toggle button shows `"English"` (showing the non-active language)
- Zip input placeholder: `"Ingresa tu código postal de 5 dígitos"` (from `form.placeholder`)
- Submit button: `"Buscar"` (from `form.submit`)
- Tips heading: `"Consejos para usar IA"` (partial from `tips.heading`)

Avoid asserting negative (English strings NOT visible) — fragile. Assert positive (Spanish strings ARE visible).

### State Preservation Test Pattern

```typescript
test("state results remain visible after language switch", async ({ page }) => {
  await page.goto("/");
  // Submit TX zip to get results
  await page.getByTestId("zip-input").fill("73301");
  await page.getByTestId("zip-submit").click();
  // Confirm state info is shown
  await expect(page.getByTestId("state-info")).toBeVisible();
  // Switch language
  await page.getByTestId("language-toggle").click();
  // State info should still be visible (FR-004: language switch doesn't clear state)
  await expect(page.getByTestId("state-info")).toBeVisible();
  // Prompt output should still be visible
  await expect(page.getByTestId("prompt-output")).toBeVisible();
});
```

### Playwright Config — No Changes Needed

`playwright.config.ts` is already configured correctly:
- `testDir: "./e2e"` — picks up all tests in `e2e/`
- `workers: 1` — sequential execution
- `timeout: 10000` — 10s per test
- `baseURL: "http://127.0.0.1:3000"` — Next.js dev server

### Phase 1 Test Count Verification

The existing `e2e/ballot-tool.spec.ts` has exactly these describe blocks:
- "Page load" (3 tests)
- "Input validation" (4 tests)
- "Valid zip code — Texas (73301)" (5 tests)
- "Valid zip code — California (90210)" (2 tests)
- "Multi-state zip code (86515)" (1 test)
- "Copy to clipboard" (2 tests)
- "Responsive layout" (2 tests)
- "Keyboard accessibility" (2 tests)

Total: **21 tests** × 2 projects (chromium-desktop, chromium-mobile) = **42 total** in the measurement system.

New Phase 2 tests run on both projects → adds 2× count to total.

### Running E2e Tests

```bash
npx playwright test
```

Requires Next.js dev server running (playwright.config.ts starts it via `webServer`). If `npm run start` fails, ensure `npm run build` was run first. For development: `npm run build && npx playwright test`.

### Previous Story Intelligence

- Story 3.3: `page.tsx` now has `"use client"` directive and uses `useLanguage()` — hero/tips/footer all translate
- Story 3.1: ZipForm uses `t('form.placeholder')` → `"Ingresa tu código postal de 5 dígitos"` in ES
- Story 2.1: LanguageToggle has `data-testid="language-toggle"`, shows `"Español"` when EN active, `"English"` when ES active
- Story 4.2: Prompt re-generates on language switch — `data-testid="prompt-output"` stays visible

### Project Structure Notes

- **Modified:** `e2e/ballot-tool.spec.ts` (add new describe block at end)
- **Not modified:** `playwright.config.ts`, any source files

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.1]
- [Source: e2e/ballot-tool.spec.ts — 42 existing Phase 1 tests]
- [Source: playwright.config.ts — test config, baseURL, workers]
- [Source: src/components/LanguageToggle.tsx — data-testid, "English"/"Español" text]
- [Source: src/lib/translations.ts — EN/ES strings to assert]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Added `test.describe("Language toggle")` block to `e2e/ballot-tool.spec.ts` with 5 new tests
- Tests cover: toggle visible, EN→ES switch, ES→EN double-click, state preservation, localStorage persistence
- Fixed pre-existing Prettier formatting issues in `src/lib/i18n.tsx`, `src/lib/translations.ts`, `src/components/PromptOutput.tsx`, `src/lib/date-utils.ts`, `src/components/BallotToolClient.tsx` that were blocking `npm run build`
- 52/52 E2e tests pass: 42 Phase 1 + 10 Phase 2 (5 tests × 2 browser projects — chromium-desktop + chromium-mobile)
- 101/101 unit tests pass

### File List

- `e2e/ballot-tool.spec.ts` (MODIFIED — 5 new language toggle tests)
- `src/lib/i18n.tsx` (MODIFIED — Prettier formatting fix)
- `src/lib/translations.ts` (MODIFIED — Prettier formatting fix)
- `src/components/PromptOutput.tsx` (MODIFIED — Prettier formatting fix)
- `src/lib/date-utils.ts` (MODIFIED — Prettier formatting fix)
- `src/components/BallotToolClient.tsx` (MODIFIED — Prettier formatting fix)
