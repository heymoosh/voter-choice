/**
 * src/lib/server/collaborators.test.ts
 *
 * Tests for the collaborator (co-cosponsorship) read layer: party
 * classification, the same-/cross-party split, ranking + topN, dropping
 * unclassifiable rows, and graceful degradation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../db/client", () => {
  const DB_NOT_CONFIGURED = "DB_NOT_CONFIGURED" as const;
  return { getDb: vi.fn(), DB_NOT_CONFIGURED };
});

import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import { lookupCollaborators, partyLetter } from "./collaborators";

const mockedGetDb = vi.mocked(getDb);

/** Mock the drizzle self-join chain: every builder step returns the same
 *  object; the terminal .having() resolves the row set. */
function makeDbMock(rows: Record<string, unknown>[]) {
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "from", "innerJoin", "where", "groupBy"]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.having = vi.fn(() => Promise.resolve(rows));
  return builder as unknown as ReturnType<typeof getDb>;
}

function row(
  memberId: string,
  collaboratorId: string,
  collaboratorName: string,
  sharedBills: number,
  collaboratorParty: string | null = null,
) {
  return {
    memberId,
    collaboratorId,
    collaboratorName,
    collaboratorParty,
    sharedBills,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("partyLetter", () => {
  it("reads D/R/I from the name decoration first", () => {
    expect(partyLetter("Rep. Frank Pallone [D-NJ6]", null)).toBe("D");
    expect(partyLetter("Rep. Chip Roy [R-TX21]", null)).toBe("R");
    expect(partyLetter("Sen. Bernie Sanders [I-VT]", null)).toBe("I");
  });

  it("falls back to the FEC party code when there is no decoration", () => {
    expect(partyLetter("Jane Doe", "DEM")).toBe("D");
    expect(partyLetter("John Roe", "REP")).toBe("R");
    expect(partyLetter("Sam Poe", "IND")).toBe("I");
  });

  it("returns null when neither source yields D/R/I", () => {
    expect(partyLetter("Someone", null)).toBeNull();
    expect(partyLetter("Someone", "LIB")).toBeNull();
  });
});

describe("lookupCollaborators", () => {
  it("returns an empty map when DB is not configured", async () => {
    mockedGetDb.mockReturnValue(DB_NOT_CONFIGURED);
    const out = await lookupCollaborators([{ id: "s1", party: "D" }]);
    expect(out.size).toBe(0);
  });

  it("returns an empty map for an empty member list without touching the DB", async () => {
    const out = await lookupCollaborators([]);
    expect(out.size).toBe(0);
    expect(mockedGetDb).not.toHaveBeenCalled();
  });

  it("degrades to an empty map when the query throws (e.g. table missing)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const builder: Record<string, unknown> = {};
    for (const m of ["select", "from", "innerJoin", "where", "groupBy"]) {
      builder[m] = vi.fn(() => builder);
    }
    builder.having = vi.fn(() =>
      Promise.reject(new Error('relation "bill_cosponsors" does not exist')),
    );
    mockedGetDb.mockReturnValue(builder as unknown as ReturnType<typeof getDb>);

    const out = await lookupCollaborators([{ id: "s1", party: "D" }]);
    expect(out.size).toBe(0);
    consoleSpy.mockRestore();
  });

  it("splits collaborators into same/cross party and ranks by shared-bill count", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock([
        row("s1", "a", "Rep. Ally One [D-CA1]", 8),
        row("s1", "b", "Rep. Ally Two [D-CA2]", 12),
        row("s1", "c", "Rep. Cross One [R-TX1]", 5),
      ]),
    );

    const out = await lookupCollaborators([{ id: "s1", party: "D" }]);
    const net = out.get("s1");
    expect(net?.sameParty.map((c) => c.candidateId)).toEqual(["b", "a"]);
    expect(net?.crossParty.map((c) => c.candidateId)).toEqual(["c"]);
    // Display name has the decoration stripped.
    expect(net?.sameParty[0].name).toBe("Ally Two");
  });

  it("respects topN per bucket", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock([
        row("s1", "a", "Rep. A [D-CA1]", 10),
        row("s1", "b", "Rep. B [D-CA2]", 9),
        row("s1", "c", "Rep. C [D-CA3]", 8),
      ]),
    );

    const out = await lookupCollaborators([{ id: "s1", party: "D" }], {
      topN: 2,
    });
    expect(out.get("s1")?.sameParty.map((c) => c.candidateId)).toEqual([
      "a",
      "b",
    ]);
  });

  it("drops a collaborator whose own party can't be determined", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock([
        row("s1", "a", "Rep. Ally [D-CA1]", 8),
        row("s1", "u", "No Party Person", 20, null),
      ]),
    );

    const out = await lookupCollaborators([{ id: "s1", party: "D" }]);
    const net = out.get("s1");
    expect(net?.sameParty.map((c) => c.candidateId)).toEqual(["a"]);
    expect(net?.crossParty).toEqual([]);
  });

  it("omits a member whose own party is unknown (can't split)", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock([row("s1", "a", "Rep. Ally [D-CA1]", 8)]),
    );

    const out = await lookupCollaborators([{ id: "s1", party: null }]);
    expect(out.get("s1")).toBeUndefined();
  });

  it("passes the minSharedBills threshold through to the query without crashing", async () => {
    // Threshold filtering happens in SQL (HAVING); with rows returned the map
    // is still built. This just exercises the opts path.
    mockedGetDb.mockReturnValue(
      makeDbMock([row("s1", "a", "Rep. Ally [D-CA1]", 3)]),
    );
    const out = await lookupCollaborators([{ id: "s1", party: "D" }], {
      minSharedBills: 3,
    });
    expect(out.get("s1")?.sameParty).toHaveLength(1);
  });
});
