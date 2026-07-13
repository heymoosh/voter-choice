// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { I18nProvider } from "../VoterChoiceApp";
import { ScorecardPrintView } from "./ScorecardPrintView";

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
    nextElection: { label: "Nov 2026", onBallot2026: true },
    candidate: { id: "incumbent", name: "Theo Vance" },
    alignmentEntry: { scores: [{ kept: 1, total: 4 }] },
    challengers: [
      {
        id: "successor",
        name: "Successor Candidate",
        party: "Democrat",
        totalReceipts: 50000,
        rosterProvenance,
      },
    ],
  };
}

function renderPrint(rosterProvenance: unknown) {
  return render(
    <I18nProvider>
      <ScorecardPrintView
        address="Austin, TX"
        seats={[seatWithChallenger(rosterProvenance)]}
        issues={[
          {
            canonicalIssue: "healthcare_affordability",
            interpretation: "Lower drug prices",
            level: "federal",
          },
        ]}
        verdicts={{ "house-TX-21": "replace" }}
        picks={{ "house-TX-21": "successor" }}
        stateData={{
          elections: [{ date: "2026-11-03", type: "general" }],
          earlyVoting: { available: false },
          votingRules: { idRequired: false },
        }}
        pollingInfo={null}
        districtsLine="U.S. House TX-21"
        onBack={() => {}}
      />
    </I18nProvider>,
  );
}

describe("ScorecardPrintView stale successor picks", () => {
  it("does not print a successor name for a stale FEC-only pick", () => {
    const { container } = renderPrint(fecFinanceOnlyProvenance);

    expect(container.querySelector(".pick-successor")).toBeNull();
  });

  it("prints the successor name for a verified current-ballot pick", () => {
    const { container } = renderPrint(verifiedRosterProvenance);

    expect(container.querySelector(".pick-successor")).toHaveTextContent(
      "Successor Candidate",
    );
  });
});
