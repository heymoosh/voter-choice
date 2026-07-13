// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { I18nProvider } from "../VoterChoiceApp";
import { HeadToHead } from "./HeadToHead";
import type { DelegationSeatVM, UserIssue } from "./delegationData";

// Round-4 lane F — seat clarity, pinned incumbent, full funding comparison.
// Mirrors RepCard.test.tsx's fixture conventions (mkSeat/vote/peer/userIssues).

const vote = (canonicalIssue: string, kept: number, total: number) => ({
  canonicalIssue,
  issueLabel: canonicalIssue,
  resolvedStance: "in_favor",
  sourceType: "voting_record",
  kept,
  total,
});

const peer = {
  baseline: "chamber-median" as const,
  office: "U.S. House",
  medianRaised: 1_400_000,
  multiple: 3.0,
  cycle: "2025–26",
  source: "FEC filings",
};

const verifiedRosterProvenance = {
  sourceKind: "official_sample_ballot" as const,
  election: "2026 general",
  retrievedAt: "2026-07-13T12:00:00.000Z",
  sourceLinks: [
    { label: "County sample ballot", url: "https://elections.example/ballot" },
  ],
  confidence: "verified_current_ballot" as const,
  ballotStatus: "verified_current_ballot" as const,
  selectableAsReplacement: true,
};

const fecFinanceOnlyProvenance = {
  sourceKind: "fec_campaign_finance" as const,
  election: "2026 federal cycle",
  retrievedAt: "2026-07-13T12:00:00.000Z",
  sourceLinks: [{ label: "FEC", url: "https://www.fec.gov/" }],
  confidence: "finance_only" as const,
  ballotStatus: "finance_record_only" as const,
  selectableAsReplacement: false,
};

function mkSeat(overrides: Partial<DelegationSeatVM> = {}): DelegationSeatVM {
  return {
    id: "house-TX-21",
    section: "Washington — Federal",
    level: "federal",
    office: "U.S. House",
    districtLabel: "TX-21",
    blindLabel: "Your U.S. Representative",
    partyName: "Republican",
    researched: false,
    nextElection: { label: "General · Nov 3, 2026", onBallot2026: true },
    attendance: null,
    eligibility: null,
    candidate: {
      id: "federal-TEST1",
      name: "Theo Vance",
      incumbent: true,
      priorRole: "U.S. Representative since 2019",
      totalRaised: 4_200_000,
      fundingMix: {
        small: 15,
        large: 39,
        pac: 46,
        total: 4_200_000,
        cycle: "2025–26",
      },
      donorSource: { name: "FEC filings", url: "https://www.fec.gov/" },
      donorCoalition: [
        { label: "Finance", percent: 20, amount: 840_000, isIssuePAC: false },
        {
          label: "Real estate",
          percent: 12,
          amount: 500_000,
          isIssuePAC: false,
        },
      ],
      peerComparison: peer,
    },
    alignmentEntry: {
      candidateId: "federal-TEST1",
      scores: [vote("healthcare_affordability", 3, 4)],
    },
    challengers: [
      {
        id: "c1",
        name: "Elena Reyes",
        party: "Democrat",
        totalReceipts: 1_340_000,
        rosterProvenance: verifiedRosterProvenance,
      },
      {
        id: "c3",
        name: "No Data Nick",
        party: "Republican",
        totalReceipts: null,
        rosterProvenance: verifiedRosterProvenance,
      },
    ],
    canContext: null,
    ...overrides,
  } as unknown as DelegationSeatVM;
}

const userIssues: UserIssue[] = [
  {
    canonicalIssue: "healthcare_affordability",
    interpretation: "Lower drug prices",
    level: "federal",
  },
];

function renderDuel(
  seat: DelegationSeatVM,
  extra: Record<string, unknown> = {},
) {
  return render(
    <I18nProvider>
      <HeadToHead
        seat={seat}
        userIssues={userIssues}
        stateCode="TX"
        verdict={null}
        pickId={null}
        onKeep={() => {}}
        onReplace={() => {}}
        onClose={() => {}}
        onShowBudgetOptions={() => {}}
        {...extra}
      />
    </I18nProvider>,
  );
}

describe("HeadToHead — seat clarity", () => {
  it("states the office, district, and next election under the title", () => {
    renderDuel(mkSeat());
    expect(
      screen.getByText("U.S. House · TX-21 — one seat, General · Nov 3, 2026"),
    ).toBeInTheDocument();
  });

  it("falls back honestly (no fabricated date) when the seat has no resolved election", () => {
    renderDuel(mkSeat({ nextElection: null }));
    expect(
      screen.getByText("U.S. House · TX-21 — one seat"),
    ).toBeInTheDocument();
  });
});

describe("HeadToHead — pinned incumbent chip", () => {
  it("renders a pinned, non-dismissable incumbent chip in the lineup with name + score", () => {
    const { container } = renderDuel(mkSeat());
    const chip = container.querySelector(".cmp-chip-pinned");
    expect(chip).not.toBeNull();
    expect(chip).toHaveTextContent("Theo Vance");
    expect(chip).toHaveTextContent("75%"); // 3/4 roll-call
    // it's a static chip, not a selectable tab
    expect(chip?.tagName).not.toBe("BUTTON");
  });

  it("keeps the challenger chips selectable alongside the pinned chip", () => {
    const { container } = renderDuel(mkSeat());
    expect(
      container.querySelector(".cmp-lineup .cmp-chip-pinned"),
    ).not.toBeNull();
    expect(container.querySelectorAll(".cmp-switch button").length).toBe(2);
  });
});

describe("HeadToHead — funding comparison section", () => {
  it("renders incumbent mix bars, PAC%, and top industries alongside the challenger's dollar total", () => {
    const { container } = renderDuel(mkSeat());
    const money = container.querySelector(".cmp-money");
    expect(money).not.toBeNull();
    expect(
      money?.querySelector(".cmp-money-col.inc .cmp-money-bars"),
    ).not.toBeNull();
    expect(money).toHaveTextContent("46% PAC");
    expect(money).toHaveTextContent("Finance, Real estate");
    expect(money).toHaveTextContent("$4.2M");
    // challenger side: dollar figure only — never a fabricated mix bar
    expect(
      money?.querySelector(".cmp-money-col.ch .cmp-money-bars"),
    ).toBeNull();
    expect(money).toHaveTextContent("$1.3M");
    expect(money).toHaveTextContent("FEC filing");
  });

  it("HONEST STATE: a challenger with no funds reported shows the honest fallback, not a fabricated $0", () => {
    const seat = mkSeat({
      challengers: [
        {
          id: "c9",
          name: "No Funds Filer",
          party: "Independent",
          totalReceipts: null,
          rosterProvenance: verifiedRosterProvenance,
        },
      ],
    });
    const { container } = renderDuel(seat);
    const chCol = container.querySelector(".cmp-money-col.ch");
    expect(chCol).toHaveTextContent("No funds reported");
  });
});

describe("HeadToHead — roster provenance containment", () => {
  it("labels selectable candidates as verified ballot-roster rows, not FEC filers", () => {
    const { container } = renderDuel(mkSeat());
    const challengerRole = container.querySelector(".cmp-col.ch .cmp-crole");
    const money = container.querySelector(".cmp-money-col.ch");

    expect(challengerRole).toHaveTextContent(
      "Democrat · verified current ballot roster",
    );
    expect(challengerRole).not.toHaveTextContent("2026 FEC filer");
    expect(money).toHaveTextContent("Campaign-finance evidence: FEC filing");
  });

  it("does not render FEC finance-only rows as selectable replacement tabs", () => {
    const seat = mkSeat({
      challengers: [
        {
          id: "fec-only",
          name: "Finance Filer",
          party: "Democrat",
          totalReceipts: 1_000_000,
          rosterProvenance: fecFinanceOnlyProvenance,
        },
      ],
    });

    const { container } = renderDuel(seat);
    expect(container.querySelectorAll(".cmp-switch button")).toHaveLength(0);
    expect(screen.queryByText("Finance Filer")).not.toBeInTheDocument();
    expect(screen.getByText(/No verified replacement roster yet/)).toBeInTheDocument();
  });
});

describe("HeadToHead — whole-field money scale", () => {
  it('renders "Everyone running for this seat" with the subject + every funded filer, honest-omitting unfunded ones', () => {
    const { container } = renderDuel(mkSeat());
    const field = container.querySelector(".cmp-field");
    expect(field).not.toBeNull();
    expect(field).toHaveTextContent("Everyone running for this seat");
    const rows = field?.querySelectorAll(".mgap-row") ?? [];
    // subject (Theo Vance) + the one funded challenger (Elena Reyes) —
    // "No Data Nick" (totalReceipts: null) is honestly omitted.
    expect(rows.length).toBe(2);
    expect(screen.queryByText("No Data Nick")).not.toBeInTheDocument();
  });

  it("HONEST STATE: renders no field scale at all when there is no peer baseline", () => {
    const seat = mkSeat({
      candidate: {
        id: "federal-TEST1",
        name: "Theo Vance",
        incumbent: true,
        priorRole: "U.S. Representative since 2019",
        totalRaised: 4_200_000,
        fundingMix: undefined,
        donorSource: undefined,
        donorCoalition: null,
        peerComparison: null,
      },
    } as Partial<DelegationSeatVM>);
    const { container } = renderDuel(seat);
    expect(container.querySelector(".cmp-field")).toBeNull();
  });
});
