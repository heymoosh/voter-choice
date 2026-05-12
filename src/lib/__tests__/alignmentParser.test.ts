import { describe, it, expect } from "vitest";
import {
  parseAlignmentScores,
  slugify,
  getAlignmentLevel,
  getAlignmentColorClass,
} from "../alignmentParser";

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
      "issues": []
    }
  ]
}
[/ALIGNMENT_SCORES]
`;

const TRAILING_COMMA_BLOCK = `
[ALIGNMENT_SCORES]
{
  "race": "Test Race",
  "scores": [
    {
      "candidate": "Alice",
      "overall": 65,
      "issues": [],
    },
  ],
}
[/ALIGNMENT_SCORES]
`;

describe("parseAlignmentScores", () => {
  it("parses a valid block", () => {
    const result = parseAlignmentScores(VALID_BLOCK);
    expect(result).not.toBeNull();
    expect(result?.race).toBe("Texas US Senate 2026");
    expect(result?.scores).toHaveLength(2);
    expect(result?.scores[0].candidate).toBe("Jane Doe");
    expect(result?.scores[0].overall).toBe(78);
    expect(result?.scores[0].issues[0].issue).toBe("Climate");
  });

  it("handles trailing commas leniently", () => {
    const result = parseAlignmentScores(TRAILING_COMMA_BLOCK);
    expect(result).not.toBeNull();
    expect(result?.scores[0].candidate).toBe("Alice");
  });

  it("returns null when no block present", () => {
    expect(
      parseAlignmentScores("Just some text without any block."),
    ).toBeNull();
  });

  it("returns null for malformed JSON inside block", () => {
    const bad = "[ALIGNMENT_SCORES]not valid json[/ALIGNMENT_SCORES]";
    expect(parseAlignmentScores(bad)).toBeNull();
  });

  it("returns null if scores array is missing", () => {
    const noScores = `[ALIGNMENT_SCORES]{"race":"Test"}[/ALIGNMENT_SCORES]`;
    expect(parseAlignmentScores(noScores)).toBeNull();
  });
});

describe("slugify", () => {
  it("lowercases and replaces spaces", () => {
    expect(slugify("Jane Doe")).toBe("jane-doe");
  });

  it("removes special characters", () => {
    expect(slugify("John (Jr.) Smith!")).toBe("john-jr-smith");
  });

  it("trims leading and trailing dashes", () => {
    expect(slugify("-foo-bar-")).toBe("foo-bar");
  });
});

describe("getAlignmentLevel", () => {
  it("returns strong for >= 70", () => {
    expect(getAlignmentLevel(70)).toBe("strong");
    expect(getAlignmentLevel(100)).toBe("strong");
  });

  it("returns mixed for 40-69", () => {
    expect(getAlignmentLevel(40)).toBe("mixed");
    expect(getAlignmentLevel(69)).toBe("mixed");
  });

  it("returns weak for < 40", () => {
    expect(getAlignmentLevel(0)).toBe("weak");
    expect(getAlignmentLevel(39)).toBe("weak");
  });
});

describe("getAlignmentColorClass", () => {
  it("returns green class for strong", () => {
    expect(getAlignmentColorClass("strong")).toContain("green");
  });

  it("returns amber class for mixed", () => {
    expect(getAlignmentColorClass("mixed")).toContain("amber");
  });

  it("returns red class for weak", () => {
    expect(getAlignmentColorClass("weak")).toContain("red");
  });
});
