// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { PolisClose } from "./PolisClose";
import type { PolisScopeVM } from "./polisAdapter";

function makeScope(overrides: Partial<PolisScopeVM> = {}): PolisScopeVM {
  return {
    id: "state",
    label: "Texas",
    sampleSize: 500,
    dotPhrase: "Texas voter",
    scopePhrase: "across Texas",
    dots: [{ x: 0.1, y: 0.2 }],
    you: [0.1, 0.1],
    overlap: {
      mostCommon: null,
      youShares: [{ canonicalIssue: "healthcare", issueLabel: "Healthcare", percent: 62 }],
    },
    issueRegions: [],
    bridges: [],
    divided: [],
    locked: false,
    ...overrides,
  };
}

describe("PolisClose — Where it split", () => {
  it("renders the divided section with statements + honest population-level percent when divided statements exist", () => {
    const scope = makeScope({
      divided: [
        { stmt: "Federal spending should be cut across the board.", pct: 52 },
      ],
    });
    render(<PolisClose polis={{ scopes: [scope] }} />);

    expect(screen.getByText("Where it split")).toBeInTheDocument();
    expect(
      screen.getByText(/Federal spending should be cut across the board/),
    ).toBeInTheDocument();
    expect(screen.getByText("52%")).toBeInTheDocument();
    expect(screen.getByText(/short of/)).toBeInTheDocument();
    // Never introduces a party (D/R/I) breakdown.
    expect(screen.queryByText(/\bD \d/)).toBeNull();
    expect(screen.queryByText(/\bR \d/)).toBeNull();
  });

  it("does NOT render the divided section when there are no divided statements (honest — no fabricated placeholder)", () => {
    const scope = makeScope({ divided: [] });
    render(<PolisClose polis={{ scopes: [scope] }} />);
    expect(screen.queryByText("Where it split")).toBeNull();
  });

  it("frames the divided count against bridges when both exist", () => {
    const scope = makeScope({
      bridges: [{ stmt: "Members of Congress should not trade stocks.", pct: 86 }],
      divided: [
        { stmt: "Federal spending should be cut across the board.", pct: 52 },
        { stmt: "Term limits should be imposed on Congress.", pct: 61 },
      ],
    });
    render(<PolisClose polis={{ scopes: [scope] }} />);
    // 2 of 3 statements didn't clear the bar.
    expect(screen.getByText(/2 of 3 statements/)).toBeInTheDocument();
  });

  it("frames the divided count as fully-divided when no statement bridged", () => {
    const scope = makeScope({
      bridges: [],
      divided: [
        { stmt: "Federal spending should be cut across the board.", pct: 52 },
      ],
    });
    render(<PolisClose polis={{ scopes: [scope] }} />);
    expect(screen.getByText(/the room genuinely split/)).toBeInTheDocument();
  });
});
