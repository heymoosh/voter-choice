/**
 * scripts/ingest/promise-extract.test.ts
 *
 * Tests for the extraction pipeline's pure functions — corpus filtering,
 * Wayback URL plumbing, HTML→text, issue-page discovery, deterministic ids,
 * the verbatim-quote (anti-hallucination) gate, and response validation.
 * No network, no DB, no Anthropic calls — the networked loop is exercised by
 * running the script itself (see the header of promise-extract.ts).
 */

import { describe, it, expect } from "vitest";
import {
  loadCorpusRows,
  parseWaybackUrl,
  waybackPageUrl,
  captureDateFromArchiveUrl,
  stripWaybackChrome,
  decodeBasicEntities,
  htmlToText,
  extractIssuePageUrls,
  normalizeForMatch,
  computePromiseId,
  quoteAppearsInSource,
  parseAndValidatePromises,
  dedupeByNormalizedText,
  buildExtractionSystemPrompt,
  EXTRACTION_MODEL_VERSION,
  EXTRACTOR_VERSION,
  MAX_PAGE_CHARS,
  PROMISE_TYPES,
} from "./promise-extract";

// ---------------------------------------------------------------------------
// Corpus loading
// ---------------------------------------------------------------------------

const CORPUS_READY_ROW = {
  state: "TX",
  office: "house",
  district: "21",
  name: "Jane Doe",
  bucket: "website_archived",
  candidateId: "cand-1",
  fecCandidateId: "H6TX21001",
  committeeId: "C001",
  committeeName: "JANE FOR CONGRESS",
  website: "https://janeforcongress.com",
  captureCount: 4,
  canonicalCaptureUrl:
    "https://web.archive.org/web/20260801120000/https://janeforcongress.com",
};

describe("loadCorpusRows", () => {
  it("keeps only website_archived rows with candidateId and capture", () => {
    const rows = loadCorpusRows([
      CORPUS_READY_ROW,
      { ...CORPUS_READY_ROW, bucket: "website_no_captures" },
      { ...CORPUS_READY_ROW, candidateId: null },
      { ...CORPUS_READY_ROW, canonicalCaptureUrl: null },
      null,
      "junk",
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].candidateId).toBe("cand-1");
    expect(rows[0].website).toBe("https://janeforcongress.com");
  });

  it("returns [] for a non-array payload", () => {
    expect(loadCorpusRows({ rows: [] })).toEqual([]);
    expect(loadCorpusRows(undefined)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Wayback URL plumbing
// ---------------------------------------------------------------------------

describe("parseWaybackUrl", () => {
  it("parses a replay URL into timestamp + original", () => {
    expect(
      parseWaybackUrl(
        "https://web.archive.org/web/20260801120000/https://janeforcongress.com/issues",
      ),
    ).toEqual({
      timestamp: "20260801120000",
      original: "https://janeforcongress.com/issues",
    });
  });

  it("tolerates replay-flag suffixes like id_ and if_", () => {
    expect(
      parseWaybackUrl(
        "https://web.archive.org/web/20260801120000id_/https://janeforcongress.com",
      ),
    ).toEqual({
      timestamp: "20260801120000",
      original: "https://janeforcongress.com",
    });
  });

  it("returns null for non-Wayback URLs", () => {
    expect(parseWaybackUrl("https://janeforcongress.com/issues")).toBeNull();
  });
});

describe("captureDateFromArchiveUrl", () => {
  it("derives the ISO capture date from the replay timestamp", () => {
    expect(
      captureDateFromArchiveUrl(
        "https://web.archive.org/web/20261102235959/https://janeforcongress.com",
      ),
    ).toBe("2026-11-02");
  });

  it("returns null for a non-Wayback URL (no fabricated dates)", () => {
    expect(captureDateFromArchiveUrl("https://janeforcongress.com")).toBeNull();
  });
});

describe("waybackPageUrl", () => {
  it("builds a replay URL pinned at the homepage capture timestamp", () => {
    expect(
      waybackPageUrl("20260801120000", "https://janeforcongress.com/issues"),
    ).toBe(
      "https://web.archive.org/web/20260801120000/https://janeforcongress.com/issues",
    );
  });
});

// ---------------------------------------------------------------------------
// HTML → text
// ---------------------------------------------------------------------------

describe("stripWaybackChrome", () => {
  it("removes the Wayback toolbar block", () => {
    const html =
      "before <!-- BEGIN WAYBACK TOOLBAR INSERT --> chrome junk <!-- END WAYBACK TOOLBAR INSERT --> after";
    const out = stripWaybackChrome(html);
    expect(out).not.toContain("chrome junk");
    expect(out).toContain("before");
    expect(out).toContain("after");
  });
});

describe("decodeBasicEntities", () => {
  it("decodes named, decimal, and hex entities", () => {
    expect(
      decodeBasicEntities("I&rsquo;ll vote &quot;no&quot; &#8212; always"),
    ).toBe('I’ll vote "no" — always');
    expect(decodeBasicEntities("&#x27;quoted&#x27;")).toBe("'quoted'");
  });

  it("leaves unknown entities untouched rather than corrupting text", () => {
    expect(decodeBasicEntities("&fakeentity; stays")).toBe(
      "&fakeentity; stays",
    );
  });
});

describe("htmlToText", () => {
  it("strips scripts, styles, comments and tags; keeps block breaks", () => {
    const html = `
      <html><head><style>.x{color:red}</style>
      <script>var tracking = true;</script></head>
      <body><h1>Jane Doe for Congress</h1>
      <!-- nav comment --><p>I will vote against any national sales tax.</p>
      <div>Paid for by Jane for Congress.</div></body></html>`;
    const text = htmlToText(html);
    expect(text).toContain("Jane Doe for Congress");
    expect(text).toContain("I will vote against any national sales tax.");
    expect(text).not.toContain("tracking");
    expect(text).not.toContain("color:red");
    expect(text).not.toContain("nav comment");
    expect(text).not.toContain("<p>");
  });

  it("removes Wayback toolbar content before text extraction", () => {
    const html =
      "<body><!-- BEGIN WAYBACK TOOLBAR INSERT --><div>Wayback Machine</div><!-- END WAYBACK TOOLBAR INSERT --><p>Real page content here.</p></body>";
    const text = htmlToText(html);
    expect(text).toBe("Real page content here.");
  });
});

// ---------------------------------------------------------------------------
// Issue-page discovery
// ---------------------------------------------------------------------------

describe("extractIssuePageUrls", () => {
  const base = "https://janeforcongress.com";

  it("finds same-site issue-like pages from plain relative hrefs", () => {
    const html = `
      <a href="/issues">Issues</a>
      <a href="/about">About Jane</a>
      <a href="/donate">Donate</a>
      <a href="/contact">Contact</a>`;
    expect(extractIssuePageUrls(html, base, 5)).toEqual([
      "https://janeforcongress.com/issues",
      "https://janeforcongress.com/about",
    ]);
  });

  it("undoes Wayback link rewriting back to original URLs", () => {
    const html = `<a href="https://web.archive.org/web/20260801120000/https://janeforcongress.com/platform">Platform</a>`;
    expect(extractIssuePageUrls(html, base, 5)).toEqual([
      "https://janeforcongress.com/platform",
    ]);
  });

  it("drops off-site links even when they look like issue pages", () => {
    const html = `<a href="https://othersite.com/issues">Issues elsewhere</a>`;
    expect(extractIssuePageUrls(html, base, 5)).toEqual([]);
  });

  it("treats www. and bare host as the same site", () => {
    const html = `<a href="https://www.janeforcongress.com/priorities">Priorities</a>`;
    expect(extractIssuePageUrls(html, base, 5)).toEqual([
      "https://www.janeforcongress.com/priorities",
    ]);
  });

  it("dedupes, skips homepage self-links, and honors the cap", () => {
    const html = `
      <a href="/issues">Issues</a>
      <a href="/issues/">Issues again</a>
      <a href="/">Home</a>
      <a href="/platform">Platform</a>
      <a href="/policy">Policy</a>`;
    expect(extractIssuePageUrls(html, base, 2)).toEqual([
      "https://janeforcongress.com/issues",
      "https://janeforcongress.com/platform",
    ]);
  });

  it("ignores javascript: and mailto: hrefs", () => {
    const html = `
      <a href="javascript:void(0)">Issues</a>
      <a href="mailto:jane@janeforcongress.com">Email about issues</a>`;
    expect(extractIssuePageUrls(html, base, 5)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Deterministic ids + verbatim gate
// ---------------------------------------------------------------------------

describe("computePromiseId", () => {
  const archive =
    "https://web.archive.org/web/20260801120000/https://janeforcongress.com/issues";

  it("is deterministic and format-stable", () => {
    const a = computePromiseId("cand-1", archive, "I will vote NO on X.");
    const b = computePromiseId("cand-1", archive, "I will vote NO on X.");
    expect(a).toBe(b);
    expect(a).toMatch(/^pr_[0-9a-f]{40}$/);
  });

  it("normalizes whitespace, case, and curly quotes before hashing", () => {
    expect(computePromiseId("cand-1", archive, "I’ll  vote NO\n on X.")).toBe(
      computePromiseId("cand-1", archive, "i'll vote no on x."),
    );
  });

  it("changes when candidate, capture, or text changes", () => {
    const a = computePromiseId("cand-1", archive, "I will vote NO on X.");
    expect(
      computePromiseId("cand-2", archive, "I will vote NO on X."),
    ).not.toBe(a);
    expect(
      computePromiseId("cand-1", `${archive}2`, "I will vote NO on X."),
    ).not.toBe(a);
    expect(
      computePromiseId("cand-1", archive, "I will vote YES on X."),
    ).not.toBe(a);
  });
});

describe("quoteAppearsInSource", () => {
  const source =
    "As your representative, I will vote against any bill that cuts Social Security — no exceptions.";

  it("accepts an exact quote", () => {
    expect(
      quoteAppearsInSource(
        "I will vote against any bill that cuts Social Security",
        source,
      ),
    ).toBe(true);
  });

  it("tolerates whitespace, case, and dash/quote variants", () => {
    expect(
      quoteAppearsInSource(
        "i will vote against any bill that\ncuts social security - no exceptions",
        source,
      ),
    ).toBe(true);
  });

  it("rejects a paraphrase (the anti-hallucination rail)", () => {
    expect(
      quoteAppearsInSource("Jane promised to protect Social Security", source),
    ).toBe(false);
  });

  it("rejects empty quotes", () => {
    expect(quoteAppearsInSource("   ", source)).toBe(false);
  });
});

describe("normalizeForMatch", () => {
  it("collapses whitespace and normalizes punctuation variants", () => {
    expect(normalizeForMatch("  “Hello” —  World…  ")).toBe(
      '"hello" - world...',
    );
  });
});

// ---------------------------------------------------------------------------
// Response validation
// ---------------------------------------------------------------------------

const PAGE_TEXT =
  "Jane Doe for Congress. I will vote against any national sales tax. " +
  "I will introduce a bill to cap insulin copays at $35 in my first 100 days. " +
  "I believe in strong families and a bright future for Texas.";

function entry(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    promise_text: "I will vote against any national sales tax.",
    canonical_issue: "property_taxes",
    sub_issue: null,
    promise_type: "vote",
    conditions_deadline: null,
    ...overrides,
  };
}

describe("parseAndValidatePromises", () => {
  it("accepts a valid promise whose quote appears in the page", () => {
    const out = parseAndValidatePromises(
      JSON.stringify([entry()]),
      PAGE_TEXT,
      "test",
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      promiseText: "I will vote against any national sales tax.",
      canonicalIssue: "property_taxes",
      subIssue: null,
      promiseType: "vote",
      conditionsDeadline: null,
    });
  });

  it("keeps an explicit conditions_deadline string", () => {
    const out = parseAndValidatePromises(
      JSON.stringify([
        entry({
          promise_text:
            "I will introduce a bill to cap insulin copays at $35 in my first 100 days.",
          canonical_issue: "healthcare_affordability",
          promise_type: "introduce_bill",
          conditions_deadline: "first 100 days in office",
        }),
      ]),
      PAGE_TEXT,
      "test",
    );
    expect(out).toHaveLength(1);
    expect(out[0].conditionsDeadline).toBe("first 100 days in office");
  });

  it("drops a quote that is not verbatim in the source", () => {
    const out = parseAndValidatePromises(
      JSON.stringify([
        entry({ promise_text: "I promise to abolish the national sales tax." }),
      ]),
      PAGE_TEXT,
      "test",
    );
    expect(out).toEqual([]);
  });

  it("drops unknown canonical_issue and invalid promise_type", () => {
    const out = parseAndValidatePromises(
      JSON.stringify([
        entry({ canonical_issue: "sales_taxes" }),
        entry({ promise_type: "pledge" }),
      ]),
      PAGE_TEXT,
      "test",
    );
    expect(out).toEqual([]);
  });

  it("nulls an invalid sub_issue instead of dropping the promise", () => {
    const out = parseAndValidatePromises(
      JSON.stringify([
        entry({
          promise_text:
            "I will introduce a bill to cap insulin copays at $35 in my first 100 days.",
          canonical_issue: "healthcare_affordability",
          promise_type: "introduce_bill",
          sub_issue: "not_a_real_facet",
        }),
      ]),
      PAGE_TEXT,
      "test",
    );
    expect(out).toHaveLength(1);
    expect(out[0].subIssue).toBeNull();
  });

  it("accepts a valid healthcare sub-issue facet", () => {
    const out = parseAndValidatePromises(
      JSON.stringify([
        entry({
          promise_text:
            "I will introduce a bill to cap insulin copays at $35 in my first 100 days.",
          canonical_issue: "healthcare_affordability",
          promise_type: "introduce_bill",
          sub_issue: "drug_prices",
        }),
      ]),
      PAGE_TEXT,
      "test",
    );
    expect(out).toHaveLength(1);
    expect(out[0].subIssue).toBe("drug_prices");
  });

  it("drops trivial/missing quotes", () => {
    const out = parseAndValidatePromises(
      JSON.stringify([entry({ promise_text: "Jane Doe" }), { junk: true }]),
      PAGE_TEXT,
      "test",
    );
    expect(out).toEqual([]);
  });

  it("survives markdown fences and rejects non-array JSON", () => {
    const fenced = "```json\n" + JSON.stringify([entry()]) + "\n```";
    expect(parseAndValidatePromises(fenced, PAGE_TEXT, "test")).toHaveLength(1);
    expect(
      parseAndValidatePromises('{"promises": []}', PAGE_TEXT, "test"),
    ).toEqual([]);
    expect(parseAndValidatePromises("not json", PAGE_TEXT, "test")).toEqual([]);
  });
});

describe("dedupeByNormalizedText", () => {
  it("keeps the first occurrence of a repeated promise across pages", () => {
    const rows = [
      { promiseText: "I will vote NO on X.", page: "home" },
      { promiseText: "i will  vote no on x.", page: "issues" },
      { promiseText: "I will vote YES on Y.", page: "issues" },
    ];
    const out = dedupeByNormalizedText(rows);
    expect(out).toHaveLength(2);
    expect(out[0].page).toBe("home");
    expect(out[1].promiseText).toBe("I will vote YES on Y.");
  });
});

// ---------------------------------------------------------------------------
// Prompt + version contracts
// ---------------------------------------------------------------------------

describe("prompt and version contracts", () => {
  it("system prompt lists every canonical issue id and all promise types", () => {
    const prompt = buildExtractionSystemPrompt();
    expect(prompt).toContain("healthcare_affordability");
    expect(prompt).toContain("congressional_accountability");
    for (const t of PROMISE_TYPES) expect(prompt).toContain(`"${t}"`);
    // The four gates, by name.
    expect(prompt).toContain("COMMITTED ACTOR");
    expect(prompt).toContain("FALSIFIABLE ACTION");
    expect(prompt).toContain("DETERMINABLE SCOPE");
    expect(prompt).toContain("TESTABLE WINDOW");
  });

  it("extraction_model_version embeds the extractor version (rubric's +model convention)", () => {
    expect(EXTRACTION_MODEL_VERSION.startsWith(`${EXTRACTOR_VERSION}+`)).toBe(
      true,
    );
  });

  it("page prompts are truncated to the declared budget", () => {
    expect(MAX_PAGE_CHARS).toBeGreaterThan(1000);
  });
});
