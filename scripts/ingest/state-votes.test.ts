import { describe, expect, it } from "vitest";
import {
  buildOpenStatesBillId,
  buildOpenStatesCandidateId,
  buildStateJurisdictionId,
  classifyStateJurisdiction,
  createEmptyStatePlan,
  mergeStatePlans,
  normalizeStateVoteCast,
  planOpenStatesBill,
  resolveRuntimeConfig,
  selectOpenStatesSessions,
} from "./state-votes";

const session = {
  id: "ocd-session/2025",
  name: "2025 Regular Session",
  identifier: "2025",
  classification: ["primary"],
  startDate: "2025-01-14",
  endDate: "2025-06-02",
  active: true,
};

const bill = {
  id: "ocd-bill/abc-123",
  identifier: "HB 12",
  title: "Example State Bill",
  session: "2025",
  jurisdiction: {
    id: "ocd-jurisdiction/country:us/state:tx/government",
  },
  from_organization: {
    classification: "lower",
    name: "House",
  },
  subject: ["Elections"],
  abstracts: [{ abstract: "Example bill abstract." }],
  sources: [{ url: "https://example.test/hb12" }],
  openstates_url: "https://openstates.org/tx/bills/2025/HB12/",
  first_action_date: "2025-01-20",
  votes: [
    {
      id: "ocd-vote/1",
      motion_text: "Passage",
      start_date: "2025-02-01T10:00:00-06:00",
      result: "pass",
      identifier: "RV #1",
      organization: { classification: "lower", name: "House" },
      sources: [{ url: "https://example.test/vote1" }],
      votes: [
        {
          id: "ocd-vote-person/1",
          option: "yes",
          voter_name: "Ada Example",
          voter: {
            id: "ocd-person/ada-uuid",
            name: "Ada Example",
            party: "Independent",
            current_role: {
              org_classification: "lower",
              title: "Representative",
            },
          },
        },
        {
          id: "ocd-vote-person/2",
          option: "no",
          voter_name: "Bea Example",
          voter: {
            id: "ocd-person/bea-uuid",
            name: "Bea Example",
            current_role: {
              org_classification: "lower",
            },
          },
        },
      ],
    },
  ],
};

describe("state-votes helpers", () => {
  it("normalizes OpenStates vote options", () => {
    expect(normalizeStateVoteCast("yes")).toBe("yea");
    expect(normalizeStateVoteCast("Yea")).toBe("yea");
    expect(normalizeStateVoteCast("no")).toBe("nay");
    expect(normalizeStateVoteCast("Nay")).toBe("nay");
    expect(normalizeStateVoteCast("present")).toBe("present");
    expect(normalizeStateVoteCast("abstain")).toBe("present");
    expect(normalizeStateVoteCast("absent")).toBe("absent");
    expect(normalizeStateVoteCast("not voting")).toBe("not_voting");
    expect(normalizeStateVoteCast("paired")).toBeNull();
  });

  it("maps states and chambers to canonical jurisdiction strings", () => {
    expect(buildStateJurisdictionId("tx")).toBe(
      "ocd-jurisdiction/country:us/state:tx/government",
    );
    expect(
      classifyStateJurisdiction("tx", {
        classification: "lower",
      }),
    ).toBe("state-TX-house");
    expect(
      classifyStateJurisdiction("ny", {
        name: "Senate",
      }),
    ).toBe("state-NY-senate");
    expect(classifyStateJurisdiction("ca", { name: "Committee" })).toBeNull();
  });

  it("constructs stable OpenStates IDs", () => {
    expect(buildOpenStatesBillId(bill)).toBe("openstates-ocd-bill-abc-123");
    expect(
      buildOpenStatesCandidateId({
        id: "ocd-person/ada-uuid",
      }),
    ).toBe("openstates-ocd-person-ada-uuid");
  });

  it("plans bill, candidate, office, and latest vote rows", () => {
    const first = planOpenStatesBill(bill, { state: "TX", session });
    const second = planOpenStatesBill(
      {
        ...bill,
        votes: [
          {
            ...bill.votes[0],
            id: "ocd-vote/2",
            start_date: "2025-03-10",
            sources: [{ url: "https://example.test/vote2" }],
            votes: [
              {
                ...bill.votes[0].votes[0],
                option: "no",
              },
            ],
          },
        ],
      },
      { state: "TX", session },
    );

    const merged = mergeStatePlans(createEmptyStatePlan(), first);
    mergeStatePlans(merged, second);

    expect(merged.bills.size).toBe(1);
    expect(merged.candidates.size).toBe(2);
    expect(merged.candidateOffices.size).toBe(2);
    expect(merged.votes.size).toBe(2);
    expect(
      merged.votes.get(
        "openstates-ocd-bill-abc-123|openstates-ocd-person-ada-uuid",
      )?.voteCast,
    ).toBe("nay");
    expect(
      merged.votes.get(
        "openstates-ocd-bill-abc-123|openstates-ocd-person-ada-uuid",
      )?.voteDate,
    ).toBe("2025-03-10");
  });

  it("counts skipped vote records without fabricating rows", () => {
    const plan = planOpenStatesBill(
      {
        ...bill,
        votes: [
          {
            id: "ocd-vote/skip",
            start_date: "2025-02-01",
            organization: { name: "Unknown Body" },
            votes: [
              { option: "yes", voter_name: "No Voter" },
              {
                option: "paired",
                voter: { id: "ocd-person/paired", name: "Paired Vote" },
              },
              {
                option: "yes",
                voter: {
                  id: "ocd-person/no-chamber",
                  name: "No Chamber",
                  current_role: { title: "Member" },
                },
              },
            ],
          },
        ],
        from_organization: { name: "Committee" },
      },
      { state: "TX", session },
    );

    expect(plan.votes.size).toBe(0);
    expect(plan.counts.skippedNoVoter).toBe(1);
    expect(plan.counts.skippedNoVoteOption).toBe(1);
    expect(plan.counts.skippedUnresolvedChamber).toBe(1);
  });

  it("uses voter current_role chamber when vote organization is unresolved", () => {
    const plan = planOpenStatesBill(
      {
        ...bill,
        from_organization: { name: "Committee" },
        votes: [
          {
            id: "ocd-vote/senate",
            start_date: "2025-02-01",
            organization: { name: "Committee" },
            votes: [
              {
                option: "yes",
                voter: {
                  id: "ocd-person/senator",
                  name: "Senator Example",
                  current_role: { org_classification: "upper" },
                },
              },
            ],
          },
        ],
      },
      { state: "TX", session },
    );

    expect(plan.votes.size).toBe(1);
    expect(plan.bills.get("openstates-ocd-bill-abc-123")?.jurisdiction).toBe(
      "state-TX-senate",
    );
  });

  it("selects active/recent regular sessions and honors explicit IDs", () => {
    const jurisdiction = {
      legislative_sessions: [
        {
          id: "ocd-session/2021",
          identifier: "2021",
          classification: ["primary"],
          start_date: "2021-01-01",
          end_date: "2021-06-01",
        },
        {
          id: "ocd-session/2023-special",
          identifier: "2023S",
          classification: ["special"],
          start_date: "2023-07-01",
          end_date: "2023-07-31",
        },
        {
          id: "ocd-session/2023",
          identifier: "2023",
          classification: ["primary"],
          start_date: "2023-01-01",
          end_date: "2023-06-01",
        },
        {
          id: "ocd-session/2025",
          identifier: "2025",
          classification: ["primary"],
          start_date: "2025-01-01",
          end_date: "2025-06-01",
          active: true,
        },
      ],
    };

    expect(
      selectOpenStatesSessions(jurisdiction, {
        sessionCount: 2,
        now: new Date("2025-03-01T12:00:00Z"),
      }).map((value) => value.id),
    ).toEqual(["ocd-session/2025", "ocd-session/2023"]);
    expect(
      selectOpenStatesSessions(jurisdiction, {
        explicitSessionIds: ["manual-1", "manual-2"],
      }).map((value) => value.id),
    ).toEqual(["manual-1", "manual-2"]);
  });

  it("resolves runtime controls from env", () => {
    const config = resolveRuntimeConfig({
      STATE: "ca",
      OPENSTATES_API_KEY: "test-key",
      OPENSTATES_BASE_URL: "https://openstates.test/",
      OPENSTATES_PER_PAGE: "25",
      OPENSTATES_SESSION_COUNT: "3",
      OPENSTATES_SESSION_IDS: "2025,2023",
      OPENSTATES_MAX_BILLS: "10",
    } as NodeJS.ProcessEnv);

    expect(config.state).toBe("CA");
    expect(config.openStatesBaseUrl).toBe("https://openstates.test");
    expect(config.perPage).toBe(25);
    expect(config.sessionCount).toBe(3);
    expect(config.explicitSessionIds).toEqual(["2025", "2023"]);
    expect(config.maxBills).toBe(10);
  });
});
