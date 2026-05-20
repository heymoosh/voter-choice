# Work Packet: redesign-phase-7-printable-pdf

Status: ready
Owner: orchestrator
Source: docs/design/2026-redesign/README.md §5 — Phase 7 (Printable PDF)
Branch: launch/production

## Intent

One-page US-Letter printable ballot. Heavy ink, scannable across a polling booth in dim light. Polling logistics header at top (address, hours, what to bring, early voting window). Picks grouped by section (Federal / State / Propositions). User's own "why" notes (from Phase 3) in italic next to each pick. Themes the user voted on listed at the bottom for context. One page hard cap — if picks overflow, the wizard prompts to trim notes. No color required; prints cleanly in monochrome. Uses `window.print()` only — no PDF library.

## Original User Intent

From `docs/design/2026-redesign/README.md` §5 Phase 7: "One-page US-Letter printable ballot. Heavy ink, scannable across a polling booth in dim light. Polling logistics header at top. Picks grouped by section. User's own notes in italic next to each pick. Themes listed at the bottom for context."

And from the design brief §5 ("The printable ballot"): "Designed first. The web app exists to produce it. US Letter, one page, scannable at arm's length under fluorescent lights. Heavy ink. No color required. Your own short notes ride next to each pick so you remember *why* when your hand is hovering over the bubble."

## Intent Interpretation

The printable is treated as the **deliverable**; the web app exists to produce it. This phase delivers the actual print artifact: one US-Letter page with the user's full ballot, polling logistics, and themes. The constraints are physical (paper, ink, fluorescent light, polling booth at arm's length) — not screen-first.

Key physical constraints:
- **One page hard cap.** If picks + notes overflow, the wizard prompts to trim notes before printing. Multi-page ballots get lost / left behind.
- **No color required.** Heavy ink, large names, no reliance on color cues. Prints cleanly on any home printer or library photocopier in monochrome.
- **Polling header at top.** Address, hours, what to bring, early voting window. So if the user only takes one sheet, they have everything.
- **User's own notes in italic.** The why-notes captured during Phase 3 picks ride next to each pick on the printable. This is what makes it *their* ballot.
- **Themes at the bottom.** Lists the priorities the user actually voted on, for context (and as a reminder if they revisit the sheet days later).
- **`window.print()` only.** No PDF library shipped. The browser handles it. Smaller bundle, fewer deps, identical fidelity.

Phase 7 depends on Phase 3 (workspace state has decisions + why-notes + themes), and on the polling-logistics data (Phase 3 reserved a slot in the ballot pane footer; the printable header consumes the same data).

## Business Logic

Rules:

- Output is a one-page US-Letter print rendering invoked via `window.print()`. No PDF library is shipped — the browser's print dialog handles save-as-PDF.
- One page hard cap. If the rendered content overflows (measurable via `scrollHeight` of the print container exceeding US-Letter bounds at the target DPI), the print action is blocked and the user is prompted to trim "why" notes inline.
- No color required. The stylesheet uses ink-heavy contrast (deep black text on white paper) with thin keylines for grouping. Color cues are decorative, never load-bearing.
- Polling header at top: precinct, polling-place name, address, hours, what-to-bring, early-voting window. Locked. If polling data is missing, render a clear "polling place not available — bring your ID and check sosgov" fallback instead of silently dropping the header.
- Picks grouped by section in the same order as the workspace (Federal → State → Propositions or whatever sections the race data produces).
- Each pick row: race label, candidate name, party tag (DEM/REP/etc.), user's why-note in italic underneath. Undecided races render as "Decide at the polls" in a separate "decide at the polls" group at the bottom.
- Themes listed at the bottom: enumerated 1 through N, names only (no quotes — quotes are AI-mirror context, not voter-facing summary).
- Footer line: "Built with Voter Choice · Free · non-partisan · voterchoice.app" plus a "Signed at the booth" signature line.
- Print stylesheet via `@media print` block; default screen view (the "preview the print" screen) uses a sheet-styled mockup that closely matches the print result.
- The "Print my ballot" button in the right ballot pane (Phase 3) triggers a switch to the print view; the print view renders the sheet plus a "Print / save as PDF" button that calls `window.print()`.

Assumptions:

- The browser's print dialog handles save-as-PDF reliably across Chrome, Firefox, Safari (the supported targets).
- Polling-place data is available from the same source the Phase 3 ballot pane consumes (`PollingLocationCard.tsx` or its successor).
- US-Letter is the default; A4 fits the same content with marginal layout adjustment. v1 ships US-Letter and uses `@page { size: letter }`.

User-confirmed decisions:

- One page hard cap, with inline trim-notes prompt when overflow detected. No multi-page fallback in v1.
- `window.print()` is the print mechanism. No external PDF library.

Edge cases:

- Zero decisions: print button is disabled (already enforced in Phase 3); print view is unreachable.
- All decisions but no themes (shouldn't happen given workspace flow, but defensive): themes section omitted with no error.
- Polling data missing: explicit "polling place not available" fallback in header, with link to SOS lookup.
- Very long "why" notes: total content height exceeds page bounds; prompt user to trim per-note. UI surfaces the offending notes with character counts.
- Multiple races in same section: section header appears once, races follow in order.
- A race has a pick but no "why" note: pick renders, no italic line. No empty placeholder.
- Party tag absent (proposition picks): no party tag rendered.
- User prints, then comes back and edits a decision: re-print shows the updated state.
- Browser quirks: `@page` rules don't always honor padding/margins consistently. Use a wrapping `.print-sheet` with explicit `padding` instead.

Out of scope:

- A4 paper size optimization (US-Letter only in v1).
- Per-state ballot layout variants (one universal layout in v1).
- QR code linking back to a saved session (could be a future polish item).
- Multi-language printables beyond what already exists (translations follow the prompt-fleet ES path).
- A "preview" mode separate from the print view itself (the print view IS the preview).

## Commercial Readiness

Applicability: launch

Lanes in scope:

- product UX (the print view is the artifact users physically carry)
- accessibility/responsive (print view must be print-friendly; screen-version of the preview must be readable)
- API/contracts (consumes Phase 3's decision/theme state and polling data)
- legal/compliance prompt (no recommendation language on the printable; just the user's own choices)

User decisions needed:

- none before implementation

Assumptions:

- The Vercel deployment has no print-specific server requirements; `window.print()` is purely client-side.

## Operational Reproducibility

Setup:

- `npm install`

Configuration:

- no new env

Provider setup:

- no new providers

Infrastructure/deployment:

- Vercel manual deploy via `deploy.yml`

Database migrations:

- not applicable

Manual steps:

- After deploy: in preview, complete a sample ballot, click Print, verify the print preview shows one page with all expected sections; save as PDF and open to confirm.

Verification:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run e2e` — full ballot → print view → assert DOM contains expected sections
- `bash scripts/ai-verify.sh`

Test quality:

- Component tests for each render state: full ballot, partial ballot with "decide at the polls" rows, polling data missing.
- Overflow-detection test: stub `scrollHeight` > US-Letter; expected trim prompt; observed prompt.
- Visual regression baseline for the print view (optional but recommended).

Critical logic trigger:

- business rule (one page hard cap; user-facing artifact correctness)

## Scope

Touch:

- `src/components/HandoffPackage.tsx` — review; might split into `PrintBallot.tsx` if cleanest.
- new `src/components/PrintBallot.tsx` — owns the print view and the sheet rendering.
- new `src/styles/print.css` (or a `@media print` block in an existing stylesheet) — print rules.
- `src/components/BallotPane.tsx` (Phase 3) — wire the "Print my ballot" button to switch to the print view.
- `src/components/PollingLocationCard.tsx` — review; ensure the polling data shape supports the printable header.
- `src/app/PageContent.tsx` — routing for the print view if it's a separate route.
- tests for the print component and overflow detection.

Do not touch:

- `main`
- `BALLOT_PROMPT.md` / generated modules
- Cold-open UI (Phase 2)
- Workspace shell beyond wiring the print button (Phase 3)
- Candidate cards (Phase 4)
- State party gates (Phase 5)
- Polis view (Phase 8)
- BYOK / out-of-budget (Phase 9)

## Ownership Audit

Concern: printable artifact rendering, print stylesheet, one-page enforcement
Existing owner: `src/components/HandoffPackage.tsx` (existing artifact rendering)
Neighboring owners:

- workspace state: `src/components/BallotToolClient.tsx` (Phase 3)
- ballot pane: `src/components/BallotPane.tsx` (Phase 3)
- polling location: `src/components/PollingLocationCard.tsx`

Files/modules/docs inspected:

- `docs/design/2026-redesign/README.md` §5 Phase 7
- `docs/design/2026-redesign/Voter Choice Redesign.html` §5 (printable ballot mock)
- `docs/design/2026-redesign/Voter Choice Redesign.html` §9 (polling logistics; appears in header)
- `docs/design/2026-redesign/prototype/prototype-views.jsx` (PrintView)
- `src/components/HandoffPackage.tsx`
- `src/components/PollingLocationCard.tsx`

Reuse/edit targets:

- Decide: extend `HandoffPackage.tsx` or extract to new `PrintBallot.tsx`. Worker's call; recommend new file for clarity.
- Reuse the decision data shape from Phase 3 — no parallel store.

New owner needed: yes — `PrintBallot.tsx` and `print.css` (or a clearly-bounded `@media print` block).

Overlap/bloat risks:

- Two implementations of the picks-grouped-by-section rendering (one in `BallotPane` interactive view, one in print) — share the data shape, render two views deliberately.
- Print stylesheet competing with screen stylesheet for the same selectors. Mitigation: clear `.print-sheet` wrapper that scopes both.
- The "preview" screen and the actual print output drifting. Mitigation: the print stylesheet IS the screen view's styling for the print container.

Recommendation:

- Build `PrintBallot.tsx` as a new component. Print stylesheet as its own file. `BallotPane`'s print button routes to the print view.

Execution constraints:

- Workers must NOT ship an external PDF library. `window.print()` only.
- Workers must NOT allow multi-page printing. Overflow → trim-notes prompt.
- Workers must NOT rely on color for legibility — must read in monochrome.
- Workers must NOT include any recommendation or persuasion language on the printable — only the user's choices.

## Acceptance Criteria

- A fully-decided ballot (all races picked, all themes locked) renders as a single page when printed.
- The print view's screen rendering closely matches the print output (same `.print-sheet` styling).
- Polling header includes: precinct, polling-place name, address, hours, what-to-bring, early-voting window — all from the polling-data source.
- Picks are grouped by section in workspace order. Each pick row: race label, candidate name, party tag (if applicable), user's why-note in italic if present.
- Undecided races group under "Decide at the polls" at the bottom of the picks list.
- Themes list at the bottom: numbered 1 through N, names only.
- Footer: "Built with Voter Choice · Free · non-partisan · voterchoice.app · Signed at the booth" signature line.
- Overflow detected (>US-Letter at print DPI) → trim-notes prompt inline; print blocked until under cap.
- Polling data missing → "polling place not available — bring your ID and check sosgov" fallback header.
- `window.print()` invocation works in Chrome / Firefox / Safari; save-as-PDF produces a clean one-page PDF.
- Print view passes greyscale rendering test (no color-only information).
- `npm run lint`, `npm run test`, `npm run build` pass.

## Test Plan

Maps each acceptance criterion to a test file path and the shape of the assertion. Per `docs/ai-coding-practices/guardrails/test-driven-development.md`, tests are written BEFORE implementation and the red phase is verified via `scripts/ai-tdd-red.sh`.

| AC | Test file | Test shape |
|---|---|---|
| Print view structure: polling header / sectioned picks / themes / footer | `src/components/PrintBallot.test.tsx` | render with full-fixture ballot; expected: `getByTestId('print-sheet')`, header has precinct + hours + what-to-bring, picks grouped by section in workspace order, themes ordered list 1–N, footer text matches `/Built with Voter Choice/`; observed: per-block presence |
| Print view's screen rendering matches `.print-sheet` print rules | `src/components/PrintBallot.test.tsx` | render `<PrintBallot>`; expected: rendered element has class `print-sheet` and computed style at `@media print` is identical to screen (same selectors govern both); observed: match |
| One-page hard cap: overflow detected → inline trim prompt; print blocked | `src/components/PrintBallot.overflow.test.tsx` | mock `ref.scrollHeight` > page bounds; click Print; expected: trim-notes prompt visible AND `window.print` spy NOT called; observed: prompt visible, spy not called |
| Polling data missing → "polling place not available" fallback | `src/components/PrintBallot.test.tsx` | render with `pollingData=null`; expected: fallback text + SOS link present, no silently-empty header; observed: match |
| Pick row: race label + candidate + party tag + verbatim italic why-note | `src/components/PrintBallot.test.tsx` | input: decision with why-note "Trust her labor record"; expected: row contains label, name, party-tag span, italic element with verbatim note; observed: match |
| Undecided races group under "Decide at the polls" at bottom of picks | `src/components/PrintBallot.test.tsx` | input: mix of decided + undecided; expected: undecided rendered in a separate group placed after the decided picks list; observed: match |
| Themes section: numbered 1–N, names only (no quotes) | `src/components/PrintBallot.test.tsx` | input: 4 themes; expected: ordered list `<ol>` with 4 `<li>` containing theme names only, no quote text; observed: match |
| Pick with no why-note: no empty italic placeholder | `src/components/PrintBallot.test.tsx` | input: decision without why-note; expected: row renders without an italic line; observed: match |
| Proposition pick: no party tag rendered | `src/components/PrintBallot.test.tsx` | input: prop decision; expected: no `data-testid="party-tag"` in that row; observed: absent |
| `window.print()` invoked on Print click (happy path) | `src/components/PrintBallot.test.tsx` | spy on `window.print`; click Print with fitting content; expected: `window.print` called once; observed: match |
| Visual fidelity: print view in monochrome reads cleanly | `e2e/visual/print-ballot.spec.ts` | `toHaveScreenshot()` on full-data + missing-polling + greyscale render; deferred — visual regression baselines wait for TDD Phase 3 | mark baselines as `deferred` |
| Monochrome / greyscale structural check (text-level) | `src/components/PrintBallot.test.tsx` | render with simulated `filter: grayscale(1)`; expected: every pick row's candidate name + theme number still findable via `getByText`; observed: match |
| E2E happy path: decide ballot → print view → save-as-PDF | `e2e/print-ballot.spec.ts` | navigate workspace → decide all races → click Print → assert print view rendered + `window.print` triggered (e2e stubbed); observed: pass |
| `npm run lint`, `npm run test`, `npm run build` green | n/a — covered by `bash scripts/ai-verify.sh` | not test-shape applicable; reviewer-enforced |

### Red-phase ritual for this packet

The one-page hard cap is the load-bearing physical constraint — write `src/components/PrintBallot.overflow.test.tsx` first, mocking `scrollHeight`; it red-fails because no overflow detection exists. Next the structural test (`PrintBallot.test.tsx`) covering header / sectioned picks / themes / footer; red-fails because `PrintBallot.tsx` doesn't exist. The verbatim why-note test and polling-fallback test follow, both red-failing for the same reason. Implement in the order: build `PrintBallot.tsx` with the static layout → wire decision/theme data shape → add overflow detection + trim prompt → polling-fallback path → `window.print()` button. Visual regression baselines (`e2e/visual/print-ballot.spec.ts`) are explicitly deferred to TDD Phase 3 per `docs/ai-coding-practices/guardrails/test-driven-development.md` boundaries — name the spec file now, generate baselines later. Capture every red-phase output.

## Verification

- `npm run lint` clean.
- `npm run test` passing — component tests for full ballot, partial ballot, polling data missing, overflow trim prompt.
- `npm run build` successful.
- `npm run e2e` — full ballot → print view → assertions.
- `bash scripts/ai-verify.sh` clean.
- Manual smoke: decide a full ballot in preview, click Print, observe the print dialog, save as PDF, open the PDF, verify single page + all expected sections.

## Evidence Plan

Visual evidence:

- Screenshot of the print-view screen rendering (web).
- Saved PDF (or screenshot of PDF) showing a fully-rendered one-page ballot.
- Greyscale screenshot showing all sections still readable without color.

Behavior evidence:

- E2E test output: full-ballot → print view assertions.
- Test name: overflow-triggers-trim-prompt.
- Test name: polling-missing-shows-fallback.

Business logic evidence:

- Rule: "One page" — overflow fixture with extra-long notes, expected trim prompt, observed prompt.
- Rule: "User's notes verbatim" — fixture with known why-notes, expected text on printable matches verbatim, observed match.
- Rule: "Themes at bottom" — fixture with N themes, expected ordered list 1–N, observed match.

Persistence evidence:

- After printing, return to workspace; state preserved.

Auth/security evidence:

- not applicable

Commercial readiness evidence:

- Accessibility lane: print view screen rendering passes axe-core; the printable is high-contrast monochrome-readable.

Operational evidence:

- `npm run lint`, `npm run test`, `npm run build`, `npm run e2e` output.

Integration evidence:

- Preview deploy URL + screenshot/PDF of a real print.

Regression evidence:

- Existing handoff (Phase 9) and profile-download (existing) still work; print is additive.

Proof standard:

- A reviewer can decide a full ballot, click Print, save the result as PDF, and verify it's a single US-Letter page with the polling header, picks grouped by section with why-notes, themes at the bottom, and footer — all readable in monochrome.

Non-proof:

- "Print button works" alone — must include overflow check, polling fallback, and greyscale legibility.
- A screenshot of the screen-view that isn't the print-view's actual rendering.

## Anti-Solutions

- Do not ship an external PDF library (pdfkit, jspdf, etc.). `window.print()` only.
- Do not allow multi-page printing. Overflow → trim prompt; never silently spill to page 2.
- Do not rely on color for legibility — must read in monochrome (greyscale-test asserted).
- Do not include any recommendation or persuasion language on the printable.
- Do not silently drop the polling header when polling data is missing — show a fallback.
- Do not paraphrase the user's why-notes; render verbatim in italic.
- Do not include AI-generated commentary on the printable — only the user's voiced data.
- Do not let the print stylesheet's selectors leak into the screen view (scope to `.print-sheet`).

## Notes

- The prototype's `PrintView` in `docs/design/2026-redesign/prototype/prototype-views.jsx` is the visual reference. The `.print-sheet` class, the `.ph-head`, `.voter-meta`, `.ballot-list`, `.ballot-group`, `.br`, `.print-foot` selectors map well to component class names.
- The print stylesheet should use `@page { size: letter; margin: 0.5in }` and a body wrapper that's exactly `7.5in × 10in` (or similar) so the browser respects the page bounds.
- Consider adding `data-testid="print-sheet"` and `data-testid="ballot-group-<section>"` to facilitate e2e DOM assertions.
- The "Print / save as PDF" button is a regular HTML button calling `window.print()`. No special handling for browser-specific quirks needed unless a target browser breaks.
- Watch for fonts: the design uses Newsreader serif + IBM Plex Mono. Ensure the fonts are loaded before print (`document.fonts.ready`) so the print result uses the right typography.
- Add a "Back to ballot" button in the print view's screen rendering so the user can return to the workspace.
- Overflow detection: measure `printSheetRef.current.scrollHeight` against the expected page bounds at print DPI. Empirical threshold; tune in preview.
