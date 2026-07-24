// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { I18nProvider } from "../VoterChoiceApp";
import { ChallengersStrip, RepCard } from "./RepCard";
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

function renderStrip(seat: DelegationSeatVM) {
  return render(
    <I18nProvider>
      <ChallengersStrip
        seat={seat}
        userIssues={userIssues}
        stateCode="TX"
        onShowBudgetOptions={() => {}}
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
    // The scale (.mgap) now lives inside the money expander (work order
    // Frames 2+3 §2: collapsed by default, Frame 3 is this same state
    // opened) — open it before looking for the subject row.
    fireEvent.click(screen.getByTestId("money-expander-toggle"));

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
    fireEvent.click(screen.getByTestId("money-expander-toggle"));

    const rows = container.querySelectorAll(".mgap-row");
    expect(rows).toHaveLength(1);
    expect(screen.queryByText("Theo Vance")).not.toBeInTheDocument();
    expect(container.querySelector(".mgap-nm")?.textContent).not.toContain(
      "Theo Vance",
    );
  });
});

describe("RepCard evidence hierarchy (Round-4)", () => {
  it("shows the funding-mix percentages exactly once, in the money section's mix bar", () => {
    const seat = mkSeat({
      candidate: {
        id: "federal-TEST1",
        name: "Theo Vance",
        incumbent: true,
        priorRole: "U.S. Representative since 2019",
        totalRaised: 4_200_000,
        fundingMix: { small: 15, large: 39, pac: 46 },
        donorSource: undefined,
        donorCoalition: [
          { label: "Health sector", amount: 800_000, isIssuePAC: false },
        ],
        peerComparison: peer,
      },
    });
    const { container } = renderCard(seat);

    const legends = container.querySelectorAll(".mix .cv2-money-legend");
    expect(legends).toHaveLength(1);
    expect(legends[0].textContent).toContain("15%");
    expect(legends[0].textContent).toContain("39%");
    expect(legends[0].textContent).toContain("46%");
  });

  it("moves 'see all votes' inside the align-band and drops the detached card-evidence row", () => {
    const seat = mkSeat({
      alignmentEntry: {
        candidateId: "federal-TEST1",
        scores: [
          {
            ...vote("healthcare_affordability", 3, 4),
            // Issue #1 opens by default now (work order Frames 2+3 §1), so
            // AlignmentDrilldown renders immediately — each vote needs the
            // minimal shape ContributingVoteCard reads (voteCast + source).
            contributingVotes: [
              { voteCast: "with", source: { name: "GovTrack" } },
              { voteCast: "with", source: { name: "GovTrack" } },
              { voteCast: "against", source: { name: "GovTrack" } },
            ],
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

  it("the money section is always open — no collapse toggle, hero leads with the total", () => {
    const seat = mkSeat();
    const { container } = renderCard(seat);

    expect(container.querySelector("button.rc-money-glance")).toBeNull();
    expect(container.querySelector(".cv2-disclose.rc-money-glance")).toBeNull();
    const hero = container.querySelector(".step-money .mny-hero");
    expect(hero).not.toBeNull();
    expect(hero?.textContent).toContain("$4.2M");
  });

  it("the money hero reads a worded multiple, not a bare number", () => {
    const seat = mkSeat();
    const { container } = renderCard(seat);

    const vs = container.querySelector(".step-money .mny-vs");
    expect(vs).not.toBeNull();
    expect(vs?.textContent).toContain("3×");
    expect(vs?.textContent).toContain("a typical U.S. House campaign raises");
  });

  it("verdict buttons are unaffected by the evidence-hierarchy changes", () => {
    renderCard(mkSeat());

    expect(screen.getByText(/Worth keeping/)).toBeInTheDocument();
    expect(screen.getByText("Time to replace")).toBeInTheDocument();
  });
});

// The .iss-verdict chip (RepCard §1) is wired through delegationData.ts's
// shared deriveIssueMoneyVerdict helper — same money×vote join the overview
// card's cd-influence reads — rather than a duplicated inline derivation.
describe("RepCard per-issue money verdict chip (deriveIssueMoneyVerdict wiring)", () => {
  it("renders the v-with chip (reviewed whiteboard copy) when the vote went with the user and the issue-PAC's stance aligns", () => {
    const seat = mkSeat({
      candidate: {
        id: "federal-TEST1",
        name: "Theo Vance",
        incumbent: true,
        priorRole: "U.S. Representative since 2019",
        totalRaised: 4_200_000,
        fundingMix: { small: 15, large: 39, pac: 46 },
        donorSource: undefined,
        donorCoalition: [
          {
            label: "Better Care PAC",
            amount: 250_000,
            isIssuePAC: true,
            alignsWith: "healthcare_affordability",
            issuePacStance: "in_favor",
          },
        ],
        peerComparison: peer,
      },
    });
    const { container } = renderCard(seat);
    const chip = container.querySelector(".iss-verdict");
    expect(chip).toHaveClass("v-with");
    expect(chip).toHaveTextContent("Votes & money align");
  });

  it("renders the v-mixed chip when the vote went with the user but the issue-PAC's stance conflicts", () => {
    const seat = mkSeat({
      candidate: {
        id: "federal-TEST1",
        name: "Theo Vance",
        incumbent: true,
        priorRole: "U.S. Representative since 2019",
        totalRaised: 4_200_000,
        fundingMix: { small: 15, large: 39, pac: 46 },
        donorSource: undefined,
        donorCoalition: [
          {
            label: "Big Pharma PAC",
            amount: 250_000,
            isIssuePAC: true,
            alignsWith: "healthcare_affordability",
            issuePacStance: "opposed",
          },
        ],
        peerComparison: peer,
      },
    });
    const { container } = renderCard(seat);
    const chip = container.querySelector(".iss-verdict");
    expect(chip).toHaveClass("v-mixed");
    expect(chip).toHaveTextContent("Votes yes, money says no");
  });

  it("renders no chip when there's no matching issue-PAC with a fixed stance", () => {
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
        peerComparison: peer,
      },
    });
    const { container } = renderCard(seat);
    expect(container.querySelector(".iss-verdict")).toBeNull();
  });
});

// SPEC-3A Option A — the canvas-variant issue-PAC pill restores the legacy
// "what this PAC advocates" line (.fp-pac-advocates), rendered honest-blank
// when the data is absent (the advocates field is data-gated).
describe("RepCard canvas issue-PAC advocates line", () => {
  const seatWithPac = (advocates?: string) =>
    mkSeat({
      candidate: {
        id: "federal-TEST1",
        name: "Theo Vance",
        incumbent: true,
        priorRole: "U.S. Representative since 2019",
        totalRaised: 4_200_000,
        fundingMix: { small: 15, large: 39, pac: 46 },
        donorSource: undefined,
        donorCoalition: [
          {
            label: "Better Care PAC",
            amount: 250_000,
            isIssuePAC: true,
            relevantToIssue: "healthcare_affordability",
            advocates,
          },
        ],
        peerComparison: peer,
      },
    });

  it("uses p.advocates as the source row's agenda line when present", () => {
    const { container } = renderCard(
      seatWithPac("Pushes for lower prescription drug prices"),
    );
    // FundingSources now renders inside the money expander (Frame 3) — open
    // it before looking for source rows.
    fireEvent.click(screen.getByTestId("money-expander-toggle"));
    const row = Array.from(container.querySelectorAll(".srcs .src")).find(
      (el) => el.textContent?.includes("Better Care PAC"),
    );
    expect(row).toBeTruthy();
    expect(row?.querySelector(".src-agenda")?.textContent).toContain(
      "Pushes for lower prescription drug prices",
    );
  });

  it("falls back to the PAC's own label as the agenda line when p.advocates is absent", () => {
    const { container } = renderCard(seatWithPac(undefined));
    fireEvent.click(screen.getByTestId("money-expander-toggle"));
    const row = Array.from(container.querySelectorAll(".srcs .src")).find(
      (el) => el.textContent?.includes("Better Care PAC"),
    );
    // The row itself still renders — only the honest fallback text changes.
    expect(row).toBeTruthy();
    expect(row?.querySelector(".src-agenda")?.textContent).toContain(
      "Better Care PAC",
    );
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

describe("RepCard roster provenance containment", () => {
  it("labels FEC-only challenger rows as finance evidence, not as running for the seat", () => {
    const seat = mkSeat({
      challengers: [
        {
          id: "fec-only",
          name: "Finance Filer",
          party: "Democrat",
          totalReceipts: 50000,
          rosterProvenance: fecFinanceOnlyProvenance,
        },
      ],
    });

    renderStrip(seat);

    expect(
      screen.queryByText("Running for this seat in 2026"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Campaign-finance evidence only"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "FEC filings preserved for finance history · not verified on the ballot",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Finance Filer")).toBeInTheDocument();
  });

  it("does not open the replacement comparison for FEC finance-only rows", () => {
    const onOpenDuel = vi.fn();
    const onVerdict = vi.fn();
    const seat = mkSeat({
      challengers: [
        {
          id: "fec-only",
          name: "Finance Filer",
          party: "Democrat",
          totalReceipts: 50000,
          rosterProvenance: fecFinanceOnlyProvenance,
        },
      ],
    });

    renderCard(seat, { onOpenDuel, onVerdict });
    screen.getByTestId("open-duel").click();

    expect(onOpenDuel).not.toHaveBeenCalled();
    expect(onVerdict).toHaveBeenCalledWith("replace");
    expect(screen.getByTestId("roster-provenance-warning")).toHaveTextContent(
      "Campaign-finance records are not ballot roster proof",
    );
  });

  it("keeps the replacement comparison available for verified current-ballot roster rows", () => {
    const onOpenDuel = vi.fn();
    const onVerdict = vi.fn();
    const seat = mkSeat({
      challengers: [
        {
          id: "verified",
          name: "Verified Challenger",
          party: "Democrat",
          totalReceipts: 50000,
          rosterProvenance: verifiedRosterProvenance,
        },
      ],
    });

    renderCard(seat, { onOpenDuel, onVerdict });
    screen.getByTestId("open-duel").click();

    expect(onOpenDuel).toHaveBeenCalledWith(seat.id);
    expect(onVerdict).not.toHaveBeenCalled();
  });
});

describe("RepCard runoff-pending challengers", () => {
  it("shows the runoff-pending tag and CTA note for a challenger still awaiting a primary runoff", () => {
    const seat = mkSeat({
      challengers: [
        {
          id: "pending-1",
          name: "Mark Tedford",
          party: "Republican",
          totalReceipts: null,
          rosterProvenance: verifiedRosterProvenance,
          isRunoffPending: true,
        },
      ],
    });

    renderStrip(seat);

    expect(screen.getByText("Runoff pending")).toBeInTheDocument();
    expect(
      screen.getByText(/Your vote in that runoff can still decide/),
    ).toBeInTheDocument();
  });

  it("does not show the runoff-pending tag for a determined nominee", () => {
    const seat = mkSeat({
      challengers: [
        {
          id: "determined-1",
          name: "Brandon Wade",
          party: "Democrat",
          totalReceipts: null,
          rosterProvenance: verifiedRosterProvenance,
          isRunoffPending: false,
        },
      ],
    });

    renderStrip(seat);

    expect(screen.queryByText("Runoff pending")).not.toBeInTheDocument();
  });
});

describe("RepCard open seats (incumbent not seeking re-election)", () => {
  const openSeatChallenger = {
    id: "successor-1",
    name: "Maria Alvarez",
    party: "Democrat",
    totalReceipts: 400_000,
    rosterProvenance: verifiedRosterProvenance,
  };

  it("renders the open-seat band + CTA, and no keep/replace buttons, when undecided", () => {
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
        peerComparison: peer,
        seekingReelection2026: false,
      },
      challengers: [openSeatChallenger],
    });
    const { container } = renderCard(seat);

    expect(container.querySelector(".open-band")).not.toBeNull();
    expect(container.querySelector(".btn-open")).not.toBeNull();
    expect(screen.queryByText("Worth keeping")).not.toBeInTheDocument();
    expect(screen.queryByText("Time to replace")).not.toBeInTheDocument();
    expect(
      container.querySelector(".seat-not-seeking-reelection")?.textContent,
    ).toContain("Open seat — incumbent not running");
  });

  it("renders the open-picked confirmation once a successor is chosen, still no keep button", () => {
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
        peerComparison: peer,
        seekingReelection2026: false,
      },
      challengers: [openSeatChallenger],
    });
    const { container } = renderCard(seat, {
      verdict: "replace",
      pickId: "successor-1",
    });

    const picked = container.querySelector(".open-picked");
    expect(picked).not.toBeNull();
    expect(picked?.textContent).toContain("Maria Alvarez");
    expect(container.querySelector(".btn-open")).toBeNull();
    expect(screen.queryByText("Worth keeping")).not.toBeInTheDocument();
  });

  it("renders the roster-not-verified band, not the open-band CTA, when no selectable challenger exists yet", () => {
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
        peerComparison: peer,
        seekingReelection2026: false,
      },
      challengers: [
        {
          id: "finance-only-1",
          name: "Someone Filing",
          party: "Independent",
          totalReceipts: 10_000,
          rosterProvenance: fecFinanceOnlyProvenance,
        },
      ],
    });
    const { container } = renderCard(seat);

    expect(screen.getByTestId("roster-provenance-warning")).toBeInTheDocument();
    expect(container.querySelector(".open-band")).toBeNull();
    // The pickless "I'll choose from my ballot" mark is still available.
    expect(screen.getByText("I'll choose from my ballot")).toBeInTheDocument();
  });

  it("a seeking-re-election seat (default fixture) renders the normal keep/replace pair unchanged", () => {
    renderCard(mkSeat());

    expect(screen.getByText(/Worth keeping/)).toBeInTheDocument();
    expect(screen.getByText("Time to replace")).toBeInTheDocument();
  });
});

// Work order v4 "Frames 2 + 3 — Seat card default & expanded" additions below.

describe("RepCard §1 — issue #1 open by default", () => {
  it("opens the first issue row and leaves the rest closed", () => {
    const seat = mkSeat({
      alignmentEntry: {
        candidateId: "federal-TEST1",
        scores: [
          { ...vote("healthcare_affordability", 3, 4), contributingVotes: [] },
        ],
      },
    });
    const twoIssues: UserIssue[] = [
      {
        canonicalIssue: "healthcare_affordability",
        interpretation: "Lower drug prices",
        level: "federal",
      },
      {
        canonicalIssue: "housing_affordability",
        interpretation: "Rent & cost of living",
        level: "federal",
      },
    ];
    const { container } = render(
      <I18nProvider>
        <RepCard
          seat={seat}
          userIssues={twoIssues}
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
        />
      </I18nProvider>,
    );
    const rows = container.querySelectorAll(".iss");
    expect(rows.length).toBe(2);
    expect(rows[0].classList.contains("open")).toBe(true);
    expect(rows[1].classList.contains("open")).toBe(false);
  });
});

describe("RepCard §2 — MoneyVerdict (honest-null)", () => {
  const seatWithScoredPac = () =>
    mkSeat({
      candidate: {
        id: "federal-TEST1",
        name: "Theo Vance",
        incumbent: true,
        priorRole: "U.S. Representative since 2019",
        totalRaised: 4_200_000,
        fundingMix: { small: 15, large: 39, pac: 46 },
        donorSource: undefined,
        donorCoalition: [
          {
            label: "Better Care PAC",
            amount: 250_000,
            isIssuePAC: true,
            alignsWith: "healthcare_affordability",
            issuePacStance: "opposed",
          },
        ],
        peerComparison: peer,
      },
      alignmentEntry: {
        candidateId: "federal-TEST1",
        scores: [
          {
            ...vote("healthcare_affordability", 3, 4),
            contributingVotes: [
              { voteCast: "with", source: { name: "GovTrack" } },
              { voteCast: "with", source: { name: "GovTrack" } },
              { voteCast: "against", source: { name: "GovTrack" } },
            ],
          },
        ],
      },
    });

  it("omits the whole block when there's no donorCoalition to score against", () => {
    const { container } = renderCard(mkSeat());
    expect(container.querySelector(".mny-verdict")).toBeNull();
  });

  it("renders the shared deriveMoneyInfluence numbers when a scoreable issue-PAC exists", () => {
    const { container } = renderCard(seatWithScoredPac());
    const block = container.querySelector(".mny-verdict");
    expect(block).not.toBeNull();
    // conflictsWithUser (pac opposed vs. resolvedStance in_favor): 1 of the
    // 3 curated votes went the donors' way, 2 went the user's way.
    expect(block?.querySelector(".mvd-head .pct")?.textContent).toBe("33%");
    const rows = block?.querySelectorAll(".mvd-row") || [];
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain("33%");
    expect(rows[1].textContent).toContain("67%");
  });
});

describe("RepCard §2 — RevolvingDoorBand (absent by default)", () => {
  it("renders no .rd-band when no curated record is passed (today's default)", () => {
    const { container } = renderCard(mkSeat());
    expect(container.querySelector(".rd-band")).toBeNull();
  });

  it("renders the callout only when a curated record is explicitly passed", () => {
    const { container } = renderCard(mkSeat(), {
      revolvingDoor: {
        memberId: "federal-TEST1",
        org: "HealthCo Inc.",
        role: "an advisory role",
        dateDocumented: "Jan 2026",
        sourceUrl: "https://example.com/source",
      },
    });
    const band = container.querySelector(".rd-band");
    expect(band).not.toBeNull();
    expect(band?.textContent).toContain("HealthCo Inc.");
    expect(band?.querySelector("a")).toHaveAttribute(
      "href",
      "https://example.com/source",
    );
  });
});

describe("RepCard §2 — money expander (collapsed by default)", () => {
  it("keeps the source list + why-this-matters band collapsed until opened, then shows them", () => {
    const seat = mkSeat({
      candidate: {
        id: "federal-TEST1",
        name: "Theo Vance",
        incumbent: true,
        priorRole: "U.S. Representative since 2019",
        totalRaised: 4_200_000,
        fundingMix: { small: 15, large: 39, pac: 46 },
        donorSource: undefined,
        donorCoalition: [
          {
            label: "Better Care PAC",
            amount: 250_000,
            isIssuePAC: true,
            alignsWith: "healthcare_affordability",
            issuePacStance: "opposed",
          },
        ],
        peerComparison: peer,
      },
      alignmentEntry: {
        candidateId: "federal-TEST1",
        scores: [
          {
            ...vote("healthcare_affordability", 3, 4),
            contributingVotes: [
              { voteCast: "with", source: { name: "GovTrack" } },
              { voteCast: "with", source: { name: "GovTrack" } },
              { voteCast: "against", source: { name: "GovTrack" } },
            ],
          },
        ],
      },
    });
    const { container } = renderCard(seat);

    expect(container.querySelector(".srcs")).toBeNull();
    expect(container.querySelector(".md-why")).toBeNull();
    const toggle = screen.getByTestId("money-expander-toggle");
    // Composed small line drops the permanently-omitted reform-votes/ROI
    // clauses (GAPS §4/§6) and only includes what actually renders below.
    expect(toggle.textContent).toContain("ranked source");
    expect(toggle.textContent).toContain("did the money vote?");
    expect(toggle.textContent).not.toContain("reform vote");
    expect(toggle.textContent).not.toContain("PACs get back");

    fireEvent.click(toggle);
    expect(container.querySelector(".srcs")).not.toBeNull();
    expect(container.querySelector(".md-why")).not.toBeNull();
    expect(container.querySelectorAll(".mny-collapse").length).toBeGreaterThan(
      0,
    );
  });

  it("renders the untraced-money md-tile but never the reform-vote or ROI tiles (no data for either)", () => {
    const seat = mkSeat({
      candidate: {
        id: "federal-TEST1",
        name: "Theo Vance",
        incumbent: true,
        priorRole: "U.S. Representative since 2019",
        totalRaised: 1_000_000,
        fundingMix: { small: 10, large: 10, pac: 80 },
        donorSource: undefined,
        donorCoalition: [
          { label: "Named PAC", amount: 100_000, isIssuePAC: true },
        ],
        peerComparison: peer,
      },
    });
    const { container } = renderCard(seat);
    fireEvent.click(screen.getByTestId("money-expander-toggle"));

    expect(
      container.querySelector('[data-testid="md-tile-untraced"]'),
    ).not.toBeNull();
    expect(screen.queryByText(/reform votes/)).not.toBeInTheDocument();
    expect(screen.queryByText(/What PACs get back/)).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-testid="md-tile-revolving"]'),
    ).toBeNull();
  });
});

describe("RepCard §3 — attendance restyled to .att markup", () => {
  it("renders the exact present/total fraction when the eligible-vote count is parseable", () => {
    const seat = mkSeat({
      attendance: { missedPct: 1.4, of: "612 floor votes", band: "good" },
    });
    const { container } = renderCard(seat);
    const band = container.querySelector(".att-band");
    expect(band).not.toBeNull();
    expect(band?.querySelector(".att-big")?.textContent).toBe("98.6%");
    expect(band?.querySelector(".att-txt")?.textContent).toContain(
      "603 of 612",
    );
    expect(band?.querySelector(".att-txt")?.textContent).toContain("1.4%");
    expect(band?.querySelector(".att-chip")).not.toBeNull();
    expect(
      container.querySelector('.att-src[href="https://www.govtrack.us/"]'),
    ).not.toBeNull();
  });

  it("degrades honestly (no fabricated count) when the denominator isn't a parseable number", () => {
    const seat = mkSeat({
      attendance: {
        missedPct: 3.2,
        of: "floor votes this term",
        band: "mid",
      },
    });
    const { container } = renderCard(seat);
    const txt = container.querySelector(".att-txt")?.textContent || "";
    expect(txt).not.toMatch(/\d+ of \d+/);
    expect(txt).toContain("3.2%");
  });
});

describe("RepCard §4 — committees [Part 3]", () => {
  it("renders assignments with the parent committee name and title chip", () => {
    const seat = mkSeat({
      committees: [
        {
          committeeId: "SSAP",
          name: "Senate Committee on Appropriations",
          chamber: "senate",
          parentName: null,
          title: "Chairman",
          isLeadership: true,
          rank: 1,
        },
        {
          committeeId: "SSAP08",
          name: "Legislative Branch",
          chamber: "senate",
          parentName: "Senate Committee on Appropriations",
          title: null,
          isLeadership: false,
          rank: 4,
        },
      ],
    });
    const { container } = renderCard(seat);
    const band = container.querySelector(".cmt-band");
    expect(band).not.toBeNull();
    const rows = band?.querySelectorAll(".cmt-row");
    expect(rows).toHaveLength(2);
    expect(rows?.[0].querySelector(".cmt-name")?.textContent).toBe(
      "Senate Committee on Appropriations",
    );
    expect(rows?.[0].querySelector(".cmt-title-chip")?.textContent).toBe(
      "Chairman",
    );
    expect(rows?.[1].querySelector(".cmt-name")?.textContent).toBe(
      "Senate Committee on Appropriations — Legislative Branch",
    );
    expect(rows?.[1].querySelector(".cmt-title-chip")).toBeNull();
  });

  it("renders the honest federal empty state when there are no assignments on file", () => {
    const seat = mkSeat({ level: "federal", committees: [] });
    const { container } = renderCard(seat);
    const band = container.querySelector(".cmt-outer.na");
    expect(band?.textContent).toContain(
      "No committee record on file for this member yet",
    );
  });

  it("renders the honest state-level empty state, distinct from the federal copy", () => {
    const seat = mkSeat({ level: "state", committees: [] });
    const { container } = renderCard(seat);
    const band = container.querySelector(".cmt-outer.na");
    expect(band?.textContent).toContain(
      "Committee assignments aren't tracked at the state level yet",
    );
  });

  it("degrades to the empty state when committees is undefined (no crash)", () => {
    const seat = mkSeat();
    delete (seat as { committees?: unknown }).committees;
    const { container } = renderCard(seat);
    expect(container.querySelector(".cmt-band")).toBeNull();
    expect(container.querySelector(".cmt-outer.na")).not.toBeNull();
  });

  it("never collides with the bare .att-band selector the e2e suite uses", () => {
    // redesign-core.spec.ts locates the attendance box with a bare
    // `.att-band` locator expecting exactly one match — the committees box
    // must never carry that class, populated or empty.
    const populated = mkSeat({
      committees: [
        {
          committeeId: "HSAG",
          name: "House Committee on Agriculture",
          chamber: "house",
          parentName: null,
          title: "Chairman",
          isLeadership: true,
          rank: 1,
        },
      ],
    });
    expect(
      renderCard(populated).container.querySelectorAll(".att-band"),
    ).toHaveLength(1);

    const empty = mkSeat({ committees: [] });
    expect(
      renderCard(empty).container.querySelectorAll(".att-band"),
    ).toHaveLength(1);
  });
});

describe("RepCard verdict + sources — .verdict grid", () => {
  it("renders btn-keep/btn-replace with the .box glyph, same handlers as before", () => {
    const onVerdict = vi.fn();
    const { container } = renderCard(mkSeat(), { onVerdict });

    const keepBtn = container.querySelector(".verdict .btn-keep");
    const replaceBtn = container.querySelector(".verdict .btn-replace");
    expect(keepBtn).not.toBeNull();
    expect(replaceBtn).not.toBeNull();
    expect(keepBtn?.querySelector(".box")).not.toBeNull();
    expect(replaceBtn?.querySelector(".box")).not.toBeNull();

    keepBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onVerdict).toHaveBeenCalledWith("keep");
  });
});
