# Work Packet: redesign-phase-6-mid-session-theme-amendment

Status: **shipped** — mid-session theme amendment delivered as part of the 2026 redesign rollout (PRs #34–43 + `8be27ff` `PROMPT_FLEET_V2` flag flip), deployed to production at `688f718`. Rail "Edit themes" entry + chat-detected new-concern catch both land on the same inline editor; silent re-score uses the theme-amendment prompt from the Phase 1 fleet. See `docs/REDESIGN_2026_SHIPPED.md`.
Owner: orchestrator
Source: docs/design/2026-redesign/README.md §5 — Phase 6 (Mid-session theme amendment)
Branch: launch/production

## Intent

Both entry paths — the rail's "Edit themes" link and the chat-detected new-concern catch — land on the same inline amend editor in the chat thread. After lock, AI silently re-scores prior decisions using the theme-amendment prompt from Phase 1; only races with meaningful score shifts surface a REVISIT tag. Everything else gets a quiet HOLD or N/A. No auto-advance after amendment — the user just made a deliberate change and should sit with the deltas before moving on.

## Original User Intent

From `docs/design/2026-redesign/README.md` §5 Phase 6: "Both entry paths (rail 'Edit themes' link + chat-detected new concern) land on the same inline amend editor in the chat thread. After lock, AI silently re-scores prior decisions; only races with meaningful score shifts surface a REVISIT tag. Everything else gets a quiet HOLD."

And from the design brief §12 ("Amending themes mid-session"): "Themes are a living document, not a one-time gate. … Two ways in — a deliberate Edit themes link in the left rail, and a conversational catch when the user mentions something new in chat. Both land on the same compact amend editor, which appears inline in the chat thread."

## Intent Interpretation

The current app treats themes as a one-shot input at the top of the funnel. The redesign treats them as a living document: a user might be three races deep when a tax discussion makes them realize school funding actually matters more than they said. That has to be a first-class action.

Two entry points, one editor:
- **Rail link (deliberate):** user clicks "Edit themes" in the workspace rail. Editor opens inline in the chat thread.
- **Chat catch (conversational):** user types something in chat that the AI infers is a new concern. AI responds with "sounds like a real theme — want to add it?" with a single CTA that opens the same editor inline.

The editor is **inline in the chat thread**, not a modal. The chat is the audit trail of the session — including theme edits — so the user can scroll back later and see exactly when and why a ranking changed.

After lock-in, the AI re-scores every decided race against the new ranking using the theme-amendment prompt from Phase 1. The response is JSON with per-race deltas and verdicts: `REVISIT` (score drops 5+ points AND another candidate scores higher under the new ranking) or `HOLD` (no meaningful change) or `N/A` (proposition with no candidates). Only REVISIT races get visual prominence; HOLD races get a quiet log entry. No re-interrogation; no auto-advance.

Phase 6 depends on: Phase 1 (theme-amendment prompt + JSON parser), Phase 2 (theme infrastructure — the rerank UI, theme data shape), Phase 3 (workspace rail and chat panel), and the re-scoring logic in `src/lib/server/alignment.ts`.

## Business Logic

Rules:

- One amend editor, two entries. Rail link and chat-detected catch both render the same component inline in the chat thread.
- Editor renders inline in the chat thread — not a modal, not a sidebar. The chat scroll preserves the audit trail.
- The chat-detected catch is a soft suggestion: the AI proposes "sounds like a new theme" with a chip CTA; user clicks to open the editor or dismisses to keep just discussing.
- The amendment uses the existing dnd-kit ranker from Phase 2 (or its lifted machinery). User reranks, renames, removes; adds one new theme (the prompt is per-amendment scoped — one new theme per amendment cycle).
- Re-scoring uses the theme-amendment prompt from Phase 1; returns JSON with: `new_theme` (name + quotes), `suggested_rank`, `rescored` array (per decided race: `race_id`, `old_score`, `new_score`, `verdict`).
- `REVISIT` verdict criteria: score drops 5+ points AND another candidate in that race scores higher under the new ranking. Both conditions must hold.
- `HOLD` is the default verdict when REVISIT criteria are not met.
- `N/A` for propositions (no candidates to re-rank against; props use if-yes/if-no logic that isn't theme-weighted).
- No auto-advance after the amendment lock — the user just made a deliberate change; let them sit with the deltas.
- The chat shows a delta summary message after re-scoring: each decided race with old → new scores and the verdict tag. Most races will be quiet HOLDs; REVISIT items get visual prominence (yellow/red tag).
- The new theme retains the verbatim-quote contract from Phase 2 — quotes are pulled from the user's chat message that triggered the catch (or the rail-link entry's draft text).
- Two-way undo: the editor offers a "discard amendment" path that restores the pre-amend theme set without re-scoring.

Assumptions:

- Phase 1's theme-amendment prompt is shipped and returns the documented JSON shape.
- Phase 2's ranker is lifted and reusable.
- Phase 3's chat panel renders messages as a scrollable thread where new inline components can be inserted.
- Alignment scoring (`src/lib/server/alignment.ts`) is deterministic given themes + candidate record; rescoring is a function call, not a database write.

User-confirmed decisions:

- One new theme per amendment cycle. The prompt's JSON returns one `new_theme`. Multiple-new-themes amendments are a follow-up if needed.
- Chat-detected catches are conservative — only trigger when the user's message clearly indicates a new concern (heuristic threshold; AI's prompt instructs caution). False-positive catches are worse than misses.

Edge cases:

- User opens editor via rail link without a triggering message: editor opens with no pre-filled new theme; user types into a free-text field to seed one.
- User dismisses the chat-detected suggestion: no editor opens; conversation continues normally.
- User opens editor, edits ranking only (no new theme), locks in: rescoring runs against the new ranking without a new theme inserted.
- User opens editor, adds new theme, but cancels before saving: no rescoring; theme set unchanged.
- Re-scoring fails (prompt error, API failure, JSON parse): show the editor lock as "save in progress" → fall back to "couldn't re-score, your themes are updated, but verdicts unavailable — use your judgment" path. Themes still update.
- Every decided race shifts ≥5 points (uncommon but possible): show all REVISIT tags; UI must not overwhelm — group the REVISITs and surface the top 2-3 prominently with "+N more to review" affordance.
- User keeps adding themes (multiple amendments in quick succession): each amendment is a separate cycle; the chat audit trail logs each.
- User unpicks a race after amendment but before reviewing the delta: gracefully remove that race's delta entry.

Out of scope:

- Multi-new-theme amendments (one per cycle for v1).
- Theme deletion's effect on past picks beyond the silent re-score (no automatic unpick).
- Auto-prompting the user to amend at race milestones (the chat catch is conversational, not scheduled).
- Surfacing REVISIT tags inside the candidate cards directly (the post-amend message is the primary surface; cards can carry a subtle marker as polish).

## Commercial Readiness

Applicability: launch

Lanes in scope:

- product UX (amend editor inline, re-score message rendering)
- accessibility/responsive (editor opens in-thread, must announce to screen readers as a new region)
- API/contracts (theme-amendment prompt JSON shape from Phase 1)
- AI behavior (chat-detected new-concern catch threshold; conservative)
- business rule (REVISIT criteria)

User decisions needed:

- none before implementation

Assumptions:

- The rescoring is fast enough (~1-3s with Haiku) to render an inline loading state without UX pain.

## Operational Reproducibility

Setup:

- `npm install`

Configuration:

- `PROMPT_FLEET_V2` must be on (Phase 1 + Phase 2 dependencies)

Provider setup:

- no new providers

Infrastructure/deployment:

- Vercel manual deploy via `deploy.yml`

Database migrations:

- not applicable

Manual steps:

- After deploy: lock initial themes, pick a few races, then trigger amend via rail link; observe inline editor + re-score message. Then trigger via chat catch (type a sentence about a new concern); observe AI proposal + editor.

Verification:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run e2e` — amend happy path (both rail and chat catch); re-score message renders with deltas
- `bash scripts/ai-verify.sh`

Test quality:

- REVISIT-logic unit tests: fixtures with known old/new scores and ranking shifts, expected verdict, observed verdict.
- Integration test for rail-link → editor → lock → re-score → delta message.
- Integration test for chat catch (mocked AI suggesting new theme) → user click → same editor.
- Mutation tests for the verdict-decision function.

Critical logic trigger:

- business rule (REVISIT criteria)
- AI behavior (theme-amendment prompt contract)

## Scope

Touch:

- `src/components/ChatPanel.tsx` — render the amend editor inline; render the post-amend delta message.
- `src/components/WorkspaceRail.tsx` (Phase 3) — wire the "Edit themes" link to open the editor in chat.
- `src/components/AlignmentDrilldown.tsx` — surface REVISIT marker on cards (subtle; polish, not load-bearing).
- new `src/components/ThemeAmendEditor.tsx` — inline editor component; reuses Phase 2's ranker primitive.
- new `src/components/AmendDeltaMessage.tsx` — the inline message that shows per-race deltas with REVISIT/HOLD/N/A tags.
- `src/lib/server/alignment.ts` — expose a `rescoreRace(race, themes)` function (or similar) callable for the re-score.
- `src/app/api/chat/route.ts` — route the theme-amendment prompt (Phase 1 prompt fleet); accept amendment payloads.
- `src/lib/prompts/theme-amendment.ts` (Phase 1) — already in place; consumed here.
- tests for the editor, the delta message, the verdict logic, and the chat-catch heuristic.

Do not touch:

- `main`
- `BALLOT_PROMPT.md` / generated modules
- Cold-open UI (Phase 2's territory; reuse the ranker primitive)
- Candidate card internals (Phase 4) beyond the subtle REVISIT marker
- Workspace shell layout (Phase 3)
- State party gates (Phase 5)

## Ownership Audit

Concern: mid-session theme amendment UX, re-score logic, REVISIT/HOLD verdict surface
Existing owner: `src/components/ChatPanel.tsx` (chat), `src/lib/server/alignment.ts` (scoring)
Neighboring owners:

- ranker primitive: lifted in Phase 2 (`ValuesTagSelector` → `ThemeRanker` or equivalent)
- theme data shape: Phase 2
- prompt fleet: Phase 1
- workspace rail: Phase 3

Files/modules/docs inspected:

- `docs/design/2026-redesign/README.md` §5 Phase 6
- `docs/design/2026-redesign/prompts.md` §4 (theme amendment prompt)
- `docs/design/2026-redesign/Voter Choice Redesign.html` §12
- `src/components/ChatPanel.tsx`
- `src/lib/server/alignment.ts`
- `src/components/AlignmentDrilldown.tsx`

Reuse/edit targets:

- Reuse Phase 2's ranker primitive — don't duplicate the dnd-kit machinery.
- Extend `alignment.ts` rather than building a parallel rescoring module.

New owner needed: yes — `ThemeAmendEditor.tsx` and `AmendDeltaMessage.tsx` are new files; clear ownership boundaries.

Overlap/bloat risks:

- Two ranker implementations (one in cold open, one in amend editor) — share the primitive.
- Two rescoring code paths (initial scoring + amendment rescoring) — share `alignment.ts` logic.
- Verdict decision logic embedded in the UI rather than in a pure function — extract for testability.

Recommendation:

- Build the editor and the delta-message components; extract the verdict-decision function to `src/lib/server/alignment.ts` for testability.

Execution constraints:

- Workers must NOT re-introduce a pre-built issue picker as a fallback inside the editor — same non-negotiable as Phase 2.
- Workers must NOT auto-advance after the amendment lock; the user explicitly needs to sit with the deltas.
- Workers must NOT open the amend editor in a modal — inline in chat only.
- Workers must NOT trigger chat catches aggressively (false positives erode trust); the prompt instructs caution; the UI must be a soft proposal, not a hard interrupt.

## Acceptance Criteria

- Rail link "Edit themes" opens the `ThemeAmendEditor` inline in the chat thread.
- A chat message recognizing a new concern (mocked AI response in tests) renders a soft "want to add this as a theme?" proposal with a CTA chip that opens the same editor.
- Editor renders the current locked themes via the lifted ranker (drag, rename, remove); shows the candidate new theme (from chat or free-text in rail-entry case) in an adding slot with verbatim quotes.
- User can save the amendment; the re-score runs via the theme-amendment prompt (Phase 1); response is parsed; a `AmendDeltaMessage` renders inline showing per-race old → new + verdict.
- Verdict logic: score drops 5+ points AND another candidate scores higher → `REVISIT`. Otherwise → `HOLD`. Propositions → `N/A`. Verified by unit tests with multiple fixtures.
- Most races render `HOLD` (silent); only REVISITs get visual prominence (yellow/red tag).
- No auto-advance after the amendment; user remains on the same active race with the delta message above.
- Discard-amendment path restores pre-amend themes and skips re-scoring.
- Chat audit trail preserves the amendment as scrollable history.
- `npm run lint`, `npm run test`, `npm run build` pass.

## Test Plan

Maps each acceptance criterion to a test file path and the shape of the assertion. Per `docs/ai-coding-practices/guardrails/test-driven-development.md`, tests are written BEFORE implementation and the red phase is verified via `scripts/ai-tdd-red.sh`.

| AC | Test file | Test shape |
|---|---|---|
| Rail "Edit themes" link opens `ThemeAmendEditor` inline in chat | `src/components/WorkspaceRail.test.tsx` (extend) + `src/components/ChatPanel.test.tsx` | click rail link; expected: chat thread renders `<ThemeAmendEditor>` (not modal — assert `getByTestId('theme-amend-editor')` is descendant of chat thread, not portal); observed: match |
| Chat catch: mocked AI suggestion renders soft proposal chip + same editor | `src/components/ChatPanel.test.tsx` | mock AI message containing `new_theme_suggestion`; expected: chip with `/want to add this as a theme/i` visible; click; expected: same `ThemeAmendEditor` mounts inline; observed: match |
| Inline amend editor reuses lifted ranker + shows new theme with verbatim quotes | `src/components/ThemeAmendEditor.test.tsx` | render with current themes + candidate new-theme + verbatim quotes; expected: ranker primitive visible, candidate-theme slot shows verbatim quote substring of triggering message; observed: match |
| Save: re-score runs, `AmendDeltaMessage` renders per-race deltas | `src/components/ThemeAmendEditor.integration.test.tsx` | mock theme-amendment chat response with `{new_theme, suggested_rank, rescored:[...]}`; expected: `AmendDeltaMessage` renders one row per decided race with `old → new` numbers and verdict tags; observed: match |
| Verdict logic: REVISIT vs HOLD vs N/A (pure function) | `src/lib/server/alignment.test.ts` (extend) | parameterized fixtures: `(oldScore, newScore, otherCandidateScores, isProposition) → expected verdict`; cases: drop 6 + other candidate higher → REVISIT; drop 6 + no candidate higher → HOLD; drop 3 → HOLD; proposition → N/A; observed: per-case match |
| Most races render HOLD silently; only REVISIT gets prominence | `src/components/AmendDeltaMessage.test.tsx` | render 10 deltas (1 REVISIT, 9 HOLD); expected: REVISIT row has visual-prominence class (e.g., `bg-yellow-`), HOLD rows have muted class; observed: match |
| No auto-advance after amendment lock | `src/components/BallotToolClient.integration.test.tsx` (extend) | with active race set, trigger amendment lock; expected: active race unchanged after the ~600ms threshold previously used by Phase 3 auto-advance; observed: unchanged |
| Discard amendment restores pre-amend themes, skips re-score | `src/components/ThemeAmendEditor.test.tsx` | open editor, edit ranking, click "Discard"; expected: themes reset to pre-edit state, no chat call fired; observed: match |
| Chat audit trail preserves amendment as scrollable history | `src/components/ChatPanel.test.tsx` | lock amendment; expected: chat message log contains an `amendment` entry (scrollable, not in a modal); observed: present |
| Theme-amendment prompt integration (Phase 1 contract) | `src/app/api/chat/route.amendment.test.ts` | input: chat request with `view: "amend"`; expected: outgoing system prompt is the theme-amendment builder output AND request payload includes the amendment shape; observed: match |
| Chat catch is conservative (no false-positive trigger) | `src/lib/chat-catch-heuristic.test.ts` | parameterized neutral messages ("ok", "tell me more"); expected: heuristic returns no-catch; on strong concern messages, returns catch; observed: per-case match |
| E2E amend happy path (both entries) | `e2e/theme-amend.spec.ts` | flow A: pick races → click rail link → add theme → lock → see deltas; flow B: pick races → type concern in chat → click proposal chip → lock → see deltas; expected: per-flow checkpoints pass; observed: pass |
| `npm run lint`, `npm run test`, `npm run build` green | n/a — covered by `bash scripts/ai-verify.sh` | not test-shape applicable; reviewer-enforced |

### Red-phase ritual for this packet

The verdict-decision function is the pure-logic anchor — write the parameterized cases in `src/lib/server/alignment.test.ts` first and red-verify against the missing `decideVerdict()` function. Next write `ThemeAmendEditor.test.tsx` (red-fails because the component doesn't exist), then `AmendDeltaMessage.test.tsx`. The chat-catch heuristic test (`chat-catch-heuristic.test.ts`) red-fails because the heuristic isn't wired. Implement in the order: extract `decideVerdict()` pure function → build `ThemeAmendEditor` reusing Phase 2's ranker primitive → build `AmendDeltaMessage` → wire chat-route amendment view (consumes Phase 1's theme-amendment prompt) → wire rail link + conservative chat-catch heuristic last. Capture every red-phase output.

## Verification

- `npm run lint` clean.
- `npm run test` passing — including verdict-logic unit tests, editor component tests, delta-message rendering tests.
- `npm run build` successful.
- `npm run e2e` — amend happy paths (rail and chat-catch).
- `bash scripts/ai-verify.sh` clean.
- Manual smoke: trigger amend from both entries; verify delta message + REVISIT tag for a race that meets criteria.

## Evidence Plan

Visual evidence:

- Screenshot of the `ThemeAmendEditor` open inline in chat with a new-theme candidate visible.
- Screenshot of the post-amend delta message with at least one REVISIT and several HOLD tags.
- Screenshot of the chat-catch proposal chip.

Behavior evidence:

- E2E test outputs for both entries.
- Test names: rail-link-opens-editor, chat-catch-opens-same-editor, discard-restores-themes, no-auto-advance-after-lock.

Business logic evidence:

- Rule: "REVISIT criteria" — fixtures with score-drops + ranking shifts, expected verdicts; observed match.
- Rule: "N/A for propositions" — fixture with a proposition in the decided set, expected N/A, observed match.
- Rule: "Chat catch is conservative" — fixtures with neutral messages, expected no catch, observed no catch.

Persistence evidence:

- Amendment in localStorage updates theme set; survives refresh.

Auth/security evidence:

- Amendment uses Phase 1's PII strip; the chat catch's source message is sanitized before going to the model.

Commercial readiness evidence:

- Accessibility lane: the inline editor announces to screen readers as a new region; the delta message announces REVISIT counts.

Operational evidence:

- `npm run lint`, `npm run test`, `npm run build`, `npm run e2e` output.

Integration evidence:

- Preview deploy URL + screenshot showing a real amendment cycle.

Regression evidence:

- Initial cold-open theme lock-in (Phase 2) still works; amendment is additive.

Proof standard:

- A reviewer can decide a few races, click "Edit themes" in the rail, add a new theme via the editor, lock in, observe the re-score message with at least one REVISIT and several HOLDs, and confirm the chat preserves the amendment as scrollable history.

Non-proof:

- Editor renders alone — must include the full lock → re-score → delta message cycle.
- Verdict logic unit-tested without end-to-end integration to the chat.

## Anti-Solutions

- Do not open the amend editor in a modal or sidebar — inline in chat only.
- Do not auto-advance after the amendment lock; the user just made a deliberate change.
- Do not re-introduce a pre-built issue picker inside the editor.
- Do not trigger chat catches aggressively — false positives are worse than misses. Conservative threshold; soft proposal UI.
- Do not flood the user with REVISIT tags if many races shift; group + paginate gracefully.
- Do not silently delete prior picks when a theme is removed — re-score is silent, but picks remain unless the user unpicks.
- Do not embed the verdict logic inside JSX — extract to a pure function for testability.
- Do not skip the audit-trail behavior; the chat must preserve the amendment as scrollable history.

## Notes

- The prototype's `AmendThemes` block in `docs/design/2026-redesign/Voter Choice Redesign.html` §12 shows the layout: existing themes compact list + adding slot + delta message with REVISIT/HOLD tags. Mirror this structure.
- The chat-catch heuristic can start conservative — only trigger when the user's message is >50 chars AND contains domain-flagged terms ("jobs", "school funding", "ICE", etc.) AND the AI deems it relevant. Tune over time.
- Watch performance: rescoring N races synchronously could feel slow. Consider streaming partial results or rendering optimistic deltas first.
- The REVISIT tag should link to the affected race (clickable; opens that race for review without auto-advance behavior).
- Consider exposing an "amendment history" affordance in a future packet — a scrollable summary of all amendments + their deltas. Out of scope for v1.
