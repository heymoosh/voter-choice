# 2026 Redesign — Shipped

**Status as of 2026-05-26.** All 9 phases of the 2026 redesign are live in production at <https://voter-choice.vercel.app/>, deployed off `launch/production` at `688f718`. This file is the single page that explains what landed, what's left, and where to look next.

## What the redesign is

Voter Choice was reframed from "AI chatbot with side outputs" to **a wizard that fills in a printable ballot.** The five concrete shifts:

- **Free-form cold open.** No pre-built issue picker. The voter describes what they care about in their own words; the AI mirrors back inferred themes with verbatim quotes; the voter reorders, renames, or removes before locking in.
- **Three-pane workspace.** Left rail (progress + priorities + grouped race list) · center chat (scoped per active race) · right ballot pane (live-filling printable artifact). Print, save profile, and handoff buttons live at the bottom of the ballot pane.
- **Civic mood as production default.** IBM Plex Serif + daylight palette, AppNav, prototype landing. The legacy chrome path remains only behind the CI flag-off route.
- **Prompt fleet replaces the 12K mega-prompt.** Six task-specific prompts (theme extraction, race deep-dive, proposition explainer, theme amendment, handoff generation, plus a shared safety header), each under ~300 tokens. The old `BALLOT_PROMPT.md` is retained only as the out-of-budget handoff target the voter can paste into any other chatbot.
- **State party gates as data.** Texas runoff overlay, PA closed primary, CA top-two — each is a row in a rules table keyed by `[state, electionType]`. Gate appears between address entry and cold open only when state rules require it.

The canonical design brief — full annotations, screen-by-screen mocks, and prototype — lives at `docs/design/2026-redesign/`. Read that folder's `README.md` first, then open `Voter Choice Redesign.html` in a browser.

## The ten PRs

All merged into `launch/production`, Vercel Production target via `.github/workflows/deploy.yml`.

| PR | Title | Notes |
|---|---|---|
| [#34](https://github.com/voter-choice/voter-choice/pull/34) | `fix(funnel): cold-open reflects pasted ballot as confirmed (Fix O)` | Cold-open no longer asks for ballot info the voter just pasted in. |
| [#35](https://github.com/voter-choice/voter-choice/pull/35) | `fix(parser): expand "Vote for N" comma-separated races into N race rows` | Multi-seat races (e.g. school board "Vote for 3") render correctly. |
| [#36](https://github.com/voter-choice/voter-choice/pull/36) | `fix(parser): tolerate preamble + object-wrap in Haiku theme output` | Theme-extraction parser is robust to LLM output quirks. |
| [#37](https://github.com/voter-choice/voter-choice/pull/37) | `feat(cold-open): implement "Use a starter profile" chip` | Voters can load a saved `.txt` profile to seed the cold-open inference. |
| [#38](https://github.com/voter-choice/voter-choice/pull/38) | `feat(redesign): Civic mood as production default` | IBM Plex Serif + daylight palette flipped on for production. |
| [#39](https://github.com/voter-choice/voter-choice/pull/39) | `feat(redesign): strip legacy shell — prototype landing + AppNav + cold-open chrome` | Production routes now render the prototype-derived shell. |
| [#40](https://github.com/voter-choice/voter-choice/pull/40) | `feat(redesign): polish — de-mono CTAs, cold-open card, breadcrumb` | First polish pass on the new chrome. |
| [#41](https://github.com/voter-choice/voter-choice/pull/41) | `fix(chat): defensive fallback when v2 raceContext is malformed` | Chat doesn't crash when the v2 race-context payload is missing fields. |
| [#42](https://github.com/voter-choice/voter-choice/pull/42) | `fix(chat): wire candidates into Race + correctly invoke race-deep-dive builder` | The race-deep-dive prompt actually runs against the right candidate list. |
| [#43](https://github.com/voter-choice/voter-choice/pull/43) | `feat(redesign): close all remaining P1+P2 polish gaps for design parity` | Final round of parity work against the canonical design brief. |

Plus empty deploy commit `8be27ff` flipping `PROMPT_FLEET_V2=true` on Vercel Production env.

## Phase → PR mapping

| Phase | Status | Landed via |
|---|---|---|
| Phase 1 — Prompt refactor | Shipped | PRs #41, #42, #36 + `8be27ff` flag flip |
| Phase 2 — Free-form cold open | Shipped | PRs #34, #35, #37, #39, #40, #43 |
| Phase 3 — Workspace split | Shipped | PRs #39, #40, #43 (+ #38 for Civic mood) |
| Phase 4 — Text-first candidate cards | Shipped | Rollout PRs #34–43 |
| Phase 5 — State party gates | Shipped | Rollout PRs #34–43 |
| Phase 6 — Mid-session theme amendment | Shipped | Rollout PRs #34–43 |
| Phase 7 — Printable PDF | Shipped | Rollout PRs #34–43 |
| Phase 8 — Polis view (UI) | Shipped (UI); 8b deferred | Rollout PRs #34–43 |
| Phase 9 — Out-of-budget handoff | Shipped | Rollout PRs #34–43 |

Work packets in `.ai/work-packets/redesign-phase-{1..9}-*.md` carry the same status header.

## Deferred items

These are real, intentional follow-ups — not bugs.

- **Spanish (and wider non-English) translation of redesign UI strings.** The vi/zh/ar/es i18n infrastructure already shipped (`extended-language-support` feature). The new cold-open + workspace chrome introduced by PRs #34–43 has not yet been translated, so ES voters currently see English for those surfaces. The ES `BALLOT_PROMPT_ES.md` is still the canonical Spanish out-of-budget handoff target.
- **Polis Phase 8b data pipeline.** The `PolisOverlay` UI has been rebuilt and ships an honest empty state until the SQL aggregate pipeline (priority-overlap bars + bridge statements) is built and the ~150 in-county finished-sessions threshold is met for the named-cluster compass.
- **`[VALUES_TAG_REQUEST]` retirement.** Blocked by the ES translation work above — the existing values-tag fallback path is what serves any locale that has not yet been migrated to the prompt fleet's theme-extraction flow.
- **P2/P3 polish follow-ups** noted during the parity passes (PRs #40, #43). Tracked in `.ai/work-packets/launch-publish-readiness.md` and `docs/operations/post-launch-backlog.md`.

## Where to look next

- Canonical design brief, prototype, and prompts: `docs/design/2026-redesign/`.
- Per-phase work packets (now with shipped-status headers): `.ai/work-packets/redesign-phase-1-prompt-refactor.md` through `redesign-phase-9-out-of-budget-handoff.md`.
- Old all-in-one ballot prompts (retained as out-of-budget handoff targets only): `docs/BALLOT_PROMPT.md`, `docs/BALLOT_PROMPT_ES.md`.
- Pre-redesign launch and gap-analysis docs (historical): `docs/LAUNCH_PLAN.md`, `docs/V2_PLAN.md`.
