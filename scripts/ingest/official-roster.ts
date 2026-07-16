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
  CO_STATE,
  CO_ELECTION_YEAR,
  CO_STAGE,
  CO_HOUSE_SOURCE_URLS,
  CO_SENATE_SOURCE_URLS,
  CO_RETRIEVED_AT,
  CO_HOUSE_ROSTER_2026,
  CO_SENATE_ROSTER_2026,
} from "../congressional-rosters/co-official-roster-2026";
import {
  CT_STATE,
  CT_ELECTION_YEAR,
  CT_STAGE,
  CT_HOUSE_SOURCE_URLS,
  CT_RETRIEVED_AT,
  CT_HOUSE_ROSTER_2026,
} from "../congressional-rosters/ct-official-roster-2026";
import {
  CA_STATE,
  CA_ELECTION_YEAR,
  CA_STAGE,
  CA_HOUSE_SOURCE_URLS,
  CA_RETRIEVED_AT,
  CA_HOUSE_ROSTER_2026,
} from "../congressional-rosters/ca-official-roster-2026";
import {
  AR_STATE,
  AR_ELECTION_YEAR,
  AR_STAGE,
  AR_HOUSE_SOURCE_URLS,
  AR_SENATE_SOURCE_URLS,
  AR_RETRIEVED_AT,
  AR_HOUSE_ROSTER_2026,
  AR_SENATE_ROSTER_2026,
} from "../congressional-rosters/ar-official-roster-2026";
import {
  DE_STATE,
  DE_ELECTION_YEAR,
  DE_STAGE,
  DE_HOUSE_SOURCE_URLS,
  DE_SENATE_SOURCE_URLS,
  DE_RETRIEVED_AT,
  DE_HOUSE_ROSTER_2026,
  DE_SENATE_ROSTER_2026,
} from "../congressional-rosters/de-official-roster-2026";
import {
  FL_STATE,
  FL_ELECTION_YEAR,
  FL_STAGE,
  FL_HOUSE_SOURCE_URLS,
  FL_SENATE_SOURCE_URLS,
  FL_RETRIEVED_AT,
  FL_HOUSE_ROSTER_2026,
  FL_SENATE_ROSTER_2026,
} from "../congressional-rosters/fl-official-roster-2026";
import {
  HI_STATE,
  HI_ELECTION_YEAR,
  HI_STAGE,
  HI_HOUSE_SOURCE_URLS,
  HI_RETRIEVED_AT,
  HI_HOUSE_ROSTER_2026,
} from "../congressional-rosters/hi-official-roster-2026";
import {
  LA_STATE,
  LA_ELECTION_YEAR,
  LA_STAGE,
  LA_SENATE_SOURCE_URLS,
  LA_RETRIEVED_AT,
  LA_SENATE_ROSTER_2026,
} from "../congressional-rosters/la-official-roster-2026";
import {
  ME_STATE,
  ME_ELECTION_YEAR,
  ME_STAGE,
  ME_HOUSE_SOURCE_URLS,
  ME_SENATE_SOURCE_URLS,
  ME_RETRIEVED_AT,
  ME_HOUSE_ROSTER_2026,
  ME_SENATE_ROSTER_2026,
} from "../congressional-rosters/me-official-roster-2026";
import {
  IN_STATE,
  IN_ELECTION_YEAR,
  IN_STAGE,
  IN_HOUSE_SOURCE_URLS,
  IN_RETRIEVED_AT,
  IN_HOUSE_ROSTER_2026,
} from "../congressional-rosters/in-official-roster-2026";
import {
  GA_STATE,
  GA_ELECTION_YEAR,
  GA_STAGE,
  GA_HOUSE_SOURCE_URLS,
  GA_SENATE_SOURCE_URLS,
  GA_RETRIEVED_AT,
  GA_HOUSE_ROSTER_2026,
  GA_SENATE_ROSTER_2026,
} from "../congressional-rosters/ga-official-roster-2026";
import {
  IA_STATE,
  IA_ELECTION_YEAR,
  IA_STAGE,
  IA_HOUSE_SOURCE_URLS,
  IA_SENATE_SOURCE_URLS,
  IA_RETRIEVED_AT,
  IA_HOUSE_ROSTER_2026,
  IA_SENATE_ROSTER_2026,
} from "../congressional-rosters/ia-official-roster-2026";
import {
  KS_STATE,
  KS_ELECTION_YEAR,
  KS_STAGE,
  KS_HOUSE_SOURCE_URLS,
  KS_SENATE_SOURCE_URLS,
  KS_RETRIEVED_AT,
  KS_HOUSE_ROSTER_2026,
  KS_SENATE_ROSTER_2026,
} from "../congressional-rosters/ks-official-roster-2026";
import {
  ID_STATE,
  ID_ELECTION_YEAR,
  ID_STAGE,
  ID_HOUSE_SOURCE_URLS,
  ID_SENATE_SOURCE_URLS,
  ID_RETRIEVED_AT,
  ID_HOUSE_ROSTER_2026,
  ID_SENATE_ROSTER_2026,
} from "../congressional-rosters/id-official-roster-2026";
import {
  MD_STATE,
  MD_ELECTION_YEAR,
  MD_STAGE,
  MD_HOUSE_SOURCE_URLS,
  MD_RETRIEVED_AT,
  MD_HOUSE_ROSTER_2026,
} from "../congressional-rosters/md-official-roster-2026";
import {
  KY_STATE,
  KY_ELECTION_YEAR,
  KY_STAGE,
  KY_HOUSE_SOURCE_URLS,
  KY_SENATE_SOURCE_URLS,
  KY_RETRIEVED_AT,
  KY_HOUSE_ROSTER_2026,
  KY_SENATE_ROSTER_2026,
} from "../congressional-rosters/ky-official-roster-2026";
import {
  NE_STATE,
  NE_ELECTION_YEAR,
  NE_STAGE,
  NE_HOUSE_SOURCE_URLS,
  NE_SENATE_SOURCE_URLS,
  NE_RETRIEVED_AT,
  NE_HOUSE_ROSTER_2026,
  NE_SENATE_ROSTER_2026,
} from "../congressional-rosters/ne-official-roster-2026";
import {
  MO_STATE,
  MO_ELECTION_YEAR,
  MO_STAGE,
  MO_HOUSE_SOURCE_URLS,
  MO_RETRIEVED_AT,
  MO_HOUSE_ROSTER_2026,
} from "../congressional-rosters/mo-official-roster-2026";
import {
  MN_STATE,
  MN_ELECTION_YEAR,
  MN_STAGE,
  MN_HOUSE_SOURCE_URLS,
  MN_SENATE_SOURCE_URLS,
  MN_RETRIEVED_AT,
  MN_HOUSE_ROSTER_2026,
  MN_SENATE_ROSTER_2026,
} from "../congressional-rosters/mn-official-roster-2026";
import {
  IL_STATE,
  IL_ELECTION_YEAR,
  IL_STAGE,
  IL_HOUSE_SOURCE_URLS,
  IL_SENATE_SOURCE_URLS,
  IL_RETRIEVED_AT,
  IL_HOUSE_ROSTER_2026,
  IL_SENATE_ROSTER_2026,
} from "../congressional-rosters/il-official-roster-2026";
import {
  MT_STATE,
  MT_ELECTION_YEAR,
  MT_STAGE,
  MT_HOUSE_SOURCE_URLS,
  MT_SENATE_SOURCE_URLS,
  MT_RETRIEVED_AT,
  MT_HOUSE_ROSTER_2026,
  MT_SENATE_ROSTER_2026,
} from "../congressional-rosters/mt-official-roster-2026";
import {
  NJ_STATE,
  NJ_ELECTION_YEAR,
  NJ_STAGE,
  NJ_HOUSE_SOURCE_URLS,
  NJ_SENATE_SOURCE_URLS,
  NJ_RETRIEVED_AT,
  NJ_HOUSE_ROSTER_2026,
  NJ_SENATE_ROSTER_2026,
} from "../congressional-rosters/nj-official-roster-2026";
import {
  MS_STATE,
  MS_ELECTION_YEAR,
  MS_STAGE,
  MS_HOUSE_SOURCE_URLS,
  MS_SENATE_SOURCE_URLS,
  MS_RETRIEVED_AT,
  MS_HOUSE_ROSTER_2026,
  MS_SENATE_ROSTER_2026,
} from "../congressional-rosters/ms-official-roster-2026";

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
  CO: [
    {
      state: CO_STATE,
      office: "house",
      electionYear: CO_ELECTION_YEAR,
      stage: CO_STAGE,
      sourceUrl: CO_HOUSE_SOURCE_URLS[0],
      retrievedAt: CO_RETRIEVED_AT,
      entries: CO_HOUSE_ROSTER_2026,
    },
    {
      state: CO_STATE,
      office: "senate",
      electionYear: CO_ELECTION_YEAR,
      stage: CO_STAGE,
      sourceUrl: CO_SENATE_SOURCE_URLS[0],
      retrievedAt: CO_RETRIEVED_AT,
      entries: CO_SENATE_ROSTER_2026,
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
  CA: [
    {
      state: CA_STATE,
      office: "house",
      electionYear: CA_ELECTION_YEAR,
      stage: CA_STAGE,
      sourceUrl: CA_HOUSE_SOURCE_URLS[0],
      retrievedAt: CA_RETRIEVED_AT,
      entries: CA_HOUSE_ROSTER_2026,
    },
  ],
  AR: [
    {
      state: AR_STATE,
      office: "house",
      electionYear: AR_ELECTION_YEAR,
      stage: AR_STAGE,
      sourceUrl: AR_HOUSE_SOURCE_URLS[0],
      retrievedAt: AR_RETRIEVED_AT,
      entries: AR_HOUSE_ROSTER_2026,
    },
    {
      state: AR_STATE,
      office: "senate",
      electionYear: AR_ELECTION_YEAR,
      stage: AR_STAGE,
      sourceUrl: AR_SENATE_SOURCE_URLS[0],
      retrievedAt: AR_RETRIEVED_AT,
      entries: AR_SENATE_ROSTER_2026,
    },
  ],
  DE: [
    {
      state: DE_STATE,
      office: "house",
      electionYear: DE_ELECTION_YEAR,
      stage: DE_STAGE,
      sourceUrl: DE_HOUSE_SOURCE_URLS[0],
      retrievedAt: DE_RETRIEVED_AT,
      entries: DE_HOUSE_ROSTER_2026,
    },
    {
      state: DE_STATE,
      office: "senate",
      electionYear: DE_ELECTION_YEAR,
      stage: DE_STAGE,
      sourceUrl: DE_SENATE_SOURCE_URLS[0],
      retrievedAt: DE_RETRIEVED_AT,
      entries: DE_SENATE_ROSTER_2026,
    },
  ],
  FL: [
    {
      state: FL_STATE,
      office: "house",
      electionYear: FL_ELECTION_YEAR,
      stage: FL_STAGE,
      sourceUrl: FL_HOUSE_SOURCE_URLS[0],
      retrievedAt: FL_RETRIEVED_AT,
      entries: FL_HOUSE_ROSTER_2026,
    },
    {
      state: FL_STATE,
      office: "senate",
      electionYear: FL_ELECTION_YEAR,
      stage: FL_STAGE,
      sourceUrl: FL_SENATE_SOURCE_URLS[0],
      retrievedAt: FL_RETRIEVED_AT,
      entries: FL_SENATE_ROSTER_2026,
    },
  ],
  HI: [
    {
      state: HI_STATE,
      office: "house",
      electionYear: HI_ELECTION_YEAR,
      stage: HI_STAGE,
      sourceUrl: HI_HOUSE_SOURCE_URLS[0],
      retrievedAt: HI_RETRIEVED_AT,
      entries: HI_HOUSE_ROSTER_2026,
    },
  ],
  // House deliberately omitted — Louisiana's Nov 3, 2026 open-primary
  // qualifying period (Aug 5-7, 2026) had not opened at transcription time,
  // so zero House candidates exist to register. See
  // la-official-roster-2026.ts's docblock: races.ts's getOfficialRoster
  // falls through to the pre-existing FEC-derived path for any
  // state/office/district/year with no rows, so omitting House here is the
  // correct behavior, not a gap.
  LA: [
    {
      state: LA_STATE,
      office: "senate",
      electionYear: LA_ELECTION_YEAR,
      stage: LA_STAGE,
      sourceUrl: LA_SENATE_SOURCE_URLS[0],
      retrievedAt: LA_RETRIEVED_AT,
      entries: LA_SENATE_ROSTER_2026,
    },
  ],
  ME: [
    {
      state: ME_STATE,
      office: "house",
      electionYear: ME_ELECTION_YEAR,
      stage: ME_STAGE,
      sourceUrl: ME_HOUSE_SOURCE_URLS[0],
      retrievedAt: ME_RETRIEVED_AT,
      entries: ME_HOUSE_ROSTER_2026,
    },
    {
      state: ME_STATE,
      office: "senate",
      electionYear: ME_ELECTION_YEAR,
      stage: ME_STAGE,
      sourceUrl: ME_SENATE_SOURCE_URLS[0],
      retrievedAt: ME_RETRIEVED_AT,
      entries: ME_SENATE_ROSTER_2026,
    },
  ],
  IN: [
    {
      state: IN_STATE,
      office: "house",
      electionYear: IN_ELECTION_YEAR,
      stage: IN_STAGE,
      sourceUrl: IN_HOUSE_SOURCE_URLS[0],
      retrievedAt: IN_RETRIEVED_AT,
      entries: IN_HOUSE_ROSTER_2026,
    },
  ],
  GA: [
    {
      state: GA_STATE,
      office: "house",
      electionYear: GA_ELECTION_YEAR,
      stage: GA_STAGE,
      sourceUrl: GA_HOUSE_SOURCE_URLS[0],
      retrievedAt: GA_RETRIEVED_AT,
      entries: GA_HOUSE_ROSTER_2026,
    },
    {
      state: GA_STATE,
      office: "senate",
      electionYear: GA_ELECTION_YEAR,
      stage: GA_STAGE,
      sourceUrl: GA_SENATE_SOURCE_URLS[0],
      retrievedAt: GA_RETRIEVED_AT,
      entries: GA_SENATE_ROSTER_2026,
    },
  ],
  IA: [
    {
      state: IA_STATE,
      office: "house",
      electionYear: IA_ELECTION_YEAR,
      stage: IA_STAGE,
      sourceUrl: IA_HOUSE_SOURCE_URLS[0],
      retrievedAt: IA_RETRIEVED_AT,
      entries: IA_HOUSE_ROSTER_2026,
    },
    {
      state: IA_STATE,
      office: "senate",
      electionYear: IA_ELECTION_YEAR,
      stage: IA_STAGE,
      sourceUrl: IA_SENATE_SOURCE_URLS[0],
      retrievedAt: IA_RETRIEVED_AT,
      entries: IA_SENATE_ROSTER_2026,
    },
  ],
  KS: [
    {
      state: KS_STATE,
      office: "house",
      electionYear: KS_ELECTION_YEAR,
      stage: KS_STAGE,
      sourceUrl: KS_HOUSE_SOURCE_URLS[0],
      retrievedAt: KS_RETRIEVED_AT,
      entries: KS_HOUSE_ROSTER_2026,
    },
    {
      state: KS_STATE,
      office: "senate",
      electionYear: KS_ELECTION_YEAR,
      stage: KS_STAGE,
      sourceUrl: KS_SENATE_SOURCE_URLS[0],
      retrievedAt: KS_RETRIEVED_AT,
      entries: KS_SENATE_ROSTER_2026,
    },
  ],
  ID: [
    {
      state: ID_STATE,
      office: "house",
      electionYear: ID_ELECTION_YEAR,
      stage: ID_STAGE,
      sourceUrl: ID_HOUSE_SOURCE_URLS[0],
      retrievedAt: ID_RETRIEVED_AT,
      entries: ID_HOUSE_ROSTER_2026,
    },
    {
      state: ID_STATE,
      office: "senate",
      electionYear: ID_ELECTION_YEAR,
      stage: ID_STAGE,
      sourceUrl: ID_SENATE_SOURCE_URLS[0],
      retrievedAt: ID_RETRIEVED_AT,
      entries: ID_SENATE_ROSTER_2026,
    },
  ],
  MD: [
    {
      state: MD_STATE,
      office: "house",
      electionYear: MD_ELECTION_YEAR,
      stage: MD_STAGE,
      sourceUrl: MD_HOUSE_SOURCE_URLS[0],
      retrievedAt: MD_RETRIEVED_AT,
      entries: MD_HOUSE_ROSTER_2026,
    },
  ],
  KY: [
    {
      state: KY_STATE,
      office: "house",
      electionYear: KY_ELECTION_YEAR,
      stage: KY_STAGE,
      sourceUrl: KY_HOUSE_SOURCE_URLS[0],
      retrievedAt: KY_RETRIEVED_AT,
      entries: KY_HOUSE_ROSTER_2026,
    },
    {
      state: KY_STATE,
      office: "senate",
      electionYear: KY_ELECTION_YEAR,
      stage: KY_STAGE,
      sourceUrl: KY_SENATE_SOURCE_URLS[0],
      retrievedAt: KY_RETRIEVED_AT,
      entries: KY_SENATE_ROSTER_2026,
    },
  ],
  NE: [
    {
      state: NE_STATE,
      office: "house",
      electionYear: NE_ELECTION_YEAR,
      stage: NE_STAGE,
      sourceUrl: NE_HOUSE_SOURCE_URLS[0],
      retrievedAt: NE_RETRIEVED_AT,
      entries: NE_HOUSE_ROSTER_2026,
    },
    {
      state: NE_STATE,
      office: "senate",
      electionYear: NE_ELECTION_YEAR,
      stage: NE_STAGE,
      sourceUrl: NE_SENATE_SOURCE_URLS[0],
      retrievedAt: NE_RETRIEVED_AT,
      entries: NE_SENATE_ROSTER_2026,
    },
  ],
  // No Senate row — Missouri has no 2026 US Senate contest (Hawley's Class 1
  // seat runs to 2031, Schmitt's Class 3 seat to 2029).
  MO: [
    {
      state: MO_STATE,
      office: "house",
      electionYear: MO_ELECTION_YEAR,
      stage: MO_STAGE,
      sourceUrl: MO_HOUSE_SOURCE_URLS[0],
      retrievedAt: MO_RETRIEVED_AT,
      entries: MO_HOUSE_ROSTER_2026,
    },
  ],
  MN: [
    {
      state: MN_STATE,
      office: "house",
      electionYear: MN_ELECTION_YEAR,
      stage: MN_STAGE,
      sourceUrl: MN_HOUSE_SOURCE_URLS[0],
      retrievedAt: MN_RETRIEVED_AT,
      entries: MN_HOUSE_ROSTER_2026,
    },
    {
      state: MN_STATE,
      office: "senate",
      electionYear: MN_ELECTION_YEAR,
      stage: MN_STAGE,
      sourceUrl: MN_SENATE_SOURCE_URLS[0],
      retrievedAt: MN_RETRIEVED_AT,
      entries: MN_SENATE_ROSTER_2026,
    },
  ],
  IL: [
    {
      state: IL_STATE,
      office: "house",
      electionYear: IL_ELECTION_YEAR,
      stage: IL_STAGE,
      sourceUrl: IL_HOUSE_SOURCE_URLS[0],
      retrievedAt: IL_RETRIEVED_AT,
      entries: IL_HOUSE_ROSTER_2026,
    },
    {
      state: IL_STATE,
      office: "senate",
      electionYear: IL_ELECTION_YEAR,
      stage: IL_STAGE,
      sourceUrl: IL_SENATE_SOURCE_URLS[0],
      retrievedAt: IL_RETRIEVED_AT,
      entries: IL_SENATE_ROSTER_2026,
    },
  ],
  MT: [
    {
      state: MT_STATE,
      office: "house",
      electionYear: MT_ELECTION_YEAR,
      stage: MT_STAGE,
      sourceUrl: MT_HOUSE_SOURCE_URLS[0],
      retrievedAt: MT_RETRIEVED_AT,
      entries: MT_HOUSE_ROSTER_2026,
    },
    {
      state: MT_STATE,
      office: "senate",
      electionYear: MT_ELECTION_YEAR,
      stage: MT_STAGE,
      sourceUrl: MT_SENATE_SOURCE_URLS[0],
      retrievedAt: MT_RETRIEVED_AT,
      entries: MT_SENATE_ROSTER_2026,
    },
  ],
  NJ: [
    {
      state: NJ_STATE,
      office: "house",
      electionYear: NJ_ELECTION_YEAR,
      stage: NJ_STAGE,
      sourceUrl: NJ_HOUSE_SOURCE_URLS[0],
      retrievedAt: NJ_RETRIEVED_AT,
      entries: NJ_HOUSE_ROSTER_2026,
    },
    {
      state: NJ_STATE,
      office: "senate",
      electionYear: NJ_ELECTION_YEAR,
      stage: NJ_STAGE,
      sourceUrl: NJ_SENATE_SOURCE_URLS[0],
      retrievedAt: NJ_RETRIEVED_AT,
      entries: NJ_SENATE_ROSTER_2026,
    },
  ],
  MS: [
    {
      state: MS_STATE,
      office: "house",
      electionYear: MS_ELECTION_YEAR,
      stage: MS_STAGE,
      sourceUrl: MS_HOUSE_SOURCE_URLS[0],
      retrievedAt: MS_RETRIEVED_AT,
      entries: MS_HOUSE_ROSTER_2026,
    },
    {
      state: MS_STATE,
      office: "senate",
      electionYear: MS_ELECTION_YEAR,
      stage: MS_STAGE,
      sourceUrl: MS_SENATE_SOURCE_URLS[0],
      retrievedAt: MS_RETRIEVED_AT,
      entries: MS_SENATE_ROSTER_2026,
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
