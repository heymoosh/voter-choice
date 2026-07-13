// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { I18nProvider } from "../VoterChoiceApp";
import { DelegationWorkspace } from "./DelegationWorkspace";

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

const fecFinanceOnlyProvenance = {
  sourceKind: "fec_campaign_finance" as const,
  election: "2026 federal cycle",
  retrievedAt: "2026-07-13T12:00:00.000Z",
  sourceLinks: [{ label: "FEC", url: "https://www.fec.gov/" }],
  confidence: "finance_only" as const,
  ballotStatus: "finance_record_only" as const,
  selectableAsReplacement: false,
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

function seatWithChallenger(rosterProvenance: unknown) {
  return {
    id: "house-TX-21",
    section: "Washington — Federal",
    level: "federal",
    office: "U.S. House",
    districtLabel: "TX-21",
    blindLabel: "Your U.S. Representative",
    researched: false,
    nextElection: { label: "Nov 2026", onBallot2026: true },
    candidate: {
      id: "incumbent",
      name: "Theo Vance",
      incumbent: true,
      priorRole: "U.S. Representative since 2019",
      totalRaised: 1000000,
    },
    alignmentEntry: {
      candidateId: "incumbent",
      scores: [{ canonicalIssue: "healthcare_affordability", kept: 1, total: 4 }],
    },
    challengers: [
      {
        id: "successor",
        name: "Successor Candidate",
        party: "Democrat",
        totalReceipts: 50000,
        rosterProvenance,
      },
    ],
    canContext: null,
  };
}

function renderWorkspace(rosterProvenance: unknown) {
  return render(
    <I18nProvider>
      <DelegationWorkspace
        address="Austin, TX"
        seats={[seatWithChallenger(rosterProvenance)]}
        userIssues={[
          {
            canonicalIssue: "healthcare_affordability",
            interpretation: "Lower drug prices",
            level: "federal",
            stance: "in_favor",
          },
        ]}
        pollingInfo={null}
        stateData={{ stateCode: "TX" }}
        deadlineRows={[]}
        researchFor={() => undefined}
        polisPreview={null}
        blindMode={false}
        verdicts={{ "house-TX-21": "replace" }}
        picks={{ "house-TX-21": "successor" }}
        activeSeatId="house-TX-21"
        revealed={new Set()}
        onReveal={() => {}}
        onHide={() => {}}
        onVerdict={() => {}}
        onOpenDuel={() => {}}
        onSelectSeat={() => {}}
        onPrint={() => {}}
        onContinueElsewhere={() => {}}
        onSeeStanding={() => {}}
        chatMessages={{}}
        chatTimeouts={{}}
        budgetTier={null}
        onRetryChat={() => {}}
        onShowBudgetOptions={() => {}}
        onEditIssues={() => {}}
        issueDeltas={null}
        onRevisitSeat={() => {}}
        onDismissDeltas={() => {}}
        overviewOpen={false}
        onOpenSeat={() => {}}
        onBackToOverview={() => {}}
      />
    </I18nProvider>,
  );
}

describe("DelegationWorkspace stale successor picks", () => {
  it("does not show a successor in the scorecard pane for a stale FEC-only pick", () => {
    const { container } = renderWorkspace(fecFinanceOnlyProvenance);

    expect(container.querySelector(".ws-ballot .pick-successor")).toBeNull();
  });

  it("shows a successor in the scorecard pane for a verified current-ballot pick", () => {
    const { container } = renderWorkspace(verifiedRosterProvenance);

    expect(
      container.querySelector(".ws-ballot .pick-successor"),
    ).toHaveTextContent("Successor Candidate");
  });
});
