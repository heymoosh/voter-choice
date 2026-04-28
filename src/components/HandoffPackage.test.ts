import { describe, expect, it } from "vitest";
import {
  buildClientFallbackHandoff,
  parseHandoffMarkers,
} from "./HandoffPackage";

describe("HandoffPackage parsing", () => {
  it("uses shared Spanish-capable ballot/profile extraction", () => {
    const parsed = parseHandoffMarkers(
      [
        "Listo.",
        "",
        "MI BOLETA — Condado Travis — Mayo 2026",
        "Alcalde: Ana Pérez",
        "",
        "=== MI PERFIL DE VOTANTE — 2026-04-28 ===",
        "LO QUE ME IMPORTA:",
        "- vivienda",
        "=== FIN DEL PERFIL DE VOTANTE ===",
      ].join("\n"),
    );

    expect(parsed?.ballot).toContain("MI BOLETA");
    expect(parsed?.voterProfile).toContain("MI PERFIL DE VOTANTE");
    expect(parsed?.preamble).toBe("Listo.");
  });

  it("includes existing Spanish outputs in client fallback handoff", () => {
    const parsed = buildClientFallbackHandoff(
      [
        { role: "user", content: "Ayúdame con mi boleta." },
        {
          role: "assistant",
          content: [
            "MI BOLETA — Condado Travis — Mayo 2026",
            "Alcalde: Ana Pérez",
          ].join("\n"),
        },
      ],
      "73301",
    );

    expect(parsed.ballot).toContain("MI BOLETA");
    expect(parsed.handoffBlock).toContain("LOCATION: 73301");
  });
});
