import { describe, expect, it } from "vitest";
import {
  F03_REHEARSAL_JURISDICTIONS,
  f03CongressionalSourceInventory,
  validateF03CongressionalSourceInventory,
} from "../../scripts/congressional-rosters/f03-source-inventory";

describe("F03 official-source inventory rehearsal", () => {
  it("accepts the seven jurisdiction official-source rehearsal and keeps every availability state explicit", () => {
    const result = validateF03CongressionalSourceInventory(
      f03CongressionalSourceInventory,
    );

    expect(result.errors).toEqual([]);
    expect(result.coveredJurisdictions).toEqual(F03_REHEARSAL_JURISDICTIONS);
  });

  it("fails closed for a missing or out-of-scope rehearsal jurisdiction", () => {
    const missingAlabama = {
      ...f03CongressionalSourceInventory,
      records: f03CongressionalSourceInventory.records.filter(
        (record) => record.jurisdiction !== "AL",
      ),
    };
    const extraArizona = {
      ...f03CongressionalSourceInventory,
      records: [
        ...f03CongressionalSourceInventory.records,
        { ...f03CongressionalSourceInventory.records[0], jurisdiction: "AZ" },
      ],
    };

    expect(
      validateF03CongressionalSourceInventory(missingAlabama).errors,
    ).toContain("Missing F03 rehearsal inventory record for jurisdiction AL.");
    expect(
      validateF03CongressionalSourceInventory(extraArizona).errors,
    ).toContain("F03 rehearsal contains out-of-scope jurisdiction AZ.");
  });

  it("never lets a filing-list source establish qualified or certified availability", () => {
    const unsafeTexas = {
      ...f03CongressionalSourceInventory,
      records: f03CongressionalSourceInventory.records.map((record) =>
        record.jurisdiction === "TX"
          ? {
              ...record,
              evidence: {
                ...record.evidence,
                candidateAvailability: "qualified_or_certified" as const,
              },
            }
          : record,
      ),
    };

    expect(
      validateF03CongressionalSourceInventory(unsafeTexas).errors,
    ).toContain(
      "TX: filing_list_only evidence can never establish qualified_or_certified availability.",
    );
  });

  it("rejects filing-list-only evidence even when the source role claims a roster", () => {
    const unsafeTexas = {
      ...f03CongressionalSourceInventory,
      records: f03CongressionalSourceInventory.records.map((record) =>
        record.jurisdiction === "TX"
          ? {
              ...record,
              sourceRole: "qualified_or_certified_roster" as const,
              evidence: {
                ...record.evidence,
                candidateAvailability: "qualified_or_certified" as const,
              },
            }
          : record,
      ),
    };

    expect(
      validateF03CongressionalSourceInventory(unsafeTexas).errors,
    ).toContain(
      "TX: filing_list_only evidence can never establish qualified_or_certified availability.",
    );
  });

  it("requires challenge/error evidence to remain non-automatable and explicit", () => {
    const unsafeAlaska = {
      ...f03CongressionalSourceInventory,
      records: f03CongressionalSourceInventory.records.map((record) =>
        record.jurisdiction === "AK"
          ? { ...record, coverageState: "automatable" as const }
          : record,
      ),
    };
    const unknownObservation = {
      ...f03CongressionalSourceInventory,
      records: f03CongressionalSourceInventory.records.map((record) =>
        record.jurisdiction === "AK"
          ? {
              ...record,
              evidence: {
                ...record.evidence,
                sourceObservation: "unknown",
              },
            }
          : record,
      ),
    };

    expect(
      validateF03CongressionalSourceInventory(unsafeAlaska).errors,
    ).toContain(
      "AK: challenge_or_error evidence requires manual_official_import coverage.",
    );
    expect(
      validateF03CongressionalSourceInventory(unknownObservation).errors,
    ).toContain(
      "AK: evidence.sourceObservation is invalid; unknown is not allowed.",
    );
  });
});
