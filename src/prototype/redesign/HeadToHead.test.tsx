// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { I18nProvider } from "../VoterChoiceApp";
import type { DelegationSeatVM, UserIssue } from "./delegationData";

// Blind rebuild (work order v4, Frame 5/6/7) — HeadToHead now renders the
// whiteboard's `.dl-*` markup and never leaks a real name/party while blind.
// getChallengerResearch/researchChallenger are mocked so each test can force
// a specific research status (done/unavailable/budget_blocked/loading)
// without depending on network timing.
vi.mock("./delegationData", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./delegationData")>();
  return {
    ...actual,
    getChallengerResearch: vi.fn(),
    researchChallenger: vi.fn(),
  };
});

import { HeadToHead } from "./HeadToHead";
import { getChallengerResearch, researchChallenger } from "./delegationData";

const mockGetResearch = vi.mocked(getChallengerResearch);
const mockResearch = vi.mocked(researchChallenger);

const vote = (canonicalIssue: string, kept: number, total: number) => ({
  canonicalIssue,
  issueLabel: canonicalIssue,
  resolvedStance: "in_favor",
  sourceType: "voting_record",
  kept,
  total,
});

const researched = (canonicalIssue: string, resolvedStance: string) => ({
  canonicalIssue,
  issueLabel: canonicalIssue,
  resolvedStance,
  sourceType: "web_search",
  confidence: "medium",
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

beforeEach(() => {
  mockGetResearch.mockReset();
  mockResearch.mockReset();
  mockGetResearch.mockReturnValue(undefined);
});

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

describe("HeadToHead — blind mode: no real name or party leaks", () => {
  it("shows aliases everywhere and never renders the real name or party while blind", () => {
    const { container } = renderDuel(mkSeat(), {
      blindMode: true,
      revealed: new Set(),
    });
    expect(screen.queryByText("Theo Vance")).not.toBeInTheDocument();
    expect(screen.queryByText("Elena Reyes")).not.toBeInTheDocument();
    expect(screen.queryByText(/Reyes/)).not.toBeInTheDocument();
    expect(screen.getAllByText("This seat's incumbent").length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText(/Candidate A/).length).toBeGreaterThan(0);
    // every pip is dashed-hidden — none carries a real party class
    const pips = container.querySelectorAll(".pip");
    expect(pips.length).toBeGreaterThan(0);
    pips.forEach((p) => {
      expect(p.className).toContain("hid");
      expect(p.className).not.toMatch(/\b(rep|dem|ind)\b/);
    });
  });

  it("aliases challengers by roster order (A, B) and keeps them stable across re-renders", () => {
    const seat = mkSeat({
      challengers: [
        {
          id: "c1",
          name: "Elena Reyes",
          party: "Democrat",
          totalReceipts: 1_340_000,
          rosterProvenance: verifiedRosterProvenance,
        },
        {
          id: "c2",
          name: "Sam Ortiz",
          party: "Independent",
          totalReceipts: 400_000,
          rosterProvenance: verifiedRosterProvenance,
        },
      ],
    });
    const { rerender } = renderDuel(seat, {
      blindMode: true,
      revealed: new Set(),
    });
    expect(screen.getAllByText(/Candidate A/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("tab", { name: /Candidate B/ }));
    rerender(
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
          blindMode
          revealed={new Set()}
        />
      </I18nProvider>,
    );
    // Still B — the tab order didn't change, so its alias didn't move.
    expect(
      screen.getByRole("tab", { name: /Candidate B/ }),
    ).toBeInTheDocument();
  });

  it("locks researched-position evidence links behind the whiteboard's copy while blind", () => {
    mockGetResearch.mockReturnValue({
      status: "done",
      scores: [
        {
          ...researched("healthcare_affordability", "in_favor"),
          evidence: [
            {
              summary: "Reyes has called for lower drug prices.",
              url: "https://example.com/reyes",
            },
          ],
        },
      ],
    });
    renderDuel(mkSeat(), { blindMode: true, revealed: new Set() });
    expect(screen.getByText("🔒 sources unlock on reveal")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /example.com/ }),
    ).not.toBeInTheDocument();
    const links = screen.queryAllByRole("link") as HTMLAnchorElement[];
    expect(
      links.every(
        (a) => a.getAttribute("href") !== "https://example.com/reyes",
      ),
    ).toBe(true);
  });
});

describe("HeadToHead — reveal flow", () => {
  it("reveals the incumbent via onReveal(seat.id) — the same key RepCard uses", () => {
    const onReveal = vi.fn();
    renderDuel(mkSeat(), { blindMode: true, revealed: new Set(), onReveal });
    const revealButtons = screen.getAllByRole("button", { name: /Reveal/ });
    fireEvent.click(revealButtons[0]);
    expect(onReveal).toHaveBeenCalledWith("house-TX-21");
  });

  it("reveals a challenger via a composite seat+challenger key, independent of the incumbent", () => {
    const onReveal = vi.fn();
    renderDuel(mkSeat(), { blindMode: true, revealed: new Set(), onReveal });
    const revealButtons = screen.getAllByRole("button", { name: /Reveal/ });
    fireEvent.click(revealButtons[1]);
    expect(onReveal).toHaveBeenCalledWith("house-TX-21::challenger::c1");
  });

  it("shows the real name and party once a challenger's key is in `revealed`, incumbent stays blind", () => {
    renderDuel(mkSeat(), {
      blindMode: true,
      revealed: new Set(["house-TX-21::challenger::c1"]),
    });
    expect(screen.getAllByText("Elena Reyes").length).toBeGreaterThan(0);
    expect(screen.queryByText("Theo Vance")).not.toBeInTheDocument();
  });

  it("drops the blind banner once everyone is revealed", () => {
    const seat = mkSeat({
      challengers: [
        {
          id: "c1",
          name: "Elena Reyes",
          party: "Democrat",
          totalReceipts: 1_340_000,
          rosterProvenance: verifiedRosterProvenance,
        },
      ],
    });
    const { container } = renderDuel(seat, {
      blindMode: true,
      revealed: new Set(["house-TX-21", "house-TX-21::challenger::c1"]),
    });
    expect(container.querySelector(".dl-blindbar")).toBeNull();
  });
});

describe("HeadToHead — pick-while-blind records the real id", () => {
  it("onReplace still receives the real challenger id while blind (only the display is aliased)", () => {
    const onReplace = vi.fn();
    renderDuel(mkSeat(), {
      blindMode: true,
      revealed: new Set(),
      onReplace,
    });
    fireEvent.click(screen.getByRole("button", { name: /Candidate A/ }));
    expect(onReplace).toHaveBeenCalledWith("c1");
  });
});

describe("HeadToHead — Frame 6 challenger empty states", () => {
  it("always shows the 'never held this office' state for every challenger", () => {
    renderDuel(mkSeat());
    expect(
      screen.getByText("No roll-call record — and that's expected"),
    ).toBeInTheDocument();
  });

  it("shows the research-came-back-empty state with a working 'check again'", () => {
    mockGetResearch.mockReturnValue({ status: "unavailable" });
    renderDuel(mkSeat());
    expect(
      screen.getByText("No citable statements on your 1 issues yet"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText("check again"));
    expect(mockResearch).toHaveBeenCalled();
  });

  it("shows the research-paused state with a working budget-options link", () => {
    const onShowBudgetOptions = vi.fn();
    mockGetResearch.mockReturnValue({
      status: "budget_blocked",
      upstream: false,
    });
    renderDuel(mkSeat(), { onShowBudgetOptions });
    expect(screen.getByTestId("duel-budget-blocked")).toHaveTextContent(
      "Live research is paused this month",
    );
    fireEvent.click(screen.getByText("More options →"));
    expect(onShowBudgetOptions).toHaveBeenCalledWith(false);
  });

  it("passes upstream:true through to onShowBudgetOptions when the block was a sustained Anthropic-account exhaustion, not the community budget", () => {
    const onShowBudgetOptions = vi.fn();
    mockGetResearch.mockReturnValue({
      status: "budget_blocked",
      upstream: true,
    });
    renderDuel(mkSeat(), { onShowBudgetOptions });
    fireEvent.click(screen.getByText("More options →"));
    expect(onShowBudgetOptions).toHaveBeenCalledWith(true);
  });

  it("shows the no-FEC-match state in the money column instead of a fabricated $0", () => {
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
    renderDuel(seat);
    expect(
      screen.getByText("No FEC match yet — so no dollar shown"),
    ).toBeInTheDocument();
  });
});

describe("HeadToHead — roster provenance containment", () => {
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
    renderDuel(seat);
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(screen.queryByText("Finance Filer")).not.toBeInTheDocument();
    expect(
      screen.getByText("No verified replacement roster yet"),
    ).toBeInTheDocument();
  });
});

describe("HeadToHead — money section (Frame 7)", () => {
  it("embeds FundingSources for the incumbent under a dl-mhead", () => {
    const { container } = renderDuel(mkSeat());
    const money = container.querySelector(".dl-money");
    expect(money).not.toBeNull();
    expect(money?.querySelector(".dl-mhead")).not.toBeNull();
    expect(money).toHaveTextContent("$4.2M raised");
    expect(money).toHaveTextContent("46% PAC money");
  });

  it("HONEST STATE: a challenger with a dollar total but no coalition shows 'PACs · not yet traced', never a fabricated mix", () => {
    const { container } = renderDuel(mkSeat());
    const money = container.querySelector(".dl-money");
    expect(money).toHaveTextContent("PACs · not yet traced");
    expect(money).toHaveTextContent("$1.3M");
  });
});

describe("HeadToHead — whole-field money scale", () => {
  it('renders "Everyone running for this seat" with the subject + every funded filer, honest-omitting unfunded ones', () => {
    const { container } = renderDuel(mkSeat());
    const field = container.querySelector(".cmp-field");
    expect(field).not.toBeNull();
    expect(field).toHaveTextContent("Everyone running for this seat");
    const rows = field?.querySelectorAll(".mgap-row") ?? [];
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

describe("HeadToHead — no verified replacement roster", () => {
  it("renders the honest empty state and keeps Keep/Mark-to-replace working", () => {
    const seat = mkSeat({ challengers: [] });
    renderDuel(seat);
    expect(
      screen.getByText("No verified replacement roster yet"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Mark to replace/ }),
    ).toBeInTheDocument();
  });
});
