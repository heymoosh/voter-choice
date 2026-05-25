import { test, expect, type APIRequestContext } from "@playwright/test";

// ──────────────────────────────────────────────────────────────
// Phase 8 — Polis view: bars + bridges + compass.
//
// Verifies the three new endpoints respond with the shape-correct
// contracts the PolisOverlay component depends on. Then renders the
// overlay (via a synthetic page mount through a data-URL-style probe
// of the actual dev server) is impractical without a dedicated route;
// instead we cover the contracts here and rely on the vitest jsdom
// suite for component-shape assertions.
//
// Self-skips when PROMPT_FLEET_V2 is absent — same gating as the rest
// of the Phase-N e2e suite. The PolisOverlay only renders inside the
// HandoffPackage which is reached through the cold-open + workspace
// flow; gating on the same flag keeps this spec consistent with the
// rest of the redesign suite.
// ──────────────────────────────────────────────────────────────

const PROMPT_FLEET_V2_ENABLED =
  typeof process.env.PROMPT_FLEET_V2 === "string" &&
  process.env.PROMPT_FLEET_V2.length > 0;

const BARS_PER_READING_MIN = 50;
const COMPASS_DEFAULT_THRESHOLD = 150;

test.describe("Phase 8 — Polis view (bars + bridges + compass empty state)", () => {
  test.skip(
    !PROMPT_FLEET_V2_ENABLED,
    "PROMPT_FLEET_V2 env not set on the playwright webServer. " +
      "Run with `PROMPT_FLEET_V2=1 npx playwright test e2e/polis-view.spec.ts` " +
      "or add `webServer.env.PROMPT_FLEET_V2 = '1'` to playwright.config.ts.",
  );

  async function getJson(
    request: APIRequestContext,
    path: string,
  ): Promise<unknown> {
    const res = await request.get(path);
    expect(res.status()).toBe(200);
    return res.json();
  }

  test("GET /api/polis/bars — shape-correct empty state for an unseeded county", async ({
    request,
  }) => {
    const json = (await getJson(
      request,
      "/api/polis/bars?stateCode=TX&county=NeverSeen8&userConcerns=healthcare,housing",
    )) as Record<string, unknown>;

    expect(json.county).toBe("NeverSeen8");
    expect(json.threshold).toBe(BARS_PER_READING_MIN);
    expect(typeof json.count).toBe("number");
    expect(Array.isArray(json.bars)).toBe(true);

    // Privacy: response keys are allowlisted.
    const allowed = new Set([
      "scope",
      "county",
      "threshold",
      "count",
      "status",
      "bars",
    ]);
    for (const key of Object.keys(json)) {
      expect(allowed.has(key)).toBe(true);
    }
  });

  test("GET /api/polis/bars — returns 400 when scope=county lacks stateCode", async ({
    request,
  }) => {
    // Post PR 10: no params defaults to scope=national (no stateCode required).
    // Explicit scope=county still requires stateCode + county.
    const res = await request.get(
      "/api/polis/bars?scope=county&county=Travis&userConcerns=healthcare",
    );
    expect(res.status()).toBe(400);
  });

  test("GET /api/polis/bridges — shape-correct empty (no-bridges-yet OR below-threshold)", async ({
    request,
  }) => {
    const json = (await getJson(
      request,
      "/api/polis/bridges?stateCode=TX&county=NeverSeen8",
    )) as Record<string, unknown>;

    expect(json.county).toBe("NeverSeen8");
    expect(json.threshold).toBe(BARS_PER_READING_MIN);
    expect(Array.isArray(json.bridges)).toBe(true);
    // v1: bridges array is empty.
    expect((json.bridges as unknown[]).length).toBe(0);

    const allowed = new Set([
      "scope",
      "county",
      "threshold",
      "count",
      "status",
      "bridges",
    ]);
    for (const key of Object.keys(json)) {
      expect(allowed.has(key)).toBe(true);
    }
  });

  test("GET /api/polis/compass — v1 always returns below_threshold sentinel", async ({
    request,
  }) => {
    const json = (await getJson(
      request,
      "/api/polis/compass?stateCode=TX&county=NeverSeen8",
    )) as Record<string, unknown>;

    expect(json.county).toBe("NeverSeen8");
    expect(json.threshold).toBe(COMPASS_DEFAULT_THRESHOLD);
    expect(json.status).toBe("below_threshold");
    expect(json.clusters).toEqual([]);
    expect(json.dots).toEqual([]);

    const allowed = new Set([
      "scope",
      "county",
      "threshold",
      "count",
      "status",
      "clusters",
      "dots",
    ]);
    for (const key of Object.keys(json)) {
      expect(allowed.has(key)).toBe(true);
    }
  });

  test("Polis endpoints never leak identity-shaped keys in any response", async ({
    request,
  }) => {
    const forbidden = ["user_id", "session_id", "name", "address", "email"];
    const endpoints = [
      "/api/polis/bars?stateCode=TX&county=NeverSeen8&userConcerns=healthcare",
      "/api/polis/bridges?stateCode=TX&county=NeverSeen8",
      "/api/polis/compass?stateCode=TX&county=NeverSeen8",
    ];
    for (const endpoint of endpoints) {
      const json = (await getJson(request, endpoint)) as Record<
        string,
        unknown
      >;
      const allKeys = new Set<string>();
      const walk = (v: unknown) => {
        if (v && typeof v === "object" && !Array.isArray(v)) {
          for (const k of Object.keys(v as Record<string, unknown>)) {
            allKeys.add(k);
            walk((v as Record<string, unknown>)[k]);
          }
        } else if (Array.isArray(v)) {
          for (const item of v) walk(item);
        }
      };
      walk(json);
      for (const k of forbidden) {
        expect(allKeys.has(k)).toBe(false);
      }
    }
  });
});
