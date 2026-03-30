# UI Contracts: Ballot Research Tool

**Feature**: 002-ballot-research-tool
**Date**: 2026-03-30

These contracts define the observable behavior of each component. They are the source
of truth for Playwright e2e tests and the interface between components.

---

## ZipForm

**Renders**: Zip code input field (`data-testid="zip-input"`) and submit button
(`data-testid="zip-submit"`).

**Contract**:
- Input accepts text; submit triggers validation
- If input is empty on submit → renders `data-testid="zip-error"` with text
  "Please enter a zip code"
- If input is non-numeric or not 5 digits on submit → renders `data-testid="zip-error"`
  with text "Please enter a valid 5-digit zip code"
- If input is valid 5-digit numeric → calls `onSubmit(zipCode: string)`
- Error element is NOT present in DOM when no error exists (conditional render)
- Submit button text: "Find My Ballot Info"

---

## StateSelectorModal

**Renders**: When `data-testid="state-selector"` is shown.

**Contract**:
- Shown when zip maps to multiple states
- Displays the question: "This zip code spans multiple states. Which state are you
  voting in?"
- Renders one button per state code
- Clicking a state button calls `onSelect(stateCode: string)`
- Modal is keyboard-navigable; focus trapped within while open

---

## StateInfoCard

**Renders**: `data-testid="state-info"` container.

**Contract**:
- Shows: `data-testid="election-name"` (election name string)
- Shows: `data-testid="election-date"` (formatted date string)
- Shows: `data-testid="registration-status"` container with deadline statuses
- Each deadline shows date + text label + color class
- Early voting: shows date range or "Not available — absentee voting only"
- Voter ID: shows whether required + list of accepted IDs
- Phone policy: shows policy text
- Links: county election office + sample ballot lookup (open in new tab)

---

## PromptOutput

**Renders**: `data-testid="prompt-output"` container, `data-testid="copy-button"`,
`data-testid="copy-confirmation"`.

**Contract**:
- `prompt-output` contains full prompt text (base + context block)
- `copy-button` default text: "Copy to Clipboard"
- On successful copy: `copy-confirmation` becomes visible with text "Copied!" for
  ~2 seconds; `copy-button` text changes to "Copied!"
- `copy-confirmation` uses `aria-live="polite"`
- If clipboard API unavailable: select all text in prompt area; show
  "Press Ctrl+C / Cmd+C to copy"

---

## Error Messages

**not-found**: `data-testid="not-found-message"` — rendered when zip not in dataset.
Text includes link to state election website directory.

**no-election**: `data-testid="no-election-message"` — rendered when no upcoming
election found for the state. Text includes link to state election website.

**all-deadlines-passed**: Alert shown within `state-info` when all registration
deadlines have passed. Includes link to `registrationCheckUrl`.

---

## Page Layout Contract

Sections appear in this order, all on one page:
1. Hero (skip link, headline, subtitle, chatbot links)
2. ZipForm
3. StateSelectorModal (conditional, after valid multi-state zip)
4. StateInfoCard (conditional, after state resolved)
5. PromptOutput (conditional, after state resolved)
6. Tips (static)
7. Footer (static)
