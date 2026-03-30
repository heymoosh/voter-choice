# Run Log

## Next

Phase 1 Run 3: BMAD. Checkout `run3/bmad`, run `/start`.

## Completed

### Phase 1 Run 3 — Spec Kit (complete)

- **Date:** 2026-03-30
- **Branch:** `run3/spec-kit`
- **Tag:** `speckit-run3-phase1-complete` (local; push from host — container has no GitHub credentials)
- **Commit:** `8dff08b`
- **What was done:** Full Spec Kit workflow (8 steps): speckit.constitution → speckit.specify → speckit.clarify → speckit.plan → speckit.tasks → speckit.checklist → speckit.analyze → speckit.implement. Built ballot tool using TDD Iron Law (RED→GREEN→REFACTOR→COMMIT). Types, lib functions (lookupZip, getStateData, getDeadlineStatus, generatePrompt), ZipForm, StateInfoCard, PromptOutput, StateSelectorModal, BallotToolClient, page.tsx. Extracted EarlyVotingSection + VoterIdSection subcomponents to fix ESLint complexity violation (13 → ≤10). Spec artifacts landed in `specs/002-ballot-research-tool/` (Spec Kit script redirect due to non-feature branch) with symlinks in `.specify/features/`.
- **Measurements:** Vitest 72/72 unit (88.3% line coverage), ESLint 0 errors/0 warnings, 0% duplication, first load JS 102 kB, 1838 LOC in src/. Playwright e2e and Lighthouse not measurable (container missing libglib-2.0 — Chromium system deps not installable without root). Re-run `npm run measure` from host for full metrics.
- **Issues or deviations:** Session continued across two Claude Code contexts due to context limit. E2e and Lighthouse metrics unavailable in Docker container (no sudo for apt-get). Spec Kit feature-branch scripts redirected artifacts to `specs/` prefix; adherence check resolved with symlinks.

## Completed

### Phase 1 Run 3 — Superpowers (complete)

- **Date:** 2026-03-21 – 2026-03-30
- **Branch:** `run3/superpowers`
- **Tag:** `superpowers-run3-phase1-complete`
- **Commit:** `9283420`
- **What was done:** Full Superpowers workflow (6 steps): brainstorming → writing-plans → executing-plans → requesting-code-review → verification-before-completion → finishing-a-development-branch. Built ballot tool using TDD Iron Law (RED→GREEN→REFACTOR→COMMIT). Types, date-utils, data layer, prompt-generator, ZipForm, StateInfoCard, PromptOutput, StateSelectorModal, BallotToolClient, page.tsx. Fixed hydration issue (stale production server chunk) by rebuilding before final measure run.
- **Measurements:** Lighthouse 100/100/100/100, Playwright 42/42 e2e, Vitest 53/53 unit, ESLint 0 errors, 0% duplication, first load JS 102 kB, 1623 LOC in src/.
- **Issues or deviations:** Session continued across two Claude Code contexts due to context limit. Mid-build stale production server (from a prior killed process) returned 400 on chunk requests, causing 30/42 e2e failures — fixed by killing the stale process and rebuilding.

### Infra Fix — CE Run4 Branch: Copy Sub-Skills to commands/

- **Date:** 2026-03-30
- **Commit:** `a0f25aa` on `run4/compound-engineering`
- **Branch:** `run4/compound-engineering` (created from `b9fbafd` — last infra commit on run3/compound-engineering, before build work)
- **What was done:** Root-caused why /lfg failed in CE run3: the `/lfg` command was in `.claude/commands/` (Skill-invokable), but every sub-skill it chains (ce:plan, ce:work, ce:review, deepen-plan, ce:compound, resolve-todo-parallel, test-browser, feature-video) was only in `.claude/skills/` — unreachable by the Skill tool. The model silently fell back to reading SKILL.md files as prose (Learning 005/006 antipattern). Fixed by copying all 8 sub-skill SKILL.md files to `.claude/commands/`. Rewrote `lfg.md` to use explicit `skill: "ce-plan"` syntax. Updated CLAUDE.md to enforce Skill-only invocation and require ce:compound output.
- **Issues or deviations:** None.

### Learning 007 — Gap Analysis: Design Goals vs. Implementation

- **Date:** 2026-03-23
- **Branches affected:** `run3/superpowers`, `workflow/vanilla`, `main`
- **What was done:** Systematic review of experiment design goals vs. actual infrastructure. Found 7 gaps. Applied 4 fixes and made 3 decisions:
  - **Fix 1 (CRITICAL):** Inlined TDD Iron Law in Superpowers `workflow.md` and `CLAUDE.md` — the TDD reference was using the broken "read and follow" pattern from Learning 005/006. Commit `d2e66fe` on `run3/superpowers`.
  - **Fix 2:** Created vanilla `workflow.md` for Phase 2 `/start` compatibility. Commit `aae3358` on `workflow/vanilla`.
  - **Fix 3-4:** Added `workflowTests` (test file count) and `workflowTiming` (step durations) to `measure.mjs` on `main`.
  - **Fix 5:** Created `scripts/analyze-adherence.mjs` for Phase 3 post-hoc process verification.
  - **Decision:** Sonnet for all remaining runs (consistent with CE/Vanilla).
  - **Decision:** Accept CE run3 results with documented caveats (ce:compound skipped, /lfg read-not-invoked).
  - **Decision:** BMAD multi-agent features (party-mode, adversarial reviewers) deferred to Phase 2 review.
- **Files modified:** `docs/LEARNINGS.md` (Learning 007), `scripts/measure.mjs`, `scripts/analyze-adherence.mjs` (new), `docs/RUN_LOG.md`

### Workflow Enhancement — Add Recommended Capabilities to BMAD and Spec Kit

- **Date:** 2026-03-23
- **Branches:** `run3/bmad`, `run3/spec-kit`
- **What was done:** Added framework-recommended capabilities that were installed but not included in the workflow sequences. BMAD: added `bmad-brainstorming` (creative ideation before product brief) and `bmad-create-ux-design` (UX planning after PRD) — both are BMAD skills with full workflow files. Spec Kit: added `speckit.constitution` (project principles before specifying) and `speckit.checklist` (requirements quality validation after tasks). Updated workflow.md resume logic and CLAUDE.md enforcement sections on both branches.
- **Files modified:** `.claude/commands/workflow.md`, `.claude/CLAUDE.md` on both branches

### Phase 1 Run 3 — Superpowers (in progress)

- **Date:** 2026-03-21 – 2026-03-22
- **Branch:** `run3/superpowers`
- **Commits:** `ec3689c` (brainstorming), `baad166` (writing-plans)
- **What was done:** Completed brainstorming (design spec at `docs/superpowers/specs/2026-03-21-ballot-tool-design.md`) and writing-plans (implementation plan at `docs/superpowers/plans/2026-03-21-ballot-tool.md`). Executing-plans started but not completed. No application code yet.
- **Issues or deviations:** Session ended mid-execution. Resume logic in workflow.md handles this.

### Learning 006 Fix — BMAD workflow.md Skill Invocation

- **Date:** 2026-03-21
- **Commit:** `9af3164` — `learning-006: rewrite BMAD workflow.md to use Skill tool invocation`
- **Branch:** `run3/bmad` (created from `ddc4087` on `run2/bmad`)
- **What was done:** Created `run3/bmad` branch. Copied 9 BMAD skills from `.claude/skills/` to `.claude/commands/` so they can be Skill-invoked: bmad-create-product-brief, bmad-create-prd, bmad-create-architecture, bmad-create-epics-and-stories, bmad-check-implementation-readiness, bmad-sprint-planning, bmad-create-story, bmad-dev-story, bmad-code-review. Rewrote `workflow.md` to replace all 8 "Read and follow `.claude/skills/X/SKILL.md`" instructions with Skill tool invocations (`skill: "bmad-X"`). Updated CLAUDE.md enforcement section to explicitly require Skill tool invocation and prohibit reading skill files as prose. Added adherence check for Skill tool usage.
- **Files modified:** `.claude/commands/workflow.md`, `.claude/CLAUDE.md`, plus 9 new command files
- **Issues or deviations:** Used individual phase skills rather than `bmad-quick-dev-new-preview` — quick-dev-new-preview only covers implementation (clarify→plan→implement→review→present), not the full BMAD 4-phase pipeline (analysis→planning→solutioning→implementation). All 4 BMAD phases with 8 steps are preserved.

### Learning 006 Fix — Superpowers workflow.md Skill Invocation

- **Date:** 2026-03-21
- **Commit:** `959b1c7` — `learning-006: rewrite Superpowers workflow.md to use Skill tool invocation`
- **Branch:** `run3/superpowers` (created from `72dedab` on `run2/superpowers`)
- **What was done:** Created `run3/superpowers` branch. Copied 7 key skills from `.claude/skills/` to `.claude/commands/` so they can be Skill-invoked: brainstorming, writing-plans, executing-plans, subagent-driven-development, requesting-code-review, verification-before-completion, finishing-a-development-branch. Removed 3 deprecated command stubs (brainstorm.md, write-plan.md, execute-plan.md). Rewrote `workflow.md` to replace all 6 "Read and follow `.claude/skills/X/SKILL.md`" instructions with Skill tool invocations (`skill: "X"`). Updated CLAUDE.md enforcement section to explicitly require Skill tool invocation and prohibit reading skill files as prose. Added adherence check for Skill tool usage.
- **Files modified:** `.claude/commands/workflow.md`, `.claude/CLAUDE.md`, plus 7 new command files and 3 deleted stubs
- **Issues or deviations:** None.

### Learning 006 Fix — Spec Kit workflow.md Skill Invocation

- **Date:** 2026-03-21
- **Commit:** `836ac98` — `learning-006: rewrite Spec Kit workflow.md to use Skill tool invocation`
- **Branch:** `run3/spec-kit` (created from `676301f` on `run2/spec-kit`)
- **What was done:** Created `run3/spec-kit` branch. Rewrote `workflow.md` to replace all 6 "Read and follow `.claude/commands/speckit.X.md`" instructions with Skill tool invocations (`skill: "speckit.X"`). No file moves needed — Spec Kit commands were already in `.claude/commands/`. Updated CLAUDE.md enforcement section to explicitly require Skill tool invocation and prohibit reading command files as prose. Added adherence check for Skill tool usage.
- **Files modified:** `.claude/commands/workflow.md`, `.claude/CLAUDE.md`
- **Issues or deviations:** None. Simplest of the three remaining plugins (commands already in correct location).

### Learning 006 — "Read and Follow" Affects All Plugins

- **Date:** 2026-03-20
- **What was done:** Audited all four workflow.md files. All use the same "Read and follow SKILL.md" pattern that caused CE's multi-agent engine to never activate (Learning 005). Superpowers loses subagent-driven-development, review subagents, and Iron Law enforcement. BMAD loses step-file architecture, agent persona loading, and adversarial reviewers. Spec Kit is lower severity (commands already in commands/, simpler architecture). Corrective action: create run3/ branches for all three with Skill tool invocation. See `docs/LEARNINGS.md` Learning 006 for full analysis.
- **Files modified:** `docs/LEARNINGS.md`
- **Issues or deviations:** None

### Phase 1 Run 3 — Compound Engineering (CE /lfg pipeline)

- **Commit:** `3b4cfd7` — `phase1: ce:review + resolve_todo_parallel — apply review findings`
- **Branch:** `run3/compound-engineering`
- **What was done:** Full CE `/lfg` pipeline: ce:plan (with 7 parallel deepen-plan agents) → ce:work (built ballot tool: types, date-utils, election-data, prompt-generator, ZipForm, StateInfoCard, PromptOutput, BallotToolClient, page.tsx, security headers) → ce:review (5 agents: TypeScript, security, performance, architecture, simplicity + agent-native + learnings) → resolve_todo_parallel (6 todos fixed in parallel). Zero lint errors, clean production build.
- **Measurements:** Lighthouse 100/100/100/100, Playwright 42/42 e2e passed, ESLint 0 errors, bundle 113 kB first load, 1337 LOC in src/.
- **Issues or deviations:** `/lfg` slash command not registered — manually executed lfg.md pipeline by reading SKILL.md files. ce:compound (solution doc) skipped — context budget exhausted after review+resolve. Two duplicate lfg:started entries in workflow-log (prior failed attempt logged before context reset).

### Phase 1 Run 2 — Compound Engineering (initial attempt)

- **Commit:** `46d65d3` — `run-log: Phase 1 Run 2 CE complete, next = Run 3 Superpowers`
- **Branch:** `run2/compound-engineering`
- **What was done:** CE multi-agent engine never activated (learning-005). Re-run scheduled as Run 3.

### Phase 1 Run 1 — Vanilla

- **Branch:** `workflow/vanilla`
- **Tag:** `vanilla-phase1-complete`
- **What was done:** Built ballot tool using default Claude Code behavior (no framework). Phase 1 complete — kept as-is, no Run 3 needed. Metrics in `metrics/` on branch.

### Phase 0.5 — Randomized Run Order

- **What was done:** Generated randomized run order: 1. Vanilla, 2. Compound Engineering, 3. Superpowers, 4. Spec Kit, 5. BMAD. Updated `docs/QUALITATIVE_SCORECARD.md` with sections for each run in order.

### Phase 0.4 — Install Workflow Frameworks

- **What was done:** Installed and configured all 5 frameworks on their respective branches: Superpowers v5.0.2, BMAD Method v6.1.0, Spec Kit v0.3.0, Compound Engineering, Vanilla (minimal CLAUDE.md only). Each branch forked from `v0-scaffold` tag.

### Phase 0.3b — Measurement Automation + Branching

- **Commit:** `c25f44d` — `phase0.3b: measurement automation + branching (tooling + baseline)`
- **Tag:** `v0-scaffold`
- **What was done:** Created `npm run measure` script (ESLint, test coverage, complexity, duplication, bundle size, Lighthouse, Playwright e2e). Set up Playwright with shared e2e test suite (`e2e/ballot-tool.spec.ts`). Created `npm run clean-start`. Tagged as `v0-scaffold`, created all five workflow branches from that tag. Pushed to GitHub.

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
