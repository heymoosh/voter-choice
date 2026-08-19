/**
 * scripts/ingest/promise-wayback-redirect-retry.ts
 *
 * One-off recovery for 2022 promise-ledger candidates whose FEC-filed
 * website is a vanity/forwarding domain (e.g. a re-election-cycle URL that
 * 30x-redirects to the campaign's real site). A CDX lookup keyed on the
 * vanity domain finds nothing even though the destination domain is
 * archived — Wayback indexes what was actually served, not the forwarding
 * shell (2026-08-18 finding, 9/14 of that day's "genuine miss" list turned
 * out to be exactly this).
 *
 * Not a general pipeline stage: this takes an explicit candidateId →
 * resolved-domain map (found by manually following each redirect) rather
 * than resolving redirects automatically, since that would need to run
 * against every corpus row on every pass. Fold into the main spike/retry
 * flow only if this pattern turns out to recur at volume.
 *
 * Usage:
 *   npx tsx scripts/ingest/promise-wayback-redirect-retry.ts \
 *     --corpus spike-all-2022.json --cycle 2022 --json \
 *     > corpus-retry-2022-redirects.json
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

/**
 * candidateId -> resolved live domain the FEC-filed website forwards to.
 * suozziforcongress2024.com is deliberately excluded: it now resolves to
 * an unrelated squatted domain, a genuine dead end, not a redirect miss.
 */
const REDIRECT_TARGETS: Record<string, string> = {
  "federal-C001132": "eliforarizona.com",
  "federal-P000613": "jimmypanetta.com",
  "federal-B000825": "laurenforcolorado.com",
  "federal-R000609": "johnrutherfordforcongress.com",
  "federal-D000600": "mariodiazbalart.org",
  "federal-C001072": "andrecarson.com",
  "federal-K000375": "keatingforcongress.com",
  "federal-H001067": "richardhudson.org",
  "federal-J000304": "teamronny.com",
};

interface CandidateRow {
  candidateId: string;
  name: string;
  state: string;
  office: string;
  district: string | null;
  website: string;
}

function loadCandidates(payload: unknown): CandidateRow[] {
  if (!Array.isArray(payload)) return [];
  const out: CandidateRow[] = [];
  for (const raw of payload) {
    if (raw === null || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.candidateId !== "string" || !(r.candidateId in REDIRECT_TARGETS))
      continue;
    out.push({
      candidateId: r.candidateId,
      name: typeof r.name === "string" ? r.name : "(unknown)",
      state: typeof r.state === "string" ? r.state : "",
      office: typeof r.office === "string" ? r.office : "",
      district: typeof r.district === "string" ? r.district : null,
      website: typeof r.website === "string" ? r.website : "",
    });
  }
  return out;
}

interface RetryResult {
  candidate: CandidateRow;
  resolvedDomain: string;
  captured: boolean;
  captureCount: number;
  canonicalCaptureUrl: string | null;
}

async function retryCandidate(
  candidate: CandidateRow,
  resolvedDomain: string,
  cdxFrom: string,
  cdxCutoff: string,
  fetcher: typeof fetch,
): Promise<RetryResult> {
  const payload = await fetchJsonSoft(
    `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(cdxUrlKey(resolvedDomain))}` +
      `&output=json&from=${cdxFrom}&to=${cdxCutoff.slice(0, 8)}` +
      `&filter=statuscode:200&collapse=timestamp:8&limit=500`,
    fetcher,
    `wayback cdx (redirect target) ${resolvedDomain}`,
  );
  if (payload === null) {
    return { candidate, resolvedDomain, captured: false, captureCount: 0, canonicalCaptureUrl: null };
  }
  const captures = parseCdxJson(payload);
  const canonical = selectCanonicalCapture(captures, cdxCutoff);
  if (!canonical) {
    return { candidate, resolvedDomain, captured: false, captureCount: captures.length, canonicalCaptureUrl: null };
  }
  return {
    candidate,
    resolvedDomain,
    captured: true,
    captureCount: captures.length,
    canonicalCaptureUrl: waybackReplayUrl(canonical),
  };
}

/** Corpus row shape promise-extract.ts's loadCorpusRows consumes. */
function toCorpusRow(result: RetryResult): Record<string, unknown> | null {
  if (!result.canonicalCaptureUrl) return null;
  const c = result.candidate;
  return {
    state: c.state,
    office: c.office,
    district: c.district,
    name: c.name,
    bucket: "website_archived",
    candidateId: c.candidateId,
    website: c.website,
    captureCount: result.captureCount,
    canonicalCaptureUrl: result.canonicalCaptureUrl,
    captureArchive: "wayback",
    resolvedFrom: result.resolvedDomain,
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
      "Usage: promise-wayback-redirect-retry.ts --corpus <spike --json file> [--cycle N] [--json]",
    );
    process.exit(1);
  }
  const cycle = Number(arg("--cycle") ?? 2022);
  const asJson = process.argv.includes("--json");

  const defaults = cycleDefaults(cycle);
  const cdxFrom = `${defaults.fromDate.replace(/-/gu, "")}000000`;
  const cdxCutoff = toCdxCutoff(defaults.electionDay);

  const candidates = loadCandidates(JSON.parse(readFileSync(corpusPath, "utf8")));
  if (candidates.length === 0) {
    console.error(`No REDIRECT_TARGETS rows found in ${corpusPath}`);
    process.exit(1);
  }

  process.stderr.write(
    `[promise-wayback-redirect-retry] retrying ${candidates.length} redirect-domain candidates\n`,
  );

  const results: RetryResult[] = [];
  for (const c of candidates) {
    results.push(
      await retryCandidate(c, REDIRECT_TARGETS[c.candidateId], cdxFrom, cdxCutoff, fetch),
    );
  }

  const captured = results.filter((r) => r.captured);
  process.stderr.write(
    `[promise-wayback-redirect-retry] done: ${captured.length}/${results.length} captured via resolved domain\n`,
  );

  if (asJson) {
    console.log(JSON.stringify(results.map(toCorpusRow).filter(Boolean), null, 2));
  }
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error("[promise-wayback-redirect-retry] fatal:", err);
    process.exit(1);
  });
}
