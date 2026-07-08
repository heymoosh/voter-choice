import { describe, it, expect, vi, afterEach } from "vitest";
import { loadPolisScopes } from "./polisAdapter";

// ---------------------------------------------------------------------------
// loadPolisScopes maps API responses → PolisScopeVM. These tests pin the
// post-gate-removal contract: a scope is only `locked` when it has zero
// finished sessions; any real participation yields an unlocked scope with
// populated clusters (the 200-session display gate is gone).
// ---------------------------------------------------------------------------

interface MockResponse {
  scope: string;
  sampleSize: number;
  thresholdMet: boolean;
  dots: Array<{ x: number; y: number; primary: string }>;
  you: { x: number; y: number } | null;
  groups: Array<{ primary: string; count: number; topIssues: string[] }>;
}

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    json: async () => body,
  } as unknown as Response;
}

/** Route the adapter's parallel fetches by URL: state, national, bridges. */
function stubFetch(opts: { state: MockResponse; national: MockResponse }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("/api/polis/bridges")) {
        return jsonResponse({ bridges: [] });
      }
      if (url.includes("scope=national")) {
        return jsonResponse(opts.national);
      }
      return jsonResponse(opts.state);
    }),
  );
}

const NATIONAL: MockResponse = {
  scope: "national",
  sampleSize: 50000,
  thresholdMet: true,
  dots: [
    { x: -0.5, y: 0.2, primary: "DEM" },
    { x: 0.5, y: -0.2, primary: "REP" },
  ],
  you: null,
  groups: [{ primary: "GENERAL", count: 50000, topIssues: ["healthcare_affordability"] }],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("loadPolisScopes — locked semantics", () => {
  it("a low-N state (below the old 200 threshold) is UNLOCKED with clusters", async () => {
    stubFetch({
      state: {
        scope: "state",
        sampleSize: 5,
        thresholdMet: false, // below the old gate — must still render now
        dots: [
          { x: -0.5, y: 0.2, primary: "DEM" },
          { x: -0.4, y: 0.1, primary: "DEM" },
          { x: 0.5, y: -0.2, primary: "REP" },
        ],
        you: { x: 0.0, y: 0.1 },
        groups: [
          { primary: "DEM", count: 2, topIssues: ["healthcare_affordability"] },
          { primary: "REP", count: 3, topIssues: ["border_security"] },
        ],
      },
      national: NATIONAL,
    });

    const scopes = await loadPolisScopes({
      stateCode: "WY",
      stateName: "Wyoming",
      county: null,
      userConcerns: ["healthcare_affordability"],
    });

    const state = scopes.find((s) => s.id === "state");
    expect(state).toBeDefined();
    expect(state!.locked).toBe(false);
    expect(state!.clusters.length).toBeGreaterThan(0);
    expect(state!.you).not.toBeNull();
  });

  it("a zero-data state is LOCKED with no clusters", async () => {
    stubFetch({
      state: {
        scope: "state",
        sampleSize: 0,
        thresholdMet: false,
        dots: [],
        you: null,
        groups: [],
      },
      national: NATIONAL,
    });

    const scopes = await loadPolisScopes({
      stateCode: "WY",
      stateName: "Wyoming",
      county: null,
      userConcerns: [],
    });

    const state = scopes.find((s) => s.id === "state");
    expect(state).toBeDefined();
    expect(state!.locked).toBe(true);
    expect(state!.clusters).toEqual([]);
  });
});
