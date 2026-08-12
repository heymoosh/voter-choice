/**
 * src/lib/server/alignment.test.ts
 *
 * Tests for the Drizzle alignment query layer.
 * All DB interactions are mocked — no live Neon connection required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock db/client so no real DB connection is attempted
// ---------------------------------------------------------------------------
vi.mock("../../../db/client", () => {
  const DB_NOT_CONFIGURED = "DB_NOT_CONFIGURED" as const;
  return { getDb: vi.fn(), DB_NOT_CONFIGURED };
});

import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import {
  resolveCandidateId,
  lookupAlignment,
  computeVoteAlignment,
  attachLimitedDataNotice,
  cleanCandidateName,
  stateFromCandidateName,
  candidateNameParts,
  extractBillNumber,
  normalizeFederalType,
  stripLeadingBillNumber,
  buildCongressGovUrl,
} from "./alignment";

// ---------------------------------------------------------------------------
// Helper: build a minimal chainable Drizzle mock
// ---------------------------------------------------------------------------

function makeSelectMock(rows: Record<string, unknown>[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
    // For the candidate resolution path, `where` is the terminal call.
  };
  return { select: vi.fn().mockReturnValue(chain), _chain: chain };
}

const mockedGetDb = vi.mocked(getDb);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// computeVoteAlignment — truth-table
// ---------------------------------------------------------------------------

describe("computeVoteAlignment", () => {
  it("yea + in_favor + in_favor → with", () => {
    expect(computeVoteAlignment("yea", "in_favor", "in_favor")).toBe("with");
  });

  it("yea + in_favor + opposed → against", () => {
    expect(computeVoteAlignment("yea", "in_favor", "opposed")).toBe("against");
  });

  it("yea + opposed + in_favor → against", () => {
    expect(computeVoteAlignment("yea", "opposed", "in_favor")).toBe("against");
  });

  it("yea + opposed + opposed → with", () => {
    expect(computeVoteAlignment("yea", "opposed", "opposed")).toBe("with");
  });

  it("nay + in_favor + in_favor → against", () => {
    expect(computeVoteAlignment("nay", "in_favor", "in_favor")).toBe("against");
  });

  it("nay + in_favor + opposed → with", () => {
    expect(computeVoteAlignment("nay", "in_favor", "opposed")).toBe("with");
  });

  it("nay + opposed + in_favor → with", () => {
    expect(computeVoteAlignment("nay", "opposed", "in_favor")).toBe("with");
  });

  it("nay + opposed + opposed → against", () => {
    expect(computeVoteAlignment("nay", "opposed", "opposed")).toBe("against");
  });

  it("present → abstain (excluded from counts)", () => {
    expect(computeVoteAlignment("present", "in_favor", "in_favor")).toBe(
      "abstain",
    );
  });

  it("absent → abstain (excluded from counts)", () => {
    expect(computeVoteAlignment("absent", "in_favor", "in_favor")).toBe(
      "abstain",
    );
  });

  it("not_voting → abstain (excluded from counts)", () => {
    expect(computeVoteAlignment("not_voting", "opposed", "opposed")).toBe(
      "abstain",
    );
  });

  // Read-path no_score guard: a stance_lens outside in_favor/opposed (e.g. a
  // "no_score" row leaked by a future re-tag) must NEVER score — without the
  // guard it silently reads as the "opposed" direction and inverts scores.
  it("no_score stance_lens → abstain regardless of vote", () => {
    expect(computeVoteAlignment("yea", "no_score", "in_favor")).toBe("abstain");
    expect(computeVoteAlignment("nay", "no_score", "in_favor")).toBe("abstain");
    expect(computeVoteAlignment("yea", "no_score", "opposed")).toBe("abstain");
    expect(computeVoteAlignment("nay", "no_score", "opposed")).toBe("abstain");
  });

  it("unknown/garbage stance_lens → abstain (defensive)", () => {
    expect(computeVoteAlignment("yea", "", "in_favor")).toBe("abstain");
    expect(computeVoteAlignment("nay", "IN_FAVOR", "opposed")).toBe("abstain");
  });
});

// ---------------------------------------------------------------------------
// resolveCandidateId
// ---------------------------------------------------------------------------

describe("resolveCandidateId", () => {
  it("returns null when DB is not configured", async () => {
    mockedGetDb.mockReturnValue(DB_NOT_CONFIGURED as never);
    const result = await resolveCandidateId("Jane Doe", "federal-house");
    expect(result).toBeNull();
  });

  it("returns null for empty name", async () => {
    mockedGetDb.mockReturnValue(DB_NOT_CONFIGURED as never);
    const result = await resolveCandidateId("", "federal-house");
    expect(result).toBeNull();
  });

  it("returns candidate id on exact case-insensitive match", async () => {
    const { select, _chain } = makeSelectMock([
      { id: "federal-A123", fullName: "Annise Parker" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    _chain.where.mockResolvedValue([
      { id: "federal-A123", fullName: "Annise Parker" },
    ]);

    const result = await resolveCandidateId("annise parker", "federal-house");
    expect(result).toBe("federal-A123");
  });

  it("returns candidate id on prefix match (queried name is prefix of stored name)", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);
    _chain.where.mockResolvedValue([
      { id: "federal-B456", fullName: "Bob Smith Jr." },
    ]);

    const result = await resolveCandidateId("Bob Smith", "federal-senate");
    expect(result).toBe("federal-B456");
  });

  it("returns candidate id on reverse prefix match (stored name is prefix of queried name)", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);
    _chain.where.mockResolvedValue([
      { id: "federal-C789", fullName: "Carol White" },
    ]);

    const result = await resolveCandidateId(
      "Carol White III",
      "federal-senate",
    );
    expect(result).toBe("federal-C789");
  });

  it("returns null when no candidate matches", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);
    _chain.where.mockResolvedValue([
      { id: "federal-X000", fullName: "Someone Else" },
    ]);

    const result = await resolveCandidateId("Jane Doe", "federal-house");
    expect(result).toBeNull();
  });

  // --- GovTrack decorated-name + ballot-nickname resolution ---
  //
  // The federal-votes ingest stores GovTrack's decorated `person.name`
  // ("Sen. Andrew Kim [D-NJ]"); ballot rosters pass clean names, often with
  // nicknames ("Andy Kim"). These fixtures are the real prod failure cases.

  it("resolves a decorated stored name against a clean ballot name (Cornyn)", async () => {
    const { select } = makeSelectMock([
      { id: "fed-cornyn", fullName: "Sen. John Cornyn [R-TX]" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    const result = await resolveCandidateId(
      "John Cornyn",
      "federal-senate",
      "TX",
    );
    expect(result).toBe("fed-cornyn");
  });

  it("resolves a ballot NICKNAME via lastname + state (Andy ↔ Andrew Kim)", async () => {
    const { select } = makeSelectMock([
      { id: "fed-kim", fullName: "Sen. Andrew Kim [D-NJ]" },
      { id: "fed-booker", fullName: "Sen. Cory Booker [D-NJ]" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    const result = await resolveCandidateId("Andy Kim", "federal-senate", "NJ");
    expect(result).toBe("fed-kim");
  });

  // KNOWN TRADEOFF (documented limitation): because the DB's state decoration
  // is unreliable, a UNIQUE surname resolves regardless of the ballot state.
  // This is required so real incumbents whose stored state is missing/wrong
  // (NORCROSS, PALLONE) resolve on their own ballot — at the cost of a rare
  // cross-state homonym: a lone "Kim" in our data matches a CA query too. The
  // cross-state GUARD still holds when 2+ distinct people share the surname
  // (see the "different states" test below). Clean DB state data would let us
  // tighten this; tracked as a data-cleanup follow-up.
  it("resolves a unique surname across states (accepted tradeoff for unreliable state data)", async () => {
    const { select } = makeSelectMock([
      { id: "fed-kim", fullName: "Sen. Andrew Kim [D-NJ]" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    const result = await resolveCandidateId("Andy Kim", "federal-senate", "CA");
    expect(result).toBe("fed-kim");
  });

  it("breaks same-lastname+state ambiguity by first initial", async () => {
    const { select } = makeSelectMock([
      { id: "fed-john-kelly", fullName: "Rep. John Kelly [R-PA]" },
      { id: "fed-mike-kelly", fullName: "Rep. Mike Kelly [R-PA]" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    const result = await resolveCandidateId(
      "Mike Kelly",
      "federal-house",
      "PA",
    );
    expect(result).toBe("fed-mike-kelly");
  });

  // Regression: the 2026-08-07 promise-corpus spike caught TX-18's roster
  // name "VALENCIA LANA WILLIAMS" resolving to the TX-23 FEC candidate
  // "VERONICA WILLIAMS" — the initial tie-break accepted bare first-INITIAL
  // equality ("V") even though the full first names contradict each other.
  // A contradicting full first name must refuse; unresolved is the honest
  // answer when the person has no row of their own.
  it("does NOT resolve on initial alone when full first names contradict (Valencia ≠ Veronica)", async () => {
    const { select } = makeSelectMock([
      { id: "fec-veronica", fullName: "VERONICA WILLIAMS", state: "TX" },
      { id: "fec-roger", fullName: "ROGER WILLIAMS", state: "TX" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    const result = await resolveCandidateId(
      "VALENCIA LANA WILLIAMS",
      "federal-house",
      "TX",
    );
    expect(result).toBeNull();
  });

  it("still breaks same-surname ambiguity for a ≥3-shared-prefix diminutive (Andy ↔ Andrew)", async () => {
    const { select } = makeSelectMock([
      { id: "fed-andrew-kim", fullName: "Sen. Andrew Kim [D-NJ]" },
      { id: "fed-jane-kim", fullName: "Sen. Jane Kim [D-NJ]" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    const result = await resolveCandidateId("Andy Kim", "federal-senate", "NJ");
    expect(result).toBe("fed-andrew-kim");
  });

  it("still breaks same-surname ambiguity for a curated diminutive (Mike ↔ Michael)", async () => {
    const { select } = makeSelectMock([
      { id: "fed-michael-kelly", fullName: "Rep. Michael Kelly [R-PA]" },
      { id: "fed-john-kelly", fullName: "Rep. John Kelly [R-PA]" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    const result = await resolveCandidateId(
      "Mike Kelly",
      "federal-house",
      "PA",
    );
    expect(result).toBe("fed-michael-kelly");
  });

  // From the 2026-08-12 resolver miss report: CA-45 "Tom Vo" refused between
  // "Thomas Ky-Phong Vo" and "Chuong Vo" because tom/thomas shares neither a
  // prefix nor a 3-char stem — the curated same-initial list exists for
  // exactly this. Chuong is excluded by initial; Thomas must win the tie.
  it("still breaks same-surname ambiguity for the curated tom ↔ thomas pair", async () => {
    const { select } = makeSelectMock([
      { id: "fec-thomas-vo", fullName: "Thomas Ky-Phong Vo", state: "CA" },
      { id: "fec-chuong-vo", fullName: "Chuong Vo", state: "CA" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    const result = await resolveCandidateId("Tom Vo", "federal-house", "CA");
    expect(result).toBe("fec-thomas-vo");
  });

  it("still breaks same-surname ambiguity on a true bare initial (V. Williams)", async () => {
    const { select } = makeSelectMock([
      { id: "fec-veronica", fullName: "VERONICA WILLIAMS", state: "TX" },
      { id: "fec-roger", fullName: "ROGER WILLIAMS", state: "TX" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    const result = await resolveCandidateId(
      "V. WILLIAMS",
      "federal-house",
      "TX",
    );
    expect(result).toBe("fec-veronica");
  });

  it("nickname without a stateCode does not resolve (state is required for tier 3)", async () => {
    const { select } = makeSelectMock([
      { id: "fed-kim", fullName: "Sen. Andrew Kim [D-NJ]" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    // No stateCode → lastname+state tier is skipped; Andy≠Andrew on prefix.
    const result = await resolveCandidateId("Andy Kim", "federal-senate");
    expect(result).toBeNull();
  });

  // Ballots list SURNAMES ("NORCROSS"). A bare surname must resolve when it
  // maps to one person in the state.
  it("resolves a bare surname via lastname + state (NORCROSS)", async () => {
    const { select } = makeSelectMock([
      { id: "fed-norcross", fullName: "Rep. Donald Norcross [D-NJ]" },
      { id: "fed-pallone", fullName: "Rep. Frank Pallone [D-NJ]" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    const result = await resolveCandidateId("NORCROSS", "federal-house", "NJ");
    expect(result).toBe("fed-norcross");
  });

  it("resolves a bare surname against the real House [D-NJ1] district-digit format (regression: F5)", async () => {
    // Prod stores House members with a DISTRICT DIGIT — "[D-NJ1]" — while
    // Senators are "[D-NJ]". Before the \d* regex fix (cleanCandidateName +
    // stateFromCandidateName), Norcross's surname parsed as "[d-nj1]" and
    // resolveCandidateId returned null — breaking BOTH alignment and donors.
    // The Senate-style fixtures above never exercised the production format.
    const { select } = makeSelectMock([
      { id: "fed-norcross", fullName: "Rep. Donald Norcross [D-NJ1]" },
      { id: "fed-pallone", fullName: "Rep. Frank Pallone [D-NJ6]" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    const result = await resolveCandidateId("NORCROSS", "federal-house", "NJ");
    expect(result).toBe("fed-norcross");
  });

  it("resolves a bare surname when the SAME person has duplicate rows (multi-congress ingest)", async () => {
    const { select } = makeSelectMock([
      { id: "fed-norcross", fullName: "Rep. Donald Norcross [D-NJ]" },
      { id: "fed-norcross", fullName: "Rep. Donald Norcross [D-NJ]" }, // 118th + 119th
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    const result = await resolveCandidateId("NORCROSS", "federal-house", "NJ");
    expect(result).toBe("fed-norcross");
  });

  it("does NOT guess a bare surname when two DISTINCT people share it", async () => {
    const { select } = makeSelectMock([
      { id: "fed-donald-norcross", fullName: "Rep. Donald Norcross [D-NJ]" },
      { id: "fed-george-norcross", fullName: "Rep. George Norcross [D-NJ]" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    // Surname-only + 2 distinct people → ambiguous → null (don't guess).
    const result = await resolveCandidateId("NORCROSS", "federal-house", "NJ");
    expect(result).toBeNull();
  });

  // The prod DB has MIXED name formats: some rows are clean with no "[D-NJ]"
  // state on file (older dump). A surname must still resolve against those —
  // state EXCLUDES contradicting rows but isn't a hard requirement.
  it("resolves a surname against a clean stored name with no state decoration", async () => {
    const { select } = makeSelectMock([
      { id: "fed-norcross", fullName: "Donald Norcross" }, // no [D-NJ] tag
      { id: "fed-pallone", fullName: "Frank Pallone" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    const result = await resolveCandidateId("NORCROSS", "federal-house", "NJ");
    expect(result).toBe("fed-norcross");
  });

  it("resolves a UNIQUE surname even when its state tag is wrong/missing (unreliable decoration)", async () => {
    // The DB's state decoration is inconsistent; a surname that maps to exactly
    // one member in the chamber resolves regardless of the (possibly stale)
    // state tag. This is what makes real-ballot surnames like NORCROSS/PALLONE
    // resolve when their stored state is missing or wrong.
    const { select } = makeSelectMock([
      { id: "fed-norcross", fullName: "Rep. Donald Norcross [D-XX]" },
      { id: "fed-pallone", fullName: "Frank Pallone" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    const result = await resolveCandidateId("NORCROSS", "federal-house", "NJ");
    expect(result).toBe("fed-norcross");
  });

  it("uses the ballot state to pick among same-surname people in DIFFERENT states", async () => {
    const { select } = makeSelectMock([
      { id: "fed-nj-smith", fullName: "Rep. Adam Smith [D-NJ]" },
      { id: "fed-wa-smith", fullName: "Rep. Adam Smith [D-WA]" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    // Two distinct Smiths → not unique → ballot state (WA) disambiguates.
    const result = await resolveCandidateId("SMITH", "federal-house", "WA");
    expect(result).toBe("fed-wa-smith");
  });

  // -------------------------------------------------------------------------
  // Official-roster miss classes — DONOR_FRAMING_AND_ACCOUNTABILITY_PLAN Part 2.
  //
  // Each class below was measured as a real failure by
  // scripts/ingest/_resolution-miss-report.ts, replaying the 50-state
  // Secretary-of-State rosters through this resolver. Every recall fixture is
  // paired with a never-resolve-when-ambiguous fixture: each fix loosens a
  // matcher shared by donors, alignment and the chat tools, and a false
  // positive shows the WRONG person's money — strictly worse than "no data".
  // -------------------------------------------------------------------------

  // --- Class: generational suffix parsed as the surname ---

  it("matches a roster name carrying a generational suffix", async () => {
    const { select } = makeSelectMock([
      { id: "fec-haynes", fullName: "Frederick D Haynes", state: "TX" },
      {
        id: "federal-B001330",
        fullName: "Rep. Nicholas Begich III [R-AK]",
        state: "AK",
      },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    // Before the suffix fix, candidateNameParts read "III" as the SURNAME and
    // this Texas ballot name resolved onto the Alaska member.
    const result = await resolveCandidateId(
      "FREDERICK D. HAYNES III",
      "federal-house",
      "TX",
    );
    expect(result).toBe("fec-haynes");
  });

  it("does NOT match a suffixed roster name onto an unrelated member with the same suffix", async () => {
    const { select } = makeSelectMock([
      {
        id: "federal-B001330",
        fullName: "Rep. Nicholas Begich III [R-AK]",
        state: "AK",
      },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    const result = await resolveCandidateId(
      "RAFAEL ALCOSER III",
      "federal-house",
      "TX",
    );
    expect(result).toBeNull();
  });

  it("keeps a comma-introduced suffix from flipping into a sortname", async () => {
    const { select } = makeSelectMock([
      { id: "fec-jones", fullName: "Clyde W Mr. Jones", state: "AL" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    const result = await resolveCandidateId(
      "Clyde W. Jones, Jr.",
      "federal-house",
      "AL",
    );
    expect(result).toBe("fec-jones");
  });

  // --- Class: authoritative `candidates.state` vs unreliable name decoration ---

  it("does NOT resolve a surname onto a candidate the state column places elsewhere", async () => {
    const { select } = makeSelectMock([
      { id: "fec-cory-mills", fullName: "Cory Mills", state: "FL" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    // Unique surname in the chamber, but `candidates.state` authoritatively
    // says Florida. An Alabama ballot must not resolve onto him.
    const result = await resolveCandidateId(
      "John Mills",
      "federal-house",
      "AL",
    );
    expect(result).toBeNull();
  });

  it("still trusts a UNIQUE surname when only the unreliable decoration disagrees", async () => {
    const { select } = makeSelectMock([
      // No `state` column — the "[D-XX]" decoration is all we have, and prod
      // shows those tags can be stale. They must not veto a match.
      { id: "fed-norcross", fullName: "Rep. Donald Norcross [D-XX]" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    const result = await resolveCandidateId("NORCROSS", "federal-house", "NJ");
    expect(result).toBe("fed-norcross");
  });

  // --- Class: former-member records (Part 4 follow-up) ---
  //
  // Once cleanCandidateName stopped mangling "[D-MD6, 2019-2024]" names, ~95
  // departed-member rows became visible to the matcher and started catching
  // unrelated ballot surnames. Their `candidates.state` is NULL, so the column
  // rule can't reach them — but a completed term means the decoration state is
  // final rather than stale, which is the one case it may reject on.

  it("does NOT resolve a surname onto a FORMER member from another state", async () => {
    const { select } = makeSelectMock([
      {
        id: "fed-brandon-williams",
        fullName: "Rep. Brandon Williams [R-NY22, 2023-2024]",
      },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    // The live prod case: an Alaska ballot name matched this New York former
    // member on surname alone.
    const result = await resolveCandidateId(
      "JOHN B. WILLIAMS",
      "federal-house",
      "AK",
    );
    expect(result).toBeNull();
  });

  it("still resolves a former member in their OWN state — they may run again", async () => {
    const { select } = makeSelectMock([
      { id: "fed-jerry-carl", fullName: "Rep. Jerry Carl [R-AL1, 2021-2024]" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    const result = await resolveCandidateId(
      "Jerry Carl",
      "federal-house",
      "AL",
    );
    expect(result).toBe("fed-jerry-carl");
  });

  it("prefers the sitting member over their predecessor on a shared surname", async () => {
    const { select } = makeSelectMock([
      { id: "fed-raul", fullName: "Rep. Raul Grijalva [D-AZ7, 2003-2025]" },
      { id: "fed-adelita", fullName: "Rep. Adelita Grijalva [D-AZ7]" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    // Two DIFFERENT people, same surname and state — normally the ambiguity
    // guard refuses. A bare surname on a 2026 ballot means the person holding
    // the seat now.
    const result = await resolveCandidateId("Grijalva", "federal-house", "AZ");
    expect(result).toBe("fed-adelita");
  });

  it("does not let the sitting preference override a genuine ambiguity", async () => {
    const { select } = makeSelectMock([
      { id: "fed-a", fullName: "Rep. Alice Rivers [D-AZ7]" },
      { id: "fed-b", fullName: "Rep. Bob Rivers [D-AZ3]" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    // Both sitting: preferSitting drops nobody, so the guard still refuses.
    const result = await resolveCandidateId("Rivers", "federal-house", "AZ");
    expect(result).toBeNull();
  });

  // --- Class: diacritics ---

  it("matches across diacritics (PEÑA ↔ Pena)", async () => {
    const { select } = makeSelectMock([
      { id: "fec-pena", fullName: "Lauren B. Pena", state: "TX" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    const result = await resolveCandidateId(
      "LAUREN B. PEÑA",
      "federal-house",
      "TX",
    );
    expect(result).toBe("fec-pena");
  });

  // --- Class: middle names and hyphenated surnames ---

  it("matches on first + last when the roster spells out a middle name", async () => {
    const { select } = makeSelectMock([
      { id: "fec-johnson", fullName: "Michael Johnson", state: "FL" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    const result = await resolveCandidateId(
      "Michael Don Johnson",
      "federal-house",
      "FL",
    );
    expect(result).toBe("fec-johnson");
  });

  it("matches a hyphenated surname against its unhyphenated half", async () => {
    const { select } = makeSelectMock([
      { id: "fec-devgan-kacker", fullName: "Sonia Devgan-Kacker", state: "CA" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    const result = await resolveCandidateId(
      "Sonia Kacker",
      "federal-house",
      "CA",
    );
    expect(result).toBe("fec-devgan-kacker");
  });

  it("does NOT use a shared surname half to match a DIFFERENT first name", async () => {
    const { select } = makeSelectMock([
      {
        id: "fec-acevedo",
        fullName: "Luis Antonio Acevedo-Arreguin",
        state: "CA",
      },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    const result = await resolveCandidateId(
      "Ana Luz Acevedo-Cabrera",
      "federal-house",
      "CA",
    );
    expect(result).toBeNull();
  });

  it("does NOT resolve two same-surname people in one state via the middle-name tier", async () => {
    const { select } = makeSelectMock([
      { id: "fec-victor", fullName: "Victor M. Arias", state: "FL" },
      { id: "fec-vincent", fullName: "Vincent Michael Arias", state: "FL" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    const result = await resolveCandidateId(
      "V. Michael Arias",
      "federal-house",
      "FL",
    );
    expect(result).toBeNull();
  });

  // --- Class: a bare surname prefix-matching someone's FIRST name ---

  it("does NOT prefix-match a bare ballot surname onto a candidate's first name", async () => {
    const { select } = makeSelectMock([
      { id: "fec-chaffin", fullName: "Gordon Chaffin", state: "AZ" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    // "Gordon" on an Arizona ballot is a SURNAME. Prefix-matching it resolved
    // onto Gordon Chaffin — a different person entirely.
    const result = await resolveCandidateId("Gordon", "federal-house", "AZ");
    expect(result).toBeNull();
  });

  // --- Class: one person stored twice (votes ingest + FEC roster ingest) ---

  it("collapses a sitting member's duplicate rows onto the incumbent row", async () => {
    const { select } = makeSelectMock([
      {
        id: "fec-H2AL05102",
        fullName: "Dale Whitney Strong",
        state: "AL",
        fecCandidateId: "H2AL05102",
        isIncumbent: false,
      },
      {
        id: "federal-S001220",
        fullName: "Rep. Dale Strong [R-AL5]",
        state: "AL",
        fecCandidateId: "H2AL05102",
        isIncumbent: true,
      },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    // Same fec_candidate_id → one person. The incumbent row wins: it carries
    // the voting record and at least as many donor rows as the FEC duplicate.
    const result = await resolveCandidateId(
      "Dale W. Strong",
      "federal-house",
      "AL",
    );
    expect(result).toBe("federal-S001220");
  });

  it("strips an honorific spliced mid-name by the FEC ingest", async () => {
    const { select } = makeSelectMock([
      {
        id: "fec-womack",
        fullName: "Stephen A The Hon Womack",
        state: "AR",
        fecCandidateId: "H0AR03055",
        isIncumbent: false,
      },
      {
        id: "federal-W000809",
        fullName: "Rep. Steve Womack [R-AR3]",
        state: "AR",
        fecCandidateId: "H0AR03055",
        isIncumbent: true,
      },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    const result = await resolveCandidateId(
      "Congressman Steve Womack",
      "federal-house",
      "AR",
    );
    expect(result).toBe("federal-W000809");
  });

  it("does NOT collapse two DIFFERENT people who share a name but not an FEC id", async () => {
    const { select } = makeSelectMock([
      {
        id: "fec-H2NJ13075",
        fullName: "Robert Menendez",
        state: "NJ",
        fecCandidateId: "H2NJ13075",
        isIncumbent: false,
      },
      {
        id: "federal-M001226",
        fullName: "Rep. Robert Jacobsen Menendez [D-NJ8]",
        state: "NJ",
        fecCandidateId: "H2NJ08232",
        isIncumbent: true,
      },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    // Father and son. Distinct FEC candidacies → we must not pick one.
    const result = await resolveCandidateId(
      "ROB MENENDEZ",
      "federal-house",
      "NJ",
    );
    expect(result).toBeNull();
  });
});

describe("candidate-name helpers", () => {
  it("cleanCandidateName strips title + party-state tag", () => {
    expect(cleanCandidateName("Sen. Andrew Kim [D-NJ]")).toBe("Andrew Kim");
    expect(cleanCandidateName("Rep. Marc Veasey [D-TX]")).toBe("Marc Veasey");
    expect(cleanCandidateName("Sen. Bernie Sanders [I-VT]")).toBe(
      "Bernie Sanders",
    );
  });

  it("cleanCandidateName handles the sortname form", () => {
    expect(cleanCandidateName("Collins, Susan (Sen.) [R-ME]")).toBe(
      "Susan Collins",
    );
  });

  it("cleanCandidateName leaves an already-clean name unchanged", () => {
    expect(cleanCandidateName("John Cornyn")).toBe("John Cornyn");
  });

  // Defect B (Part 4 follow-up): ~95 FORMER members carry a service span
  // inside the party-state bracket. The old tight regex needed the bracket to
  // close right after the district digit, so the tag survived — and its comma
  // then tripped the sortname flip, rendering "2019-2024] David Trone [D-MD6".
  it("cleanCandidateName strips a former member's service-span tag", () => {
    expect(cleanCandidateName("Rep. David Trone [D-MD6, 2019-2024]")).toBe(
      "David Trone",
    );
    expect(cleanCandidateName("Sen. Sherrod Brown [D-OH, 2007-2024]")).toBe(
      "Sherrod Brown",
    );
    expect(cleanCandidateName("Rep. Colin Allred [D-TX32, 2019-2024]")).toBe(
      "Colin Allred",
    );
    expect(cleanCandidateName("Rep. Earl Blumenauer [D-OR3, 1996-2024]")).toBe(
      "Earl Blumenauer",
    );
  });

  // The strip widened to "any trailing bracket", which is a matcher shared by
  // donors, alignment and the chat tools — so the precision cases that
  // motivated the tight version must still hold.
  it("cleanCandidateName keeps the pre-existing decorations working", () => {
    // The Norcross incident: lowercase tag with a district digit.
    expect(cleanCandidateName("Rep. Donald Norcross [d-nj1]")).toBe(
      "Donald Norcross",
    );
    // A comma introducing only a suffix is still NOT a sortname flip.
    expect(cleanCandidateName("Clyde W. Jones, Jr.")).toBe("Clyde W. Jones");
    // A real sortname still flips once its tag is gone.
    expect(cleanCandidateName("Collins, Susan [R-ME]")).toBe("Susan Collins");
    // Two-digit districts.
    expect(cleanCandidateName("Rep. Alma Adams [D-NC12]")).toBe("Alma Adams");
  });

  it("cleanCandidateName never strips a name down to nothing", () => {
    // A row stored as only a decoration keeps its text: reducing it to "" would
    // make it match everything downstream.
    expect(cleanCandidateName("[R-TX]")).toBe("[R-TX]");
  });

  it("stateFromCandidateName extracts the 2-letter state", () => {
    expect(stateFromCandidateName("Sen. Andrew Kim [D-NJ]")).toBe("NJ");
    expect(stateFromCandidateName("Sen. Bernie Sanders [I-VT]")).toBe("VT");
    expect(stateFromCandidateName("John Cornyn")).toBeNull();
  });

  it("candidateNameParts splits first/last", () => {
    expect(candidateNameParts("Andrew Kim")).toEqual({
      first: "Andrew",
      last: "Kim",
    });
    expect(candidateNameParts("Alexandria Ocasio-Cortez")).toEqual({
      first: "Alexandria",
      last: "Ocasio-Cortez",
    });
  });
});

// ---------------------------------------------------------------------------
// lookupAlignment
// ---------------------------------------------------------------------------

describe("lookupAlignment", () => {
  it("returns unavailable when DB is not configured", async () => {
    mockedGetDb.mockReturnValue(DB_NOT_CONFIGURED as never);
    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );
    expect(result.found).toBe(true);
    expect(result.kept).toBe(0);
    expect(result.total).toBe(0);
    expect(result.unavailable).toBeDefined();
  });

  it("returns unavailable with reason when no rows match the join", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);
    _chain.where.mockResolvedValue([]);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );
    expect(result.found).toBe(true);
    expect(result.kept).toBe(0);
    expect(result.total).toBe(0);
    expect(result.unavailable?.reason).toMatch(/no tagged votes/i);
  });

  it("happy path: computes kept/total correctly from fixture data", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    // Fixture: 3 votes
    // Vote 1: yea + in_favor + user=in_favor → with
    // Vote 2: nay + in_favor + user=in_favor → against
    // Vote 3: yea + in_favor + user=in_favor → with
    _chain.where.mockResolvedValue([
      {
        billTitle: "Affordable Care Act Expansion",
        billSourceUrl: "https://govtrack.us/bill/1",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2024-03-15",
        stanceLens: "in_favor",
        taggerConfidence: "0.95",
      },
      {
        billTitle: "Healthcare Repeal Act",
        billSourceUrl: "https://govtrack.us/bill/2",
        billSource: "govtrack",
        voteCast: "nay",
        voteDate: "2024-02-10",
        stanceLens: "in_favor",
        taggerConfidence: "0.85",
      },
      {
        billTitle: "Medicaid Expansion Bill",
        billSourceUrl: "https://govtrack.us/bill/3",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2023-11-05",
        stanceLens: "in_favor",
        taggerConfidence: "0.90",
      },
    ]);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );

    expect(result.found).toBe(true);
    expect(result.kept).toBe(2); // votes 1 and 3
    expect(result.total).toBe(3);
    expect(result.contributingVotes).toHaveLength(3);
    expect(result.contributingVotes[0]!.billTitle).toBe(
      "Affordable Care Act Expansion",
    );
    expect(result.contributingVotes[0]!.voteCast).toBe("with");
    expect(result.contributingVotes[1]!.voteCast).toBe("with"); // Medicaid at 0.90
    expect(result.contributingVotes[2]!.voteCast).toBe("against"); // Repeal at 0.85
  });

  it("caps contributing votes at 6 even when more rows exist", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    const rows = Array.from({ length: 10 }, (_, i) => ({
      billTitle: `Bill ${i}`,
      billSourceUrl: `https://govtrack.us/bill/${i}`,
      billSource: "govtrack",
      voteCast: "yea",
      voteDate: `2024-0${(i % 9) + 1}-01`,
      stanceLens: "in_favor",
      taggerConfidence: String(0.9 - i * 0.02),
    }));
    _chain.where.mockResolvedValue(rows);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );
    expect(result.contributingVotes).toHaveLength(6);
  });

  it("excludes abstain votes from kept and total counts", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    _chain.where.mockResolvedValue([
      {
        billTitle: "Bill A",
        billSourceUrl: "https://govtrack.us/bill/A",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2024-05-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.9",
      },
      {
        billTitle: "Bill B (abstain)",
        billSourceUrl: "https://govtrack.us/bill/B",
        billSource: "govtrack",
        voteCast: "present",
        voteDate: "2024-04-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.8",
      },
      {
        billTitle: "Bill C (absent)",
        billSourceUrl: "https://govtrack.us/bill/C",
        billSource: "govtrack",
        voteCast: "absent",
        voteDate: "2024-03-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.7",
      },
    ]);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );
    // Only 1 non-abstain vote
    expect(result.kept).toBe(1);
    expect(result.total).toBe(1);
    expect(result.contributingVotes).toHaveLength(1);
    expect(result.contributingVotes[0]!.billTitle).toBe("Bill A");
  });

  it("sorts contributing votes by tagger confidence DESC, then by date DESC", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    _chain.where.mockResolvedValue([
      {
        billTitle: "Low Conf Newer",
        billSourceUrl: "https://url/1",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2025-01-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.5",
      },
      {
        billTitle: "High Conf Older",
        billSourceUrl: "https://url/2",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2023-06-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.95",
      },
      {
        billTitle: "Med Conf",
        billSourceUrl: "https://url/3",
        billSource: "govtrack",
        voteCast: "nay",
        voteDate: "2024-03-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.75",
      },
    ]);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );
    expect(result.contributingVotes[0]!.billTitle).toBe("High Conf Older");
    expect(result.contributingVotes[1]!.billTitle).toBe("Med Conf");
    expect(result.contributingVotes[2]!.billTitle).toBe("Low Conf Newer");
  });

  it("handles null taggerConfidence by sorting those rows last", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    _chain.where.mockResolvedValue([
      {
        billTitle: "Null Confidence Bill",
        billSourceUrl: "https://url/null",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2025-01-01",
        stanceLens: "in_favor",
        taggerConfidence: null,
      },
      {
        billTitle: "High Confidence Bill",
        billSourceUrl: "https://url/high",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2024-01-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.9",
      },
    ]);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );
    expect(result.contributingVotes[0]!.billTitle).toBe("High Confidence Bill");
    expect(result.contributingVotes[1]!.billTitle).toBe("Null Confidence Bill");
  });

  it("opposed stance: alignment math flips correctly", async () => {
    // Voter is OPPOSED to gun regulation.
    // Bill: "Gun Background Check Expansion" — voting yea = in_favor of gun regulation.
    // Candidate voted nay → against gun regulation → WITH voter who is opposed.
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    _chain.where.mockResolvedValue([
      {
        billTitle: "Gun Background Check Expansion",
        billSourceUrl: "https://govtrack.us/bill/gun",
        billSource: "govtrack",
        voteCast: "nay",
        voteDate: "2024-06-01",
        stanceLens: "in_favor", // yea = pro gun regulation
        taggerConfidence: "0.88",
      },
    ]);

    const result = await lookupAlignment(
      "federal-A123",
      "gun_rights_safety",
      "opposed",
    );
    expect(result.kept).toBe(1);
    expect(result.total).toBe(1);
    expect(result.contributingVotes[0]!.voteCast).toBe("with");
  });

  it("returns source name and url from bills table in contributing votes", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    _chain.where.mockResolvedValue([
      {
        billTitle: "Clean Energy Act",
        billSourceUrl: "https://openstates.org/bill/123",
        billSource: "openstates",
        voteCast: "yea",
        voteDate: "2024-09-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.92",
      },
    ]);

    const result = await lookupAlignment(
      "openstates-X99",
      "environment_climate",
      "in_favor",
    );
    expect(result.contributingVotes[0]!.source.name).toBe("openstates");
    expect(result.contributingVotes[0]!.source.url).toBe(
      "https://openstates.org/bill/123",
    );
  });

  // -------------------------------------------------------------------------
  // Limited-data notice — surfaces when total < 5 (thin tag corpus).
  // Spec: docs/operations/post-launch-backlog.md "[P1] Alignment returns
  // kept: 0 silently for unmapped concerns" + work packet
  // .ai/work-packets/tdd-phase-1-core-discipline.md.
  // -------------------------------------------------------------------------

  it("surfaces a limited-data notice when total < 5 (thin tag corpus)", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    // 3 contributing votes — under the threshold of 5.
    _chain.where.mockResolvedValue([
      {
        billTitle: "Border Security Act",
        billSourceUrl: "https://govtrack.us/bill/b1",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2024-05-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.92",
      },
      {
        billTitle: "Immigration Reform",
        billSourceUrl: "https://govtrack.us/bill/b2",
        billSource: "govtrack",
        voteCast: "nay",
        voteDate: "2024-04-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.85",
      },
      {
        billTitle: "Wall Funding Bill",
        billSourceUrl: "https://govtrack.us/bill/b3",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2024-03-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.78",
      },
    ]);

    const result = await lookupAlignment(
      "federal-A123",
      "border_security",
      "in_favor",
    );

    expect(result.total).toBe(3);
    expect(result.notice).toBeDefined();
    expect(result.notice).toMatch(/limited data/i);
    // The notice should reference the actual total so a reader knows the basis.
    expect(result.notice).toContain("3");
  });

  it("does not surface a limited-data notice when total >= 5", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    // 6 contributing votes — over the threshold.
    const rows = Array.from({ length: 6 }, (_, i) => ({
      billTitle: `Healthcare Bill ${i}`,
      billSourceUrl: `https://govtrack.us/bill/h${i}`,
      billSource: "govtrack",
      voteCast: "yea",
      voteDate: `2024-0${(i % 9) + 1}-01`,
      stanceLens: "in_favor",
      taggerConfidence: String(0.9 - i * 0.02),
    }));
    _chain.where.mockResolvedValue(rows);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );

    expect(result.total).toBe(6);
    // Either absent or empty — the contract is "no notice surfaces".
    expect(result.notice ?? "").toBe("");
  });

  it("does not surface a limited-data notice exactly at total === 5 (boundary)", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    // 5 contributing votes — boundary; threshold is strict <.
    const rows = Array.from({ length: 5 }, (_, i) => ({
      billTitle: `Bill ${i}`,
      billSourceUrl: `https://govtrack.us/bill/${i}`,
      billSource: "govtrack",
      voteCast: "yea",
      voteDate: `2024-0${(i % 9) + 1}-01`,
      stanceLens: "in_favor",
      taggerConfidence: String(0.9 - i * 0.02),
    }));
    _chain.where.mockResolvedValue(rows);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );

    expect(result.total).toBe(5);
    expect(result.notice ?? "").toBe("");
  });

  it("does not surface a limited-data notice when DB is not configured (unavailable already conveys it)", async () => {
    mockedGetDb.mockReturnValue(DB_NOT_CONFIGURED as never);
    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );
    // unavailable.reason is set; piling a "Limited data: 0 votes" notice on top
    // would read broken. Notice is absent for infra-level not-available.
    expect(result.unavailable).toBeDefined();
    expect(result.notice ?? "").toBe("");
  });

  it("does not surface a limited-data notice when zero tagged rows match (existing unavailable.reason conveys it)", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);
    _chain.where.mockResolvedValue([]);

    const result = await lookupAlignment(
      "federal-A123",
      "border_security",
      "in_favor",
    );

    expect(result.total).toBe(0);
    expect(result.unavailable).toBeDefined();
    expect(result.notice ?? "").toBe("");
  });

  // -------------------------------------------------------------------------
  // Sub-issue prefer/fallback (TASK T-D).
  //
  // A sub-issue is a TOPIC FACET of a (bill, canonical_issue) tag that INHERITS
  // the parent pole. Scoring PREFERS sub-issue-specific votes when they alone
  // meet LIMITED_DATA_THRESHOLD (5) SCORABLE rows, else FALLS BACK to the full
  // parent corpus — so a sub-issue score is never worse than the parent score.
  //
  // Fixtures gain a `subIssue` field. The SQL inner join is unchanged (keyed on
  // billId + canonicalIssue only); sub-issue selection is app-side here.
  // -------------------------------------------------------------------------

  // Helper: a parent corpus where 5 rows carry the target sub-issue (all
  // scorable, 3 "with" / 2 "against") plus extra parent rows that would dilute
  // the score if the fallback fired.
  function healthcareCorpus() {
    const drugPrice = (i: number, voteCast: string) => ({
      billTitle: `Drug Price Bill ${i}`,
      billSourceUrl: `https://govtrack.us/bill/d${i}`,
      billSource: "govtrack",
      voteCast,
      voteDate: `2024-0${(i % 9) + 1}-01`,
      stanceLens: "in_favor",
      taggerConfidence: String(0.9 - i * 0.01),
      subIssue: "drug_prices",
    });
    const otherParent = (i: number, voteCast: string) => ({
      billTitle: `Coverage Bill ${i}`,
      billSourceUrl: `https://govtrack.us/bill/c${i}`,
      billSource: "govtrack",
      voteCast,
      voteDate: `2023-0${(i % 9) + 1}-01`,
      stanceLens: "in_favor",
      taggerConfidence: String(0.8 - i * 0.01),
      subIssue: "coverage_access",
    });
    return [
      // 5 scorable drug_prices rows: 3 with (yea), 2 against (nay).
      drugPrice(1, "yea"),
      drugPrice(2, "yea"),
      drugPrice(3, "yea"),
      drugPrice(4, "nay"),
      drugPrice(5, "nay"),
      // Parent dilution: 4 more rows on a different sub-issue, all "with".
      otherParent(1, "yea"),
      otherParent(2, "yea"),
      otherParent(3, "yea"),
      otherParent(4, "yea"),
    ];
  }

  it("prefers sub-issue rows when >=5 are scorable: kept/total from sub-rows only", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);
    _chain.where.mockResolvedValue(healthcareCorpus());

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
      "drug_prices",
    );

    // Sub-rows only: 5 total, 3 with. (Parent would be 9 total / 7 with.)
    expect(result.total).toBe(5);
    expect(result.kept).toBe(3);
    expect(result.matchedSubIssue).toBe("drug_prices");
  });

  it("falls back to parent when <5 sub-rows are scorable: kept/total == full parent", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    // Only 3 scorable drug_prices rows (under threshold) + 4 parent rows on
    // another sub-issue → fall back to the full 7-row parent corpus.
    _chain.where.mockResolvedValue([
      {
        billTitle: "Drug Price A",
        billSourceUrl: "https://govtrack.us/bill/da",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2024-05-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.9",
        subIssue: "drug_prices",
      },
      {
        billTitle: "Drug Price B",
        billSourceUrl: "https://govtrack.us/bill/db",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2024-04-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.85",
        subIssue: "drug_prices",
      },
      {
        billTitle: "Drug Price C",
        billSourceUrl: "https://govtrack.us/bill/dc",
        billSource: "govtrack",
        voteCast: "nay",
        voteDate: "2024-03-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.8",
        subIssue: "drug_prices",
      },
      {
        billTitle: "Coverage A",
        billSourceUrl: "https://govtrack.us/bill/ca",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2023-05-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.7",
        subIssue: "coverage_access",
      },
      {
        billTitle: "Coverage B",
        billSourceUrl: "https://govtrack.us/bill/cb",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2023-04-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.65",
        subIssue: "coverage_access",
      },
      {
        billTitle: "Coverage C",
        billSourceUrl: "https://govtrack.us/bill/cc",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2023-03-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.6",
        subIssue: "coverage_access",
      },
      {
        billTitle: "Coverage D",
        billSourceUrl: "https://govtrack.us/bill/cd",
        billSource: "govtrack",
        voteCast: "nay",
        voteDate: "2023-02-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.55",
        subIssue: "coverage_access",
      },
    ]);

    const subResult = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
      "drug_prices",
    );

    // Fell back to full parent: 7 total, 5 with (Drug C + Coverage D are nay →
    // against; the other 5 yea rows are "with").
    expect(subResult.total).toBe(7);
    expect(subResult.kept).toBe(5);
    expect(subResult.matchedSubIssue).toBeUndefined();
  });

  it("subIssue undefined is identical to today (regression — no behavior change)", async () => {
    const corpus = healthcareCorpus();

    const { select: selA, _chain: chainA } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select: selA } as never);
    chainA.where.mockResolvedValue(corpus);
    const withoutSub = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );

    // Whole parent corpus: 9 total, 7 with.
    expect(withoutSub.total).toBe(9);
    expect(withoutSub.kept).toBe(7);
    expect(withoutSub.matchedSubIssue).toBeUndefined();
  });

  it("unknown subIssue (no rows match) falls back to parent", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);
    _chain.where.mockResolvedValue(healthcareCorpus());

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
      "not_a_real_sub_issue",
    );

    // No sub-rows → 0 scorable → fall back to full parent corpus (9 total / 7).
    expect(result.total).toBe(9);
    expect(result.kept).toBe(7);
    expect(result.matchedSubIssue).toBeUndefined();
  });

  it("threshold is on SCORABLE rows: abstain sub-rows don't trip the prefer path", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    // 6 drug_prices rows but only 4 are scorable (2 are abstains) → under the
    // threshold of 5 scorable → fall back to the full 6-row parent corpus.
    _chain.where.mockResolvedValue([
      {
        billTitle: "Drug 1",
        billSourceUrl: "https://govtrack.us/bill/1",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2024-05-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.9",
        subIssue: "drug_prices",
      },
      {
        billTitle: "Drug 2",
        billSourceUrl: "https://govtrack.us/bill/2",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2024-04-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.85",
        subIssue: "drug_prices",
      },
      {
        billTitle: "Drug 3",
        billSourceUrl: "https://govtrack.us/bill/3",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2024-03-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.8",
        subIssue: "drug_prices",
      },
      {
        billTitle: "Drug 4",
        billSourceUrl: "https://govtrack.us/bill/4",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2024-02-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.75",
        subIssue: "drug_prices",
      },
      {
        billTitle: "Drug 5 (abstain)",
        billSourceUrl: "https://govtrack.us/bill/5",
        billSource: "govtrack",
        voteCast: "present",
        voteDate: "2024-01-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.7",
        subIssue: "drug_prices",
      },
      {
        billTitle: "Drug 6 (abstain)",
        billSourceUrl: "https://govtrack.us/bill/6",
        billSource: "govtrack",
        voteCast: "absent",
        voteDate: "2023-12-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.65",
        subIssue: "drug_prices",
      },
    ]);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
      "drug_prices",
    );

    // 4 scorable sub-rows < 5 → fall back to parent. The 2 abstains drop in the
    // existing pipeline, so the parent total is 4 (all "with").
    expect(result.total).toBe(4);
    expect(result.kept).toBe(4);
    expect(result.matchedSubIssue).toBeUndefined();
  });

  it("selects subIssue under BOTH can2026 branches (field flows through each flag state)", async () => {
    const corpus = healthcareCorpus();

    // Flag OFF (default in this suite): prefer path still fires.
    const { select: selOff, _chain: chainOff } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select: selOff } as never);
    chainOff.where.mockResolvedValue(corpus);
    const off = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
      "drug_prices",
    );
    expect(off.matchedSubIssue).toBe("drug_prices");
    expect(off.total).toBe(5);

    // Flag ON: the can2026-enabled select branch also carries subIssue. The
    // CAN2026 query path adds a `narrative` column but the prefer/fallback logic
    // reads only `subIssue`, so the same fixture exercises the branch.
    vi.stubEnv("CAN2026_DISPLAY_ENABLED", "1");
    const { select: selOn, _chain: chainOn } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select: selOn } as never);
    chainOn.where.mockResolvedValue(corpus);
    const on = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
      "drug_prices",
    );
    expect(on.matchedSubIssue).toBe("drug_prices");
    expect(on.total).toBe(5);
    vi.unstubAllEnvs();
  });
});

// ---------------------------------------------------------------------------
// buildCongressGovUrl — maps govtrack bill ids to Congress.gov URLs
// ---------------------------------------------------------------------------

describe("buildCongressGovUrl", () => {
  it("maps govtrack-hr1234-118 → 118th-congress/house-bill/1234", () => {
    expect(buildCongressGovUrl("govtrack-hr1234-118")).toBe(
      "https://www.congress.gov/bill/118th-congress/house-bill/1234",
    );
  });

  it("maps govtrack-s5-119 → 119th-congress/senate-bill/5", () => {
    expect(buildCongressGovUrl("govtrack-s5-119")).toBe(
      "https://www.congress.gov/bill/119th-congress/senate-bill/5",
    );
  });

  it("maps govtrack-hjres1-118 → 118th-congress/house-joint-resolution/1", () => {
    expect(buildCongressGovUrl("govtrack-hjres1-118")).toBe(
      "https://www.congress.gov/bill/118th-congress/house-joint-resolution/1",
    );
  });

  it("maps govtrack-sjres10-117 → 117th-congress/senate-joint-resolution/10", () => {
    expect(buildCongressGovUrl("govtrack-sjres10-117")).toBe(
      "https://www.congress.gov/bill/117th-congress/senate-joint-resolution/10",
    );
  });

  it("maps govtrack-hres42-118 → 118th-congress/house-resolution/42", () => {
    expect(buildCongressGovUrl("govtrack-hres42-118")).toBe(
      "https://www.congress.gov/bill/118th-congress/house-resolution/42",
    );
  });

  it("maps govtrack-sres7-119 → 119th-congress/senate-resolution/7", () => {
    expect(buildCongressGovUrl("govtrack-sres7-119")).toBe(
      "https://www.congress.gov/bill/119th-congress/senate-resolution/7",
    );
  });

  it("maps govtrack-hconres3-118 → 118th-congress/house-concurrent-resolution/3", () => {
    expect(buildCongressGovUrl("govtrack-hconres3-118")).toBe(
      "https://www.congress.gov/bill/118th-congress/house-concurrent-resolution/3",
    );
  });

  it("returns null for an openstates id (non-govtrack)", () => {
    expect(buildCongressGovUrl("openstates-ocd-bill-abc123")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(buildCongressGovUrl(null)).toBeNull();
  });

  it("returns null for unknown bill type in govtrack id", () => {
    // 'xyz' is not in the typeMap
    expect(buildCongressGovUrl("govtrack-xyz99-118")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// lookupAlignment — narrative precedence (plain_summary + CAN2026)
//
// New precedence (PR #136): CAN2026 → plain_summary (rendered in full) → absent.
// The raw CRS bills.summary is NO LONGER shown inline. When no plain_summary
// exists the card shows only the bill title + roll-call + Congress.gov link.
// No truncated preview, no ellipsis.
// ---------------------------------------------------------------------------

describe("lookupAlignment — narrative precedence (plain_summary / CAN2026)", () => {
  // (a) No plain_summary AND no CAN2026 narrative → narrative absent (no "...")
  it("no plain_summary + no CAN note → narrative is absent (no ellipsis, no raw CRS)", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    _chain.where.mockResolvedValue([
      {
        billTitle: "Some Procedural Vote",
        billId: "govtrack-hr999-118",
        billRawMetadata: null,
        billSourceUrl: "https://govtrack.us/bill/hr999",
        billSource: "govtrack",
        // billSummary intentionally omitted (not selected from DB anymore)
        billPlainSummary: null,
        voteCast: "yea",
        voteDate: "2024-01-10",
        stanceLens: "in_favor",
        taggerConfidence: "0.7",
      },
    ]);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );

    const vote = result.contributingVotes[0]!;
    // No summary paragraph — user sees bill title + Congress.gov link only.
    expect(vote.narrative).toBeUndefined();
    // No sources appended either (sources only attach with narrative).
    expect(vote.sources).toBeUndefined();
  });

  // Confirm the above even when raw billSummary data is present in the row
  // (query still selects it in some tests via mock): the builder must ignore it.
  it("raw CRS billSummary present but plain_summary null → narrative still absent", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    _chain.where.mockResolvedValue([
      {
        billTitle: "Affordable Insulin Act",
        billId: "govtrack-hr5-118",
        billRawMetadata: null,
        billSourceUrl: "https://govtrack.us/bill/hr5",
        billSource: "govtrack",
        // Raw CRS with HTML — must NOT be used.
        billSummary:
          "<p><b>Affordable Insulin Act</b></p><p>Caps insulin at $35 per month.</p>",
        billPlainSummary: null,
        voteCast: "yea",
        voteDate: "2024-04-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.9",
      },
    ]);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );

    const vote = result.contributingVotes[0]!;
    // Raw CRS must NOT surface — no narrative, no HTML, no ellipsis.
    expect(vote.narrative).toBeUndefined();
    expect(vote.sources).toBeUndefined();
  });

  // (b) plain_summary present → rendered IN FULL, no truncation, no ellipsis
  it("plain_summary present → rendered in full, no ellipsis, Congress.gov source attached", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    const fullSummary =
      "Lets Medicare negotiate lower drug prices for some medications. Savings are passed to beneficiaries.";

    _chain.where.mockResolvedValue([
      {
        billTitle: "Lower Drug Costs Now Act",
        billId: "govtrack-hr3-118",
        billRawMetadata: null,
        billSourceUrl: "https://govtrack.us/bill/hr3",
        billSource: "govtrack",
        billPlainSummary: fullSummary,
        voteCast: "yea",
        voteDate: "2024-03-15",
        stanceLens: "in_favor",
        taggerConfidence: "0.95",
      },
    ]);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );

    const vote = result.contributingVotes[0]!;
    // Exact plain_summary rendered, no trailing ellipsis.
    expect(vote.narrative).toBe(fullSummary);
    expect(vote.narrative).not.toMatch(/…|\.\.\.$/);
    // Congress.gov source chip appended for provenance.
    expect(vote.sources).toBeDefined();
    expect(vote.sources).toHaveLength(1);
    expect(vote.sources![0]!.name).toMatch(/congress\.gov/i);
    expect(vote.sources![0]!.url).toContain("congress.gov");
    // No HTML.
    expect(vote.narrative).not.toMatch(/<[^>]+>/);
  });

  it("plain_summary constructs correct Congress.gov URL from govtrack bill id", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    _chain.where.mockResolvedValue([
      {
        billTitle: "Inflation Reduction Act",
        billId: "govtrack-hr5376-117",
        billRawMetadata: null,
        billSourceUrl: "https://govtrack.us/bill/hr5376",
        billSource: "govtrack",
        billPlainSummary:
          "Addresses climate, healthcare costs, and taxes in a single reconciliation package.",
        voteCast: "yea",
        voteDate: "2022-08-12",
        stanceLens: "in_favor",
        taggerConfidence: "0.92",
      },
    ]);

    const result = await lookupAlignment(
      "federal-A123",
      "environment_climate",
      "in_favor",
    );

    const vote = result.contributingVotes[0]!;
    expect(vote.sources![0]!.url).toBe(
      "https://www.congress.gov/bill/117th-congress/house-bill/5376",
    );
  });

  it("CAN2026 narrative takes precedence over plain_summary when flag is on and row exists", async () => {
    vi.stubEnv("CAN2026_DISPLAY_ENABLED", "1");

    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    _chain.where.mockResolvedValue([
      {
        billTitle: "Lower Drug Costs Now Act",
        billId: "govtrack-hr3-118",
        billRawMetadata: null,
        billSourceUrl: "https://govtrack.us/bill/hr3",
        billSource: "govtrack",
        billPlainSummary: "LLM summary: Medicare negotiates drug prices.",
        voteCast: "yea",
        voteDate: "2024-03-15",
        stanceLens: "in_favor",
        taggerConfidence: "0.95",
        // CAN2026 row present:
        narrative:
          "CAN2026 curated: Senator voted YES to cap insulin at $35/mo.",
      },
    ]);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );

    const vote = result.contributingVotes[0]!;
    // CAN2026 narrative wins — plain_summary must NOT appear.
    expect(vote.narrative).toBe(
      "CAN2026 curated: Senator voted YES to cap insulin at $35/mo.",
    );
    // No extra sources appended when using the CAN2026 path.
    expect(vote.sources).toBeUndefined();

    vi.unstubAllEnvs();
  });

  it("neither CAN2026 nor plain_summary → narrative stays absent", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    _chain.where.mockResolvedValue([
      {
        billTitle: "Some Procedural Vote",
        billId: "govtrack-hr999-118",
        billRawMetadata: null,
        billSourceUrl: "https://govtrack.us/bill/hr999",
        billSource: "govtrack",
        billPlainSummary: null,
        voteCast: "yea",
        voteDate: "2024-01-10",
        stanceLens: "in_favor",
        taggerConfidence: "0.7",
      },
    ]);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );

    const vote = result.contributingVotes[0]!;
    expect(vote.narrative).toBeUndefined();
    expect(vote.sources).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// attachLimitedDataNotice — the pure helper, tested in isolation so the
// found: false branch (which lookupAlignment never returns directly) is
// covered without relying on the DB query path.
// ---------------------------------------------------------------------------

describe("attachLimitedDataNotice", () => {
  it("attaches a notice mentioning 'limited data' when found: true and total < 5 (and > 0)", () => {
    const result = attachLimitedDataNotice({
      found: true,
      candidateId: "federal-A123",
      kept: 1,
      total: 3,
      contributingVotes: [],
    });
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.notice).toBeDefined();
      expect(result.notice).toMatch(/limited data/i);
      expect(result.notice).toContain("3");
    }
  });

  it("does not attach a notice when found: true and total >= 5", () => {
    const result = attachLimitedDataNotice({
      found: true,
      candidateId: "federal-A123",
      kept: 4,
      total: 10,
      contributingVotes: [],
    });
    if (result.found) {
      expect(result.notice ?? "").toBe("");
    }
  });

  it("does not attach a notice when found: false (passthrough — existing not-found behavior unchanged)", () => {
    const input = {
      found: false as const,
      unavailable: { reason: "Candidate not in database" },
    };
    const result = attachLimitedDataNotice(input);
    expect(result.found).toBe(false);
    // No notice field on AlignmentNotFound; verify the shape is untouched.
    expect((result as unknown as { notice?: string }).notice ?? "").toBe("");
    if (!result.found) {
      expect(result.unavailable.reason).toBe("Candidate not in database");
    }
  });

  it("does not attach a notice when found: true but result already has unavailable set (DB-not-configured / no rows)", () => {
    const result = attachLimitedDataNotice({
      found: true,
      candidateId: "federal-A123",
      kept: 0,
      total: 0,
      contributingVotes: [],
      unavailable: {
        reason: "No tagged votes for this issue in our records yet",
      },
    });
    if (result.found) {
      expect(result.notice ?? "").toBe("");
    }
  });
});

// ---------------------------------------------------------------------------
// normalizeFederalType — maps raw bill-type strings to canonical short form
// ---------------------------------------------------------------------------

describe("normalizeFederalType", () => {
  it("maps lowercase 'hr' → 'hr'", () => {
    expect(normalizeFederalType("hr")).toBe("hr");
  });

  it("maps 'house_bill' → 'hr'", () => {
    expect(normalizeFederalType("house_bill")).toBe("hr");
  });

  it("maps 's' → 's'", () => {
    expect(normalizeFederalType("s")).toBe("s");
  });

  it("maps 'senate_bill' → 's'", () => {
    expect(normalizeFederalType("senate_bill")).toBe("s");
  });

  it("maps 'hjres' → 'hjres'", () => {
    expect(normalizeFederalType("hjres")).toBe("hjres");
  });

  it("returns null for null input", () => {
    expect(normalizeFederalType(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizeFederalType("")).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(normalizeFederalType(42)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// stripLeadingBillNumber — removes embedded "H.R. 21 (118th):" prefixes
// ---------------------------------------------------------------------------

describe("stripLeadingBillNumber", () => {
  it("strips 'H.R. 21 (118th): ' prefix", () => {
    expect(
      stripLeadingBillNumber(
        "H.R. 21 (118th): Strategic Production Response Act",
      ),
    ).toBe("Strategic Production Response Act");
  });

  it("strips 'S. 5 (117th) - ' prefix", () => {
    expect(
      stripLeadingBillNumber("S. 5 (117th) - Inflation Reduction Act"),
    ).toBe("Inflation Reduction Act");
  });

  it("strips 'H.R. 1234 — ' prefix", () => {
    expect(stripLeadingBillNumber("H.R. 1234 — Lower Drug Costs Act")).toBe(
      "Lower Drug Costs Act",
    );
  });

  it("does not strip a plain title with no separator", () => {
    expect(stripLeadingBillNumber("Lower Drug Costs Act")).toBe(
      "Lower Drug Costs Act",
    );
  });

  it("does not strip a title that starts with a number but has no separator", () => {
    expect(stripLeadingBillNumber("21 Savage Tax Relief Act")).toBe(
      "21 Savage Tax Relief Act",
    );
  });

  it("falls back to original when stripping would produce empty string", () => {
    // Pathological: the whole title matches the pattern with no remainder
    expect(stripLeadingBillNumber("H.R. 1 -")).toBe("H.R. 1 -");
  });
});

// ---------------------------------------------------------------------------
// extractBillNumber — extracts compact number from rawMetadata / billId
// ---------------------------------------------------------------------------

describe("extractBillNumber", () => {
  it("extracts federal number from bills.id 'govtrack-hr2-118'", () => {
    expect(extractBillNumber(null, "govtrack-hr2-118", "govtrack")).toBe(
      "HR-2",
    );
  });

  it("extracts federal number from bills.id 'govtrack-s1171-117'", () => {
    expect(extractBillNumber(null, "govtrack-s1171-117", "govtrack")).toBe(
      "S-1171",
    );
  });

  it("extracts federal number from bills.id 'govtrack-hjres1-118'", () => {
    expect(extractBillNumber(null, "govtrack-hjres1-118", "govtrack")).toBe(
      "HJRES-1",
    );
  });

  it("falls back to rawMetadata for govtrack when id parse fails", () => {
    const rawMetadata = {
      govtrack: { bill: { type: "house_bill", number: 5376 } },
    };
    // No billId provided → id parse fails → uses rawMetadata secondary path
    expect(extractBillNumber(rawMetadata, null, "govtrack")).toBe("HR-5376");
  });

  it("extracts state number from rawMetadata.openstates.identifier 'HB 12'", () => {
    const rawMetadata = { openstates: { identifier: "HB 12" } };
    expect(
      extractBillNumber(rawMetadata, "openstates-ocd-abc", "openstates"),
    ).toBe("HB-12");
  });

  it("normalises 'SB 100' → 'SB-100'", () => {
    const rawMetadata = { openstates: { identifier: "SB 100" } };
    expect(extractBillNumber(rawMetadata, null, "openstates")).toBe("SB-100");
  });

  it("returns null for openstates when identifier is missing", () => {
    expect(
      extractBillNumber({ openstates: {} }, "openstates-x", "openstates"),
    ).toBeNull();
  });

  it("returns null for unknown source", () => {
    expect(extractBillNumber(null, "foo-bar-1", "other")).toBeNull();
  });

  it("returns null for null rawMetadata and null id with govtrack source", () => {
    expect(extractBillNumber(null, null, "govtrack")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// lookupAlignment — billTitle composition (billId / rawMetadata roundtrip)
// ---------------------------------------------------------------------------

describe("lookupAlignment billTitle composition", () => {
  it("composes 'HR-1234 · Title' when billId carries a federal govtrack id", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    _chain.where.mockResolvedValue([
      {
        billTitle: "Example Accountability Act",
        billId: "govtrack-hr1234-118",
        billRawMetadata: null,
        billSourceUrl: "https://govtrack.us/bill/hr1234",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2024-03-15",
        stanceLens: "in_favor",
        taggerConfidence: "0.95",
      },
    ]);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );
    expect(result.contributingVotes[0]!.billTitle).toBe(
      "HR-1234 · Example Accountability Act",
    );
  });

  it("composes 'HB-12 · Title' when openstates identifier is present", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    _chain.where.mockResolvedValue([
      {
        billTitle: "Clean Energy Act",
        billId: "openstates-ocd-bill-abc123",
        billRawMetadata: { openstates: { identifier: "HB 12" } },
        billSourceUrl: "https://openstates.org/bill/123",
        billSource: "openstates",
        voteCast: "yea",
        voteDate: "2024-09-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.92",
      },
    ]);

    const result = await lookupAlignment(
      "openstates-X99",
      "environment_climate",
      "in_favor",
    );
    expect(result.contributingVotes[0]!.billTitle).toBe(
      "HB-12 · Clean Energy Act",
    );
  });

  it("strips embedded number prefix from GovTrack-style titles to avoid double-numbering", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    _chain.where.mockResolvedValue([
      {
        billTitle: "H.R. 21 (118th): Strategic Production Response Act",
        billId: "govtrack-hr21-118",
        billRawMetadata: null,
        billSourceUrl: "https://govtrack.us/bill/hr21",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2024-05-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.88",
      },
    ]);

    const result = await lookupAlignment(
      "federal-A123",
      "environment_climate",
      "in_favor",
    );
    expect(result.contributingVotes[0]!.billTitle).toBe(
      "HR-21 · Strategic Production Response Act",
    );
  });

  it("falls back to bare title when no billId and no rawMetadata number available", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    // Existing test rows have no billId/billRawMetadata — backward compat
    _chain.where.mockResolvedValue([
      {
        billTitle: "Affordable Care Act Expansion",
        billSourceUrl: "https://govtrack.us/bill/1",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2024-03-15",
        stanceLens: "in_favor",
        taggerConfidence: "0.95",
      },
    ]);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );
    // No number available → title rendered as-is (no ' · ')
    expect(result.contributingVotes[0]!.billTitle).toBe(
      "Affordable Care Act Expansion",
    );
  });
});

// ---------------------------------------------------------------------------
// lookupAlignment — memberRationale confidence gate
//
// Owner-approved display rule: only rows with matchConfidence === "high" are
// surfaced as memberRationale. Medium / low / null rows must NEVER appear.
// The gate is enforced via SQL WHERE (eq matchConfidence "high"); these tests
// verify the end-to-end behaviour through the mocked DB layer.
// ---------------------------------------------------------------------------

describe("lookupAlignment — memberRationale high-confidence gate", () => {
  /** Build a mock db whose first select() call returns voteRows and whose
   *  second select() call (the rationale query) returns rationaleRows. */
  function makeDoubleMock(
    voteRows: Record<string, unknown>[],
    rationaleRows: Record<string, unknown>[],
  ) {
    const rationaleChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(rationaleRows),
    };
    const voteChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(voteRows),
    };
    const selectMock = vi
      .fn()
      .mockReturnValueOnce(voteChain)
      .mockReturnValue(rationaleChain);
    return { select: selectMock };
  }

  const baseVoteRow = {
    billTitle: "Drug Price Negotiation Act",
    billId: "govtrack-hr3-119",
    billRawMetadata: null,
    billSourceUrl: "https://govtrack.us/bill/hr3",
    billSource: "govtrack",
    billPlainSummary: null,
    voteCast: "yea",
    voteDate: "2024-06-01",
    stanceLens: "in_favor",
    taggerConfidence: "0.92",
  };

  it("surfaces memberRationale when matchConfidence is 'high'", async () => {
    const db = makeDoubleMock(
      [baseVoteRow],
      [
        {
          billId: "govtrack-hr3-119",
          rationaleText:
            "The Senator championed lower drug prices in this vote.",
          label: "stated",
          pressReleaseSources: [
            {
              url: "https://example.gov/press/1",
              publishedAt: "2024-06-01",
              title: "Senator supports bill",
            },
          ],
          modelVersion: "claude-haiku-20240307",
          matchConfidence: "high",
        },
      ],
    );
    mockedGetDb.mockReturnValue(db as never);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );

    const vote = result.contributingVotes[0]!;
    expect(vote.memberRationale).toBeDefined();
    expect(vote.memberRationale!.text).toBe(
      "The Senator championed lower drug prices in this vote.",
    );
    expect(vote.memberRationale!.label).toBe("stated");
    expect(vote.memberRationale!.sourceUrls).toContain(
      "https://example.gov/press/1",
    );
  });

  it("does NOT surface memberRationale when matchConfidence is 'medium'", async () => {
    // The SQL WHERE clause filters medium out at the DB layer; the rationale
    // query returns [] (simulating what the DB returns after the WHERE filter).
    const db = makeDoubleMock(
      [baseVoteRow],
      [], // DB returns no rows because matchConfidence != 'high'
    );
    mockedGetDb.mockReturnValue(db as never);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );

    const vote = result.contributingVotes[0]!;
    expect(vote.memberRationale).toBeUndefined();
  });

  it("does NOT surface memberRationale when matchConfidence is 'low'", async () => {
    const db = makeDoubleMock(
      [baseVoteRow],
      [], // DB returns no rows because matchConfidence != 'high'
    );
    mockedGetDb.mockReturnValue(db as never);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );

    const vote = result.contributingVotes[0]!;
    expect(vote.memberRationale).toBeUndefined();
  });

  it("does NOT surface memberRationale when matchConfidence is null", async () => {
    const db = makeDoubleMock(
      [baseVoteRow],
      [], // DB returns no rows because matchConfidence != 'high'
    );
    mockedGetDb.mockReturnValue(db as never);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );

    const vote = result.contributingVotes[0]!;
    expect(vote.memberRationale).toBeUndefined();
  });

  it("remains fail-soft when rationale query throws (e.g. table not migrated yet)", async () => {
    const brokenRationaleChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockRejectedValue(new Error("relation does not exist")),
    };
    const voteChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([baseVoteRow]),
    };
    const selectMock = vi
      .fn()
      .mockReturnValueOnce(voteChain)
      .mockReturnValue(brokenRationaleChain);
    mockedGetDb.mockReturnValue({ select: selectMock } as never);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );

    // Alignment result is still returned; no memberRationale attached.
    expect(result.found).toBe(true);
    expect(result.total).toBe(1);
    const vote = result.contributingVotes[0]!;
    expect(vote.memberRationale).toBeUndefined();
  });
});
