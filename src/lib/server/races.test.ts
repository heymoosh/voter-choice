/**
 * Tests for the 2026 challenger lookup. DB mocked — no live Neon connection.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../db/client", () => {
  const DB_NOT_CONFIGURED = "DB_NOT_CONFIGURED" as const;
  return { getDb: vi.fn(), DB_NOT_CONFIGURED };
});

import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import { applyViabilityFilter, lookupChallengers } from "./races";

const mockedGetDb = vi.mocked(getDb);

function makeDbMock(rows: Record<string, unknown>[]) {
  const chain = {
    from: vi.fn(),
    where: vi.fn().mockResolvedValue(rows),
  };
  chain.from.mockReturnValue(chain);
  const select = vi.fn().mockReturnValue(chain);
  return { select } as unknown as ReturnType<typeof getDb>;
}

function row(
  id: string,
  fullName: string,
  party: string | null,
  office: "house" | "senate",
  district: string | null,
  totalReceipts: string | null,
  rawMetadata: unknown = null,
) {
  return { id, fullName, party, office, district, totalReceipts, rawMetadata };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("applyViabilityFilter", () => {
  it("keeps filers over the $10k floor, ranked by receipts", () => {
    const out = applyViabilityFilter([
      { id: "a", fullName: "A", party: "DEM", totalReceipts: "50000.00" },
      { id: "b", fullName: "B", party: "DEM", totalReceipts: "250000.00" },
      { id: "c", fullName: "C", party: "REP", totalReceipts: "12000.00" },
    ]);
    expect(out.map((c) => c.id)).toEqual(["b", "a", "c"]);
    expect(out[0].totalReceipts).toBe(250000);
    expect(out[0].party).toBe("Democrat");
  });

  it("keeps top-2 per party even under the floor", () => {
    const out = applyViabilityFilter([
      { id: "a", fullName: "A", party: "DEM", totalReceipts: "900.00" },
      { id: "b", fullName: "B", party: "DEM", totalReceipts: "500.00" },
      { id: "c", fullName: "C", party: "DEM", totalReceipts: "100.00" },
      { id: "d", fullName: "D", party: "REP", totalReceipts: null },
    ]);
    // a + b are DEM top-2; c (DEM #3, under floor) drops; d is REP top-1.
    expect(out.map((c) => c.id).sort()).toEqual(["a", "b", "d"]);
    // null receipts stays null (no FEC totals row), not 0.
    expect(out.find((c) => c.id === "d")?.totalReceipts).toBeNull();
  });

  it("caps at 8 per seat", () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      id: `c${i}`,
      fullName: `C${i}`,
      party: "DEM",
      totalReceipts: `${(12 - i) * 20000}.00`,
    }));
    expect(applyViabilityFilter(rows)).toHaveLength(8);
  });

  it("maps unknown party codes through verbatim", () => {
    const out = applyViabilityFilter([
      { id: "a", fullName: "A", party: "XYZ", totalReceipts: "20000.00" },
      { id: "b", fullName: "B", party: null, totalReceipts: "20000.00" },
    ]);
    expect(out.find((c) => c.id === "a")?.party).toBe("XYZ");
    expect(out.find((c) => c.id === "b")?.party).toBeNull();
  });
});

describe("lookupChallengers", () => {
  it("returns empty lists when DB is not configured", async () => {
    mockedGetDb.mockReturnValue(DB_NOT_CONFIGURED);
    const out = await lookupChallengers("TX", 7);
    expect(out).toEqual({ house: [], senate: [] });
  });

  it("splits house (district-matched) from senate (statewide)", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock([
        row("h1", "Jane Doe", "DEM", "house", "07", "50000.00"),
        row("h2", "Other District", "DEM", "house", "12", "90000.00"),
        row("s1", "Rich Roe", "REP", "senate", null, "1200000.00"),
      ]),
    );
    const out = await lookupChallengers("TX", 7);
    expect(out.house.map((c) => c.id)).toEqual(["h1"]);
    expect(out.senate.map((c) => c.id)).toEqual(["s1"]);
  });

  it("zero-pads the district key (at-large = 00)", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock([row("h1", "At Large", "REP", "house", "00", "20000.00")]),
    );
    const out = await lookupChallengers("WY", 0);
    expect(out.house).toHaveLength(1);
  });

  it("returns no house challengers when district is unknown", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock([row("h1", "Jane Doe", "DEM", "house", "07", "50000.00")]),
    );
    const out = await lookupChallengers("TX", null);
    expect(out.house).toEqual([]);
  });

  it("excludes the seat incumbent (FEC incumbent_challenge='I') from both lists", async () => {
    const inc = { fec: { incumbent_challenge: "I" } };
    mockedGetDb.mockReturnValue(
      makeDbMock([
        // Sitting incumbents filed for their own seats — already shown as the
        // seat card; must not reappear as challengers.
        row("h-inc", "Rep Incumbent", "REP", "house", "07", "900000.00", inc),
        row("s-inc", "Sen Incumbent", "REP", "senate", null, "5000000.00", inc),
        // Genuine challengers (incumbent_challenge='C' or absent) stay.
        row("h1", "Jane Doe", "DEM", "house", "07", "50000.00", {
          fec: { incumbent_challenge: "C" },
        }),
        row("s1", "Rich Roe", "DEM", "senate", null, "1200000.00"),
      ]),
    );
    const out = await lookupChallengers("TX", 7);
    expect(out.house.map((c) => c.id)).toEqual(["h1"]);
    expect(out.senate.map((c) => c.id)).toEqual(["s1"]);
  });

  it("collapses same-name filers in a seat, keeping the higher-receipts row", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock([
        row("dup-a", "Sarah Eckhardt", "DEM", "house", "07", "50000.00"),
        row("dup-b", "Sarah Eckhardt", "DEM", "house", "07", "113000.00"),
        row("other", "Someone Else", "REP", "house", "07", "20000.00"),
      ]),
    );
    const out = await lookupChallengers("TX", 7);
    // One Eckhardt, the $113k row; plus the distinct filer.
    expect(out.house.map((c) => c.id)).toEqual(["dup-b", "other"]);
  });
});
