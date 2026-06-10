/**
 * scripts/ingest/member-stats.test.ts
 *
 * Tests for the member-stats ingest's pure parsing/joining functions.
 * No network or DB.
 */

import { describe, it, expect } from "vitest";
import {
  candidateIdFromPerson,
  govtrackPersonIdFromPerson,
  parseRole,
  parseMissedVotesCsv,
  median,
  buildMemberStatsRows,
  currentCongressFromRoles,
  type CurrentRole,
} from "./member-stats";

const COLLINS_ROLE = {
  current: true,
  district: null,
  enddate: "2027-01-03",
  party: "Republican",
  person: {
    bioguideid: "C001035",
    firstname: "Susan",
    lastname: "Collins",
    link: "https://www.govtrack.us/congress/members/susan_collins/300025",
    name: "Sen. Susan Collins [R-ME]",
  },
  role_type: "senator",
  senator_class: "class2",
  senator_rank: "senior",
  startdate: "2021-01-03",
  state: "ME",
  congress_numbers: [117, 118, 119],
};

const HOUSE_ROLE = {
  current: true,
  district: 12,
  enddate: "2027-01-03",
  party: "Democrat",
  person: {
    bioguideid: "W000822",
    link: "https://www.govtrack.us/congress/members/bonnie_watson_coleman/412649",
    name: "Rep. Bonnie Watson Coleman [D-NJ12]",
  },
  role_type: "representative",
  senator_class: null,
  senator_rank: null,
  state: "NJ",
  congress_numbers: [119],
};

describe("candidateIdFromPerson / govtrackPersonIdFromPerson", () => {
  it("builds the federal-<BIOGUIDE> id (matches federal-votes ingest)", () => {
    expect(candidateIdFromPerson(COLLINS_ROLE.person)).toBe("federal-C001035");
  });

  it("falls back to federal-govtrack-<id> without a bioguide", () => {
    expect(candidateIdFromPerson({ id: 412649 })).toBe(
      "federal-govtrack-412649",
    );
  });

  it("extracts the person id from the link when no id field exists", () => {
    expect(govtrackPersonIdFromPerson(COLLINS_ROLE.person)).toBe("300025");
  });
});

describe("parseRole", () => {
  it("parses a senator role", () => {
    expect(parseRole(COLLINS_ROLE)).toEqual({
      candidateId: "federal-C001035",
      govtrackPersonId: "300025",
      chamber: "senate",
      state: "ME",
      district: null,
      senatorClass: "2",
      senatorRank: "senior",
      currentTermEnd: "2027-01-03",
      congressNumbers: [117, 118, 119],
    });
  });

  it("parses a representative role", () => {
    const parsed = parseRole(HOUSE_ROLE);
    expect(parsed).toMatchObject({
      candidateId: "federal-W000822",
      chamber: "house",
      state: "NJ",
      district: 12,
      senatorClass: null,
      senatorRank: null,
    });
  });

  it("skips non-voting roles (delegates) and malformed objects", () => {
    expect(parseRole({ ...HOUSE_ROLE, role_type: "delegate" })).toBeNull();
    expect(parseRole(null)).toBeNull();
    expect(parseRole({ role_type: "senator" })).toBeNull();
  });
});

describe("parseMissedVotesCsv", () => {
  it("parses id/total/missed/percent rows", () => {
    const csv = [
      "id,total_votes,missed_votes,percent,percentile",
      "412690,612,9,1.47,12.5",
      "400162,71,69,97.18,99.55",
      "garbage,line",
      "",
    ].join("\n");

    const out = parseMissedVotesCsv(csv);
    expect(out.size).toBe(2);
    expect(out.get("412690")).toEqual({
      totalVotes: 612,
      missedVotes: 9,
      percent: 1.47,
    });
  });
});

describe("currentCongressFromRoles", () => {
  const role = (
    chamber: "house" | "senate",
    congressNumbers: number[],
  ): CurrentRole => ({
    candidateId: "x",
    govtrackPersonId: null,
    chamber,
    state: null,
    district: null,
    senatorClass: null,
    senatorRank: null,
    currentTermEnd: null,
    congressNumbers,
  });

  it("intersects senate term spans down to the sitting congress", () => {
    const roles = [
      role("senate", [117, 118, 119]), // elected 2020
      role("senate", [119, 120, 121]), // elected 2024 — naive max() trap
      role("house", [119]),
    ];
    expect(currentCongressFromRoles(roles)).toBe(119);
  });

  it("falls back to the House max when the intersection is empty", () => {
    const roles = [role("senate", [117, 118]), role("house", [119])];
    expect(currentCongressFromRoles(roles)).toBe(119);
  });

  it("defaults to 119 with no usable data", () => {
    expect(currentCongressFromRoles([])).toBe(119);
  });
});

describe("median", () => {
  it("handles odd, even, and empty lists", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe("buildMemberStatsRows", () => {
  const roles: CurrentRole[] = [
    {
      candidateId: "federal-A",
      govtrackPersonId: "1",
      chamber: "house",
      state: "NJ",
      district: 12,
      senatorClass: null,
      senatorRank: null,
      currentTermEnd: "2027-01-03",
      congressNumbers: [119],
    },
    {
      candidateId: "federal-B",
      govtrackPersonId: "2",
      chamber: "house",
      state: "TX",
      district: 21,
      senatorClass: null,
      senatorRank: null,
      currentTermEnd: "2027-01-03",
      congressNumbers: [119],
    },
    {
      candidateId: "federal-C",
      govtrackPersonId: "3",
      chamber: "senate",
      state: "ME",
      district: null,
      senatorClass: "2",
      senatorRank: "senior",
      currentTermEnd: "2027-01-03",
      congressNumbers: [119],
    },
    {
      candidateId: "federal-D",
      govtrackPersonId: null, // no person id → no attendance join
      chamber: "senate",
      state: "ME",
      district: null,
      senatorClass: "1",
      senatorRank: "junior",
      currentTermEnd: "2029-01-03",
      congressNumbers: [119],
    },
  ];

  const attendance = new Map([
    ["1", { totalVotes: 612, missedVotes: 9, percent: 1.4 }],
    ["2", { totalVotes: 612, missedVotes: 69, percent: 11.2 }],
    ["3", { totalVotes: 486, missedVotes: 10, percent: 2.06 }],
  ]);

  it("joins attendance, computes per-chamber medians, nulls the missing", () => {
    const rows = buildMemberStatsRows(roles, attendance, "https://src");

    const a = rows.find((r) => r.candidateId === "federal-A");
    expect(a).toMatchObject({
      chamber: "house",
      state: "NJ",
      district: 12,
      missedVotesPct: "1.40",
      votesEligible: "612",
      chamberMedianPct: "6.30", // median of [1.4, 11.2]
      senateClass: null,
    });

    const c = rows.find((r) => r.candidateId === "federal-C");
    expect(c).toMatchObject({
      senatorRank: "senior",
      senateClass: "2",
      chamberMedianPct: "2.06", // single senate sample
      district: null,
    });

    const d = rows.find((r) => r.candidateId === "federal-D");
    expect(d).toMatchObject({
      missedVotesPct: null,
      votesEligible: null,
      chamberMedianPct: null,
      currentTermEnd: "2029-01-03",
    });
  });
});
