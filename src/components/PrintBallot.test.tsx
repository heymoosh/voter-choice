// @vitest-environment jsdom
/**
 * PrintBallot — structure + business rules tests.
 *
 * Covers:
 *  - Polling header with all fields when pollingData is present
 *  - Polling fallback ("polling place not available — bring your ID and check
 *    sosgov" + USA.gov election-office link) when pollingData is null
 *  - Picks grouped by section in workspace order; section header per section
 *  - Each pick row: label + candidate name + party tag (when non-prop)
 *  - Why-note present → italic verbatim line; absent → no italic line
 *  - Proposition pick → no party tag rendered
 *  - Undecided races in "Decide at the polls" group at the bottom
 *  - Themes section: ordered list 1–N, names only, no quote text
 *  - Footer signature line present
 *  - window.print() invoked on Print click (happy path when not overflowing)
 *  - Print button carries .no-print class (hidden in print media)
 *  - Greyscale comprehension (structural): wrap in grayscale filter,
 *    every pick row's candidate + theme number remains text-queryable.
 *    jsdom does not render so `filter: grayscale(1)` has no visual effect;
 *    the assertion is text-presence, which is the right structural proxy
 *    for "no information is conveyed only by color."
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import {
  PrintBallot,
  type PrintBallotProps,
  type PollingDataShape,
} from "./PrintBallot";
import type { Decision } from "./BallotPane";
import type { Race } from "../lib/raceDeriver";
import type { Theme } from "../lib/prompts/types";

// ── scrollHeight mock helpers (kept under cap to enable Print) ──────

const originalDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollHeight",
);

function mockScrollHeight(px: number) {
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get: () => px,
  });
}

function restoreScrollHeight() {
  if (originalDescriptor) {
    Object.defineProperty(
      HTMLElement.prototype,
      "scrollHeight",
      originalDescriptor,
    );
  } else {
    delete (HTMLElement.prototype as unknown as Record<string, unknown>)
      .scrollHeight;
  }
}

afterEach(() => {
  restoreScrollHeight();
  vi.restoreAllMocks();
});

// ── Fixtures ─────────────────────────────────────────────────────────

const races: Race[] = [
  {
    id: "us-president",
    section: "Federal",
    label: "U.S. President",
    decided: true,
  },
  {
    id: "us-senate",
    section: "Federal",
    label: "U.S. Senate",
    decided: false,
  },
  { id: "governor", section: "State", label: "Governor", decided: true },
  {
    id: "prop-1",
    section: "Propositions",
    label: "Proposition 1",
    decided: true,
  },
];

const decisions: Decision[] = [
  {
    raceId: "us-president",
    raceLabel: "U.S. President",
    section: "Federal",
    pick: "Jane Doe",
    party: "Democratic",
    whyNote: "Trust her labor record",
  },
  {
    raceId: "governor",
    raceLabel: "Governor",
    section: "State",
    pick: "Carol Cain",
    party: "Democratic",
    whyNote: "",
  },
  {
    raceId: "prop-1",
    raceLabel: "Proposition 1",
    section: "Propositions",
    pick: "Yes",
    whyNote: "Critical infrastructure funding",
  },
];

const themes: Theme[] = [
  { name: "Healthcare costs", quotes: ["insulin keeps going up"] },
  { name: "Housing affordability", quotes: ["rent went up 30%"] },
  { name: "Climate action", quotes: ["floods every summer"] },
];

const fullPolling: PollingDataShape = {
  precinct: "Precinct 0207",
  pollingPlaceName: "Bayland Community Center",
  pollingPlaceAddress: "6400 Bissonnet St, Houston TX 77074",
  pollingHours: "7am – 7pm",
  whatToBring: "Government-issued photo ID",
  earlyVotingWindow: "Oct 20 – Oct 31",
};

function renderBallot(overrides: Partial<PrintBallotProps> = {}) {
  // Keep scrollHeight under the cap by default so structural tests don't
  // get bumped into the trim-prompt branch.
  mockScrollHeight(600);
  const props: PrintBallotProps = {
    decisions,
    themes,
    races,
    pollingData: fullPolling,
    cityState: "Harris County, Texas",
    electionLabel: "2026 General Election",
    electionDate: "2026-11-03",
    onBack: vi.fn(),
    ...overrides,
  };
  const result = render(<PrintBallot {...props} />);
  return { ...result, props };
}

// ── Tests ────────────────────────────────────────────────────────────

describe("PrintBallot — structure", () => {
  it("renders the outer .print-sheet wrapper with data-testid", () => {
    renderBallot();
    const sheet = screen.getByTestId("print-sheet");
    expect(sheet).toBeInTheDocument();
    expect(sheet).toHaveClass("print-sheet");
  });

  it("renders the polling header with all fields when pollingData is present", () => {
    renderBallot({ pollingData: fullPolling });
    // PR C — the voter-meta 4-cell grid now duplicates whatToBring +
    // earlyVotingWindow into a structured layout (Address / District /
    // Bring / Early voting). Scope these assertions to the polling-
    // header region so the duplication doesn't trip getByText's
    // single-match contract.
    const pollingHeader = screen.getByTestId("polling-header");
    const region = within(pollingHeader);
    expect(region.getByText(/Precinct 0207/)).toBeInTheDocument();
    expect(region.getByText(/Bayland Community Center/)).toBeInTheDocument();
    expect(
      region.getByText(/6400 Bissonnet St, Houston TX 77074/),
    ).toBeInTheDocument();
    expect(region.getByText(/7am – 7pm/)).toBeInTheDocument();
    expect(region.getByText(/Government-issued photo ID/)).toBeInTheDocument();
    expect(region.getByText(/Oct 20 – Oct 31/)).toBeInTheDocument();
  });

  it("renders polling fallback (text + USA.gov link) when pollingData is null", () => {
    renderBallot({ pollingData: null });
    const fallback = screen.getByTestId("polling-fallback");
    expect(fallback).toHaveTextContent(/polling place not available/i);
    expect(fallback).toHaveTextContent(/bring your ID/i);
    const link = fallback.querySelector("a");
    expect(link).toHaveAttribute("href", "https://www.usa.gov/election-office");
  });

  it("renders the voter meta: election label, date, and city + state", () => {
    renderBallot();
    expect(screen.getByText(/2026 General Election/)).toBeInTheDocument();
    // Fix 6 — date renders in human-readable form ("Nov 3, 2026") rather
    // than raw ISO ("2026-11-03"). The formatted date appears in both the
    // ph-head title ("My Ballot · Nov 3, 2026") and the election-meta
    // line beneath the meta grid, so we use getAllByText.
    expect(screen.getAllByText(/Nov 3, 2026/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Harris County, Texas/)).toBeInTheDocument();
  });

  it("Fix 5 — renders the ph-head 'My Ballot' title in the left column", () => {
    renderBallot();
    const phHeadTitle = screen.getByTestId("ph-head-title");
    // The title composes "My Ballot · <formatted date>" — verify both
    // the literal "My Ballot" and the human-readable date appear.
    expect(phHeadTitle).toHaveTextContent(/My Ballot/);
    expect(phHeadTitle).toHaveTextContent(/Nov 3, 2026/);
  });

  it("Fix 6 — election-meta line uses human-readable date, not raw ISO", () => {
    renderBallot();
    // The election-meta line should compose label + formatted date.
    const electionMeta = document.querySelector(
      ".print-sheet .election-meta",
    ) as HTMLElement | null;
    expect(electionMeta).not.toBeNull();
    expect(electionMeta).toHaveTextContent(/Nov 3, 2026/);
    // And NOT the raw ISO form.
    expect(electionMeta?.textContent ?? "").not.toContain("2026-11-03");
  });

  it("groups picks by section in workspace order: Federal → State → Propositions", () => {
    renderBallot();
    const list = screen.getByTestId("print-sheet");
    const groups = list.querySelectorAll('[data-testid^="ballot-group-"]');
    // Three decided sections + one undecided "decide-at-polls" group.
    // Order in the DOM should be Federal → State → Propositions →
    // (decide-at-polls).
    const ids = Array.from(groups).map((g) => g.getAttribute("data-testid"));
    const decidedSections = ids.filter(
      (id) => id !== "ballot-group-decide-at-polls",
    );
    expect(decidedSections).toEqual([
      "ballot-group-Federal",
      "ballot-group-State",
      "ballot-group-Propositions",
    ]);
  });

  it("each non-prop pick row shows label + candidate name + party tag", () => {
    renderBallot();
    const row = screen.getByTestId("pick-row-us-president");
    expect(row).toHaveTextContent(/U\.S\. President/);
    expect(row).toHaveTextContent(/Jane Doe/);
    const partyTag = screen.getByTestId("party-tag-us-president");
    expect(partyTag).toBeInTheDocument();
    expect(partyTag).toHaveTextContent(/Democratic/);
  });

  it("prop pick row renders no party tag (party-tag-{raceId} absent)", () => {
    renderBallot();
    const row = screen.getByTestId("pick-row-prop-1");
    expect(row).toBeInTheDocument();
    expect(screen.queryByTestId("party-tag-prop-1")).toBeNull();
  });

  it("why-note present → italic verbatim line rendered with the raw text", () => {
    renderBallot();
    const why = screen.getByTestId("why-note-us-president");
    expect(why).toHaveTextContent("Trust her labor record");
    const styles = window.getComputedStyle(why);
    expect(styles.fontStyle).toBe("italic");
  });

  it("why-note absent → no italic line, no empty placeholder", () => {
    renderBallot();
    // governor has empty whyNote; the why-note testid must NOT exist for it.
    expect(screen.queryByTestId("why-note-governor")).toBeNull();
  });

  it("renders the 'Decide at the polls' group at the bottom of the ballot list", () => {
    renderBallot();
    const undecidedGroup = screen.getByTestId("decide-at-polls-group");
    expect(undecidedGroup).toBeInTheDocument();
    // The single undecided race (us-senate) should be listed by label.
    expect(undecidedGroup).toHaveTextContent(/U\.S\. Senate/);
    // Confirm DOM order: the undecided group must appear AFTER every
    // decided ballot-group-* element in the print sheet.
    const sheet = screen.getByTestId("print-sheet");
    const allGroups = Array.from(
      sheet.querySelectorAll('[data-testid^="ballot-group-"]'),
    );
    const undecidedIdx = allGroups.findIndex(
      (g) => g.getAttribute("data-testid") === "ballot-group-decide-at-polls",
    );
    expect(undecidedIdx).toBe(allGroups.length - 1);
  });

  it("decide-at-polls group is omitted when every race is decided", () => {
    const allDecided: Decision[] = [
      ...decisions,
      {
        raceId: "us-senate",
        raceLabel: "U.S. Senate",
        section: "Federal",
        pick: "Sam Smith",
        party: "Democratic",
        whyNote: "",
      },
    ];
    const allRacesDecided: Race[] = races.map((r) => ({
      ...r,
      decided: true,
    }));
    renderBallot({ decisions: allDecided, races: allRacesDecided });
    expect(screen.queryByTestId("decide-at-polls-group")).toBeNull();
  });

  it("renders the themes ordered list with 1..N entries containing names only (no quotes)", () => {
    renderBallot();
    const list = screen.getByTestId("themes-list");
    expect(list.tagName).toBe("OL");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(themes.length);
    items.forEach((li, i) => {
      expect(li).toHaveTextContent(themes[i].name);
    });
    // None of the supporting quote text should leak onto the printable.
    themes.forEach((t) => {
      t.quotes.forEach((q) => {
        expect(list).not.toHaveTextContent(q);
      });
    });
  });

  it("themes section is omitted when there are zero themes", () => {
    renderBallot({ themes: [] });
    expect(screen.queryByTestId("themes-list")).toBeNull();
  });

  it("renders the footer with brand line and signature line", () => {
    renderBallot();
    const sheet = screen.getByTestId("print-sheet");
    expect(sheet).toHaveTextContent(/Built with Voter Choice/i);
    expect(sheet).toHaveTextContent(/Free · non-partisan · voterchoice\.app/);
    expect(sheet).toHaveTextContent(/Signed at the booth/i);
  });

  it("Back to ballot button fires onBack callback", () => {
    const onBack = vi.fn();
    renderBallot({ onBack });
    fireEvent.click(screen.getByTestId("back-button"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("Print/Back buttons have .no-print class so @media print hides them", () => {
    renderBallot();
    expect(screen.getByTestId("print-button")).toHaveClass("no-print");
    expect(screen.getByTestId("back-button")).toHaveClass("no-print");
  });

  it("happy-path: window.print() invoked once on Print click when not overflowing", async () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    renderBallot();
    await waitFor(() => {
      expect(screen.getByTestId("print-button")).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId("print-button"));
    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it("greyscale comprehension (structural): every pick name and theme number is text-queryable inside a grayscale wrapper", () => {
    mockScrollHeight(600);
    const { container } = render(
      <div style={{ filter: "grayscale(1)" }}>
        <PrintBallot
          decisions={decisions}
          themes={themes}
          races={races}
          pollingData={fullPolling}
          cityState="Harris County, Texas"
          electionLabel="2026 General Election"
          electionDate="2026-11-03"
          onBack={vi.fn()}
        />
      </div>,
    );
    // Pick names — proves the printable reads names, not color cues.
    expect(within(container).getByText(/Jane Doe/)).toBeInTheDocument();
    expect(within(container).getByText(/Carol Cain/)).toBeInTheDocument();
    // Theme numbers (1./2./3.) — proves the rank order is textual.
    const themesList = within(container).getByTestId("themes-list");
    const items = within(themesList).getAllByRole("listitem");
    items.forEach((li, i) => {
      expect(li).toHaveTextContent(`${i + 1}`);
    });
  });

  it("section header appears exactly once per section", () => {
    renderBallot();
    const sheet = screen.getByTestId("print-sheet");
    const federalHeaders = sheet.querySelectorAll("h3");
    const headerTexts = Array.from(federalHeaders).map((h) =>
      (h.textContent ?? "").trim(),
    );
    expect(headerTexts.filter((t) => t === "Federal")).toHaveLength(1);
    expect(headerTexts.filter((t) => t === "State")).toHaveLength(1);
    expect(headerTexts.filter((t) => t === "Propositions")).toHaveLength(1);
  });
});
