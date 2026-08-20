/**
 * scripts/ingest/backfill-pac-sponsor-class.ts
 *
 * Stamp `pac_committees.sponsor_class` on rows that predate migration 0026.
 *
 * Reads nothing but the DB: sponsor class is a pure function of four fields
 * the committee already filed and we already store (org_type, designation,
 * committee_type, connected_org), applied by src/lib/pacSponsorClass.ts. No
 * network, no FEC key, no bulk download. `federal-pac-sponsors.ts` stamps the
 * same value on every future pass; this is the one-time catch-up.
 *
 * Rows whose `sponsor_class_method` is 'human' are never touched.
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/backfill-pac-sponsor-class.ts --dry-run
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/backfill-pac-sponsor-class.ts
 *   Flags: --dry-run, --limit N
 */

import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { pacCommittees } from "../../db/schema";
import {
  classifyPacSponsor,
  type PacSponsorClass,
} from "../../src/lib/pacSponsorClass";
import { parsePositiveInteger, parseValueFlag } from "./_fec-bulk";

const LOG_PREFIX = "[backfill-pac-sponsor-class]";
const UPDATE_CHUNK_SIZE = 500;

export interface BackfillConfig {
  dryRun: boolean;
  limit: number | null;
}

export interface BackfillCounts {
  scanned: number;
  updated: number;
  skippedHuman: number;
  byClass: Record<string, number>;
}

export function parseArgs(argv: string[]): BackfillConfig {
  return {
    dryRun: argv.includes("--dry-run"),
    limit: parsePositiveInteger(parseValueFlag(argv, "--limit")),
  };
}

export async function backfillSponsorClass(
  db: DbClient,
  config: BackfillConfig,
): Promise<BackfillCounts> {
  const rows = (await db
    .select({
      committeeId: pacCommittees.committeeId,
      orgType: pacCommittees.orgType,
      designation: pacCommittees.designation,
      committeeType: pacCommittees.committeeType,
      connectedOrg: pacCommittees.connectedOrg,
      sponsorClass: pacCommittees.sponsorClass,
      sponsorClassMethod: pacCommittees.sponsorClassMethod,
    })
    .from(pacCommittees)) as Array<{
    committeeId: string;
    orgType: string | null;
    designation: string | null;
    committeeType: string | null;
    connectedOrg: string | null;
    sponsorClass: string | null;
    sponsorClassMethod: string | null;
  }>;

  const counts: BackfillCounts = {
    scanned: 0,
    updated: 0,
    skippedHuman: 0,
    byClass: {},
  };

  const pending: Array<{
    committeeId: string;
    sponsorClass: PacSponsorClass;
    method: string;
  }> = [];

  for (const row of rows) {
    if (config.limit !== null && counts.scanned >= config.limit) break;
    counts.scanned += 1;

    if (row.sponsorClassMethod === "human") {
      counts.skippedHuman += 1;
      continue;
    }

    const { sponsorClass, method } = classifyPacSponsor(row);
    counts.byClass[sponsorClass] = (counts.byClass[sponsorClass] ?? 0) + 1;

    if (
      row.sponsorClass === sponsorClass &&
      row.sponsorClassMethod === method
    ) {
      continue;
    }
    pending.push({ committeeId: row.committeeId, sponsorClass, method });
  }

  counts.updated = pending.length;
  if (config.dryRun || pending.length === 0) return counts;

  for (let i = 0; i < pending.length; i += UPDATE_CHUNK_SIZE) {
    const chunk = pending.slice(i, i + UPDATE_CHUNK_SIZE);
    const values = sql.join(
      chunk.map((r) => sql`(${r.committeeId}, ${r.sponsorClass}, ${r.method})`),
      sql`, `,
    );
    await db.execute(sql`
      UPDATE pac_committees AS t
      SET sponsor_class = v.sponsor_class,
          sponsor_class_method = v.method,
          updated_at = now()
      FROM (VALUES ${values}) AS v(committee_id, sponsor_class, method)
      WHERE t.committee_id = v.committee_id
        AND (t.sponsor_class_method IS DISTINCT FROM 'human')
    `);
  }

  return counts;
}

async function main(): Promise<void> {
  const config = parseArgs(process.argv.slice(2));
  const db = requireDb();
  const counts = await backfillSponsorClass(db, config);
  const breakdown = Object.entries(counts.byClass)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  console.log(
    `${LOG_PREFIX} ${config.dryRun ? "DRY RUN " : ""}scanned=${counts.scanned} ` +
      `updated=${counts.updated} skipped_human=${counts.skippedHuman}`,
  );
  console.log(`${LOG_PREFIX} classes: ${breakdown}`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().then(
    () => process.exit(0),
    (error) => {
      console.error(`${LOG_PREFIX} failed`, error);
      process.exit(1);
    },
  );
}
