// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RacePatterns } from "./RacePatterns";
import { LanguageProvider } from "../lib/i18n";
import type {
  RacePatternsBlock,
  AlignmentScoresEntry,
} from "../lib/structured-blocks";

/* ── Fixtures ─────────────────────────────────────────────── */

const candidateBlock: RacePatternsBlock = {
  race: "Harris County District Attorney",
  candidates: [
    {
      id: "cand-a",
      name: "Alice Morales",
      incumbent: true,
      priorRole: "Current DA, 2019–present",
      donorCoalition: [
        { label: "Legal industry", percent: 55 },
        { label: "Small individual donors (under $200)", percent: 30 },
        { label: "Finance, banking & insurance", percent: 15 },
      ],
      donorSource: { name: "TEC filings", url: "https://example.com/tec-a" },
      endorsements: [
        { name: "Harris County Bar Association", category: "civic" },
        { name: "Houston Police Officers Union", category: "labor" },
      ],
      endorsementSource: {
        name: "Campaign website",
        url: "https://example.com/alice-endorse",
      },
      platformAlignment: { kept: 8, total: 12 },
      alignmentSource: {
        name: "Vote Smart",
        url: "https://example.com/vs-a",
      },
      retrospective: [
        {
          metric: "Felony conviction rate",
          value: "74%",
          trend: "improving",
          period: "2020–2023",
          source: {
            name: "DA Annual Report 2023",
            url: "https://example.com/dar",
          },
        },
      ],
      valuesHighlight: {
        issueTag: "public_safety",
        element: "Expanded diversion programs by 40% in term.",
      },
    },
    {
      id: "cand-b",
      name: "Bob Nguyen",
      incumbent: false,
      donorCoalition: null,
      donorUnavailable: { reason: "no TEC filings found" },
      endorsements: null,
      endorsementUnavailable: { reason: "no public endorsements filed" },
      platformAlignment: null,
      retrospective: null,
      retrospectiveUnavailable: {
        reason: "Challenger — no record in office yet",
      },
      valuesHighlight: null,
    },
  ],
};

const propBlock: RacePatternsBlock = {
  race: "Proposition A — Street Maintenance Bond",
  candidates: [
    {
      id: "yes",
      name: "YES on Prop A",
      incumbent: false,
      priorRole:
        "Authorizes $900M in bonds for road resurfacing over 10 years.",
      donorCoalition: [
        { label: "Real estate & development", percent: 60 },
        { label: "Small individual donors (under $200)", percent: 40 },
      ],
      donorSource: {
        name: "TEC PAC filings",
        url: "https://example.com/prop-yes",
      },
      endorsements: [
        { name: "Houston Chronicle", category: "media" },
        { name: "Greater Houston Partnership", category: "business" },
      ],
      endorsementSource: {
        name: "Chronicle endorsement",
        url: "https://example.com/chronicle",
      },
      platformAlignment: null,
      retrospective: [
        {
          metric: "Official fiscal note",
          value: "$900M over 10 years",
          trend: "stable",
          period: "FY2026–2035",
          source: {
            name: "City Controller fiscal note",
            url: "https://example.com/fiscal",
          },
        },
      ],
      valuesHighlight: null,
    },
    {
      id: "no",
      name: "NO on Prop A",
      incumbent: false,
      priorRole:
        "Opposes the bond; critics cite lack of accountability measures.",
      donorCoalition: null,
      donorUnavailable: { reason: "no organized opposition PAC filed" },
      endorsements: null,
      endorsementUnavailable: {
        reason: "no formal endorsements for NO side",
      },
      platformAlignment: null,
      retrospective: null,
      retrospectiveUnavailable: {
        reason: "No comparable bond measure passed in last 10 years",
      },
      valuesHighlight: null,
    },
  ],
};

/* ── Helpers ──────────────────────────────────────────────── */

function renderPatterns(
  block: RacePatternsBlock,
  props: Partial<React.ComponentProps<typeof RacePatterns>> = {},
) {
  const onPick = vi.fn();
  const onSkip = vi.fn();
  render(
    <LanguageProvider>
      <RacePatterns block={block} onPick={onPick} onSkip={onSkip} {...props} />
    </LanguageProvider>,
  );
  return { onPick, onSkip };
}

/* ── Tests — candidate variant ────────────────────────────── */

describe("RacePatterns — candidate variant", () => {
  it("renders anonymized headers (A/B/C) by default before reveal", () => {
    renderPatterns(candidateBlock);
    expect(
      screen.getByTestId("race-patterns-candidate-name-cand-a"),
    ).toHaveTextContent("Candidate A");
    expect(
      screen.getByTestId("race-patterns-candidate-name-cand-b"),
    ).toHaveTextContent("Candidate B");
    // Real names should not be visible yet
    expect(screen.queryByText("Alice Morales")).not.toBeInTheDocument();
    expect(screen.queryByText("Bob Nguyen")).not.toBeInTheDocument();
  });

  it("Pick buttons are disabled until reveal", () => {
    renderPatterns(candidateBlock);
    expect(screen.getByTestId("race-patterns-pick-cand-a")).toBeDisabled();
    expect(screen.getByTestId("race-patterns-pick-cand-b")).toBeDisabled();
  });

  it("reveals candidates and enables Pick when reveal button is tapped", () => {
    renderPatterns(candidateBlock);
    fireEvent.click(screen.getByTestId("race-patterns-reveal"));
    expect(
      screen.getByTestId("race-patterns-candidate-name-cand-a"),
    ).toHaveTextContent("Alice Morales");
    expect(
      screen.getByTestId("race-patterns-candidate-name-cand-b"),
    ).toHaveTextContent("Bob Nguyen");
    expect(screen.getByTestId("race-patterns-pick-cand-a")).not.toBeDisabled();
    expect(screen.getByTestId("race-patterns-pick-cand-b")).not.toBeDisabled();
  });

  it("reveal button disappears after tapping", () => {
    renderPatterns(candidateBlock);
    fireEvent.click(screen.getByTestId("race-patterns-reveal"));
    expect(
      screen.queryByTestId("race-patterns-reveal"),
    ).not.toBeInTheDocument();
  });

  it("renders the race title", () => {
    renderPatterns(candidateBlock);
    expect(
      screen.getByText("Harris County District Attorney"),
    ).toBeInTheDocument();
  });

  it("renders the sticky comparison strip", () => {
    renderPatterns(candidateBlock);
    expect(
      screen.getByTestId("race-patterns-comparison-strip"),
    ).toBeInTheDocument();
  });

  it("donor coalition empty state renders donorUnavailable.reason", () => {
    renderPatterns(candidateBlock);
    expect(
      screen.getByTestId("race-patterns-coalition-unavailable-cand-b"),
    ).toHaveTextContent(/no TEC filings found/);
  });

  it("endorsements empty state renders endorsementUnavailable.reason", () => {
    renderPatterns(candidateBlock);
    expect(
      screen.getByTestId("race-patterns-endorsements-unavailable-cand-b"),
    ).toHaveTextContent(/no public endorsements filed/);
  });

  it("platform alignment renders PlatformAlignmentRatio for incumbent with data", () => {
    renderPatterns(candidateBlock);
    // PlatformAlignmentRatio uses data-testid="race-final-alignment-ladder"
    expect(
      screen.getByTestId("race-final-alignment-ladder"),
    ).toBeInTheDocument();
    expect(screen.getByText(/8 \/ 12/)).toBeInTheDocument();
  });

  it("platform alignment renders challenger message for null alignment", () => {
    renderPatterns(candidateBlock);
    expect(
      screen.getByTestId("race-patterns-alignment-challenger-cand-b"),
    ).toHaveTextContent(/no voting record yet/i);
  });

  it("retrospective empty state renders retrospectiveUnavailable.reason for challenger", () => {
    renderPatterns(candidateBlock);
    expect(
      screen.getByTestId("race-patterns-retrospective-unavailable-cand-b"),
    ).toHaveTextContent(/Challenger — no record in office yet/);
  });

  it("valuesHighlight renders callout when present", () => {
    renderPatterns(candidateBlock);
    expect(
      screen.getByTestId("race-patterns-values-highlight-cand-a"),
    ).toHaveTextContent(/diversion programs by 40%/);
  });

  it("valuesHighlight is absent when null", () => {
    renderPatterns(candidateBlock);
    expect(
      screen.queryByTestId("race-patterns-values-highlight-cand-b"),
    ).not.toBeInTheDocument();
  });

  it("onPick fires with (candidateId, candidateName) after reveal", () => {
    const { onPick } = renderPatterns(candidateBlock);
    fireEvent.click(screen.getByTestId("race-patterns-reveal"));
    fireEvent.click(screen.getByTestId("race-patterns-pick-cand-a"));
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith("cand-a", "Alice Morales");
  });

  it("onSkip fires when skip button clicked", () => {
    const { onSkip } = renderPatterns(candidateBlock);
    fireEvent.click(screen.getByTestId("race-patterns-skip"));
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onSkip).toHaveBeenCalledWith();
  });

  it("submitted state shows locked-in pick banner and hides skip/reveal", () => {
    renderPatterns(candidateBlock, {
      isSubmitted: true,
      pickedCandidateId: "cand-a",
    });
    const banner = screen.getByTestId("race-patterns-locked-banner");
    expect(banner).toHaveTextContent(/Alice Morales/);
    expect(banner).toHaveTextContent(/Locked in/i);
    expect(screen.queryByTestId("race-patterns-skip")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("race-patterns-reveal"),
    ).not.toBeInTheDocument();
  });

  it("submitted state with no pick shows 'Skipped'", () => {
    renderPatterns(candidateBlock, { isSubmitted: true });
    const banner = screen.getByTestId("race-patterns-locked-banner");
    expect(banner).toHaveTextContent(/Skipped/i);
  });

  it("source footnote footer lists sources collected from candidate data", () => {
    renderPatterns(candidateBlock);
    const footer = screen.getByTestId("race-patterns-sources-footer");
    expect(footer).toBeInTheDocument();
    // TEC filings should appear (donor source for cand-a)
    expect(footer).toHaveTextContent(/TEC filings/);
    // Vote Smart should appear (alignment source)
    expect(footer).toHaveTextContent(/Vote Smart/);
    // DA Annual Report should appear (retrospective source)
    expect(footer).toHaveTextContent(/DA Annual Report/);
  });
});

/* ── Tests — isStreaming prop ────────────────────────────── */

describe("RacePatterns — isStreaming prop", () => {
  it("Pick buttons are disabled when isStreaming=true (before reveal)", () => {
    renderPatterns(candidateBlock, { isStreaming: true });
    expect(screen.getByTestId("race-patterns-pick-cand-a")).toBeDisabled();
    expect(screen.getByTestId("race-patterns-pick-cand-b")).toBeDisabled();
  });

  it("Pick buttons are disabled when isStreaming=true (after reveal)", () => {
    renderPatterns(candidateBlock, { isStreaming: true });
    const reveal = screen.queryByTestId("race-patterns-reveal");
    if (reveal) {
      // reveal button exists but should also be disabled
      expect(reveal).toBeDisabled();
    }
    expect(screen.getByTestId("race-patterns-pick-cand-a")).toBeDisabled();
    expect(screen.getByTestId("race-patterns-pick-cand-b")).toBeDisabled();
  });

  it("Reveal button is disabled when isStreaming=true", () => {
    renderPatterns(candidateBlock, { isStreaming: true });
    expect(screen.getByTestId("race-patterns-reveal")).toBeDisabled();
  });

  it("Skip button is disabled when isStreaming=true", () => {
    renderPatterns(candidateBlock, { isStreaming: true });
    expect(screen.getByTestId("race-patterns-skip")).toBeDisabled();
  });

  it("Pick buttons enabled again when isStreaming=false after reveal", () => {
    renderPatterns(candidateBlock, { isStreaming: false });
    fireEvent.click(screen.getByTestId("race-patterns-reveal"));
    expect(screen.getByTestId("race-patterns-pick-cand-a")).not.toBeDisabled();
    expect(screen.getByTestId("race-patterns-pick-cand-b")).not.toBeDisabled();
  });
});

/* ── Tests — endorsement orgUrl and partisanLean ─────────── */

const blockWithEndorsementMeta: RacePatternsBlock = {
  race: "City Council District 4",
  candidates: [
    {
      id: "cand-x",
      name: "Xena Rodriguez",
      incumbent: true,
      donorCoalition: [
        { label: "Small individual donors (under $200)", percent: 100 },
      ],
      donorSource: { name: "TEC filings", url: "https://example.com/tec" },
      endorsements: [
        {
          name: "Houston League of Women Voters",
          category: "civic",
          orgUrl: "https://lwvhouston.org",
          partisanLean: "nonpartisan",
        },
        {
          name: "HPOU",
          category: "labor",
          partisanLean: "partisan",
        },
      ],
      endorsementSource: { name: "Campaign site", url: "https://example.com" },
      platformAlignment: { kept: 5, total: 10 },
      alignmentSource: { name: "Vote Smart", url: "https://votesmart.org" },
      retrospective: null,
      valuesHighlight: null,
    },
    {
      id: "cand-y",
      name: "Yusuf Chen",
      incumbent: false,
      priorRole: "Former City Treasurer, 2018–2022",
      donorCoalition: null,
      donorUnavailable: { reason: "no filings" },
      endorsements: [
        {
          name: "Houston Chronicle",
          category: "media",
          partisanLean: "mixed",
        },
      ],
      endorsementSource: { name: "Chronicle", url: "https://chron.com" },
      platformAlignment: null,
      retrospective: null,
      valuesHighlight: null,
    },
  ],
};

describe("RacePatterns — endorsement orgUrl and partisanLean", () => {
  it("renders endorsement name as a link when orgUrl is present", () => {
    renderPatterns(blockWithEndorsementMeta);
    const link = screen.getByTestId(
      "endorsement-link-Houston League of Women Voters",
    );
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://lwvhouston.org");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders plain text (no link) when orgUrl is absent", () => {
    renderPatterns(blockWithEndorsementMeta);
    expect(
      screen.queryByTestId("endorsement-link-HPOU"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("HPOU")).toBeInTheDocument();
  });

  it("renders nonpartisan badge when partisanLean=nonpartisan", () => {
    renderPatterns(blockWithEndorsementMeta);
    const badge = screen.getByTestId(
      "endorsement-partisan-badge-Houston League of Women Voters",
    );
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent(/Nonpartisan/i);
  });

  it("renders partisan badge when partisanLean=partisan", () => {
    renderPatterns(blockWithEndorsementMeta);
    const badge = screen.getByTestId("endorsement-partisan-badge-HPOU");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent(/Partisan/i);
  });

  it("renders mixed badge when partisanLean=mixed", () => {
    renderPatterns(blockWithEndorsementMeta);
    const badge = screen.getByTestId(
      "endorsement-partisan-badge-Houston Chronicle",
    );
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent(/Mixed/i);
  });

  it("does not render partisan badge when partisanLean is absent", () => {
    renderPatterns(candidateBlock);
    // candidateBlock endorsements have no partisanLean
    expect(
      screen.queryByTestId(/endorsement-partisan-badge-/),
    ).not.toBeInTheDocument();
  });
});

/* ── Tests — priorRole always-on ─────────────────────────── */

describe("RacePatterns — priorRole in anonymized state", () => {
  it("renders priorRole before reveal (anonymized state) when present", () => {
    renderPatterns(candidateBlock);
    // cand-a has priorRole "Current DA, 2019–present"
    const priorRoleEl = screen.getByTestId("race-patterns-prior-role-cand-a");
    expect(priorRoleEl).toBeInTheDocument();
    expect(priorRoleEl).toHaveTextContent(/Current DA, 2019–present/);
    // cand-b has no priorRole
    expect(
      screen.queryByTestId("race-patterns-prior-role-cand-b"),
    ).not.toBeInTheDocument();
  });

  it("renders priorRole for challenger with prior political history", () => {
    renderPatterns(blockWithEndorsementMeta);
    const priorRole = screen.getByTestId("race-patterns-prior-role-cand-y");
    expect(priorRole).toBeInTheDocument();
    expect(priorRole).toHaveTextContent(/Former City Treasurer/);
  });
});

/* ── Tests — donor methodology subtext ─────────────────────*/

describe("RacePatterns — donor methodology subtext", () => {
  it("renders methodology note in candidate donor section", () => {
    renderPatterns(candidateBlock);
    // cand-a has donor data
    const note = screen.getByTestId("race-patterns-donor-methodology-cand-a");
    expect(note).toBeInTheDocument();
    expect(note).toHaveTextContent(/Small donor/i);
  });

  it("renders methodology note in comparison strip", () => {
    renderPatterns(candidateBlock);
    const stripNote = screen.getByTestId(
      "race-patterns-comparison-strip-methodology",
    );
    expect(stripNote).toBeInTheDocument();
    expect(stripNote).toHaveTextContent(/Small donor/i);
  });
});

/* ── Tests — proposition variant ─────────────────────────── */

describe("RacePatterns — proposition variant", () => {
  it("YES/NO labels render from the start without reveal button", () => {
    renderPatterns(propBlock);
    expect(
      screen.getByTestId("race-patterns-candidate-name-yes"),
    ).toHaveTextContent("YES on Prop A");
    expect(
      screen.getByTestId("race-patterns-candidate-name-no"),
    ).toHaveTextContent("NO on Prop A");
    expect(
      screen.queryByTestId("race-patterns-reveal"),
    ).not.toBeInTheDocument();
  });

  it("Pick buttons are enabled immediately for propositions", () => {
    renderPatterns(propBlock);
    expect(screen.getByTestId("race-patterns-pick-yes")).not.toBeDisabled();
    expect(screen.getByTestId("race-patterns-pick-no")).not.toBeDisabled();
  });

  it("renders the proposition race title", () => {
    renderPatterns(propBlock);
    expect(
      screen.getByText("Proposition A — Street Maintenance Bond"),
    ).toBeInTheDocument();
  });

  it("donor coalition empty state for NO side renders reason", () => {
    renderPatterns(propBlock);
    expect(
      screen.getByTestId("race-patterns-coalition-unavailable-no"),
    ).toHaveTextContent(/no organized opposition PAC filed/);
  });

  it("endorsements empty state for NO side renders reason", () => {
    renderPatterns(propBlock);
    expect(
      screen.getByTestId("race-patterns-endorsements-unavailable-no"),
    ).toHaveTextContent(/no formal endorsements for NO side/);
  });

  it("retrospective empty state for NO side renders reason", () => {
    renderPatterns(propBlock);
    expect(
      screen.getByTestId("race-patterns-retrospective-unavailable-no"),
    ).toHaveTextContent(/No comparable bond measure/);
  });

  it("onPick fires with (candidateId, candidateName) for YES", () => {
    const { onPick } = renderPatterns(propBlock);
    fireEvent.click(screen.getByTestId("race-patterns-pick-yes"));
    expect(onPick).toHaveBeenCalledWith("yes", "YES on Prop A");
  });

  it("onSkip fires for proposition race", () => {
    const { onSkip } = renderPatterns(propBlock);
    fireEvent.click(screen.getByTestId("race-patterns-skip"));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("source footnote footer lists sources for proposition", () => {
    renderPatterns(propBlock);
    const footer = screen.getByTestId("race-patterns-sources-footer");
    expect(footer).toHaveTextContent(/TEC PAC filings/);
    expect(footer).toHaveTextContent(/City Controller fiscal note/);
  });
});

/* ── Alignment score fixtures ─────────────────────────────── */

const alignmentEntryA: AlignmentScoresEntry = {
  candidateId: "cand-a",
  scores: [
    {
      canonicalIssue: "healthcare_access",
      issueLabel: "Healthcare access",
      resolvedStance: "expand healthcare access",
      kept: 3,
      total: 5,
      contributingVotes: [
        {
          billTitle: "HB 100 — Medicaid Expansion",
          voteCast: "with",
          date: "2021-05-12",
          source: {
            name: "Texas House Clerk",
            url: "https://capitol.texas.gov/",
          },
        },
        {
          billTitle: "SB 200 — Insurance Mandate Repeal",
          voteCast: "against",
          date: "2022-03-08",
          source: {
            name: "Texas Senate Journal",
            url: "https://journal.senate.texas.gov/",
          },
        },
      ],
    },
    {
      canonicalIssue: "public_safety",
      issueLabel: "Public safety",
      resolvedStance: "expand law enforcement funding",
      kept: 4,
      total: 4,
      contributingVotes: [
        {
          billTitle: "HB 500 — Police Funding Increase",
          voteCast: "with",
          date: "2023-04-20",
          source: {
            name: "Texas House Clerk",
            url: "https://capitol.texas.gov/",
          },
        },
      ],
    },
  ],
};

const alignmentEntryB: AlignmentScoresEntry = {
  candidateId: "cand-b",
  scores: null,
  unavailable: { reason: "No voting record yet — first-time candidate" },
};

const alignmentScoresMap = new Map<string, AlignmentScoresEntry>([
  ["cand-a", alignmentEntryA],
  ["cand-b", alignmentEntryB],
]);

/* ── Tests — alignment score banner ──────────────────────── */

describe("RacePatterns — alignment score banner", () => {
  it("renders AlignmentScoreBanner for candidate when alignmentScoresByCandidate is provided", () => {
    renderPatterns(candidateBlock, {
      alignmentScoresByCandidate: alignmentScoresMap,
    });
    expect(
      screen.getByTestId("alignment-score-banner-cand-a"),
    ).toBeInTheDocument();
  });

  it("renders unavailable banner for candidate with null scores + unavailable", () => {
    renderPatterns(candidateBlock, {
      alignmentScoresByCandidate: alignmentScoresMap,
    });
    expect(
      screen.getByTestId("alignment-score-unavailable-cand-b"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("alignment-score-unavailable-cand-b"),
    ).toHaveTextContent(/first-time candidate/i);
  });

  it("does not render alignment banner when alignmentScoresByCandidate is omitted", () => {
    renderPatterns(candidateBlock);
    expect(
      screen.queryByTestId("alignment-score-banner-cand-a"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("alignment-score-unavailable-cand-b"),
    ).not.toBeInTheDocument();
  });

  it("does not render alignment banner for candidate with no entry in the map", () => {
    const partialMap = new Map<string, AlignmentScoresEntry>([
      ["cand-a", alignmentEntryA],
    ]);
    renderPatterns(candidateBlock, {
      alignmentScoresByCandidate: partialMap,
    });
    expect(
      screen.getByTestId("alignment-score-banner-cand-a"),
    ).toBeInTheDocument();
    // cand-b has no entry — no banner of any kind
    expect(
      screen.queryByTestId("alignment-score-banner-cand-b"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("alignment-score-unavailable-cand-b"),
    ).not.toBeInTheDocument();
  });

  it("renders disclaimer above the dashboard when alignment scores are provided", () => {
    renderPatterns(candidateBlock, {
      alignmentScoresByCandidate: alignmentScoresMap,
    });
    expect(
      screen.getByTestId("race-patterns-alignment-disclaimer"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("race-patterns-alignment-disclaimer"),
    ).toHaveTextContent(/AI can make mistakes/i);
  });

  it("does not render disclaimer when alignmentScoresByCandidate is omitted", () => {
    renderPatterns(candidateBlock);
    expect(
      screen.queryByTestId("race-patterns-alignment-disclaimer"),
    ).not.toBeInTheDocument();
  });
});

/* ── Tests — alignment drill-down ────────────────────────── */

describe("RacePatterns — alignment drill-down", () => {
  it("tapping a score card expands the drilldown inline below the banner", () => {
    renderPatterns(candidateBlock, {
      alignmentScoresByCandidate: alignmentScoresMap,
    });
    // Drilldown not present initially
    expect(
      screen.queryByTestId("alignment-drilldown-healthcare_access"),
    ).not.toBeInTheDocument();

    // Tap the healthcare_access score card for cand-a
    fireEvent.click(
      screen.getByTestId("alignment-score-card-healthcare_access"),
    );

    expect(
      screen.getByTestId("alignment-drilldown-healthcare_access"),
    ).toBeInTheDocument();
  });

  it("tapping the close button collapses the drilldown", () => {
    renderPatterns(candidateBlock, {
      alignmentScoresByCandidate: alignmentScoresMap,
    });
    fireEvent.click(
      screen.getByTestId("alignment-score-card-healthcare_access"),
    );
    expect(
      screen.getByTestId("alignment-drilldown-healthcare_access"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("alignment-drilldown-close"));
    expect(
      screen.queryByTestId("alignment-drilldown-healthcare_access"),
    ).not.toBeInTheDocument();
  });

  it("tapping the same score again collapses it (toggle behavior)", () => {
    renderPatterns(candidateBlock, {
      alignmentScoresByCandidate: alignmentScoresMap,
    });
    const card = screen.getByTestId("alignment-score-card-healthcare_access");
    fireEvent.click(card);
    expect(
      screen.getByTestId("alignment-drilldown-healthcare_access"),
    ).toBeInTheDocument();

    fireEvent.click(card);
    expect(
      screen.queryByTestId("alignment-drilldown-healthcare_access"),
    ).not.toBeInTheDocument();
  });

  it("tapping a different score swaps the drilldown", () => {
    renderPatterns(candidateBlock, {
      alignmentScoresByCandidate: alignmentScoresMap,
    });
    fireEvent.click(
      screen.getByTestId("alignment-score-card-healthcare_access"),
    );
    expect(
      screen.getByTestId("alignment-drilldown-healthcare_access"),
    ).toBeInTheDocument();

    // Tap public_safety card — swaps to that one
    fireEvent.click(screen.getByTestId("alignment-score-card-public_safety"));
    expect(
      screen.queryByTestId("alignment-drilldown-healthcare_access"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("alignment-drilldown-public_safety"),
    ).toBeInTheDocument();
  });

  it("existing four-pattern tests still pass without alignment data", () => {
    // This test replicates the basic four-pattern check to guard against regression.
    renderPatterns(candidateBlock);
    expect(screen.getByTestId("race-patterns")).toBeInTheDocument();
    expect(
      screen.getByTestId("race-patterns-comparison-strip"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("race-patterns-candidate-cand-a"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("race-patterns-candidate-cand-b"),
    ).toBeInTheDocument();
    // No alignment content without the prop
    expect(screen.queryByTestId(/alignment-score-/)).not.toBeInTheDocument();
  });
});
