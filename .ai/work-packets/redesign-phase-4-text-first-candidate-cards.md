# Work Packet: redesign-phase-4-text-first-candidate-cards

Status: **shipped** — text-first candidate cards delivered as part of the 2026 redesign rollout (PRs #34–43 + `8be27ff` `PROMPT_FLEET_V2` flag flip), deployed to production at `688f718`. Card content reads top-to-bottom as a labeled list; bars are decoration that may or may not render without breaking layout. See `docs/REDESIGN_2026_SHIPPED.md`.
Owner: orchestrator
Source: docs/design/2026-redesign/README.md §5 — Phase 4 (Text-first candidate cards)
Branch: launch/production

## Intent

Make `AlignmentScoreBanner` + `FunderBars` + `AlignmentDrilldown` + `RacePatterns` render usefully even when chart data fails or is partial. Labels and percentages are the load-bearing element; bars are decoration. First-time candidates with no record show an explicit "no legislative record to compare against" message inside the alignment section instead of a broken empty chart. Donor data always renders the stacked bar PLUS a top-3 donor list as text.

## Original User Intent

From `docs/design/2026-redesign/README.md` §5 Phase 4: "Make `AlignmentScoreBanner` + `FunderBars` render usefully even when chart data fails or is partial. Labels and percentages are the load-bearing element; bars are decoration."

And from the design brief §1 critique ("Data without weight") and §4 annotation A·05: "Candidate cards are robust to render failure. If the chart fails, the labels and numbers still read as a clean text list. No screen ever collapses to a wall of paragraphs."

## Intent Interpretation

The current candidate cards fail loudly when their charts can't render — the user gets a wall of paragraphs or a half-broken visualization. The redesign makes the **text layout** the primary unit: label, score, optional bar. If the bar fails, the row still reads. Donor industries get the same treatment: stacked bar PLUS a labeled list of top-3 industries with dollar amounts. The pattern extends to `AlignmentDrilldown` (per-vote breakdown) and `RacePatterns` (propositions and if-yes/if-no two-column layout).

First-time candidates with no voting record are a recurring edge case (mocked in the prototype as `Marisol Olusola` with `alignment: {}` and `defaultAlignment: null`). The current app likely tries to chart an empty record and fails. The fix is explicit: show "No legislative record to compare against. First-time candidate — judge on policy statements and donor base instead." Don't fake a zero-bar, don't crash, don't render an empty chart frame.

Phase 4 depends on Phase 3 (the workspace renders candidate cards inside chat messages). It produces components Phase 6 (theme amendment) will rely on for the re-score delta display.

## Business Logic

Rules:

- Card content reads top-to-bottom as a clean labeled list. Bars are decoration that may or may not render; their absence does not break layout or comprehension.
- Per-theme alignment rows always show: theme name, percentage, optional bar. If the percentage is unknown, the row shows "—" not "0%".
- First-time candidates with no record: render the alignment section with an explicit message ("No legislative record to compare against. First-time candidate — judge on policy statements and donor base instead.") inside the same card slot. Do not render an empty chart frame.
- Donor section always shows BOTH the stacked bar AND the top-3 donor list as text rows with dollar amounts. Bar alone is insufficient; list alone is allowed if the bar fails.
- Color is supportive, not load-bearing. Bars use civic / gold / vote-red tones, but the label always carries the information. Test with bars hidden — the card must still read.
- The proposition layout (`RacePatterns`) gets a two-column if-yes / if-no display with concrete impact framing.
- Donor stacked bar segments are sized by `flex` factor proportional to donor weight, but the segment label survives even at small widths (truncation rules: show the first word, then ellipsis).
- "See the votes →" / "Compare both" / "Pick X" action buttons stay below the card body, separated by a dividing rule.

Assumptions:

- The data layer (`src/lib/server/alignment.ts`, `src/lib/server/donors.ts`) already returns the shapes the cards need. Phase 4 is a render-side refactor; data-side changes belong in dedicated data packets.
- Tailwind tokens exist for the civic/gold/vote-red color palette. If not, add semantic CSS variables.

User-confirmed decisions:

- Candidate cards render inside chat message bubbles (per prototype). Phase 3 owns the bubble wrapper; Phase 4 owns the card body.

Edge cases:

- Candidate with zero alignment data (no record): explicit message, no chart frame.
- Candidate with partial alignment (only some themes have scores): render all theme rows; rows without scores show "—" or "no data" with no bar.
- Donor data empty / API failure: show "Donor data unavailable — check OpenSecrets" inline. Do not render the bar at all in this case.
- Proposition with missing if-yes/if-no text: render whichever exists; explicit "(impact not yet summarized)" for the missing side. Don't blank the column.
- Theme name longer than 18 chars: truncate with ellipsis + tooltip with full name (the prototype uses `a.name.slice(0, 16) + '…'`).
- Chart library failure (e.g. browser quirk, missing dep, runtime error in a render): catch + fall back to text-only. Never let a chart error blank the card.
- Color-blind / monochrome printing: card must read cleanly without color cues. Test with greyscale.

Out of scope:

- Per-vote drilldown UX (`AlignmentDrilldown` deep links); Phase 4 makes it survive failures but doesn't redesign the deep-dive flow.
- Live donor freshness indicators (timestamp, last-FEC-pull). Static date OK.
- Endorsement display (separate phase / future polish).
- The donor color palette being meaningful by industry (it can stay arbitrary as long as labels carry the data).

## Commercial Readiness

Applicability: launch

Lanes in scope:

- product UX (most-rendered surface inside chat)
- accessibility/responsive (text-first means screen readers get useful content even without chart fidelity)
- API/contracts (consumes alignment.ts and donors.ts shapes; no new contracts)
- legal/compliance prompt (citations / source-bounded claims surface as text not chart annotations)

User decisions needed:

- none before implementation

Assumptions:

- Color tokens are part of the existing design system.

## Operational Reproducibility

Setup:

- `npm install`

Configuration:

- no new config

Provider setup:

- no new providers

Infrastructure/deployment:

- Vercel manual deploy via `deploy.yml`

Database migrations:

- not applicable

Manual steps:

- After deploy: visit a race page, observe the card; manually simulate chart failure (e.g. via a debug query param) to confirm text-only rendering still reads.

Verification:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run e2e` — open a race, inspect the rendered card structure (DOM has expected text content)
- `bash scripts/ai-verify.sh`

Test quality:

- Snapshot/structure tests for each render state: full data, no record, partial alignment, donor failure.
- Visual regression test with bars hidden via CSS — the card must still pass a content-readability assertion.

Critical logic trigger:

- AI behavior (the chat references candidate-card data; failure modes affect user trust)
- business rule (no fake zeros; explicit empty states)

## Scope

Touch:

- `src/components/AlignmentScoreBanner.tsx` — text-first restructure; bars become decoration.
- `src/components/AlignmentDrilldown.tsx` — text-first restructure; per-vote rows survive chart failure.
- `src/components/FunderBars.tsx` — stacked bar + list pattern; never bar-alone.
- `src/components/RacePatterns.tsx` — proposition if-yes/if-no two-column layout; survives missing sides.
- `src/components/PlatformAlignmentRatio.tsx` — review; align with the text-first pattern.
- Shared subcomponents if extracted (e.g. `AlignmentRow.tsx`, `DonorRow.tsx`).
- tests for each component's render states.

Do not touch:

- `main`
- Data layer (`src/lib/server/alignment.ts`, `src/lib/server/donors.ts`)
- Chat API route (Phase 1's territory)
- Workspace shell (Phase 3's territory)
- Print stylesheet (Phase 7's territory) — though the text-first cards should print cleanly as a side effect

## Ownership Audit

Concern: candidate / proposition card rendering and failure modes
Existing owner: `src/components/AlignmentScoreBanner.tsx`, `src/components/FunderBars.tsx`, `src/components/AlignmentDrilldown.tsx`, `src/components/RacePatterns.tsx`, `src/components/PlatformAlignmentRatio.tsx`
Neighboring owners:

- alignment data: `src/lib/server/alignment.ts`
- donor data: `src/lib/server/donors.ts`
- chat shell: `src/components/ChatPanel.tsx` (Phase 3)
- workspace state: `src/components/BallotToolClient.tsx` (Phase 3)

Files/modules/docs inspected:

- `docs/design/2026-redesign/README.md` §5 Phase 4
- `docs/design/2026-redesign/Voter Choice Redesign.html` §1 critique, §4 annotation A·05
- `docs/design/2026-redesign/prototype/prototype-components.jsx` (CandidateCard, PropositionCard)
- `src/components/AlignmentScoreBanner.tsx`
- `src/components/AlignmentDrilldown.tsx`
- `src/components/FunderBars.tsx`
- `src/components/RacePatterns.tsx`
- `src/components/PlatformAlignmentRatio.tsx`

Reuse/edit targets:

- All five existing components stay — restructure rather than replace.
- Consider extracting `AlignmentRow` / `DonorRow` shared subcomponents if duplication exceeds 2 sites.

New owner needed: arguably yes for the shared row primitives if extracted. Worker's call.

Overlap/bloat risks:

- Two implementations of "candidate has no record" message — extract a small `NoRecordNotice` if it appears in more than one place.
- Five components each defining their own empty/failure states inconsistently — adopt a shared pattern.
- Duplicating the donor color palette across `FunderBars` and any future donor-related view.

Recommendation:

- Restructure in place. Extract row primitives only if duplication is real. Add a single shared `EmptyState` or `NoRecordNotice` subcomponent.

Execution constraints:

- Workers must NOT introduce a code path where a chart-render failure blanks the card.
- Workers must NOT show 0% scores when the candidate has no record — explicit empty state only.
- Workers must NOT remove the donor-list text rows; the bar alone is insufficient.

## Acceptance Criteria

- Candidate card with full alignment data renders: name, party, incumbent/challenger, years, bio, alignment section (N theme rows with label + percentage + bar), donor section (stacked bar + top-3 donor list), action buttons.
- Candidate card with empty record (`defaultAlignment: null`) renders: name + party + bio + explicit "No legislative record to compare against. First-time candidate — judge on policy statements and donor base instead." in the alignment slot. Donor section still renders if data exists.
- Candidate card with partial alignment renders: known theme rows with scores; unknown theme rows with "—" and no bar.
- Donor section with data renders BOTH stacked bar AND top-3 list with dollar amounts. With bar hidden via CSS, the list still reads.
- Donor section with no data renders "Donor data unavailable" message, no bar.
- Proposition card renders if-yes/if-no two-column layout; missing side shows "(impact not yet summarized)" inline.
- Simulated chart failure (e.g. throwing in a `<Bar />` component caught by an error boundary) does NOT blank the card; text content remains.
- Greyscale rendering (force `filter: grayscale(1)` on body) does not reduce comprehension — labels and percentages still carry the data.
- Long theme names truncate with ellipsis; title attribute or tooltip surfaces full name.
- `npm run lint`, `npm run test`, `npm run build` pass.

## Test Plan

Maps each acceptance criterion to a test file path and the shape of the assertion. Per `docs/ai-coding-practices/guardrails/test-driven-development.md`, tests are written BEFORE implementation and the red phase is verified via `scripts/ai-tdd-red.sh`.

| AC | Test file | Test shape |
|---|---|---|
| Full-data card renders all sections in text-first order | `src/components/AlignmentScoreBanner.test.tsx` | input: full-fixture candidate; expected: DOM contains name, party, incumbent flag, N theme rows with `label + percentage`, donor section with top-3 list; observed: per-section presence |
| Empty-record candidate: explicit no-record message, no chart frame | `src/components/AlignmentScoreBanner.test.tsx` | input: candidate with `defaultAlignment: null`; expected: alignment slot contains `/no legislative record to compare against/i` AND no `<svg>` or chart-frame element; observed: text present, frame absent |
| Partial alignment: known rows render scores, unknown rows show "—" | `src/components/AlignmentScoreBanner.test.tsx` | input: candidate with 2 of 4 themes scored; expected: scored rows show `\d+%`, unscored rows show literal `"—"` with no bar element; observed: per-row match |
| Donor section: stacked bar + top-3 list always render together | `src/components/FunderBars.test.tsx` | input: donor fixture; expected: bar element AND list with 3 `<li>` each containing name + `$` amount; observed: both present |
| Donor section with bars hidden via CSS still reads | `src/components/FunderBars.test.tsx` | render with className that hides bars; expected: donor names + dollar amounts still present in DOM (queryable as text); observed: present |
| Donor data missing: "unavailable" message, no bar | `src/components/FunderBars.test.tsx` | input: empty donor data; expected: `getByText(/donor data unavailable/i)`, no bar element; observed: match |
| Proposition card: if-yes / if-no two-column layout, missing side fallback | `src/components/RacePatterns.test.tsx` | input: prop fixture with if-yes only; expected: if-yes column has text, if-no column has `/impact not yet summarized/i`; observed: match |
| Chart-render failure does not blank the card | `src/components/AlignmentScoreBanner.errorBoundary.test.tsx` | wrap card in `ErrorBoundary`, mock chart child to `throw`; expected: card text content (name, theme labels, percentages) still in DOM; observed: present |
| Greyscale rendering preserves comprehension | `src/components/AlignmentScoreBanner.test.tsx` | apply `filter: grayscale(1)` via inline style; expected: getByText(label/percentage) succeeds for every theme row; observed: match |
| Long theme name truncates with title tooltip | `src/components/AlignmentScoreBanner.test.tsx` | input: theme name > 18 chars; expected: visible text contains `…` AND `title` attribute carries full name; observed: match |
| Per-vote drilldown survives chart failure | `src/components/AlignmentDrilldown.test.tsx` | mock chart child to `throw`; expected: per-vote rows still readable as text list; observed: present |
| Visual fidelity: full-data + empty-record + greyscale screenshots | `e2e/visual/candidate-cards.spec.ts` | `toHaveScreenshot()` for each render state; deferred — visual regression baselines wait for TDD Phase 3 (see `tdd-phase-3-visual-regression-and-thresholds.md`) | mark baselines as `deferred` |
| `npm run lint`, `npm run test`, `npm run build` green | n/a — covered by `bash scripts/ai-verify.sh` | not test-shape applicable; reviewer-enforced |

### Red-phase ritual for this packet

The empty-record explicit message is the keystone behavior — write `src/components/AlignmentScoreBanner.test.tsx`'s no-record case first and red-verify; the current component renders an empty chart frame, so the assertion that the frame is absent fails. Next write the chart-failure error-boundary test (`AlignmentScoreBanner.errorBoundary.test.tsx`); it fails because no error boundary exists. The donor list + bar-hidden tests against `FunderBars.test.tsx` come third — they fail because the donor list-as-text isn't rendered. Implement in the order: extract shared row primitives, add error boundary + no-record fallback in `AlignmentScoreBanner`, then `FunderBars` text rows + `RacePatterns` two-column. Visual screenshot baselines are explicitly deferred to TDD Phase 3 per `docs/ai-coding-practices/guardrails/test-driven-development.md` boundaries — record the e2e spec path now, generate baselines later.

## Verification

- `npm run lint` clean.
- `npm run test` passing — component tests for each render state (full, empty record, partial, donor failure, proposition with missing side).
- `npm run build` successful.
- `npm run e2e` — open a race, assert DOM contains the expected text content for each state.
- `bash scripts/ai-verify.sh` clean.
- Manual smoke: in preview, view a real race with full data and one with the empty-record candidate; observe the card behavior in both.

## Evidence Plan

Visual evidence:

- Screenshot of the full-data card.
- Screenshot of the empty-record card with the explicit message.
- Screenshot of the proposition card.
- Screenshot with bars hidden (or in greyscale) showing the card still reads.

Behavior evidence:

- Test name + output for each render state.
- Error-boundary test name showing a thrown chart-render error does not blank the card.

Business logic evidence:

- Rule: "No fake zeros for empty records" — test fixture with `defaultAlignment: null`, expected explicit message, observed match.
- Rule: "Donor section requires text list" — test fixture with donor data, expected DOM contains top-3 donor names + dollar amounts, observed match.
- Rule: "Card text-readable without bars" — test with bars hidden, expected theme labels + percentages present in DOM, observed match.

Persistence evidence:

- not applicable

Auth/security evidence:

- not applicable

Commercial readiness evidence:

- Accessibility lane: screen-reader output captured for the empty-record card; surfaces the no-record message clearly.

Operational evidence:

- `npm run lint`, `npm run test`, `npm run build`, `npm run e2e` output.

Integration evidence:

- Preview screenshot with real alignment/donor data from `src/lib/server/`.

Regression evidence:

- Existing alignment / donor tests still pass.

Proof standard:

- A reviewer can render a card with full data, with no record, and with a chart-render failure simulated — and read the candidate's key information in all three cases.

Non-proof:

- "Cards render in the happy path" — must include failure-mode coverage.
- A snapshot test that pins styles but doesn't assert text content.

## Anti-Solutions

- Do not let a chart-render error blank the card.
- Do not fake a 0% score when a candidate has no record — explicit empty state only.
- Do not remove the donor-list text rows; bar alone is insufficient.
- Do not rely on color to communicate alignment grade — use label + percentage as primary, bar fill class as decoration.
- Do not silently truncate theme names without surfacing the full name via title/tooltip.
- Do not render an empty chart frame for missing data — render text.

## Notes

- The prototype's `CandidateCard` and `PropositionCard` in `docs/design/2026-redesign/prototype/prototype-components.jsx` are useful structural references. Map their CSS class names to Tailwind utilities or new component CSS where consistent.
- Use `aria-label` and `title` attributes liberally — text-first cards should be excellent for screen readers as a side effect.
- The card sometimes contains a small follow-up paragraph from the chat ("She voted with your stated priorities on 77% of the 38 roll-calls we tracked …") — that lives *outside* the card and inside the chat bubble. Phase 4 doesn't own that text; Phase 1's race-deep-dive prompt does.
- Consider adding a small `data-testid` per render state so e2e and visual-regression tests can assert structure without relying on text matches.
- If extracting `AlignmentRow.tsx` / `DonorRow.tsx`, place them under `src/components/cards/` (or whatever existing convention applies).
