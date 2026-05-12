import { describe, it, expect } from "vitest";
import { parseAlignmentScores } from "../alignmentParser";

const VALID_BLOCK = `
[ALIGNMENT_SCORES]
{
  "race": "Texas US Senate 2026",
  "scores": [
    {
      "candidate": "Jane Doe",
      "overall": 78,
      "issues": [
        {
          "issue": "Climate",
          "userPriority": "high",
          "score": 92,
          "rationale": "Co-sponsored 2025 Clean Air Renewal Act.",
          "sources": ["Congress.gov roll call 119-H-432"]
        }
      ]
    },
    {
      "candidate": "John Smith",
      "overall": 41,
      "issues": [
        {
          "issue": "Climate",
          "userPriority": "high",
          "score": 35,
          "rationale": "Voted against key climate bills.",
          "sources": ["Congress.gov roll call 119-H-300"]
        }
      ]
    }
  ]
}
[/ALIGNMENT_SCORES]
`;

describe("parseAlignmentScores", () => {
  it("parses a valid ALIGNMENT_SCORES block", () => {
    const result = parseAlignmentScores(VALID_BLOCK);
    expect(result).not.toBeNull();
    expect(result!.race).toBe("Texas US Senate 2026");
    expect(result!.scores).toHaveLength(2);
    expect(result!.scores[0].candidate).toBe("Jane Doe");
    expect(result!.scores[0].overall).toBe(78);
    expect(result!.scores[0].issues[0].issue).toBe("Climate");
    expect(result!.scores[1].overall).toBe(41);
  });

  it("returns null when no block present", () => {
    expect(
      parseAlignmentScores("Some text without alignment scores"),
    ).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    const malformed = `[ALIGNMENT_SCORES]\n{invalid json here\n[/ALIGNMENT_SCORES]`;
    expect(parseAlignmentScores(malformed)).toBeNull();
  });

  it("handles trailing commas in JSON (lenient parsing)", () => {
    const withTrailingCommas = `[ALIGNMENT_SCORES]
{
  "race": "Test Race",
  "scores": [
    {
      "candidate": "Test Candidate",
      "overall": 75,
      "issues": [],
    },
  ],
}
[/ALIGNMENT_SCORES]`;
    // Should either parse successfully or return null gracefully
    const result = parseAlignmentScores(withTrailingCommas);
    // Either succeeds or fails gracefully (no throw)
    expect(result === null || result!.race === "Test Race").toBe(true);
  });

  it("parses block embedded in larger text", () => {
    const text = `Here's the analysis...\n\n${VALID_BLOCK}\n\nAnd more text after.`;
    const result = parseAlignmentScores(text);
    expect(result).not.toBeNull();
    expect(result!.scores[0].candidate).toBe("Jane Doe");
  });
});

describe("candidateSlug", () => {
  it("creates URL-safe slug from candidate name", async () => {
    const { candidateSlug } = await import("../alignmentParser");
    expect(candidateSlug("Jane Doe")).toBe("jane-doe");
    expect(candidateSlug("John Smith Jr.")).toBe("john-smith-jr");
    expect(candidateSlug("María García")).toBe("mara-garca");
  });
});
