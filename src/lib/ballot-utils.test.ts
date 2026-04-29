import { describe, expect, it } from "vitest";
import { extractBallot, extractVoterProfile } from "./ballot-utils";

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
