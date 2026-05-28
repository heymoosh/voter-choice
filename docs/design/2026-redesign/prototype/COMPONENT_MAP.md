# Component map — prototype → repo

This file is the **portability contract** for the prototype. Each prototype component lists the file it maps to in `src/` on the `launch/production` branch, the prop shape it accepts (using the repo's existing TypeScript interfaces), and any design-delta — fields or behaviors the prototype adds that the repo doesn't have yet.

Read this before porting any prototype design back into the codebase.

> **✅ Verified against `launch/production` @ commit `db3b63d` (May 28 2026).**
> The repo is already mid-adoption of this prototype. Key realities that
> override naïve "port it" instincts (full detail in PORT_PROMPT.md's REPO
> REALITY CHECK):
> - **Styling = Tailwind v4 token utilities** (`bg-civic`, `text-ink-2`,
>   `border-rule`, `font-serif`). The prototype tokens are already in
>   `src/app/globals.css`. Do NOT copy `prototype.css`; express it in utilities.
> - **`ui/` primitives exist** (`Button`, `Badge`, `Card`, `Notice`,
>   `TextInput`) + `cards/CardErrorBoundary`. Reuse them.
> - **i18n = `useLanguage()` + `translations[lang]` dot-access** (no `t()`).
> - **Already real (reuse, don't rebuild):** `formatCurrencyShort`,
>   `downloadProfileAsText`, `openPrintableBallot`, BYOK helpers, `getStateData`,
>   `getDeadlineStatus`, `LanguageToggle`, `BallotLookupNeeded`, privacy page.
> - **Backend exists** (`api/{chat,civic,alignment,extract-ballot,donors,…}`).
>   "Wiring up" = point redesigned UI at working routes + strip demo triggers.

---

## 1 · Portability strategy

Three principles, in priority order:

1. **Match the repo's TypeScript interfaces.** The prototype data in `prototype-data.jsx` is shaped to match `AlignmentScore`, `DonorBucketSlice`, `ContributingVote`, `RacePatternsCandidate`, and `ConcernInterpretationEntry` from `src/lib/structured-blocks.ts`, plus `Race` from `src/lib/raceDeriver.ts`. Porting becomes "swap the mock literal for a fetch + parse step."
2. **Name components what the repo names them.** When you see `AlignmentScoreBanner`, `AlignmentDrilldown`, `FunderBars`, `BallotPane`, or `CandidateCardHeader` in the prototype, that's the file you're editing in the repo. The composition (which component renders which) matches too.
3. **Mark design deltas explicitly.** Any field this prototype invents — `narrative`, `fundingMix`, `isIssuePAC`/`alignsWith` on `DonorBucketSlice` — is flagged inline with `[Δ]` in the data file and the consuming component. These are the schema additions the repo's TS interfaces will need before this design ships.

---

## 2 · Component map

| Prototype file | Component | Repo target | Notes |
|---|---|---|---|
| `prototype-components.jsx` | `AppNav` | `src/components/Navigation.tsx` | No behavior delta. |
| `prototype-components.jsx` | `IssueRow` | `src/components/ConcernInterpretation.tsx` (one row) | Adds reorder / rename / remove affordances. Repo today is read-only — those are Phase 6 amendment behaviors. |
| `prototype-components.jsx` | `CandidateCard` | _(new — composition wrapper)_ | Repo doesn't have a `CandidateCard.tsx` today; the equivalent grouping lives inside `ChatPanel.tsx` where structured blocks are rendered inline. The new file lifts that into a reusable component. Recommended: create `src/components/CandidateCard.tsx`. |
| `prototype-components.jsx` | `CandidateCardHeader` | _(new — factored out of `RacePatterns.tsx`)_ | Photo + name + party pip + tenure. Worth factoring out during the port. |
| `prototype-components.jsx` | `AlignmentScoreBanner` | `src/components/AlignmentScoreBanner.tsx` | Repo today renders kept/total as text. **Design delta:** chunky bar + big serif % + expandable rows + sample-size caption. |
| `prototype-components.jsx` | `AlignmentDrilldown` | `src/components/AlignmentDrilldown.tsx` | Repo today shows bill + voteCast + date + source chip. **Design delta:** curated `narrative` paragraph per vote + issue-PAC callout. |
| `prototype-components.jsx` | `ContributingVoteCard` | _(private to `AlignmentDrilldown`)_ | One vote row inside the drill-down. Inline-able. |
| `prototype-components.jsx` | `FunderBars` | `src/components/FunderBars.tsx` | Repo today renders `donorCoalition` as a stacked bar + slice list. **Design delta:** `fundingMix` money-map (small/large/PAC) + `isIssuePAC` rows broken out separately. |
| `prototype-components.jsx` | `FundingMixBars` | _(new — recommended `src/components/FundingMixBars.tsx`)_ | **Shared** stacked small/large/PAC bar + legend. Used by BOTH the candidate-card Money trail AND the Compare modal so they never drift — consolidates what the repo renders inline in `FunderBars` and the compare grid today. Props: `{ mix: { small, large, pac }, labelMin }`. |
| `prototype-components.jsx` | `PropositionCard` | _(no repo target)_ | Propositions are rendered as freeform AI text today. Worth factoring out in Phase 4 if proposition data ever gets structured. |
| `prototype-components.jsx` | `BallotPane` (+ `BallotPaneInner`) | `src/components/BallotPane.tsx` | Already shipped. The prototype splits the inner content out so the workspace can wrap the mobile Resume bar around it. **Behavior delta:** ballot rows are tappable to open chat (CSS sets `cursor: pointer`); repo today has `cursor: default`. This is required for the mobile Pattern B flow. |
| `prototype-components.jsx` | `TweaksPanel` | _(prototype-only)_ | Design-token A/B helper. Does not ship. |
| `prototype-screens.jsx` | `PartyGate` | `src/components/PartyGate.tsx` | Already shipped. **Behavior delta:** prototype always renders the advisory variant (skip button visible); repo conditions on `primaryParticipation.behavior`. Reachable in the prototype via the rail-footer link "See party-gate (TX primary)". |
| `prototype-screens.jsx` | `AmendmentEditor` | _(new — recommended `src/components/AmendmentEditor.tsx`)_ | Modal that opens on rail-EDIT click. Re-rank/rename/remove issues + free-text add. Triggers re-score. Repo today: re-routes back to the cold-open input which destroys workspace state. |
| `prototype-screens.jsx` | `AmendDeltaMessage` | `src/components/AmendDeltaMessage.tsx` | Already shipped. Renders the post-amendment delta cards (oldPct → newPct, REVISIT/unchanged flag). |
| `prototype-screens.jsx` | `AmendRescoreOffer` | `src/components/AmendRescoreOffer.tsx` | Already shipped. Follow-up offer to walk through flagged revisits one at a time. |
| `prototype-screens.jsx` | `BudgetExhaustedModal` | `src/components/BudgetExhausted.tsx` | Already shipped. Prototype renders the portable-prompt textarea + Copy button + secondary download/print actions. |
| `prototype-screens.jsx` | `ProfileResumeModal` | _(new — recommended `src/components/ProfileResumeModal.tsx`)_ | Dropzone modal opened from home's "Drop your saved .txt profile →" link. Demo button preloads a sample profile and routes straight to workspace. |
| `prototype-screens.jsx` | `CompareModal` | _(new — recommended `src/components/CompareModal.tsx`)_ | Side-by-side issue grid for the active race's two candidates. Opened from the "Compare" button in chat header. |
| `prototype-screens.jsx` | `AllVotesPanel` | _(new — recommended `src/components/AllVotesPanel.tsx`)_ | Filterable flat list of every curated vote across all issues for one candidate. Opened from "See all votes →" on a candidate card. |
| `prototype-views.jsx` | `HomeView` | `src/app/page.tsx` + `src/components/AddressInput.tsx` | |
| `prototype-views.jsx` | `LoadingView` | _(new — Phase 3)_ | Address → races loading state. |
| `prototype-views.jsx` | `ColdOpenView` | `src/components/ColdOpenInput.tsx` + `ConcernInterpretation.tsx` | |
| `prototype-views.jsx` | `WorkspaceView` | `src/components/ResearchLayout.tsx` + `BallotToolClient.tsx` + `ChatPanel.tsx` | The 3-pane shell. |
| `prototype-views.jsx` | `PrintView` | `src/components/PrintBallot.tsx` _(new — Phase 7)_ | |
| `prototype-i18n.jsx` | `I18nProvider` / `useI18n` | `src/lib/i18n.tsx` | **Already in repo.** Prototype mirrors the same `'ballot-tool-lang'` storage key + `'en' \| 'es'` shape. |
| `prototype-i18n.jsx` | `NavProvider` / `useNav` | _(prototype-only)_ | In repo this is Next.js routing — the prototype routes via React state, so a tiny context is needed. Discard on port. |
| `prototype-components-c.jsx` | `LanguageToggle` | `src/components/LanguageToggle.tsx` | **Already in repo.** Drop-in. |
| `prototype-components-c.jsx` | `DeadlineMeter` | _(new — recommended `src/components/DeadlineMeter.tsx`)_ | Powered by `src/lib/getDeadlineStatus.ts` (already in repo). |
| `prototype-components-c.jsx` | `PollingInfoCard` | _(new — recommended `src/components/PollingInfoCard.tsx`)_ | Composes `DeadlineMeter` + repo's `getStateData`. Previously only on print sheet. |
| `prototype-components-c.jsx` | `ResumeNudge` | _(new — composes onto `src/app/page.tsx`)_ | Inline section; no new file required. |
| `prototype-components-c.jsx` | `HowItWorksWalkthrough` | _(new — composes onto `src/app/page.tsx`)_ | Inline section; no new file required. |
| `prototype-components-c.jsx` | `ErrorBanner` | _(new — recommended `src/components/ErrorBanner.tsx`)_ | Generic. Used by `AITimeoutBanner`. |
| `prototype-screens-c.jsx` | `SettingsPanel` | _(new — recommended `src/components/SettingsPanel.tsx`)_ | Composes `LanguageToggle` + BYOK utilities + data actions. Uses the same `BYOK_STORAGE_KEY` as `src/lib/anthropic-client-byok.ts` (already in repo). |
| `prototype-screens-c.jsx` | `GeocodeFailView` | _(new — recommended `src/components/GeocodeFailNotice.tsx`)_ | Today the repo surfaces geocode errors inline inside `AddressInput.tsx`. Pull into a dedicated view. |
| `prototype-screens-c.jsx` | `NoContestedView` | `src/components/BallotLookupNeeded.tsx` | **Already in repo.** Prototype matches the `data-testid="ballot-lookup-needed"` selector. |
| `prototype-screens-c.jsx` | `AITimeoutBanner` | _(new — composes into `ChatPanel.tsx`)_ | Replaces the current plain-text error treatment. |
| `prototype-screens-c.jsx` | `AboutPage` | _(new — recommended `src/app/about/page.tsx`)_ | Static. |
| `prototype-screens-c.jsx` | `MethodologyPage` | _(new — recommended `src/app/methodology/page.tsx`)_ | Static. |
| `prototype-screens-c.jsx` | `PrivacyPage` | `src/app/privacy/page.tsx` | **Already in repo.** Prototype text is close — diff & merge rather than overwrite. |
| `POLLING_INFO` (prototype-data.jsx) | `PollingLocation` | `src/app/api/civic/route.ts` (`/api/civic`, returned as `pollingLocations[0]`) | **Matches repo shape exactly.** Fields: `name, address, hours, notes`. `precinct` is kept as an out-of-API extra (it comes from the county feed, not Civic). `bring` and `earlyWindow` are no longer mock fields — `PollingStatusBar` derives them from `stateData.votingRules.acceptedIds` and `stateData.earlyVoting.{startDate,endDate}` to match real data flow. |

---

## 3 · Data shape map

Every mock object in `prototype-data.jsx` is shaped to match a repo TypeScript interface. The table below lists each by name + the file it lives in + the delta fields the prototype adds.

| Prototype object | Repo interface | Repo file | Design deltas (`[Δ]`) |
|---|---|---|---|
| `RACES[i]` | `Race` | `src/lib/raceDeriver.ts` | none |
| `RACE_PATTERNS[raceId]` | `RacePatternsBlock` | `src/lib/structured-blocks.ts` | none on the block; **see candidates** |
| `RACE_PATTERNS[raceId].candidates[i]` | `RacePatternsCandidate` | `src/lib/structured-blocks.ts` | `fundingMix?: { small, large, pac, total, cycle }` |
| `… .donorCoalition[i]` | `DonorBucketSlice` | `src/lib/structured-blocks.ts` | `isIssuePAC?: boolean`, `alignsWith?: string` (canonical issue id) |
| `ALIGNMENT_SCORES[raceId]` | `AlignmentScoresBlock` | `src/lib/structured-blocks.ts` | none on the block |
| `ALIGNMENT_SCORES[raceId].entries[i]` | `AlignmentScoresEntry` | `src/lib/structured-blocks.ts` | none |
| `… .scores[i]` | `AlignmentScore` | `src/lib/structured-blocks.ts` | none on the score itself; **see contributing votes** |
| `… .contributingVotes[i]` | `ContributingVote` | `src/lib/structured-blocks.ts` | `narrative?: string` (CAN2026-sourced explanatory paragraph) |
| `PRESET_ISSUES[i]` | `ConcernInterpretationEntry` | `src/lib/structured-blocks.ts` | `quotes?: { label, text }[]` (anchors the interpretation back to the user's original words — currently the repo's `interpretation` field is a flat string) |
| `POLLING_INFO` | `Resources` (subset) | `src/types/election.ts` | small mock; real data assembled from `getStateData` |
| `PARTY_META` | _(none in repo)_ | _(view-helper)_ | render-time mapping from party name to pip class. |
| `STATE_ELECTION_DATA` (prototype-data-c.jsx) | `StateElectionData` | `src/types/election.ts` + `src/data/states/TX.json` | **Matches repo shape.** Subset — only the fields the new surfaces (deadlines, polling, runoff) read. Drop-in replaceable by `getStateData('TX')`. |
| `TODAY_ISO` (prototype-data-c.jsx) | _(replaced by)_ | `src/lib/electionToday.ts` → `getTodayInLatestUsZone()` | Pinned to `2026-09-29` so the deadline colors hit all 3 buckets for demo. Replace with the repo helper at port time. |
| `TRANSLATIONS` (prototype-i18n.jsx) | `Translations` | `src/lib/translations.ts` | **Subset — same key shape as repo.** New keys added for Pass C surfaces are listed in §8 below. Merge into the repo's translation file rather than overwrite. |
| `BYOK_STORAGE_KEY` (prototype-screens-c.jsx) | _(same key)_ | `src/lib/anthropic-client-byok.ts` | Exact match: `voter-choice:byok-anthropic-key`. |

---

## 4 · Canonical issue ids

`src/lib/canonicalIssues.ts` lists the canonical ids the repo recognizes today. The prototype uses **two from the existing list** and **one proposed addition**:

- `healthcare_affordability` — repo ✓
- `housing_affordability` — repo ✓
- `congressional_accountability` — **proposed addition.** The `canonicalIssues.ts` file already flags itself for expansion. This id covers stock-trading bans, term limits, and similar accountability mechanisms. When implementing this prototype, add it to `CANONICAL_ISSUE_LABELS` with label `"Congressional Accountability"`.

---

## 5 · Interactions covered in this prototype

✅ = clickable and produces visible effect (Pass B closed the gaps that were stubbed in Pass A)

| Interaction | Status | Wired component |
|---|---|---|
| Submit address → load races | ✅ | `HomeView` → `LoadingView` |
| Cold open: free-text → infer issues → reorder / rename / remove → lock in | ✅ | `ColdOpenView` + `IssueRow` |
| Cold open: "show me an example" prefills the textarea | ✅ | `ColdOpenView` |
| Workspace: select race from left rail | ✅ | `WorkspaceView` |
| Workspace: select race from ballot pane (mobile-primary) | ✅ | `BallotPane` row click |
| Workspace: skip race | ✅ | chat header Skip + chip Skip |
| Workspace: pick a candidate → logged + auto-advance | ✅ | `CandidateCard` |
| Workspace: unpick (undo) | ✅ | `CandidateCard` |
| Workspace: vote / unvote on proposition | ✅ | `PropositionCard` |
| Workspace: tap alignment row → expand drill-down (curated narrative + issue-PACs) | ✅ | `AlignmentScoreBanner` + `AlignmentDrilldown` |
| Workspace: edit issues mid-flow → modal preserves picks → delta card in chat | ✅ | `AmendmentEditor` + `AmendDeltaMessage` + `AmendRescoreOffer` |
| Workspace: chat input — Send / Enter → user msg + mock AI reply | ✅ | `WorkspaceView` chat input |
| Workspace: "Compare" button in chat header | ✅ | `CompareModal` |
| Workspace: "See all votes →" on candidate card | ✅ | `AllVotesPanel` |
| Workspace: party-gate route (TX primary) | ✅ | `PartyGate` (via rail footer link) |
| Mobile Resume bar → reopen chat overlay | ✅ | `WorkspaceView` |
| Mobile: tap race row → chat overlay opens | ✅ | `WorkspaceView` |
| Mobile: back button closes chat overlay | ✅ | `WorkspaceView` |
| Ballot: Print → print view → browser print | ✅ | `PrintView` |
| Ballot: Save profile (.txt) | ⚠️ stubbed (`alert`) | host wires real .txt download |
| Ballot: Continue in another chatbot | ✅ | `BudgetExhaustedModal` (portable prompt + Copy) |
| Home: Resume from saved .txt profile | ✅ (demo-load button) | `ProfileResumeModal` |

The one remaining stub is **Save profile (.txt)** — still on an `alert()` because writing a real file from the prototype requires a Blob + anchor download which is more setup than the demo justifies. The repo should implement this as a normal File API download.

---

## 6 · Phases from the brief NOT yet in this prototype

Pass B closed the major phase gaps. Remaining out-of-scope items:

| Brief phase | Repo component(s) | Prototype status |
|---|---|---|
| Phase 2 alternate path (chip-based cold open) | `ColdOpenInput.tsx` | Partial — prototype uses the freeform-textarea variant; the chip-based alternative is not represented. |
| Phase 5 — Party gate (state primary rules) | `PartyGate.tsx` | ✅ Covered (Pass B). |
| Phase 6 — Mid-flow amendment | `AmendRescoreOffer.tsx`, `AmendDeltaMessage.tsx` | ✅ Covered (Pass B). Plus new `AmendmentEditor` modal. |
| Phase 9 — Budget exhausted handoff | `BudgetExhausted.tsx` | ✅ Covered (Pass B). |
| Polis overlay | `PolisOverlay.tsx` | Out of scope. |
| State / county-specific deadline data | `getStateData.ts`, `getDeadlineStatus.ts` | ✅ Covered (Pass C) — `STATE_ELECTION_DATA` in `prototype-data-c.jsx` is shaped to match `StateElectionData`. |
| Geocode failure | _(today inline in `AddressInput.tsx`)_ | ✅ Covered (Pass C) — `GeocodeFailView`. |
| No contested races | `BallotLookupNeeded.tsx` | ✅ Covered (Pass C) — `NoContestedView`. |
| AI timeout | _(today inline plaintext)_ | ✅ Covered (Pass C) — `AITimeoutBanner`. |
| EN / ES toggle | `LanguageToggle.tsx`, `i18n.tsx`, `translations.ts` | ✅ Covered (Pass C) — `LanguageToggle`, `useI18n`, partial `TRANSLATIONS`. |
| BYOK + Settings | `anthropic-client-byok.ts` | ✅ Covered (Pass C) — `SettingsPanel`. |
| About / Methodology / Privacy | `src/app/{about,methodology,privacy}/page.tsx` | ✅ Covered (Pass C). `privacy/page.tsx` is the only one that exists today. |

---

## 7 · Porting checklist

For Code, when implementing a design from this prototype:

1. **Find the repo target** in §2 above. If it's `_(new)_`, create the file.
2. **Check the data deltas** in §3. Add the `[Δ]` fields to the appropriate TypeScript interface in `src/lib/structured-blocks.ts` first — get the type system to compile, then build the component.
3. **For new canonical issues** (§4), update `src/lib/canonicalIssues.ts` first.
4. **For new structured-block schema fields**, also update the corresponding sanitizer (`sanitizeContributingVote`, `sanitizeDonorCoalition`, etc.) so the parser accepts the new field.
5. **Cross-reference the prompt** — `prototype/prompts.md` (when it exists) or `src/lib/prompts/` for the AI side. The data the prototype mocks needs to be in the AI's output schema.
6. **Run the test suite** — `structured-blocks.test.ts` is comprehensive and will tell you immediately if a sanitizer drops your new field.

---

## 8 · Translation keys added in Pass C

These keys are new in `prototype-i18n.jsx → TRANSLATIONS`. Merge into `src/lib/translations.ts` before the components ship in the repo. Existing repo translations are unchanged.

- `nav.{howItWorks, theRecord, about, methodology, privacy, settings}`
- `landing.{returningBadge, returningHeadline, returningSubtext, returningResume, returningStartOver, howItWorksTitle, howItWorksSubtext, step1Title, step1Desc, step2Title, step2Desc, step3Title, step3Desc}`
- `deadline.{registerOnline, registerByMail, registerInPerson, earlyVotingStarts, earlyVotingEnds, electionDay, passed, today, daysLeft, sameDayAvailable, checkRegistration}`
- `errors.{geocodeFailTitle, geocodeFailBody, geocodeFailRetry, geocodeFailSkip, noContestedTitle, noContestedBody, noContestedFindBallot, noContestedCountyOffice, noContestedPaste, noContestedConfirm, noContestedUpload, aiTimeoutTitle, aiTimeoutBody, aiTimeoutRetry, aiTimeoutHandoff}`
- `settings.{title, langSection, langEn, langEs, byokSection, byokHelp, byokPlaceholder, byokSave, byokClear, byokSaved, byokRemoved, dataSection, dataResume, dataExport, dataReset, privacyLink, methodologyLink, aboutLink}`
- `polling.{cardTitle, addedToCalendar, directions, hours, bring, sampleBallot, precinct, earlyVotingWindow, cardSource}`

`{varName}` interpolation matches repo convention — see `src/lib/i18n.tsx` for the helper.

---

## 9 · Demo triggers (Pass C)

Because the prototype has no real Civic API + Anthropic backend, error states are surfaced via input-pattern triggers in `prototype-app.jsx`:

| Trigger | What happens |
|---|---|
| Submit address shorter than 6 chars (and not a 5-digit ZIP) | → `GeocodeFailView` |
| Submit an address containing `"rural"` or `"noballot"` | → `NoContestedView` |
| Send a chat message containing `"timeout"`, `"fail"`, or `"error"` | → `AITimeoutBanner` in chat |

Strip these guards at port time — the repo routes them through real HTTP status codes from `/api/civic` and `/api/chat`.

---

## 10 · "Should be a component" — duplication audit

A sweep for hand-rolled patterns repeated across the prototype. **Already
consolidated** (extract as-is): `FundingMixBars` (card + compare),
`IssueRow` (cold-open + amend editor), `DeadlineMeter`, `ErrorBanner`.

**Still duplicated — extract these at port time:**

| Pattern | Where it's duplicated now | Recommended shape |
|---|---|---|
| **`formatDollars`** | Defined twice — `prototype-components.jsx` (`formatDollars`) and `prototype-screens.jsx` (`window.__formatDollars`). Identical logic. | **Reuse the repo's existing `formatCurrencyShort` in `src/lib/ballot-utils.ts`** — do not create a new util. |
| **Candidate identity / blind-mode label** | `CompareModal.displayLabel`, `AllVotesPanel` anonCtx, `CandidateCard` anonCtx, `CandidateCardHeader` blind branch, `WorkspaceView` alias/peerTotals logic. All compute `{ alias, displayName, isBlind }` from `(candidate, blindMode, revealedSet, index)`. | `useCandidateIdentity()` hook (or `getCandidateLabel()` util) + the existing `anonymizeText`. Single source for "Candidate A / identity hidden / reveal". |
| **Peer-funding comparison** | `computePeerLabel` (components.jsx) **and** an inline copy inside `FunderBars` (the `ratio < 0.85 / > 1.18` block). Same thresholds, two implementations → can drift. | One `getPeerComparison(total, peers)` → `{ kind, multiplier, label }`. |
| **Modal shell** | `BudgetExhaustedModal`, `ProfileResumeModal`, `CompareModal`, `AllVotesPanel` each hand-roll `.be-modal-overlay` + `onClick={onClose}` + inner `stopPropagation` + `<header>` + close `×`. `AmendmentEditor` uses a parallel `.amend-modal`. | `<Modal eyebrow title onClose>` wrapping the overlay + header + Esc/backdrop close. Removes ~5 copies of the same boilerplate (and the focus-trap/Esc handling only some have today). |
| **BYOK key field** | `SettingsPanel` (canonical) and `BudgetExhaustedByok` duplicate input + `sk-ant-` validation + mask + save/clear + status. | `<ByokKeyField>` + a `useByokKey()` hook over `anthropic-client-byok.ts`. |
| **Reveal (blind) button** | `CompareModal.cmp-reveal` + `CandidateCardHeader` reveal button — same eye-icon + "Reveal" + `onReveal`. | Fold into the identity component above. |
| **Section header** | eyebrow + serif title + italic subcaption recurs: `cv2-block-head`, Money-trail disclosure header, `StaticPage` (`sp-eyebrow`/`sp-title`), poll-card. | Optional `<SectionHeader eyebrow title subtitle>` — lower priority (pure presentation). |

None of these block the port; they're consolidation wins that reduce drift.
The candidate-identity and peer-comparison helpers are the highest value
(logic duplicated across files, where a fix in one copy silently misses the
other). For money formatting, **reuse the repo's existing `formatCurrencyShort`**
rather than extracting a new util — the prototype's `formatDollars` exists
only because the prototype has no repo libs available.

> **Note (verified May 28 2026):** the prototype consolidated `formatDollars`,
> `getCandidateIdentity`, `getPeerComparison`, and `anonymizeText` into
> `prototype-shared.jsx`. In the repo, `formatDollars` → `formatCurrencyShort`
> (exists); the other three become small `src/lib/` modules.
