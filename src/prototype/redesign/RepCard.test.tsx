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

// [Δ Round-4] The incumbent's card is about the incumbent: MoneyGapScale here
// renders the subject-vs-median axis ONLY, never other FEC filers for the
// seat — that whole-field comparison moved to the head-to-head duel
// ("Everyone running for this seat"). These tests used to assert one field
// row per funded challenger on RepCard itself; they now assert the opposite
// (challengers present in seat data must NOT produce field rows here).
describe("RepCard money-gap scale — subject vs. median only", () => {
  it("renders only the subject row, even when the seat has funded challengers", () => {
    const seat = mkSeat({
      challengers: [
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
    expect(rows).toHaveLength(1);
    expect(rows[0].querySelector(".mgap-nm")?.textContent).toContain(
      "Theo Vance",
    );
    expect(screen.queryByText("Elena Reyes")).not.toBeInTheDocument();
    expect(screen.queryByText("Garrett Dunne")).not.toBeInTheDocument();
  });

  it("blind mode: the subject row uses the blind label", () => {
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
    const { container } = renderCard(seat, {
      blindMode: true,
      isRevealed: false,
    });

    const rows = container.querySelectorAll(".mgap-row");
    expect(rows).toHaveLength(1);
    expect(screen.queryByText("Theo Vance")).not.toBeInTheDocument();
    expect(container.querySelector(".mgap-nm")?.textContent).not.toContain(
      "Theo Vance",
    );
  });
});

describe("RepCard evidence hierarchy (Round-4)", () => {
  it("shows the compact legend under the collapsed money glance", () => {
    const seat = mkSeat({
      candidate: {
        id: "federal-TEST1",
        name: "Theo Vance",
        incumbent: true,
        priorRole: "U.S. Representative since 2019",
        totalRaised: 4_200_000,
        fundingMix: { small: 15, large: 39, pac: 46 },
        donorSource: undefined,
        donorCoalition: null,
        peerComparison: peer,
      },
    });
    const { container } = renderCard(seat);

    const legend = container.querySelector(".rc-money-legend");
    expect(legend).not.toBeNull();
    expect(legend?.textContent).toContain("15%");
    expect(legend?.textContent).toContain("39%");
    expect(legend?.textContent).toContain("46%");
  });

  it("moves 'see all votes' inside the align-band and drops the detached card-evidence row", () => {
    const seat = mkSeat({
      alignmentEntry: {
        candidateId: "federal-TEST1",
        scores: [
          {
            ...vote("healthcare_affordability", 3, 4),
            contributingVotes: [{}, {}, {}],
          },
        ],
      },
    });
    const { container } = renderCard(seat);

    // The CTA lives inside .cv2-issues (the align-band), not a separate
    // .card-evidence row — that class no longer renders anywhere.
    expect(container.querySelector(".card-evidence")).toBeNull();
    const cta = screen.getByTestId("see-full-record");
    expect(container.querySelector(".cv2-issues")?.contains(cta)).toBe(true);
    expect(cta.closest(".cv2-see-all")).not.toBeNull();
  });

  it("the whole money glance is a clickable disclosure trigger with the FUNDERS & INFLUENCE affordance", () => {
    const seat = mkSeat();
    const { container } = renderCard(seat);

    const glance = container.querySelector("button.rc-money-glance");
    expect(glance).not.toBeNull();
    expect(glance).toHaveAttribute("aria-expanded");
    expect(container.querySelector(".rc-money-disclose")).not.toBeNull();
  });

  it("median chip reads worded context, not a bare multiple", () => {
    const seat = mkSeat();
    const { container } = renderCard(seat);

    const chip = container.querySelector(".rc-money-median .median-chip");
    expect(chip?.textContent).toContain("≈3×");
    expect(chip?.textContent).toContain("the typical U.S. House campaign");
  });

  it("verdict buttons are unaffected by the evidence-hierarchy changes", () => {
    renderCard(mkSeat());

    expect(screen.getByText(/Worth keeping/)).toBeInTheDocument();
    expect(screen.getByText("Time to replace")).toBeInTheDocument();
  });
});

describe("RepCard not-up-for-2026 seats: reviewable, never decidable", () => {
  it("renders no verdict buttons and shows the info band instead", () => {
    const seat = mkSeat({
      nextElection: { label: "next up 2030", onBallot2026: false },
    });
    const { container } = renderCard(seat);

    expect(
      screen.queryByRole("button", { name: /Worth keeping/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Time to replace/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("open-duel")).not.toBeInTheDocument();

    // "Not up for election in 2026" also appears in the seat-strip badge —
    // scope to the info band itself so this stays a real regression check.
    expect(container.querySelector(".cv2-notup-eyebrow")).toHaveTextContent(
      "Not up for election in 2026",
    );
    expect(
      screen.getByText(/You can still review their record — next up 2030\./),
    ).toBeInTheDocument();
  });

  it("still renders a decidable seat's verdict buttons unchanged (no regression)", () => {
    const seat = mkSeat({
      nextElection: { label: "Nov 2026", onBallot2026: true },
    });
    renderCard(seat);

    expect(
      screen.getByRole("button", { name: /Worth keeping/ }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("open-duel")).toBeInTheDocument();
  });
});
