# Run Log

## Next

Fix workflow.md invocation on remaining plugins (Learning 006). Create run3/ branches for Superpowers and BMAD with workflow.md files rewritten to use Skill tool invocation instead of "read and follow." Superpowers: copy key skills to commands/, then Skill-invoke. BMAD: copy `bmad-quick-dev-new-preview` or individual phase skills to commands/, then Skill-invoke. After both branches are ready, resume with Phase 1 Run 4: Superpowers.

## Completed

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
