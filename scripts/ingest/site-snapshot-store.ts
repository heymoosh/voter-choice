/**
 * scripts/ingest/site-snapshot-store.ts
 *
 * Local store for SELF-HOSTED campaign-site snapshots — the Part 5 capture
 * layer that depends on nobody (decision 2026-08-17, Muxin: "we do it
 * ourselves", after the Wayback outages and the discovery that LoC's replay
 * host sits behind a Cloudflare bot challenge).
 *
 * Layout under the store directory (default `site-snapshots/`, override with
 * SNAPSHOT_DIR; gitignored — full-page copies stay LOCAL, the copyright
 * posture being that only verbatim quotes with citations ever ship):
 *
 *   pages/<sha256>.html   raw page bodies, content-addressed (identical
 *                         bodies dedupe for free)
 *   manifest.jsonl        one JSON line per captured page:
 *                         { timestamp, original, finalLiveUrl, candidateId,
 *                           sha256, path, fetchedAt }
 *
 * A capture's pipeline identity is `snapshot://<timestamp>/<original>`
 * (see ./web-archives.ts). Reads mirror archive replay semantics: asking
 * for a timestamp the store doesn't hold exactly resolves to the NEAREST
 * capture of that original URL, and the returned finalUrl names the exact
 * capture served — the reproducibility rule the extractor records as
 * `archive_url`.
 */

import { createHash } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import {
  parseReplayUrl,
  replayUrl,
  timestampToEpochSeconds,
} from "./web-archives";

export interface SnapshotManifestEntry {
  /** 14-digit UTC capture timestamp (the run's per-candidate pin). */
  timestamp: string;
  /** The original URL as REQUESTED — the pipeline join key. */
  original: string;
  /** Where the live fetch actually landed after redirects (honesty note). */
  finalLiveUrl: string;
  candidateId: string | null;
  sha256: string;
  /** Body path relative to the store directory. */
  path: string;
  /** ISO instant of the live fetch. */
  fetchedAt: string;
}

export function defaultSnapshotDir(): string {
  return process.env.SNAPSHOT_DIR || "site-snapshots";
}

/** "2026-08-17T00:15:30.123Z" → "20260817001530" (UTC, second precision). */
export function nowTimestamp(date: Date = new Date()): string {
  return date.toISOString().slice(0, 19).replace(/[-T:]/gu, "");
}

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const strOr = (v: unknown, fallback: string): string => str(v) ?? fallback;

/** One manifest line → entry, or null for malformed/incomplete lines. */
function parseManifestLine(line: string): SnapshotManifestEntry | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== "object") return null;
  const e = parsed as Record<string, unknown>;
  const timestamp = str(e.timestamp);
  const original = str(e.original);
  const path = str(e.path);
  const valid = timestamp !== null && /^\d{14}$/u.test(timestamp);
  if (!valid || !original || !path) return null;
  return {
    timestamp,
    original,
    finalLiveUrl: strOr(e.finalLiveUrl, original),
    candidateId: str(e.candidateId),
    sha256: strOr(e.sha256, ""),
    path,
    fetchedAt: strOr(e.fetchedAt, ""),
  };
}

/** Parse manifest.jsonl content, dropping malformed or incomplete lines. */
export function parseManifest(jsonl: string): SnapshotManifestEntry[] {
  return jsonl
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map(parseManifestLine)
    .filter((e): e is SnapshotManifestEntry => e !== null);
}

/**
 * The entry chronologically closest to the requested timestamp — the local
 * equivalent of an archive redirecting to its nearest capture. Compares
 * parsed epoch seconds, not raw digit strings (a raw comparison mis-ranks
 * across day/month/year boundaries — see timestampToEpochSeconds). Ties
 * (equidistant before/after) resolve to the EARLIER capture, keeping the
 * choice deterministic. Null for an empty list.
 */
export function selectNearestSnapshot(
  entries: SnapshotManifestEntry[],
  timestamp: string,
): SnapshotManifestEntry | null {
  const want = timestampToEpochSeconds(timestamp) ?? Number(timestamp);
  let best: SnapshotManifestEntry | null = null;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const e of entries) {
    const epoch = timestampToEpochSeconds(e.timestamp) ?? Number(e.timestamp);
    const diff = Math.abs(epoch - want);
    if (
      diff < bestDiff ||
      (diff === bestDiff && best !== null && e.timestamp < best.timestamp)
    ) {
      best = e;
      bestDiff = diff;
    }
  }
  return best;
}

export interface SnapshotWriteInput {
  timestamp: string;
  original: string;
  finalLiveUrl: string;
  candidateId: string | null;
  html: string;
  fetchedAt: string;
}

/**
 * Persist one captured page: content-addressed body + manifest line.
 * Returns the manifest entry (whose snapshot URL is
 * `replayUrl("snapshot", entry.timestamp, entry.original)`).
 */
export function writeSnapshot(
  dir: string,
  input: SnapshotWriteInput,
): SnapshotManifestEntry {
  const sha256 = createHash("sha256").update(input.html).digest("hex");
  const relPath = join("pages", `${sha256}.html`);
  const absPath = join(dir, relPath);
  mkdirSync(dirname(absPath), { recursive: true });
  if (!existsSync(absPath)) writeFileSync(absPath, input.html);
  const entry: SnapshotManifestEntry = {
    timestamp: input.timestamp,
    original: input.original,
    finalLiveUrl: input.finalLiveUrl,
    candidateId: input.candidateId,
    sha256,
    path: relPath,
    fetchedAt: input.fetchedAt,
  };
  appendFileSync(join(dir, "manifest.jsonl"), `${JSON.stringify(entry)}\n`);
  manifestCache.delete(dir);
  return entry;
}

/** Manifest entries grouped by original URL, cached per store dir per run. */
const manifestCache = new Map<string, Map<string, SnapshotManifestEntry[]>>();

function manifestByOriginal(dir: string): Map<string, SnapshotManifestEntry[]> {
  const cached = manifestCache.get(dir);
  if (cached) return cached;
  const manifestPath = join(dir, "manifest.jsonl");
  const entries = existsSync(manifestPath)
    ? parseManifest(readFileSync(manifestPath, "utf8"))
    : [];
  const byOriginal = new Map<string, SnapshotManifestEntry[]>();
  for (const e of entries) {
    const list = byOriginal.get(e.original);
    if (list) list.push(e);
    else byOriginal.set(e.original, [e]);
  }
  manifestCache.set(dir, byOriginal);
  return byOriginal;
}

export interface SnapshotPage {
  /** The EXACT capture served, as a snapshot:// URL (reproducibility rule). */
  finalUrl: string;
  html: string;
  /**
   * Where the live fetch actually landed when this page was captured
   * (the manifest's finalLiveUrl — e.g. a bare→www redirect, or the LoC
   * replay URL a browser-driven LoC capture served). Callers doing
   * same-site link discovery on this page's html MUST resolve against this,
   * not the requested original: the manifest joins on the exact original
   * string, and discovery-time captures were themselves recorded keyed by
   * whatever URL their OWN discovery resolved against (2026-08-17 — fixing
   * discovery to use the redirect-followed URL at capture time and still
   * discovering from the pre-redirect original at read time made the two
   * sides key sub-pages differently and silently dropped them all).
   */
  liveUrl: string;
}

/**
 * Read a `snapshot://<ts>/<original>` URL from the store, resolving to the
 * nearest held capture of that original. Null when the URL is not a
 * snapshot URL, the store holds no capture of the original, or the body
 * file is missing.
 */
export function readSnapshotPage(
  url: string,
  dir: string = defaultSnapshotDir(),
): SnapshotPage | null {
  const parsed = parseReplayUrl(url);
  if (!parsed || parsed.archive !== "snapshot") return null;
  const entries = manifestByOriginal(dir).get(parsed.original);
  if (!entries || entries.length === 0) return null;
  const entry = selectNearestSnapshot(entries, parsed.timestamp);
  if (!entry) return null;
  const absPath = join(dir, entry.path);
  if (!existsSync(absPath)) return null;
  return {
    finalUrl: replayUrl("snapshot", entry.timestamp, entry.original),
    html: readFileSync(absPath, "utf8"),
    liveUrl: entry.finalLiveUrl,
  };
}
