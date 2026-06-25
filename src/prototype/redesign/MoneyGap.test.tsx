// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { MedianChip, MoneyGapScale } from "./MoneyGap";
import type { PeerComparison } from "./peerComparison";

const peer: PeerComparison = {
  baseline: "chamber-median",
  office: "U.S. House",
  medianRaised: 1_400_000,
  multiple: 3.0,
  cycle: "2025–26",
  source: "FEC filings",
};

describe("MedianChip", () => {
  it("renders the multiple + median glance when a baseline exists", () => {
    const { container } = render(<MedianChip raised={4_200_000} peer={peer} />);
    expect(screen.getByText("3×")).toBeInTheDocument();
    expect(screen.getByText("median")).toBeInTheDocument();
    // bar visual present
    expect(container.querySelector(".mc-bar")).not.toBeNull();
  });

  it("HONEST STATE: peer=null shows the dollar amount ONLY — no multiple, no baseline, no scale", () => {
    const { container } = render(<MedianChip raised={4_200_000} peer={null} />);
    // dollar amount is shown
    expect(screen.getByText("$4.2M")).toBeInTheDocument();
    // NO fabricated multiple / median word / scale bar
    expect(screen.queryByText(/×/)).toBeNull();
    expect(screen.queryByText("median")).toBeNull();
    expect(container.querySelector(".mc-bar")).toBeNull();
    expect(container.querySelector(".mc-tick")).toBeNull();
  });

  it("peer=null with no raised dollars shows the honest 'no median yet' pill", () => {
    render(<MedianChip raised={null} peer={null} />);
    expect(screen.getByText(/No median yet/)).toBeInTheDocument();
  });
});

describe("MoneyGapScale", () => {
  it("renders the full scale (axis, median flag, source) when a baseline exists", () => {
    const { container } = render(
      <MoneyGapScale
        subject={{ name: "Theo Vance", raised: 4_200_000, pip: "rep" }}
        peer={peer}
      />,
    );
    expect(screen.getByText("MEDIAN")).toBeInTheDocument();
    expect(screen.getByText("$1.4M")).toBeInTheDocument(); // the median amount
    expect(
      screen.getByText(/the typical U.S. House campaign/),
    ).toBeInTheDocument();
    expect(container.querySelector(".mgap-medline")).not.toBeNull();
    // aria-label carries the plain-language reading for SR users
    expect(
      screen.getByLabelText(
        /Theo Vance raised \$4\.2M, 3× times the median of \$1\.4M\./,
      ),
    ).toBeInTheDocument();
  });

  it("HONEST STATE: peer=null renders nothing (caller falls back to the dollar string)", () => {
    const { container } = render(
      <MoneyGapScale
        subject={{ name: "Theo Vance", raised: 4_200_000, pip: "rep" }}
        peer={null}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
