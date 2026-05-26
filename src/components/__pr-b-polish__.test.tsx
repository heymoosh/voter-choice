// @vitest-environment jsdom
/**
 * PR B — Redesign polish: de-mono CTAs, cold-open card layout, chat bubble
 * shapes (regression pin), workspace grid (regression pin), .co-context
 * breadcrumb.
 *
 * This file consolidates the new visual-regression assertions added in PR B
 * so the diff is small and reviewable. Component-internal assertions live
 * in their own component test files; this file pins the
 * cross-component PR-B contract.
 *
 * Per prototype CSS (docs/design-source-of-truth/2026-redesign/prototype):
 *  - Primary CTAs (.addr-card .go, .co-input .send, ws print/save) are
 *    sans 14.5px font-weight 600, NOT mono uppercase.
 *  - Mono uppercase is reserved for eyebrow labels, section dividers,
 *    "Voter Choice  AI" speaker labels, and similar meta micro-labels.
 *  - Chat bubbles use asymmetric border-radius: user
 *    14px 14px 4px 14px, AI 4px 14px 14px 14px.
 *  - Workspace grid columns: 240px 1fr 380px.
 *  - .co-context breadcrumb above the cold-open chat = mono micro-label
 *    with the user's anchored location.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ZipForm } from "./ZipForm";
import { BallotPane, type BallotPaneProps, type Decision } from "./BallotPane";
import { ColdOpenInput } from "./ColdOpenInput";
import { WorkspaceRail } from "./WorkspaceRail";
import { ChatPanel } from "./ChatPanel";
import { LanguageProvider } from "../lib/i18n";
import type { Race } from "../lib/raceDeriver";
import type { Theme } from "../lib/prompts/types";
import type { StateElectionData } from "../types/election";

/* -- ZipForm: primary CTA de-mono + new copy ------------- */

describe("PR B / ZipForm primary CTA", () => {
  it("EN submit button reads 'Pull my ballot' (prototype copy, not 'View Ballot')", () => {
    render(<ZipForm onSubmit={vi.fn()} />);
    const submit = screen.getByTestId("zip-submit");
    expect(submit.textContent ?? "").toContain("Pull my ballot");
    expect(submit.textContent ?? "").not.toMatch(/view ballot/i);
  });

  it("submit button is sentence-case sans, NOT mono-uppercase", () => {
    render(<ZipForm onSubmit={vi.fn()} />);
    const submit = screen.getByTestId("zip-submit");
    const className = submit.className;
    expect(className).not.toMatch(/font-mono/);
    expect(className).not.toMatch(/uppercase/);
  });
});

/* -- BallotPane: workspace exports de-mono --------------- */

const ballotPaneRaces: Race[] = [
  {
    id: "us-president",
    section: "Federal",
    label: "U.S. President",
    decided: true,
  },
];
const ballotPaneDecisions: Decision[] = [
  {
    raceId: "us-president",
    raceLabel: "U.S. President",
    section: "Federal",
    pick: "Jane Doe",
    party: "D",
    whyNote: "labor",
  },
];
function renderBallotPane(overrides: Partial<BallotPaneProps> = {}) {
  const props: BallotPaneProps = {
    decisions: ballotPaneDecisions,
    totalRaces: 1,
    races: ballotPaneRaces,
    cityState: "Houston, TX",
    hasPolling: false,
    activeRaceId: null,
    onPrint: vi.fn(),
    onSaveProfile: vi.fn(),
    onHandoff: vi.fn(),
    ...overrides,
  };
  return render(<BallotPane {...props} />);
}

describe("PR B / BallotPane export buttons de-mono", () => {
  it("Print button is sentence-case sans, NOT mono-uppercase", () => {
    renderBallotPane();
    const btn = screen.getByTestId("ballot-pane-print");
    expect(btn.className).not.toMatch(/font-mono/);
    expect(btn.className).not.toMatch(/uppercase/);
  });

  it("Save profile button is sentence-case sans, NOT mono-uppercase", () => {
    renderBallotPane();
    const btn = screen.getByTestId("ballot-pane-save-profile");
    expect(btn.className).not.toMatch(/font-mono/);
    expect(btn.className).not.toMatch(/uppercase/);
  });

  it("Continue in another chatbot button is sentence-case sans, NOT mono-uppercase", () => {
    renderBallotPane();
    const btn = screen.getByTestId("ballot-pane-handoff");
    expect(btn.className).not.toMatch(/font-mono/);
    expect(btn.className).not.toMatch(/uppercase/);
  });

  it("section eyebrow labels keep mono uppercase (regression pin)", () => {
    renderBallotPane();
    const headerLabel = screen.getByText("Federal");
    expect(headerLabel.className).toMatch(/font-mono/);
    expect(headerLabel.className).toMatch(/uppercase/);
  });
});

/* -- ColdOpenInput: card layout reshape ------------------- */

function renderColdOpen() {
  return render(
    <LanguageProvider>
      <ColdOpenInput onSubmit={vi.fn()} onStarterProfileLoaded={vi.fn()} />
    </LanguageProvider>,
  );
}

describe("PR B / ColdOpenInput card layout", () => {
  it("Send button is a text button reading 'Send', NOT an icon-only SVG", () => {
    renderColdOpen();
    const send = screen.getByTestId("cold-open-send");
    expect(send.textContent?.trim() ?? "").toMatch(/^Send/);
  });

  it("Send button is sentence-case sans, NOT mono-uppercase", () => {
    renderColdOpen();
    const send = screen.getByTestId("cold-open-send");
    expect(send.className).not.toMatch(/font-mono/);
    expect(send.className).not.toMatch(/uppercase/);
  });

  it("renders the auto-saving privacy hint", () => {
    renderColdOpen();
    expect(
      screen.getByTestId("cold-open-auto-saving-hint"),
    ).toBeInTheDocument();
  });

  it("chips render OUTSIDE the textarea card, below the input", () => {
    renderColdOpen();
    const card = screen.getByTestId("cold-open-input");
    const exampleChip = screen.getByTestId("cold-open-show-example");
    const starterChip = screen.getByTestId("cold-open-use-starter-profile");
    expect(card.contains(exampleChip)).toBe(false);
    expect(card.contains(starterChip)).toBe(false);
  });

  it("chips are sentence-case sans, NOT mono-uppercase", () => {
    renderColdOpen();
    const exampleChip = screen.getByTestId("cold-open-show-example");
    const starterChip = screen.getByTestId("cold-open-use-starter-profile");
    expect(exampleChip.className).not.toMatch(/font-mono/);
    expect(exampleChip.className).not.toMatch(/uppercase/);
    expect(starterChip.className).not.toMatch(/font-mono/);
    expect(starterChip.className).not.toMatch(/uppercase/);
  });

  it("textarea sits ABOVE the meta row inside the card (textarea-on-top)", () => {
    renderColdOpen();
    const card = screen.getByTestId("cold-open-input");
    const textarea = screen.getByTestId("cold-open-textarea");
    const hint = screen.getByTestId("cold-open-auto-saving-hint");
    expect(card.contains(textarea)).toBe(true);
    expect(card.contains(hint)).toBe(true);
    const position = textarea.compareDocumentPosition(hint);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

/* -- ChatPanel: cold-open .co-context breadcrumb + AI opener --- */

const stubState: StateElectionData = {
  stateCode: "NJ",
  stateName: "New Jersey",
  lastUpdated: "2026-03-01",
  elections: [
    {
      id: "nj-general",
      name: "2026 General Election",
      date: "2026-11-03",
      type: "general",
      isPrimary: false,
      primaryType: null,
    },
  ],
  registration: {
    online: { available: false, deadline: "", url: "" },
    byMail: { deadline: "", sincePostmarked: false },
    inPerson: { deadline: "", sincePostmarked: false },
    sameDayRegistration: false,
    registrationCheckUrl: "",
  },
  earlyVoting: { available: false, startDate: "", endDate: "" },
  votingRules: {
    idRequired: false,
    acceptedIds: [],
    phonesAtPolls: "prohibited",
    phonesAtPollsDetail: "",
    additionalRules: [],
  },
  resources: {
    stateElectionWebsite: "",
    countyElectionLookup: "",
    sampleBallotLookup: "",
    pollingPlaceLookup: "",
  },
};

describe("PR B / ChatPanel cold-open breadcrumb", () => {
  it("renders a .co-context breadcrumb above the cold-open card", () => {
    render(
      <LanguageProvider>
        <ChatPanel
          state={stubState}
          zipCode="08106"
          countyName="Camden County"
          promptFleetV2Enabled
          coldOpenContext={{
            cityState: "Camden County, NJ",
            district: "NJ-1",
            raceCount: 6,
          }}
        />
      </LanguageProvider>,
    );
    const breadcrumb = screen.getByTestId("co-context-breadcrumb");
    expect(breadcrumb).toBeInTheDocument();
    expect(breadcrumb.textContent ?? "").toContain("Camden County");
    expect(breadcrumb.textContent ?? "").toMatch(/6 races/);
  });

  it("renders the static AI opener bubble above the cold-open input", () => {
    render(
      <LanguageProvider>
        <ChatPanel
          state={stubState}
          zipCode="08106"
          countyName="Camden County"
          promptFleetV2Enabled
          coldOpenContext={{
            cityState: "Camden County, NJ",
            district: "NJ-1",
            raceCount: 6,
          }}
        />
      </LanguageProvider>,
    );
    expect(screen.getByTestId("cold-open-ai-opener")).toBeInTheDocument();
  });
});

/* -- WorkspaceRail: progress bar civic-green pin --------- */

describe("PR B / WorkspaceRail progress bar (regression pin)", () => {
  it("progress fill is civic-green, not ink-black", () => {
    const races: Race[] = [
      { id: "r1", section: "Federal", label: "R1", decided: true },
      { id: "r2", section: "Federal", label: "R2", decided: false },
    ];
    const themes: Theme[] = [];
    render(
      <WorkspaceRail
        decidedCount={1}
        totalRaces={2}
        themes={themes}
        races={races}
        activeRaceId="r2"
        onSelectRace={vi.fn()}
        onEditThemes={vi.fn()}
        onRestart={vi.fn()}
      />,
    );
    const progressbar = screen.getByRole("progressbar", {
      name: /ballot progress/i,
    });
    const fill = progressbar.firstElementChild as HTMLElement;
    expect(fill).toBeTruthy();
    expect(fill.className).toContain("bg-civic");
    expect(fill.className).not.toContain("bg-ink");
  });
});
