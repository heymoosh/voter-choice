/**
 * src/lib/server/promises.test.ts
 *
 * Tests for the Part 5 promise-ledger read layer: top-issue ranking +
 * capping, promise-detail assembly with latest-verdict selection and linked
 * actions, the verbatim promiseText contract, presence-gating (absent
 * rather than a fabricated empty), and graceful degradation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../db/client", () => {
  const DB_NOT_CONFIGURED = "DB_NOT_CONFIGURED" as const;
  return { getDb: vi.fn(), DB_NOT_CONFIGURED };
});

import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import {
  lookupCandidateTopIssues,
  lookupCandidatePromises,
  MAX_TOP_ISSUES,
} from "./promises";

const mockedGetDb = vi.mocked(getDb);

/** Thenable chain resolving `rows` for a select/from/where[/groupBy|orderBy] shape. */
function chainResolving(rows: unknown[], methods: string[]) {
  const chain: Record<string, unknown> = {};
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  (chain as { then?: unknown }).then = (resolve: (v: unknown[]) => void) =>
    resolve(rows);
  return chain;
}

function topIssuesDbMock(rows: unknown[]) {
  return {
    select: vi
      .fn()
      .mockReturnValue(chainResolving(rows, ["from", "where", "groupBy"])),
  } as unknown as ReturnType<typeof getDb>;
}

function promiseDetailDbMock(opts: {
  promises: unknown[];
  verdicts?: unknown[];
  actions?: unknown[];
}) {
  const chains = [
    chainResolving(opts.promises, ["from", "where"]),
    chainResolving(opts.verdicts ?? [], ["from", "where", "orderBy"]),
    chainResolving(opts.actions ?? [], ["from", "where"]),
  ];
  let call = 0;
  return {
    select: vi.fn().mockImplementation(() => chains[call++]),
  } as unknown as ReturnType<typeof getDb>;
}

function topIssueRow(overrides: Record<string, unknown> = {}) {
  return {
    candidateId: "federal-A",
    canonicalIssue: "healthcare_affordability",
    promiseCount: 3,
    ...overrides,
  };
}

function promiseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "promise-1",
    candidateId: "federal-A",
    canonicalIssue: "healthcare_affordability",
    subIssue: null,
    promiseText: "I will vote no on any bill cutting Medicaid eligibility.",
    madeAt: "2026-03-01",
    venue: "campaign_site",
    sourceUrl: "https://example.com/platform",
    archiveUrl:
      "https://web.archive.org/web/20260301/https://example.com/platform",
    extractionModelVersion: "v1",
    promiseType: "vote",
    conditionsDeadline: null,
    createdAt: new Date("2026-03-02T00:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// lookupCandidateTopIssues
// ---------------------------------------------------------------------------

describe("lookupCandidateTopIssues", () => {
  it("returns an empty map when DB is not configured", async () => {
    mockedGetDb.mockReturnValue(DB_NOT_CONFIGURED);
    expect((await lookupCandidateTopIssues(["federal-A"])).size).toBe(0);
  });

  it("returns an empty map for an empty id list without touching the DB", async () => {
    expect((await lookupCandidateTopIssues([])).size).toBe(0);
    expect(mockedGetDb).not.toHaveBeenCalled();
  });

  it("degrades to an empty map when the query throws (table missing)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const chain: Record<string, unknown> = {};
    for (const m of ["from", "where"])
      chain[m] = vi.fn().mockReturnValue(chain);
    chain.groupBy = vi
      .fn()
      .mockRejectedValue(
        new Error('relation "candidate_promises" does not exist'),
      );
    mockedGetDb.mockReturnValue({
      select: vi.fn().mockReturnValue(chain),
    } as unknown as ReturnType<typeof getDb>);

    expect((await lookupCandidateTopIssues(["federal-A"])).size).toBe(0);
    consoleSpy.mockRestore();
  });

  it("ranks by promise count, highest first", async () => {
    mockedGetDb.mockReturnValue(
      topIssuesDbMock([
        topIssueRow({ canonicalIssue: "border_security", promiseCount: 1 }),
        topIssueRow({
          canonicalIssue: "healthcare_affordability",
          promiseCount: 5,
        }),
        topIssueRow({ canonicalIssue: "economy_jobs", promiseCount: 2 }),
      ]),
    );
    const list = (await lookupCandidateTopIssues(["federal-A"])).get(
      "federal-A",
    )!;
    expect(list.map((i) => i.canonicalIssue)).toEqual([
      "healthcare_affordability",
      "economy_jobs",
      "border_security",
    ]);
  });

  it("breaks ties alphabetically for determinism", async () => {
    mockedGetDb.mockReturnValue(
      topIssuesDbMock([
        topIssueRow({ canonicalIssue: "economy_jobs", promiseCount: 2 }),
        topIssueRow({ canonicalIssue: "border_security", promiseCount: 2 }),
      ]),
    );
    const list = (await lookupCandidateTopIssues(["federal-A"])).get(
      "federal-A",
    )!;
    expect(list.map((i) => i.canonicalIssue)).toEqual([
      "border_security",
      "economy_jobs",
    ]);
  });

  it(`caps at MAX_TOP_ISSUES (${MAX_TOP_ISSUES})`, async () => {
    mockedGetDb.mockReturnValue(
      topIssuesDbMock([
        topIssueRow({ canonicalIssue: "a_issue", promiseCount: 4 }),
        topIssueRow({ canonicalIssue: "b_issue", promiseCount: 3 }),
        topIssueRow({ canonicalIssue: "c_issue", promiseCount: 2 }),
        topIssueRow({ canonicalIssue: "d_issue", promiseCount: 1 }),
      ]),
    );
    const list = (await lookupCandidateTopIssues(["federal-A"])).get(
      "federal-A",
    )!;
    expect(list).toHaveLength(MAX_TOP_ISSUES);
    expect(list.map((i) => i.canonicalIssue)).toEqual([
      "a_issue",
      "b_issue",
      "c_issue",
    ]);
  });

  it("splits rows by candidate", async () => {
    mockedGetDb.mockReturnValue(
      topIssuesDbMock([
        topIssueRow({ candidateId: "federal-A" }),
        topIssueRow({
          candidateId: "federal-B",
          canonicalIssue: "economy_jobs",
        }),
      ]),
    );
    const map = await lookupCandidateTopIssues(["federal-A", "federal-B"]);
    expect(map.get("federal-A")![0]!.canonicalIssue).toBe(
      "healthcare_affordability",
    );
    expect(map.get("federal-B")![0]!.canonicalIssue).toBe("economy_jobs");
  });

  it("omits candidates with no promises — presence-gated, never a fabricated empty", async () => {
    mockedGetDb.mockReturnValue(topIssuesDbMock([]));
    const map = await lookupCandidateTopIssues(["federal-A"]);
    expect(map.has("federal-A")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// lookupCandidatePromises
// ---------------------------------------------------------------------------

describe("lookupCandidatePromises", () => {
  it("returns [] when DB is not configured", async () => {
    mockedGetDb.mockReturnValue(DB_NOT_CONFIGURED);
    expect(await lookupCandidatePromises("federal-A")).toEqual([]);
  });

  it("degrades to [] when the promise query throws", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockedGetDb.mockReturnValue({
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error("relation missing")),
        }),
      })),
    } as unknown as ReturnType<typeof getDb>);

    expect(await lookupCandidatePromises("federal-A")).toEqual([]);
    consoleSpy.mockRestore();
  });

  it("returns [] for a candidate with no rows without querying verdicts/actions", async () => {
    const db = promiseDetailDbMock({ promises: [] });
    mockedGetDb.mockReturnValue(db);
    expect(await lookupCandidatePromises("federal-unknown")).toEqual([]);
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("returns the promise text VERBATIM and every declared-test field", async () => {
    mockedGetDb.mockReturnValue(
      promiseDetailDbMock({ promises: [promiseRow()] }),
    );
    const [entry] = await lookupCandidatePromises("federal-A");
    expect(entry).toMatchObject({
      id: "promise-1",
      canonicalIssue: "healthcare_affordability",
      subIssue: null,
      promiseText: "I will vote no on any bill cutting Medicaid eligibility.",
      promiseType: "vote",
      conditionsDeadline: null,
      venue: "campaign_site",
      madeAt: "2026-03-01",
      sourceUrl: "https://example.com/platform",
      archiveUrl:
        "https://web.archive.org/web/20260301/https://example.com/platform",
      verdict: null,
      actions: [],
    });
  });

  it("attaches the LATEST verdict by adjudicatedAt when several exist", async () => {
    mockedGetDb.mockReturnValue(
      promiseDetailDbMock({
        promises: [promiseRow()],
        verdicts: [
          {
            promiseId: "promise-1",
            verdict: "kept",
            rationale: "Latest rubric run.",
            adjudicatedAt: new Date("2026-07-01T00:00:00Z"),
          },
          {
            promiseId: "promise-1",
            verdict: "not_yet_rated",
            rationale: "Earlier, superseded run.",
            adjudicatedAt: new Date("2026-05-01T00:00:00Z"),
          },
        ],
      }),
    );
    const [entry] = await lookupCandidatePromises("federal-A");
    expect(entry!.verdict).toEqual({
      verdict: "kept",
      rationale: "Latest rubric run.",
      adjudicatedAt: "2026-07-01T00:00:00.000Z",
    });
  });

  it("passes the verdict vocabulary through unchanged — no re-mapping", async () => {
    mockedGetDb.mockReturnValue(
      promiseDetailDbMock({
        promises: [promiseRow()],
        verdicts: [
          {
            promiseId: "promise-1",
            verdict: "attempted_blocked",
            rationale: "Took the controllable action; blocked elsewhere.",
            adjudicatedAt: new Date("2026-07-01T00:00:00Z"),
          },
        ],
      }),
    );
    const [entry] = await lookupCandidatePromises("federal-A");
    expect(entry!.verdict!.verdict).toBe("attempted_blocked");
  });

  it("attaches linked actions with their vote/bill/cosponsor refs", async () => {
    mockedGetDb.mockReturnValue(
      promiseDetailDbMock({
        promises: [promiseRow()],
        actions: [
          {
            promiseId: "promise-1",
            actionType: "vote",
            evidenceLevel: "outcome",
            direction: "toward",
            voteId: "vote-uuid-1",
            billId: null,
            cosponsorId: null,
          },
        ],
      }),
    );
    const [entry] = await lookupCandidatePromises("federal-A");
    expect(entry!.actions).toEqual([
      {
        actionType: "vote",
        evidenceLevel: "outcome",
        direction: "toward",
        voteId: "vote-uuid-1",
        billId: null,
        cosponsorId: null,
      },
    ]);
  });

  it("degrades to promises-only when the verdict/action lookup throws", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockedGetDb.mockReturnValue({
      select: vi
        .fn()
        .mockReturnValueOnce(chainResolving([promiseRow()], ["from", "where"]))
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockRejectedValue(new Error("boom")),
            }),
          }),
        }),
    } as unknown as ReturnType<typeof getDb>);

    const result = await lookupCandidatePromises("federal-A");
    expect(result).toHaveLength(1);
    expect(result[0]!.verdict).toBeNull();
    expect(result[0]!.actions).toEqual([]);
    consoleSpy.mockRestore();
  });

  it("returns multiple promises for a candidate, each independently assembled", async () => {
    mockedGetDb.mockReturnValue(
      promiseDetailDbMock({
        promises: [
          promiseRow({ id: "promise-1" }),
          promiseRow({
            id: "promise-2",
            canonicalIssue: "economy_jobs",
            promiseText: "I will co-sponsor the small business relief bill.",
          }),
        ],
        actions: [
          {
            promiseId: "promise-2",
            actionType: "cosponsorship",
            evidenceLevel: "activity",
            direction: "toward",
            voteId: null,
            billId: "bill-1",
            cosponsorId: "cosponsor-uuid-1",
          },
        ],
      }),
    );
    const entries = await lookupCandidatePromises("federal-A");
    expect(entries.map((e) => e.id)).toEqual(["promise-1", "promise-2"]);
    expect(entries[0]!.actions).toEqual([]);
    expect(entries[1]!.actions).toHaveLength(1);
  });
});
