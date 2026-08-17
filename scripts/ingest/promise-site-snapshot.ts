/**
 * scripts/ingest/promise-site-snapshot.ts
 *
 * Part 5 — SELF-HOSTED capture of live campaign sites (decision 2026-08-17,
 * Muxin: "we do it ourselves"). The third-party archive layer proved
 * unreliable for the current cycle — Wayback's outages blocked runs for
 * days, and LoC's replay host sits behind a Cloudflare bot challenge no
 * script can pass — so this tool fetches each corpus candidate's LIVE
 * homepage + issue pages and stores the raw HTML in the local snapshot
 * store (./site-snapshot-store.ts, gitignored).
 *
 * Each candidate's pages are pinned under one 14-digit UTC timestamp as
 * `snapshot://<ts>/<original-url>` — the same replay-URL shape as Wayback /
 * LoC (./web-archives.ts) — so the extractor, made_at, cycle derivation and
 * deterministic promise ids all work unchanged. With --json it emits a
 * corpus file promise-extract.ts consumes directly.
 *
 * What it does NOT do: it never replaces an archive citation for PAST
 * cycles (a self-snapshot taken today is not evidence of what a 2022 site
 * said — retrospectives stay on Wayback), and the stored full-page copies
 * never ship anywhere (copyright posture: only verbatim quotes with
 *  citations reach the product).
 *
 * READ-ONLY with respect to the DB. Networked against the LIVE candidate
 * sites, so it runs from a normal dev machine:
 *
 *   npx tsx --env-file=.env.local scripts/ingest/_promise-corpus-spike.ts \
 *     --state TX --json > /tmp/spike-tx.json
 *   npx tsx scripts/ingest/promise-site-snapshot.ts \
 *     --corpus /tmp/spike-tx.json --json > /tmp/corpus-tx-snapshot.json
 *   npx tsx --env-file=.env.local scripts/ingest/promise-extract.ts \
 *     --corpus /tmp/corpus-tx-snapshot.json
 *
 * Flags: --corpus <spike --json file> (required), --limit N, --max-pages N
 * (default 6, homepage + N-1 issue pages), --concurrency N (default 2 —
 * these are small campaign sites; be polite), --dir <store dir> (default
 * site-snapshots/, or SNAPSHOT_DIR), --json (emit the corpus to stdout).
 */

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { extractIssuePageUrls, fetchPageSoft } from "./promise-extract";
import {
  defaultSnapshotDir,
  nowTimestamp,
  writeSnapshot,
} from "./site-snapshot-store";
import { replayUrl } from "./web-archives";

// ---------------------------------------------------------------------------
// Target selection (pure, unit-tested)
// ---------------------------------------------------------------------------

export interface SnapshotTarget {
  candidateId: string;
  name: string;
  state: string;
  office: string;
  district: string | null;
  website: string;
  bucket: string;
}

/**
 * Rows worth snapshotting from a spike --json payload: anything with a
 * resolved candidate AND a real campaign URL — including
 * `website_no_captures` and `wayback_error` rows, which is the point (this
 * tool exists because the archives could not cover them). Social-profile
 * URLs stay excluded (different extraction problem, same as the spike).
 */
export function loadSnapshotTargets(payload: unknown): SnapshotTarget[] {
  if (!Array.isArray(payload)) return [];
  const out: SnapshotTarget[] = [];
  for (const raw of payload) {
    if (raw === null || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (r.bucket === "social_media_only") continue;
    if (typeof r.candidateId !== "string" || r.candidateId.length === 0)
      continue;
    if (typeof r.website !== "string" || r.website.length === 0) continue;
    out.push({
      candidateId: r.candidateId,
      name: typeof r.name === "string" ? r.name : "(unknown)",
      state: typeof r.state === "string" ? r.state : "",
      office: typeof r.office === "string" ? r.office : "",
      district: typeof r.district === "string" ? r.district : null,
      website: r.website,
      bucket: typeof r.bucket === "string" ? r.bucket : "",
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Per-candidate capture
// ---------------------------------------------------------------------------

export interface SnapshotResult {
  target: SnapshotTarget;
  /** null when the live homepage was unreachable. */
  canonicalCaptureUrl: string | null;
  pagesCaptured: number;
  pagesFailed: number;
}

async function snapshotCandidate(
  target: SnapshotTarget,
  dir: string,
  maxPages: number,
  fetcher: typeof fetch,
): Promise<SnapshotResult> {
  const timestamp = nowTimestamp();
  const home = await fetchPageSoft(
    target.website,
    fetcher,
    `live home ${target.name}`,
  );
  if (!home) {
    return {
      target,
      canonicalCaptureUrl: null,
      pagesCaptured: 0,
      pagesFailed: 1,
    };
  }

  const record = (original: string, finalLiveUrl: string, html: string) =>
    writeSnapshot(dir, {
      timestamp,
      original,
      finalLiveUrl,
      candidateId: target.candidateId,
      html,
      fetchedAt: new Date().toISOString(),
    });

  record(target.website, home.finalUrl, home.html);
  let pagesCaptured = 1;
  let pagesFailed = 0;

  // Discover issue-page links against the REDIRECT-FOLLOWED final URL, not
  // the FEC-filed target.website: a site that moved domains serves nav
  // links whose host matches where it lives now, not where it was filed
  // (2026-08-17 finding) — using target.website as the base silently zeroed
  // out issue-page discovery for any such site.
  for (const url of extractIssuePageUrls(
    home.html,
    home.finalUrl,
    maxPages - 1,
  )) {
    const page = await fetchPageSoft(url, fetcher, `live page ${url}`);
    if (!page) {
      pagesFailed++;
      continue;
    }
    record(url, page.finalUrl, page.html);
    pagesCaptured++;
  }

  return {
    target,
    canonicalCaptureUrl: replayUrl("snapshot", timestamp, target.website),
    pagesCaptured,
    pagesFailed,
  };
}

/**
 * Corpus row (promise-extract.ts `loadCorpusRows` shape) for a capture.
 *
 * captureArchive defaults to "snapshot" (this file's own self-hosted
 * live-fetch source) but MUST be overridden by other capture tools that
 * reuse this row-builder — e.g. promise-commoncrawl-snapshot.ts passes
 * "commoncrawl" — so a third-party 2022 crawl isn't indistinguishable from
 * a live self-fetch taken today (provenance, not just storage addressing;
 * both still share the `snapshot://` store scheme).
 */
export function toCorpusRow(
  result: SnapshotResult,
  captureArchive = "snapshot",
): Record<string, unknown> | null {
  if (!result.canonicalCaptureUrl) return null;
  const t = result.target;
  return {
    state: t.state,
    office: t.office,
    district: t.district,
    name: t.name,
    bucket: "website_archived",
    candidateId: t.candidateId,
    website: t.website,
    captureCount: result.pagesCaptured,
    canonicalCaptureUrl: result.canonicalCaptureUrl,
    captureArchive,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (let i = next++; i < items.length; i = next++) {
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
      "Usage: promise-site-snapshot.ts --corpus <spike --json file> " +
        "[--limit N] [--max-pages N] [--concurrency N] [--dir DIR] [--json]",
    );
    process.exit(1);
  }
  const limit = Number(arg("--limit") ?? 0);
  const maxPages = Math.max(1, Number(arg("--max-pages") ?? 6));
  const concurrency = Math.max(1, Number(arg("--concurrency") ?? 2));
  const dir = arg("--dir") ?? defaultSnapshotDir();
  const asJson = process.argv.includes("--json");

  let targets = loadSnapshotTargets(
    JSON.parse(readFileSync(corpusPath, "utf8")),
  );
  if (limit > 0) targets = targets.slice(0, limit);
  if (targets.length === 0) {
    console.error(`No snapshot-eligible rows in ${corpusPath}`);
    process.exit(1);
  }

  process.stderr.write(
    `[promise-site-snapshot] capturing ${targets.length} live campaign sites ` +
      `(max_pages=${maxPages} concurrency=${concurrency} dir=${dir})\n`,
  );

  const results = await mapWithConcurrency(targets, concurrency, (t) =>
    snapshotCandidate(t, dir, maxPages, fetch),
  );

  const captured = results.filter((r) => r.canonicalCaptureUrl !== null);
  const unreachable = results.filter((r) => r.canonicalCaptureUrl === null);
  const pages = results.reduce((n, r) => n + r.pagesCaptured, 0);
  process.stderr.write(
    `[promise-site-snapshot] done: ${captured.length}/${results.length} sites ` +
      `captured (${pages} pages) into ${dir}\n`,
  );
  for (const r of unreachable) {
    process.stderr.write(
      `[promise-site-snapshot] UNREACHABLE ${r.target.name} → ${r.target.website} ` +
        `(spike bucket was ${r.target.bucket})\n`,
    );
  }

  if (asJson) {
    console.log(
      JSON.stringify(
        results.map((r) => toCorpusRow(r)).filter(Boolean),
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
    console.error("[promise-site-snapshot] fatal:", err);
    process.exit(1);
  });
}
