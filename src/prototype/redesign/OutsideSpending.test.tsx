// @vitest-environment jsdom
/**
 * Part 6b block. The load-bearing assertions here are legal, not cosmetic:
 * the block must say this is not the campaign's money, must show "for" and
 * "against" as two figures, and must never render their sum or their net.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { I18nProvider } from "../VoterChoiceApp";
import { OutsideSpending, type OutsideSpendingData } from "./OutsideSpending";

function withI18n(node: React.ReactElement) {
  return <I18nProvider>{node}</I18nProvider>;
}

const data: OutsideSpendingData = {
  electionCycle: "2026",
  support: {
    total: 4_000_000,
    hiddenCount: 0,
    spenders: [
      {
        committeeId: "C00900001",
        name: "SENATE LEADERSHIP GROUP",
        sponsor: null,
        sector: null,
        amount: 4_000_000,
        expenditureCount: 12,
        evidenceUrl: "https://www.fec.gov/data/committee/C00900001/",
      },
    ],
  },
  oppose: {
    total: 1_000_000,
    hiddenCount: 0,
    spenders: [
      {
        committeeId: "C00900002",
        name: "A TRADE ASSOCIATION PAC",
        sponsor: "EXAMPLE TRADE ASSOCIATION",
        sector: "Healthcare industry",
        amount: 1_000_000,
        expenditureCount: 3,
        evidenceUrl: "https://www.fec.gov/data/committee/C00900002/",
      },
    ],
  },
};

describe("OutsideSpending", () => {
  it("renders nothing at all when no data was looked up (flag off)", () => {
    const { container } = render(withI18n(<OutsideSpending data={null} />));
    expect(container).toBeEmptyDOMElement();
  });

  it("states in the block that this is not the campaign's money", () => {
    render(withI18n(<OutsideSpending data={data} />));
    expect(
      screen.getByText(/This is not the campaign’s money/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/do not coordinate/i)).toBeInTheDocument();
  });

  it("shows support and oppose as two separate figures", () => {
    render(withI18n(<OutsideSpending data={data} />));
    expect(
      screen.getByTestId("outside-spending-support-total"),
    ).toHaveTextContent("$4M");
    expect(
      screen.getByTestId("outside-spending-oppose-total"),
    ).toHaveTextContent("$1M");
  });

  it("never renders the sum or the net of the two directions", () => {
    render(withI18n(<OutsideSpending data={data} />));
    const text = document.body.textContent ?? "";
    expect(text).not.toContain("$5M"); // the sum
    expect(text).not.toContain("$3M"); // the net
    expect(screen.getByText(/never add them together/i)).toBeInTheDocument();
  });

  it("renders its own separated block, not part of the funding mix", () => {
    render(withI18n(<OutsideSpending data={data} />));
    const block = screen.getByTestId("outside-spending");
    expect(block).toHaveClass("outside-spend");
    expect(block.querySelector(".mix")).toBeNull();
  });

  it("names spenders, with the filed sponsor when there is one", () => {
    render(withI18n(<OutsideSpending data={data} />));
    expect(screen.getByText("SENATE LEADERSHIP GROUP")).toBeInTheDocument();
    expect(
      screen.getByText("Sponsor on its FEC filing: EXAMPLE TRADE ASSOCIATION"),
    ).toBeInTheDocument();
    expect(screen.getByText("Healthcare industry")).toBeInTheDocument();
  });

  it("says a non-connected committee has no sponsor rather than leaving a gap", () => {
    render(withI18n(<OutsideSpending data={data} />));
    expect(
      screen.getByText(
        "A non-connected committee — no sponsoring organization on its filing.",
      ),
    ).toBeInTheDocument();
    // Only the sponsored spender carries a sector tag.
    expect(document.querySelectorAll(".src-tag")).toHaveLength(1);
  });

  it("links every spender to its committee filing", () => {
    render(withI18n(<OutsideSpending data={data} />));
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("renders an explicit no-data line per direction, never a blank", () => {
    render(
      withI18n(
        <OutsideSpending
          data={{
            electionCycle: "2026",
            support: { total: 0, spenders: [], hiddenCount: 0 },
            oppose: data.oppose,
          }}
        />,
      ),
    );
    expect(
      screen.getByTestId("outside-spending-support-empty"),
    ).toHaveTextContent(
      "No outside spending supporting this candidate on file.",
    );
    // The other direction still renders its real figure — an empty side never
    // collapses the block into one number.
    expect(
      screen.getByTestId("outside-spending-oppose-total"),
    ).toHaveTextContent("$1M");
  });

  it("counts spenders it did not list", () => {
    render(
      withI18n(
        <OutsideSpending
          data={{ ...data, oppose: { ...data.oppose, hiddenCount: 7 } }}
        />,
      ),
    );
    expect(
      screen.getByText(/7 more outside spenders aren’t listed here/),
    ).toBeInTheDocument();
  });
});
