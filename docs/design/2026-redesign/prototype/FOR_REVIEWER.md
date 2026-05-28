# For the reviewing dev — your four asks

You said: *drop the zip anywhere (you'll quarantine it); include the
data/type shapes it coded against; a note on which repo files it maps to (you'll
verify, not trust); a list of features it did NOT build UI for; and keep the
prototype runnable standalone for visual-diff.*

Here's each, with pointers. Nothing here is load-bearing on trust — every
mapping is yours to verify.

---

## 1 · Data / type shapes it coded against

The prototype's mock data was shaped to match the repo's **existing**
TypeScript interfaces (verified against `launch/production` @ `db3b63d`,
May 28 2026). Full field-by-field table: **COMPONENT_MAP.md §3**. Summary:

| Prototype mock | Coded against (repo type) | File |
|---|---|---|
| `RACE_PATTERNS[raceId]` | `RacePatternsBlock` / `RacePatternsCandidate` | `src/lib/structured-blocks.ts` |
| `ALIGNMENT_SCORES[raceId]` | `AlignmentScoresBlock` / `AlignmentScore` / `ContributingVote` | `src/lib/structured-blocks.ts` |
| issue rows | `ConcernInterpretationEntry` | `src/lib/structured-blocks.ts` |
| `STATE_ELECTION_DATA` | `StateElectionData` (+ `Registration`, `EarlyVoting`, `VotingRules`, `RunoffRules`, `PrimaryParticipationRules`) | `src/types/election.ts` |
| `POLLING_INFO` | `PollingLocation` (Civic API response) | `src/app/api/civic/route.ts` |
| deadline rows | `DeadlineStatus` | `src/types/election.ts` (`getDeadlineStatus`) |
| donor slices | `DonorBucketSlice` | `src/lib/structured-blocks.ts` |

**Design-deltas — the ONLY new fields the prototype introduces** (everything
else already exists in your types). Each is marked `[Δ]` inline in the JSX and
listed in COMPONENT_MAP.md §3:

- `fundingMix: { small, large, pac, total }` on `RacePatternsCandidate` — the
  small/large/PAC money-map. (Derivable from `donorCoalition` buckets, or add
  as a field.)
- `narrative?: string` on `ContributingVote` — the CAN2026 explanatory line.
- `quotes?: {label, text}[]` on `ConcernInterpretationEntry` — the user's own
  words shown under each ranked issue.
- `isIssuePAC` / `alignsWith` on `DonorBucketSlice` — named-PAC breakout.
- new canonical issue id `congressional_accountability` (COMPONENT_MAP §4).

If you add these to `structured-blocks.ts`, update the sanitizers too —
`structured-blocks.test.ts` will catch a dropped field immediately.

---

## 2 · Which repo files it believes it maps to (verify, don't trust)

**COMPONENT_MAP.md §2** is the full table: every prototype component →
believed `src/` path, flagged **new** vs **already-shipped**. The "already
shipped" ones are the higher-risk verifications — confirm the prototype's
intended design matches before you overwrite. High-level:

- **Already in repo (update in place):** `AlignmentScoreBanner`,
  `AlignmentDrilldown`, `FunderBars`, `BallotPane`, `Navigation`/`PageContent`,
  `ColdOpenInput`, `ConcernInterpretation`, `BudgetExhausted`, `PartyGate`,
  `LanguageToggle`, `BallotLookupNeeded`, `HandoffPackage`, privacy page.
- **New (create):** `CandidateCard`, `CandidateCardHeader`, `PollingStatusBar`,
  `DeadlineMeter`, `FundingMixBars`, `ResumeNudge`, `HowItWorksWalkthrough`,
  `SettingsPanel`, `AmendmentEditor`, `CompareModal`, `AllVotesPanel`,
  `GeocodeFailNotice`, `AITimeoutBanner`, `ErrorBanner`, `PrintBallot`,
  `LoadingView`, `ProfileResumeModal`; pages `about`, `methodology`, `tip`.

I verified the interface/util/key claims against the live repo — see the
"REPO REALITY CHECK" at the top of PORT_PROMPT.md and COMPONENT_MAP.md. But
the component-name → file-path mapping is my belief; treat it as a starting
hypothesis for your review.

---

## 3 · Features with NO prototype UI (gaps)

The prototype deliberately does **not** include UI for:

- **Polis consensus overlay** (`PolisOverlay.tsx` + `api/polis/*`) — out of
  scope. The backend routes exist; no redesigned UI was built for them.
- **Chip-based cold-open variant** — prototype ships the freeform-textarea
  cold open only, not the tag-chip variant.
- **`voteByMail` / mail-ballot flow** — `StateElectionData.voteByMail` exists
  in the type; the prototype surfaces registration + early-voting + polling,
  not a dedicated VBM flow.
- **`terms/page.tsx`** — exists in repo; prototype redesigns About /
  Methodology / Privacy / Tip, not Terms.
- **`coverageStatus: "unconfirmed"` state** — the deadline/polling UI assumes
  confirmed TX data; no "data not yet available for your state" variant.
- **Amend → rescore streaming** (`AmendDeltaMessage`, `AmendRescoreOffer`) —
  the prototype's amend modal edits issues, but the post-rescore delta
  message UI is repo-only.
- **Real localization of body copy** — only the new Pass C surfaces (nav,
  landing, deadline, errors, settings, polling) carry ES strings; the rest
  stays English in the prototype. Existing repo `translations.ts` covers more.

Everything not in this list and not flagged out-of-scope in COMPONENT_MAP §6
should have a corresponding prototype surface.

---

## 4 · Running the prototype standalone (for visual-diff)

The prototype is a single entry HTML + sibling `.jsx`/`.css` files. It uses
in-browser Babel, so the `.jsx` files are fetched at runtime.

**⚠ It will NOT run from `file://`** — opening `Voter Choice Prototype.html`
directly gives a blank page, because browsers block the Babel XHR fetches of
the `.jsx` files under the `file://` origin. **Serve it over HTTP:**

```bash
cd <this-folder>
npx serve .          # or: python3 -m http.server 8000
# open the printed localhost URL → "Voter Choice Prototype.html"
```

It needs network access on first load for React, Babel, and Google Fonts
(all from CDNs). Once served over HTTP it's fully interactive — every screen,
modal, and the responsive breakpoints all work, so you can visual-diff the
running repo against it side by side.

**Entry file:** `Voter Choice Prototype.html`. Load order (in the HTML):
`prototype-shared` → `prototype-i18n` → `prototype-data` → `prototype-data-c`
→ `prototype-components` → `prototype-components-c` → `prototype-screens` →
`prototype-screens-c` → `prototype-views` → `prototype-app`.

---

## 5 · Heads-up: there's a stale copy of this prototype in the repo

The repo already has a **pre-Pass-C snapshot** at
`docs/design/2026-redesign/prototype/` (6 files, ~41KB CSS). This package is
the current version (~14 files). The instruction is to **overwrite that path
in place** with this package, in one commit — see `STALE_PROTOTYPE.md` and
`PORT_PROMPT.md` STEP 0. Make sure your visual-diff runs against this version,
not the stale one.

**To reach the demo-only states** (no backend here): see COMPONENT_MAP.md §9
— e.g. type an address containing "rural" to hit the no-contested-ballot
flow, or send a chat message containing "timeout" to see the AI-timeout
banner. Strip those triggers when wiring real routes.
