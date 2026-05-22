// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { FunderBars } from "./FunderBars";
import type { DonorBucketSlice } from "../lib/structured-blocks";

/* ──────────────────────────────────────────────────────────────
 * FunderBars — phase 4 text-first contracts
 *
 * Per the packet:
 *   - The donor section always renders BOTH the stacked bar AND a
 *     top-3 list as text rows with dollar amounts. Bar alone is
 *     insufficient.
 *   - With bars hidden via CSS, the list still reads.
 *   - When no donor data is available, the component renders a
 *     "Donor data unavailable" message and no bar.
 * ────────────────────────────────────────────────────────────── */

const richFunders: DonorBucketSlice[] = [
  { label: "Real estate & development", percent: 45, amount: 240_000 },
  {
    label: "Small individual donors (under $200)",
    percent: 30,
    amount: 160_000,
  },
  { label: "Finance, banking & insurance", percent: 15, amount: 80_000 },
  { label: "Labor unions", percent: 10, amount: 50_000 },
];

const percentOnlyFunders: DonorBucketSlice[] = [
  { label: "Education advocacy", percent: 60 },
  { label: "Small individual donors", percent: 40 },
];

describe("FunderBars — text list + bar (rich mode)", () => {
  it("renders BOTH a stacked bar element AND a top-3 text list together", () => {
    render(<FunderBars funders={richFunders} totalRaised={530_000} />);
    // Stacked-bar visualization
    expect(screen.getByTestId("funder-bars-stacked-bar")).toBeInTheDocument();
    // Top-3 text list
    const list = screen.getByTestId("funder-bars-top-list");
    expect(list).toBeInTheDocument();
    // Top 3 names should be present in the list
    expect(list).toHaveTextContent("Real estate & development");
    expect(list).toHaveTextContent("Small individual donors (under $200)");
    expect(list).toHaveTextContent("Finance, banking & insurance");
  });

  it("top-3 text list always shows dollar amounts in rich mode", () => {
    render(<FunderBars funders={richFunders} totalRaised={530_000} />);
    const list = screen.getByTestId("funder-bars-top-list");
    // formatCurrencyShort renders $240K, $160K, $80K …
    expect(list).toHaveTextContent("$240K");
    expect(list).toHaveTextContent("$160K");
    expect(list).toHaveTextContent("$80K");
  });

  it("text list survives even when bars are hidden via CSS", () => {
    const { container } = render(
      <div style={{ visibility: "hidden" }}>
        <FunderBars funders={richFunders} totalRaised={530_000} />
      </div>,
    );
    // Even though the outer wrapper hides visually, queryable text
    // remains in the DOM — the list is load-bearing.
    expect(container.textContent).toMatch(/Real estate & development/);
    expect(container.textContent).toMatch(/\$240K/);
    expect(container.textContent).toMatch(/\$160K/);
    expect(container.textContent).toMatch(/\$80K/);
  });

  it("top-3 list caps at three entries even when more funders are provided", () => {
    render(<FunderBars funders={richFunders} totalRaised={530_000} />);
    const list = screen.getByTestId("funder-bars-top-list");
    // The 4th entry ("Labor unions") should NOT appear in the top-3 list.
    expect(list).not.toHaveTextContent("Labor unions");
  });
});

describe("FunderBars — text list (percent-only mode)", () => {
  it("renders names without dollar amounts when no amounts are present", () => {
    render(<FunderBars funders={percentOnlyFunders} />);
    const list = screen.getByTestId("funder-bars-top-list");
    expect(list).toHaveTextContent("Education advocacy");
    expect(list).toHaveTextContent("Small individual donors");
    // No "$" amounts should appear
    expect(list.textContent).not.toMatch(/\$/);
    // But percentages still read
    expect(list).toHaveTextContent("60%");
    expect(list).toHaveTextContent("40%");
  });
});

describe("FunderBars — donor data unavailable", () => {
  it("renders 'donor data unavailable' message when funders is an empty array", () => {
    render(<FunderBars funders={[]} />);
    expect(screen.getByText(/donor data unavailable/i)).toBeInTheDocument();
    // No stacked bar in this case
    expect(
      screen.queryByTestId("funder-bars-stacked-bar"),
    ).not.toBeInTheDocument();
  });

  it("renders 'donor data unavailable' message when funders is null", () => {
    render(<FunderBars funders={null as unknown as DonorBucketSlice[]} />);
    expect(screen.getByText(/donor data unavailable/i)).toBeInTheDocument();
    expect(
      screen.queryByTestId("funder-bars-stacked-bar"),
    ).not.toBeInTheDocument();
  });

  it("renders unavailable message with custom reason when provided", () => {
    render(
      <FunderBars
        funders={[]}
        unavailableReason="no FEC filings found for this candidate"
      />,
    );
    expect(
      screen.getByText(/no FEC filings found for this candidate/i),
    ).toBeInTheDocument();
  });
});
