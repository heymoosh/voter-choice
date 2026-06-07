# Claude Code · Port prompt for Voter Choice 2026 redesign

> **Paste the contents of this file** as your first message to Claude Code,
> running inside the `voter-choice` repo on the `launch/production` branch.
>
> This package REPLACES the stale prototype already in the repo. Drop its
> contents into `docs/design/2026-redesign/prototype/`, overwriting what's
> there (see "STEP 0" below). All paths in this prompt assume that location.

---

## ⚠ REPO REALITY CHECK — verified against `launch/production` @ commit db3b63d (May 28 2026)

Before the instructions below: this repo is **already mid-adoption of this
exact prototype**. The backend is built and the visual foundation is
partly in. That changes HOW the prototype lands — read this first or you'll
fight the codebase.

**1. Styling is Tailwind v4 utilities — NOT the prototype's CSS files.**
`src/app/globals.css` already imports the prototype's `:root` token block
verbatim and exposes every token as a Tailwind utility via `@theme inline`:
`bg-paper`, `bg-civic`, `text-ink` / `text-ink-2` / `text-ink-3`,
`border-rule`, `bg-gold`, `bg-vote-red`, `font-serif` / `font-sans` /
`font-mono`, etc. Existing components are written in these utilities (see
`FunderBars.tsx`). **Do NOT copy `prototype.css` / `prototype-c.css` into the
repo, and do NOT introduce the prototype's semantic class names
(`.cv2-card`, `.poll-bar`, `.theme-row`, `.fmix-bar`).** Instead, treat the
prototype CSS as the **visual spec** and express it with the existing
Tailwind token utilities. The pixel values, colors, and spacing are the
target; the delivery mechanism is Tailwind classes, not a stylesheet copy.

**2. A `ui/` primitive library already exists — reuse it.**
`src/components/ui/` has `Button` (variants `primary` / `cta` / `ghost`,
sizes `sm` / `md` / `lg`, built-in 44px min target), `Badge`, `Card`,
`Notice`, `TextInput`. Use these instead of hand-rolling buttons/inputs.
There's also `components/cards/CardErrorBoundary` wrapping decorative chart
bits. Match these conventions.

**3. i18n is `useLanguage()` + `translations[lang]` dot-access — there is NO `t()`.**
`src/lib/i18n.tsx` exports `useLanguage()` → `{ lang, setLang }` (storage key
`"ballot-tool-lang"`). Copy comes from the typed dictionary in
`src/lib/translations.ts`, accessed as `const t = translations[lang]; t.ballot.downloadBallot`.
The prototype's `useI18n().t('ballot.downloadBallot')` function-call form does
**not** exist in the repo — translate call sites to dot-access and add new
keys to the `Translations` interface + `translations.ts`. New keys are listed
in COMPONENT_MAP.md §8.

**4. Several "stubs" in the prototype are already real in the repo — reuse, don't rebuild.**
- Save profile / print: `src/lib/ballot-utils.ts` already exports
  `downloadProfileAsText`, `openPrintableBallot`, `extractBallot`,
  `extractVoterProfile`. Do not build a new Blob download.
- Money formatting: the repo uses `formatCurrencyShort` (in `ballot-utils.ts`).
  Use it — do **not** create a `formatDollars`. (The prototype's
  `formatDollars` / shared-primitives module maps onto existing repo utils;
  see COMPONENT_MAP §10.)
- BYOK: `src/lib/anthropic-client-byok.ts` already exports `getByokKey`,
  `setByokKey`, `removeByokKey`, `hasByokKey`, `streamWithByok` (storage key
  `"voter-choice:byok-anthropic-key"`). Wire the prototype's Settings + budget
  BYOK UI to these — don't reimplement key storage.
- LanguageToggle, BallotLookupNeeded, privacy page, getStateData,
  getDeadlineStatus, electionToday — all already exist. COMPONENT_MAP §2
  flags new-vs-shipped.

**5. The backend already exists.** `src/app/api/{chat,civic,alignment,
extract-ballot,donors,chat-catch,counters,polis}` are all built. "Wiring up
the backend" mostly means **pointing the redesigned UI at routes that already
work** + removing the prototype's demo triggers (COMPONENT_MAP §9), not
writing new endpoints.

**6. The prototype already lives in the repo** at
`docs/design/2026-redesign/prototype/` (globals.css cites it as the token
source). Reconcile against that path; the redesign is being landed
incrementally, component by component.

**Net:** the "DO NOT REDESIGN" rule below still holds — the prototype is the
visual + behavioral spec. But the *mechanics* are: express it in Tailwind
token utilities, reuse `ui/` primitives + existing libs, use dot-access i18n.
Treat verbatim-CSS / `t()` / new-util instincts as wrong for THIS repo.

---

## Prompt

# READ THIS FIRST — DO NOT REDESIGN

## STEP 0 — Reconcile the stale prototype (do this before anything else)

This repo already contains an **older, pre-Pass-C snapshot** of this prototype
at `docs/design/2026-redesign/prototype/` (≈6 files, ~41KB `prototype.css`,
no `-c`/`-shared`/`-i18n`/`-screens` files). This package is the **current**
version (~14 files, Pass C complete). Before reading anything else:

1. **Overwrite** `docs/design/2026-redesign/prototype/` with this package's
   contents, in a single commit, so git shows one reviewable old→new diff and
   there is exactly ONE prototype in the repo (at the path `globals.css`
   already cites for tokens).
2. **Do not** keep both copies or add this at a second path — that's how a
   visual-diff ends up against the wrong version.
3. **Reconcile the two sibling references** (low priority, doc-only):
   - `docs/design/2026-redesign/README.md` — file list / description may name
     the old files; update if you touch it.
   - `src/app/globals.css` — the token comment cites
     `…/prototype/prototype.css :root block`. The path stays valid after
     overwrite; just confirm the `:root` tokens still match (they should —
     this package's tokens are the source of truth).

Full detail: `STALE_PROTOTYPE.md` in this folder.

---

I have a complete, working front-end implementation for the Voter Choice
2026 redesign at `docs/design/2026-redesign/prototype/`. **This is the
visual + behavioral spec, not design inspiration.** The component files,
names, prop shapes, data shapes, state machines, and copy are all final and
correct. Your job is to **port** this design into the repo's TypeScript /
Next.js / Tailwind conventions (see the REPO REALITY CHECK above), not to
reinterpret or redesign it.

### What "port" means

- ✅ JSX → TSX (add explicit prop types using `src/lib/structured-blocks.ts` interfaces).
- ✅ Express the prototype's visuals in the repo's **Tailwind token utilities** (`bg-civic`, `text-ink-2`, `border-rule`, …) — matching the pixel/color/spacing spec, NOT copying `prototype.css`.
- ✅ Reuse the `ui/` primitives (`Button`, `Badge`, `Card`, `Notice`, `TextInput`) instead of hand-rolling.
- ✅ Swap mock literals for real fetches (`STATE_ELECTION_DATA` → `getStateData('TX')`, etc.) + existing libs (`formatCurrencyShort`, `downloadProfileAsText`, BYOK helpers).
- ✅ Translate i18n to `useLanguage()` + `translations[lang]` dot-access; add new keys to `translations.ts`.
- ✅ Strip the prototype's `useStateV` / `useStateC` prefixes back to `useState` (they were Babel-scope workarounds).
- ✅ Replace `Object.assign(window, { ... })` exports with ES module exports.
- ✅ Strip demo triggers (input-pattern guards) and route the real HTTP status codes from the existing API routes.

### What "port" does NOT mean

- ❌ Don't rewrite components in your own style "to match the repo better."
  The prototype's component naming, prop signatures, JSX structure, and
  visual result ARE the target. The repo conforms to them.
- ❌ Don't simplify the JSX or "improve" the structure. If `CandidateCard`
  composes `CandidateCardHeader` + `AlignmentScoreBanner` + `FunderBars` +
  the Money-trail disclosure, keep that exact composition. Each maps to a
  separate file.
- ❌ Don't rewrite the copy. The user-facing strings have been edited
  through dozens of review rounds. Treat them as final.
- ❌ Don't reproduce the prototype's CSS files. The prototype ships
  `prototype.css` + `prototype-c.css` purely as the **visual spec** — they
  are NOT meant to be copied into the repo. The repo styles with Tailwind v4
  token utilities (see REPO REALITY CHECK §1). Read a value from the
  prototype CSS, then express it with the matching utility (`bg-paper`,
  `text-ink-2`, `border-rule`, `font-serif`, …). Do not introduce the
  prototype's semantic class names (`.cv2-card`, `.poll-bar`, `.theme-row`).
- ❌ Don't invent a parallel styling system. The repo's Tailwind-token
  pattern wins. Match the prototype's pixels/colors/spacing through it.
- ❌ Don't skip the "Pass C" surfaces (polling, settings, BYOK, error
  states, EN/ES, About, Methodology, Privacy, How-it-works, ResumeNudge).
  These are not optional polish — they are the redesign.

**Failure mode to avoid:** a previous handoff lost over a week to
Claude Code treating the HTML as "design inspiration" and recreating its own
version. Don't do that. When in doubt, re-read the prototype source. The
answer is always in the JSX.

---

## Before doing any work, read these in order

1. `docs/design/2026-redesign/prototype/HANDOFF.md` — overview, file
   inventory, recommended porting phases, and what's explicitly out of scope.
2. `docs/design/2026-redesign/prototype/COMPONENT_MAP.md` — **the portability
   contract.** Every prototype component → repo file path. Every data field
   → TypeScript interface. Every translation key delta. Every demo trigger
   to strip. **This is the source of truth.** If COMPONENT_MAP.md says a
   prototype component maps to `src/components/Foo.tsx`, that's where it
   goes — no second-guessing.
3. `docs/design/2026-redesign/prototype/Voter Choice Prototype.html` — open
   in a browser. This is the running implementation. Every visual, every
   interaction, every state transition is the target. When you're done with
   a component, the repo should look + behave identically on the same state.

---

## Your task

Port the prototype to this repo's `src/` tree, in the phase order described
in `HANDOFF.md` (§ "Porting order"):

**Phase 0 — Types first.** Add the design-delta fields listed in
COMPONENT_MAP.md §3 to `src/lib/structured-blocks.ts` and update the matching
sanitizers (`sanitizeContributingVote`, `sanitizeDonorCoalition`, etc.). Run
`pnpm test src/lib/structured-blocks.test.ts` — it must stay green. Also
update `src/lib/canonicalIssues.ts` to add `congressional_accountability`
per COMPONENT_MAP.md §4.

**Phase 1 — Translations.** Merge the new translation keys from
`prototype-i18n.jsx → TRANSLATIONS` into `src/lib/translations.ts`. Keys are
enumerated in COMPONENT_MAP.md §8. Additive merge only — do not overwrite
existing strings. EN copy is the canonical baseline; ES copy in the
prototype is a starting point that can be reviewed.

**Phase 2 — Update existing components.** Bring the in-repo
`AlignmentScoreBanner.tsx`, `AlignmentDrilldown.tsx`, `FunderBars.tsx`,
`BallotPane.tsx`, and `Navigation.tsx` to match the prototype's design.
These render data that already flows through the app, so this is mostly a
JSX + Tailwind/CSS update against existing TypeScript types.

**Phase 3 — Create new components.** Create the files COMPONENT_MAP.md §2
marks `_(new — recommended …)_`:

- `src/components/CandidateCard.tsx`
- `src/components/CandidateCardHeader.tsx`
- `src/components/PollingStatusBar.tsx`
- `src/components/PollingInfoCard.tsx`
- `src/components/DeadlineMeter.tsx`
- `src/components/ResumeNudge.tsx`
- `src/components/HowItWorksWalkthrough.tsx`
- `src/components/SettingsPanel.tsx`
- `src/components/AmendmentEditor.tsx`
- `src/components/CompareModal.tsx`
- `src/components/AllVotesPanel.tsx`
- `src/components/GeocodeFailNotice.tsx`
- `src/components/AITimeoutBanner.tsx`
- `src/components/ErrorBanner.tsx`
- `src/components/PrintBallot.tsx`
- `src/components/LoadingView.tsx`
- `src/components/ProfileResumeModal.tsx`

For each: copy the prototype JSX, replace `useStateV` / `useStateC` / etc.
prefixes with plain `useState`, add explicit `Props` types using the
existing interfaces named in COMPONENT_MAP.md, and replace mock data with
real fetches (`getStateData`, `getDeadlineStatus`, `getTodayInLatestUsZone`,
`anthropic-client-byok` are already in `src/lib/`).

**Phase 4 — New pages.** Create:
- `src/app/about/page.tsx` (from `prototype-screens-c.jsx → AboutPage`)
- `src/app/methodology/page.tsx` (from `prototype-screens-c.jsx → MethodologyPage`)

For `src/app/privacy/page.tsx`, the prototype text is a careful rewrite —
diff against the existing repo file and merge improvements, but don't
overwrite repo policy language without review.

**Phase 5 — Strip demo triggers.** The prototype's `handleSubmitAddress`
and `handleSendChat` in `prototype-app.jsx` have input-pattern guards that
fake error states for demo purposes:

| Trigger | What it fakes |
|---|---|
| Address < 6 chars (not a ZIP) | Geocode failure |
| Address contains "rural" / "noballot" | No-contested-races |
| Chat message contains "timeout" / "fail" / "error" | AI timeout |

In the repo, route these through real HTTP status codes from `/api/civic`
(geocode + contested-races) and `/api/chat` (timeout). Remove the
input-pattern guards entirely.

**Phase 6 — Save profile (.txt) + print.** These are **already implemented**
in `src/lib/ballot-utils.ts` (`downloadProfileAsText`, `openPrintableBallot`,
`extractBallot`, `extractVoterProfile`). The prototype stubs them with
`alert()` only because it has no repo libs. Wire the prototype's buttons to
the existing utils — do NOT build new download/print logic.

**Phase 7 — Tests.** After each type change, run
`pnpm test src/lib/structured-blocks.test.ts`. After each component port,
add a smoke test that renders the component with a fixture and asserts
the key visible text + interactive element is present. Pattern: see
existing `*.test.tsx` files.

---

## Conventions to maintain

- **The prototype's component names, file structure, and CSS class names
  ARE the target.** Don't rename, don't restructure, don't substitute.
  If `prototype-components.jsx` has `CandidateCard`, the repo gets
  `src/components/CandidateCard.tsx` with the same prop interface, the
  same JSX structure, and the same className strings. The repo conforms
  to the prototype — not the other way around.
- **TypeScript types are mandatory.** The prototype is plain JSX. Add
  explicit prop types using interfaces from `src/lib/structured-blocks.ts`
  and `src/types/election.ts`. COMPONENT_MAP.md §3 tells you which
  interface goes where. Don't invent new interfaces — use the existing ones.
- **Express visuals in Tailwind token utilities, not a copied stylesheet.**
  `prototype.css` + `prototype-c.css` are the visual spec only. The repo's
  `globals.css` already defines the tokens as utilities (`bg-paper`,
  `text-ink-2`, `border-rule`, `bg-civic`, `font-serif`, …). Read the value
  from the prototype CSS, render it with the utility. Don't copy the
  stylesheets; don't introduce `.cv2-*` / `.poll-*` class names. Reuse the
  `ui/` primitives where they fit.
- **Don't rewrite copy.** User-facing strings are final.
- **Don't break existing repo conventions where they exist.** If a repo
  file already exists (e.g. `LanguageToggle.tsx`, `BallotLookupNeeded.tsx`,
  `privacy/page.tsx`), match the prototype's intent without overwriting
  conventions the repo already established. COMPONENT_MAP.md §2 flags
  which files are new vs. already shipped.
- **Server-only logic stays server-only.** The Anthropic key (community
  budget) and Civic API key are server-side env vars — they should not be
  bundled to the client. BYOK is the only client-side key path, and it
  goes directly from browser → `api.anthropic.com` without touching the
  server (see `src/lib/anthropic-client-byok.ts` — already in repo).
- **i18n uses `useLanguage()` + `translations[lang]` dot-access.** There is
  no `t()` helper in this repo. Get language state from `useLanguage()`
  (`src/lib/i18n.tsx`), pull copy as `const t = translations[lang];
  t.section.key` (`src/lib/translations.ts`). Translate the prototype's
  `t('section.key')` call sites to dot-access and add new keys to the
  `Translations` interface. New keys are listed in COMPONENT_MAP.md §8.

---

## Checking your work

- Open the prototype HTML side-by-side with the running repo dev server.
  They should be visually + behaviorally identical when looking at the same
  state (same address, same issues, same race selected).
- The repo's existing `structured-blocks.test.ts` is comprehensive — it
  will catch any sanitizer that drops a new field.
- Manually walk through the flows listed in COMPONENT_MAP.md §5
  (the "Interactions covered" table). Every ✅ in that table should still
  be ✅ after the port.

---

## When you get stuck

If COMPONENT_MAP.md doesn't answer a "where does X go" question, surface it
to me with a specific reference to which prototype file + line + which repo
file you're considering. Don't guess on component placement — the design
was built specifically against the repo's file structure, so there's a
correct answer for every file.

Start with Phase 0 and confirm tests pass before moving to Phase 1.
