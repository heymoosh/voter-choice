/**
 * Tests for the state-rules lookup module.
 *
 * These are parameterized table-driven tests over (state, electionType) →
 * StateRule|null. The whole point of Phase 5 is that adding a new state is
 * adding a row of data + a row of test fixture — never new conditional code
 * inside the gate component or the lookup function. The meta-test at the
 * bottom of this file demonstrates that pattern.
 *
 * Phase 5b: extended to cover 21 closed-primary states + 7 semi-closed
 * primary states + 8 runoff-overlay states (29 rows total, plus explicit
 * negative fixtures for open-primary and top-two states).
 *
 * See .ai/work-packets/redesign-phase-5-state-party-gates.md.
 */

import { describe, it, expect } from "vitest";
import { getStateRule } from "./lookup";
import type { ElectionType, StateRule } from "./types";

interface Fixture {
  name: string;
  state: string;
  electionType: ElectionType;
  expected: null | {
    category: StateRule["category"];
    statuteCode: string;
    optionCount?: number;
    hasUnaffiliatedPath?: boolean;
  };
}

const fixtures: Fixture[] = [
  // ---------- Runoff overlays (semi-closed) ----------
  {
    name: "TX runoff: 5-option semi-closed overlay",
    state: "TX",
    electionType: "runoff",
    expected: {
      category: "semi-closed",
      statuteCode: "Tex. Elec. Code §172.087",
      optionCount: 5,
    },
  },
  {
    name: "GA runoff: 5-option semi-closed overlay",
    state: "GA",
    electionType: "runoff",
    expected: {
      category: "semi-closed",
      statuteCode: "O.C.G.A. §21-2-501",
      optionCount: 5,
    },
  },
  {
    name: "AL runoff: 5-option semi-closed overlay",
    state: "AL",
    electionType: "runoff",
    expected: {
      category: "semi-closed",
      statuteCode: "Ala. Code §17-13-101",
      optionCount: 5,
    },
  },
  {
    name: "AR runoff: 5-option semi-closed overlay",
    state: "AR",
    electionType: "runoff",
    expected: {
      category: "semi-closed",
      statuteCode: "Ark. Code §7-7-202",
      optionCount: 5,
    },
  },
  {
    name: "MS runoff: 5-option semi-closed overlay",
    state: "MS",
    electionType: "runoff",
    expected: {
      category: "semi-closed",
      statuteCode: "Miss. Code §23-15-781",
      optionCount: 5,
    },
  },
  {
    name: "NC runoff: second-primary overlay (open primary itself has no row)",
    state: "NC",
    electionType: "runoff",
    expected: {
      category: "semi-closed",
      statuteCode: "N.C. Gen. Stat. §163-110",
      optionCount: 5,
    },
  },
  {
    name: "OK runoff: 5-option semi-closed overlay",
    state: "OK",
    electionType: "runoff",
    expected: {
      category: "semi-closed",
      statuteCode: "Okla. Stat. tit. 26 §1-104",
      optionCount: 5,
    },
  },
  {
    name: "SC runoff: 5-option semi-closed overlay",
    state: "SC",
    electionType: "runoff",
    expected: {
      category: "semi-closed",
      statuteCode: "S.C. Code §7-13-15",
      optionCount: 5,
    },
  },

  // ---------- Closed primaries ----------
  {
    name: "PA primary: closed, registration-based",
    state: "PA",
    electionType: "primary",
    expected: {
      category: "closed",
      statuteCode: "25 Pa. Code §2812",
      hasUnaffiliatedPath: true,
    },
  },
  {
    name: "CT primary: closed, registration-based",
    state: "CT",
    electionType: "primary",
    expected: {
      category: "closed",
      statuteCode: "Conn. Gen. Stat. §9-431",
      hasUnaffiliatedPath: true,
    },
  },
  {
    name: "DE primary: closed, registration-based",
    state: "DE",
    electionType: "primary",
    expected: {
      category: "closed",
      statuteCode: "Del. Code Title 15 §3110",
      hasUnaffiliatedPath: true,
    },
  },
  {
    name: "DC primary: closed, registration-based",
    state: "DC",
    electionType: "primary",
    expected: {
      category: "closed",
      statuteCode: "D.C. Code §1-1001.09",
      hasUnaffiliatedPath: true,
    },
  },
  {
    name: "FL primary: closed, registration-based",
    state: "FL",
    electionType: "primary",
    expected: {
      category: "closed",
      statuteCode: "Fla. Stat. §101.021",
      hasUnaffiliatedPath: true,
    },
  },
  {
    name: "KS primary: closed (per SOS data, overrode packet semi-closed hint)",
    state: "KS",
    electionType: "primary",
    expected: {
      category: "closed",
      statuteCode: "Kan. Stat. §25-3301",
      hasUnaffiliatedPath: true,
    },
  },
  {
    name: "KY primary: closed, registration-based",
    state: "KY",
    electionType: "primary",
    expected: {
      category: "closed",
      statuteCode: "Ky. Rev. Stat. §116.044",
      hasUnaffiliatedPath: true,
    },
  },
  {
    name: "MD primary: closed, registration-based",
    state: "MD",
    electionType: "primary",
    expected: {
      category: "closed",
      statuteCode: "Md. Code Ann., Elec. Law §3-202",
      hasUnaffiliatedPath: true,
    },
  },
  {
    name: "NV primary: closed, registration-based",
    state: "NV",
    electionType: "primary",
    expected: {
      category: "closed",
      statuteCode: "Nev. Rev. Stat. §293.287",
      hasUnaffiliatedPath: true,
    },
  },
  {
    name: "NM primary: closed, registration-based",
    state: "NM",
    electionType: "primary",
    expected: {
      category: "closed",
      statuteCode: "N.M. Stat. §1-12-7",
      hasUnaffiliatedPath: true,
    },
  },
  {
    name: "NY primary: closed, registration-based",
    state: "NY",
    electionType: "primary",
    expected: {
      category: "closed",
      statuteCode: "N.Y. Elec. Law §5-300",
      hasUnaffiliatedPath: true,
    },
  },
  {
    name: "OK primary: closed (paired with OK_RUNOFF for two-row state)",
    state: "OK",
    electionType: "primary",
    expected: {
      category: "closed",
      statuteCode: "Okla. Stat. tit. 26 §1-104",
      hasUnaffiliatedPath: true,
    },
  },
  {
    name: "OR primary: closed, registration-based (mail-only state)",
    state: "OR",
    electionType: "primary",
    expected: {
      category: "closed",
      statuteCode: "Or. Rev. Stat. §247.121",
      hasUnaffiliatedPath: true,
    },
  },
  {
    name: "WY primary: closed (can change party at polls)",
    state: "WY",
    electionType: "primary",
    expected: {
      category: "closed",
      statuteCode: "Wyo. Stat. §22-5-212",
      hasUnaffiliatedPath: true,
    },
  },

  // ---------- Semi-closed primaries ----------
  {
    name: "AZ primary: semi-closed (4 options, no unaffiliated lock-out)",
    state: "AZ",
    electionType: "primary",
    expected: {
      category: "semi-closed",
      statuteCode: "Ariz. Rev. Stat. §16-467",
      optionCount: 4,
    },
  },
  {
    name: "CO primary: semi-closed (mail-state, unaffiliated returns one ballot)",
    state: "CO",
    electionType: "primary",
    expected: {
      category: "semi-closed",
      statuteCode: "Colo. Rev. Stat. §1-7-201",
      optionCount: 4,
    },
  },
  {
    name: "IA primary: semi-closed (no-party can affiliate at polls)",
    state: "IA",
    electionType: "primary",
    expected: {
      category: "semi-closed",
      statuteCode: "Iowa Code §43.41",
      optionCount: 4,
    },
  },
  {
    name: "NH primary: semi-open (undeclared voters pick a ballot, re-undeclare after)",
    state: "NH",
    electionType: "primary",
    expected: {
      category: "semi-closed",
      statuteCode: "N.H. Rev. Stat. §659:14",
      optionCount: 4,
    },
  },
  {
    name: "NJ primary: semi-closed (unaffiliated can affiliate at polls)",
    state: "NJ",
    electionType: "primary",
    expected: {
      category: "semi-closed",
      statuteCode: "N.J. Stat. Ann. §19:5-1",
      optionCount: 4,
    },
  },
  {
    name: "RI primary: semi-closed",
    state: "RI",
    electionType: "primary",
    expected: {
      category: "semi-closed",
      statuteCode: "R.I. Gen. Laws §17-9.1-23",
      optionCount: 4,
    },
  },
  {
    name: "WV primary: semi-closed (REP closed, DEM allows unaffiliated)",
    state: "WV",
    electionType: "primary",
    expected: {
      category: "semi-closed",
      statuteCode: "W. Va. Code §3-1-35",
      optionCount: 4,
    },
  },

  // ---------- Negative fixtures: no row expected ----------
  {
    name: "TX general: no gate",
    state: "TX",
    electionType: "general",
    expected: null,
  },
  {
    name: "TX primary: no gate in v1 (only runoff has a rule for TX)",
    state: "TX",
    electionType: "primary",
    expected: null,
  },
  {
    name: "PA general: no gate",
    state: "PA",
    electionType: "general",
    expected: null,
  },
  {
    name: "CA primary: top-two (no gate)",
    state: "CA",
    electionType: "primary",
    expected: null,
  },
  {
    name: "CA general: top-two (no gate)",
    state: "CA",
    electionType: "general",
    expected: null,
  },
  {
    name: "Generic state (WA) general: no gate",
    state: "WA",
    electionType: "general",
    expected: null,
  },
  {
    name: "Unknown state + runoff: no gate",
    state: "ZZ",
    electionType: "runoff",
    expected: null,
  },
  // Close-but-no-row states (open primaries, top-two/four, jungle) —
  // explicit negative fixtures so future readers see the choice was
  // deliberate, not an oversight:
  {
    name: "NC primary: open (no row); only runoff has a rule for NC",
    state: "NC",
    electionType: "primary",
    expected: null,
  },
  {
    name: "SD primary: open (no row); data overrides packet 'closed' hint",
    state: "SD",
    electionType: "primary",
    expected: null,
  },
  {
    name: "UT primary: open/hybrid (no row); data overrides packet 'semi-closed' hint",
    state: "UT",
    electionType: "primary",
    expected: null,
  },
  {
    name: "AK primary: top-four nonpartisan (no row)",
    state: "AK",
    electionType: "primary",
    expected: null,
  },
  {
    name: "LA primary: jungle / nonpartisan blanket (no row)",
    state: "LA",
    electionType: "primary",
    expected: null,
  },
  {
    name: "LA runoff: jungle general runoff, not party-locked (no row)",
    state: "LA",
    electionType: "runoff",
    expected: null,
  },
  {
    name: "IL primary: open (no row)",
    state: "IL",
    electionType: "primary",
    expected: null,
  },
  {
    name: "MI primary: open (no row)",
    state: "MI",
    electionType: "primary",
    expected: null,
  },
  {
    name: "OH primary: open (no row)",
    state: "OH",
    electionType: "primary",
    expected: null,
  },
  {
    name: "VA primary: open (no row)",
    state: "VA",
    electionType: "primary",
    expected: null,
  },
  {
    name: "WI primary: open (no row)",
    state: "WI",
    electionType: "primary",
    expected: null,
  },
];

describe("getStateRule (parameterized)", () => {
  for (const fx of fixtures) {
    it(fx.name, () => {
      const rule = getStateRule(fx.state, fx.electionType);
      if (fx.expected === null) {
        expect(rule).toBeNull();
        return;
      }
      expect(rule).not.toBeNull();
      expect(rule!.state).toBe(fx.state);
      expect(rule!.electionType).toBe(fx.electionType);
      expect(rule!.category).toBe(fx.expected.category);
      expect(rule!.statute.code).toBe(fx.expected.statuteCode);
      expect(rule!.statute.text.length).toBeGreaterThan(10);
      if (fx.expected.optionCount !== undefined) {
        expect(rule!.options?.length ?? 0).toBe(fx.expected.optionCount);
      }
      if (fx.expected.hasUnaffiliatedPath) {
        expect(rule!.unaffiliatedPath).toBeDefined();
        expect(
          rule!.unaffiliatedPath!.reregistrationUrl.length,
        ).toBeGreaterThan(0);
      }
    });
  }
});

describe("TX runoff option shape", () => {
  it("exposes the 5 expected runoff lanes with ballotTags", () => {
    const rule = getStateRule("TX", "runoff");
    expect(rule).not.toBeNull();
    const opts = rule!.options ?? [];
    const tags = opts.map((o) => o.ballotTag).sort();
    // Should include both DEM and REP runoff lanes plus the unsure clarification.
    expect(tags).toEqual(
      [
        "DEM-runoff",
        "DEM-runoff-open",
        "REP-runoff",
        "REP-runoff-open",
        "UNSURE",
      ].sort(),
    );
    const clarification = opts.find((o) => o.clarification === true);
    expect(clarification).toBeDefined();
    expect(clarification!.ballotTag).toBe("UNSURE");
    // Every option must have a non-empty user-visible label.
    for (const o of opts) {
      expect(o.label.length).toBeGreaterThan(0);
      expect(o.id.length).toBeGreaterThan(0);
    }
  });
});

describe("PA primary closed path", () => {
  it("includes DEM and REP options keyed on registration, plus unaffiliated path", () => {
    const rule = getStateRule("PA", "primary");
    expect(rule).not.toBeNull();
    const opts = rule!.options ?? [];
    const tags = opts.map((o) => o.ballotTag).sort();
    expect(tags).toEqual(["DEM-primary", "REP-primary"].sort());
    expect(rule!.unaffiliatedPath).toBeDefined();
    expect(rule!.unaffiliatedPath!.message.length).toBeGreaterThan(10);
    expect(rule!.unaffiliatedPath!.canSkipToGeneral).toBe(true);
  });
});

describe("NJ semi-closed shape", () => {
  it("includes registered + unaffiliated lanes WITHOUT an unaffiliatedPath lock-out", () => {
    const rule = getStateRule("NJ", "primary");
    expect(rule).not.toBeNull();
    const opts = rule!.options ?? [];
    const tags = opts.map((o) => o.ballotTag).sort();
    expect(tags).toEqual(
      [
        "DEM-primary",
        "REP-primary",
        "DEM-primary-open",
        "REP-primary-open",
      ].sort(),
    );
    // Semi-closed states allow unaffiliated voters to vote → no lock-out path.
    expect(rule!.unaffiliatedPath).toBeUndefined();
  });
});

describe("OK two-row state", () => {
  it("returns the closed-primary rule for (OK, primary)", () => {
    const rule = getStateRule("OK", "primary");
    expect(rule).not.toBeNull();
    expect(rule!.category).toBe("closed");
    expect(rule!.unaffiliatedPath).toBeDefined();
  });

  it("returns the runoff-overlay rule for (OK, runoff) — the lookup discriminates on electionType", () => {
    const rule = getStateRule("OK", "runoff");
    expect(rule).not.toBeNull();
    expect(rule!.category).toBe("semi-closed");
    expect(rule!.options?.length).toBe(5);
  });
});

describe("externalResources discipline", () => {
  it("every shipped rule carries an externalResources block with at least one canonical URL", () => {
    const codes: Array<[string, ElectionType]> = [
      ["TX", "runoff"],
      ["GA", "runoff"],
      ["AL", "runoff"],
      ["AR", "runoff"],
      ["MS", "runoff"],
      ["NC", "runoff"],
      ["OK", "runoff"],
      ["SC", "runoff"],
      ["PA", "primary"],
      ["CT", "primary"],
      ["DE", "primary"],
      ["DC", "primary"],
      ["FL", "primary"],
      ["KS", "primary"],
      ["KY", "primary"],
      ["MD", "primary"],
      ["NV", "primary"],
      ["NM", "primary"],
      ["NY", "primary"],
      ["OK", "primary"],
      ["OR", "primary"],
      ["WY", "primary"],
      ["AZ", "primary"],
      ["CO", "primary"],
      ["IA", "primary"],
      ["NH", "primary"],
      ["NJ", "primary"],
      ["RI", "primary"],
      ["WV", "primary"],
    ];
    for (const [state, etype] of codes) {
      const rule = getStateRule(state, etype);
      expect(rule, `${state} ${etype} should have a rule`).not.toBeNull();
      const ext = rule!.externalResources;
      expect(
        ext,
        `${state} ${etype} should have externalResources`,
      ).toBeDefined();
      // At least one of sosVoterLookupUrl / countyElectionsLocatorUrl must exist.
      const anyUrl =
        (ext?.sosVoterLookupUrl?.length ?? 0) > 0 ||
        (ext?.countyElectionsLocatorUrl?.length ?? 0) > 0;
      expect(anyUrl, `${state} ${etype} needs at least one canonical URL`).toBe(
        true,
      );
    }
  });
});

describe("meta: rules-as-data discipline", () => {
  it("returns null for any state/electionType pair not in the table (template-row pattern)", () => {
    // This test locks the pattern: adding a new uncovered cell is purely a
    // data change (a row in rules.ts + a fixture above). Today these cells
    // are deliberately uncovered (open-primary states that don't have a
    // runoff overlay either):
    expect(getStateRule("IL", "primary")).toBeNull();
    expect(getStateRule("MI", "primary")).toBeNull();
    expect(getStateRule("OH", "primary")).toBeNull();
  });

  it("normalises lowercase state input to uppercase before lookup", () => {
    expect(getStateRule("tx", "runoff")).not.toBeNull();
    expect(getStateRule("pa", "primary")).not.toBeNull();
    expect(getStateRule("nj", "primary")).not.toBeNull();
    expect(getStateRule("ga", "runoff")).not.toBeNull();
  });
});
