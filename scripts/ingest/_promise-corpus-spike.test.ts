/**
 * scripts/ingest/_promise-corpus-spike.test.ts
 *
 * Tests for the promise-corpus spike's pure URL / OpenFEC-parse / CDX-parse
 * functions. No network or DB — the networked report loop is exercised by
 * running the script itself (see the header of _promise-corpus-spike.ts).
 */

import { describe, it, expect } from "vitest";
import {
  normalizeCampaignUrl,
  isSocialMediaUrl,
  cdxUrlKey,
  pickPrincipalCommittee,
  extractCommitteeWebsite,
  parseCdxJson,
  toCdxCutoff,
  selectCanonicalCapture,
  waybackReplayUrl,
  summarizeBuckets,
  BUCKET_NOTES,
  type SpikeBucket,
} from "./_promise-corpus-spike";

describe("normalizeCampaignUrl", () => {
  it("adds https:// to a bare domain and lowercases the host", () => {
    expect(normalizeCampaignUrl("WWW.JaneForCongress.COM")).toBe(
      "https://www.janeforcongress.com",
    );
  });

  it("upgrades http to https and strips query, hash, trailing slash", () => {
    expect(
      normalizeCampaignUrl("http://janeforcongress.com/?utm_source=fec#top"),
    ).toBe("https://janeforcongress.com");
  });

  it("keeps a path", () => {
    expect(normalizeCampaignUrl("https://example.com/campaign")).toBe(
      "https://example.com/campaign",
    );
  });

  it.each(["", "  ", "none", "N/A", "-", "http://", "www", "TBD"])(
    "rejects junk value %j",
    (junk) => {
      expect(normalizeCampaignUrl(junk)).toBeNull();
    },
  );

  it("rejects non-web schemes and non-strings", () => {
    expect(normalizeCampaignUrl("mailto:jane@example.com")).toBeNull();
    expect(normalizeCampaignUrl("ftp://example.com")).toBeNull();
    expect(normalizeCampaignUrl(null)).toBeNull();
    expect(normalizeCampaignUrl(42)).toBeNull();
  });

  it("rejects a TLD-less token that URL would otherwise accept", () => {
    expect(normalizeCampaignUrl("campaign")).toBeNull();
  });
});

describe("isSocialMediaUrl", () => {
  it("flags social and link-hub hosts, with or without www", () => {
    expect(isSocialMediaUrl("https://www.facebook.com/janeforcongress")).toBe(
      true,
    );
    expect(isSocialMediaUrl("https://x.com/jane")).toBe(true);
    expect(isSocialMediaUrl("https://linktr.ee/jane")).toBe(true);
    expect(isSocialMediaUrl("https://secure.actblue.com/donate/jane")).toBe(
      true,
    );
  });

  it("passes real campaign domains", () => {
    expect(isSocialMediaUrl("https://janeforcongress.com")).toBe(false);
    // A campaign domain that merely contains a social word is not social.
    expect(isSocialMediaUrl("https://facebookwatch.example.com")).toBe(false);
  });
});

describe("cdxUrlKey", () => {
  it("strips the scheme and keeps host + path", () => {
    expect(cdxUrlKey("https://janeforcongress.com/issues")).toBe(
      "janeforcongress.com/issues",
    );
    expect(cdxUrlKey("http://example.com")).toBe("example.com");
  });
});

describe("pickPrincipalCommittee", () => {
  const payload = {
    results: [
      {
        committee_id: "C00000001",
        name: "OLD JANE FOR CONGRESS",
        designation: "P",
        cycles: [2020, 2022],
      },
      {
        committee_id: "C00000002",
        name: "JANE FOR CONGRESS 2026",
        designation: "P",
        cycles: [2024, 2026],
        website: "https://janeforcongress.com",
      },
      {
        committee_id: "C00000003",
        name: "JANE LEADERSHIP PAC",
        designation: "D",
        cycles: [2026],
      },
    ],
  };

  it("picks the designation-P committee active in the most recent cycle", () => {
    const principal = pickPrincipalCommittee(payload);
    expect(principal).toEqual({
      committeeId: "C00000002",
      name: "JANE FOR CONGRESS 2026",
      lastCycle: 2026,
      website: "https://janeforcongress.com",
    });
  });

  it("returns null when no principal committee exists", () => {
    expect(
      pickPrincipalCommittee({
        results: [{ committee_id: "C1", designation: "D" }],
      }),
    ).toBeNull();
  });

  it("tolerates malformed payloads", () => {
    expect(pickPrincipalCommittee(null)).toBeNull();
    expect(pickPrincipalCommittee({})).toBeNull();
    expect(pickPrincipalCommittee({ results: "nope" })).toBeNull();
    expect(pickPrincipalCommittee({ results: [null, 7, "x"] })).toBeNull();
  });

  it("survives a principal committee with no cycles array", () => {
    const principal = pickPrincipalCommittee({
      results: [{ committee_id: "C9", designation: "P", name: "X" }],
    });
    expect(principal?.committeeId).toBe("C9");
    expect(principal?.lastCycle).toBeNull();
    expect(principal?.website).toBeNull();
  });
});

describe("extractCommitteeWebsite", () => {
  it("reads results[0].website", () => {
    expect(
      extractCommitteeWebsite({
        results: [{ committee_id: "C1", website: "www.example.com" }],
      }),
    ).toBe("www.example.com");
  });

  it("returns null for empty or malformed payloads", () => {
    expect(extractCommitteeWebsite({ results: [] })).toBeNull();
    expect(extractCommitteeWebsite({ results: [{ website: null }] })).toBeNull();
    expect(extractCommitteeWebsite(null)).toBeNull();
  });
});

describe("parseCdxJson", () => {
  const header = [
    "urlkey",
    "timestamp",
    "original",
    "mimetype",
    "statuscode",
    "digest",
    "length",
  ];

  it("parses captures after the header row", () => {
    const captures = parseCdxJson([
      header,
      [
        "com,janeforcongress)/",
        "20250301120000",
        "https://janeforcongress.com/",
        "text/html",
        "200",
        "ABC",
        "1234",
      ],
      [
        "com,janeforcongress)/",
        "20261001120000",
        "https://janeforcongress.com/",
        "text/html",
        "200",
        "DEF",
        "1234",
      ],
    ]);
    expect(captures).toEqual([
      { timestamp: "20250301120000", original: "https://janeforcongress.com/" },
      { timestamp: "20261001120000", original: "https://janeforcongress.com/" },
    ]);
  });

  it("returns [] for the empty CDX response and malformed payloads", () => {
    expect(parseCdxJson([])).toEqual([]);
    expect(parseCdxJson(null)).toEqual([]);
    expect(parseCdxJson("not json rows")).toEqual([]);
    expect(parseCdxJson([header])).toEqual([]);
    expect(parseCdxJson([["wrong", "header"], ["a", "b"]])).toEqual([]);
  });

  it("drops rows with malformed timestamps", () => {
    expect(
      parseCdxJson([
        header,
        ["k", "not-a-ts", "https://x.com/", "text/html", "200", "D", "1"],
      ]),
    ).toEqual([]);
  });
});

describe("canonical-capture policy", () => {
  const captures = [
    { timestamp: "20250301120000", original: "https://a.com/" },
    { timestamp: "20261001120000", original: "https://a.com/" },
    { timestamp: "20261104000000", original: "https://a.com/" },
  ];

  it("picks the last capture at or before election day", () => {
    const cutoff = toCdxCutoff("2026-11-03");
    expect(cutoff).toBe("20261103235959");
    expect(selectCanonicalCapture(captures, cutoff)).toEqual({
      timestamp: "20261001120000",
      original: "https://a.com/",
    });
  });

  it("returns null when every capture is after the cutoff", () => {
    expect(
      selectCanonicalCapture(
        [{ timestamp: "20261104000000", original: "https://a.com/" }],
        toCdxCutoff("2026-11-03"),
      ),
    ).toBeNull();
  });

  it("builds a replay URL from the canonical capture", () => {
    expect(
      waybackReplayUrl({
        timestamp: "20261001120000",
        original: "https://a.com/",
      }),
    ).toBe("https://web.archive.org/web/20261001120000/https://a.com/");
  });
});

describe("summarizeBuckets", () => {
  it("counts every bucket, including zero-count ones", () => {
    const counts = summarizeBuckets([
      { bucket: "website_archived" },
      { bucket: "website_archived" },
      { bucket: "unresolved" },
    ]);
    expect(counts.get("website_archived")).toBe(2);
    expect(counts.get("unresolved")).toBe(1);
    expect(counts.get("no_fec_id")).toBe(0);
    // Every bucket in the enum has a printed note.
    for (const bucket of counts.keys()) {
      expect(BUCKET_NOTES[bucket as SpikeBucket]).toBeTruthy();
    }
  });
});
