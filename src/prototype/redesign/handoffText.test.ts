import { describe, it, expect } from "vitest";
import { buildScorecardHandoffPrompt } from "./handoffText";
import type { DelegationSeatVM, UserIssue } from "./delegationData";

const ISSUES: UserIssue[] = [
  {
    canonicalIssue: "healthcare_affordability",
    interpretation: "Lower insulin & drug prices",
    stance: "in_favor",
    level: "federal",
  },
  {
    canonicalIssue: "housing_affordability",
    interpretation: "Rent & cost-of-living protections",
    stance: "opposed",
    level: "both",
  },
];

function seats(): DelegationSeatVM[] {
  return [
    {
      id: "house-TX-37",
      office: "U.S. House",
      districtLabel: "TX-37",
      blindLabel: "Your U.S. Representative",
      candidate: { id: "c1", name: "Alex Rivera" },
      alignmentEntry: {
        candidateId: "c1",
        scores: [
          { kept: 5, total: 6 },
          { kept: 1, total: 4 },
        ],
      },
      challengers: [
        {
          id: "ch1",
          name: "Jane Doe",
          party: "Republican",
          totalReceipts: 120000,
        },
        { id: "ch2", name: "Sam Roe", party: "Democrat" },
      ],
    },
    {
      id: "senate-TX-b",
      office: "U.S. Senate",
      districtLabel: "Texas (statewide)",
      blindLabel: "Your Junior U.S. Senator",
      candidate: { id: "c3", name: "Jordan Okafor" },
      alignmentEntry: null,
      challengers: [],
    },
  ] as unknown as DelegationSeatVM[];
}

describe("buildScorecardHandoffPrompt", () => {
  const prompt = buildScorecardHandoffPrompt({
    seats: seats(),
    issues: ISSUES,
    verdicts: { "house-TX-37": "keep" },
    districtsLine: "U.S. House TX-37 · U.S. Senate Texas (statewide)",
    stateName: "Texas",
    researchFor: (id) =>
      id === "senate-TX-b"
        ? { status: "done", scores: [] as never }
        : undefined,
  });

  it("carries ranked priorities with direction and jurisdiction tags", () => {
    expect(prompt).toContain("1. Lower insulin & drug prices — in favor [FED]");
    expect(prompt).toContain(
      "2. Rent & cost-of-living protections — opposed [BOTH]",
    );
  });

  it("states each verdict WITH its evidence basis", () => {
    expect(prompt).toContain("Alex Rivera — WORTH KEEPING");
    expect(prompt).toContain(
      "Basis: voting record: aligned with me on 6 of 10 scored votes (60%)",
    );
  });

  it("lists unreviewed seats with their evidence status", () => {
    expect(prompt).toContain("STILL TO REVIEW:");
    expect(prompt).toContain(
      "Jordan Okafor — researched positions (web search, cited sources",
    );
  });

  it("includes the seat's 2026 FEC filers with funds raised", () => {
    expect(prompt).toContain("ON THE 2026 BALLOT");
    expect(prompt).toContain("Jane Doe (Republican) — $120,000 raised");
    expect(prompt).toContain("Sam Roe (Democrat) — no funds reported");
  });

  it("never contains an address and never resurrects the ballot CTA", () => {
    expect(prompt).not.toMatch(/\d+ \w+ (St|Ave|Blvd|Rd)\b/);
    expect(prompt.toLowerCase()).not.toContain("voting plan");
    expect(prompt.toLowerCase()).not.toContain("my ballot");
    expect(prompt).toContain("Don't ask me to re-enter my address");
  });

  it("keeps the neutrality instruction", () => {
    expect(prompt).toContain("never tell me who to vote for");
  });

  it("handles the nothing-reviewed state honestly", () => {
    const fresh = buildScorecardHandoffPrompt({
      seats: seats(),
      issues: ISSUES,
      verdicts: {},
      districtsLine: "U.S. House TX-37",
    });
    expect(fresh).toContain("MY VERDICTS SO FAR (0 of 2 reviewed):");
    expect(fresh).toContain("(none yet)");
  });
});
