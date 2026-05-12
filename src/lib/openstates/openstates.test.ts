import { describe, expect, it } from "vitest";
import { deriveOpenStatesData } from "@/lib/openstates/derive";
import { lookupCandidateContext } from "@/lib/openstates/lookup";

describe("OpenStates enrichment", () => {
  const derived = deriveOpenStatesData(
    [
      {
        person: {
          id: "ocd-person/1",
          name: "Jane Q. Candidate",
          party: "Independent",
          links: ["https://example.test/jane"],
        },
        office: {
          title: "State Representative",
          district: "12",
          state: "tx",
          jurisdiction: "Texas Legislature",
          isIncumbent: true,
        },
        votes: [
          {
            billId: "HB 1",
            billTitle: "Budget Bill",
            date: "2026-04-01",
            option: "yes",
            sourceUrl: "https://example.test/hb1",
          },
        ],
      },
    ],
    "2026-05-11T00:00:00.000Z",
  );

  it("maps identity, office, incumbency, votes, and source links", () => {
    expect(derived.candidates[0]).toMatchObject({
      personId: "ocd-person/1",
      normalizedName: "jane q candidate",
      party: "Independent",
      state: "TX",
      officeTitle: "State Representative",
      district: "12",
      isIncumbent: true,
      sourceLinks: ["https://example.test/jane"],
    });
    expect(derived.candidates[0].recentVotes[0]).toMatchObject({
      billId: "HB 1",
      sourceUrl: "https://example.test/hb1",
    });
  });

  it("finds a candidate by state, office, district, and normalized name", () => {
    const candidate = lookupCandidateContext(derived, {
      state: "TX",
      officeTitle: "Representative",
      district: "12",
      candidateName: "Jane Q Candidate",
    });

    expect(candidate?.personId).toBe("ocd-person/1");
  });

  it("returns null when a candidate cannot be matched", () => {
    const candidate = lookupCandidateContext(derived, {
      state: "CA",
      candidateName: "Jane Q Candidate",
    });

    expect(candidate).toBeNull();
  });
});
