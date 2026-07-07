# Voter Choice — "Representatives-Only" redesign · code delta

This package is **only the front-end code we changed** to build the
representatives-only experience on top of the live app
(https://voter-choice.vercel.app). It is deliberately scoped: everything here
is **additive and self-contained in one new directory**. Nothing in the
existing app needs to be rewritten.

> For Claude Code: **drop the `src/` tree in this package into the repo as-is.**
> The entire delta lands in one new folder, `src/prototype/redesign/`. Do not
> refactor, rename, or restyle anything outside it. The files below import the
> live app's existing modules read-only — those are the boundary, not the work.

---

## What's in here

All 25 files belong in **`src/prototype/redesign/`** (a new sibling of the
existing `src/prototype/VoterChoiceApp.tsx` and `src/prototype/realData.ts`).
Paths are already correct in this package.

### App shell & views
| File | Role |
|---|---|
| `App2.tsx` | App shell / stage router: `home → loading → coldopen → analyzing → workspace → print`. Wires the real data flow. |
| `IntakeView.tsx` | Conversational issue intake (hosts `IssueConversation`). |
| `IssueConversation.tsx` | Extract → converse → lock issue loop (+ `useIssueConversation`). |
| `DelegationWorkspace.tsx` | Delegation workspace + per-tier layout + scorecard pane. |
| `ScorecardPrintView.tsx` | Print sheet for the keep/replace scorecard. |
| `PolisClose.tsx` | Consensus / Polis closing overlay. |

### Cards & seat surfaces
| File | Role |
|---|---|
| `RepCard.tsx` | The rep card: attendance band, researched positions, eligibility note, challengers, money trail, keep/replace verdict, sources. |
| `SeatChat.tsx` | Per-seat chat panel + soft-budget ribbon. |
| `IssueDeltaBanner.tsx` | Post-amendment "your issues changed" banner. |
| `EditIssuesModal.tsx` | Mid-flow edit-issues modal. |

### Handoff / budget / BYOK
| File | Role |
|---|---|
| `HandoffModal.tsx` | Record-first portable-prompt handoff modal. |
| `HandoffActions.tsx` | Copy / download / continue-elsewhere actions. |
| `BudgetModal.tsx` | Community-budget-exhausted modal. |
| `ByokCard.tsx` | Bring-your-own-key card (shared by budget + handoff modals). |

### Logic / data (`.ts`)
| File | Role |
|---|---|
| `delegationData.ts` | Data layer: address → `/api/delegation` → per-seat `/api/race-data`, mapped to the seat view-model. Owns `DelegationSeatVM`, `UserIssue`, `SeatResearch` types. |
| `chatBlocks.ts` | Chat block resolution + budget codes + `stripChatMd`. |
| `chatTransport.ts` | Chat turn transport + BYOK activation. |
| `seatChatPrompt.ts` | Per-seat system-prompt builder (blind-mode safe). |
| `handoffText.ts` | Scorecard → portable-prompt text builder. |
| `polisAdapter.ts` | Loads Polis scopes for the closing overlay. |

### Tests (`.test.ts`)
`chatBlocks.test.ts`, `chatTransport.test.ts`, `handoffText.test.ts`,
`seatChatPrompt.test.ts`, `seatDeltas.test.ts` — run with `vitest`.

---

## The boundary — existing app modules this delta CONSUMES (do not modify)

These are imported read-only. They already exist in the live app; the delta
does not change them. **This is the "don't touch anything else" list.**

- `../VoterChoiceApp` — `I18nProvider`, `NavProvider`, `useNav`, `AppNav`,
  `AppFooter`, `HomeView`, `LoadingView`, `ErrorBanner`, `AboutPage`,
  `MethodologyPage`, `PrivacyPage`, `TipJarPage`, `PollingStatusBar`,
  `CandidateCardHeader`, `AlignmentScoreBanner`, `AllVotesPanel`, `FunderBars`,
  `IssueRow`, `AITimeoutBanner`, `formatDollars`.
- `../realData` — `getChatSessionId`, `fetchCandidateResearch`,
  `streamChatReply`, `buildRaceChatSystemPrompt`, and the `AlignmentScore`,
  `ChatHistoryMsg`, `ChatStreamCallbacks` types.
- `../../lib/getStateData` — `getStateData`, `getFallbackStateData`.
- `../../lib/civic-logistics` — `toBallotLogistics` (+ `BallotLogistics`,
  `LogisticsSource` types).
- `../../lib/anthropic-client-byok` — `getByokKey`, `setByokKey`,
  `removeByokKey`, `hasByokKey`, `streamWithByok`.
- `../../lib/prompts/{theme-extraction, theme-refinement,
  parse-theme-extraction, parse-theme-refinement}`.
- `../../types/election` — `StateElectionData`.

## Two shared-lib helpers this delta EXPECTS (verify before porting)

The delta assumes these exist in `src/lib/`. If the live app doesn't have them
yet, they are the **only additions needed outside the redesign folder** — add
them, don't change anything else:

- `../../lib/canonicalIssues` → `getIssueLevel(issue) → IssueLevel`
  (`'federal' | 'state' | 'both'`). A small additive jurisdiction-lean map on
  the existing canonical-issue list — drives "who controls this" routing.
- `../../lib/eligibility` → `resolveSeatEligibility(...)`, `formatLongDate`,
  `formatShortDate`, `SeatEligibility` type. The per-seat eligibility resolver
  (the evolved party gate), **derived** from `getStateData` rules — no new
  storage.

---

## Port notes (mechanical only)

- Files carry `// @ts-nocheck` for drop-in compilation. Remove it per file and
  add explicit prop types as you tighten each component.
- No prototype CSS is included — these consume the live app's existing styling.
- No mock literals: `delegationData.ts` already calls the real API routes.

That's the whole delta: one new feature folder + (maybe) two small lib helpers.
Everything else in the app is untouched.
