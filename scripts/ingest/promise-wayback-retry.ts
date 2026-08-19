/**
 * scripts/ingest/promise-wayback-retry.ts
 *
 * Re-asks Wayback's CDX API for candidates that previously landed in the
 * `wayback_error` bucket (the CDX lookup failed operationally, not a
 * confirmed "no capture exists"). Wayback has its own outages, separate
 * from Common Crawl's; a candidate marked wayback_error weeks ago may have
 * a real capture now that Wayback is healthy again (2026-08-18 finding: a
 * 6-candidate spot check came back 5/6 hits). This does not touch Common
 * Crawl at all — it is a same-day, no-dependency retry of the ORIGINAL
 * archive using the exact same CDX query and canonical-capture policy as
 * _promise-corpus-spike.ts, just without repeating the FEC lookups (the
 * input file already has candidateId/website resolved).
 *
 * Usage:
 *   npx tsx scripts/ingest/promise-wayback-retry.ts \
 *     --corpus spike-retry-2022.json --cycle 2022 --json \
 *     > corpus-retry-2022-wayback.json
 *
 * Flags: --corpus <spike --json file> (required), --cycle N (default 2022),
 * --limit N, --concurrency N (default 2 — be polite to web.archive.org),
 * --json (emit the corpus to stdout).
 */

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import {
  cdxUrlKey,
  cycleDefaults,
  fetchJsonSoft,
  parseCdxJson,
  selectCanonicalCapture,
  toCdxCutoff,
  waybackReplayUrl,
} from "./_promise-corpus-spike";
import { loadSnapshotTargets, type SnapshotTarget } from "./promise-site-snapshot";

export type WaybackRetryStatus = "captured" | "no_captures" | "blocked";

export interface WaybackRetryResult {
  target: SnapshotTarget;
  status: WaybackRetryStatus;
  captureCount: number;
  canonicalCaptureUrl: string | null;
}

async function retryCandidate(
  target: SnapshotTarget,
  cdxFrom: string,
  cdxCutoff: string,
  fetcher: typeof fetch,
): Promise<WaybackRetryResult> {
  const payload = await fetchJsonSoft(
    `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(cdxUrlKey(target.website))}` +
      `&output=json&from=${cdxFrom}&to=${cdxCutoff.slice(0, 8)}` +
      `&filter=statuscode:200&collapse=timestamp:8&limit=500`,
    fetcher,
    `wayback cdx ${target.website}`,
  );
  if (payload === null) {
    return { target, status: "blocked", captureCount: 0, canonicalCaptureUrl: null };
  }
  const captures = parseCdxJson(payload);
  const canonical = selectCanonicalCapture(captures, cdxCutoff);
  if (!canonical) {
    return {
      target,
      status: "no_captures",
      captureCount: captures.length,
      canonicalCaptureUrl: null,
    };
  }
  return {
    target,
    status: "captured",
    captureCount: captures.length,
    canonicalCaptureUrl: waybackReplayUrl(canonical),
  };
}

/** Corpus row shape promise-extract.ts's loadCorpusRows consumes. */
export function toCorpusRow(result: WaybackRetryResult): Record<string, unknown> | null {
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
    captureCount: result.captureCount,
    canonicalCaptureUrl: result.canonicalCaptureUrl,
    captureArchive: "wayback",
  };
}

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
      "Usage: promise-wayback-retry.ts --corpus <spike --json file> " +
        "[--cycle N] [--limit N] [--concurrency N] [--json]",
    );
    process.exit(1);
  }
  const cycle = Number(arg("--cycle") ?? 2022);
  const limit = Number(arg("--limit") ?? 0);
  const concurrency = Math.max(1, Number(arg("--concurrency") ?? 2));
  const asJson = process.argv.includes("--json");

  const defaults = cycleDefaults(cycle);
  const cdxFrom = `${defaults.fromDate.replace(/-/gu, "")}000000`;
  const cdxCutoff = toCdxCutoff(defaults.electionDay);

  let targets = loadSnapshotTargets(JSON.parse(readFileSync(corpusPath, "utf8")));
  if (limit > 0) targets = targets.slice(0, limit);
  if (targets.length === 0) {
    console.error(`No eligible rows in ${corpusPath}`);
    process.exit(1);
  }

  process.stderr.write(
    `[promise-wayback-retry] retrying ${targets.length} candidates against Wayback CDX ` +
      `(cycle=${cycle} concurrency=${concurrency})\n`,
  );

  const results = await mapWithConcurrency(targets, concurrency, (t) =>
    retryCandidate(t, cdxFrom, cdxCutoff, fetch),
  );

  const captured = results.filter((r) => r.status === "captured");
  const noCaptures = results.filter((r) => r.status === "no_captures");
  const blocked = results.filter((r) => r.status === "blocked");
  process.stderr.write(
    `[promise-wayback-retry] done: ${captured.length}/${results.length} captured, ` +
      `${noCaptures.length} genuine no-captures, ${blocked.length} blocked/errored\n`,
  );

  if (asJson) {
    console.log(JSON.stringify(results.map(toCorpusRow).filter(Boolean), null, 2));
  }
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error("[promise-wayback-retry] fatal:", err);
    process.exit(1);
  });
}
