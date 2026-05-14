/**
 * Tests for scripts/ingest/tag-bills.ts
 *
 * Pattern mirrors federal-votes.test.ts / state-votes.test.ts:
 *   - Mock the Anthropic client (no real API calls)
 *   - Mock the DB client (no real DB connections)
 *   - Test pure logic functions directly
 *   - Test the integration path via processBill / tagBills
 */

import {
  describe,
  expect,
  it,
  vi,
  beforeEach,
  type MockInstance,
} from "vitest";
import {
  TAGGER_VERSION,
  buildSystemPrompt,
  buildBillPrompt,
  parseAndValidateTags,
  estimateCost,
  resolveTagBillsConfig,
  tagBill,
  processBill,
  fetchUntaggedBills,
  upsertTags,
  tagBills,
  type BillRow,
  type TaggerCounts,
} from "./tag-bills";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const BILL_A: BillRow = {
  id: "govtrack-hr1-119",
  title: "Affordable Healthcare Expansion Act",
  summary: "This bill expands Medicaid eligibility and subsidizes premiums.",
  jurisdiction: "federal-house",
};

const BILL_PROCEDURAL: BillRow = {
  id: "govtrack-hr2-119",
  title: "Motion to Table",
  summary: null,
  jurisdiction: "federal-house",
};

const BILL_NO_TITLE: BillRow = {
  id: "govtrack-hr3-119",
  title: "",
  summary: null,
  jurisdiction: "federal-house",
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
      input_tokens: opts?.inputTokens ?? 100,
      cache_read_input_tokens: opts?.cachedTokens ?? 0,
      output_tokens: opts?.outputTokens ?? 50,
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
function makeDbClient(opts?: { selectRows?: BillRow[]; insertError?: Error }) {
  const selectRows = opts?.selectRows ?? [];
  const insertError = opts?.insertError;

  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(selectRows),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: insertError
          ? vi.fn().mockRejectedValue(insertError)
          : vi.fn().mockResolvedValue(undefined),
      }),
    }),
  } as unknown as import("../../db/client").DbClient;
}

// ---------------------------------------------------------------------------
// Unit: system prompt
// ---------------------------------------------------------------------------

describe("buildSystemPrompt", () => {
  it("includes all canonical issue ids", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("healthcare_affordability");
    expect(prompt).toContain("border_security");
    expect(prompt).toContain("reproductive_rights");
    expect(prompt).toContain("gun_rights_safety");
  });

  it("instructs Claude to return empty array for procedural bills", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("EMPTY array");
    expect(prompt).toContain("procedural");
  });

  it("describes the stance_lens semantics", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("in_favor");
    expect(prompt).toContain("opposed");
    expect(prompt).toContain("YEA");
  });
});

// ---------------------------------------------------------------------------
// Unit: buildBillPrompt
// ---------------------------------------------------------------------------

describe("buildBillPrompt", () => {
  it("includes title, jurisdiction, and summary", () => {
    const prompt = buildBillPrompt(BILL_A);
    expect(prompt).toContain(BILL_A.title);
    expect(prompt).toContain(BILL_A.jurisdiction);
    expect(prompt).toContain("Medicaid");
  });

  it("falls back gracefully when summary is null", () => {
    const prompt = buildBillPrompt(BILL_PROCEDURAL);
    expect(prompt).toContain("no summary available");
  });

  it("truncates very long summaries", () => {
    const longSummary = "x".repeat(10_000);
    const prompt = buildBillPrompt({ ...BILL_A, summary: longSummary });
    // 4000 chars max + surrounding text; the whole prompt is well under 5000.
    expect(prompt.length).toBeLessThan(5500);
  });
});

// ---------------------------------------------------------------------------
// Unit: parseAndValidateTags
// ---------------------------------------------------------------------------

describe("parseAndValidateTags", () => {
  it("returns valid tags from well-formed JSON", () => {
    const json = JSON.stringify([
      {
        canonical_issue: "healthcare_affordability",
        stance_lens: "in_favor",
        confidence: 0.92,
      },
      {
        canonical_issue: "economy_jobs",
        stance_lens: "opposed",
        confidence: 0.71,
      },
    ]);
    const tags = parseAndValidateTags(json, "bill-1");
    expect(tags).toHaveLength(2);
    expect(tags[0]).toEqual({
      canonicalIssue: "healthcare_affordability",
      stanceLens: "in_favor",
      confidence: 0.92,
    });
    expect(tags[1]).toEqual({
      canonicalIssue: "economy_jobs",
      stanceLens: "opposed",
      confidence: 0.71,
    });
  });

  it("returns empty array for malformed JSON — no crash", () => {
    const tags = parseAndValidateTags("this is not json {{{", "bill-1");
    expect(tags).toHaveLength(0);
  });

  it("returns empty array when response is not an array", () => {
    const tags = parseAndValidateTags(
      '{"canonical_issue":"healthcare_affordability"}',
      "bill-1",
    );
    expect(tags).toHaveLength(0);
  });

  it("drops entries with unknown canonical_issue, keeps valid ones", () => {
    const json = JSON.stringify([
      {
        canonical_issue: "healthcare_affordability",
        stance_lens: "in_favor",
        confidence: 0.85,
      },
      {
        canonical_issue: "unicorn_policy",
        stance_lens: "in_favor",
        confidence: 0.9,
      },
    ]);
    const tags = parseAndValidateTags(json, "bill-1");
    expect(tags).toHaveLength(1);
    expect(tags[0].canonicalIssue).toBe("healthcare_affordability");
  });

  it("drops entries with invalid stance_lens", () => {
    const json = JSON.stringify([
      {
        canonical_issue: "healthcare_affordability",
        stance_lens: "neutral",
        confidence: 0.85,
      },
      {
        canonical_issue: "border_security",
        stance_lens: "in_favor",
        confidence: 0.9,
      },
    ]);
    const tags = parseAndValidateTags(json, "bill-1");
    expect(tags).toHaveLength(1);
    expect(tags[0].canonicalIssue).toBe("border_security");
  });

  it("clamps confidence > 1.0 instead of dropping", () => {
    const json = JSON.stringify([
      {
        canonical_issue: "healthcare_affordability",
        stance_lens: "in_favor",
        confidence: 1.0001,
      },
    ]);
    const tags = parseAndValidateTags(json, "bill-1");
    expect(tags).toHaveLength(1);
    expect(tags[0].confidence).toBe(1);
  });

  it("drops entries with non-numeric confidence", () => {
    const json = JSON.stringify([
      {
        canonical_issue: "healthcare_affordability",
        stance_lens: "in_favor",
        confidence: "high",
      },
    ]);
    const tags = parseAndValidateTags(json, "bill-1");
    expect(tags).toHaveLength(0);
  });

  it("returns empty array when Claude returns empty array — that is fine", () => {
    const tags = parseAndValidateTags("[]", "bill-1");
    expect(tags).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Unit: estimateCost
// ---------------------------------------------------------------------------

describe("estimateCost", () => {
  it("returns zero cost for zero tokens", () => {
    const { estimatedUsd } = estimateCost(0, 0, 0);
    expect(estimatedUsd).toBe(0);
  });

  it("prices cached tokens at 10% of input rate", () => {
    const fullCost = estimateCost(1_000_000, 0, 0);
    const cachedCost = estimateCost(1_000_000, 1_000_000, 0);
    // cachedCost should be 10% of fullCost (all tokens cached).
    expect(cachedCost.estimatedUsd).toBeCloseTo(fullCost.estimatedUsd * 0.1, 4);
  });
});

// ---------------------------------------------------------------------------
// Unit: resolveTagBillsConfig
// ---------------------------------------------------------------------------

describe("resolveTagBillsConfig", () => {
  it("defaults to 1000 bill limit", () => {
    const config = resolveTagBillsConfig(
      { ANTHROPIC_VOTER_API: "key" } as NodeJS.ProcessEnv,
      [],
    );
    expect(config.limit).toBe(1000);
  });

  it("reads --limit from argv", () => {
    const config = resolveTagBillsConfig(
      { ANTHROPIC_VOTER_API: "key" } as NodeJS.ProcessEnv,
      ["node", "script.ts", "--limit", "5"],
    );
    expect(config.limit).toBe(5);
  });

  it("reads TAGGER_BILL_LIMIT from env", () => {
    const config = resolveTagBillsConfig(
      {
        ANTHROPIC_VOTER_API: "key",
        TAGGER_BILL_LIMIT: "42",
      } as NodeJS.ProcessEnv,
      [],
    );
    expect(config.limit).toBe(42);
  });

  it("prefers --limit argv over env var", () => {
    const config = resolveTagBillsConfig(
      {
        ANTHROPIC_VOTER_API: "key",
        TAGGER_BILL_LIMIT: "200",
      } as NodeJS.ProcessEnv,
      ["node", "script.ts", "--limit", "7"],
    );
    expect(config.limit).toBe(7);
  });

  it("detects --dry-run flag", () => {
    const config = resolveTagBillsConfig(
      { ANTHROPIC_VOTER_API: "key" } as NodeJS.ProcessEnv,
      ["node", "script.ts", "--dry-run"],
    );
    expect(config.dryRun).toBe(true);
  });

  it("detects TAGGER_DRY_RUN=1 env var", () => {
    const config = resolveTagBillsConfig(
      { ANTHROPIC_VOTER_API: "key", TAGGER_DRY_RUN: "1" } as NodeJS.ProcessEnv,
      [],
    );
    expect(config.dryRun).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Integration: tagBill (single call to Anthropic)
// ---------------------------------------------------------------------------

describe("tagBill", () => {
  it("returns valid tags from a good response", async () => {
    const responseJson = JSON.stringify([
      {
        canonical_issue: "healthcare_affordability",
        stance_lens: "in_favor",
        confidence: 0.92,
      },
    ]);
    const client = makeAnthropicClient(() =>
      makeAnthropicResponse(responseJson, {
        inputTokens: 200,
        cachedTokens: 150,
        outputTokens: 40,
      }),
    );
    const systemPrompt = buildSystemPrompt();

    const result = await tagBill(BILL_A, client, systemPrompt);

    expect(result.tags).toHaveLength(1);
    expect(result.tags[0].canonicalIssue).toBe("healthcare_affordability");
    expect(result.inputTokens).toBe(200);
    expect(result.cachedTokens).toBe(150);
    expect(result.outputTokens).toBe(40);
  });

  it("passes system prompt with cache_control", async () => {
    const client = makeAnthropicClient(() => makeAnthropicResponse("[]"));
    const systemPrompt = buildSystemPrompt();

    await tagBill(BILL_A, client, systemPrompt);

    const createCall = (client.messages.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(createCall.system).toBeDefined();
    expect(createCall.system[0].cache_control).toEqual({ type: "ephemeral" });
  });
});

// ---------------------------------------------------------------------------
// Integration: processBill
// ---------------------------------------------------------------------------

describe("processBill", () => {
  function makeCounts(): TaggerCounts {
    return {
      billsQueried: 0,
      billsTagged: 0,
      billsSkipped: 0,
      tagsUpserted: 0,
      apiErrors: 0,
      dbErrors: 0,
      estimatedInputTokens: 0,
      estimatedCachedTokens: 0,
      estimatedOutputTokens: 0,
    };
  }

  it("happy path: tags two tags and upserts both", async () => {
    const responseJson = JSON.stringify([
      {
        canonical_issue: "healthcare_affordability",
        stance_lens: "in_favor",
        confidence: 0.9,
      },
      {
        canonical_issue: "economy_jobs",
        stance_lens: "opposed",
        confidence: 0.7,
      },
    ]);
    const client = makeAnthropicClient(() =>
      makeAnthropicResponse(responseJson),
    );
    const db = makeDbClient();
    const counts = makeCounts();

    await processBill(BILL_A, db, client, buildSystemPrompt(), counts, false);

    expect(counts.billsTagged).toBe(1);
    expect(counts.tagsUpserted).toBe(2);
    expect(counts.apiErrors).toBe(0);
    expect(counts.dbErrors).toBe(0);
  });

  it("skips bill with empty title — does not call Anthropic", async () => {
    const client = makeAnthropicClient(() => makeAnthropicResponse("[]"));
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
    expect(counts.billsTagged).toBe(0);
    expect(
      (client.messages.create as ReturnType<typeof vi.fn>).mock.calls,
    ).toHaveLength(0);
  });

  it("API error on one bill: that bill is skipped, no crash", async () => {
    const client = {
      messages: {
        create: vi.fn().mockRejectedValue(new Error("API timeout")),
      },
    } as unknown as import("@anthropic-ai/sdk").default;
    const db = makeDbClient();
    const counts = makeCounts();

    await processBill(BILL_A, db, client, buildSystemPrompt(), counts, false);

    expect(counts.apiErrors).toBe(1);
    expect(counts.billsSkipped).toBe(1);
    expect(counts.billsTagged).toBe(0);
  });

  it("DB upsert error: that bill is skipped, no crash", async () => {
    const responseJson = JSON.stringify([
      {
        canonical_issue: "healthcare_affordability",
        stance_lens: "in_favor",
        confidence: 0.9,
      },
    ]);
    const client = makeAnthropicClient(() =>
      makeAnthropicResponse(responseJson),
    );
    const db = makeDbClient({ insertError: new Error("DB connection lost") });
    const counts = makeCounts();

    await processBill(BILL_A, db, client, buildSystemPrompt(), counts, false);

    expect(counts.dbErrors).toBe(1);
    expect(counts.billsSkipped).toBe(1);
    expect(counts.billsTagged).toBe(0);
  });

  it("empty array response: no tags upserted, bill counted as tagged", async () => {
    const client = makeAnthropicClient(() => makeAnthropicResponse("[]"));
    const db = makeDbClient();
    const counts = makeCounts();

    await processBill(
      BILL_PROCEDURAL,
      db,
      client,
      buildSystemPrompt(),
      counts,
      false,
    );

    expect(counts.billsTagged).toBe(1);
    expect(counts.tagsUpserted).toBe(0);
  });

  it("dry run: does not call DB insert", async () => {
    const responseJson = JSON.stringify([
      {
        canonical_issue: "healthcare_affordability",
        stance_lens: "in_favor",
        confidence: 0.9,
      },
    ]);
    const client = makeAnthropicClient(() =>
      makeAnthropicResponse(responseJson),
    );
    const db = makeDbClient();
    const counts = makeCounts();

    await processBill(BILL_A, db, client, buildSystemPrompt(), counts, true);

    // tagsUpserted still counted in dry-run (for reporting), but insert never called.
    expect(db.insert).not.toHaveBeenCalled();
    expect(counts.tagsUpserted).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Integration: tagBills (full orchestration)
// ---------------------------------------------------------------------------

describe("tagBills", () => {
  it("idempotency: a bill with existing tagger_version row is not re-queried", async () => {
    // The DB mock returns no untagged bills — simulating that everything is
    // already tagged for TAGGER_VERSION.
    const db = makeDbClient({ selectRows: [] });
    const client = makeAnthropicClient(() => makeAnthropicResponse("[]"));

    const counts = await tagBills({
      db,
      client,
      env: { ANTHROPIC_VOTER_API: "test-key" } as NodeJS.ProcessEnv,
      argv: [],
    });

    expect(counts.billsQueried).toBe(0);
    expect(counts.billsTagged).toBe(0);
    expect(
      (client.messages.create as ReturnType<typeof vi.fn>).mock.calls,
    ).toHaveLength(0);
  });

  it("limit flag: passes --limit 5 and DB SELECT uses limit=5", async () => {
    const db = makeDbClient({ selectRows: [] });
    const client = makeAnthropicClient(() => makeAnthropicResponse("[]"));

    await tagBills({
      db,
      client,
      env: { ANTHROPIC_VOTER_API: "test-key" } as NodeJS.ProcessEnv,
      argv: ["node", "tag-bills.ts", "--limit", "5"],
    });

    // The limit(5) call is made inside fetchUntaggedBills. Verify via the
    // mock call chain: select().from().where().limit(5).
    const limitCall = (db.select as ReturnType<typeof vi.fn>).mock.results[0]
      ?.value?.from.mock.results[0]?.value?.where.mock.results[0]?.value?.limit;
    expect(limitCall).toHaveBeenCalledWith(5);
  });

  it("processes multiple bills: remaining bills still processed after one API error", async () => {
    const goodResponse = JSON.stringify([
      {
        canonical_issue: "border_security",
        stance_lens: "in_favor",
        confidence: 0.8,
      },
    ]);

    let callCount = 0;
    const client = {
      messages: {
        create: vi.fn().mockImplementation(() => {
          callCount += 1;
          if (callCount === 1) {
            return Promise.reject(new Error("API error on first bill"));
          }
          return Promise.resolve(makeAnthropicResponse(goodResponse));
        }),
      },
    } as unknown as import("@anthropic-ai/sdk").default;

    const twoBills: BillRow[] = [
      {
        id: "bill-fail",
        title: "Bill That Will Fail",
        summary: null,
        jurisdiction: "federal-house",
      },
      {
        id: "bill-ok",
        title: "Border Security Enhancement Act",
        summary: "Adds more agents.",
        jurisdiction: "federal-senate",
      },
    ];

    const db = makeDbClient({ selectRows: twoBills });

    const counts = await tagBills({
      db,
      client,
      env: { ANTHROPIC_VOTER_API: "test-key" } as NodeJS.ProcessEnv,
      argv: [],
    });

    expect(counts.apiErrors).toBe(1);
    expect(counts.billsTagged).toBe(1);
    expect(counts.tagsUpserted).toBe(1);
  });

  it("throws when ANTHROPIC_VOTER_API is not set", async () => {
    const db = makeDbClient();
    await expect(
      tagBills({
        db,
        client: undefined,
        env: {} as NodeJS.ProcessEnv,
        argv: [],
      }),
    ).rejects.toThrow("ANTHROPIC_VOTER_API is not set");
  });
});

// ---------------------------------------------------------------------------
// Verify TAGGER_VERSION constant shape
// ---------------------------------------------------------------------------

describe("TAGGER_VERSION", () => {
  it("follows the expected naming convention", () => {
    // Must contain model name and a date-based version suffix.
    expect(TAGGER_VERSION).toMatch(/claude-haiku-\d+-\d+/u);
    expect(TAGGER_VERSION).toContain("v1");
  });
});
