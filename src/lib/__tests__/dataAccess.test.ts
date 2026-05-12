/**
 * Unit tests for the data access layer.
 * Uses vi.stubGlobal to mock fetch and module mocks.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { clearCache, isCached } from "../dataAccess";

// Mock voterIdData
vi.mock("../voterIdData", () => ({
  getVoterIdData: (stateCode: string) => ({
    state: stateCode,
    voterIdRequired: false,
    idType: "non-strict-non-photo",
    acceptedIds: [],
    exceptions: "",
    provisionalBallot: false,
    provisionalBallotRules: "",
    phonesAtPolls: false,
    phonesAtPollsDetail: "",
    sourceUrl: "https://example.com",
    lastVerified: "2026-04-03",
  }),
}));

// Mock zipLookup
vi.mock("../zipLookup", () => ({
  lookupState: (zip: string) => {
    if (zip === "73301") return ["TX"];
    if (zip === "90210") return ["CA"];
    if (zip === "99999") return null;
    return ["TX"];
  },
  isValidZip: (zip: string) => /^\d{5}$/.test(zip),
}));

// Mock state data imports
vi.mock("@/data/states/TX.json", () => ({
  default: {
    stateCode: "TX",
    stateName: "Texas",
    lastUpdated: "2026-01-01",
    elections: [
      {
        id: "e1",
        name: "Primary",
        date: "2026-03-03",
        type: "primary",
        isPrimary: true,
        primaryType: "open",
      },
    ],
    registration: {
      online: { available: true, deadline: "2026-02-01", url: "" },
      byMail: { deadline: "2026-02-01", sincePostmarked: false },
      inPerson: { deadline: "2026-03-01", sincePostmarked: false },
      sameDayRegistration: false,
      registrationCheckUrl: "",
    },
    earlyVoting: {
      available: true,
      startDate: "2026-02-14",
      endDate: "2026-02-28",
    },
    votingRules: {
      idRequired: true,
      acceptedIds: ["Texas driver's license"],
      phonesAtPolls: "prohibited",
      phonesAtPollsDetail: "Prohibited",
      additionalRules: [],
    },
    resources: {
      stateElectionWebsite: "https://sos.texas.gov",
      countyElectionLookup: "",
      sampleBallotLookup: "",
      pollingPlaceLookup: "",
    },
  },
}));

describe("dataAccess cache management", () => {
  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    clearCache();
    vi.restoreAllMocks();
  });

  it("isCached returns false for fresh cache", () => {
    expect(isCached("73301")).toBe(false);
  });

  it("clearCache removes specific zip", async () => {
    // First populate the cache by a fetch
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        pollingLocation: { name: "City Hall", address: "123 Main St" },
        ballotContests: [],
        fetchedAt: Date.now(),
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { fetchLiveData } = await import("../dataAccess");
    await fetchLiveData("73301");
    expect(isCached("73301")).toBe(true);

    clearCache("73301");
    expect(isCached("73301")).toBe(false);
  });

  it("clearCache without argument clears all entries", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ballotContests: [], fetchedAt: Date.now() }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { fetchLiveData } = await import("../dataAccess");
    await fetchLiveData("73301");
    await fetchLiveData("90210");

    expect(isCached("73301")).toBe(true);
    clearCache();
    expect(isCached("73301")).toBe(false);
    expect(isCached("90210")).toBe(false);
  });
});

describe("dataAccess fetchLiveData", () => {
  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    clearCache();
    vi.restoreAllMocks();
  });

  it("returns live data with voterIdData populated", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        pollingLocation: { name: "Test Hall", address: "456 Oak St" },
        ballotContests: [
          { contestId: "1", name: "Senate", type: "office", candidates: [] },
        ],
        fetchedAt: Date.now(),
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { fetchLiveData } = await import("../dataAccess");
    const result = await fetchLiveData("73301");

    expect(result.voterIdData).toBeDefined();
    expect(result.voterIdData?.state).toBe("TX");
    expect(result.pollingLocation?.name).toBe("Test Hall");
    expect(result.ballotContests).toHaveLength(1);
  });

  it("returns data with apiErrors when civic API fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ message: "Service unavailable" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { fetchLiveData } = await import("../dataAccess");
    const result = await fetchLiveData("73301");

    expect(result.apiErrors).toBeDefined();
    expect(result.apiErrors?.length).toBeGreaterThan(0);
    expect(result.apiErrors?.[0].source).toBe("civic");
    // Should still have voterIdData from static fallback
    expect(result.voterIdData).toBeDefined();
  });

  it("handles network error gracefully", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", mockFetch);

    const { fetchLiveData } = await import("../dataAccess");
    const result = await fetchLiveData("73301");

    expect(result.apiErrors).toBeDefined();
    expect(result.apiErrors?.[0].message).toContain("Network error");
    // App doesn't crash — returns state data with fallback
    expect(result.stateCode).toBeDefined();
  });

  it("uses cache on second call with same zip", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        json: async () => ({ ballotContests: [], fetchedAt: Date.now() }),
      };
    });
    vi.stubGlobal("fetch", mockFetch);

    const { fetchLiveData } = await import("../dataAccess");
    await fetchLiveData("73301");
    const firstCallCount = callCount;
    await fetchLiveData("73301"); // should use cache
    expect(callCount).toBe(firstCallCount); // no additional fetch
  });
});
