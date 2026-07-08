import { describe, it, expect, vi, afterEach } from "vitest";
import { loadPolisScopes } from "./polisAdapter";

const POLIS_SCOPE_BODY = {
  scope: "state",
  sampleSize: 120,
  dots: [{ x: 0.1, y: 0.2 }],
  you: { x: 0.1, y: 0.1 },
  overlap: { mostCommon: null, youShares: [] },
  issueRegions: [],
};

function mockFetch(bridgesBody: unknown) {
  global.fetch = vi.fn((url: string) => {
    if (String(url).includes("/api/polis/bridges")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(bridgesBody),
      } as Response);
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(POLIS_SCOPE_BODY),
    } as Response);
  }) as unknown as typeof fetch;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadPolisScopes — divided ('where it split') mapping", () => {
  it("maps the divided list through to the state scope, reducing each entry to a single population-level percent", async () => {
    mockFetch({
      bridges: [],
      divided: [
        {
          statement: "Federal spending should be cut across the board.",
          clusters: [
            { name: "Service-first progressives", agreementPercent: 79 },
            { name: "Pocketbook moderates", agreementPercent: 28 },
            { name: "Civic libertarians", agreementPercent: 52 },
          ],
        },
      ],
    });

    const scopes = await loadPolisScopes({
      stateCode: "TX",
      stateName: "Texas",
      userConcerns: [],
    });

    const state = scopes.find((s) => s.id === "state");
    expect(state).toBeDefined();
    // Weakest cluster (28) is the honest number to surface — never a party label.
    expect(state!.divided).toEqual([
      { stmt: "Federal spending should be cut across the board.", pct: 28 },
    ]);
  });

  it("national scope always hides the divided panel (state-scoped data only)", async () => {
    mockFetch({
      bridges: [],
      divided: [
        {
          statement: "X",
          clusters: [{ name: "A", agreementPercent: 10 }],
        },
      ],
    });

    const scopes = await loadPolisScopes({
      stateCode: "TX",
      stateName: "Texas",
      userConcerns: [],
    });

    const national = scopes.find((s) => s.id === "national");
    expect(national).toBeDefined();
    expect(national!.divided).toEqual([]);
  });

  it("v1 sentinel response (no divided field) maps to an empty divided list", async () => {
    mockFetch({
      scope: "national",
      threshold: 50,
      count: 70,
      status: "no_bridges_yet",
      bridges: [],
      // divided intentionally omitted — simulates a pre-rollout v1 sentinel
      // response that predates this field, exercising mapStatementList's
      // Array.isArray fallback rather than re-testing an explicit [].
    });

    const scopes = await loadPolisScopes({
      stateCode: "TX",
      stateName: "Texas",
      userConcerns: [],
    });

    const state = scopes.find((s) => s.id === "state");
    expect(state!.divided).toEqual([]);
  });
});
