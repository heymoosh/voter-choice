# Requirements Quality Checklist: Ballot Research Tool

**Purpose**: Validate completeness, clarity, consistency, and measurability of all
requirements before implementation begins (pre-implement gate)
**Created**: 2026-03-30
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md) | [tasks.md](../tasks.md)
**Focus**: All quality dimensions — accessibility, UX interactions, edge cases,
measurability, and testid coverage

---

## Requirement Completeness

- [ ] CHK001 Are requirements defined for ALL 13 required `data-testid` attributes listed in `docs/PROJECT_SPEC.md`, including both what each element renders and the condition under which it appears? [Completeness, Spec §FR-011]
- [ ] CHK002 Is the exact text content of each error message specified in requirements (`zip-error`, `not-found-message`, `no-election-message`)? [Completeness, Spec §FR-002, §US3]
- [ ] CHK003 Are loading/transition state requirements defined for the period between zip submission and state data display? [Completeness, Spec §UI Behavior]
- [ ] CHK004 Are requirements defined for the visual separation between the base prompt and the pre-filled context block in `prompt-output`? [Completeness, Spec §FR-006, Spec §User Flow §4]
- [ ] CHK005 Are requirements defined for the footer's "link to the original prompt source" — what URL does it link to when the prompt source may be unknown? [Completeness, Gap, Spec §User Flow §6]
- [ ] CHK006 Are multi-state zip code requirements complete — does the spec define behavior for more than 2 states in one zip (e.g., 3+ states)? [Completeness, Spec §Edge Cases]

## Requirement Clarity

- [ ] CHK007 Is "approximately 2 seconds" for copy confirmation quantified precisely enough to write a deterministic test — e.g., is "2 seconds" a minimum, maximum, or exact duration? [Clarity, Spec §FR-008]
- [ ] CHK008 Is "visual confirmation" for copy button feedback defined with specific visual property requirements (e.g., icon type, color change, text change) or is it open to interpretation? [Clarity, Spec §User Flow §4]
- [ ] CHK009 Is "next upcoming election" defined precisely — does it mean the first election with `date ≥ today` or `date > today` (i.e., is today itself included)? [Clarity, Spec §Prompt Customization Logic]
- [ ] CHK010 Is "near-instant" for the zip lookup loading state quantified with a threshold, or is the loading indicator's display duration undefined? [Clarity, Spec §Loading States]
- [ ] CHK011 Are the "tips for using the prompt effectively" defined as specific required content items, or is the tips section content left to implementation discretion? [Clarity, Spec §User Flow §5]
- [ ] CHK012 Is "brief loading indicator" specified with a visual type (spinner, skeleton, progress bar) or is it deliberately open to implementation choice? [Clarity, Spec §Loading States]
- [ ] CHK013 Is "Clear visual separation" between prompt and context block defined with measurable visual properties (e.g., divider, background color difference, spacing)? [Clarity, Spec §User Flow §4]

## Requirement Consistency

- [ ] CHK014 Are deadline status thresholds (> 14 days = green, ≤ 14 days = yellow, ≤ 3 days = red) consistent between `spec.md` §FR-005 and `data-model.md` DeadlineStatus definitions? [Consistency]
- [ ] CHK015 Is the minimum touch target size (44×44 px) specified consistently in both `spec.md` (Principle II) and the constitution (Principle I)? Do both documents agree? [Consistency]
- [ ] CHK016 Are the WCAG AA contrast ratios (4.5:1 normal, 3:1 large text) specified in both `spec.md` §Accessibility and the constitution — do they agree on the standard? [Consistency]
- [ ] CHK017 Does `spec.md` §FR-012 ("no external API calls") align with `plan.md`'s technical approach (dynamic TypeScript imports vs. fetch) — is there a contradiction? [Consistency, Spec §FR-012, Plan §Phase 0]

## Accessibility Requirements Quality

- [ ] CHK018 Are keyboard navigation requirements defined for the state selector modal — specifically, is focus management on open/close documented? [Accessibility, Spec §US2, Constitution §I]
- [ ] CHK019 Is `role="alert"` vs. `aria-live="polite"` assignment specified per element — which elements use which pattern and why? [Accessibility, Spec §Accessibility, Constitution §I]
- [ ] CHK020 Are requirements defined for the skip-to-content link's target element ID (`#main-content`) so all implementations use the same anchor? [Accessibility, Spec §Accessibility]
- [ ] CHK021 Is "logically navigable via keyboard" defined with specific tab order requirements, or is the order left to visual-flow inference? [Accessibility, Spec §Accessibility]
- [ ] CHK022 Are color-name class requirements (green/yellow/red/gray) specified to require BOTH a color class AND a text label, or could an implementation satisfy the spec with only a color class? [Accessibility, Spec §FR-005, Constitution §I]

## Edge Case Coverage

- [ ] CHK023 Are requirements defined for the deadline status when `daysLeft === 0` (i.e., today is the deadline date) — is today "Passed" or "Today (last day)" with what color? [Edge Case, Spec §FR-005, data-model.md §DeadlineStatus]
- [ ] CHK024 Are requirements defined for a zip code that passes the 5-digit numeric validation but maps to a state with no JSON data file (future state not in stub set)? [Edge Case, Spec §US3]
- [ ] CHK025 Are requirements defined for what happens when `earlyVoting.startDate` is set but `earlyVoting.endDate` is null, or vice versa (partially populated early voting data)? [Edge Case, Spec §Data Model]
- [ ] CHK026 Are requirements defined for the all-deadlines-passed condition when `online.available = false` — should that method be excluded from the "all passed" calculation? [Edge Case, Spec §Edge Cases]

## Acceptance Criteria Measurability

- [ ] CHK027 Is SC-001 (100% Playwright e2e pass rate) measurable without knowing the exact test count — should the criterion specify "all tests in `e2e/ballot-tool.spec.ts`" rather than a hardcoded number? [Measurability, Spec §SC-001]
- [ ] CHK028 Is SC-003 ("under 30 seconds on a typical mobile device") measurable/objective given "typical" is undefined — should a specific device profile or network condition be specified? [Measurability, Spec §SC-003]
- [ ] CHK029 Is SC-006 ("no keyboard traps exist") defined with a specific test procedure (e.g., Escape dismisses modal, Tab cycles through page), or is it left as a qualitative judgment? [Measurability, Spec §SC-006]
- [ ] CHK030 Are all Lighthouse score thresholds (≥ 90 per category) specified for a specific run condition (desktop vs. mobile, throttled vs. unthrottled)? [Measurability, Constitution §Quality Gates]

## Dependencies & Assumptions

- [ ] CHK031 Is the assumption "base prompt text loaded from `docs/BALLOT_PROMPT.md` at build time" validated — is this file guaranteed to exist in all workflow branches and not change between branches? [Assumption, Spec §Assumptions]
- [ ] CHK032 Is the assumption "today's date = browser local date" explicitly flagged as a limitation — does the spec acknowledge that voter timezone differences could affect deadline status display? [Assumption, Spec §Assumptions]
- [ ] CHK033 Is the dependency on stub data for AZ and NM (needed for multi-state zip 86515 test) documented in requirements — is it clear that tasks.md T002 must create these stubs before US2 tests can run? [Dependency, tasks.md §T002]

## Notes

- Check items off as completed: `[x]`
- Add findings inline next to failing items (e.g., `[x] CHK007 — Clarified: treat as maximum duration`)
- Items marked `[Gap]` require spec updates before `speckit.implement` runs
- Items marked `[Ambiguity]` may proceed with documented assumptions but risk rework
- Items marked `[Assumption]` should be validated or explicitly accepted as risk
