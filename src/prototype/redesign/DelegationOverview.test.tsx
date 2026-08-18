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
      fundingMix: {
        small: 40,
        large: 0,
        pac: 60,
        total: 5_000_000,
        cycle: "2026",
      },
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
  {
    canonicalIssue: "healthcare_affordability",
    interpretation: "Lower drug prices",
    level: "federal",
  },
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
    expect(
      within(cards[0]).getByText("U.S. House · TX-37"),
    ).toBeInTheDocument();
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
    const seats = [
      mkSeat({ alignmentEntry: { candidateId: "federal-TEST1", scores: [] } }),
    ];
    renderOverview({ seats, verdicts: {}, userIssues, onOpen: () => {} });
    // both the big align % and the issue row's fraction fall back to the
    // same honest dash — assert on the specific % slot, not just "some '—'
    // exists somewhere", so this stays a real regression check. Scoped to
    // .cd-align (not the whole card): the funding mixkey legitimately shows
    // "0%" for a zero-width large-donor segment elsewhere on this same
    // fixture — that's honest data, not a fabricated alignment score.
    const align = screen.getByTestId("seat-card").querySelector(".cd-align");
    expect(align).toHaveTextContent("—");
    expect(
      within(align as HTMLElement).queryByText("0%"),
    ).not.toBeInTheDocument();
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

  it("excluded (not-up) row is a real entry: clicking it opens the seat, and it never renders verdict UI", async () => {
    const onOpen = vi.fn();
    const seats = [
      mkSeat({ id: "house-TX-37" }),
      mkSeat({
        id: "senate-TX-b",
        office: "U.S. Senate",
        districtLabel: "Texas (statewide)",
        blindLabel: "Your Junior U.S. Senator",
        nextElection: { label: "next up 2030", onBallot2026: false },
      }),
    ];
    renderOverview({ seats, verdicts: {}, userIssues, onOpen });

    expect(
      screen.queryByRole("button", { name: /Worth keeping/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Time to replace/ }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("See their record →"));
    expect(onOpen).toHaveBeenCalledWith("senate-TX-b");
  });

  it("gates the print CTA on every up-2026 seat being decided, counting REMAINING seats (not the total)", () => {
    const seats = [mkSeat({ id: "a" }), mkSeat({ id: "b" })];
    const { rerender } = render(
      <I18nProvider>
        <DelegationOverview
          seats={seats}
          verdicts={{}}
          userIssues={userIssues}
          onOpen={() => {}}
        />
      </I18nProvider>,
    );
    // 0 of 2 decided -> 2 remaining, plural "seats" — exact match on the
    // print CTA's full "not ready" copy. A loose /decide/i regex also
    // matches SeatCard's "Not yet decided" status pill (itself rendered
    // with role="button" for click-through), which isn't the control under
    // test here.
    expect(
      screen.getByRole("button", {
        name: "Decide 2 more seats to print your scorecard",
      }),
    ).toBeDisabled();

    rerender(
      <I18nProvider>
        <DelegationOverview
          seats={seats}
          verdicts={{ a: "keep" }}
          userIssues={userIssues}
          onOpen={() => {}}
        />
      </I18nProvider>,
    );
    // 1 of 2 decided -> 1 remaining, singular "seat".
    expect(
      screen.getByRole("button", {
        name: "Decide 1 more seat to print your scorecard",
      }),
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

  it("shows a synced mix bar + mixkey legend, giving zero-width segments a legend entry even though the bar skips them", () => {
    const seats = [mkSeat()]; // fundingMix: small 40 / large 0 / pac 60
    renderOverview({ seats, verdicts: {}, userIssues, onOpen: () => {} });
    const card = screen.getByTestId("seat-card");
    // bar: only non-zero segments render as fill elements
    expect(card.querySelectorAll(".cd-mixbar .mix-sm")).toHaveLength(1);
    expect(card.querySelectorAll(".cd-mixbar .mix-lg")).toHaveLength(0);
    expect(card.querySelectorAll(".cd-mixbar .mix-pac")).toHaveLength(1);
    // legend: all three entries always present, including the 0% one
    const key = card.querySelector(".cd-mixkey");
    expect(key).toHaveTextContent("40%");
    expect(key).toHaveTextContent("0%");
    expect(key).toHaveTextContent("60%");
    expect(key?.querySelectorAll(".mix-lg")).toHaveLength(1);
  });

  it("omits the whole cd-influence block when deriveMoneyInfluence has no PAC/vote data to score", () => {
    // default mkSeat() has donorCoalition: null -> deriveMoneyInfluence is null
    const seats = [mkSeat()];
    renderOverview({ seats, verdicts: {}, userIssues, onOpen: () => {} });
    expect(
      screen.getByTestId("seat-card").querySelector(".cd-influence"),
    ).not.toBeInTheDocument();
  });

  it("renders cd-influence with the honest-wording sentence + untraced chip when PAC/vote data exists, and applies .low under 50%", () => {
    const seats = [
      mkSeat({
        candidate: {
          id: "federal-TEST1",
          name: "Alex Rivera",
          incumbent: true,
          priorRole: "U.S. Representative since 2019",
          totalRaised: 1_000_000,
          fundingMix: {
            small: 40,
            large: 0,
            pac: 60,
            total: 1_000_000,
            cycle: "2026",
          },
          donorSource: undefined,
          donorCoalition: [
            {
              label: "PhRMA & Hospital PACs",
              amount: 300_000,
              isIssuePAC: true,
              alignsWith: "healthcare_affordability",
              issuePacStance: "opposed",
            },
          ],
          peerComparison: null,
        },
        alignmentEntry: {
          candidateId: "federal-TEST1",
          scores: [
            {
              canonicalIssue: "healthcare_affordability",
              resolvedStance: "in_favor",
              kept: 1,
              total: 3,
              contributingVotes: [
                { voteCast: "with" },
                { voteCast: "against" },
                { voteCast: "against" },
              ],
            },
          ],
        },
      }),
    ];
    renderOverview({ seats, verdicts: {}, userIssues, onOpen: () => {} });
    const card = screen.getByTestId("seat-card");
    const influence = card.querySelector(".cd-influence");
    expect(influence).toBeInTheDocument();
    // PAC opposed vs user in_favor -> conflicts -> dots against user's votes:
    // with -> 'a', against -> 'w', against -> 'w' => k=2, n=3 -> 67%, not low
    expect(influence).toHaveTextContent("67%");
    expect(influence).not.toHaveClass("low");
    expect(influence).toHaveTextContent(
      "on the issues their PAC donors target",
    );
    expect(influence).toHaveTextContent("2 of 3 scored votes");
    // implied PAC total = round(1_000_000 * 0.6) = 600_000; named = 300_000
    // -> uncatPacTotal 300_000 -> untraced% = round(300_000/1_000_000*100) = 30
    expect(influence).toHaveTextContent("30% untraced");
  });

  it("applies the .low variant and its distinct sentence when money leads less than most (pct < 50)", () => {
    const seats = [
      mkSeat({
        candidate: {
          id: "federal-TEST1",
          name: "Alex Rivera",
          incumbent: true,
          priorRole: "U.S. Representative since 2019",
          totalRaised: 1_000_000,
          fundingMix: {
            small: 40,
            large: 0,
            pac: 60,
            total: 1_000_000,
            cycle: "2026",
          },
          donorSource: undefined,
          donorCoalition: [
            {
              label: "Labor Union PACs",
              amount: 100_000,
              isIssuePAC: true,
              alignsWith: "healthcare_affordability",
              issuePacStance: "opposed",
            },
          ],
          peerComparison: null,
        },
        alignmentEntry: {
          candidateId: "federal-TEST1",
          scores: [
            {
              canonicalIssue: "healthcare_affordability",
              resolvedStance: "in_favor",
              kept: 3,
              total: 3,
              contributingVotes: [
                { voteCast: "with" },
                { voteCast: "with" },
                { voteCast: "with" },
              ],
            },
          ],
        },
      }),
    ];
    renderOverview({ seats, verdicts: {}, userIssues, onOpen: () => {} });
    const influence = screen
      .getByTestId("seat-card")
      .querySelector(".cd-influence");
    // PAC opposed vs user's 3 "with" votes -> all 'a' (against) -> k=0,n=3 -> 0%
    expect(influence).toHaveClass("low");
    expect(influence).toHaveTextContent("0%");
    expect(influence).toHaveTextContent(
      "money leads this record less than most",
    );
  });

  it("gives the seat card a blind class only while blindMode is on and the seat isn't in the revealed set", () => {
    const seats = [mkSeat({ id: "house-TX-37" })];
    const { rerender } = renderOverview({
      seats,
      verdicts: {},
      userIssues,
      onOpen: () => {},
      blindMode: true,
      revealed: new Set(),
    });
    expect(screen.getByTestId("seat-card").className).toContain("blind");

    rerender(
      <I18nProvider>
        <DelegationOverview
          seats={seats}
          verdicts={{}}
          userIssues={userIssues}
          onOpen={() => {}}
          blindMode={true}
          revealed={new Set(["house-TX-37"])}
        />
      </I18nProvider>,
    );
    expect(screen.getByTestId("seat-card").className).not.toContain("blind");
  });

  it("never adds the blind class when blindMode is off (default, unchanged behavior)", () => {
    const seats = [mkSeat({ id: "house-TX-37" })];
    renderOverview({ seats, verdicts: {}, userIssues, onOpen: () => {} });
    expect(screen.getByTestId("seat-card").className).not.toContain("blind");
  });
});

// Reps-first flow (2026-08-18): no forced issues intake before the
// overview — an empty issue list is a first-class, honest state, not an
// error. These pin the facts-only substitute for the per-issue alignment
// section, and the optional tailor CTA.
describe("DelegationOverview — no issues yet (facts-only)", () => {
  it("replaces the per-issue alignment section with a facts summary, never a fabricated score", () => {
    const seats = [mkSeat()];
    renderOverview({ seats, verdicts: {}, userIssues: [], onOpen: () => {} });
    const card = screen.getByTestId("seat-card");
    expect(screen.getByTestId("seat-facts")).toBeInTheDocument();
    expect(card.querySelector(".cd-issues")).not.toBeInTheDocument();
    expect(card).not.toHaveTextContent("Aligns with your issues");
  });

  it("shows an honest attendance one-liner when attendance data exists, and an honest fallback when it doesn't", () => {
    const withAttendance = [
      mkSeat({
        attendance: { missedPct: 2, of: "500 floor votes", band: "good" },
      }),
    ];
    const { unmount } = renderOverview({
      seats: withAttendance,
      verdicts: {},
      userIssues: [],
      onOpen: () => {},
    });
    expect(screen.getByTestId("seat-facts")).toHaveTextContent(
      "98% attendance",
    );
    expect(screen.getByTestId("seat-facts")).toHaveTextContent("Rarely misses");
    unmount();

    const withoutAttendance = [mkSeat({ attendance: null })];
    renderOverview({
      seats: withoutAttendance,
      verdicts: {},
      userIssues: [],
      onOpen: () => {},
    });
    expect(screen.getByTestId("seat-facts")).toHaveTextContent(
      "Attendance isn't available for this member yet",
    );
  });

  it("names the top PAC sponsors by amount, with an 'and N more' tail, or an honest empty line when there are none traced", () => {
    const withSponsors = [
      mkSeat({
        topPacs: {
          electionCycle: "2026",
          hiddenCount: 1,
          sponsors: [
            {
              committeeId: "c1",
              name: "Small PAC",
              sponsor: null,
              sector: null,
              amount: 5_000,
              transactionCount: 1,
              evidenceUrl: "https://example.com/c1",
            },
            {
              committeeId: "c2",
              name: "Big PAC",
              sponsor: null,
              sector: null,
              amount: 50_000,
              transactionCount: 3,
              evidenceUrl: "https://example.com/c2",
            },
            {
              committeeId: "c3",
              name: "Mid PAC",
              sponsor: null,
              sector: null,
              amount: 20_000,
              transactionCount: 2,
              evidenceUrl: "https://example.com/c3",
            },
          ],
        },
      }),
    ];
    const { unmount } = renderOverview({
      seats: withSponsors,
      verdicts: {},
      userIssues: [],
      onOpen: () => {},
    });
    // Sorted by amount desc: Big PAC (50k), Mid PAC (20k) — Small PAC (5k)
    // folds into "and 2 more" (1 remaining listed sponsor + hiddenCount 1).
    const facts = screen.getByTestId("seat-facts");
    expect(facts).toHaveTextContent("Big PAC, Mid PAC");
    expect(facts).toHaveTextContent("and 2 more");
    unmount();

    const noSponsors = [
      mkSeat({
        topPacs: { electionCycle: "2026", hiddenCount: 0, sponsors: [] },
      }),
    ];
    renderOverview({
      seats: noSponsors,
      verdicts: {},
      userIssues: [],
      onOpen: () => {},
    });
    expect(screen.getByTestId("seat-facts")).toHaveTextContent(
      "No named PAC sponsors traced yet",
    );
  });

  it("omits the PAC-sponsor line entirely when topPacs is null (we didn't look), not an empty-state line", () => {
    const seats = [mkSeat({ topPacs: null })];
    renderOverview({ seats, verdicts: {}, userIssues: [], onOpen: () => {} });
    const facts = screen.getByTestId("seat-facts");
    expect(facts).not.toHaveTextContent("PAC sponsors");
  });

  it("shows the curated key-vote count when CAN2026 context exists, and omits the line when it's null", () => {
    const withCanContext = [
      mkSeat({
        canContext: {
          ratings: [],
          donorTrail: null,
          keyVotes: [
            { billLabel: "H.R. 1", stance: "with" } as never,
            { billLabel: "H.R. 2", stance: "against" } as never,
          ],
        } as never,
      }),
    ];
    const { unmount } = renderOverview({
      seats: withCanContext,
      verdicts: {},
      userIssues: [],
      onOpen: () => {},
    });
    expect(screen.getByTestId("seat-facts")).toHaveTextContent(
      "2 curated key votes on record",
    );
    unmount();

    const noCanContext = [mkSeat({ canContext: null })];
    renderOverview({
      seats: noCanContext,
      verdicts: {},
      userIssues: [],
      onOpen: () => {},
    });
    expect(screen.getByTestId("seat-facts")).not.toHaveTextContent(
      "curated key vote",
    );
  });

  it("shows the challenger count, including the honest zero case (never omitted, unlike the null-vs-empty fields above)", () => {
    const seats = [mkSeat({ challengers: [] })];
    renderOverview({ seats, verdicts: {}, userIssues: [], onOpen: () => {} });
    expect(screen.getByTestId("seat-facts")).toHaveTextContent(
      "0 challengers filed to run in 2026",
    );
  });

  it("shows the optional tailor CTA only when there are no issues yet, and it fires onTailorIssues", async () => {
    const onTailorIssues = vi.fn();
    const seats = [mkSeat()];
    const { unmount } = renderOverview({
      seats,
      verdicts: {},
      userIssues: [],
      onOpen: () => {},
      onTailorIssues,
    });
    const cta = screen.getByTestId("tailor-issues-cta");
    await userEvent.click(cta);
    expect(onTailorIssues).toHaveBeenCalledTimes(1);
    unmount();

    renderOverview({
      seats,
      verdicts: {},
      userIssues,
      onOpen: () => {},
      onTailorIssues,
    });
    expect(screen.queryByTestId("tailor-issues-cta")).not.toBeInTheDocument();
  });
});
