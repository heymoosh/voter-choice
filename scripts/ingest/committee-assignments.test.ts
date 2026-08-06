/**
 * scripts/ingest/committee-assignments.test.ts
 *
 * Tests for the committee-assignments ingest's pure parsing/joining
 * functions. No network or DB.
 */

import { describe, it, expect, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

/** Compile a captured drizzle predicate to real SQL + params, so tests can
 *  assert what the DELETE would actually do rather than trusting a stub. */
function compile(where: unknown) {
  return new PgDialect().sqlToQuery(where as never);
}
import {
  candidateIdFromBioguide,
  flattenCommittees,
  flattenMembership,
  buildCommitteeRows,
  buildMembershipRows,
  currentCongress,
  runCommitteeAssignmentsIngest,
  computePruneScope,
  MIN_MEMBERSHIPS_FOR_PRUNE,
} from "./committee-assignments";

const COMMITTEES_YAML_PARSED = [
  {
    type: "house",
    name: "House Committee on Agriculture",
    thomas_id: "HSAG",
    jurisdiction: "The House Committee on Agriculture has jurisdiction over...",
    subcommittees: [
      { name: "Forestry and Horticulture", thomas_id: "15" },
      { name: "Nutrition and Foreign Agriculture", thomas_id: "03" },
    ],
  },
  {
    type: "senate",
    name: "Senate Committee on Indian Affairs",
    thomas_id: "SLIA",
    jurisdiction:
      "The Senate Committee on Indian Affairs has jurisdiction over...",
  },
  {
    // Malformed: no thomas_id — must be dropped, not thrown.
    type: "joint",
    name: "Malformed Committee",
  },
];

const MEMBERSHIP_YAML_PARSED = {
  HSAG: [
    {
      name: "Chair Person",
      party: "majority",
      rank: 1,
      title: "Chairman",
      bioguide: "C000001",
    },
    {
      name: "Member Two",
      party: "minority",
      rank: 1,
      title: "Ranking Member",
      bioguide: "M000002",
    },
  ],
  HSAG15: [
    { name: "Sub Member", party: "majority", rank: 1, bioguide: "S000003" },
  ],
  // References a committee thomas_id absent from committees-current.yaml —
  // must be filtered out downstream by buildMembershipRows, not thrown.
  ZZZZ: [
    { name: "Orphan Member", party: "majority", rank: 1, bioguide: "O000004" },
  ],
  // Historical entry with no bioguide — must be dropped.
  SLIA: [{ name: "No Bioguide", party: "majority", rank: 1 }],
};

describe("candidateIdFromBioguide", () => {
  it("builds the federal-<BIOGUIDE> id (matches member-stats/federal-votes convention)", () => {
    expect(candidateIdFromBioguide("C001035")).toBe("federal-C001035");
  });
});

describe("flattenCommittees", () => {
  it("flattens parent committees and subcommittees, deriving compound subcommittee ids", () => {
    const flat = flattenCommittees(COMMITTEES_YAML_PARSED);
    expect(flat).toEqual([
      {
        thomasId: "HSAG",
        name: "House Committee on Agriculture",
        chamber: "house",
        jurisdiction:
          "The House Committee on Agriculture has jurisdiction over...",
        parentCommitteeId: null,
      },
      {
        thomasId: "HSAG15",
        name: "Forestry and Horticulture",
        chamber: "house",
        jurisdiction: null,
        parentCommitteeId: "HSAG",
      },
      {
        thomasId: "HSAG03",
        name: "Nutrition and Foreign Agriculture",
        chamber: "house",
        jurisdiction: null,
        parentCommitteeId: "HSAG",
      },
      {
        thomasId: "SLIA",
        name: "Senate Committee on Indian Affairs",
        chamber: "senate",
        jurisdiction:
          "The Senate Committee on Indian Affairs has jurisdiction over...",
        parentCommitteeId: null,
      },
    ]);
  });

  it("returns an empty list for non-array input", () => {
    expect(flattenCommittees(null)).toEqual([]);
    expect(flattenCommittees({})).toEqual([]);
  });
});

describe("flattenMembership", () => {
  it("flattens the keyed membership object, dropping entries with no bioguide", () => {
    const flat = flattenMembership(MEMBERSHIP_YAML_PARSED);
    expect(flat).toEqual([
      {
        committeeId: "HSAG",
        candidateId: "federal-C000001",
        rank: 1,
        title: "Chairman",
      },
      {
        committeeId: "HSAG",
        candidateId: "federal-M000002",
        rank: 1,
        title: "Ranking Member",
      },
      {
        committeeId: "HSAG15",
        candidateId: "federal-S000003",
        rank: 1,
        title: null,
      },
      {
        committeeId: "ZZZZ",
        candidateId: "federal-O000004",
        rank: 1,
        title: null,
      },
    ]);
  });

  it("returns an empty list for non-object input", () => {
    expect(flattenMembership(null)).toEqual([]);
    expect(flattenMembership([])).toEqual([]);
  });
});

describe("buildCommitteeRows", () => {
  it("stamps source and sourceUrl onto every flattened committee", () => {
    const flat = flattenCommittees(COMMITTEES_YAML_PARSED);
    const rows = buildCommitteeRows(flat, "https://example.com/committees");
    expect(rows[0]).toMatchObject({
      thomasId: "HSAG",
      source: "congress-legislators",
      sourceUrl: "https://example.com/committees",
    });
  });
});

describe("buildMembershipRows", () => {
  it("keeps only memberships whose committee was fetched this run", () => {
    const flat = flattenMembership(MEMBERSHIP_YAML_PARSED);
    const knownCommitteeIds = new Set(["HSAG", "HSAG15", "SLIA"]); // no ZZZZ
    const rows = buildMembershipRows(
      flat,
      knownCommitteeIds,
      119,
      "https://example.com/membership",
    );
    expect(rows.map((r) => r.committeeId)).toEqual(["HSAG", "HSAG", "HSAG15"]);
    expect(rows[0]).toMatchObject({
      candidateId: "federal-C000001",
      congress: 119,
      source: "congress-legislators",
      sourceUrl: "https://example.com/membership",
    });
  });
});

describe("currentCongress", () => {
  it("computes the congress number from a given date", () => {
    expect(currentCongress(new Date("2025-06-01T00:00:00Z"))).toBe(119);
    expect(currentCongress(new Date("2026-06-01T00:00:00Z"))).toBe(119);
    expect(currentCongress(new Date("2027-02-01T00:00:00Z"))).toBe(120);
  });
});

// ---------------------------------------------------------------------------
// Reconciliation (the prune)
// ---------------------------------------------------------------------------

/**
 * A DB stub good enough for runCommitteeAssignmentsIngest: it records the
 * delete calls (that's what these tests are about) and no-ops the rest.
 * `select` returns the candidate roster the membership join filters against.
 */
function makeDbStub(candidateIds: string[]) {
  const deletes: { returned: unknown[]; where: unknown }[] = [];
  // select() is called twice in a preview run: once for the candidate roster,
  // then once for the would-be-pruned rows. Serve them in order.
  const previewRows = [
    { candidateId: "federal-X000000", committeeId: "SLIA", title: "Chairman" },
  ];
  let selectCall = 0;
  const makeSelectChain = () => {
    const rows =
      selectCall++ === 0 ? candidateIds.map((id) => ({ id })) : previewRows;
    const chain = {
      from: vi.fn(),
      where: vi.fn().mockResolvedValue(rows),
    };
    chain.from.mockReturnValue(chain);
    return chain;
  };

  const insertChain = {
    values: vi.fn(),
    onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
  };
  insertChain.values.mockReturnValue(insertChain);

  const db = {
    select: vi.fn().mockImplementation(() => makeSelectChain()),
    insert: vi.fn().mockReturnValue(insertChain),
    delete: vi.fn().mockImplementation(() => {
      const rec: { returned: unknown[]; where: unknown } = {
        returned: [{ id: "stale-1" }, { id: "stale-2" }],
        where: undefined,
      };
      deletes.push(rec);
      const chain = {
        // Record the predicate so tests can compile and assert it — a stub
        // that ignores .where() would pass no matter what we deleted.
        where: vi.fn().mockImplementation((w: unknown) => {
          rec.where = w;
          return chain;
        }),
        returning: vi.fn().mockResolvedValue(rec.returned),
      };
      return chain;
    }),
  };
  return { db, deletes, previewRows };
}

/** A fetcher returning `n` members spread over one committee. */
function stubFetcher(memberCount: number) {
  const committeesYaml = [
    {
      type: "house",
      name: "House Committee on Agriculture",
      thomas_id: "HSAG",
    },
  ];
  const membershipYaml = {
    HSAG: Array.from({ length: memberCount }, (_, i) => ({
      name: `Member ${i}`,
      party: "majority",
      rank: i + 1,
      bioguide: `X${String(i).padStart(6, "0")}`,
    })),
  };
  const bodyFor = (url: string) =>
    url.includes("committee-membership-current")
      ? JSON.stringify(membershipYaml)
      : JSON.stringify(committeesYaml);
  return vi.fn(async (url: unknown) => ({
    ok: true,
    status: 200,
    text: async () => bodyFor(String(url)),
  })) as unknown as typeof fetch;
}

describe("runCommitteeAssignmentsIngest — reconciliation", () => {
  const memberIds = (n: number) =>
    Array.from(
      { length: n },
      (_, i) => `federal-X${String(i).padStart(6, "0")}`,
    );

  it("prunes memberships the source no longer lists", async () => {
    const n = MIN_MEMBERSHIPS_FOR_PRUNE + 10;
    const { db, deletes } = makeDbStub(memberIds(n));

    const counts = await runCommitteeAssignmentsIngest(
      db as never,
      stubFetcher(n),
      { congress: 119 },
    );

    expect(deletes).toHaveLength(1);
    expect(counts.membershipsDeleted).toBe(2);
    expect(counts.prunedSkipped).toBe(false);

    // The predicate itself — the part that decides what actually dies.
    const { sql: text, params } = compile(deletes[0].where);
    // Scoped to the ingested congress, never a historical one.
    expect(text).toContain('"congress" = ');
    expect(params).toContain(119);
    // Bounded to members refreshed AND committees fetched this run, minus the
    // keys we wrote — i.e. two IN lists and one NOT IN.
    expect(text).toContain('"candidate_id" in ');
    expect(text).toContain('"committee_id" in ');
    expect(text).toContain("not in ");
    // Every member we refreshed is in the delete scope, and their kept key is
    // excluded from it — so a seat they still hold cannot be deleted.
    expect(params).toContain("federal-X000000");
    expect(params).toContain("federal-X000000|HSAG");
    // No timestamp anywhere: the clock-skew hazard is structurally gone.
    expect(text).not.toContain("fetched_at");
  });

  it("SKIPS the prune when the fetch resolved implausibly few rows", async () => {
    // A truncated or failed YAML fetch must leave data stale rather than
    // empty the table — missing committees read as "has none", which is a
    // worse lie than a stale one.
    const n = MIN_MEMBERSHIPS_FOR_PRUNE - 1;
    const { db, deletes } = makeDbStub(memberIds(n));

    const counts = await runCommitteeAssignmentsIngest(
      db as never,
      stubFetcher(n),
      { congress: 119 },
    );

    expect(deletes).toHaveLength(0);
    expect(counts.membershipsDeleted).toBe(0);
    expect(counts.prunedSkipped).toBe(true);
  });

  it("does not delete when the source is healthy but nothing joined", async () => {
    // The floor is measured against the RAW source count, so a big fetch clears
    // it — but if the candidate join resolved nothing, there is no member whose
    // record we refreshed and therefore nothing we are entitled to delete.
    // Gating on the post-filter count instead would let this run prune.
    const n = MIN_MEMBERSHIPS_FOR_PRUNE + 100;
    const { db, deletes } = makeDbStub([]); // no matching candidates rows

    const counts = await runCommitteeAssignmentsIngest(
      db as never,
      stubFetcher(n),
      { congress: 119 },
    );

    expect(deletes).toHaveLength(0);
    expect(counts.membershipsDeleted).toBe(0);
    expect(counts.prunedSkipped).toBe(true);
    expect(counts.skippedNoCandidate).toBe(n);
  });

  it("does not delete on a full-length payload carrying almost no members", async () => {
    // The exact hole a row-count-only floor leaves: a payload long enough to
    // clear MIN_MEMBERSHIPS_FOR_PRUNE but carrying one real member. Without the
    // distinct-member floor, that member's OTHER committees read as departures
    // and get deleted.
    const committeesYaml = [
      {
        type: "house",
        name: "House Committee on Agriculture",
        thomas_id: "HSAG",
      },
    ];
    const membershipYaml = {
      HSAG: [
        {
          name: "Real Member",
          party: "majority",
          rank: 1,
          bioguide: "X000000",
        },
        // 120 well-formed rows for members we hold no `candidates` row for, so
        // they survive parsing and inflate the row count but resolve to nobody.
        ...Array.from({ length: 120 }, (_, i) => ({
          name: `Orphan ${i}`,
          party: "majority",
          rank: i + 2,
          bioguide: `O${String(i).padStart(6, "0")}`,
        })),
      ],
    };
    const fetcher = vi.fn(async (url: unknown) => ({
      ok: true,
      status: 200,
      text: async () =>
        String(url).includes("committee-membership-current")
          ? JSON.stringify(membershipYaml)
          : JSON.stringify(committeesYaml),
    })) as unknown as typeof fetch;

    const { db, deletes } = makeDbStub(["federal-X000000"]);
    const counts = await runCommitteeAssignmentsIngest(db as never, fetcher, {
      congress: 119,
    });

    // Clears the raw-row floor...
    expect(counts.membershipsFetched).toBeGreaterThanOrEqual(
      MIN_MEMBERSHIPS_FOR_PRUNE,
    );
    // ...but only one member resolved, so nothing is deleted.
    expect(deletes).toHaveLength(0);
    expect(counts.membershipsDeleted).toBe(0);
    expect(counts.prunedSkipped).toBe(true);
  });

  it("--preview-prune reports what would die and deletes nothing", async () => {
    const n = MIN_MEMBERSHIPS_FOR_PRUNE + 10;
    const { db, deletes } = makeDbStub(memberIds(n));
    const logged: string[] = [];
    const spy = vi
      .spyOn(console, "log")
      .mockImplementation((...a: unknown[]) => void logged.push(a.join(" ")));

    const counts = await runCommitteeAssignmentsIngest(
      db as never,
      stubFetcher(n),
      { congress: 119, previewPrune: true },
    );
    spy.mockRestore();

    // Nothing deleted, and the caller can tell the prune didn't run.
    expect(deletes).toHaveLength(0);
    expect(counts.membershipsDeleted).toBe(0);
    expect(counts.prunedSkipped).toBe(true);
    // ...but the operator is told exactly what it would have removed.
    expect(logged.join("\n")).toContain("PREVIEW");
    expect(logged.join("\n")).toContain(
      "would delete: federal-X000000 from SLIA",
    );
  });

  it("never deletes on a dry run", async () => {
    const n = MIN_MEMBERSHIPS_FOR_PRUNE + 10;
    const { db, deletes } = makeDbStub(memberIds(n));

    const counts = await runCommitteeAssignmentsIngest(
      db as never,
      stubFetcher(n),
      { congress: 119, dryRun: true },
    );

    expect(deletes).toHaveLength(0);
    expect(counts.prunedSkipped).toBe(true);
  });
});

describe("computePruneScope — what the prune may delete", () => {
  // These bounds are the whole safety story. Each assertion below corresponds
  // to a way a naive "delete anything untouched" prune destroys real data.
  const KNOWN_COMMITTEES = new Set(["HSAG", "HSAG15", "SLIA"]);

  it("only lists members this run actually refreshed", () => {
    const scope = computePruneScope(
      [
        { candidateId: "federal-A000001", committeeId: "HSAG" },
        { candidateId: "federal-A000001", committeeId: "SLIA" },
        { candidateId: "federal-B000002", committeeId: "HSAG" },
      ],
      KNOWN_COMMITTEES,
    );
    expect(scope.refreshedMemberIds.sort()).toEqual([
      "federal-A000001",
      "federal-B000002",
    ]);
  });

  it("excludes a member whose row was skipped, so their seats survive", () => {
    // federal-C000003 was in the source but has no `candidates` row, so the
    // caller filtered them out before this point. They must NOT be pruneable —
    // otherwise a missing candidate row silently deletes real committee seats.
    const scope = computePruneScope(
      [{ candidateId: "federal-A000001", committeeId: "HSAG" }],
      KNOWN_COMMITTEES,
    );
    expect(scope.refreshedMemberIds).not.toContain("federal-C000003");
  });

  it("bounds deletion to committees this run fetched", () => {
    // A membership on a committee absent from committees-current.yaml is
    // untouchable — we can't tell "dissolved" from "not fetched this run".
    const scope = computePruneScope(
      [{ candidateId: "federal-A000001", committeeId: "HSAG" }],
      KNOWN_COMMITTEES,
    );
    expect(scope.fetchedCommitteeIds.sort()).toEqual([
      "HSAG",
      "HSAG15",
      "SLIA",
    ]);
    expect(scope.fetchedCommitteeIds).not.toContain("ZZZZ");
  });

  it("keys every written membership so only genuine departures are deleted", () => {
    const scope = computePruneScope(
      [
        { candidateId: "federal-A000001", committeeId: "HSAG" },
        { candidateId: "federal-B000002", committeeId: "HSAG15" },
      ],
      KNOWN_COMMITTEES,
    );
    expect(scope.keptKeys.sort()).toEqual([
      "federal-A000001|HSAG",
      "federal-B000002|HSAG15",
    ]);
  });

  it("returns no refreshed members when nothing resolved (prune must no-op)", () => {
    expect(computePruneScope([], KNOWN_COMMITTEES).refreshedMemberIds).toEqual(
      [],
    );
  });
});
