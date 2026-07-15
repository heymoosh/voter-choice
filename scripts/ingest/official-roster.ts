/**
 * scripts/ingest/official-roster.ts
 *
 * Idempotent importer for `official_roster_candidates` — state
 * Secretary-of-State candidate rosters, hand-transcribed into fixture files
 * under scripts/congressional-rosters/<state>-official-roster-<year>.ts.
 * This is the manual-import track from the 2026-07-15 plan revision
 * (docs/operations/nationwide-congressional-roster-plan.md): one state at a
 * time, additive, flag-gated at read time by OFFICIAL_ROSTER_ENABLED
 * (src/lib/server/officialRosterFlag.ts) — importing rows here has zero
 * effect on the running app until that flag is set.
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/official-roster.ts --state AZ
 *
 * Idempotency: upserts on (state, office, district, election_year, name,
 * stage) — the same fixture can be re-run safely after a transcription fix.
 */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { officialRosterCandidates } from "../../db/schema";
import {
  AZ_STATE,
  AZ_OFFICE,
  AZ_ELECTION_YEAR,
  AZ_STAGE,
  AZ_SOURCE_URLS,
  AZ_RETRIEVED_AT,
  AZ_OFFICIAL_ROSTER_2026,
  type OfficialRosterEntry,
} from "../congressional-rosters/az-official-roster-2026";
import {
  TX_STATE,
  TX_ELECTION_YEAR,
  TX_STAGE,
  TX_HOUSE_SOURCE_URLS,
  TX_SENATE_SOURCE_URLS,
  TX_RETRIEVED_AT,
  TX_HOUSE_ROSTER_2026,
  TX_SENATE_ROSTER_2026,
} from "../congressional-rosters/tx-official-roster-2026";
import {
  OK_STATE,
  OK_ELECTION_YEAR,
  OK_STAGE,
  OK_HOUSE_SOURCE_URLS,
  OK_SENATE_SOURCE_URLS,
  OK_RETRIEVED_AT,
  OK_HOUSE_ROSTER_2026,
  OK_SENATE_ROSTER_2026,
} from "../congressional-rosters/ok-official-roster-2026";
import {
  AL_STATE,
  AL_ELECTION_YEAR,
  AL_STAGE,
  AL_HOUSE_SOURCE_URLS,
  AL_SENATE_SOURCE_URLS,
  AL_RETRIEVED_AT,
  AL_HOUSE_ROSTER_2026,
  AL_SENATE_ROSTER_2026,
} from "../congressional-rosters/al-official-roster-2026";
import {
  AK_STATE,
  AK_ELECTION_YEAR,
  AK_STAGE,
  AK_HOUSE_SOURCE_URLS,
  AK_SENATE_SOURCE_URLS,
  AK_RETRIEVED_AT,
  AK_HOUSE_ROSTER_2026,
  AK_SENATE_ROSTER_2026,
} from "../congressional-rosters/ak-official-roster-2026";
import {
  CT_STATE,
  CT_ELECTION_YEAR,
  CT_STAGE,
  CT_HOUSE_SOURCE_URLS,
  CT_RETRIEVED_AT,
  CT_HOUSE_ROSTER_2026,
} from "../congressional-rosters/ct-official-roster-2026";

export interface OfficialRosterFixture {
  state: string;
  office: "house" | "senate";
  electionYear: number;
  stage: "primary" | "general";
  sourceUrl: string;
  retrievedAt: string;
  entries: OfficialRosterEntry[];
}

const FIXTURES: Record<string, OfficialRosterFixture[]> = {
  AZ: [
    {
      state: AZ_STATE,
      office: AZ_OFFICE,
      electionYear: AZ_ELECTION_YEAR,
      stage: AZ_STAGE,
      sourceUrl: AZ_SOURCE_URLS[0],
      retrievedAt: AZ_RETRIEVED_AT,
      entries: AZ_OFFICIAL_ROSTER_2026,
    },
  ],
  TX: [
    {
      state: TX_STATE,
      office: "house",
      electionYear: TX_ELECTION_YEAR,
      stage: TX_STAGE,
      sourceUrl: TX_HOUSE_SOURCE_URLS[0],
      retrievedAt: TX_RETRIEVED_AT,
      entries: TX_HOUSE_ROSTER_2026,
    },
    {
      state: TX_STATE,
      office: "senate",
      electionYear: TX_ELECTION_YEAR,
      stage: TX_STAGE,
      sourceUrl: TX_SENATE_SOURCE_URLS[0],
      retrievedAt: TX_RETRIEVED_AT,
      entries: TX_SENATE_ROSTER_2026,
    },
  ],
  OK: [
    {
      state: OK_STATE,
      office: "house",
      electionYear: OK_ELECTION_YEAR,
      stage: OK_STAGE,
      sourceUrl: OK_HOUSE_SOURCE_URLS[0],
      retrievedAt: OK_RETRIEVED_AT,
      entries: OK_HOUSE_ROSTER_2026,
    },
    {
      state: OK_STATE,
      office: "senate",
      electionYear: OK_ELECTION_YEAR,
      stage: OK_STAGE,
      sourceUrl: OK_SENATE_SOURCE_URLS[0],
      retrievedAt: OK_RETRIEVED_AT,
      entries: OK_SENATE_ROSTER_2026,
    },
  ],
  AL: [
    {
      state: AL_STATE,
      office: "house",
      electionYear: AL_ELECTION_YEAR,
      stage: AL_STAGE,
      sourceUrl: AL_HOUSE_SOURCE_URLS[0],
      retrievedAt: AL_RETRIEVED_AT,
      entries: AL_HOUSE_ROSTER_2026,
    },
    {
      state: AL_STATE,
      office: "senate",
      electionYear: AL_ELECTION_YEAR,
      stage: AL_STAGE,
      sourceUrl: AL_SENATE_SOURCE_URLS[0],
      retrievedAt: AL_RETRIEVED_AT,
      entries: AL_SENATE_ROSTER_2026,
    },
  ],
  AK: [
    {
      state: AK_STATE,
      office: "house",
      electionYear: AK_ELECTION_YEAR,
      stage: AK_STAGE,
      sourceUrl: AK_HOUSE_SOURCE_URLS[0],
      retrievedAt: AK_RETRIEVED_AT,
      entries: AK_HOUSE_ROSTER_2026,
    },
    {
      state: AK_STATE,
      office: "senate",
      electionYear: AK_ELECTION_YEAR,
      stage: AK_STAGE,
      sourceUrl: AK_SENATE_SOURCE_URLS[0],
      retrievedAt: AK_RETRIEVED_AT,
      entries: AK_SENATE_ROSTER_2026,
    },
  ],
  CT: [
    {
      state: CT_STATE,
      office: "house",
      electionYear: CT_ELECTION_YEAR,
      stage: CT_STAGE,
      sourceUrl: CT_HOUSE_SOURCE_URLS[0],
      retrievedAt: CT_RETRIEVED_AT,
      entries: CT_HOUSE_ROSTER_2026,
    },
  ],
};

export interface OfficialRosterImportCounts {
  state: string;
  rowsUpserted: number;
}

export async function runOfficialRosterImport(
  db: DbClient,
  state: string,
): Promise<OfficialRosterImportCounts> {
  const fixtures = FIXTURES[state.toUpperCase()];
  if (!fixtures || fixtures.length === 0) {
    throw new Error(
      `[official-roster] no fixture registered for state "${state}" — add one to FIXTURES in this file`,
    );
  }

  let rowsUpserted = 0;
  for (const fixture of fixtures) {
    for (const entry of fixture.entries) {
      await db
        .insert(officialRosterCandidates)
        .values({
          state: fixture.state,
          office: fixture.office,
          district: entry.district,
          electionYear: fixture.electionYear,
          name: entry.name,
          party: entry.party,
          isIncumbent: entry.isIncumbent,
          ballotStatus: entry.ballotStatus,
          stage: fixture.stage,
          sourceUrl: fixture.sourceUrl,
          retrievedAt: fixture.retrievedAt,
        })
        .onConflictDoUpdate({
          target: [
            officialRosterCandidates.state,
            officialRosterCandidates.office,
            officialRosterCandidates.district,
            officialRosterCandidates.electionYear,
            officialRosterCandidates.name,
            officialRosterCandidates.stage,
          ],
          set: {
            party: sql`excluded.party`,
            isIncumbent: sql`excluded.is_incumbent`,
            ballotStatus: sql`excluded.ballot_status`,
            sourceUrl: sql`excluded.source_url`,
            retrievedAt: sql`excluded.retrieved_at`,
          },
        });
      rowsUpserted += 1;
    }
  }

  return { state: fixtures[0].state, rowsUpserted };
}

function parseArgs(argv: string[]): { state: string } {
  const idx = argv.indexOf("--state");
  const state = idx !== -1 ? argv[idx + 1] : undefined;
  if (!state) {
    throw new Error(
      "[official-roster] usage: --state <USPS code>, e.g. --state AZ",
    );
  }
  return { state };
}

async function main(): Promise<void> {
  const db = requireDb();
  const { state } = parseArgs(process.argv.slice(2));
  const counts = await runOfficialRosterImport(db, state);
  console.log(
    `[official-roster] done state=${counts.state} upserted=${counts.rowsUpserted}`,
  );
}

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error("[official-roster] fatal:", err);
    process.exit(1);
  });
}
