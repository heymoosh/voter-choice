import { describe, expect, it } from "vitest";
import { loadSnapshotTargets, toCorpusRow } from "./promise-site-snapshot";

const row = (overrides: Record<string, unknown> = {}) => ({
  state: "TX",
  office: "house",
  district: "21",
  name: "Jane Doe",
  bucket: "website_no_captures",
  candidateId: "cand-1",
  website: "https://janeforcongress.com",
  ...overrides,
});

describe("loadSnapshotTargets", () => {
  it("keeps rows with a resolved candidate and a real campaign URL, capture or not", () => {
    const targets = loadSnapshotTargets([
      row({ bucket: "website_archived" }),
      row({ bucket: "website_no_captures", candidateId: "cand-2" }),
      row({ bucket: "wayback_error", candidateId: "cand-3" }),
    ]);
    expect(targets.map((t) => t.candidateId)).toEqual([
      "cand-1",
      "cand-2",
      "cand-3",
    ]);
  });

  it("drops social-profile rows, unresolved rows, and rows without a URL", () => {
    expect(
      loadSnapshotTargets([
        row({ bucket: "social_media_only" }),
        row({ candidateId: null }),
        row({ website: null }),
        "not an object",
      ]),
    ).toEqual([]);
  });

  it("returns [] for a non-array payload", () => {
    expect(loadSnapshotTargets({ rows: [] })).toEqual([]);
  });
});

describe("toCorpusRow", () => {
  const target = loadSnapshotTargets([row()])[0];

  it("emits an extraction-ready corpus row pinned on the snapshot archive", () => {
    const corpusRow = toCorpusRow({
      target,
      canonicalCaptureUrl:
        "snapshot://20260817001530/https://janeforcongress.com",
      pagesCaptured: 4,
      pagesFailed: 0,
    });
    expect(corpusRow).toMatchObject({
      bucket: "website_archived",
      candidateId: "cand-1",
      captureArchive: "snapshot",
      captureCount: 4,
      canonicalCaptureUrl:
        "snapshot://20260817001530/https://janeforcongress.com",
    });
  });

  it("returns null for an unreachable site", () => {
    expect(
      toCorpusRow({
        target,
        canonicalCaptureUrl: null,
        pagesCaptured: 0,
        pagesFailed: 1,
      }),
    ).toBeNull();
  });
});
