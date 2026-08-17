/**
 * scripts/ingest/web-archives.ts
 *
 * Shared web-archive plumbing for the Part 5 promise pipeline (plan:
 * docs/DONOR_FRAMING_AND_ACCOUNTABILITY_PLAN.md). Two archives are
 * first-class, decided 2026-08-16 after Internet Archive outages (503 walls)
 * blocked three retrospective extraction runs in a row:
 *
 *   loc      — Library of Congress "United States Elections Web Archive"
 *              (webarchive.loc.gov). Purpose-built for exactly our
 *              population: official campaign websites of congressional
 *              candidates, archived weekly during election seasons since
 *              2000. Stable .gov infrastructure. PRIMARY for retrospectives.
 *              Caveat: LoC access is embargoed (~1 year after capture), so
 *              current-cycle captures generally are not replayable yet —
 *              which the fallback ordering below absorbs.
 *   wayback  — Internet Archive Wayback Machine (web.archive.org). Broadest
 *              coverage, brittle availability. FALLBACK.
 *
 * 2026-08-17 amendment: LoC's replay host turned out to sit behind a
 * Cloudflare bot challenge (confirmed by a live curl — "Just a moment…"),
 * so no script can reach it; it stays parseable here (a human browser CAN
 * replay LoC URLs) but a third kind became the current-cycle primary per
 * Muxin's "we do it ourselves":
 *
 *   snapshot — SELF-HOSTED captures of live campaign sites, taken by
 *              scripts/ingest/promise-site-snapshot.ts and stored locally
 *              (see ./site-snapshot-store.ts). Pinned as
 *              `snapshot://<14-digit-ts>/<original-url>` — the same shape
 *              as archive replay URLs so the whole downstream pipeline
 *              (made_at, cycle derivation, deterministic promise ids) is
 *              unchanged.
 *
 * Both run (Open)Wayback-style replay: a 14-digit timestamp in the path, a
 * redirect to the nearest actual capture, and the post-redirect URL naming
 * the EXACT capture served — which is what the extractor's reproducibility
 * rule (`archive_url`) depends on. Secondary compilations (OnTheIssues,
 * party platforms, PolitiFact trackers) are deliberately NOT archives here:
 * the verbatim-quote gate requires the candidate's own published page text,
 * not an editor's excerpt of it (plan Part 5, no-false-attribution rule).
 *
 * Pure string functions only — no fetching. Callers own network posture.
 */

export type WebArchiveId = "wayback" | "loc" | "snapshot";

export interface ArchiveCapture {
  archive: WebArchiveId;
  /** 14-digit replay timestamp, e.g. "20221108235959". */
  timestamp: string;
  /** The original (live-site) URL the capture preserves. */
  original: string;
}

/**
 * Replay-path shapes. Matched on the PATH (not the host) so the same parse
 * handles full replay URLs and the path-relative hrefs both archives'
 * server-side link rewriting emits inside replayed HTML (e.g.
 * "/web/20221101000000/https://site/issues"). The optional [a-z_]{0,4} run
 * tolerates replay-flag suffixes like "id_" and "if_".
 */
const REPLAY_PATH_PATTERNS: readonly {
  archive: WebArchiveId;
  re: RegExp;
}[] = [
  { archive: "wayback", re: /\/web\/(\d{14})[a-z_]{0,4}\/(.+)$/u },
  { archive: "loc", re: /\/all\/(\d{14})[a-z_]{0,4}\/(.+)$/u },
  { archive: "snapshot", re: /^snapshot:\/\/(\d{14})\/(.+)$/u },
];

/**
 * Replay-URL prefixes per archive; `replayUrl` appends `/{ts}/{original}`.
 * The snapshot "host" is just the scheme — `snapshot:/` + `/{ts}/…` yields
 * `snapshot://{ts}/{original}`.
 */
const REPLAY_HOSTS: Record<WebArchiveId, string> = {
  wayback: "https://web.archive.org/web",
  loc: "https://webarchive.loc.gov/all",
  snapshot: "snapshot:/",
};

/**
 * Parse a replay URL (or a path-relative rewritten href) from either archive
 * into its capture identity. Returns null for anything that is not a replay
 * URL — callers use that as the "this is a live-site URL" signal.
 */
export function parseReplayUrl(url: string): ArchiveCapture | null {
  for (const { archive, re } of REPLAY_PATH_PATTERNS) {
    const m = url.match(re);
    if (m) return { archive, timestamp: m[1], original: m[2] };
  }
  return null;
}

/** Canonical replay URL for a capture on its archive. */
export function replayUrl(
  archive: WebArchiveId,
  timestamp: string,
  original: string,
): string {
  return `${REPLAY_HOSTS[archive]}/${timestamp}/${original}`;
}

/**
 * Memento TimeMap URL (RFC 7089 link-format) for an original URL on the LoC
 * archive — the machine-readable capture listing that replaces Wayback's CDX
 * API there. The original URL rides raw after the path prefix (Memento
 * convention), not percent-encoded.
 */
export function locTimeMapUrl(originalUrl: string): string {
  return `https://webarchive.loc.gov/all/timemap/link/${originalUrl}`;
}

/**
 * Parse an RFC 7089 link-format TimeMap body into captures. Only entries
 * whose rel contains "memento" (covers "memento", "first memento",
 * "last memento") are captures; their URIs are replay URLs, so the replay
 * parser above extracts timestamp + original. Entries that do not parse as
 * replay URLs are dropped. Tolerates the empty body a 404-for-no-captures
 * fetch path hands in.
 */
export function parseMementoTimeMap(body: string): ArchiveCapture[] {
  const out: ArchiveCapture[] = [];
  const entryRe = /<([^<>]+)>\s*;([^<]*)/gu;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(body)) !== null) {
    const relMatch = m[2].match(/rel="([^"]*)"/u);
    if (!relMatch || !/\bmemento\b/u.test(relMatch[1])) continue;
    const capture = parseReplayUrl(m[1]);
    if (capture) out.push(capture);
  }
  return out;
}

/** "20221108235959" → "2022-11-08". Null for malformed timestamps. */
export function timestampToIsoDate(timestamp: string): string | null {
  if (!/^\d{14}$/u.test(timestamp)) return null;
  return `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}`;
}
