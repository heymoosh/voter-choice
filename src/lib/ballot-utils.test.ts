import { describe, expect, it } from "vitest";
import {
  extractBallot,
  extractVoterProfile,
  formatCurrencyShort,
} from "./ballot-utils";

describe("ballot-utils", () => {
  it("extracts English ballot blocks with dash headers", () => {
    const content = [
      "Here are your outputs.",
      "MY BALLOT — Travis County — May 2026",
      "",
      "Mayor: Jane Doe",
      "",
      "=== MY VOTER PROFILE — 2026-04-28 ===",
      "WHAT I CARE ABOUT:",
      "- transit",
      "=== END VOTER PROFILE ===",
    ].join("\n");

    expect(extractBallot(content)).toBe(
      "MY BALLOT — Travis County — May 2026\n\nMayor: Jane Doe",
    );
  });

  it("extracts legacy English ballot blocks with wrapped marker headers", () => {
    const content = [
      "=== MY BALLOT ===",
      "Council: Alex Lee",
      "",
      "=== VOTER SESSION HANDOFF ===",
      "LOCATION: 73301",
      "=== END HANDOFF ===",
    ].join("\n");

    expect(extractBallot(content)).toBe("=== MY BALLOT ===\nCouncil: Alex Lee");
  });

  it("extracts the latest ballot block when earlier drafts exist", () => {
    const content = [
      "=== MY BALLOT ===",
      "Mayor: Earlier Draft",
      "",
      "=== MY VOTER PROFILE — 2026-04-28 ===",
      "Draft profile",
      "=== END VOTER PROFILE ===",
      "",
      "=== MY BALLOT ===",
      "Mayor: Final Choice",
      "",
      "=== MY VOTER PROFILE — 2026-04-28 ===",
      "Final profile",
      "=== END VOTER PROFILE ===",
    ].join("\n");

    expect(extractBallot(content)).toBe(
      "=== MY BALLOT ===\nMayor: Final Choice",
    );
    expect(extractVoterProfile(content)).toContain("Final profile");
  });

  describe("formatCurrencyShort", () => {
    it("returns $0 for zero and negative inputs", () => {
      expect(formatCurrencyShort(0)).toBe("$0");
      expect(formatCurrencyShort(-50)).toBe("$0");
      expect(formatCurrencyShort(-1_000_000)).toBe("$0");
    });

    it("returns $0 for non-finite inputs (defensive)", () => {
      expect(formatCurrencyShort(Number.NaN)).toBe("$0");
      expect(formatCurrencyShort(Number.POSITIVE_INFINITY)).toBe("$0");
      expect(formatCurrencyShort(Number.NEGATIVE_INFINITY)).toBe("$0");
    });

    it("formats sub-$1K values as plain dollars (no K suffix)", () => {
      expect(formatCurrencyShort(840)).toBe("$840");
      expect(formatCurrencyShort(1)).toBe("$1");
      expect(formatCurrencyShort(999)).toBe("$999");
    });

    it("formats $1K–$999K values with a K suffix, rounded", () => {
      expect(formatCurrencyShort(1_000)).toBe("$1K");
      expect(formatCurrencyShort(15_000)).toBe("$15K");
      expect(formatCurrencyShort(240_000)).toBe("$240K");
      expect(formatCurrencyShort(369_000)).toBe("$369K");
      expect(formatCurrencyShort(999_499)).toBe("$999K");
    });

    it("formats $1M+ values to one decimal place with M suffix", () => {
      expect(formatCurrencyShort(1_000_000)).toBe("$1.0M");
      expect(formatCurrencyShort(1_200_000)).toBe("$1.2M");
      expect(formatCurrencyShort(25_400_000)).toBe("$25.4M");
    });
  });

  it("extracts Spanish ballot and profile blocks", () => {
    const content = [
      "MI BOLETA — Condado Travis — Mayo 2026",
      "Alcalde: Ana Pérez",
      "",
      "=== MI PERFIL DE VOTANTE — 2026-04-28 ===",
      "LO QUE ME IMPORTA:",
      "- vivienda",
      "=== FIN DEL PERFIL DE VOTANTE ===",
    ].join("\n");

    expect(extractBallot(content)).toBe(
      "MI BOLETA — Condado Travis — Mayo 2026\nAlcalde: Ana Pérez",
    );
    expect(extractVoterProfile(content)).toContain(
      "MI PERFIL DE VOTANTE — 2026-04-28",
    );
  });
});
