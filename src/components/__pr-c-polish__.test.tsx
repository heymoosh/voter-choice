// @vitest-environment jsdom
/**
 * PR C — Redesign polish: close all remaining P1 + P2 design-parity gaps.
 *
 * Mirrors PR B's pattern at __pr-b-polish__.test.tsx.
 *
 * Gaps covered, per audit:
 *   P1 — Cold-open re-quiet
 *     - research-context-strip absent under flag-on + en
 *     - tab-close-warning-banner ("We save anonymous counts only…") absent
 *       under flag-on + en
 *     - "Returning voter? Upload your voter profile" banner removed entirely
 *     - co-context breadcrumb has the civic dot
 *   P1 — Civic-mood H1 em highlight
 *     - <em>record.</em> uses text-ink AND a linear-gradient civic-soft bg
 *   P2 — Mono-uppercase CTA sweep (sentence-case sans on primary CTAs)
 *   P2 — BallotPane Print button → ink bg (not civic)
 *   P2 — Theme quote border-left + ranker polish (copy + count + user echo)
 *   P2 — Workspace input meta row "Auto-saving · Race N/M"
 *   P2 — Cold-open textarea placeholder copy (prototype-verbatim)
 *   P2 — PrintBallot 4-cell voter-meta grid
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";

// jsdom doesn't implement scrollIntoView; ChatPanel autoscrolls when
// messages arrive. Stub it once for the whole file so the flag-off
// ResearchLayout regression tests (which mount ChatPanel underneath)
// don't crash.
beforeEach(() => {
  if (typeof Element !== "undefined") {
    Element.prototype.scrollIntoView = vi.fn();
  }
});
import { PageContent } from "../app/PageContent";
import { PartyGate } from "./PartyGate";
import { BallotLookupNeeded } from "./BallotLookupNeeded";
import { ConcernInterpretation } from "./ConcernInterpretation";
import { ThemeRanker } from "./ThemeRanker";
import { ChatPanel } from "./ChatPanel";
import { BallotPane, type BallotPaneProps, type Decision } from "./BallotPane";
import { ColdOpenInput } from "./ColdOpenInput";
import { PrintBallot, type PollingDataShape } from "./PrintBallot";
import { ResearchLayout } from "./ResearchLayout";
import { BudgetExhausted } from "./BudgetExhausted";
import { LanguageProvider } from "../lib/i18n";
import { ResearchModeProvider } from "../lib/researchMode";
import type { Race } from "../lib/raceDeriver";
import type { StateElectionData } from "../types/election";
import type { StateRule } from "../lib/state-rules/types";

/* ── Shared fixtures ───────────────────────────────────────────── */

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

const sampleRace: Race = {
  id: "us-president",
  section: "Federal",
  label: "U.S. President",
  decided: true,
};

const sampleDecision: Decision = {
  raceId: "us-president",
  raceLabel: "U.S. President",
  section: "Federal",
  pick: "Jane Doe",
  party: "D",
  whyNote: "labor",
};

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
  ],
};

function renderBallotPane(overrides: Partial<BallotPaneProps> = {}) {
  const props: BallotPaneProps = {
    decisions: [sampleDecision],
    totalRaces: 1,
    races: [sampleRace],
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

function renderResearchLayout(
  overrides: Partial<Parameters<typeof ResearchLayout>[0]> = {},
) {
  return render(
    <LanguageProvider>
      <ResearchLayout
        state={stubState}
        zipCode="08106"
        addressStep="done"
        pollingData={null}
        onAddressSubmit={vi.fn()}
        onAddressSkip={vi.fn()}
        budgetStatus={{ tier: "normal", percent: 0 }}
        budgetChecked={true}
        onBudgetUpdate={vi.fn()}
        voterProfile={null}
        promptText="prompt"
        copyPasteIsPrimary={false}
        countyName="Camden County"
        userSampleBallotText=""
        onUserSampleBallotTextChange={vi.fn()}
        preResearchContext={undefined}
        researchReady={true}
        primary="GENERAL"
        onChatStarted={vi.fn()}
        promptFleetV2Enabled={true}
        onLockInThemes={vi.fn()}
        ballotContext={null}
        coldOpenContext={{
          cityState: "Camden County, NJ",
          district: "NJ-1",
          raceCount: 6,
        }}
        {...overrides}
      />
    </LanguageProvider>,
  );
}

/* ── P1 — Cold-open re-quiet ──────────────────────────────────── */

describe("PR C / P1 — cold-open re-quiet (flag-on + en)", () => {
  beforeEach(() => localStorage.clear());

  it("research-context-strip is ABSENT under flag-on + en (cold-open re-quiet)", () => {
    renderResearchLayout();
    expect(screen.queryByTestId("research-context-strip")).toBeNull();
  });

  it("tab-close-warning-banner is ABSENT under flag-on + en (cold-open re-quiet)", () => {
    renderResearchLayout();
    expect(screen.queryByTestId("tab-close-warning-banner")).toBeNull();
  });

  it("research-context-strip STILL RENDERS under flag-off (legacy regression pin)", () => {
    renderResearchLayout({ promptFleetV2Enabled: false });
    expect(screen.getByTestId("research-context-strip")).toBeInTheDocument();
  });

  it("tab-close-warning-banner STILL RENDERS under flag-off (legacy regression pin)", () => {
    renderResearchLayout({ promptFleetV2Enabled: false });
    expect(screen.getByTestId("tab-close-warning-banner")).toBeInTheDocument();
  });

  it("co-context breadcrumb has the civic dot indicator", () => {
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
    const dot = breadcrumb.querySelector('[data-testid="co-context-dot"]');
    expect(dot).not.toBeNull();
    expect(dot?.className ?? "").toMatch(/bg-civic/);
  });
});

/* ── P1 — Civic-mood H1 em highlight ──────────────────────────── */

describe("PR C / P1 — H1 em civic-mood highlight", () => {
  beforeEach(() => localStorage.clear());

  function renderLanding() {
    return render(
      <ResearchModeProvider>
        <LanguageProvider>
          <PageContent promptFleetV2Enabled={true} />
        </LanguageProvider>
      </ResearchModeProvider>,
    );
  }

  it("<em> uses text-ink (not text-civic) — highlight bg provides the contrast", () => {
    renderLanding();
    const h1 = screen.getByRole("heading", { level: 1 });
    const em = h1.querySelector("em");
    expect(em).not.toBeNull();
    expect(em?.className ?? "").toMatch(/text-ink\b/);
    expect(em?.className ?? "").not.toMatch(/text-civic\b/);
  });

  it("<em> applies the civic-soft highlighter-strike linear-gradient", () => {
    renderLanding();
    const h1 = screen.getByRole("heading", { level: 1 });
    const em = h1.querySelector("em");
    expect(em).not.toBeNull();
    // Tailwind arbitrary-value class for the prototype's
    // `linear-gradient(transparent 62%, var(--civic-soft) 62%)`
    expect(em?.className ?? "").toMatch(
      /bg-\[linear-gradient\(transparent_62%,var\(--civic-soft\)_62%\)\]/,
    );
  });
});

/* ── P2 — Mono-uppercase CTA sweep ────────────────────────────── */

describe("PR C / P2 — PartyGate Continue de-mono", () => {
  it("Continue button is sentence-case sans, NOT mono-uppercase", () => {
    render(
      <PartyGate
        rule={TX_RUNOFF_RULE}
        county="Travis County"
        electionDate="2026-05-25"
        electionLabel="2026 Texas Primary Runoff"
        onSelect={vi.fn()}
      />,
    );
    // Click an option so Continue renders.
    const radios = screen.getAllByRole("radio");
    fireEvent.click(radios[0]);
    const cta = screen.getByTestId("party-gate-continue");
    expect(cta.className).not.toMatch(/font-mono/);
    expect(cta.className).not.toMatch(/uppercase/);
  });
});

describe("PR C / P2 — BallotLookupNeeded 'Use this ballot' de-mono", () => {
  it("'Use this ballot' button is sentence-case sans, NOT mono-uppercase", () => {
    render(
      <BallotLookupNeeded
        state={stubState}
        county="Camden County"
        onBallotConfirmed={vi.fn()}
      />,
    );
    const cta = screen.getByTestId("ballot-lookup-confirm");
    expect(cta.className).not.toMatch(/font-mono/);
    expect(cta.className).not.toMatch(/uppercase/);
  });
});

describe("PR C / P2 — ConcernInterpretation confirm button de-mono", () => {
  // The confirm CTA at line 616 of the original source lives in the
  // LegacyConcernInterpretation branch (block-driven view, used on the
  // ES locale + flag-off path). Themes-mode renders the ThemeRanker
  // lock-in instead. We render the legacy variant with a minimal block
  // to assert the CTA class list.
  it("Confirm button is sentence-case sans, NOT mono-uppercase", () => {
    const block = {
      entries: [
        {
          sourceType: "freeText" as const,
          rank: 1,
          interpretation: "Healthcare",
          confidence: "clear" as const,
        },
      ],
    };
    render(
      <LanguageProvider>
        <ConcernInterpretation
          block={block}
          onConfirm={vi.fn()}
          onReinterpret={vi.fn()}
          onRemove={vi.fn()}
        />
      </LanguageProvider>,
    );
    const cta = screen.getByTestId("concern-interpretation-confirm");
    expect(cta.className).not.toMatch(/font-mono/);
    expect(cta.className).not.toMatch(/uppercase/);
  });
});

describe("PR C / P2 — ThemeRanker lock-in copy + de-mono", () => {
  function renderRanker() {
    return render(
      <LanguageProvider>
        <ThemeRanker
          themes={[{ name: "Healthcare", quotes: ['"insulin copays"'] }]}
          onChange={vi.fn()}
          onLockIn={vi.fn()}
          onRewrite={vi.fn()}
        />
      </LanguageProvider>,
    );
  }

  it("Lock-in button copy is 'Lock these in & start the ballot →'", () => {
    renderRanker();
    const lock = screen.getByTestId("theme-ranker-lock-in");
    expect(lock.textContent ?? "").toContain("Lock these in");
    expect(lock.textContent ?? "").toContain("start the ballot");
  });

  it("Lock-in button is sentence-case sans, NOT mono-uppercase", () => {
    renderRanker();
    const lock = screen.getByTestId("theme-ranker-lock-in");
    expect(lock.className).not.toMatch(/font-mono/);
    expect(lock.className).not.toMatch(/uppercase/);
  });

  it("'Let me rewrite my message' secondary button is sentence-case sans 12.5px", () => {
    renderRanker();
    const rewrite = screen.getByTestId("theme-ranker-rewrite");
    expect(rewrite.className).not.toMatch(/font-mono/);
    expect(rewrite.className).not.toMatch(/uppercase/);
  });
});

/* ── P2 — Theme polish (header copy + count + quote border) ───── */

describe("PR C / P2 — ConcernInterpretation header polish", () => {
  it("header copy is 'What you actually said.' (not 'Here's what I heard')", () => {
    render(
      <LanguageProvider>
        <ConcernInterpretation
          themes={[
            { name: "Healthcare", quotes: ["insulin"] },
            { name: "Housing", quotes: ["rent"] },
          ]}
          originalUserMessage="something"
          onLockIn={vi.fn()}
          onRewrite={vi.fn()}
        />
      </LanguageProvider>,
    );
    expect(screen.getByText(/What you actually said/i)).toBeInTheDocument();
    expect(screen.queryByText(/Here's what I heard you say/i)).toBeNull();
  });

  it("renders a theme-count indicator next to the header (e.g. '2 themes · inferred')", () => {
    render(
      <LanguageProvider>
        <ConcernInterpretation
          themes={[
            { name: "Healthcare", quotes: ["insulin"] },
            { name: "Housing", quotes: ["rent"] },
          ]}
          originalUserMessage="something"
          onLockIn={vi.fn()}
          onRewrite={vi.fn()}
        />
      </LanguageProvider>,
    );
    const count = screen.getByTestId("theme-count-indicator");
    expect(count.textContent ?? "").toMatch(/2 themes/);
    expect(count.textContent ?? "").toMatch(/inferred/);
    expect(count.className).toMatch(/font-mono/);
  });
});

describe("PR C / P2 — ThemeRanker quote border-left on the blockquote", () => {
  it("the blockquote has border-l-2 + civic-soft border color", () => {
    render(
      <LanguageProvider>
        <ThemeRanker
          themes={[
            {
              name: "Healthcare",
              quotes: ["insulin copays are insane"],
            },
          ]}
          onChange={vi.fn()}
          onLockIn={vi.fn()}
          onRewrite={vi.fn()}
        />
      </LanguageProvider>,
    );
    const quote = screen.getByTestId("theme-quote-0-0");
    expect(quote.className).toMatch(/border-l-2/);
    expect(quote.className).toMatch(/border-civic-soft/);
  });
});

/* ── P2 — User-message echo bubble ────────────────────────────── */

describe("PR C / P2 — cold-open user echo bubble", () => {
  it("renders the user-message echo bubble with ink bg + paper text", () => {
    render(
      <LanguageProvider>
        <ConcernInterpretation
          themes={[{ name: "Healthcare", quotes: ['"insulin"'] }]}
          originalUserMessage="my mom's insulin keeps going up"
          onLockIn={vi.fn()}
          onRewrite={vi.fn()}
        />
      </LanguageProvider>,
    );
    const echo = screen.getByTestId("cold-open-user-echo");
    expect(echo.textContent ?? "").toContain("insulin keeps going up");
    expect(echo.className).toMatch(/bg-ink/);
    expect(echo.className).toMatch(/text-paper/);
  });

  it("echo bubble renders ABOVE the ConcernInterpretation themes card", () => {
    render(
      <LanguageProvider>
        <ConcernInterpretation
          themes={[{ name: "Healthcare", quotes: ['"insulin"'] }]}
          originalUserMessage="my mom's insulin"
          onLockIn={vi.fn()}
          onRewrite={vi.fn()}
        />
      </LanguageProvider>,
    );
    const echo = screen.getByTestId("cold-open-user-echo");
    const themes = screen.getByTestId("concern-interpretation-themes");
    const position = echo.compareDocumentPosition(themes);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

/* ── P2 — Cold-open textarea placeholder copy ──────────────────── */

describe("PR C / P2 — ColdOpenInput placeholder copy", () => {
  it("textarea placeholder is the prototype copy (frustrations / hopes / fights)", () => {
    render(
      <LanguageProvider>
        <ColdOpenInput onSubmit={vi.fn()} onStarterProfileLoaded={vi.fn()} />
      </LanguageProvider>,
    );
    const textarea = screen.getByTestId("cold-open-textarea");
    const placeholder = textarea.getAttribute("placeholder") ?? "";
    expect(placeholder).toMatch(/Things that have been on your mind/i);
    expect(placeholder).toMatch(/Frustrations/i);
    expect(placeholder).toMatch(/community/i);
    expect(placeholder).not.toMatch(/Describe what you care about/i);
  });
});

/* ── P2 — BallotPane Print → ink primary ───────────────────────── */

describe("PR C / P2 — BallotPane Print button = ink primary (not civic)", () => {
  it("Print button has bg-ink / text-paper (the 'final artifact' treatment)", () => {
    renderBallotPane();
    const print = screen.getByTestId("ballot-pane-print");
    expect(print.className).toMatch(/bg-ink\b/);
    expect(print.className).toMatch(/text-paper\b/);
    expect(print.className).not.toMatch(/bg-civic\b/);
  });
});

/* ── P2 — Workspace input meta row ────────────────────────────── */

const wsRace = {
  id: "r1",
  label: "U.S. Senate",
  section: "Federal",
  candidates: [{ name: "Sample Candidate", party: "D" }],
};

function workspaceProps() {
  return {
    activeRace: wsRace,
    totalRaces: 2,
    activeRaceIndex: 0,
    decided: false,
    prevActiveRaceId: null,
    onCommitDecision: vi.fn(),
    onUnpickDecision: vi.fn(),
    chatCatchSuggestion: null,
    onChatCatch: vi.fn(),
    onChatCatchAccept: vi.fn(),
    onChatCatchDismiss: vi.fn(),
    onAmendmentSave: vi.fn(),
    onAmendmentInFlightChange: vi.fn(),
    onAmendmentDiscard: vi.fn(),
    onRescoreOfferClear: vi.fn(),
  };
}

describe("PR C / P2 — workspace chat input meta row", () => {
  it("renders an auto-saving + race counter meta row below the input", () => {
    render(
      <LanguageProvider>
        <ChatPanel
          state={stubState}
          zipCode="08106"
          countyName="Camden County"
          promptFleetV2Enabled
          workspace={workspaceProps()}
        />
      </LanguageProvider>,
    );
    const meta = screen.getByTestId("workspace-chat-input-meta");
    expect(meta.textContent ?? "").toMatch(/auto-saving/i);
    // Tolerate "Race 1 / 2" or "Race 1 of 2"
    expect(meta.textContent ?? "").toMatch(/Race 1.*[\/o].*2/i);
    expect(meta.className).toMatch(/font-mono/);
  });
});

describe("PR C / P2 — workspace chips + send + race-level pick de-mono", () => {
  function renderWorkspace() {
    return render(
      <LanguageProvider>
        <ChatPanel
          state={stubState}
          zipCode="08106"
          countyName="Camden County"
          promptFleetV2Enabled
          workspace={workspaceProps()}
        />
      </LanguageProvider>,
    );
  }

  it("workspace Send button is sentence-case sans, NOT mono/widest-tracking", () => {
    renderWorkspace();
    const send = screen.getByTestId("workspace-chat-send");
    expect(send.className).not.toMatch(/font-mono/);
    expect(send.className).not.toMatch(/uppercase/);
    expect(send.className).not.toMatch(/tracking-widest/);
  });

  it("workspace chip(s) are sentence-case sans, NOT mono uppercase", () => {
    renderWorkspace();
    const chips = screen.getAllByTestId(/workspace-chat-suggestion-/);
    expect(chips.length).toBeGreaterThan(0);
    chips.forEach((chip) => {
      expect(chip.className).not.toMatch(/font-mono/);
      expect(chip.className).not.toMatch(/uppercase/);
    });
  });

  it("race-level 'Pick US Senate' fallback button is sentence-case sans, NOT mono uppercase", () => {
    renderWorkspace();
    const pick = screen.getByTestId("workspace-pick-trigger");
    expect(pick.className).not.toMatch(/font-mono/);
    expect(pick.className).not.toMatch(/uppercase/);
  });
});

/* ── P2 — BudgetExhausted CTA sweep ────────────────────────────── */

describe("PR C / P2 — BudgetExhausted CTAs de-mono", () => {
  const FUTURE_RESET = "2030-06-01T00:00:00Z";
  const PAST_RESET = "2020-01-01T00:00:00Z";
  const FIXTURE_HANDOFF = "handoff prompt";

  function renderBudget(
    overrides: Partial<Parameters<typeof BudgetExhausted>[0]> = {},
  ) {
    const defaults = {
      resetAt: FUTURE_RESET,
      handoffPromptText: FIXTURE_HANDOFF,
      onByokContinue: vi.fn(),
      onByokRemove: vi.fn(),
      storedByokKey: null as string | null,
      onResume: vi.fn(),
      onDismiss: vi.fn(),
    };
    return render(<BudgetExhausted {...defaults} {...overrides} />);
  }

  it("Copy-handoff-prompt button is sentence-case sans, NOT mono uppercase", () => {
    renderBudget();
    const cta = screen.getByTestId("handoff-prompt-copy");
    expect(cta.className).not.toMatch(/font-mono/);
    expect(cta.className).not.toMatch(/uppercase/);
  });

  it("BYOK Save button is sentence-case sans, NOT mono uppercase", () => {
    renderBudget();
    const cta = screen.getByTestId("byok-save");
    expect(cta.className).not.toMatch(/font-mono/);
    expect(cta.className).not.toMatch(/uppercase/);
  });

  it("BYOK Remove button is sentence-case sans, NOT mono uppercase", () => {
    renderBudget({ storedByokKey: "sk-ant-test-key" });
    const cta = screen.getByTestId("byok-remove");
    expect(cta.className).not.toMatch(/font-mono/);
    expect(cta.className).not.toMatch(/uppercase/);
  });

  it("Resume free-chat button is sentence-case sans, NOT mono uppercase", () => {
    renderBudget({ resetAt: PAST_RESET });
    const cta = screen.getByTestId("resume-button");
    expect(cta.className).not.toMatch(/font-mono/);
    expect(cta.className).not.toMatch(/uppercase/);
  });
});

/* ── P2 — PrintBallot 4-cell voter-meta grid ──────────────────── */

describe("PR C / P2 — PrintBallot voter-meta 4-cell grid", () => {
  it("renders 4 cells: Address / District / Bring / Early voting", () => {
    const pollingData: PollingDataShape = {
      whatToBring: "Government-issued photo ID",
      earlyVotingWindow: "Oct 25 to Nov 1",
    };
    const { container } = render(
      <PrintBallot
        decisions={[sampleDecision]}
        themes={[]}
        races={[sampleRace]}
        pollingData={pollingData}
        cityState="260 Atlantic Ave, Camden, NJ"
        electionLabel="2026 General Election"
        electionDate="2026-11-03"
        onBack={vi.fn()}
        district="NJ-1"
      />,
    );

    // Scope queries to the .voter-meta grid so we don't collide with the
    // polling header's "Bring:" / "Early voting:" lines that already
    // surface the same data above the cells.
    const voterMeta = container.querySelector(".voter-meta") as HTMLElement;
    expect(voterMeta).not.toBeNull();
    const region = within(voterMeta);

    const labels = ["Address", "District", "Bring", "Early voting"];
    labels.forEach((label) => {
      const labelRegex = new RegExp(`^${label}$`, "i");
      expect(region.getByText(labelRegex)).toBeInTheDocument();
    });

    // Values wire through into the grid.
    expect(region.getByText(/260 Atlantic Ave/)).toBeInTheDocument();
    expect(region.getByText(/^NJ-1$/)).toBeInTheDocument();
    expect(region.getByText(/Government-issued photo ID/)).toBeInTheDocument();
    expect(region.getByText(/Oct 25/)).toBeInTheDocument();
  });
});
