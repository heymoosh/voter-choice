/**
 * Unit tests for the CRS summary client (crs-summaries.ts).
 *
 * All HTTP calls are mocked — no live network calls, no DB connections.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchCrsSummary,
  fetchCrsSummaryGovInfoFallback,
  parseCrsSummaryResponse,
  resolveCrsSummaryAsBackup,
  selectBestSummary,
  stripHtmlTags,
} from "./crs-summaries";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal mock fetch that returns a JSON body with the given status. */
function mockFetch(status: number, body: unknown): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

/** Build a mock fetch that rejects with a network error. */
function mockNetworkError(message: string): ReturnType<typeof vi.fn> {
  return vi.fn().mockRejectedValue(new Error(message));
}

/** Build a minimal mock fetch that returns a text body with the given status. */
function mockFetchText(status: number, body: string): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  });
}

const baseConfig = {
  congressGovBaseUrl: "https://api.congress.gov/v3",
  congressGovApiKey: "test-api-key",
};

const exampleBill = {
  congress: 119,
  type: "hr",
  number: "1234",
};

// CRS API response fixture with two summaries (latest has higher updateDate).
const twoSummariesResponse = {
  summaries: [
    {
      actionDate: "2025-01-15",
      actionDesc: "Introduced in House",
      text: "<p>This bill does <b>something important</b> for the country.</p><p>It also does &amp; other things.</p>",
      updateDate: "2025-01-16T00:00:00Z",
    },
    {
      actionDate: "2025-03-20",
      actionDesc: "Passed House",
      text: "<p>As passed by the House, this bill <i>now includes</i> an amendment.</p>",
      updateDate: "2025-03-21T00:00:00Z",
    },
  ],
};

// Empty summaries response (normal for 119th Congress introduced-only bills).
const emptySummariesResponse = {
  summaries: [],
};

// ---------------------------------------------------------------------------
// stripHtmlTags
// ---------------------------------------------------------------------------

describe("stripHtmlTags", () => {
  it("strips simple inline tags", () => {
    expect(stripHtmlTags("<b>bold</b> and <i>italic</i>")).toBe(
      "bold and italic",
    );
  });

  it("converts block-level tags to newlines", () => {
    const result = stripHtmlTags("<p>First paragraph.</p><p>Second.</p>");
    expect(result).toContain("First paragraph.");
    expect(result).toContain("Second.");
    // Should be separated by a newline, not run together
    expect(result).not.toBe("First paragraph.Second.");
  });

  it("decodes common HTML entities", () => {
    expect(stripHtmlTags("Tom &amp; Jerry")).toBe("Tom & Jerry");
    expect(stripHtmlTags("&lt;tag&gt;")).toBe("<tag>");
    expect(stripHtmlTags("&quot;quoted&quot;")).toBe('"quoted"');
    // &nbsp; decodes to a regular space; leading whitespace is trimmed by stripHtmlTags.
    expect(stripHtmlTags("word&nbsp;space")).toBe("word space");
    expect(stripHtmlTags("&#39;apostrophe")).toBe("'apostrophe");
  });

  it("handles numeric character references", () => {
    // &#65; = 'A'
    expect(stripHtmlTags("&#65;")).toBe("A");
  });

  it("collapses excess whitespace", () => {
    const result = stripHtmlTags("  lots   of   spaces  ");
    expect(result).toBe("lots of spaces");
  });

  it("handles the actual CRS text fixture", () => {
    const html =
      "<p>This bill does <b>something important</b> for the country.</p><p>It also does &amp; other things.</p>";
    const result = stripHtmlTags(html);
    expect(result).toContain(
      "This bill does something important for the country.",
    );
    expect(result).toContain("It also does & other things.");
    expect(result).not.toContain("<");
    expect(result).not.toContain("&amp;");
  });
});

// ---------------------------------------------------------------------------
// selectBestSummary
// ---------------------------------------------------------------------------

describe("selectBestSummary", () => {
  it("returns null for an empty array", () => {
    expect(selectBestSummary([])).toBeNull();
  });

  it("returns the single element when only one exists", () => {
    const summary = {
      actionDesc: "Introduced in House",
      updateDate: "2025-01-01",
    };
    expect(selectBestSummary([summary])).toEqual(summary);
  });

  it("picks the most recently updated summary (highest updateDate)", () => {
    const older = {
      actionDesc: "Introduced in House",
      updateDate: "2025-01-16T00:00:00Z",
    };
    const newer = {
      actionDesc: "Passed House",
      updateDate: "2025-03-21T00:00:00Z",
    };
    const result = selectBestSummary([older, newer]);
    expect(result).toEqual(newer);
  });

  it("handles missing updateDate by sorting those entries last", () => {
    const withDate = {
      actionDesc: "Introduced in House",
      updateDate: "2025-01-16T00:00:00Z",
    };
    const withoutDate = { actionDesc: "No date" };
    const result = selectBestSummary([withoutDate, withDate]);
    // withDate should win since empty string sorts before any date string
    expect(result).toEqual(withDate);
  });

  it("ignores non-object entries in the array", () => {
    const valid = {
      actionDesc: "Introduced in House",
      updateDate: "2025-01-01",
    };
    expect(selectBestSummary([null, undefined, "string", valid])).toEqual(
      valid,
    );
  });
});

// ---------------------------------------------------------------------------
// parseCrsSummaryResponse
// ---------------------------------------------------------------------------

describe("parseCrsSummaryResponse", () => {
  it("returns a CrsSummary for a normal response", () => {
    const result = parseCrsSummaryResponse(twoSummariesResponse);
    expect(result).not.toBeNull();
    // Should pick the newer summary (Passed House, updateDate 2025-03-21)
    expect(result?.sourceVersion).toBe("Passed House");
    expect(result?.text).toContain("amendment");
    expect(result?.text).not.toContain("<");
    expect(result?.retrievedAt).toBeTruthy();
  });

  it("returns null for an empty summaries array (not an error)", () => {
    expect(parseCrsSummaryResponse(emptySummariesResponse)).toBeNull();
  });

  it("returns null for a null / unexpected response shape", () => {
    expect(parseCrsSummaryResponse(null)).toBeNull();
    expect(parseCrsSummaryResponse(undefined)).toBeNull();
    expect(parseCrsSummaryResponse({})).toBeNull();
    expect(parseCrsSummaryResponse({ summaries: null })).toBeNull();
  });

  it("returns null when the best summary has no text field", () => {
    expect(
      parseCrsSummaryResponse({
        summaries: [{ actionDesc: "Introduced in House" }],
      }),
    ).toBeNull();
  });

  it("strips HTML from the text field", () => {
    const result = parseCrsSummaryResponse({
      summaries: [
        {
          text: "<p>This is <b>important</b> &amp; relevant.</p>",
          actionDesc: "Introduced in House",
          updateDate: "2025-01-01",
        },
      ],
    });
    expect(result?.text).toBe("This is important & relevant.");
  });
});

// ---------------------------------------------------------------------------
// fetchCrsSummary — mocked HTTP
// ---------------------------------------------------------------------------

describe("fetchCrsSummary", () => {
  // Each test gets a fresh module-level summaryCache by reimporting.
  // Since vitest doesn't reset module state between tests without vi.resetModules(),
  // we use unique bill identifiers per test to avoid cache collisions.

  it("(a) returns a CrsSummary for a normal 200 response", async () => {
    const fetcher = mockFetch(200, twoSummariesResponse);
    const result = await fetchCrsSummary(
      { congress: 119, type: "hr", number: "10001" },
      baseConfig,
      fetcher as unknown as typeof fetch,
    );
    expect(result).not.toBeNull();
    expect(result?.sourceVersion).toBe("Passed House");
    expect(result?.text).not.toContain("<");
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("(b) returns null for empty summaries array — not an error", async () => {
    const fetcher = mockFetch(200, emptySummariesResponse);
    const result = await fetchCrsSummary(
      { congress: 119, type: "hr", number: "10002" },
      baseConfig,
      fetcher as unknown as typeof fetch,
    );
    expect(result).toBeNull();
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("(c) HTML in summary text is sanitized to plain text", async () => {
    const fetcher = mockFetch(200, {
      summaries: [
        {
          text: "<p>The <b>Energy Independence Act</b> &amp; related bills.</p>",
          actionDesc: "Introduced in House",
          updateDate: "2025-02-01",
        },
      ],
    });
    const result = await fetchCrsSummary(
      { congress: 119, type: "hr", number: "10003" },
      baseConfig,
      fetcher as unknown as typeof fetch,
    );
    expect(result?.text).toBe("The Energy Independence Act & related bills.");
  });

  it("(d) outage/5xx → fail soft, returns null", async () => {
    // Use a non-retryable 500 so we don't wait on backoff in tests.
    const fetcher = mockFetch(500, { message: "Internal Server Error" });
    const result = await fetchCrsSummary(
      { congress: 119, type: "hr", number: "10004" },
      baseConfig,
      fetcher as unknown as typeof fetch,
    );
    expect(result).toBeNull();
  });

  it("(d) network error → fail soft, returns null", async () => {
    // Non-retryable network error label so we don't trigger backoff retries.
    const fetcher = mockNetworkError("DNS resolution failed");
    const result = await fetchCrsSummary(
      { congress: 119, type: "hr", number: "10005" },
      baseConfig,
      fetcher as unknown as typeof fetch,
    );
    expect(result).toBeNull();
  });

  it("caches the result — second call does not hit the network", async () => {
    const fetcher = mockFetch(200, twoSummariesResponse);
    const bill = { congress: 119, type: "hr", number: "10006" };

    const first = await fetchCrsSummary(
      bill,
      baseConfig,
      fetcher as unknown as typeof fetch,
    );
    const second = await fetchCrsSummary(
      bill,
      baseConfig,
      fetcher as unknown as typeof fetch,
    );

    expect(first).toEqual(second);
    // Should only have been called once thanks to the cache.
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("includes api_key in request URL when key is set", async () => {
    const fetcher = mockFetch(200, twoSummariesResponse);
    await fetchCrsSummary(
      { congress: 119, type: "hr", number: "10007" },
      baseConfig,
      fetcher as unknown as typeof fetch,
    );
    const calledUrl = (fetcher as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(calledUrl).toContain("api_key=test-api-key");
    expect(calledUrl).toContain("format=json");
  });

  it("omits api_key from URL when key is not set", async () => {
    const fetcher = mockFetch(200, emptySummariesResponse);
    await fetchCrsSummary(
      { congress: 119, type: "hr", number: "10008" },
      { congressGovBaseUrl: "https://api.congress.gov/v3" }, // no apiKey
      fetcher as unknown as typeof fetch,
    );
    const calledUrl = (fetcher as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(calledUrl).not.toContain("api_key=");
  });
});

// ---------------------------------------------------------------------------
// resolveCrsSummaryAsBackup — integration helper
// ---------------------------------------------------------------------------

describe("resolveCrsSummaryAsBackup", () => {
  it("returns summary from primary when available", async () => {
    const fetcher = mockFetch(200, twoSummariesResponse);
    const result = await resolveCrsSummaryAsBackup(
      { congress: 119, type: "hr", number: "20001" },
      baseConfig,
      fetcher as unknown as typeof fetch,
    );
    expect(result).not.toBeNull();
    expect(result?.text).toBeTruthy();
  });

  it("returns null when both primary and govinfo fallback return nothing", async () => {
    const fetcher = mockFetch(200, emptySummariesResponse);
    const result = await resolveCrsSummaryAsBackup(
      { congress: 119, type: "hr", number: "20002" },
      baseConfig,
      fetcher as unknown as typeof fetch,
    );
    // Primary returns null (empty array); GovInfo fallback also returns null (no XML fetched).
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fetchCrsSummaryGovInfoFallback — mocked HTTP
// ---------------------------------------------------------------------------

// BILLSTATUS XML fixtures.

/**
 * v3 schema (current GovInfo format): <summary> elements with text inside
 * <cdata><text> as HTML-entity-encoded content.
 * Two items: the newer one ("Passed House") should be selected.
 */
const billStatusXmlV3TwoItems = `<?xml version="1.0" encoding="utf-8" standalone="no"?>
<billStatus>
  <bill>
    <summaries>
      <summary>
        <actionDate>2025-01-15</actionDate>
        <actionDesc>Introduced in House</actionDesc>
        <updateDate>2025-01-16T00:00:00Z</updateDate>
        <cdata>
          <text>&lt;p&gt;This bill does &lt;b&gt;something important&lt;/b&gt; for the country.&lt;/p&gt;</text>
        </cdata>
      </summary>
      <summary>
        <actionDate>2025-03-20</actionDate>
        <actionDesc>Passed House</actionDesc>
        <updateDate>2025-03-21T00:00:00Z</updateDate>
        <cdata>
          <text>&lt;p&gt;As passed by the House, this bill now includes an amendment.&lt;/p&gt;</text>
        </cdata>
      </summary>
    </summaries>
  </bill>
</billStatus>`;

/**
 * Legacy schema: <billSummaries><item> elements with text in <text> CDATA.
 * Two items: the newer one ("Passed House") should be selected.
 */
const billStatusXmlLegacyTwoItems = `<?xml version="1.0" encoding="UTF-8"?>
<billStatus>
  <bill>
    <summaries>
      <billSummaries>
        <item>
          <actionDate>2025-01-15</actionDate>
          <actionDesc>Introduced in House</actionDesc>
          <text><![CDATA[<p>This bill does <b>something important</b> for the country.</p>]]></text>
          <updateDate>2025-01-16T00:00:00Z</updateDate>
        </item>
        <item>
          <actionDate>2025-03-20</actionDate>
          <actionDesc>Passed House</actionDesc>
          <text><![CDATA[<p>As passed by the House, this bill now includes an amendment.</p>]]></text>
          <updateDate>2025-03-21T00:00:00Z</updateDate>
        </item>
      </billSummaries>
    </summaries>
  </bill>
</billStatus>`;

// Use the v3 schema fixture as the primary "two items" fixture.
const billStatusXmlTwoItems = billStatusXmlV3TwoItems;

/** BILLSTATUS XML where <summaries> is present but contains no <summary>/<item> children. */
const billStatusXmlNoItems = `<?xml version="1.0" encoding="UTF-8"?>
<billStatus>
  <bill>
    <summaries>
      <billSummaries/>
    </summaries>
  </bill>
</billStatus>`;

/** Malformed/truncated XML — no closing tags. */
const billStatusXmlMalformed = `<?xml version="1.0" encoding="UTF-8"?>
<billStatus><bill><summaries><billSummaries><item><text>Truncated with no`;

describe("fetchCrsSummaryGovInfoFallback", () => {
  it("(a) success — valid BILLSTATUS XML returns the best CrsSummary", async () => {
    const fetcher = mockFetchText(200, billStatusXmlTwoItems);
    const result = await fetchCrsSummaryGovInfoFallback(
      { congress: 118, type: "hr", number: "30001" },
      fetcher as unknown as typeof fetch,
    );

    expect(result).not.toBeNull();
    // Should pick the later item (Passed House, updateDate 2025-03-21).
    expect(result?.sourceVersion).toBe("Passed House");
    expect(result?.text).toContain("amendment");
    // HTML should be stripped.
    expect(result?.text).not.toContain("<");
    expect(result?.retrievedAt).toBeTruthy();
    // Fetcher should have been called exactly once.
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("(b) not found — 404 response → null, no throw", async () => {
    const fetcher = mockFetchText(404, "Not Found");
    const result = await fetchCrsSummaryGovInfoFallback(
      { congress: 118, type: "hr", number: "30002" },
      fetcher as unknown as typeof fetch,
    );
    expect(result).toBeNull();
  });

  it("(b) non-200 — 500 response → null, no throw", async () => {
    const fetcher = mockFetchText(500, "Internal Server Error");
    const result = await fetchCrsSummaryGovInfoFallback(
      { congress: 118, type: "hr", number: "30003" },
      fetcher as unknown as typeof fetch,
    );
    expect(result).toBeNull();
  });

  it("(c) malformed XML — truncated XML → null, no throw", async () => {
    const fetcher = mockFetchText(200, billStatusXmlMalformed);
    const result = await fetchCrsSummaryGovInfoFallback(
      { congress: 118, type: "hr", number: "30004" },
      fetcher as unknown as typeof fetch,
    );
    expect(result).toBeNull();
  });

  it("empty <summaries> block → null", async () => {
    const fetcher = mockFetchText(200, billStatusXmlNoItems);
    const result = await fetchCrsSummaryGovInfoFallback(
      { congress: 118, type: "hr", number: "30005" },
      fetcher as unknown as typeof fetch,
    );
    expect(result).toBeNull();
  });

  it("network error → null, no throw (fail-soft)", async () => {
    const fetcher = mockNetworkError("DNS resolution failed");
    const result = await fetchCrsSummaryGovInfoFallback(
      { congress: 118, type: "hr", number: "30006" },
      fetcher as unknown as typeof fetch,
    );
    expect(result).toBeNull();
  });

  it("caches the result — second call does not hit the network", async () => {
    const fetcher = mockFetchText(200, billStatusXmlTwoItems);
    const bill = { congress: 118, type: "hr", number: "30007" };

    const first = await fetchCrsSummaryGovInfoFallback(
      bill,
      fetcher as unknown as typeof fetch,
    );
    const second = await fetchCrsSummaryGovInfoFallback(
      bill,
      fetcher as unknown as typeof fetch,
    );

    expect(first).toEqual(second);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("(a-legacy) legacy <billSummaries><item> schema also parsed correctly", async () => {
    const fetcher = mockFetchText(200, billStatusXmlLegacyTwoItems);
    const result = await fetchCrsSummaryGovInfoFallback(
      { congress: 118, type: "hr", number: "30009" },
      fetcher as unknown as typeof fetch,
    );
    expect(result).not.toBeNull();
    expect(result?.sourceVersion).toBe("Passed House");
    expect(result?.text).toContain("amendment");
    expect(result?.text).not.toContain("<");
  });

  it("fetches from the correct GovInfo BILLSTATUS URL", async () => {
    const fetcher = mockFetchText(200, billStatusXmlTwoItems);
    await fetchCrsSummaryGovInfoFallback(
      { congress: 118, type: "hr", number: "30008" },
      fetcher as unknown as typeof fetch,
    );
    const calledUrl = (fetcher as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(calledUrl).toBe(
      "https://www.govinfo.gov/bulkdata/BILLSTATUS/118/hr/BILLSTATUS-118hr30008.xml",
    );
  });
});
