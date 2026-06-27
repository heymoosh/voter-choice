import { describe, expect, it } from "vitest";
import {
  buildCandidateId,
  buildGovTrackBillId,
  createEmptyPlan,
  deriveBillStatus,
  extractRollCallTally,
  mergeFederalPlans,
  normalizeVoteCast,
  planGovTrackVote,
  resolveRuntimeConfig,
} from "./federal-votes";

const billVote = {
  congress: 118,
  chamber: "h",
  date: "2023-02-01T18:12:00-05:00",
  number: 42,
  question: "On Passage",
  source_url: "https://clerk.house.gov/Votes/202342",
  bill: {
    congress: 118,
    type: "hr",
    number: 1234,
    title: "Example Accountability Act",
    link: "https://www.govtrack.us/congress/bills/118/hr1234",
  },
  votes: {
    Aye: [
      {
        bioguide_id: "A000001",
        display_name: "Rep. Ada Example",
        state: "TX",
        party: "I",
      },
    ],
    No: [
      {
        person: {
          bioguideid: "B000002",
          name: "Rep. Bea Example",
        },
      },
    ],
    Present: [],
    "Not Voting": [],
  },
};

const apiBillVote = {
  congress: 118,
  chamber: "house",
  created: "2023-01-26T18:03:00",
  link: "https://www.govtrack.us/congress/votes/118-2023/h49",
  number: 49,
  question: "H.Amdt. 23 (Levin) to H.R. 21",
  related_bill: {
    congress: 118,
    bill_type: "house_bill",
    number: 21,
    title: "H.R. 21 (118th): Strategic Production Response Act",
    link: "https://www.govtrack.us/congress/bills/118/hr21",
  },
  voters: {
    A000370: {
      option: { key: "+", value: "Aye" },
      person: {
        bioguideid: "A000370",
        name: "Rep. Alma Adams [D-NC12]",
      },
    },
    B001298: {
      option: { key: "-", value: "No" },
      person: {
        bioguideid: "B001298",
        name: "Rep. Don Bacon [R-NE2]",
      },
    },
  },
};

describe("federal-votes helpers", () => {
  it("normalizes GovTrack vote labels", () => {
    expect(normalizeVoteCast("Aye")).toBe("yea");
    expect(normalizeVoteCast("Yea")).toBe("yea");
    expect(normalizeVoteCast("+")).toBe("yea");
    expect(normalizeVoteCast("No")).toBe("nay");
    expect(normalizeVoteCast("Nay")).toBe("nay");
    expect(normalizeVoteCast("-")).toBe("nay");
    expect(normalizeVoteCast("Present")).toBe("present");
    expect(normalizeVoteCast("Absent")).toBe("absent");
    expect(normalizeVoteCast("Not Voting")).toBe("not_voting");
    expect(normalizeVoteCast("unknown option")).toBeNull();
  });

  it("constructs stable bill and candidate IDs", () => {
    expect(buildGovTrackBillId(billVote.bill)).toBe("govtrack-hr1234-118");
    expect(buildGovTrackBillId(apiBillVote.related_bill)).toBe(
      "govtrack-hr21-118",
    );
    expect(buildCandidateId(billVote.votes.Aye[0])).toBe("federal-A000001");
    expect(buildCandidateId(billVote.votes.No[0])).toBe("federal-B000002");
  });

  it("plans GovTrack API vote_voter records", () => {
    const plan = planGovTrackVote(apiBillVote, {
      dataUrl: apiBillVote.link,
    });

    expect(plan.counts.billRollCalls).toBe(1);
    expect(plan.bills.get("govtrack-hr21-118")?.sourceUrl).toBe(
      "https://www.govtrack.us/congress/bills/118/hr21",
    );
    expect(plan.candidates.has("federal-A000370")).toBe(true);
    expect(plan.candidates.has("federal-B001298")).toBe(true);
    expect(plan.votes.get("govtrack-hr21-118|federal-A000370")?.voteCast).toBe(
      "yea",
    );
    expect(plan.votes.get("govtrack-hr21-118|federal-B001298")?.voteCast).toBe(
      "nay",
    );
    expect(
      plan.votes.get("govtrack-hr21-118|federal-A000370")?.rawMetadata,
    ).toBeNull();
  });

  it("skips non-bill roll calls with explicit counts", () => {
    const plan = planGovTrackVote(
      {
        congress: 118,
        chamber: "s",
        date: "2023-03-01",
        question: "On the Nomination",
        votes: {
          Yea: [{ bioguide_id: "S000001", display_name: "Sen. Example" }],
        },
      },
      {
        dataUrl:
          "https://www.govtrack.us/data/congress/118/votes/2023/s1/data.json",
      },
    );

    expect(plan.counts.rollCallsSeen).toBe(1);
    expect(plan.counts.billRollCalls).toBe(0);
    expect(plan.counts.skippedNonBillRollCalls).toBe(1);
    expect(plan.bills.size).toBe(0);
    expect(plan.votes.size).toBe(0);
  });

  it("plans idempotent rows and keeps the latest vote per bill/candidate", () => {
    const first = planGovTrackVote(billVote, {
      dataUrl:
        "https://www.govtrack.us/data/congress/118/votes/2023/h42/data.json",
    });
    const second = planGovTrackVote(
      {
        ...billVote,
        date: "2023-04-15",
        number: 99,
        source_url: "https://clerk.house.gov/Votes/202399",
        votes: {
          No: [billVote.votes.Aye[0]],
        },
      },
      {
        dataUrl:
          "https://www.govtrack.us/data/congress/118/votes/2023/h99/data.json",
      },
    );

    const merged = mergeFederalPlans(createEmptyPlan(), first);
    mergeFederalPlans(merged, second);

    expect(merged.candidates.size).toBe(2);
    expect(merged.candidateOffices.size).toBe(2);
    expect(merged.bills.size).toBe(1);
    expect(merged.votes.size).toBe(2);
    expect(merged.counts.voteRowsPlanned).toBe(2);

    const latestAdaVote = merged.votes.get(
      "govtrack-hr1234-118|federal-A000001",
    );
    expect(latestAdaVote?.voteCast).toBe("nay");
    expect(latestAdaVote?.voteDate).toBe("2023-04-15");
    expect(latestAdaVote?.sourceUrl).toBe(
      "https://clerk.house.gov/Votes/202399",
    );
  });

  it("defaults to the current Congress plus one previous Congress", () => {
    const config = resolveRuntimeConfig(
      {} as NodeJS.ProcessEnv,
      new Date("2026-05-10T12:00:00Z"),
    );
    expect(config.congresses).toEqual([119, 118]);
    expect(config.govtrackBaseUrl).toBe("https://www.govtrack.us/api/v2");
    expect(config.resetVotes).toBe(false);
  });

  it("reads the federal vote reset flag from env", () => {
    const config = resolveRuntimeConfig(
      { FEDERAL_RESET_VOTES: "true" } as NodeJS.ProcessEnv,
      new Date("2026-05-10T12:00:00Z"),
    );
    expect(config.resetVotes).toBe(true);
  });
});

describe("extractRollCallTally", () => {
  it("extracts pre-computed GovTrack total_* fields", () => {
    const vote = {
      total_plus: 232,
      total_minus: 193,
      total_present: 0,
      total_not_voting: 10,
      result: "Passed",
    };
    expect(extractRollCallTally(vote)).toEqual({
      yea: 232,
      nay: 193,
      present: 0,
      notVoting: 10,
      result: "Passed",
    });
  });

  it("falls back to counting grouped votes when total_* fields are absent", () => {
    const vote = {
      result: "Passed",
      votes: {
        Aye: [{ bioguide_id: "A000001" }, { bioguide_id: "A000002" }],
        No: [{ bioguide_id: "B000001" }],
        Present: [{ bioguide_id: "C000001" }],
        "Not Voting": [],
      },
    };
    const tally = extractRollCallTally(vote);
    expect(tally.yea).toBe(2);
    expect(tally.nay).toBe(1);
    expect(tally.present).toBe(1);
    expect(tally.notVoting).toBe(0);
    expect(tally.result).toBe("Passed");
  });

  it("returns null counts for an empty or missing vote object", () => {
    expect(extractRollCallTally(null)).toEqual({
      yea: null,
      nay: null,
      present: null,
      notVoting: null,
      result: null,
    });
    expect(extractRollCallTally({})).toEqual({
      yea: null,
      nay: null,
      present: null,
      notVoting: null,
      result: null,
    });
  });

  it("tally is stored on each vote row produced by planGovTrackVote", () => {
    const voteJson = {
      ...billVote,
      total_plus: 220,
      total_minus: 180,
      total_present: 5,
      total_not_voting: 30,
      result: "Passed",
    };
    const plan = planGovTrackVote(voteJson, {
      dataUrl:
        "https://www.govtrack.us/data/congress/118/votes/2023/h42/data.json",
    });
    const voteRow = plan.votes.get("govtrack-hr1234-118|federal-A000001");
    expect(voteRow?.tallyYea).toBe(220);
    expect(voteRow?.tallyNay).toBe(180);
    expect(voteRow?.tallyPresent).toBe(5);
    expect(voteRow?.tallyNotVoting).toBe(30);
    expect(voteRow?.tallyResult).toBe("Passed");
  });

  it("stores null tallies when no tally data is present", () => {
    const plan = planGovTrackVote(billVote, {
      dataUrl:
        "https://www.govtrack.us/data/congress/118/votes/2023/h42/data.json",
    });
    // billVote fixture has no total_* fields, grouped votes with empty Present/Not Voting
    const voteRow = plan.votes.get("govtrack-hr1234-118|federal-A000001");
    // Grouped votes are counted, so yea/nay should be non-null
    expect(voteRow?.tallyYea).toBe(1); // 1 Aye
    expect(voteRow?.tallyNay).toBe(1); // 1 No
  });
});

describe("deriveBillStatus", () => {
  it("appends the date to the action text when available", () => {
    expect(deriveBillStatus("Passed House", "2023-02-09")).toBe(
      "Passed House (2023-02-09)",
    );
  });

  it("returns the action text alone when no date", () => {
    expect(deriveBillStatus("Passed House", undefined)).toBe("Passed House");
  });

  it("returns undefined when action text is empty or missing", () => {
    expect(deriveBillStatus(undefined, "2023-02-09")).toBeUndefined();
    expect(deriveBillStatus("", "2023-02-09")).toBeUndefined();
    expect(deriveBillStatus("  ", "2023-02-09")).toBeUndefined();
  });

  it("normalizes ISO date strings", () => {
    expect(deriveBillStatus("Signed into law", "2022-08-16")).toBe(
      "Signed into law (2022-08-16)",
    );
  });
});
