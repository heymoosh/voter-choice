import { describe, it, expect } from "vitest";
import {
  parseAlignmentScores,
  stripAlignmentBlock,
  slugify,
} from "../alignmentParser";

const validBlock = `
[ALIGNMENT_SCORES]
{
  "race": "Texas US Senate 2026",
  "scores": [
    {
      "candidate": "Jane Doe",
      "overall": 78,
      "issues": [
        {"issue": "Climate", "userPriority": "high", "score": 92,
         "rationale": "Co-sponsored 2025 Clean Air Act",
         "sources": ["Congress.gov roll call 119-H-432"]}
      ]
    },
    {
      "candidate": "John Smith",
      "overall": 41,
      "issues": [
        {"issue": "Climate", "userPriority": "high", "score": 40,
         "rationale": "Voted against clean energy subsidies",
         "sources": ["House.gov vote 2024-09-15"]}
      ]
    }
  ]
}
[/ALIGNMENT_SCORES]
`;

describe("parseAlignmentScores", () => {
  it("parses a valid block", () => {
    const result = parseAlignmentScores(validBlock);
    expect(result).not.toBeNull();
    expect(result?.race).toBe("Texas US Senate 2026");
    expect(result?.scores).toHaveLength(2);
    expect(result?.scores[0].candidate).toBe("Jane Doe");
    expect(result?.scores[0].overall).toBe(78);
    expect(result?.scores[1].candidate).toBe("John Smith");
    expect(result?.scores[1].overall).toBe(41);
  });

  it("returns null when no block present", () => {
    const result = parseAlignmentScores("No alignment block here.");
    expect(result).toBeNull();
  });

  it("returns null when block is present but JSON is malformed (beyond trailing commas)", () => {
    const malformed =
      "[ALIGNMENT_SCORES]\n{ not valid json !! }\n[/ALIGNMENT_SCORES]";
    const result = parseAlignmentScores(malformed);
    expect(result).toBeNull();
  });

  it("handles trailing commas in JSON (lenient parsing)", () => {
    const withTrailingCommas = `[ALIGNMENT_SCORES]
{
  "race": "Test Race",
  "scores": [
    {
      "candidate": "Alice",
      "overall": 80,
      "issues": [],
    },
  ],
}
[/ALIGNMENT_SCORES]`;
    const result = parseAlignmentScores(withTrailingCommas);
    expect(result).not.toBeNull();
    expect(result?.scores[0].candidate).toBe("Alice");
  });

  it("handles extra whitespace around the block", () => {
    const withSpaces = `
Some text before.

[ALIGNMENT_SCORES]
  {
    "race": "Test",
    "scores": []
  }
[/ALIGNMENT_SCORES]

Some text after.`;
    const result = parseAlignmentScores(withSpaces);
    expect(result).not.toBeNull();
    expect(result?.race).toBe("Test");
  });

  it("returns null if scores is not an array", () => {
    const invalid = `[ALIGNMENT_SCORES]{"race":"Test","scores":"not-array"}[/ALIGNMENT_SCORES]`;
    const result = parseAlignmentScores(invalid);
    expect(result).toBeNull();
  });

  it("returns null if race is missing", () => {
    const invalid = `[ALIGNMENT_SCORES]{"scores":[]}[/ALIGNMENT_SCORES]`;
    const result = parseAlignmentScores(invalid);
    expect(result).toBeNull();
  });
});

describe("stripAlignmentBlock", () => {
  it("removes the alignment block from text", () => {
    const text = `Here is some analysis.\n${validBlock}\nMore text after.`;
    const stripped = stripAlignmentBlock(text);
    expect(stripped).not.toContain("[ALIGNMENT_SCORES]");
    expect(stripped).not.toContain("[/ALIGNMENT_SCORES]");
    expect(stripped).toContain("Here is some analysis.");
    expect(stripped).toContain("More text after.");
  });

  it("returns text unchanged when no block present", () => {
    const text = "No alignment block here.";
    expect(stripAlignmentBlock(text)).toBe(text);
  });
});

describe("slugify", () => {
  it("converts name to slug", () => {
    expect(slugify("Jane Doe")).toBe("jane-doe");
    expect(slugify("John Smith Jr.")).toBe("john-smith-jr");
    expect(slugify("  Multiple   Spaces  ")).toBe("multiple-spaces");
  });

  it("handles special characters", () => {
    expect(slugify("O'Brien")).toBe("o-brien");
    expect(slugify("Smith & Jones")).toBe("smith-jones");
  });
});
