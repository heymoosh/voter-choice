// @vitest-environment jsdom
/**
 * Tests for the Phase 5 PartyGate routing inside ElectionResult.
 *
 * The packet says routing lives in PageContent.tsx, but PageContent is the
 * landing-page wrapper that renders `{children}`. The real address →
 * workspace transition happens in `ElectionResult` (inside BallotToolClient).
 * Routing the new gate there is the architecturally correct call — see
 * advisor note in the Phase 5 work packet.
 *
 * Contract:
 *   - PROMPT_FLEET_V2 on + en + rule exists for (state, electionType) →
 *     PartyGate renders, cold-open does not.
 *   - PROMPT_FLEET_V2 off OR ES locale → legacy gate path (existing tests
 *     already cover; we just assert the new gate does NOT appear).
 *   - PROMPT_FLEET_V2 on but no rule (e.g. general election in any state)
 *     → no PartyGate; existing pre-research surface renders.
 *   - User completes the new gate → ballotContext is stored, gate hides,
 *     downstream pre-research flow proceeds.
 *
 * See .ai/work-packets/redesign-phase-5-state-party-gates.md.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import { LanguageProvider } from "../lib/i18n";
import type { StateElectionData } from "../types/election";
import { ElectionResult } from "./BallotToolClient";

/* ── Fixtures ─────────────────────────────────────────────── */

/** Texas state with an upcoming RUNOFF election — triggers the TX rule. */
const txRunoffState: StateElectionData = {
  stateCode: "TX",
  stateName: "Texas",
  lastUpdated: "2026-03-01",
  elections: [
    {
      id: "tx-2026-runoff",
      name: "2026 Texas Primary Runoff",
      date: "2026-05-25",
      type: "runoff",
      isPrimary: false,
      primaryType: null,
    },
  ],
  registration: {
    online: {
      available: true,
      deadline: "2026-04-25",
      url: "https://www.votetexas.gov/",
    },
    byMail: { deadline: "2026-04-25", sincePostmarked: true },
    inPerson: { deadline: "2026-04-25", sincePostmarked: false },
    sameDayRegistration: false,
    registrationCheckUrl: "https://teamrv-mvp.sos.texas.gov/MVP/mvp.do",
  },
  earlyVoting: {
    available: true,
    startDate: "2026-05-11",
    endDate: "2026-05-22",
  },
  votingRules: {
    idRequired: true,
    acceptedIds: ["Texas driver's license"],
    phonesAtPolls: "prohibited",
    phonesAtPollsDetail: "Phones prohibited.",
    additionalRules: [],
  },
  resources: {
    stateElectionWebsite: "https://www.votetexas.gov/",
    countyElectionLookup: "https://www.votetexas.gov/voting/where.html",
    sampleBallotLookup: "https://www.votetexas.gov/voting/ballot-board.html",
    pollingPlaceLookup: "https://www.votetexas.gov/voting/where.html",
  },
  runoffRules: {
    hasRunoff: true,
    partyLockedToFirstRoundPrimary: true,
    ruleExplanation:
      "If you voted in one party's March primary, you may only vote in that same party's runoff.",
  },
};

/** California (CA) with an upcoming PRIMARY — top-two, no rule → no gate. */
const caPrimaryState: StateElectionData = {
  ...txRunoffState,
  stateCode: "CA",
  stateName: "California",
  elections: [
    {
      id: "ca-2026-primary",
      name: "2026 California Primary",
      date: "2026-06-02",
      type: "primary",
      isPrimary: true,
      // CA's top-two has no "top-two" enum value; "open" captures the
      // single-ballot-for-everyone behavior closest in the union. The Phase
      // 5 lookup returns null for (CA, primary) regardless of this field,
      // which is the point of the test.
      primaryType: "open",
    },
  ],
};

/* ── Mocks ────────────────────────────────────────────────── */

let originalFetch: typeof fetch;
beforeEach(() => {
  originalFetch = global.fetch;
  global.fetch = vi.fn(async () => {
    return new Response(
      JSON.stringify({ budget: { tier: "normal", percent: 0 } }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as unknown as typeof fetch;
  window.localStorage.clear();
});

afterEach(() => {
  global.fetch = originalFetch;
  cleanup();
});

/* ── Tests ────────────────────────────────────────────────── */

describe("ElectionResult — PartyGate routing (Phase 5)", () => {
  it("renders PartyGate when flag is on + en + rule matches the upcoming election", () => {
    render(
      <LanguageProvider>
        <ElectionResult
          state={txRunoffState}
          zipCode="77002"
          lang="en"
          initialPollingData={null}
          promptFleetV2Enabled={true}
        />
      </LanguageProvider>,
    );
    expect(screen.getByTestId("party-gate")).toBeInTheDocument();
    expect(screen.getByText(/Tex\. Elec\. Code §172\.087/)).toBeInTheDocument();
    // The legacy runoff gate must NOT render when the new gate is up.
    expect(screen.queryByTestId("runoff-gate")).not.toBeInTheDocument();
  });

  it("does NOT render PartyGate when the flag is off (legacy gate path takes over)", () => {
    render(
      <LanguageProvider>
        <ElectionResult
          state={txRunoffState}
          zipCode="77002"
          lang="en"
          initialPollingData={null}
          promptFleetV2Enabled={false}
        />
      </LanguageProvider>,
    );
    expect(screen.queryByTestId("party-gate")).not.toBeInTheDocument();
    // The legacy runoff gate keeps rendering on the flag-off path.
    expect(screen.getByTestId("runoff-gate")).toBeInTheDocument();
  });

  it("does NOT render PartyGate when locale is ES (legacy path)", () => {
    render(
      <LanguageProvider>
        <ElectionResult
          state={txRunoffState}
          zipCode="77002"
          lang="es"
          initialPollingData={null}
          promptFleetV2Enabled={true}
        />
      </LanguageProvider>,
    );
    expect(screen.queryByTestId("party-gate")).not.toBeInTheDocument();
    // Legacy gate still renders for ES.
    expect(screen.getByTestId("runoff-gate")).toBeInTheDocument();
  });

  it("does NOT render PartyGate for states/elections with no rule (e.g. CA primary = top-two)", () => {
    render(
      <LanguageProvider>
        <ElectionResult
          state={caPrimaryState}
          zipCode="94102"
          lang="en"
          initialPollingData={null}
          promptFleetV2Enabled={true}
        />
      </LanguageProvider>,
    );
    expect(screen.queryByTestId("party-gate")).not.toBeInTheDocument();
  });

  it("hides PartyGate after the user makes a selection + Continue", () => {
    render(
      <LanguageProvider>
        <ElectionResult
          state={txRunoffState}
          zipCode="77002"
          lang="en"
          initialPollingData={null}
          promptFleetV2Enabled={true}
        />
      </LanguageProvider>,
    );
    expect(screen.getByTestId("party-gate")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("party-gate-option-voted_dem_primary"));
    fireEvent.click(screen.getByTestId("party-gate-continue"));
    expect(screen.queryByTestId("party-gate")).not.toBeInTheDocument();
  });
});
