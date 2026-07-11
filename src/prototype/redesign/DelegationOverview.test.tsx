// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import React from "react";
import { I18nProvider } from "../VoterChoiceApp";
import { DelegationOverview } from "./DelegationOverview";
import type { DelegationSeatVM, UserIssue } from "./delegationData";

const vote = (canonicalIssue: string, kept: number, total: number) => ({
  canonicalIssue,
  issueLabel: canonicalIssue,
  resolvedStance: "in_favor",
  sourceType: "voting_record",
  kept,
  total,
});

function mkSeat(overrides: Partial<DelegationSeatVM> = {}): DelegationSeatVM {
  return {
    id: "house-TX-37",
    section: "Washington — Federal",
    level: "federal",
    office: "U.S. House",
    districtLabel: "TX-37",
    blindLabel: "Your U.S. Representative",
    partyName: "Democrat",
    researched: false,
    nextElection: { label: "Nov 2026", onBallot2026: true },
    attendance: null,
    eligibility: {} as never,
    candidate: {
      id: "federal-TEST1",
      name: "Alex Rivera",
      incumbent: true,
      priorRole: "U.S. Representative since 2019",
      totalRaised: 5_000_000,
      fundingMix: { small: 40, large: 0, pac: 60, total: 5_000_000, cycle: "2026" },
      donorSource: undefined,
      donorCoalition: null,
      peerComparison: null,
    },
    alignmentEntry: {
      candidateId: "federal-TEST1",
      scores: [vote("healthcare_affordability", 3, 4)],
    },
    challengers: [],
    canContext: null,
    ...overrides,
  } as DelegationSeatVM;
}

const userIssues: UserIssue[] = [
  { canonicalIssue: "healthcare_affordability", interpretation: "Lower drug prices", level: "federal" },
];

// t() only resolves real copy under an I18nProvider (its default context
// value is the identity function, i.e. the raw "delegationOverview.x" key)
// — wrap every render so assertions check the actual user-facing strings,
// same pattern as src/prototype/i18nInterpolationEscaping.test.tsx.
function renderOverview(props: Parameters<typeof DelegationOverview>[0]) {
  return render(
    <I18nProvider>
      <DelegationOverview {...props} />
    </I18nProvider>,
  );
}

describe("DelegationOverview", () => {
  it("renders one seat-card per seat that's up in 2026, and excludes the rest", () => {
    const seats = [
      mkSeat({ id: "house-TX-37" }),
      mkSeat({
        id: "senate-TX-b",
        office: "U.S. Senate",
        districtLabel: "Texas (statewide)",
        blindLabel: "Your Junior U.S. Senator",
        nextElection: { label: "Nov 2028", onBallot2026: false },
      }),
    ];
    renderOverview({ seats, verdicts: {}, userIssues, onOpen: () => {} });
    const cards = screen.getAllByTestId("seat-card");
    expect(cards).toHaveLength(1);
    expect(within(cards[0]).getByText("U.S. House · TX-37")).toBeInTheDocument();
    // excluded seat shows as a row, not a card
    expect(screen.getByText(/Your Junior U.S. Senator/)).toBeInTheDocument();
  });

  it("shows the seat's alignment % using the same formula as the deep view", () => {
    const seats = [mkSeat()];
    renderOverview({ seats, verdicts: {}, userIssues, onOpen: () => {} });
    // 3/4 -> 75%
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("shows an honest dash, not a fabricated 0%, when a seat has no scoreable record", () => {
    const seats = [mkSeat({ alignmentEntry: { candidateId: "federal-TEST1", scores: [] } })];
    renderOverview({ seats, verdicts: {}, userIssues, onOpen: () => {} });
    // both the big align % and the issue row's fraction fall back to the
    // same honest dash — assert on the specific % slot, not just "some '—'
    // exists somewhere", so this stays a real regression check.
    expect(
      screen.getByTestId("seat-card").querySelector(".cd-pct"),
    ).toHaveTextContent("—");
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });

  it("clicking a card calls onOpen with that seat's id", async () => {
    const onOpen = vi.fn();
    const seats = [mkSeat({ id: "house-TX-37" })];
    renderOverview({ seats, verdicts: {}, userIssues, onOpen });
    await userEvent.click(screen.getByTestId("seat-card"));
    expect(onOpen).toHaveBeenCalledWith("house-TX-37");
  });

  it("reflects a recorded verdict as a status pill on the card", () => {
    const seats = [mkSeat({ id: "house-TX-37" })];
    renderOverview({
      seats,
      verdicts: { "house-TX-37": "keep" },
      userIssues,
      onOpen: () => {},
    });
    expect(screen.getByTestId("seat-card").className).toContain("is-pick");
  });

  it("gates the print CTA on every up-2026 seat being decided", () => {
    const seats = [mkSeat({ id: "a" }), mkSeat({ id: "b" })];
    const { rerender } = render(
      <I18nProvider>
        <DelegationOverview
          seats={seats}
          verdicts={{ a: "keep" }}
          userIssues={userIssues}
          onOpen={() => {}}
        />
      </I18nProvider>,
    );
    // exact match on the print CTA's full "not ready" copy (canvas's "Decide
    // N seats to print", N = the real up-2026 seat count) — a loose /decide/i
    // regex also matches SeatCard's "Not yet decided" status pill (itself
    // rendered with role="button" for click-through), which isn't the
    // control under test here.
    expect(
      screen.getByRole("button", { name: "Decide 2 seats to print" }),
    ).toBeDisabled();
    rerender(
      <I18nProvider>
        <DelegationOverview
          seats={seats}
          verdicts={{ a: "keep", b: "replace" }}
          userIssues={userIssues}
          onOpen={() => {}}
        />
      </I18nProvider>,
    );
    expect(screen.getByRole("button", { name: /print/i })).toBeEnabled();
  });
});
