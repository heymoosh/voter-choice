import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCached, setCached, clearCache } from "@/lib/civic/cache";
import { mapCivicResponseToElectionInfo } from "@/lib/civic/mapper";
import { getVoterIdInfo } from "@/data/voter-id/index";
import type { CivicVoterInfoResponse } from "@/lib/civic/types";

// --- Cache tests ---

describe("civic cache", () => {
  beforeEach(() => {
    clearCache();
  });

  it("returns null for a cache miss", () => {
    expect(getCached("12345")).toBeNull();
  });

  it("returns cached data after set", () => {
    const mockData = {
      election: { id: "1", name: "Test", date: "2026-11-03" },
      ballotContests: [],
      dataSourceAttribution: "Test",
      fetchedAt: new Date().toISOString(),
    };
    setCached("12345", mockData as ReturnType<typeof getCached> extends null ? never : NonNullable<ReturnType<typeof getCached>>);
    const result = getCached("12345");
    expect(result).not.toBeNull();
    expect(result?.election?.name).toBe("Test");
  });

  it("returns different data for different zip codes", () => {
    const data1 = {
      election: { id: "1", name: "Election 1", date: "2026-11-03" },
      ballotContests: [],
      dataSourceAttribution: "Test",
      fetchedAt: new Date().toISOString(),
    };
    const data2 = {
      election: { id: "2", name: "Election 2", date: "2026-11-03" },
      ballotContests: [],
      dataSourceAttribution: "Test",
      fetchedAt: new Date().toISOString(),
    };
    setCached("11111", data1 as Parameters<typeof setCached>[1]);
    setCached("22222", data2 as Parameters<typeof setCached>[1]);

    expect(getCached("11111")?.election?.name).toBe("Election 1");
    expect(getCached("22222")?.election?.name).toBe("Election 2");
  });
});

// --- Voter ID static data ---

describe("voter ID static data", () => {
  it("returns TX voter ID info", () => {
    const info = getVoterIdInfo("TX");
    expect(info).not.toBeNull();
    expect(info?.state).toBe("TX");
    expect(info?.voterIdRequired).toBe(true);
    expect(info?.idType).toBe("strict-photo");
  });

  it("returns CA voter ID info", () => {
    const info = getVoterIdInfo("CA");
    expect(info).not.toBeNull();
    expect(info?.voterIdRequired).toBe(false);
  });

  it("returns null for unknown state", () => {
    expect(getVoterIdInfo("ZZ")).toBeNull();
  });

  it("is case-insensitive", () => {
    const lower = getVoterIdInfo("tx");
    const upper = getVoterIdInfo("TX");
    expect(lower?.state).toBe(upper?.state);
  });
});

// --- Civic mapper tests ---

describe("civic mapper", () => {
  const mockVoterInfo: CivicVoterInfoResponse = {
    kind: "civicinfo#voterInfoResponse",
    election: {
      id: "2000",
      name: "2026 General Election",
      electionDay: "2026-11-03",
    },
    pollingLocations: [
      {
        address: {
          line1: "123 Main St",
          city: "Houston",
          state: "TX",
          zip: "77001",
        },
        name: "Houston Community Center",
        pollingHours: "7am - 7pm",
      },
    ],
    contests: [
      {
        type: "Candidate",
        office: "U.S. Senator",
        district: { name: "Texas" },
        candidates: [
          { name: "Jane Smith", party: "Democratic" },
          { name: "John Doe", party: "Republican" },
        ],
      },
      {
        type: "Referendum",
        referendumTitle: "Proposition 1",
        referendumBriefDescription: "Bond measure",
      },
    ],
  };

  it("maps election info", () => {
    const result = mapCivicResponseToElectionInfo(mockVoterInfo, null);
    expect(result.election?.name).toBe("2026 General Election");
    expect(result.election?.date).toBe("2026-11-03");
  });

  it("maps polling location", () => {
    const result = mapCivicResponseToElectionInfo(mockVoterInfo, null);
    expect(result.pollingLocation).not.toBeNull();
    expect(result.pollingLocation?.name).toBe("Houston Community Center");
    expect(result.pollingLocation?.address).toContain("123 Main St");
  });

  it("maps ballot contests", () => {
    const result = mapCivicResponseToElectionInfo(mockVoterInfo, null);
    expect(result.ballotContests).toHaveLength(2);
  });

  it("maps candidate contests", () => {
    const result = mapCivicResponseToElectionInfo(mockVoterInfo, null);
    const candidateContest = result.ballotContests.find(
      (c) => c.type === "candidate",
    );
    expect(candidateContest).toBeDefined();
    expect(candidateContest?.title).toBe("U.S. Senator");
    expect(candidateContest?.candidates).toHaveLength(2);
  });

  it("maps referendum contests", () => {
    const result = mapCivicResponseToElectionInfo(mockVoterInfo, null);
    const referendum = result.ballotContests.find(
      (c) => c.type === "referendum",
    );
    expect(referendum).toBeDefined();
    expect(referendum?.title).toBe("Proposition 1");
  });

  it("includes data attribution", () => {
    const result = mapCivicResponseToElectionInfo(mockVoterInfo, null);
    expect(result.dataSourceAttribution).toContain("Google Civic");
  });

  it("handles missing contests gracefully", () => {
    const infoWithoutContests: CivicVoterInfoResponse = {
      ...mockVoterInfo,
      contests: undefined,
    };
    const result = mapCivicResponseToElectionInfo(infoWithoutContests, null);
    expect(result.ballotContests).toHaveLength(0);
  });

  it("handles missing polling location gracefully", () => {
    const infoWithoutPolling: CivicVoterInfoResponse = {
      ...mockVoterInfo,
      pollingLocations: undefined,
    };
    const result = mapCivicResponseToElectionInfo(infoWithoutPolling, null);
    expect(result.pollingLocation).toBeUndefined();
  });
});
