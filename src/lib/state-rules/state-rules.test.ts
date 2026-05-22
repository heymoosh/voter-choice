/**
 * Tests for the state-rules lookup module.
 *
 * These are parameterized table-driven tests over (state, electionType) →
 * StateRule|null. The whole point of Phase 5 is that adding a new state is
 * adding a row of data + a row of test fixture — never new conditional code
 * inside the gate component or the lookup function. The meta-test at the
 * bottom of this file demonstrates that pattern.
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

describe("meta: rules-as-data discipline", () => {
  it("returns null for any state/electionType pair not explicitly in the rules table (template-row pattern)", () => {
    // This test locks the pattern: a hypothetical (GA, runoff) row would be
    // added to rules.ts as data only, and adding a fixture entry above would
    // be the ONLY code change required to support it. Today GA/NY ship as
    // commented template rows (per packet §13), so the lookup returns null.
    expect(getStateRule("GA", "runoff")).toBeNull();
    expect(getStateRule("NY", "primary")).toBeNull();
  });

  it("normalises lowercase state input to uppercase before lookup", () => {
    expect(getStateRule("tx", "runoff")).not.toBeNull();
    expect(getStateRule("pa", "primary")).not.toBeNull();
  });
});
