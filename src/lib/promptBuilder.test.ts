import { describe, expect, it } from "vitest";
import { buildFullPrompt, getNextElection } from "@/lib/promptBuilder";
import { getStateData } from "@/lib/stateRegistry";

describe("promptBuilder", () => {
  it("selects the next upcoming election instead of the first static election", () => {
    const texas = getStateData("TX");
    expect(texas).not.toBeNull();

    const election = getNextElection(texas!, new Date("2026-05-11T12:00:00"));

    expect(election?.id).toBe("tx-2026-primary-runoff");
  });

  it("falls back cleanly when no OpenStates candidate context is available", () => {
    const california = getStateData("CA");
    expect(california).not.toBeNull();

    const prompt = buildFullPrompt(california!, "90210");

    expect(prompt).toContain("California");
    expect(prompt).toContain("90210");
    expect(prompt).toContain("No matched OpenStates candidate");
  });
});
