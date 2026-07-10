/**
 * scripts/ops/check-stock-watcher-liveness.ts
 *
 * Lightweight liveness + anomaly + provenance check for the two community
 * "Stock Watcher" JSON feeds scripts/ingest/stock-transactions.ts reads
 * (House + Senate PTR data). The feeds' original S3 buckets started
 * returning 403 on 2026-07-02 (see stock-transactions.ts header); the
 * GitHub-hosted replacement has no pinning/checksums and no published
 * LICENSE, so this check exists to catch upstream breakage BEFORE the
 * ingest becomes a scheduled job, not after.
 *
 * Checks, per feed:
 *   - reachable (no network error, 2xx status)
 *   - body parses as a JSON array (not an HTML error page, not a reshaped
 *     object)
 *   - row count is above a conservative sanity floor (catches a feed gone
 *     silently empty/near-empty while still returning 200)
 *
 * Also logs simple PROVENANCE for each run — row count and the source's
 * ETag/Last-Modified (whatever raw.githubusercontent.com returns) — so a
 * human reviewing CI logs over time can eyeball whether the feed content is
 * actually changing. This is intentionally NOT a stateful diff-alert (no
 * baseline stored/compared across runs) — that's a reasonable follow-up if
 * this check needs to get louder than "did it break".
 *
 * Usage: npx tsx scripts/ops/check-stock-watcher-liveness.ts
 * Exit 1 if either feed is unreachable, HTTP-erroring, malformed, or
 * anomalously empty; exit 0 when both are healthy.
 */

import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  HOUSE_DATASET_URL,
  SENATE_DATASET_URL,
} from "../ingest/stock-transactions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FeedStatus =
  | "ok"
  | "unreachable"
  | "http-error"
  | "malformed"
  | "empty-anomaly";

export interface FeedVerdict {
  label: string;
  status: FeedStatus;
  detail: string;
  rowCount: number | null;
  etag: string | null;
  lastModified: string | null;
}

export type Fetcher = typeof fetch;

// ---------------------------------------------------------------------------
// Sanity floor + body evaluation (PURE — no network)
// ---------------------------------------------------------------------------

/**
 * Conservative row-count floor shared by both feeds. Live volumes differ a
 * lot (House ~24k rows vs Senate ~70 grouped filings as of 2026-07-10), so
 * this isn't tuned to either — it only exists to catch a feed gone silently
 * empty/near-empty (e.g. an upstream schema change, or a redirect to an
 * HTML error page that still returns 200), not to track growth.
 */
export const MIN_ROWS = 5;

export function evaluateBody(body: unknown): {
  status: "ok" | "malformed" | "empty-anomaly";
  rowCount: number | null;
} {
  if (!Array.isArray(body)) {
    return { status: "malformed", rowCount: null };
  }
  if (body.length < MIN_ROWS) {
    return { status: "empty-anomaly", rowCount: body.length };
  }
  return { status: "ok", rowCount: body.length };
}

/** True if every feed passed all checks. */
export function allHealthy(verdicts: FeedVerdict[]): boolean {
  return verdicts.every((v) => v.status === "ok");
}

export function computeExitCode(verdicts: FeedVerdict[]): number {
  return allHealthy(verdicts) ? 0 : 1;
}

// ---------------------------------------------------------------------------
// fetch (IMPURE — isolated, fetcher injectable for tests)
// ---------------------------------------------------------------------------

export async function checkFeed(
  url: string,
  label: string,
  fetcher: Fetcher = fetch,
): Promise<FeedVerdict> {
  let res: Response;
  try {
    res = await fetcher(url, {
      headers: { "user-agent": "voter-choice-stock-watcher-liveness-check" },
    });
  } catch (err) {
    return {
      label,
      status: "unreachable",
      detail: `fetch failed: ${err}`,
      rowCount: null,
      etag: null,
      lastModified: null,
    };
  }

  const etag = res.headers.get("etag");
  const lastModified = res.headers.get("last-modified");

  if (!res.ok) {
    return {
      label,
      status: "http-error",
      detail: `HTTP ${res.status}`,
      rowCount: null,
      etag,
      lastModified,
    };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch (err) {
    return {
      label,
      status: "malformed",
      detail: `response body is not valid JSON: ${err}`,
      rowCount: null,
      etag,
      lastModified,
    };
  }

  const { status, rowCount } = evaluateBody(body);
  const detail =
    status === "ok"
      ? `${rowCount} rows`
      : `body is not a JSON array, or array is suspiciously small (< ${MIN_ROWS} rows)`;
  return { label, status, detail, rowCount, etag, lastModified };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printVerdict(v: FeedVerdict): void {
  const icon = v.status === "ok" ? "✓" : "✗";
  const provenance = [
    v.etag ? `etag ${v.etag}` : null,
    v.lastModified ? `last-modified ${v.lastModified}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  console.log(
    `${icon} ${v.label}: ${v.status} — ${v.detail}${provenance ? ` (${provenance})` : ""}`,
  );
}

export async function main(): Promise<number> {
  const verdicts = await Promise.all([
    checkFeed(HOUSE_DATASET_URL, "House"),
    checkFeed(SENATE_DATASET_URL, "Senate"),
  ]);

  for (const v of verdicts) printVerdict(v);

  if (!allHealthy(verdicts)) {
    console.error(
      "\n✗ stock-watcher liveness check FAILED — at least one feed is unreachable, malformed, or anomalously empty.",
    );
    console.error(
      "See scripts/ingest/stock-transactions.ts for the ingest that reads these feeds.",
    );
  } else {
    console.log("\n✓ both stock-watcher feeds are live and look healthy.");
  }

  return computeExitCode(verdicts);
}

/**
 * True only when this file is the program entrypoint (CLI), not when
 * imported by a test. Wrapped in try/catch because under a non-file: loader
 * (vitest) fileURLToPath(import.meta.url) throws — in which case we are
 * definitionally NOT the CLI, so return false.
 */
function isInvokedDirectly(): boolean {
  try {
    const entry = process.argv?.[1];
    if (!entry) return false;
    return fileURLToPath(import.meta.url) === path.resolve(entry);
  } catch {
    return false;
  }
}

if (isInvokedDirectly()) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error("✗ stock-watcher liveness check FAILED with an error:");
      console.error(err);
      process.exit(1);
    });
}
