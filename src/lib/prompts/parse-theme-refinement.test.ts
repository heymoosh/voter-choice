import { describe, it, expect } from "vitest";
import { parseThemeRefinement } from "./parse-theme-refinement";

const THEMES_JSON = JSON.stringify([
  {
    name: "Lower insulin & drug prices",
    quotes: ["insulin keeps going up"],
    canonicalIssue: "healthcare_affordability",
    stance: "in_favor",
  },
  {
    name: "Rent & cost-of-living protections",
    quotes: ["rent went up 11%"],
    canonicalIssue: "housing_affordability",
    stance: "in_favor",
  },
]);

describe("parseThemeRefinement", () => {
  it("splits prose from the fenced theme array", () => {
    const raw = `Got it — healthcare leads, and I added housing.\n\n\`\`\`json\n${THEMES_JSON}\n\`\`\``;
    const out = parseThemeRefinement(raw);
    expect(out.prose).toBe("Got it — healthcare leads, and I added housing.");
    expect(out.themes).toHaveLength(2);
    expect(out.themes![0].canonicalIssue).toBe("healthcare_affordability");
  });

  it("returns themes:null on a prose-only turn (caller keeps prior themes)", () => {
    const out = parseThemeRefinement(
      "That makes sense — your list already covers it, nothing to change.",
    );
    expect(out.themes).toBeNull();
    expect(out.prose).toContain("nothing to change");
  });

  it("takes the LAST fence when several are emitted", () => {
    const first = JSON.stringify([{ name: "Old", quotes: ["x"] }]);
    const raw = `Before:\n\`\`\`json\n${first}\n\`\`\`\nAfter:\n\`\`\`json\n${THEMES_JSON}\n\`\`\``;
    const out = parseThemeRefinement(raw);
    expect(out.themes).toHaveLength(2);
    expect(out.themes![0].name).toBe("Lower insulin & drug prices");
    expect(out.prose).toContain("Before:");
  });

  it("degrades a malformed fence to a conversational-only turn", () => {
    const out = parseThemeRefinement(
      'Here you go.\n```json\n[{"name": "broken,]\n```',
    );
    expect(out.themes).toBeNull();
    expect(out.prose).toBe("Here you go.");
  });

  it("handles a bare fence with no prose", () => {
    const out = parseThemeRefinement(`\`\`\`json\n${THEMES_JSON}\n\`\`\``);
    expect(out.prose).toBe("");
    expect(out.themes).toHaveLength(2);
  });

  it("filters invalid canonical ids and stances via the extraction validator", () => {
    const sketchy = JSON.stringify([
      {
        name: "Made-up issue",
        quotes: ["q"],
        canonicalIssue: "not_a_real_id",
        stance: "sideways",
      },
    ]);
    const out = parseThemeRefinement(`Sure.\n\`\`\`json\n${sketchy}\n\`\`\``);
    expect(out.themes).toHaveLength(1);
    expect(out.themes![0].canonicalIssue).toBeUndefined();
    expect(out.themes![0].stance).toBeUndefined();
  });

  it("drops an empty-array fence to null (never wipes the voter's list)", () => {
    const out = parseThemeRefinement("Cleared!\n```json\n[]\n```");
    expect(out.themes).toBeNull();
  });

  it("tolerates a fence without the json language tag", () => {
    const out = parseThemeRefinement(`Done.\n\`\`\`\n${THEMES_JSON}\n\`\`\``);
    expect(out.themes).toHaveLength(2);
  });
});
