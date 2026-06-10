/**
 * src/lib/server/delegation.test.ts
 *
 * Tests for the delegation resolver. DB and member-stats lookups are mocked —
 * no live Neon connection required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../db/client", () => {
  const DB_NOT_CONFIGURED = "DB_NOT_CONFIGURED" as const;
  return { getDb: vi.fn(), DB_NOT_CONFIGURED };
});

vi.mock("./member-stats", () => ({
  lookupMemberStats: vi.fn().mockResolvedValue(new Map()),
}));

import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import { lookupMemberStats } from "./member-stats";
import { parseNameDecoration, resolveDelegation } from "./delegation";

const mockedGetDb = vi.mocked(getDb);
const mockedStats = vi.mocked(lookupMemberStats);

/**
 * The resolver issues selects in order: candidates, candidate_offices
 * (filtered), then the offices coverage-floor aggregate. Each select() call
 * consumes the next row set in order. The chain is thenable so queries with
 * no .where() (the floor aggregate) resolve too.
 */
function makeDbMock(rowSets: Record<string, unknown>[][]) {
  let call = 0;
  const select = vi.fn().mockImplementation(() => {
    const rows = rowSets[call] ?? [];
    call += 1;
    const chain = {
      from: vi.fn(),
      innerJoin: vi.fn(),
      where: vi.fn().mockResolvedValue(rows),
      then: (resolve: (v: unknown) => void) => resolve(rows),
    };
    chain.from.mockReturnValue(chain);
    chain.innerJoin.mockReturnValue(chain);
    return chain;
  });
  return { select } as unknown as ReturnType<typeof getDb>;
}

function candidateRow(
  id: string,
  fullName: string,
  jurisdiction: string,
  rawMetadata: unknown = null,
) {
  return { id, fullName, jurisdiction, rawMetadata };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedStats.mockResolvedValue(new Map());
});

// ---------------------------------------------------------------------------
// parseNameDecoration
// ---------------------------------------------------------------------------

describe("parseNameDecoration", () => {
  it("parses a House decoration with district", () => {
    expect(parseNameDecoration("Rep. Frank Pallone [D-NJ6]")).toEqual({
      party: "Democrat",
      state: "NJ",
      district: 6,
    });
  });

  it("parses an at-large House decoration (district 0)", () => {
    expect(parseNameDecoration("Rep. Harriet Hageman [R-WY0]")).toEqual({
      party: "Republican",
      state: "WY",
      district: 0,
    });
  });

  it("parses a Senate decoration (no district)", () => {
    expect(parseNameDecoration("Sen. Bernard Sanders [I-VT]")).toEqual({
      party: "Independent",
      state: "VT",
      district: null,
    });
  });

  it("returns nulls for an undecorated name", () => {
    expect(parseNameDecoration("Andy Kim")).toEqual({
      party: null,
      state: null,
      district: null,
    });
  });
});

// ---------------------------------------------------------------------------
// resolveDelegation
// ---------------------------------------------------------------------------

describe("resolveDelegation — DB not configured", () => {
  it("returns db_unavailable", async () => {
    mockedGetDb.mockReturnValue(DB_NOT_CONFIGURED);
    const out = await resolveDelegation("NJ", "New Jersey", 6);
    expect(out).toEqual({ status: "db_unavailable" });
  });
});

describe("resolveDelegation — decorated rows", () => {
  const CANDIDATES = [
    candidateRow("p1", "Rep. Frank Pallone [D-NJ6]", "federal-house"),
    candidateRow("p2", "Rep. Jeff Van Drew [R-NJ2]", "federal-house"),
    candidateRow("s1", "Sen. Andrew Kim [D-NJ]", "federal-senate"),
    candidateRow("s2", "Sen. Cory Booker [D-NJ]", "federal-senate"),
    candidateRow("tx", "Sen. John Cornyn [R-TX]", "federal-senate"),
  ];
  const OFFICES = [
    { candidateId: "s2", termStart: "2013-10-31" },
    { candidateId: "s2", termStart: "2021-01-03" },
    { candidateId: "s1", termStart: "2025-01-03" },
    { candidateId: "p1", termStart: "1989-01-03" },
  ];

  it("resolves House member by district and ranks senators by seniority", async () => {
    mockedGetDb.mockReturnValue(makeDbMock([CANDIDATES, OFFICES]));

    const out = await resolveDelegation("NJ", "New Jersey", 6);
    expect(out.status).toBe("ok");
    if (out.status !== "ok") return;

    expect(out.seats).toHaveLength(3);

    const [house, senA, senB] = out.seats;
    expect(house.office).toBe("U.S. House");
    expect(house.districtLabel).toBe("NJ-06");
    expect(house.candidate).toMatchObject({
      id: "p1",
      name: "Frank Pallone",
      party: "Democrat",
      priorRole: "U.S. Representative since 1989",
    });
    expect(house.onBallot2026).toBe(true);

    // Booker (2013) is senior to Kim (2025).
    expect(senA.candidate?.id).toBe("s2");
    expect(senA.blindLabel).toBe("Your Senior U.S. Senator");
    expect(senA.districtLabel).toBe("New Jersey (statewide)");
    expect(senB.candidate?.id).toBe("s1");
    expect(senB.blindLabel).toBe("Your Junior U.S. Senator");
  });

  it("suppresses 'since YYYY' for members at the office-data coverage floor", async () => {
    // Floor = 2023 (how far back our office rows reach). A member whose
    // earliest known term IS the floor may have served longer — no claim.
    mockedGetDb.mockReturnValue(
      makeDbMock([
        CANDIDATES,
        [
          { candidateId: "p1", termStart: "2023-01-03" }, // at floor → suppress
          { candidateId: "s1", termStart: "2025-01-03" }, // after floor → claim
          { candidateId: "s2", termStart: "2023-01-03" },
        ],
        [{ minTermStart: "2023-01-03" }],
      ]),
    );

    const out = await resolveDelegation("NJ", "New Jersey", 6);
    if (out.status !== "ok") return;
    expect(out.seats[0].candidate?.priorRole).toBe("U.S. Representative");
    const kim = out.seats.find((s) => s.candidate?.id === "s1");
    expect(kim?.candidate?.priorRole).toBe("U.S. Senator since 2025");
  });

  it("leaves the House seat unresolved for a district with no match", async () => {
    mockedGetDb.mockReturnValue(makeDbMock([CANDIDATES, OFFICES]));

    const out = await resolveDelegation("NJ", "New Jersey", 11);
    expect(out.status).toBe("ok");
    if (out.status !== "ok") return;
    expect(out.seats[0].candidate).toBeNull();
    expect(out.seats[0].districtLabel).toBe("NJ-11");
  });

  it("does not leak other states' members", async () => {
    mockedGetDb.mockReturnValue(makeDbMock([CANDIDATES, OFFICES]));

    const out = await resolveDelegation("NJ", "New Jersey", 6);
    if (out.status !== "ok") return;
    const ids = out.seats.map((s) => s.candidate?.id);
    expect(ids).not.toContain("tx");
  });
});

describe("resolveDelegation — at-large and metadata fallback", () => {
  it("resolves an at-large representative (district 0)", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock([
        [candidateRow("w1", "Rep. Harriet Hageman [R-WY0]", "federal-house")],
        [],
      ]),
    );

    const out = await resolveDelegation("WY", "Wyoming", 0);
    expect(out.status).toBe("ok");
    if (out.status !== "ok") return;
    expect(out.seats[0].candidate?.id).toBe("w1");
    expect(out.seats[0].districtLabel).toBe("WY — At-large");
  });

  it("falls back to rawMetadata.govtrack facts for undecorated names", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock([
        [
          candidateRow("m1", "Harriet Hageman", "federal-house", {
            govtrack: {
              person: { state: "WY", district: 0, party: "Republican" },
            },
          }),
        ],
        [],
      ]),
    );

    const out = await resolveDelegation("WY", "Wyoming", 0);
    expect(out.status).toBe("ok");
    if (out.status !== "ok") return;
    expect(out.seats[0].candidate).toMatchObject({
      id: "m1",
      party: "Republican",
    });
  });

  it("resolves a state's single House row even without a parsed district", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock([
        [candidateRow("a1", "Rep. Tom Cole [R-AK]", "federal-house")],
        [],
      ]),
    );

    const out = await resolveDelegation("AK", "Alaska", 0);
    expect(out.status).toBe("ok");
    if (out.status !== "ok") return;
    expect(out.seats[0].candidate?.id).toBe("a1");
  });

  it("never guesses among multiple unmatched rows", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock([
        [
          candidateRow("u1", "Person One", "federal-house"),
          candidateRow("u2", "Person Two", "federal-house"),
        ],
        [],
      ]),
    );

    const out = await resolveDelegation("NJ", "New Jersey", 6);
    expect(out.status).toBe("ok");
    if (out.status !== "ok") return;
    expect(out.seats[0].candidate).toBeNull();
  });
});

describe("resolveDelegation — partial senate data", () => {
  it("renders one resolved + one unresolved senate seat with generic labels", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock([
        [candidateRow("s1", "Sen. Lisa Murkowski [R-AK]", "federal-senate")],
        [],
      ]),
    );

    const out = await resolveDelegation("AK", "Alaska", null);
    expect(out.status).toBe("ok");
    if (out.status !== "ok") return;

    const senateSeats = out.seats.filter((s) => s.chamber === "senate");
    expect(senateSeats).toHaveLength(2);
    expect(senateSeats[0].candidate?.id).toBe("s1");
    expect(senateSeats[0].blindLabel).toBe("Your U.S. Senator");
    expect(senateSeats[1].candidate).toBeNull();

    // District null → House seat honest-unresolved.
    expect(out.seats[0].candidate).toBeNull();
    expect(out.seats[0].seatId).toBe("house-AK-unknown");
  });
});

describe("resolveDelegation — member_stats geography precedence", () => {
  it("resolves undecorated members via ingested role-API state/district", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock([
        [
          candidateRow("u1", "Bonnie Watson Coleman", "federal-house"),
          candidateRow("u2", "Some Other Member", "federal-house"),
        ],
        [],
      ]),
    );
    mockedStats.mockResolvedValue(
      new Map([
        [
          "u1",
          {
            candidateId: "u1",
            attendance: null,
            onBallot2026: true,
            nextElectionYear: null,
            senateClass: null,
            state: "NJ",
            district: 12,
            senatorRank: null,
          },
        ],
        [
          "u2",
          {
            candidateId: "u2",
            attendance: null,
            onBallot2026: true,
            nextElectionYear: null,
            senateClass: null,
            state: "PA",
            district: 3,
            senatorRank: null,
          },
        ],
      ]),
    );

    const out = await resolveDelegation("NJ", "New Jersey", 12);
    expect(out.status).toBe("ok");
    if (out.status !== "ok") return;
    expect(out.seats[0].candidate?.id).toBe("u1");
  });

  it("orders senators by ingested senator_rank over term heuristics", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock([
        [
          candidateRow("s1", "Sen. Andrew Kim [D-NJ]", "federal-senate"),
          candidateRow("s2", "Sen. Cory Booker [D-NJ]", "federal-senate"),
        ],
        // No office rows — rank must come purely from senator_rank.
        [],
      ]),
    );
    const entry = (id: string, rank: "senior" | "junior") => ({
      candidateId: id,
      attendance: null,
      onBallot2026: false,
      nextElectionYear: null,
      senateClass: "2",
      state: "NJ",
      district: null,
      senatorRank: rank,
    });
    mockedStats.mockResolvedValue(
      new Map([
        ["s1", entry("s1", "senior")],
        ["s2", entry("s2", "junior")],
      ]),
    );

    const out = await resolveDelegation("NJ", "New Jersey", 6);
    if (out.status !== "ok") return;
    const senate = out.seats.filter((s) => s.chamber === "senate");
    expect(senate[0].candidate?.id).toBe("s1");
    expect(senate[0].blindLabel).toBe("Your Senior U.S. Senator");
    expect(senate[1].candidate?.id).toBe("s2");
  });
});

describe("resolveDelegation — attendance wiring", () => {
  it("attaches member-stats attendance and senate onBallot2026", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock([
        [
          candidateRow("p1", "Rep. Frank Pallone [D-NJ6]", "federal-house"),
          candidateRow("s1", "Sen. Andrew Kim [D-NJ]", "federal-senate"),
        ],
        [],
      ]),
    );
    mockedStats.mockResolvedValue(
      new Map([
        [
          "p1",
          {
            candidateId: "p1",
            attendance: {
              missedPct: 1.4,
              of: "612 floor votes",
              band: "good" as const,
            },
            onBallot2026: true,
            nextElectionYear: null,
            senateClass: null,
            state: null,
            district: null,
            senatorRank: null,
          },
        ],
        [
          "s1",
          {
            candidateId: "s1",
            attendance: {
              missedPct: 8.1,
              of: "486 floor votes",
              band: "bad" as const,
            },
            onBallot2026: false,
            nextElectionYear: null,
            senateClass: "1",
            state: null,
            district: null,
            senatorRank: null,
          },
        ],
      ]),
    );

    const out = await resolveDelegation("NJ", "New Jersey", 6);
    if (out.status !== "ok") return;

    expect(out.seats[0].attendance?.band).toBe("good");
    expect(out.seats[0].onBallot2026).toBe(true); // House always
    const senate = out.seats.find((s) => s.candidate?.id === "s1");
    expect(senate?.attendance?.missedPct).toBe(8.1);
    expect(senate?.onBallot2026).toBe(false);
  });
});
