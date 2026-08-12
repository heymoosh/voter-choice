/**
 * scripts/ingest/promise-extract.ts
 *
 * Part 5 — promise EXTRACTION pipeline (plan: extract → link → adjudicate;
 * this is stage 1). Reads the corpus the sourcing spike proved out
 * (`scripts/ingest/_promise-corpus-spike.ts --json` output), fetches each
 * corpus-ready candidate's exact Wayback capture, walks a bounded set of
 * same-site issue pages inside that capture, and asks Claude to extract
 * statements that pass the rubric's four-gate extraction test
 * (docs/PROMISE_ADJUDICATION_RUBRIC.md §1). Valid promises are upserted into
 * `candidate_promises` (migration 0021).
 *
 * Design rules enforced here (plan Part 5 + rubric 1.0.0):
 *   - DECLARE THE TEST AT EXTRACTION: the model must emit `promise_type` and
 *     `conditions_deadline` with every promise, before any outcome is known.
 *   - FOUR-GATE FILTER: committed actor / falsifiable action / determinable
 *     scope / testable window. Statements failing any gate are never stored.
 *     We prefer ZERO promises over WRONG promises ("no promise corpus" is a
 *     legitimate, honestly-rendered state).
 *   - NO FALSE ATTRIBUTION: `promise_text` must be a VERBATIM quote from the
 *     archived page. A post-hoc gate (`quoteAppearsInSource`) drops any
 *     extraction whose quote does not appear in the fetched page text — the
 *     anti-hallucination rail.
 *   - REPRODUCIBILITY: `archive_url` is the exact Wayback replay URL the text
 *     was fetched from (after Wayback's own redirects), never the live site.
 *     `made_at` is the capture date parsed from that URL (the schema's
 *     recorded convention for campaign_site promises).
 *   - IDEMPOTENT: `candidate_promises.id` is a deterministic sha-256 over
 *     candidate_id + archive_url + normalized promise text, so re-runs upsert
 *     on the PK instead of duplicating rows (the 0015/0016 roster lesson).
 *
 * Model choice: claude-sonnet-5 (not Haiku, unlike tag-bills.ts).
 *   Reasoning: this is NOT bounded classification — it is verbatim-quote
 *   extraction plus a four-way judgment call per statement, where a mistake
 *   is a false attribution to a named person. The corpus is small (58
 *   corpus-ready TX candidates × a handful of pages), so the total run costs
 *   dollars, not hundreds — accuracy dominates the trade-off here.
 *
 * Operational posture (lessons from the spike runs, 2026-08-07):
 *   - Wayback throttles hard: default concurrency is 1, fail-soft fetch with
 *     retry/backoff (a flaky page must never abort the run).
 *   - Page budget per candidate is bounded (--max-pages, default 6) so cost
 *     and runtime stay predictable.
 *   - Resumable: candidates whose promises already exist for this
 *     EXTRACTION_MODEL_VERSION are skipped unless --force is passed with an
 *     explicit --candidate selector (tag-bills' targeted-only force rule).
 *
 * Usage (from a dev machine with network + secrets; the corpus file is the
 * spike's --json output):
 *   npx tsx --env-file=.env.local scripts/ingest/_promise-corpus-spike.ts \
 *     --state TX --concurrency 1 --json > /tmp/spike-tx.json
 *   npx tsx --env-file=.env.local scripts/ingest/promise-extract.ts \
 *     --corpus /tmp/spike-tx.json --dry-run          # inspect first
 *   npx tsx --env-file=.env.local scripts/ingest/promise-extract.ts \
 *     --corpus /tmp/spike-tx.json                    # write
 *   Flags: --candidate <candidates.id> (repeatable), --limit N, --max-pages N,
 *          --concurrency N, --dry-run, --json (emit extractions to stdout).
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { sql } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { candidatePromises } from "../../db/schema";
import { CANONICAL_ISSUE_LABELS } from "../../src/lib/canonicalIssues";
import {
  SUB_ISSUE_VOCABULARY_VERSION,
  parseAndValidateSubTag,
  renderResolverSubIssues,
} from "../../src/lib/alignment/subIssues";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Bump the -vN suffix whenever the extraction prompt, the four-gate wording,
 * or the vocabulary rendering changes. Stored verbatim in
 * candidate_promises.extraction_model_version; the model id rides after "+"
 * (same convention as the rubric's `rubric-0.1.0+modelrev`).
 */
export const EXTRACTOR_VERSION = "promise-extract-v1";

const EXTRACTION_MODEL = "claude-sonnet-5";

export const EXTRACTION_MODEL_VERSION = `${EXTRACTOR_VERSION}+${EXTRACTION_MODEL}`;

/** Promise extraction can legitimately return many promises per page. */
const MAX_TOKENS = 4096;

/** Truncate page text so prompts stay bounded (campaign pages are short). */
export const MAX_PAGE_CHARS = 30_000;

/** Homepage + up to (N-1) same-site issue pages per candidate. */
const DEFAULT_MAX_PAGES = 6;

/** Wayback throttles hard above ~1 rps (spike lesson) — default serial. */
const DEFAULT_CONCURRENCY = 1;

const DEFAULT_VENUE = "campaign_site";

// Approximate Sonnet pricing ($/MTok) — stderr observability only.
const SONNET_INPUT_COST_PER_MTK = 3.0;
const SONNET_CACHED_COST_PER_MTK = 0.3;
const SONNET_OUTPUT_COST_PER_MTK = 15.0;

export const PROMISE_TYPES = new Set([
  "vote",
  "introduce_bill",
  "oversight",
  "funding",
  "outcome",
]);

// ---------------------------------------------------------------------------
// Corpus file (the spike's --json output)
// ---------------------------------------------------------------------------

export interface CorpusRow {
  candidateId: string;
  name: string;
  state: string;
  office: string;
  district: string | null;
  website: string;
  canonicalCaptureUrl: string;
}

/**
 * Filter a spike --json payload down to extraction-ready rows: bucket
 * `website_archived` with both a resolved candidateId and a canonical
 * capture. Everything else was already explained by the spike's report.
 */
export function loadCorpusRows(payload: unknown): CorpusRow[] {
  if (!Array.isArray(payload)) return [];
  const out: CorpusRow[] = [];
  for (const raw of payload) {
    if (raw === null || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (r.bucket !== "website_archived") continue;
    if (typeof r.candidateId !== "string" || r.candidateId.length === 0)
      continue;
    if (
      typeof r.canonicalCaptureUrl !== "string" ||
      r.canonicalCaptureUrl.length === 0
    )
      continue;
    out.push({
      candidateId: r.candidateId,
      name: typeof r.name === "string" ? r.name : "(unknown)",
      state: typeof r.state === "string" ? r.state : "",
      office: typeof r.office === "string" ? r.office : "",
      district: typeof r.district === "string" ? r.district : null,
      website: typeof r.website === "string" ? r.website : "",
      canonicalCaptureUrl: r.canonicalCaptureUrl,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Wayback URL plumbing (pure)
// ---------------------------------------------------------------------------

const WAYBACK_PATH_RE = /\/web\/(\d{14})[a-z_]{0,4}\/(.+)$/u;

/**
 * Parse a Wayback replay URL into { timestamp, original }. Returns null for
 * non-Wayback URLs.
 */
export function parseWaybackUrl(
  url: string,
): { timestamp: string; original: string } | null {
  const m = url.match(WAYBACK_PATH_RE);
  if (!m) return null;
  return { timestamp: m[1], original: m[2] };
}

/** Replay URL for an original page pinned near a capture timestamp. */
export function waybackPageUrl(timestamp: string, original: string): string {
  return `https://web.archive.org/web/${timestamp}/${original}`;
}

/**
 * Capture date (ISO yyyy-mm-dd) from a Wayback replay URL — the recorded
 * `made_at` convention for campaign_site promises (schema comment on
 * candidate_promises.made_at). Null for non-Wayback URLs.
 */
export function captureDateFromArchiveUrl(url: string): string | null {
  const parsed = parseWaybackUrl(url);
  if (!parsed) return null;
  const ts = parsed.timestamp;
  return `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
}

// ---------------------------------------------------------------------------
// HTML → text + same-site issue-page discovery (pure)
// ---------------------------------------------------------------------------

/**
 * Remove Wayback's injected chrome (toolbar, banners, scripts) so extracted
 * text and the verbatim-quote gate see only the archived page's own content.
 */
export function stripWaybackChrome(html: string): string {
  return html
    .replace(
      /<!--\s*BEGIN WAYBACK TOOLBAR INSERT\s*-->[\s\S]*?<!--\s*END WAYBACK TOOLBAR INSERT\s*-->/giu,
      " ",
    )
    .replace(
      /<div[^>]*\bid=["']?wm-ipp[^>]*>[\s\S]*?<\/div>\s*<\/div>/giu,
      " ",
    );
}

const BLOCK_TAG_RE =
  /<\/?(?:p|div|section|article|li|ul|ol|h[1-6]|br|tr|td|th|blockquote|header|footer|main|nav)\b[^>]*>/giu;

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&rsquo;": "’",
  "&lsquo;": "‘",
  "&rdquo;": "”",
  "&ldquo;": "“",
  "&mdash;": "—",
  "&ndash;": "–",
  "&nbsp;": " ",
  "&hellip;": "…",
};

export function decodeBasicEntities(text: string): string {
  return text
    .replace(/&#(\d+);/gu, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/giu, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(
      /&[a-z]+;/giu,
      (entity) => ENTITIES[entity.toLowerCase()] ?? entity,
    );
}

/**
 * Plain-text rendering of an archived page: Wayback chrome, scripts, styles
 * and tags stripped; block boundaries become newlines; whitespace collapsed.
 * Pure string transforms — no DOM — because Wayback replays are frequently
 * malformed HTML that a strict parser chokes on.
 */
export function htmlToText(html: string): string {
  const cleaned = stripWaybackChrome(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/giu, " ")
    .replace(/<!--[\s\S]*?-->/gu, " ")
    .replace(BLOCK_TAG_RE, "\n")
    .replace(/<[^>]+>/gu, " ");
  return decodeBasicEntities(cleaned)
    .replace(/[ \t\r\f\v]+/gu, " ")
    .replace(/ ?\n ?/gu, "\n")
    .replace(/\n{2,}/gu, "\n")
    .trim();
}

/**
 * Path patterns that mark a campaign-site page as likely to carry positions.
 * Deliberately generous — the four-gate LLM filter is the precision layer;
 * this list only bounds which pages we spend fetches and tokens on.
 */
const ISSUE_PATH_RE =
  /(issue|platform|priorit|polic|agenda|plan|vision|stance|record|about|meet)/iu;

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./u, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Discover same-site issue-page URLs (ORIGINAL urls, not Wayback urls) from
 * an archived homepage's HTML. Handles both Wayback-rewritten hrefs
 * (/web/<ts>/<original>) and plain relative/absolute hrefs. Deduped, capped.
 */
export function extractIssuePageUrls(
  html: string,
  originalBaseUrl: string,
  cap: number,
): string[] {
  const baseHost = hostOf(originalBaseUrl);
  if (!baseHost || cap <= 0) return [];

  const seen = new Set<string>();
  const out: string[] = [];
  const hrefRe = /<a\b[^>]*\bhref=["']([^"'#]+)["#']/giu;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null && out.length < cap) {
    let href = m[1].trim();
    if (href.startsWith("javascript:") || href.startsWith("mailto:")) continue;

    // Undo Wayback link rewriting → original URL.
    const wayback = parseWaybackUrl(href);
    if (wayback) href = wayback.original;

    let resolved: URL;
    try {
      resolved = new URL(href, originalBaseUrl);
    } catch {
      continue;
    }
    if (resolved.protocol !== "https:" && resolved.protocol !== "http:")
      continue;
    if (hostOf(resolved.href) !== baseHost) continue;
    if (!ISSUE_PATH_RE.test(resolved.pathname)) continue;

    resolved.hash = "";
    const key = resolved.href.replace(/\/$/u, "");
    // Skip the homepage itself if a nav link points back at it.
    if (key === originalBaseUrl.replace(/\/$/u, "")) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(resolved.href);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Deterministic promise ids + verbatim-quote gate (pure)
// ---------------------------------------------------------------------------

/** Normalization used for BOTH the id hash and the verbatim gate. */
export function normalizeForMatch(text: string): string {
  return text
    .replace(/[‘’‛`]/gu, "'")
    .replace(/[“”]/gu, '"')
    .replace(/[–—]/gu, "-")
    .replace(/…/gu, "...")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
}

/**
 * The deterministic PK contract recorded in the migration-0021 comment:
 * sha-256 over candidate_id + archive_url + NORMALIZED promise text.
 * Re-extracting the same statement from the same capture always lands on the
 * same row.
 */
export function computePromiseId(
  candidateId: string,
  archiveUrl: string,
  promiseText: string,
): string {
  const digest = createHash("sha256")
    .update(`${candidateId}\n${archiveUrl}\n${normalizeForMatch(promiseText)}`)
    .digest("hex");
  return `pr_${digest.slice(0, 40)}`;
}

/**
 * Anti-hallucination rail: a promise is stored only if its quote actually
 * appears in the fetched page text (whitespace / quote-mark / case
 * insensitive). A paraphrase, however faithful, is dropped — verbatim or
 * nothing, because the quote is what renders next to the candidate's name.
 */
export function quoteAppearsInSource(
  quote: string,
  sourceText: string,
): boolean {
  const q = normalizeForMatch(quote);
  if (q.length === 0) return false;
  return normalizeForMatch(sourceText).includes(q);
}

// ---------------------------------------------------------------------------
// Extraction prompt
// ---------------------------------------------------------------------------

const VALID_CANONICAL_ISSUES = new Set(Object.keys(CANONICAL_ISSUE_LABELS));

/**
 * System prompt — the rubric's §1 four-gate extraction test, the canonical
 * issue vocabulary, and the declared-test contract. Identical across every
 * page in a run, so it is sent with cache_control and billed once.
 */
export function buildExtractionSystemPrompt(): string {
  const vocab = Object.entries(CANONICAL_ISSUE_LABELS)
    .map(([id, label]) => `  ${id} — ${label}`)
    .join("\n");

  return `You extract campaign PROMISES from archived campaign-site pages, applying a published adjudication rubric (version ${SUB_ISSUE_VOCABULARY_VERSION} vocabulary; extractor ${EXTRACTOR_VERSION}). You are an evidence assembler, not a judge: extract only what the page actually says.

A statement is a promise ONLY if ALL FOUR gates hold:
1. COMMITTED ACTOR — the candidate commits THEMSELF ("I will vote against…", "I'll introduce…"), not their party, not "Washington", not "we as a nation".
2. FALSIFIABLE ACTION — a concrete act a member of Congress can take. "Fight for", "stand with", "prioritize", "believe in" are rhetoric unless attached to a specific act.
3. DETERMINABLE SCOPE — what the action applies to is identifiable: a named bill, program, tax, appointment, or a class of votes definable by the issue vocabulary below.
4. TESTABLE WINDOW — an explicit deadline or condition, or the implied default (the term of office being sought).

Statements failing ANY gate are unverifiable rhetoric: DO NOT return them. Return an empty array over a doubtful extraction — a wrong promise is a false attribution to a named person; a missed one costs nothing.

CANONICAL ISSUES (canonical_issue must be one of these ids, exact match):
${vocab}

${renderResolverSubIssues()}

For each genuine promise return an object with EXACTLY these fields:
  - "promise_text": the promise VERBATIM from the page — an exact contiguous quote, copied character-for-character (you may trim leading/trailing sentence fragments, never reword). If you cannot quote it exactly, do not return it.
  - "canonical_issue": one id from the list above.
  - "sub_issue": a sub-issue id from the block above when one clearly fits, else null.
  - "promise_type": the DECLARED TEST, chosen now, before any outcome is known:
      "vote" — promises to cast a specific vote or class of votes
      "introduce_bill" — promises to introduce or cosponsor legislation
      "oversight" — promises of investigation, hearings, or oversight action
      "funding" — promises to secure, protect, or cut specific funding
      "outcome" — promises a RESULT (repeal X, pass Y, get Z built) rather than the candidate's own act
  - "conditions_deadline": explicit conditions or deadlines stated with the promise (e.g. "if the bill reaches the floor", "in my first 100 days"), else null — null means the default window, the term of office being sought.

A statement not related to any canonical issue above fails gate 3: do not return it even if it is otherwise a promise.

Respond with ONLY a valid JSON array — no markdown, no commentary, no code fences. Return [] when the page contains no qualifying promise (most pages do not).`;
}

export interface PageContext {
  candidateName: string;
  office: string;
  state: string;
  district: string | null;
  pageUrl: string;
  pageText: string;
}

export function buildPagePrompt(ctx: PageContext): string {
  const seat =
    ctx.office === "house" && ctx.district
      ? `U.S. House, ${ctx.state}-${ctx.district}`
      : `${ctx.office}, ${ctx.state}`;
  return `Candidate: ${ctx.candidateName} (${seat}, 2026)
Archived campaign page: ${ctx.pageUrl}

Page text:
${ctx.pageText.slice(0, MAX_PAGE_CHARS)}`;
}

// ---------------------------------------------------------------------------
// Response validation (pure)
// ---------------------------------------------------------------------------

export interface ValidatedPromise {
  promiseText: string;
  canonicalIssue: string;
  subIssue: string | null;
  promiseType: string;
  conditionsDeadline: string | null;
}

/**
 * Parse and validate one page's model response. Every promise must:
 * carry a known canonical_issue and promise_type, a non-trivial quote, and —
 * the load-bearing gate — that quote must appear VERBATIM in the fetched
 * page text. Invalid entries are dropped with a one-line log.
 */
export function parseAndValidatePromises(
  rawJson: string,
  pageText: string,
  label: string,
): ValidatedPromise[] {
  const fenceMatch = rawJson.match(/```(?:json)?\s*([\s\S]*?)```/u);
  const cleaned = fenceMatch ? fenceMatch[1].trim() : rawJson.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    process.stderr.write(
      `[promise-extract] skip page=${label} reason=malformed_json\n`,
    );
    return [];
  }
  if (!Array.isArray(parsed)) {
    process.stderr.write(
      `[promise-extract] skip page=${label} reason=response_not_array\n`,
    );
    return [];
  }

  const valid: ValidatedPromise[] = [];
  for (const entry of parsed) {
    if (entry === null || typeof entry !== "object") continue;
    const raw = entry as Record<string, unknown>;

    const promiseText = raw.promise_text;
    if (typeof promiseText !== "string" || promiseText.trim().length < 15) {
      process.stderr.write(
        `[promise-extract] drop page=${label} reason=missing_or_trivial_quote\n`,
      );
      continue;
    }
    if (!quoteAppearsInSource(promiseText, pageText)) {
      // The one gate that catches hallucinated/paraphrased quotes.
      process.stderr.write(
        `[promise-extract] drop page=${label} reason=quote_not_in_source quote="${promiseText.slice(0, 80)}"\n`,
      );
      continue;
    }

    const canonicalIssue = raw.canonical_issue;
    if (
      typeof canonicalIssue !== "string" ||
      !VALID_CANONICAL_ISSUES.has(canonicalIssue)
    ) {
      process.stderr.write(
        `[promise-extract] drop page=${label} reason=unknown_canonical_issue value=${String(canonicalIssue)}\n`,
      );
      continue;
    }

    const promiseType = raw.promise_type;
    if (typeof promiseType !== "string" || !PROMISE_TYPES.has(promiseType)) {
      process.stderr.write(
        `[promise-extract] drop page=${label} reason=invalid_promise_type value=${String(promiseType)}\n`,
      );
      continue;
    }

    // Invalid sub_issue nulls out (facet is optional); the promise survives.
    const subIssue = parseAndValidateSubTag(raw.sub_issue, canonicalIssue);

    const conditionsDeadline =
      typeof raw.conditions_deadline === "string" &&
      raw.conditions_deadline.trim().length > 0
        ? raw.conditions_deadline.trim()
        : null;

    valid.push({
      promiseText: promiseText.trim(),
      canonicalIssue,
      subIssue,
      promiseType,
      conditionsDeadline,
    });
  }
  return valid;
}

/**
 * Within one candidate, the same promise often appears on several pages
 * (homepage teaser + issues page). Keep the FIRST occurrence (pages are
 * processed homepage-first) so each statement is stored once, attributed to
 * one exact capture.
 */
export function dedupeByNormalizedText<T extends { promiseText: string }>(
  rows: T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const key = normalizeForMatch(row.promiseText);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Fail-soft page fetch (spike posture: retry on 429/5xx, never abort the run)
// ---------------------------------------------------------------------------

const RETRYABLE = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 3;
const TIMEOUT_MS = 30_000;

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

export interface FetchedPage {
  /** The exact URL the content came from, after Wayback's own redirects. */
  finalUrl: string;
  html: string;
}

async function fetchPageSoft(
  url: string,
  fetcher: typeof fetch,
  label: string,
): Promise<FetchedPage | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetcher(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: "follow",
      });
      if (response.ok) {
        return { finalUrl: response.url || url, html: await response.text() };
      }
      if (RETRYABLE.has(response.status) && attempt < MAX_RETRIES) {
        const waitMs = 1000 * 2 ** attempt;
        process.stderr.write(
          `[promise-extract] retryable ${response.status} ${label} attempt=${attempt + 1}/${MAX_RETRIES + 1} wait_ms=${waitMs}\n`,
        );
        await sleep(waitMs);
        continue;
      }
      process.stderr.write(
        `[promise-extract] ${label} failed status=${response.status}\n`,
      );
      return null;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      process.stderr.write(
        `[promise-extract] ${label} failed: ${err instanceof Error ? err.message : String(err)}\n`,
      );
      return null;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Per-candidate extraction
// ---------------------------------------------------------------------------

export interface ExtractedPromiseRow {
  id: string;
  candidateId: string;
  canonicalIssue: string;
  subIssue: string | null;
  promiseText: string;
  madeAt: string | null;
  venue: string;
  sourceUrl: string;
  archiveUrl: string;
  extractionModelVersion: string;
  promiseType: string;
  conditionsDeadline: string | null;
}

interface RunStats {
  candidatesProcessed: number;
  candidatesSkippedExisting: number;
  pagesFetched: number;
  pagesFailed: number;
  rowsUpserted: number;
  apiErrors: number;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
}

async function extractPromisesForPage(
  anthropic: Anthropic,
  systemPrompt: string,
  ctx: PageContext,
  stats: RunStats,
): Promise<ValidatedPromise[]> {
  const response = await anthropic.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: "text" as const,
        text: systemPrompt,
        cache_control: { type: "ephemeral" as const },
      },
    ],
    messages: [{ role: "user", content: buildPagePrompt(ctx) }],
  });

  stats.inputTokens += response.usage?.input_tokens ?? 0;
  stats.cachedTokens += response.usage?.cache_read_input_tokens ?? 0;
  stats.outputTokens += response.usage?.output_tokens ?? 0;

  const textBlock = response.content.find((b) => b.type === "text");
  const rawText = textBlock?.type === "text" ? textBlock.text.trim() : "[]";

  // Validate against the SAME truncated text the model saw, so the verbatim
  // gate can never reject a quote for appearing beyond the truncation point.
  return parseAndValidatePromises(
    rawText,
    ctx.pageText.slice(0, MAX_PAGE_CHARS),
    ctx.pageUrl,
  );
}

async function extractCandidate(
  anthropic: Anthropic,
  systemPrompt: string,
  row: CorpusRow,
  maxPages: number,
  fetcher: typeof fetch,
  stats: RunStats,
): Promise<ExtractedPromiseRow[]> {
  const home = await fetchPageSoft(
    row.canonicalCaptureUrl,
    fetcher,
    `home ${row.name}`,
  );
  if (!home) {
    stats.pagesFailed++;
    return [];
  }
  stats.pagesFetched++;

  const capture =
    parseWaybackUrl(home.finalUrl) ?? parseWaybackUrl(row.canonicalCaptureUrl);
  const issueUrls = capture
    ? extractIssuePageUrls(home.html, row.website, maxPages - 1)
    : [];

  interface PageToProcess {
    /** Original (live-site) URL — stored as source_url. */
    originalUrl: string;
    archiveUrl: string;
    text: string;
  }
  const pages: PageToProcess[] = [
    {
      originalUrl: row.website,
      archiveUrl: home.finalUrl,
      text: htmlToText(home.html),
    },
  ];

  // Sub-pages replay at the homepage capture's timestamp; Wayback redirects
  // to the nearest actual capture of each page, and finalUrl records the
  // EXACT capture the text came from (the reproducibility rule).
  for (const originalUrl of issueUrls) {
    if (!capture) break;
    const page = await fetchPageSoft(
      waybackPageUrl(capture.timestamp, originalUrl),
      fetcher,
      `page ${originalUrl}`,
    );
    if (!page) {
      stats.pagesFailed++;
      continue;
    }
    stats.pagesFetched++;
    pages.push({
      originalUrl,
      archiveUrl: page.finalUrl,
      text: htmlToText(page.html),
    });
  }

  const extracted: ExtractedPromiseRow[] = [];
  for (const page of pages) {
    if (page.text.length < 100) continue; // empty shells aren't worth a call
    let validated: ValidatedPromise[];
    try {
      validated = await extractPromisesForPage(
        anthropic,
        systemPrompt,
        {
          candidateName: row.name,
          office: row.office,
          state: row.state,
          district: row.district,
          pageUrl: page.originalUrl,
          pageText: page.text,
        },
        stats,
      );
    } catch (err) {
      stats.apiErrors++;
      process.stderr.write(
        `[promise-extract] api_error page=${page.originalUrl}: ${err instanceof Error ? err.message : String(err)}\n`,
      );
      continue;
    }
    for (const p of validated) {
      extracted.push({
        id: computePromiseId(row.candidateId, page.archiveUrl, p.promiseText),
        candidateId: row.candidateId,
        canonicalIssue: p.canonicalIssue,
        subIssue: p.subIssue,
        promiseText: p.promiseText,
        madeAt: captureDateFromArchiveUrl(page.archiveUrl),
        venue: DEFAULT_VENUE,
        sourceUrl: page.originalUrl,
        archiveUrl: page.archiveUrl,
        extractionModelVersion: EXTRACTION_MODEL_VERSION,
        promiseType: p.promiseType,
        conditionsDeadline: p.conditionsDeadline,
      });
    }
  }

  return dedupeByNormalizedText(extracted);
}

// ---------------------------------------------------------------------------
// DB
// ---------------------------------------------------------------------------

/**
 * Candidate ids that already carry ≥1 promise row for the current
 * EXTRACTION_MODEL_VERSION — skipped so the run is resumable (kill and
 * restart freely; tag-bills' idempotency posture).
 */
async function fetchAlreadyExtracted(
  db: DbClient,
  candidateIds: string[],
): Promise<Set<string>> {
  if (candidateIds.length === 0) return new Set();
  // Drizzle's sql template expands a JS array to a parenthesized parameter
  // tuple "($1, $2, …)" — valid after IN, invalid inside ANY() (2026-08-12
  // first-run lesson: ANY(${arr}) rendered ANY(($2,…)) and failed).
  const rows = await db.execute(sql`
    SELECT DISTINCT candidate_id
    FROM candidate_promises
    WHERE extraction_model_version = ${EXTRACTION_MODEL_VERSION}
      AND candidate_id IN ${candidateIds}
  `);
  return new Set(
    (rows.rows as { candidate_id: string }[]).map((r) => r.candidate_id),
  );
}

async function upsertPromises(
  db: DbClient,
  rows: ExtractedPromiseRow[],
  dryRun: boolean,
): Promise<number> {
  if (rows.length === 0) return 0;
  if (dryRun) {
    for (const r of rows) {
      process.stderr.write(
        `[promise-extract] dry_run would_upsert id=${r.id} candidate=${r.candidateId} issue=${r.canonicalIssue} type=${r.promiseType} text="${r.promiseText.slice(0, 100)}"\n`,
      );
    }
    return rows.length;
  }
  await db
    .insert(candidatePromises)
    .values(
      rows.map((r) => ({
        id: r.id,
        candidateId: r.candidateId,
        canonicalIssue: r.canonicalIssue,
        subIssue: r.subIssue,
        promiseText: r.promiseText,
        madeAt: r.madeAt,
        venue: r.venue,
        sourceUrl: r.sourceUrl,
        archiveUrl: r.archiveUrl,
        extractionModelVersion: r.extractionModelVersion,
        promiseType: r.promiseType,
        conditionsDeadline: r.conditionsDeadline,
      })),
    )
    .onConflictDoUpdate({
      target: candidatePromises.id,
      set: {
        // Same id ⇒ same candidate + capture + text by construction; the
        // classification fields are the ones a prompt revision can change.
        canonicalIssue: sql`excluded.canonical_issue`,
        subIssue: sql`excluded.sub_issue`,
        promiseType: sql`excluded.promise_type`,
        conditionsDeadline: sql`excluded.conditions_deadline`,
        extractionModelVersion: sql`excluded.extraction_model_version`,
        madeAt: sql`excluded.made_at`,
      },
    });
  return rows.length;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function flagValue(argv: string[], flag: string): string | null {
  const idx = argv.indexOf(flag);
  if (idx < 0 || idx + 1 >= argv.length) return null;
  return argv[idx + 1];
}

function flagValues(argv: string[], flag: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length - 1; i++) {
    if (argv[i] === flag) out.push(argv[i + 1]);
  }
  return out;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i], i);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const corpusPath = flagValue(argv, "--corpus");
  if (!corpusPath) {
    process.stderr.write(
      "[promise-extract] --corpus <spike --json output file> is required.\n" +
        "Produce it with: npx tsx --env-file=.env.local scripts/ingest/_promise-corpus-spike.ts --state TX --concurrency 1 --json > spike.json\n",
    );
    process.exit(1);
  }
  const dryRun = argv.includes("--dry-run");
  const asJson = argv.includes("--json");
  const limit = Number(flagValue(argv, "--limit") ?? Infinity);
  const maxPages = Number(flagValue(argv, "--max-pages") ?? DEFAULT_MAX_PAGES);
  const concurrency = Number(
    flagValue(argv, "--concurrency") ?? DEFAULT_CONCURRENCY,
  );
  const candidateFilter = new Set(flagValues(argv, "--candidate"));
  const force = argv.includes("--force");
  if (force && candidateFilter.size === 0) {
    // tag-bills' targeted-only force rule: there is intentionally NO
    // "re-extract the whole corpus" path without bumping EXTRACTOR_VERSION.
    process.stderr.write(
      "[promise-extract] --force requires an explicit --candidate selector. " +
        "To re-extract everything, bump EXTRACTOR_VERSION instead.\n",
    );
    process.exit(1);
  }

  const anthropicApiKey =
    process.env.ANTHROPIC_VOTER_API ?? process.env.ANTHROPIC_API_KEY ?? "";
  if (!anthropicApiKey) {
    process.stderr.write(
      "[promise-extract] ANTHROPIC_VOTER_API is not set. Cannot call Claude.\n",
    );
    process.exit(1);
  }

  const rawCorpus = readFileSync(corpusPath, "utf8");
  if (rawCorpus.trim().length === 0) {
    // The spike writes its --json payload in one shot at the END of its run;
    // a zero-byte file means the spike is still running or was interrupted.
    process.stderr.write(
      `[promise-extract] ${corpusPath} is empty — the spike writes its JSON only when it finishes. ` +
        "Let the spike run to completion (the bucket table prints last), then re-run.\n",
    );
    process.exit(1);
  }
  let corpusPayload: unknown;
  try {
    corpusPayload = JSON.parse(rawCorpus) as unknown;
  } catch {
    process.stderr.write(
      `[promise-extract] ${corpusPath} is not valid JSON — was the spike interrupted mid-write, ` +
        "or was --json omitted from the spike command?\n",
    );
    process.exit(1);
  }
  let corpus = loadCorpusRows(corpusPayload);
  if (candidateFilter.size > 0) {
    corpus = corpus.filter((r) => candidateFilter.has(r.candidateId));
  }
  if (Number.isFinite(limit)) corpus = corpus.slice(0, limit);

  process.stderr.write(
    `[promise-extract] ${corpus.length} corpus-ready candidates from ${corpusPath} ` +
      `(model=${EXTRACTION_MODEL} version=${EXTRACTION_MODEL_VERSION} max_pages=${maxPages} ` +
      `concurrency=${concurrency}${dryRun ? " DRY-RUN" : ""})\n`,
  );

  const db = requireDb();
  const stats: RunStats = {
    candidatesProcessed: 0,
    candidatesSkippedExisting: 0,
    pagesFetched: 0,
    pagesFailed: 0,
    rowsUpserted: 0,
    apiErrors: 0,
    inputTokens: 0,
    cachedTokens: 0,
    outputTokens: 0,
  };

  const already = force
    ? new Set<string>()
    : await fetchAlreadyExtracted(
        db,
        corpus.map((r) => r.candidateId),
      );
  const pending = corpus.filter((r) => {
    if (already.has(r.candidateId)) {
      stats.candidatesSkippedExisting++;
      return false;
    }
    return true;
  });
  if (stats.candidatesSkippedExisting > 0) {
    process.stderr.write(
      `[promise-extract] ${stats.candidatesSkippedExisting} candidates already extracted at ${EXTRACTION_MODEL_VERSION} — skipped (resumable run)\n`,
    );
  }

  const anthropic = new Anthropic({ apiKey: anthropicApiKey });
  const systemPrompt = buildExtractionSystemPrompt();
  const allRows: ExtractedPromiseRow[] = [];

  await mapWithConcurrency(pending, concurrency, async (row) => {
    const promises = await extractCandidate(
      anthropic,
      systemPrompt,
      row,
      maxPages,
      fetch,
      stats,
    );
    stats.candidatesProcessed++;
    process.stderr.write(
      `[promise-extract] ${row.name} (${row.state}-${row.district ?? "?"}): ` +
        `${promises.length} promises [${stats.candidatesProcessed}/${pending.length}]\n`,
    );
    if (promises.length > 0) {
      try {
        stats.rowsUpserted += await upsertPromises(db, promises, dryRun);
      } catch (err) {
        process.stderr.write(
          `[promise-extract] db_error candidate=${row.candidateId}: ${err instanceof Error ? err.message : String(err)}\n`,
        );
      }
    }
    allRows.push(...promises);
  });

  const freshInput = stats.inputTokens - stats.cachedTokens;
  const estimatedUsd =
    (freshInput * SONNET_INPUT_COST_PER_MTK) / 1_000_000 +
    (stats.cachedTokens * SONNET_CACHED_COST_PER_MTK) / 1_000_000 +
    (stats.outputTokens * SONNET_OUTPUT_COST_PER_MTK) / 1_000_000;

  process.stderr.write(
    `\n[promise-extract] done. candidates=${stats.candidatesProcessed} ` +
      `skipped_existing=${stats.candidatesSkippedExisting} pages=${stats.pagesFetched} ` +
      `page_failures=${stats.pagesFailed} promises=${allRows.length} ` +
      `upserted=${stats.rowsUpserted}${dryRun ? " (dry-run)" : ""} api_errors=${stats.apiErrors} ` +
      `tokens_in=${stats.inputTokens} cached=${stats.cachedTokens} out=${stats.outputTokens} ` +
      `est_cost_usd=${estimatedUsd.toFixed(2)}\n`,
  );

  if (asJson) {
    console.log(JSON.stringify(allRows, null, 2));
  } else {
    // Human summary: promises per candidate, so "zero promises found" states
    // are visible in the report rather than silently absent.
    const byCandidate = new Map<string, number>();
    for (const r of pending) byCandidate.set(`${r.name}`, 0);
    for (const r of allRows) {
      const row = pending.find((p) => p.candidateId === r.candidateId);
      if (row) byCandidate.set(row.name, (byCandidate.get(row.name) ?? 0) + 1);
    }
    for (const [name, count] of byCandidate) {
      console.log(
        `${String(count).padStart(3)}  ${name}${count === 0 ? "  (no promise corpus from this capture)" : ""}`,
      );
    }
  }
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((err) => {
    process.stderr.write(
      `[promise-extract] fatal: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
    );
    process.exit(1);
  });
}
