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

  it.each([
    ["a failed retrieval", { retrievalResult: "technical_failure" as const }],
    [
      "an unsuccessful configured-channel check",
      { successfulConfiguredChannelCheck: false },
    ],
  ])(
    "requires reproducible successful checks before claiming not published after %s",
    (_, evidencePatch) => {
      const unsafeLouisiana = {
        ...f03CongressionalSourceInventory,
        records: f03CongressionalSourceInventory.records.map((record) =>
          record.jurisdiction === "LA"
            ? {
                ...record,
                evidence: {
                  ...record.evidence,
                  ...evidencePatch,
                },
              }
            : record,
        ),
      };

      expect(
        validateF03CongressionalSourceInventory(unsafeLouisiana).errors,
      ).toContain(
        "LA: not_published evidence requires a successful configured-channel check.",
      );
    },
  );

  it("never lets a technical source failure become not published", () => {
    const unsafeLouisiana = {
      ...f03CongressionalSourceInventory,
      records: f03CongressionalSourceInventory.records.map((record) =>
        record.jurisdiction === "LA"
          ? {
              ...record,
              evidence: {
                ...record.evidence,
                retrievalResult: "technical_failure" as const,
              },
            }
          : record,
      ),
    };

    expect(
      validateF03CongressionalSourceInventory(unsafeLouisiana).errors,
    ).toContain(
      "LA: a technical source failure can never become not_published.",
    );
  });

  it.each([
    ["controlling artifact", "controllingArtifactRef", ""],
    ["owner", "manualOwner", ""],
    ["due date", "manualDueAt", ""],
    ["calendar trigger", "calendarTrigger", ""],
    ["non-filing replacement", "nonFilingReplacementArtifact", ""],
  ])(
    "fails closed when a manual or filing-only path lacks its %s",
    (_, field, value) => {
      const unsafeTexas = {
        ...f03CongressionalSourceInventory,
        records: f03CongressionalSourceInventory.records.map((record) =>
          record.jurisdiction === "TX"
            ? {
                ...record,
                evidence: {
                  ...record.evidence,
                  manualImport: {
                    ...record.evidence.manualImport,
                    [field]: value,
                  },
                },
              }
            : record,
        ),
      };

      expect(
        validateF03CongressionalSourceInventory(unsafeTexas).errors,
      ).toEqual(
        expect.arrayContaining([
          expect.stringContaining(`TX: manual import ${field} is required.`),
        ]),
      );
    },
  );

  it.each(["TX", "CA", "DC", "AK"] as const)(
    "fails closed when %s manual or filing-only coverage has no controls",
    (jurisdiction) => {
      const unsafeInventory = {
        ...f03CongressionalSourceInventory,
        records: f03CongressionalSourceInventory.records.map((record) =>
          record.jurisdiction === jurisdiction
            ? {
                ...record,
                evidence: { ...record.evidence, manualImport: undefined },
              }
            : record,
        ),
      };

      expect(
        validateF03CongressionalSourceInventory(unsafeInventory).errors,
      ).toContain(`${jurisdiction}: manual import controls are required.`);
    },
  );

  it("does not let unvalidated manual evidence become complete or promotable", () => {
    const unsafeTexas = {
      ...f03CongressionalSourceInventory,
      records: f03CongressionalSourceInventory.records.map((record) =>
        record.jurisdiction === "TX"
          ? {
              ...record,
              coverageState: "automatable" as const,
              evidence: {
                ...record.evidence,
                candidateAvailability: "qualified_or_certified" as const,
                manualImport: {
                  ...record.evidence.manualImport,
                  officialArtifactValidated: false,
                },
              },
            }
          : record,
      ),
    };

    expect(validateF03CongressionalSourceInventory(unsafeTexas).errors).toEqual(
      expect.arrayContaining([
        "TX: manual evidence cannot be complete or promotable until its official artifact validates.",
      ]),
    );
  });
});
