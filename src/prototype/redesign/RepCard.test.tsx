// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { I18nProvider } from "../VoterChoiceApp";
import { RepCard } from "./RepCard";
import type { DelegationSeatVM, UserIssue } from "./delegationData";

// RepCard's money-trail disclosure starts open on desktop widths — force
// that path so the money-gap scale is present without a click.
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
});

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
    nextElection: { label: "Nov 2026", onBallot2026: true },
    attendance: null,
    eligibility: null,
    candidate: {
      id: "federal-TEST1",
      name: "Theo Vance",
      incumbent: true,
      priorRole: "U.S. Representative since 2019",
      totalRaised: 4_200_000,
      fundingMix: undefined,
      donorSource: undefined,
      donorCoalition: null,
      peerComparison: peer,
    },
    alignmentEntry: {
      candidateId: "federal-TEST1",
      scores: [vote("healthcare_affordability", 3, 4)],
    },
    challengers: [],
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

function renderCard(
  seat: DelegationSeatVM,
  extra: Record<string, unknown> = {},
) {
  return render(
    <I18nProvider>
      <RepCard
        seat={seat}
        userIssues={userIssues}
        stateCode="TX"
        research={undefined}
        blindMode={false}
        isRevealed={false}
        onReveal={() => {}}
        onHide={() => {}}
        verdict={null}
        pickId={null}
        onVerdict={() => {}}
        onOpenDuel={() => {}}
        onShowBudgetOptions={() => {}}
        {...extra}
      />
    </I18nProvider>,
  );
}

describe("RepCard money-gap field wiring", () => {
  it("renders one field row per funded challenger, sorted highest-raised first, alongside the subject", () => {
    const seat = mkSeat({
      challengers: [
        // deliberately out of order — the component must sort
        {
          id: "c3",
          name: "Sam Whitfield",
          party: "Independent",
          totalReceipts: 95_000,
        },
        {
          id: "c1",
          name: "Elena Reyes",
          party: "Democrat",
          totalReceipts: 1_300_000,
        },
        {
          id: "c2",
          name: "Garrett Dunne",
          party: "Republican",
          totalReceipts: 410_000,
        },
      ],
    });
    const { container } = renderCard(seat);

    const rows = container.querySelectorAll(".mgap-row");
    // subject + 3 funded challengers
    expect(rows).toHaveLength(4);
    const names = Array.from(rows).map(
      (r) => r.querySelector(".mgap-nm")?.textContent,
    );
    expect(names[0]).toContain("Theo Vance");
    expect(names.slice(1)).toEqual([
      "Elena Reyes",
      "Garrett Dunne",
      "Sam Whitfield",
    ]);

    // tag copy matches the artboard's "Challenger · <party>" convention
    expect(screen.getByText(/Challenger · Democrat/)).toBeInTheDocument();
    expect(screen.getByText(/Challenger · Republican/)).toBeInTheDocument();
    expect(screen.getByText(/Challenger · Independent/)).toBeInTheDocument();
  });

  it("honest-data: omits a challenger with no filed total instead of fabricating a $0 row", () => {
    const seat = mkSeat({
      challengers: [
        {
          id: "c1",
          name: "Elena Reyes",
          party: "Democrat",
          totalReceipts: 1_300_000,
        },
        {
          id: "c4",
          name: "No Data Nick",
          party: "Republican",
          totalReceipts: null,
        },
      ],
    });
    const { container } = renderCard(seat);

    const rows = container.querySelectorAll(".mgap-row");
    expect(rows).toHaveLength(2); // subject + the one funded challenger
    expect(screen.queryByText("No Data Nick")).not.toBeInTheDocument();
  });

  it("no regression: renders only the subject row when no challenger has funding data", () => {
    const seat = mkSeat({
      challengers: [
        {
          id: "c4",
          name: "No Data Nick",
          party: "Republican",
          totalReceipts: null,
        },
      ],
    });
    const { container } = renderCard(seat);

    const rows = container.querySelectorAll(".mgap-row");
    expect(rows).toHaveLength(1);
    expect(rows[0].querySelector(".mgap-nm")?.textContent).toContain(
      "Theo Vance",
    );
  });

  it("blind mode: the subject uses the blind label but challenger names stay unblinded (they're different, public FEC filers)", () => {
    const seat = mkSeat({
      challengers: [
        {
          id: "c1",
          name: "Elena Reyes",
          party: "Democrat",
          totalReceipts: 1_300_000,
        },
      ],
    });
    renderCard(seat, { blindMode: true, isRevealed: false });

    expect(screen.getByText("Elena Reyes")).toBeInTheDocument();
    expect(screen.queryByText("Theo Vance")).not.toBeInTheDocument();
  });
});
