import { describe, it, expect } from "vitest";
import { stateCodeFrom } from "./realData";

/**
 * Tests for stateCodeFrom — best-effort 2-letter state/territory code from an
 * address string or a ballot jurisdiction. Pure and synchronous; never throws.
 *
 * The sharp cases are the save→paste round-trip: the app's own saved-plan .txt
 * export opens with a "MY BALLOT" (or Spanish "MI BOLETA") header, and the old
 * fallback grabbed the FIRST 2-letter uppercase token — "MY", or the valid-but-
 * wrong "MI" (Michigan). The state actually trails the jurisdiction, so the
 * fallback now keeps only real codes and prefers the LAST one.
 */
describe("stateCodeFrom", () => {
  describe('"MY BALLOT" / "MI BOLETA" header round-trip (the regression)', () => {
    it('reads the trailing state, not the "MY" in a "MY BALLOT" header', () => {
      const ballot =
        "MY BALLOT — Camden County, NJ\n" +
        "U.S. Senate: Cory Booker (D), Curtis Bashaw (R)";
      expect(stateCodeFrom(ballot)).toBe("NJ");
    });

    it('reads the trailing state, not the "MI" (Michigan!) in a Spanish "MI BOLETA" header', () => {
      // Validation alone wouldn't fix this — "MI" is a real code — so the
      // last-match preference is what makes the trailing "NJ" win.
      const ballot =
        "MI BOLETA — Camden County, NJ\n" +
        "Senado de EE. UU.: Cory Booker (D), Curtis Bashaw (R)";
      expect(stateCodeFrom(ballot)).toBe("NJ");
    });

    it("still resolves a trailing state under a SAMPLE BALLOT header", () => {
      expect(stateCodeFrom("SAMPLE BALLOT — Harris County, TX")).toBe("TX");
    });

    it('ignores the "IN" in an all-caps WRITE-IN body line (not Indiana)', () => {
      // stateCodeFrom receives the WHOLE pasted ballot, and "\bIN\b" inside
      // "WRITE-IN" is a valid code — so the header jurisdiction, not a stray
      // body token, must win.
      const ballot = "MY BALLOT — Camden County, NJ\nMayor: WRITE-IN";
      expect(stateCodeFrom(ballot)).toBe("NJ");
    });

    it("resolves the state from a realistic multi-race export with body noise", () => {
      const realExport = [
        "MY BALLOT — Camden County, NJ",
        "U.S. Senate (Vote for 1): Cory Booker (D), Curtis Bashaw (R)",
        "County Commissioner (Vote for 2): Jane Doe (D), WRITE-IN",
        "Propositions:",
        "Prop 1: NO — Keep the state property-tax cap",
      ].join("\n");
      expect(stateCodeFrom(realExport)).toBe("NJ");
    });
  });

  describe("full state names (case-insensitive)", () => {
    it("maps a full state name", () => {
      expect(stateCodeFrom("123 Main St, Newark, New Jersey")).toBe("NJ");
    });

    it("maps a lowercased full name", () => {
      expect(stateCodeFrom("somewhere in new jersey")).toBe("NJ");
    });

    it('prefers "west virginia" over its "virginia" substring', () => {
      // Longest-name-first ordering: an includes() on "west virginia" must not
      // short-circuit on the "virginia" entry and return VA.
      expect(stateCodeFrom("Charleston, West Virginia")).toBe("WV");
      expect(stateCodeFrom("Richmond, Virginia")).toBe("VA");
    });
  });

  describe("abbreviation fallback", () => {
    it("reads a bare jurisdiction tail", () => {
      expect(stateCodeFrom("Camden County, NJ")).toBe("NJ");
    });

    it("reads the state from a full street address with ZIP", () => {
      expect(stateCodeFrom("123 Main St, Newark, NJ 07102")).toBe("NJ");
    });

    it('rejects the non-state "US" token', () => {
      expect(stateCodeFrom("US Senate")).toBe("");
      expect(stateCodeFrom("US Senate, Newark NJ")).toBe("NJ");
    });

    it("recognizes a territory code", () => {
      expect(stateCodeFrom("Mayagüez, PR")).toBe("PR");
    });
  });

  describe("no resolvable state", () => {
    it("returns empty string when nothing matches", () => {
      expect(stateCodeFrom("County Commissioner ballot")).toBe("");
    });

    it("returns empty string for empty / whitespace / null-ish input", () => {
      expect(stateCodeFrom("")).toBe("");
      expect(stateCodeFrom("   ")).toBe("");
      expect(stateCodeFrom(undefined as unknown as string)).toBe("");
    });
  });
});
