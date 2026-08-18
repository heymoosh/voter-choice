/**
 * src/app/api/delegation/route.test.ts
 *
 * Tests for POST /api/delegation. Geocoder, resolver, and rate limit are
 * mocked.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("../../../lib/server/race-data-rate-limit", () => ({
  checkRaceDataRateLimit: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../../lib/server/census-geocode", () => ({
  geocodeAddressToDistrict: vi.fn(),
}));

vi.mock("../../../lib/server/delegation", () => ({
  resolveDelegation: vi.fn(),
}));

vi.mock("../../../lib/server/can-context", () => ({
  lookupCanSeatContext: vi.fn(),
}));

vi.mock("../../../lib/server/pac-sponsors", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../lib/server/pac-sponsors")
  >()),
  lookupPacSponsors: vi.fn(),
}));

vi.mock("../../../lib/server/outside-spending", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../lib/server/outside-spending")
  >()),
  lookupOutsideSpending: vi.fn(),
}));

vi.mock("../../../lib/server/races", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/server/races")>()),
  lookupChallengers: vi.fn(),
}));

vi.mock("../../../lib/server/promises", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/server/promises")>()),
  lookupCandidateTopIssues: vi.fn(),
}));

import { checkRaceDataRateLimit } from "../../../lib/server/race-data-rate-limit";
import { geocodeAddressToDistrict } from "../../../lib/server/census-geocode";
import { resolveDelegation } from "../../../lib/server/delegation";
import { lookupCanSeatContext } from "../../../lib/server/can-context";
import { lookupPacSponsors } from "../../../lib/server/pac-sponsors";
import { lookupOutsideSpending } from "../../../lib/server/outside-spending";
import { lookupChallengers } from "../../../lib/server/races";
import { lookupCandidateTopIssues } from "../../../lib/server/promises";
import { POST } from "./route";

const mockedRateLimit = vi.mocked(checkRaceDataRateLimit);
const mockedGeocode = vi.mocked(geocodeAddressToDistrict);
const mockedResolve = vi.mocked(resolveDelegation);
const mockedCanContext = vi.mocked(lookupCanSeatContext);
const mockedPacSponsors = vi.mocked(lookupPacSponsors);
const mockedOutsideSpending = vi.mocked(lookupOutsideSpending);
const mockedChallengers = vi.mocked(lookupChallengers);
const mockedTopIssues = vi.mocked(lookupCandidateTopIssues);

function makeRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/delegation", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": "127.0.0.1" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const GEO_OK = {
  status: "ok" as const,
  result: {
    stateCode: "NJ",
    stateName: "New Jersey",
    county: "Mercer County",
    district: 12,
    matchedAddress: "123 MAIN ST",
  },
};

const SEATS = [
  {
    seatId: "house-NJ-12",
    office: "U.S. House" as const,
    chamber: "house" as const,
    districtLabel: "NJ-12",
    blindLabel: "Your U.S. Representative",
    candidate: {
      id: "p1",
      name: "Bonnie Watson Coleman",
      party: "Democrat" as const,
      priorRole: "U.S. Representative since 2015",
    },
    attendance: null,
    onBallot2026: true,
    nextElectionYear: null,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockedRateLimit.mockResolvedValue(true);
  mockedChallengers.mockResolvedValue({ house: [], senate: [] });
  mockedTopIssues.mockResolvedValue(new Map());
});

describe("POST /api/delegation — validation", () => {
  it("returns 429 when rate limited", async () => {
    mockedRateLimit.mockResolvedValue(false);
    const res = await POST(makeRequest({ address: "123 Main St" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new Request("http://localhost/api/delegation", {
      method: "POST",
      body: "{nope",
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 on a too-short address", async () => {
    const res = await POST(makeRequest({ address: "ab" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 on a missing address", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/delegation — geocode outcomes", () => {
  it("maps no_match to a 200 geocode_failed", async () => {
    mockedGeocode.mockResolvedValue({ status: "no_match" });
    const res = await POST(makeRequest({ address: "asdf qwerty" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "geocode_failed" });
  });

  it("maps geocoder errors to a 502 geocode_failed (retryable)", async () => {
    mockedGeocode.mockResolvedValue({ status: "error" });
    const res = await POST(makeRequest({ address: "123 Main St" }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ status: "geocode_failed" });
  });

  it("returns no_representation for DC", async () => {
    mockedGeocode.mockResolvedValue({
      status: "ok",
      result: {
        stateCode: "DC",
        stateName: "District of Columbia",
        county: "District of Columbia",
        district: null,
        matchedAddress: "1600 PENNSYLVANIA AVE NW",
      },
    });
    const res = await POST(makeRequest({ address: "1600 Penn Ave NW" }));
    expect(await res.json()).toEqual({
      status: "no_representation",
      stateCode: "DC",
      territoryName: "District of Columbia",
    });
    expect(mockedResolve).not.toHaveBeenCalled();
  });

  it("returns no_representation for Puerto Rico", async () => {
    mockedGeocode.mockResolvedValue({
      status: "ok",
      result: {
        stateCode: "PR",
        stateName: "Puerto Rico",
        county: "San Juan Municipio",
        district: null,
        matchedAddress: "SAN JUAN PR",
      },
    });
    const res = await POST(makeRequest({ address: "San Juan, PR 00901" }));
    expect(await res.json()).toEqual({
      status: "no_representation",
      stateCode: "PR",
      territoryName: "Puerto Rico",
    });
    expect(mockedResolve).not.toHaveBeenCalled();
  });
});

describe("POST /api/delegation — resolution outcomes", () => {
  it("passes geography through and returns seats on ok", async () => {
    mockedGeocode.mockResolvedValue(GEO_OK);
    mockedResolve.mockResolvedValue({ status: "ok", seats: SEATS });

    const res = await POST(makeRequest({ address: "123 Main St Trenton NJ" }));
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.stateCode).toBe("NJ");
    expect(body.county).toBe("Mercer County");
    expect(body.districtLabel).toBe("NJ-12");
    expect(body.seats).toHaveLength(1);
    expect(mockedResolve).toHaveBeenCalledWith("NJ", "New Jersey", 12);
  });

  it("formats an at-large district label", async () => {
    mockedGeocode.mockResolvedValue({
      status: "ok",
      result: {
        stateCode: "WY",
        stateName: "Wyoming",
        county: "Laramie County",
        district: 0,
        matchedAddress: "X",
      },
    });
    mockedResolve.mockResolvedValue({ status: "ok", seats: [] });

    const res = await POST(makeRequest({ address: "Cheyenne WY 82001" }));
    const body = await res.json();
    expect(body.districtLabel).toBe("WY — At-large");
  });

  it("returns db_unavailable with geography intact", async () => {
    mockedGeocode.mockResolvedValue(GEO_OK);
    mockedResolve.mockResolvedValue({ status: "db_unavailable" });

    const res = await POST(makeRequest({ address: "123 Main St Trenton NJ" }));
    expect(await res.json()).toEqual({
      status: "db_unavailable",
      stateCode: "NJ",
      county: "Mercer County",
      districtLabel: "NJ-12",
    });
  });

  it("degrades to db_unavailable when the resolver throws", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockedGeocode.mockResolvedValue(GEO_OK);
    mockedResolve.mockRejectedValue(new Error("relation does not exist"));

    const res = await POST(makeRequest({ address: "123 Main St Trenton NJ" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("db_unavailable");
    consoleSpy.mockRestore();
  });

  it("never echoes the input address back", async () => {
    mockedGeocode.mockResolvedValue(GEO_OK);
    mockedResolve.mockResolvedValue({ status: "ok", seats: [] });

    const res = await POST(makeRequest({ address: "123 Main St Trenton NJ" }));
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain("123 Main St");
    expect(text).not.toContain("123 MAIN ST");
  });
});

describe("POST /api/delegation — CAN2026 display gate", () => {
  // A non-empty context the lookup would return if it ran.
  const CTX = {
    ratings: [
      {
        rater: "Cook Political",
        raterType: "forecaster",
        rating: "Lean D",
        ratingRaw: "Lean D",
      },
    ],
    donorTrail: null,
    keyVotes: [],
    snapshotDate: "2026-01-01",
    sourceUrl: "https://can2026.org",
  };

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not attach canContext or query CAN when the flag is unset", async () => {
    vi.stubEnv("CAN2026_DISPLAY_ENABLED", "");
    mockedGeocode.mockResolvedValue(GEO_OK);
    mockedResolve.mockResolvedValue({ status: "ok", seats: SEATS });
    mockedCanContext.mockResolvedValue(CTX);

    const res = await POST(makeRequest({ address: "123 Main St Trenton NJ" }));
    const body = await res.json();
    expect(body.seats[0].canContext).toBeNull();
    expect(mockedCanContext).not.toHaveBeenCalled();
  });

  it("attaches canContext with attribution when the flag is set", async () => {
    vi.stubEnv("CAN2026_DISPLAY_ENABLED", "1");
    mockedGeocode.mockResolvedValue(GEO_OK);
    mockedResolve.mockResolvedValue({ status: "ok", seats: SEATS });
    mockedCanContext.mockResolvedValue(CTX);

    const res = await POST(makeRequest({ address: "123 Main St Trenton NJ" }));
    const body = await res.json();
    expect(mockedCanContext).toHaveBeenCalled();
    expect(body.seats[0].canContext).toMatchObject({
      ratings: CTX.ratings,
      attribution: {
        label: "Context from CAN2026",
        url: "https://can2026.org",
      },
    });
  });
});

describe("POST /api/delegation — PAC transparency gate (Part 6a/6b)", () => {
  const PAC_SPONSORS = {
    electionCycle: "2026",
    hiddenCount: 0,
    sponsors: [
      {
        committeeId: "C00000001",
        name: "EXAMPLE CORP PAC",
        sponsor: "EXAMPLE CORP",
        sector: "Technology",
        amount: 10_000,
        transactionCount: 4,
        evidenceUrl: "https://www.fec.gov/data/committee/C00000001/",
        status: "auto",
      },
    ],
  };

  const OUTSIDE_SPENDING = {
    electionCycle: "2026",
    support: {
      total: 4_000_000,
      hiddenCount: 0,
      spenders: [
        {
          committeeId: "C00900001",
          name: "AN OUTSIDE GROUP",
          sponsor: null,
          sector: null,
          amount: 4_000_000,
          expenditureCount: 12,
          evidenceUrl: "https://www.fec.gov/data/committee/C00900001/",
        },
      ],
    },
    oppose: { total: 1_000_000, hiddenCount: 0, spenders: [] },
  };

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("attaches neither block, and runs no query, when the flag is unset", async () => {
    vi.stubEnv("PAC_TRANSPARENCY_ENABLED", "");
    mockedGeocode.mockResolvedValue(GEO_OK);
    mockedResolve.mockResolvedValue({ status: "ok", seats: SEATS });

    const body = await (
      await POST(makeRequest({ address: "123 Main St Trenton NJ" }))
    ).json();
    expect(body.seats[0].topPacs).toBeNull();
    expect(body.seats[0].outsideSpending).toBeNull();
    expect(mockedPacSponsors).not.toHaveBeenCalled();
    expect(mockedOutsideSpending).not.toHaveBeenCalled();
  });

  it("attaches both blocks when the flag is on", async () => {
    vi.stubEnv("PAC_TRANSPARENCY_ENABLED", "true");
    mockedGeocode.mockResolvedValue(GEO_OK);
    mockedResolve.mockResolvedValue({ status: "ok", seats: SEATS });
    mockedPacSponsors.mockResolvedValue(new Map([["p1", PAC_SPONSORS]]));
    mockedOutsideSpending.mockResolvedValue(
      new Map([["p1", OUTSIDE_SPENDING]]),
    );

    const body = await (
      await POST(makeRequest({ address: "123 Main St Trenton NJ" }))
    ).json();
    expect(mockedPacSponsors).toHaveBeenCalledWith(["p1"]);
    expect(body.seats[0].topPacs.sponsors[0].name).toBe("EXAMPLE CORP PAC");
    expect(body.seats[0].outsideSpending.support.total).toBe(4_000_000);
    expect(body.seats[0].outsideSpending.oppose.total).toBe(1_000_000);
  });

  it("keeps outside spending out of every campaign-money field", async () => {
    // The legally load-bearing check at the API boundary: independent
    // expenditures live in their own seat-level field and are never summed
    // into, netted against, or merged with the candidate's own money.
    vi.stubEnv("PAC_TRANSPARENCY_ENABLED", "true");
    mockedGeocode.mockResolvedValue(GEO_OK);
    mockedResolve.mockResolvedValue({ status: "ok", seats: SEATS });
    mockedPacSponsors.mockResolvedValue(new Map());
    mockedOutsideSpending.mockResolvedValue(
      new Map([["p1", OUTSIDE_SPENDING]]),
    );

    const body = await (
      await POST(makeRequest({ address: "123 Main St Trenton NJ" }))
    ).json();
    const seat = body.seats[0];
    expect(Object.keys(seat.candidate)).not.toContain("outsideSpending");
    expect(JSON.stringify(seat.candidate)).not.toContain("4000000");
    // Neither the sum (5M) nor the net (3M) appears anywhere in the payload.
    const payload = JSON.stringify(body);
    expect(payload).not.toContain("5000000");
    expect(payload).not.toContain("3000000");
  });

  it("sends the honest empty state (not a missing block) when nothing is on file", async () => {
    vi.stubEnv("PAC_TRANSPARENCY_ENABLED", "true");
    mockedGeocode.mockResolvedValue(GEO_OK);
    mockedResolve.mockResolvedValue({ status: "ok", seats: SEATS });
    mockedPacSponsors.mockResolvedValue(new Map());
    mockedOutsideSpending.mockResolvedValue(new Map());

    const body = await (
      await POST(makeRequest({ address: "123 Main St Trenton NJ" }))
    ).json();
    expect(body.seats[0].topPacs).toEqual({
      electionCycle: "2026",
      sponsors: [],
      hiddenCount: 0,
    });
    expect(body.seats[0].outsideSpending.support).toEqual({
      total: 0,
      spenders: [],
      hiddenCount: 0,
    });
    expect(body.seats[0].outsideSpending.oppose.total).toBe(0);
  });

  it("degrades to the empty state when a lookup throws", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("PAC_TRANSPARENCY_ENABLED", "true");
    mockedGeocode.mockResolvedValue(GEO_OK);
    mockedResolve.mockResolvedValue({ status: "ok", seats: SEATS });
    mockedPacSponsors.mockRejectedValue(new Error("relation does not exist"));
    mockedOutsideSpending.mockResolvedValue(new Map());

    const res = await POST(makeRequest({ address: "123 Main St Trenton NJ" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.seats[0].topPacs.sponsors).toEqual([]);
    consoleSpy.mockRestore();
  });
});

describe("POST /api/delegation — promise-ledger top issues on challengers (Part 5)", () => {
  const CHALLENGER = {
    id: "federal-C1",
    name: "Jane Challenger",
    party: "Republican",
    totalReceipts: 250_000,
    rosterProvenance: { source: "fec", asOf: "2026-06-30" } as never,
  };

  const TOP_ISSUES = [
    { canonicalIssue: "healthcare_affordability", promiseCount: 3 },
    { canonicalIssue: "economy_jobs", promiseCount: 1 },
  ];

  it("attaches topIssues to a house challenger when promises are on file", async () => {
    mockedGeocode.mockResolvedValue(GEO_OK);
    mockedResolve.mockResolvedValue({ status: "ok", seats: SEATS });
    mockedChallengers.mockResolvedValue({
      house: [CHALLENGER],
      senate: [],
    });
    mockedTopIssues.mockResolvedValue(new Map([[CHALLENGER.id, TOP_ISSUES]]));

    const body = await (
      await POST(makeRequest({ address: "123 Main St Trenton NJ" }))
    ).json();
    expect(mockedTopIssues).toHaveBeenCalledWith([CHALLENGER.id]);
    expect(body.seats[0].challengers[0].topIssues).toEqual(TOP_ISSUES);
  });

  it("leaves topIssues absent (not an empty array) for a challenger with no promises on file", async () => {
    mockedGeocode.mockResolvedValue(GEO_OK);
    mockedResolve.mockResolvedValue({ status: "ok", seats: SEATS });
    mockedChallengers.mockResolvedValue({
      house: [CHALLENGER],
      senate: [],
    });
    mockedTopIssues.mockResolvedValue(new Map());

    const body = await (
      await POST(makeRequest({ address: "123 Main St Trenton NJ" }))
    ).json();
    expect(body.seats[0].challengers[0]).not.toHaveProperty("topIssues");
  });

  it("runs no top-issues lookup when there are no challengers at all", async () => {
    mockedGeocode.mockResolvedValue(GEO_OK);
    mockedResolve.mockResolvedValue({ status: "ok", seats: SEATS });
    mockedChallengers.mockResolvedValue({ house: [], senate: [] });

    await POST(makeRequest({ address: "123 Main St Trenton NJ" }));
    expect(mockedTopIssues).not.toHaveBeenCalled();
  });

  it("degrades to no topIssues (delegation still 200) when the lookup throws", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockedGeocode.mockResolvedValue(GEO_OK);
    mockedResolve.mockResolvedValue({ status: "ok", seats: SEATS });
    mockedChallengers.mockResolvedValue({
      house: [CHALLENGER],
      senate: [],
    });
    mockedTopIssues.mockRejectedValue(new Error("relation does not exist"));

    const res = await POST(makeRequest({ address: "123 Main St Trenton NJ" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.seats[0].challengers[0]).not.toHaveProperty("topIssues");
    consoleSpy.mockRestore();
  });
});
