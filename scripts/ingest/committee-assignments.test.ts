/**
 * scripts/ingest/committee-assignments.test.ts
 *
 * Tests for the committee-assignments ingest's pure parsing/joining
 * functions. No network or DB.
 */

import { describe, it, expect } from "vitest";
import {
  candidateIdFromBioguide,
  flattenCommittees,
  flattenMembership,
  buildCommitteeRows,
  buildMembershipRows,
  currentCongress,
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
