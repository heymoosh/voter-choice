/**
 * Tests for scripts/ingest/_audit-tags.ts
 *
 * Mocks the DB client (no real DB connections) and verifies:
 *   - Config resolution from argv
 *   - Output row shape from fetchAuditRows
 *   - Formatting helpers
 *   - Full auditTags() orchestration
 */

import { describe, expect, it, vi } from "vitest";
import {
  resolveAuditConfig,
  fetchAuditRows,
  formatAuditRow,
  printAuditResults,
  auditTags,
  type AuditRow,
  type AuditConfig,
} from "./_audit-tags";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const SAMPLE_ROWS: AuditRow[] = [
  {
    billId: "govtrack-hr1-119",
    canonicalIssue: "healthcare_affordability",
    stanceLens: "in_favor",
    confidence: "0.920",
    taggerVersion: "claude-haiku-4-5-20251001-v1",
    billTitle: "Affordable Healthcare Expansion Act",
    summaryPreview: "This bill expands Medicaid eligibility.",
  },
  {
    billId: "openstates-ocd-bill-abc-123",
    canonicalIssue: "border_security",
    stanceLens: "opposed",
    confidence: "0.750",
    taggerVersion: "claude-haiku-4-5-20251001-v1",
    billTitle: "Border Enforcement Reform Act",
    summaryPreview: "Reduces mandatory detention for asylum seekers.",
  },
];

// Minimal mock DB that returns the sample rows.
function makeDbClient(rows: AuditRow[] = SAMPLE_ROWS) {
  // We need to mock the chained Drizzle query builder.
  // fetchAuditRows calls:
  //   db.select(...).from(...).innerJoin(...).where(...).orderBy(...).limit(n)
  // or (no filter):
  //   db.select(...).from(...).innerJoin(...).orderBy(...).limit(n)
  const limitFn = vi.fn().mockResolvedValue(
    rows.map((r) => ({
      billId: r.billId,
      canonicalIssue: r.canonicalIssue,
      stanceLens: r.stanceLens,
      confidence: r.confidence,
      taggerVersion: r.taggerVersion,
      billTitle: r.billTitle,
      billSummary: r.summaryPreview,
    })),
  );
  const orderByFn = vi.fn().mockReturnValue({ limit: limitFn });
  const whereFn = vi.fn().mockReturnValue({ orderBy: orderByFn });
  const innerJoinFn = vi.fn().mockReturnValue({
    where: whereFn,
    orderBy: orderByFn,
  });
  const fromFn = vi.fn().mockReturnValue({ innerJoin: innerJoinFn });
  const selectFn = vi.fn().mockReturnValue({ from: fromFn });

  return { select: selectFn } as unknown as import("../../db/client").DbClient;
}

// ---------------------------------------------------------------------------
// Unit: resolveAuditConfig
// ---------------------------------------------------------------------------

describe("resolveAuditConfig", () => {
  it("defaults to limit=50 with no flags", () => {
    const config = resolveAuditConfig([]);
    expect(config.limit).toBe(50);
    expect(config.canonicalIssueFilter).toBeNull();
  });

  it("reads --limit from argv", () => {
    const config = resolveAuditConfig(["node", "script.ts", "--limit", "20"]);
    expect(config.limit).toBe(20);
  });

  it("reads --canonical-issue= from argv", () => {
    const config = resolveAuditConfig([
      "node",
      "script.ts",
      "--canonical-issue=healthcare_affordability",
    ]);
    expect(config.canonicalIssueFilter).toBe("healthcare_affordability");
  });

  it("parses both flags together", () => {
    const config = resolveAuditConfig([
      "node",
      "script.ts",
      "--limit",
      "10",
      "--canonical-issue=border_security",
    ]);
    expect(config.limit).toBe(10);
    expect(config.canonicalIssueFilter).toBe("border_security");
  });

  it("ignores invalid --limit and falls back to 50", () => {
    const config = resolveAuditConfig(["node", "script.ts", "--limit", "abc"]);
    expect(config.limit).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Unit: formatAuditRow
// ---------------------------------------------------------------------------

describe("formatAuditRow", () => {
  it("includes all required fields in the formatted output", () => {
    const row = SAMPLE_ROWS[0];
    const output = formatAuditRow(row, 0);
    expect(output).toContain(row.billId);
    expect(output).toContain(row.canonicalIssue);
    expect(output).toContain(row.stanceLens);
    expect(output).toContain(row.confidence!);
    expect(output).toContain(row.billTitle);
    expect(output).toContain(row.summaryPreview);
  });

  it("uses 1-based index in the output", () => {
    const output = formatAuditRow(SAMPLE_ROWS[0], 0);
    expect(output).toContain("[1]");
  });

  it("renders null confidence as (null)", () => {
    const row: AuditRow = { ...SAMPLE_ROWS[0], confidence: null };
    const output = formatAuditRow(row, 0);
    expect(output).toContain("(null)");
  });
});

// ---------------------------------------------------------------------------
// Unit: printAuditResults
// ---------------------------------------------------------------------------

describe("printAuditResults", () => {
  it("prints 'No rows found' when rows is empty", () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((msg: string) => {
      logs.push(msg);
    });

    const config: AuditConfig = { limit: 50, canonicalIssueFilter: null };
    printAuditResults([], config);

    expect(logs.some((l) => l.includes("No rows found"))).toBe(true);
    spy.mockRestore();
  });

  it("prints sampled count in footer", () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((msg: string) => {
      logs.push(msg);
    });

    const config: AuditConfig = { limit: 50, canonicalIssueFilter: null };
    printAuditResults(SAMPLE_ROWS, config);

    const footer = logs[logs.length - 1];
    expect(footer).toContain("Sampled 2 row(s)");
    spy.mockRestore();
  });

  it("includes canonical_issue filter name in footer when set", () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((msg: string) => {
      logs.push(msg);
    });

    const config: AuditConfig = {
      limit: 50,
      canonicalIssueFilter: "healthcare_affordability",
    };
    printAuditResults(SAMPLE_ROWS, config);

    const footer = logs[logs.length - 1];
    expect(footer).toContain("healthcare_affordability");
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Integration: fetchAuditRows
// ---------------------------------------------------------------------------

describe("fetchAuditRows", () => {
  it("returns rows with the expected shape", async () => {
    const db = makeDbClient();
    const config: AuditConfig = { limit: 50, canonicalIssueFilter: null };
    const rows = await fetchAuditRows(db, config);

    expect(rows).toHaveLength(SAMPLE_ROWS.length);
    expect(rows[0]).toMatchObject({
      billId: SAMPLE_ROWS[0].billId,
      canonicalIssue: SAMPLE_ROWS[0].canonicalIssue,
      stanceLens: SAMPLE_ROWS[0].stanceLens,
      billTitle: SAMPLE_ROWS[0].billTitle,
    });
  });

  it("summaryPreview is capped at 200 chars", async () => {
    const longSummary = "x".repeat(500);
    const db = makeDbClient([
      {
        ...SAMPLE_ROWS[0],
        summaryPreview: longSummary,
      },
    ]);
    // Override the mock to return a row with long summary
    const longRows = [
      {
        billId: SAMPLE_ROWS[0].billId,
        canonicalIssue: SAMPLE_ROWS[0].canonicalIssue,
        stanceLens: SAMPLE_ROWS[0].stanceLens,
        confidence: SAMPLE_ROWS[0].confidence,
        taggerVersion: SAMPLE_ROWS[0].taggerVersion,
        billTitle: SAMPLE_ROWS[0].billTitle,
        billSummary: longSummary,
      },
    ];
    const limitFn = vi.fn().mockResolvedValue(longRows);
    const orderByFn = vi.fn().mockReturnValue({ limit: limitFn });
    const innerJoinFn = vi.fn().mockReturnValue({
      orderBy: orderByFn,
      where: vi.fn().mockReturnValue({ orderBy: orderByFn }),
    });
    const fromFn = vi.fn().mockReturnValue({ innerJoin: innerJoinFn });
    const selectFn = vi.fn().mockReturnValue({ from: fromFn });
    const mockDb = {
      select: selectFn,
    } as unknown as import("../../db/client").DbClient;

    const config: AuditConfig = { limit: 50, canonicalIssueFilter: null };
    const rows = await fetchAuditRows(mockDb, config);
    expect(rows[0].summaryPreview.length).toBeLessThanOrEqual(200);
  });
});

// ---------------------------------------------------------------------------
// Integration: auditTags (full orchestration)
// ---------------------------------------------------------------------------

describe("auditTags", () => {
  it("returns the rows fetched from the DB", async () => {
    const db = makeDbClient();
    const rows = await auditTags({ db, argv: [] });
    expect(rows).toHaveLength(SAMPLE_ROWS.length);
  });

  it("passes --limit flag through to the DB query", async () => {
    const db = makeDbClient([]);
    const rows = await auditTags({
      db,
      argv: ["node", "script.ts", "--limit", "5"],
    });
    // Empty result from mock; verifying it doesn't crash with limit flag.
    expect(rows).toHaveLength(0);
  });

  it("returns empty array when DB has no matching rows", async () => {
    const db = makeDbClient([]);
    const rows = await auditTags({ db, argv: [] });
    expect(rows).toHaveLength(0);
  });
});
