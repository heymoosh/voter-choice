/**
 * civic-logistics.test.ts
 *
 * Tests for toBallotLogistics():
 *   (a) Full civic response → populated logistics (polling place, district, early voting)
 *   (b) Empty civic response → honest vote.gov fallback, no fabricated place
 *   (c) NJ values from the oracle (Audubon / Camden County / NJ-01)
 */

import { describe, it, expect } from "vitest";
import {
  toBallotLogistics,
  type CivicApiInput,
  type StateDataInput,
} from "./civic-logistics";
import { NJ_GROUND_TRUTH } from "./oracle/nj-ground-truth";

// ---------------------------------------------------------------------------
// (a) Full civic response — all fields populated
// ---------------------------------------------------------------------------

describe("toBallotLogistics – full civic response", () => {
  const fullCivic: CivicApiInput = {
    pollingLocations: [
      {
        name: "Audubon Borough Hall",
        address: "31 West Merchant Street, Audubon, NJ 08106",
        hours: "6:00 AM – 8:00 PM",
        notes: "",
      },
    ],
    earlyVoteSites: [
      {
        name: "Camden County EV Center",
        address: "520 Market Street, Camden, NJ 08102",
        hours: "2026-05-26 – 2026-05-31: 10:00 AM – 8:00 PM",
        notes: "",
      },
    ],
    contests: [
      {
        office: "U.S. House of Representatives",
        district: "NJ-01",
        type: "General",
        candidates: [{ name: "Donald Norcross", party: "Democratic" }],
      },
    ],
    electionName: "2026 NJ Primary",
    county: "Camden County, NJ",
  };

  it("extracts polling place from first pollingLocations entry", () => {
    const result = toBallotLogistics(fullCivic);
    expect(result.pollingPlace).not.toBeNull();
    expect(result.pollingPlace!.name).toBe("Audubon Borough Hall");
    expect(result.pollingPlace!.address).toBe(
      "31 West Merchant Street, Audubon, NJ 08106",
    );
    expect(result.pollingPlace!.hours).toBe("6:00 AM – 8:00 PM");
  });

  it("extracts congressional district from House contest", () => {
    const result = toBallotLogistics(fullCivic);
    expect(result.congressionalDistrict).toBe("NJ-01");
  });

  it("extracts early voting window from earlyVoteSites with date range in hours", () => {
    const result = toBallotLogistics(fullCivic);
    expect(result.earlyVoting).not.toBeNull();
    expect(result.earlyVoting!.start).toBe("2026-05-26");
    expect(result.earlyVoting!.end).toBe("2026-05-31");
    expect(result.earlyVoting!.location).toBe("Camden County EV Center");
  });

  it("sets source to civic when pollingPlace is present", () => {
    const result = toBallotLogistics(fullCivic);
    expect(result.source).toBe("civic");
  });

  it("always includes vote.gov fallback URL", () => {
    const result = toBallotLogistics(fullCivic);
    expect(result.fallbackUrl).toBe("https://vote.gov/");
  });

  it("parses numeric-only district name with state hint from county", () => {
    const civic: CivicApiInput = {
      ...fullCivic,
      contests: [
        {
          office: "U.S. House of Representatives",
          district: "1st Congressional District",
          type: "General",
          candidates: [{ name: "Donald Norcross", party: "Democratic" }],
        },
      ],
      county: "Camden County, NJ",
    };
    const result = toBallotLogistics(civic);
    expect(result.congressionalDistrict).toBe("NJ-01");
  });
});

// ---------------------------------------------------------------------------
// (b) Empty civic response — honest fallback, no fabricated data
// ---------------------------------------------------------------------------

describe("toBallotLogistics – empty civic response", () => {
  const emptyCivic: CivicApiInput = {};

  it("returns null pollingPlace (never fabricates a location)", () => {
    const result = toBallotLogistics(emptyCivic);
    expect(result.pollingPlace).toBeNull();
  });

  it("returns null congressionalDistrict (no contests to infer from)", () => {
    const result = toBallotLogistics(emptyCivic);
    expect(result.congressionalDistrict).toBeNull();
  });

  it("returns null earlyVoting when no stateData provided", () => {
    const result = toBallotLogistics(emptyCivic);
    expect(result.earlyVoting).toBeNull();
  });

  it("falls back to stateData earlyVoting when provided", () => {
    const stateData: StateDataInput = {
      earlyVoting: {
        available: true,
        startDate: "2026-05-26",
        endDate: "2026-05-31",
      },
    };
    const result = toBallotLogistics(emptyCivic, stateData);
    expect(result.earlyVoting).not.toBeNull();
    expect(result.earlyVoting!.start).toBe("2026-05-26");
    expect(result.earlyVoting!.end).toBe("2026-05-31");
    expect(result.earlyVoting!.location).toBeUndefined();
  });

  it("sets source to fallback when no pollingPlace or earlyVoting from civic", () => {
    const result = toBallotLogistics(emptyCivic);
    expect(result.source).toBe("fallback");
  });

  it("sets source to state when no civic pollingPlace but stateData earlyVoting present", () => {
    const stateData: StateDataInput = {
      earlyVoting: {
        available: true,
        startDate: "2026-05-26",
        endDate: "2026-05-31",
      },
    };
    const result = toBallotLogistics(emptyCivic, stateData);
    expect(result.source).toBe("state");
  });

  it("always includes vote.gov fallback URL even when empty", () => {
    const result = toBallotLogistics(emptyCivic);
    expect(result.fallbackUrl).toBe("https://vote.gov/");
  });

  it("does NOT include any NJ_GROUND_TRUTH.forbiddenForNj strings", () => {
    const result = toBallotLogistics(emptyCivic);
    const serialized = JSON.stringify(result);
    for (const forbidden of NJ_GROUND_TRUTH.forbiddenForNj) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("does NOT include any forbiddenForNj strings when stateData is also empty", () => {
    const stateData: StateDataInput = {
      earlyVoting: { available: false, startDate: null, endDate: null },
    };
    const result = toBallotLogistics(emptyCivic, stateData);
    const serialized = JSON.stringify(result);
    for (const forbidden of NJ_GROUND_TRUTH.forbiddenForNj) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});

// ---------------------------------------------------------------------------
// (c) NJ oracle values — Audubon Borough, Camden County, NJ-01
// ---------------------------------------------------------------------------

describe("toBallotLogistics – NJ oracle values", () => {
  // Simulate the NO-CONTEST case (primary has passed → civic returns no contests)
  // This is the realistic NJ Phase B drive scenario.
  const njNoContestCivic: CivicApiInput = {
    pollingLocations: [],
    earlyVoteSites: [],
    contests: undefined,
    electionName: "2026 NJ Primary",
    county: "Camden County",
  };

  const njOracle = NJ_GROUND_TRUTH.logistics;

  it("returns null district in no-contest scenario (honest, not fabricated)", () => {
    const result = toBallotLogistics(njNoContestCivic);
    // District should be null — Phase B wires it from the ballot extraction
    expect(result.congressionalDistrict).toBeNull();
  });

  it("earlyVoting from stateData matches oracle earlyVotingPrimary dates", () => {
    const stateData: StateDataInput = {
      earlyVoting: {
        available: true,
        startDate: njOracle.earlyVotingPrimary.start,
        endDate: njOracle.earlyVotingPrimary.end,
      },
    };
    const result = toBallotLogistics(njNoContestCivic, stateData);
    expect(result.earlyVoting).not.toBeNull();
    expect(result.earlyVoting!.start).toBe(njOracle.earlyVotingPrimary.start);
    expect(result.earlyVoting!.end).toBe(njOracle.earlyVotingPrimary.end);
  });

  it("when civic DOES return a House contest, district matches NJ-01", () => {
    const njWithContest: CivicApiInput = {
      ...njNoContestCivic,
      contests: [
        {
          office: "U.S. House of Representatives",
          district: njOracle.congressionalDistrict, // "NJ-01"
          type: "Primary",
          candidates: [{ name: "Donald Norcross", party: "Democratic" }],
        },
      ],
    };
    const result = toBallotLogistics(njWithContest);
    expect(result.congressionalDistrict).toBe(njOracle.congressionalDistrict);
  });

  it("when civic returns a polling place with NJ hours, hours match oracle", () => {
    const njWithPollingPlace: CivicApiInput = {
      ...njNoContestCivic,
      pollingLocations: [
        {
          name: "Audubon Borough Hall",
          address: "31 West Merchant Street, Audubon, NJ 08106",
          hours: njOracle.pollingHoursPlain, // "6:00 AM – 8:00 PM"
          notes: "",
        },
      ],
    };
    const result = toBallotLogistics(njWithPollingPlace);
    expect(result.pollingPlace).not.toBeNull();
    expect(result.pollingPlace!.hours).toBe(njOracle.pollingHoursPlain);
  });

  it("no forbiddenForNj strings in NJ no-contest logistics output", () => {
    const result = toBallotLogistics(njNoContestCivic);
    const serialized = JSON.stringify(result);
    for (const forbidden of NJ_GROUND_TRUTH.forbiddenForNj) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
