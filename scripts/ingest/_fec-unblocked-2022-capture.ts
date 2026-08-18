/**
 * scripts/ingest/_fec-unblocked-2022-capture.ts
 *
 * One-off follow-up to _fec-id-backfill-scope.ts --apply (2026-08-18): now
 * that ~30 `federal-*` candidates rows have a real fec_candidate_id, this
 * resolves their campaign website via OpenFEC (same lookup
 * _promise-corpus-spike.ts's main loop does) and runs the same 2022-window
 * Wayback CDX capture check as promise-wayback-retry.ts. It exists only to
 * unblock the specific 2022 promise-ledger candidates that were stuck in
 * `no_fec_id` in spike-all-2022.json before the backfill — not a general
 * pipeline change.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/ingest/_fec-unblocked-2022-capture.ts --json
 */

import { readFileSync } from "node:fs";
import { requireDb } from "../../db/client";
import { candidates } from "../../db/schema";
import { and, eq, isNotNull, like } from "drizzle-orm";
import {
  cdxUrlKey,
  cycleDefaults,
  extractCommitteeWebsite,
  fetchJsonSoft,
  normalizeCampaignUrl,
  parseCdxJson,
  pickPrincipalCommittee,
  selectCanonicalCapture,
  toCdxCutoff,
  waybackReplayUrl,
} from "./_promise-corpus-spike";

const OPENFEC_BASE_URL = "https://api.open.fec.gov/v1";
const CYCLE = 2022;

interface SpikeRow {
  state: string;
  office: string;
  district: string | null;
  name: string;
  bucket: string;
  candidateId: string;
}

interface OutRow {
  state: string;
  office: string;
  district: string | null;
  name: string;
  bucket: string;
  candidateId: string;
  website: string | null;
  captureCount: number;
  canonicalCaptureUrl: string | null;
  captureArchive: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const asJson = process.argv.includes("--json");
  const apiKey = process.env.FEC_API_KEY || process.env.CONGRESS_GOV_API_KEY;
  if (!apiKey) {
    console.error("[fec-unblocked-2022-capture] no FEC_API_KEY / CONGRESS_GOV_API_KEY in env");
    process.exit(1);
  }

  const spikeAll = JSON.parse(readFileSync("spike-all-2022.json", "utf8")) as SpikeRow[];
  const wasNoFecId = new Set(
    spikeAll.filter((r) => r.bucket === "no_fec_id").map((r) => r.candidateId),
  );

  const db = requireDb();
  const nowResolved = await db
    .select({ id: candidates.id })
    .from(candidates)
    .where(and(isNotNull(candidates.fecCandidateId), like(candidates.id, "federal-%")));
  const resolvedIds = new Set(nowResolved.map((r) => r.id));

  const targets = spikeAll.filter(
    (r) => wasNoFecId.has(r.candidateId) && resolvedIds.has(r.candidateId),
  );
  process.stderr.write(
    `[fec-unblocked-2022-capture] ${targets.length} candidates were no_fec_id and now have a ` +
      `fec_candidate_id — resolving website + 2022 Wayback capture for each\n`,
  );

  const defaults = cycleDefaults(CYCLE);
  const cdxCutoff = toCdxCutoff(defaults.electionDay);
  const cdxFrom = defaults.fromDate.replace(/-/gu, "");

  const out: OutRow[] = [];

  for (const t of targets) {
    const base: OutRow = {
      state: t.state,
      office: t.office,
      district: t.district,
      name: t.name,
      bucket: "unresolved",
      candidateId: t.candidateId,
      website: null,
      captureCount: 0,
      canonicalCaptureUrl: null,
      captureArchive: null,
    };

    const fecRow = await db
      .select({ fecCandidateId: candidates.fecCandidateId })
      .from(candidates)
      .where(eq(candidates.id, t.candidateId));
    const fecCandidateId = fecRow[0]?.fecCandidateId ?? null;
    if (!fecCandidateId) {
      out.push({ ...base, bucket: "no_fec_id" });
      continue;
    }

    await sleep(3700);
    const committeesPayload = await fetchJsonSoft(
      `${OPENFEC_BASE_URL}/candidate/${encodeURIComponent(fecCandidateId)}/committees/` +
        `?api_key=${apiKey}&per_page=100`,
      fetch,
      `openfec committees ${fecCandidateId}`,
    );
    if (committeesPayload === null) {
      out.push({ ...base, bucket: "fec_api_error" });
      continue;
    }

    const principal = pickPrincipalCommittee(committeesPayload, CYCLE);
    if (!principal) {
      out.push({ ...base, bucket: "no_principal_committee" });
      continue;
    }

    let rawWebsite: string | null = null;
    await sleep(3700);
    const historyPayload = await fetchJsonSoft(
      `${OPENFEC_BASE_URL}/committee/${encodeURIComponent(principal.committeeId)}/history/` +
        `${CYCLE}/?api_key=${apiKey}`,
      fetch,
      `openfec committee history ${principal.committeeId}/${CYCLE}`,
    );
    if (historyPayload !== null) rawWebsite = extractCommitteeWebsite(historyPayload);

    if (!normalizeCampaignUrl(rawWebsite)) rawWebsite = principal.website;
    if (!normalizeCampaignUrl(rawWebsite)) {
      await sleep(3700);
      const detailPayload = await fetchJsonSoft(
        `${OPENFEC_BASE_URL}/committee/${encodeURIComponent(principal.committeeId)}/?api_key=${apiKey}`,
        fetch,
        `openfec committee ${principal.committeeId}`,
      );
      if (detailPayload === null) {
        out.push({ ...base, bucket: "fec_api_error" });
        continue;
      }
      rawWebsite = extractCommitteeWebsite(detailPayload);
    }

    const website = normalizeCampaignUrl(rawWebsite);
    if (!website) {
      out.push({ ...base, bucket: "no_website_on_file" });
      continue;
    }
    base.website = website;

    const cdxPayload = await fetchJsonSoft(
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(cdxUrlKey(website))}` +
        `&output=json&from=${cdxFrom}&to=${cdxCutoff.slice(0, 8)}` +
        `&filter=statuscode:200&collapse=timestamp:8&limit=500`,
      fetch,
      `wayback cdx ${website}`,
    );
    if (cdxPayload === null) {
      out.push({ ...base, bucket: "wayback_error" });
      continue;
    }
    const captures = parseCdxJson(cdxPayload);
    base.captureCount = captures.length;
    const canonical = selectCanonicalCapture(captures, cdxCutoff);
    if (!canonical) {
      out.push({ ...base, bucket: "website_no_captures" });
      continue;
    }
    base.canonicalCaptureUrl = waybackReplayUrl(canonical);
    base.captureArchive = "wayback";
    out.push({ ...base, bucket: "website_archived" });
  }

  const captured = out.filter((r) => r.bucket === "website_archived");
  process.stderr.write(
    `[fec-unblocked-2022-capture] done: ${captured.length}/${out.length} captured\n`,
  );
  for (const r of out) {
    if (r.bucket !== "website_archived") {
      process.stderr.write(`  ${r.candidateId} (${r.name}) -> ${r.bucket}\n`);
    }
  }

  if (asJson) console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error("[fec-unblocked-2022-capture] fatal:", err);
  process.exit(1);
});
