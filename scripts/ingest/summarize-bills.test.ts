/**
 * Tests for scripts/ingest/summarize-bills.ts
 *
 * Pattern mirrors tag-bills.test.ts:
 *   - Mock the Anthropic client (no real API calls)
 *   - Mock the DB client (no real DB connections)
 *   - Test pure logic functions directly
 *   - Test the integration path via processBill / summarizeBills
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildSystemPrompt,
  buildBillPrompt,
  cleanSummary,
  estimateCost,
  resolveSummarizeBillsConfig,
  summarizeBill,
  processBill,
  fetchUnsummarizedBills,
  storePlainSummary,
  summarizeBills,
  MAX_PLAIN_SUMMARY_CHARS,
  type BillRow,
  type SummarizerCounts,
} from "./summarize-bills";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const BILL_HTML: BillRow = {
  id: "govtrack-hr1-119",
  title: "Affordable Insulin Act",
  summary:
    "<p><b>Affordable Insulin Act</b></p><p>This bill caps the out-of-pocket cost of <i>insulin</i> at $35 per month for people with Medicare and private insurance.</p>",
};

const BILL_NO_TITLE: BillRow = {
  id: "govtrack-hr2-119",
  title: "",
  summary: "<p>Some summary.</p>",
};

const BILL_EMPTY_SUMMARY: BillRow = {
  id: "govtrack-hr3-119",
  title: "Empty Summary Act",
  summary: null,
};

// Minimal Anthropic-shaped response factory.
function makeAnthropicResponse(
  text: string,
  opts?: {
    inputTokens?: number;
    cachedTokens?: number;
    outputTokens?: number;
  },
) {
  return {
    content: [{ type: "text" as const, text }],
    usage: {
      input_tokens: opts?.inputTokens ?? 200,
      cache_read_input_tokens: opts?.cachedTokens ?? 0,
      output_tokens: opts?.outputTokens ?? 40,
    },
  };
}

// Minimal mock Anthropic client.
function makeAnthropicClient(createFn: () => unknown) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue(createFn()),
    },
  } as unknown as import("@anthropic-ai/sdk").default;
}

// Minimal mock DB client.
function makeDbClient(opts?: {
  executeRows?: Record<string, unknown>[];
  updateError?: Error;
}) {
  const executeRows = opts?.executeRows ?? [];
  const updateError = opts?.updateError;

  return {
    execute: vi.fn().mockResolvedValue({ rows: executeRows }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: updateError
          ? vi.fn().mockRejectedValue(updateError)
          : vi.fn().mockResolvedValue(undefined),
      }),
    }),
  } as unknown as import("../../db/client").DbClient;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Unit: prompts
// ---------------------------------------------------------------------------

describe("buildSystemPrompt", () => {
  it("encodes the user-facing spec (2 sentences, neutral, plain, char cap)", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toMatch(/at most 2 sentences/i);
    expect(prompt).toMatch(/neutral/i);
    expect(prompt).toMatch(/plain language/i);
    expect(prompt).toMatch(/240 characters/i);
  });
});

describe("buildBillPrompt", () => {
  it("HTML-strips the CRS summary before sending (no tags in the prompt)", () => {
    const prompt = buildBillPrompt(BILL_HTML);
    expect(prompt).not.toMatch(/<p>|<\/p>|<b>|<i>/);
    expect(prompt).toContain("Affordable Insulin Act");
    expect(prompt).toContain("$35 per month");
  });
});

// ---------------------------------------------------------------------------
// Unit: cleanSummary
// ---------------------------------------------------------------------------

describe("cleanSummary", () => {
  it("strips wrapping quotes the model sometimes adds", () => {
    expect(cleanSummary('"Caps insulin at $35/month."')).toBe(
      "Caps insulin at $35/month.",
    );
  });

  it("collapses whitespace", () => {
    expect(cleanSummary("Caps   insulin\n at $35.")).toBe(
      "Caps insulin at $35.",
    );
  });

  it("returns null for empty input", () => {
    expect(cleanSummary("   ")).toBeNull();
  });

  it("hard-caps over-long output on a word boundary with an ellipsis", () => {
    const long = "word ".repeat(100).trim();
    const result = cleanSummary(long)!;
    expect(result.length).toBeLessThanOrEqual(MAX_PLAIN_SUMMARY_CHARS + 1); // +1 for the ellipsis
    expect(result.endsWith("…")).toBe(true);
    expect(result).not.toMatch(/wor$/); // not cut mid-word
  });
});

// ---------------------------------------------------------------------------
// Unit: estimateCost
// ---------------------------------------------------------------------------

describe("estimateCost", () => {
  it("discounts cached input tokens to 10%", () => {
    const a = estimateCost(1000, 0, 0);
    const b = estimateCost(1000, 1000, 0);
    expect(b.estimatedUsd).toBeLessThan(a.estimatedUsd);
  });
});

// ---------------------------------------------------------------------------
// Unit: config resolution
// ---------------------------------------------------------------------------

describe("resolveSummarizeBillsConfig", () => {
  it("defaults limit to 200 and dryRun to false", () => {
    const cfg = resolveSummarizeBillsConfig({ ANTHROPIC_VOTER_API: "k" }, [
      "node",
      "script",
    ]);
    expect(cfg.limit).toBe(200);
    expect(cfg.dryRun).toBe(false);
    expect(cfg.anthropicApiKey).toBe("k");
  });

  it("honors --limit and --dry-run flags", () => {
    const cfg = resolveSummarizeBillsConfig({ ANTHROPIC_VOTER_API: "k" }, [
      "node",
      "script",
      "--limit",
      "50",
      "--dry-run",
    ]);
    expect(cfg.limit).toBe(50);
    expect(cfg.dryRun).toBe(true);
  });

  it("falls back to ANTHROPIC_API_KEY when ANTHROPIC_VOTER_API is unset", () => {
    const cfg = resolveSummarizeBillsConfig({ ANTHROPIC_API_KEY: "fallback" }, [
      "node",
      "script",
    ]);
    expect(cfg.anthropicApiKey).toBe("fallback");
  });
});

// ---------------------------------------------------------------------------
// Unit: summarizeBill (mocked LLM)
// ---------------------------------------------------------------------------

describe("summarizeBill", () => {
  it("returns the cleaned model output and token usage", async () => {
    const client = makeAnthropicClient(() =>
      makeAnthropicResponse('"Caps insulin costs at $35 a month."'),
    );
    const result = await summarizeBill(BILL_HTML, client, buildSystemPrompt());
    expect(result.summary).toBe("Caps insulin costs at $35 a month.");
    expect(result.inputTokens).toBe(200);
    expect(result.outputTokens).toBe(40);
  });

  it("returns null summary when the model emits nothing usable", async () => {
    const client = makeAnthropicClient(() => makeAnthropicResponse("   "));
    const result = await summarizeBill(BILL_HTML, client, buildSystemPrompt());
    expect(result.summary).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Integration: processBill
// ---------------------------------------------------------------------------

function makeCounts(): SummarizerCounts {
  return {
    billsQueried: 0,
    billsSummarized: 0,
    billsSkipped: 0,
    apiErrors: 0,
    dbErrors: 0,
    estimatedInputTokens: 0,
    estimatedCachedTokens: 0,
    estimatedOutputTokens: 0,
  };
}

describe("processBill", () => {
  it("generates + STORES the summary via the mocked LLM (non-dry-run)", async () => {
    const client = makeAnthropicClient(() =>
      makeAnthropicResponse("Caps insulin at $35 a month for many patients."),
    );
    const db = makeDbClient();
    const counts = makeCounts();

    await processBill(
      BILL_HTML,
      db,
      client,
      buildSystemPrompt(),
      counts,
      false,
    );

    expect(counts.billsSummarized).toBe(1);
    expect(counts.billsSkipped).toBe(0);
    // DB update was called exactly once to store plain_summary.
    expect(db.update).toHaveBeenCalledOnce();
  });

  it("does NOT write to the DB in dry-run mode", async () => {
    const client = makeAnthropicClient(() =>
      makeAnthropicResponse("Caps insulin at $35 a month for many patients."),
    );
    const db = makeDbClient();
    const counts = makeCounts();

    await processBill(BILL_HTML, db, client, buildSystemPrompt(), counts, true);

    // Counted as summarized, but storePlainSummary short-circuits before db.update.
    expect(counts.billsSummarized).toBe(1);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("skips a bill with no title without calling the LLM", async () => {
    const create = vi.fn();
    const client = {
      messages: { create },
    } as unknown as import("@anthropic-ai/sdk").default;
    const db = makeDbClient();
    const counts = makeCounts();

    await processBill(
      BILL_NO_TITLE,
      db,
      client,
      buildSystemPrompt(),
      counts,
      false,
    );

    expect(counts.billsSkipped).toBe(1);
    expect(create).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("skips a bill with an empty summary without calling the LLM", async () => {
    const create = vi.fn();
    const client = {
      messages: { create },
    } as unknown as import("@anthropic-ai/sdk").default;
    const db = makeDbClient();
    const counts = makeCounts();

    await processBill(
      BILL_EMPTY_SUMMARY,
      db,
      client,
      buildSystemPrompt(),
      counts,
      false,
    );

    expect(counts.billsSkipped).toBe(1);
    expect(create).not.toHaveBeenCalled();
  });

  it("records an api_error and skips when the LLM throws", async () => {
    const client = {
      messages: { create: vi.fn().mockRejectedValue(new Error("rate limit")) },
    } as unknown as import("@anthropic-ai/sdk").default;
    const db = makeDbClient();
    const counts = makeCounts();

    await processBill(
      BILL_HTML,
      db,
      client,
      buildSystemPrompt(),
      counts,
      false,
    );

    expect(counts.apiErrors).toBe(1);
    expect(counts.billsSkipped).toBe(1);
    expect(db.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// storePlainSummary
// ---------------------------------------------------------------------------

describe("storePlainSummary", () => {
  it("calls db.update in non-dry-run mode", async () => {
    const db = makeDbClient();
    await storePlainSummary(db, "govtrack-hr1-119", "Short summary.", false);
    expect(db.update).toHaveBeenCalledOnce();
  });

  it("skips db.update in dry-run mode", async () => {
    const db = makeDbClient();
    await storePlainSummary(db, "govtrack-hr1-119", "Short summary.", true);
    expect(db.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// fetchUnsummarizedBills — resumability (WHERE handles skipping done bills)
// ---------------------------------------------------------------------------

describe("fetchUnsummarizedBills", () => {
  it("returns the rows from the prioritized query, capped by limit", async () => {
    const db = makeDbClient({
      executeRows: [
        { id: "govtrack-hr1-119", title: "Voted Bill", summary: "<p>x</p>" },
        { id: "govtrack-hr9-119", title: "Unvoted Bill", summary: "<p>y</p>" },
      ],
    });

    const rows = await fetchUnsummarizedBills(db, 200);

    expect(rows).toHaveLength(2);
    expect(rows[0]!.id).toBe("govtrack-hr1-119");
    // Confirms execute was called (the SQL embeds the plain_summary IS NULL
    // filter + the votes-priority ordering + the limit).
    expect(db.execute).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// summarizeBills — full run (resumable / idempotent)
// ---------------------------------------------------------------------------

describe("summarizeBills", () => {
  it("throws when no API key is configured", async () => {
    const db = makeDbClient();
    await expect(
      summarizeBills({ db, env: {}, argv: ["node", "script"] }),
    ).rejects.toThrow(/ANTHROPIC_VOTER_API/);
  });

  it("is a no-op when no bills need a summary (already-done bills skipped by WHERE)", async () => {
    const db = makeDbClient({ executeRows: [] });
    const client = makeAnthropicClient(() => makeAnthropicResponse("x"));

    const counts = await summarizeBills({
      db,
      client,
      env: { ANTHROPIC_VOTER_API: "k" },
      argv: ["node", "script"],
    });

    expect(counts.billsQueried).toBe(0);
    expect(counts.billsSummarized).toBe(0);
    // No bills returned → LLM never called.
    expect(
      (client.messages.create as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBe(0);
  });

  it("summarizes + stores all queued bills via the mocked LLM", async () => {
    const db = makeDbClient({
      executeRows: [
        { id: "govtrack-hr1-119", title: "Bill One", summary: "<p>one</p>" },
        { id: "govtrack-hr2-119", title: "Bill Two", summary: "<p>two</p>" },
      ],
    });
    const client = makeAnthropicClient(() =>
      makeAnthropicResponse("A short, plain summary of the bill."),
    );

    const counts = await summarizeBills({
      db,
      client,
      env: { ANTHROPIC_VOTER_API: "k" },
      argv: ["node", "script"],
    });

    expect(counts.billsQueried).toBe(2);
    expect(counts.billsSummarized).toBe(2);
    expect(db.update).toHaveBeenCalledTimes(2);
  });

  it("dry-run generates but writes nothing to the DB", async () => {
    const db = makeDbClient({
      executeRows: [
        { id: "govtrack-hr1-119", title: "Bill One", summary: "<p>one</p>" },
      ],
    });
    const client = makeAnthropicClient(() =>
      makeAnthropicResponse("A short, plain summary of the bill."),
    );

    const counts = await summarizeBills({
      db,
      client,
      env: { ANTHROPIC_VOTER_API: "k" },
      argv: ["node", "script", "--dry-run"],
    });

    expect(counts.billsSummarized).toBe(1);
    // LLM was still called (we generate, we just don't store).
    expect(
      (client.messages.create as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBe(1);
    expect(db.update).not.toHaveBeenCalled();
  });
});
