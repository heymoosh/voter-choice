// @vitest-environment jsdom
/**
 * Part 6a block: names PACs + the sponsor each committee files, links the
 * evidence, and never prints a subtotal (the money is already inside the
 * funding mix above it).
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { I18nProvider } from "../VoterChoiceApp";
import { TopPacSponsors, type TopPacSponsorsData } from "./TopPacSponsors";

function withI18n(node: React.ReactElement) {
  return <I18nProvider>{node}</I18nProvider>;
}

const data: TopPacSponsorsData = {
  electionCycle: "2026",
  hiddenCount: 0,
  sponsors: [
    {
      committeeId: "C00000001",
      name: "EXAMPLE CORP PAC",
      sponsor: "EXAMPLE CORP",
      sector: "Technology",
      amount: 10_000,
      transactionCount: 4,
      evidenceUrl: "https://www.fec.gov/data/committee/C00000001/",
    },
    {
      committeeId: "C00000002",
      name: "AN UNSPONSORED PAC",
      sponsor: null,
      sector: null,
      amount: 2_500,
      transactionCount: 1,
      evidenceUrl: "https://www.fec.gov/data/committee/C00000002/",
    },
  ],
};

describe("TopPacSponsors", () => {
  it("renders nothing at all when no data was looked up (flag off)", () => {
    const { container } = render(withI18n(<TopPacSponsors data={null} />));
    expect(container).toBeEmptyDOMElement();
  });

  it("names each PAC, its filed sponsor, its sector and its amount", () => {
    render(withI18n(<TopPacSponsors data={data} />));
    expect(screen.getByText("EXAMPLE CORP PAC")).toBeInTheDocument();
    expect(
      screen.getByText("Sponsor on its FEC filing: EXAMPLE CORP"),
    ).toBeInTheDocument();
    expect(screen.getByText("Technology")).toBeInTheDocument();
    expect(screen.getByText("$10k")).toBeInTheDocument();
  });

  it("says so plainly when a committee files no sponsor, and shows no sector", () => {
    render(withI18n(<TopPacSponsors data={data} />));
    expect(
      screen.getByText(
        "No sponsoring organization on this committee’s filing — we don’t guess one.",
      ),
    ).toBeInTheDocument();
    // Exactly one sector tag rendered — the unclassified PAC gets none.
    expect(document.querySelectorAll(".src-tag")).toHaveLength(1);
  });

  it("links every named sponsor to the filing it rests on", () => {
    render(withI18n(<TopPacSponsors data={data} />));
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute(
      "href",
      "https://www.fec.gov/data/committee/C00000001/",
    );
  });

  it("frames itself as a breakdown of money already counted, not new money", () => {
    render(withI18n(<TopPacSponsors data={data} />));
    expect(screen.getByText(/not additional money/i)).toBeInTheDocument();
  });

  it("never renders a subtotal of the PACs it lists", () => {
    render(withI18n(<TopPacSponsors data={data} />));
    // 10,000 + 2,500 = 12,500 → "$13k" after rounding. It must not appear.
    expect(screen.queryByText("$13k")).toBeNull();
    expect(screen.queryByText("$12.5k")).toBeNull();
  });

  it("renders an explicit no-data statement rather than a blank", () => {
    render(
      withI18n(
        <TopPacSponsors
          data={{ electionCycle: "2026", sponsors: [], hiddenCount: 0 }}
        />,
      ),
    );
    const empty = screen.getByTestId("top-pac-sponsors-empty");
    expect(empty).toHaveTextContent(/No PAC contributions to this candidate/i);
    expect(empty).toHaveTextContent(/not that none exist/i);
  });

  it("counts the PACs it did not list", () => {
    render(withI18n(<TopPacSponsors data={{ ...data, hiddenCount: 12 }} />));
    expect(screen.getByTestId("top-pac-sponsors-hidden")).toHaveTextContent(
      "12 smaller PACs gave too",
    );
  });
});
