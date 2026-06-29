/**
 * Unit tests for press-release-matcher.ts
 *
 * All tests are pure (no DB, no network). Fixtures are inline.
 * Run: npx vitest run scripts/ingest/press-release-matcher.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  toDateString,
  computeDateWindow,
  isWithinWindow,
  isPersonalExplanation,
  releaseContainsBillNumber,
  releaseContainsBillKeyword,
  extractBillKeywords,
  matchReleaseToVote,
  filterMatchingReleases,
  DATE_WINDOW_DAYS_BEFORE,
  DATE_WINDOW_DAYS_AFTER,
  type CongressPressRelease,
  type RollCallVote,
} from "./press-release-matcher";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VOTE_DATE = "2023-06-15";

const BASE_VOTE: RollCallVote = {
  billId: "govtrack-hr5376-117",
  billTitle: "Inflation Reduction Act",
  billNumberTokens: ["H.R. 5376", "HR5376", "H.R.5376"],
  voteDate: VOTE_DATE,
  bioguideId: "K000367",
};

function makeRelease(
  overrides: Partial<CongressPressRelease>,
): CongressPressRelease {
  return {
    bioguide_id: "K000367",
    date: VOTE_DATE,
    title: "Sen. Smith Supports Climate Action",
    text: "Today the Senate passed H.R. 5376, the Inflation Reduction Act. Sen. Smith voted yes because ...",
    url: "https://www.smith.senate.gov/news/press-releases/2023/06/15/climate",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// toDateString
// ---------------------------------------------------------------------------

describe("toDateString", () => {
  it("parses ISO-8601 date", () => {
    expect(toDateString("2023-06-15")).toBe("2023-06-15");
  });

  it("parses ISO-8601 datetime", () => {
    expect(toDateString("2023-06-15T14:22:00Z")).toBe("2023-06-15");
  });

  it("returns null for empty string", () => {
    expect(toDateString("")).toBeNull();
  });

  it("returns null for garbage", () => {
    expect(toDateString("not-a-date")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// computeDateWindow
// ---------------------------------------------------------------------------

describe("computeDateWindow", () => {
  it("window spans DAYS_BEFORE before and DAYS_AFTER after", () => {
    const { earliest, latest } = computeDateWindow("2023-06-15");
    // 2023-06-15 - 7 = 2023-06-08
    expect(earliest).toBe("2023-06-08");
    // 2023-06-15 + 7 = 2023-06-22
    expect(latest).toBe("2023-06-22");
  });

  it("constants match expected values", () => {
    expect(DATE_WINDOW_DAYS_BEFORE).toBe(7);
    expect(DATE_WINDOW_DAYS_AFTER).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// isWithinWindow
// ---------------------------------------------------------------------------

describe("isWithinWindow", () => {
  const earliest = "2023-06-08";
  const latest = "2023-06-22";

  it("includes the vote date itself", () => {
    expect(isWithinWindow("2023-06-15", earliest, latest)).toBe(true);
  });

  it("includes the earliest bound", () => {
    expect(isWithinWindow("2023-06-08", earliest, latest)).toBe(true);
  });

  it("includes the latest bound", () => {
    expect(isWithinWindow("2023-06-22", earliest, latest)).toBe(true);
  });

  it("excludes a date one day before earliest", () => {
    expect(isWithinWindow("2023-06-07", earliest, latest)).toBe(false);
  });

  it("excludes a date one day after latest", () => {
    expect(isWithinWindow("2023-06-23", earliest, latest)).toBe(false);
  });

  it("handles datetime strings (strips time)", () => {
    expect(isWithinWindow("2023-06-15T12:00:00Z", earliest, latest)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isPersonalExplanation
// ---------------------------------------------------------------------------

describe("isPersonalExplanation", () => {
  it("excludes a release with 'personal explanation' in the title", () => {
    const release = makeRelease({
      title: "Personal Explanation — Vote on S. 1234",
      text: "I was absent from today's vote due to a family emergency.",
    });
    expect(isPersonalExplanation(release)).toBe(true);
  });

  it("excludes case-insensitive 'PERSONAL EXPLANATION' in text", () => {
    const release = makeRelease({
      title: "Statement on Healthcare",
      text: "PERSONAL EXPLANATION: I missed the vote on S. 100 because of a committee meeting.",
    });
    expect(isPersonalExplanation(release)).toBe(true);
  });

  it("excludes 'personal explanation' in body even with normal title", () => {
    const release = makeRelease({
      title: "My Vote on the Inflation Reduction Act",
      text: "As a personal explanation for my absence, I was attending...",
    });
    expect(isPersonalExplanation(release)).toBe(true);
  });

  it("does NOT exclude a release without the phrase", () => {
    const release = makeRelease({
      title: "Sen. Smith Votes Yes on H.R. 5376",
      text: "The Inflation Reduction Act will lower drug prices.",
    });
    expect(isPersonalExplanation(release)).toBe(false);
  });

  it("does NOT false-positive on 'personal' without 'explanation'", () => {
    const release = makeRelease({
      text: "This bill reflects my personal commitment to climate action.",
    });
    expect(isPersonalExplanation(release)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// releaseContainsBillNumber
// ---------------------------------------------------------------------------

describe("releaseContainsBillNumber", () => {
  it("matches 'H.R. 5376' verbatim in text", () => {
    const release = makeRelease({
      text: "I voted yes on H.R. 5376 today.",
    });
    expect(releaseContainsBillNumber(release, ["H.R. 5376", "HR5376"])).toBe(
      true,
    );
  });

  it("matches compact 'HR5376' (no spaces/dots)", () => {
    const release = makeRelease({
      text: "My vote on HR5376 is a vote for the climate.",
    });
    expect(releaseContainsBillNumber(release, ["H.R. 5376", "HR5376"])).toBe(
      true,
    );
  });

  it("matches in title", () => {
    const release = makeRelease({
      title: "Sen. Smith Votes Yes on H.R.5376",
      text: "I support the act.",
    });
    expect(releaseContainsBillNumber(release, ["H.R. 5376", "H.R.5376"])).toBe(
      true,
    );
  });

  it("does NOT match a different bill number", () => {
    const release = makeRelease({
      text: "I voted on H.R. 9999 today.",
    });
    expect(releaseContainsBillNumber(release, ["H.R. 5376", "HR5376"])).toBe(
      false,
    );
  });

  it("does NOT match partial numeric coincidence (9 in 9999 ≠ 5376)", () => {
    const release = makeRelease({ text: "I supported H.R. 537 yesterday." });
    expect(releaseContainsBillNumber(release, ["HR5376"])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// extractBillKeywords
// ---------------------------------------------------------------------------

describe("extractBillKeywords", () => {
  it("extracts meaningful keywords from Inflation Reduction Act", () => {
    const kws = extractBillKeywords("Inflation Reduction Act");
    expect(kws).toContain("inflation");
    expect(kws).toContain("reduction");
    expect(kws).not.toContain("act"); // stopword
  });

  it("filters short tokens", () => {
    const kws = extractBillKeywords("H.R. 1 — Build Back Better");
    expect(kws).toContain("build");
    expect(kws).toContain("back"); // 4 chars — passes MIN_KEYWORD_LENGTH=4
    expect(kws).toContain("better");
    expect(kws).not.toContain("hr"); // 2 chars — too short, filtered
    expect(kws).not.toContain("1"); // single digit — too short
  });

  it("returns empty array for a title composed entirely of stopwords", () => {
    const kws = extractBillKeywords("The Act");
    expect(kws).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// releaseContainsBillKeyword
// ---------------------------------------------------------------------------

describe("releaseContainsBillKeyword", () => {
  it("returns true when a keyword appears in the text", () => {
    const release = makeRelease({
      text: "The inflation reduction package will help families.",
    });
    expect(
      releaseContainsBillKeyword(release, ["inflation", "reduction"]),
    ).toBe(true);
  });

  it("returns false when no keyword matches", () => {
    const release = makeRelease({
      text: "I voted on the farm bill today.",
    });
    expect(
      releaseContainsBillKeyword(release, ["inflation", "reduction"]),
    ).toBe(false);
  });

  it("returns false for empty keyword list", () => {
    const release = makeRelease({ text: "anything" });
    expect(releaseContainsBillKeyword(release, [])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// matchReleaseToVote — the main matcher
// ---------------------------------------------------------------------------

describe("matchReleaseToVote", () => {
  // PROBE 1: High-confidence match — bill number in release
  it("returns high confidence when bill number appears in text", () => {
    const release = makeRelease({
      date: VOTE_DATE,
      text: "I voted yes on H.R. 5376, the Inflation Reduction Act.",
    });
    const result = matchReleaseToVote(release, BASE_VOTE);
    expect(result.excluded).toBe(false);
    expect(result.confidence).toBe("high");
  });

  // PROBE 2: Personal Explanation excluded
  it("excludes personal explanation releases", () => {
    const release = makeRelease({
      date: VOTE_DATE,
      title: "Personal Explanation — Missed Vote",
      text: "I was absent due to medical reasons.",
    });
    const result = matchReleaseToVote(release, BASE_VOTE);
    expect(result.excluded).toBe(true);
    expect(result.confidence).toBe("no_match");
    expect(result.exclusionReason).toBe("personal_explanation");
  });

  // PROBE 3: Out-of-window release with keyword but no bill number → no_match
  it("returns no_match for out-of-window release without bill number", () => {
    const release = makeRelease({
      // 30 days BEFORE the vote — outside the 7-day pre-window
      date: "2023-05-16",
      text: "The inflation reduction bill is an important piece of legislation.",
    });
    const result = matchReleaseToVote(release, BASE_VOTE);
    expect(result.excluded).toBe(false);
    expect(result.confidence).toBe("no_match");
  });

  it("returns medium confidence for in-window keyword match without bill number", () => {
    const release = makeRelease({
      date: VOTE_DATE,
      title: "Sen. Smith on Inflation Relief",
      text: "I voted for relief from inflation today. The reduction in drug costs...",
    });
    const result = matchReleaseToVote(release, BASE_VOTE);
    expect(result.excluded).toBe(false);
    expect(result.confidence).toBe("medium");
  });

  it("returns low confidence for in-window release with no keyword or bill number", () => {
    const release = makeRelease({
      date: VOTE_DATE,
      title: "Weekly Roundup",
      text: "This week I met with constituents and attended committee hearings.",
    });
    const result = matchReleaseToVote(release, BASE_VOTE);
    expect(result.excluded).toBe(false);
    expect(result.confidence).toBe("low");
  });

  it("returns no_match for a release from outside the date window with no bill number", () => {
    const release = makeRelease({
      date: "2023-01-01", // months before the vote
      text: "A reflection on the new year.",
    });
    const result = matchReleaseToVote(release, BASE_VOTE);
    expect(result.confidence).toBe("no_match");
    expect(result.excluded).toBe(false);
  });

  it("high confidence is returned even when date is slightly out of window", () => {
    // Bill number found → high confidence regardless of date
    const release = makeRelease({
      date: "2023-01-01", // way before vote
      text: "I co-sponsored H.R. 5376 last year.",
    });
    const result = matchReleaseToVote(release, BASE_VOTE);
    // Our spec: high confidence fires on bill number regardless of window
    expect(result.confidence).toBe("high");
    expect(result.excluded).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// filterMatchingReleases
// ---------------------------------------------------------------------------

describe("filterMatchingReleases", () => {
  const releases: CongressPressRelease[] = [
    // high match
    makeRelease({
      date: VOTE_DATE,
      text: "I voted on H.R. 5376 today.",
      url: "https://example.gov/high",
    }),
    // medium match
    makeRelease({
      date: VOTE_DATE,
      title: "On inflation reduction",
      text: "The inflation bill passed.",
      url: "https://example.gov/medium",
    }),
    // low match
    makeRelease({
      date: VOTE_DATE,
      title: "Weekly Update",
      text: "A busy week in the Senate.",
      url: "https://example.gov/low",
    }),
    // personal explanation — excluded
    makeRelease({
      date: VOTE_DATE,
      title: "Personal Explanation",
      text: "I missed the vote.",
      url: "https://example.gov/excluded",
    }),
    // out of window — no match
    makeRelease({
      date: "2022-01-01",
      text: "Old news.",
      url: "https://example.gov/nomatch",
    }),
  ];

  it("with minConfidence=medium returns high and medium matches only", () => {
    const matches = filterMatchingReleases(releases, BASE_VOTE, "medium");
    const urls = matches.map((m) => m.release.url);
    expect(urls).toContain("https://example.gov/high");
    expect(urls).toContain("https://example.gov/medium");
    expect(urls).not.toContain("https://example.gov/low");
    expect(urls).not.toContain("https://example.gov/excluded");
    expect(urls).not.toContain("https://example.gov/nomatch");
  });

  it("with minConfidence=high returns only high matches", () => {
    const matches = filterMatchingReleases(releases, BASE_VOTE, "high");
    const urls = matches.map((m) => m.release.url);
    expect(urls).toContain("https://example.gov/high");
    expect(urls).not.toContain("https://example.gov/medium");
    expect(urls).not.toContain("https://example.gov/low");
  });

  it("with minConfidence=low returns high, medium, and low matches", () => {
    const matches = filterMatchingReleases(releases, BASE_VOTE, "low");
    const urls = matches.map((m) => m.release.url);
    expect(urls).toContain("https://example.gov/high");
    expect(urls).toContain("https://example.gov/medium");
    expect(urls).toContain("https://example.gov/low");
    expect(urls).not.toContain("https://example.gov/excluded");
    expect(urls).not.toContain("https://example.gov/nomatch");
  });

  it("returns empty array when no releases match", () => {
    const empty = filterMatchingReleases([], BASE_VOTE);
    expect(empty).toHaveLength(0);
  });
});
