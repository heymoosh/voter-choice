import { describe, expect, it } from "vitest";
import {
  buildCnIndex,
  fecFirstKey,
  fecSurnameKey,
  matchCandidate,
  ourFirstKey,
  ourSeat,
  ourSurnameKey,
  parseCandidateMasterLine,
  parseWeballLine,
  seatKey,
  type CnCandidate,
  type MatchableRow,
} from "./fec-ids-from-bulk";

function cn(
  overrides: Partial<CnCandidate> & Pick<CnCandidate, "candId" | "name">,
): CnCandidate {
  return {
    party: "DEM",
    electionYear: 2026,
    state: "NJ",
    office: "S",
    district: "",
    ici: "",
    status: "C",
    ...overrides,
  };
}

function row(overrides: Partial<MatchableRow> = {}): MatchableRow {
  return {
    fullName: "Sen. Cory Booker [D-NJ]",
    jurisdiction: "federal-senate",
    isIncumbent: false,
    state: "NJ",
    district: null,
    office: "senate",
    ...overrides,
  };
}

describe("parseCandidateMasterLine", () => {
  it("parses a House row with a 1-digit district zero-padded to 2", () => {
    const candidate = parseCandidateMasterLine(
      "H0TX22107|HUNT, WESLEY|REP|2026|TX|H|7|I|C|C00696734|123 MAIN ST||HOUSTON|TX|77002",
    );
    expect(candidate).toEqual({
      candId: "H0TX22107",
      name: "HUNT, WESLEY",
      party: "REP",
      electionYear: 2026,
      state: "TX",
      office: "H",
      district: "07",
      ici: "I",
      status: "C",
    });
  });

  it("normalizes a Senate district of 00 to empty string", () => {
    const candidate = parseCandidateMasterLine(
      "S6NJ00185|BOOKER, CORY A|DEM|2026|NJ|S|00|I|I|C00540500|||||",
    );
    expect(candidate?.office).toBe("S");
    expect(candidate?.district).toBe("");
  });

  it("skips presidential rows (office P)", () => {
    expect(
      parseCandidateMasterLine(
        "P80001571|SAMPLE, PRESIDENT|DEM|2028|US|P|00|||C00000001|||||",
      ),
    ).toBeNull();
  });

  it("returns null for malformed lines", () => {
    expect(parseCandidateMasterLine("")).toBeNull();
    expect(parseCandidateMasterLine("|MISSING, ID|REP|2026|TX|H|7")).toBeNull();
    expect(parseCandidateMasterLine("H0TX22107||REP|2026|TX|H|7")).toBeNull();
  });
});

describe("parseWeballLine", () => {
  it("parses CAND_ID and TTL_RECEIPTS by position", () => {
    expect(
      parseWeballLine("H0TX22107|HUNT, WESLEY|I|REP|P|1234567.89|54321.00"),
    ).toEqual({ candId: "H0TX22107", receipts: 1234567.89 });
  });

  it("returns null when CAND_ID or receipts are missing", () => {
    expect(parseWeballLine("|HUNT, WESLEY|I|REP|P|100.00")).toBeNull();
    expect(parseWeballLine("H0TX22107|HUNT, WESLEY|I|REP|P|")).toBeNull();
  });
});

describe("fecSurnameKey", () => {
  it("takes the surname before the comma", () => {
    expect(fecSurnameKey("HUNT, WESLEY")).toBe("hunt");
  });

  it("uses the final token of multi-word surnames", () => {
    expect(fecSurnameKey("WASSERMAN SCHULTZ, DEBBIE")).toBe("schultz");
  });

  it("keeps hyphenated surnames intact", () => {
    expect(fecSurnameKey("OCASIO-CORTEZ, ALEXANDRIA")).toBe("ocasio-cortez");
  });

  it("strips suffix tokens from the surname part", () => {
    expect(fecSurnameKey("SMITH JR, JAMES")).toBe("smith");
    expect(fecSurnameKey("SMITH JR., JAMES")).toBe("smith");
  });

  it("ignores suffixes after the given names", () => {
    expect(fecSurnameKey("SMITH, JAMES JR")).toBe("smith");
  });
});

describe("fecFirstKey", () => {
  it("takes the first given-name token after the comma", () => {
    expect(fecFirstKey("BOOKER, CORY A")).toBe("cory");
  });

  it("strips honorifics and suffixes", () => {
    expect(fecFirstKey("SMITH, DR JAMES")).toBe("james");
    expect(fecFirstKey("SMITH, JR JAMES")).toBe("james");
  });

  it("returns null when there is no comma or no given name", () => {
    expect(fecFirstKey("MADONNA")).toBeNull();
    expect(fecFirstKey("SMITH, ")).toBeNull();
  });
});

describe("ourSurnameKey / ourFirstKey", () => {
  it("parses GovTrack-formatted names", () => {
    expect(ourSurnameKey({ fullName: "Sen. Cory Booker [D-NJ]" })).toBe(
      "booker",
    );
    expect(ourFirstKey({ fullName: "Sen. Cory Booker [D-NJ]" })).toBe("cory");
  });

  it("takes the final surname token and handles trailing suffixes", () => {
    expect(
      ourSurnameKey({ fullName: "Rep. Debbie Wasserman Schultz [D-FL25]" }),
    ).toBe("schultz");
    expect(ourSurnameKey({ fullName: "James Smith Jr." })).toBe("smith");
  });
});

describe("seatKey / ourSeat", () => {
  it("formats senate seats with an empty district", () => {
    expect(seatKey({ office: "S", state: "NJ", district: "" })).toBe("S:NJ:");
  });

  it("formats house seats with a zero-padded district", () => {
    expect(seatKey({ office: "H", state: "TX", district: "07" })).toBe(
      "H:TX:07",
    );
  });

  it("derives our seat from row columns with GovTrack fallbacks", () => {
    expect(
      ourSeat(
        row({
          fullName: "Rep. Wesley Hunt [R-TX38]",
          jurisdiction: "federal-house",
          office: "house",
          state: null,
          district: "38",
        }),
      ),
    ).toEqual({ office: "H", state: "TX", district: "38" });
  });

  it("returns null when the state cannot be determined", () => {
    expect(ourSeat(row({ fullName: "Sen. Cory Booker", state: null }))).toBe(
      null,
    );
  });
});

describe("matchCandidate", () => {
  const noReceipts = new Map<string, number>();

  it("matches a unique seat+surname candidate", () => {
    const index = buildCnIndex([
      cn({ candId: "S6NJ00185", name: "BOOKER, CORY A" }),
    ]);
    expect(matchCandidate(row(), index, noReceipts, "2026")).toEqual({
      kind: "matched",
      candId: "S6NJ00185",
      cnName: "BOOKER, CORY A",
    });
  });

  it("prefers the primary-cycle subset", () => {
    const index = buildCnIndex([
      cn({ candId: "S1", name: "BOOKER, ALICE", electionYear: 2026 }),
      cn({ candId: "S2", name: "BOOKER, BOB", electionYear: 2024 }),
    ]);
    // First name "Pat" matches neither, so only the cycle subset disambiguates.
    const result = matchCandidate(
      row({ fullName: "Sen. Pat Booker [D-NJ]" }),
      index,
      noReceipts,
      "2026",
    );
    expect(result).toEqual({
      kind: "matched",
      candId: "S1",
      cnName: "BOOKER, ALICE",
    });
  });

  it("narrows by exact first name", () => {
    const index = buildCnIndex([
      cn({ candId: "S1", name: "BOOKER, CORY A" }),
      cn({ candId: "S2", name: "BOOKER, JAMES" }),
    ]);
    expect(matchCandidate(row(), index, noReceipts, "2026")).toEqual({
      kind: "matched",
      candId: "S1",
      cnName: "BOOKER, CORY A",
    });
  });

  it("falls back to a unique first-initial match", () => {
    const index = buildCnIndex([
      cn({ candId: "S1", name: "BOOKER, KYLE" }),
      cn({ candId: "S2", name: "BOOKER, CHRISTOPHER" }),
    ]);
    expect(matchCandidate(row(), index, noReceipts, "2026")).toEqual({
      kind: "matched",
      candId: "S2",
      cnName: "BOOKER, CHRISTOPHER",
    });
  });

  it("breaks first-name ties with CAND_ICI for incumbents", () => {
    const index = buildCnIndex([
      cn({ candId: "S1", name: "BOOKER, CORY", ici: "C" }),
      cn({ candId: "S2", name: "BOOKER, CORY", ici: "I" }),
    ]);
    expect(
      matchCandidate(row({ isIncumbent: true }), index, noReceipts, "2026"),
    ).toEqual({ kind: "matched", candId: "S2", cnName: "BOOKER, CORY" });
  });

  it("picks the highest-receipts CAND_ID for the same person", () => {
    const index = buildCnIndex([
      cn({ candId: "S1", name: "BOOKER, CORY" }),
      cn({ candId: "S2", name: "BOOKER, CORY" }),
    ]);
    const receipts = new Map([["S2", 5000]]); // S1 missing → 0
    expect(matchCandidate(row(), index, receipts, "2026")).toEqual({
      kind: "matched",
      candId: "S2",
      cnName: "BOOKER, CORY",
    });
  });

  it("returns ambiguous for genuinely different people instead of guessing", () => {
    const index = buildCnIndex([
      cn({ candId: "S1", name: "BOOKER, CORY" }),
      cn({ candId: "S2", name: "BOOKER, CHRISTOPHER" }),
    ]);
    const result = matchCandidate(
      row({ fullName: "Sen. C. Booker [D-NJ]" }),
      index,
      noReceipts,
      "2026",
    );
    expect(result.kind).toBe("ambiguous");
    if (result.kind === "ambiguous") {
      expect(result.candidates.map((c) => c.candId).sort()).toEqual([
        "S1",
        "S2",
      ]);
    }
  });

  it("returns unmatched when no cn candidates share the seat+surname", () => {
    expect(matchCandidate(row(), buildCnIndex([]), noReceipts, "2026")).toEqual(
      { kind: "unmatched", reason: "no_cn_candidates" },
    );
  });

  it("returns unmatched no_state when the state cannot be determined", () => {
    expect(
      matchCandidate(
        row({ fullName: "Sen. Cory Booker", state: null }),
        buildCnIndex([cn({ candId: "S1", name: "BOOKER, CORY" })]),
        noReceipts,
        "2026",
      ),
    ).toEqual({ kind: "unmatched", reason: "no_state" });
  });
});
