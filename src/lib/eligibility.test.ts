/**
 * src/lib/eligibility.test.ts
 *
 * Table-driven tests for the per-seat eligibility resolver.
 */

import { describe, it, expect } from "vitest";
import type { StateElectionData } from "../types/election";
import {
  resolveSeatEligibility,
  formatLongDate,
  formatShortDate,
} from "./eligibility";

const TODAY = "2026-01-15";

function stateFixture(
  overrides: Partial<StateElectionData>,
): StateElectionData {
  const base = {
    stateCode: "TX",
    stateName: "Texas",
    lastUpdated: "2026-01-01",
    coverageStatus: "confirmed",
    elections: [
      {
        id: "tx-primary",
        name: "Texas Primary",
        date: "2026-03-03",
        type: "primary",
        isPrimary: true,
        primaryType: "open",
      },
      {
        id: "tx-general",
        name: "General Election",
        date: "2026-11-03",
        type: "general",
        isPrimary: false,
        primaryType: null,
      },
    ],
    registration: {
      online: { available: false, deadline: null, url: "" },
      byMail: { deadline: "2026-02-02", sincePostmarked: true },
      inPerson: { deadline: "2026-02-02", sincePostmarked: false },
      sameDayRegistration: false,
      registrationCheckUrl: "https://teamrv-mvp.sos.texas.gov/MVP/mvp.do",
    },
    resources: {
      stateElectionWebsite: "https://www.votetexas.gov/",
      countyElectionLookup: "",
      sampleBallotLookup: "",
      pollingPlaceLookup: "",
    },
    runoffRules: {
      hasRunoff: true,
      partyLockedToFirstRoundPrimary: true,
      ruleExplanation: "Runoff voters are locked to their first-round party.",
    },
    primaryParticipation: {
      type: "open",
      ruleExplanationEn: "Texas runs an open primary.",
      ruleExplanationEs: "",
      behavior: "advisory",
    },
  };
  return { ...base, ...overrides } as StateElectionData;
}

describe("formatLongDate / formatShortDate", () => {
  it("formats ISO dates without TZ drift", () => {
    expect(formatLongDate("2026-03-03")).toBe("March 3, 2026");
    expect(formatShortDate("2026-02-02")).toBe("Feb 2");
  });

  it("passes through unparseable values", () => {
    expect(formatLongDate("next up 2028")).toBe("next up 2028");
  });
});

describe("resolveSeatEligibility — on the 2026 ballot, primary next", () => {
  it("TX open primary + runoff lock → warn with both rules", () => {
    const out = resolveSeatEligibility(
      stateFixture({}),
      { chamber: "senate", onBallot2026: true },
      TODAY,
    );
    expect(out.severity).toBe("warn");
    expect(out.nextLabel).toBe("Primary");
    expect(out.date).toBe("March 3, 2026");
    expect(out.ruleHtml).toContain("open primary");
    expect(out.ruleHtml).toContain("runoff");
    expect(out.todo).toEqual({
      text: "Register by Feb 2",
      href: "https://teamrv-mvp.sos.texas.gov/MVP/mvp.do",
    });
    expect(out.sourceUrl).toBe("https://www.votetexas.gov/");
  });

  it("closed primary without runoff → warn (party rule consequence)", () => {
    const out = resolveSeatEligibility(
      stateFixture({
        stateName: "New Jersey",
        runoffRules: {
          hasRunoff: false,
          partyLockedToFirstRoundPrimary: false,
        },
        primaryParticipation: {
          type: "closed",
          ruleExplanationEn: "",
          ruleExplanationEs: "",
          behavior: "advisory",
        },
      }),
      { chamber: "house", onBallot2026: true },
      TODAY,
    );
    expect(out.severity).toBe("warn");
    expect(out.ruleHtml).toContain("closed primary");
    expect(out.ruleHtml).not.toContain("runoff");
  });

  it("top-two primary, no runoff lock → info", () => {
    const out = resolveSeatEligibility(
      stateFixture({
        stateName: "California",
        runoffRules: {
          hasRunoff: false,
          partyLockedToFirstRoundPrimary: false,
        },
        primaryParticipation: {
          type: "top-two",
          ruleExplanationEn: "",
          ruleExplanationEs: "",
          behavior: "advisory",
        },
      }),
      { chamber: "house", onBallot2026: true },
      TODAY,
    );
    expect(out.severity).toBe("info");
    expect(out.ruleHtml).toContain("top-two");
  });
});

describe("resolveSeatEligibility — general next / edge cases", () => {
  it("after the primary has passed, points at the general", () => {
    const out = resolveSeatEligibility(
      stateFixture({}),
      { chamber: "house", onBallot2026: true },
      "2026-06-01",
    );
    expect(out.nextLabel).toBe("General");
    expect(out.date).toBe("November 3, 2026");
    expect(out.ruleHtml).toContain("every two years");
    // Registration deadline (Feb 2) has passed → no todo.
    expect(out.todo).toBeNull();
  });

  it("same-day registration states get no register todo", () => {
    const out = resolveSeatEligibility(
      stateFixture({
        registration: {
          online: { available: true, deadline: "2026-10-01", url: "x" },
          byMail: { deadline: "2026-10-01", sincePostmarked: false },
          inPerson: { deadline: "2026-11-03", sincePostmarked: false },
          sameDayRegistration: true,
          registrationCheckUrl: "",
        },
      }),
      { chamber: "house", onBallot2026: true },
      TODAY,
    );
    expect(out.todo).toBeNull();
  });

  it("prefers the online deadline + url when online registration exists", () => {
    const out = resolveSeatEligibility(
      stateFixture({
        registration: {
          online: {
            available: true,
            deadline: "2026-02-10",
            url: "https://register.example",
          },
          byMail: { deadline: "2026-02-02", sincePostmarked: false },
          inPerson: { deadline: "2026-02-02", sincePostmarked: false },
          sameDayRegistration: false,
          registrationCheckUrl: "",
        },
      }),
      { chamber: "senate", onBallot2026: true },
      TODAY,
    );
    expect(out.todo).toEqual({
      text: "Register by Feb 10",
      href: "https://register.example",
    });
  });
});

describe("resolveSeatEligibility — not on the 2026 ballot", () => {
  it("renders the info variant with the next-up year", () => {
    const out = resolveSeatEligibility(
      stateFixture({}),
      { chamber: "senate", onBallot2026: false, nextUpYear: 2028 },
      TODAY,
    );
    expect(out.severity).toBe("info");
    expect(out.nextLabel).toBe("Not on your 2026 ballot");
    expect(out.date).toBe("next up 2028");
    expect(out.ruleHtml).toContain("2028");
    expect(out.todo).toBeNull();
  });

  it("handles an unknown next-up year honestly", () => {
    const out = resolveSeatEligibility(
      stateFixture({}),
      { chamber: "senate", onBallot2026: false },
      TODAY,
    );
    expect(out.date).toBe("next up after 2026");
  });
});

describe("resolveSeatEligibility — unknown ballot status", () => {
  it("never invents a date", () => {
    const out = resolveSeatEligibility(
      stateFixture({}),
      { chamber: "senate", onBallot2026: null },
      TODAY,
    );
    expect(out.severity).toBe("info");
    expect(out.date).toBe("unverified");
    expect(out.ruleHtml).toContain("couldn't verify");
  });
});
