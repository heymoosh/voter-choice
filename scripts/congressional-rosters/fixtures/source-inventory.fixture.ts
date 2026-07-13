import {
  CONGRESSIONAL_JURISDICTIONS,
  type CongressionalSourceInventory,
  type CongressionalSourceInventoryRecord,
} from "../../../src/lib/congressional-source-inventory";

const coverageByJurisdiction = {
  AK: "manual_official_import",
  AL: "automatable",
  AS: "official_roster_not_yet_published",
  GU: "blocked",
} as const;

function fixtureRecord(
  jurisdiction: (typeof CONGRESSIONAL_JURISDICTIONS)[number],
): CongressionalSourceInventoryRecord {
  return {
    schemaVersion: 1,
    sourceId: `fixture-${jurisdiction.toLowerCase()}-2026`,
    jurisdiction,
    authority: {
      name: `${jurisdiction} election authority`,
      role:
        jurisdiction === "DC"
          ? "district_election_authority"
          : jurisdiction === "AS" ||
              jurisdiction === "GU" ||
              jurisdiction === "MP" ||
              jurisdiction === "PR" ||
              jurisdiction === "VI"
            ? "territorial_election_authority"
            : "state_election_authority",
      url: `https://${jurisdiction.toLowerCase()}.elections.example/`,
    },
    officialLandingPage: `https://${jurisdiction.toLowerCase()}.elections.example/candidates`,
    calendarSource: `https://${jurisdiction.toLowerCase()}.elections.example/calendar`,
    candidatePublicationSource: `https://${jurisdiction.toLowerCase()}.elections.example/candidates`,
    sourceRole: "qualified_or_certified_roster",
    contestScope: {
      offices: ["house"],
      electionDates: ["2026-11-03"],
      stages: ["general"],
    },
    sourceFormat: "html",
    parserFamily: "html_table",
    updateCadence: "weekly",
    activeWindow: "2026-01-01/2026-12-31",
    accessConstraints: [],
    fallbackManualImportProcedure:
      "Download the published official artifact and submit it for the normal review path.",
    lastVerifiedAt: "2026-07-13T00:00:00.000Z",
    reviewedBy: "fixture-reviewer",
    coverageState:
      coverageByJurisdiction[
        jurisdiction as keyof typeof coverageByJurisdiction
      ] ?? "automatable",
    discoverySources: [
      {
        provider: "fec_state_election_office_directory",
        role: "discovery_only",
        url: "https://www.fec.gov/introduction-campaign-finance/how-to-research-public-records/state-election-offices/",
      },
    ],
  };
}

export const fixtureCongressionalSourceInventory: CongressionalSourceInventory =
  {
    schemaVersion: 1,
    cycle: 2026,
    records: CONGRESSIONAL_JURISDICTIONS.map(fixtureRecord),
  };
