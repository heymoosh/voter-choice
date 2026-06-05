/**
 * Unit tests for the Textract large-format fallback path.
 *
 * Tests mock @aws-sdk/client-textract and the Anthropic SDK — no live
 * AWS or Sonnet calls are made.
 *
 * Coverage:
 *   1. large-format ballot → routes to Textract path
 *   2. multi-page ballot → per-page Textract + Sonnet, results stitched (no crash)
 *   3. single-page overflow → degrades to vision fallback (no crash)
 *   4. low_confidence flag → set for large-format extractions in extract-types
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Block } from "@aws-sdk/client-textract";

// ---------- Mocks ----------

// Mock the Textract SDK before importing the module under test.
vi.mock("@aws-sdk/client-textract", () => {
  const AnalyzeDocumentCommand = vi.fn().mockImplementation((input: unknown) => ({
    input,
    __type: "AnalyzeDocumentCommand",
  }));

  const TextractClient = vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  }));

  return { AnalyzeDocumentCommand, TextractClient };
});

// The Anthropic SDK is also mocked to avoid real calls.
vi.mock("@anthropic-ai/sdk", () => {
  const Anthropic = vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn(),
    },
  }));
  return { default: Anthropic };
});

import { TextractClient, AnalyzeDocumentCommand } from "@aws-sdk/client-textract";
import Anthropic from "@anthropic-ai/sdk";
import {
  extractWithTextract,
  getTextractClient,
  TEXTRACT_COST_PER_PAGE_USD,
} from "./extract-textract";
import { isLargeFormatPage } from "./extract-sampler";
import { toPublicExtractMeta } from "./extract-types";
import type { PageImage, PageVisionResult } from "./extract-vision";

// ---------- Helpers ----------

function makePageImage(pageIndex: number): PageImage {
  return { pageIndex, pngBuffer: Buffer.from("fake-png") };
}

/** Minimal lean-block JSON that Sonnet would receive */
function makeLineBlock(text: string, pageIndex: number): Block {
  return {
    BlockType: "LINE",
    Id: `id-${text}-${pageIndex}`,
    Text: text,
    Page: pageIndex,
  };
}

const FAKE_PAGE_EXTRACTION = {
  election_metadata: {
    election_date: "2026-06-02",
    election_type: "primary" as const,
    jurisdiction: "Camden County, NJ",
  },
  sections: [
    {
      section_name: "State",
      races: [
        {
          office: "State Senate",
          vote_for_n: 1,
          party_context: "Republican Primary" as const,
          candidates: [
            { name: "Lebovics", party: null, placeholder_reason: null },
            { name: "Murphy", party: null, placeholder_reason: null },
            { name: "Zdan", party: null, placeholder_reason: null },
            { name: "Tabor", party: null, placeholder_reason: null },
          ],
        },
      ],
    },
  ],
};

const FAKE_SONNET_RESPONSE = JSON.stringify(FAKE_PAGE_EXTRACTION);

function makeAnthropicMock(responseText: string) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: responseText }],
        usage: { input_tokens: 1000, output_tokens: 500 },
      }),
    },
  };
}

function makeTextractMock(blocks: Block[]) {
  return {
    send: vi.fn().mockResolvedValue({ Blocks: blocks }),
  };
}

function makeVisionFallback(): (p: PageImage) => Promise<PageVisionResult> {
  return vi.fn().mockResolvedValue({
    page: { election_metadata: {}, sections: [] },
    inputTokens: 200,
    outputTokens: 100,
    attempts: 1,
    outcome: "success" as const,
  });
}

// ---------- Tests ----------

describe("isLargeFormatPage", () => {
  it("returns true for oversized pages (>1M pt² logical area)", () => {
    // 17.5" × 23" trifold at 72dpi = 1260×1656 pt logical. At scale 2.0:
    // widthPx=2520, heightPx=3312, scale=2.0 → logical = 1260×1656 ≈ 2.09M
    expect(isLargeFormatPage(2520, 3312, 2.0)).toBe(true);
  });

  it("returns false for letter-size pages (~612×792 pt logical)", () => {
    // Letter at scale 2.0: widthPx=1224, heightPx=1584
    expect(isLargeFormatPage(1224, 1584, 2.0)).toBe(false);
  });

  it("returns false for tabloid-size pages (~792×1224 pt logical)", () => {
    // Tabloid at scale 2.0: widthPx=1584, heightPx=2448
    // 792×1224 = 969_408 < 1_000_000 → false (borderline)
    expect(isLargeFormatPage(1584, 2448, 2.0)).toBe(false);
  });
});

describe("extractWithTextract", () => {
  it("extracts a single large-format page and returns structured data", async () => {
    const textractClient = makeTextractMock([
      makeLineBlock("State Senate", 1),
      makeLineBlock("LEBOVICS", 1),
      makeLineBlock("MURPHY", 1),
    ]) as unknown as InstanceType<typeof TextractClient>;

    const anthropicClient = makeAnthropicMock(
      FAKE_SONNET_RESPONSE,
    ) as unknown as Anthropic;

    const pages = [makePageImage(1)];
    const visionFallback = makeVisionFallback();

    const result = await extractWithTextract(
      textractClient,
      anthropicClient,
      pages,
      visionFallback,
    );

    expect(result.overallOutcome).toBe("success");
    expect(result.pageResults).toHaveLength(1);
    expect(result.pageResults[0].outcome).toBe("success");
    expect(result.pageResults[0].page.sections).toHaveLength(1);
    expect(result.pageResults[0].page.sections[0].races[0].candidates).toHaveLength(4);
    // Vision fallback should NOT have been called for a normal-size page
    expect(visionFallback).not.toHaveBeenCalled();
  });

  it("processes multi-page ballot per-page and stitches without crashing", async () => {
    const textractClient = makeTextractMock([
      makeLineBlock("US Senate", 1),
    ]) as unknown as InstanceType<typeof TextractClient>;

    const anthropicClient = {
      messages: {
        create: vi
          .fn()
          .mockResolvedValueOnce({
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  election_metadata: {
                    election_date: "2026-06-02",
                    election_type: "primary",
                    jurisdiction: "Camden County, NJ",
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
                              name: "Alice",
                              party: null,
                              placeholder_reason: null,
                            },
                          ],
                        },
                      ],
                    },
                  ],
                }),
              },
            ],
            usage: { input_tokens: 800, output_tokens: 300 },
          })
          .mockResolvedValueOnce({
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  election_metadata: { election_date: "", election_type: "primary", jurisdiction: "" },
                  sections: [
                    {
                      section_name: "State",
                      races: [
                        {
                          office: "Governor",
                          vote_for_n: 1,
                          party_context: null,
                          candidates: [
                            {
                              name: "Bob",
                              party: null,
                              placeholder_reason: null,
                            },
                          ],
                        },
                      ],
                    },
                  ],
                }),
              },
            ],
            usage: { input_tokens: 900, output_tokens: 350 },
          }),
      },
    } as unknown as Anthropic;

    const pages = [makePageImage(1), makePageImage(2)];
    const visionFallback = makeVisionFallback();

    const result = await extractWithTextract(
      textractClient,
      anthropicClient,
      pages,
      visionFallback,
    );

    expect(result.overallOutcome).toBe("success");
    expect(result.pageResults).toHaveLength(2);
    expect(result.pageResults[0].outcome).toBe("success");
    expect(result.pageResults[1].outcome).toBe("success");
    expect(result.totalInputTokens).toBe(1700);
    expect(result.totalOutputTokens).toBe(650);
    // Both pages succeeded — no vision fallback called.
    expect(visionFallback).not.toHaveBeenCalled();
  });

  it("degrades to vision fallback on overflow without crashing", async () => {
    // Build a Textract mock that returns a huge number of blocks to trigger
    // the TEXTRACT_SAFE_CHARS limit (480_000 chars).
    // Each block with a 1000-char text: need ~480 blocks.
    const hugeBlocks: Block[] = Array.from({ length: 600 }, (_, i) => ({
      BlockType: "LINE",
      Id: `id-${i}`,
      Text: "X".repeat(900), // ~900 chars per block in JSON
      Page: 1,
    }));

    const textractClient = makeTextractMock(
      hugeBlocks,
    ) as unknown as InstanceType<typeof TextractClient>;
    const anthropicClient = makeAnthropicMock(
      FAKE_SONNET_RESPONSE,
    ) as unknown as Anthropic;

    const pages = [makePageImage(1)];
    const visionFallback = makeVisionFallback();

    const result = await extractWithTextract(
      textractClient,
      anthropicClient,
      pages,
      visionFallback,
    );

    // Should not crash; vision fallback took over for the overflowed page.
    expect(result.overallOutcome).toBe("success");
    expect(result.pageResults[0].outcome).toBe("overflow_vision_fallback");
    // Vision fallback WAS called.
    expect(visionFallback).toHaveBeenCalledOnce();
    // Sonnet post-processor was NOT called (overflow skipped it).
    expect(anthropicClient.messages.create).not.toHaveBeenCalled();
  });

  it("returns failed outcome when Textract throws a hard error", async () => {
    const textractClient = {
      send: vi.fn().mockRejectedValue(
        Object.assign(new Error("ValidationException"), {
          name: "ValidationException",
        }),
      ),
    } as unknown as InstanceType<typeof TextractClient>;

    const anthropicClient = makeAnthropicMock("{}") as unknown as Anthropic;
    const pages = [makePageImage(1)];
    const visionFallback = makeVisionFallback();

    const result = await extractWithTextract(
      textractClient,
      anthropicClient,
      pages,
      visionFallback,
    );

    expect(result.overallOutcome).toBe("failed");
    expect(result.pageResults[0].outcome).toBe("failed");
    expect(result.pageResults[0].error).toContain("ValidationException");
  });

  it("returns empty result on empty pages array", async () => {
    const textractClient = makeTextractMock([]) as unknown as InstanceType<
      typeof TextractClient
    >;
    const anthropicClient = makeAnthropicMock("{}") as unknown as Anthropic;
    const visionFallback = makeVisionFallback();

    const result = await extractWithTextract(
      textractClient,
      anthropicClient,
      [],
      visionFallback,
    );

    expect(result.overallOutcome).toBe("failed");
    expect(result.pageResults).toHaveLength(0);
  });
});

describe("getTextractClient", () => {
  it("throws when AWS credentials are absent", () => {
    const origKey = process.env.AWS_ACCESS_KEY_ID;
    const origSecret = process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    expect(() => getTextractClient()).toThrow(/Missing AWS credentials/);
    if (origKey !== undefined) process.env.AWS_ACCESS_KEY_ID = origKey;
    if (origSecret !== undefined) process.env.AWS_SECRET_ACCESS_KEY = origSecret;
  });
});

describe("confidence flag (extract-types)", () => {
  it("toPublicExtractMeta includes low_confidence=true when set", () => {
    const meta = {
      extraction_path: "textract" as const,
      pages: 1,
      latency_ms: 500,
      cost_usd: 0.065,
      low_confidence: true,
    };
    const pub = toPublicExtractMeta(meta);
    expect(pub.low_confidence).toBe(true);
  });

  it("toPublicExtractMeta omits low_confidence when not set", () => {
    const meta = {
      extraction_path: "vision" as const,
      pages: 1,
      latency_ms: 400,
      cost_usd: 0.003,
    };
    const pub = toPublicExtractMeta(meta);
    expect(pub.low_confidence).toBeUndefined();
  });

  it("toPublicExtractMeta omits low_confidence when false", () => {
    const meta = {
      extraction_path: "vision" as const,
      pages: 1,
      latency_ms: 400,
      cost_usd: 0.003,
      low_confidence: false,
    };
    const pub = toPublicExtractMeta(meta);
    // `if (meta.low_confidence)` → falsy branch → not copied.
    expect(pub.low_confidence).toBeUndefined();
  });

  it("TEXTRACT_COST_PER_PAGE_USD is $0.065", () => {
    expect(TEXTRACT_COST_PER_PAGE_USD).toBeCloseTo(0.065, 6);
  });
});
