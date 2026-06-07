# Voter Choice — front-end code handoff

> ⚠ **Read this before doing anything.**
>
> The JSX, component names, prop signatures, data shapes, state machines,
> and CSS in this folder are **the front-end implementation**, not design
> direction. Claude Code's job is to **port this code** into the repo's
> TypeScript / Next.js conventions — **not to redesign or reinterpret** it.
>
> If you find yourself wondering "what should this look like?" or "what
> should this component do?" — re-read the prototype source. The answer is
> there, in the JSX. Don't guess. Don't simplify. Don't substitute your own
> design instincts.
>
> The only transformation work is:
>
> 1. JSX → TSX (add TypeScript types using the interfaces already in `src/lib/`).
> 2. Mock data → real fetches (every mock is shaped to match a real interface).
> 3. Demo error triggers (input pattern matching) → real HTTP status handling.
> 4. Window-globals (`Object.assign(window, …)`) → ES module imports.
> 5. The single `alert()` stub on Save-profile → wire to the repo's
>    existing `downloadProfileAsText` util.
>
> That's it. Everything else is preserved verbatim: **same component file,
> same component name, same prop shape, same JSX structure, same copy, same
> visual result.** (Styling is expressed in the repo's Tailwind token
> utilities, not by copying the prototype's CSS files — see the styling note
> below and PORT_PROMPT.md's REPO REALITY CHECK.)

This folder is a **complete, runnable front-end** for the Voter Choice
2026 redesign, built specifically against the existing
[`heymoosh/voter-choice@launch/production`](https://github.com/heymoosh/voter-choice/tree/launch/production)
repo's TypeScript interfaces. Porting it is a mechanical job, not a design job.

---

## TL;DR — How to use this package

You're going to give this folder to **Claude Code running inside the
`voter-choice` repo**, along with one prompt. Concretely:

1. **Open the `voter-choice` repo locally** on the `launch/production` branch.
2. **Replace the stale prototype** at `docs/design/2026-redesign/prototype/` with this folder's contents (overwrite in one commit — see `STALE_PROTOTYPE.md`). This keeps a single prototype at the path `globals.css` already references.
3. **Open Claude Code** in the repo root.
4. **Paste the contents of `PORT_PROMPT.md`** (in this folder) into Claude Code as your first message. That prompt points Claude Code at this folder, tells it to read `COMPONENT_MAP.md` first, and lays out the porting phases in order.

The prompt is self-contained — Claude Code does not need any of the design
conversation history to do the port. Everything it needs is in
`COMPONENT_MAP.md` + the JSX/CSS files in this folder.

---

## What's in this folder

| File | What it is |
|---|---|
| `Voter Choice Prototype.html` | The runnable prototype. Open in a browser to see/test every screen. |
| `COMPONENT_MAP.md` | **The portability contract.** Maps every prototype component → repo file path + lists data-shape deltas. Claude Code reads this first. |
| `HANDOFF.md` | This file. Overview + step-by-step usage. |
| `PORT_PROMPT.md` | Copy-paste prompt to give Claude Code in the repo. |
| `STALE_PROTOTYPE.md` | What to do with the older prototype snapshot already in the repo (overwrite in place — read before STEP 0). |
| `prompts.md` | The AI-side prompts the prototype assumes exist. Reference for the chat/alignment routes. |
| `prototype-app.jsx` | Root app — view router + state. The view names map 1:1 to repo screens. |
| `prototype-views.jsx` | Per-view components (`HomeView`, `ColdOpenView`, `WorkspaceView`, `PrintView`). |
| `prototype-components.jsx` | Pass A/B components (`CandidateCard`, `AlignmentScoreBanner`, `FunderBars`, `BallotPane`, etc.) — repo-shaped names + props. |
| `prototype-screens.jsx` | Pass A/B modals + overlays (`PartyGate`, `AmendmentEditor`, `CompareModal`, `AllVotesPanel`, `BudgetExhaustedModal`, `ProfileResumeModal`). |
| `prototype-data.jsx` | Mock data. **Shaped to match repo's `RacePatternsCandidate`, `AlignmentScoresEntry`, `DonorBucketSlice`, `ContributingVote`, `ConcernInterpretationEntry`**. Marked inline with `[Δ]` where new fields are introduced. |
| `prototype-components-c.jsx` | Pass C components: `PollingStatusBar`, `DeadlineMeter`, `LanguageToggle`, `AppNavWithChrome`, `ResumeNudge`, `HowItWorksWalkthrough`, `ErrorBanner`. |
| `prototype-screens-c.jsx` | Pass C screens: `SettingsPanel` (BYOK), `GeocodeFailView`, `NoContestedView`, `AITimeoutBanner`, `AboutPage`, `MethodologyPage`, `PrivacyPage`. |
| `prototype-data-c.jsx` | Pass C data: `STATE_ELECTION_DATA` (shaped to repo's `StateElectionData`), `TODAY_ISO`, `getDeadlineRows()`. |
| `prototype-shared.jsx` | **Design-system core** — cross-cutting LOGIC shared by every surface: `formatDollars` (→ repo's `formatCurrencyShort`), `getCandidateIdentity` (blind-mode labelling), `getPeerComparison` (funding thresholds), `anonymizeText`. Loaded first. |
| `prototype-i18n.jsx` | i18n provider + 2-language dictionary (EN/ES). Same `'ballot-tool-lang'` storage key as repo. In repo: `useLanguage()` + `translations[lang]` dot-access (no `t()`). |
| `prototype.css` | Pass A/B styles — **visual spec only**, not for copying. The repo already has these tokens as Tailwind utilities (`globals.css`). |
| `prototype-c.css` | Pass C style overrides — same: read values, express in Tailwind utilities. |

---

## Design fidelity

**This folder IS the front-end spec.** Not a wireframe, not a sketch, not a
loose "design direction." Every JSX file is what should exist in
`src/components/` — modulo the type annotations, the mock-→-fetch swap, and
the styling translation. Every piece of user-facing copy is final — do not
rewrite it.

**Styling note:** the repo styles with **Tailwind v4 token utilities**
(`bg-paper`, `text-ink-2`, `border-rule`, `bg-civic`, `font-serif`, …) — the
prototype's tokens are already in `src/app/globals.css`. The prototype's
`prototype.css` / `prototype-c.css` are the **visual spec**, not files to
copy. Read a value from the prototype CSS, express it with the matching
utility. Don't introduce the prototype's `.cv2-*` / `.poll-*` class names.
See PORT_PROMPT.md's "REPO REALITY CHECK" for the full list of repo
conventions (Tailwind, `ui/` primitives, dot-access i18n, existing utils).

**Failure mode to avoid:** previous handoffs failed when the implementer
treated the HTML as "design inspiration" and recreated their own version
from scratch. That caused over a week of rework. The phrase "high-fidelity
mockup" in handoff templates is misleading for this case. This is *not* a
mockup — it's the implementation. Copy it.

**What "port" means concretely:**

| Prototype | Repo equivalent | Type of change |
|---|---|---|
| `function CandidateCard({…})` | `function CandidateCard({…}: CandidateCardProps)` | Add explicit Props interface |
| `useStateV(...)`, `useStateC(...)` | `useState(...)` | Strip prefixes (artifact of multi-file Babel scope) |
| `Object.assign(window, { ... })` | `export { ... }` | ES module exports |
| `STATE_ELECTION_DATA` (mock literal) | `await getStateData('TX')` | Swap mock for the repo's existing helper |
| Mock `RACE_PATTERNS[raceId]` | Real `RacePatternsBlock` from structured-blocks parser | Same shape, real source |
| `if (/rural/i.test(addr)) setView('nocontested')` | Real HTTP 404 from `/api/civic` | Strip demo trigger, route real status |
| `<div className="cv2-card">` | `<div className="bg-paper-2 border border-rule rounded-[10px] …">` | Express the prototype CSS via Tailwind token utilities — do NOT copy `.cv2-card` or `prototype.css` |
| Copy strings | `const t = translations[lang]; t.section.key` (dot-access) | Add new keys to `translations.ts`; no `t()` helper exists |

---

## Portability mechanics — what makes this easy to port

The prototype was built backwards from the repo. Every choice was made to
minimize delta:

1. **Component naming matches.** If the prototype has `AlignmentScoreBanner`,
   that's `src/components/AlignmentScoreBanner.tsx` in the repo. If it has
   `BallotPane`, that's `src/components/BallotPane.tsx`. See COMPONENT_MAP.md §2.

2. **Data shapes match repo TypeScript interfaces exactly.** `RACE_PATTERNS[id]`
   matches `RacePatternsBlock`. `STATE_ELECTION_DATA` matches `StateElectionData`.
   `POLLING_INFO` matches Civic API's `PollingLocation`. See COMPONENT_MAP.md §3.

3. **Storage keys match.** Language preference uses `'ballot-tool-lang'`.
   BYOK uses `voter-choice:byok-anthropic-key`. Both are exact-match
   with the repo's existing keys, so a user with a saved key keeps it.

4. **i18n keys match.** Translation keys use the same shape as repo's
   `Translations` interface — new keys are flagged in COMPONENT_MAP.md §8
   so Claude Code can merge them into `src/lib/translations.ts` without
   overwriting existing strings.

5. **Repo-only data is already there.** `getStateData('TX')`, `getDeadlineStatus`,
   `getTodayInLatestUsZone`, `anthropic-client-byok`, the `LanguageToggle` and
   `BallotLookupNeeded` components, the `privacy/page.tsx` — all exist in repo
   already and are referenced (not re-implemented) by the prototype.

6. **Design deltas are marked `[Δ]`.** Anywhere the prototype invents a new
   data field (`narrative` on `ContributingVote`, `fundingMix` on
   `RacePatternsCandidate`, `isIssuePAC`/`alignsWith` on `DonorBucketSlice`,
   `quotes` on `ConcernInterpretationEntry`), it's flagged inline. These are
   the *only* schema additions needed on the repo's TypeScript side.

7. **Demo triggers documented for removal.** The prototype has no backend, so
   error states are surfaced via input-pattern triggers (e.g. typing "rural"
   into the address routes to no-contested-races view). These are listed in
   COMPONENT_MAP.md §9 with the exact code locations to strip at port time.

---

## Porting order (recommended)

Detailed table-of-mapping is in `COMPONENT_MAP.md §2`. The recommended order
when actually doing the work in the repo:

1. **Phase 0 — Types.** Add the design-delta fields to TypeScript interfaces
   (`src/lib/structured-blocks.ts`) and the matching sanitizers. Run tests.
   _Why first: nothing compiles without the types, and the tests will tell
   you immediately if the sanitizer drops your new field._

2. **Phase 1 — Translations.** Merge the new keys from `prototype-i18n.jsx →
   TRANSLATIONS` into `src/lib/translations.ts`. Keys are listed in
   COMPONENT_MAP.md §8. Don't overwrite existing keys — additive merge.

3. **Phase 2 — Components that already exist.** Update the in-repo files
   (`AlignmentScoreBanner.tsx`, `FunderBars.tsx`, `AlignmentDrilldown.tsx`,
   `BallotPane.tsx`, `Navigation.tsx`) to match the prototype's design.
   These render data that already flows through the app.

4. **Phase 3 — New components.** Create the files COMPONENT_MAP.md §2 marks as
   `_(new)_`. Recommended order: `CandidateCard`, `PollingStatusBar`,
   `DeadlineMeter`, `ResumeNudge`, `HowItWorksWalkthrough`, `SettingsPanel`,
   `AmendmentEditor`, `CompareModal`, `AllVotesPanel`,
   `GeocodeFailNotice`, `AITimeoutBanner`, `PrintBallot`, `LoadingView`.

5. **Phase 4 — New pages.** `src/app/about/page.tsx`,
   `src/app/methodology/page.tsx`, and merge the prototype's privacy text into
   the existing `src/app/privacy/page.tsx`.

6. **Phase 5 — Strip demo triggers.** Remove the input-pattern guards in
   `prototype-app.jsx` once real HTTP error handling routes to the error views.
   See COMPONENT_MAP.md §9 for the exact triggers.

7. **Phase 6 — Save profile (.txt) + print.** Already implemented in
   `src/lib/ballot-utils.ts` (`downloadProfileAsText`, `openPrintableBallot`).
   The prototype stubs them with `alert()` only because it has no repo libs.
   Wire the prototype's buttons to the existing utils — don't rebuild.

8. **Phase 7 — Tests.** Run `structured-blocks.test.ts` after every type change.
   Add component-level tests for new files.

Each phase is independently mergeable — no big-bang.

---

## What the prototype does NOT cover

Honest list:

- **Polis overlay** (`PolisOverlay.tsx`) — explicitly out of scope.
- **Chip-based cold-open variant** — the prototype uses the freeform textarea
  variant only.
- **Real .txt profile save / print** — stubbed with `alert()` in the
  prototype. The repo **already has** `downloadProfileAsText` /
  `openPrintableBallot` (`ballot-utils.ts`) — wire to those, don't rebuild.
- **Real geocoding / Civic API / Anthropic calls** — all stubbed. Error states
  are reachable via the demo triggers in COMPONENT_MAP.md §9.
- **Real localization of body content** — the prototype translates only the
  keys the new Pass C surfaces touch (nav, landing, deadline, errors,
  settings, polling). Existing repo strings stay in repo.

---

## Questions or stuck

Email <muxin.li.pro@gmail.com>. The COMPONENT_MAP is meant to answer 90% of
"where does X go in the repo" questions — if it doesn't, that's a
documentation bug worth reporting.
