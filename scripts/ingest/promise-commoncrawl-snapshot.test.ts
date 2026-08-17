import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  matchDiscoveredRecords,
  selectHomepageRecord,
} from "./promise-commoncrawl-snapshot";
import { loadSnapshotTargets, toCorpusRow } from "./promise-site-snapshot";
import { readSnapshotPage, writeSnapshot } from "./site-snapshot-store";
import { extractIssuePageUrls } from "./promise-extract";
import type { CommonCrawlRecord } from "./common-crawl-archive";

const record = (
  original: string,
  timestamp: string,
  overrides: Partial<CommonCrawlRecord> = {},
): CommonCrawlRecord => ({
  original,
  timestamp,
  status: 200,
  mime: "text/html",
  filename: "crawl-data/CC-MAIN-2022-33/segments/x/warc/y.warc.gz",
  offset: 0,
  length: 100,
  ...overrides,
});

describe("selectHomepageRecord", () => {
  it("picks the root-path record nearest before the cutoff", () => {
    const records = [
      record("https://janeforcongress.com/", "20220814000000"),
      record("https://janeforcongress.com/issues", "20220814000001"),
      record("https://janeforcongress.com/", "20220901000000"), // after cutoff
    ];
    const chosen = selectHomepageRecord(records, "20220819235959");
    expect(chosen?.timestamp).toBe("20220814000000");
  });

  it("treats an empty pathname as the homepage too", () => {
    const records = [record("https://janeforcongress.com", "20220814000000")];
    expect(selectHomepageRecord(records, "20220819235959")?.original).toBe(
      "https://janeforcongress.com",
    );
  });

  it("returns null when no record is at the site root", () => {
    const records = [
      record("https://janeforcongress.com/issues", "20220814000000"),
    ];
    expect(selectHomepageRecord(records, "20220819235959")).toBeNull();
  });

  it("returns null when every root-path record is after the cutoff", () => {
    const records = [record("https://janeforcongress.com/", "20220901000000")];
    expect(selectHomepageRecord(records, "20220819235959")).toBeNull();
  });

  it("ignores a malformed original URL instead of throwing", () => {
    const records = [record("not a url", "20220814000000")];
    expect(selectHomepageRecord(records, "20220819235959")).toBeNull();
  });
});

describe("matchDiscoveredRecords", () => {
  const homepage = "https://janeforcongress.com/";
  const allRecords = [
    record(homepage, "20220814000000"),
    record("https://janeforcongress.com/issues", "20220814000001"),
    record("https://janeforcongress.com/platform/", "20220814000002"),
    record("https://othersite.com/issues", "20220814000003"),
  ];

  it("keeps only discovered URLs this crawl actually indexed", () => {
    const matched = matchDiscoveredRecords(
      allRecords,
      [
        "https://janeforcongress.com/issues",
        "https://janeforcongress.com/never-crawled",
      ],
      homepage,
      5,
    );
    expect(matched.map((p) => p.discoveredUrl)).toEqual([
      "https://janeforcongress.com/issues",
    ]);
  });

  it("returns the DISCOVERED url form (not CC's own url form) as the write key, even across a trailing-slash difference", () => {
    // CC indexed this with a trailing slash (confirmed live against
    // crenshawforcongress.com/issues/), but extract-time discovery from the
    // homepage HTML will produce the no-slash form. The manifest write MUST
    // key on discoveredUrl, or the join breaks (2026-08-17 finding, caught
    // before merge).
    const matched = matchDiscoveredRecords(
      allRecords,
      ["https://janeforcongress.com/platform"], // no trailing slash
      homepage,
      5,
    );
    expect(matched).toHaveLength(1);
    expect(matched[0].discoveredUrl).toBe(
      "https://janeforcongress.com/platform",
    );
    expect(matched[0].record.original).toBe(
      "https://janeforcongress.com/platform/",
    );
  });

  it("excludes the homepage itself even if discovered as a self-link", () => {
    const matched = matchDiscoveredRecords(
      allRecords,
      ["https://janeforcongress.com/", "https://janeforcongress.com/issues"],
      homepage,
      5,
    );
    expect(matched.map((p) => p.discoveredUrl)).toEqual([
      "https://janeforcongress.com/issues",
    ]);
  });

  it("honors the cap", () => {
    const matched = matchDiscoveredRecords(
      allRecords,
      [
        "https://janeforcongress.com/issues",
        "https://janeforcongress.com/platform",
      ],
      homepage,
      1,
    );
    expect(matched).toHaveLength(1);
  });

  it("dedupes repeated discovered URLs", () => {
    const matched = matchDiscoveredRecords(
      allRecords,
      [
        "https://janeforcongress.com/issues",
        "https://janeforcongress.com/issues",
      ],
      homepage,
      5,
    );
    expect(matched).toHaveLength(1);
  });
});

describe("snapshot-store join: writing under discoveredUrl (not CC's own url form)", () => {
  let dir: string;
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("makes the write key match what extract-time discovery independently re-derives", () => {
    dir = mkdtempSync(join(tmpdir(), "promise-cc-join-"));
    const homepageHtml = '<a href="/platform">Platform</a>';
    const homepageOriginal = "https://janeforcongress.com/";

    // Capture-time: same as snapshotCandidateFromCommonCrawl's own flow —
    // discover from the fetched homepage HTML, match against what CC
    // indexed (which has a trailing slash CC added on its own).
    const discovered = extractIssuePageUrls(homepageHtml, homepageOriginal, 5);
    const ccRecords = [
      record(homepageOriginal, "20220814000000"),
      record("https://janeforcongress.com/platform/", "20220814000001"),
    ];
    const matched = matchDiscoveredRecords(
      ccRecords,
      discovered,
      homepageOriginal,
      5,
    );
    expect(matched).toHaveLength(1);

    writeSnapshot(dir, {
      timestamp: "20220814000000",
      original: "https://janeforcongress.com",
      finalLiveUrl: homepageOriginal,
      candidateId: "cand-1",
      html: homepageHtml,
      fetchedAt: "2026-08-17T00:00:00.000Z",
    });
    // The fix: write under discoveredUrl, not matched[0].record.original.
    writeSnapshot(dir, {
      timestamp: matched[0].record.timestamp,
      original: matched[0].discoveredUrl,
      finalLiveUrl: matched[0].record.original,
      candidateId: "cand-1",
      html: "<html>platform</html>",
      fetchedAt: "2026-08-17T00:00:01.000Z",
    });

    // Extract-time: re-discover from the SAME homepage HTML + base — this
    // is exactly what promise-extract.ts's extractCandidate does.
    const extractTimeDiscovered = extractIssuePageUrls(
      homepageHtml,
      homepageOriginal,
      5,
    );
    const lookupUrl = `snapshot://20220814000000/${extractTimeDiscovered[0]}`;
    expect(readSnapshotPage(lookupUrl, dir)?.html).toBe(
      "<html>platform</html>",
    );

    // Proof the bug was real: looking up under CC's own url form (the
    // trailing-slash variant) — what a write keyed on record.original would
    // have produced — misses.
    const buggyLookupUrl = `snapshot://20220814000000/${matched[0].record.original}`;
    expect(readSnapshotPage(buggyLookupUrl, dir)).toBeNull();
  });
});

describe("toCorpusRow reuse (shared with promise-site-snapshot.ts)", () => {
  it("produces a corpus row shape promise-extract.ts's loadCorpusRows accepts", () => {
    const targets = loadSnapshotTargets([
      {
        candidateId: "cand-1",
        name: "Jane Doe",
        state: "TX",
        office: "house",
        district: "21",
        website: "https://janeforcongress.com",
        bucket: "website_archived",
      },
    ]);
    const row = toCorpusRow({
      target: targets[0],
      canonicalCaptureUrl:
        "snapshot://20220814000000/https://janeforcongress.com",
      pagesCaptured: 3,
      pagesFailed: 0,
    });
    expect(row?.bucket).toBe("website_archived");
    expect(row?.candidateId).toBe("cand-1");
    expect(row?.canonicalCaptureUrl).toBe(
      "snapshot://20220814000000/https://janeforcongress.com",
    );
  });
});
