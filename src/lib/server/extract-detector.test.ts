import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scoreExtractedText, decideExtractionPath } from "./extract-detector";

describe("extract-detector — scoreExtractedText", () => {
  it("scores clean ballot text with high dictionary ratio + vocab + names", () => {
    const text = `
      Democratic Primary Ballot
      United States Senator. Vote for One.
      John Smith — Democratic Party
      Maria Garcia — Democratic Party
      Governor. Vote for One.
      Robert Johnson — Democratic Party
      Linda Williams — Democratic Party
      State Representative District 12. Vote for One.
      Carlos Martinez — Democratic Party
      Susan Brown — Democratic Party
    `;
    const score = scoreExtractedText(text);
    expect(score.dictionary_ratio).toBeGreaterThanOrEqual(0.6);
    expect(score.ballot_vocab_hits).toBeGreaterThanOrEqual(5);
    expect(score.proper_noun_count).toBeGreaterThanOrEqual(5);
  });

  it("scores garbled pdfjs output with low ratios", () => {
    // Real-world example shape of pdfjs garbage on broken text layer.
    const text = ")+&'% )+&'% xz!? 12 #!@ ^^** ()() $$$ 123 abc ## ()() &&";
    const score = scoreExtractedText(text);
    expect(score.dictionary_ratio).toBeLessThan(0.6);
    expect(score.ballot_vocab_hits).toBeLessThan(5);
    expect(score.proper_noun_count).toBeLessThan(5);
  });

  it("scores Spanish ballot vocab as hits (bilingual detection)", () => {
    const text = `
      Elección Primaria Demócrata.
      Vote por Uno. Senador.
      Carlos Garcia — Partido Demócrata
      Maria Lopez — Partido Demócrata
      Gobernador. Vote por Uno.
      Roberto Martinez — Partido Demócrata
      Linda Hernandez — Partido Demócrata
      Representante Estatal. Vote por Uno.
      Susana Brown — Partido Demócrata
      Jose Williams — Partido Demócrata
    `;
    const score = scoreExtractedText(text);
    expect(score.ballot_vocab_hits).toBeGreaterThanOrEqual(5);
  });

  it("returns zero scores for empty input", () => {
    const score = scoreExtractedText("");
    expect(score.dictionary_ratio).toBe(0);
    expect(score.ballot_vocab_hits).toBe(0);
    expect(score.proper_noun_count).toBe(0);
  });

  it("treats whitespace-only input as empty", () => {
    const score = scoreExtractedText("   \n\n  \t  ");
    expect(score.dictionary_ratio).toBe(0);
  });

  it("counts capitalized multi-word sequences as proper nouns", () => {
    const text =
      "John Smith Maria Garcia Robert Johnson Linda Williams Carlos Martinez";
    const score = scoreExtractedText(text);
    expect(score.proper_noun_count).toBeGreaterThanOrEqual(5);
  });
});

describe("extract-detector — decideExtractionPath", () => {
  beforeEach(() => {
    delete process.env.EXTRACTION_DETECTOR_DICT_FLOOR;
    delete process.env.EXTRACTION_DETECTOR_VOCAB_FLOOR;
    delete process.env.EXTRACTION_DETECTOR_PROPER_NOUN_FLOOR;
  });

  afterEach(() => {
    delete process.env.EXTRACTION_DETECTOR_DICT_FLOOR;
    delete process.env.EXTRACTION_DETECTOR_VOCAB_FLOOR;
    delete process.env.EXTRACTION_DETECTOR_PROPER_NOUN_FLOOR;
  });

  it("picks pdfjs path when all three floors met", () => {
    const decision = decideExtractionPath({
      dictionary_ratio: 0.85,
      ballot_vocab_hits: 8,
      proper_noun_count: 12,
      decision_reason: "",
    });
    expect(decision.path).toBe("pdfjs");
    expect(decision.score.decision_reason).toMatch(/all floors met/i);
  });

  it("escalates to vision when dictionary ratio below floor", () => {
    const decision = decideExtractionPath({
      dictionary_ratio: 0.3,
      ballot_vocab_hits: 8,
      proper_noun_count: 12,
      decision_reason: "",
    });
    expect(decision.path).toBe("vision");
    expect(decision.score.decision_reason).toMatch(/dictionary/i);
  });

  it("escalates to vision when ballot vocab below floor", () => {
    const decision = decideExtractionPath({
      dictionary_ratio: 0.85,
      ballot_vocab_hits: 2,
      proper_noun_count: 12,
      decision_reason: "",
    });
    expect(decision.path).toBe("vision");
    expect(decision.score.decision_reason).toMatch(/vocab/i);
  });

  it("escalates to vision when proper noun count below floor", () => {
    const decision = decideExtractionPath({
      dictionary_ratio: 0.85,
      ballot_vocab_hits: 8,
      proper_noun_count: 1,
      decision_reason: "",
    });
    expect(decision.path).toBe("vision");
    expect(decision.score.decision_reason).toMatch(/proper noun/i);
  });

  it("honors EXTRACTION_DETECTOR_DICT_FLOOR override", () => {
    process.env.EXTRACTION_DETECTOR_DICT_FLOOR = "0.95";
    const decision = decideExtractionPath({
      dictionary_ratio: 0.85,
      ballot_vocab_hits: 8,
      proper_noun_count: 12,
      decision_reason: "",
    });
    expect(decision.path).toBe("vision");
  });

  it("honors EXTRACTION_DETECTOR_VOCAB_FLOOR override", () => {
    process.env.EXTRACTION_DETECTOR_VOCAB_FLOOR = "20";
    const decision = decideExtractionPath({
      dictionary_ratio: 0.85,
      ballot_vocab_hits: 8,
      proper_noun_count: 12,
      decision_reason: "",
    });
    expect(decision.path).toBe("vision");
  });

  it("honors EXTRACTION_DETECTOR_PROPER_NOUN_FLOOR override", () => {
    process.env.EXTRACTION_DETECTOR_PROPER_NOUN_FLOOR = "30";
    const decision = decideExtractionPath({
      dictionary_ratio: 0.85,
      ballot_vocab_hits: 8,
      proper_noun_count: 12,
      decision_reason: "",
    });
    expect(decision.path).toBe("vision");
  });

  it("falls back to defaults on invalid override env vars", () => {
    process.env.EXTRACTION_DETECTOR_DICT_FLOOR = "garbage";
    process.env.EXTRACTION_DETECTOR_VOCAB_FLOOR = "-5";
    process.env.EXTRACTION_DETECTOR_PROPER_NOUN_FLOOR = "0";
    const decision = decideExtractionPath({
      dictionary_ratio: 0.85,
      ballot_vocab_hits: 8,
      proper_noun_count: 12,
      decision_reason: "",
    });
    // Bad inputs should not silently force a vision escalation.
    expect(decision.path).toBe("pdfjs");
  });

  it("forces vision on empty/zero scores (pdfjs returned nothing)", () => {
    const decision = decideExtractionPath({
      dictionary_ratio: 0,
      ballot_vocab_hits: 0,
      proper_noun_count: 0,
      decision_reason: "",
    });
    expect(decision.path).toBe("vision");
  });
});

describe("extract-detector — full integration", () => {
  it("routes a real-looking ballot to pdfjs", () => {
    const ballotText = `
      Democratic Primary Election
      May 26, 2026

      Federal Offices
      United States Senator. Vote for One.
      John Smith Democratic Party
      Maria Garcia Democratic Party

      State Offices
      Governor. Vote for One.
      Robert Johnson Democratic Party
      Linda Williams Democratic Party

      Attorney General. Vote for One.
      Carlos Martinez Democratic Party
      Susan Brown Democratic Party

      State Representative District 12. Vote for One.
      Karen Davis Democratic Party
      Michael Wilson Democratic Party
    `;
    const score = scoreExtractedText(ballotText);
    const decision = decideExtractionPath(score);
    expect(decision.path).toBe("pdfjs");
  });

  it("routes pdfjs garbage to vision", () => {
    const garbage = `)+&'% )+&'% xz!? 12 ##!@ ^^** ()() $$$ 123 abc ## ()() &&
      ?@#  %% &&  )( !! %%
      &%$ #@! )()  *&^ %$#`;
    const score = scoreExtractedText(garbage);
    const decision = decideExtractionPath(score);
    expect(decision.path).toBe("vision");
  });
});
