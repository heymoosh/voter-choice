/**
 * scripts/ingest/promise-extract.ts
 *
 * Part 5 — promise EXTRACTION pipeline (plan: extract → link → adjudicate;
 * this is stage 1). SHARED LIBRARY ONLY as of 2026-08-17 — this file no
 * longer calls Claude itself. It holds every pure piece of the pipeline
 * (corpus loading, archived-page fetch, HTML→text, issue-page discovery,
 * deterministic promise ids, the verbatim-quote anti-hallucination gate,
 * response validation, and the DB upsert) so the three scripts below can
 * reuse it without duplicating a single rule:
 *
 *   1. scripts/ingest/_promise-extract-export.ts — fetches each corpus-ready
 *      candidate's archived pages (network only, no LLM) and writes batch
 *      files of { candidate, pages[] } for the workflow to read.
 *   2. scripts/ingest/_promise-extract.workflow.js — run via the Workflow
 *      tool in a Claude Code session (Claude Max SUBSCRIPTION, not the
 *      metered API). One subagent per batch applies the four-gate rubric
 *      below and writes a result file per batch — files in, files out, the
 *      agents never touch the DB or the snapshot store directly.
 *   3. scripts/ingest/_promise-extract-import.ts — re-validates every
 *      extraction against the ORIGINAL exported page text (the verbatim gate
 *      never trusts agent output blindly) and upserts into
 *      `candidate_promises` (migration 0021).
 *
 * WHY: this script used to call the Anthropic API directly with an API key
 * (`new Anthropic({ apiKey })`), which draws down a metered, capped
 * workspace budget — completely separate from the Claude Max subscription.
 * A 2026-08-17 national run (858 candidates) hit that cap partway through
 * and silently produced zero promises for ~400 candidates until the
 * workspace's monthly reset. Per standing policy (first stated 2026-06-28
 * for tag-bills.ts, restated 2026-08-13 in the ingest/tagging plan, and
 * again here): bulk backend LLM work runs on the subscription, never the
 * metered key. See scripts/ingest/_tag-bills.workflow.js for the template
 * this pipeline follows.
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
 *     anti-hallucination rail. The import script re-runs this gate against
 *     the EXPORTED page text; it never trusts the extracting agent's word.
 *   - REPRODUCIBILITY: `archive_url` is the exact replay URL the text was
 *     fetched from (after the archive's own redirects), never the live site.
 *     `made_at` is the capture date parsed from that URL (the schema's
 *     recorded convention for campaign_site promises).
 *   - IDEMPOTENT: `candidate_promises.id` is a deterministic sha-256 over
 *     candidate_id + archive_url + normalized promise text, so re-runs upsert
 *     on the PK instead of duplicating rows (the 0015/0016 roster lesson).
 *
 * Model: claude-sonnet-5, invoked as a Claude Code subagent (see the
 * workflow above), not the raw Messages API. Reasoning for Sonnet over Haiku
 * unchanged: this is NOT bounded classification — it is verbatim-quote
 * extraction plus a four-way judgment call per statement, where a mistake is
 * a false attribution to a named person.
 *
 * Operational posture (lessons from the spike runs, 2026-08-07 through
 * 2026-08-17):
 *   - Archives throttle (Wayback hard above ~1 rps; LoC deserves the same
 *     politeness): the export step's default fetch concurrency is 1,
 *     fail-soft with retry/backoff (a flaky page must never abort the run).
 *   - Page budget per candidate is bounded (--max-pages, default 6) so
 *     runtime stays predictable and agent batches stay small.
 *   - Resumable: candidates whose promises already exist for this
 *     EXTRACTION_MODEL_VERSION within the corpus's own cycle window (see
 *     cycleFromCorpus — a sitting member's 2026 rows never suppress their
 *     2022 retrospective extraction) are skipped by the EXPORT step —
 *     re-running export after a partial import naturally emits only what's
 *     still missing from the DB.
 *
 * Direct-run usage: none. `npx tsx promise-extract.ts` now just prints the
 * three-step pipeline above and exits — see main() below.
 */

import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { candidatePromises } from "../../db/schema";
import { parseReplayUrl, replayUrl, timestampToIsoDate } from "./web-archives";
import { defaultSnapshotDir, readSnapshotPage } from "./site-snapshot-store";
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
// v3 (2026-08-13, from the extraction gold round): promise_type verb
// discipline — "introduce_bill" only for introduce/sponsor/cosponsor/file
// verbs; bare policy verbs (pass/enact/regulate/ensure/push for) are
// "outcome"; outcomes only the executive branch can deliver are "oversight"
// or not extracted. The v2 calibration example that taught the wrong type
// for "push to consolidate" is corrected.
// v4 (2026-08-13, vocabulary-gap review): canonical vocabulary expanded
// 16→22 (trade_tariffs, curriculum_culture, redistricting_reform,
// election_security_disinformation, congressional_term_limits,
// retirement_income_security) + 2 sub-issues (interior_ice_enforcement,
// wages_worker_power); pole-vocab-v2 / sub-issue-v2. Re-extraction re-files
// promises under the expanded vocabulary (deterministic ids upsert in place).
export const EXTRACTOR_VERSION = "promise-extract-v4";

/** Metadata tag only — the model is invoked as a Claude Code subagent now,
 * never instantiated directly in this file (see the header). */
export const EXTRACTION_MODEL = "claude-sonnet-5";

export const EXTRACTION_MODEL_VERSION = `${EXTRACTOR_VERSION}+${EXTRACTION_MODEL}`;

/** Truncate page text so prompts stay bounded (campaign pages are short). */
export const MAX_PAGE_CHARS = 30_000;

/** Homepage + up to (N-1) same-site issue pages per candidate. */
export const DEFAULT_MAX_PAGES = 6;

/** Wayback throttles hard above ~1 rps (spike lesson) — default serial. */
export const DEFAULT_CONCURRENCY = 1;

export const DEFAULT_VENUE = "campaign_site";

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
// Replay-URL plumbing — shared with the sourcing spike (see
// ./web-archives.ts). Since 2026-08-16 the corpus may pin captures on either
// the Wayback Machine or the Library of Congress elections web archive; every
// step below is archive-agnostic through parseReplayUrl/replayUrl.
// ---------------------------------------------------------------------------

/**
 * Capture date (ISO yyyy-mm-dd) from a replay URL (either archive) — the
 * recorded `made_at` convention for campaign_site promises (schema comment on
 * candidate_promises.made_at). Null for non-replay URLs.
 */
export function captureDateFromArchiveUrl(url: string): string | null {
  const parsed = parseReplayUrl(url);
  if (!parsed) return null;
  return timestampToIsoDate(parsed.timestamp);
}

/**
 * Election cycle implied by a corpus: the latest capture year across its
 * rows, rounded up to the even (federal-election) year. A 2022 retrospective
 * spike carries 2021–2022 captures → 2022; a current-cycle spike carries
 * 2025–2026 captures → 2026. The spike JSON does not carry its --cycle flag,
 * so this derivation is what keeps one extract binary correct for both
 * (2026-08-16, first retrospective run: the page prompt had "2026" hardcoded
 * and the resume skip was cycle-blind). Null when no capture URL parses.
 */
export function cycleFromCorpus(rows: CorpusRow[]): number | null {
  let maxYear = 0;
  for (const r of rows) {
    const parsed = parseReplayUrl(r.canonicalCaptureUrl);
    if (!parsed) continue;
    const year = Number(parsed.timestamp.slice(0, 4));
    if (year > maxYear) maxYear = year;
  }
  if (maxYear === 0) return null;
  return maxYear % 2 === 0 ? maxYear : maxYear + 1;
}

// ---------------------------------------------------------------------------
// HTML → text + same-site issue-page discovery (pure)
// ---------------------------------------------------------------------------

/**
 * Remove Wayback's injected chrome (toolbar, banners, scripts) so extracted
 * text and the verbatim-quote gate see only the archived page's own content.
 * LoC's OpenWayback replay injects its banner client-side via script, so the
 * generic script/style/comment stripping in htmlToText already covers it.
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
export const ISSUE_PATH_RE =
  /(issue|platform|priorit|polic|agenda|plan|vision|stance|record|about|meet)/iu;

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./u, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Discover same-site issue-page URLs (ORIGINAL urls, not replay urls) from
 * an archived homepage's HTML. Handles archive-rewritten hrefs
 * (/web/<ts>/<original>, /all/<ts>/<original>) and plain relative/absolute
 * hrefs. Deduped, capped.
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

    // Undo archive link rewriting (both archives' replay-path shapes) →
    // original URL.
    const rewritten = parseReplayUrl(href);
    if (rewritten) href = rewritten.original;

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
1. COMMITTED ACTOR — the candidate commits THEMSELF ("I will vote against…", "I'll introduce…", or third-person campaign copy like "Jane will introduce…"), not their party, not "Washington", not "we as a nation".
2. FALSIFIABLE ACTION — a concrete act a MEMBER OF CONGRESS takes IN OFFICE: voting, introducing or cosponsoring legislation, oversight, appropriations. Two exclusions this gate enforces strictly:
   a. POSITION STATEMENTS ARE NOT ACTS. "Supports X", "believes in X", "stands with X", "is committed to X", "will fight for X", "will prioritize X" commit to nothing checkable against the congressional record. Only extract when an action verb carries a concrete act ("will vote against", "will introduce", "will file", "will subpoena", "will vote to fund").
   b. CAMPAIGN-CONDUCT PLEDGES ARE NOT CONGRESSIONAL ACTS. Refusing donations, self-imposed term limits, salary pledges, debate pledges — these may be sincere and even checkable elsewhere, but they are not acts of a member of Congress and CANNOT be tested against votes, bills, or appropriations. Do not extract them.
3. DETERMINABLE SCOPE — what the action applies to is identifiable: a named bill, program, tax, appointment, or a class of votes definable by the issue vocabulary below.
4. TESTABLE WINDOW — an explicit deadline or condition, or the implied default (the term of office being sought).

Statements failing ANY gate are unverifiable rhetoric: DO NOT return them. Return an empty array over a doubtful extraction — a wrong promise is a false attribution to a named person; a missed one costs nothing.

Calibration examples (from real pages):
- "I'm going to push for a nationwide ban against partisan, out-of-cycle gerrymandering" → EXTRACT (promise_type "outcome": a legislative result the record can test).
- "Jane will push to consolidate K-12 federal programs into flexible block grants" → EXTRACT (promise_type "outcome": she promises the consolidation, not the act of introducing a bill — "push to <result>" is an outcome).
- "Jane will sponsor the REINS Act" → EXTRACT (promise_type "introduce_bill": the promised act IS the sponsorship).
- "Jane will push to designate the cartels as Foreign Terrorist Organizations" → EXTRACT (promise_type "oversight": the designation is an EXECUTIVE act — a member controls only pressure/oversight toward it, so "outcome" would test something Congress does not do).
- "Jane supports Texas's parental-rights framework on curriculum transparency" → DO NOT EXTRACT (gate 2a: a position, no act).
- "I won't accept donations from AIPAC or any other organization" → DO NOT EXTRACT (gate 2b: campaign conduct, not a congressional act).

CANONICAL ISSUES (canonical_issue must be one of these ids, exact match):
${vocab}

${renderResolverSubIssues()}

For each genuine promise return an object with EXACTLY these fields:
  - "promise_text": the promise VERBATIM from the page — an exact contiguous quote, copied character-for-character (you may trim leading/trailing sentence fragments, never reword). If you cannot quote it exactly, do not return it.
  - "canonical_issue": one id from the list above.
  - "sub_issue": a sub-issue id from the block above when one clearly fits, else null.
  - "promise_type": the DECLARED TEST, chosen now, before any outcome is known:
      "vote" — promises to cast a specific vote or class of votes
      "introduce_bill" — ONLY when the promised act is the introduction itself: the verb is introduce / sponsor / cosponsor / file
      "oversight" — promises of investigation, hearings, or oversight action — including pressure toward an EXECUTIVE-branch act (designations, agency decisions) that Congress cannot itself deliver
      "funding" — promises to secure, protect, or cut specific FEDERAL funding (appropriations — never campaign money)
      "outcome" — promises a RESULT (repeal X, pass Y, get Z built) rather than the candidate's own act. Bare policy verbs — pass, enact, end, ban, regulate, ensure, "push for/to <result>" — are ALWAYS "outcome", never "introduce_bill": promising a result is not promising to file a bill
  - "conditions_deadline": explicit conditions or deadlines stated with the promise (e.g. "if the bill reaches the floor", "in my first 100 days"), else null — null means the default window, the term of office being sought.

A statement not related to any canonical issue above fails gate 3: do not return it even if it is otherwise a promise.

Respond with ONLY a valid JSON array — no markdown, no commentary, no code fences. Return [] when the page contains no qualifying promise (most pages do not).`;
}

export interface PageContext {
  candidateName: string;
  office: string;
  state: string;
  district: string | null;
  /** Election cycle of the CAPTURE (from cycleFromCorpus), not of today. */
  cycle: number;
  pageUrl: string;
  pageText: string;
}

export function buildPagePrompt(ctx: PageContext): string {
  const seat =
    ctx.office === "house" && ctx.district
      ? `U.S. House, ${ctx.state}-${ctx.district}`
      : `${ctx.office}, ${ctx.state}`;
  return `Candidate: ${ctx.candidateName} (${seat}, ${ctx.cycle})
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
  /**
   * Where the live fetch actually landed when a snapshot:// capture was
   * taken (site-snapshot-store's SnapshotPage.liveUrl) — undefined for a
   * live network fetch (which already IS the redirect-followed URL, via
   * response.url()). Same-site link discovery on this page's html must
   * resolve against this when present, not the requested original: the
   * store's manifest joins on the exact original string, and the capture
   * that wrote this page discovered its own sub-pages against this same
   * live URL.
   */
  liveUrl?: string;
}

/**
 * Fetch a page fail-soft (retry on 429/5xx, hard timeout, null on terminal
 * failure). `snapshot://` URLs never touch the network — they resolve from
 * the local self-hosted snapshot store instead (2026-08-17 capture layer).
 * Exported for reuse by promise-site-snapshot.ts, which uses the same
 * posture against LIVE sites.
 */
export async function fetchPageSoft(
  url: string,
  fetcher: typeof fetch,
  label: string,
  snapshotDir: string = defaultSnapshotDir(),
): Promise<FetchedPage | null> {
  const replay = parseReplayUrl(url);
  if (replay?.archive === "snapshot") {
    const page = readSnapshotPage(url, snapshotDir);
    if (!page) {
      process.stderr.write(
        `[promise-extract] ${label} failed: snapshot store (${snapshotDir}) has no capture for ${url}\n`,
      );
    }
    return page;
  }
  if (replay?.archive === "loc") {
    // LoC's replay host sits behind a Cloudflare bot challenge no script
    // passes (2026-08-17 finding) — a plain fetch() always 403s here. Refuse
    // loudly instead of burning retries on a URL that can never succeed:
    // re-capture this candidate with _loc-browser-fetch.ts (real Chrome,
    // writes into the snapshot store) instead of feeding a LoC-pinned
    // corpus straight to this script.
    process.stderr.write(
      `[promise-extract] ${label} refused: LoC replay URLs are Cloudflare-gated for plain fetch (${url}). ` +
        "Capture this candidate with scripts/ingest/_loc-browser-fetch.ts first.\n",
    );
    return null;
  }
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

export interface FetchStats {
  pagesFetched: number;
  pagesFailed: number;
}

/**
 * A response is retryable when it is not a parseable JSON array at all —
 * model-side format nondeterminism (truncation, stray prose), not a content
 * judgment. Distinct from per-entry validation drops, which never retry.
 * (2026-08-12 first write run: two of Hale's issue pages returned
 * malformed_json/response_not_array and his promises silently became zero,
 * while the dry-run minutes earlier had extracted both.) Used by the import
 * step as a cheap pre-check before parseAndValidatePromises, purely to
 * COUNT and surface malformed pages in the run summary — parseAndValidate-
 * Promises makes the actual parse/skip decision either way.
 */
export function isParseableArray(rawJson: string): boolean {
  const fenceMatch = rawJson.match(/```(?:json)?\s*([\s\S]*?)```/u);
  const cleaned = fenceMatch ? fenceMatch[1].trim() : rawJson.trim();
  try {
    return Array.isArray(JSON.parse(cleaned));
  } catch {
    return false;
  }
}

export interface CandidatePageContent {
  /** Original (live-site) URL — stored as source_url. */
  originalUrl: string;
  archiveUrl: string;
  text: string;
}

/**
 * Fetch a candidate's homepage plus up to (maxPages - 1) discovered same-site
 * issue pages, converted to plain text — the network half of extraction,
 * with NO Claude call. This is what the export step runs; the extracting
 * agent only ever sees the { originalUrl, archiveUrl, text } it returns.
 * Pages under 100 chars (empty shells) are dropped — not worth a call.
 */
export async function fetchCandidatePages(
  row: CorpusRow,
  maxPages: number,
  fetcher: typeof fetch,
  stats: FetchStats,
  snapshotDir: string,
): Promise<CandidatePageContent[]> {
  const home = await fetchPageSoft(
    row.canonicalCaptureUrl,
    fetcher,
    `home ${row.name}`,
    snapshotDir,
  );
  if (!home) {
    stats.pagesFailed++;
    return [];
  }
  stats.pagesFetched++;

  const capture =
    parseReplayUrl(home.finalUrl) ?? parseReplayUrl(row.canonicalCaptureUrl);
  // Discover issue-page links against the redirect-followed URL, not the
  // FEC-filed row.website: a site that moved domains between filing and
  // capture serves links whose host matches the capture, not the old filing
  // (2026-08-17 finding) — using row.website as the base silently zeroed out
  // issue-page discovery for any such site. For a snapshot:// capture this
  // MUST be home.liveUrl (parsed back to a plain original when it's itself
  // a replay URL, e.g. an LoC-sourced snapshot), not capture.original: the
  // snapshot store's manifest joins on the exact original string, and the
  // capture that wrote this page discovered ITS sub-pages against liveUrl —
  // discovering against capture.original here would key sub-page lookups
  // differently than they were written and silently miss every one
  // (2026-08-17, second finding: the first fix alone regressed this).
  const discoveryBase = home.liveUrl
    ? (parseReplayUrl(home.liveUrl)?.original ?? home.liveUrl)
    : (capture?.original ?? row.website);
  const issueUrls = capture
    ? extractIssuePageUrls(home.html, discoveryBase, maxPages - 1)
    : [];

  const pages: CandidatePageContent[] = [
    {
      originalUrl: row.website,
      archiveUrl: home.finalUrl,
      text: htmlToText(home.html),
    },
  ];

  // Sub-pages replay on the homepage capture's ARCHIVE at its timestamp; the
  // archive redirects to the nearest actual capture of each page, and
  // finalUrl records the EXACT capture the text came from (the
  // reproducibility rule).
  for (const originalUrl of issueUrls) {
    if (!capture) break;
    const page = await fetchPageSoft(
      replayUrl(capture.archive, capture.timestamp, originalUrl),
      fetcher,
      `page ${originalUrl}`,
      snapshotDir,
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

  return pages.filter((p) => p.text.length >= 100);
}

// ---------------------------------------------------------------------------
// DB
// ---------------------------------------------------------------------------

/**
 * Candidate ids that already carry ≥1 promise row for the current
 * EXTRACTION_MODEL_VERSION — skipped so the run is resumable (kill and
 * restart freely; tag-bills' idempotency posture).
 *
 * CYCLE-SCOPED (2026-08-16): a retrospective corpus shares candidates with
 * the current roster (sitting members appear in both), and a version-only
 * skip treated their current-cycle rows as "already extracted" for the
 * retrospective run — the first 2022 run silently skipped 2 of its 25
 * candidates that way. made_at is the capture date, so the skip now counts
 * only rows inside the corpus cycle's window (Jan 1 of the odd year through
 * the cycle year's end). NULL made_at rows never count toward a skip: a
 * false negative costs one repeat idempotent extraction; a false positive
 * silently drops a cycle.
 */
export async function fetchAlreadyExtracted(
  db: DbClient,
  candidateIds: string[],
  cycle: number,
): Promise<Set<string>> {
  if (candidateIds.length === 0) return new Set();
  const windowStart = `${cycle - 1}-01-01`;
  const windowEnd = `${cycle}-12-31`;
  // Drizzle's sql template expands a JS array to a parenthesized parameter
  // tuple "($1, $2, …)" — valid after IN, invalid inside ANY() (2026-08-12
  // first-run lesson: ANY(${arr}) rendered ANY(($2,…)) and failed).
  const rows = await db.execute(sql`
    SELECT DISTINCT candidate_id
    FROM candidate_promises
    WHERE extraction_model_version = ${EXTRACTION_MODEL_VERSION}
      AND candidate_id IN ${candidateIds}
      AND made_at IS NOT NULL
      AND made_at >= ${windowStart}::date
      AND made_at <= ${windowEnd}::date
  `);
  return new Set(
    (rows.rows as { candidate_id: string }[]).map((r) => r.candidate_id),
  );
}

export async function upsertPromises(
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

export function flagValue(argv: string[], flag: string): string | null {
  const idx = argv.indexOf(flag);
  if (idx < 0 || idx + 1 >= argv.length) return null;
  return argv[idx + 1];
}

export function flagValues(argv: string[], flag: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length - 1; i++) {
    if (argv[i] === flag) out.push(argv[i + 1]);
  }
  return out;
}

export async function mapWithConcurrency<T, R>(
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

function main(): void {
  process.stderr.write(
    "[promise-extract] This script no longer calls the Anthropic API directly.\n" +
      "Removed 2026-08-17 — a national run hit the workspace's metered API cap partway through " +
      "and silently produced zero promises for ~400 candidates. Bulk backend LLM work runs on " +
      "the Claude Max subscription now, never a metered key (same standing policy as tag-bills).\n\n" +
      "promise-extract.ts is a shared library only. Run the pipeline instead:\n" +
      "  1) npx tsx --env-file=.env.local scripts/ingest/_promise-extract-export.ts \\\n" +
      "       --corpus <spike --json output> --out /tmp/promise-batches\n" +
      "  2) In a Claude Code session in this repo, run the workflow:\n" +
      "       scripts/ingest/_promise-extract.workflow.js\n" +
      "     args: { batchFiles: <manifest.batchFiles from step 1>, resultDir: '/tmp/promise-results' }\n" +
      "  3) npx tsx --env-file=.env.local scripts/ingest/_promise-extract-import.ts \\\n" +
      "       --batches /tmp/promise-batches --results /tmp/promise-results [--dry-run]\n",
  );
  process.exit(1);
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main();
}
