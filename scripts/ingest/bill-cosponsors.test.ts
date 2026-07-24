/**
 * scripts/ingest/bill-cosponsors.test.ts
 *
 * Tests for the bill-cosponsors ingest: pure id/response parsing, pagination,
 * and the dry-run backfill loop (federal filter + FK-safe candidate filter).
 * No real network or DB.
 */

import { describe, it, expect, vi } from "vitest";
import {
  candidateIdFromBioguide,
  parseFederalBillId,
  congressGovBillUrl,
  flattenCosponsors,
  buildCosponsorRows,
  buildSponsorRow,
  extractSponsorBioguide,
  fetchAllCosponsors,
  fetchBillSponsor,
  runBillCosponsorsIngest,
  type FederalBillIdentity,
} from "./bill-cosponsors";

describe("parseFederalBillId", () => {
  it("parses a govtrack federal bill id", () => {
    expect(parseFederalBillId("govtrack-hr1234-118")).toEqual({
      billId: "govtrack-hr1234-118",
      congress: 118,
      type: "hr",
      number: "1234",
    });
  });

  it("returns null for a state / non-govtrack id", () => {
    expect(parseFederalBillId("openstates-tx-hb1-2025")).toBeNull();
    expect(parseFederalBillId("garbage")).toBeNull();
  });
});

describe("candidateIdFromBioguide", () => {
  it("uppercases and prefixes federal-", () => {
    expect(candidateIdFromBioguide("k000377")).toBe("federal-K000377");
  });
});

describe("congressGovBillUrl", () => {
  it("builds the human-facing cosponsors page for a known bill type", () => {
    const bill: FederalBillIdentity = {
      billId: "govtrack-hr1-118",
      congress: 118,
      type: "hr",
      number: "1",
    };
    expect(congressGovBillUrl(bill)).toBe(
      "https://www.congress.gov/bill/118th-congress/house-bill/1/cosponsors",
    );
  });

  it("falls back to an API-style path for an unknown bill type rather than guessing", () => {
    const bill: FederalBillIdentity = {
      billId: "govtrack-xyz9-119",
      congress: 119,
      type: "xyz",
      number: "9",
    };
    expect(congressGovBillUrl(bill)).toContain("/119/xyz/9/cosponsors");
  });
});

describe("flattenCosponsors", () => {
  it("maps bioguide → candidate id, is_original, and date", () => {
    const flat = flattenCosponsors([
      {
        bioguideId: "K000377",
        isOriginalCosponsor: true,
        sponsorshipDate: "2023-01-09",
      },
    ]);
    expect(flat).toEqual([
      {
        candidateId: "federal-K000377",
        isOriginal: true,
        dateCosponsored: "2023-01-09",
      },
    ]);
  });

  it("drops entries with no bioguideId", () => {
    expect(flattenCosponsors([{ fullName: "Nobody" }])).toEqual([]);
  });

  it("dedupes a member appearing twice, keeping the earliest date and OR-ing is_original", () => {
    const flat = flattenCosponsors([
      {
        bioguideId: "A000001",
        isOriginalCosponsor: false,
        sponsorshipDate: "2023-05-01",
      },
      {
        bioguideId: "A000001",
        isOriginalCosponsor: true,
        sponsorshipDate: "2023-02-01",
      },
    ]);
    expect(flat).toEqual([
      {
        candidateId: "federal-A000001",
        isOriginal: true,
        dateCosponsored: "2023-02-01",
      },
    ]);
  });
});

describe("buildCosponsorRows", () => {
  it("keeps only cosponsors with a matching candidates row (FK-safe)", () => {
    const flat = flattenCosponsors([
      { bioguideId: "A000001", sponsorshipDate: "2023-01-01" },
      { bioguideId: "B000002", sponsorshipDate: "2023-01-02" },
    ]);
    const rows = buildCosponsorRows(
      "govtrack-hr1-118",
      flat,
      new Set(["federal-A000001"]),
      "https://example/cosponsors",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      billId: "govtrack-hr1-118",
      candidateId: "federal-A000001",
      role: "cosponsor",
      source: "congress-gov",
      sourceUrl: "https://example/cosponsors",
    });
  });

  it("excludes the sponsor from the cosponsor rows (guards the unique key)", () => {
    const flat = flattenCosponsors([
      { bioguideId: "A000001", sponsorshipDate: "2023-01-01" },
      { bioguideId: "S000009", sponsorshipDate: "2023-01-02" },
    ]);
    const rows = buildCosponsorRows(
      "govtrack-hr1-118",
      flat,
      new Set(["federal-A000001", "federal-S000009"]),
      "https://example/cosponsors",
      "federal-S000009", // sponsor
    );
    expect(rows.map((r) => r.candidateId)).toEqual(["federal-A000001"]);
  });
});

describe("extractSponsorBioguide", () => {
  it("reads the first sponsor's bioguide from the bill-detail response", () => {
    expect(
      extractSponsorBioguide({
        bill: { sponsors: [{ bioguideId: "S000009" }] },
      }),
    ).toBe("S000009");
  });

  it("returns null when there is no structured sponsor", () => {
    expect(extractSponsorBioguide({ bill: { sponsors: [] } })).toBeNull();
    expect(extractSponsorBioguide({ bill: {} })).toBeNull();
    expect(extractSponsorBioguide({})).toBeNull();
  });
});

describe("buildSponsorRow", () => {
  it("marks the row role='sponsor' with no cosponsorship date", () => {
    expect(
      buildSponsorRow("govtrack-hr1-118", "federal-S000009", "https://ex/bill"),
    ).toEqual({
      billId: "govtrack-hr1-118",
      candidateId: "federal-S000009",
      role: "sponsor",
      isOriginal: false,
      dateCosponsored: null,
      source: "congress-gov",
      sourceUrl: "https://ex/bill",
    });
  });
});

describe("fetchBillSponsor", () => {
  const bill: FederalBillIdentity = {
    billId: "govtrack-hr1-118",
    congress: 118,
    type: "hr",
    number: "1",
  };

  it("returns the sponsor bioguide from the detail endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ bill: { sponsors: [{ bioguideId: "S000009" }] } }),
    });
    const out = await fetchBillSponsor(
      bill,
      "https://api.example/v3",
      "key",
      fetcher as unknown as typeof fetch,
    );
    expect(out).toBe("S000009");
  });

  it("fails soft (null) when the detail fetch errors — cosponsors stay usable", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
    const out = await fetchBillSponsor(
      bill,
      "https://api.example/v3",
      "k",
      fetcher,
    );
    expect(out).toBeNull();
    warnSpy.mockRestore();
  });
});

describe("fetchAllCosponsors", () => {
  const bill: FederalBillIdentity = {
    billId: "govtrack-hr1-118",
    congress: 118,
    type: "hr",
    number: "1",
  };

  it("stops after one page when the page is shorter than the limit", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ cosponsors: [{ bioguideId: "A000001" }] }),
    });
    const out = await fetchAllCosponsors(
      bill,
      "https://api.example/v3",
      "key",
      fetcher as unknown as typeof fetch,
    );
    expect(out).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("follows pagination when a full page comes back", async () => {
    const fullPage = Array.from({ length: 250 }, (_, i) => ({
      bioguideId: `X${String(i).padStart(6, "0")}`,
    }));
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ cosponsors: fullPage }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ cosponsors: [{ bioguideId: "LAST01" }] }),
      });
    const out = await fetchAllCosponsors(
      bill,
      "https://api.example/v3",
      "key",
      fetcher as unknown as typeof fetch,
    );
    expect(out).toHaveLength(251);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// runBillCosponsorsIngest — dry-run + real-run over a small mock DB
// ---------------------------------------------------------------------------

function makeDbMock(
  billRows: { id: string }[],
  candRows: { id: string }[],
  inserted: unknown[],
) {
  let sel = 0;
  return {
    select: vi.fn(() => {
      const rows = sel === 0 ? billRows : candRows;
      sel += 1;
      return { from: () => ({ where: () => Promise.resolve(rows) }) };
    }),
    insert: vi.fn(() => ({
      values: (v: unknown) => ({
        onConflictDoUpdate: () => {
          inserted.push(v);
          return Promise.resolve();
        },
      }),
    })),
  } as unknown as Parameters<typeof runBillCosponsorsIngest>[0];
}

const okFetcher = (cosponsors: unknown[]) =>
  vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ cosponsors }),
  }) as unknown as typeof fetch;

describe("runBillCosponsorsIngest", () => {
  it("filters to federal (govtrack) bills, skips no-candidate cosponsors, and upserts the rest", async () => {
    const inserted: unknown[] = [];
    const db = makeDbMock(
      [{ id: "govtrack-hr1-118" }],
      [{ id: "federal-A000001" }],
      inserted,
    );
    const fetcher = okFetcher([
      { bioguideId: "A000001", sponsorshipDate: "2023-01-01" },
      { bioguideId: "B000002", sponsorshipDate: "2023-01-02" }, // no candidate row
    ]);

    const counts = await runBillCosponsorsIngest(db, fetcher, {
      baseUrl: "https://api.example/v3",
    });
    expect(counts.federalBills).toBe(1);
    expect(counts.billsProcessed).toBe(1);
    expect(counts.cosponsorsFetched).toBe(2);
    expect(counts.rowsUpserted).toBe(1);
    expect(counts.skippedNoCandidate).toBe(1);
    expect(inserted).toHaveLength(1);
  });

  it("dry-run makes no insert calls but still counts rows", async () => {
    const inserted: unknown[] = [];
    const db = makeDbMock(
      [{ id: "govtrack-hr1-118" }],
      [{ id: "federal-A000001" }],
      inserted,
    );
    const fetcher = okFetcher([
      { bioguideId: "A000001", sponsorshipDate: "2023-01-01" },
    ]);

    const counts = await runBillCosponsorsIngest(db, fetcher, {
      dryRun: true,
      baseUrl: "https://api.example/v3",
    });
    expect(counts.rowsUpserted).toBe(1);
    expect(inserted).toHaveLength(0);
  });

  it("counts a bill as failed (not thrown) when its fetch errors, and continues", async () => {
    const inserted: unknown[] = [];
    const db = makeDbMock(
      [{ id: "govtrack-hr1-118" }],
      [{ id: "federal-A000001" }],
      inserted,
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as unknown as typeof fetch;

    const counts = await runBillCosponsorsIngest(db, fetcher, {
      baseUrl: "https://api.example/v3",
    });
    expect(counts.billsFailed).toBe(1);
    expect(counts.billsProcessed).toBe(0);
    warnSpy.mockRestore();
  });

  it("resolves the sponsor and writes a role='sponsor' row alongside the cosponsors", async () => {
    const inserted: Array<{ candidateId: string; role: string }> = [];
    const db = makeDbMock(
      [{ id: "govtrack-hr1-118" }],
      [{ id: "federal-A000001" }, { id: "federal-S000009" }],
      inserted,
    );
    // URL-aware fetcher: the detail endpoint returns the sponsor, the
    // /cosponsors endpoint returns the cosponsor list.
    const fetcher = vi.fn((url: string) => {
      if (url.includes("/cosponsors")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            cosponsors: [
              { bioguideId: "A000001", sponsorshipDate: "2023-01-02" },
            ],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ bill: { sponsors: [{ bioguideId: "S000009" }] } }),
      });
    }) as unknown as typeof fetch;

    const counts = await runBillCosponsorsIngest(db, fetcher, {
      baseUrl: "https://api.example/v3",
    });
    expect(counts.sponsorsResolved).toBe(1);
    expect(counts.rowsUpserted).toBe(2); // sponsor + 1 cosponsor
    const byRole = Object.fromEntries(
      inserted.map((r) => [r.candidateId, r.role]),
    );
    expect(byRole).toEqual({
      "federal-S000009": "sponsor",
      "federal-A000001": "cosponsor",
    });
  });
});
