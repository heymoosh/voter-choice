import { describe, it, expect } from "vitest";
import { buildSeatChatSystemPrompt } from "./seatChatPrompt";
import type { DelegationSeatVM, UserIssue } from "./delegationData";

/** A seat whose real name is buried in nested strings (vote narrative, donor
 *  source URL, candidate id) — the blind contract is that NONE of them reach
 *  the prompt. */
function seatFixture(): DelegationSeatVM {
  return {
    id: "house-TX-21",
    section: "Washington — Federal",
    level: "federal",
    office: "U.S. House",
    districtLabel: "TX-21",
    blindLabel: "Your House Member",
    partyName: "Republican",
    researched: false,
    nextElection: { label: "Primary · Mar 3, 2026", onBallot2026: true },
    attendance: { missedPct: 3.1, of: "1,204 votes", band: "good" },
    eligibility: {} as DelegationSeatVM["eligibility"],
    candidate: {
      id: "tx-doggett-lloyd",
      name: "Lloyd Doggett",
      incumbent: true,
      priorRole: "U.S. Representative since 1995",
      totalRaised: 1_500_000,
      fundingMix: {
        small: 40,
        large: 45,
        pac: 15,
        total: 1_500_000,
        cycle: "2026",
      },
      donorSource: {
        name: "FEC filings",
        url: "https://www.fec.gov/data/candidate/doggett-lloyd/",
      },
      donorCoalition: [{ label: "Health sector", amount: 200_000 }],
    },
    alignmentEntry: {
      candidateId: "tx-doggett-lloyd",
      scores: [
        {
          canonicalIssue: "healthcare",
          kept: 11,
          total: 18,
          contributingVotes: [
            {
              billTitle: "H.R.3 · Lower Drug Costs Now Act",
              voteCast: "with",
              date: "2025-12-10",
              narrative:
                "Doggett voted to expand Medicare drug-price negotiation.",
              source: { name: "GovTrack", url: "https://govtrack.us/x" },
            },
          ],
        },
      ],
    },
    challengers: [],
    canContext: {
      attribution: { label: "CAN2026", url: "https://can2026.org" },
      keyVotes: [{ billLabel: "H.R.99", voteCast: "yea" }],
    } as unknown as DelegationSeatVM["canContext"],
  } as DelegationSeatVM;
}

const ISSUES: UserIssue[] = [
  {
    canonicalIssue: "healthcare",
    interpretation: "Lower insulin & drug prices",
    stance: "favors lower drug prices",
    level: "federal",
  },
];

describe("buildSeatChatSystemPrompt — blind mode", () => {
  const prompt = buildSeatChatSystemPrompt({
    seat: seatFixture(),
    userIssues: ISSUES,
    stateCode: "TX",
    isRevealed: false,
  });

  it("never contains the member's name — not even in nested narratives or URLs", () => {
    expect(prompt).not.toContain("Doggett");
    expect(prompt).not.toContain("Lloyd");
  });

  it("identifies the member only by the seat's blind label", () => {
    expect(prompt).toContain("Your House Member");
    expect(prompt).toContain('refer to them only as "Your House Member"');
  });

  it("drops self-identifying fields (prior role, donor-source URL)", () => {
    expect(prompt).not.toContain("since 1995");
    expect(prompt).not.toContain("fec.gov");
  });

  it("keeps the grounding the card shows (alignment counts, funding mix)", () => {
    expect(prompt).toContain('"kept":11');
    expect(prompt).toContain('"small":40');
    expect(prompt).toContain("Lower Drug Costs Now Act");
  });

  it("never includes CAN2026 context (display-only, attributed surface)", () => {
    expect(prompt).not.toContain("can2026");
    expect(prompt).not.toContain("CAN2026");
    expect(prompt).not.toContain("H.R.99");
  });

  it("carries the voter's ranked priorities", () => {
    expect(prompt).toContain("1. Lower insulin & drug prices");
  });
});

describe("buildSeatChatSystemPrompt — revealed", () => {
  const prompt = buildSeatChatSystemPrompt({
    seat: seatFixture(),
    userIssues: ISSUES,
    stateCode: "TX",
    isRevealed: true,
  });

  it("uses the real name and keeps identifying context", () => {
    expect(prompt).toContain("Lloyd Doggett");
    expect(prompt).toContain("since 1995");
  });

  it("has no blind-mode clause", () => {
    expect(prompt).not.toContain("BLIND MODE");
  });

  it("still excludes CAN2026 context", () => {
    expect(prompt).not.toContain("H.R.99");
  });
});

describe("buildSeatChatSystemPrompt — research fallback", () => {
  it("grounds on web-research scores when there is no DB record, scrubbed when blind", () => {
    const seat = seatFixture();
    seat.alignmentEntry = null;
    const prompt = buildSeatChatSystemPrompt({
      seat,
      userIssues: ISSUES,
      stateCode: "TX",
      isRevealed: false,
      research: {
        status: "done",
        scores: [
          {
            canonicalIssue: "healthcare",
            summary: "Doggett has repeatedly backed drug-price negotiation.",
          },
        ],
      } as never,
    });
    expect(prompt).toContain("drug-price negotiation");
    expect(prompt).not.toContain("Doggett");
  });
});
