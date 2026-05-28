/**
 * Tests for normalizeCandidateName — display-layer title-casing for
 * candidate names extracted from upstream PDF / Civic sources which
 * commonly return fully-uppercased strings ("BOOKER", "NORCROSS").
 *
 * Behavior contract (per audit Fix 1):
 *   - Fully uppercase strings → title-case.
 *   - Mixed-case strings → returned as-is (preserve author intent).
 *   - Generational suffixes (Jr., Sr., II, III, IV) → stay uppercase
 *     even when the source is all-caps.
 *   - Middle initials ("M.") → preserved uppercase within an otherwise
 *     title-cased name.
 *   - Empty / nullish / whitespace-only → return whatever we got
 *     (preserve falsy semantics for callers).
 */

import { describe, expect, it } from "vitest";
import { normalizeCandidateName } from "./normalizeCandidateName";

describe("normalizeCandidateName", () => {
  it("title-cases an all-uppercase first+last", () => {
    expect(normalizeCandidateName("BOOKER")).toBe("Booker");
    expect(normalizeCandidateName("CORY BOOKER")).toBe("Cory Booker");
    expect(normalizeCandidateName("DONALD NORCROSS")).toBe("Donald Norcross");
  });

  it("title-cases an all-uppercase three-part name", () => {
    expect(normalizeCandidateName("MARY JANE WATSON")).toBe("Mary Jane Watson");
  });

  it("preserves already-mixed-case names verbatim", () => {
    expect(normalizeCandidateName("Cory Booker")).toBe("Cory Booker");
    expect(normalizeCandidateName("Mary Jane Watson")).toBe("Mary Jane Watson");
  });

  it("keeps generational suffixes uppercase", () => {
    expect(normalizeCandidateName("MARTIN LUTHER KING JR.")).toBe(
      "Martin Luther King Jr.",
    );
    expect(normalizeCandidateName("JOHN DOE SR.")).toBe("John Doe Sr.");
    expect(normalizeCandidateName("HENRY VIII")).toBe("Henry VIII");
    expect(normalizeCandidateName("LOUIS XIV")).toBe("Louis XIV");
    expect(normalizeCandidateName("JOHN III")).toBe("John III");
    expect(normalizeCandidateName("ROBERT IV")).toBe("Robert IV");
    expect(normalizeCandidateName("JOHN II")).toBe("John II");
  });

  it("keeps single-letter middle initials uppercase with trailing period", () => {
    expect(normalizeCandidateName("JOHN M. SMITH")).toBe("John M. Smith");
    expect(normalizeCandidateName("MARY J. WATSON")).toBe("Mary J. Watson");
  });

  it("handles hyphenated last names", () => {
    expect(normalizeCandidateName("MARY SMITH-JONES")).toBe("Mary Smith-Jones");
  });

  it("returns empty string for empty / nullish input", () => {
    expect(normalizeCandidateName("")).toBe("");
  });

  it("preserves leading/trailing whitespace policy: trims and title-cases", () => {
    // Whitespace-only inputs round-trip as empty so display sites don't
    // emit stray space.
    expect(normalizeCandidateName("   ")).toBe("");
    expect(normalizeCandidateName("  BOOKER  ")).toBe("Booker");
  });

  it("does NOT lowercase short fragments inside a mixed-case input", () => {
    // "McMahon", "O'Brien", "DeShawn" — common surname capitalization
    // patterns. Mixed-case → pass-through; we don't second-guess.
    expect(normalizeCandidateName("Patrick McMahon")).toBe("Patrick McMahon");
    expect(normalizeCandidateName("Sean O'Brien")).toBe("Sean O'Brien");
    expect(normalizeCandidateName("DeShawn Watson")).toBe("DeShawn Watson");
  });

  it("handles names with apostrophes when input is all-caps", () => {
    // Common Irish/Scottish surname pattern. The simple title-case is
    // good enough — "O'brien" is closer-than-uppercase even if not
    // ideal "O'Brien". Acceptable for v1.
    const result = normalizeCandidateName("SEAN O'BRIEN");
    // Either "Sean O'Brien" or "Sean O'brien" — both are improvements
    // over the all-caps source. We expect the first one (apostrophe
    // letter capitalized).
    expect(result).toBe("Sean O'Brien");
  });
});
