// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { BallotLookupNeeded } from "./BallotLookupNeeded";
import type { StateElectionData } from "../types/election";

/* ── Fixtures ─────────────────────────────────────────────── */

const txState: StateElectionData = {
  stateCode: "TX",
  stateName: "Texas",
  lastUpdated: "2026-03-01",
  elections: [
    {
      id: "tx-2026-general",
      name: "2026 Texas General",
      date: "2026-11-03",
      type: "general",
      isPrimary: false,
      primaryType: null,
    },
  ],
  registration: {
    online: {
      available: true,
      deadline: "2026-10-05",
      url: "https://www.votetexas.gov/",
    },
    byMail: { deadline: "2026-10-05", sincePostmarked: true },
    inPerson: { deadline: "2026-10-05", sincePostmarked: false },
    sameDayRegistration: false,
    registrationCheckUrl: "https://teamrv-mvp.sos.texas.gov/MVP/mvp.do",
  },
  earlyVoting: {
    available: true,
    startDate: "2026-10-19",
    endDate: "2026-10-30",
  },
  votingRules: {
    idRequired: true,
    acceptedIds: ["Texas driver's license"],
    phonesAtPolls: "prohibited",
    phonesAtPollsDetail: "Phones prohibited.",
    additionalRules: [],
  },
  runoffRules: {
    hasRunoff: false,
    partyLockedToFirstRoundPrimary: false,
  },
  resources: {
    stateElectionWebsite: "https://www.votetexas.gov/",
    countyElectionLookup: "https://www.votetexas.gov/voting/where.html",
    sampleBallotLookup: "https://www.votetexas.gov/voting/ballot-board.html",
    pollingPlaceLookup: "https://www.votetexas.gov/voting/where.html",
  },
  countyResources: {
    "Travis County": {
      name: "Travis County",
      ballotLookup: "https://countyclerk.traviscountytx.gov/sample-ballot",
      ballotLookupInstructions:
        "Enter your voter registration ID to view your sample ballot.",
      pollingPlaces: "https://countyclerk.traviscountytx.gov/polling-places",
      earlyVotingLocations:
        "https://countyclerk.traviscountytx.gov/early-voting",
      electionsWebsite: "https://countyclerk.traviscountytx.gov/",
    },
  },
};

afterEach(() => {
  cleanup();
});

/* ── Tests ────────────────────────────────────────────────── */

describe("BallotLookupNeeded — Civic-empty routing surface (fix D)", () => {
  it("renders the wrapper, heading, state link, county link, textarea, and submit button", () => {
    render(
      <BallotLookupNeeded
        state={txState}
        county="Travis County"
        onBallotConfirmed={vi.fn()}
      />,
    );

    expect(screen.getByTestId("ballot-lookup-needed")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /couldn.t auto-confirm/i }),
    ).toBeInTheDocument();

    const stateLink = screen.getByTestId("ballot-lookup-link-state");
    expect(stateLink).toHaveAttribute(
      "href",
      txState.resources.sampleBallotLookup,
    );
    expect(stateLink.textContent ?? "").toMatch(/Texas/);

    const countyLink = screen.getByTestId("ballot-lookup-link-county");
    expect(countyLink).toHaveAttribute(
      "href",
      txState.countyResources!["Travis County"].ballotLookup,
    );
    expect(countyLink.textContent ?? "").toMatch(/Travis County/);

    expect(screen.getByTestId("ballot-lookup-textarea")).toBeInTheDocument();
    expect(screen.getByTestId("ballot-lookup-confirm")).toBeInTheDocument();
  });

  it("submit button is disabled while textarea is empty", () => {
    render(<BallotLookupNeeded state={txState} onBallotConfirmed={vi.fn()} />);
    const btn = screen.getByTestId("ballot-lookup-confirm");
    expect(btn).toBeDisabled();
  });

  it("typing into the textarea enables the submit button", () => {
    render(<BallotLookupNeeded state={txState} onBallotConfirmed={vi.fn()} />);
    const textarea = screen.getByTestId("ballot-lookup-textarea");
    const btn = screen.getByTestId("ballot-lookup-confirm");
    fireEvent.change(textarea, {
      target: { value: "U.S. Senate: John Doe (D)\nGovernor: Jane Smith (R)" },
    });
    expect(btn).toBeEnabled();
  });

  it("clicking Use this ballot fires onBallotConfirmed with the textarea contents", () => {
    const onBallotConfirmed = vi.fn();
    render(
      <BallotLookupNeeded
        state={txState}
        onBallotConfirmed={onBallotConfirmed}
      />,
    );
    const textarea = screen.getByTestId("ballot-lookup-textarea");
    const text = "U.S. Senate: John Doe (D)\nGovernor: Jane Smith (R)";
    fireEvent.change(textarea, { target: { value: text } });
    fireEvent.click(screen.getByTestId("ballot-lookup-confirm"));
    expect(onBallotConfirmed).toHaveBeenCalledTimes(1);
    expect(onBallotConfirmed).toHaveBeenCalledWith(text);
  });

  it("trims whitespace before submitting", () => {
    const onBallotConfirmed = vi.fn();
    render(
      <BallotLookupNeeded
        state={txState}
        onBallotConfirmed={onBallotConfirmed}
      />,
    );
    const textarea = screen.getByTestId("ballot-lookup-textarea");
    fireEvent.change(textarea, {
      target: { value: "   U.S. Senate: John Doe (D)   \n\n" },
    });
    fireEvent.click(screen.getByTestId("ballot-lookup-confirm"));
    expect(onBallotConfirmed).toHaveBeenCalledWith("U.S. Senate: John Doe (D)");
  });

  it("submit button is disabled when textarea contains only whitespace", () => {
    render(<BallotLookupNeeded state={txState} onBallotConfirmed={vi.fn()} />);
    const textarea = screen.getByTestId("ballot-lookup-textarea");
    fireEvent.change(textarea, { target: { value: "   \n\t  " } });
    expect(screen.getByTestId("ballot-lookup-confirm")).toBeDisabled();
  });

  it("falls back to the state's countyElectionLookup when county is missing", () => {
    render(<BallotLookupNeeded state={txState} onBallotConfirmed={vi.fn()} />);
    const countyLink = screen.getByTestId("ballot-lookup-link-county");
    expect(countyLink).toHaveAttribute(
      "href",
      txState.resources.countyElectionLookup,
    );
  });

  it("falls back to countyElectionLookup when county is provided but absent from countyResources", () => {
    render(
      <BallotLookupNeeded
        state={txState}
        county="Other County"
        onBallotConfirmed={vi.fn()}
      />,
    );
    const countyLink = screen.getByTestId("ballot-lookup-link-county");
    expect(countyLink).toHaveAttribute(
      "href",
      txState.resources.countyElectionLookup,
    );
  });

  it("renders the upload file input", () => {
    render(<BallotLookupNeeded state={txState} onBallotConfirmed={vi.fn()} />);
    expect(screen.getByTestId("ballot-lookup-upload")).toBeInTheDocument();
  });

  it("loading a .txt file populates the textarea with its contents", async () => {
    render(<BallotLookupNeeded state={txState} onBallotConfirmed={vi.fn()} />);
    const fileInput = screen.getByTestId(
      "ballot-lookup-upload",
    ) as HTMLInputElement;
    const fileText =
      "MY SAMPLE BALLOT\n\nU.S. Senate: John Doe (D)\nGovernor: Jane Smith (R)";
    const file = new File([fileText], "ballot.txt", { type: "text/plain" });

    // Override FileReader for jsdom — its built-in version doesn't always
    // dispatch onload synchronously in test environments. Mock it.
    const originalFileReader = window.FileReader;
    class MockFileReader {
      public result: string | null = null;
      public onload: ((ev: { target: { result: string } }) => void) | null =
        null;
      readAsText(blob: Blob) {
        void blob;
        this.result = fileText;
        setTimeout(() => {
          this.onload?.({ target: { result: fileText } });
        }, 0);
      }
    }
    (window as unknown as { FileReader: typeof MockFileReader }).FileReader =
      MockFileReader as unknown as typeof FileReader;

    try {
      fireEvent.change(fileInput, { target: { files: [file] } });
      // Wait for the FileReader microtask
      await new Promise((r) => setTimeout(r, 10));
      const textarea = screen.getByTestId(
        "ballot-lookup-textarea",
      ) as HTMLTextAreaElement;
      expect(textarea.value).toContain("U.S. Senate: John Doe (D)");
    } finally {
      window.FileReader = originalFileReader;
    }
  });
});

describe("BallotLookupNeeded — PDF upload (live bug 2)", () => {
  it("file input accept attribute includes .pdf and application/pdf", () => {
    render(<BallotLookupNeeded state={txState} onBallotConfirmed={vi.fn()} />);
    const input = screen.getByTestId(
      "ballot-lookup-upload",
    ) as HTMLInputElement;
    const accept = input.getAttribute("accept") ?? "";
    expect(accept).toMatch(/\.pdf/);
    expect(accept).toMatch(/application\/pdf/);
    // .txt support is still there.
    expect(accept).toMatch(/\.txt/);
  });

  it("upload button label reflects both .txt and .pdf support", () => {
    render(<BallotLookupNeeded state={txState} onBallotConfirmed={vi.fn()} />);
    expect(screen.getByText(/\.txt or \.pdf/i)).toBeInTheDocument();
  });

  it("rejects unsupported file types with a friendly error", () => {
    render(<BallotLookupNeeded state={txState} onBallotConfirmed={vi.fn()} />);
    const input = screen.getByTestId(
      "ballot-lookup-upload",
    ) as HTMLInputElement;
    const bogus = new File(["not a ballot"], "image.png", {
      type: "image/png",
    });
    fireEvent.change(input, { target: { files: [bogus] } });
    expect(
      screen.getByTestId("ballot-lookup-upload-error"),
    ).toBeInTheDocument();
  });
});

describe("BallotLookupNeeded — accessibility / copy", () => {
  it("includes copy explaining that Civic data was incomplete and instructing what to do", () => {
    render(
      <BallotLookupNeeded
        state={txState}
        county="Travis County"
        onBallotConfirmed={vi.fn()}
      />,
    );
    const wrapper = screen.getByTestId("ballot-lookup-needed");
    expect(wrapper.textContent ?? "").toMatch(/paste|upload/i);
    expect(wrapper.textContent ?? "").toMatch(/ballot/i);
  });

  it("surfaces county-specific instructions when present", () => {
    render(
      <BallotLookupNeeded
        state={txState}
        county="Travis County"
        onBallotConfirmed={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/Enter your voter registration ID/i),
    ).toBeInTheDocument();
  });
});
