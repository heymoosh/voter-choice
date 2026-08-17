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
/**
 * How long the HUMAN gets to click the Cloudflare checkbox before we give
 * up on a URL (first live run 2026-08-17: 3×8s was no time to react at
 * all — the run steamrolled through 31 "timemap unreachable" misses while
 * the checkbox sat unclicked).
 */
const CHALLENGE_TOTAL_MS = 120_000;
const CHALLENGE_POLL_MS = 3000;
const NAV_TIMEOUT_MS = 60_000;

interface BrowserPage {
  /** Final URL after redirects (for replay loads: the EXACT capture). */
  finalUrl: string;
  /** RAW response body — not the rendered DOM, so no injected chrome. */
  body: string;
  status: number;
}

async function gotoSafe(page: Page, url: string) {
  try {
    return await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    });
  } catch {
    return null;
  }
}

function toBody(response: {
  url(): string;
  text(): Promise<string>;
  status(): number;
}): Promise<BrowserPage> {
  return response.text().then((body) => ({
    finalUrl: response.url(),
    body,
    status: response.status(),
  }));
}

const CHALLENGE_TITLE_RE = /just a moment|attention required|checking your/iu;

/**
 * Load a URL and return the raw navigation-response body. A non-ok,
 * non-404 status is a Cloudflare challenge ONLY if the loaded page's title
 * actually matches the challenge markers ("Just a moment…" etc) — a plain
 * LoC outage (e.g. a bare 503) renders no such page, and telling the
 * operator to click a checkbox that was never shown just burns the full
 * wait with nothing to click. On an actual challenge: the page stays put
 * (reloading would reset an in-progress checkbox) while the human clicks,
 * polling the tab title until the challenge page is gone, then re-requests
 * the URL — the clearance cookie earned by the click makes the retry a
 * clean 200. Sets `loadRaw.challengeCleared` the first time a challenge is
 * actually cleared so the caller can distinguish "human clicked through"
 * from "never got past the wall".
 */
async function loadRaw(page: Page, url: string): Promise<BrowserPage | null> {
  let response = await gotoSafe(page, url);
  if (!response) return null;
  if (response.ok()) return toBody(response);
  if (response.status() === 404) {
    return { finalUrl: response.url(), body: "", status: 404 };
  }

  const title = await page.title().catch(() => "");
  if (!CHALLENGE_TITLE_RE.test(title)) {
    process.stderr.write(
      `[loc-browser-fetch] LoC returned ${response.status()} on ${url} ` +
        `(title="${title}") — not a Cloudflare challenge page, likely an ` +
        "LoC outage. Skipping without waiting for a click.\n",
    );
    return null;
  }

  process.stderr.write(
    `\n[loc-browser-fetch] Cloudflare check (${response.status()}) on ${url}\n` +
      `  >>> CLICK THE CHECKBOX in the Chrome window now — waiting up to ` +
      `${CHALLENGE_TOTAL_MS / 1000}s…\n`,
  );
  const HEARTBEAT_EVERY_MS = 15_000;
  let sinceHeartbeat = 0;
  for (
    let waited = 0;
    waited < CHALLENGE_TOTAL_MS;
    waited += CHALLENGE_POLL_MS
  ) {
    await page.waitForTimeout(CHALLENGE_POLL_MS);
    const title = await page.title().catch(() => "");
    if (!CHALLENGE_TITLE_RE.test(title)) break;
    // The wait loop otherwise prints nothing for up to 120s — indistinguishable
    // from a hung script. A periodic heartbeat (2026-08-17, live-run
    // confusion: "I'm clicking but I don't see a difference in terminal")
    // says the poll loop is alive and still seeing the challenge title.
    sinceHeartbeat += CHALLENGE_POLL_MS;
    if (sinceHeartbeat >= HEARTBEAT_EVERY_MS) {
      sinceHeartbeat = 0;
      process.stderr.write(
        `[loc-browser-fetch]   ...still waiting (${Math.round((waited + CHALLENGE_POLL_MS) / 1000)}s/${CHALLENGE_TOTAL_MS / 1000}s, title="${title}") — click the checkbox in the Chrome window if you haven't\n`,
      );
    }
  }

  // Whatever happened above, one clean re-request tells the truth: with a
  // clearance cookie it is a 200; without one it is another 403.
  response = await gotoSafe(page, url);
  if (!response) return null;
  if (response.ok()) {
    loadRaw.challengeCleared = true;
    process.stderr.write(
      "[loc-browser-fetch] challenge cleared — the cookie persists, the rest " +
        "of the run should not ask again\n",
    );
    return toBody(response);
  }
  if (response.status() === 404) {
    return { finalUrl: response.url(), body: "", status: 404 };
  }
  return null;
}
loadRaw.challengeCleared = false;

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

  // Discover issue-page links against the capture's OWN served original, not
  // target.website: a site that moved domains between filing and this LoC
  // capture serves links whose host matches the capture, not the old filing
  // (same 2026-08-17 finding as promise-site-snapshot.ts / promise-extract.ts).
  for (const url of extractIssuePageUrls(
    home.body,
    served.original,
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
  process.stderr.write(
    `[loc-browser-fetch] browser: ${context.browser()?.version() ?? "persistent chromium"}\n`,
  );

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

    // Fail fast instead of grinding through every candidate against a wall:
    // if the very first candidate could not even fetch its TimeMap and no
    // challenge was ever cleared, the clearance flow is not working — 30
    // more attempts will not change that.
    if (
      results.length === 1 &&
      result.locStatus === "timemap unreachable" &&
      !loadRaw.challengeCleared
    ) {
      process.stderr.write(
        "\n[loc-browser-fetch] ABORTING: the very first candidate's TimeMap " +
          "never loaded and no Cloudflare challenge was completed. Either " +
          "the checkbox was not clicked in time, Cloudflare refuses this " +
          "browser even with a click, or LoC itself is down (check the " +
          "stderr line above for this candidate — it says which). Re-run " +
          "and click the checkbox when prompted; if it still aborts here on " +
          "a challenge, LoC needs the fully-manual save path — ask Claude " +
          "to build the manual-import mode.\n",
      );
      await context.close();
      process.exit(2);
    }

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
