#!/usr/bin/env node
// scripts/design/parity-gate.ts
//
// Phase 5 of docs/operations/keystone-design-source-plan-2026-07.md — the
// parity gate that becomes the definition-of-done on every Keystone design
// card. Design cards' goal condition changes from "match the canvas" prose
// to "diff <= threshold vs ref NN-*.png". Two checks per artboard:
//
//   (a) STRUCTURAL — the rendered DOM's class set at a known root selector
//       vs. the literal classes the design source (design-handoff/
//       keystone-canvas/src/ or design-handoff/design-session/) uses for the
//       matching component. Flags missing (gate-failing) and extra
//       (informational) classes. Only defined for scenarios wired into
//       STRUCTURAL_PROBES below — see that block's comment for why most of
//       the 27 parity-gallery scenarios don't have one yet.
//
//   (b) VISUAL — pixel-diff of the scenario's screenshot against its ref PNG
//       in .keystone-canvas-refs/, with a COPY-TOLERANT ratio threshold: both
//       images are downscaled to a common small width before diffing (see
//       "why downscale" below), then compared with the anti-aliasing-aware
//       pixelmatch algorithm @playwright/test already vendors (no new
//       dependency — see "reusing playwright's own comparator" below).
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

interface StructuralProbe {
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
const STRUCTURAL_PROBES: StructuralProbe[] = [
  {
    scenarioId: "01-orientation-activated",
    domSelector: ".orientation",
    designFile: "design-handoff/keystone-canvas/src/screens-orientation.jsx",
    componentName: "OrientationActivated",
    note:
      "Confirmed gap, HANDOFF-EXACT-MATCH.md §1: OrientationView (App2.tsx) still renders a " +
      "bare div — none of the flagbar/ori-card/ori-step/ori-cta structure has been ported yet.",
  },
  {
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
];

function probeForScenario(scenarioId: string): StructuralProbe | undefined {
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
 *  string-concatenation (`"a " + expr`) and ternaries (`cond ? "a" : "b"`). */
function extractLiteralTokens(exprText: string): string[] {
  const cleaned = exprText.replace(/\$\{[^}]*\}/g, " ");
  const tokens: string[] = [];
  const stringRe = /"([^"]*)"|'([^']*)'|`([^`]*)`/g;
  let m: RegExpExecArray | null;
  while ((m = stringRe.exec(cleaned))) {
    const literal = m[1] ?? m[2] ?? m[3] ?? "";
    for (const tok of literal.split(/\s+/)) {
      if (tok) tokens.push(tok);
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
 *  page chrome the probe was never meant to check (see the StructuralProbe
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
function getDesignClasses(probe: StructuralProbe): Set<string> {
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
}

async function runStructuralCheck(
  scenario: Scenario,
  page: Page,
): Promise<StructuralResult> {
  const probe = probeForScenario(scenario.id);
  if (!probe) {
    return {
      ran: false,
      skipReason: "no structural probe defined for this scenario yet",
    };
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
/** A row/column only counts as part of the content card if it has a
 *  contiguous run of light pixels spanning at least this fraction of the
 *  image — filters out small bright specks (annotation text, nav-arrow
 *  glyphs, the light dots in the lightbox's page-index strip) that sit
 *  outside the actual card. */
const CONTENT_RUN_FRACTION = 0.5;

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
  const rowsWithBigRun: number[] = [];
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
    if (best > W * CONTENT_RUN_FRACTION) rowsWithBigRun.push(y);
  }
  if (rowsWithBigRun.length === 0) return null;
  const y0 = rowsWithBigRun[0];
  const y1 = rowsWithBigRun[rowsWithBigRun.length - 1];

  const colsWithBigRun: number[] = [];
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
    if (best > (y1 - y0) * CONTENT_RUN_FRACTION) colsWithBigRun.push(x);
  }
  if (colsWithBigRun.length === 0) return null;
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
  visual: VisualResult;
}

function overallPass(r: GateResult): boolean | null {
  if (r.captureError) return false;
  const structuralOk = !r.structural.ran || r.structural.pass === true;
  const visualOk = !r.visual.ran || r.visual.pass === true;
  const anyRan = r.structural.ran || r.visual.ran;
  if (!anyRan) return null; // nothing to gate on for this scenario
  return structuralOk && visualOk;
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
      console.log(
        `  structural: ${s.pass ? "PASS" : "FAIL"} — ${s.designClassCount} design classes checked, ` +
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
          const visual = await runVisualCheck(
            scenario,
            screenshotPath,
            args.out,
            args.threshold,
            pixelmatch,
          );
          results.push({ scenario, structural, visual });
          console.log(`  ${scenario.id} captured + checked`);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          results.push({
            scenario,
            captureError: message,
            structural: { ran: false, skipReason: "capture failed" },
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
