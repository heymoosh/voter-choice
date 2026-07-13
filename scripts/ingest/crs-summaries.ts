/**
 * Congress.gov CRS bill-summary client.
 *
 * Fetches plain-language CRS (Congressional Research Service) summaries for
 * federal bills from the Congress.gov API.  These summaries are public-domain
 * and require NO attribution text in the UI.
 *
 * Endpoint:  GET /bill/{congress}/{billType}/{billNumber}/summaries
 * Auth:      api.data.gov key (?api_key=…), same key as the bill enrichment
 *            in federal-votes.ts (CONGRESS_GOV_API_KEY).  Rate limit: ~5,000
 *            req/hr on the free tier.
 *
 * Caveats handled here:
 *  - 119th Congress: CRS only writes summaries for the INTRODUCED version, so
 *    many bills return an empty summaries array.  That is NOT an error; we
 *    return null.
 *  - Summary `text` is HTML.  We strip tags before storing/returning.
 *  - The API has had multi-day outages with no SLA.  fetchCrsSummary() fails
 *    soft (returns null) on any network / 5xx error.  The in-run Map cache
 *    means repeated calls for the same bill inside one ingest run never hit
 *    the network twice, and already-fetched values survive a later per-bill
 *    failure.
 *
 * GovInfo BILLSUM fallback (when Congress.gov API is down for an extended
 * period) is stubbed in fetchCrsSummaryGovInfoFallback() below with a clear
 * TODO.  The primary path does not depend on it.
 *
 * Usage in federal-votes.ts ingest:
 *   const client = makeCrsClient(config, fetcher);
 *   // Inside enrichBills(), after Congress.gov enrichment returns no summary:
 *   if (!bill.summary) {
 *     bill.summary = (await client.fetchCrsSummary(billIdentity))?.text ?? undefined;
 *   }
 *
 * See also: scripts/ingest/federal-votes.ts → enrichBills() → the wiring
 * point is documented inline in that function.
 */

export type CrsSummary = {
  /** Plain-text summary (HTML tags stripped). */
  text: string;
  /**
   * The CRS version this summary corresponds to (e.g. "Introduced in House").
   * Taken from `actionDesc` in the API response.
   */
  sourceVersion: string | null;
  /** ISO-8601 timestamp of when this summary was retrieved. */
  retrievedAt: string;
};

/** Minimal bill identity needed to build the API URL. */
export type CrsBillIdentity = {
  congress: number;
  /** Bill type as returned by Congress.gov, lowercase (e.g. "hr", "s", "hjres"). */
  type: string;
  number: string | number;
};

export type CrsConfig = {
  /** Base URL, e.g. "https://api.congress.gov/v3" (no trailing slash). */
  congressGovBaseUrl: string;
  /** api.data.gov / Congress.gov API key.  Optional; omitting downgrades to
   *  the unauthenticated rate limit (30 req/hr) which is fine for testing but
   *  too slow for production ingest. */
  congressGovApiKey?: string;
};

type Fetcher = typeof fetch;
type UnknownRecord = Record<string, unknown>;

// ---------------------------------------------------------------------------
// HTML sanitization
// ---------------------------------------------------------------------------

/**
 * Strip HTML tags from a CRS summary's `text` field and decode common HTML
 * entities.  The CRS API returns text with <p>, <b>, <i>, and similar inline
 * markup.  We convert it to readable plain text without pulling in a DOM or
 * parser dependency.
 *
 * Strategy:
 *  1. Replace block-level tags with newlines so paragraphs stay readable.
 *  2. Strip all remaining tags.
 *  3. Decode the handful of HTML entities Congress.gov actually uses.
 *  4. Collapse runs of whitespace / blank lines and trim.
 */
export function stripHtmlTags(html: string): string {
  let text = html;

  // Block-level tags → newline
  text = text.replace(/<\/?(p|div|br|li|tr|h[1-6])\b[^>]*>/gi, "\n");

  // Strip all remaining tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  text = text
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code)),
    );

  // Collapse whitespace
  text = text
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

// ---------------------------------------------------------------------------
// Summary selection
// ---------------------------------------------------------------------------

/**
 * Given the raw array from `summaries` in the Congress.gov JSON response,
 * pick the best summary to store.
 *
 * Selection rule (matches what a researcher would want):
 *  - Sort descending by `updateDate` (most recently updated first).
 *  - Fall back to the first element if no valid dates are present.
 *  - Return null for an empty array (not an error; many 119th-Congress bills
 *    have no CRS summary yet).
 */
export function selectBestSummary(summaries: unknown[]): UnknownRecord | null {
  if (summaries.length === 0) return null;

  const records = summaries.flatMap((s) => {
    const r = asRecord(s);
    return r ? [r] : [];
  });
  if (records.length === 0) return null;

  // Sort by updateDate descending; treat missing date as epoch so it sorts last.
  const sorted = [...records].sort((a, b) => {
    const da = getString(a, "updateDate") ?? "";
    const db = getString(b, "updateDate") ?? "";
    return db.localeCompare(da);
  });

  return sorted[0] ?? null;
}

// ---------------------------------------------------------------------------
// In-run cache
// ---------------------------------------------------------------------------

/**
 * In-run per-bill cache.  Keyed by a stable bill key derived from congress +
 * type + number.  The value is the fetched CrsSummary (or null if the API
 * returned an empty array or a non-retryable error).
 *
 * This is intentionally simple: it only survives within a single process run.
 * For persistent caching across runs, store the summary in `bills.summary` (as
 * the ingest does) or add a dedicated cache table.
 *
 * TTL is not implemented here because the ingest script exits after each run;
 * the persistent layer (bills.summary column) is the durable cache.
 */
const summaryCache = new Map<string, CrsSummary | null>();

function buildCacheKey(bill: CrsBillIdentity): string {
  return `${bill.congress}:${bill.type.toLowerCase()}:${bill.number}`;
}

// ---------------------------------------------------------------------------
// HTTP helpers (mirrors federal-votes.ts pattern)
// ---------------------------------------------------------------------------

const RETRYABLE = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 3;

function buildSummariesUrl(
  bill: CrsBillIdentity,
  config: CrsConfig,
): string {
  const base = `${config.congressGovBaseUrl}/bill/${bill.congress}/${bill.type.toLowerCase()}/${bill.number}/summaries`;
  const parsed = new URL(base);
  parsed.searchParams.set("format", "json");
  if (config.congressGovApiKey) {
    parsed.searchParams.set("api_key", config.congressGovApiKey);
  }
  return parsed.href;
}

async function fetchJsonWithRetry(
  url: string,
  fetcher: Fetcher,
): Promise<unknown> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetcher(url, {
        headers: { "user-agent": "voter-choice-federal-ingest" },
      });
      if (!response.ok) {
        if (RETRYABLE.has(response.status) && attempt < MAX_RETRIES) {
          const waitMs = 2000 * Math.pow(2, attempt);
          console.error(
            `[crs-summaries] retryable ${response.status} url=${url} attempt=${attempt + 1}/${MAX_RETRIES + 1} wait_ms=${waitMs}`,
          );
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    } catch (e) {
      lastErr = e;
      if (
        attempt < MAX_RETRIES &&
        e instanceof Error &&
        /fetch failed|ECONNRESET|ETIMEDOUT/i.test(e.message)
      ) {
        const waitMs = 2000 * Math.pow(2, attempt);
        console.error(
          `[crs-summaries] network error attempt=${attempt + 1}/${MAX_RETRIES + 1} wait_ms=${waitMs} err=${e.message}`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

// ---------------------------------------------------------------------------
// Primary fetch function
// ---------------------------------------------------------------------------

/**
 * Fetch and parse a CRS summary for the given bill.
 *
 * Returns:
 *  - A `CrsSummary` object if a summary is available.
 *  - `null` if the API returned an empty summaries array (not an error —
 *    many bills have no CRS summary).
 *  - `null` (fail-soft) if the network or API is unavailable; logs a warning
 *    but does NOT throw.  Call sites should treat null as "no summary
 *    available right now" and proceed without one.
 *
 * Results are cached in `summaryCache` for the lifetime of the process so
 * that repeated calls within one ingest run do not hit the API twice.
 *
 * Requires `config.congressGovApiKey` to be set for production use; without a
 * key the unauthenticated rate limit (30 req/hr) applies and large ingest runs
 * will be throttled.
 */
export async function fetchCrsSummary(
  bill: CrsBillIdentity,
  config: CrsConfig,
  fetcher: Fetcher = fetch,
): Promise<CrsSummary | null> {
  const key = buildCacheKey(bill);

  if (summaryCache.has(key)) {
    return summaryCache.get(key) ?? null;
  }

  let result: CrsSummary | null = null;

  try {
    const url = buildSummariesUrl(bill, config);
    const json = await fetchJsonWithRetry(url, fetcher);
    result = parseCrsSummaryResponse(json);
  } catch (error) {
    // Fail soft: outage / unexpected status / network error.
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(
      `[crs-summaries] fetch_failed bill=${bill.congress}/${bill.type}/${bill.number} error=${msg} — returning null (fail-soft)`,
    );
    // Do not cache errors; a subsequent call in the same run can retry.
    return null;
  }

  summaryCache.set(key, result);
  return result;
}

/**
 * Parse the raw JSON from the /summaries endpoint into a CrsSummary.
 *
 * Exported for unit-testing without network calls.
 */
export function parseCrsSummaryResponse(json: unknown): CrsSummary | null {
  const envelope = asRecord(json);
  const summaries = getArray(envelope?.summaries);

  const best = selectBestSummary(summaries);
  if (!best) return null; // empty array — not an error

  const rawText = getString(best, "text");
  if (!rawText) return null;

  return {
    text: stripHtmlTags(rawText),
    sourceVersion: getString(best, "actionDesc"),
    retrievedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// GovInfo BILLSTATUS fallback
// ---------------------------------------------------------------------------

/**
 * In-run cache for GovInfo fallback results. Separate from summaryCache so
 * a null from the primary path does not shadow a successful GovInfo fetch.
 */
const govInfoCache = new Map<string, CrsSummary | null>();

/**
 * Build the GovInfo BILLSTATUS bulk-XML URL for a bill.
 *
 * Pattern: https://www.govinfo.gov/bulkdata/BILLSTATUS/{congress}/{billType}/BILLSTATUS-{congress}{billType}{number}.xml
 *
 * Example (118th Congress, HR 1):
 *   https://www.govinfo.gov/bulkdata/BILLSTATUS/118/hr/BILLSTATUS-118hr1.xml
 */
function buildGovInfoBillStatusUrl(bill: CrsBillIdentity): string {
  const type = bill.type.toLowerCase();
  const congress = bill.congress;
  const number = String(bill.number);
  return `https://www.govinfo.gov/bulkdata/BILLSTATUS/${congress}/${type}/BILLSTATUS-${congress}${type}${number}.xml`;
}

/**
 * Extract the text content of a named XML element using a minimal regex.
 * Returns null if the element is absent or empty.
 *
 * Handles CDATA sections (`<![CDATA[...]]>`) as well as plain text content.
 * Only intended for simple, non-nested text values as found in BILLSTATUS XML.
 */
function extractXmlText(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = re.exec(xml);
  if (!m || !m[1]) return null;

  let value = m[1].trim();

  // Unwrap CDATA section if present: <![CDATA[...]]>
  const cdataMatch = /^<!\[CDATA\[([\s\S]*?)\]\]>$/.exec(value);
  if (cdataMatch) {
    value = cdataMatch[1] ?? "";
  }

  value = value.trim();
  return value || null;
}

/**
 * Decode XML/HTML character entities in a string.
 * Used to unescape entity-encoded HTML text (e.g. from BILLSTATUS v3 XML).
 */
function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code)),
    );
}

/**
 * Extract the summary text from a single BILLSTATUS summary element.
 *
 * The BILLSTATUS v3 schema stores text inside `<cdata><text>` as HTML that is
 * XML-entity-encoded (e.g. `&lt;p&gt;…&lt;/p&gt;`).  We decode entities
 * first so the caller receives raw HTML (e.g. `<p>…</p>`) that `stripHtmlTags`
 * can then process normally.
 *
 * Older/legacy schemas place the text directly in `<text>` (possibly wrapped
 * in a CDATA section), where the content is already raw HTML.
 */
function extractSummaryText(elementXml: string): string | null {
  // v3 schema: <cdata><text>…entity-encoded HTML…</text></cdata>
  const cdataBlock = extractXmlText(elementXml, "cdata");
  if (cdataBlock) {
    const t = extractXmlText(cdataBlock, "text");
    // The text is entity-encoded XML; decode to raw HTML before returning.
    if (t) return decodeXmlEntities(t);
  }

  // Older / legacy schema: <text>…possibly CDATA or plain HTML…</text>
  return extractXmlText(elementXml, "text");
}

/**
 * Parse the BILLSTATUS XML `<summaries>` section into a list of raw summary
 * records.
 *
 * Handles two BILLSTATUS schema variants:
 *  - v3 (current): `<summaries><summary>…</summary></summaries>`
 *  - Legacy: `<summaries><billSummaries><item>…</item></billSummaries></summaries>`
 *
 * Returns an empty array if no summaries element or no items are found.
 */
function parseBillStatusSummaries(xml: string): UnknownRecord[] {
  // Extract the <summaries> block first to limit search scope.
  const maybeSummariesBlock = extractXmlText(xml, "summaries");
  if (!maybeSummariesBlock) return [];
  // Assign to a non-null const so TypeScript can narrow inside the closure.
  const summariesBlock: string = maybeSummariesBlock;

  const items: UnknownRecord[] = [];

  /**
   * Try matching a given element tag name inside the summaries block.
   * The tag may appear directly (v3: <summary>) or nested inside another
   * wrapper element (legacy: <billSummaries><item>).
   */
  function extractItems(tag: string): void {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
    let match: RegExpExecArray | null;
    while ((match = re.exec(summariesBlock)) !== null) {
      const itemXml = match[1];
      if (!itemXml) continue;

      const text = extractSummaryText(itemXml);
      if (!text) continue; // skip items with no summary text

      const actionDesc = extractXmlText(itemXml, "actionDesc");
      const updateDate = extractXmlText(itemXml, "updateDate");

      const record: UnknownRecord = { text };
      if (actionDesc) record.actionDesc = actionDesc;
      if (updateDate) record.updateDate = updateDate;
      items.push(record);
    }
  }

  // v3 schema uses <summary>; legacy schema uses <item>.
  extractItems("summary");
  if (items.length === 0) {
    extractItems("item");
  }

  return items;
}

/**
 * GovInfo BILLSTATUS bulk-XML fallback for extended Congress.gov API outages.
 *
 * Fetches the BILLSTATUS XML from GovInfo, extracts the `<summaries>` section,
 * picks the most-recently-updated item (same `selectBestSummary` logic as the
 * primary path), and returns a `CrsSummary` with HTML stripped.
 *
 * Returns null on:
 *  - Non-200 / 404 (file not yet published by GovInfo)
 *  - Missing or empty summaries element in the XML
 *  - Any network or parse error (fail-soft)
 *
 * Results are cached in `govInfoCache` for the lifetime of the process.
 */
export async function fetchCrsSummaryGovInfoFallback(
  bill: CrsBillIdentity,
  fetcher: Fetcher = fetch,
): Promise<CrsSummary | null> {
  const key = buildCacheKey(bill);

  if (govInfoCache.has(key)) {
    return govInfoCache.get(key) ?? null;
  }

  let result: CrsSummary | null = null;

  try {
    const url = buildGovInfoBillStatusUrl(bill);
    const response = await fetcher(url, {
      headers: { "user-agent": "voter-choice-federal-ingest" },
    });

    if (!response.ok) {
      // 404 = not published yet; other non-200 = transient error. Both → null.
      console.warn(
        `[crs-summaries] govinfo_fallback HTTP ${response.status} bill=${bill.congress}/${bill.type}/${bill.number} — returning null`,
      );
      govInfoCache.set(key, null);
      return null;
    }

    const xml = await response.text();
    const items = parseBillStatusSummaries(xml);
    const best = selectBestSummary(items);

    if (!best) {
      govInfoCache.set(key, null);
      return null;
    }

    const rawText = getString(best, "text");
    if (!rawText) {
      govInfoCache.set(key, null);
      return null;
    }

    result = {
      text: stripHtmlTags(rawText),
      sourceVersion: getString(best, "actionDesc"),
      retrievedAt: new Date().toISOString(),
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(
      `[crs-summaries] govinfo_fallback fetch_failed bill=${bill.congress}/${bill.type}/${bill.number} error=${msg} — returning null (fail-soft)`,
    );
    // Do not cache network errors; a subsequent call in the same run can retry.
    return null;
  }

  govInfoCache.set(key, result);
  return result;
}

// ---------------------------------------------------------------------------
// Integration helper — wiring point for federal-votes.ts
// ---------------------------------------------------------------------------

/**
 * Resolve a CRS summary for a bill that currently has no summary.
 *
 * This is the thin integration function that `enrichBills()` in
 * `federal-votes.ts` should call AFTER the Congress.gov bill+summary fetch
 * (which is already wired).  It only fires when the existing path returned no
 * summary, acting as a backup.
 *
 * Wiring point in `federal-votes.ts`:
 *
 *   // Inside enrichBills(), after:
 *   //   plan.bills.set(billId, mergeBillEnrichment(bill, enrichment));
 *   //
 *   // Add:
 *   const updatedBill = plan.bills.get(billId)!;
 *   if (!updatedBill.summary) {
 *     const crs = await resolveCrsSummaryAsBackup(identity, config, fetcher);
 *     if (crs) {
 *       plan.bills.set(billId, { ...updatedBill, summary: crs.text });
 *     }
 *   }
 *
 * The config object is the same `RuntimeConfig` from `federal-votes.ts`; it
 * already carries `congressGovBaseUrl` and `congressGovApiKey`.
 *
 * Falls back to GovInfo stub if the primary fetch returns null (no-op until
 * the stub is implemented).
 */
export async function resolveCrsSummaryAsBackup(
  bill: CrsBillIdentity,
  config: CrsConfig,
  fetcher: Fetcher = fetch,
): Promise<CrsSummary | null> {
  const primary = await fetchCrsSummary(bill, config, fetcher);
  if (primary !== null) return primary;

  // GovInfo fallback (stubbed; returns null until implemented).
  return fetchCrsSummaryGovInfoFallback(bill, fetcher);
}

// ---------------------------------------------------------------------------
// Private helpers (mirrors federal-votes.ts helpers; kept local to avoid
// coupling — this file is importable independently)
// ---------------------------------------------------------------------------

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function getString(
  record: UnknownRecord | null | undefined,
  key: string,
): string | null {
  const value = record?.[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function getArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
