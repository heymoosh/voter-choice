// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { I18nProvider } from "../VoterChoiceApp";
import { FundingSources, hasScoredVoteLinkage } from "./FundingSources";
import type { VoteLinkageEntry } from "./delegationData";

function withI18n(node: React.ReactElement) {
  return <I18nProvider>{node}</I18nProvider>;
}

const fundingMix = { small: 20, large: 20, pac: 60, cycle: "2025–26" };
const donorCoalition = [
  {
    label: "PhRMA & hospital PACs",
    amount: 600_000,
    percent: 60,
    isIssuePAC: true,
    alignsWith: "healthcare_costs",
    issuePacStance: "opposed",
    advocates: "Lobbies to block drug-price caps.",
  },
];
const userIssues = [
  {
    canonicalIssue: "healthcare_costs",
    interpretation: "drug prices",
    stance: "in favor of caps",
    rank: 1,
  },
];

describe("FundingSources — src-votes linkage", () => {
  it("renders the scored row with dot strip and .hi at k/n >= 2/3", () => {
    const voteLinkage = new Map<string, VoteLinkageEntry>([
      [
        "PhRMA & hospital PACs",
        {
          kind: "scored",
          k: 9,
          n: 11,
          dots: ["w", "w", "a", "w", "w", "w", "w", "a", "w", "w", "w"],
        },
      ],
    ]);
    render(
      withI18n(
        <FundingSources
          donorCoalition={donorCoalition}
          totalRaised={1_000_000}
          fundingMix={fundingMix}
          userIssues={userIssues}
          voteLinkage={voteLinkage}
        />,
      ),
    );
    const pct = screen.getByText("Voted their way 9 of 11");
    expect(pct).toHaveClass("mvr-pct", "hi");
    const { container } = render(
      withI18n(
        <FundingSources
          donorCoalition={donorCoalition}
          totalRaised={1_000_000}
          fundingMix={fundingMix}
          userIssues={userIssues}
          voteLinkage={voteLinkage}
        />,
      ),
    );
    expect(container.querySelectorAll(".mvr-dots i").length).toBe(11);
    expect(container.querySelectorAll(".mvr-dots i.w").length).toBe(9);
    expect(container.querySelectorAll(".mvr-dots i.a").length).toBe(2);
    expect(hasScoredVoteLinkage(voteLinkage)).toBe(true);
  });

  it("does not apply .hi below the 2/3 threshold", () => {
    const voteLinkage = new Map<string, VoteLinkageEntry>([
      [
        "PhRMA & hospital PACs",
        {
          kind: "scored",
          k: 2,
          n: 7,
          dots: ["w", "a", "a", "w", "a", "a", "a"],
        },
      ],
    ]);
    render(
      withI18n(
        <FundingSources
          donorCoalition={donorCoalition}
          totalRaised={1_000_000}
          fundingMix={fundingMix}
          userIssues={userIssues}
          voteLinkage={voteLinkage}
        />,
      ),
    );
    const pct = screen.getByText("Voted their way 2 of 7");
    expect(pct).toHaveClass("mvr-pct");
    expect(pct).not.toHaveClass("hi");
  });

  it("renders the individuals sentence for small/large rows", () => {
    const voteLinkage = new Map<string, VoteLinkageEntry>([
      ["small", { kind: "small" }],
      ["large", { kind: "large" }],
    ]);
    render(
      withI18n(
        <FundingSources
          donorCoalition={[]}
          totalRaised={1_000_000}
          fundingMix={fundingMix}
          userIssues={userIssues}
          voteLinkage={voteLinkage}
        />,
      ),
    );
    expect(
      screen.getAllByText(
        "Nothing to check — individuals don't file lobbying agendas",
      ).length,
    ).toBe(2);
  });

  it("renders the untraced sentence for unscored/industry rows", () => {
    const untracedCoalition = [
      {
        label: "Smaller PACs",
        amount: 100_000,
        percent: 10,
        isIssuePAC: true,
        issuePacStance: "mixed",
      },
      {
        label: "Finance sector",
        amount: 50_000,
        percent: 5,
        isIssuePAC: false,
      },
    ];
    const voteLinkage = new Map<string, VoteLinkageEntry>([
      ["Smaller PACs", { kind: "unscored" }],
      ["Finance sector", { kind: "industry" }],
    ]);
    render(
      withI18n(
        <FundingSources
          donorCoalition={untracedCoalition}
          totalRaised={1_000_000}
          fundingMix={fundingMix}
          userIssues={userIssues}
          voteLinkage={voteLinkage}
        />,
      ),
    );
    expect(screen.getAllByText("Can't check — agenda untraced").length).toBe(2);
  });

  it("swaps in the no-roll-call sentence when noRollCallRecord is set", () => {
    const voteLinkage = new Map<string, VoteLinkageEntry>([
      ["PhRMA & hospital PACs", { kind: "unscored" }],
    ]);
    render(
      withI18n(
        <FundingSources
          donorCoalition={donorCoalition}
          totalRaised={1_000_000}
          fundingMix={fundingMix}
          userIssues={userIssues}
          voteLinkage={voteLinkage}
          noRollCallRecord
        />,
      ),
    );
    expect(
      screen.getByText(
        "No roll-calls exist to check this money against — the influence read starts with their first vote.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Can't check — agenda untraced")).toBeNull();
  });

  it("renders no src-votes sub-blocks at all when voteLinkage is absent", () => {
    const { container } = render(
      withI18n(
        <FundingSources
          donorCoalition={donorCoalition}
          totalRaised={1_000_000}
          fundingMix={fundingMix}
          userIssues={userIssues}
        />,
      ),
    );
    expect(container.querySelector(".src-votes")).toBeNull();
    expect(hasScoredVoteLinkage(undefined)).toBe(false);
    expect(hasScoredVoteLinkage(null)).toBe(false);
  });

  it("a row absent from the map (e.g. a remainder row) gets no sub-block of its own", () => {
    // pac total (60%) implies $600k, but only $100k is named — the
    // "pac-untraced" remainder row renders, and it's never a key in
    // voteLinkage (delegationData.ts's own contract).
    const partialCoalition = [
      {
        label: "Named PAC",
        amount: 100_000,
        percent: 10,
        isIssuePAC: true,
        issuePacStance: "opposed",
        alignsWith: "healthcare_costs",
      },
    ];
    const voteLinkage = new Map<string, VoteLinkageEntry>([
      ["Named PAC", { kind: "scored", k: 1, n: 1, dots: ["w"] }],
    ]);
    const { container } = render(
      withI18n(
        <FundingSources
          donorCoalition={partialCoalition}
          totalRaised={1_000_000}
          fundingMix={fundingMix}
          userIssues={userIssues}
          voteLinkage={voteLinkage}
        />,
      ),
    );
    // one sub-block for "Named PAC" (scored) — none for the untraced-PAC row
    expect(container.querySelectorAll(".src-votes").length).toBe(1);
    expect(screen.getByText("Voted their way 1 of 1")).toBeInTheDocument();
  });

  it("never fabricates a $0 for challenger-shaped props (totalReceipts only, no mix/coalition)", () => {
    const { container } = render(
      withI18n(
        <FundingSources
          donorCoalition={null}
          totalRaised={95_000}
          fundingMix={null}
          userIssues={userIssues}
        />,
      ),
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText("$0")).toBeNull();
  });
});
