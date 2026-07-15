import { describe, expect, it } from "vitest";
import {
  I11_JURISDICTIONS,
  i11CongressionalSourceInventory,
  validateI11CongressionalSourceInventory,
} from "../../scripts/congressional-rosters/i11-source-inventory";

describe("I11 official-source inventory: WV, WI, WY, AS, GU, MP, VI", () => {
  it("accepts the seven-jurisdiction inventory with zero errors and no silent omission", () => {
    const result = validateI11CongressionalSourceInventory(
      i11CongressionalSourceInventory,
    );

    expect(result.errors).toEqual([]);
    expect(result.coveredJurisdictions).toEqual(I11_JURISDICTIONS);
  });

  it("rejects a group-scoped inventory missing one of the seven jurisdictions", () => {
    const missingAmericanSamoa = {
      ...i11CongressionalSourceInventory,
      records: i11CongressionalSourceInventory.records.filter(
        (record) => record.jurisdiction !== "AS",
      ),
    };

    expect(
      validateI11CongressionalSourceInventory(missingAmericanSamoa).errors,
    ).toContain("Missing I11 inventory record for jurisdiction AS.");
  });

  it("rejects a record naming a jurisdiction outside this group", () => {
    const outOfScope = {
      ...i11CongressionalSourceInventory,
      records: i11CongressionalSourceInventory.records.map((record) =>
        record.jurisdiction === "WV"
          ? { ...record, jurisdiction: "TX" }
          : record,
      ),
    };

    expect(validateI11CongressionalSourceInventory(outOfScope).errors).toEqual(
      expect.arrayContaining([
        "I11 inventory contains out-of-scope jurisdiction TX.",
        "Missing I11 inventory record for jurisdiction WV.",
      ]),
    );
  });

  it("rejects FEC discovery pages as the roster authority", () => {
    const fecAuthority = {
      ...i11CongressionalSourceInventory,
      records: i11CongressionalSourceInventory.records.map((record) =>
        record.jurisdiction === "WI"
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
      validateI11CongressionalSourceInventory(fecAuthority).errors,
    ).toContain(
      "WI: authority.role must name the responsible state, district, or territorial election authority; FEC is discovery-only.",
    );
  });

  it("rejects incomplete evidence metadata", () => {
    const missingEvidenceSummary = {
      ...i11CongressionalSourceInventory,
      records: i11CongressionalSourceInventory.records.map((record) =>
        record.jurisdiction === "WY"
          ? { ...record, evidence: { ...record.evidence, evidenceSummary: "" } }
          : record,
      ),
    };

    expect(
      validateI11CongressionalSourceInventory(missingEvidenceSummary).errors,
    ).toContain("WY: evidence.evidenceSummary is required.");
  });

  it("rejects an unexplained coverage state: access_blocked evidence must keep blocked coverage and availability", () => {
    const silentlyReclassifiedBlock = {
      ...i11CongressionalSourceInventory,
      records: i11CongressionalSourceInventory.records.map((record) =>
        record.jurisdiction === "MP"
          ? {
              ...record,
              evidence: {
                ...record.evidence,
                sourceObservation: "access_blocked" as const,
              },
            }
          : record,
      ),
    };

    expect(
      validateI11CongressionalSourceInventory(silentlyReclassifiedBlock).errors,
    ).toContain(
      "MP: access_blocked evidence requires blocked coverage and blocked availability.",
    );
  });

  it("every expected 2026 contest for these seven jurisdictions maps to an exact official-source path or an evidenced explicit state", () => {
    const result = validateI11CongressionalSourceInventory(
      i11CongressionalSourceInventory,
    );
    expect(result.errors).toEqual([]);

    for (const jurisdiction of I11_JURISDICTIONS) {
      const record = i11CongressionalSourceInventory.records.find(
        (candidate) => candidate.jurisdiction === jurisdiction,
      );
      expect(record).toBeDefined();
      expect(record!.contestScope.offices.length).toBeGreaterThan(0);
      expect(record!.contestScope.electionDates.length).toBeGreaterThan(0);
      expect([
        "automatable",
        "manual_official_import",
        "official_roster_not_yet_published",
        "blocked",
      ]).toContain(record!.coverageState);
      expect(record!.evidence.evidenceSummary.length).toBeGreaterThan(0);
      expect(record!.evidence.evidenceUrl).toMatch(/^https:\/\//);
    }
  });

  it("retains every valid I11 record with zero semantic-combination errors", () => {
    const result = validateI11CongressionalSourceInventory(
      i11CongressionalSourceInventory,
    );
    expect(result.errors).toEqual([]);
    expect(result.coverageStates).toEqual(
      expect.arrayContaining([
        "automatable",
        "manual_official_import",
        "official_roster_not_yet_published",
      ]),
    );
  });

  it("captures territorial delegate contests explicitly for AS, GU, MP, and VI", () => {
    for (const jurisdiction of ["AS", "GU", "MP", "VI"] as const) {
      const record = i11CongressionalSourceInventory.records.find(
        (candidate) => candidate.jurisdiction === jurisdiction,
      );
      expect(record).toBeDefined();
      expect(record!.contestScope.offices).toContain("delegate");
    }
  });
});
