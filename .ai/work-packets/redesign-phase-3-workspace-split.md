# Work Packet: redesign-phase-3-workspace-split

Status: ready
Owner: orchestrator
Source: docs/design/2026-redesign/README.md §5 — Phase 3 (Workspace split)
Branch: launch/production

## Intent

Restructure `BallotToolClient` + `ResearchLayout` into the three-pane workspace described in the redesign: **left rail** (progress + locked priorities with edit link + grouped race list), **center chat** (scoped to active race, multi-turn), **right ballot pane** (live-filling printable artifact with print/profile/handoff buttons at the bottom). Race auto-advance after picks. Inline "why" notes captured at pick-time and persisted on each decision.

## Original User Intent

From `docs/design/2026-redesign/README.md` §5 Phase 3: "Restructure `BallotToolClient` + `ResearchLayout` into the three-pane layout. Left rail with progress, priorities (with edit link), and grouped race list. Center: chat panel scoped to active race. Right: live ballot pane filling in as decisions land."

And from the design brief §4 ("Workspace"): "Three panes. Left: where you are in the ballot. Middle: the conversation. Right: the ballot you'll actually print, filling in live. Print, profile and handoff are right where you'd reach for them."

## Intent Interpretation

The current app shows chat with hidden output buttons — users can't see the ballot growing and have to trust the bot. The redesign treats the printable ballot as the persistent artifact: the right pane is always visible, always updating, always the thing that goes home with the voter. The left rail answers "where am I in this ballot" so users never feel lost. The chat is scoped per-race (Phase 1 already cleared message history on race switch) and the chat input area surfaces suggestions only — exports moved to the ballot pane footer.

Picking a candidate triggers an inline "why" prompt (italic on the printable). After commit, the app auto-advances to the next undecided race unless the user manually clicked into a finished one. Active-race highlight (left border in civic-soft) makes the user's place obvious from any pane.

Phase 3 depends on: Phase 1 (per-race system prompt + history-reset contract), Phase 2 (themes locked and available for the rail's priorities block). Phase 4 (text-first cards) renders inside the chat pane. Phase 6 (mid-session amendment) extends the rail's "Edit themes" link. Phase 7 (printable PDF) consumes the ballot-pane state. Phase 9 (out-of-budget) lives off the handoff button in the ballot pane footer.

## Business Logic

Rules:

- Three panes always rendered together once a session is past lock-in. No tab/accordion collapse on desktop. Mobile responsiveness is a follow-up.
- The right ballot pane is **always visible** during the workspace view. Decisions appear in it the moment they're committed.
- The chat is scoped per active race. Switching the active race via the left rail clears chat history (already enforced server-side in Phase 1). UI reflects this immediately.
- Active race indicator: the rail's race row gets `.active`, the ballot pane's matching row gets a civic-soft left border, the chat header shows the race title and position (`Race N of M`).
- After a pick is committed, auto-advance to the next undecided race after a short delay (~600ms). Skip auto-advance if the user manually selected a finished race (review mode).
- The "why" note is prompted inline after pick (or auto-derived for the prototype's quick demo, but production must prompt the user). It persists on the decision and renders italic next to the pick in both the ballot pane and the printable.
- Exports (Print my ballot, Save my profile, Continue in another chatbot) live at the **bottom of the right ballot pane**, never in the chat input row.
- The "Edit themes" link in the rail is Phase 6's entry point; in Phase 3 it routes back to the cold-open view in amend mode (Phase 6 will refine).
- Race list grouped by section: Federal, State, Local / Propositions. Sections come from the race data; the layout adapts to whatever sections exist.

Assumptions:

- The existing `BallotToolClient` already manages workspace state (themes, decisions, active race). The packet restructures the render shape; it does not reinvent state management unless the existing shape blocks the redesign.
- The polling-place card slot is reserved at the bottom of the ballot pane (per design brief §9), but its content can be a placeholder if the polling lookup isn't wired yet. Surfaces at >50% complete; below that, hidden.
- Chat history persistence beyond the active race is **out of scope for v1**.

User-confirmed decisions:

- Per-race chat scope (clears on race switch) is the v1 contract (per design brief §14 multi-turn handling).
- Mobile-responsive 3-pane is a follow-up packet. Desktop-first.
- "Compare both" button in chat header is in scope as a no-op placeholder if not wired by Phase 4; tracking issue documented in notes.

Edge cases:

- Zero decisions, all 14 races pending: ballot pane renders "Deciding now…" for active race, "Not yet decided" for others; print button disabled until at least one decision exists.
- All races decided: auto-advance has nowhere to go; chat stays on the last race; print button is the obvious next action.
- User manually clicks a decided race in the rail: opens it in review mode (no auto-advance after seeing it). Allow re-pick (unpick + re-pick).
- User unpicks the active race: decision removed; ballot pane reverts; auto-advance does NOT trigger (the user is undoing, not progressing).
- Themes empty (somehow reaching workspace without lock): redirect to cold open. Defensive guard.
- Race data missing candidates: render an explicit "no candidates returned by the API" state in the chat with a fallback paste-in option (covered by separate "API miss" work; not Phase 3's job to build the fallback UI but the workspace must degrade gracefully).
- Auto-advance during a "why" note prompt: do not auto-advance until the why-note is committed or explicitly skipped.

Out of scope:

- Mobile-responsive 3-pane (follow-up packet).
- Polling-place card content (lives in this pane but content sourcing is a separate concern; placeholder OK in Phase 3).
- The actual printable PDF rendering (Phase 7).
- Theme amendment UX (Phase 6).
- Text-first candidate card rendering (Phase 4).
- The out-of-budget state for the handoff button (Phase 9).

## Commercial Readiness

Applicability: launch

Lanes in scope:

- product UX (the most-visited screen in the redesign)
- accessibility/responsive (keyboard nav across panes; ARIA roles for rail, chat, ballot)
- API/contracts (chat request now carries `view: workspace`, `activeRaceId`, `activeRaceType`)
- persistence/recovery (decisions persist to localStorage; ballot pane state survives refresh)

User decisions needed:

- none before implementation

Assumptions:

- Existing Tailwind/Next.js component conventions hold; no new framework decisions.

## Operational Reproducibility

Setup:

- `npm install`

Configuration:

- `PROMPT_FLEET_V2` should be on for the new workspace shape; with it off, the legacy layout renders.

Provider setup:

- no new providers

Infrastructure/deployment:

- Vercel manual deploy via `deploy.yml`

Database migrations:

- not applicable

Manual steps:

- After deploy: verify rail/chat/ballot panes render side by side; verify auto-advance works; verify print button enables once decisions exist; verify history clears on race switch.

Verification:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run e2e` — workspace happy path: lock themes → first race → pick → why → auto-advance → second race → pick → … → print button enables
- `bash scripts/ai-verify.sh`

Test quality:

- Component tests for left rail (sections render, active state, edit themes link).
- Component tests for ballot pane (decisions appear, why notes display, exports button state).
- Integration test for auto-advance behavior (with/without manual selection).

Critical logic trigger:

- AI behavior (per-race scope enforced in UI)
- business rule (auto-advance, active-race state, exports placement)

## Scope

Touch:

- `src/components/BallotToolClient.tsx` — top-level shell adopts 3-pane layout; coordinates state.
- `src/components/ResearchLayout.tsx` — restructured into rail / chat / ballot-pane composition (or replaced by a thinner shell).
- `src/components/ChatPanel.tsx` — scoped to active race, surfaces suggestions only, exports removed from input row.
- new `src/components/BallotPane.tsx` — owns the right pane (decisions list, polling-card slot, exports footer).
- new `src/components/WorkspaceRail.tsx` — owns the left rail (progress + priorities + race list + footer links).
- `src/components/ResearchPortfolio.tsx` — printable artifact rendering migrates to Phase 7's component or stays as a placeholder.
- `src/components/HandoffPackage.tsx` — handoff button moves to ballot pane footer; existing handoff body stays for Phase 9.
- `src/components/BallotActions.tsx` — print/profile buttons relocate; legacy action surface deprecated.
- `src/app/PageContent.tsx` — routing updates if needed.
- tests for the new components and the auto-advance integration.

Do not touch:

- `main`
- The chat API route (Phase 1's contract holds)
- `ValuesTagSelector` / `ConcernInterpretation` (Phase 2's territory)
- `getStateData.ts` or state-rule data (Phase 5)
- Candidate card internals beyond what the workspace shell needs (Phase 4)
- Print stylesheet (Phase 7)

## Ownership Audit

Concern: workspace layout, active-race state, decision lifecycle, exports placement
Existing owner: `src/components/BallotToolClient.tsx` (shell), `src/components/ResearchLayout.tsx` (layout), `src/components/ChatPanel.tsx` (chat)
Neighboring owners:

- decision persistence: localStorage helpers (existing)
- candidate cards: `src/components/AlignmentScoreBanner.tsx`, `src/components/FunderBars.tsx` (Phase 4)
- print artifact: `src/components/ResearchPortfolio.tsx` (transitions to Phase 7's component)
- chat scope contract: `src/app/api/chat/route.ts` (Phase 1)

Files/modules/docs inspected:

- `docs/design/2026-redesign/README.md` §5 Phase 3
- `docs/design/2026-redesign/Voter Choice Redesign.html` §4 (workspace)
- `docs/design/2026-redesign/prototype/prototype-views.jsx` (WorkspaceView)
- `docs/design/2026-redesign/prototype/prototype-components.jsx` (BallotPane)
- `src/components/BallotToolClient.tsx`
- `src/components/ResearchLayout.tsx`
- `src/components/ChatPanel.tsx`
- `src/components/ResearchPortfolio.tsx`
- `src/components/HandoffPackage.tsx`
- `src/components/BallotActions.tsx`

Reuse/edit targets:

- `BallotToolClient.tsx` evolves into the 3-pane coordinator; existing decision/state logic preserved.
- `ChatPanel.tsx` trims (suggestions chips only above input; no exports).
- `ResearchPortfolio.tsx` either becomes a deprecated shim or is fully owned by Phase 7.

New owner needed:

- yes — `src/components/BallotPane.tsx` (right pane) and `src/components/WorkspaceRail.tsx` (left rail) are new files. Each owns its concern; neither replicates state that lives in `BallotToolClient`.

Overlap/bloat risks:

- Duplicating decision list rendering between `BallotPane` and `ResearchPortfolio` (Phase 7's printable). Mitigation: `BallotPane` renders the *interactive* draft; `ResearchPortfolio` (or its successor) renders the *print-styled* version. They share the data shape, not the rendering.
- Drifting two sources of truth for "which race is active" — keep it in `BallotToolClient`'s state, pass down via props or context.
- Re-implementing the "why note" prompt in two components — single shared subcomponent.

Recommendation:

- Build the 3-pane shell in `BallotToolClient`. New `BallotPane.tsx` + `WorkspaceRail.tsx`. `ChatPanel.tsx` trims. Avoid prop drilling beyond ~2 levels; use context if needed.

Execution constraints:

- Workers must NOT introduce a fallback layout that hides one of the three panes on desktop (the prototype/design is explicit: rail + chat + ballot).
- Workers must NOT pile exports back into the chat input row.
- Workers must NOT skip the "why" prompt for committed picks — it's part of the printable contract.
- Workers must NOT auto-advance during an open "why" prompt or while the user is manually reviewing a finished race.

## Acceptance Criteria

- The workspace view renders three side-by-side panes: rail (left), chat (center), ballot pane (right).
- The left rail shows: progress block (`N / M` decided, percentage, progress bar), locked priorities list with "Edit themes" link (Phase 6 hooks here), grouped race list (Federal / State / Propositions or whatever sections exist in data), footer links (Restart, Methodology, Get help).
- The right ballot pane shows: header (`Your ballot · N/M · Draft`, address line), grouped race list with each pick + party + why note, polling card slot at the bottom (placeholder OK), exports footer with Print / Save profile / Continue in another chatbot buttons.
- The chat header shows `Race N of M` and the race label; the chat body is scoped to the active race; switching races clears chat history (UI mirrors server contract from Phase 1).
- Picking a candidate triggers an inline "why" prompt; on commit, the decision lands in `BallotPane` immediately and the printable's note text matches verbatim.
- After commit, auto-advance fires (~600ms delay) to the next undecided race. If the user clicked a finished race manually, no auto-advance.
- Unpicking a race removes it from `BallotPane`; auto-advance does not fire.
- Active-race indicator: the rail's race row has an `.active` style; the ballot pane's matching row has a civic-soft left border; the chat header reflects the active race.
- Print button is disabled when zero decisions; enabled with ≥1.
- `npm run lint`, `npm run test`, `npm run build` pass.
- `npm run e2e` workspace happy path passes (lock themes → first race → pick → why → auto-advance → second race → … → print button enables).

## Test Plan

Maps each acceptance criterion to a test file path and the shape of the assertion. Per `docs/ai-coding-practices/guardrails/test-driven-development.md`, tests are written BEFORE implementation and the red phase is verified via `scripts/ai-tdd-red.sh`.

| AC | Test file | Test shape |
|---|---|---|
| Three-pane layout renders side by side | `src/components/BallotToolClient.test.tsx` | render workspace shell; expected: `getByRole('navigation')` (rail), `getByRole('log')` (chat), `getByRole('complementary')` (ballot pane) all in document; observed: match |
| Left rail content: progress, priorities, race list, footer | `src/components/WorkspaceRail.test.tsx` | render rail with `decisions=3, total=14, themes=[...]`; expected: `getByText("3 / 14")`, locked-priorities list shows themes in rank order, race-list sections render (`Federal`/`State`/`Propositions`); observed: match |
| Right ballot pane: header, sectioned picks, polling slot, exports footer | `src/components/BallotPane.test.tsx` | render with fixture decisions; expected: header line `/Your ballot · \d+\/\d+ · Draft/`, picks grouped by section with party + why-note, exports footer buttons present; observed: match |
| Chat header shows `Race N of M`; per-race scope clears history on race switch | `src/components/ChatPanel.test.tsx` | render with `activeRaceIndex=1, totalRaces=14`; expected: header text matches `/Race 2 of 14/`; switch active race; expected: chat message list empty; observed: match |
| Pick triggers "why" prompt; commit lands in `BallotPane` + verbatim why-note | `src/components/BallotToolClient.integration.test.tsx` | simulate pick action; expected: why-prompt visible; commit "I trust her labor record"; expected: `BallotPane` row contains italic "I trust her labor record" verbatim; observed: match |
| Auto-advance ~600ms after commit; skipped on manual review | `src/components/BallotToolClient.integration.test.tsx` | with `vi.useFakeTimers`; commit pick; expected: active race advances after 600ms; for review-mode case, manually select a finished race, commit re-pick; expected: no auto-advance; observed: match |
| Unpick removes from `BallotPane`, no auto-advance | `src/components/BallotToolClient.integration.test.tsx` | commit pick → unpick; expected: pane row gone, active race unchanged; observed: match |
| Active-race indicator propagates to rail + pane + chat | `src/components/BallotToolClient.integration.test.tsx` | set active race; expected: rail row has `.active` class, pane row has civic-soft left-border class, chat header reflects label; observed: match |
| Print button disabled at 0 decisions, enabled at ≥1 | `src/components/BallotPane.test.tsx` | render with 0 decisions; expected: print button `disabled`; render with 1; expected: enabled; observed: match |
| Workspace state persists across refresh (localStorage) | `src/components/BallotToolClient.persistence.test.tsx` | commit picks, simulate reload by re-rendering with persistence hydration; expected: decisions and active race restored; observed: match |
| E2E workspace happy path | `e2e/workspace.spec.ts` | lock themes → first race → pick → why → auto-advance → second race → … → print enables; expected: all `data-testid` checkpoints pass; observed: pass |

### Red-phase ritual for this packet

Build the rail and pane components from their tests outward. Write `WorkspaceRail.test.tsx` and `BallotPane.test.tsx` first — both fail because the components don't exist; run `bash scripts/ai-tdd-red.sh` on each. Then the auto-advance + active-race integration tests against `BallotToolClient.integration.test.tsx`, which fail until the shell coordinates state across panes. Persistence test goes last (asserts localStorage hydration). Implement in the order: extract `WorkspaceRail` → extract `BallotPane` → restructure `BallotToolClient` shell → wire auto-advance → wire persistence. Capture every red-phase output.

## Verification

- `npm run lint` clean.
- `npm run test` passing — including new component tests for rail, ballot pane, why-note flow, auto-advance with/without manual selection.
- `npm run build` successful.
- `npm run e2e` workspace happy path with `PROMPT_FLEET_V2=1`.
- `bash scripts/ai-verify.sh` clean.
- Manual smoke: lock themes, pick through all races, verify ballot pane fills in live, exports button enables only with decisions.

## Evidence Plan

Visual evidence:

- Screenshot of the full 3-pane workspace at 50% decided.
- Screenshot of the active-race highlight propagating across all three panes.
- Screenshot of a committed pick with the why note visible on the right ballot pane.

Behavior evidence:

- E2E test name + output: workspace happy path.
- Test names: auto-advance-after-pick, no-auto-advance-on-manual-review, history-clears-on-race-switch, exports-disabled-without-decisions.

Business logic evidence:

- Rule: "Per-race chat scope" — test: switch race, expected `messages` array empty, observed empty.
- Rule: "Why note on printable" — test: commit pick with why "X", expected ballot pane row contains "X" in italic, observed match.
- Rule: "Auto-advance" — test: commit decision while not in review mode, expected active race switches to next undecided after delay, observed switch.

Persistence evidence:

- Refresh workspace mid-session — decisions and active race state restore from localStorage.

Auth/security evidence:

- not applicable

Commercial readiness evidence:

- Accessibility lane: rail/chat/ballot pane each have appropriate ARIA roles (e.g. `role="navigation"` for rail, `role="log"` for chat, `role="complementary"` for ballot pane). Verified by axe-core or equivalent.

Operational evidence:

- `npm run lint`, `npm run test`, `npm run build`, `npm run e2e` output.

Integration evidence:

- Real chat API call during preview workspace use; system prompt for race deep-dive matches expected shape from Phase 1.

Regression evidence:

- Existing chat e2e tests still pass with `PROMPT_FLEET_V2` on.

Proof standard:

- A reviewer can lock themes, decide a race, see it land in the ballot pane with the why note, get auto-advanced to the next race, decide a few more, and find the print button has enabled with the decisions displayed in the right pane.

Non-proof:

- "The three panes render" alone — must include the auto-advance, why-note, and active-race propagation checks.
- A component test that mounts `BallotPane` without integration to the active-race state.

## Anti-Solutions

- Do not collapse one of the three panes on desktop via tabs/accordion (mobile is out of scope, but desktop must show all three together).
- Do not re-add exports (print/profile/handoff) to the chat input row.
- Do not skip the "why" prompt on candidate picks — it's contractually part of the printable.
- Do not duplicate the decision-list rendering between `BallotPane` and the printable; share the data shape, render two views.
- Do not retain chat history across race switches in the UI — the server contract clears it, the UI must match.
- Do not auto-advance during a "why" prompt or during manual review of a finished race.
- Do not hide the right ballot pane until "later" — it must be visible the moment workspace renders.
- Do not let race data missing candidates blank the screen — render an explicit empty state.

## Notes

- The prototype `WorkspaceView` is the visual reference. The CSS variable names (`--civic`, `--civic-soft`, `--paper`, `--paper-2`, `--ink`, etc.) suggest a palette the production app should approximate or map to Tailwind tokens.
- The "Compare both" button in the chat header is mentioned in the prototype but is a no-op placeholder for Phase 3 — Phase 4 may wire it.
- The polling-place card at the bottom of the ballot pane is a Phase 9-adjacent concern (when polling logistics surface — design brief §9 says >50% complete). A simple placeholder is fine for v1; the trigger logic can land in this packet or a follow-up.
- Watch for state duplication: themes live in `BallotToolClient`, the rail reads them; decisions live in `BallotToolClient`, both ballot pane and printable read them. Don't introduce a separate store unless the prop tree truly demands it.
- The chat input row's "quick chips" (e.g. "Show me her labor votes") should be context-aware — derived from the active race's candidates. Implement minimally; full templating is a polish concern.
