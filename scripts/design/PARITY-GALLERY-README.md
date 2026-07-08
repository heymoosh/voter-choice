# Keystone parity gallery

Phase 4 of `docs/operations/keystone-design-source-plan-2026-07.md` — the
standing before/after review artifact for every "match the Keystone design"
change. Produces one HTML page: one row per canvas artboard (28, per
`.keystone-canvas-refs/manifest.json`), three screenshots per row — the
canvas reference PNG, the app **before** your change, the app **after** —
at 1180px content width, with a "changed in this PR" badge. Replaces ad-hoc
contact sheets (`~/.claude/skills/orchestrate-pipeline/scripts/capture-contact-sheet.sh`)
for anything design-review-shaped.

## Run it

```bash
# Compare the current branch against origin/main (the common case):
npm run design:parity-gallery -- --before origin/main --after HEAD

# Compare two refs by name (a temp git worktree + dev server is spun up for
# whichever side isn't already your current checkout):
npm run design:parity-gallery -- --before main --after my-feature-branch

# Already have two dev servers running (e.g. iterating on the gallery
# itself)? Skip the worktree/server bring-up entirely:
npm run design:parity-gallery -- --before-url http://localhost:3100 --after-url http://localhost:3101

# Iterate on one or two scenarios instead of all 28:
npm run design:parity-gallery -- --only 02a-results-main,05b-headtohead
```

Then open `scripts/design/.parity-gallery-out/index.html` (or whatever
`--out` you passed) in a browser.

`--before`/`--after` default to `origin/main` / `HEAD` — i.e. running with no
flags at all reviews your current branch against main.

### What it needs

- `npm install` already run in this worktree (Playwright's Chromium must be
  installed too — `npx playwright install chromium` if `npx playwright test`
  has never been run here).
- Nothing else. Every scenario drives the app entirely over Playwright's
  network mocks (`page.route`, same seam as `e2e/helpers/redesign-mocks.ts`)
  — no database, no `.env.local` secrets, no real API calls.

### How the before/after comparison actually works

Refs are captured **sequentially against one dev server at a time** — not two
servers running concurrently. Concretely:

1. Resolve `--before`/`--after` to commit SHAs.
2. If they're the **same commit**, start exactly one `next dev` (in the
   current worktree if that's what HEAD already is — no checkout at all) and
   use it for both sides. This is what makes the `main`-vs-`main` smoke test
   fast and trivial.
3. Otherwise, for each side that differs from the current worktree's HEAD:
   `git worktree add --detach <tmp> <sha>`, symlink `node_modules` from this
   worktree (no reinstall — fine for a same-repo before/after comparison
   where deps rarely move across a design PR), copy `.env.local` if present,
   boot `next dev --turbopack -p <port>`, capture, then tear the worktree down.

Running two servers one at a time (rather than concurrently) trades some
wall-clock time for a much smaller surface of things that can break — no
port/env coordination, no double memory footprint. This isn't a CI-blocking
tool, so that trade is worth it. Use `--before-url`/`--after-url` if you want
to pre-boot both sides yourself and skip the wait.

Screenshots are full-page (`page.screenshot({ fullPage: true })`) at a 1180px
viewport width, matching the canvas's own artboards — the export in
`design-handoff/keystone-canvas/export-raw.md` renders every `<DCArtboard>`
at `width={1180}`.

### "Changed in this PR" badge

`git diff --name-only <before-sha> <after-sha>` (**two-dot**, a direct
before/after content diff — not three-dot/merge-base, which can mis-attribute
a sibling PR's already-landed change on `before` to this comparison) is
cross-referenced against a per-artboard file list built from
`design-handoff/keystone-canvas/HANDOFF-EXACT-MATCH.md` §4's file map. The
mapping is a heuristic (which source files plausibly render this surface),
not a guarantee — refine `files: [...]` in
`scripts/design/parity-gallery-scenarios.ts` as gaps turn up.

## Coverage — 21/28 fully automated, 6/28 documented proxy, 1/28 not automatable

Every one of the 28 manifest entries has a scenario in
`scripts/design/parity-gallery-scenarios.ts` — nothing is silently dropped.
Each carries an `automatable` flag and a `note` explaining any gap; the
gallery itself renders that note + a `yes` / `proxy` / `no` tag on every row.

**Fully automated (21)** — reach the exact intended state via a scripted
interaction sequence, reusing `e2e/helpers/redesign-mocks.ts`'s network seams:
`01-orientation-activated`, `02a-results-main`, `02b-results-funding-expanded`,
`02c-results-votes-drilldown`, `02d-results-allvotes-sheet`, `04-scorecard`,
`05a-candidates-parity`, `05b-headtohead`, `06-homehero`, `07-whynow`,
`08a-about`, `08b-howitworks`, `08c-privacy`, `08d-tipjar`, `08e-loading`,
`09a-intake-ask`, `09b-intake-propose`, `09d-edit-issues`, `09e-edit-rescored`,
`10c-polis-report-consensus`. (`09c-intake-locked` is a documented proxy —
see below — bringing the strict "yes" count to 20; see the per-row notes for
the exact line.)

**Documented proxy (6)** — a real, reachable app state is captured, but it
isn't pixel-equivalent to the canvas's specific sub-state, because the
underlying feature isn't fully built yet. These are **product gaps**, not
tooling gaps — confirmed by reading the actual component source, not assumed:

- `03-color-bold-flag` — the canvas artboard is a trimmed palette-demo card
  with no app equivalent; proxy = the results workspace screenshot, where the
  Bold Flag tokens are actually applied live.
- `09c-intake-locked` — the canvas's distinct pre-lock confirmation state
  (green "issues are set" banner, drag-to-rerank) isn't built; proxy = the
  same running-issues UI one turn further along, right before Lock.
- `10a-polis-entry` — the dedicated entry/invite screen with a preview
  scatter was removed per `e2e/redesign-core.spec.ts`'s own comment ("the see
  where you stand teaser was removed [P1]"); proxy = the completed workspace
  showing the `.all-done` "where you stand" link that replaced it.
- `10d-polis-report-divided` — `PolisClose.tsx` has no computed
  divided/split branch at all (only an early-days-vs-normal lede gated on
  sample size); proxy = a bridges mock with one low-agreement statement
  instead of several strong ones, inside the UI that actually exists.
- `11a-fieldmoneygap` — the canvas's whole-field (3+ candidate) scale isn't
  wired: `RepCard.tsx` calls `<MoneyGapScale subject=... peer=...>` with no
  `field` prop, so only ever a single-subject scale renders. Proxy = that
  single-subject scale, populated via a `chamberMedian` mock (the e2e
  fixtures never set one, so without this mock the scale renders nothing).
- `11b-scalestates` — the canvas artboard is a style-guide enumeration of 4
  states + the collapsed chip side by side; the real app only ever shows
  whichever single band the data produces. Proxy = the one populated state
  our mock produces (`above median`).
- `11c-moneygaph2h` — confirmed by `grep`: `MoneyGapH2H` (exported from
  `MoneyGap.tsx`) has zero usages outside `MoneyGap.tsx`/`MoneyGap.test.tsx`.
  It is not wired into `HeadToHead.tsx` at all; the duel screen's real money
  treatment is a simpler PAC-percentage footnote. Proxy = the same
  `05b-headtohead` screenshot, so the gap is visible instead of hidden.

(That's 7 items listed because `09c` and `11a`/`11b` above are proxies too —
28 total = 20 clean "yes" + 7 proxy + 1 "no"; the summary line the tool itself
prints after each run is the authoritative count.)

**Not automatable (1)**:

- `10b-polis-contribute` — no blind agree/disagree/pass voting UI exists
  anywhere in the codebase. Read `src/prototype/redesign/PolisClose.tsx` in
  full and grepped the repo for `Agree`/`Disagree`/`Pass`/`PolisStand`-style
  markup: the current Polis feature is a passive aggregate **report** only
  (opinion-map cloud + common-ground bridges), fed by server-side counters.
  This is a missing feature, not a missing test hook — capturing anything
  here would misrepresent the app, so the gallery renders an explicit
  "not automatable" cell instead of a screenshot.

## Smoke test

```bash
npm run design:parity-gallery -- --before origin/main --after HEAD
```

On a clean worktree at the tip of `origin/main` this resolves both refs to
the same commit, boots exactly one server, and produces a gallery with **zero
"changed in this PR" badges** and all 27 automatable screenshots present
(the 28th, `10b`, always renders its "not automatable" placeholder). That's
the baseline proof the tool works end to end before trusting it on a real PR.

## Extending it

Add or edit an entry in `SCENARIOS` (`scripts/design/parity-gallery-scenarios.ts`):

```ts
{
  id: "12-new-artboard",
  refFile: "12-new-artboard.png",       // must exist under .keystone-canvas-refs/
  label: "Human-readable label",
  files: ["src/prototype/redesign/Whatever.tsx"], // change-detection file map
  automatable: "yes",                    // "yes" | "proxy" | "no"
  note: "...",
  async capture(page) { /* drive the app to that state */ },
}
```

`capture()` receives a fresh `Page` (fresh context, fresh mocks) per run —
navigate/interact until the target state is on screen; the runner takes the
screenshot immediately after `capture()` resolves. Leave `capture` undefined
and set `automatable: "no"` for a genuinely unreachable state — the gallery
will render the `note` instead of a blank/misleading screenshot.
