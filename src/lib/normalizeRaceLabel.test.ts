// @vitest-environment node
import { describe, it, expect } from "vitest";
import { normalizeRaceLabel } from "./normalizeRaceLabel";

/**
 * Tests for normalizeRaceLabel — concise canonical race labels for the
 * workspace rail, ballot pane, and print artifact. The normalizer is a pure,
 * synchronous function and never throws; unknown offices fall back to a
 * sensible "office — district" composition.
 */

describe("normalizeRaceLabel", () => {
  describe("U.S. House variants", () => {
    it("normalizes 'Member of the House of Representatives' with a federal district", () => {
      expect(
        normalizeRaceLabel(
          "Member of the House of Representatives",
          "1st Congressional District",
        ),
      ).toBe("U.S. House — CD-1");
    });

    it("normalizes 'U.S. House of Representatives' with a numeric district", () => {
      expect(normalizeRaceLabel("U.S. House of Representatives", "7")).toBe(
        "U.S. House — CD-7",
      );
    });

    it("normalizes 'U.S. Representative' with a district", () => {
      expect(normalizeRaceLabel("U.S. Representative", "12")).toBe(
        "U.S. House — CD-12",
      );
    });

    it("normalizes 'U.S. House' with no district", () => {
      expect(normalizeRaceLabel("U.S. House", "")).toBe("U.S. House");
    });

    it("normalizes 'House of Representatives' (no U.S. prefix) as federal House", () => {
      expect(normalizeRaceLabel("House of Representatives", "3rd")).toBe(
        "U.S. House — CD-3",
      );
    });
  });

  describe("U.S. Senate", () => {
    it("normalizes 'United States Senator'", () => {
      expect(normalizeRaceLabel("United States Senator", "")).toBe(
        "U.S. Senate",
      );
    });

    it("normalizes 'U.S. Senator'", () => {
      expect(normalizeRaceLabel("U.S. Senator", "")).toBe("U.S. Senate");
    });
  });

  describe("Executive offices", () => {
    it("normalizes 'President of the United States'", () => {
      expect(normalizeRaceLabel("President of the United States", "")).toBe(
        "President",
      );
    });

    it("normalizes 'President'", () => {
      expect(normalizeRaceLabel("President", "")).toBe("President");
    });

    it("normalizes 'Vice President'", () => {
      expect(normalizeRaceLabel("Vice President", "")).toBe("Vice President");
    });

    it("normalizes 'Governor'", () => {
      expect(normalizeRaceLabel("Governor", "")).toBe("Governor");
    });

    it("normalizes 'Lieutenant Governor' as 'Lt. Governor'", () => {
      expect(normalizeRaceLabel("Lieutenant Governor", "")).toBe(
        "Lt. Governor",
      );
    });

    it("normalizes 'Attorney General'", () => {
      expect(normalizeRaceLabel("Attorney General", "")).toBe(
        "Attorney General",
      );
    });

    it("normalizes 'Secretary of State'", () => {
      expect(normalizeRaceLabel("Secretary of State", "")).toBe(
        "Secretary of State",
      );
    });
  });

  describe("State legislature", () => {
    it("normalizes 'State Senator' with a district", () => {
      expect(normalizeRaceLabel("State Senator", "12")).toBe(
        "State Senate — District 12",
      );
    });

    it("normalizes 'Senator' (no state/US prefix) as state senate by default", () => {
      // Bare "Senator" is ambiguous, but the table maps /^(state )?senator$/i
      // to State Senate. The Civic API path uses "U.S. Senator" for federal.
      expect(normalizeRaceLabel("Senator", "9")).toBe(
        "State Senate — District 9",
      );
    });

    it("normalizes 'State Representative' with a district", () => {
      expect(normalizeRaceLabel("State Representative", "8")).toBe(
        "State House — District 8",
      );
    });
  });

  describe("County offices", () => {
    it("normalizes 'Members of the Board of County Commissioners'", () => {
      expect(
        normalizeRaceLabel("Members of the Board of County Commissioners", ""),
      ).toBe("County Commissioners");
    });

    it("normalizes 'Member of the Board of County Commissioners' (singular)", () => {
      expect(
        normalizeRaceLabel("Member of the Board of County Commissioners", ""),
      ).toBe("County Commissioners");
    });
  });

  describe("County Committee — preserve concise inputs", () => {
    it("preserves 'Female Members of County Committee' as-is", () => {
      expect(normalizeRaceLabel("Female Members of County Committee", "")).toBe(
        "Female Members of County Committee",
      );
    });

    it("preserves 'Male Member of the County Committee' as-is", () => {
      expect(
        normalizeRaceLabel("Male Member of the County Committee", ""),
      ).toBe("Male Member of the County Committee");
    });
  });

  describe("Judicial", () => {
    it("normalizes 'Circuit Judge' as 'Circuit Court Judge'", () => {
      expect(normalizeRaceLabel("Circuit Judge", "")).toBe(
        "Circuit Court Judge",
      );
    });

    it("normalizes 'Circuit Court Judge'", () => {
      expect(normalizeRaceLabel("Circuit Court Judge", "")).toBe(
        "Circuit Court Judge",
      );
    });

    it("normalizes 'County Judge'", () => {
      expect(normalizeRaceLabel("County Judge", "")).toBe("County Judge");
    });
  });

  describe("Elections officials", () => {
    it("normalizes 'Supervisor of Elections'", () => {
      expect(normalizeRaceLabel("Supervisor of Elections", "")).toBe(
        "Supervisor of Elections",
      );
    });
  });

  describe("Constitutional amendments — preserve, not an office", () => {
    it("preserves 'Constitutional Amendment 1' as-is", () => {
      expect(normalizeRaceLabel("Constitutional Amendment 1", "")).toBe(
        "Constitutional Amendment 1",
      );
    });

    it("preserves 'Constitutional Amendment No. 3'", () => {
      expect(normalizeRaceLabel("Constitutional Amendment No. 3", "")).toBe(
        "Constitutional Amendment No. 3",
      );
    });
  });

  describe("Default — unknown offices", () => {
    it("returns the office and district composed with em-dash when no rule matches", () => {
      expect(normalizeRaceLabel("Soil & Water Conservation Board", "5")).toBe(
        "Soil & Water Conservation Board — District 5",
      );
    });

    it("returns just the office when no rule matches and no district", () => {
      expect(normalizeRaceLabel("Drainage Commissioner", "")).toBe(
        "Drainage Commissioner",
      );
    });

    it("returns the original district string if already complex", () => {
      // Districts that are not pure numbers are passed through as-is. This
      // preserves prior behavior for inputs that already carry a labelled
      // district string (e.g. "Ward 4 / Precinct 12").
      expect(normalizeRaceLabel("Town Council", "Ward 4 / Precinct 12")).toBe(
        "Town Council — Ward 4 / Precinct 12",
      );
    });
  });

  describe("Idempotence and safety", () => {
    it("is idempotent: feeding the canonical output back yields the same string", () => {
      const once = normalizeRaceLabel("United States Senator", "");
      const twice = normalizeRaceLabel(once, "");
      expect(twice).toBe(once);
    });

    it("does not throw on empty or undefined-shaped input", () => {
      expect(() => normalizeRaceLabel("", "")).not.toThrow();
      // Function signature requires office, but defensive: empty input
      // is preserved (the deriver shouldn't emit empty offices either).
      expect(normalizeRaceLabel("", "")).toBe("");
    });
  });
});
