# Workflow Experiment — Confirmed Decisions & Execution Handoff

**Last updated:** March 13, 2026
**Decision session:** Claude Chat with Muxin
**Executor:** Claude Code (primary), Cowork (planning support only)

---

## Session Quick Start (Read This First)

If you're Claude Code or Cowork opening a new session, start here.

1. This is a controlled experiment comparing 5 AI coding workflow frameworks by building the same project (a ballot research tool) five times.
2. Framework: Next.js. Data: static JSON. Hosting: Vercel. All decisions are closed — do not propose alternatives.
3. Repo: `/Users/Muxin/Documents/GitHub/voter-choice` (local) — push to the GitHub remote regularly.
4. Read `docs/RUN_LOG.md` — the `## Next` line at the bottom tells you exactly what to do next.
5. If RUN_LOG has no entries yet, you're starting Phase 0. Read the full Execution Plan below.
6. After reading RUN_LOG, summarize your understanding in ≤5 bullets and wait for Muxin's confirmation before doing anything.
7. Only read the section of this doc relevant to your current phase. Don't load the whole thing every session.

**If Muxin says "continue work":** Read RUN_LOG, tell her where things stand, and wait for her go-ahead.

---

## What This Is

A controlled experiment to answer: **which AI coding workflow produces code that's easiest to extend and maintain over time?**

Nobody has published a rigorous comparison of workflow scaffolding frameworks using hard code quality metrics. This fills that gap — and produces a real, shippable project at the end.

---

## Known Limitations

This experiment is designed for practical insight, not academic publication. Two structural limitations should be named upfront so they're accounted for in the write-up:

**Learning effects (N=1 operator).** Muxin is the sole operator for all 5 runs. She will inevitably improve at Next.js, React patterns, and the ballot tool's architecture across runs. By run 3–4, she'll be meaningfully faster regardless of workflow quality. Randomizing the run order distributes this effect across workflows rather than concentrating it on the last run, and the pre-run self-assessment (see Qualitative Scorecard below) captures perceived familiarity so it can be discussed. But this confound cannot be fully eliminated with a single operator. The write-up must acknowledge this honestly.

**Spec-format bias.** All five workflows receive the same PROJECT_SPEC.md as input. Spec-first workflows (notably Spec Kit) are designed to consume structured requirements documents; conversational workflows (notably Vanilla Claude Code) may perform better with iterative, chat-driven direction. Providing a uniform spec is the fairest practical choice — well-specced requirements are the professional standard — but it's not a perfectly neutral one. The write-up should note that results may reflect "which workflow best leverages a structured spec" rather than "which workflow is best in all contexts."

---

## Tool Routing: Who Does What

Two tools are used in this project. Each has a clear lane. Stay in yours.

### Claude Code — The Builder

Claude Code does all work that touches the repo: writing specs, writing code, running commands, setting up infrastructure, running tests, generating metrics, drafting the write-up.

- **Owns:** Phase 0 (all sub-phases), Phase 3
- **Supports:** Phases 1–2 (Muxin is the operator, Claude Code assists when asked)
- **"Continue work" flow:** Muxin opens Claude Code in the repo directory and says something like: "Read docs/RUN_LOG.md and the Session Quick Start in docs/EXPERIMENT_DESIGN.md. Continue work." Claude Code reads RUN_LOG, summarizes in ≤5 bullets, waits for confirmation, then executes the next sub-phase.

### Cowork — Planning Support Only

Cowork can help Muxin think through decisions, review specs, discuss strategy, or organize Obsidian files. Cowork does NOT touch the repo.

- **Does:** Reviews specs Muxin shares with it, helps think through experiment design questions, organizes notes in Obsidian
- **Does NOT do:** Write code, run terminal commands, create/edit repo files, set up infrastructure, install packages, run tests, or any task that belongs in Claude Code

### Cowork Guard Rail

If Muxin asks Cowork to do any of the following, Cowork must refuse and redirect to Claude Code:

- Write or edit any file in `/Users/Muxin/Documents/GitHub/voter-choice`
- Run terminal commands (npm, git, etc.)
- Create specs, configs, or scripts
- Install or configure workflow frameworks
- Run measurement scripts or tests
- Any task listed under Phase 0, 1, 2, or 3 in the Execution Plan

Cowork's redirect message should be: _"This is a Claude Code task. Open Claude Code in the voter-choice repo and say 'continue work' — it'll pick up from where RUN_LOG left off."_

---

## Operator Protocol

For each workflow run (Phases 1 and 2), Muxin follows the same initiation sequence:

1. Open Claude Code in the `voter-choice` repo directory.
2. Say: "Read docs/RUN_LOG.md and the Session Quick Start in docs/EXPERIMENT_DESIGN.md. Continue work."
3. Claude Code reads context, summarizes, and waits for confirmation.
4. Follow that workflow's own getting-started documentation for how to structure the build session. Each framework has its own interaction pattern (Spec Kit consumes the spec as a structured input, SuperPowers uses persona prompts, BMAD follows its methodology steps, Compound Engineering follows its framework conventions, Vanilla uses default Claude Code behavior with the spec as reference).
5. Work until the "done" criteria are met. Do not polish or manually clean up code — the output is what the workflow produces.

The operator does not write custom prompts or try to "help" the workflow beyond what its own documentation prescribes. The goal is to test the workflow, not to test Muxin's prompt engineering.

---

## Operating Instructions (All Tools)

### Role Boundaries

- Claude Code owns Phase 0 and Phase 3. It drafts specs, sets up infrastructure, aggregates metrics, and produces the final write-up.
- Phases 1–2 are Muxin's. Claude Code supports (suggesting commands, keeping logs updated, running measurement scripts) but does not make decisions about experiment design, workflow selection, or feature scope.
- This document is the authority. If anything in chat contradicts this doc, this doc wins.

### Context Management Rules

Claude Code and Cowork both have finite context. These rules prevent drift and wasted tokens.

- At the start of any new session or after a long break, re-read `docs/RUN_LOG.md` (for current status) and whatever phase-specific doc is relevant (e.g., `docs/PROJECT_SPEC.md` during Phase 1 setup, `docs/PHASE2_SPEC.md` during Phase 2). Do NOT reload the entire `EXPERIMENT_DESIGN.md` every session — use the Session Quick Start block above for orientation, then go deeper only if needed.
- For each major phase transition (0→1, 1→2, 2→3), treat it as a fresh context: reload core docs rather than assuming past messages are available or accurate.
- Do not rely on prior chat history. Always reload context from the files listed in Project Files below.
- All important information goes into files, not chat. If a decision is made, a deviation occurs, or a clarification arises mid-experiment, update the relevant doc (typically `EXPERIMENT_DESIGN.md` or `RUN_LOG.md`). Do not keep anything "only in the chat."
- If conflicting assumptions are detected between current understanding and the docs, stop, flag the conflict, re-read the relevant files, and reconcile the discrepancy in writing before proceeding.

### Checkpoint and Stop Rules

Claude Code must stop and hand back control at these points:

- **After completing each numbered sub-phase** (0.1, 0.2, 0.3a, 0.3b, etc.): commit your work, update RUN_LOG (including the `## Next` line), and stop. Wait for Muxin to start a new session for the next sub-phase.
- **When approaching context limits:** If a task is taking many turns or quality is degrading, stop mid-task, save progress to files, update RUN_LOG with what's done and what remains, and tell Muxin to continue in a new session.
- **When a decision is needed:** If something not covered in this doc comes up, stop and ask Muxin. Do not guess and do not burn context exploring options.

The goal is many short, focused sessions — not one marathon that degrades. Each session should accomplish one sub-phase or less.

### Pacing Rule (Phases 1 and 2)

Muxin should allow at least one calendar day between workflow runs. Building the same app five times in a row creates fatigue that compounds — attention drops, patience with workflows shortens, and qualitative assessments become less reliable. Spacing runs out also reduces the learning-effect confound (some forgetting between sessions is actually desirable). Weekends and breaks between runs are fine and encouraged.

---

## Project Files & Sources of Truth

These files live in the repo at `/Users/Muxin/Documents/GitHub/voter-choice`. Claude Code must maintain them. They are the single source of truth — not chat history.

| File                            | Purpose                                                                                                                  | Owner                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| `docs/EXPERIMENT_DESIGN.md`     | This handoff doc                                                                                                         | Muxin (Claude Code maintains)       |
| `docs/PROJECT_SPEC.md`          | Feature spec for the ballot tool — Phase 1 (outcomes & behavior, not code)                                               | Claude Code drafts, Muxin approves  |
| `docs/PHASE2_SPEC.md`           | Multilingual extension spec — Phase 2                                                                                    | Claude Code drafts, Muxin approves  |
| `docs/BALLOT_PROMPT.md`         | The full AI ballot research prompt that gets customized per user's zip code. This is the core content the site delivers. | Muxin provides ✅ (already in repo) |
| `docs/RUN_LOG.md`               | Chronological log — see RUN_LOG Format below                                                                             | Claude Code                         |
| `docs/QUALITATIVE_SCORECARD.md` | Structured post-run assessment template — see Qualitative Scorecard below                                                | Muxin fills out after each run      |
| `metrics/<branch>/<phase>.json` | Outputs from `npm run measure` per branch and phase                                                                      | Automated (Claude Code sets up)     |

There is no separate DECISIONS.md file. Decisions belong in `EXPERIMENT_DESIGN.md` where they have context. Don't create another file to keep in sync.

### RUN_LOG Format

Every entry in `docs/RUN_LOG.md` follows this structure:

```
## [Date] — [Sub-phase or task name]

**What was done:** [2-3 sentences]
**Files created/modified:** [list]
**Issues or deviations:** [if any, otherwise "None"]

## Next

[Exactly what to do next, in 1-2 sentences. This is what Claude Code reads first in a new session.]
```

The `## Next` section is always at the bottom of the file and always reflects the current state. Claude Code must update it every time it stops.

---

## Setup Status

The repo and prerequisites are ready. Claude Code can begin Phase 0 immediately.

- [x] GitHub repo created at `/Users/Muxin/Documents/GitHub/voter-choice`
- [x] Ballot prompt copied into `docs/BALLOT_PROMPT.md`
- [x] Initial `docs/RUN_LOG.md` created with first `## Next` entry
- [x] `docs/EXPERIMENT_DESIGN.md` placed in repo

---

## Broader Project Context

The ballot tool is not a throwaway experiment artifact. The winning branch ships as a real product. The broader vision is a voter support website that extends beyond the research prompt into election reminders, registration nudges, and state-level personalization. Full product context is in `/Users/Muxin/Documents/Personal Obsidian/Civic AI/ideas-website.md` — Claude Code does not need to load this file during the experiment, but should be aware that architecture choices (component structure, data model, routing) should leave room for future extension rather than painting the codebase into a corner.

Claude Code does NOT need and should NOT load: campaign plans, social post templates, domain name notes, or legal/donation strategy. Those are Muxin's strategic layer, not the experiment's operational scope.

---

## Confirmed Decisions

### The Operator

- Muxin runs all 5 workflows herself. No volunteers for Phase 1.
- She has zero prior experience with any of the workflow frameworks. This is a feature, not a bug — it controls for familiarity (all equally unfamiliar). Learning curve effects should be noted in qualitative logs and the pre-run self-assessment (see Qualitative Scorecard).
- Randomize the run order to control for fatigue and learning-across-runs effects. Generate the random order before starting.

### The Feature: Ballot Tool Website

A real, shippable civic tool — not a throwaway. Based on Muxin's existing AI ballot research prompt (which reached 200K+ people on Reddit during the 2026 Texas primary).

**What the site does:**

- User enters their zip code
- Site looks up their state's election dates, registration deadlines, early voting info, and local resource URLs from a database
- Site generates a customized version of the AI ballot prompt with the user's local dates, links, and state-specific info pre-filled
- User copies the customized prompt to clipboard and pastes it into any free AI chatbot (Claude, ChatGPT, Gemini, Grok, etc.)
- Responsive design (mobile-first — this went viral on Reddit, people are on phones)

**What the site does NOT do:**

- Host or run an LLM (costs money, makes it hard to keep free)
- Hold any user data (no accounts, no PII, no legal liability)
- The AI conversation happens in the user's own chatbot session, not on this site

**Data model includes:**

- All 50 states + territories
- Election dates (primary, general, runoff where applicable)
- Registration deadlines (online, by mail, in person)
- Early voting dates
- Links to state/county election offices
- Links to sample ballot lookup tools
- State-specific voting rules (ID requirements, phone-at-polls rules, etc.)

**Reference docs:**

- Full prompt text: `docs/BALLOT_PROMPT.md` (in repo)
- Democracy group context: `/Users/Muxin/Documents/Personal Obsidian/Projects/US_Democracy_Group.md` (Nick Garner in this group is a software dev + community organizer — potential collaborator post-experiment)

### Framework: Next.js — Fixed

**Decision:** Next.js. This is settled. Do not propose alternatives.

**Rationale:**

- Closest to what Muxin will use for Maestro (React-based), so learnings transfer
- Largest ecosystem and community support
- The framework AI coding tools have the most training data on — no workflow is disadvantaged by an obscure framework
- Pairs naturally with Vercel for deployment

### Election Data: Static JSON — Fixed

**Decision:** Curated static JSON files. This is settled. Do not propose an API.

**Rationale for the experiment:** Using an external API (Vote.org, Google Civic, Democracy Works) would introduce a confounding variable. Each workflow would handle API keys, auth, rate limiting, and error states differently — those differences would show up in metrics as "workflow quality" when they're really "how well did the workflow handle this particular API's quirks." Static JSON keeps the data layer identical across all 5 runs, which is the point of a controlled experiment.

Claude Code's job in Phase 0 is to define the JSON schema and create stub data for 2-3 states (enough to build and test against). Full 50-state data can be populated later on the winning branch.

The schema should be derived from what the prompt needs injected: state election dates, registration deadlines (online/mail/in-person), early voting dates, links to election offices, sample ballot lookup URLs, and state-specific rules (ID requirements, phone-at-polls rules). The prompt text in `docs/BALLOT_PROMPT.md` is the reference for what fields are needed.

A live API can be swapped in later on the winning branch if needed. The static JSON architecture should make that swap straightforward (single data-access layer, not scattered fetch calls).

### Hosting: Vercel Free Tier — Fixed

**Decision:** Vercel. This is settled. Configure deployment scripts accordingly.

**Rationale:**

- Free tier is sufficient for this project's scale
- Natural pairing with Next.js (same company)
- Zero-config deployments from Git

### Publishing Scope: Small Slack Group — Fixed for Now

**Decision:** Results shared with a small private Slack group initially. Not public.

This means:

- Documentation should be thorough enough for the Slack audience to evaluate (these are practitioners who care about methodology), but doesn't need the polish of a public blog post
- The write-up (Phase 3) should still be structured well enough that it could be published later if Muxin decides to — but that's a future decision, not a current requirement
- No need to anonymize or sanitize anything for public consumption at this stage

---

## Experiment Structure: Two Phases

**Phase 1 — Build**
All five workflow runs start from the same `npx create-next-app` output — the stock Next.js template, identical for all runs. No workflow is allowed to generate its own scaffold.

Each run builds the full ballot tool from the spec.

**Phase 2 — Extend**
Each run receives the same modification request: **Add Spanish language support.** Specifically:

- Language toggle (English ↔ Spanish), with architecture that doesn't make adding a third language painful
- All UI text, labels, instructions, and static content available in both languages
- The customized AI prompt output adapted for the selected language
- The spec describes the desired outcome only — how each workflow approaches implementation (i18n library, static translation files, etc.) is part of what we're observing

**Why Phase 2 matters:** This is the real test. Phase 1 tells you which workflow builds cleanly. Phase 2 tells you which workflow _extends_ cleanly — does it refactor toward i18n, or does it duplicate every file? The delta between Phase 1 and Phase 2 metrics is where the most important signal lives. This maps directly to the experience of maintaining a growing SaaS over time.

---

## The Five Workflow Configurations

All running on Claude Code as the base agent. Workflow is the only independent variable.

| Branch | Workflow             | What It Is                                                   |
| ------ | -------------------- | ------------------------------------------------------------ |
| A      | Spec Kit             | Spec-first: full requirements doc before any code            |
| B      | SuperPowers          | Persona-enhanced in-context workflow                         |
| C      | BMAD                 | BMAD methodology                                             |
| D      | Vanilla              | Claude Code Baseline — default CLAUDE.md rules, no framework |
| E      | Compound Engineering | Community framework by Every (Dan Shipper & Kieran Klaassen) |

---

## Infrastructure Decisions

**Clean environment protocol — fresh install per run.**

- **Purpose:** prevents cross-contamination between runs (packages, configs, caches from Run A don't leak into Run B)
- Before each run: check out the correct branch, delete `node_modules/` and `.next/`, run a fresh `npm install` from the tagged starting point
- Claude Code should script this as a single command (e.g., `npm run clean-start`) so it's repeatable and consistent
- No Docker — git branching + clean installs provide sufficient isolation for a solo-operator experiment without the infrastructure overhead

**Git — strict branching and tagging.**

- Repo: `/Users/Muxin/Documents/GitHub/voter-choice` (local). Push to GitHub remote regularly.
- Initial commit: the CLI-generated template, tagged as `v0-scaffold`
- Five branches: `workflow/spec-kit`, `workflow/superpowers`, `workflow/bmad`, `workflow/vanilla`, `workflow/compound-engineering`
- All branches fork from `v0-scaffold`
- Tag after Phase 1 completion on each branch (e.g., `speckit-phase1-complete`)
- Tag after Phase 2 completion on each branch
- Timestamped commits throughout (for reconstructing wall-clock time)
- Push regularly to remote (cloud backup, not just local)

---

## Metrics (Automated)

Measured after Phase 1 and after Phase 2 on each branch. The delta between phases is as important as the absolute values.

| Metric                 | Tool                                        | What It Reveals                                       |
| ---------------------- | ------------------------------------------- | ----------------------------------------------------- |
| Test coverage (%)      | Vitest with coverage                        | Did the workflow generate tests? Blind spots?         |
| Test pass rate (%)     | Vitest                                      | Did new code break existing code?                     |
| ESLint errors/warnings | ESLint                                      | How clean is the generated code?                      |
| Cyclomatic complexity  | eslint-plugin-complexity                    | Well-structured or monolithic?                        |
| Code duplication (%)   | jscpd                                       | Copy-paste vs. proper abstraction                     |
| Bundle size            | Built-in framework analyzer                 | Dependency bloat?                                     |
| Lighthouse score       | Lighthouse CLI (against local build)        | Performance, accessibility, SEO                       |
| E2E test pass rate     | Playwright                                  | Does the app actually work? Core user flows verified. |
| Time to complete       | Git timestamps + scorecard wall-clock times | Raw speed                                             |

**Lighthouse environment:** Lighthouse runs against a local production build (`next build && next start` on localhost) for consistency across all branches. Do not run against deployed Vercel URLs — network conditions and CDN caching introduce noise.

**Playwright e2e tests:** Claude Code sets up a shared Playwright test suite in Phase 0.3b as part of the scaffold (before branches are created, so all branches inherit the same tests). These tests verify core user flows: entering a zip code produces the correct customized prompt, the copy-to-clipboard function works, responsive layout renders correctly at mobile and desktop breakpoints, and error states display properly for invalid inputs. The e2e tests are _not_ workflow-generated — they're part of the measurement infrastructure, same as ESLint or Vitest. They test whether the built app works, regardless of which workflow built it.

Measurement scripts should be automated — a single command (e.g., `npm run measure`) that runs all of the above and outputs a JSON report per branch. This is critical for consistency and for Muxin not having to manually run 8 tools × 5 branches × 2 phases.

---

## Metrics (Qualitative)

### Qualitative Scorecard

After each workflow run, Muxin fills out the scorecard in `docs/QUALITATIVE_SCORECARD.md`. The scorecard has two parts: structured ratings for cross-run comparison, and open-ended notes for context.

**Pre-run self-assessment** (fill out before starting each run):

| Question                                                  | Rating (1-5) |
| --------------------------------------------------------- | ------------ |
| Current familiarity with Next.js / React                  | \_\_         |
| Current familiarity with this specific workflow framework | \_\_         |
| Current energy / motivation level                         | \_\_         |

**Session start time:** \_\_ (wall clock, e.g. "2:15 PM")

**Post-run structured ratings** (fill out immediately after each run):

| Dimension                                                         | Rating (1-5) | Notes |
| ----------------------------------------------------------------- | ------------ | ----- |
| Ease of getting started (setup, first productive output)          | \_\_         |       |
| Quality of generated code on first pass (before any manual edits) | \_\_         |       |
| How much manual cleanup or correction was needed                  | \_\_         |       |
| How often I had to override or fight the workflow                 | \_\_         |       |
| Confidence I could hand this codebase to another developer        | \_\_         |       |
| Confidence I could keep building on this codebase myself          | \_\_         |       |

Rating scale: 1 = terrible / constantly, 5 = excellent / never

**Session end time:** \_\_ (wall clock, e.g. "5:40 PM")

**Post-run open-ended notes:**

- Biggest friction point(s):
- Moment(s) of delight (where the workflow genuinely helped):
- Anything surprising or unexpected:
- Would I use this workflow again? Why or why not?

Claude Code should generate `docs/QUALITATIVE_SCORECARD.md` in Phase 0.3a as a reusable template with sections for each of the 5 workflow runs (using the randomized order from Phase 0.5).

---

## What "Done" Means

For each phase, a run is "done" when:

- The feature works as described in the spec (manual verification against a checklist)
- The customized prompt output is correct — entering a zip code produces a properly populated prompt with that state's dates, links, and rules filled in
- Tests exist and pass (the workflow is responsible for generating tests — whether it does is part of what we're measuring)
- Playwright e2e tests pass (these are part of the shared measurement infrastructure, not workflow-generated)
- No build errors
- ESLint runs without crashing (errors are measured, not required to be zero)
- Basic accessibility requirements are met: all interactive elements are keyboard-navigable, form inputs have associated labels, images have alt text, color contrast meets WCAG AA, and the site is usable with a screen reader. This is a civic tool for all voters — accessibility is a functional requirement, not a nice-to-have. (Lighthouse accessibility score captures some of this, but manual spot-check is also needed.)

Muxin does NOT manually clean up code after a run. The whole point is measuring what the workflow produces without human polishing.

---

## Execution Plan

### Phase 0: Setup (Claude Code owns)

**Claude Code's responsibilities in Phase 0:** Draft all specs, set up the repo scaffold, branches, workflow configs, and `npm run measure` scripts. Document everything in the project files listed above. Update `RUN_LOG.md` after each sub-phase. Stop after each numbered sub-phase and wait for a new session.

**0.1 — Write the Feature Spec**
A locked document describing exactly what the ballot tool does, page by page, component by component. This is the "prompt" that all five workflow runs receive. It should describe desired outcomes and behavior, NOT implementation details or code. Include:

- Page-by-page user flow
- Data model (what fields, what sources) — derive the JSON schema from `docs/BALLOT_PROMPT.md`
- UI behavior (responsive, error states, edge cases like zip codes spanning multiple districts)
- Acceptance criteria checklist (for determining "done")
- What the customized prompt output should look like
- Accessibility requirements (keyboard navigation, screen reader compatibility, WCAG AA contrast)
- Required `data-testid` attributes on key interactive elements (e.g., zip input, prompt output, copy button, error messages). These are needed so the shared Playwright e2e tests can find elements across all 5 implementations without being coupled to any workflow's DOM structure. List them in the acceptance criteria.

**0.2 — Write the Phase 2 Spec**
The multilingual modification request. Same format: outcomes and behavior, not implementation.

**0.3a — Scaffold the Repo**
The repo already exists at `/Users/Muxin/Documents/GitHub/voter-choice` with `docs/` pre-populated. Claude Code's job:

- Run `npx create-next-app` inside the repo to generate the framework template
- Configure ESLint (including `eslint-plugin-complexity` for cyclomatic complexity measurement) and Prettier
- Add an `.nvmrc` file pinning the Node.js version and an `engines` field in `package.json` — all branches must use the same Node version throughout the experiment
- Create stub JSON data files for 2-3 states (enough to build and test against) based on the schema defined in 0.1
- Generate `docs/QUALITATIVE_SCORECARD.md` as a reusable template
- Commit and push

**0.3b — Measurement Automation + Branching**

- Create `npm run measure` script that runs: ESLint, test coverage, complexity analysis, duplication scan, bundle size analysis, Lighthouse CLI (against local build), Playwright e2e tests. Output: a single JSON report file per run.
- Set up Playwright with a shared e2e test suite that verifies core user flows (zip code entry → correct prompt output, copy-to-clipboard, responsive layout at mobile/desktop breakpoints, error states for invalid input). These tests are measurement infrastructure — they ship on all branches and are not modified by workflows.
- **E2e test selector strategy:** Tests must work across 5 independent implementations with potentially different DOM structures. To make this possible without constraining how workflows generate code, the feature spec (`PROJECT_SPEC.md`) must prescribe a small set of required `data-testid` attributes on key interactive elements (e.g., `data-testid="zip-input"`, `data-testid="prompt-output"`, `data-testid="copy-button"`). These are part of the acceptance criteria, not implementation guidance — they tell the workflow _what the test harness expects to find_, not how to build the component. Claude Code should add these required test IDs to the feature spec in Phase 0.1 (or amend it here if 0.1 is already done).
- Test the measure script on the scaffold to establish baseline measurements. **Expected baseline behavior:** Playwright e2e tests should skip gracefully on the scaffold (the stock Next.js template has no ballot tool UI, so there are no `data-testid` elements to find). The measure script must handle this without crashing — output `null` or `"skipped"` for e2e results in the baseline JSON report. All other metrics (ESLint, bundle size, etc.) should run and produce real values.
- Commit everything and tag as `v0-scaffold`
- Create all five branches from that tag (so all branches inherit the measurement tooling, stub data, and e2e tests)
- Push to GitHub remote

**0.4 — Install Workflow Frameworks**

- On each branch, install and configure the respective workflow framework (Spec Kit, SuperPowers, BMAD, Compound Engineering) per their docs
- Vanilla branch gets only a minimal CLAUDE.md
- Document what was installed/configured on each branch
- Pin and document the exact version installed for each framework (e.g., in RUN_LOG or a `docs/FRAMEWORK_VERSIONS.md`). Frameworks update frequently — if a major update ships mid-experiment, all branches must use the version that was current at experiment start.
- **If a framework can't be installed** (repo gone, breaking incompatibility, requires setup that conflicts with the scaffold): document the blocker in RUN_LOG, stop, and ask Muxin. Do not improvise a workaround — that changes the independent variable.

**0.5 — Generate Randomized Run Order**

- Randomly assign the sequence in which Muxin runs the five workflows
- Document it
- Update the QUALITATIVE_SCORECARD.md template with sections for each run in the randomized order

### Phase 1: Build (Muxin runs, Claude Code supports)

**Claude Code's responsibilities in Phase 1:** Suggest step-by-step commands and edits when asked, keep `RUN_LOG.md` up to date after each run, ensure tests and measure scripts run correctly. Muxin is the operator — Claude Code does not run workflows or make design decisions.

**Pacing:** Allow at least one calendar day between runs.

For each workflow (in randomized order):

1. Fill out the pre-run self-assessment in the qualitative scorecard
2. Run clean environment script (checkout branch, delete `node_modules/` and `.next/`, fresh `npm install`)
3. Muxin runs the session: build the ballot tool from the feature spec using only that workflow (see Operator Protocol above)
4. Commit regularly, push to remote
5. When "done" (per definition above), tag the branch
6. Run `npm run measure`, save the JSON report
7. Fill out the post-run scorecard and open-ended notes immediately (while memory is fresh)

### Phase 2: Extend (Muxin runs, Claude Code supports)

**Claude Code's responsibilities in Phase 2:** Same as Phase 1, plus ensuring the Phase 2 spec is loaded at session start and that measurement captures the Phase 1 → Phase 2 delta.

**Pacing:** Allow at least one calendar day between runs.

For each workflow:

1. Fill out the pre-run self-assessment in the qualitative scorecard
2. Run clean environment script from the Phase 1 tag on that branch
3. Muxin runs the session: add Spanish language support per the Phase 2 spec (see Operator Protocol above)
4. Same commit/push/tag/measure/notes process
5. Fill out the post-run scorecard immediately

### Phase 3: Analysis (Claude Code owns)

**Claude Code's responsibilities in Phase 3:** Aggregate all JSON metric reports into comparison tables, calculate Phase 1 → Phase 2 deltas per metric per workflow, produce visualizations (charts comparing workflows across metrics), integrate Muxin's qualitative scorecard data, and draft the write-up.

- Compile all JSON metric reports into a comparison table
- Calculate Phase 1 → Phase 2 deltas per metric per workflow
- Visualize results (charts comparing workflows across metrics)
- Integrate Muxin's qualitative scorecard (structured ratings + open-ended notes)
- Contextualize results against Known Limitations (learning effects, spec-format bias)
- Draft the write-up

---

## Reference Documents

| Document                     | Location                                                                                                      | Purpose                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Workflow experiment research | `/Users/Muxin/Documents/Personal Obsidian/Projects/Workflow Design as the Real Variable in AI Coding.md`      | Research foundation, benchmarks, prior art                                  |
| Codebase quality metrics     | `/Users/Muxin/Documents/Personal Obsidian/Projects/Codebase Quality Metrics for AI-Assisted Solo Builders.md` | Metric definitions, tool recommendations, scoring rubric                    |
| AI ballot prompt             | `docs/BALLOT_PROMPT.md` (in repo)                                                                             | The full prompt that gets customized per user's zip code                    |
| Website product vision       | `/Users/Muxin/Documents/Personal Obsidian/Civic AI/ideas-website.md`                                          | Broader product roadmap (for architectural awareness, not experiment scope) |
| Democracy group profiles     | Uploaded in chat session                                                                                      | Community context, potential collaborators                                  |

---

## Why This Experiment Matters

From the research doc: "Nobody has published a controlled comparison of workflow scaffolding with hard metrics." This experiment fills that gap. The two-phase design (build + extend) specifically tests what matters for solo builders maintaining a growing codebase — not just "can AI write code" but "can AI write code that survives the next change."

The ballot tool ships as a real product afterward. Best-performing workflow branch becomes the production codebase.
