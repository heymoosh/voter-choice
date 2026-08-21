/**
 * scripts/ingest/_fec-bulk.test.ts
 *
 * Tests for the shared FEC-bulk candidate resolver. One FEC id can sit on
 * more than one of our candidate rows (a rendered row plus a voteless
 * duplicate), and resolution is first-wins — so these cover the two things
 * that make the winner trustworthy: a deterministic, funding-mix-first
 * ORDER BY on the query, and a warning whenever the ambiguity exists at all.
 * No network, no DB: the ORDER BY is asserted against compiled SQL and the
 * resolution against crafted rows.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import {
  loadFederalCandidateMap,
  resolveFecCandidateMap,
  FUNDING_MIX_BUCKET_LABELS,
} from "./_fec-bulk";
import type { DbClient } from "../../db/client";

/** Capture the terms handed to `.orderBy()` and compile them to real SQL,
 *  so the assertions read what Postgres would order by rather than trusting
 *  the builder. */
function makeOrderByCapturingDb() {
  const captured: unknown[] = [];
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn((...terms: unknown[]) => {
    captured.push(...terms);
    return chain;
  });
  (chain as { then?: unknown }).then = (resolve: (v: unknown[]) => void) =>
    resolve([]);
  return {
    db: { select: vi.fn().mockReturnValue(chain) } as unknown as DbClient,
    captured,
  };
}

/** `orderBy` terms are a mix of SQL expressions and bare columns; wrapping
 *  normalises both into something the dialect can render. */
function compile(term: unknown) {
  return new PgDialect().sqlToQuery(sql`${term}` as never);
}

function candidateRow(id: string, fecCandidateId: string) {
  return { id, sourceId: null, fecCandidateId, rawMetadata: null };
}

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
});

describe("loadFederalCandidateMap ordering", () => {
  it("orders funding-mix-carrying rows first, then by candidate id, when given a cycle", async () => {
    const { db, captured } = makeOrderByCapturingDb();
    await loadFederalCandidateMap(db, "2026");

    expect(captured).toHaveLength(2);
    const preference = compile(captured[0]);
    // Descending on the EXISTS: in Postgres true sorts above false, so the
    // row that carries the funding mix is the one first-wins resolution
    // keeps. This is the attribution guarantee the ingest's old funding-mix
    // scoping used to provide.
    expect(preference.sql).toContain("donor_aggregates");
    expect(preference.sql).toContain('"candidates"."id"');
    expect(preference.sql.toLowerCase()).toContain("desc");
    expect(preference.params).toEqual(["2026", ...FUNDING_MIX_BUCKET_LABELS]);
    // The id tiebreak is what makes the winner reproducible run to run.
    expect(compile(captured[1]).sql).toContain('"candidates"."id"');
  });

  it("still orders by candidate id when no cycle is given", async () => {
    const { db, captured } = makeOrderByCapturingDb();
    await loadFederalCandidateMap(db);

    expect(captured).toHaveLength(1);
    const only = compile(captured[0]);
    expect(only.sql).toContain('"candidates"."id"');
    expect(only.sql).not.toContain("donor_aggregates");
  });
});

describe("resolveFecCandidateMap", () => {
  it("keeps the first row for an FEC id, so the query's ordering decides", () => {
    const map = resolveFecCandidateMap([
      candidateRow("federal-A", "H8XX00123"),
      candidateRow("federal-B", "H8XX00123"),
    ]);
    expect(map.get("H8XX00123")).toBe("federal-A");
  });

  it("warns naming the FEC id and every competing candidate id", () => {
    resolveFecCandidateMap([
      candidateRow("federal-A", "H8XX00123"),
      candidateRow("federal-B", "H8XX00123"),
    ]);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const message = String(warnSpy.mock.calls[0]?.[0]);
    expect(message).toContain("H8XX00123");
    expect(message).toContain("federal-A");
    expect(message).toContain("federal-B");
  });

  it("stays silent when every FEC id resolves to exactly one row", () => {
    const map = resolveFecCandidateMap([
      candidateRow("federal-A", "H8XX00123"),
      candidateRow("federal-B", "S0YY00456"),
    ]);
    expect(map.size).toBe(2);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
