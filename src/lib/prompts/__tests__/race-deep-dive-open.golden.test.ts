import { describe, it, expect } from "vitest";
import { buildRaceDeepDiveOpenPrompt } from "../race-deep-dive-open";

/**
 * Contract tests for the auto-fire (cards-emitting) variant of race-deep-dive.
 *
 * Not a verbatim golden file — the prompt is long and slot-heavy, and a
 * fragile equality test rewards copy-paste edits over real changes. Instead
 * we assert the load-bearing pieces stay in place: the emission contract,
 * the slot substitutions, and the structural guarantees the renderer
 * (structured-blocks.ts) depends on.
 */
describe("buildRaceDeepDiveOpenPrompt — contract", () => {
  const fixture = {
    raceLabel: "U.S. Senate",
    state: "TX",
    county: "Harris",
    themesList: "1. Healthcare\n2. Climate",
    candidatesJson:
      '[{"name":"Cory Booker","party":"Democratic"},{"name":"Curtis Bashaw","party":"Republican"}]',
    decidedSummary: "(none)",
  };

  it("substitutes every slot into the rendered prompt", () => {
    const rendered = buildRaceDeepDiveOpenPrompt(fixture);
    expect(rendered).toContain("U.S. Senate");
    expect(rendered).toContain("TX-Harris");
    expect(rendered).toContain("1. Healthcare\n2. Climate");
    expect(rendered).toContain("Cory Booker");
    expect(rendered).toContain("(none)");
  });

  it("instructs the model to emit [RACE_PATTERNS] as the first thing", () => {
    const rendered = buildRaceDeepDiveOpenPrompt(fixture);
    expect(rendered).toMatch(/\[RACE_PATTERNS race=/);
    expect(rendered).toMatch(/\[\/RACE_PATTERNS\]/);
    expect(rendered).toMatch(
      /emit.*\[RACE_PATTERNS\].*FIRST|FIRST.*\[RACE_PATTERNS\]/i,
    );
  });

  it("instructs the model to emit [ALIGNMENT_SCORES] after RACE_PATTERNS (when priorities are populated)", () => {
    const rendered = buildRaceDeepDiveOpenPrompt(fixture);
    expect(rendered).toMatch(/\[ALIGNMENT_SCORES race=/);
    expect(rendered).toMatch(/\[\/ALIGNMENT_SCORES\]/);
    expect(rendered).toMatch(
      /Immediately after.*\[\/RACE_PATTERNS\]|after.*RACE_PATTERNS.*emit.*ALIGNMENT_SCORES/i,
    );
  });

  it('requires identical race="..." attribute across the two blocks', () => {
    const rendered = buildRaceDeepDiveOpenPrompt(fixture);
    expect(rendered).toMatch(
      /IDENTICAL race attribute|same race= attribute|must match the race attribute/i,
    );
  });

  it("documents the donor-bucket fixed vocabulary", () => {
    const rendered = buildRaceDeepDiveOpenPrompt(fixture);
    expect(rendered).toContain("Small individual donors (under $200)");
    expect(rendered).toContain("Healthcare industry");
    expect(rendered).toContain("Public safety unions");
  });

  it("mandates lookup_donor_coalition for legislative candidates first", () => {
    const rendered = buildRaceDeepDiveOpenPrompt(fixture);
    expect(rendered).toMatch(/lookup_donor_coalition/);
    expect(rendered).toMatch(/found:true.*verbatim|verbatim.*found:true/i);
  });

  it("mandates lookup_alignment per (candidate, canonicalIssue) pair", () => {
    const rendered = buildRaceDeepDiveOpenPrompt(fixture);
    expect(rendered).toMatch(/lookup_alignment/);
    expect(rendered).toMatch(/canonical_issue/);
  });

  it("prohibits closing prose after the blocks", () => {
    const rendered = buildRaceDeepDiveOpenPrompt(fixture);
    expect(rendered).toMatch(
      /Stop\.|end the response|Do NOT add closing prose/i,
    );
  });

  it("instructs no editorialization or recommendation framing", () => {
    const rendered = buildRaceDeepDiveOpenPrompt(fixture);
    expect(rendered).toMatch(/no editoriali[sz]e|never editoriali[sz]e/i);
    expect(rendered).toMatch(/no.*recommendation|no recommend/i);
  });

  it("falls back gracefully when county is empty (no jurisdiction in <race>)", () => {
    const rendered = buildRaceDeepDiveOpenPrompt({ ...fixture, county: "" });
    // No throw, no "undefined" leak — just an empty county slot.
    expect(rendered).not.toContain("undefined");
    expect(rendered).toContain("TX-");
  });
});
