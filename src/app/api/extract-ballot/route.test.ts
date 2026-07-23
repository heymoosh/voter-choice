// @vitest-environment node
// Multipart formData parsing inside JSDOM hangs; switch this single file
// to the node environment where global FormData/Blob/Request work with
// the standard fetch APIs the way the Vercel runtime does.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Hoisted mock state — `vi.mock` lifts above the imports, so the stub
// objects must be declared up here for the mock factories to capture them.
const mocks = vi.hoisted(() => {
  return {
    pdfText: { text: "", numPages: 0 },
    pdfRenderedPages: [] as Array<{
      pageIndex: number;
      width: number;
      height: number;
      pngBuffer: Buffer;
    }>,
    visionResult: {
      pageResults: [] as Array<unknown>,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalRetries: 0,
      overallOutcome: "success" as "success" | "partial" | "failed",
    },
    rateLimitAllowed: true as boolean,
    sonnetResponseText: JSON.stringify({
      election_metadata: {
        election_date: "2026-05-26",
        election_type: "primary_runoff",
        jurisdiction: "Harris County, TX",
      },
      sections: [
        {
          section_name: "Federal",
          races: [
            {
              office: "US Senate",
              vote_for_n: 1,
              party_context: null,
              candidates: [
                {
                  name: "Jane Doe",
                  party: "Democratic",
                  placeholder_reason: null,
                },
              ],
            },
          ],
        },
      ],
    }),
  };
});

vi.mock("../../../lib/server/extract-pdfjs", () => ({
  extractTextFromPdf: vi.fn(async () => mocks.pdfText),
  renderPdfPages: vi.fn(async () => mocks.pdfRenderedPages),
}));

vi.mock("../../../lib/server/extract-vision", () => ({
  extractWithVision: vi.fn(async () => mocks.visionResult),
  // The route uses the client returned here for the pdfjs cheap path's
  // Sonnet post-processor call. We return a stub whose `messages.create`
  // returns the canned text in `mocks.sonnetResponseText` (a hoisted ref,
  // so test setup can override per-case).
  getAnthropicClient: vi.fn(() => ({
    messages: {
      create: async () => ({
        content: [{ type: "text" as const, text: mocks.sonnetResponseText }],
        usage: { input_tokens: 100, output_tokens: 200 },
      }),
    },
  })),
  sonnetCostUsd: vi.fn((input: number, output: number) => {
    return (input / 1_000_000) * 3 + (output / 1_000_000) * 15;
  }),
  SONNET_MODEL: "claude-sonnet-4-5",
}));

vi.mock("../../../lib/server/rate-limit", () => ({
  checkRateLimitAsync: vi.fn(async () => ({
    allowed: mocks.rateLimitAllowed,
    ...(mocks.rateLimitAllowed ? {} : { code: "DAILY_LIMIT", error: "limit" }),
  })),
}));

const redisStub = vi.hoisted(() => {
  return {
    // hash -> serialized BallotExtraction JSON
    store: new Map<string, string>(),
    // Throw mode: simulates Upstash unavailable.
    shouldThrow: false,
    // Optional: when set, the stub treats GET/SETEX as no-op (mimics
    // unconfigured Upstash where redisCommand returns null).
    configured: true,
  };
});

vi.mock("../../../lib/server/durable-store", () => ({
  isDurableStoreConfigured: vi.fn(() => redisStub.configured),
  redisCommand: vi.fn(async (cmd: (string | number)[]) => {
    if (!redisStub.configured) return null;
    if (redisStub.shouldThrow) throw new Error("Upstash unavailable");
    const [verb, key, , value] = cmd;
    if (verb === "GET") {
      return redisStub.store.get(String(key)) ?? null;
    }
    if (verb === "SET" || verb === "SETEX") {
      redisStub.store.set(String(key), String(value));
      return "OK";
    }
    return null;
  }),
}));

import { POST } from "./route";

function makeRequest(buffer: Buffer, fileName = "test.pdf") {
  const formData = new FormData();
  const blob = new Blob([buffer], { type: "application/pdf" });
  formData.append("file", blob, fileName);
  return new NextRequest("https://example.test/api/extract-ballot", {
    method: "POST",
    headers: { host: "example.test", origin: "https://example.test" },
    body: formData,
  });
}

describe("/api/extract-ballot", () => {
  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_VOTER_API", "test-key");
    mocks.pdfText = { text: "", numPages: 0 };
    mocks.pdfRenderedPages = [];
    mocks.visionResult = {
      pageResults: [],
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalRetries: 0,
      overallOutcome: "success",
    };
    mocks.rateLimitAllowed = true;
    // Per-case isolation for the hash-based extraction cache. Without this,
    // tests that share buffer bytes ("fake-pdf") would see a stale cache hit
    // from a previous test's write.
    redisStub.store.clear();
    redisStub.shouldThrow = false;
    redisStub.configured = true;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects non-POST methods (no GET handler)", async () => {
    // Vitest can't call a non-existent GET — verify by inspecting exports.
    const mod = await import("./route");
    expect(typeof mod.POST).toBe("function");
    expect((mod as unknown as { GET?: unknown }).GET).toBeUndefined();
  });

  it("requires same-origin POST", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([Buffer.from("pdf")], { type: "application/pdf" }),
      "test.pdf",
    );
    const req = new NextRequest("https://example.test/api/extract-ballot", {
      method: "POST",
      headers: {
        host: "example.test",
        origin: "https://attacker.test",
      },
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("rejects request with no file field", async () => {
    const formData = new FormData();
    const req = new NextRequest("https://example.test/api/extract-ballot", {
      method: "POST",
      headers: { host: "example.test", origin: "https://example.test" },
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects oversize file (>10MB)", async () => {
    const tooBig = Buffer.alloc(11 * 1024 * 1024);
    const res = await POST(makeRequest(tooBig));
    expect(res.status).toBe(413);
  });

  it("routes clean text-layer PDF to pdfjs path + Sonnet post-processor", async () => {
    mocks.pdfText = {
      text: `Democratic Primary Election
        United States Senator. Vote for One.
        Jane Doe Democratic Party
        John Smith Democratic Party
        Governor. Vote for One.
        Linda Brown Democratic Party
        Carlos Martinez Democratic Party
        State Representative District 12. Vote for One.
        Susan Davis Democratic Party
        Michael Wilson Democratic Party`,
      numPages: 1,
    };
    const res = await POST(makeRequest(Buffer.from("fake-pdf")));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body._meta.extraction_path).toBe("pdfjs");
    // PR D Fix 4 — `detector_score` is server-only telemetry now; it
    // must NOT ship to the client. The pdfjs path is independently
    // proven by `extraction_path: "pdfjs"` above plus the sections
    // shape below. Detector telemetry is still emitted via the
    // `extract.detector_decision` and `extract.completed` console.log
    // events (function logs, not client).
    expect(body._meta).not.toHaveProperty("detector_score");
    expect(body._meta).not.toHaveProperty("cost_usd");
    expect(body.sections).toBeDefined();
    expect(body.sections.length).toBeGreaterThan(0);
  });

  it("escalates to vision path when pdfjs returns garbage", async () => {
    mocks.pdfText = {
      text: ")+&'% xz!? 12 ## $$$ 123 abc",
      numPages: 1,
    };
    mocks.pdfRenderedPages = [
      {
        pageIndex: 1,
        width: 100,
        height: 200,
        pngBuffer: Buffer.from("fake-png"),
      },
    ];
    mocks.visionResult = {
      pageResults: [
        {
          page: {
            election_metadata: {
              election_date: "2026-06-02",
              election_type: "primary" as const,
              jurisdiction: "Camden County, NJ",
            },
            sections: [
              {
                section_name: "Federal",
                races: [
                  {
                    office: "US Senate",
                    vote_for_n: 1,
                    party_context: "Democratic Primary",
                    candidates: [
                      {
                        name: "Cory Booker",
                        party: "Democratic",
                        placeholder_reason: null,
                      },
                    ],
                  },
                ],
              },
            ],
          },
          inputTokens: 1500,
          outputTokens: 500,
          attempts: 1,
          outcome: "success",
        },
      ],
      totalInputTokens: 1500,
      totalOutputTokens: 500,
      totalRetries: 0,
      overallOutcome: "success",
    };
    const res = await POST(makeRequest(Buffer.from("fake-pdf")));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body._meta.extraction_path).toBe("vision");
    expect(body._meta.pages).toBe(1);
    // PR D Fix 4 — `cost_usd` is server-only now (kept in the
    // `extract.completed` console.log event for tail-scraping). The
    // vision path's completion is independently proven by the sections
    // shape below.
    expect(body._meta).not.toHaveProperty("cost_usd");
    expect(body._meta).not.toHaveProperty("detector_score");
    expect(body.sections).toHaveLength(1);
    expect(body.sections[0].races[0].office).toBe("US Senate");
  });

  it("escalates to vision when pdfjs returns empty text", async () => {
    mocks.pdfText = { text: "", numPages: 1 };
    mocks.pdfRenderedPages = [
      {
        pageIndex: 1,
        width: 100,
        height: 200,
        pngBuffer: Buffer.from("png"),
      },
    ];
    mocks.visionResult = {
      pageResults: [
        {
          page: {
            election_metadata: {
              election_date: "2026-06-02",
              election_type: "primary" as const,
              jurisdiction: "NJ",
            },
            sections: [{ section_name: "Federal", races: [] }],
          },
          inputTokens: 1000,
          outputTokens: 100,
          attempts: 1,
          outcome: "success",
        },
      ],
      totalInputTokens: 1000,
      totalOutputTokens: 100,
      totalRetries: 0,
      overallOutcome: "success",
    };
    const res = await POST(makeRequest(Buffer.from("fake-pdf")));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body._meta.extraction_path).toBe("vision");
  });

  it("includes telemetry _meta fields", async () => {
    mocks.pdfText = { text: "", numPages: 2 };
    mocks.pdfRenderedPages = [
      { pageIndex: 1, width: 100, height: 200, pngBuffer: Buffer.from("p1") },
      { pageIndex: 2, width: 100, height: 200, pngBuffer: Buffer.from("p2") },
    ];
    mocks.visionResult = {
      pageResults: [
        {
          page: {
            election_metadata: {
              election_date: "2026-06-02",
              election_type: "primary" as const,
              jurisdiction: "NJ",
            },
            sections: [],
          },
          inputTokens: 1000,
          outputTokens: 100,
          attempts: 1,
          outcome: "success",
        },
        {
          page: {
            election_metadata: {},
            sections: [],
          },
          inputTokens: 1000,
          outputTokens: 100,
          attempts: 1,
          outcome: "success",
        },
      ],
      totalInputTokens: 2000,
      totalOutputTokens: 200,
      totalRetries: 0,
      overallOutcome: "success",
    };
    const res = await POST(makeRequest(Buffer.from("fake-pdf")));
    const body = await res.json();
    expect(body._meta.pages).toBe(2);
    expect(body._meta.latency_ms).toBeGreaterThanOrEqual(0);
    expect(body._meta.extraction_path).toBe("vision");
  });

  it("returns 500 on hard PDF parse failure", async () => {
    const { extractTextFromPdf } =
      await import("../../../lib/server/extract-pdfjs");
    vi.mocked(extractTextFromPdf).mockRejectedValueOnce(
      new Error("Corrupt PDF"),
    );
    const res = await POST(makeRequest(Buffer.from("not-a-pdf")));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("returns 429 when rate limit hits daily limit", async () => {
    mocks.rateLimitAllowed = false;
    const res = await POST(makeRequest(Buffer.from("pdf")));
    expect(res.status).toBe(429);
  });

  it("returns 500 when ANTHROPIC_VOTER_API is missing", async () => {
    vi.unstubAllEnvs();
    const res = await POST(makeRequest(Buffer.from("pdf")));
    expect([500, 502]).toContain(res.status);
  });

  describe("hash-based extraction cache", () => {
    beforeEach(() => {
      // Reset cache state per case.
      redisStub.store.clear();
      redisStub.shouldThrow = false;
      redisStub.configured = true;
    });

    it("second upload of the same PDF returns the cached extraction", async () => {
      // Prime the first extraction via the vision path.
      mocks.pdfText = { text: "", numPages: 1 };
      mocks.pdfRenderedPages = [
        {
          pageIndex: 1,
          width: 100,
          height: 200,
          pngBuffer: Buffer.from("png"),
        },
      ];
      mocks.visionResult = {
        pageResults: [
          {
            page: {
              election_metadata: {
                election_date: "2026-06-02",
                election_type: "primary" as const,
                jurisdiction: "Camden County, NJ",
              },
              sections: [{ section_name: "Federal", races: [] }],
            },
            inputTokens: 1000,
            outputTokens: 100,
            attempts: 1,
            outcome: "success" as const,
          },
        ],
        totalInputTokens: 1000,
        totalOutputTokens: 100,
        totalRetries: 0,
        overallOutcome: "success",
      };

      // Same buffer bytes for both calls so the hash key matches.
      const pdfBytes = Buffer.from("identical-pdf-bytes-fixture");
      const firstRes = await POST(makeRequest(pdfBytes));
      expect(firstRes.status).toBe(200);
      const firstBody = await firstRes.json();
      // First call is a miss: cache_hit either undefined or false; path is real.
      expect(firstBody._meta.cache_hit).toBeFalsy();
      expect(firstBody._meta.extraction_path).toBe("vision");

      // Allow any fire-and-forget SETEX scheduled in the route to settle.
      await new Promise((r) => setImmediate(r));

      const secondRes = await POST(makeRequest(pdfBytes));
      expect(secondRes.status).toBe(200);
      const secondBody = await secondRes.json();
      // Second call is a hit.
      expect(secondBody._meta.cache_hit).toBe(true);
      expect(secondBody._meta.extraction_path).toBe("cached");
      // The cached body preserves the original sections.
      expect(secondBody.sections).toEqual(firstBody.sections);
    });

    it("different PDF bytes do NOT collide on the cache key", async () => {
      mocks.pdfText = { text: "", numPages: 1 };
      mocks.pdfRenderedPages = [
        {
          pageIndex: 1,
          width: 100,
          height: 200,
          pngBuffer: Buffer.from("png"),
        },
      ];
      mocks.visionResult = {
        pageResults: [
          {
            page: {
              election_metadata: {
                election_date: "2026-06-02",
                election_type: "primary" as const,
                jurisdiction: "Camden County, NJ",
              },
              sections: [{ section_name: "Federal", races: [] }],
            },
            inputTokens: 1000,
            outputTokens: 100,
            attempts: 1,
            outcome: "success" as const,
          },
        ],
        totalInputTokens: 1000,
        totalOutputTokens: 100,
        totalRetries: 0,
        overallOutcome: "success",
      };

      const firstRes = await POST(makeRequest(Buffer.from("pdf-bytes-A")));
      expect(firstRes.status).toBe(200);
      const firstBody = await firstRes.json();
      expect(firstBody._meta.cache_hit).toBeFalsy();

      await new Promise((r) => setImmediate(r));

      // Different bytes → different hash → miss again.
      const secondRes = await POST(makeRequest(Buffer.from("pdf-bytes-B")));
      expect(secondRes.status).toBe(200);
      const secondBody = await secondRes.json();
      expect(secondBody._meta.cache_hit).toBeFalsy();
      expect(secondBody._meta.extraction_path).not.toBe("cached");
    });

    it("gracefully degrades when Redis throws — extraction still works", async () => {
      // Stub Upstash to error on every call (simulates outage).
      redisStub.shouldThrow = true;

      mocks.pdfText = { text: "", numPages: 1 };
      mocks.pdfRenderedPages = [
        {
          pageIndex: 1,
          width: 100,
          height: 200,
          pngBuffer: Buffer.from("png"),
        },
      ];
      mocks.visionResult = {
        pageResults: [
          {
            page: {
              election_metadata: {
                election_date: "2026-06-02",
                election_type: "primary" as const,
                jurisdiction: "Camden County, NJ",
              },
              sections: [{ section_name: "Federal", races: [] }],
            },
            inputTokens: 1000,
            outputTokens: 100,
            attempts: 1,
            outcome: "success" as const,
          },
        ],
        totalInputTokens: 1000,
        totalOutputTokens: 100,
        totalRetries: 0,
        overallOutcome: "success",
      };

      // Should not throw — the route must catch and fall through.
      const res = await POST(makeRequest(Buffer.from("any-bytes")));
      expect(res.status).toBe(200);
      const body = await res.json();
      // Real extraction ran (not cached).
      expect(body._meta.cache_hit).toBeFalsy();
      expect(body._meta.extraction_path).toBe("vision");
    });

    it("gracefully degrades when Redis is unconfigured (no env vars)", async () => {
      // Simulate dev / preview env where Upstash isn't wired at all.
      redisStub.configured = false;

      mocks.pdfText = { text: "", numPages: 1 };
      mocks.pdfRenderedPages = [
        {
          pageIndex: 1,
          width: 100,
          height: 200,
          pngBuffer: Buffer.from("png"),
        },
      ];
      mocks.visionResult = {
        pageResults: [
          {
            page: {
              election_metadata: {
                election_date: "2026-06-02",
                election_type: "primary" as const,
                jurisdiction: "Camden County, NJ",
              },
              sections: [{ section_name: "Federal", races: [] }],
            },
            inputTokens: 1000,
            outputTokens: 100,
            attempts: 1,
            outcome: "success" as const,
          },
        ],
        totalInputTokens: 1000,
        totalOutputTokens: 100,
        totalRetries: 0,
        overallOutcome: "success",
      };

      const res = await POST(
        makeRequest(Buffer.from("any-bytes-unconfigured")),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body._meta.cache_hit).toBeFalsy();
      expect(body._meta.extraction_path).toBe("vision");
    });
  });
});
