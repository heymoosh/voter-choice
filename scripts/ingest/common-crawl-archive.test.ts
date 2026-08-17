import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  commonCrawlIndexQueryUrl,
  extractHttpResponseFromWarcRecord,
  gunzipSoft,
  indexesInWindow,
  parseCcIndexNdjson,
  parseCollinfo,
  toCdxCapture,
  warcByteRangeHeader,
  type CommonCrawlIndex,
} from "./common-crawl-archive";

describe("parseCollinfo", () => {
  const validEntry = {
    id: "CC-MAIN-2022-33",
    name: "August 2022 Index",
    timegate: "https://index.commoncrawl.org/CC-MAIN-2022-33/",
    "cdx-api": "https://index.commoncrawl.org/CC-MAIN-2022-33-index",
    from: "2022-08-06T00:00:00",
    to: "2022-08-19T23:59:59",
  };

  it("parses valid entries", () => {
    expect(parseCollinfo([validEntry])).toEqual([
      {
        id: "CC-MAIN-2022-33",
        cdxApi: "https://index.commoncrawl.org/CC-MAIN-2022-33-index",
        from: "2022-08-06T00:00:00",
        to: "2022-08-19T23:59:59",
      },
    ]);
  });

  it("drops entries missing id, cdx-api, from, or to", () => {
    expect(
      parseCollinfo([
        { ...validEntry, id: undefined },
        { ...validEntry, "cdx-api": undefined },
        { ...validEntry, from: undefined },
        { ...validEntry, to: undefined },
      ]),
    ).toEqual([]);
  });

  it("returns [] for a non-array payload", () => {
    expect(parseCollinfo(null)).toEqual([]);
    expect(parseCollinfo({ id: "x" })).toEqual([]);
  });
});

describe("indexesInWindow", () => {
  const idx = (id: string, from: string, to: string): CommonCrawlIndex => ({
    id,
    cdxApi: `https://index.commoncrawl.org/${id}-index`,
    from,
    to,
  });

  const all = [
    idx("CC-MAIN-2021-04", "2021-01-13", "2021-01-26"),
    idx("CC-MAIN-2022-33", "2022-08-06", "2022-08-19"),
    idx("CC-MAIN-2022-49", "2022-11-27", "2022-12-10"),
    idx("CC-MAIN-2023-06", "2023-01-31", "2023-02-13"),
  ];

  it("keeps only indexes overlapping the window, most-recent-first", () => {
    const result = indexesInWindow(all, "2021-01-01", "2022-11-08");
    expect(result.map((i) => i.id)).toEqual([
      "CC-MAIN-2022-33",
      "CC-MAIN-2021-04",
    ]);
  });

  it("excludes an index entirely after the window (2023 crawl for a 2022 cutoff)", () => {
    const result = indexesInWindow(all, "2022-01-01", "2022-11-08");
    expect(result.map((i) => i.id)).not.toContain("CC-MAIN-2023-06");
  });
});

describe("commonCrawlIndexQueryUrl", () => {
  it("uses matchType=domain so bare and www both match one query", () => {
    const url = commonCrawlIndexQueryUrl(
      "https://index.commoncrawl.org/CC-MAIN-2022-33-index",
      "janeforcongress.com",
    );
    expect(url).toContain("matchType=domain");
    expect(url).toContain("url=janeforcongress.com");
    expect(url).toContain("filter=status:200");
    expect(url).toContain("filter=mime:text/html");
  });
});

describe("parseCcIndexNdjson", () => {
  const validLine = JSON.stringify({
    url: "https://janeforcongress.com/issues",
    timestamp: "20220814083733",
    status: "200",
    mime: "text/html",
    filename: "crawl-data/CC-MAIN-2022-33/segments/x/warc/y.warc.gz",
    offset: "123456",
    length: "7890",
  });

  it("parses a well-formed NDJSON line", () => {
    const out = parseCcIndexNdjson(validLine);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      original: "https://janeforcongress.com/issues",
      timestamp: "20220814083733",
      status: 200,
      mime: "text/html",
      filename: "crawl-data/CC-MAIN-2022-33/segments/x/warc/y.warc.gz",
      offset: 123456,
      length: 7890,
    });
  });

  it("drops lines with a malformed timestamp, missing url, or missing filename", () => {
    const badTimestamp = JSON.stringify({
      url: "https://x.com",
      timestamp: "not-a-timestamp",
      status: "200",
      filename: "f",
      offset: "1",
      length: "1",
    });
    const missingUrl = JSON.stringify({
      timestamp: "20220814083733",
      status: "200",
      filename: "f",
      offset: "1",
      length: "1",
    });
    const missingFilename = JSON.stringify({
      url: "https://x.com",
      timestamp: "20220814083733",
      status: "200",
      offset: "1",
      length: "1",
    });
    expect(
      parseCcIndexNdjson(
        [badTimestamp, missingUrl, missingFilename].join("\n"),
      ),
    ).toEqual([]);
  });

  it("drops malformed JSON lines and blank lines without throwing", () => {
    expect(
      parseCcIndexNdjson(["not json at all", "", validLine, "  "].join("\n")),
    ).toHaveLength(1);
  });

  it("returns [] for an empty body", () => {
    expect(parseCcIndexNdjson("")).toEqual([]);
  });
});

describe("toCdxCapture", () => {
  it("adapts a CommonCrawlRecord to the shared {timestamp, original} shape", () => {
    expect(
      toCdxCapture({
        original: "https://janeforcongress.com",
        timestamp: "20220814083733",
        status: 200,
        mime: "text/html",
        filename: "f",
        offset: 0,
        length: 1,
      }),
    ).toEqual({
      original: "https://janeforcongress.com",
      timestamp: "20220814083733",
    });
  });
});

describe("warcByteRangeHeader", () => {
  it("builds an inclusive byte range", () => {
    expect(warcByteRangeHeader(1000, 500)).toBe("bytes=1000-1499");
    expect(warcByteRangeHeader(0, 1)).toBe("bytes=0-0");
  });
});

// ---------------------------------------------------------------------------
// WARC record parsing — a hand-built record round-tripped through real gzip,
// since there's no network access here to pull a live one. This is the same
// WARC/1.0 + HTTP/1.1 shape data.commoncrawl.org serves.
// ---------------------------------------------------------------------------

function buildWarcRecord(
  httpStatusLine: string,
  httpHeaders: string,
  body: string,
): string {
  const warcHeader =
    "WARC/1.0\r\n" +
    "WARC-Type: response\r\n" +
    "WARC-Target-URI: https://janeforcongress.com/issues\r\n" +
    "WARC-Date: 2022-08-14T08:37:33Z\r\n" +
    `Content-Length: ${body.length}\r\n`;
  const httpBlock = `${httpStatusLine}\r\n${httpHeaders}\r\n\r\n${body}`;
  return `${warcHeader}\r\n${httpBlock}`;
}

describe("extractHttpResponseFromWarcRecord", () => {
  it("splits a well-formed WARC response record into status + body", () => {
    const raw = buildWarcRecord(
      "HTTP/1.1 200 OK",
      "Content-Type: text/html\r\nServer: nginx",
      "<html><body>I will vote NO on X.</body></html>",
    );
    const parsed = extractHttpResponseFromWarcRecord(raw);
    expect(parsed?.status).toBe(200);
    expect(parsed?.body).toBe("<html><body>I will vote NO on X.</body></html>");
  });

  it("returns null for a record with no header/body blank-line boundary", () => {
    expect(
      extractHttpResponseFromWarcRecord("not a warc record at all"),
    ).toBeNull();
  });

  it("returns null when the WARC header has no matching HTTP header block", () => {
    expect(
      extractHttpResponseFromWarcRecord(
        "WARC/1.0\r\nWARC-Type: response\r\n\r\n",
      ),
    ).toBeNull();
  });

  it("round-trips through real gzip compression like a live range-fetched record", () => {
    const raw = buildWarcRecord(
      "HTTP/1.1 200 OK",
      "Content-Type: text/html",
      "<p>I will introduce a bill to cap insulin copays.</p>",
    );
    const gzipped = gzipSync(Buffer.from(raw, "utf8"));
    const decompressed = gunzipSoft(gzipped);
    expect(decompressed).toBe(raw);
    const parsed = extractHttpResponseFromWarcRecord(decompressed!);
    expect(parsed?.status).toBe(200);
    expect(parsed?.body).toContain("cap insulin copays");
  });
});

describe("gunzipSoft", () => {
  it("returns null for corrupt/non-gzip input instead of throwing", () => {
    expect(gunzipSoft(Buffer.from("not gzip data"))).toBeNull();
  });
});
