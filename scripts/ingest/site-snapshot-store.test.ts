import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  nowTimestamp,
  parseManifest,
  readSnapshotPage,
  selectNearestSnapshot,
  writeSnapshot,
  type SnapshotManifestEntry,
} from "./site-snapshot-store";

const entry = (
  timestamp: string,
  overrides: Partial<SnapshotManifestEntry> = {},
): SnapshotManifestEntry => ({
  timestamp,
  original: "https://janeforcongress.com",
  finalLiveUrl: "https://janeforcongress.com",
  candidateId: "cand-1",
  sha256: "abc",
  path: "pages/abc.html",
  fetchedAt: "2026-08-17T00:00:00.000Z",
  ...overrides,
});

describe("nowTimestamp", () => {
  it("formats a Date as a 14-digit UTC replay timestamp", () => {
    expect(nowTimestamp(new Date("2026-08-17T00:15:30.123Z"))).toBe(
      "20260817001530",
    );
  });
});

describe("parseManifest", () => {
  it("parses JSONL lines and drops malformed or incomplete ones", () => {
    const jsonl = [
      JSON.stringify(entry("20260817001530")),
      "not json at all",
      JSON.stringify({ timestamp: "nope", original: "x", path: "y" }),
      JSON.stringify({ original: "missing timestamp", path: "y" }),
      "",
    ].join("\n");
    const parsed = parseManifest(jsonl);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].timestamp).toBe("20260817001530");
  });
});

describe("selectNearestSnapshot", () => {
  it("returns the entry closest to the requested timestamp", () => {
    const entries = [entry("20260801000000"), entry("20260817000000")];
    expect(selectNearestSnapshot(entries, "20260816000000")?.timestamp).toBe(
      "20260817000000",
    );
  });

  it("resolves equidistant ties to the earlier capture", () => {
    const entries = [entry("20260810000000"), entry("20260830000000")];
    expect(selectNearestSnapshot(entries, "20260820000000")?.timestamp).toBe(
      "20260810000000",
    );
  });

  it("returns null for an empty list", () => {
    expect(selectNearestSnapshot([], "20260817000000")).toBeNull();
  });

  it("compares real elapsed time, not raw digit distance, across a year boundary", () => {
    // want is 11 real seconds after e1 (New Year's Eve) but a full day
    // before e2 (Jan 2). A raw numeric diff on the 14-digit strings reads
    // e1 as ~69.7M "units" away (crossing the 12/31→01/01 rollover) and e2
    // as under 1M — backwards from the real 11s vs ~86,390s elapsed time.
    const e1 = entry("20251231235959");
    const e2 = entry("20260102000000");
    expect(selectNearestSnapshot([e1, e2], "20260101000010")?.timestamp).toBe(
      "20251231235959",
    );
  });
});

describe("writeSnapshot + readSnapshotPage round-trip", () => {
  let dir: string;
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("serves the exact capture back through its snapshot URL", () => {
    dir = mkdtempSync(join(tmpdir(), "snapshot-store-"));
    writeSnapshot(dir, {
      timestamp: "20260817001530",
      original: "https://janeforcongress.com",
      finalLiveUrl: "https://www.janeforcongress.com/",
      candidateId: "cand-1",
      html: "<html><body>I will vote NO on X.</body></html>",
      fetchedAt: "2026-08-17T00:15:30.000Z",
    });
    const page = readSnapshotPage(
      "snapshot://20260817001530/https://janeforcongress.com",
      dir,
    );
    expect(page?.html).toContain("I will vote NO on X.");
    expect(page?.finalUrl).toBe(
      "snapshot://20260817001530/https://janeforcongress.com",
    );
  });

  it("resolves a different requested timestamp to the nearest capture (archive redirect semantics)", () => {
    dir = mkdtempSync(join(tmpdir(), "snapshot-store-"));
    writeSnapshot(dir, {
      timestamp: "20260817001530",
      original: "https://janeforcongress.com/issues",
      finalLiveUrl: "https://janeforcongress.com/issues",
      candidateId: "cand-1",
      html: "<html>issues</html>",
      fetchedAt: "2026-08-17T00:15:31.000Z",
    });
    const page = readSnapshotPage(
      "snapshot://20260901000000/https://janeforcongress.com/issues",
      dir,
    );
    expect(page?.html).toBe("<html>issues</html>");
    expect(page?.finalUrl).toBe(
      "snapshot://20260817001530/https://janeforcongress.com/issues",
    );
  });

  it("returns null for originals the store has never captured", () => {
    dir = mkdtempSync(join(tmpdir(), "snapshot-store-"));
    expect(
      readSnapshotPage("snapshot://20260817001530/https://neverseen.com", dir),
    ).toBeNull();
  });

  it("returns null for non-snapshot URLs", () => {
    dir = mkdtempSync(join(tmpdir(), "snapshot-store-"));
    expect(
      readSnapshotPage(
        "https://web.archive.org/web/20260817001530/https://janeforcongress.com",
        dir,
      ),
    ).toBeNull();
  });
});
