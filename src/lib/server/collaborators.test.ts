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
import {
  lookupCollaborators,
  partyLetter,
  caucusLetter,
} from "./collaborators";

const mockedGetDb = vi.mocked(getDb);

/** Mock the drizzle chains: every builder step returns the same object. The
 *  self-join ends at .having() and resolves the collaborator rows; the member
 *  caucus lookup ends at .where() and is awaited, so the builder is also
 *  thenable and resolves `memberRows`. */
function makeDbMock(
  rows: Record<string, unknown>[],
  memberRows: Record<string, unknown>[] = [],
) {
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "from", "innerJoin", "where", "groupBy"]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.having = vi.fn(() => Promise.resolve(rows));
  builder.then = (resolve: (v: unknown) => unknown) => resolve(memberRows);
  return builder as unknown as ReturnType<typeof getDb>;
}

/** A `candidates` row as the member caucus lookup selects it. */
function memberRow(
  id: string,
  fullName: string,
  party: string | null,
  caucus: string | null = null,
) {
  return { id, fullName, party, caucus };
}

function row(
  memberId: string,
  collaboratorId: string,
  collaboratorName: string,
  sharedBills: number,
  collaboratorParty: string | null = null,
  collaboratorIsIncumbent = true,
  collaboratorCaucus: string | null = null,
) {
  return {
    memberId,
    collaboratorId,
    collaboratorName,
    collaboratorParty,
    collaboratorCaucus,
    collaboratorIsIncumbent,
    sharedBills,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("partyLetter", () => {
  it("reads D/R/I from the party column first", () => {
    expect(partyLetter("Jane Doe", "DEM")).toBe("D");
    expect(partyLetter("John Roe", "REP")).toBe("R");
    expect(partyLetter("Sam Poe", "IND")).toBe("I");
  });

  it("falls back to the name decoration when the column says nothing", () => {
    expect(partyLetter("Rep. Frank Pallone [D-NJ6]", null)).toBe("D");
    expect(partyLetter("Rep. Chip Roy [R-TX21]", null)).toBe("R");
    expect(partyLetter("Sen. Bernie Sanders [I-VT]", null)).toBe("I");
  });

  // The decoration goes stale on rows the party backfill has corrected — e.g.
  // a member who switched party mid-term keeps the old letter in their stored
  // GovTrack name. The maintained column has to win.
  it("lets the authoritative party column override a stale decoration", () => {
    expect(partyLetter("Rep. Someone [I-CA3]", "REP")).toBe("R");
  });

  it("maps state Democratic affiliates (DFL, DNPL) to D", () => {
    expect(partyLetter("Rep. Ilhan Omar", "DFL")).toBe("D");
    expect(partyLetter("Rep. Someone", "DNPL")).toBe("D");
  });

  // Precision over recall: a code we don't recognize must NOT be guessed at,
  // because a wrong bucket is worse than an omission. "OTH"/"UNK" are real
  // values in the table — they fall through to the decoration, never to "I".
  it("does not read OTH/UNK as Independent", () => {
    expect(partyLetter("Kevin Kiley", "OTH")).toBeNull();
    expect(partyLetter("Jim Risch", "UNK")).toBeNull();
    // …but a correct decoration still rescues them.
    expect(partyLetter("Sen. Jim Risch [R-ID]", "UNK")).toBe("R");
  });

  it("returns null when neither source yields D/R/I", () => {
    expect(partyLetter("Someone", null)).toBeNull();
    expect(partyLetter("Someone", "LIB")).toBeNull();
  });
});

// Defect A (Part 4 follow-up), correctly diagnosed: Kiley's stored "I" was
// right all along. What was missing is who he WORKS with, which is why the
// bucketing letter is a separate function from the displayed one.
describe("caucusLetter", () => {
  it("prefers the caucus when the member has one", () => {
    expect(caucusLetter("Rep. Kevin Kiley [I-CA3]", "IND", "REP")).toBe("R");
    expect(caucusLetter("Sen. Bernie Sanders [I-VT]", "IND", "DEM")).toBe("D");
    expect(caucusLetter("Sen. Angus King [I-ME]", "IND", "DEM")).toBe("D");
  });

  // NULL caucus is the case for ~every row — it must fall straight through.
  it("falls through to the display party when there is no caucus", () => {
    expect(caucusLetter("Rep. Chip Roy [R-TX21]", "REP", null)).toBe("R");
    expect(caucusLetter("Rep. Chip Roy [R-TX21]", null, null)).toBe("R");
    expect(caucusLetter("Someone", null, null)).toBeNull();
  });

  it("ignores a caucus code it can't map rather than guessing", () => {
    expect(caucusLetter("Rep. Chip Roy [R-TX21]", "REP", "OTH")).toBe("R");
  });

  // The display letter must NOT absorb the caucus, or a genuine Independent
  // gets misprinted as D/R on the card.
  it("does not change what partyLetter displays", () => {
    expect(partyLetter("Rep. Kevin Kiley [I-CA3]", "IND")).toBe("I");
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

  // Muxin's call, 2026-07-24: former members stay in the graph (they are real
  // 118th-Congress collaborators) but are flagged so the UI can label them.
  it("flags a departed collaborator instead of dropping them", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock([
        row("s1", "sitting", "Rep. Still Here [D-CA1]", 9, "DEM", true),
        row(
          "s1",
          "former",
          "Rep. David Trone [D-MD6, 2019-2024]",
          11,
          "DEM",
          false,
        ),
      ]),
    );

    const out = await lookupCollaborators([{ id: "s1", party: "D" }]);
    const same = out.get("s1")?.sameParty ?? [];
    expect(same.map((c) => c.candidateId)).toEqual(["former", "sitting"]);
    expect(same[0]).toMatchObject({
      // Defect B: the service-span tag no longer mangles the display name.
      name: "David Trone",
      departed: true,
    });
    expect(same[1].departed).toBe(false);
  });

  // The headline fix: an Independent who caucuses Republican counts toward a
  // Republican's SAME-party list, while still printing as "(I)".
  it("buckets a caucusing Independent by caucus but displays their party", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock(
        [
          row(
            "s1",
            "kiley",
            "Rep. Kevin Kiley [I-CA3]",
            12,
            "IND",
            true,
            "REP",
          ),
          row("s1", "golden", "Rep. Jared Golden [D-ME2]", 9, "DEM"),
        ],
        [memberRow("s1", "Rep. Some Republican [R-TX1]", "REP")],
      ),
    );

    const net = (await lookupCollaborators([{ id: "s1", party: "R" }])).get(
      "s1",
    );
    expect(net?.sameParty.map((c) => c.candidateId)).toEqual(["kiley"]);
    expect(net?.crossParty.map((c) => c.candidateId)).toEqual(["golden"]);
    // …and the card still shows him as the Independent he is.
    expect(net?.sameParty[0].party).toBe("I");
    // The internal bucketing key never leaks into the returned shape.
    expect(net?.sameParty[0]).not.toHaveProperty("bucket");
  });

  // The mirror image: on Kiley's OWN card, Republicans are same-party.
  it("applies the caucus rule to the seat member too", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock(
        [
          row("kiley", "r1", "Rep. A Republican [R-TX1]", 12, "REP"),
          row("kiley", "d1", "Rep. A Democrat [D-CA1]", 9, "DEM"),
        ],
        // delegation passes party "I" (what the card displays); the DB row's
        // caucus upgrades the bucketing key to R.
        [memberRow("kiley", "Rep. Kevin Kiley [I-CA3]", "IND", "REP")],
      ),
    );

    const net = (await lookupCollaborators([{ id: "kiley", party: "I" }])).get(
      "kiley",
    );
    expect(net?.sameParty.map((c) => c.candidateId)).toEqual(["r1"]);
    expect(net?.crossParty.map((c) => c.candidateId)).toEqual(["d1"]);
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
