/**
 * scripts/ingest/ne-seed-legislators.ts
 *
 * One-time seed: fetch Nebraska legislators from OpenStates API and insert
 * them as candidates in the DB. Nebraska has a unicameral legislature (49
 * senators), so this takes ~3 API requests rather than a full pgdump restore.
 *
 * Run BEFORE ne-nadc-donors.ts so candidates exist for donor matching.
 *
 * Usage:
 *   DATABASE_URL=<neon> OPENSTATES_API_KEY=<key> npx tsx scripts/ingest/ne-seed-legislators.ts
 *   DATABASE_URL=<neon> OPENSTATES_API_KEY=<key> npx tsx scripts/ingest/ne-seed-legislators.ts --dry-run
 */

import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { requireDb } from "../../db/client";
import { candidates, candidateOffices } from "../../db/schema";

const OPENSTATES_BASE = "https://v3.openstates.org";
const JURISDICTION = "ne"; // OpenStates jurisdiction slug for Nebraska
const PER_PAGE = 20;
// Nebraska is unicameral — all members are senators
const JURISDICTION_DB = "state-NE-senate";
const OFFICE_LABEL = "NE Senate";
const ELECTION_CYCLE = "2024";

interface OpenStatesPersonMembership {
  organization: {
    id: string;
    name: string;
    classification: string;
  };
  role: string;
  start_date?: string | null;
  end_date?: string | null;
}

interface OpenStatesPerson {
  id: string;
  name: string;
  party: Array<{
    name: string;
    start_date?: string | null;
    end_date?: string | null;
  }>;
  current_memberships?: OpenStatesPersonMembership[];
}

interface OpenStatesResponse {
  results: OpenStatesPerson[];
  pagination: {
    per_page: number;
    page: number;
    max_page: number;
    total_items: number;
  };
}

function deterministicUuid(input: string): string {
  const hash = createHash("sha1").update(input).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

function buildCandidateId(openStatesId: string): string {
  return `openstates-${openStatesId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
}

async function fetchNeLegislators(apiKey: string): Promise<OpenStatesPerson[]> {
  const all: OpenStatesPerson[] = [];
  let page = 1;

  while (true) {
    const url = new URL(`${OPENSTATES_BASE}/people`);
    url.searchParams.set("jurisdiction", JURISDICTION);
    url.searchParams.set("per_page", String(PER_PAGE));
    url.searchParams.set("page", String(page));
    url.searchParams.set("current_role", "true");

    console.log(`[ne-seed] fetching page ${page} ...`);
    const res = await fetch(url.href, {
      headers: {
        "X-API-KEY": apiKey,
        "User-Agent": "voter-choice-ne-legislator-seed",
      },
    });

    if (!res.ok) {
      throw new Error(`OpenStates HTTP ${res.status} for page ${page}`);
    }

    const data = (await res.json()) as OpenStatesResponse;
    all.push(...data.results);

    console.log(
      `[ne-seed] page=${page}/${data.pagination.max_page} items=${data.results.length} total=${all.length}`,
    );

    if (page >= data.pagination.max_page || data.results.length === 0) break;
    page += 1;

    // Brief pause to be courteous to the API
    await new Promise((r) => setTimeout(r, 500));
  }

  return all;
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const apiKey = process.env.OPENSTATES_API_KEY;
  if (!apiKey) {
    throw new Error("OPENSTATES_API_KEY environment variable is required");
  }

  const db = requireDb();

  console.log(`[ne-seed] fetching NE legislators from OpenStates ...`);
  const people = await fetchNeLegislators(apiKey);
  console.log(`[ne-seed] fetched ${people.length} NE legislators`);

  if (people.length === 0) {
    console.warn(
      "[ne-seed] no legislators returned — check API key and jurisdiction",
    );
    return;
  }

  // Check which candidates are already in DB
  const existingRows = await db
    .select({ sourceId: candidates.sourceId })
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = ${JURISDICTION_DB}`);
  const existingSourceIds = new Set(
    existingRows.map((r) => r.sourceId).filter(Boolean),
  );
  console.log(
    `[ne-seed] ${existingSourceIds.size} NE candidates already in DB`,
  );

  let inserted = 0;
  let skipped = 0;

  for (const person of people) {
    const candidateId = buildCandidateId(person.id);

    if (existingSourceIds.has(person.id)) {
      skipped += 1;
      continue;
    }

    const primaryParty = person.party?.[0]?.name ?? null;

    if (!isDryRun) {
      await db
        .insert(candidates)
        .values({
          id: candidateId,
          fullName: person.name,
          sourceId: person.id,
          jurisdiction: JURISDICTION_DB,
          isIncumbent: true,
          rawMetadata: {
            openstates: { id: person.id, primary_party: primaryParty },
          },
        })
        .onConflictDoUpdate({
          target: [candidates.id],
          set: {
            fullName: sql`excluded.full_name`,
            sourceId: sql`excluded.source_id`,
            rawMetadata: sql`excluded.raw_metadata`,
          },
        });

      // Insert office record
      const officeId = deterministicUuid(
        `${candidateId}:${JURISDICTION_DB}:2023-01-01:ne-unicameral`,
      );
      await db
        .insert(candidateOffices)
        .values({
          id: officeId,
          candidateId,
          officeLabel: OFFICE_LABEL,
          jurisdiction: JURISDICTION_DB,
          termStart: "2023-01-01",
          sourceUrl: `https://openstates.org/person/${person.id}/`,
        })
        .onConflictDoNothing();

      inserted += 1;
      console.log(`[ne-seed] inserted: ${person.name} (${person.id})`);
    } else {
      console.log(
        `[ne-seed] [dry-run] would insert: ${person.name} (${person.id})`,
      );
      inserted += 1;
    }
  }

  console.log(
    `[ne-seed] done inserted=${isDryRun ? "(dry-run) " : ""}${inserted} skipped=${skipped} total_in_db=${existingSourceIds.size + inserted}`,
  );
}

function isCliExecution(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isCliExecution()) {
  main().catch((e) => {
    console.error("[ne-seed] error:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}
