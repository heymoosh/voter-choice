#!/usr/bin/env node
// scripts/design/design-sync-extract.ts
//
// Design-sync bundle extraction — the component-level counterpart to
// parity-gallery.ts's full-page screenshots. Boots the app exactly the way
// parity-gallery.ts does (mocked APIs over Playwright's page.route, zero
// network/DB — see PARITY-GALLERY-README.md), drives it to a target state
// using the SAME scenario `capture()` functions from
// parity-gallery-scenarios.ts (imported directly, not reimplemented), then —
// instead of a full-page screenshot — grabs the outerHTML of one specific
// component root and writes it out as a self-contained preview page under
// design-sync-bundle/components/<id>.html.
//
// Output goes to a SIBLING directory outside this repo checkout
// (../design-sync-bundle relative to the repo root, i.e.
// <parent-of-repo-root>/design-sync-bundle) — override with
// --bundle-dir or the DESIGN_SYNC_BUNDLE_DIR env var if your checkout
// layout differs. That directory's assets/*.css must be kept in sync with
// this repo's public/*.css + src/styles/print.css (copy them over before
// re-running after a CSS change upstream).
//
// Usage:
//   npx tsx scripts/design/design-sync-extract.ts
//   npx tsx scripts/design/design-sync-extract.ts --only rep-card-collapsed,head-to-head
//   npx tsx scripts/design/design-sync-extract.ts --list
//   npx tsx scripts/design/design-sync-extract.ts --bundle-dir /path/to/design-sync-bundle
//
// Extending this for a later tree: add an entry to TARGETS below. Each
// entry names an EXISTING scenario id from parity-gallery-scenarios.ts to
// reach the state (write a new one there first if the state isn't reachable
// yet) plus a CSS selector for the component root once on that screen. A
// target whose selector never resolves is reported as a skip in the
// summary, not a hard failure — so re-running this unmodified against an
// older tree (before some feature lands) degrades gracefully instead of
// crashing the whole run. (PolisEntry, PolisStand, DelegationOverview, and
// IntakeLocked all landed as of the fd8d4905 integration snapshot and have
// targets below; the pattern still applies to whatever lands next.)

import { chromium, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { SCENARIOS, scenarioById } from "./parity-gallery-scenarios";
import {
  defaultBundleDir,
  neutralizeScrollTraps,
  parseCommonCliArgs,
  repoRootFromScriptUrl,
  VIEWPORT,
} from "./capture-shared";
import { getFreePort, startNextDev } from "./dev-server";

const REPO_ROOT = repoRootFromScriptUrl(import.meta.url);
const DEFAULT_BUNDLE_DIR = defaultBundleDir(REPO_ROOT);

// ---------------------------------------------------------------------------
// Target inventory — one entry per bundle card.
// ---------------------------------------------------------------------------

interface ComponentTarget {
  /** Filename stem — output is components/<id>.html. */
  id: string;
  /** @dsCard group (see MAPPING.md / the card's first-line comment). */
  group: string;
  title: string;
  /** scenario id from parity-gallery-scenarios.ts's SCENARIOS — reused
   *  verbatim to reach the target screen state (same mocks, same
   *  interaction sequence the parity gallery already trusts). */
  scenarioId: string;
  /** CSS selector for the component root, evaluated AFTER the scenario's
   *  capture() resolves. */
  selector: string;
  /** 0-based index when a selector matches more than one element on the
   *  reached screen (default 0 — the first match). */
  nth?: number;
  /** Extra stylesheet basenames (from bundle assets/) beyond the four
   *  always-loaded prototype sheets — e.g. print.css for the scorecard. */
  extraCss?: string[];
  /** Runs AFTER the base scenario's capture() resolves and BEFORE the
   *  selector is located — for a card that needs one more interaction on
   *  top of an existing scenario's reached state (e.g. clicking a reveal
   *  toggle) rather than a whole new scenario. Keep these small; a state
   *  worth diffing in the parity gallery too belongs in parity-gallery-
   *  scenarios.ts as its own scenario instead. */
  extraStep?: (page: Page) => Promise<void>;
  /** Known intent delta / caveat, shown in MAPPING.md — keep in sync with
   *  parity-gallery-scenarios.ts's own `note` for the same scenario where
   *  one exists; only set this when the CARD (not the whole scenario) needs
   *  its own caveat. */
  note?: string;
  /** Wraps the captured outerHTML in a synthetic `<div class={wrapClass}>`
   *  before writing. Needed when `selector` targets an element narrower
   *  than the CSS scope root its styles are written against (e.g. this
   *  repo's money-redesign rules are all `.rep-card <inner>`-scoped) — the
   *  standalone-render step has no cascade from ancestors that weren't
   *  captured, so a crop below the scope root renders unstyled without
   *  this. Prefer widening `selector` instead when the scope root itself
   *  IS the useful crop; reach for this only when a genuinely narrower
   *  crop is wanted from a component whose styles are scoped above it. */
  wrapClass?: string;
}

const TARGETS: ComponentTarget[] = [
  // ---- Chrome ----
  {
    id: "app-nav",
    group: "Chrome",
    title: "AppNav",
    scenarioId: "06-homehero",
    selector: "nav.app-nav",
  },
  {
    id: "app-footer",
    group: "Chrome",
    title: "AppFooter",
    scenarioId: "06-homehero",
    selector: "footer.hp-foot",
  },

  // ---- Statics ----
  {
    id: "static-page-shell",
    group: "Statics",
    title: "StaticPage shell (About)",
    scenarioId: "08a-about",
    selector: ".sp-wrap",
  },

  // ---- Home ----
  {
    id: "home-hero",
    group: "Home",
    title: "HomeHero + address card",
    scenarioId: "06-homehero",
    selector: "section.hp-hero",
  },
  {
    id: "why-now",
    group: "Home",
    title: "WhyNowPage",
    scenarioId: "07-whynow",
    selector: ".wn-wrap",
  },

  // ---- Intake ----
  {
    id: "orientation-view",
    group: "Intake",
    title: "OrientationView (activated)",
    scenarioId: "01-orientation-activated",
    selector: ".screen.orientation.ori",
  },
  {
    id: "intake-ask",
    group: "Intake",
    title: "Intake chat — the ask (step 1)",
    scenarioId: "09a-intake-ask",
    selector: ".coldopen",
  },
  {
    id: "intake-propose",
    group: "Intake",
    title: "Intake chat — AI proposes + running issues (step 2)",
    scenarioId: "09b-intake-propose",
    selector: ".coldopen",
  },
  {
    id: "issue-delta-banner",
    group: "Intake",
    title: "IssueDeltaBanner (post re-score)",
    scenarioId: "09e-edit-rescored",
    selector: '[data-testid="issue-delta-banner"]',
  },

  // ---- Results ----
  {
    // Money-redesign v2/v3 (2026-07-21/22) made the money section always
    // open — no more collapsed/expanded disclosure state, so this pair no
    // longer captures two states of the same thing. Kept as two cards:
    // this one shows the seat top (alignment + money hero + scale), the
    // next one below scrolls to the fused funding-sources list, so the
    // pair stays visually distinct rather than becoming duplicates.
    id: "rep-card-collapsed",
    group: "Results",
    title: "RepCard — seat top (alignment + money hero)",
    scenarioId: "02a-results-main",
    selector: ".rep-card",
  },
  {
    // Extraction grabs outerHTML and render-check does a standalone
    // full-page screenshot of it — a narrower selector, not a scroll, is
    // what produces a distinct crop. `.srcs` is the fused funding-sources
    // list (v2 Tier B), the biggest net-new surface in this card. Its
    // rules are all `.rep-card .src*`-scoped, so wrapClass restores the
    // ancestor the standalone render needs to pick up any styling at all.
    id: "rep-card-expanded",
    group: "Results",
    title: "RepCard — funding sources list",
    scenarioId: "02b-results-funding-expanded",
    selector: ".srcs",
    wrapClass: "rep-card",
  },
  {
    id: "rep-card-revealed",
    group: "Results",
    title: "RepCard — identity revealed (blind mode lifted for this card)",
    scenarioId: "02a-results-main",
    selector: ".rep-card",
    extraStep: async (page) => {
      // CandidateCardHeader's blind-mode "Reveal who this is" affordance
      // (VoterChoiceApp.tsx's .cv2-reveal button, no dedicated testid) — the
      // third RepCard identity state alongside collapsed/expanded, flagged
      // in MAPPING.md. Waits on the header itself losing `.blind` (not just
      // a timeout) so the click has actually taken effect before capture.
      await page.locator(".cv2-reveal").first().click();
      await page
        .locator(".cv2-head:not(.blind)")
        .first()
        .waitFor({ timeout: 5000 });
    },
  },
  {
    id: "all-votes-panel",
    group: "Results",
    title: "AllVotesPanel sheet",
    scenarioId: "02d-results-allvotes-sheet",
    selector: ".be-modal-overlay.avsheet-scrim",
  },

  // ---- Candidates ----
  {
    id: "head-to-head",
    group: "Candidates",
    title: "HeadToHead duel",
    scenarioId: "05b-headtohead",
    selector: ".cmp-screen",
  },

  // ---- Money ----
  {
    // MedianChip (the old collapsed-glance chip this card used to capture)
    // has no live callers anymore — money-redesign v2 (2026-07-21/22)
    // replaced it with MoneyHero, the always-open serif hero + multiple
    // sentence. Repurposed this slot rather than deleting it outright,
    // since the money section's opening view is exactly the kind of
    // reusable pattern this board exists to mirror.
    id: "median-chip",
    group: "Money",
    title: "MoneyHero",
    scenarioId: "02a-results-main",
    selector: ".mny-hero",
    wrapClass: "rep-card",
  },
  {
    id: "field-money-gap",
    group: "Money",
    title: "MoneyGapScale (single-subject)",
    scenarioId: "02b-results-funding-expanded",
    selector: ".mgap",
    note:
      "Named FieldMoneyGap in the design-sync brief, but RepCard.tsx calls <MoneyGapScale> " +
      "WITHOUT a `field` prop, so only ever the single-subject scale renders — the canvas's " +
      "whole-field (3+ candidate) mode is not wired anywhere in the app (parity-gallery-" +
      "scenarios.ts's 11a-fieldmoneygap: automatable 'no', same finding). This card shows the " +
      "single-subject scale that DOES exist, not the field mode that doesn't.",
  },

  // ---- Scorecard ----
  {
    id: "scorecard-print-view",
    group: "Scorecard",
    title: "ScorecardPrintView",
    scenarioId: "04-scorecard",
    selector: ".print-wrap",
    extraCss: ["print.css"],
  },

  // ---- Polis ----
  {
    id: "polis-report-consensus",
    group: "Polis",
    title: "PolisClose report — common ground + where it split",
    scenarioId: "10c-polis-report-consensus",
    selector: "section.polis",
  },
  {
    id: "polis-report-divided",
    group: "Polis",
    title: "PolisClose report — divided / no-common-ground state",
    scenarioId: "10d-polis-report-divided",
    selector: "section.polis",
    note:
      "PolisClose now renders the true 'genuinely split' branch live (computeDivided, " +
      "DIVIDED_MIN_SHARE=30 — card e2455f56, superseding the never-merged PR #240) — no longer " +
      "a proxy. See DECISION #116 (party-free) in parity-gate.ts's STRUCTURAL_WAIVERS for why a " +
      "residual visual diff vs. any party-colored canvas treatment is still expected.",
  },
  {
    id: "polis-entry",
    group: "Polis",
    title: "PolisEntry — scorecard-done invite/preview interstitial",
    scenarioId: "10a-polis-entry",
    selector: ".pe-screen",
  },
  {
    id: "polis-stand",
    group: "Polis",
    title: "PolisStand — blind per-statement voting",
    scenarioId: "10b-polis-contribute",
    selector: ".polisstand2",
  },

  // ---- Candidates (continued) ----
  {
    id: "delegation-overview",
    group: "Candidates",
    title: "DelegationOverview — multi-seat scored cards before drill-down",
    scenarioId: "05c-candidates-overview",
    selector: '[data-testid="delegation-overview"]',
  },

  // ---- Intake (continued) ----
  {
    id: "intake-locked",
    group: "Intake",
    title: "IntakeLocked — pre-lock confirmation screen",
    scenarioId: "09c-intake-locked",
    // The full screen (data-testid="issue-locked-confirm"), NOT just its
    // embedded ".iq-locked" banner — the banner's --keep/--keep-soft tokens
    // are only defined on THIS wrapper (redesign2.css: "not in the global
    // palette yet"), so extracting the banner alone renders an invisible/
    // washed-out checkmark (confirmed: --keep resolves to nothing outside
    // this scope).
    selector: '[data-testid="issue-locked-confirm"]',
  },
];

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseCliArgs() {
  const { values, only, list, bundleDir, headed } = parseCommonCliArgs(
    DEFAULT_BUNDLE_DIR,
    { help: { type: "boolean", default: false } },
  );
  if (values.help) {
    console.log(
      [
        "Usage: npx tsx scripts/design/design-sync-extract.ts [options]",
        "",
        "  --only <ids>        comma-separated target ids (default: all)",
        "  --list              print target ids and exit",
        "  --bundle-dir <dir>  bundle output dir (default: ../design-sync-bundle, or",
        "                      $DESIGN_SYNC_BUNDLE_DIR)",
        "  --headed            run the browser headed (debugging)",
      ].join("\n"),
    );
    process.exit(0);
  }
  return { only, list, bundleDir, headed };
}

// ---------------------------------------------------------------------------
// card template
// ---------------------------------------------------------------------------

const GOOGLE_FONTS_LINK =
  "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Serif:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=IBM+Plex+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function wrapCard(target: ComponentTarget, innerHtml: string): string {
  const sheets = [
    "prototype.css",
    "prototype-c.css",
    "redesign2.css",
    "candidates.css",
    ...(target.extraCss || []),
  ];
  const links = sheets
    .map((f) => `    <link rel="stylesheet" href="../assets/${f}">`)
    .join("\n");
  // First line MUST be the @dsCard marker (design-sync bundle contract) —
  // a leading HTML comment before <!doctype html> is valid and every
  // browser still enters standards mode off the doctype that follows.
  return `<!-- @dsCard group="${target.group}" -->
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>${esc(target.title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="${GOOGLE_FONTS_LINK}" rel="stylesheet">
${links}
    <style>
      html, body { margin: 0; }
      /* prototype.css's own body min-height:100vh rule (and every full-
         screen surface wrapper's own copy of it — .bf-app, .cmp-screen,
         .polisstand2, .pe-screen .ps) exist so a real, full-page app route
         never shows bare background below short content — irrelevant (and
         misleading, a huge blank card) for an isolated component preview,
         where we want the card to size to its own content. Overridden
         here; a bare-class override loses to a compound selector of higher
         specificity regardless of source order (confirmed: .ps alone did
         NOT beat .pe-screen's own ".pe-screen .ps" rule) — so this matches
         each rule's own selector shape, not just its class name. */
      html,
      body,
      .bf-app,
      .cmp-screen,
      .polisstand2,
      .pe-screen .ps {
        min-height: 0;
      }
      body { background: #eceef1; padding: 32px; }
      .ds-card-frame { max-width: 1180px; margin: 0 auto; background: var(--paper, #fff); }
    </style>
</head>
<body data-mood="civic" data-palette="civic" data-treatment="daylight">
<div id="root" class="bf-app">
  <div class="ds-card-frame">
${innerHtml}
  </div>
</div>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// extraction
// ---------------------------------------------------------------------------

type ExtractResult =
  | { status: "ok"; file: string }
  | { status: "skip"; reason: string }
  | { status: "error"; error: string };

async function extractOne(
  page: Page,
  target: ComponentTarget,
  bundleDir: string,
): Promise<ExtractResult> {
  const scenario = scenarioById(target.scenarioId);
  if (!scenario) {
    return {
      status: "error",
      error: `unknown scenario id "${target.scenarioId}" (check parity-gallery-scenarios.ts)`,
    };
  }
  if (!scenario.capture) {
    return {
      status: "skip",
      reason: `scenario "${target.scenarioId}" has no capture() (automatable: "${scenario.automatable}") — not reachable on this tree yet`,
    };
  }
  try {
    await scenario.capture(page);
    if (target.extraStep) await target.extraStep(page);
    await neutralizeScrollTraps(page);
    const locator = page.locator(target.selector).nth(target.nth ?? 0);
    await locator.waitFor({ state: "visible", timeout: 10_000 });
    let outerHtml = await locator.evaluate((el) => el.outerHTML);
    if (target.wrapClass) {
      outerHtml = `<div class="${target.wrapClass}">${outerHtml}</div>`;
    }
    const componentsDir = path.join(bundleDir, "components");
    fs.mkdirSync(componentsDir, { recursive: true });
    const file = path.join(componentsDir, `${target.id}.html`);
    fs.writeFileSync(file, wrapCard(target, outerHtml));
    return { status: "ok", file };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: "error", error: message.split("\n")[0] };
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseCliArgs();

  if (args.list) {
    for (const t of TARGETS) console.log(`${t.id}\t[${t.group}]\t${t.title}`);
    return;
  }

  const targets = args.only
    ? TARGETS.filter((t) => args.only!.includes(t.id))
    : TARGETS;
  if (targets.length === 0) {
    console.error("No targets matched --only; run with --list to see ids.");
    process.exit(1);
  }

  fs.mkdirSync(path.join(args.bundleDir, "components"), { recursive: true });

  console.log(`Booting dev server from ${REPO_ROOT} (current worktree HEAD)…`);
  const port = await getFreePort();
  const instance = await startNextDev(REPO_ROOT, port, "design-sync");
  try {
    const browser = await chromium.launch({ headless: !args.headed });
    try {
      const results: Record<string, ExtractResult> = {};
      for (const target of targets) {
        const context = await browser.newContext({
          viewport: VIEWPORT,
          baseURL: instance.url,
        });
        const page = await context.newPage();
        try {
          results[target.id] = await extractOne(page, target, args.bundleDir);
        } finally {
          await context.close();
        }
        const r = results[target.id];
        if (r.status === "ok") console.log(`  ${target.id} ✓ → ${r.file}`);
        else if (r.status === "skip")
          console.log(`  ${target.id} ⊘ skipped: ${r.reason}`);
        else console.log(`  ${target.id} ✗ ${r.error}`);
      }

      const ok = Object.values(results).filter((r) => r.status === "ok").length;
      const skip = Object.values(results).filter(
        (r) => r.status === "skip",
      ).length;
      const err = Object.values(results).filter(
        (r) => r.status === "error",
      ).length;
      console.log(
        `\n${ok}/${targets.length} extracted · ${skip} skipped · ${err} errors`,
      );
      if (err > 0) process.exitCode = 1;
    } finally {
      await browser.close();
    }
  } finally {
    await instance.cleanup();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
