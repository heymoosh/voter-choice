import { describe, expect, it } from "vitest";
import {
  locTimeMapUrl,
  parseMementoTimeMap,
  parseReplayUrl,
  replayUrl,
  timestampToIsoDate,
} from "./web-archives";

describe("parseReplayUrl", () => {
  it("parses a Wayback replay URL", () => {
    expect(
      parseReplayUrl(
        "https://web.archive.org/web/20260801120000/https://janeforcongress.com/issues",
      ),
    ).toEqual({
      archive: "wayback",
      timestamp: "20260801120000",
      original: "https://janeforcongress.com/issues",
    });
  });

  it("parses a Library of Congress replay URL", () => {
    expect(
      parseReplayUrl(
        "https://webarchive.loc.gov/all/20221101120000/https://janeforcongress.com/issues",
      ),
    ).toEqual({
      archive: "loc",
      timestamp: "20221101120000",
      original: "https://janeforcongress.com/issues",
    });
  });

  it("tolerates replay-flag suffixes like id_ and if_ on both archives", () => {
    expect(
      parseReplayUrl(
        "https://web.archive.org/web/20260801120000id_/https://janeforcongress.com",
      ),
    ).toEqual({
      archive: "wayback",
      timestamp: "20260801120000",
      original: "https://janeforcongress.com",
    });
    expect(
      parseReplayUrl(
        "https://webarchive.loc.gov/all/20221101120000if_/https://janeforcongress.com",
      ),
    ).toEqual({
      archive: "loc",
      timestamp: "20221101120000",
      original: "https://janeforcongress.com",
    });
  });

  it("parses path-relative rewritten hrefs from replayed HTML", () => {
    expect(
      parseReplayUrl(
        "/all/20221101120000/https://janeforcongress.com/platform",
      ),
    ).toEqual({
      archive: "loc",
      timestamp: "20221101120000",
      original: "https://janeforcongress.com/platform",
    });
  });

  it("parses a self-hosted snapshot URL", () => {
    expect(
      parseReplayUrl(
        "snapshot://20260817001530/https://janeforcongress.com/issues",
      ),
    ).toEqual({
      archive: "snapshot",
      timestamp: "20260817001530",
      original: "https://janeforcongress.com/issues",
    });
  });

  it("returns null for live-site URLs", () => {
    expect(parseReplayUrl("https://janeforcongress.com/issues")).toBeNull();
  });
});

describe("replayUrl", () => {
  it("builds the canonical replay URL per archive", () => {
    expect(
      replayUrl("wayback", "20260801120000", "https://janeforcongress.com"),
    ).toBe(
      "https://web.archive.org/web/20260801120000/https://janeforcongress.com",
    );
    expect(
      replayUrl("loc", "20221101120000", "https://janeforcongress.com"),
    ).toBe(
      "https://webarchive.loc.gov/all/20221101120000/https://janeforcongress.com",
    );
  });

  it("round-trips through parseReplayUrl", () => {
    const url = replayUrl("loc", "20221108060000", "https://example.com/a");
    expect(parseReplayUrl(url)).toEqual({
      archive: "loc",
      timestamp: "20221108060000",
      original: "https://example.com/a",
    });
  });

  it("builds and round-trips snapshot URLs", () => {
    const url = replayUrl(
      "snapshot",
      "20260817001530",
      "https://example.com/a",
    );
    expect(url).toBe("snapshot://20260817001530/https://example.com/a");
    expect(parseReplayUrl(url)).toEqual({
      archive: "snapshot",
      timestamp: "20260817001530",
      original: "https://example.com/a",
    });
  });
});

describe("locTimeMapUrl", () => {
  it("prefixes the original URL raw (Memento convention, no encoding)", () => {
    expect(locTimeMapUrl("https://janeforcongress.com")).toBe(
      "https://webarchive.loc.gov/all/timemap/link/https://janeforcongress.com",
    );
  });
});

describe("parseMementoTimeMap", () => {
  const body = [
    '<https://janeforcongress.com>; rel="original",',
    '<https://webarchive.loc.gov/all/timemap/link/https://janeforcongress.com>; rel="self"; type="application/link-format",',
    '<https://webarchive.loc.gov/all/https://janeforcongress.com>; rel="timegate",',
    '<https://webarchive.loc.gov/all/20220301090000/https://janeforcongress.com/>; rel="first memento"; datetime="Tue, 01 Mar 2022 09:00:00 GMT",',
    '<https://webarchive.loc.gov/all/20221101120000/https://janeforcongress.com/>; rel="memento"; datetime="Tue, 01 Nov 2022 12:00:00 GMT",',
    '<https://webarchive.loc.gov/all/20230115000000/https://janeforcongress.com/>; rel="last memento"; datetime="Sun, 15 Jan 2023 00:00:00 GMT"',
  ].join("\n");

  it("keeps only memento entries and parses their capture identity", () => {
    const captures = parseMementoTimeMap(body);
    expect(captures.map((c) => c.timestamp)).toEqual([
      "20220301090000",
      "20221101120000",
      "20230115000000",
    ]);
    expect(captures.every((c) => c.archive === "loc")).toBe(true);
    expect(captures[0].original).toBe("https://janeforcongress.com/");
  });

  it("returns [] for an empty body (the no-captures 404 path)", () => {
    expect(parseMementoTimeMap("")).toEqual([]);
  });

  it("does not treat original/self/timegate rels as captures", () => {
    const header = body.split("\n").slice(0, 3).join("\n");
    expect(parseMementoTimeMap(header)).toEqual([]);
  });
});

describe("timestampToIsoDate", () => {
  it("converts a 14-digit replay timestamp to an ISO date", () => {
    expect(timestampToIsoDate("20221108235959")).toBe("2022-11-08");
  });

  it("returns null for malformed timestamps", () => {
    expect(timestampToIsoDate("2022")).toBeNull();
    expect(timestampToIsoDate("not-a-timestamp")).toBeNull();
  });
});
