# Run Log

## Next

Begin Phase 1 — Build the ballot tool using the randomized workflow sequence documented in Phase 0.5. Start with Run 1 (Vanilla workflow). Follow the Operator Protocol in `docs/EXPERIMENT_DESIGN.md` for each run.

## Completed

### Phase 0.5 — Generate Randomized Run Order

- **Commit:** TBD
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
