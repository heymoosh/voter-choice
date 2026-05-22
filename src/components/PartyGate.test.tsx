// @vitest-environment jsdom
/**
 * Tests for PartyGate — the data-driven state party-eligibility gate.
 *
 * Discipline: the component renders the same shape every time, populated
 * from data. There is NO `if (state === "TX")` branching inside the
 * component source. The source-grep test at the bottom of this file
 * mechanically enforces that.
 *
 * See .ai/work-packets/redesign-phase-5-state-party-gates.md.
 */

import fs from "fs";
import path from "path";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PartyGate } from "./PartyGate";
import type { StateRule } from "../lib/state-rules/types";

const TX_RUNOFF_RULE: StateRule = {
  state: "TX",
  electionType: "runoff",
  category: "semi-closed",
  statute: {
    code: "Tex. Elec. Code §172.087",
    text: "If you voted in one party's March primary, you may only vote in that same party's runoff.",
    url: "https://statutes.capitol.texas.gov/Docs/EL/htm/EL.172.htm",
  },
  options: [
    {
      id: "voted_dem_primary",
      label: "I voted in the Democratic primary.",
      ballotTag: "DEM-runoff",
    },
    {
      id: "voted_rep_primary",
      label: "I voted in the Republican primary.",
      ballotTag: "REP-runoff",
    },
    {
      id: "did_not_vote_dem_runoff",
      label: "I did not vote in the primary. Show me the Democratic runoff.",
      ballotTag: "DEM-runoff-open",
    },
    {
      id: "did_not_vote_rep_runoff",
      label: "I did not vote in the primary. Show me the Republican runoff.",
      ballotTag: "REP-runoff-open",
    },
    {
      id: "unsure",
      label: "I'm not sure. Help me figure out which runoff applies.",
      ballotTag: "UNSURE",
      clarification: true,
    },
  ],
};

const PA_PRIMARY_RULE: StateRule = {
  state: "PA",
  electionType: "primary",
  category: "closed",
  statute: {
    code: "25 Pa. Code §2812",
    text: "Pennsylvania primary elections are closed: you may vote only in the primary of the party you registered with.",
    url: "https://www.pacode.com/secure/data/025/chapter183/chap183toc.html",
  },
  options: [
    {
      id: "registered_dem",
      label: "I'm registered as a Democrat.",
      ballotTag: "DEM-primary",
    },
    {
      id: "registered_rep",
      label: "I'm registered as a Republican.",
      ballotTag: "REP-primary",
    },
  ],
  unaffiliatedPath: {
    message:
      "Pennsylvania closes its primaries to registered party members. If you are not registered with a party, you cannot vote in this primary.",
    reregistrationUrl: "https://www.pa.gov/agencies/vote/register-to-vote.html",
    canSkipToGeneral: true,
  },
};

describe("PartyGate — TX runoff", () => {
  it("renders 5 radio options and the statute citation", () => {
    render(
      <PartyGate
        rule={TX_RUNOFF_RULE}
        electionDate="2026-05-25"
        electionLabel="2026 Texas Primary Runoff"
        onSelect={() => {}}
      />,
    );

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(5);

    // Statute citation surfaced.
    expect(screen.getByText(/Tex\. Elec\. Code §172\.087/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /If you voted in one party's March primary, you may only vote in that same party's runoff\./,
      ),
    ).toBeInTheDocument();
    // URL rendered as a link.
    const link = screen.getByRole("link", { name: /Tex\. Elec\. Code/i });
    expect(link).toHaveAttribute(
      "href",
      "https://statutes.capitol.texas.gov/Docs/EL/htm/EL.172.htm",
    );
  });

  it("disables the Continue button until a selection is made", () => {
    render(
      <PartyGate
        rule={TX_RUNOFF_RULE}
        electionDate="2026-05-25"
        electionLabel="2026 Texas Primary Runoff"
        onSelect={() => {}}
      />,
    );
    const continueBtn = screen.getByTestId("party-gate-continue");
    expect(continueBtn).toBeDisabled();
    fireEvent.click(screen.getByTestId("party-gate-option-voted_dem_primary"));
    expect(continueBtn).not.toBeDisabled();
  });

  it("fires onSelect with the BallotContext when Continue is clicked", () => {
    const onSelect = vi.fn();
    render(
      <PartyGate
        rule={TX_RUNOFF_RULE}
        county="Harris"
        electionDate="2026-05-25"
        electionLabel="2026 Texas Primary Runoff"
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByTestId("party-gate-option-voted_dem_primary"));
    fireEvent.click(screen.getByTestId("party-gate-continue"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith({
      state: "TX",
      county: "Harris",
      ballotTag: "DEM-runoff",
      electionDate: "2026-05-25",
      electionLabel: "2026 Texas Primary Runoff",
    });
  });

  it("fires onClarificationStart when 'I'm not sure' is selected + Continue", () => {
    const onClarificationStart = vi.fn();
    const onSelect = vi.fn();
    render(
      <PartyGate
        rule={TX_RUNOFF_RULE}
        electionDate="2026-05-25"
        electionLabel="2026 Texas Primary Runoff"
        onSelect={onSelect}
        onClarificationStart={onClarificationStart}
      />,
    );
    fireEvent.click(screen.getByTestId("party-gate-option-unsure"));
    fireEvent.click(screen.getByTestId("party-gate-continue"));
    expect(onClarificationStart).toHaveBeenCalledTimes(1);
    expect(onClarificationStart).toHaveBeenCalledWith("TX");
    // onSelect is NOT fired for clarification rows — that's the contract.
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("shows an inline placeholder + disables Continue when 'I'm not sure' is selected without an onClarificationStart handler", () => {
    const onSelect = vi.fn();
    render(
      <PartyGate
        rule={TX_RUNOFF_RULE}
        electionDate="2026-05-25"
        electionLabel="2026 Texas Primary Runoff"
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByTestId("party-gate-option-unsure"));
    expect(
      screen.getByTestId("party-gate-clarification-placeholder"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("party-gate-continue")).toBeDisabled();
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("PartyGate — PA closed primary", () => {
  it("renders DEM/REP registration options + an 'I'm not registered' option exposing the unaffiliated panel", () => {
    render(
      <PartyGate
        rule={PA_PRIMARY_RULE}
        electionDate="2026-05-19"
        electionLabel="2026 Pennsylvania Primary"
        onSelect={() => {}}
      />,
    );
    // DEM + REP options plus the synthesized unaffiliated row = 3 radios.
    const radios = screen.getAllByRole("radio");
    expect(radios.length).toBeGreaterThanOrEqual(3);
    // Statute citation surfaced.
    expect(screen.getByText(/25 Pa\. Code §2812/)).toBeInTheDocument();
    // Unaffiliated panel is hidden until the user selects that row.
    expect(
      screen.queryByText(/cannot vote in this primary/i),
    ).not.toBeInTheDocument();
  });

  it("shows the 'you cannot vote this primary' panel with re-reg link when user picks unaffiliated", () => {
    render(
      <PartyGate
        rule={PA_PRIMARY_RULE}
        electionDate="2026-05-19"
        electionLabel="2026 Pennsylvania Primary"
        onSelect={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId("party-gate-option-unaffiliated"));
    expect(
      screen.getByText(/cannot vote in this primary/i),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /register/i });
    expect(link).toHaveAttribute(
      "href",
      "https://www.pa.gov/agencies/vote/register-to-vote.html",
    );
  });

  it("'Skip primary, show general' fires onSelect with ballotTag='GENERAL'", () => {
    const onSelect = vi.fn();
    render(
      <PartyGate
        rule={PA_PRIMARY_RULE}
        electionDate="2026-05-19"
        electionLabel="2026 Pennsylvania Primary"
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByTestId("party-gate-option-unaffiliated"));
    fireEvent.click(screen.getByTestId("party-gate-skip-to-general"));
    expect(onSelect).toHaveBeenCalledWith({
      state: "PA",
      county: undefined,
      ballotTag: "GENERAL",
      electionDate: "2026-05-19",
      electionLabel: "2026 Pennsylvania Primary",
    });
  });

  it("DEM registration option + Continue fires onSelect with DEM-primary tag", () => {
    const onSelect = vi.fn();
    render(
      <PartyGate
        rule={PA_PRIMARY_RULE}
        county="Philadelphia"
        electionDate="2026-05-19"
        electionLabel="2026 Pennsylvania Primary"
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByTestId("party-gate-option-registered_dem"));
    fireEvent.click(screen.getByTestId("party-gate-continue"));
    expect(onSelect).toHaveBeenCalledWith({
      state: "PA",
      county: "Philadelphia",
      ballotTag: "DEM-primary",
      electionDate: "2026-05-19",
      electionLabel: "2026 Pennsylvania Primary",
    });
  });
});

describe("PartyGate — anti-solution discipline", () => {
  it("component source contains zero state-name string literals", () => {
    // Read the actual TSX source and grep for quoted state codes used as
    // values. This enforces the rules-as-data invariant: state-conditional
    // behavior MUST flow through the rules table, not through component
    // branches. Matches "TX" or 'TX' (and PA/CA/GA/NY) as standalone
    // quoted tokens.
    const componentPath = path.resolve(__dirname, "PartyGate.tsx");
    const source = fs.readFileSync(componentPath, "utf8");
    // Strip block + line comments — comments are allowed to mention states.
    const codeOnly = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");
    const stateLiteralRegex =
      /(?<!\w)['"`](TX|PA|CA|GA|NY|FL|NJ|NC|MI|OH|IL|VA|WA|MA|MD|MN|CO)['"`](?!\w)/;
    const match = codeOnly.match(stateLiteralRegex);
    expect(
      match,
      `PartyGate.tsx must not branch on state name — found ${match?.[0]}`,
    ).toBeNull();
  });
});
