import { describe, expect, it } from "vitest";
import {
  I06_JURISDICTIONS,
  i06CongressionalSourceInventory,
  validateI06CongressionalSourceInventory,
} from "../../scripts/congressional-rosters/i06-source-inventory";

describe("I06 official-source inventory: HI, ID, IL, IN, IA, KS, KY", () => {
  it("accepts the seven-jurisdiction inventory with zero errors and no silent omission", () => {
    const result = validateI06CongressionalSourceInventory(
      i06CongressionalSourceInventory,
    );

    expect(result.errors).toEqual([]);
    expect(result.coveredJurisdictions).toEqual(I06_JURISDICTIONS);
  });

  it("rejects a group-scoped inventory missing one of the seven jurisdictions", () => {
    const missingIllinois = {
      ...i06CongressionalSourceInventory,
      records: i06CongressionalSourceInventory.records.filter(
        (record) => record.jurisdiction !== "IL",
      ),
    };

    expect(
      validateI06CongressionalSourceInventory(missingIllinois).errors,
    ).toContain("Missing I06 inventory record for jurisdiction IL.");
  });

  it("rejects a record naming a jurisdiction outside this group", () => {
    const outOfScope = {
      ...i06CongressionalSourceInventory,
      records: i06CongressionalSourceInventory.records.map((record) =>
        record.jurisdiction === "HI"
          ? { ...record, jurisdiction: "TX" }
          : record,
      ),
    };

    expect(validateI06CongressionalSourceInventory(outOfScope).errors).toEqual(
      expect.arrayContaining([
        "I06 inventory contains out-of-scope jurisdiction TX.",
        "Missing I06 inventory record for jurisdiction HI.",
      ]),
    );
  });

  it("rejects FEC discovery pages as the roster authority", () => {
    const fecAuthority = {
      ...i06CongressionalSourceInventory,
      records: i06CongressionalSourceInventory.records.map((record) =>
        record.jurisdiction === "IN"
          ? {
              ...record,
              authority: {
                name: "FEC state-election-office directory",
                role: "fec_discovery_directory",
                url: "https://www.fec.gov/introduction-campaign-finance/how-to-research-public-records/state-election-offices/",
              },
            }
          : record,
      ),
    };

    expect(
      validateI06CongressionalSourceInventory(fecAuthority).errors,
    ).toContain(
      "IN: authority.role must name the responsible state, district, or territorial election authority; FEC is discovery-only.",
    );
  });

  it("rejects incomplete evidence metadata", () => {
    const missingEvidenceSummary = {
      ...i06CongressionalSourceInventory,
      records: i06CongressionalSourceInventory.records.map((record) =>
        record.jurisdiction === "KS"
          ? { ...record, evidence: { ...record.evidence, evidenceSummary: "" } }
          : record,
      ),
    };

    expect(
      validateI06CongressionalSourceInventory(missingEvidenceSummary).errors,
    ).toContain("KS: evidence.evidenceSummary is required.");
  });

  it("rejects an unexplained coverage state: blocked evidence must keep blocked coverage and availability", () => {
    const silentlyPromotedBlock = {
      ...i06CongressionalSourceInventory,
      records: i06CongressionalSourceInventory.records.map((record) =>
        record.jurisdiction === "IL"
          ? { ...record, coverageState: "manual_official_import" as const }
          : record,
      ),
    };

    expect(
      validateI06CongressionalSourceInventory(silentlyPromotedBlock).errors,
    ).toContain(
      "IL: access_blocked evidence requires blocked coverage and blocked availability.",
    );
  });

  it("every expected 2026 contest for these seven states maps to an exact official-source path or an evidenced explicit state", () => {
    const result = validateI06CongressionalSourceInventory(
      i06CongressionalSourceInventory,
    );
    expect(result.errors).toEqual([]);

    for (const jurisdiction of I06_JURISDICTIONS) {
      const record = i06CongressionalSourceInventory.records.find(
        (candidate) => candidate.jurisdiction === jurisdiction,
      );
      expect(record).toBeDefined();
      expect(record!.contestScope.offices.length).toBeGreaterThan(0);
      expect(record!.contestScope.electionDates.length).toBeGreaterThan(0);
      expect(["automatable", "manual_official_import", "blocked"]).toContain(
        record!.coverageState,
      );
      expect(record!.evidence.evidenceSummary.length).toBeGreaterThan(0);
      expect(record!.evidence.evidenceUrl).toMatch(/^https:\/\//);
    }
  });

  it("retains every valid I06 record with zero semantic-combination errors", () => {
    const result = validateI06CongressionalSourceInventory(
      i06CongressionalSourceInventory,
    );
    expect(result.errors).toEqual([]);
    expect(result.coverageStates).toEqual(
      expect.arrayContaining([
        "automatable",
        "blocked",
        "manual_official_import",
      ]),
    );
  });
});
