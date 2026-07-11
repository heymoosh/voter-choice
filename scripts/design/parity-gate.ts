#!/usr/bin/env node
// scripts/design/parity-gate.ts
//
// Phase 5 of docs/operations/keystone-design-source-plan-2026-07.md — the
// parity gate that becomes the definition-of-done on every Keystone design
// card. Design cards' goal condition changes from "match the canvas" prose
// to "diff <= threshold vs ref NN-*.png". Two checks per artboard:
//
//   (a) STRUCTURAL — two probe kinds, both defined in STRUCTURAL_PROBES below:
//         (a1) class-diff: the rendered DOM's class set at a known root
//              selector vs. the literal classes the design source
//              (design-handoff/keystone-canvas/src/ or design-handoff/
//              design-session/) uses for the matching component. Flags
//              missing (gate-failing) and extra (informational) classes.
//              Only applies where the repo component is a confirmed literal
//              port of the design source's own class vocabulary.
//         (a2) marker: for scenarios where a class-diff genuinely can't apply
//              (the repo component uses its own, unrelated class vocabulary —
//              zero literal overlap with the design source), checks the
//              REPO's own real selectors for specific structural markers the
//              design intends (e.g. "does a distinct provenance badge
//              exist"), instead of diffing against design-source classes.
//       Only defined for scenarios wired into STRUCTURAL_PROBES below — see
//       that block's comment for why most of the 27 parity-gallery scenarios
//       don't have one yet (STRUCTURAL_WAIVERS covers those explicitly).
//
//   (b) VISUAL — pixel-diff of the scenario's screenshot against its ref PNG
//       in .keystone-canvas-refs/, with a COPY-TOLERANT ratio threshold: both
//       images are downscaled to a common small width before diffing (see
//       "why downscale" below), then compared with the anti-aliasing-aware
//       pixelmatch algorithm @playwright/test already vendors (no new
//       dependency — see "reusing playwright's own comparator" below).
//
//   (c) CONTENT — verbatim substring assertions (CONTENT_PROBES below) that
//       specific canvas copy actually appears in the rendered page's text.
//       Neither (a) nor (b) can catch wrong-but-similarly-shaped copy: a
//       structural probe only checks that a selector/class exists, not what
//       text it contains, and the visual diff is deliberately downscaled to
//       be copy-tolerant (see "why downscale" below) — it exists to ignore
//       exactly this kind of difference. Confirmed 2026-07-09: a real fix
//       shipped a page (tip jar) with a missing subtitle and a mutated
//       closing paragraph, and both (a) and (b) passed it. Independent,
//       parallel registry — like (b), it doesn't touch STRUCTURAL_PROBES.
//
// Usage:
//   npm run design:parity-gate -- --only 02a-results-main,02b-results-funding-expanded
//   npm run design:parity-gate -- --all
//   npm run design:parity-gate -- --only 01-orientation-activated --threshold 0.1
//   npm run design:parity-gate -- --url http://localhost:3100   (skip server bring-up)
//
// Exit code: 0 iff every ran check (structural + visual) on every requested
// scenario passed. Non-zero otherwise, with a report explaining exactly
// which artboard failed which check and by how much.
//
// ---------------------------------------------------------------------------
// Why crop, then downscale, before pixel-diffing
// ---------------------------------------------------------------------------
// The ref PNGs in .keystone-canvas-refs/ are screenshots of the canvas's own
// review LIGHTBOX (1600x1100, per `file` on any of them) — a scaled-to-fit
// render of the artboard sitting inside a dimmed backdrop with an annotation
// bar, caption, and nav arrows around it, NOT a 1:1 pixel crop of just the
// artboard (confirmed by eye — see detectContentBBox's doc comment for exact
// pixel coordinates on one example). Diffing that raw lightbox frame against
// the app's tightly-cropped full-page screenshot compares mostly dark
// backdrop against real app background — a huge diff from framing alone,
// independent of whether the port is faithful (observed ratios of 0.27-0.43
// even on confirmed-clean sections before this crop step was added). So the
// ref is first auto-cropped to its light "content card" bounding box
// (detectContentBBox), and only then downscaled alongside the app screenshot.
//
// The app screenshots are captured full-page at a 1180px viewport, so their
// height still varies with real content length (actual candidate names/vote
// counts are longer or shorter than the canvas's fictional data) even after
// the ref crop. Downscaling both images to one common, modest width (see
// DOWNSCALE_WIDTH) before diffing does two things at once: it removes most of
// the remaining scale mismatch (both are compared at the same effective
// resolution), and it naturally blurs small text/anti-aliasing differences
// together — the practical realization of a "copy-tolerant" diff without
// building a text-node-masking system (infeasible here anyway: the ref is a
// flat PNG with no DOM/text metadata to mask against). Big structural/color/
// layout drift (missing sections, wrong palette, wrong panel arrangement)
// still shows up clearly at low resolution; a renamed word or a different
// dollar figure mostly doesn't. This is deliberately the coarser of the two
// checks the plan doc calls out ("use a copy-tolerant threshold") — check (a)
// above is what catches structural regressions precisely.
//
// ---------------------------------------------------------------------------
// Reusing playwright's own comparator (no new dependency)
// ---------------------------------------------------------------------------
// @playwright/test's own `expect(page).toHaveScreenshot()` is backed by a
// vendored copy of Mapbox's pixelmatch (node_modules/playwright-core/lib/
// third_party/pixelmatch.js) — the exact same anti-aliasing-aware algorithm
// the standalone `pixelmatch` npm package ships. It isn't part of
// playwright-core's public `exports` map, so it can't be imported by package
// specifier — this script resolves it by absolute file path instead (which
// bypasses the "exports" gate; that gate only restricts bare-specifier
// resolution, not direct-path requires). PNG decode/resize uses
// `@napi-rs/canvas`, already a normal `dependencies` entry in package.json
// (used elsewhere for PDF/OCR work) — no pngjs needed either.

import { chromium, type Page } from "@playwright/test";
import { createCanvas, loadImage, ImageData } from "@napi-rs/canvas";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { SCENARIOS, type Scenario } from "./parity-gallery-scenarios";
import { getFreePort, startNextDev, type AppInstance } from "./dev-server";

const require = createRequire(import.meta.url);

const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
const REFS_DIR = path.join(REPO_ROOT, ".keystone-canvas-refs");
const VIEWPORT = { width: 1180, height: 1000 };

/** Downscale width used for the visual diff (see file header). */
const DOWNSCALE_WIDTH = 480;
/** Default "copy-tolerant" threshold: fraction of the downscaled image's
 *  pixels allowed to differ (after AA-aware pixelmatch) before a scenario
 *  fails the visual check. Calibrated against a real run of the three probed
 *  scenarios post-crop-fix: confirmed-clean 02a/02b observed ~0.07, and even
 *  the confirmed-gap orientation scenario (bare div vs. the full ori-card
 *  layout) only observes ~0.05 at this coarse a resolution — same overall
 *  page chrome/colors dominate the downscaled diff regardless of the
 *  missing markup. That's expected and fine: this check is deliberately the
 *  coarse copy-tolerant one (see file header); it is NOT what's meant to
 *  catch orientation's gap — the STRUCTURAL check (a) is, and does (17
 *  missing classes, hard fail). 0.18 leaves real headroom above the ~0.07
 *  observed on genuine ports while still catching a scenario that renders
 *  visibly broken/blank (which pushes ratio well past that). */
const DEFAULT_MAX_DIFF_RATIO = 0.18;
/** pixelmatch's own per-pixel color-sensitivity (0-1, smaller = stricter).
 *  Slightly looser than pixelmatch's 0.1 default to tolerate the extra
 *  softening the downscale step introduces. */
const PIXELMATCH_THRESHOLD = 0.15;

// ---------------------------------------------------------------------------
// playwright-core internals reuse (pixelmatch)
// ---------------------------------------------------------------------------

type PixelmatchFn = (
  img1: Uint8ClampedArray | Uint8Array | Buffer,
  img2: Uint8ClampedArray | Uint8Array | Buffer,
  output: Uint8ClampedArray | Uint8Array | Buffer | null,
  width: number,
  height: number,
  options?: { threshold?: number; includeAA?: boolean },
) => number;

function loadPixelmatch(): PixelmatchFn {
  try {
    const pkgPath = require.resolve("playwright-core/package.json");
    const pixelmatchPath = path.join(
      path.dirname(pkgPath),
      "lib/third_party/pixelmatch.js",
    );
    return require(pixelmatchPath) as PixelmatchFn;
  } catch (err) {
    throw new Error(
      "Could not load playwright-core's vendored pixelmatch (internal path " +
        "lib/third_party/pixelmatch.js). This reuses @playwright/test's own " +
        "screenshot-diff dependency rather than adding a new one; if a " +
        "playwright-core upgrade moved the file, update the path here or " +
        "add the standalone `pixelmatch` package instead. Original error: " +
        String(err),
    );
  }
}

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

interface Args {
  only?: string[];
  url?: string;
  out: string;
  threshold: number;
  headed: boolean;
  keepServer: boolean;
}

function parseCliArgs(): Args {
  const { values } = parseArgs({
    options: {
      only: { type: "string" },
      all: { type: "boolean", default: false },
      url: { type: "string" },
      out: {
        type: "string",
        default: path.join(SCRIPT_DIR, ".parity-gate-out"),
      },
      threshold: { type: "string" },
      headed: { type: "boolean", default: false },
      "keep-server": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help) {
    console.log(
      [
        "Usage: npm run design:parity-gate -- [options]",
        "",
        "  --only <ids>       comma-separated scenario ids to gate (default: all with a ref/probe)",
        "  --all              explicit alias for the default (gate every automatable scenario)",
        "  --url <url>        use an already-running server instead of booting one on HEAD",
        "  --out <dir>        output directory for diff PNGs + JSON report",
        "  --threshold <n>    override the visual max-diff-pixel-ratio (default " +
          DEFAULT_MAX_DIFF_RATIO +
          ")",
        "  --headed           run the browser headed (debugging)",
        "  --keep-server      don't tear down the spawned dev server on exit",
      ].join("\n"),
    );
    process.exit(0);
  }
  return {
    only: values.only
      ? (values.only as string).split(",").map((s) => s.trim())
      : undefined,
    url: values.url as string | undefined,
    out: path.resolve(values.out as string),
    threshold: values.threshold
      ? Number(values.threshold)
      : DEFAULT_MAX_DIFF_RATIO,
    headed: values.headed as boolean,
    keepServer: values["keep-server"] as boolean,
  };
}

// ---------------------------------------------------------------------------
// (a) STRUCTURAL check
// ---------------------------------------------------------------------------

type ProbeKind = "class-diff" | "marker";

/** (a1) Literal design-source class-diff probe — see file header (a1). */
interface ClassDiffProbe {
  kind: "class-diff";
  /** Which SCENARIOS[].id this probe rides along with (reuses its capture()). */
  scenarioId: string;
  /** CSS selector for the root of the surface being checked in the rendered app. */
  domSelector: string;
  /** Repo-relative path to the design source file. */
  designFile: string;
  /** Top-level `function Name(...) { ... }` component in that file whose
   *  literal classNames are the spec for domSelector's subtree. When the
   *  design component's own root element carries a *different* class than
   *  domSelector's token (e.g. it's nested inside page chrome, or is one of
   *  several sibling elements in the function), classes are narrowed to the
   *  JSX subtree(s) rooted at an element literally carrying domSelector's
   *  class token — see extractJsxSlicesByClass. */
  componentName: string;
  /**
   * Design classes to report as missing but NOT gate-failing: genuine
   * state-variant siblings of a class this scenario's mock never reaches
   * (e.g. an early-return empty state). Each entry must be commented at its
   * call site with why — this is an explicit, auditable exemption, not a
   * heuristic, and should stay short.
   */
  ignoreMissing?: string[];
  note: string;
}

/** (a2) Repo-real structural-marker probe — see file header (a2). Used where
 *  a class-diff genuinely can't apply because the repo component was built
 *  (or renamed) with its own class vocabulary, zero literal overlap with the
 *  design source (the same condition STRUCTURAL_WAIVERS documents for
 *  surfaces with no probe at all). Instead of diffing against the design
 *  source's classes, each marker checks one concrete, present-or-absent
 *  structural fact about the REPO's own rendered DOM — named in `description`
 *  for the report, not a class-name lookup against the canvas.
 *
 *  Correctness bar (Muxin, STOP-SHIP 2026-07-09): at least one marker per
 *  probe must genuinely FAIL against today's unfixed app — that's the honest
 *  signal that the probe measures something real instead of decorating a
 *  scenario that would pass regardless — and each should be written so it
 *  flips to PASS once the corresponding FE gap actually closes.
 */
interface MarkerProbe {
  kind: "marker";
  scenarioId: string;
  markers: {
    /** CSS selector checked against the LIVE rendered app — the repo's own
     *  real selectors/classes/testids, never a design-source class. */
    selector: string;
    /** What finding this selector present-or-absent proves; shown in the
     *  report in place of a class name. */
    description: string;
  }[];
  note: string;
}

type Probe = ClassDiffProbe | MarkerProbe;

/**
 * Curated, not exhaustive. Most of the 27 parity-gallery scenarios render
 * through components that predate this Keystone pass and use their own
 * established class-naming convention (RepCard.tsx's `cv2-*` prefix, for
 * instance) rather than the design source's literal classes — confirmed by
 * grep, not assumed: `.rcard`/`.align-band`/`.money-line` etc. from
 * keystone-canvas/src/screens-results.jsx appear NOWHERE in RepCard.tsx.
 * HANDOFF-EXACT-MATCH.md §2 itself only ever claims functional/behavioral
 * equivalence for that surface ("Confirmed correct: one visible panel..."),
 * never a literal class-name port — so asserting literal-class equality
 * there would be checking something nobody ever committed to, not a real
 * regression signal.
 *
 * Two places in the app WERE built as a confirmed, literal, verbatim port —
 * both documented in the source itself:
 *   - MoneyGap.tsx's own docstring: "ported from the reviewed design
 *     (claude-code-handoff/design-session/screens-funding.jsx + funding.css)"
 *   - Its class names (`mgap`, `mgap-row`, `mgap-axis`, `median-chip`, ...)
 *     match design-session/screens-funding.jsx almost token-for-token.
 * Those give the genuine "already-clean" structural probes below. Orientation
 * gives the genuine known-gap probe: HANDOFF-EXACT-MATCH.md §1 documents,
 * in prose, that OrientationView is "a bare <div className='coldopen
 * orientation'>" with none of OrientationActivated's flagbar/ori-card/
 * ori-step markup — confirmed unchanged by reading App2.tsx directly.
 *
 * Extending this list for a new design card: add an entry once you know
 * which repo component is the confirmed literal port target for that
 * surface (check the file's own docstring/comments first, the way
 * MoneyGap.tsx documents its own provenance) — don't guess a mapping onto a
 * component that was only ever asked to be functionally equivalent.
 */
const STRUCTURAL_PROBES: Probe[] = [
  {
    kind: "class-diff",
    scenarioId: "01-orientation-activated",
    domSelector: ".orientation",
    designFile: "design-handoff/keystone-canvas/src/screens-orientation.jsx",
    componentName: "OrientationActivated",
    note:
      "Confirmed gap, HANDOFF-EXACT-MATCH.md §1: OrientationView (App2.tsx) still renders a " +
      "bare div — none of the flagbar/ori-card/ori-step/ori-cta structure has been ported yet.",
  },
  {
    kind: "class-diff",
    scenarioId: "02a-results-main",
    domSelector: ".median-chip",
    designFile: "design-handoff/design-session/screens-funding.jsx",
    componentName: "MedianChip",
    // "none" is MedianChip's own early-return branch — `raised == null` ⇒
    // `className="median-chip none"` — a genuine state-variant sibling this
    // scenario's mock never reaches (mockSeatRaceDataMedian always sets a
    // populated totalRaised). Confirmed by reading screens-funding.jsx's
    // MedianChip directly, not assumed.
    ignoreMissing: ["none"],
    note:
      "The collapsed money-gap glance, always visible on the card's funding summary line " +
      "(RepCard.tsx renders <MedianChip> outside the disclosure body) — a confirmed verbatim " +
      "port per MoneyGap.tsx's own docstring.",
  },
  {
    kind: "class-diff",
    scenarioId: "02b-results-funding-expanded",
    domSelector: ".mgap",
    designFile: "design-handoff/design-session/screens-funding.jsx",
    componentName: "FieldMoneyGap",
    note:
      "The full money-gap scale (MedianAxis + GapRow rows + legend) rendered inside the " +
      "expanded funding disclosure — a confirmed verbatim port per MoneyGap.tsx's own " +
      "docstring. FieldMoneyGap is the design source's fullest '.mgap' definition (shared by " +
      "MoneyGapH2H too); its one known non-match is 'mgap-src' vs. the design's 'fund-src' " +
      "(which lives outside .mgap in the page chrome there) — reported as an extra, not a gap.",
  },
  {
    kind: "class-diff",
    scenarioId: "02d-results-allvotes-sheet",
    domSelector: ".avsheet",
    designFile: "design-handoff/keystone-canvas/src/screens-results.jsx",
    componentName: "AllVotesSheet",
    // Fixed 2026-07-10 (02d-results-allvotes-sheet rebuild): AllVotesPanel now
    // literally carries the canvas's own "avsheet" root class (dual-classed
    // with the legacy "av-panel" other e2e coverage still selects on), so this
    // probe narrows to AllVotesSheet's own <div className="avsheet"> subtree —
    // the same narrowing MedianChip/FieldMoneyGap's probes already rely on —
    // instead of falling back to the whole component slice. That narrowing
    // correctly excludes "avsheet-scrim" (the *parent* wrapper in the design
    // source, never a descendant of .avsheet, so a root-down DOM walk rooted
    // at .avsheet could never find it either) — reporting it "missing" before
    // was a probe artifact, not a real gap.
    ignoreMissing: [
      // "against"/avr-flag.against/avr-cast.nay are genuine ternary siblings
      // of "with" (className={... + (v.voteCast === 'with' ? 'with' : 'against')})
      // — same category as HeadToHead's "up" and MedianChip's "none" above.
      // This scenario's fixture (mockSeatRaceDataMedian) only ever produces a
      // "with" vote for house-TX-37 (kept=5 > total/2=3); e2e/redesign-mocks.ts
      // has the same shape. Confirmed reachable by reading the conditional.
      "against",
      // avd-what renders v.narrative when present (the real CAN2026-sourced
      // explanatory paragraph — structured-blocks.ts's ContributingVote.narrative
      // is optional). mockSeatRaceDataMedian's contributingVotes entry has no
      // narrative field at all, so it never renders for this fixture; real
      // production votes commonly do carry one. Not shown unconditionally
      // because there's no honest fallback "what this bill does" text without
      // real narrative data — showing a placeholder would fabricate content.
      "avd-what",
    ],
    note:
      "Rebuilt 2026-07-10: AllVotesPanel now groups contributingVotes by issue " +
      "(av-group/av-glab/avg-name/avg-frac) with av-row/avr-flag/avr-bill/avr-cast/avr-date/" +
      "avr-chev rows and a single av-detail/avd-what/avd-meta/avd-pair/avd-link expansion " +
      "(defaulting to the first vote open, matching the canvas's HR 3421 default), replacing " +
      "the old flat always-expanded av-list/av-vote-* markup — resolves the structural " +
      "divergence Muxin flagged in docs/operations/keystone-parity-failure-handoff-2026-07-08.md. " +
      "Dual-classed with the legacy av-panel/av-filter/av-vote-tag/be-x/be-eyebrow/vote-badge " +
      "selectors so e2e/redesign-record.spec.ts and this probe's own capture-step wait " +
      '(".be-modal-overlay .av-panel") keep working; the new avsheet-scoped CSS in ' +
      "public/prototype.css overrides the legacy flat-list rules by specificity.",
  },
  {
    kind: "class-diff",
    scenarioId: "05b-headtohead",
    domSelector: ".cmp",
    designFile: "design-handoff/keystone-canvas/src/screens-candidates.jsx",
    componentName: "HeadToHead",
    // "up" is one of three mutually-exclusive ternary classes on the same
    // <span className={"arrow " + (d > 0 ? "up" : d < 0 ? "down" : "even")}>
    // element — verbatim-identical code on both sides (confirmed by reading
    // both files side by side), so the repo can and would render "up" given
    // a positive-delta ledger row; this scenario's fixture just never
    // produces one. Genuine unreached state-variant sibling, same category
    // as MedianChip's "none" above — not a structural gap. ("cmp-empty" is
    // the repo's own honest no-challengers-filed state, not a canvas class
    // at all — HeadToHead.tsx's docstring: "only the data bindings and the
    // honest empty states are new" — so it never appears as "missing" here
    // and needs no entry.)
    ignoreMissing: ["up"],
    note:
      "HeadToHead.tsx's own docstring: 'PORT of claude-code-handoff/design-session/" +
      "screens-candidates.jsx → the down-selected DIRECTION B (HeadToHead) ... markup/class " +
      "names are the design's' — the clearest documented verbatim-port precedent in the repo " +
      "alongside MoneyGap.tsx's.",
  },
  {
    kind: "class-diff",
    scenarioId: "08a-about",
    domSelector: ".sp-wrap",
    designFile: "design-handoff/keystone-canvas/src/screens-statics.jsx",
    componentName: "StaticPageVC",
    note:
      "The shared shell every static page (About/How it works/Privacy/Tip jar) renders " +
      "through — repo's StaticPage (VoterChoiceApp.tsx) reuses '.sp-wrap'/'.sp-back'/'.sp-mast' " +
      "literally. FIXED (wt/keystone-21-statics-shell): the class vocabulary inside sp-mast was " +
      "renamed to match the canvas verbatim — sp-eyebrow/sp-title/sp-dek/sp-article → " +
      "sp-kicker/(bare h1)/dek/sp-prose (public/prototype-c.css's base + per-page Bold Flag skin " +
      "blocks updated to match); sp-inner stays as an extra wrapper div the canvas doesn't have " +
      "(no design class check fails on it — extras never fail this probe kind). Probed once here " +
      "(rather than once per static-page scenario) since all four share this exact component; " +
      "see the STRUCTURAL_WAIVERS entries for 08b/08c cross-referencing this probe instead of " +
      "duplicating it (08d-tipjar now has its own marker probe below).",
  },
  {
    kind: "class-diff",
    scenarioId: "09e-edit-rescored",
    domSelector: ".ad-list",
    designFile: "design-handoff/keystone-canvas/src/screens-intake.jsx",
    componentName: "EditRescored",
    note:
      "IssueDeltaBanner.tsx's own docstring: 'the shipped AmendDeltaMessage visuals " +
      "(.amend-delta / .ad-* classes) over REAL deltas' — a confirmed verbatim port of " +
      "EditRescored's ad-list/ad-row/ad-race/ad-score/ad-revisit ledger, the same documented " +
      "precedent as MoneyGap.tsx and HeadToHead.tsx.",
  },
  {
    kind: "class-diff",
    scenarioId: "10a-polis-entry",
    domSelector: ".pe-screen",
    designFile: "design-handoff/keystone-canvas/src/screens-polis.jsx",
    componentName: "PolisEntry",
    // Root wrapper is renamed "screen" → "pe-screen" (confirmed by reading
    // both sides directly — screens-polis.jsx's PolisEntry root carries the
    // canvas's generic multi-artboard "screen" class; PolisEntry.tsx's own
    // docstring explains the rename: local --brand/--keep/--replace tokens
    // scoped to .pe-screen specifically, not the shared chrome class every
    // other canvas artboard also uses). Every other class is identical
    // (confirmed by a literal class-token diff of both PolisEntry function
    // bodies: zero mismatches beyond this one root rename).
    ignoreMissing: ["screen"],
    note:
      "PolisEntry.tsx's own docstring: 'PORT of design-handoff/keystone-canvas/src/screens-" +
      "polis.jsx → PolisEntry ... markup/class names are the design's' — SCNav swapped for " +
      "AppNav (the app's real nav, same substitution every other ported full screen makes) is " +
      "the only non-cosmetic delta; every pe-*/ps-*/flagbar/btn-primary/go/no/k/meta class is " +
      "verbatim. Landed via PR #237; this probe genuinely fails (selector not found at all, " +
      "every design class reported missing) on any tree that predates it, since PolisEntry.tsx " +
      'and its .pe-screen root don\'t exist there — App2.tsx has no stage==="polisEntry" branch ' +
      "and the workspace's completion link still jumps straight to the standing report.",
  },
  // ---------------------------------------------------------------------
  // Marker probes (a2) — added STOP-SHIP 2026-07-09 for the 3 surfaces
  // previously waived outright in STRUCTURAL_WAIVERS because their repo
  // components (RepCard.tsx's cv2-*, HomeView's hp-hero/addr-*, TipJarPage's
  // tip-*) share zero class-token overlap with the canvas source. A
  // class-diff probe would just re-find that same zero-overlap result, so
  // these check specific, named structural facts against the REPO's own
  // real selectors instead. Each one below was verified BEFORE being added
  // to genuinely fail against today's app (see the STOP-SHIP validation
  // report for the exact command run and output).
  // ---------------------------------------------------------------------
  {
    kind: "marker",
    scenarioId: "05a-candidates-parity",
    markers: [
      {
        selector: '[data-testid="web-search-alignment-banner"]',
        description:
          "renders the researched-alignment panel for a research-basis seat (the repo's " +
          "closest analog to a non-roll-call card)",
      },
      {
        selector: ".prov",
        description:
          "renders a distinct provenance badge (canvas's ProvBadge: 'Roll-call record' vs. " +
          '\'Researched · cited\', className="prov rollcall"/"prov researched") — HeadToHead.tsx ' +
          "already ports this exact badge (confirmed by reading it directly) but RepCard.tsx's " +
          "single-card view (the one this scenario captures) has zero '.prov' markup anywhere",
      },
    ],
    note:
      "RepCard.tsx (cv2-* prefix) shares zero class-token overlap with screens-candidates.jsx's " +
      "CandidateParity (cd-* prefix) — same non-literal-port situation as 02c-results-" +
      "votes-drilldown. The confirmed, checkable gap is the missing provenance badge: the " +
      "canvas's whole point for this artboard is 'one card, every seat' unified by a roll-call-" +
      "vs-researched badge (ProvBadge); the repo's single-card view has no equivalent element " +
      "at all, only a plain italic note for researched candidates.",
  },
  {
    kind: "marker",
    scenarioId: "06-homehero",
    markers: [
      {
        selector: ".hp-hero",
        description: "renders the homepage hero section at all",
      },
      {
        selector: ".addr-card",
        description:
          "renders the address-entry card (canvas's vh-addr equivalent)",
      },
      {
        selector: '[class*="preview"], [class*="vh-stack"]',
        description:
          "renders a second-column live preview panel ('What you'll get' scorecard stack) " +
          "alongside the address form — canvas's HomeHero is a two-column .vh-left/.vh-preview " +
          'layout; the repo\'s hero is explicitly single-column (className="hp-hero hp-hero-solo", ' +
          "confirmed by reading HomeView directly — no preview/stack markup exists anywhere)",
      },
    ],
    note:
      "HomeView (VoterChoiceApp.tsx) uses its own hp-hero/addr-*/eyebrow/lede vocabulary — " +
      "confirmed by a full class-token diff against screens-home.jsx's HomeHero (vh-* prefix): " +
      "zero overlap. The confirmed, checkable gap is structural, not just naming: the repo's " +
      "own 'hp-hero-solo' class name self-documents that the canvas's second-column live " +
      "scorecard preview was dropped, not merely renamed.",
  },
  {
    kind: "marker",
    scenarioId: "08d-tipjar",
    markers: [
      {
        selector: ".tip-list",
        description: "renders the tip-amount list at all",
      },
      {
        selector: ".tip-amount-btn",
        description: "renders individual tip-amount buttons",
      },
      {
        selector: ".tip-amount-btn.lead, .tip-amount-btn[data-lead]",
        description:
          "one amount is visually marked as the suggested/lead amount (canvas's TipJarVC " +
          'gives $5 className="sp-tip lead") — repo\'s TIP_AMOUNTS array (VoterChoiceApp.tsx) has ' +
          "no lead/suggested flag at all, confirmed by reading it directly: all four buttons " +
          "render identically",
      },
    ],
    note:
      "Renders the same shared StaticPage shell (sp-wrap/sp-back) probed via 08a-about, plus " +
      "TipJarPage's own tip-list/tip-amount-btn/tip-note markup with no matching canvas " +
      "TipJarVC vocabulary (sp-tip/sp-tips/sp-tipnote — a different prefix, zero overlap). The " +
      "confirmed, checkable gap is the missing lead-amount emphasis, not just the class rename.",
  },
];

/**
 * Scenarios with NO structural probe, and why. Every one of the 25 gateable
 * scenarios (all of SCENARIOS except 10b-polis-contribute/11a-fieldmoneygap/
 * 11b-scalestates, none of which are automatable at all — see each one's
 * own note in parity-gallery-scenarios.ts; 10a-polis-entry moved into
 * STRUCTURAL_PROBES below once PR #237 made it automatable) now resolves to
 * exactly one of STRUCTURAL_PROBES above (class-diff or marker) or this
 * map — silently skipping a scenario (the pre-existing "24 of 27 uncovered,
 * unexplained" state this file's own header used to describe) is exactly
 * the failure Phase 2 of docs/operations/keystone-fidelity-fix-plan-
 * 2026-07-08.md exists to close. STOP-SHIP 2026-07-09 moved 3 of these
 * (05a-candidates-parity/06-homehero/08d-tipjar) into STRUCTURAL_PROBES as
 * marker probes instead — a waiver on its own was a dead end for those
 * three (see reason (a) below): it correctly explained why a class-diff
 * can't apply, but left the surface with no structural check at all, only
 * the downscaled visual diff — exactly the gap that let those surfaces
 * false-pass.
 *
 * A waiver is NOT a pass and never silences the VISUAL check, which still
 * runs and gates every waived scenario same as any other — it only means
 * "no design-source class vocabulary survives to literal-diff against this
 * repo component," for one of two reasons, always stated explicitly below:
 *   (a) the repo component was built (or later renamed) with its own class
 *       convention rather than a verbatim port — confirmed by a full
 *       class-token diff between the design source and the repo file finding
 *       ~0 overlap, not assumed from a filename match; or
 *   (b) the scenario's capture() is a documented proxy that reuses another,
 *       already-probed scenario's exact DOM (see that scenario's own
 *       automatable:"proxy" note in parity-gallery-scenarios.ts) — probing it
 *       separately would just re-report the anchor probe's result under a
 *       different id, not add new signal.
 * Extending STRUCTURAL_PROBES later: if a waived surface gets rebuilt as a
 * literal port, move its entry from here into STRUCTURAL_PROBES rather than
 * leaving a stale waiver reason next to a probe that would now pass. If a
 * literal port genuinely can't apply (reason (a)) but the surface still has
 * no structural check, consider a marker probe instead of leaving it waived
 * — see MarkerProbe's doc comment above for the correctness bar.
 */
const STRUCTURAL_WAIVERS: Record<string, string> = {
  "02c-results-votes-drilldown":
    "RepCard.tsx's vote-drilldown markup uses its own cv2-drill/cv2-drill-head prefix — " +
    "confirmed by a full class-token diff against screens-results.jsx's align-band/align-row/" +
    "align-track/at-* tokens (zero overlap). HANDOFF-EXACT-MATCH.md §2 only ever claims " +
    "functional equivalence for RepCard, never a literal class port (the same reason 02a/02b's " +
    "probes above target MedianChip/FieldMoneyGap, not RepCard's own markup).",
  "03-color-bold-flag":
    "Proxy scenario (see parity-gallery-scenarios.ts) — its capture() is the same sequence as " +
    "02a-results-main's (mockSeatRaceDataMedian + setMoneyDisclosure(false)), so a probe here " +
    "would just re-report 02a's already-covered .median-chip result under a different id. The " +
    "canvas's own '03-color' artboard is a trimmed side-by-side palette-demo card with no " +
    "standalone repo surface to compare against anyway.",
  "04-scorecard":
    "ScorecardPrintView.tsx uses its own print-sheet/ballot-list/verdict-row/voter-meta-" +
    "logistics vocabulary — confirmed by a full class-token diff against screens-scorecard.jsx's " +
    "sheet/dec/dec-badge/sheet-mast/sheet-meta tokens (zero overlap). HANDOFF §4 only claims " +
    "structural/behavioral parity (decisions lead, percentage copy, non-2026 filter), never a " +
    "class port. Known real gap this can't localize by class-diffing alone: the 'Not on your " +
    "ballot this year' section has no repo equivalent — ScorecardPrintView.tsx:43-46 filters " +
    "non-2026 seats out entirely (Phase 0 finding #4, docs/operations/" +
    "keystone-phase0-findings-2026-07-08.md).",
  "07-whynow":
    "UPDATED 2026-07-10 (07-whynow build pass): WhyNowPage (VoterChoiceApp.tsx) was rebuilt as a " +
    "literal class-token port of screens-whynow.jsx's WhyNow content sections (wn-mast/wn-sec/" +
    "wn-h2/wn-cols/wn-body/wn-stats/wn-stat/wn-pull/wn-ballot/wn-steps/wn-step/wn-cta), so the " +
    "prior 'zero overlap' claim no longer holds for that vocabulary. Still waived rather than " +
    "promoted to a class-diff probe: canvas's WhyNow also renders its own page chrome (the " +
    "outer .screen/.wn wrapper, .flagbar, <SCNav/>) inside the same function, which this repo " +
    "deliberately does NOT replicate — App2.tsx's own AppNav already renders equivalent chrome " +
    "around every stage — so an accurate class-diff would need a hand-verified ignoreMissing " +
    "list for every chrome class SCNav itself renders (out of scope for this page-only fix; " +
    "see the 'Extending STRUCTURAL_PROBES later' note above for the promotion path). The visual " +
    "check still runs and gates this scenario same as any other; see also the 07-whynow " +
    "CONTENT_PROBES entry below for verbatim-copy assertions this waiver can't catch.",
  "08b-howitworks":
    "Renders the same shared StaticPage shell (sp-wrap/sp-back) probed via 08a-about — see " +
    "that probe's note. MethodologyPage's own body content sits outside the probed shell.",
  "08c-privacy":
    "Renders the same shared StaticPage shell (sp-wrap/sp-back) probed via 08a-about — see " +
    "that probe's note.",
  "08e-loading":
    "LoadingView (VoterChoiceApp.tsx) uses its own loading-screen/loading-card/pulse " +
    "vocabulary — confirmed by a full class-token diff against screens-statics.jsx's LoadingVC " +
    "(ldg-* prefix): zero overlap beyond the generic 'ck' checkmark token. Phase 0 already " +
    "confirmed the underlying checklist-timing behavior is correct; this waiver is about class " +
    "vocabulary only, not a behavioral gap.",
  "09a-intake-ask":
    "IssueConversation.tsx/IntakeView.tsx use their own co-*/msg/bubble/chip/send vocabulary — " +
    "confirmed by a full class-token diff against screens-intake.jsx's IqShell/IqMsg/IqRow/" +
    "IqComposer family (iq-* prefix): zero exact-token overlap (semantically similar names " +
    "like 'chip'/'iq-chip' don't count as a literal-class match, only identical tokens do).",
  "09b-intake-propose":
    "Same IssueConversation.tsx component as 09a-intake-ask — see that waiver's note.",
  "09c-intake-locked":
    "Same IssueConversation.tsx component as 09a-intake-ask — see that waiver's note.",
  "09d-edit-issues":
    "EditIssuesModal.tsx renamed the canvas's amd-* prefix (screens-intake.jsx's EditIssues) to " +
    "amend-*/amend-modal/amend-card — not an exact-token match, confirmed by a full class-token " +
    "diff (zero literal overlap). The one part of this flow that IS a confirmed verbatim port " +
    "(IssueDeltaBanner's ad-list ledger) is probed separately at 09e-edit-rescored, the scenario " +
    "where it actually renders.",
  "10c-polis-report-consensus":
    "PolisClose.tsx uses its own polis-*/overlap-*/bridge*/scatter* vocabulary — confirmed by a " +
    "full class-token diff against screens-polis.jsx's PolisReport (pr-* prefix): zero overlap. " +
    "The mock feeds real bridges + divided data (parity-gallery-scenarios.ts), and PolisClose.tsx " +
    "renders both the 'Common ground' and 'Where it split' sections live (computeDivided / " +
    "DIVIDED_MIN_SHARE=30, card e2455f56) — this superseded the held PR #240, which never " +
    "merged. The remaining VISUAL diff against the canvas ref is EXPECTED, not a bug: the " +
    "canvas's divided panel groups by D/R/I party cluster, while this repo deliberately stays " +
    "population-level with no party breakdown, ever — the approved party-free pivot (DECISION " +
    "#116, voter-choice-backlog.md 'KEEP the existing party-free product decision (#116)'). " +
    "This waiver documents that expected gap; it does not silence the visual check, which still " +
    "runs and gates this scenario same as any other.",
  "10d-polis-report-divided":
    "Same PolisClose.tsx vocabulary gap as 10c-polis-report-consensus — see that waiver's " +
    "note. Same divided-data + party-free-diff reasoning (DECISION #116). PolisClose.tsx " +
    "renders the true genuinely-split branch live today (no Common ground panel, 'Where it " +
    "split' populated instead) via computeDivided (card e2455f56) — this is not a proxy for a " +
    "still-held PR (superseded #240; see this scenario's own note in " +
    "parity-gallery-scenarios.ts).",
  "11c-moneygaph2h":
    "MoneyGapH2H was removed as dead code (#239, 2026-07-08) — the duel screen's money " +
    "treatment is the '.cmp-fund' PAC-percentage footnote instead, which the 05b-headtohead " +
    "probe above already covers as a required class (cmp-fund is part of HeadToHead's own " +
    "canvas markup, not MoneyGapH2H's — confirmed by reading screens-candidates.jsx's " +
    "HeadToHead directly).",
};

function probeForScenario(scenarioId: string): Probe | undefined {
  return STRUCTURAL_PROBES.find((p) => p.scenarioId === scenarioId);
}

/** Slices out a top-level `function <name>(...) { ... }` component body by
 *  brace-balancing (adequate for the hand-formatted canvas export files this
 *  reads — not a general JS parser). */
function extractComponentSlice(source: string, componentName: string): string {
  const startRe = new RegExp(`function\\s+${componentName}\\s*\\(`);
  const startMatch = startRe.exec(source);
  if (!startMatch) {
    throw new Error(
      `component "${componentName}" not found (looked for "function ${componentName}(")`,
    );
  }
  let j = source.indexOf("(", startMatch.index);
  let parenDepth = 0;
  for (; j < source.length; j++) {
    if (source[j] === "(") parenDepth++;
    else if (source[j] === ")") {
      parenDepth--;
      if (parenDepth === 0) {
        j++;
        break;
      }
    }
  }
  const bodyStart = source.indexOf("{", j);
  let depth = 0;
  let k = bodyStart;
  for (; k < source.length; k++) {
    const c = source[k];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        k++;
        break;
      }
    }
  }
  return source.slice(bodyStart, k);
}

/** Pulls space-separated class tokens out of literal string parts of a
 *  className value — `"a b"`, `'a b'`, `` `a ${dyn} b` `` (dynamic
 *  ${...} segments are dropped, not treated as a class name), across
 *  string-concatenation (`"a " + expr`) and ternaries (`cond ? "a" : "b"`).
 *
 *  Trailing-hyphen fragments (e.g. the `"tone-"` in
 *  `className={"tone-" + cdTone(p)}`) are dropped too: no real class in
 *  either the canvas source or the repo ends in a bare "-" — it only ever
 *  shows up as the literal half of a `"prefix-" + dynamicSuffix`
 *  concatenation, which this extractor (not a real JS evaluator) can't
 *  resolve to the actual rendered class. Reporting "tone-" itself as
 *  missing/found is meaningless noise; observed on the 05b-headtohead probe
 *  before this filter was added. */
function extractLiteralTokens(exprText: string): string[] {
  const cleaned = exprText.replace(/\$\{[^}]*\}/g, " ");
  const tokens: string[] = [];
  const stringRe = /"([^"]*)"|'([^']*)'|`([^`]*)`/g;
  let m: RegExpExecArray | null;
  while ((m = stringRe.exec(cleaned))) {
    const literal = m[1] ?? m[2] ?? m[3] ?? "";
    for (const tok of literal.split(/\s+/)) {
      if (tok && !tok.endsWith("-")) tokens.push(tok);
    }
  }
  return tokens;
}

/** Finds every `className={...}` / `className="..."` in a source slice and
 *  collects the literal class tokens they contain. */
function extractClassNamesFromSlice(slice: string): Set<string> {
  const classes = new Set<string>();
  const re = /className\s*=\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(slice))) {
    const i = m.index + m[0].length;
    const ch = slice[i];
    let exprEnd: number;
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      while (j < slice.length && slice[j] !== quote) j++;
      exprEnd = j + 1;
    } else if (ch === "{") {
      let depth = 0;
      let j = i;
      for (; j < slice.length; j++) {
        const c = slice[j];
        if (c === "{") depth++;
        else if (c === "}") {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
      }
      exprEnd = j;
    } else {
      continue;
    }
    for (const tok of extractLiteralTokens(slice.slice(i, exprEnd))) {
      classes.add(tok);
    }
  }
  return classes;
}

/** Extracts the single class token out of a simple `.foo` CSS selector.
 *  Returns undefined for anything else (id selectors, descendant combinators,
 *  etc.) — narrowing is skipped in that case and getDesignClasses falls back
 *  to the whole component slice. */
function classTokenFromSelector(selector: string): string | undefined {
  const m = /^\.([\w-]+)$/.exec(selector.trim());
  return m ? m[1] : undefined;
}

/** Finds the extent of the JSX element that opens at `tagStart` (the index
 *  of its leading '<') by balancing '<'/'>' tag boundaries, skipping over
 *  quoted attribute strings so a stray '<'/'>' inside one doesn't perturb the
 *  count. Adequate for this hand-formatted canvas export (no bare '<'/'>'
 *  comparison operators appear inside the JSX children these probes read) —
 *  not a general JSX/TSX parser; a component whose JSX uses `{a < b}`-style
 *  expressions would confuse it. */
function extractJsxElementAt(slice: string, tagStart: number): string {
  function tagEnd(i: number): { end: number; selfClose: boolean } {
    let j = i + 1;
    let q: string | null = null;
    while (j < slice.length) {
      const c = slice[j];
      if (q) {
        if (c === "\\") {
          j += 2;
          continue;
        }
        if (c === q) q = null;
        j++;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        q = c;
        j++;
        continue;
      }
      if (c === ">") {
        return { end: j + 1, selfClose: slice[j - 1] === "/" };
      }
      j++;
    }
    return { end: slice.length, selfClose: false };
  }

  const first = tagEnd(tagStart);
  if (first.selfClose) return slice.slice(tagStart, first.end);

  let depth = 1;
  let i = first.end;
  while (i < slice.length && depth > 0) {
    const c = slice[i];
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      i++;
      while (i < slice.length && slice[i] !== q) {
        if (slice[i] === "\\") i++;
        i++;
      }
      i++;
      continue;
    }
    if (c === "<") {
      const isClose = slice[i + 1] === "/";
      const { end, selfClose } = tagEnd(i);
      if (isClose) depth--;
      else if (!selfClose) depth++;
      i = end;
      continue;
    }
    i++;
  }
  return slice.slice(tagStart, i);
}

/** Finds every JSX element in `componentSlice` whose own `className` value
 *  literally carries `classToken`, and returns each as its own subtree
 *  (children included). Used to narrow a probe's comparison down to the
 *  specific element domSelector targets, when that element is nested inside
 *  page chrome the probe was never meant to check (see the ClassDiffProbe
 *  interface doc). Returns [] when the token isn't literally used anywhere
 *  in the slice — callers should fall back to the whole slice in that case
 *  (e.g. orientation's ".orientation" selector has no "orientation" token in
 *  the design source at all — design source calls it "ori" throughout, a
 *  genuine unported naming gap; falling back to the whole slice still
 *  reports every design class as missing, which is the honest answer). */
function extractJsxSlicesByClass(
  componentSlice: string,
  classToken: string,
): string[] {
  const slices: string[] = [];
  const seenStarts = new Set<number>();
  const re = /className\s*=\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(componentSlice))) {
    const i = m.index + m[0].length;
    const ch = componentSlice[i];
    let exprEnd: number;
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      while (j < componentSlice.length && componentSlice[j] !== quote) j++;
      exprEnd = j + 1;
    } else if (ch === "{") {
      let depth = 0;
      let j = i;
      for (; j < componentSlice.length; j++) {
        const c = componentSlice[j];
        if (c === "{") depth++;
        else if (c === "}") {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
      }
      exprEnd = j;
    } else {
      continue;
    }
    if (
      !extractLiteralTokens(componentSlice.slice(i, exprEnd)).includes(
        classToken,
      )
    ) {
      continue;
    }
    // Walk backward from the className match to the nearest preceding '<'
    // that isn't already closed by a '>' — i.e. this element's own opening tag.
    let tagStart = -1;
    for (let k = m.index; k >= 0; k--) {
      if (componentSlice[k] === ">") break;
      if (componentSlice[k] === "<") {
        tagStart = k;
        break;
      }
    }
    if (tagStart === -1 || seenStarts.has(tagStart)) continue;
    seenStarts.add(tagStart);
    slices.push(extractJsxElementAt(componentSlice, tagStart));
  }
  return slices;
}

/** Design-source class set for a probe. Narrows to the JSX subtree(s) rooted
 *  at an element literally carrying domSelector's class token when one
 *  exists (e.g. FieldMoneyGap's own root is ".screen" page chrome, not
 *  ".mgap" — narrowing excludes that chrome's classes, which were never
 *  meant to be ported into the RepCard disclosure this probe checks).
 *  Falls back to the whole component slice when no such subtree is found. */
function getDesignClasses(probe: ClassDiffProbe): Set<string> {
  const filePath = path.join(REPO_ROOT, probe.designFile);
  const source = fs.readFileSync(filePath, "utf8");
  const slice = extractComponentSlice(source, probe.componentName);
  const classToken = classTokenFromSelector(probe.domSelector);
  if (classToken) {
    const narrowed = extractJsxSlicesByClass(slice, classToken);
    if (narrowed.length > 0) {
      const classes = new Set<string>();
      for (const sub of narrowed) {
        for (const c of extractClassNamesFromSlice(sub)) classes.add(c);
      }
      return classes;
    }
  }
  return extractClassNamesFromSlice(slice);
}

async function getRenderedClasses(
  page: Page,
  selector: string,
): Promise<{ found: boolean; classes: Set<string> }> {
  const root = page.locator(selector).first();
  if ((await root.count()) === 0) return { found: false, classes: new Set() };
  const classNames = await root.evaluate((el) => {
    const out: string[] = [];
    const nodes = [el, ...Array.from(el.querySelectorAll("[class]"))];
    for (const node of nodes) {
      const c = node.getAttribute("class");
      if (c) out.push(...c.split(/\s+/).filter(Boolean));
    }
    return out;
  });
  return { found: true, classes: new Set(classNames) };
}

interface StructuralResult {
  ran: boolean;
  pass?: boolean;
  missing?: string[];
  /** Design classes that were missing but exempted via the probe's
   *  documented `ignoreMissing` list — reported for auditability, never
   *  gate-failing. */
  ignoredMissing?: string[];
  extra?: string[];
  designClassCount?: number;
  renderedClassCount?: number;
  skipReason?: string;
  note?: string;
  /** Which probe kind produced this result — steers printReport's wording
   *  ("design classes" vs. "structural markers"). Omitted for legacy
   *  class-diff results (equivalent to "class-diff"). */
  kind?: ProbeKind;
}

/** (a2) marker check — see MarkerProbe's doc comment for what this measures
 *  and why. Each marker is graded independently by presence/absence in the
 *  live DOM; the probe passes only when every marker is present. */
async function runMarkerCheck(
  probe: MarkerProbe,
  page: Page,
): Promise<StructuralResult> {
  const found: string[] = [];
  const missing: string[] = [];
  for (const marker of probe.markers) {
    const count = await page.locator(marker.selector).count();
    (count > 0 ? found : missing).push(marker.description);
  }
  return {
    ran: true,
    pass: missing.length === 0,
    missing,
    extra: [],
    designClassCount: probe.markers.length,
    renderedClassCount: found.length,
    note: probe.note,
    kind: "marker",
  };
}

async function runStructuralCheck(
  scenario: Scenario,
  page: Page,
): Promise<StructuralResult> {
  const probe = probeForScenario(scenario.id);
  if (!probe) {
    const waiver = STRUCTURAL_WAIVERS[scenario.id];
    return {
      ran: false,
      skipReason: waiver
        ? `WAIVED: ${waiver}`
        : "no structural probe defined for this scenario yet (undocumented — " +
          "add a STRUCTURAL_PROBES entry or a STRUCTURAL_WAIVERS reason)",
    };
  }
  if (probe.kind === "marker") {
    return runMarkerCheck(probe, page);
  }
  const designClasses = getDesignClasses(probe);
  const { found, classes: renderedClasses } = await getRenderedClasses(
    page,
    probe.domSelector,
  );
  if (!found) {
    return {
      ran: true,
      pass: false,
      missing: [...designClasses],
      extra: [],
      designClassCount: designClasses.size,
      renderedClassCount: 0,
      note: `${probe.note} [selector "${probe.domSelector}" not found in the rendered page at all]`,
      kind: "class-diff",
    };
  }
  const ignoreSet = new Set(probe.ignoreMissing ?? []);
  const allMissing = [...designClasses].filter((c) => !renderedClasses.has(c));
  const missing = allMissing.filter((c) => !ignoreSet.has(c));
  const ignoredMissing = allMissing.filter((c) => ignoreSet.has(c));
  const extra = [...renderedClasses].filter((c) => !designClasses.has(c));
  return {
    ran: true,
    pass: missing.length === 0,
    missing,
    ignoredMissing,
    extra,
    designClassCount: designClasses.size,
    renderedClassCount: renderedClasses.size,
    note: probe.note,
    kind: "class-diff",
  };
}

// ---------------------------------------------------------------------------
// (c) CONTENT check
// ---------------------------------------------------------------------------

/** Verbatim copy-verification probe — see file header (c). Independent of
 *  both STRUCTURAL_PROBES and the visual diff: it doesn't check that a
 *  selector exists (that's (a)) or that pixels roughly match (that's (b),
 *  and deliberately too coarse for this — see "why downscale" above); it
 *  checks that specific, exact strings — copied verbatim out of the canvas
 *  design source, the same source-of-truth convention ClassDiffProbe.designFile
 *  already follows — actually render as text on the live page. This is what
 *  catches a missing paragraph or drifted copy that a structural/visual pass
 *  would wave through. */
interface ContentProbe {
  scenarioId: string;
  assertions: { text: string; description: string }[];
  note: string;
}

/**
 * Curated, not exhaustive — one real entry today. Extending this list: copy
 * the assertion text verbatim (Read the design source directly, don't retype
 * from memory) and split around any em-dash/smart-quote so each assertion
 * stays plain-ASCII-safe; see the 08b-howitworks entry below.
 */
const CONTENT_PROBES: ContentProbe[] = [
  {
    scenarioId: "08b-howitworks",
    assertions: [
      {
        text: "Every number on a card traces to your own words and to an official source",
        description:
          "the How it works dek (first half, split before the em-dash) — canvas's HowItWorksVC " +
          '(screens-statics.jsx) passes dek="Every number on a card traces to your own words ' +
          'and to an official source — never to a guess." to StaticPageVC',
      },
      {
        text: "never to a guess.",
        description:
          "the How it works dek (second half, split after the em-dash)",
      },
      {
        text: "we extract canonical issues and a directional stance",
        description:
          "step 1 body (Issues come from you) — canvas's actual wording, not the repo's prior " +
          '"Every score in this app traces back to your own words" phrasing',
      },
      {
        text: "the raw vote",
        description:
          "step 4 body (“With you / against you” is your stance vs. the vote) — " +
          'canvas ends the step with "we show the raw vote", confirming the step-4 paragraph ' +
          "was restored verbatim rather than left as the repo's prior wording",
      },
    ],
    note:
      "Previously a genuine FAIL (confirmed by reading both sides directly): MethodologyPage " +
      "(src/prototype/VoterChoiceApp.tsx) called <StaticPage onBack={onBack} " +
      'eyebrow="Methodology" title="How we score candidates."> with no dek prop at all, and ' +
      "StaticPage's own signature (function StaticPage({ title, eyebrow, children, onBack })) " +
      "didn't even accept one — so the dek sentence never rendered anywhere on the page. Fixed: " +
      "StaticPage now accepts dek (see 08d-tipjar's identical fix), MethodologyPage passes the " +
      "verbatim canvas dek, and its 4 steps were rebuilt onto canvas's .sp-step/.n numbered-badge " +
      "structure with per-step body copy restored verbatim (bullet-list sub-items collapsed back " +
      "to canvas's single flowing paragraphs). The 2 added assertions above lock in that the step " +
      "bodies were actually replaced, not just the dek — the original class of gap (a)/(b) both " +
      "miss: '08b-howitworks' has a structural WAIVER (renders the same probed sp-wrap/sp-back " +
      "shell as 08a-about — no class signal to catch missing/drifted copy), and the coarse " +
      "downscaled visual diff isn't built to notice a paragraph of drifted text.",
  },
  // A 08d-tipjar CONTENT_PROBES entry is a natural follow-up once
  // wt/tipjar-bold-flag-pass (a separate, not-yet-merged branch fixing that
  // page's copy) lands — not added here, see this worktree's task brief.
  {
    scenarioId: "08a-about",
    assertions: [
      {
        text: "Built and operated by Grey Bird LLC",
        description:
          "the About dek (first half, split before the em-dash) — canvas's AboutVC " +
          '(screens-statics.jsx) passes dek="Built and operated by Grey Bird LLC — a small ' +
          "independent shop closing the gap between what a candidate says and what they " +
          'actually did." to StaticPageVC',
      },
      {
        text: "a small independent shop closing the gap between what a candidate says and what they actually did.",
        description: "the About dek (second half, split after the em-dash)",
      },
      {
        text: "The one thing we deliberately keep: your",
        description:
          "the Polis-retention paragraph (first half, split before the bold 'chosen issues') — " +
          "previously 100% missing from AboutPage (src/prototype/VoterChoiceApp.tsx), which had " +
          "no mention of Polis at all",
      },
      {
        text: "retained de-identified and in aggregate to power",
        description:
          "the Polis-retention paragraph (second half, split around the bold 'state')",
      },
    ],
    note:
      "Genuine FAIL before the fix, confirmed by reading both sides directly: AboutPage " +
      '(src/prototype/VoterChoiceApp.tsx) called <StaticPage onBack={onBack} eyebrow="About ' +
      'Voter Choice" title="A free, non-partisan Congress-assessment tool."> with no dek prop ' +
      "and different title wording, and its body had no Polis-retention paragraph anywhere — " +
      "the exact class of gap (a)/(b) both miss: '08a-about' already has a STRUCTURAL FAIL for " +
      "an unrelated reason (the sp-mast/sp-kicker/dek/sp-prose class-diff above), so a passing " +
      "structural check would never have caught this, and the coarse downscaled visual diff " +
      "isn't built to notice one missing paragraph of text.",
  },
  {
    scenarioId: "07-whynow",
    assertions: [
      {
        text: "Average time a member of Congress spends fundraising, per call-time guidance shown to incoming freshmen.",
        description:
          "the '6 hrs / day' problem-section stat card label — canvas's screens-whynow.jsx " +
          "WhyNow renders this exact wording on its first .wn-stat card",
      },
      {
        text: "Shortcuts are exactly what the money buys.",
        description:
          "closing line of the 'why it's hard' pull quote (.wn-pull) — only present once the " +
          "page was rebuilt onto canvas's masthead/problem/moment/pull-quote/how-it-works/CTA " +
          "structure; the prior stat-stack layout had no pull-quote section at all",
      },
      {
        text: "Judge them on what they",
        description:
          "the how-it-works section heading (.wn-h2 inside the 4th .wn-sec), split before the " +
          "em-dash — 'did' renders inside an <em> but stays inline with the surrounding text",
      },
      {
        text: "Politicians want one thing: to get re-elected.",
        description:
          "the closing CTA heading (.wn-cta h2) — the prior layout ended at a plain 'What to " +
          "do with it' paragraph with no CTA section",
      },
    ],
    note:
      "Added alongside the 07-whynow build pass that replaced WhyNowPage's generic 3-snippet " +
      "stat-stack with a literal port of canvas's long-form editorial structure (masthead → " +
      "problem section with 2 cited stat cards → brand-colored 'why now' ballot-count section " +
      "→ pull quote → 3-step how-it-works → closing CTA). Neither the structural waiver above " +
      "nor the coarse visual diff can confirm the actual copy landed verbatim; these 4 " +
      "assertions span all four new sections so a future regression back toward the old copy " +
      "or a partially-applied rebuild both fail loudly here.",
  },
  {
    scenarioId: "08c-privacy",
    assertions: [
      {
        text: "No analytics, no telemetry, no accounts.",
        description:
          "the Privacy dek (first half, split before the second sentence) — canvas's PrivacyVC " +
          '(screens-statics.jsx) passes dek="No analytics, no telemetry, no accounts. Most of ' +
          'what you do never leaves your browser." to StaticPageVC',
      },
      {
        text: "Most of what you do never leaves your browser.",
        description: "the Privacy dek (second half)",
      },
      {
        text: "Polis — the shared opinion map",
        description:
          "the Polis-retention H2 — previously 100% missing from PrivacyPage " +
          "(src/prototype/VoterChoiceApp.tsx), which had no Polis section at all despite " +
          "Polis being the one place the site persists user data server-side",
      },
      {
        text: "It's the one place your data persists beyond your browser",
        description:
          "the Polis-retention paragraph body, restored verbatim from canvas's PrivacyVC",
      },
    ],
    note:
      "Genuine FAIL before the fix, confirmed by reading both sides directly: PrivacyPage " +
      '(src/prototype/VoterChoiceApp.tsx) called <StaticPage onBack={onBack} eyebrow="Privacy ' +
      'policy" title="What stays here, what doesn\'t."> with no dek prop and no Polis section at ' +
      "all — the exact class of gap (a)/(b) both miss: '08c-privacy' has a STRUCTURAL WAIVER " +
      "(renders the same probed sp-wrap/sp-back shell as 08a-about — no class signal to catch " +
      "missing/drifted copy), and the coarse downscaled visual diff already PASSED before this " +
      "fix (ratio 0.057 vs 0.18 threshold) without the dek or Polis section rendering at all, " +
      "confirming the visual check alone isn't built to notice a missing paragraph. Muxin's " +
      "ruling on this page's copy (design-handoff/keystone-canvas/COPY-DIFF-REPORT.md, Statics " +
      "section, ruled 2026-07-07 on branch wt/keystone-phase-3-copy-diff-report-b7c7178d — not " +
      "yet merged to main) is canvas on the dek + Polis section, with the repo's additive " +
      "'leaves your device' closing sentence kept (repo adds ≠ lossy), and repo-original BYOK / " +
      "Voter profile uploads / Rate limiting sections kept as-is (no canvas counterpart). All " +
      "other Privacy-page rows (Your address, Chat conversations, What we cannot provide, " +
      "Contact) were NOT part of that ruling — left as the repo's existing copy per this task's " +
      "explicit instruction not to invent an answer for an unruled row.",
  },
  {
    scenarioId: "10a-polis-entry",
    assertions: [
      {
        text: "Your scorecard's ready.",
        description:
          "the done-state h1 — canvas's PolisEntry (screens-polis.jsx) renders this verbatim",
      },
      {
        text: "See where you stand.",
        description: "the invite-card h3",
      },
      {
        text: "You just judged your delegation on the record, not the party.",
        description: "the invite-card body, first sentence",
      },
      {
        text: "No thanks",
        description:
          "the skip control's label (button.no, full text 'No thanks — I'm done', split before " +
          "the em-dash)",
      },
    ],
    note:
      "Added alongside PR #237's PolisEntry build. The class-diff probe above already covers " +
      "the class vocabulary; this locks in the actual copy (seatsCount-driven decidedLine — " +
      "canvas's own hardcoded 'Both seats decided.' — is deliberately NOT asserted here, per " +
      "PolisEntry.tsx's own docstring: wired from real seat data instead, matching the seat-" +
      "count-from-real-data convention used elsewhere).",
  },
];

function contentProbeForScenario(scenarioId: string): ContentProbe | undefined {
  return CONTENT_PROBES.find((p) => p.scenarioId === scenarioId);
}

interface ContentResult {
  ran: boolean;
  pass?: boolean;
  missing?: string[];
  checkedCount?: number;
  skipReason?: string;
  note?: string;
}

/** Whitespace-normalizes before substring-matching so line-wrapping/DOM
 *  whitespace differences don't produce false negatives. */
function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ");
}

async function runContentCheck(
  probe: ContentProbe | undefined,
  page: Page,
): Promise<ContentResult> {
  if (!probe) {
    return {
      ran: false,
      skipReason: "no content probe defined for this scenario",
    };
  }
  const bodyText = normalizeWhitespace(await page.locator("body").innerText());
  const missing: string[] = [];
  for (const assertion of probe.assertions) {
    if (!bodyText.includes(normalizeWhitespace(assertion.text))) {
      missing.push(assertion.description);
    }
  }
  return {
    ran: true,
    pass: missing.length === 0,
    missing,
    checkedCount: probe.assertions.length,
    note: probe.note,
  };
}

// ---------------------------------------------------------------------------
// (b) VISUAL check
// ---------------------------------------------------------------------------

interface RgbaImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

async function loadFull(buffer: Buffer): Promise<RgbaImage> {
  const img = await loadImage(buffer);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, img.width, img.height);
  return { width: img.width, height: img.height, data: imgData.data };
}

function scaleImage(img: RgbaImage, targetWidth: number): RgbaImage {
  const targetHeight = Math.max(
    1,
    Math.round((img.height / img.width) * targetWidth),
  );
  const srcCanvas = createCanvas(img.width, img.height);
  srcCanvas
    .getContext("2d")
    .putImageData(
      new ImageData(new Uint8ClampedArray(img.data), img.width, img.height),
      0,
      0,
    );
  const dstCanvas = createCanvas(targetWidth, targetHeight);
  const dstCtx = dstCanvas.getContext("2d");
  dstCtx.drawImage(srcCanvas, 0, 0, targetWidth, targetHeight);
  const imgData = dstCtx.getImageData(0, 0, targetWidth, targetHeight);
  return { width: targetWidth, height: targetHeight, data: imgData.data };
}

interface BBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Minimum brightness (0-255, averaged RGB) counted as "light content" —
 *  the app is entirely light/white/cream-themed, and the lightbox's dimmed
 *  backdrop + dark annotation chrome sit well below this. */
const CONTENT_BRIGHTNESS_THRESHOLD = 200;
/** A row/column counts as part of the content card if its longest contiguous
 *  run of light pixels is at least this fraction of the WIDEST such run in the
 *  image (i.e. of the card's own detected width) — NOT a fraction of the full
 *  1600px frame. The lightbox scales each artboard to fit the fixed frame, so
 *  a tall page (About / How-it-works / Privacy) renders a much narrower card;
 *  the old "0.5 of the 1600px frame = 800px" bar rejected every row of those
 *  cards (their widest bright run is only ~710-730px), so cropping was skipped
 *  and the dark lightbox chrome stayed in the diff, inflating the ratio to
 *  ~0.35 on pages that actually matched. Keying off the card's own width crops
 *  them correctly and leaves every already-cropping scenario's box unchanged. */
const CARD_RUN_FRACTION = 0.6;
/** Absolute floor for the widest bright run, as a fraction of frame width:
 *  below this there is no real light card (a dark/empty ref, or only stray
 *  annotation/nav specks), so cropping is skipped and the caller falls back to
 *  the full frame. The narrowest real card in the ref set is ~340px (21% of
 *  1600); annotation/nav specks run well under 100px, so 0.15 (240px) cleanly
 *  separates a genuine narrow card from chrome noise. */
const CARD_MIN_RUN_FRACTION = 0.15;

/** Detects the bounding box of the light "app content card" inside a canvas
 *  review-lightbox screenshot. The ref PNGs in .keystone-canvas-refs/ are
 *  screenshots of the canvas's own review LIGHTBOX (1600x1100, per `file` on
 *  any of them) — a scaled-to-fit render of the artboard sitting inside a
 *  dimmed backdrop with an annotation bar, caption, and nav arrows around it
 *  (confirmed by eye: e.g. 02a-results-main.png's actual card runs roughly
 *  x:196-1404 y:118-957, NOT the full 1600x1100 frame) — not a 1:1 pixel
 *  crop of the artboard. Diffing the RAW ref frame against the app's tightly
 *  cropped full-page screenshot compares that dark chrome against real app
 *  background, which swamps the ratio regardless of true fidelity (observed
 *  ~0.27-0.43 before this crop step, even on confirmed-clean sections).
 *  Returns null when no clear card region is found (nothing brighter than
 *  the threshold, or the "card" is basically the whole frame already) — the
 *  caller should skip cropping in that case rather than shrink by a stray
 *  pixel. */
function detectContentBBox(img: RgbaImage): BBox | null {
  const { width: W, height: H, data } = img;
  const brightnessAt = (x: number, y: number): number => {
    const i = (y * W + x) * 4;
    return (data[i] + data[i + 1] + data[i + 2]) / 3;
  };
  // Longest contiguous bright run in each row; the widest of these ≈ the card's
  // own width (the card is the brightest structure — the dimmed backdrop sits
  // below CONTENT_BRIGHTNESS_THRESHOLD).
  const rowRuns = new Array<number>(H);
  let maxRowRun = 0;
  for (let y = 0; y < H; y++) {
    let run = 0;
    let best = 0;
    for (let x = 0; x < W; x++) {
      if (brightnessAt(x, y) > CONTENT_BRIGHTNESS_THRESHOLD) {
        run++;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }
    rowRuns[y] = best;
    if (best > maxRowRun) maxRowRun = best;
  }
  // No real light card present (dark/empty ref, or only stray chrome specks).
  if (maxRowRun < W * CARD_MIN_RUN_FRACTION) return null;

  const rowThreshold = maxRowRun * CARD_RUN_FRACTION;
  const rowsWithBigRun: number[] = [];
  for (let y = 0; y < H; y++) {
    if (rowRuns[y] >= rowThreshold) rowsWithBigRun.push(y);
  }
  const y0 = rowsWithBigRun[0];
  const y1 = rowsWithBigRun[rowsWithBigRun.length - 1];

  // Same, per column, within the detected vertical band — threshold relative to
  // the widest column run (the card's own height in this band).
  const colRuns = new Array<number>(W);
  let maxColRun = 0;
  for (let x = 0; x < W; x++) {
    let run = 0;
    let best = 0;
    for (let y = y0; y <= y1; y++) {
      if (brightnessAt(x, y) > CONTENT_BRIGHTNESS_THRESHOLD) {
        run++;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }
    colRuns[x] = best;
    if (best > maxColRun) maxColRun = best;
  }
  const colThreshold = maxColRun * CARD_RUN_FRACTION;
  const colsWithBigRun: number[] = [];
  for (let x = 0; x < W; x++) {
    if (colRuns[x] >= colThreshold) colsWithBigRun.push(x);
  }
  const x0 = colsWithBigRun[0];
  const x1 = colsWithBigRun[colsWithBigRun.length - 1];

  if (x1 - x0 > W * 0.97 && y1 - y0 > H * 0.97) return null;
  return { x0, y0, x1, y1 };
}

function cropImage(img: RgbaImage, box: BBox): RgbaImage {
  const w = box.x1 - box.x0 + 1;
  const h = box.y1 - box.y0 + 1;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let row = 0; row < h; row++) {
    const srcOffset = ((box.y0 + row) * img.width + box.x0) * 4;
    out.set(img.data.subarray(srcOffset, srcOffset + w * 4), row * w * 4);
  }
  return { width: w, height: h, data: out };
}

/** Pads the shorter image to the taller one's height with fully-transparent
 *  pixels (pixelmatch blends alpha<255 pixels toward white before diffing —
 *  see colorDelta in pixelmatch.js — so this reads as "compare against a
 *  blank/white extension", the same non-fabricating choice
 *  playwright-core's own resizeImage makes for mismatched screenshot sizes). */
function padToHeight(img: RgbaImage, height: number): Uint8ClampedArray {
  if (img.height === height) return img.data;
  const out = new Uint8ClampedArray(img.width * height * 4);
  out.set(img.data.subarray(0, img.width * img.height * 4));
  return out;
}

interface VisualResult {
  ran: boolean;
  pass?: boolean;
  diffPixels?: number;
  totalPixels?: number;
  ratio?: number;
  threshold?: number;
  diffImagePath?: string;
  skipReason?: string;
}

async function runVisualCheck(
  scenario: Scenario,
  screenshotPath: string,
  outDir: string,
  threshold: number,
  pixelmatch: PixelmatchFn,
): Promise<VisualResult> {
  if (!scenario.refFile) {
    return { ran: false, skipReason: "no canvas export for this scenario" };
  }
  const refPath = path.join(REFS_DIR, scenario.refFile);
  if (!fs.existsSync(refPath)) {
    return { ran: false, skipReason: `ref PNG missing: ${scenario.refFile}` };
  }
  const [refFull, actualFull] = await Promise.all([
    loadFull(fs.readFileSync(refPath)),
    loadFull(fs.readFileSync(screenshotPath)),
  ]);
  const cropBox = detectContentBBox(refFull);
  const refCropped = cropBox ? cropImage(refFull, cropBox) : refFull;
  const refImg = scaleImage(refCropped, DOWNSCALE_WIDTH);
  const actualImg = scaleImage(actualFull, DOWNSCALE_WIDTH);
  const height = Math.max(refImg.height, actualImg.height);
  const refData = padToHeight(refImg, height);
  const actualData = padToHeight(actualImg, height);
  const diffOut = new Uint8ClampedArray(DOWNSCALE_WIDTH * height * 4);
  const diffPixels = pixelmatch(
    refData,
    actualData,
    diffOut,
    DOWNSCALE_WIDTH,
    height,
    {
      threshold: PIXELMATCH_THRESHOLD,
      includeAA: false,
    },
  );
  const totalPixels = DOWNSCALE_WIDTH * height;
  const ratio = diffPixels / totalPixels;

  fs.mkdirSync(outDir, { recursive: true });
  const diffImagePath = path.join(outDir, `${scenario.id}.diff.png`);
  const diffCanvas = createCanvas(DOWNSCALE_WIDTH, height);
  const diffCtx = diffCanvas.getContext("2d");
  const clamped = new Uint8ClampedArray(diffOut);
  diffCtx.putImageData(new ImageData(clamped, DOWNSCALE_WIDTH, height), 0, 0);
  fs.writeFileSync(diffImagePath, diffCanvas.toBuffer("image/png"));

  return {
    ran: true,
    pass: ratio <= threshold,
    diffPixels,
    totalPixels,
    ratio,
    threshold,
    diffImagePath,
  };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

interface GateResult {
  scenario: Scenario;
  captureError?: string;
  structural: StructuralResult;
  content: ContentResult;
  visual: VisualResult;
}

function overallPass(r: GateResult): boolean | null {
  if (r.captureError) return false;
  const structuralOk = !r.structural.ran || r.structural.pass === true;
  const contentOk = !r.content.ran || r.content.pass === true;
  const visualOk = !r.visual.ran || r.visual.pass === true;
  const anyRan = r.structural.ran || r.content.ran || r.visual.ran;
  if (!anyRan) return null; // nothing to gate on for this scenario
  return structuralOk && contentOk && visualOk;
}

function printReport(results: GateResult[], threshold: number): boolean {
  let anyFail = false;
  let anyRan = false;
  console.log(`\n${"=".repeat(72)}`);
  console.log("Keystone parity gate report");
  console.log(
    `visual threshold: diff ratio <= ${threshold} (downscaled to ${DOWNSCALE_WIDTH}px wide)`,
  );
  console.log("=".repeat(72));
  for (const r of results) {
    const pass = overallPass(r);
    if (pass === null) {
      console.log(
        `\n${r.scenario.id} — SKIPPED (no structural probe, no ref PNG)`,
      );
      continue;
    }
    anyRan = true;
    if (pass === false) anyFail = true;
    console.log(`\n${r.scenario.id} — ${pass ? "PASS" : "FAIL"}`);
    console.log(`  ${r.scenario.label}`);
    if (r.captureError) {
      console.log(`  capture failed: ${r.captureError}`);
      continue;
    }
    if (r.structural.ran) {
      const s = r.structural;
      const unitLabel =
        s.kind === "marker" ? "structural markers" : "design classes";
      console.log(
        `  structural: ${s.pass ? "PASS" : "FAIL"} — ${s.designClassCount} ${unitLabel} checked, ` +
          `${s.missing?.length ?? 0} missing, ${s.extra?.length ?? 0} extra`,
      );
      if (s.missing && s.missing.length > 0) {
        console.log(`    missing: ${s.missing.join(", ")}`);
      }
      if (s.ignoredMissing && s.ignoredMissing.length > 0) {
        console.log(
          `    ignored (documented exemption, not gate-failing): ${s.ignoredMissing.join(", ")}`,
        );
      }
      if (s.extra && s.extra.length > 0 && s.extra.length <= 15) {
        console.log(`    extra:   ${s.extra.join(", ")}`);
      } else if (s.extra && s.extra.length > 15) {
        console.log(
          `    extra:   ${s.extra.length} classes not in the design source (informational)`,
        );
      }
      if (s.note) console.log(`    note: ${s.note}`);
    } else {
      console.log(`  structural: skipped (${r.structural.skipReason})`);
    }
    if (r.content.ran) {
      const c = r.content;
      console.log(
        `  content: ${c.pass ? "PASS" : "FAIL"} — ${c.checkedCount} assertions checked, ` +
          `${c.missing?.length ?? 0} missing`,
      );
      if (c.missing && c.missing.length > 0) {
        console.log(`    missing: ${c.missing.join(", ")}`);
      }
      if (c.note) console.log(`    note: ${c.note}`);
    } else {
      console.log(`  content: skipped (${r.content.skipReason})`);
    }
    if (r.visual.ran) {
      const v = r.visual;
      console.log(
        `  visual: ${v.pass ? "PASS" : "FAIL"} — diff ${v.diffPixels}/${v.totalPixels} px ` +
          `(ratio ${v.ratio?.toFixed(3)}, threshold ${v.threshold}) — diff image: ${path.relative(REPO_ROOT, v.diffImagePath ?? "")}`,
      );
    } else {
      console.log(`  visual: skipped (${r.visual.skipReason})`);
    }
  }
  console.log(`\n${"=".repeat(72)}`);
  const ranResults = results.filter((r) => overallPass(r) !== null);
  const passCount = ranResults.filter((r) => overallPass(r) === true).length;
  console.log(
    `${passCount}/${ranResults.length} gated scenarios passed` +
      (results.length > ranResults.length
        ? ` (${results.length - ranResults.length} skipped — no probe/ref)`
        : ""),
  );
  console.log("=".repeat(72));
  return anyRan && !anyFail;
}

async function main(): Promise<void> {
  const args = parseCliArgs();
  const scenarios = args.only
    ? SCENARIOS.filter((s) => args.only!.includes(s.id))
    : SCENARIOS;
  if (scenarios.length === 0) {
    console.error(
      "No scenarios matched --only; check the ids against .keystone-canvas-refs/manifest.json.",
    );
    process.exit(1);
  }

  const pixelmatch = loadPixelmatch();

  let instance: AppInstance;
  if (args.url) {
    instance = { url: args.url, label: "gate", cleanup: async () => {} };
  } else {
    console.log(`Booting a dev server on the current worktree's HEAD…`);
    const port = await getFreePort();
    instance = await startNextDev(REPO_ROOT, port, "gate");
  }

  // `ok` is computed inside the try below and used for the exit code AFTER
  // the try/finally completes — process.exit() must never be called from
  // inside a try whose finally does async cleanup (like instance.cleanup()
  // tearing down the spawned dev server below): process.exit() terminates
  // the process immediately, without waiting for an enclosing finally's
  // pending promise, so the dev server would leak on every run. (Observed:
  // the previous version of this function called process.exit() directly
  // inside the try, and every invocation left its `next dev` + `next-server`
  // process trio running forever.)
  let ok: boolean;
  try {
    console.log(`\nLaunching browser…`);
    const browser = await chromium.launch({ headless: !args.headed });
    const results: GateResult[] = [];
    try {
      fs.mkdirSync(args.out, { recursive: true });
      for (const scenario of scenarios) {
        if (scenario.automatable === "no" || !scenario.capture) {
          results.push({
            scenario,
            structural: { ran: false, skipReason: "scenario not automatable" },
            content: { ran: false, skipReason: "scenario not automatable" },
            visual: { ran: false, skipReason: "scenario not automatable" },
          });
          continue;
        }
        const context = await browser.newContext({
          viewport: VIEWPORT,
          baseURL: instance.url,
        });
        const page = await context.newPage();
        try {
          await scenario.capture(page);
          const screenshotPath = path.join(args.out, `${scenario.id}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true });

          const structural = await runStructuralCheck(scenario, page);
          const content = await runContentCheck(
            contentProbeForScenario(scenario.id),
            page,
          );
          const visual = await runVisualCheck(
            scenario,
            screenshotPath,
            args.out,
            args.threshold,
            pixelmatch,
          );
          results.push({ scenario, structural, content, visual });
          console.log(`  ${scenario.id} captured + checked`);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          results.push({
            scenario,
            captureError: message,
            structural: { ran: false, skipReason: "capture failed" },
            content: { ran: false, skipReason: "capture failed" },
            visual: { ran: false, skipReason: "capture failed" },
          });
          console.log(
            `  ${scenario.id} capture failed: ${message.split("\n")[0]}`,
          );
        } finally {
          await context.close();
        }
      }
    } finally {
      await browser.close();
    }

    fs.writeFileSync(
      path.join(args.out, "report.json"),
      JSON.stringify(results, null, 2),
    );

    ok = printReport(results, args.threshold);
  } finally {
    if (!args.keepServer) {
      await instance.cleanup();
    } else {
      console.log("--keep-server set: leaving the spawned dev server running.");
    }
  }
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
