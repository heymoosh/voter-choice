import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchCivicData, normalizeCivicResponse } from "../civicClient";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("civicClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set API key for tests that need it
    process.env.GOOGLE_CIVIC_API_KEY = "test-key";
  });

  describe("fetchCivicData", () => {
    it("returns null when fetch throws (network error)", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      const result = await fetchCivicData("73301");
      expect(result).toBeNull();
    });

    it("returns null when response is not ok (HTTP error)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: { message: "Forbidden" } }),
      });
      const result = await fetchCivicData("73301");
      expect(result).toBeNull();
    });

    it("returns null when API key is not set", async () => {
      delete process.env.GOOGLE_CIVIC_API_KEY;
      const result = await fetchCivicData("73301");
      expect(result).toBeNull();
      // Restore
      process.env.GOOGLE_CIVIC_API_KEY = "test-key";
    });

    it("returns parsed data when response is ok", async () => {
      const mockResponse = {
        normalizedInput: { state: "TX", city: "Austin", zip: "73301" },
        contests: [],
        pollingLocations: [],
        divisions: {},
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      const result = await fetchCivicData("73301");
      expect(result).not.toBeNull();
      expect(result?.rawInput).toEqual(mockResponse.normalizedInput);
    });
  });

  describe("normalizeCivicResponse", () => {
    it("extracts polling location from API response", () => {
      const raw = {
        rawInput: { state: "TX", city: "Austin", zip: "73301" },
        contests: [],
        pollingLocations: [
          {
            address: {
              locationName: "Austin City Hall",
              line1: "301 W 2nd St",
              city: "Austin",
              state: "TX",
              zip: "73301",
            },
            pollingHours: "7am-7pm",
          },
        ],
        divisions: {},
      };
      const normalized = normalizeCivicResponse(raw, "73301", "TX", "Texas");
      expect(normalized.pollingLocation).not.toBeNull();
      expect(normalized.pollingLocation?.name).toBe("Austin City Hall");
      expect(normalized.pollingLocation?.address).toContain("301 W 2nd St");
    });

    it("returns null pollingLocation when none in API response", () => {
      const raw = {
        rawInput: { state: "TX", city: "Austin", zip: "73301" },
        contests: [],
        pollingLocations: [],
        divisions: {},
      };
      const normalized = normalizeCivicResponse(raw, "73301", "TX", "Texas");
      expect(normalized.pollingLocation).toBeNull();
    });

    it("extracts ballot contests from API response", () => {
      const raw = {
        rawInput: { state: "TX", zip: "73301" },
        contests: [
          {
            type: "General",
            office: "U.S. Representative",
            district: { name: "Texas 10th Congressional District" },
            candidates: [
              { name: "Jane Doe", party: "Democratic" },
              { name: "John Smith", party: "Republican" },
            ],
          },
        ],
        pollingLocations: [],
        divisions: {},
      };
      const normalized = normalizeCivicResponse(raw, "73301", "TX", "Texas");
      expect(normalized.ballotContests).toHaveLength(1);
      expect(normalized.ballotContests[0].office).toBe("U.S. Representative");
      expect(normalized.ballotContests[0].candidates).toHaveLength(2);
    });

    it("extracts districts from divisions", () => {
      const raw = {
        rawInput: { state: "TX", zip: "73301" },
        contests: [],
        pollingLocations: [],
        divisions: {
          "ocd-division/country:us/state:tx/cd:10": {
            name: "Congressional District 10",
          },
          "ocd-division/country:us/state:tx/sldu:14": {
            name: "State Senate District 14",
          },
        },
      };
      const normalized = normalizeCivicResponse(raw, "73301", "TX", "Texas");
      expect(normalized.districts.congressionalDistrict).toBe("10");
      expect(normalized.districts.stateSenateDistrict).toBe("14");
    });
  });
});
