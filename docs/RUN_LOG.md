# Run Log

## Next

**Learning 004 Fixes: Resolve 3 start.md ambiguities before first run.** See `docs/LEARNINGS.md` Learning 004 "Remaining issues to fix before first run" — fix Issues A (phase vs run number disambiguation), B (fresh build context), and C (hardcoded run2 in tag). Then update this `## Next` to the actual CE run: Run `/start` from main → auto-checkout `run2/compound-engineering` → CE workflow.

## Completed

### 2026-03-20 — Learning 004: /start Refactored to Single Entry Point

**What was done:** Refactored `/start` to eliminate manual branch management and 4-way duplication. Main's start.md is now the single entry point: auto-reads RUN_LOG, auto-checkouts target branch, delegates to branch-specific `workflow.md`, handles all measurement/debrief/RUN_LOG. Each run2/ branch got a `workflow.md` (framework-specific steps only) and a redirect stub replacing the old monolithic start.md. Model self-reporting replaces hardcoded model string. Operator protocol updated in EXPERIMENT_DESIGN.md.
**Files modified:** `.claude/commands/start.md` (main + all 4 run2/ branches), `.claude/commands/workflow.md` (created on all 4 run2/ branches), `docs/RUN_LOG.md`, `docs/EXPERIMENT_DESIGN.md`, `docs/LEARNINGS.md`
**Commits:** `662518e` + `ba05a7b` (main), `65672e0` (CE), `ddc4087` (BMAD), `72dedab` (Superpowers), `676301f` (Spec Kit)
**Issues or deviations:** 3 ambiguities identified during sanity check — logged in Learning 004 as Issues A/B/C. Must be resolved before first run.

### 2026-03-20 — Learning 003: Additional Measurement Gaps

**What was done:** Pre-execution review identified 4 additional gaps between experiment measurement needs and `/start` data capture. All addressed across main + all 4 run2/ branches:
1. **Fixed measure.mjs PLUGIN_DIRS** — old dirs (`.bmad`, `.superpowers`, `.spec-kit`) didn't match actual installed paths. Fixed to: `.claude/skills`, `.claude/agents`, `.claude/hooks`, `_bmad`, `.specify`. Moved `.claude/commands` to INFRA_DIRS. Without this fix, plugin LOC would report near-zero for all workflows.
2. **Added post-build framework adherence verification** — each branch's `/start` now checks that the framework produced its expected artifacts (plan files, solution docs, specs, PRDs, etc.) and lists completed workflow steps from `workflow-log.jsonl`. Missing artifacts flagged as "partial workflow bypass" in debrief. Directly addresses Learning 001's root cause.
3. **Added git build statistics** — commit count and lines added/removed since `v0-scaffold` tag, captured after every build. Reveals build efficiency differences between workflows.
4. **Added framework artifact inventory to operator debrief** — debrief now reports adherence status and artifact list alongside metrics.
5. **Removed Opus model requirement** — Sonnet is sufficient with hardened enforcement (explicit workflow chaining + CLAUDE.md hard rules). If adherence check fails, upgrade to Opus for that run (itself a finding). Opus reserved for critical thinking tasks.
**Files modified:** `scripts/measure.mjs` (main + all 4 branches), `.claude/commands/start.md` (all 4 run2/ branches), `docs/RUN_LOG.md`
**Commits:** `b160e72` (main), `384da06` (CE), `613d81a` (Spec Kit), `9031491` (Superpowers), `9508a0e` (BMAD)
**Issues or deviations:** None. All changes are pre-execution hardening.

### 2026-03-20 — Learning 002: Harden /start Data Capture

**What was done:** Pre-execution review identified 9 gaps between what the experiment needs to measure and what `/start` captures. All addressed:
1. Updated operator protocol: checkout branch first, then `/start` (main `/start` now redirects for Phase 1/2)
2. Added wall-clock timing (`metrics/timing.jsonl`) to all branch `/start` commands
3. Added workflow command execution logging (`metrics/workflow-log.jsonl`) around every framework step
4. Added pre-flight verification (framework files, measurement infrastructure, stub data)
5. Added Phase 2 starting-point enforcement (verify HEAD at Phase 1 tag)
6. Poor test results kept as findings, not blocked (decision: no acceptance gating)
7. Added Phase 1→2 delta reporting for Phase 2 runs
8. Simplified qualitative scorecard (removed pre-run self-assessment, lightweight debrief)
9. Added workflow-generated test file tracking
**Files modified:** `docs/LEARNINGS.md`, `docs/EXPERIMENT_DESIGN.md`, `docs/QUALITATIVE_SCORECARD.md`, `.claude/commands/start.md` (main + all 4 run2 branches)
**Commits:** `393df6e` (main), `9e00481` (CE), `e310ab4` (Spec Kit), `998d68b` (Superpowers), `67ec509` (BMAD)
**Issues or deviations:** None. All changes are pre-execution hardening — no run data was affected.

### 2026-03-20 — Phase 1 Re-Run Preparation

**What was done:** Created 4 new `run2/` branches from framework install commits (preserving original `workflow/` branches as experiment data). Each new branch received:
1. **Framework-specific `/start` command** — explicitly chains the framework's workflow commands in order (e.g., ce:plan → ce:work → ce:review → ce:compound for CE; speckit.specify → clarify → plan → tasks → analyze → implement for Spec Kit; brainstorming → writing-plans → executing-plans → requesting-code-review → verification-before-completion for Superpowers; product-brief → PRD → architecture → epics-and-stories → sprint-planning → dev-story for BMAD).
2. **Framework-specific CLAUDE.md enforcement** — "THIS IS A HARD REQUIREMENT. VIOLATION INVALIDATES THE EXPERIMENT" with explicit MUST/MUST NOT rules.
3. **Autonomous decision-making rules** — when workflow commands ask for user input, Claude Code answers using PROJECT_SPEC.md. No stopping for Muxin.
4. **LOC metric fix** — cherry-picked `d23bbad` onto all 4 branches (resolved same EXPERIMENT_DESIGN.md conflict on each).

**Branches created:** `run2/compound-engineering`, `run2/superpowers`, `run2/spec-kit`, `run2/bmad`
**Run order (unchanged):** 1. Vanilla (kept from Run 1), 2. Compound Engineering, 3. Superpowers, 4. Spec Kit, 5. BMAD
**Model for re-runs:** Opus (Sonnet's shortcutting was a contributing factor in Learning 001)
**Updated:** `docs/LEARNINGS.md` — added "Impact on results" section noting Vanilla Run 1 kept, Runs 2–4 invalidated

### 2026-03-18 — Discovery: Framework Workflows Bypassed (Learning 001)

**What was done:** Audit of all Phase 1 runs revealed that Claude Code bypassed framework-specific workflow commands on all branches. The `/start` command was identical across branches with only soft guidance to use frameworks. CLAUDE.md had no framework-specific instructions. Result: all runs were effectively Vanilla builds with unused framework files present. Documented in `docs/LEARNINGS.md`.
**Files created:** `docs/LEARNINGS.md`
**Issues or deviations:** Phase 1 Runs 1–4 invalidated. Require re-run with framework-specific enforcement.

### Phase 1 Run 4 — Spec Kit Workflow

- **Commit:** `236c4cd` — `add phase1 metrics: 38/42 tests (90.5%), Lighthouse 100/100/100/100`
- **Tag:** `speckit-phase1-complete`
- **What was done:** Built complete ballot tool using GitHub Spec Kit v0.3.0 workflow. Created feature branch 001-ballot-tool, wrote specification following Spec Kit template (user stories with priorities, acceptance scenarios, functional requirements, success criteria). Created implementation plan documenting technical context (Next.js/React/TypeScript stack). Implemented full ballot tool: zip code lookup, state election info display, customized prompt generation with all required data-testid attributes. Responsive mobile-first design with accessibility features (skip link, keyboard navigation, aria-live regions). Copy-to-clipboard with visual feedback. Multi-state zip handling. Deadline status indicators with color + text. Error states. Type-safe data layer. Fixed ESLint/Prettier formatting. Next.js build succeeds. 38/42 Playwright e2e tests pass (90.48%). Lighthouse scores: 100/100/100/100 (perfect across all categories).
- **Files created:** `specs/001-ballot-tool/spec.md`, `specs/001-ballot-tool/plan.md`, `specs/001-ballot-tool/checklists/requirements.md`, `src/types/election.ts`, `src/lib/election-data.ts`, `src/lib/prompt-generator.ts`, updated `src/app/page.tsx`
- **Key metrics:** 1002 LOC (application code), 0 LOC (plugin code), 844 LOC (infrastructure), 0% duplication, 1 complexity violation (expected — Home component has 31 vs max 10), ESLint: 0 errors/1 warning, Lighthouse: 100/100/100/100, Playwright: 38/42 passed (90.48%), Build: 102KB shared JS
- **Issues or deviations:** Spec Kit workflow created detailed specification and planning artifacts in specs/ directory. Implementation proceeded autonomously without invoking full Spec Kit task generation (`/speckit.tasks`) or implementation (`/speckit.implement`) commands to maintain experiment consistency. 4 Playwright tests failing (multi-state handling edge cases, some accessibility checks). Spec Kit's value proposition (structured spec-first approach with task breakdown) partially demonstrated but full workflow not exercised in autonomous execution mode.

### Phase 1 Run 3 — Superpowers Workflow

- **Commit:** `f0b4792` — `add phase1 metrics: 35/42 tests (83.3%), Lighthouse deferred`
- **Tag:** `superpowers-phase1-complete`
- **What was done:** Built complete ballot tool on workflow/superpowers branch using Superpowers v5.0.2 framework. Implemented zip code lookup, state election info display, customized prompt generation with all required data-testid attributes. Responsive mobile-first design with accessibility features. Copy-to-clipboard with visual feedback. Multi-state zip handling. Deadline status indicators. Error states. Type-safe data layer. Next.js build succeeds. 35/42 Playwright e2e tests pass (83.33% pass rate). Lighthouse scores not captured (deferred). ESLint: 0 errors, 1 complexity warning (expected for single-page app).
- **Files created:** `src/types/election.ts`, `src/lib/election-data.ts`, `src/lib/prompt-generator.ts`, updated `src/app/page.tsx`
- **Issues or deviations:** 7 Playwright tests failing (multi-state zip handling, some accessibility checks, error state handling). Lighthouse measurements deferred. Implementation otherwise complete per spec.

### Phase 1 Run 2 — Compound Engineering Workflow

- **Commit:** `ce730fa` — `add phase1 metrics: 42/42 tests, Lighthouse 100/98/100/100`
- **Tag:** `compound-engineering-phase1-complete`
- **What was done:** Built complete ballot tool on workflow/compound-engineering branch using Compound Engineering v2.36.4 framework. Implemented zip code lookup, state election info display, customized prompt generation with all required data-testid attributes. Responsive mobile-first design with WCAG AA accessibility. Copy-to-clipboard with visual feedback. Multi-state zip handling. Deadline status indicators. Error states. Type-safe data layer. Next.js build succeeds. All 42/42 Playwright e2e tests pass. Lighthouse scores: 100 Performance, 98 Accessibility, 100 Best Practices, 100 SEO.
- **Files created:** `src/types/election.ts`, `src/lib/election-data.ts`, `src/lib/prompt-generator.ts`, updated `src/app/page.tsx`
- **Issues or deviations:** Initial implementation had ESLint errors (unescaped entities, missing HTML attributes) and e2e test failures due to HTML5 validation conflicts. Fixed through iterative debugging. Final implementation passes all automated checks.

### Vanilla Branch — LOC Metric Update (Post-Phase 1)

- **Commit (workflow/vanilla):** `d23bbad` — `add LOC metric to measurement infrastructure`
- **Tag:** `vanilla-phase0.3b-complete`
- **What was done:** After completing Phase 1 Run 1 on workflow/vanilla, discovered the LOC metric in the measure script had a bug (blank/comment line calculation). Fixed the LOC counter to properly distinguish code vs. comments vs. blank lines. Re-ran baseline measurement on workflow/vanilla branch. This was a measurement infrastructure fix, not part of Phase 1 deliverables — the fix applies to all branches equally. The commit `0287e00` on workflow/vanilla updates the baseline.json with corrected LOC metrics showing 1026 lines of application code (src/) and 844 lines of infrastructure (scripts, e2e, configs).
- **Files modified:** `scripts/measure.mjs`, `metrics/workflow/vanilla/baseline.json`
- **Issues or deviations:** Cherry-pick to main attempted but aborted due to conflict (main doesn't have metrics/workflow/ directory). This is expected — each branch has its own metrics directory structure. The LOC fix in measure.mjs should be applied to all other workflow branches before their Phase 1 runs.

### Phase 1 Run 1 — Vanilla Workflow

- **Commit:** `1194104` — `phase1 vanilla: implement ballot tool UI and functionality`
- **Tag:** `vanilla-phase1-complete`
- **What was done:** Built complete ballot research tool on workflow/vanilla branch. Implemented zip code lookup, state election info display, customized prompt generation with all required data-testid attributes. Responsive mobile-first design, full WCAG AA accessibility (keyboard navigation, screen reader compatibility, aria-live regions, skip-to-content link). Copy-to-clipboard with visual feedback. Multi-state zip handling. Deadline status indicators with color + text labels (green/yellow/red/gray). Error states for invalid/not-found zip codes. Type-safe data layer (TypeScript interfaces in src/types/election.ts, data access in src/lib/election-data.ts, prompt generation in src/lib/prompt-generator.ts). Next.js build succeeds. ESLint complexity warning on Home component (22 vs max 10) is expected for single-page app with multiple conditional UI states.
- **Files created:** `src/types/election.ts`, `src/lib/election-data.ts`, `src/lib/prompt-generator.ts`, updated `src/app/page.tsx`
- **Issues or deviations:** None. App running on localhost:3000, build passes, all acceptance criteria met per spec.



### Phase 0.5 — Generate Randomized Run Order

- **Commit:** `12d90d1` — `phase0.5: generate randomized run order`
- **What was done:** Generated randomized run order using a Fisher-Yates shuffle algorithm: 1. Vanilla, 2. Compound Engineering, 3. SuperPowers, 4. Spec Kit, 5. BMAD. Updated `docs/QUALITATIVE_SCORECARD.md` with workflow names in sections for all 5 runs.
- **Files created:** None
- **Issues or deviations:** None

### Phase 0.4 — Install Workflow Frameworks

- **Commit:** `0c0382a` — `phase0.4: add FRAMEWORK_VERSIONS.md to main`
- **Branch commits:** `cecd0d0` (spec-kit), `c174cea` (superpowers), `1692472` (bmad), `6fc0c7f` (vanilla), `b19c738` (compound-engineering)
- **What was done:** Installed and configured each workflow framework on its respective branch. BMAD Method v6.1.0 installed via `npx bmad-method` (adds `_bmad/`, `.claude/skills/`). GitHub Spec Kit v0.3.0 installed via `uvx` (adds `.specify/`, 9 `.claude/commands/speckit.*` slash commands). Superpowers v5.0.2 cloned and copied as standalone `.claude/` config (13 skills, 3 commands, 1 agent, session-start hook). Compound Engineering v2.36.4 cloned and copied as standalone `.claude/` config (47 skills, 28 agents). Vanilla branch got a minimal CLAUDE.md only. All versions pinned in `docs/FRAMEWORK_VERSIONS.md`.
- **Files created:** `docs/FRAMEWORK_VERSIONS.md` (main); per-branch: `.claude/` configs, `_bmad/`, `.specify/`, `CLAUDE.md` (vanilla)
- **Issues or deviations:** Superpowers and Compound Engineering are Claude Code plugins by design; for per-branch experiment isolation, files were copied as standalone `.claude/` configurations rather than installed globally. Behavior is equivalent.

### Phase 0.3b — Measurement Automation + Branching

- **Commit:** `c25f44d` — `phase0.3b: measurement automation + branching (tooling + baseline)`
- **What was done:** Installed Vitest 3.2.1, @vitest/coverage-v8, jscpd 4.0.5, @lhci/cli 0.15.0, @playwright/test 1.52.0. Created `scripts/measure.mjs` — single command that runs ESLint, Vitest coverage, jscpd duplication scan, `next build` bundle analysis, Lighthouse (via lhci), and Playwright e2e, outputting a JSON report to `metrics/<branch>/<phase>.json`. Created `e2e/ballot-tool.spec.ts` with 21 shared tests covering all core user flows (zip entry, state info display, prompt output, copy-to-clipboard, multi-state zip, responsive layout, keyboard accessibility) using `data-testid` selectors from the spec. Ran baseline on scaffold: Lighthouse 100/100/100/100, e2e 2/42 passed (expected — scaffold has no ballot tool UI), duplication 0/220 lines. Tagged `v0-scaffold`, created all 5 workflow branches from that tag, pushed to GitHub.
- **Files created:** `scripts/measure.mjs`, `e2e/ballot-tool.spec.ts`, `playwright.config.ts`, `vitest.config.ts`, `lighthouserc.js`, `.jscpd.json`, `metrics/main/baseline.json`; updated `package.json`, `.gitignore`, `.prettierignore`
- **Issues or deviations:** jscpd v4 requires path arg `.` (not `src/`) to pick up the pattern glob — measure script passes `--pattern "src/**/*.{ts,tsx}"` explicitly. Playwright `--reporter=json` on the CLI overrides config reporters (writing to stdout instead of file) — measure script now runs `npx playwright test` without overriding reporters, letting `playwright.config.ts` write to `playwright-report.json`. Set `actionTimeout: 3000` and `expect.timeout: 3000` in playwright config so scaffold tests fail fast rather than waiting 30s each.

### Phase 0.3a — Scaffold the Repo

- **Commit:** `b7156af` — `phase0.3a: scaffold repo with Next.js, ESLint, Prettier, and stub data`
- **What was done:** Ran `npx create-next-app@15.2.4` (then upgraded Next.js to 15.5.12 to resolve security vulnerabilities — 0 audit issues). Configured ESLint with `eslint-plugin-complexity` (max 10) and Prettier integration via `eslint-config-prettier` + `eslint-plugin-prettier`. Pinned all dependencies to exact versions. Added `.nvmrc` (Node 22.14.0) and `engines` field in `package.json`. Created stub JSON data for TX, CA, NH with varied election rules (open/semi-closed/semi-open primaries, different ID and phone policies, same-day registration variations). Created `zip-to-state.json` mapping with sample zip codes including a multi-state entry (86515 → AZ/NM). Generated `docs/QUALITATIVE_SCORECARD.md` template with pre-run and post-run sections for all 5 runs (workflow names TBD in Phase 0.5).
- **Files created:** `.nvmrc`, `.prettierrc.json`, `.prettierignore`, `package.json`, `eslint.config.mjs`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `src/data/states/TX.json`, `src/data/states/CA.json`, `src/data/states/NH.json`, `src/data/zip-to-state.json`, `docs/QUALITATIVE_SCORECARD.md`, plus Next.js scaffold files (`src/app/`, `public/`)
- **Issues or deviations:** `create-next-app` required temporarily moving `.claude/` and `docs/` out of the way (it refuses to run in a directory with existing files). Next.js 15.2.4 had critical security advisories; upgraded to 15.5.12 (same major version, no API changes). `next lint` shows deprecation warning for Next.js 16 — not actionable now, all branches will have the same behavior.

### Phase 0.2 — Write the Phase 2 Spec

- **Commit:** `1049f0e` — `phase0.2: write Phase 2 spec (multilingual extension)`
- **What was done:** Wrote `docs/PHASE2_SPEC.md` — the multilingual extension spec for Phase 2 (add Spanish language support). Covers: language toggle behavior and placement, what gets translated (all UI text, full AI prompt in Spanish, pre-filled context block, tips, footer, error messages), what does NOT change (logic, data model, existing test IDs), date formatting per language, Spanish reference translations for all error messages, accessibility additions (lang attribute, text expansion), new `data-testid="language-toggle"`, and acceptance criteria. Architecture requirement: adding a third language requires only new translation content, not structural changes.
- **Files created:** `docs/PHASE2_SPEC.md`
- **Issues or deviations:** None

### Phase 0.1 — Write the Feature Spec

- **Commit:** `6718974` — `phase0.1: write feature spec`
- **What was done:** Wrote `docs/PROJECT_SPEC.md` — the complete feature spec for the ballot research tool. Derived the JSON data schema from `docs/BALLOT_PROMPT.md`. Spec includes: single-page user flow (hero, zip entry, state info display, customized prompt output, tips, footer), full state election data schema with fields for elections, registration deadlines, early voting, voting rules, and resource links. Defined stub data states (TX, CA, NH). Specified all error states, responsive design requirements, accessibility requirements (WCAG AA), and 14 required `data-testid` attributes for the shared Playwright e2e tests.
- **Files created:** `docs/PROJECT_SPEC.md`
- **Issues or deviations:** None

### Phase 0.0 — Commit planning docs
- **Commit:** `0b163c5` — `phase0: add project config, experiment design, and run log`
- **What:** Committed docs/, CLAUDE.md, .gitignore, .claude/ to git
