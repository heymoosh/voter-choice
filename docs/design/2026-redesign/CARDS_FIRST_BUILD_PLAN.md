# Cards-first workspace rebuild — build & test plan

Status: **approved to build** (user greenlit 2026-05-29, community-API spend accepted).
Owner: design-integration (branch `feat/design-integration` → `launch/production`).
This doc is the durable spec + continuation artifact. If context is lost, resume from here.

## Problem (confirmed by two read-only investigations)

The 2026 redesign is **alignment-first**: after the voter locks ranked issues, the workspace
should show a brief assessment loader, then **candidate cards directly** (per-issue alignment
bars, money trail, a "Pick" button on each card, and a no-data backstop note), with the **chat
demoted to a bottom "ask a follow-up" box** that never drives selections.

The deployed app is **chat-first** instead. Root causes:

1. **Cards are 100% chat-gated.** Candidate cards render *only* when an assistant message
   contains a `[RACE_PATTERNS]` block (`ChatPanel.tsx:1240`, `renderRacePatterns`). There is no
   data-driven card view.
2. **No V2 builder emits that block.** The `[RACE_PATTERNS]`/`[ALIGNMENT_SCORES]` contract lives
   only in the legacy `ballotPromptEn.generated.ts:219-350`. The V2 `race-deep-dive` builder
   returns plain prose ("answer briefly, factually"), so even the happy path shows a text bubble.
   `race-deep-dive.ts:11-13` literally says "the UI shows the candidate card…" — intended, never wired.
3. **Jurisdiction-blind legacy fallback.** Bexar paste → `county` is `undefined`
   (`BallotToolClient.tsx:698 countyForPrompt = civicCounty ?? zipCounty ?? undefined`) →
   `renderBuilder("race-deep-dive")` throws a required-field check (`route.ts:351-363`) →
   `buildSystemPrompt` silently serves the **legacy** prompt (`route.ts:541-554`) → the workspace
   path never injects `contextBlock` (`startSession` suppressed when `workspace` set,
   `ChatPanel.tsx:3519`) → model gets a jurisdiction-less cinematic prompt → hallucinates the
   "New Jersey Democratic Primary / paste your ballot" message.

Races are NOT stale (derived live from the uploaded ballot; never persisted).

## Approach — cheapest path (reuse the scoring engine)

Chosen over a from-scratch data-driven view because it reuses the working `lookup_alignment`
scoring and matches the accepted "draws from the community API" cost model. The user cares about
the *render* (cards, not a transcript), not where the numbers came from.

### Changes

1. **Prompt: make `race-deep-dive` emit the card contract.**
   `src/lib/prompts/race-deep-dive.ts` — append the `[RACE_PATTERNS]` + `[ALIGNMENT_SCORES]`
   emission contract (mirror the legacy contract in `ballotPromptEn.generated.ts:219-350`:
   block format, one entry per candidate from `<candidates>`, alignment scored against the
   ranked issues via `lookup_alignment`, the no-data/unavailable shape). Keep the existing
   factual Q&A instructions for the *follow-up* turns (only the FIRST/auto turn must emit cards).
   Confirm `safety-header.ts` doesn't strip it. Update golden tests.

2. **Route: stop the jurisdiction-blind fallback.**
   `src/app/api/chat/route.ts` —
   (a) make `race-deep-dive` tolerate a missing `county` (default `""`/"unknown" instead of
       throwing in `renderBuilder`, `route.ts:351-363`);
   (b) on any workspace-turn fallback, do NOT serve the legacy cinematic prompt jurisdiction-blind
       — either inject jurisdiction context or return a real error. Add a `console.error` at the
       catch (`route.ts:435-446`) so prod logs show the true cause.

3. **County reaches the prompt.**
   `src/components/BallotToolClient.tsx:698` — `countyForPrompt` should fall back to the ballot
   extraction's own jurisdiction (e.g., Bexar from the uploaded ballot) before `undefined`.

4. **ChatPanel: render cards as the PRIMARY center + loader + demote chat.**
   `src/components/ChatPanel.tsx` —
   - On race open (auto-fire turn), show the **ProcessingSteps loader** ("Reading your issues →
     Pulling each candidate's record → Scoring alignment → Building your comparison") while the
     scoring turn streams.
   - Render the parsed `[RACE_PATTERNS]` as the **primary** card surface (full width of the
     center), NOT as one bubble among a transcript.
   - Demote the raw conversation: the bottom input ("Ask anything about {race}…" + chips) stays;
     user Q&A appends *below* the cards. No auto-fire intro prose.
   - No-data backstop falls out of this (the per-field "data not available" notes in
     `RacePatterns.tsx:820-908` / `AlignmentScoreBanner.tsx:400-414` become reachable).

5. **Tests.**
   - `e2e/workspace.spec.ts` — the chat mock currently streams only theme JSON; make it emit a
     `[RACE_PATTERNS]` block and assert real candidate cards render in the center on race open
     (this gap is why the regression shipped undetected).
   - Unit: `race-deep-dive` golden includes the card contract; a no-data candidate still renders a
     card with the backstop note.

### Defaults (user may veto)
- Lazy-score the **active race only** on open + cache (cost ∝ races viewed).
- Chat does not auto-fire; user-initiated only.
- Blind mode default-on; Pick auto-advances to next undecided race.

## Verification (prod-only — cannot be done locally; `/api/chat` needs a key)
1. Gate: tsc + lint + full vitest + build.
2. Prod, real flow: lock issues → **loader** → **candidate cards** in the center (alignment bars
   + money trail + Pick), chat is a bottom box. Pick a card → it commits + advances.
3. No-data race (e.g., county judges): cards still render with the "no record — judge on
   statements + donors" note. NO "I need your ballot first / New Jersey" message.
4. Console clean; community-API spend proportional (one scoring pass per race opened).

## Risks
- **Prompt reliability:** the AI must emit a well-formed `[RACE_PATTERNS]` block every race. If
  flaky, harden toward the full data-driven view (render cards from `activeRace.candidates`,
  alignment filled in async). Plan B documented, not built.
- **Prod-only verification** on community budget — verify deliberately, watch logs.
- **Context degradation:** if this session degrades, continue from this doc in a fresh session.

## Resume restore bug — DEEPER than first thought (fold into the rebuild, NOT a quick win)
Two layers:
1. **Zip-guard always deletes.** `currentZip` is always `""` at mount (`BallotToolClient.tsx:2356`,
   never persisted) → the hydration zip-guard (`:753 persistedZip !== zipCode`) ALWAYS deletes the
   saved session; the same-zip restore branch is dead code (refresh-restore is broken too). The
   landing Resume button only `setResearch(true)` with no restore behind it.
2. **Races are never persisted (the blocker).** `races` is derived live from `initialPollingData` /
   `extractedBallot` / `userSampleBallotText` (`:616-642`) — NONE persisted. `WORKSPACE_STATE_KEY`
   holds only `decisions/activeRaceId/lockedThemes/raceCount/zipCode`. So even after fixing the
   zip-guard and applying themes/decisions, a reload yields an EMPTY workspace (decisions point at
   raceIds that no longer exist). **Real resume requires persisting the ballot source** (civic
   contests / extracted ballot / pasted text + state) so races can be re-derived.

Because this touches the same workspace data/persistence flow the cards-first rebuild restructures,
do it **as part of** the rebuild, not as a separate "bounded" fix. Fix shape once ballot source is
persisted: keep-but-don't-apply on mount; Resume = explicit trigger (a `requestResume()` nonce on
the ResearchMode context — NOT `isResearch`, which "Pull my ballot" also flips) → restore
themes/decisions/activeRaceId/zip + re-derive races; cross-address discard on the address-submit
path. Verify via localStorage pre-seed harness (pre-seed a full session incl. ballot source → click
Resume → assert workspace restores with races+themes+decisions; different address → still fresh).
