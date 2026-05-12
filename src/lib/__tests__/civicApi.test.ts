/**
 * Unit tests for civicApi.ts
 * Uses vi.stubGlobal to mock fetch.
 */
import { describe, it, expect, vi, afterEach } from "vitest";

// Set required env var before importing
vi.stubEnv("GOOGLE_CIVIC_API_KEY", "test-civic-key");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("civicApi fetchCivicData", () => {
  it("parses a successful civic API response", async () => {
    const mockResponse = {
      election: { name: "2026 Primary", electionDay: "2026-03-03" },
      pollingLocations: [
        {
          address: {
            locationName: "City Hall",
            line1: "123 Main St",
            city: "Austin",
            state: "TX",
            zip: "78701",
          },
          pollingHours: "7am-7pm",
        },
      ],
      contests: [
        {
          type: "office",
          office: "U.S. Senate",
          candidates: [
            { name: "Alice Smith", party: "Party A" },
            { name: "Bob Jones", party: "Party B" },
          ],
        },
      ],
      divisions: {
        "ocd-division/country:us/state:tx/cd:10": {
          name: "Texas's 10th congressional district",
        },
      },
      normalizedInput: { city: "Austin", state: "TX", zip: "73301" },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });
    vi.stubGlobal("fetch", mockFetch);

    const { fetchCivicData } = await import("../civicApi");
    const result = await fetchCivicData("73301");

    expect(result.electionName).toBe("2026 Primary");
    expect(result.pollingLocation?.name).toBe("City Hall");
    expect(result.pollingLocation?.address).toContain("123 Main St");
    expect(result.ballotContests).toHaveLength(1);
    expect(result.ballotContests?.[0].name).toBe("U.S. Senate");
    expect(result.ballotContests?.[0].candidates).toHaveLength(2);
    expect(result.districts?.congressional).toContain("10th congressional");
  });

  it("throws on timeout (AbortError)", async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error("AbortError"), { name: "AbortError" }),
      );
    vi.stubGlobal("fetch", mockFetch);

    const { fetchCivicData } = await import("../civicApi");
    await expect(fetchCivicData("73301")).rejects.toThrow("timed out");
  });

  it("attempts representatives fallback on 400 error", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      callCount++;
      if (url.includes("voterinfo")) {
        return { ok: false, status: 400, json: async () => ({}) };
      }
      // Representatives fallback
      return {
        ok: true,
        json: async () => ({
          divisions: {
            "ocd-division/country:us/state:tx/sldu:14": { name: "TX SD-14" },
          },
          normalizedInput: { city: "Houston", state: "TX" },
        }),
      };
    });
    vi.stubGlobal("fetch", mockFetch);

    const { fetchCivicData } = await import("../civicApi");
    const result = await fetchCivicData("73301");

    expect(callCount).toBe(2); // voterinfo + representatives
    expect(result.districts?.stateSenate).toBe("TX SD-14");
  });

  it("returns empty result when API key is missing", async () => {
    vi.stubEnv("GOOGLE_CIVIC_API_KEY", "");
    const { fetchCivicData } = await import("../civicApi");
    await expect(fetchCivicData("73301")).rejects.toThrow("configured");
    vi.stubEnv("GOOGLE_CIVIC_API_KEY", "test-civic-key");
  });
});
