// @vitest-environment node
import { describe, it, expect } from "vitest";
import { deriveRaces, classifyRaceSection, type Race } from "./raceDeriver";

describe("raceDeriver", () => {
  describe("classifyRaceSection", () => {
    it("classifies presidential races as Federal", () => {
      expect(classifyRaceSection("President of the United States")).toBe(
        "Federal",
      );
      expect(classifyRaceSection("U.S. President")).toBe("Federal");
    });

    it("classifies US Senate as Federal", () => {
      expect(classifyRaceSection("United States Senator")).toBe("Federal");
      expect(classifyRaceSection("US Senate")).toBe("Federal");
    });

    it("classifies US House as Federal", () => {
      expect(classifyRaceSection("U.S. Representative")).toBe("Federal");
      expect(classifyRaceSection("U.S. House — TX-07")).toBe("Federal");
    });

    it("classifies Governor as State", () => {
      expect(classifyRaceSection("Governor")).toBe("State");
      expect(classifyRaceSection("Lieutenant Governor")).toBe("State");
    });

    it("classifies state legislature as State", () => {
      expect(classifyRaceSection("State Senate District 12")).toBe("State");
      expect(classifyRaceSection("State Assembly District 4")).toBe("State");
      expect(classifyRaceSection("State House District 8")).toBe("State");
    });

    it("classifies other statewide offices as State", () => {
      expect(classifyRaceSection("Attorney General")).toBe("State");
      expect(classifyRaceSection("Secretary of State")).toBe("State");
      expect(classifyRaceSection("State Treasurer")).toBe("State");
      expect(classifyRaceSection("State Comptroller")).toBe("State");
    });

    it("classifies propositions and measures", () => {
      expect(classifyRaceSection("Proposition 1")).toBe("Propositions");
      expect(classifyRaceSection("Measure A")).toBe("Propositions");
      expect(classifyRaceSection("Constitutional Amendment 5")).toBe(
        "Propositions",
      );
      expect(classifyRaceSection("Ballot Question 3")).toBe("Propositions");
    });

    it("falls back to Local for unknown offices", () => {
      expect(classifyRaceSection("City Council District 1")).toBe("Local");
      expect(classifyRaceSection("School Board")).toBe("Local");
    });
  });

  describe("deriveRaces", () => {
    it("returns empty array when no contests", () => {
      expect(deriveRaces(null)).toEqual([]);
      expect(deriveRaces({ contests: [] })).toEqual([]);
      expect(deriveRaces({ contests: undefined })).toEqual([]);
    });

    it("derives Race[] from a list of contests", () => {
      const races = deriveRaces({
        contests: [
          {
            office: "U.S. President",
            district: "",
            type: "General",
            candidates: [{ name: "Alice", party: "Democratic" }],
          },
          {
            office: "Governor",
            district: "Texas",
            type: "General",
            candidates: [{ name: "Bob", party: "Republican" }],
          },
          {
            office: "Proposition 1",
            district: "",
            type: "Referendum",
            candidates: [],
          },
        ],
      });

      expect(races).toHaveLength(3);
      const sections = races.map((r) => r.section);
      expect(sections).toContain("Federal");
      expect(sections).toContain("State");
      expect(sections).toContain("Propositions");
    });

    it("assigns deterministic stable ids", () => {
      const races1 = deriveRaces({
        contests: [
          {
            office: "Governor",
            district: "Texas",
            type: "General",
            candidates: [],
          },
        ],
      });
      const races2 = deriveRaces({
        contests: [
          {
            office: "Governor",
            district: "Texas",
            type: "General",
            candidates: [],
          },
        ],
      });
      expect(races1[0].id).toBe(races2[0].id);
      expect(races1[0].id.length).toBeGreaterThan(0);
    });

    it("each race starts undecided", () => {
      const races = deriveRaces({
        contests: [
          {
            office: "Governor",
            district: "Texas",
            type: "General",
            candidates: [],
          },
        ],
      });
      expect(races[0].decided).toBe(false);
    });

    it("groups races by section in stable order (Federal → State → Propositions → Local)", () => {
      const races: Race[] = deriveRaces({
        contests: [
          {
            office: "City Council",
            district: "1",
            type: "General",
            candidates: [],
          },
          {
            office: "Proposition 1",
            district: "",
            type: "Referendum",
            candidates: [],
          },
          {
            office: "Governor",
            district: "Texas",
            type: "General",
            candidates: [],
          },
          {
            office: "U.S. Senator",
            district: "Texas",
            type: "General",
            candidates: [],
          },
        ],
      });

      const sections = races.map((r) => r.section);
      expect(sections).toEqual(["Federal", "State", "Propositions", "Local"]);
    });

    it("preserves the contest label as the race label", () => {
      const races = deriveRaces({
        contests: [
          {
            office: "U.S. House",
            district: "TX-07",
            type: "General",
            candidates: [],
          },
        ],
      });
      expect(races[0].label).toContain("U.S. House");
    });

    // Real-fix coverage: the chat path's race-deep-dive builder needs the
    // candidate roster to render its <ground_truth> tag. Pre-fix the deriver
    // dropped candidates, so workspace-race chat requests carried an empty
    // candidatesJson and (worse) ChatPanel misclassified every race as a
    // proposition because it checked candidates.length === 0. Propagate the
    // input contest's candidates verbatim through the emitted Race.
    it("propagates candidates from ContestLike to the emitted Race", () => {
      const races = deriveRaces({
        contests: [
          {
            office: "U.S. Senate",
            district: "",
            type: "General",
            candidates: [
              { name: "Cory Booker", party: "Democratic" },
              { name: "Curtis Bashaw", party: "Republican" },
            ],
          },
        ],
      });
      expect(races).toHaveLength(1);
      expect(races[0].candidates).toEqual([
        { name: "Cory Booker", party: "Democratic" },
        { name: "Curtis Bashaw", party: "Republican" },
      ]);
    });

    it("emits an empty candidates array for a contest with no candidates (propositions)", () => {
      const races = deriveRaces({
        contests: [
          {
            office: "Proposition 1",
            district: "",
            type: "Referendum",
            candidates: [],
          },
        ],
      });
      expect(races[0].candidates).toEqual([]);
    });
  });
});
