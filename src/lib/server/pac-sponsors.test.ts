/**
 * src/lib/server/pac-sponsors.test.ts
 *
 * Tests for the Part 6a read layer: the committee join, the rejected-status
 * exclusion (the plan's hand-curation contract), honest nulls for unfiled
 * sponsors/sectors, the amount ranking + truncation, graceful degradation —
 * and the rule that this block is a BREAKDOWN and never emits a total.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

vi.mock("../../../db/client", () => {
  const DB_NOT_CONFIGURED = "DB_NOT_CONFIGURED" as const;
  return { getDb: vi.fn(), DB_NOT_CONFIGURED };
});

import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import { lookupPacSponsors, MAX_SPONSORS_SHOWN } from "./pac-sponsors";
import { FUNDING_MIX_LABELS } from "./donors";

const mockedGetDb = vi.mocked(getDb);

/** Thenable chain resolving `rows` for the select/innerJoin/where/orderBy shape. */
function makeDbMock(rows: Record<string, unknown>[]) {
  const chain: Record<string, unknown> = {};
  for (const m of ["from", "innerJoin", "where", "orderBy"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  (chain as { then?: unknown }).then = (resolve: (v: unknown[]) => void) =>
    resolve(rows);
  return {
    select: vi.fn().mockReturnValue(chain),
  } as unknown as ReturnType<typeof getDb>;
}

function contributionRow(overrides: Record<string, unknown> = {}) {
  return {
    candidateId: "federal-A",
    committeeId: "C00000001",
    amountTotal: "10000.00",
    transactionCount: 2,
    name: "EXAMPLE CORP PAC",
    connectedOrg: "EXAMPLE CORP",
    sector: "Technology",
    status: "auto",
    evidenceUrl: "https://www.fec.gov/data/committee/C00000001/",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("lookupPacSponsors", () => {
  it("returns an empty map when DB is not configured", async () => {
    mockedGetDb.mockReturnValue(DB_NOT_CONFIGURED);
    expect((await lookupPacSponsors(["federal-A"])).size).toBe(0);
  });

  it("returns an empty map for an empty id list without touching the DB", async () => {
    expect((await lookupPacSponsors([])).size).toBe(0);
    expect(mockedGetDb).not.toHaveBeenCalled();
  });

  it("degrades to an empty map when the query throws (table missing)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const chain: Record<string, unknown> = {};
    for (const m of ["from", "innerJoin", "where"]) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.orderBy = vi
      .fn()
      .mockRejectedValue(
        new Error('relation "pac_candidate_contributions" does not exist'),
      );
    mockedGetDb.mockReturnValue({
      select: vi.fn().mockReturnValue(chain),
    } as unknown as ReturnType<typeof getDb>);

    expect((await lookupPacSponsors(["federal-A"])).size).toBe(0);
    consoleSpy.mockRestore();
  });

  it("maps a committee row to its filed sponsor, sector and evidence link", async () => {
    mockedGetDb.mockReturnValue(makeDbMock([contributionRow()]));
    const out = await lookupPacSponsors(["federal-A"]);
    expect(out.get("federal-A")).toEqual({
      electionCycle: "2026",
      hiddenCount: 0,
      sponsors: [
        {
          committeeId: "C00000001",
          name: "EXAMPLE CORP PAC",
          sponsor: "EXAMPLE CORP",
          sector: "Technology",
          curatedSummary: null,
          curatedSourceUrl: null,
          amount: 10000,
          transactionCount: 2,
          evidenceUrl: "https://www.fec.gov/data/committee/C00000001/",
          status: "auto",
        },
      ],
    });
  });

  it("keeps unfiled sponsor/sector honestly null rather than inventing one", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock([contributionRow({ connectedOrg: "   ", sector: null })]),
    );
    const entry = out(await lookupPacSponsors(["federal-A"])).sponsors[0]!;
    expect(entry.sponsor).toBeNull();
    expect(entry.sector).toBeNull();
  });

  it("lists a rejected row that carries a curated summary, with its filed claim suppressed", async () => {
    // Migration 0024: rejection kills the committee's own sponsor/sector
    // claim, but our sourced plain-language line stands in for it.
    mockedGetDb.mockReturnValue(
      makeDbMock([
        contributionRow({
          status: "rejected",
          connectedOrg: "MISLEADING FILED SPONSOR",
          sector: "Technology",
          curatedSummary: "A vehicle of Example Org — spends in primaries.",
          curatedSourceUrl: "https://example.org/reporting",
        }),
      ]),
    );
    const entry = out(await lookupPacSponsors(["federal-A"])).sponsors[0]!;
    expect(entry.sponsor).toBeNull();
    expect(entry.sector).toBeNull();
    expect(entry.curatedSummary).toBe(
      "A vehicle of Example Org — spends in primaries.",
    );
    expect(entry.curatedSourceUrl).toBe("https://example.org/reporting");
  });

  it("never returns a row a human rejected", async () => {
    // Belt and braces: the SQL `ne(status, 'rejected')` filter is the primary
    // guard, so this asserts the in-memory guard behind it.
    mockedGetDb.mockReturnValue(
      makeDbMock([
        contributionRow({ committeeId: "C1", status: "rejected" }),
        contributionRow({ committeeId: "C2", status: "verified" }),
      ]),
    );
    const entries = out(await lookupPacSponsors(["federal-A"])).sponsors;
    expect(entries.map((s) => s.committeeId)).toEqual(["C2"]);
  });

  it("ranks by dollars (numerically, not as strings) and splits by candidate", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock([
        contributionRow({ committeeId: "C1", amountTotal: "9000.00" }),
        contributionRow({ committeeId: "C2", amountTotal: "10000.00" }),
        contributionRow({
          candidateId: "federal-B",
          committeeId: "C3",
          amountTotal: "500.00",
        }),
      ]),
    );
    const map = await lookupPacSponsors(["federal-A", "federal-B"]);
    expect(map.get("federal-A")!.sponsors.map((s) => s.committeeId)).toEqual([
      "C2",
      "C1",
    ]);
    expect(map.get("federal-B")!.sponsors.map((s) => s.committeeId)).toEqual([
      "C3",
    ]);
  });

  it("caps the list and counts (never sums) the remainder", async () => {
    const rows = Array.from({ length: MAX_SPONSORS_SHOWN + 3 }, (_, i) =>
      contributionRow({
        committeeId: `C${i}`,
        amountTotal: `${(100 - i) * 100}.00`,
      }),
    );
    mockedGetDb.mockReturnValue(makeDbMock(rows));
    const res = out(await lookupPacSponsors(["federal-A"]));
    expect(res.sponsors).toHaveLength(MAX_SPONSORS_SHOWN);
    expect(res.hiddenCount).toBe(3);
  });

  it("omits candidates with no rows so callers must write the honest empty state", async () => {
    mockedGetDb.mockReturnValue(makeDbMock([]));
    const map = await lookupPacSponsors(["federal-A"]);
    expect(map.has("federal-A")).toBe(false);
  });

  it("emits no aggregate dollar total — this block is a breakdown, not a sum", async () => {
    // Plan doc 6a: this money is already inside the funding-mix "PACs"
    // bucket, so "read paths must never re-add them to totals". The result
    // shape carries no field a total could hide in.
    mockedGetDb.mockReturnValue(
      makeDbMock([
        contributionRow({ committeeId: "C1", amountTotal: "9000.00" }),
        contributionRow({ committeeId: "C2", amountTotal: "10000.00" }),
      ]),
    );
    const res = out(await lookupPacSponsors(["federal-A"]));
    expect(Object.keys(res).sort()).toEqual([
      "electionCycle",
      "hiddenCount",
      "sponsors",
    ]);
    const serialized = JSON.stringify(res);
    expect(serialized).not.toContain("19000"); // the sum exists nowhere
  });

  it("honours an explicit election cycle", async () => {
    mockedGetDb.mockReturnValue(makeDbMock([contributionRow()]));
    const res = out(await lookupPacSponsors(["federal-A"], "2024"));
    expect(res.electionCycle).toBe("2024");
  });
});

describe("funding-mix display gate", () => {
  /** Capture the condition handed to `.where()` so the gate can be asserted. */
  function makeWhereCapturingDbMock(rows: Record<string, unknown>[]) {
    const captured: unknown[] = [];
    const chain: Record<string, unknown> = {};
    for (const m of ["from", "innerJoin", "orderBy"]) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.where = vi.fn((condition: unknown) => {
      captured.push(condition);
      return chain;
    });
    (chain as { then?: unknown }).then = (resolve: (v: unknown[]) => void) =>
      resolve(rows);
    return {
      db: { select: vi.fn().mockReturnValue(chain) } as unknown as ReturnType<
        typeof getDb
      >,
      captured,
    };
  }

  /** Compile the captured predicate into the SQL Postgres would actually
   *  run. Asserting on the RENDERED text + bound params — rather than on
   *  substrings of the builder, which come from the gate's own literals and
   *  so survive any mutation short of deleting it — is what makes these
   *  assertions able to fail. */
  function compileWhere(condition: unknown) {
    return new PgDialect().sqlToQuery(condition as never);
  }

  /** The gate is the last term of the `and()`, so everything from `EXISTS`
   *  onward is the gate body. Scoping to it matters: the outer terms render
   *  the same qualified column names, so a whole-query match would pass even
   *  for a gate correlated to itself. */
  function gateBody(rendered: { sql: string }) {
    const at = rendered.sql.toLowerCase().indexOf("exists");
    expect(at).toBeGreaterThanOrEqual(0);
    return rendered.sql.slice(at);
  }

  async function renderedWhere() {
    const { db, captured } = makeWhereCapturingDbMock([contributionRow()]);
    mockedGetDb.mockReturnValue(db);
    await lookupPacSponsors(["federal-A"]);
    expect(captured).toHaveLength(1);
    return compileWhere(captured[0]);
  }

  it("correlates the funding-mix EXISTS to the outer contribution row", async () => {
    // A gate that correlated to itself (`funding_mix.candidate_id =
    // funding_mix.candidate_id`) would be true whenever ANY funding mix
    // exists anywhere, so every candidate with stored PAC rows would render
    // a PAC list with no funding mix behind it. The correlation has to name
    // the OUTER table for the gate to mean anything.
    const body = gateBody(await renderedWhere());
    expect(body).toContain('"pac_candidate_contributions"."candidate_id"');
    expect(body).toContain('"pac_candidate_contributions"."election_cycle"');
    expect(body).toContain("donor_aggregates");
  });

  it("binds exactly the funding-mix bucket labels donors.ts defines", async () => {
    // Labels drifting from FUNDING_MIX_LABELS would match no donor_aggregates
    // row, hiding every PAC block sitewide — a silent fail-closed.
    const rendered = await renderedWhere();
    expect(rendered.params).toEqual(
      expect.arrayContaining(Object.values(FUNDING_MIX_LABELS)),
    );
  });
});

/** Unwrap the single-candidate result the fixtures above produce. */
function out<T>(map: Map<string, T>): T {
  const value = map.get("federal-A");
  if (!value) throw new Error("expected a result for federal-A");
  return value;
}
