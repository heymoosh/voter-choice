# Session handoff — 2026-05-29 (cards-first rebuild)

**New session: start here, then read `CARDS_FIRST_BUILD_PLAN.md` (same folder) — it is the full build spec.**

## One-line state
Redesign is **live on prod** (landing + ballot-read animation + honest civic copy + mobile
workspace). The **core "alignment-first" experience (candidate cards as the primary surface) was
never actually wired** — that rebuild is the remaining work, fully specced + user-approved.

## What is DONE and live on prod (`launch/production` @ commit `14aeeff`, verified at voter-choice.vercel.app)
- Redesigned cold-open landing ("Hold Congress to its record", stat cards, walkthrough) — flag `PROMPT_FLEET_V2` is **ON** in Vercel prod and gates the redesign (server-side, `page.tsx`).
- `BallotLookupNeeded`: upload-primary layout + animated read progress (spinner + indeterminate bar) + **honest civic copy** ("We couldn't pull a contest list … its election data is limited").
- Mobile workspace **Pattern B** (rail hidden ≤1023, ballot full-width ≤767, chat-as-fixed-sheet, auto-open on entry, ← back, issues-edit relocated into ballot, races tappable). Desktop 3-pane intact.
- NJ county-link 404 fixed.

## What's NEXT (the rebuild) — see CARDS_FIRST_BUILD_PLAN.md for the step-by-step
Make the workspace **cards-first**: lock issues → ProcessingSteps loader → **candidate cards
directly** (alignment bars + money trail + Pick button + no-data backstop) → chat demoted to a
bottom Q&A box. Approach = cheapest path (make V2 `race-deep-dive` emit `[RACE_PATTERNS]`/
`[ALIGNMENT_SCORES]`, render parsed block as the primary card view, fix the jurisdiction-blind
legacy fallback). **Resume/persistence fix folds in here** (races aren't persisted today, so a
reload → empty workspace; must persist the ballot source).

## Decisions already made (user, 2026-05-29)
- **Community-API spend for scoring: APPROVED.**
- Defaults (user may veto): lazy-score the active race only on open + cache; chat does not
  auto-fire; blind mode default-on; Pick auto-advances; no-data candidates still render a card.
- User greenlit the rebuild; chose to hand to a fresh session (this one's context got long; the
  rebuild is prod-only-verifiable, so a clean session does it better).

## Hard constraints (from CLAUDE.md — do not violate)
- **Repo only.** No force-push / branch deletion / history rewrite. Commit before switching branches; pull before push.
- Work on branch **`feat/design-integration`**. **Deploy = push `feat/design-integration:launch/production`** (live-on-push via GitHub Actions → Vercel). Pushing other branches does NOT deploy.
- **Gate manually before every deploy:** `next.config.ts` has `ignoreBuildErrors` + `ignoreDuringBuilds`, so `next build` skips tsc+lint. Run all four: `npx tsc --noEmit`, `npx eslint`, `npx vitest run`, `npx next build`. Also `npx prettier --write` changed files (lint fails on format).
- **Commit attribution:** `--author="Muxin \"Moosh\" Li <muxin.li.pro@gmail.com>"`, committer stays `Build Agent`, trailer `Co-authored-by: Claude <noreply@anthropic.com>`. Author-email gate rejects `*@experiment`.
- **Faithful port:** prototype at `docs/design/2026-redesign/prototype/` is the source of truth. Never reinterpret — "the answer is always in the JSX." (Cards-first design confirmed in `prototype-views.jsx` WorkspaceView + `prototype-components.jsx` CandidateCard/AlignmentScoreBanner.)

## Verification reality
- **Cards-first is PROD-ONLY verifiable** — local `/api/chat` has no key, so the scoring/cards
  can't be exercised locally (this is why it shipped broken; no local test caught it). Verify on
  prod with real spend, deliberately, watching logs.
- Layout-only changes CAN be verified locally with the throwaway-harness pattern used this session
  (a `src/app/proofXX/page.tsx` mounting the component with fixtures via `next dev`, screenshot at
  375/1280px, then delete the harness + `rm -rf .next`). See git history for `proofws`/`proofvc`.
- Add an e2e test that asserts cards render in the workspace center on race open
  (`e2e/workspace.spec.ts` mock currently never emits `[RACE_PATTERNS]` — the coverage gap).

## Gotchas
- **NEEDS-KEY convention:** redesign is EN-only; components render English literals inline with
  `/* NEEDS-KEY: dotted.key — EN "…" / ES "…" */` comments (do not wire ES yet).
- **dom-accessibility-api** over-reports `<header>` inside `<section>` as a 2nd banner in jsdom →
  query `getByRole("navigation", {name:"Main"})`, don't change faithful components.
- **Tailwind v4** emits `max-[767px]:` as `@media not all and (min-width:767px)` (not `max-width`).
- Terminology: user-facing "issues", internal type `Theme[]`.

## Open flags (not blocking; user's call / follow-ups)
- **81 dead election links** across ~25 states (same class as the fixed NJ 404) — follow-up task already spawned.
- Per-race alignment loader fires on every race open (honest, but user may want one-time).
- Civic empty result = off-season + weak local coverage (Google **Elections** API is alive, our key works; only the **Representatives** API was retired). Keep Google Civic + sample-ballot upload fallback; don't pay for Ballotpedia.

## Investigations behind all this (already synthesized into the plan)
Four read-only agents confirmed: prototype is cards-first; impl is chat-gated with no V2 builder
emitting the card block; the "New Jersey / need your ballot" message is a jurisdiction-blind legacy
fallback (Bexar paste → `county` undefined → `race-deep-dive` builder throws → legacy prompt);
races are never persisted (resume blocker); free Google-Civic-alternative research (Elections API
alive). Details in `CARDS_FIRST_BUILD_PLAN.md`.
