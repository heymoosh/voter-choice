import { describe, it, expect } from "vitest";
import {
  parseBallotBlock,
  parseAlignmentScores,
  extractVoterProfile,
  toSlug,
  renderBallotHtml,
} from "@/lib/ballotParser";

describe("parseBallotBlock", () => {
  it("parses a simple ballot block", () => {
    const text = `Here is your ballot:

MY BALLOT — Travis County — 2026 General Election — November 3, 2026
U.S. Senate: Jane Doe
U.S. House District 10: John Smith
Propositions:
Prop 1: YES
Prop 2: NO
`;
    const result = parseBallotBlock(text);
    expect(result).not.toBeNull();
    expect(result?.header).toBe(
      "MY BALLOT — Travis County — 2026 General Election — November 3, 2026",
    );
    expect(result?.entries).toHaveLength(4);
    expect(result?.entries[0]).toEqual({
      race: "U.S. Senate",
      pick: "Jane Doe",
      isProposition: false,
    });
    expect(result?.entries[2]).toEqual({
      race: "Prop 1",
      pick: "YES",
      isProposition: true,
    });
  });

  it("returns null when no MY BALLOT marker", () => {
    const text = "Some text without a ballot block";
    expect(parseBallotBlock(text)).toBeNull();
  });

  it("returns null when entries are empty", () => {
    const text = "MY BALLOT — Some County\n\n";
    expect(parseBallotBlock(text)).toBeNull();
  });

  it("parses ballot with markdown formatting around it", () => {
    const text = `Let me summarize your choices:

MY BALLOT — Los Angeles County — 2026 Primary — June 2, 2026
Governor: Candidate A
State Senate: Candidate B

Let me know if you want to change anything.`;
    const result = parseBallotBlock(text);
    expect(result).not.toBeNull();
    expect(result?.entries).toHaveLength(2);
  });
});

describe("parseAlignmentScores", () => {
  it("parses a valid alignment scores block", () => {
    const text = `
[ALIGNMENT_SCORES]
{
  "race": "Texas US Senate 2026",
  "scores": [
    {
      "candidate": "Jane Doe",
      "overall": 78,
      "issues": [
        {"issue": "Climate", "userPriority": "high", "score": 92,
         "rationale": "Co-sponsored clean air act.",
         "sources": ["Congress.gov"]}
      ]
    }
  ]
}
[/ALIGNMENT_SCORES]
`;
    const result = parseAlignmentScores(text);
    expect(result).not.toBeNull();
    expect(result?.race).toBe("Texas US Senate 2026");
    expect(result?.scores[0].candidate).toBe("Jane Doe");
    expect(result?.scores[0].overall).toBe(78);
    expect(result?.scores[0].issues[0].issue).toBe("Climate");
  });

  it("returns null when no alignment block", () => {
    expect(parseAlignmentScores("No alignment block here")).toBeNull();
  });

  it("handles trailing commas (lenient parsing)", () => {
    const text = `[ALIGNMENT_SCORES]
{
  "race": "Senate Race",
  "scores": [
    {
      "candidate": "A",
      "overall": 50,
      "issues": [],
    },
  ],
}
[/ALIGNMENT_SCORES]`;
    const result = parseAlignmentScores(text);
    expect(result).not.toBeNull();
    expect(result?.scores[0].overall).toBe(50);
  });

  it("returns null for malformed JSON", () => {
    const text = "[ALIGNMENT_SCORES]\nnot valid json\n[/ALIGNMENT_SCORES]";
    expect(parseAlignmentScores(text)).toBeNull();
  });
});

describe("extractVoterProfile", () => {
  it("extracts a complete voter profile", () => {
    const text = `Here is your profile:

=== MY VOTER PROFILE — 2026-11-03 ===

LOCATION: Austin, TX

WHAT I CARE ABOUT:
- Climate action

=== END VOTER PROFILE ===

You can download this now.`;
    const result = extractVoterProfile(text);
    expect(result).not.toBeNull();
    expect(result).toContain("=== MY VOTER PROFILE");
    expect(result).toContain("=== END VOTER PROFILE ===");
    expect(result).toContain("Climate action");
  });

  it("returns null when no profile marker", () => {
    expect(extractVoterProfile("No profile here")).toBeNull();
  });

  it("returns partial profile if end marker not yet present", () => {
    const text = `=== MY VOTER PROFILE — 2026-11-03 ===
LOCATION: Austin, TX`;
    const result = extractVoterProfile(text);
    expect(result).not.toBeNull();
    expect(result).toContain("MY VOTER PROFILE");
  });
});

describe("toSlug", () => {
  it("converts names to lowercase slugs", () => {
    expect(toSlug("Jane Doe")).toBe("jane-doe");
  });

  it("handles special characters", () => {
    expect(toSlug("John O'Brien, Jr.")).toBe("john-o-brien-jr");
  });

  it("handles numbers", () => {
    expect(toSlug("Proposition 42")).toBe("proposition-42");
  });
});

describe("renderBallotHtml", () => {
  it("generates valid HTML with ballot header and entries", () => {
    const ballot = {
      header: "MY BALLOT — Travis County — 2026 General",
      entries: [
        { race: "U.S. Senate", pick: "Jane Doe", isProposition: false },
        { race: "Prop 1", pick: "YES", isProposition: true },
      ],
      raw: "",
    };
    const html = renderBallotHtml(ballot, "en");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("MY BALLOT — Travis County — 2026 General");
    expect(html).toContain("Jane Doe");
    expect(html).toContain("REMINDER");
  });

  it("uses correct language reminder label", () => {
    const ballot = {
      header: "MY BALLOT — County",
      entries: [{ race: "Race A", pick: "Candidate A" }],
      raw: "",
    };
    const html = renderBallotHtml(ballot, "es");
    expect(html).toContain("RECORDATORIO");
  });

  it("escapes HTML in candidate names", () => {
    const ballot = {
      header: "MY BALLOT",
      entries: [{ race: "<script>", pick: "alert('xss')" }],
      raw: "",
    };
    const html = renderBallotHtml(ballot, "en");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
