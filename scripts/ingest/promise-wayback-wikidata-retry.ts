/**
 * scripts/ingest/promise-wayback-wikidata-retry.ts
 *
 * One-off retry for the `no_website_on_file` 2022 promise-ledger bucket:
 * FEC's own filing left the website field blank for these candidates, so
 * there was never a URL to check against Wayback. A Wikidata lookup keyed
 * on bioguide ID (P1157 → P856 "official website", zero name-collision
 * risk) recovers a URL for most of them — sometimes a real campaign site,
 * more often their .house.gov/.senate.gov page (approved as an acceptable
 * fallback source 2026-08-18: "if there's nothing else they had for their
 * own sites then that's all we have").
 *
 * Like every other retry tool in this set, a live URL fetched TODAY is not
 * evidence of what a site said in 2022 — this still runs the same 2022-
 * window Wayback CDX check as promise-wayback-retry.ts, just against a
 * Wikidata-sourced URL instead of an FEC-filed one.
 *
 * Usage:
 *   npx tsx scripts/ingest/promise-wayback-wikidata-retry.ts --json \
 *     > corpus-retry-2022-wikidata.json
 */

import {
  cdxUrlKey,
  cycleDefaults,
  fetchJsonSoft,
  parseCdxJson,
  selectCanonicalCapture,
  toCdxCutoff,
  waybackReplayUrl,
} from "./_promise-corpus-spike";

interface WikidataTarget {
  candidateId: string;
  name: string;
  state: string;
  office: string;
  district: string | null;
  website: string;
}

// Resolved 2026-08-18 via Wikidata SPARQL (P1157 bioguide → P856 website)
// against the 24 no_website_on_file candidates in spike-all-2022.json.
// Excluded: federal-A000379 (Alford) and federal-F000474 (Flood), no
// Wikidata item; federal-S001199 (Smucker), P856 pointed at the wrong
// chamber (smucker.senate.gov, a PA House member) and 502s live.
const TARGETS: WikidataTarget[] = [
  { candidateId: "federal-H001068", name: "Rep. Jared Huffman [D-CA2]", state: "CA", office: "house", district: "02", website: "http://huffman.house.gov" },
  { candidateId: "federal-L000397", name: "Rep. Zoe Lofgren [D-CA18]", state: "CA", office: "house", district: "18", website: "https://lofgren.house.gov" },
  { candidateId: "federal-F000480", name: "Rep. Vince Fong [R-CA20]", state: "CA", office: "house", district: "20", website: "https://fong.house.gov" },
  { candidateId: "federal-V000129", name: "Rep. David Valadao [R-CA22]", state: "CA", office: "house", district: "22", website: "http://valadao.house.gov" },
  { candidateId: "federal-C001080", name: "Rep. Judy Chu [D-CA28]", state: "CA", office: "house", district: "28", website: "http://chu.house.gov" },
  { candidateId: "federal-V000130", name: "Rep. Juan Vargas [D-CA52]", state: "CA", office: "house", district: "52", website: "http://votevargas.com/" },
  { candidateId: "federal-N000147", name: "Rep. Eleanor Holmes Norton [D-DC]", state: "DC", office: "house", district: "00", website: "https://norton.house.gov/" },
  { candidateId: "federal-S001148", name: "Rep. Michael “Mike” Simpson [R-ID2]", state: "ID", office: "house", district: "02", website: "http://simpson.house.gov" },
  { candidateId: "federal-J000309", name: "Rep. Jonathan Jackson [D-IL1]", state: "IL", office: "house", district: "01", website: "https://jonathanjackson.house.gov/" },
  { candidateId: "federal-D000096", name: "Rep. Danny Davis [D-IL7]", state: "IL", office: "house", district: "07", website: "http://www.davis.house.gov" },
  { candidateId: "federal-B001316", name: "Rep. Eric Burlison [R-MO7]", state: "MO", office: "house", district: "07", website: "http://www.ericburlison.com/" },
  { candidateId: "federal-Z000018", name: "Rep. Ryan Zinke [R-MT1]", state: "MT", office: "house", district: "01", website: "https://www.zinke.house.gov" },
  { candidateId: "federal-D000230", name: "Rep. Donald Davis [D-NC1]", state: "NC", office: "house", district: "01", website: "https://dondavis.house.gov" },
  { candidateId: "federal-M001229", name: "Rep. LaMonica McIver [D-NJ10]", state: "NJ", office: "house", district: "10", website: "https://mciver.house.gov/" },
  { candidateId: "federal-L000599", name: "Rep. Michael Lawler [R-NY17]", state: "NY", office: "house", district: "17", website: "https://www.lawler.house.gov" },
  { candidateId: "federal-T000463", name: "Rep. Michael Turner [R-OH10]", state: "OH", office: "house", district: "10", website: "https://turner.house.gov" },
  { candidateId: "federal-J000302", name: "Rep. John Joyce [R-PA13]", state: "PA", office: "house", district: "13", website: "https://johnjoyce.house.gov/" },
  { candidateId: "federal-B001309", name: "Rep. Tim Burchett [R-TN2]", state: "TN", office: "house", district: "02", website: "https://www.burchettforcongress.com/" },
  { candidateId: "federal-K000392", name: "Rep. David Kustoff [R-TN8]", state: "TN", office: "house", district: "08", website: "http://www.kustoffforcongress.com/" },
  { candidateId: "federal-W000829", name: "Rep. Tony Wied [R-WI8]", state: "WI", office: "house", district: "08", website: "https://wied.house.gov/" },
  { candidateId: "federal-M001205", name: "Rep. Carol Miller [R-WV1]", state: "WV", office: "house", district: "01", website: "http://www.delegatecarolmiller.com/" },
];

interface RetryResult {
  target: WikidataTarget;
  status: "captured" | "no_captures" | "blocked";
  captureCount: number;
  canonicalCaptureUrl: string | null;
}

async function retryCandidate(
  target: WikidataTarget,
  cdxFrom: string,
  cdxCutoff: string,
  fetcher: typeof fetch,
): Promise<RetryResult> {
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
    return { target, status: "no_captures", captureCount: captures.length, canonicalCaptureUrl: null };
  }
  return {
    target,
    status: "captured",
    captureCount: captures.length,
    canonicalCaptureUrl: waybackReplayUrl(canonical),
  };
}

function toCorpusRow(result: RetryResult): Record<string, unknown> | null {
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
    websiteSource: "wikidata",
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

async function main(): Promise<void> {
  const asJson = process.argv.includes("--json");
  const cycle = 2022;
  const defaults = cycleDefaults(cycle);
  const cdxFrom = `${defaults.fromDate.replace(/-/gu, "")}000000`;
  const cdxCutoff = toCdxCutoff(defaults.electionDay);

  process.stderr.write(
    `[promise-wayback-wikidata-retry] retrying ${TARGETS.length} Wikidata-sourced candidates ` +
      `against Wayback CDX (cycle=${cycle})\n`,
  );

  const results = await mapWithConcurrency(TARGETS, 2, (t) => retryCandidate(t, cdxFrom, cdxCutoff, fetch));

  const captured = results.filter((r) => r.status === "captured");
  const noCaptures = results.filter((r) => r.status === "no_captures");
  const blocked = results.filter((r) => r.status === "blocked");
  process.stderr.write(
    `[promise-wayback-wikidata-retry] done: ${captured.length}/${results.length} captured, ` +
      `${noCaptures.length} genuine no-captures, ${blocked.length} blocked/errored\n`,
  );
  for (const r of results) {
    if (r.status !== "captured") {
      process.stderr.write(`  ${r.status.toUpperCase()} ${r.target.name} -> ${r.target.website}\n`);
    }
  }

  if (asJson) {
    console.log(JSON.stringify(results.map(toCorpusRow).filter(Boolean), null, 2));
  }
}

main().catch((err) => {
  console.error("[promise-wayback-wikidata-retry] fatal:", err);
  process.exit(1);
});
