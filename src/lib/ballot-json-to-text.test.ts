import { describe, expect, it } from "vitest";
import { ballotJsonToText } from "./ballot-json-to-text";
import type {
  ExtractSection,
  ExtractElectionMetadata,
} from "./server/extract-types";

const META: ExtractElectionMetadata = {
  election_date: "2026-06-02",
  election_type: "primary",
  jurisdiction: "Camden County, NJ",
};

describe("ballotJsonToText", () => {
  it("returns an empty string for a ballot with no sections", () => {
    const text = ballotJsonToText({
      election_metadata: META,
      sections: [],
    });
    expect(text).toBe("");
  });

  it("emits header + section + races + candidates", () => {
    const sections: ExtractSection[] = [
      {
        section_name: "Federal",
        races: [
          {
            office: "US Senate",
            vote_for_n: 1,
            party_context: "Democratic Primary",
            candidates: [
              {
                name: "Jane Doe",
                party: "Democratic",
                placeholder_reason: null,
              },
              {
                name: "John Smith",
                party: "Democratic",
                placeholder_reason: null,
              },
            ],
          },
        ],
      },
    ];
    const text = ballotJsonToText({ election_metadata: META, sections });
    expect(text).toContain("Camden County, NJ");
    expect(text).toContain("Federal");
    expect(text).toContain("US Senate");
    expect(text).toContain("Jane Doe");
    expect(text).toContain("John Smith");
  });

  it("emits district + position when present", () => {
    const sections: ExtractSection[] = [
      {
        section_name: "Federal",
        races: [
          {
            office: "US House",
            district: "1",
            vote_for_n: 1,
            party_context: null,
            candidates: [
              {
                name: "Donald Norcross",
                party: "Democratic",
                placeholder_reason: null,
              },
            ],
          },
        ],
      },
    ];
    const text = ballotJsonToText({ election_metadata: META, sections });
    expect(text).toContain("US House");
    expect(text).toContain("District 1");
    expect(text).toContain("Donald Norcross");
  });

  it("labels write-in placeholder slots", () => {
    const sections: ExtractSection[] = [
      {
        section_name: "Federal",
        races: [
          {
            office: "US House",
            vote_for_n: 1,
            party_context: null,
            candidates: [
              { name: null, party: null, placeholder_reason: "write_in" },
            ],
          },
        ],
      },
    ];
    const text = ballotJsonToText({ election_metadata: META, sections });
    expect(text.toLowerCase()).toContain("write-in");
  });

  it("labels no-petition-filed slots", () => {
    const sections: ExtractSection[] = [
      {
        section_name: "Federal",
        races: [
          {
            office: "US House",
            vote_for_n: 1,
            party_context: "Republican Primary",
            candidates: [
              {
                name: null,
                party: null,
                placeholder_reason: "no_petition_filed",
              },
            ],
          },
        ],
      },
    ];
    const text = ballotJsonToText({ election_metadata: META, sections });
    expect(text.toLowerCase()).toContain("no petition filed");
  });

  it("emits party_context label per race", () => {
    const sections: ExtractSection[] = [
      {
        section_name: "Federal",
        races: [
          {
            office: "US Senate",
            vote_for_n: 1,
            party_context: "Democratic Primary",
            candidates: [
              {
                name: "Cory Booker",
                party: "Democratic",
                placeholder_reason: null,
              },
            ],
          },
          {
            office: "US Senate",
            vote_for_n: 1,
            party_context: "Republican Primary",
            candidates: [
              {
                name: "John Bramnick",
                party: "Republican",
                placeholder_reason: null,
              },
            ],
          },
        ],
      },
    ];
    const text = ballotJsonToText({ election_metadata: META, sections });
    expect(text).toContain("Democratic Primary");
    expect(text).toContain("Republican Primary");
  });

  it("does not contain the literal '_meta'", () => {
    const sections: ExtractSection[] = [
      {
        section_name: "Federal",
        races: [
          {
            office: "US Senate",
            vote_for_n: 1,
            party_context: null,
            candidates: [
              {
                name: "Cory Booker",
                party: "Democratic",
                placeholder_reason: null,
              },
            ],
          },
        ],
      },
    ];
    const text = ballotJsonToText({ election_metadata: META, sections });
    expect(text).not.toContain("_meta");
  });
});
