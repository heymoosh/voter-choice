// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { StateInfoCard } from "./StateInfoCard";
import type { StateElectionData } from "../types/election";

const futureDate = "2027-12-31";
const pastDate = "2020-01-01";

const mockState: StateElectionData = {
  stateCode: "TX",
  stateName: "Texas",
  lastUpdated: "2026-03-01",
  elections: [
    {
      id: "tx-2026-runoff",
      name: "2026 Texas Primary Runoff",
      date: "2026-05-26",
      type: "runoff",
      isPrimary: false,
      primaryType: null,
    },
  ],
  registration: {
    online: {
      available: true,
      deadline: futureDate,
      url: "https://votetexas.gov/register",
    },
    byMail: { deadline: futureDate, sincePostmarked: true },
    inPerson: { deadline: futureDate, sincePostmarked: false },
    sameDayRegistration: false,
    registrationCheckUrl: "https://teamrv-mvp.sos.texas.gov/MVP/mvp.do",
  },
  earlyVoting: {
    available: true,
    startDate: "2026-05-11",
    endDate: "2026-05-22",
    notes: "Hours vary by county",
  },
  votingRules: {
    idRequired: true,
    acceptedIds: ["Texas driver's license"],
    phonesAtPolls: "prohibited",
    phonesAtPollsDetail: "Phones prohibited in voting room.",
    additionalRules: [],
  },
  resources: {
    stateElectionWebsite: "https://www.votetexas.gov/",
    countyElectionLookup: "https://www.votetexas.gov/voting/where.html",
    sampleBallotLookup: "https://www.votetexas.gov/voting/ballot-board.html",
    pollingPlaceLookup: "https://www.votetexas.gov/voting/where.html",
  },
};

const noEarlyVotingState: StateElectionData = {
  ...mockState,
  earlyVoting: { available: false, startDate: null, endDate: null },
};

const allDeadlinesPassedState: StateElectionData = {
  ...mockState,
  registration: {
    ...mockState.registration,
    online: { ...mockState.registration.online, deadline: pastDate },
    byMail: { ...mockState.registration.byMail, deadline: pastDate },
    inPerson: { ...mockState.registration.inPerson, deadline: pastDate },
  },
};

describe("StateInfoCard", () => {
  it("renders state-info data-testid", () => {
    render(<StateInfoCard state={mockState} />);
    expect(screen.getByTestId("state-info")).toBeInTheDocument();
  });

  it("renders election-name with correct text", () => {
    render(<StateInfoCard state={mockState} />);
    expect(screen.getByTestId("election-name")).toHaveTextContent(
      "2026 Texas Primary Runoff",
    );
  });

  it("renders election-date", () => {
    render(<StateInfoCard state={mockState} />);
    expect(screen.getByTestId("election-date")).toBeInTheDocument();
    expect(screen.getByTestId("election-date").textContent).toBeTruthy();
  });

  it("renders registration-status container", () => {
    render(<StateInfoCard state={mockState} />);
    expect(screen.getByTestId("registration-status")).toBeInTheDocument();
  });

  it("shows early voting dates when available", () => {
    render(<StateInfoCard state={mockState} />);
    expect(screen.getByTestId("state-info").textContent).toContain(
      "2026-05-11",
    );
    expect(screen.getByTestId("state-info").textContent).toContain(
      "2026-05-22",
    );
  });

  it("shows absentee notice when early voting not available", () => {
    render(<StateInfoCard state={noEarlyVotingState} />);
    expect(screen.getByTestId("state-info").textContent).toContain("absentee");
  });

  it("shows all-deadlines-passed alert when all deadlines have passed", () => {
    render(<StateInfoCard state={allDeadlinesPassedState} />);
    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBeGreaterThan(0);
  });

  it("shows voter ID info when idRequired is true", () => {
    render(<StateInfoCard state={mockState} />);
    expect(screen.getByTestId("state-info").textContent).toContain(
      "Texas driver",
    );
  });

  it("shows county election office link", () => {
    render(<StateInfoCard state={mockState} />);
    const links = screen.getAllByRole("link");
    const countyLink = links.find((l) =>
      l.getAttribute("href")?.includes("where.html"),
    );
    expect(countyLink).toBeDefined();
  });
});
