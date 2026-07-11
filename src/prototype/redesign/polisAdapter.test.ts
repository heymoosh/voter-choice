import { afterEach, describe, expect, it, vi } from "vitest";
import { loadPolisScopes } from "./polisAdapter";

/**
 * Party-free adapter contract. The route returns `bridges[]` (population-level
 * agreement) AND `divided[]` ({statement, agreePercent, disagreePercent}); the
 * VM must surface both, never a party/cluster split (DECISION #116).
 */

type FetchImpl = (url: string) => Promise<Response>;

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    json: async () => body,
  } as unknown as Response;
}

function stubFetch(handlers: { polis: unknown; bridges: unknown }): void {
  const impl: FetchImpl = async (url) => {
    if (url.includes("/api/polis/bridges"))
      return jsonResponse(handlers.bridges);
    if (url.includes("/api/polis")) return jsonResponse(handlers.polis);
    throw new Error(`unexpected fetch: ${url}`);
  };
  vi.stubGlobal("fetch", vi.fn(impl));
}

const polisOk = {
  scope: "state",
  sampleSize: 412,
  dots: [{ x: 0.1, y: 0.1 }],
  you: { x: 0.1, y: 0.05 },
  overlap: { mostCommon: null, youShares: [] },
  issueRegions: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadPolisScopes — divided[] wiring", () => {
  it("surfaces both bridges and divided on the state scope", async () => {
    stubFetch({
      polis: polisOk,
      bridges: {
        scope: "state",
        threshold: 200,
        count: 3,
        status: "ok",
        bridges: [
          {
            statement: "Members of Congress shouldn't trade individual stocks.",
            clusters: [{ name: "population", agreementPercent: 86 }],
          },
        ],
        divided: [
          {
            statement: "Federal spending should be cut across the board.",
            agreePercent: 39,
            disagreePercent: 51,
          },
        ],
      },
    });

    const scopes = await loadPolisScopes({
      stateCode: "TX",
      stateName: "Texas",
      userConcerns: [],
    });
    const state = scopes.find((s) => s.id === "state")!;

    expect(state.bridges).toEqual([
      {
        stmt: "Members of Congress shouldn't trade individual stocks.",
        pct: 86,
      },
    ]);
    expect(state.divided).toEqual([
      {
        stmt: "Federal spending should be cut across the board.",
        agreePct: 39,
        disagreePct: 51,
      },
    ]);
  });

  it("threads per-opinion-group clusterAgreement onto bridges and divided, dropping malformed records", async () => {
    stubFetch({
      polis: polisOk,
      bridges: {
        scope: "state",
        threshold: 200,
        count: 2,
        status: "ok",
        bridges: [
          {
            statement: "Congress should cap prescription drug price increases.",
            clusters: [{ name: "population", agreementPercent: 86 }],
            clusterAgreement: [
              { clusterId: 0, label: "Group A", agreePct: 88 },
              { clusterId: 1, label: "Group B", agreePct: 83 },
              // malformed (missing agreePct) → dropped
              { clusterId: 2, label: "Group C" },
            ],
          },
        ],
        divided: [
          {
            statement: "Federal spending should be cut across the board.",
            agreePercent: 58,
            disagreePercent: 34,
            clusterAgreement: [
              { clusterId: 0, label: "Group A", agreePct: 79 },
              { clusterId: 1, label: "Group B", agreePct: 28 },
              { clusterId: 2, label: "Group C", agreePct: 52 },
            ],
          },
        ],
      },
    });

    const scopes = await loadPolisScopes({
      stateCode: "TX",
      stateName: "Texas",
      userConcerns: [],
    });
    const state = scopes.find((s) => s.id === "state")!;

    // Bridge keeps only the two well-formed group records.
    expect(state.bridges[0].clusterAgreement).toEqual([
      { clusterId: 0, label: "Group A", agreePct: 88 },
      { clusterId: 1, label: "Group B", agreePct: 83 },
    ]);
    // Divided carries the full 3-group spread.
    expect(state.divided[0].clusterAgreement).toEqual([
      { clusterId: 0, label: "Group A", agreePct: 79 },
      { clusterId: 1, label: "Group B", agreePct: 28 },
      { clusterId: 2, label: "Group C", agreePct: 52 },
    ]);
  });

  it("omits clusterAgreement when the route sends none (thin/unseparated population)", async () => {
    stubFetch({
      polis: polisOk,
      bridges: {
        scope: "state",
        threshold: 200,
        count: 1,
        status: "ok",
        bridges: [
          {
            statement: "Members of Congress shouldn't trade individual stocks.",
            clusters: [{ name: "population", agreementPercent: 86 }],
          },
        ],
        divided: [],
      },
    });

    const scopes = await loadPolisScopes({
      stateCode: "TX",
      stateName: "Texas",
      userConcerns: [],
    });
    const state = scopes.find((s) => s.id === "state")!;
    expect(state.bridges[0].clusterAgreement).toBeUndefined();
  });

  it("reads divided even when there are zero bridges (fully-divided cycle)", async () => {
    stubFetch({
      polis: polisOk,
      bridges: {
        scope: "state",
        threshold: 200,
        count: 1,
        status: "no_bridges_yet",
        bridges: [],
        divided: [
          {
            statement: "Congress should raise the federal minimum wage.",
            agreePercent: 44,
            disagreePercent: 48,
          },
        ],
      },
    });

    const scopes = await loadPolisScopes({
      stateCode: "TX",
      stateName: "Texas",
      userConcerns: [],
    });
    const state = scopes.find((s) => s.id === "state")!;

    expect(state.bridges).toEqual([]);
    expect(state.divided).toHaveLength(1);
    expect(state.divided[0].stmt).toContain("minimum wage");
  });

  it("tolerates a legacy response with no divided field", async () => {
    stubFetch({
      polis: polisOk,
      bridges: { scope: "state", threshold: 200, count: 0, bridges: [] },
    });

    const scopes = await loadPolisScopes({
      stateCode: "TX",
      stateName: "Texas",
      userConcerns: [],
    });
    const state = scopes.find((s) => s.id === "state")!;

    expect(state.bridges).toEqual([]);
    expect(state.divided).toEqual([]);
  });

  it("national scope carries no bridges/divided (state-scoped today)", async () => {
    stubFetch({
      polis: { ...polisOk, scope: "national" },
      bridges: {
        scope: "state",
        threshold: 200,
        count: 1,
        status: "ok",
        bridges: [],
        divided: [
          {
            statement: "x",
            agreePercent: 40,
            disagreePercent: 45,
          },
        ],
      },
    });

    const scopes = await loadPolisScopes({
      stateCode: "TX",
      stateName: "Texas",
      userConcerns: [],
    });
    const national = scopes.find((s) => s.id === "national")!;

    expect(national.bridges).toEqual([]);
    expect(national.divided).toEqual([]);
  });
});
