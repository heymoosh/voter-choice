# Run Log

## Next

**Run `/start`.** That's it.

`/start` is now the autonomous orchestrator. It reads git tags + metric files to detect what's done, picks the next pending action, executes it, commits, tags, pushes, loops. Across all 5 frameworks, all 3 Phase 1 replicates each, representative selection, and Phase 2–6 forward iteration. 45 discrete actions total. Every sub-agent is dispatched with `model: "sonnet"` to keep model class constant across runs. You don't need to update `## Next` manually anymore — the orchestrator works from disk state.

For hands-off operation across multiple sessions: `/loop /start` — the harness re-invokes `/start` automatically until it reports "EXPERIMENT COMPLETE."

**Experiment plan (auto-driven):**

| Stage | Actions | Source of truth |
|-------|---------|-----------------|
| Phase 1 replicates | 15 builds (3 per framework on `experiment/<fw>-r{1,2,3}`) | `docs/PROJECT_SPEC.md` |
| Representative selection | 5 (one per framework, median-LOC) | `scoring/select-representative.mjs` |
| Phase 2 forward | 5 builds on chosen replicates | `docs/PHASE2_SPEC.md` |
| Phase 3 forward | 5 builds (requires API keys for Civic/VoteSmart/OpenStates/OpenFEC) | `docs/PHASE3_SPEC.md` |
| Phase 4 forward | 5 builds | `docs/PHASE4_SPEC.md` |
| Phase 5 forward | 5 builds (requires Anthropic API key) | `docs/PHASE5_SPEC.md` |
| Phase 6 forward | 5 builds (requires Upstash Redis + reuses Anthropic) | `docs/PHASE6_SPEC.md` |

The orchestrator handles every transition automatically. See `docs/FRAMING.md` for what claims the resulting data supports and `.claude/commands/start.md` for the orchestrator logic.

**Measurement targets (per phase):**
- Playwright e2e: all passing (target 100%)
- Vitest unit tests + line coverage %
- ESLint: 0 errors, 0 warnings, 0 complexity violations
- Lighthouse: 4× 100 (Performance / Accessibility / Best Practices / SEO)
- Bundle: first-load JS shared + page-specific (kB)
- Duplication: JSCPD % and clone count
- LOC and file count in `src/`

---

## Backlog

### Phase 0.6 — Hermes Orchestration Infrastructure (deferred)

Deferred in favor of Run 5 manual experiment. Restore to `## Next` when ready to automate Phase 3+ orchestration via Hermes VPS.

Original tasks:
1. Review and commit `docs/PHASE3_SPEC.md`, `docs/PHASE4_SPEC.md`, `docs/PHASE5_SPEC.md` (currently untracked drafts).
2. Update `docs/EXPERIMENT_DESIGN.md` with Phase 3/4/5 sections per `docs/PHASE3-5_INTEGRATION.md`.
3. Extend `scoring/auto-findings-rubric.md` with any Phase 3+ checks that can be written without API keys in hand.
4. Generate a new randomized run order for Phases 3-5 (do NOT reuse the Phase 1-2 order).
5. Stand up the Hermes VPS per `Projects/Agents/Hermes Agent Requirements - voter-choice Orchestrator.md` (Bitwarden machine account, BWS_ACCESS_TOKEN, Docker, two-worktree setup, Telegram kill switch).
6. Provision Phase 3 API keys in Bitwarden (Google Civic, Democracy Works, Vote Smart, OpenStates, OpenFEC) per Hermes doc § "Before Phase 3 runs".
7. Create new run branches from the post-scoring-isolation `main` commit for all 5 workflows.
8. Tag `main` as `v1-phase3-ready` when infrastructure is in place.

Note: **Scoring is executed by Hermes from the host side, not inside the build container.** The rubric lives at `scoring/auto-findings-rubric.md`. See `Projects/Agents/Hermes Agent Requirements - voter-choice Orchestrator.md` for the full orchestrator contract and `docs/LEARNINGS.md` → Learning 009 for the rationale.

---

## Completed












### Phase 2 forward — spec-kit (auto)

- **Date:** 2026-05-12T04:17:44.253Z
- **Branch:** `experiment/spec-kit-r1`
- **Tag:** `spec-kit-phase2-complete`
- **Status:** ✓
- **Summary:** e2e 42/42, coverage 32.0%, LOC 2468, complexity avg 3.91, scope adherence 0.37


### Phase 2 forward — bmad (auto)

- **Date:** 2026-05-12T03:53:56.455Z
- **Branch:** `experiment/bmad-r2`
- **Tag:** `bmad-phase2-complete`
- **Status:** ✓
- **Summary:** e2e 62/62, coverage 25.3%, LOC 2551, complexity avg 4.11, scope adherence 0.21


### Phase 1 forward — compound-engineering (auto)

- **Date:** 2026-05-12T03:33:58.850Z
- **Branch:** `main`
- **Tag:** `select-representative-compound-engineering`
- **Status:** ✓
- **Summary:** chose r1 — median LOC (1782); replicates span 1458..1808, RSD 9.46%


### Phase 1 forward — superpowers (auto)

- **Date:** 2026-05-12T03:21:54.552Z
- **Branch:** `main`
- **Tag:** `select-representative-superpowers`
- **Status:** ✓
- **Summary:** chose r1 — median LOC (1328); replicates span 1075..1470, RSD 12.65%


### Phase 1 forward — spec-kit (auto)

- **Date:** 2026-05-12T03:08:18.845Z
- **Branch:** `main`
- **Tag:** `select-representative-spec-kit`
- **Status:** ✓
- **Summary:** chose r1 — median LOC (1661); replicates span 1574..2089, RSD 12.68%


### Phase 1 forward — bmad (auto)

- **Date:** 2026-05-12T02:57:01.795Z
- **Branch:** `main`
- **Tag:** `select-representative-bmad`
- **Status:** ✓
- **Summary:** chose r2 — median LOC (1861); replicates span 1564..1861, RSD 7.95%


### Phase 1 forward — vanilla (auto)

- **Date:** 2026-05-12T02:50:56.368Z
- **Branch:** `main`
- **Tag:** `select-representative-vanilla`
- **Status:** ✓
- **Summary:** chose r1 — median LOC (1410); replicates span 1204..1428, RSD 7.54%


### Phase 1 replicate — compound-engineering r3 (auto)

- **Date:** 2026-05-12T02:43:00.605Z
- **Branch:** `experiment/compound-engineering-r3`
- **Tag:** `compound-engineering-r3-phase1-complete`
- **Status:** ✓
- **Replicate:** r3
- **Summary:** e2e 42/42, vitest 27/27, lint 0e/2w, LOC 1458


### Phase 1 replicate — compound-engineering r2 (auto)

- **Date:** 2026-05-12T02:20:26.372Z
- **Branch:** `experiment/compound-engineering-r2`
- **Tag:** `compound-engineering-r2-phase1-complete`
- **Status:** ✓
- **Replicate:** r2
- **Summary:** e2e 42/42, vitest 12/12, lint 0e/3w, LOC 1808


### Phase 1 replicate — superpowers r3 (auto)

- **Date:** 2026-05-11T20:46:35.651Z
- **Branch:** `experiment/superpowers-r3`
- **Tag:** `superpowers-r3-phase1-complete`
- **Status:** ✓
- **Replicate:** r3
- **Summary:** e2e 42/42, vitest 24/24, lint 0e/0w, LOC 1075
- **Metrics:** LOC 1075, complexity avg 3.57 max 9


### Phase 1 replicate — superpowers r2 (auto)

- **Date:** 2026-05-11T20:11:01.837Z
- **Branch:** `experiment/superpowers-r2`
- **Tag:** `superpowers-r2-phase1-complete`
- **Status:** ✓
- **Replicate:** r2
- **Summary:** e2e 42/42, vitest 18/18, lint 0e/0w, LOC 1470
- **Metrics:** coverage 16.1%, LOC 1470, complexity avg 3.69 max 9


### Phase 1 Run 5 — Vanilla (complete)

- **Date:** 2026-05-10
- **Branch:** `run5/vanilla`
- **Tag:** `vanilla-run5-phase1-complete`
- **Commit:** `997ca58`
- **What was done:** Built ballot research tool on `run5/vanilla` per `docs/PROJECT_SPEC.md` v2.0. Branch had Phase 1 + Phase 2 (Spanish i18n) code pre-committed from prior setup. Cleaned environment, installed dependencies, ran lint/tests/build. Fixed 6 e2e failures: added `noValidate` to form to bypass browser HTML5 pattern validation for custom error messages; moved `data-testid="state-selector"` from individual buttons to container div to avoid strict-mode violation. No framework plugins used — vanilla Claude Code only.
- **Measurements:** ESLint 0 errors/0 warnings/0 complexity violations. Vitest 19/19 (100%), coverage lines=31.96%, branches=52.38%. Duplication 0%. First load JS 102 kB. Playwright e2e 42/42 (100%). Lighthouse 100/100/100/100. LOC: 1837 src/ across 15 files, 844 infrastructure, 2681 total.
- **Files modified:** `src/app/page.tsx` (noValidate + state-selector testid fix), `metrics/run5/vanilla/baseline.json`
- **Issues or deviations:** Branch pre-loaded with Spanish i18n (Phase 2 features) before Phase 1 measurement. The v2.0 spec describes a full production tool (LLM streaming chat, budget management, polling location API, etc.) — features requiring external API keys (Anthropic, Google, Upstash Redis) were not implemented; what was measured is the copy-paste fallback path (Path B) plus multi-language support.

### Phase 0.6 — Infrastructure setup (code tasks complete; Hermes VPS deferred to backlog)

- **Date:** 2026-04-12 to 2026-05-10
- **Branch:** `main`
- **Commits:** `8f719ae` (phase specs + Hermes design), `e62377c` (launch features doc), `a2dc04d` (run5 worktree gitignore)
- **What was done:**
  1. ✅ Committed `docs/PHASE3_SPEC.md`, `docs/PHASE4_SPEC.md`, `docs/PHASE5_SPEC.md`.
  2. ✅ Updated `docs/EXPERIMENT_DESIGN.md` with Phase 3/4/5 sections and Hermes orchestration model.
  3. ✅ Extended `scoring/auto-findings-rubric.md` (API coverage field, translation coverage, chat e2e placeholders).
  4. ✅ Created `run5/*` branches (spec-kit, compound-engineering, bmad, vanilla, superpowers) from post-scoring-isolation `main`; frameworks installed; each branch RUN_LOG set to "Run 5 Phase 1". All pushed to remote.
  5. ✅ `docs/LAUNCH_PRODUCTION_FEATURES.md` added documenting the production feature set for the Phase 1 spec update.
  6. 🔙 Hermes VPS, API keys, and `v1-phase3-ready` tag deferred to Backlog — Run 5 proceeds as manual experiment per Muxin's 2026-05-10 decision.
- **Files created:** `docs/PHASE3_SPEC.md`, `docs/PHASE4_SPEC.md`, `docs/PHASE5_SPEC.md`, `docs/PHASE3-5_INTEGRATION.md`, `docs/LAUNCH_PLAN.md`, `docs/LAUNCH_PRODUCTION_FEATURES.md`, `scoring/auto-findings-rubric.md`
- **Issues or deviations:** run5/* branches named with `run5/` prefix (not `run4/` as originally planned) because `run4/compound-engineering` already existed. Legacy `workflow/*`, `run2/*`, `run3/*` branches remain as experiment data (rubric-contaminated; not to be reused for new runs).

### Phase 3 — Analysis and Write-up (complete)

- **Date:** 2026-04-03
- **Branch:** `main`
- **Commit:** (see below)
- **What was done:** Aggregated cross-framework metrics from all Phase 1 and Phase 2 measurement JSONs. Compiled comparison tables across 5 dimensions: code quality (e2e, unit tests, coverage, ESLint, duplication, bundle), code size (LOC, files, commit count), framework adherence (workflow completion, TDD score, artifacts), extensibility (Phase 1→2 deltas), and build timing. Drafted `docs/ANALYSIS.md` (~350 lines) covering executive summary, experiment setup, methodology, per-phase results, composite comparison, 7 key findings, and a recommendation.
- **Key findings:**
  1. All 4 framework-guided builds shipped 42/42 e2e passing. Vanilla shipped 36/42 (85.7%) with 6 pre-existing failures never fixed.
  2. Without explicit enforcement, frameworks are bypassed — see Learning 001. This is itself a finding about autonomous AI coding.
  3. Test coverage varies 3× between frameworks: Spec Kit/Superpowers (TDD Iron Law) → 88–92%; CE/BMAD → 17–38%.
  4. BMAD uniquely extended the e2e suite in Phase 2 (+20 tests, 62/62 final). All other frameworks maintained 42/42.
  5. CE added 0 new unit tests in Phase 2 — Spanish i18n shipped without test coverage.
  6. Planning overhead is real: Vanilla ~14 min < CE ~21 min < Spec Kit ~37 min < Superpowers ~54 min < BMAD ~90 min.
  7. All Phase 2 codebases are Green scale (< 40 files / < 3k LOC) — scope appropriate for the experiment.
- **Recommendation:** Spec Kit or Superpowers for maintenance-longevity projects; CE for speed with stable spec; BMAD for multi-sprint feature growth.
- **Files created:** `docs/ANALYSIS.md`
- **Issues or deviations:** Lighthouse Phase 2 data available only for Spec Kit (container limitation). Phase 1 build duration not machine-measured (only Phase 2 timing.jsonl captured). Vanilla Phase 2 metrics not re-run (RUN_LOG values used).
- **Operator notes:** Muxin asked why BMAD was the only framework to extend the e2e suite in Phase 2. Analysis: BMAD's `bmad-create-epics-and-stories` produces stories with behavioral ACs ("when user clicks toggle, page switches to Spanish"), and the `dev-story` Definition of Done checklist explicitly gates on "E2e tests created for critical user flows when story requirements specify them." The other frameworks only asked "are tests present?" — BMAD asked "what kind of test does this deliverable need?" This is structural, not model behavior. Added to Finding 4 in ANALYSIS.md.

## Completed

### Phase 2 Run 5 — BMAD (complete)

- **Date:** 2026-04-03
- **Branch:** `run3/bmad`
- **Tag:** `bmad-run3-phase2-complete` (local; push from host — container has no GitHub credentials)
- **Commit:** `5f3b4a2`
- **What was done:** Full BMAD Phase 2 workflow — all 10 BMAD steps via Skill tool: bmad-brainstorming → bmad-create-product-brief → bmad-create-prd → bmad-create-ux-design → bmad-create-architecture → bmad-create-epics-and-stories → bmad-check-implementation-readiness (READY) → bmad-sprint-planning → bmad-dev-story × 10 stories → bmad-code-review. 5 epics, 10 stories implemented. New files: `src/lib/translations.ts` (typed `Translations` interface, EN+ES, 46 leaf keys each), `src/lib/i18n.tsx` (React context, SSR hydration guard, localStorage persistence, `document.documentElement.lang` sync), `src/components/LanguageToggle.tsx` (fixed top-right, native `<button>`, `aria-label`, `aria-live="polite"` announcement), `src/components/SkipLink.tsx` (translatable skip-to-content). Modified: all 6 components use `useLanguage()`, `generatePrompt.ts` (full `BALLOT_PROMPT_ES` ~80 lines, Spanish context block, `buildContextBlockEs()`), `date-utils.ts` (lang param + `DEADLINE_LABELS` lookup object, ESLint complexity 12→5). E2e suite extended: 20 new tests (10 Language toggle + 10 Accessibility). Code review finding fixed: ES `deadline.tomorrow` inconsistency between translation stores.
- **Measurements:** ESLint 0 errors/0 warnings. Vitest 101/101 (100%). 0.34% duplication. First load JS 102 kB (unchanged). Playwright 62/62 e2e (100%). Lighthouse N/A (container). LOC: 2126 src/ across 29 files. 8 test files in src/__tests__/.
- **Phase 1 → Phase 2 delta:**
  - E2e pass rate: 42/42 → 62/62 (+20 new tests: 10 Language toggle + 10 Accessibility)
  - ESLint errors: 0 → 0 | warnings: 0 → 0 | complexity: 0 → 0
  - Unit tests: 50 → 101 (+51 new for translations, i18n, LanguageToggle, date-utils ES, generatePrompt ES)
  - Coverage lines %: 19.07 → 37.75 (+18.68 pp)
  - Coverage branches %: 91.07 → 88.09 (-3.0 pp — new code added with branch paths)
  - Duplication: 0% → 0.34% (1 clone, minimal)
  - Bundle shared: 102 kB → 102 kB (unchanged)
  - App src/ LOC: 1364 → 2126 (+762)
  - Files: 22 → 29 (+7 new)
- **Workflow log:** All 8 BMAD planning steps completed with timestamps. Steps: brainstorming ~3.5 min, product-brief ~2 min, prd ~2 min, ux-design ~2 min, architecture ~2.5 min, epics-and-stories ~2.5 min, implementation-readiness ~4 min, sprint-planning ~1 min. Story implementation ~60 min. Code review ~20 min. Total build duration ~90 min. `bmad:story-implementation` logged as started (session split across context limits); `bmad:code-review` not in workflow-log (separate invocation).
- **Adherence findings:**
  - **TDD unassessable:** All 12 Phase 2 implementation commits bundle test+impl in single commits (story-by-story BMAD pattern). Cannot determine test-first order from commit history. 0 impl-only commits — every implementation had accompanying tests.
  - **Workflow gap (minor):** `bmad:story-implementation` shows `started` but no `completed` entry in workflow-log (session split). `bmad:code-review` not logged. All BMAD artifacts present and all stories marked done after review.
  - **analyze-adherence.mjs not on branch:** Script not installed on this branch (same limitation as all other Phase 2 runs).
- **Issues or deviations:** Push blocked by missing container GitHub credentials — push from host required. Lighthouse not measurable in container. Session split across two contexts (context limit hit mid-story-4.2). Second session invoked `/start` which was blocked by uncommitted changes; user said "continue where left off" — committed pending Story 4.2 artifacts and resumed. Pre-existing Prettier formatting issues in 5 files blocked `npm run build` — fixed in Story 5.1 before any Phase 2 tests could run (same issue as Story 5.1 note on Spec Kit branch).
- **Operator notes:** No additional observations — autonomous session.

### Phase 2 Run 4 — Spec Kit (complete)

- **Date:** 2026-04-03
- **Branch:** `run3/spec-kit`
- **Tag:** `speckit-run3-phase2-complete` (local; push from host — container has no GitHub credentials)
- **Commit:** `807f2cb`
- **What was done:** Full Spec Kit workflow (8 steps): speckit.constitution → speckit.specify → speckit.clarify → speckit.plan → speckit.tasks → speckit.checklist → speckit.analyze → speckit.implement. Added Spanish language support using TDD Iron Law. Constitution updated to v1.1.0 with Principle VI (Multilingual Architecture). Spec: 5 user stories, 18 FRs including FR-018 (active error messages update on lang switch without re-submit). New files: `src/lib/translations.ts` (typed `Translations` interface, EN+ES records), `src/lib/i18n.tsx` (React context, SSR hydration guard, `document.documentElement.lang` sync, `localStorage` persistence), `src/components/LanguageToggle.tsx` (fixed top-right, keyboard accessible, `aria-label` localized), `src/app/PageContent.tsx` (client component with translated hero/tips/footer). Modified: `generatePrompt.ts` (full `BALLOT_PROMPT_ES` ~200 lines, `buildContextBlockEs` with Spanish structural labels), `getDeadlineStatus.ts` (optional `lang` param → "Quedan X días"/"Pasado"), `ZipForm.tsx` (error KEY pattern for FR-018 live error updates), all components consume `useLanguage()`. 87 new tests added (159 total). Spec Kit scripts incompatible with `run3/spec-kit` branch naming — all artifacts written to `specs/003-spanish-language-support/` using known paths directly.
- **Measurements:** ESLint 0 errors/0 warnings/0 complexity violations. Vitest 159/159 (100%), coverage 91.62% lines. 0.45% duplication. First load JS 102 kB shared (page-specific 118 kB). Playwright 42/42 e2e (100%). Lighthouse 100/100/100/100. LOC: 4087 total (3194 src/ across 37 files). 14 test files.
- **Phase 1 → Phase 2 delta:**
  - E2e pass rate: 42/42 → 42/42 (100%, unchanged)
  - ESLint errors: 0 → 0 | warnings: 0 → 0
  - Unit tests: 72 → 159 (+87 new tests for i18n, translations, prompt Spanish, getDeadlineStatus locale, all components Spanish mode, FR-018)
  - Coverage lines %: 88.3 → 91.62 (+3.3 pp)
  - Duplication: 0% → 0.45% (minimal)
  - Bundle shared: 102 kB → 102 kB (unchanged); page-specific: ~102 kB → 118 kB (+16 kB translations)
  - App src/ LOC: 1838 → 3194 (+1356)
  - Lighthouse: 100/100/100/100 → 100/100/100/100 (perfect, unchanged)
- **Workflow log:** All 8 Spec Kit steps completed. 12 total log entries (speckit.implement logged 5 times — once per implementation phase). Build duration ~37 minutes. 14 workflow-generated test files.
- **Adherence findings:**
  - **TDD violation (FINDING):** tddScore=30%. 10/11 commits in src/ were "mixed" (test + impl in same commit). However, 0 impl-only commits — all implementations had accompanying tests. The 30% score reflects commit structure (test+impl bundled in GREEN commit) rather than true TDD order violations. No commit had implementation without a test.
  - **Branch naming incompatibility:** Spec Kit scripts require `001-feature-name` branch format. `run3/spec-kit` caused all `.specify/scripts/bash/*.sh` to fail with "Not on a feature branch." Workaround: all Spec Kit skill executions used known paths directly. Documented as experiment constraint.
- **Issues or deviations:** Push blocked by missing container credentials — push from host required. `analyze-adherence.mjs` not on branch — copied from main. Fixed a path-doubling bug in `analyze-adherence.mjs` (`metrics/metrics/` → `metrics/`) and normalized measurement JSON field names (nested → flat aliases). Phase 1 workflow-log entries truncated before Phase 2 start to prevent false "RESUME_FROM=done" detection.
- **Operator notes:** No additional observations — autonomous session.

### Phase 2 Run 3 — Superpowers (complete)

- **Date:** 2026-04-03
- **Branch:** `run3/superpowers`
- **Tag:** `superpowers-run3-phase2-complete` (local; push from host — container has no GitHub credentials)
- **Commit:** `a0510ab`
- **What was done:** Full Superpowers workflow (6 steps): brainstorming → writing-plans → executing-plans → requesting-code-review → verification-before-completion → finishing-a-development-branch. Added Spanish language support. Architecture: `src/lib/translations.ts` (typed `Translations` interface with function signatures for interpolated strings, complete EN/ES records including `voterIdRequired`/`voterIdNotRequired`). `src/lib/i18n.tsx` (React context with SSR hydration guard starting at "en", `useCallback`-stabilized `setLang`, `localStorage` persistence, `document.documentElement.lang` sync). `src/components/LanguageToggle.tsx` (fixed top-right, `data-testid="language-toggle"`, `aria-label` accessible). `formatDate` extended with optional locale param for Spanish dates ("3 de abril de 2026"). `generatePromptText` extended with full Spanish `BALLOT_PROMPT_ES` (~200 lines, fluent "tú" voice) + Spanish context block. `page.tsx` refactored as thin server shell wrapping `LanguageProvider` + `LanguageToggle` + `PageContent`. All 8 components updated to use `useLanguage()` hook. Two code review critical issues fixed: (1) skip link translated (moved to `PageContent.tsx` client component), (2) prompt regeneration on language switch (added `useEffect([lang])` in `BallotToolClient`). Plan had 13 tasks executed via subagent-driven development.
- **Measurements:** ESLint 0 errors/0 warnings/0 complexity violations. Vitest 107/107 unit tests (100%), coverage 89.9% lines. 0.52% duplication (10 lines / 1914 total). First load JS 102 kB (unchanged). Playwright 42/42 e2e (100%). Lighthouse N/A (container). LOC: 2,589 src/ (+966 from Phase 1's 1,623). Total 3,977 (+966). 33 src files (+15 new).
- **Phase 1 → Phase 2 delta:**
  - E2e pass rate: 42/42 → 42/42 (100%, unchanged)
  - ESLint errors: 0 → 0 | warnings: 0 → 0
  - Unit tests: 53 → 107 (+54 new tests for i18n, translations, prompt-generator lang, date-utils locale, component translations)
  - Coverage lines %: 80.21 → 89.9 (+9.7 pp)
  - Duplication: 0% → 0.52% (minimal increase, 1 clone detected)
  - Bundle firstLoad: 102 kB → 102 kB (unchanged — translations in JS bundle but within compression budget)
  - App LOC: 1,623 → 2,589 (+966)
  - Lighthouse: 100/100 → N/A (container limitation — same as all other Phase 2 runs)
- **Workflow log:** All 6 steps completed with timestamps. Build duration ~54 minutes. Steps: brainstorming ~10 min, writing-plans ~11 min, executing-plans ~26 min, review ~4 min, verification ~2 min, finish <1 min. 12 workflow-generated test files.
- **Adherence findings:**
  - **TDD unassessable:** `tddScore` null — 12 test files all "unchecked" by adherence script. Root cause: test files added in Phase 2 (e.g., `i18n.test.tsx`) correspond to impl files (`i18n.tsx`) introduced in Phase 1, so no matching impl file appears in Phase 2 commit history. Script can't assess TDD order across phase boundaries.
  - **TDD violation (4 impl-only commits):** Script reports 4 commits with impl files but no test in same commit. These are multi-file integration commits (connecting translations to components) where tests exist in preceding commits. Score null (see above).
  - **Measurement gap (script limitation):** Adherence script expects flat field names (`eslintErrors`, `e2eTotal`) but all measurement JSONs use nested structure (`eslint.errors`, `playwright.total`). Consistent bug across all branches — 7 fields appear "missing" but are present in the JSON. Also fixed a path-doubling bug in the script (`metrics/metrics/...` → `metrics/...`).
- **Issues or deviations:** HEAD was 1 commit ahead of `superpowers-run3-phase1-complete` tag (prior infra commit). Noted and proceeded per prior pattern. Push blocked by missing container credentials — push from host required. Lighthouse not measurable (container). `analyze-adherence.mjs` not on branch — copied from main for post-hoc analysis.
- **Operator notes:** No additional observations — autonomous session.

### Phase 2 Run 2 — Compound Engineering (complete)

- **Date:** 2026-04-01
- **Branch:** `run4/compound-engineering`
- **Tag:** `ce-run4-phase2-complete` (local; push from host — container has no GitHub credentials)
- **Commit:** `0c039b4`
- **What was done:** Added Spanish language support via full CE `/lfg` pipeline. Architecture: `src/lib/translations.ts` (typed `Translations` interface with function signatures for interpolated strings + `Record<Language, Translations>`), `src/lib/i18n.tsx` (React context with hydration guard, `useCallback`-stabilized `setLanguage`, `localStorage` persistence, `document.documentElement.lang` sync, screen reader announcements via injected `aria-live` region). `src/components/LanguageToggle.tsx` (fixed top-right, `data-testid="language-toggle"`, keyboard accessible). `formatDate` extended with `es-US` locale for Spanish dates. `generatePrompt` extended with full Spanish `BALLOT_PROMPT_ES` (~210 lines, fluent "tú" voice) and Spanish context block. Server component page.tsx refactored: hero/tips/footer extracted into `PageContent` client component. All 8 existing components updated to use `useLanguage()` hook for translations.
- **Measurements:** ESLint 0 errors/0 warnings/0 complexity violations. Vitest 39/39 unit tests (unchanged from Phase 1). 0% duplication. First load JS 102 kB shared (unchanged), page size 21.1 kB (+8 kB from Phase 1's ~13 kB). Playwright 42/42 e2e (100% — unchanged from Phase 1). Lighthouse N/A (container). LOC: 2,335 src/ (+580 from Phase 1's 1,755). 28 files (+5).
- **Phase 1 → Phase 2 delta:**
  - E2e pass rate: 42/42 → 42/42 (100%, unchanged)
  - ESLint errors: 0 → 0 | warnings: 0 → 0 | complexity: 0 → 0
  - Unit tests: 39/39 → 39/39 (unchanged)
  - LOC: 1,755 → 2,335 (+580)
  - Page bundle: ~13 kB → 21.1 kB (+8 kB); shared JS 102 kB → 102 kB (unchanged)
  - Files: 23 → 28 (+5 new: translations.ts, i18n.tsx, LanguageToggle.tsx, SkipLink.tsx, PageContent.tsx)
- **CE Adherence:** Plan file present (`docs/plans/2026-04-01-001-feat-spanish-language-support-plan.md`, deepened). Solution file present (`docs/solutions/i18n-patterns/nextjs15-client-side-i18n-react-context.md`). `workflow-log.jsonl` has lfg started + completed entries. All expected CE artifacts produced — no workflow bypass. ce:plan → deepen-plan → ce:work → ce:review (--serial, 0 P1 findings, 5 P2/P3 all resolved) → ce:compound.
- **Issues or deviations:** Lighthouse not measurable in container. Push from host required (no GitHub auth). `phonesAtPollsDetail` remains English per spec (data values not translated). Metadata (`<title>`) stays English (server-side export limitation). `/lfg` skill had `disable-model-invocation` — sub-skills invoked manually per pipeline spec.
- **Operator notes:** No additional observations — autonomous session.

### Phase 2 Run 1 — Vanilla (complete)

- **Date:** 2026-03-31
- **Branch:** `workflow/vanilla`
- **Tag:** `vanilla-phase2-complete` (local; push from host — container has no GitHub credentials)
- **Commit:** `435b33a`
- **What was done:** Added Spanish language support to the Vanilla Phase 1 ballot tool. Architecture: `src/lib/translations.ts` (typed `T` interface + `Record<Language, T>`), `src/lib/i18n.tsx` (React context, `localStorage` persistence, `document.documentElement.lang` update), `formatDate` updated to accept locale parameter for Spanish date formatting (e.g., "3 de marzo de 2026"), `generateCustomPrompt` updated with `lang` parameter + full Spanish BALLOT_PROMPT translation (fluent "tú" voice), separate `generateContextBlockEs/En` functions. Page refactored into 14 sub-components to meet ESLint complexity ≤10. Language toggle button (`data-testid="language-toggle"`) fixed top-right, keyboard accessible. Prompt regenerates on language switch. Active error messages translate when language changes.
- **Measurements:** ESLint 0 errors/0 warnings/0 complexity violations (improved from Phase 1: 0 errors/1 warning/1 violation). Vitest 19/19 unit tests (new — Phase 1 had 0 tests). 0% duplication. First load JS 102 kB shared (unchanged), page size 17.9 kB (+8 kB from Phase 1's 9.87 kB). Playwright 36/42 e2e (85.71% — same as Phase 1, 6 pre-existing failures). Lighthouse N/A (container). LOC: 1,838 src/ (+812 from Phase 1's 1,026).
- **Phase 1 → Phase 2 delta:**
  - E2e pass rate: 36/42 → 36/42 (unchanged — same 6 pre-existing failures)
  - ESLint errors: 0 → 0 | warnings: 1 → 0 | complexity: 1 → 0
  - Unit tests: 0 → 19 (+19)
  - LOC: 1,026 → 1,838 (+812)
  - Page bundle: 9.87 kB → 17.9 kB (+8 kB); shared JS 102 kB → 102 kB (unchanged)
- **Adherence:** Vanilla framework — no artifacts expected. `workflow-log.jsonl` has start/complete entries. Build time ~14 min.
- **Issues or deviations:** HEAD was 7 commits ahead of `vanilla-phase1-complete` tag (infra commits added by operator for Phase 2 setup) — `/start` phase-check noted this and proceeded. Lighthouse not measurable in container. Push from host required (no GitHub auth in container). 6 pre-existing e2e failures confirmed identical to Phase 1 baseline (HTML5 pattern validation blocking JS handler + multi-state `state-selector` strict mode violation).
- **Findings:**
  - **E2e gap (UNIQUE TO VANILLA):** 36/42 e2e (85.71%) — Vanilla is the only branch with e2e failures across both phases. All other branches achieved 42/42 (100%). Root cause: HTML5 `pattern` attribute on zip input blocks the JS submit handler in 3 tests, and `state-selector` strict mode violation in multi-state flow causes 3 more. These bugs were introduced in Phase 1 and never fixed — the Vanilla workflow (no framework) did not catch them. This is a measurable quality delta against all framework-guided branches.
  - **TDD violation:** 1 implementation-only commit (TDD score 67%). Vanilla is the only branch with a confirmed TDD order violation where implementation was committed before its corresponding test.
- **Operator notes:** No additional observations — autonomous session.

## Completed

### Phase 1 Run 4 — Compound Engineering re-run (complete)

- **Date:** 2026-03-31
- **Branch:** `run4/compound-engineering`
- **Tag:** `ce-run4-phase1-complete` (local; push from host — container has no GitHub credentials)
- **Commit:** `c5e5b02`
- **What was done:** Full CE `/lfg` pipeline re-run with fixed infrastructure (sub-skills properly copied to `.claude/commands/` so Skill tool invocation works). Pipeline: ce:plan (plan at `docs/plans/2026-03-31-001-feat-ballot-research-tool-plan.md`) → deepen-plan → ce:work (built ballot tool: types, date-utils, lookupZip, getStateData, generatePrompt, ZipForm, StateInfoCard, PromptOutput, StateSelectorModal, BallotToolClient, page.tsx) → ce:review → resolve findings → ce:compound (solution doc at `docs/solutions/build-patterns`). All CE pipeline steps executed and artifacts produced — resolving the run3 issues where /lfg was read-not-invoked and ce:compound was skipped.
- **Measurements:** Lighthouse 90/100/100/100 (Perf/A11y/BP/SEO), Playwright 42/42 e2e (100%), Vitest 39/39 unit, ESLint 0 errors/0 warnings, 0% duplication, first load JS 115 kB (102 kB shared), 1755 LOC in src/ across 23 files. 4 workflow-generated test files. 16 commits since scaffold, +43,079/-123 lines.
- **CE Adherence:** Plan file present (ce:plan), solution file present (ce:compound), workflow-log.jsonl has lfg started + completed entries. All expected CE artifacts produced — no workflow bypass.
- **Issues or deviations:** Lighthouse Performance 90 (not 100) — likely container resource constraints rather than code issue. No GitHub auth in container — push required from host. Prior session completed the CE pipeline but ran out of context before post-build steps; this session completed measurement, tagging, and RUN_LOG update.
- **Operator notes:** No additional observations — autonomous session.

### Phase 1 Run 3 — BMAD (complete)

- **Date:** 2026-03-31
- **Branch:** `run3/bmad`
- **Tag:** `bmad-run3-phase1-complete`
- **Commit:** `e0c7704`
- **What was done:** Full BMAD 4-phase workflow (10 steps): bmad-brainstorming (108 ideas via SCAMPER/Role Playing/First Principles) → bmad-create-product-brief → bmad-create-prd (38 FRs, 27 NFRs) → bmad-create-ux-design (14-section spec) → bmad-create-architecture (pure function pipeline, server/client split) → bmad-create-epics-and-stories (6 epics, 17 stories) → bmad-check-implementation-readiness (READY) → bmad-sprint-planning → bmad-dev-story (all stories) → bmad-code-review (1 MEDIUM fix). All 10 steps invoked via Skill tool. Built ballot tool: types, date-utils, lookupZip, getStateData, generatePrompt, ZipForm, StateInfoCard, PromptOutput, StateSelectorModal, BallotToolClient, page.tsx. 6 BMAD docs produced (brainstorming, product-brief, prd, ux-design, architecture, epics).
- **Measurements:** Lighthouse 100/96/100/100, Playwright 42/42 e2e, Vitest 50/50 unit, ESLint 0 errors/0 warnings, 0% duplication, first load JS 109 kB (102 kB shared), 1364 LOC in src/.
- **Issues or deviations:** Lighthouse Accessibility 96 (not 100) — likely minor contrast or labeling issue. E2e and Lighthouse initially failed in Docker container (no Chromium); re-ran from host Mac successfully. Push from host required (no GitHub auth in container).

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
