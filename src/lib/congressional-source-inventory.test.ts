import { describe, expect, it } from "vitest";
import {
  CONGRESSIONAL_JURISDICTIONS,
  validateCongressionalSourceInventory,
} from "./congressional-source-inventory";
import { fixtureCongressionalSourceInventory } from "../../scripts/congressional-rosters/fixtures/source-inventory.fixture";

describe("congressional source inventory contract", () => {
  it("accepts the versioned fixture inventory with every jurisdiction and coverage state", () => {
    const result = validateCongressionalSourceInventory(
      fixtureCongressionalSourceInventory,
    );

    expect(result.errors).toEqual([]);
    expect(result.coveredJurisdictions).toEqual(CONGRESSIONAL_JURISDICTIONS);
    expect(result.coverageStates).toEqual([
      "automatable",
      "blocked",
      "manual_official_import",
      "official_roster_not_yet_published",
    ]);
  });

  it("fails closed for a missing or unknown jurisdiction", () => {
    const missingAlabama = {
      ...fixtureCongressionalSourceInventory,
      records: fixtureCongressionalSourceInventory.records.filter(
        (record) => record.jurisdiction !== "AL",
      ),
    };
    const unknownJurisdiction = {
      ...fixtureCongressionalSourceInventory,
      records: fixtureCongressionalSourceInventory.records.map((record) =>
        record.jurisdiction === "AL"
          ? { ...record, jurisdiction: "XX" }
          : record,
      ),
    };

    expect(
      validateCongressionalSourceInventory(missingAlabama).errors,
    ).toContain("Missing inventory record for jurisdiction AL.");
    expect(
      validateCongressionalSourceInventory(unknownJurisdiction).errors,
    ).toEqual(
      expect.arrayContaining([
        "Unknown congressional jurisdiction XX.",
        "Missing inventory record for jurisdiction AL.",
      ]),
    );
  });

  it("rejects FEC discovery pages as the roster authority", () => {
    const fecAuthority = {
      ...fixtureCongressionalSourceInventory,
      records: fixtureCongressionalSourceInventory.records.map((record) =>
        record.jurisdiction === "AL"
          ? {
              ...record,
              authority: {
                name: "FEC state-election-office directory",
                role: "fec_discovery_directory" as const,
                url: "https://www.fec.gov/introduction-campaign-finance/how-to-research-public-records/state-election-offices/",
              },
            }
          : record,
      ),
    };

    expect(validateCongressionalSourceInventory(fecAuthority).errors).toContain(
      "AL: authority.role must name the responsible state, district, or territorial election authority; FEC is discovery-only.",
    );
  });
});
