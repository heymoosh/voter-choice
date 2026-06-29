/**
 * Tests for scripts/ingest/tag-bills-batch.ts
 *
 * Focused on the collect / processResults path, specifically verifying that:
 *   - A batch result yielding zero valid tags records a skip_reason via
 *     inferSkipReason + recordSkipReason and increments billsSkipReasonWritten.
 *   - A batch result yielding valid tags does NOT record a skip_reason.
 *
 * Mocking pattern mirrors tag-bills.test.ts:
 *   - DB client is a vi.fn() stub (no real DB connections)
 *   - Anthropic client is a vi.fn() stub (no real API calls)
 */

import { describe, expect, it, vi } from "vitest";
import { processResults, type CollectCounts } from "./tag-bills-batch";

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

/**
 * Build a minimal mock of the Anthropic batches.results async iterator that
 * yields the provided result entries.
 */
function makeAnthropicClient(
  resultEntries: Array<{
    custom_id: string;
    result:
      | {
          type: "succeeded";
          message: {
            content: Array<{ type: "text"; text: string }>;
          };
        }
      | { type: "errored"; error: { type: string; message: string } }
      | { type: "canceled" }
      | { type: "expired" };
  }>,
) {
  const asyncIter = {
    [Symbol.asyncIterator]() {
      let idx = 0;
      return {
        next: async () => {
          if (idx < resultEntries.length) {
            return { value: resultEntries[idx++], done: false };
          }
          return { value: undefined, done: true };
        },
      };
    },
  };

  return {
    messages: {
      batches: {
        results: vi.fn().mockResolvedValue(asyncIter),
      },
    },
  } as unknown as import("@anthropic-ai/sdk").default;
}

/**
 * Build a minimal mock DB that records calls to execute/insert/update.
 * The execute mock returns the provided rows for SELECT queries (title lookups).
 */
function makeDbClient(opts?: {
  titleRows?: Array<{ title: string }>;
  insertError?: Error;
}) {
  const titleRows = opts?.titleRows ?? [];
  const insertError = opts?.insertError;

  return {
    execute: vi.fn().mockResolvedValue({ rows: titleRows }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: insertError
          ? vi.fn().mockRejectedValue(insertError)
          : vi.fn().mockResolvedValue(undefined),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  } as unknown as import("../../db/client").DbClient;
}

/** Build a well-formed succeeded result entry with a non-empty tag array. */
function makeSucceededWithTags(billId: string, tagsJson: string) {
  return {
    custom_id: billId,
    result: {
      type: "succeeded" as const,
      message: {
        content: [{ type: "text" as const, text: tagsJson }],
      },
    },
  };
}

/** Build a succeeded result entry that returns an empty tag array. */
function makeSucceededWithNoTags(billId: string) {
  return makeSucceededWithTags(billId, "[]");
}

// ---------------------------------------------------------------------------
// Tests: zero-tag path writes skip_reason and increments billsSkipReasonWritten
// ---------------------------------------------------------------------------

describe("processResults — zero valid tags → skip_reason recorded", () => {
  it("calls recordSkipReason (db.update) and increments billsSkipReasonWritten when result is []", async () => {
    const billId = "govtrack-hconres12-119";
    const client = makeAnthropicClient([makeSucceededWithNoTags(billId)]);
    // Simulate DB returning the bill title for the title-lookup step.
    const db = makeDbClient({
      titleRows: [{ title: "Motion to table S. 1234" }],
    });

    const counts = await processResults("batch-abc", client, db);

    // recordSkipReason calls db.update — verify it was called exactly once.
    expect(db.update).toHaveBeenCalledOnce();
    // Counter must be incremented.
    expect(counts.billsSkipReasonWritten).toBe(1);
    // Bill is still counted as "tagged" (same as realtime path for zero-tag case).
    expect(counts.billsTagged).toBe(1);
    expect(counts.tagsUpserted).toBe(0);
  });

  it("does NOT call db.update in dry-run mode but still increments billsSkipReasonWritten", async () => {
    const billId = "govtrack-hconres13-119";
    const client = makeAnthropicClient([makeSucceededWithNoTags(billId)]);
    const db = makeDbClient({
      titleRows: [{ title: "Congratulating the city of Springfield" }],
    });

    const counts = await processResults("batch-dry", client, db, true);

    // In dry-run mode recordSkipReason is a no-op for the DB call.
    expect(db.update).not.toHaveBeenCalled();
    // Counter still increments so the summary is accurate.
    expect(counts.billsSkipReasonWritten).toBe(1);
  });

  it("infers 'procedural' skip_reason when title matches procedural pattern", async () => {
    const billId = "govtrack-hconres14-119";
    const client = makeAnthropicClient([makeSucceededWithNoTags(billId)]);
    const db = makeDbClient({
      titleRows: [{ title: "Motion to table S. 5678" }],
    });

    await processResults("batch-proc", client, db);

    // The .set() call receives the skip_reason — extract it from the mock chain.
    const setCall = (db.update as ReturnType<typeof vi.fn>).mock.results[0]
      .value.set as ReturnType<typeof vi.fn>;
    expect(setCall).toHaveBeenCalledWith(
      expect.objectContaining({ skipReason: "procedural" }),
    );
  });

  it("falls back to 'non_issue' when title lookup returns no rows", async () => {
    const billId = "govtrack-hconres15-119";
    const client = makeAnthropicClient([makeSucceededWithNoTags(billId)]);
    // No title rows — simulates a missing bill row (edge case).
    const db = makeDbClient({ titleRows: [] });

    const counts = await processResults("batch-fallback", client, db);

    // Should still write a skip_reason (non_issue fallback).
    expect(db.update).toHaveBeenCalledOnce();
    expect(counts.billsSkipReasonWritten).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Tests: results WITH valid tags do NOT record skip_reason
// ---------------------------------------------------------------------------

describe("processResults — valid tags → skip_reason NOT recorded", () => {
  it("does not call db.update when result has valid tags", async () => {
    const billId = "govtrack-hr1-119";
    const tagsJson = JSON.stringify([
      {
        canonical_issue: "healthcare_affordability",
        stance_lens: "in_favor",
        confidence: 0.92,
      },
    ]);
    const client = makeAnthropicClient([
      makeSucceededWithTags(billId, tagsJson),
    ]);
    const db = makeDbClient();

    const counts = await processResults("batch-tagged", client, db);

    // No skip_reason should be written.
    expect(db.update).not.toHaveBeenCalled();
    expect(counts.billsSkipReasonWritten).toBe(0);
    expect(counts.billsTagged).toBe(1);
    expect(counts.tagsUpserted).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Tests: counter accumulates across multiple results
// ---------------------------------------------------------------------------

describe("processResults — billsSkipReasonWritten accumulates across multiple results", () => {
  it("increments billsSkipReasonWritten once per zero-tag result", async () => {
    const entries = [
      makeSucceededWithNoTags("bill-zero-1"),
      makeSucceededWithNoTags("bill-zero-2"),
      makeSucceededWithTags(
        "bill-tagged",
        JSON.stringify([
          {
            canonical_issue: "border_security",
            stance_lens: "in_favor",
            confidence: 0.8,
          },
        ]),
      ),
    ];
    const client = makeAnthropicClient(entries);
    // execute is called for each zero-tag title lookup (2 calls).
    const db = makeDbClient({
      titleRows: [{ title: "Naming the post office in Springfield" }],
    });

    const counts = await processResults("batch-multi", client, db);

    expect(counts.billsSkipReasonWritten).toBe(2);
    expect(counts.billsTagged).toBe(3);
    expect(counts.tagsUpserted).toBe(1);
    // update called twice (once per zero-tag bill).
    expect(db.update).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Tests: errored / canceled / expired results do NOT record skip_reason
// ---------------------------------------------------------------------------

describe("processResults — non-succeeded results do not record skip_reason", () => {
  it("does not record skip_reason for an errored result", async () => {
    const client = makeAnthropicClient([
      {
        custom_id: "bill-err",
        result: {
          type: "errored",
          error: { type: "server_error", message: "timeout" },
        },
      },
    ]);
    const db = makeDbClient();

    const counts = await processResults("batch-err", client, db);

    expect(db.update).not.toHaveBeenCalled();
    expect(counts.billsSkipReasonWritten).toBe(0);
    expect(counts.apiErrors).toBe(1);
  });

  it("does not record skip_reason for a canceled result", async () => {
    const client = makeAnthropicClient([
      { custom_id: "bill-canceled", result: { type: "canceled" } },
    ]);
    const db = makeDbClient();

    const counts = await processResults("batch-canceled", client, db);

    expect(db.update).not.toHaveBeenCalled();
    expect(counts.billsSkipReasonWritten).toBe(0);
    expect(counts.billsSkipped).toBe(1);
  });
});
