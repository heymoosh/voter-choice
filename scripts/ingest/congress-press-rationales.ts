/**
 * scripts/ingest/congress-press-rationales.ts
 *
 * Ingest scaffold: match congress-press press releases to roll-call votes and
 * upsert vote_rationale rows for later LLM generation.
 *
 * Data source: congress-press by Derek Willis
 *   https://github.com/dwillis/congress-press
 *   MIT licensed — Copyright (c) 2026 Derek Willis
 *
 * CRITICAL: This script is a SCAFFOLD — it is documented and runnable but
 * MUST NOT BE EXECUTED during development. It makes no LLM calls (those happen
 * in a separate generation step). DB upserts only run when explicitly invoked
 * with DATABASE_URL set.
 *
 * Usage (when ready to run):
 *   CONGRESS_PRESS_JSONL=/path/to/congress-press.jsonl \
 *   DATABASE_URL=<neon-connection-string> \
 *   npx tsx scripts/ingest/congress-press-rationales.ts [--dry-run] [--limit N]
 *
 * Architecture:
 *   1. Stream the JSONL line-by-line (270MB+ file — do not load into memory).
 *   2. Per candidate in our DB, look up their federal votes.
 *   3. For each vote, call matchReleaseToVote from press-release-matcher.ts.
 *   4. Collect matching releases (minConfidence = "medium" by default).
 *   5. Upsert a vote_rationales row with the matched sources, leaving
 *      rationale_text NULL (generation runs later via generate-rationales.ts).
 *
 * Attribution requirements (cleared 2026-06-17):
 *   - MIT copyright notice "Copyright (c) 2026 Derek Willis" appears in this
 *     file header (retained above).
 *   - "congress-press by Derek Willis" with repo link must appear wherever the
 *     synthesized rationale is displayed — enforced in alignment.ts and the
 *     UI layer (VoteRationaleAttribution component).
 *   - Each press release URL is stored in press_release_sources and linked
 *     alongside the rationale.
 *
 * What's NOT run here:
 *   - LLM generation (see scripts/ingest/generate-rationales.ts).
 *   - Schema migration (see db/migrations/0009_add_vote_rationales.sql).
 */

import { createReadStream } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createInterface } from "node:readline";
import { sql, eq, and } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { votes, bills, candidates, voteRationales } from "../../db/schema";
import {
  matchReleaseToVote,
  filterMatchingReleases,
  type CongressPressRelease,
  type RollCallVote,
} from "./press-release-matcher";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export type IngestRationalesConfig = {
  /** Path to the congress-press JSONL file. */
  jsonlPath: string;
  /** Print what would be upserted — no DB writes. */
  dryRun: boolean;
  /** Cap on vote_rationale rows upserted per run (for incremental runs). */
  limit: number;
  /** Minimum match confidence to keep. Default "medium". */
  minConfidence: "high" | "medium" | "low";
};

export type IngestCounts = {
  releasesRead: number;
  releasesExcluded: number;
  matchesHigh: number;
  matchesMedium: number;
  matchesLow: number;
  rowsUpserted: number;
  rowsSkipped: number;
  errors: number;
};

const DEFAULT_LIMIT = 5000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the bill number tokens the matcher uses for high-confidence matching.
 * Generates the common human-readable representations of a govtrack bill id.
 *
 * "govtrack-hr1234-118" → ["H.R. 1234", "HR1234", "H.R.1234"]
 * "govtrack-s42-117"   → ["S. 42", "S.42"]
 * "govtrack-hjres7-119"→ ["H.J.Res. 7", "HJRes7"]
 */
export function buildBillNumberTokens(billId: string): string[] {
  const m = /^govtrack-([a-z]+)(\d+)-\d+$/.exec(billId);
  if (!m) return [];
  const typeRaw = m[1];
  const num = m[2];

  const TYPE_MAP: Record<string, { dotted: string; compact: string }> = {
    hr: { dotted: `H.R. ${num}`, compact: `HR${num}` },
    s: { dotted: `S. ${num}`, compact: `S${num}` },
    hres: { dotted: `H.Res. ${num}`, compact: `HRes${num}` },
    sres: { dotted: `S.Res. ${num}`, compact: `SRes${num}` },
    hjres: { dotted: `H.J.Res. ${num}`, compact: `HJRes${num}` },
    sjres: { dotted: `S.J.Res. ${num}`, compact: `SJRes${num}` },
    hconres: { dotted: `H.Con.Res. ${num}`, compact: `HConRes${num}` },
    sconres: { dotted: `S.Con.Res. ${num}`, compact: `SConRes${num}` },
  };

  const mapped = TYPE_MAP[typeRaw];
  if (!mapped) return [];
  // Include a no-spaces-no-dots variant too
  const noDots = mapped.dotted.replace(/[\s.]+/g, "");
  return [mapped.dotted, mapped.compact, noDots].filter(
    (t, i, arr) => arr.indexOf(t) === i,
  );
}

/** Extract bioguide ID from a "federal-BIOGUIDE" candidate id. */
function bioguideFromCandidateId(candidateId: string): string | null {
  const m = /^federal-([A-Z]\d{6})$/i.exec(candidateId);
  return m ? m[1].toUpperCase() : null;
}

// ---------------------------------------------------------------------------
// Release buffering (in-memory per-bioguide index)
//
// The JSONL is 670K+ lines. We can't hold it all in memory. Instead we stream
// it once and, for each release whose bioguide_id maps to a candidate in our
// DB, buffer just that release. After the stream finishes we process buffered
// releases against each candidate's votes.
//
// For a large run (all federal members): expect ~2,000 unique bioguide IDs and
// ~300 releases per member average = ~600K buffered releases total. At ~500
// bytes each that's ~300MB in Node heap. For memory-constrained environments,
// set CONGRESS_PRESS_BIOGUIDE_IDS=comma-separated-list to process a subset.
// ---------------------------------------------------------------------------

/** Load all federal candidate bioguide IDs from our DB. */
async function loadFederalBioguides(
  db: DbClient,
): Promise<Map<string, string>> {
  // Returns Map<bioguideId → candidateId>
  const rows = await db
    .select({ id: candidates.id })
    .from(candidates)
    .where(
      // Only federal candidates have bioguide-style ids
      sql`${candidates.id} ~ '^federal-[A-Z][0-9]{6}$'`,
    );

  const map = new Map<string, string>();
  for (const row of rows) {
    const bg = bioguideFromCandidateId(row.id);
    if (bg) map.set(bg, row.id);
  }
  return map;
}

/** Load all votes with their bill details for a candidate. */
async function loadCandidateVotes(
  db: DbClient,
  candidateId: string,
): Promise<RollCallVote[]> {
  const rows = await db
    .select({
      billId: bills.id,
      billTitle: bills.title,
      voteDate: votes.voteDate,
    })
    .from(votes)
    .innerJoin(bills, eq(votes.billId, bills.id))
    .where(eq(votes.candidateId, candidateId));

  // Derive bioguideId from the candidateId (for the matcher type)
  const bioguideId = bioguideFromCandidateId(candidateId) ?? candidateId;

  return rows.map((r) => ({
    billId: r.billId,
    billTitle: r.billTitle,
    billNumberTokens: buildBillNumberTokens(r.billId),
    voteDate: r.voteDate,
    bioguideId,
  }));
}

// ---------------------------------------------------------------------------
// DB upsert
// ---------------------------------------------------------------------------

type PressReleaseSource = {
  url: string;
  publishedAt: string;
  title: string;
};

async function upsertRationaleRow(
  db: DbClient,
  candidateId: string,
  voteInfo: RollCallVote,
  sources: PressReleaseSource[],
  matchConfidence: string,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) {
    console.log(
      `[congress-press] DRY RUN upsert candidate=${candidateId} bill=${voteInfo.billId} confidence=${matchConfidence} sources=${sources.length}`,
    );
    return;
  }

  await db
    .insert(voteRationales)
    .values({
      candidateId,
      billId: voteInfo.billId,
      pressReleaseSources: sources,
      matchConfidence,
      // rationale_text and model_version stay NULL until generation step runs
      rationaleText: null,
      label: null,
      modelVersion: null,
      generatedAt: null,
    })
    .onConflictDoUpdate({
      target: [voteRationales.candidateId, voteRationales.billId],
      set: {
        pressReleaseSources: sql`excluded.press_release_sources`,
        matchConfidence: sql`excluded.match_confidence`,
        updatedAt: new Date(),
      },
      // Don't overwrite a generated rationale when re-running the ingest
      setWhere: sql`${voteRationales.rationaleText} IS NULL`,
    });
}

// ---------------------------------------------------------------------------
// Main ingest
// ---------------------------------------------------------------------------

export async function ingestCongressPressRationales({
  db = requireDb(),
  config,
}: {
  db?: DbClient;
  config: IngestRationalesConfig;
}): Promise<IngestCounts> {
  const counts: IngestCounts = {
    releasesRead: 0,
    releasesExcluded: 0,
    matchesHigh: 0,
    matchesMedium: 0,
    matchesLow: 0,
    rowsUpserted: 0,
    rowsSkipped: 0,
    errors: 0,
  };

  // Step 1: load federal bioguides → candidateId map
  console.log("[congress-press] loading federal bioguide map...");
  const bioguideMap = await loadFederalBioguides(db);
  console.log(`[congress-press] loaded ${bioguideMap.size} federal bioguides`);

  // Step 2: stream JSONL and buffer releases by bioguide
  const releasesByBioguide = new Map<string, CongressPressRelease[]>();

  console.log(`[congress-press] streaming ${config.jsonlPath}...`);
  await new Promise<void>((resolve, reject) => {
    const rl = createInterface({
      input: createReadStream(config.jsonlPath, { encoding: "utf-8" }),
      crlfDelay: Infinity,
    });

    rl.on("line", (line) => {
      if (!line.trim()) return;
      counts.releasesRead += 1;
      try {
        const release = JSON.parse(line) as CongressPressRelease;
        const bg = (release.bioguide_id ?? "").toUpperCase();
        // Only buffer releases for members in our DB
        if (!bioguideMap.has(bg)) return;
        const arr = releasesByBioguide.get(bg) ?? [];
        arr.push(release);
        releasesByBioguide.set(bg, arr);
      } catch {
        counts.errors += 1;
      }
    });

    rl.on("close", resolve);
    rl.on("error", reject);
  });

  console.log(
    `[congress-press] streamed releases=${counts.releasesRead} members_with_releases=${releasesByBioguide.size}`,
  );

  // Step 3: per-bioguide, match releases to votes and upsert
  for (const [bioguide, candidateId] of bioguideMap) {
    if (counts.rowsUpserted >= config.limit) break;

    const releases = releasesByBioguide.get(bioguide) ?? [];
    if (releases.length === 0) continue;

    let candidateVotes: RollCallVote[];
    try {
      candidateVotes = await loadCandidateVotes(db, candidateId);
    } catch (err) {
      console.warn(
        `[congress-press] failed loading votes candidate=${candidateId}: ${err}`,
      );
      counts.errors += 1;
      continue;
    }

    for (const vote of candidateVotes) {
      if (counts.rowsUpserted >= config.limit) break;

      const matches = filterMatchingReleases(
        releases,
        vote,
        config.minConfidence,
      );

      // Tally exclusions (personal explanations excluded by the matcher)
      const excluded = releases.filter((r) => {
        const result = matchReleaseToVote(r, vote);
        return result.excluded;
      });
      counts.releasesExcluded += excluded.length;

      if (matches.length === 0) {
        counts.rowsSkipped += 1;
        continue;
      }

      // Best confidence across all matches for this vote
      const bestConfidence = matches.reduce<"high" | "medium" | "low">(
        (best, { result }) => {
          if (result.confidence === "high") return "high";
          if (result.confidence === "medium" && best !== "high")
            return "medium";
          return best;
        },
        "low",
      );

      // Tally by confidence
      if (bestConfidence === "high") counts.matchesHigh += 1;
      else if (bestConfidence === "medium") counts.matchesMedium += 1;
      else counts.matchesLow += 1;

      const sources: PressReleaseSource[] = matches.map(({ release }) => ({
        url: release.url,
        publishedAt: release.date,
        title: release.title,
      }));

      try {
        await upsertRationaleRow(
          db,
          candidateId,
          vote,
          sources,
          bestConfidence,
          config.dryRun,
        );
        counts.rowsUpserted += 1;
      } catch (err) {
        console.warn(
          `[congress-press] upsert failed candidate=${candidateId} bill=${vote.billId}: ${err}`,
        );
        counts.errors += 1;
      }
    }
  }

  console.log(
    [
      "[congress-press] complete",
      `releases_read=${counts.releasesRead}`,
      `releases_excluded=${counts.releasesExcluded}`,
      `matches_high=${counts.matchesHigh}`,
      `matches_medium=${counts.matchesMedium}`,
      `matches_low=${counts.matchesLow}`,
      `rows_upserted=${counts.rowsUpserted}`,
      `rows_skipped=${counts.rowsSkipped}`,
      `errors=${counts.errors}`,
    ].join(" "),
  );

  return counts;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function resolveIngestConfig(env: NodeJS.ProcessEnv): IngestRationalesConfig {
  const jsonlPath = env.CONGRESS_PRESS_JSONL;
  if (!jsonlPath) {
    throw new Error(
      "CONGRESS_PRESS_JSONL environment variable is required (path to congress-press JSONL file)",
    );
  }
  const limitRaw = env.CONGRESS_PRESS_LIMIT
    ? Number.parseInt(env.CONGRESS_PRESS_LIMIT, 10)
    : DEFAULT_LIMIT;
  const limit =
    Number.isInteger(limitRaw) && limitRaw > 0 ? limitRaw : DEFAULT_LIMIT;

  const minConfidence =
    env.CONGRESS_PRESS_MIN_CONFIDENCE === "high" ||
    env.CONGRESS_PRESS_MIN_CONFIDENCE === "medium" ||
    env.CONGRESS_PRESS_MIN_CONFIDENCE === "low"
      ? (env.CONGRESS_PRESS_MIN_CONFIDENCE as "high" | "medium" | "low")
      : "medium";

  return {
    jsonlPath: resolve(jsonlPath),
    dryRun:
      env.CONGRESS_PRESS_DRY_RUN === "1" || process.argv.includes("--dry-run"),
    limit,
    minConfidence,
  };
}

function isCliExecution(): boolean {
  const entrypoint = process.argv[1];
  if (!entrypoint) return false;
  return import.meta.url === pathToFileURL(resolve(entrypoint)).href;
}

if (isCliExecution()) {
  const config = resolveIngestConfig(process.env);
  ingestCongressPressRationales({ config }).catch((err) => {
    console.error("[congress-press] fatal:", err);
    process.exitCode = 1;
  });
}
