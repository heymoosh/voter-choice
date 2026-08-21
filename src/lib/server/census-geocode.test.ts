/**
 * src/lib/server/census-geocode.test.ts
 *
 * Tests for the Census geocoder parse layer. All network calls are stubbed —
 * fixtures mirror real geocoder payload shapes (119th-Congress vintage).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { geocodeAddressToDistrict } from "./census-geocode";

function censusPayload(
  geographies: Record<string, unknown>,
  matchedAddress = "123 MAIN ST, TRENTON, NJ, 08601",
) {
  return {
    result: {
      input: {},
      addressMatches: [{ matchedAddress, coordinates: {}, geographies }],
    },
  };
}

function stubFetchJson(payload: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: vi.fn().mockResolvedValue(payload),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("geocodeAddressToDistrict — happy path", () => {
  it("parses state, county, and a numbered district", async () => {
    stubFetchJson(
      censusPayload({
        States: [{ STUSAB: "NJ", NAME: "New Jersey", GEOID: "34" }],
        Counties: [{ NAME: "Mercer County" }],
        "119th Congressional Districts": [
          { CD119: "12", NAME: "Congressional District 12", BASENAME: "12" },
        ],
      }),
    );

    const out = await geocodeAddressToDistrict("123 Main St, Trenton NJ");
    expect(out).toEqual({
      status: "ok",
      result: {
        stateCode: "NJ",
        stateName: "New Jersey",
        county: "Mercer County",
        district: 12,
        matchedAddress: "123 MAIN ST, TRENTON, NJ, 08601",
      },
    });
  });

  it("survives a congress-number rollover in the layer/field names", async () => {
    stubFetchJson(
      censusPayload({
        States: [{ STUSAB: "TX", NAME: "Texas" }],
        Counties: [{ NAME: "Travis County" }],
        "120th Congressional Districts": [{ CD120: "21" }],
      }),
    );

    const out = await geocodeAddressToDistrict("Austin TX");
    expect(out.status).toBe("ok");
    if (out.status === "ok") {
      expect(out.result.district).toBe(21);
    }
  });

  it("maps an at-large CD code 00 to district 0", async () => {
    stubFetchJson(
      censusPayload({
        States: [{ STUSAB: "WY", NAME: "Wyoming" }],
        Counties: [{ NAME: "Laramie County" }],
        "119th Congressional Districts": [{ CD119: "00" }],
      }),
    );

    const out = await geocodeAddressToDistrict("Cheyenne WY");
    expect(out.status).toBe("ok");
    if (out.status === "ok") {
      expect(out.result.district).toBe(0);
      expect(out.result.stateCode).toBe("WY");
    }
  });

  it("tolerates a missing Counties layer", async () => {
    stubFetchJson(
      censusPayload({
        States: [{ STUSAB: "NJ", NAME: "New Jersey" }],
        "119th Congressional Districts": [{ CD119: "5" }],
      }),
    );

    const out = await geocodeAddressToDistrict("somewhere NJ");
    expect(out.status).toBe("ok");
    if (out.status === "ok") {
      expect(out.result.county).toBeNull();
      expect(out.result.district).toBe(5);
    }
  });
});

describe("geocodeAddressToDistrict — non-voting areas", () => {
  it("returns district: null for DC (delegate code 98)", async () => {
    stubFetchJson(
      censusPayload({
        States: [{ STUSAB: "DC", NAME: "District of Columbia" }],
        Counties: [{ NAME: "District of Columbia" }],
        "119th Congressional Districts": [{ CD119: "98" }],
      }),
    );

    const out = await geocodeAddressToDistrict("1600 Pennsylvania Ave NW");
    expect(out.status).toBe("ok");
    if (out.status === "ok") {
      expect(out.result.stateCode).toBe("DC");
      expect(out.result.district).toBeNull();
    }
  });

  it("returns district: null for Puerto Rico even with a numeric code", async () => {
    stubFetchJson(
      censusPayload({
        States: [{ STUSAB: "PR", NAME: "Puerto Rico" }],
        Counties: [{ NAME: "San Juan Municipio" }],
        "119th Congressional Districts": [{ CD119: "00" }],
      }),
    );

    const out = await geocodeAddressToDistrict("San Juan PR");
    expect(out.status).toBe("ok");
    if (out.status === "ok") {
      expect(out.result.district).toBeNull();
    }
  });
});

describe("geocodeAddressToDistrict — failure modes", () => {
  it("returns no_match for an unmatched address", async () => {
    stubFetchJson({ result: { input: {}, addressMatches: [] } });
    const out = await geocodeAddressToDistrict("asdf qwerty zxcv");
    expect(out).toEqual({ status: "no_match" });
  });

  it("returns error on a 5xx response", async () => {
    stubFetchJson({}, false, 503);
    const out = await geocodeAddressToDistrict("123 Main St");
    expect(out).toEqual({ status: "error" });
  });

  it("returns error when fetch rejects (timeout / network)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    const out = await geocodeAddressToDistrict("123 Main St");
    expect(out).toEqual({ status: "error" });
  });

  it("returns error on malformed JSON payloads", async () => {
    stubFetchJson({ unexpected: true });
    const out = await geocodeAddressToDistrict("123 Main St");
    expect(out).toEqual({ status: "error" });
  });

  it("returns error when the States layer is missing", async () => {
    stubFetchJson(
      censusPayload({
        "119th Congressional Districts": [{ CD119: "12" }],
      }),
    );
    const out = await geocodeAddressToDistrict("123 Main St");
    expect(out).toEqual({ status: "error" });
  });

  it("sends the address and current-benchmark params", async () => {
    const fetchMock = stubFetchJson(
      censusPayload({
        States: [{ STUSAB: "NJ", NAME: "New Jersey" }],
        "119th Congressional Districts": [{ CD119: "5" }],
      }),
    );
    await geocodeAddressToDistrict("123 Main St, Trenton NJ");
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("benchmark")).toBe("Public_AR_Current");
    expect(url.searchParams.get("vintage")).toBe("Current_Current");
    expect(url.searchParams.get("address")).toBe("123 Main St, Trenton NJ");
  });
});

describe("geocodeAddressToDistrict — transient-failure retry", () => {
  it("retries once after a 5xx and succeeds on the second attempt", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503, json: vi.fn() })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(
          censusPayload({
            States: [{ STUSAB: "NJ", NAME: "New Jersey" }],
            "119th Congressional Districts": [{ CD119: "5" }],
          }),
        ),
      });
    vi.stubGlobal("fetch", fetchMock);

    const out = await geocodeAddressToDistrict("123 Main St, Trenton NJ");
    expect(out.status).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries once after a thrown network error and succeeds on the second attempt", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(
          censusPayload({
            States: [{ STUSAB: "TX", NAME: "Texas" }],
            "119th Congressional Districts": [{ CD119: "21" }],
          }),
        ),
      });
    vi.stubGlobal("fetch", fetchMock);

    const out = await geocodeAddressToDistrict("Austin TX");
    expect(out.status).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after a persistent 5xx and returns error after exactly MAX_ATTEMPTS calls", async () => {
    const fetchMock = stubFetchJson({}, false, 500);
    const out = await geocodeAddressToDistrict("123 Main St");
    expect(out).toEqual({ status: "error" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 4xx — our own request was malformed", async () => {
    const fetchMock = stubFetchJson({}, false, 400);
    const out = await geocodeAddressToDistrict("123 Main St");
    expect(out).toEqual({ status: "error" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry a clean 200 with zero address matches (no_match, not an upstream failure)", async () => {
    const fetchMock = stubFetchJson({
      result: { input: {}, addressMatches: [] },
    });
    const out = await geocodeAddressToDistrict("asdf qwerty zxcv");
    expect(out).toEqual({ status: "no_match" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
