/**
 * scripts/ingest/backfill-pac-sponsor-class.test.ts
 *
 * The backfill is the one path that rewrites sponsor_class in bulk on rows
 * that already exist, so its two guards carry the weight: it must never
 * overwrite a human verdict, and it must never write a row whose class is
 * already correct. Both were previously unexercised — the multi-row UPDATE
 * had never executed anywhere.
 *
 * Mocks the Drizzle client entirely. Nothing here connects to a database.
 */

import { describe, expect, it, vi } from "vitest";
import {
  parseArgs,
  backfillSponsorClass,
  type BackfillConfig,
} from "./backfill-pac-sponsor-class";
import type { DbClient } from "../../db/client";

interface CommitteeRow {
  committeeId: string;
  orgType: string | null;
  designation: string | null;
  committeeType: string | null;
  connectedOrg: string | null;
  sponsorClass: string | null;
  sponsorClassMethod: string | null;
}

const row = (overrides: Partial<CommitteeRow>): CommitteeRow => ({
  committeeId: "C00000000",
  orgType: null,
  designation: null,
  committeeType: null,
  connectedOrg: null,
  sponsorClass: null,
  sponsorClassMethod: null,
  ...overrides,
});

/**
 * Minimal stand-in for the query builder the script uses:
 *   db.select({...}).from(t).orderBy(col)  -> rows
 *   db.execute(sql)                        -> recorded
 */
function makeDb(rows: CommitteeRow[]) {
  const orderBy = vi.fn().mockResolvedValue(rows);
  const from = vi.fn().mockReturnValue({ orderBy });
  const select = vi.fn().mockReturnValue({ from });
  const execute = vi.fn().mockResolvedValue({ rows: [] });
  return {
    db: { select, execute } as unknown as DbClient,
    select,
    from,
    orderBy,
    execute,
  };
}

const config = (overrides: Partial<BackfillConfig> = {}): BackfillConfig => ({
  dryRun: false,
  limit: null,
  ...overrides,
});

describe("parseArgs", () => {
  it("defaults to a live full-table run", () => {
    expect(parseArgs([])).toEqual({ dryRun: false, limit: null });
  });

  it("reads --dry-run and --limit", () => {
    expect(parseArgs(["--dry-run", "--limit", "25"])).toEqual({
      dryRun: true,
      limit: 25,
    });
  });

  it("ignores a --limit that is not a positive integer", () => {
    // A garbage limit must not silently become 0 rows or NaN rows — it falls
    // back to the full pass, which is the correct behaviour for a catch-up.
    expect(parseArgs(["--limit", "0"]).limit).toBeNull();
    expect(parseArgs(["--limit", "-3"]).limit).toBeNull();
    expect(parseArgs(["--limit", "abc"]).limit).toBeNull();
  });
});

describe("backfillSponsorClass", () => {
  it("orders the scan so --limit takes a reproducible slice", async () => {
    const { db, orderBy } = makeDb([]);
    await backfillSponsorClass(db, config());
    expect(orderBy).toHaveBeenCalledTimes(1);
  });

  it("never touches a row a human classified", async () => {
    // sponsor_class_method='human' is the one value federal-pac-sponsors.ts
    // refuses to recompute. If the backfill did not honour it too, a curated
    // "this is a corporate PAC" verdict would be machine-reverted to the
    // filing's own (blank) answer on the next catch-up run.
    const { db, execute } = makeDb([
      row({
        committeeId: "C00211318", // Deloitte's PAC: blank ORG_TP, curated.
        designation: "B",
        committeeType: "Q",
        sponsorClass: "corporate",
        sponsorClassMethod: "human",
      }),
    ]);

    const counts = await backfillSponsorClass(db, config());

    expect(counts).toMatchObject({ scanned: 1, updated: 0, skippedHuman: 1 });
    expect(counts.byClass).toEqual({});
    expect(execute).not.toHaveBeenCalled();
  });

  it("skips rows whose stored class and method already match the rules", async () => {
    const { db, execute } = makeDb([
      row({
        committeeId: "C00000001",
        orgType: "C",
        sponsorClass: "corporate",
        sponsorClassMethod: "org-type-v1",
      }),
    ]);

    const counts = await backfillSponsorClass(db, config());

    expect(counts).toMatchObject({ scanned: 1, updated: 0, skippedHuman: 0 });
    // Still counted in the breakdown: the operator wants to see the class
    // distribution of the whole table, not only the rows that moved.
    expect(counts.byClass).toEqual({ corporate: 1 });
    expect(execute).not.toHaveBeenCalled();
  });

  it("re-stamps a row whose method is stale even when the class is unchanged", async () => {
    // A rules-version bump is exactly why method is stored next to the class.
    const { db, execute } = makeDb([
      row({
        committeeId: "C00000002",
        orgType: "T",
        sponsorClass: "trade",
        sponsorClassMethod: "org-type-v0",
      }),
    ]);

    const counts = await backfillSponsorClass(db, config());

    expect(counts.updated).toBe(1);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("writes the rows the rules move, in one chunked UPDATE", async () => {
    const { db, execute } = makeDb([
      row({ committeeId: "C00000003", orgType: "L" }),
      row({ committeeId: "C00000004", designation: "D", committeeType: "Q" }),
      row({ committeeId: "C00000005", designation: "U", committeeType: "O" }),
    ]);

    const counts = await backfillSponsorClass(db, config());

    expect(counts).toMatchObject({ scanned: 3, updated: 3, skippedHuman: 0 });
    expect(counts.byClass).toEqual({
      labor: 1,
      leadership: 1,
      non_connected: 1,
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("leaves the trade-PAC filing shape unknown instead of clearing it", async () => {
    // designation U + type Q + blank connected org is how UNITED EGG
    // ASSOCIATION EGGPAC files. `unknown` blocks a "$0 corporate PAC" claim
    // and keeps the committee in the curation queue; `non_connected` would
    // clear it and hide it from every future queue export.
    const { db } = makeDb([
      row({ committeeId: "C00172841", designation: "U", committeeType: "Q" }),
    ]);

    const counts = await backfillSponsorClass(db, config());

    expect(counts.byClass).toEqual({ unknown: 1 });
  });

  it("counts but writes nothing on --dry-run", async () => {
    const { db, execute } = makeDb([row({ committeeId: "C1", orgType: "C" })]);

    const counts = await backfillSponsorClass(db, config({ dryRun: true }));

    expect(counts.updated).toBe(1);
    expect(execute).not.toHaveBeenCalled();
  });

  it("stops scanning at --limit", async () => {
    const { db } = makeDb([
      row({ committeeId: "C1", orgType: "C" }),
      row({ committeeId: "C2", orgType: "L" }),
      row({ committeeId: "C3", orgType: "T" }),
    ]);

    const counts = await backfillSponsorClass(db, config({ limit: 2 }));

    expect(counts.scanned).toBe(2);
    expect(counts.byClass).toEqual({ corporate: 1, labor: 1 });
  });
});
