/**
 * scripts/ingest/promise-commoncrawl-snapshot.ts
 *
 * Part 5 — Common Crawl as a THIRD 2022-retrospective capture source
 * (decision 2026-08-17, after LoC turned out to be unreachable by ANY
 * script — see ./common-crawl-archive.ts's header for the full story).
 * Captures land in the SAME local snapshot store the other capture tools
 * use (./site-snapshot-store.ts), under the SAME `snapshot://` identity
 * scheme, so promise-extract.ts needs no changes to consume this corpus.
 *
 * Same-site issue-page discovery here IS HTML-link parsing, same as every
 * other capture source: the homepage's own <a href> links are discovered
 * via the shared extractIssuePageUrls, so extract-time re-discovery from
 * the stored homepage HTML lands on the SAME URLs (the 2026-08-17 join
 * lesson: capture-time and extract-time discovery MUST use identical
 * inputs and write under the exact URL extract-time will re-derive, or the
 * store's exact-string manifest join silently drops every sub-page — see
 * matchDiscoveredRecords' doc comment for how this bit us once already,
 * mid-build, via a trailing-slash mismatch). What's different from the
 * other sources is the FETCHABILITY filter: a discovered URL only gets
 * fetched here if Common Crawl actually indexed it in the SAME crawl as
 * the homepage — matched against the index records already in hand, no
 * extra network round-trip. A discovered URL Common Crawl never crawled is
 * simply skipped (fewer issue pages found for that candidate, same
 * graceful degradation as a 404 on any other archive — never wrong data,
 * just less of it).
 *
 * Usage (dev machine with network; corpus = any spike --json output):
 *   npx tsx --env-file=.env.local scripts/ingest/_promise-corpus-spike.ts \
 *     --cycle 2022 --state TX --json > spike-tx-2022.json
 *   npx tsx scripts/ingest/promise-commoncrawl-snapshot.ts \
 *     --corpus spike-tx-2022.json --cycle 2022 --json > corpus-tx-2022-cc.json
 *   npx tsx --env-file=.env.local scripts/ingest/promise-extract.ts \
 *     --corpus corpus-tx-2022-cc.json --dry-run
 *
 * Flags: --corpus <file> (required), --cycle N (default 2022), --limit N,
 *   --max-pages N (default 6), --concurrency N (default 2 — be polite to
 *   Common Crawl, same posture as every other archive here), --dir <store>,
 *   --json.
 *
 * SMOKE-TEST FIRST: this fetch path (index query -> byte-range WARC fetch
 * -> gunzip -> HTTP/WARC header split) could not be exercised against a
 * live network from the environment that built it (no egress). The pure
 * parsing is unit-tested against a hand-built, really-gzipped WARC record,
 * but run this on ONE candidate before trusting it for a full run:
 *   npx tsx scripts/ingest/promise-commoncrawl-snapshot.ts \
 *     --corpus spike-tx-2022.json --cycle 2022 --limit 1
 */

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { extractIssuePageUrls, hostOf, htmlToText } from "./promise-extract";
import {
  loadSnapshotTargets,
  toCorpusRow,
  type SnapshotResult,
  type SnapshotTarget,
} from "./promise-site-snapshot";
import { defaultSnapshotDir, writeSnapshot } from "./site-snapshot-store";
import { replayUrl } from "./web-archives";
import {
  cycleDefaults,
  selectCanonicalCapture,
  toCdxCutoff,
} from "./_promise-corpus-spike";
import {
  fetchCollinfo,
  fetchIndexRecords,
  fetchWarcHtml,
  indexesInWindow,
  toCdxCapture,
  type CommonCrawlIndex,
  type CommonCrawlRecord,
} from "./common-crawl-archive";

// ---------------------------------------------------------------------------
// Pure selection logic (no network) — testable in isolation
// ---------------------------------------------------------------------------

/**
 * Same threshold promise-extract.ts already uses to skip an "empty shell"
 * page before spending an LLM call on it — reused here as the bar for
 * accepting a capture AT ALL. Live-run finding (2026-08-17, smoke test):
 * Common Crawl crawled nathanielmoran.com during a dead window — the
 * domain was pointed at hosting with no site configured yet — and captured
 * a cPanel default-parking-page redirect stub (`<body></body>`, a
 * meta-refresh to /cgi-sys/defaultwebpage.cgi). That's a real HTTP 200
 * response with real bytes; nothing about the fetch mechanics flags it.
 * Only the content itself — near-zero real text — gives it away. A crawl
 * whose "homepage" is a parking-page stub must be rejected and an OLDER
 * crawl tried, or the candidate looks successfully sourced while actually
 * holding zero real campaign content.
 */
const MIN_HOMEPAGE_TEXT_CHARS = 100;

export function looksLikeRealPage(html: string): boolean {
  return htmlToText(html).length >= MIN_HOMEPAGE_TEXT_CHARS;
}

/** Records whose path is the site root ("/" or ""), nearest before cutoff. */
export function selectHomepageRecord(
  records: CommonCrawlRecord[],
  cutoffCompact: string,
): CommonCrawlRecord | null {
  const homepageCandidates = records.filter((r) => {
    try {
      const path = new URL(r.original).pathname;
      return path === "/" || path === "";
    } catch {
      return false;
    }
  });
  const chosen = selectCanonicalCapture(
    homepageCandidates.map(toCdxCapture),
    cutoffCompact,
  );
  if (!chosen) return null;
  return (
    homepageCandidates.find(
      (r) => r.original === chosen.original && r.timestamp === chosen.timestamp,
    ) ?? null
  );
}

const normalizeForJoin = (url: string): string => url.replace(/\/$/u, "");

export interface DiscoveredCommonCrawlPage {
  /** The URL extract-time discovery will independently produce — the
   * manifest write key MUST be this, not record.original (see below). */
  discoveredUrl: string;
  record: CommonCrawlRecord;
}

/**
 * Among the discovered issue-page URLs (from HTML link parsing on the
 * fetched homepage), keep only the ones this crawl actually indexed —
 * matched by normalized URL (trailing slash tolerant), capped, excluding
 * the homepage itself. One record per normalized URL (first match wins).
 *
 * Returns pairs, not bare records: the CALLER must writeSnapshot() under
 * `discoveredUrl`, NOT `record.original`. Common Crawl's own URL form can
 * differ from the discovered one by exactly the trailing slash this
 * function tolerates (e.g. discovered ".../issues", CC indexed
 * ".../issues/" — confirmed live against crenshawforcongress.com). The
 * manifest join at extract time is an EXACT string match on whatever
 * extractIssuePageUrls independently re-discovers from the same homepage
 * HTML — writing under record.original would key the sub-page differently
 * than extract-time discovery looks it up under, silently dropping it
 * (the same join-consistency bug fixed twice already today, see
 * promise-extract.ts's discoveryBase comment).
 */
export function matchDiscoveredRecords(
  records: CommonCrawlRecord[],
  discoveredUrls: string[],
  homepageOriginal: string,
  cap: number,
): DiscoveredCommonCrawlPage[] {
  const byNormalized = new Map<string, CommonCrawlRecord>();
  for (const r of records) {
    const key = normalizeForJoin(r.original);
    if (!byNormalized.has(key)) byNormalized.set(key, r);
  }
  const homeKey = normalizeForJoin(homepageOriginal);
  const out: DiscoveredCommonCrawlPage[] = [];
  const seen = new Set<string>();
  for (const url of discoveredUrls) {
    if (out.length >= cap) break;
    const key = normalizeForJoin(url);
    if (key === homeKey || seen.has(key)) continue;
    const match = byNormalized.get(key);
    if (!match) continue;
    seen.add(key);
    out.push({ discoveredUrl: url, record: match });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Per-candidate capture (networked)
// ---------------------------------------------------------------------------

interface CaptureWindow {
  fromIso: string;
  toIso: string;
  fromCompact: string;
  cutoffCompact: string;
}

/**
 * Two different reasons a candidate ends up with zero captures, and they
 * must not be conflated: a genuine miss means every index query SUCCEEDED
 * and simply had nothing for this site; "blocked" means the query itself
 * never got an answer (2026-08-17 national-run finding: 30/292 captured
 * with the rest logged identically as "no capture" — indistinguishable from
 * Common Crawl's index server rate-limiting the run). The circuit breaker
 * in main() watches for CC_STATUS_BLOCKED specifically.
 */
export const CC_STATUS_GENUINE_MISS = "no Common Crawl capture in window";
export const CC_STATUS_BLOCKED =
  "index queries failed (Common Crawl unreachable/blocked?)";

async function snapshotCandidateFromCommonCrawl(
  target: SnapshotTarget,
  indexes: CommonCrawlIndex[],
  window: CaptureWindow,
  dir: string,
  maxPages: number,
  fetcher: typeof fetch,
): Promise<SnapshotResult & { ccStatus: string }> {
  const miss = (ccStatus: string) => ({
    target,
    canonicalCaptureUrl: null,
    pagesCaptured: 0,
    pagesFailed: 0,
    ccStatus,
  });

  const hostname = hostOf(target.website);
  if (!hostname) return miss("unparseable website URL");

  let anyIndexQueryFailed = false;
  for (const index of indexes) {
    const records = await fetchIndexRecords(index, hostname, fetcher);
    if (!records) {
      anyIndexQueryFailed = true;
      continue; // this index's query itself failed — try an older one
    }
    const inWindow = records.filter(
      (r) =>
        r.timestamp >= window.fromCompact &&
        r.timestamp <= window.cutoffCompact,
    );
    const homeRecord = selectHomepageRecord(inWindow, window.cutoffCompact);
    if (!homeRecord) continue; // no homepage in THIS crawl — try an older one

    const homeHtml = await fetchWarcHtml(homeRecord, fetcher);
    if (!homeHtml) continue; // fetch/parse failed — try an older crawl's copy
    if (!looksLikeRealPage(homeHtml)) {
      // A real HTTP 200 with real bytes, but the content itself is a
      // parking-page stub (see looksLikeRealPage's comment) — try an older
      // crawl rather than accepting this as a successful capture.
      process.stderr.write(
        `[promise-commoncrawl-snapshot] ${target.name}: ${index.id} homepage ` +
          `looks like a placeholder/parked page (too little text) — trying an older crawl\n`,
      );
      continue;
    }

    const timestamp = homeRecord.timestamp;
    // Each page keeps ITS OWN Common Crawl capture timestamp, not the
    // homepage's — an issue page's crawl can legitimately be a different
    // date than the homepage's, and made_at (promise-extract.ts, load-
    // bearing for kept/broken timing adjudication) is derived from this.
    const record = (pageTimestamp: string, original: string, html: string) =>
      writeSnapshot(dir, {
        timestamp: pageTimestamp,
        original,
        // Common Crawl has no human-browsable replay host — cite exactly
        // which crawl + URL this came from (machine-precise, not
        // clickable). ALSO doubles as promise-extract.ts's discovery base
        // for this capture (it's not a replay URL, so it resolves as a
        // plain original) — matching what discovery used HERE, the
        // 2026-08-17 join lesson.
        finalLiveUrl: homeRecord.original,
        candidateId: target.candidateId,
        html,
        fetchedAt: new Date().toISOString(),
      });

    record(timestamp, target.website, homeHtml);
    let pagesCaptured = 1;
    let pagesFailed = 0;

    const discovered = extractIssuePageUrls(
      homeHtml,
      homeRecord.original,
      // Discover generously; matchDiscoveredRecords below narrows to what
      // this crawl actually has, so the cap here just bounds link-parsing
      // noise, not the final page count.
      Math.max(maxPages * 4, 20),
    );
    const issuePages = matchDiscoveredRecords(
      inWindow,
      discovered,
      homeRecord.original,
      maxPages - 1,
    );
    for (const { discoveredUrl, record: issueRecord } of issuePages) {
      const html = await fetchWarcHtml(issueRecord, fetcher);
      if (!html) {
        pagesFailed++;
        continue;
      }
      // Write under discoveredUrl (what extract-time discovery will
      // independently reproduce), NOT issueRecord.original (CC's own URL
      // form, which can differ by a trailing slash) — see
      // matchDiscoveredRecords' doc comment.
      record(issueRecord.timestamp, discoveredUrl, html);
      pagesCaptured++;
    }

    return {
      target,
      canonicalCaptureUrl: replayUrl("snapshot", timestamp, target.website),
      pagesCaptured,
      pagesFailed,
      ccStatus: `captured (${index.id})`,
    };
  }

  return miss(anyIndexQueryFailed ? CC_STATUS_BLOCKED : CC_STATUS_GENUINE_MISS);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * shouldAbort is checked before each new item is picked up — a worker that
 * sees it return true simply stops, leaving later items unattempted (not
 * failed). Used as the circuit breaker's enforcement point below.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
  shouldAbort: () => boolean = () => false,
): Promise<(R | undefined)[]> {
  const out = new Array<R | undefined>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (let i = next++; i < items.length; i = next++) {
        if (shouldAbort()) return;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const corpusPath = arg("--corpus");
  if (!corpusPath) {
    console.error(
      "Usage: promise-commoncrawl-snapshot.ts --corpus <spike --json file> " +
        "[--cycle 2022] [--limit N] [--max-pages N] [--concurrency N] [--dir DIR] [--json]",
    );
    process.exit(1);
  }
  const cycle = Number(arg("--cycle") ?? 2022);
  const limit = Number(arg("--limit") ?? 0);
  const maxPages = Math.max(1, Number(arg("--max-pages") ?? 6));
  const concurrency = Math.max(1, Number(arg("--concurrency") ?? 2));
  const dir = arg("--dir") ?? defaultSnapshotDir();
  const asJson = process.argv.includes("--json");

  const defaults = cycleDefaults(cycle);
  const window: CaptureWindow = {
    fromIso: `${defaults.fromDate}T00:00:00`,
    toIso: `${defaults.electionDay}T23:59:59`,
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
    `[promise-commoncrawl-snapshot] fetching the Common Crawl index catalog...\n`,
  );
  const collinfo = await fetchCollinfo(fetch);
  if (!collinfo) {
    console.error(
      "[promise-commoncrawl-snapshot] could not fetch collinfo.json (index.commoncrawl.org unreachable) — aborting.",
    );
    process.exit(1);
  }
  const indexes = indexesInWindow(collinfo, window.fromIso, window.toIso);
  if (indexes.length === 0) {
    console.error(
      `[promise-commoncrawl-snapshot] no Common Crawl indexes overlap ${window.fromIso}..${window.toIso} — nothing to do.`,
    );
    process.exit(1);
  }
  process.stderr.write(
    `[promise-commoncrawl-snapshot] ${targets.length} candidates, ${indexes.length} candidate crawls ` +
      `(${indexes[indexes.length - 1].id}..${indexes[0].id}), max_pages=${maxPages} concurrency=${concurrency} dir=${dir}\n`,
  );

  // Circuit breaker (2026-08-17 finding): a candidate whose EVERY index
  // query goes unanswered is almost certainly a rate-limited/blocked run,
  // not 14 real misses in a row. Tripping after enough of those IN A ROW
  // stops the run from grinding through hundreds more doomed requests and
  // deepening whatever throttle caused it.
  const BLOCKED_CIRCUIT_BREAKER = 20;
  let consecutiveBlocked = 0;
  let breakerTripped = false;

  const results = (
    await mapWithConcurrency(
      targets,
      concurrency,
      async (t) => {
        let r: SnapshotResult & { ccStatus: string };
        try {
          r = await snapshotCandidateFromCommonCrawl(
            t,
            indexes,
            window,
            dir,
            maxPages,
            fetch,
          );
        } catch (err) {
          // A mid-body socket drop (response.text()/arrayBuffer() throwing
          // after headers already arrived) is not caught by fetchSoft's own
          // retry loop — without this, one candidate's bad luck aborts the
          // whole multi-hundred-candidate run instead of just costing this
          // one candidate, undermining the fail-soft posture the rest of
          // this pipeline is built around (see common-crawl-archive.ts).
          process.stderr.write(
            `[promise-commoncrawl-snapshot] ${t.name}: uncaught error, treating as blocked (${
              err instanceof Error ? err.message : String(err)
            })\n`,
          );
          r = {
            target: t,
            canonicalCaptureUrl: null,
            pagesCaptured: 0,
            pagesFailed: 0,
            ccStatus: CC_STATUS_BLOCKED,
          };
        }
        if (r.ccStatus === CC_STATUS_BLOCKED) {
          consecutiveBlocked++;
          if (
            consecutiveBlocked >= BLOCKED_CIRCUIT_BREAKER &&
            !breakerTripped
          ) {
            breakerTripped = true;
            process.stderr.write(
              `[promise-commoncrawl-snapshot] CIRCUIT BREAKER: ${BLOCKED_CIRCUIT_BREAKER} consecutive ` +
                "candidates got zero answered Common Crawl index queries — almost certainly rate-limited " +
                "or blocked. Aborting the remaining run instead of grinding through more doomed requests.\n",
            );
          }
        } else {
          consecutiveBlocked = 0;
        }
        return r;
      },
      () => breakerTripped,
    )
  ).filter((r): r is SnapshotResult & { ccStatus: string } => r !== undefined);

  for (const r of results) {
    process.stderr.write(
      `[promise-commoncrawl-snapshot] ${r.target.name}: ${r.ccStatus}` +
        (r.pagesCaptured > 0 ? ` (${r.pagesCaptured} pages)` : "") +
        "\n",
    );
  }

  const captured = results.filter((r) => r.canonicalCaptureUrl !== null);
  const blocked = results.filter((r) => r.ccStatus === CC_STATUS_BLOCKED);
  const genuineMiss = results.filter(
    (r) => r.ccStatus === CC_STATUS_GENUINE_MISS,
  );
  const notAttempted = targets.length - results.length;
  const pages = results.reduce((n, r) => n + r.pagesCaptured, 0);
  process.stderr.write(
    `[promise-commoncrawl-snapshot] done: ${captured.length}/${targets.length} sites captured (${pages} pages); ` +
      `${genuineMiss.length} genuinely not in Common Crawl; ${blocked.length} blocked/unknown` +
      (notAttempted > 0
        ? `; ${notAttempted} never attempted (circuit breaker)`
        : "") +
      ` — into ${dir}\n`,
  );

  if (asJson) {
    console.log(
      JSON.stringify(
        results.map((r) => toCorpusRow(r, "commoncrawl")).filter(Boolean),
        null,
        2,
      ),
    );
  }
}

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error("[promise-commoncrawl-snapshot] fatal:", err);
    process.exit(1);
  });
}
