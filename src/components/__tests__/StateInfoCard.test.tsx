import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StateInfoCard } from "../StateInfoCard";
import { loadStateData, computeRegistrationStatuses } from "../../lib/data";
import { getNextElection } from "../../lib/date-utils";

const today = new Date("2026-03-21");
const txData = loadStateData("TX")!;
const nextElection = getNextElection(txData.elections, today);
const regStatuses = computeRegistrationStatuses(txData.registration, today);

describe("StateInfoCard", () => {
  it("renders with data-testid='state-info'", () => {
    render(
      <StateInfoCard
        stateData={txData}
        nextElection={nextElection}
        regStatuses={regStatuses}
        today={today}
      />,
    );
    expect(screen.getByTestId("state-info")).toBeInTheDocument();
  });

  it("shows election name and date", () => {
    render(
      <StateInfoCard
        stateData={txData}
        nextElection={nextElection}
        regStatuses={regStatuses}
        today={today}
      />,
    );
    expect(screen.getByTestId("election-name")).toBeInTheDocument();
    expect(screen.getByTestId("election-date")).toBeInTheDocument();
  });

  it("shows registration status container", () => {
    render(
      <StateInfoCard
        stateData={txData}
        nextElection={nextElection}
        regStatuses={regStatuses}
        today={today}
      />,
    );
    expect(screen.getByTestId("registration-status")).toBeInTheDocument();
  });

  it("shows no-election-message when nextElection is null", () => {
    render(
      <StateInfoCard
        stateData={txData}
        nextElection={null}
        regStatuses={regStatuses}
        today={today}
      />,
    );
    expect(screen.getByTestId("no-election-message")).toBeInTheDocument();
  });

  it("shows all-deadlines-passed alert when allPassed is true", () => {
    render(
      <StateInfoCard
        stateData={txData}
        nextElection={nextElection}
        regStatuses={regStatuses}
        today={today}
      />,
    );
    // TX deadlines are all passed relative to 2026-03-21
    expect(
      screen.getByText(/Registration deadlines for this election have passed/i),
    ).toBeInTheDocument();
  });

  it("shows state name", () => {
    render(
      <StateInfoCard
        stateData={txData}
        nextElection={nextElection}
        regStatuses={regStatuses}
        today={today}
      />,
    );
    expect(screen.getAllByText(/Texas/).length).toBeGreaterThan(0);
  });
});
