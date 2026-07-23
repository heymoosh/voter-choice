import { describe, expect, it } from "vitest";
import { stitchPages } from "./extract-stitcher";
import type { ExtractSection } from "./extract-types";

const META = {
  election_date: "2026-06-02",
  election_type: "primary" as const,
  jurisdiction: "Camden County, NJ",
};

function mkRace(office: string, party_context: string | null = null) {
  return {
    office,
    vote_for_n: 1,
    party_context: party_context as
      "Democratic Primary" | "Republican Primary" | null,
    candidates: [
      {
        name: "Jane Doe",
        party: "Democratic",
        placeholder_reason: null,
      },
    ],
  };
}

describe("stitchPages", () => {
  it("returns empty result on empty input", () => {
    const result = stitchPages([]);
    expect(result.election_metadata.jurisdiction).toBe("");
    expect(result.sections).toEqual([]);
  });

  it("returns a single page unchanged", () => {
    const sections: ExtractSection[] = [
      { section_name: "Federal", races: [mkRace("US Senate")] },
    ];
    const result = stitchPages([{ election_metadata: META, sections }]);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].section_name).toBe("Federal");
    expect(result.sections[0].races).toHaveLength(1);
  });

  it("merges identical sections across pages", () => {
    const result = stitchPages([
      {
        election_metadata: META,
        sections: [{ section_name: "State", races: [mkRace("Governor")] }],
      },
      {
        election_metadata: META,
        sections: [
          {
            section_name: "State",
            races: [mkRace("Attorney General")],
          },
        ],
      },
    ]);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].section_name).toBe("State");
    expect(result.sections[0].races).toHaveLength(2);
    expect(result.sections[0].races.map((r) => r.office)).toEqual([
      "Governor",
      "Attorney General",
    ]);
  });

  it("keeps distinct sections separate", () => {
    const result = stitchPages([
      {
        election_metadata: META,
        sections: [{ section_name: "Federal", races: [mkRace("US Senate")] }],
      },
      {
        election_metadata: META,
        sections: [{ section_name: "State", races: [mkRace("Governor")] }],
      },
    ]);
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].section_name).toBe("Federal");
    expect(result.sections[1].section_name).toBe("State");
  });

  it("deduplicates identical races by (office, district, position, party_context)", () => {
    const result = stitchPages([
      {
        election_metadata: META,
        sections: [{ section_name: "Federal", races: [mkRace("US Senate")] }],
      },
      {
        election_metadata: META,
        sections: [{ section_name: "Federal", races: [mkRace("US Senate")] }],
      },
    ]);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].races).toHaveLength(1);
  });

  it("keeps multi-party DEM + REP races distinct (NJ-shape ballots)", () => {
    const result = stitchPages([
      {
        election_metadata: META,
        sections: [
          {
            section_name: "Federal",
            races: [
              mkRace("US Senate", "Democratic Primary"),
              mkRace("US Senate", "Republican Primary"),
            ],
          },
        ],
      },
    ]);
    expect(result.sections[0].races).toHaveLength(2);
    expect(result.sections[0].races[0].party_context).toBe(
      "Democratic Primary",
    );
    expect(result.sections[0].races[1].party_context).toBe(
      "Republican Primary",
    );
  });

  it("treats distinct districts as distinct races", () => {
    const result = stitchPages([
      {
        election_metadata: META,
        sections: [
          {
            section_name: "Federal",
            races: [
              {
                ...mkRace("US House"),
                district: "1",
              },
              {
                ...mkRace("US House"),
                district: "2",
              },
            ],
          },
        ],
      },
    ]);
    expect(result.sections[0].races).toHaveLength(2);
  });

  it("preserves election metadata from the first page that has it", () => {
    const result = stitchPages([
      {
        election_metadata: {
          ...META,
          jurisdiction: "Camden County, NJ",
        },
        sections: [],
      },
      {
        election_metadata: {
          ...META,
          jurisdiction: "OTHER",
        },
        sections: [{ section_name: "Federal", races: [mkRace("X")] }],
      },
    ]);
    expect(result.election_metadata.jurisdiction).toBe("Camden County, NJ");
  });

  it("survives pages with no sections", () => {
    const result = stitchPages([
      { election_metadata: META, sections: [] },
      {
        election_metadata: META,
        sections: [{ section_name: "Federal", races: [mkRace("X")] }],
      },
      { election_metadata: META, sections: [] },
    ]);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].races).toHaveLength(1);
  });

  it("merges section split across page boundary with same section_name", () => {
    // Page N has Federal section with US Senate; page N+1 starts with another
    // race under what is *the same* Federal section — merge.
    const result = stitchPages([
      {
        election_metadata: META,
        sections: [{ section_name: "Federal", races: [mkRace("US Senate")] }],
      },
      {
        election_metadata: META,
        sections: [{ section_name: "Federal", races: [mkRace("US House")] }],
      },
    ]);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].races.map((r) => r.office)).toEqual([
      "US Senate",
      "US House",
    ]);
  });

  it("does case-insensitive section name merging", () => {
    const result = stitchPages([
      {
        election_metadata: META,
        sections: [{ section_name: "federal", races: [mkRace("US Senate")] }],
      },
      {
        election_metadata: META,
        sections: [{ section_name: "Federal", races: [mkRace("US House")] }],
      },
    ]);
    expect(result.sections).toHaveLength(1);
  });
});
