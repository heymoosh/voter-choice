/**
 * scripts/ingest/common-crawl-archive.ts
 *
 * Common Crawl as a THIRD capture source for the 2022 retrospective
 * (decision 2026-08-17, after Wayback's outages and the discovery that LoC
 * is unreachable by ANY script — not just headless ones. A live run
 * tonight, with Muxin clicking the checkbox herself in a REAL, visible,
 * Playwright-driven Chrome, still 403'd: Chrome itself warned her the tab
 * was being controlled by automated software, and the challenge never
 * cleared. That confirms Cloudflare is fingerprinting the automation
 * itself (the CDP connection), not timing a human click — no amount of
 * waiting or clicking fixes it, so LoC is a dead end for any
 * script-driven fetch, real Chrome included.
 *
 * Common Crawl (commoncrawl.org) is a free, public, non-profit web archive
 * — billions of pages crawled since 2008, stored as WARC files on
 * data.commoncrawl.org and served over plain HTTPS with NO bot check
 * (it's a static file host, not a client-facing replay service). Verified
 * live tonight (2026-08-17) against two real TX 2022 candidates —
 * nathanielmoran.com and crenshawforcongress.com both have real August
 * 2022 coverage, including issue-page paths, squarely inside the
 * retrospective window (Jan 2021 – Nov 2022 election day).
 *
 * The tradeoff: Common Crawl is NOT purpose-built for this population (it
 * crawls broadly, not comprehensively) — coverage of small campaign sites
 * is real but not guaranteed the way LoC's purpose-built elections archive
 * would have been. It also has no human-browsable replay host the way
 * Wayback/LoC do: a citation here is a crawl id + WARC filename + byte
 * offset, not a URL Muxin can open and eyeball. Full-page bodies still
 * never ship (same copyright posture as every other archive here) — only
 * verbatim quotes with citations reach the product.
 *
 * Two-step fetch, both plain HTTPS, no browser:
 *   1. CDX-style index query (index.commoncrawl.org/<crawl-id>-index) —
 *      same JSON-lines shape as the IA/LoC CDX server API this pipeline
 *      already speaks (url, timestamp, status, mime, filename, offset,
 *      length).
 *   2. Byte-range GET on data.commoncrawl.org/<filename> for exactly that
 *      record's offset..offset+length-1 — a single gzip-compressed WARC
 *      record (each record is individually gzipped inside the WARC file,
 *      which is why range-fetching one record and gunzipping it in
 *      isolation works).
 *
 * A decompressed WARC response record is: the WARC header block, a blank
 * line, the HTTP response header block, a blank line, then the body —
 * standard WARC/1.0 + HTTP/1.1, nothing archive-specific.
 */

import { gunzipSync } from "node:zlib";

// ---------------------------------------------------------------------------
// Index catalog (collinfo.json) — pure parsing
// ---------------------------------------------------------------------------

export interface CommonCrawlIndex {
  id: string;
  cdxApi: string;
  /** ISO instant the crawl started. */
  from: string;
  /** ISO instant the crawl ended. */
  to: string;
}

const COLLINFO_URL = "https://index.commoncrawl.org/collinfo.json";

/** Parse collinfo.json, dropping any entry missing a required field. */
export function parseCollinfo(payload: unknown): CommonCrawlIndex[] {
  if (!Array.isArray(payload)) return [];
  const out: CommonCrawlIndex[] = [];
  for (const raw of payload) {
    if (raw === null || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== "string" || r.id.length === 0) continue;
    if (typeof r["cdx-api"] !== "string" || r["cdx-api"].length === 0) continue;
    if (typeof r.from !== "string" || typeof r.to !== "string") continue;
    out.push({ id: r.id, cdxApi: r["cdx-api"], from: r.from, to: r.to });
  }
  return out;
}

/**
 * Indexes whose crawl window overlaps [fromIso, toIso], most-recent-first
 * (by `to`) — so a per-candidate scan tries the crawl closest to the
 * retrospective's cutoff (election day) first and can stop at the first
 * hit instead of always querying all ~15 indexes in a two-year window.
 */
export function indexesInWindow(
  indexes: CommonCrawlIndex[],
  fromIso: string,
  toIso: string,
): CommonCrawlIndex[] {
  return indexes
    .filter((idx) => idx.from <= toIso && idx.to >= fromIso)
    .sort((a, b) => (a.to < b.to ? 1 : a.to > b.to ? -1 : 0));
}

// ---------------------------------------------------------------------------
// Per-site index query — pure parsing
// ---------------------------------------------------------------------------

export interface CommonCrawlRecord {
  original: string;
  /** 14-digit capture timestamp — same shape as every other archive here. */
  timestamp: string;
  status: number;
  mime: string;
  filename: string;
  offset: number;
  length: number;
}

/**
 * matchType=domain returns every URL under the host AND its subdomains in
 * one call (bare + www both, no separate query needed) — CC's index does
 * NOT auto-merge www/bare the way this pipeline's own hostOf() does, so
 * without this a candidate crawled under www would silently miss a query
 * for the bare domain (or vice versa).
 */
export function commonCrawlIndexQueryUrl(
  cdxApi: string,
  hostname: string,
  limit = 2000,
): string {
  const params = new URLSearchParams({
    url: hostname,
    matchType: "domain",
    output: "json",
    limit: String(limit),
  });
  return `${cdxApi}?${params.toString()}&filter=status:200&filter=mime:text/html`;
}

/** Parse a CDX-style JSON-lines response, dropping malformed rows. */
export function parseCcIndexNdjson(body: string): CommonCrawlRecord[] {
  const out: CommonCrawlRecord[] = [];
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (parsed === null || typeof parsed !== "object") continue;
    const r = parsed as Record<string, unknown>;
    const original = r.url;
    const timestamp = r.timestamp;
    const filename = r.filename;
    const status = Number(r.status);
    const offset = Number(r.offset);
    const length = Number(r.length);
    if (typeof original !== "string" || original.length === 0) continue;
    if (typeof timestamp !== "string" || !/^\d{14}$/u.test(timestamp)) continue;
    if (typeof filename !== "string" || filename.length === 0) continue;
    if (
      !Number.isFinite(status) ||
      !Number.isFinite(offset) ||
      !Number.isFinite(length)
    )
      continue;
    out.push({
      original,
      timestamp,
      status,
      mime: typeof r.mime === "string" ? r.mime : "",
      filename,
      offset,
      length,
    });
  }
  return out;
}

/** Adapter to this pipeline's shared {timestamp, original} capture shape. */
export function toCdxCapture(r: CommonCrawlRecord): {
  timestamp: string;
  original: string;
} {
  return { timestamp: r.timestamp, original: r.original };
}

// ---------------------------------------------------------------------------
// WARC record fetch + parse — pure parsing of the decompressed bytes
// ---------------------------------------------------------------------------

/** Inclusive byte-range header value for one WARC record. */
export function warcByteRangeHeader(offset: number, length: number): string {
  return `bytes=${offset}-${offset + length - 1}`;
}

export interface WarcHttpResponse {
  status: number | null;
  body: string;
}

/**
 * Split a decompressed WARC response record into its HTTP status and body.
 * Shape: WARC header block, blank line, HTTP header block, blank line,
 * body. Null when the record doesn't have that structure (a truncated or
 * malformed range read must never crash the run).
 */
export function extractHttpResponseFromWarcRecord(
  decompressed: string,
): WarcHttpResponse | null {
  const blankLine = /\r?\n\r?\n/u;
  const warcHeaderEnd = decompressed.search(blankLine);
  if (warcHeaderEnd < 0) return null;
  const afterWarcHeader = decompressed
    .slice(warcHeaderEnd)
    .replace(blankLine, "");
  const httpHeaderEnd = afterWarcHeader.search(blankLine);
  if (httpHeaderEnd < 0) return null;
  const httpHeaderBlock = afterWarcHeader.slice(0, httpHeaderEnd);
  const body = afterWarcHeader.slice(httpHeaderEnd).replace(blankLine, "");
  const statusLine = httpHeaderBlock.split(/\r?\n/u)[0] ?? "";
  const statusMatch = statusLine.match(/^HTTP\/[\d.]+\s+(\d{3})/u);
  return {
    status: statusMatch ? Number(statusMatch[1]) : null,
    body,
  };
}

/** Gunzip, tolerating a truncated/corrupt range read (returns null). */
export function gunzipSoft(buf: Buffer): string | null {
  try {
    return gunzipSync(buf).toString("utf8");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Networked fetch — fail-soft, retry on 429/5xx (this file's own copy of
// the posture shared with _promise-corpus-spike.ts / promise-extract.ts;
// consolidating the three retry loops is deferred, code-review finding #7).
// ---------------------------------------------------------------------------

const RETRYABLE = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 3;
const TIMEOUT_MS = 30_000;

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function fetchSoft(
  url: string,
  fetcher: typeof fetch,
  label: string,
  init: RequestInit = {},
): Promise<Response | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetcher(url, {
        ...init,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      // 404 passes through too — the index API 404s for every crawl that
      // simply lacks the queried host, a normal "not in this crawl" result
      // (fetchIndexRecords below), not a failure worth logging.
      if (response.ok || response.status === 206 || response.status === 404)
        return response;
      if (RETRYABLE.has(response.status) && attempt < MAX_RETRIES) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      process.stderr.write(
        `[common-crawl] ${label} failed status=${response.status}\n`,
      );
      return null;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      process.stderr.write(
        `[common-crawl] ${label} failed: ${err instanceof Error ? err.message : String(err)}\n`,
      );
      return null;
    }
  }
  return null;
}

export async function fetchCollinfo(
  fetcher: typeof fetch,
): Promise<CommonCrawlIndex[] | null> {
  const response = await fetchSoft(COLLINFO_URL, fetcher, "collinfo.json");
  if (!response) return null;
  try {
    return parseCollinfo(await response.json());
  } catch {
    return null;
  }
}

export async function fetchIndexRecords(
  index: CommonCrawlIndex,
  hostname: string,
  fetcher: typeof fetch,
): Promise<CommonCrawlRecord[] | null> {
  const url = commonCrawlIndexQueryUrl(index.cdxApi, hostname);
  const response = await fetchSoft(
    url,
    fetcher,
    `index ${index.id} ${hostname}`,
  );
  if (!response) return null;
  // CC's index API 404s (no matching text body) when the crawl has nothing
  // for this host — a definitive "not in this crawl", not an error.
  if (response.status === 404) return [];
  return parseCcIndexNdjson(await response.text());
}

/** Range-fetch one WARC record and return its decoded HTML body. */
export async function fetchWarcHtml(
  record: CommonCrawlRecord,
  fetcher: typeof fetch,
): Promise<string | null> {
  const response = await fetchSoft(
    `https://data.commoncrawl.org/${record.filename}`,
    fetcher,
    `warc ${record.original}`,
    { headers: { Range: warcByteRangeHeader(record.offset, record.length) } },
  );
  if (!response) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  const decompressed = gunzipSoft(bytes);
  if (decompressed === null) {
    process.stderr.write(
      `[common-crawl] warc ${record.original} failed: gunzip error (truncated range read?)\n`,
    );
    return null;
  }
  const parsed = extractHttpResponseFromWarcRecord(decompressed);
  if (!parsed) {
    process.stderr.write(
      `[common-crawl] warc ${record.original} failed: could not split WARC/HTTP headers from body\n`,
    );
    return null;
  }
  return parsed.body;
}
