/**
 * src/lib/server/donors.test.ts
 *
 * Tests for the Drizzle donor-coalition query layer.
 * All DB interactions and the upstream resolveCandidateId helper are mocked —
 * no live Neon connection required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock db/client so no real DB connection is attempted
// ---------------------------------------------------------------------------
vi.mock("../../../db/client", () => {
  const DB_NOT_CONFIGURED = "DB_NOT_CONFIGURED" as const;
  return { getDb: vi.fn(), DB_NOT_CONFIGURED };
});

// Mock alignment's resolveCandidateId — donors.ts only consumes that one
// export, so we don't need to set up a second DB round-trip just for resolution.
vi.mock("./alignment", () => ({
  resolveCandidateId: vi.fn(),
}));

import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import { resolveCandidateId } from "./alignment";
import { lookupDonorCoalition } from "./donors";

// ---------------------------------------------------------------------------
// Helper: build a minimal chainable Drizzle mock
// ---------------------------------------------------------------------------

function makeSelectMock(rows: Record<string, unknown>[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    // donors query has no joins, but keep innerJoin in the shape so any
    // future schema change that introduces one doesn't break the harness.
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
  };
  return { select: vi.fn().mockReturnValue(chain), _chain: chain };
}

const mockedGetDb = vi.mocked(getDb);
const mockedResolve = vi.mocked(resolveCandidateId);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// candidate_not_resolved
// ---------------------------------------------------------------------------

describe("lookupDonorCoalition — candidate not resolved", () => {
  it("returns candidate_not_resolved for unknown name", async () => {
    mockedResolve.mockResolvedValue(null);

    const result = await lookupDonorCoalition(
      "Unknown Person",
      "TX",
      "state-TX-house",
    );

    expect(result).toEqual({
      found: false,
      reason: "candidate_not_resolved",
    });
  });

  it("returns candidate_not_resolved for non-legislative jurisdiction (resolution falls through)", async () => {
    // The function-level test: caller passes a malformed/non-legislative
    // jurisdiction directly. resolveCandidateId will not find a row, so the
    // function returns candidate_not_resolved. (The HTTP route would 400
    // before reaching here — that's tested separately in route.test.ts.)
    mockedResolve.mockResolvedValue(null);

    const result = await lookupDonorCoalition(
      "Greg Abbott",
      "TX",
      "state-TX-executive",
    );

    expect(result.found).toBe(false);
    if (result.found === false) {
      expect(result.reason).toBe("candidate_not_resolved");
    }
    // Ensure we still asked the resolver — donors.ts must not short-circuit
    // jurisdictions; the resolver is the single source of truth for "exists".
    // stateCode is now forwarded so the resolver can disambiguate ballot
    // nicknames vs GovTrack formal names by lastname + state.
    expect(mockedResolve).toHaveBeenCalledWith(
      "Greg Abbott",
      "state-TX-executive",
      "TX",
    );
  });
});

// ---------------------------------------------------------------------------
// no_donor_data
// ---------------------------------------------------------------------------

describe("lookupDonorCoalition — no donor data", () => {
  it("returns no_donor_data when candidate exists but donor_aggregates is empty", async () => {
    mockedResolve.mockResolvedValue("openstates-tx-123");
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);
    _chain.where.mockResolvedValue([]);

    const result = await lookupDonorCoalition(
      "Annise Parker",
      "TX",
      "state-TX-house",
    );

    expect(result).toEqual({ found: false, reason: "no_donor_data" });
  });

  it("returns no_donor_data when DB sentinel is hit after resolution", async () => {
    mockedResolve.mockResolvedValue("openstates-tx-123");
    mockedGetDb.mockReturnValue(DB_NOT_CONFIGURED as never);

    const result = await lookupDonorCoalition(
      "Annise Parker",
      "TX",
      "state-TX-house",
    );

    expect(result.found).toBe(false);
    if (result.found === false) {
      expect(result.reason).toBe("no_donor_data");
    }
  });
});

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe("lookupDonorCoalition — happy path", () => {
  it("aggregates buckets with correct totals, percents, and ordering", async () => {
    mockedResolve.mockResolvedValue("openstates-tx-123");
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    // 3 buckets summing to $100,000.
    //   labor=50000 (50%), tech=30000 (30%), real_estate=20000 (20%)
    // amount_total is numeric(15,2) → drizzle/neon returns strings.
    _chain.where.mockResolvedValue([
      {
        bucketLabel: "real_estate",
        amountTotal: "20000.00",
        source: "fec",
        sourceUrl: "https://fec.gov/candidate/H1234",
      },
      {
        bucketLabel: "labor",
        amountTotal: "50000.00",
        source: "fec",
        sourceUrl: "https://fec.gov/candidate/H1234",
      },
      {
        bucketLabel: "tech",
        amountTotal: "30000.00",
        source: "fec",
        sourceUrl: "https://fec.gov/candidate/H1234",
      },
    ]);

    const result = await lookupDonorCoalition(
      "Annise Parker",
      "TX",
      "state-TX-house",
    );

    expect(result.found).toBe(true);
    if (result.found !== true) return; // type narrow for the rest

    // totalRaised must be numeric (not the "20000.0050000.00..." string we'd
    // get from accidentally summing without Number() coercion).
    expect(typeof result.totalRaised).toBe("number");
    expect(result.totalRaised).toBe(100000);

    // Sorted by amount descending
    expect(result.buckets.map((b) => b.label)).toEqual([
      "labor",
      "tech",
      "real_estate",
    ]);
    expect(result.buckets.map((b) => b.amount)).toEqual([50000, 30000, 20000]);
    expect(result.buckets.map((b) => b.percent)).toEqual([50, 30, 20]);

    // Percents sum to ~100 (allow ±1 for integer rounding).
    const totalPercent = result.buckets.reduce((s, b) => s + b.percent, 0);
    expect(Math.abs(totalPercent - 100)).toBeLessThanOrEqual(1);

    expect(result.candidateId).toBe("openstates-tx-123");
    expect(result.source).toBe("fec");
    expect(result.sourceUrl).toBe("https://fec.gov/candidate/H1234");
    expect(result.electionCycle).toBe("2026");
  });

  it("drops the stale total_receipts bucket once a small/large/PAC breakdown exists", async () => {
    mockedResolve.mockResolvedValue("federal-booker");
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    // A legacy total_receipts row coexists with the new breakdown after a
    // re-ingest. The read-time filter drops total_receipts so it neither
    // inflates totalRaised nor renders as a bogus 100% bar.
    _chain.where.mockResolvedValue([
      {
        bucketLabel: "total_receipts",
        amountTotal: "16808282.00",
        source: "fec",
        sourceUrl: "https://fec.gov/x",
      },
      {
        bucketLabel: "Small individual donors (under $200)",
        amountTotal: "8145568.00",
        source: "fec_api",
        sourceUrl: "https://fec.gov/x",
      },
      {
        bucketLabel: "Large individual donors ($200+)",
        amountTotal: "4984307.00",
        source: "fec_api",
        sourceUrl: "https://fec.gov/x",
      },
      {
        bucketLabel: "PACs",
        amountTotal: "487530.00",
        source: "fec_api",
        sourceUrl: "https://fec.gov/x",
      },
    ]);

    const result = await lookupDonorCoalition(
      "Cory Booker",
      "NJ",
      "federal-senate",
    );
    expect(result.found).toBe(true);
    if (result.found !== true) return;
    expect(result.buckets.map((b) => b.label)).not.toContain("total_receipts");
    expect(result.totalRaised).toBe(8145568 + 4984307 + 487530);
  });

  it("keeps total_receipts when no breakdown exists yet (not-yet-ingested fallback)", async () => {
    mockedResolve.mockResolvedValue("federal-someone");
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    _chain.where.mockResolvedValue([
      {
        bucketLabel: "total_receipts",
        amountTotal: "5000000.00",
        source: "fec",
        sourceUrl: "https://fec.gov/y",
      },
    ]);

    const result = await lookupDonorCoalition(
      "Some Candidate",
      "NJ",
      "federal-house",
    );
    expect(result.found).toBe(true);
    if (result.found !== true) return;
    expect(result.buckets.map((b) => b.label)).toEqual(["total_receipts"]);
    expect(result.totalRaised).toBe(5000000);
  });

  it("handles known-good fixture: candidate + 3 buckets", async () => {
    mockedResolve.mockResolvedValue("federal-A123");
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    _chain.where.mockResolvedValue([
      {
        bucketLabel: "small_dollar",
        amountTotal: "125000.50",
        source: "fec",
        sourceUrl: "https://fec.gov/data/candidate/H8TX12345",
      },
      {
        bucketLabel: "labor",
        amountTotal: "75000.25",
        source: "fec",
        sourceUrl: "https://fec.gov/data/candidate/H8TX12345",
      },
      {
        bucketLabel: "finance_insurance_real_estate",
        amountTotal: "50000.00",
        source: "fec",
        sourceUrl: "https://fec.gov/data/candidate/H8TX12345",
      },
    ]);

    const result = await lookupDonorCoalition(
      "Jane Senator",
      "TX",
      "federal-house",
    );

    expect(result.found).toBe(true);
    if (result.found !== true) return;

    expect(result.totalRaised).toBeCloseTo(250000.75, 2);

    // Ordering by amount descending
    expect(result.buckets[0]!.label).toBe("small_dollar");
    expect(result.buckets[1]!.label).toBe("labor");
    expect(result.buckets[2]!.label).toBe("finance_insurance_real_estate");

    // Each bucket amount is a real number, not a concatenated string
    for (const b of result.buckets) {
      expect(typeof b.amount).toBe("number");
      expect(Number.isFinite(b.amount)).toBe(true);
    }

    // Percents are integers in 0..100 and sum to roughly 100
    for (const b of result.buckets) {
      expect(Number.isInteger(b.percent)).toBe(true);
      expect(b.percent).toBeGreaterThanOrEqual(0);
      expect(b.percent).toBeLessThanOrEqual(100);
    }
    const totalPercent = result.buckets.reduce((s, b) => s + b.percent, 0);
    expect(Math.abs(totalPercent - 100)).toBeLessThanOrEqual(1);
  });

  it("excludes FEDERAL sector buckets from totalRaised (they re-cut already-counted itemized dollars)", async () => {
    mockedResolve.mockResolvedValue("federal-bonck");
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    // Mirrors the Jon Bonck-style shape: a real small/large/PAC funding mix plus
    // industry re-cut buckets (Technology, Finance) the FEDERAL ingest derives
    // from the SAME Schedule-A employer rows that fed the large-individual total
    // (source "fec_api"). totalRaised must count only the non-sector buckets;
    // summing the sectors would double-count.
    _chain.where.mockResolvedValue([
      {
        bucketLabel: "Small individual donors (under $200)",
        amountTotal: "500000.00",
        source: "fec_api",
        sourceUrl: "https://fec.gov/x",
      },
      {
        bucketLabel: "Large individual donors ($200+)",
        amountTotal: "800000.00",
        source: "fec_api",
        sourceUrl: "https://fec.gov/x",
      },
      {
        bucketLabel: "PACs",
        amountTotal: "200000.00",
        source: "fec_api",
        sourceUrl: "https://fec.gov/x",
      },
      {
        bucketLabel: "Technology",
        amountTotal: "300000.00",
        source: "fec_api",
        sourceUrl: "https://fec.gov/x",
      },
      {
        bucketLabel: "Finance, banking & insurance",
        amountTotal: "150000.00",
        source: "fec_api",
        sourceUrl: "https://fec.gov/x",
      },
      {
        // Federal "Other" is the unmatched-employer remainder of the SAME
        // by-employer pass — also a re-cut, so it must be excluded too.
        bucketLabel: "Other",
        amountTotal: "250000.00",
        source: "fec_api",
        sourceUrl: "https://fec.gov/x",
      },
    ]);

    const result = await lookupDonorCoalition(
      "Jon Bonck",
      "TX",
      "federal-house",
    );

    expect(result.found).toBe(true);
    if (result.found !== true) return;

    // Only the /totals/-derived buckets count: sectors AND federal "Other" drop.
    expect(result.totalRaised).toBe(500000 + 800000 + 200000); // 1,500,000

    // Re-cut buckets are still returned for the coalition display.
    const labels = result.buckets.map((b) => b.label);
    expect(labels).toContain("Technology");
    expect(labels).toContain("Finance, banking & insurance");
    expect(labels).toContain("Other");

    // Sector-bucket percent is its share of the (non-re-cut) total raised.
    const tech = result.buckets.find((b) => b.label === "Technology")!;
    expect(tech.percent).toBe(Math.round((300000 / 1500000) * 100)); // 20
  });

  it("KEEPS state sector buckets in totalRaised (each contribution bucketed once — sectors are disjoint org money)", async () => {
    mockedResolve.mockResolvedValue("openstates-tx-999");
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    // Same labels as the federal case, but a STATE source (e.g. tx-tec). State
    // ingests bucket each contribution exactly once: individuals → funding-mix,
    // organizations → a sector bucket. The sectors are NOT a re-cut of the
    // individual dollars, so they must stay in the headline total — otherwise we
    // would silently drop every org donor (regressing ~344 state candidates).
    _chain.where.mockResolvedValue([
      {
        bucketLabel: "Small individual donors (under $200)",
        amountTotal: "500000.00",
        source: "tx_tec_bulk",
        sourceUrl: "https://tec.texas.gov/x",
      },
      {
        bucketLabel: "Large individual donors ($200+)",
        amountTotal: "800000.00",
        source: "tx_tec_bulk",
        sourceUrl: "https://tec.texas.gov/x",
      },
      {
        bucketLabel: "Technology",
        amountTotal: "300000.00",
        source: "tx_tec_bulk",
        sourceUrl: "https://tec.texas.gov/x",
      },
      {
        bucketLabel: "Finance, banking & insurance",
        amountTotal: "150000.00",
        source: "tx_tec_bulk",
        sourceUrl: "https://tec.texas.gov/x",
      },
      {
        // State "Other" is disjoint org money (unmatched-employer organization
        // donors), NOT a re-cut — it must stay in the total.
        bucketLabel: "Other",
        amountTotal: "100000.00",
        source: "tx_tec_bulk",
        sourceUrl: "https://tec.texas.gov/x",
      },
    ]);

    const result = await lookupDonorCoalition(
      "Statehouse Candidate",
      "TX",
      "state-TX-house",
    );

    expect(result.found).toBe(true);
    if (result.found !== true) return;

    // ALL buckets count — state sectors and "Other" are real distinct dollars.
    expect(result.totalRaised).toBe(
      500000 + 800000 + 300000 + 150000 + 100000,
    ); // 1,850,000
  });

  it("defaults electionCycle to '2026' when omitted", async () => {
    mockedResolve.mockResolvedValue("openstates-tx-123");
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    _chain.where.mockResolvedValue([
      {
        bucketLabel: "small_dollar",
        amountTotal: "100.00",
        source: "fec",
        sourceUrl: "https://fec.gov/x",
      },
    ]);

    const result = await lookupDonorCoalition(
      "Annise Parker",
      "TX",
      "state-TX-house",
      // electionCycle omitted
    );

    expect(result.found).toBe(true);
    if (result.found !== true) return;
    expect(result.electionCycle).toBe("2026");
  });

  it("respects an explicit electionCycle", async () => {
    mockedResolve.mockResolvedValue("openstates-tx-123");
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    _chain.where.mockResolvedValue([
      {
        bucketLabel: "small_dollar",
        amountTotal: "100.00",
        source: "fec",
        sourceUrl: "https://fec.gov/x",
      },
    ]);

    const result = await lookupDonorCoalition(
      "Annise Parker",
      "TX",
      "state-TX-house",
      "2024",
    );

    expect(result.found).toBe(true);
    if (result.found !== true) return;
    expect(result.electionCycle).toBe("2024");
  });

  it("picks the most-common source/sourceUrl when rows disagree", async () => {
    mockedResolve.mockResolvedValue("openstates-tx-123");
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    // 2 rows say "fec", 1 row says "followthemoney" → most-common wins.
    _chain.where.mockResolvedValue([
      {
        bucketLabel: "a",
        amountTotal: "100.00",
        source: "fec",
        sourceUrl: "https://fec.gov/x",
      },
      {
        bucketLabel: "b",
        amountTotal: "100.00",
        source: "fec",
        sourceUrl: "https://fec.gov/x",
      },
      {
        bucketLabel: "c",
        amountTotal: "100.00",
        source: "followthemoney",
        sourceUrl: "https://ftm.org/y",
      },
    ]);

    const result = await lookupDonorCoalition(
      "Annise Parker",
      "TX",
      "state-TX-house",
    );

    expect(result.found).toBe(true);
    if (result.found !== true) return;
    expect(result.source).toBe("fec");
    expect(result.sourceUrl).toBe("https://fec.gov/x");
  });

  it("handles a single-bucket coalition (percent = 100)", async () => {
    mockedResolve.mockResolvedValue("federal-A123");
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    _chain.where.mockResolvedValue([
      {
        bucketLabel: "small_dollar",
        amountTotal: "12345.67",
        source: "fec",
        sourceUrl: "https://fec.gov/x",
      },
    ]);

    const result = await lookupDonorCoalition(
      "Solo Candidate",
      "TX",
      "federal-house",
    );

    expect(result.found).toBe(true);
    if (result.found !== true) return;
    expect(result.buckets).toHaveLength(1);
    expect(result.buckets[0]!.percent).toBe(100);
    expect(result.totalRaised).toBeCloseTo(12345.67, 2);
  });
});
