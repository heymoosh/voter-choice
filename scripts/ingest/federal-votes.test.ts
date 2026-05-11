import { describe, expect, it } from "vitest";
import {
  buildCandidateId,
  buildGovTrackBillId,
  createEmptyPlan,
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
