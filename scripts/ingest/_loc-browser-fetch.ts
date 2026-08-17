/**
 * scripts/ingest/_loc-browser-fetch.ts
 *
 * Part 5 — fetch Library of Congress elections-web-archive captures through
 * a REAL, VISIBLE Chrome window (2026-08-17). Why: webarchive.loc.gov sits
 * behind a Cloudflare bot challenge that blocks every headless client we
 * tried (curl, node fetch, Exa's crawler) — but a real browser passes it
 * like a human does. This tool drives one, politely and at human-ish
 * volume, to recover PAST-cycle captures (e.g. the 2022 retrospective)
 * that only LoC and the outage-prone Wayback Machine hold.
 *
 * You watch it work: a Chrome window opens; if a "Just a moment…"
 * check appears, let it finish (or click it) — the script waits and
 * retries. The Cloudflare clearance cookie persists in a local profile
 * (site-snapshots/loc-browser-profile/, gitignored), so later runs
 * usually sail straight through.
 *
 * For each corpus candidate it: reads LoC's Memento TimeMap for the
 * campaign URL, picks the canonical capture (last at or before election
 * day — the plan's capture policy), loads the replay URL plus same-site
 * issue pages at that timestamp, and stores each page's RAW response body
 * in the local snapshot store keyed by the LoC capture identity
 * (timestamp + original URL). The manifest's finalLiveUrl field records
 * the public LoC replay URL, so every stored page has a
 * publicly-human-verifiable citation: anyone with a browser can open
 * https://webarchive.loc.gov/all/<ts>/<original> and see the same page.
 *
 * With --json it emits an extraction-ready corpus (snapshot:// capture
 * URLs) for promise-extract.ts.
 *
 * Usage (dev machine with Chrome; corpus = any spike --json output):
 *   npx tsx scripts/ingest/_loc-browser-fetch.ts \
 *     --corpus spike-tx-2022.json --cycle 2022 --json > corpus-tx-2022-loc.json
 *   Flags: --corpus <file> (required), --cycle N (default 2022; sets the
 *   capture window), --limit N, --max-pages N (default 6), --dir <store>,
 *   --json.
 */

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join, resolve } from "node:path";
import { chromium, type Page } from "@playwright/test";
import { extractIssuePageUrls } from "./promise-extract";
import {
  loadSnapshotTargets,
  toCorpusRow,
  type SnapshotResult,
} from "./promise-site-snapshot";
import {
  cycleDefaults,
  selectCanonicalCapture,
  toCdxCutoff,
} from "./_promise-corpus-spike";
import { defaultSnapshotDir, writeSnapshot } from "./site-snapshot-store";
import {
  locTimeMapUrl,
  parseMementoTimeMap,
  parseReplayUrl,
  replayUrl,
} from "./web-archives";

/** Human-ish pacing between page loads (LoC is a library, not an API). */
const PAGE_DELAY_MS = 1500;
/** How long to wait for a Cloudflare challenge to clear before retrying. */
const CHALLENGE_WAIT_MS = 8000;
const NAV_TIMEOUT_MS = 60_000;

interface BrowserPage {
  /** Final URL after redirects (for replay loads: the EXACT capture). */
  finalUrl: string;
  /** RAW response body — not the rendered DOM, so no injected chrome. */
  body: string;
  status: number;
}

/**
 * Load a URL and return the raw navigation-response body. A non-ok status
 * (Cloudflare challenges arrive as 403) gets a grace period for the
 * challenge to clear — automatically or by the human at the keyboard —
 * then one retry.
 */
async function loadRaw(page: Page, url: string): Promise<BrowserPage | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    let response;
    try {
      response = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: NAV_TIMEOUT_MS,
      });
    } catch {
      return null;
    }
    if (!response) return null;
    if (response.ok()) {
      return {
        finalUrl: response.url(),
        body: await response.text(),
        status: response.status(),
      };
    }
    if (response.status() === 404) {
      return { finalUrl: response.url(), body: "", status: 404 };
    }
    process.stderr.write(
      `[loc-browser-fetch] ${url} → ${response.status()}; waiting for the ` +
        `challenge to clear (complete it in the Chrome window if asked)…\n`,
    );
    await page.waitForTimeout(CHALLENGE_WAIT_MS);
  }
  return null;
}

async function fetchCandidateFromLoc(
  page: Page,
  target: ReturnType<typeof loadSnapshotTargets>[number],
  window: { fromCompact: string; cutoffCompact: string },
  dir: string,
  maxPages: number,
): Promise<SnapshotResult & { locStatus: string }> {
  const miss = (locStatus: string) => ({
    target,
    canonicalCaptureUrl: null,
    pagesCaptured: 0,
    pagesFailed: 0,
    locStatus,
  });

  const timeMap = await loadRaw(page, locTimeMapUrl(target.website));
  if (!timeMap) return miss("timemap unreachable");
  if (timeMap.status === 404) return miss("no LoC captures at all");

  const inWindow = parseMementoTimeMap(timeMap.body).filter(
    (c) =>
      c.timestamp >= window.fromCompact && c.timestamp <= window.cutoffCompact,
  );
  const canonical = selectCanonicalCapture(inWindow, window.cutoffCompact);
  if (!canonical) return miss(`no in-window capture (of ${inWindow.length})`);

  await page.waitForTimeout(PAGE_DELAY_MS);
  const home = await loadRaw(
    page,
    replayUrl("loc", canonical.timestamp, canonical.original),
  );
  if (!home || home.status === 404) return miss("replay load failed");

  // The EXACT capture LoC served, from the post-redirect URL.
  const served = parseReplayUrl(home.finalUrl) ?? {
    archive: "loc" as const,
    timestamp: canonical.timestamp,
    original: canonical.original,
  };
  const record = (ts: string, original: string, locUrl: string, body: string) =>
    writeSnapshot(dir, {
      timestamp: ts,
      original,
      finalLiveUrl: locUrl,
      candidateId: target.candidateId,
      html: body,
      fetchedAt: new Date().toISOString(),
    });

  record(served.timestamp, target.website, home.finalUrl, home.body);
  let pagesCaptured = 1;
  let pagesFailed = 0;

  for (const url of extractIssuePageUrls(
    home.body,
    target.website,
    maxPages - 1,
  )) {
    await page.waitForTimeout(PAGE_DELAY_MS);
    const sub = await loadRaw(page, replayUrl("loc", served.timestamp, url));
    if (!sub || sub.status === 404) {
      pagesFailed++;
      continue;
    }
    const subServed = parseReplayUrl(sub.finalUrl);
    record(
      subServed?.timestamp ?? served.timestamp,
      url,
      sub.finalUrl,
      sub.body,
    );
    pagesCaptured++;
  }

  return {
    target,
    canonicalCaptureUrl: replayUrl(
      "snapshot",
      served.timestamp,
      target.website,
    ),
    pagesCaptured,
    pagesFailed,
    locStatus: "captured",
  };
}

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const corpusPath = arg("--corpus");
  if (!corpusPath) {
    console.error(
      "Usage: _loc-browser-fetch.ts --corpus <spike --json file> " +
        "[--cycle 2022] [--limit N] [--max-pages N] [--dir DIR] [--json]",
    );
    process.exit(1);
  }
  const cycle = Number(arg("--cycle") ?? 2022);
  const limit = Number(arg("--limit") ?? 0);
  const maxPages = Math.max(1, Number(arg("--max-pages") ?? 6));
  const dir = arg("--dir") ?? defaultSnapshotDir();
  const asJson = process.argv.includes("--json");

  const defaults = cycleDefaults(cycle);
  const window = {
    fromCompact: `${defaults.fromDate.replace(/-/gu, "")}000000`,
    cutoffCompact: toCdxCutoff(defaults.electionDay),
  };

  let targets = loadSnapshotTargets(
    JSON.parse(readFileSync(corpusPath, "utf8")),
  );
  if (limit > 0) targets = targets.slice(0, limit);
  if (targets.length === 0) {
    console.error(`No eligible rows in ${corpusPath}`);
    process.exit(1);
  }

  process.stderr.write(
    `[loc-browser-fetch] ${targets.length} candidates, window ` +
      `${defaults.fromDate}..${defaults.electionDay}. A Chrome window will ` +
      "open — if a 'Just a moment…' check appears, let it finish; the " +
      "script waits.\n",
  );

  const profileDir = join(dir, "loc-browser-profile");
  let context;
  try {
    context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      channel: "chrome",
      viewport: null,
    });
  } catch {
    // No system Chrome — fall back to Playwright's bundled Chromium.
    context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      viewport: null,
    });
  }
  const page = context.pages()[0] ?? (await context.newPage());

  const results: (SnapshotResult & { locStatus: string })[] = [];
  for (const target of targets) {
    const result = await fetchCandidateFromLoc(
      page,
      target,
      window,
      dir,
      maxPages,
    );
    process.stderr.write(
      `[loc-browser-fetch] ${target.name}: ${result.locStatus}` +
        (result.pagesCaptured > 0 ? ` (${result.pagesCaptured} pages)` : "") +
        "\n",
    );
    results.push(result);
    await page.waitForTimeout(PAGE_DELAY_MS);
  }
  await context.close();

  const captured = results.filter((r) => r.canonicalCaptureUrl !== null);
  process.stderr.write(
    `[loc-browser-fetch] done: ${captured.length}/${results.length} candidates ` +
      `captured into ${dir}\n`,
  );

  if (asJson) {
    console.log(
      JSON.stringify(results.map(toCorpusRow).filter(Boolean), null, 2),
    );
  }
}

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error("[loc-browser-fetch] fatal:", err);
    process.exit(1);
  });
}
