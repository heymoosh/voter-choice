# Framework Versions

Pinned versions of each workflow framework as installed for this experiment.
Frameworks update frequently — all branches must use the version current at experiment start (March 2026).

> **Installation date:** 2026-03-14

---

## Branch: `workflow/bmad`

**Framework:** BMAD Method (Breakthrough Method for Agile AI-Driven Development)
**Version:** v6.1.0
**Package:** `bmad-method@6.1.0` (npm)
**Install command:** `npx bmad-method@6.1.0 install --tools claude-code --directory . --yes`
**GitHub:** https://github.com/bmad-code-org/BMAD-METHOD
**Release date:** 2026-03-13
**What installed:**
- `_bmad/` — Core agents, workflows, BMM module (34 skills, 10 agents)
- `.claude/skills/` — 44 BMAD skills for Claude Code (bmad-analyst, bmad-architect, bmad-dev, bmad-pm, bmad-qa, bmad-sm, etc.)
- `_bmad-output/` — Output directories for planning and implementation artifacts

---

## Branch: `workflow/spec-kit`

**Framework:** GitHub Spec Kit
**Version:** v0.3.0 (template release)
**CLI source:** `git+https://github.com/github/spec-kit.git` at commit `4a3234496e9f58ce825cc5ca3a3a9c6fd45df222`
**Install command:** `uvx --from git+https://github.com/github/spec-kit.git specify init --here --ai claude --force`
**GitHub:** https://github.com/github/spec-kit
**What installed:**
- `.specify/` — Project directory (templates, scripts, memory, init-options.json)
- `.claude/commands/speckit.*` — 9 slash commands:
  - `/speckit.constitution` — Establish project principles
  - `/speckit.specify` — Create baseline specification
  - `/speckit.clarify` — De-risk ambiguous areas (optional, before plan)
  - `/speckit.plan` — Create implementation plan
  - `/speckit.checklist` — Generate quality checklists (optional, after plan)
  - `/speckit.tasks` — Generate actionable tasks
  - `/speckit.taskstoissues` — Convert tasks to GitHub issues
  - `/speckit.analyze` — Cross-artifact consistency report (optional, after tasks)
  - `/speckit.implement` — Execute implementation

---

## Branch: `workflow/superpowers`

**Framework:** Superpowers (obra/superpowers)
**Version:** v5.0.2
**Source commit:** `363923f` (main branch HEAD at install time)
**Install method:** Cloned repo, copied skills/commands/agents/hooks to `.claude/` as standalone configuration
**GitHub:** https://github.com/obra/superpowers
**Official install (for session use):**
  ```
  /plugin marketplace add obra/superpowers-marketplace
  /plugin install superpowers@superpowers-marketplace
  ```
**What installed (standalone):**
- `.claude/skills/` — 13 skills: brainstorming, dispatching-parallel-agents, executing-plans, finishing-a-development-branch, receiving-code-review, requesting-code-review, subagent-driven-development, systematic-debugging, test-driven-development, using-git-worktrees, using-superpowers, verification-before-completion, writing-plans, writing-skills
- `.claude/commands/` — 3 slash commands: `/brainstorm`, `/write-plan`, `/execute-plan`
- `.claude/agents/code-reviewer.md`
- `.claude/hooks/superpowers-session-start` — Injects `using-superpowers` skill context at session start
- `.claude/settings.json` — SessionStart hook configuration

**Note on standalone vs plugin install:** Superpowers is designed as a Claude Code plugin (installed via `/plugin` commands). For per-branch experiment isolation, files were copied directly to `.claude/` as standalone configuration. The session-start hook was adapted to use the project-local path instead of `CLAUDE_PLUGIN_ROOT`. Behavior should be equivalent.

---

## Branch: `workflow/compound-engineering`

**Framework:** Compound Engineering Plugin (EveryInc)
**Version:** v2.36.4
**Source commit:** `3d0f190` (main branch HEAD at install time)
**Install method:** Cloned repo, copied skills/agents to `.claude/` as standalone configuration
**GitHub:** https://github.com/EveryInc/compound-engineering-plugin
**Official install (for session use):**
  ```
  /plugin marketplace add EveryInc/compound-engineering-plugin
  /plugin install compound-engineering
  ```
**What installed (standalone):**
- `.claude/skills/` — 47 skills including core workflow: `ce-plan`, `ce-work`, `ce-review`, `ce-compound`, `ce-brainstorm` (plus brainstorming, compound-docs, git-worktree, orchestrating-swarms, and many more)
- `.claude/agents/` — 28 agents across 5 categories: review (14), research (5), design (3), docs (1), workflow (4)

**Core workflow loop:** `/ce:plan` → `/ce:work` → `/ce:review` → `/ce:compound` → repeat

**Note on standalone vs plugin install:** Same rationale as Superpowers — files copied to `.claude/` for per-branch isolation.

---

## Branch: `workflow/vanilla`

**Framework:** None (baseline)
**Configuration:** Minimal `CLAUDE.md` only — project description, tech stack, data paths, testing commands, and safety boundaries. No workflow framework, no methodology directives, no structured phases.
**What this tests:** Default Claude Code behavior when given only a well-specified project context and the feature spec (`docs/PROJECT_SPEC.md`).

---

## Notes

- All frameworks were installed 2026-03-14.
- BMAD and Spec Kit install project-local files (in `_bmad/` and `.specify/` respectively).
- Superpowers and Compound Engineering are Claude Code plugins; for experiment isolation they were copied as standalone `.claude/` configurations rather than installed globally.
- If a major framework update ships mid-experiment, the installed version on each branch remains pinned (use the branch's committed files, not `npx latest`).
