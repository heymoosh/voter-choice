/**
 * scripts/ingest/_retag-selector.ts
 *
 * Bill-SELECTOR for the TARGETED re-tag of thin-coverage canonical issues
 * (reproductive_rights, immigration). See backlog card:
 *   "[P1] reproductive_rights and immigration canonical issues have very thin
 *    tag coverage".
 *
 * WHY THIS EXISTS
 * The general tagger (scripts/ingest/tag-bills.ts) skips any bill already tagged
 * at the current TAGGER_VERSION. To lift coverage on two issues WITHOUT bumping
 * TAGGER_VERSION (a full-corpus re-tag), we re-tag only a *targeted subset*: the
 * state bills most likely to carry repro / immigration signal. This module
 * computes that subset deterministically so the re-tag run can target exactly it.
 *
 * APPROACH (state + keyword filter)
 *   - STATE filter: each issue has a hand-picked list of states where the thin
 *     coverage matters most (active legislatures on the topic). Derived from the
 *     card. Bills are matched by the 2-letter state code embedded in
 *     `bills.jurisdiction` (see extractStateCode).
 *   - KEYWORD filter: a well-commented per-issue keyword list applied to the
 *     bill TITLE and SUMMARY (case-insensitive substring). The seed terms reuse
 *     the directional `bill_signals` already pinned in
 *     src/lib/alignment/poleVocabulary.ts so the selector stays in sync with the
 *     tagger's own notion of what these issues look like.
 *
 * This file is READ-ONLY against the database. It never writes.
 *
 * Usage (dry-run preview of the targeted subset, no re-tag):
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/_retag-selector.ts reproductive_rights
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/_retag-selector.ts immigration --json
 */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { getPoleEntry } from "../../src/lib/alignment/poleVocabulary";

// ---------------------------------------------------------------------------
// Issue scope — the two thin-coverage issues this targeted re-tag covers.
// ---------------------------------------------------------------------------

export type RetagIssue = "reproductive_rights" | "immigration";

export const RETAG_ISSUES: readonly RetagIssue[] = [
  "reproductive_rights",
  "immigration",
] as const;

export function isRetagIssue(value: string): value is RetagIssue {
  return (RETAG_ISSUES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// State filter — per-issue target states (from the backlog card).
// USPS 2-letter codes, uppercase.
// ---------------------------------------------------------------------------

export const RETAG_TARGET_STATES: Record<RetagIssue, readonly string[]> = {
  // States with the most active abortion / reproductive-care legislative fights.
  reproductive_rights: ["TX", "FL", "OH", "GA", "NC", "AZ", "WI"],
  // States with the most active immigration / border legislative activity.
  immigration: ["TX", "AZ", "FL"],
};

// ---------------------------------------------------------------------------
// Keyword filter — per-issue title/summary keyword lists.
//
// Seed terms reuse the directional `bill_signals` pinned in poleVocabulary.ts
// (so the selector tracks the tagger's own signal vocabulary), then add a small
// set of plain-language topic terms a bill title/summary is likely to use. All
// matching is lower-cased substring matching, so stems like "abortion" also
// catch "abortions". Keep terms SPECIFIC — overly generic words (e.g. "care",
// "border" alone is fine but "rights" alone is not) would over-select.
// ---------------------------------------------------------------------------

/**
 * Plain-language topic terms layered ON TOP of the pole bill_signals. These are
 * the words an actual bill title or summary tends to use, which the abstract
 * pole signals ("codifying Roe") may not literally contain.
 */
const EXTRA_KEYWORDS: Record<RetagIssue, readonly string[]> = {
  reproductive_rights: [
    "abortion",
    "gestational",
    "fetal",
    "fetus",
    "unborn",
    "clinic",
    "contracept",
    "ivf",
    "in vitro",
    "title x",
    "family planning",
    "planned parenthood",
    "reproductive",
    "pregnancy",
    "prenatal",
    "heartbeat",
    "personhood",
    "mifepristone",
    "medication abortion",
    "roe",
  ],
  immigration: [
    "immigra", // immigration, immigrant
    "border",
    "asylum",
    "deport",
    "e-verify",
    "everify",
    "ice ", // trailing space — avoid "office"/"service"/"price"
    "detention",
    "refugee",
    "visa",
    "daca",
    "dreamer",
    "undocumented",
    "alien",
    "citizenship",
    "naturaliz",
    "remain in mexico",
    "border patrol",
    "migrant",
    "sanctuary",
  ],
};

/**
 * Build the full, de-duplicated, lower-cased keyword list for an issue:
 * pole `bill_signals` (both poles) + the plain-language EXTRA_KEYWORDS.
 */
export function buildKeywordList(issue: RetagIssue): string[] {
  const pole = getPoleEntry(issue);
  const fromPole = pole
    ? [...pole.in_favor.billSignals, ...pole.opposed.billSignals]
    : [];
  const all = [...fromPole, ...EXTRA_KEYWORDS[issue]].map((k) =>
    k.toLowerCase().trim(),
  );
  return [...new Set(all)].filter((k) => k.length > 0);
}

// ---------------------------------------------------------------------------
// Pure matching helpers (unit-testable without a DB).
// ---------------------------------------------------------------------------

/**
 * Extract the 2-letter USPS state code from a bill's `jurisdiction`.
 *
 * Bills carry one of two jurisdiction shapes (see scripts/ingest/*-votes.ts):
 *   - state bills:   "ocd-jurisdiction/country:us/state:tx/government"
 *   - federal bills: "federal-house" | "federal-senate"
 *
 * Returns the uppercase state code for OCD state jurisdictions, or null for
 * federal / unrecognized jurisdictions (the targeted issues are state-leaning).
 */
export function extractStateCode(jurisdiction: string | null): string | null {
  if (!jurisdiction) return null;
  const ocd = jurisdiction.match(/\/state:([a-z]{2})\b/i);
  if (ocd) return ocd[1].toUpperCase();
  // Legacy "state-XX-chamber" shape, for safety.
  const legacy = jurisdiction.match(/^state-([a-z]{2})-/i);
  if (legacy) return legacy[1].toUpperCase();
  return null;
}

/** True iff `text` contains any of the (already lower-cased) keywords. */
export function matchesKeywords(
  text: string | null | undefined,
  keywords: readonly string[],
): boolean {
  if (!text) return false;
  const haystack = text.toLowerCase();
  return keywords.some((k) => haystack.includes(k));
}

/**
 * Pure predicate: does this bill belong in the targeted subset for `issue`?
 * Exported so the selector logic can be tested without a database.
 */
export function billMatchesRetagFilter(
  bill: { title: string; summary: string | null; jurisdiction: string | null },
  issue: RetagIssue,
): boolean {
  const state = extractStateCode(bill.jurisdiction);
  if (!state || !RETAG_TARGET_STATES[issue].includes(state)) return false;
  const keywords = buildKeywordList(issue);
  return (
    matchesKeywords(bill.title, keywords) ||
    matchesKeywords(bill.summary, keywords)
  );
}

// ---------------------------------------------------------------------------
// DB query — returns the targeted bill ids (READ-ONLY).
// ---------------------------------------------------------------------------

export type SelectedBill = {
  id: string;
  title: string;
  summary: string | null;
  jurisdiction: string;
};

/**
 * Build the SQL predicate fragments for an issue's targeted subset:
 *   - state code IN (...)         (extracted from jurisdiction)
 *   - title/summary ILIKE ANY (...) of the keyword patterns
 *
 * Kept as a helper so both the live query and a future EXPLAIN/preview share
 * exactly one definition of "what's in the subset".
 */
export function buildRetagWhere(issue: RetagIssue) {
  const states = RETAG_TARGET_STATES[issue];
  // ILIKE patterns: %keyword% (keywords are already lower-cased; ILIKE is
  // case-insensitive so casing of the keyword does not matter).
  const patterns = buildKeywordList(issue).map((k) => `%${k}%`);

  // Extract the state code in SQL, mirroring extractStateCode():
  //   substring(jurisdiction from '/state:([a-z]{2})')  -> 'tx'
  const stateExpr = sql`upper(substring(b.jurisdiction from '/state:([a-z]{2})'))`;

  return sql`
    ${stateExpr} = ANY(${sql.raw(`ARRAY[${states.map((s) => `'${s}'`).join(",")}]`)})
    AND (
      b.title ILIKE ANY(${patterns})
      OR coalesce(b.summary, '') ILIKE ANY(${patterns})
    )
  `;
}

/**
 * Return the bills in the targeted subset for `issue`. Read-only.
 * `limit` is a safety cap (default 100k = effectively all matches).
 */
export async function selectRetagBills(
  db: DbClient,
  issue: RetagIssue,
  limit = 100_000,
): Promise<SelectedBill[]> {
  const where = buildRetagWhere(issue);
  const rows = await db.execute(sql`
    SELECT b.id, b.title, b.summary, b.jurisdiction
    FROM bills b
    WHERE ${where}
    ORDER BY b.id
    LIMIT ${limit}
  `);
  return rows.rows as SelectedBill[];
}

/** Convenience: just the ids of the targeted subset. */
export async function selectRetagBillIds(
  db: DbClient,
  issue: RetagIssue,
  limit = 100_000,
): Promise<string[]> {
  const bills = await selectRetagBills(db, issue, limit);
  return bills.map((b) => b.id);
}

// ---------------------------------------------------------------------------
// CLI — dry-run preview only (prints counts + ids). Never re-tags.
// ---------------------------------------------------------------------------

function isCliExecution(): boolean {
  const entrypoint = process.argv[1];
  if (!entrypoint) return false;
  return import.meta.url === pathToFileURL(resolve(entrypoint)).href;
}

async function main(): Promise<void> {
  const issueArg = process.argv[2];
  const asJson = process.argv.includes("--json");
  if (!issueArg || !isRetagIssue(issueArg)) {
    console.error(
      `[retag-selector] usage: _retag-selector.ts <${RETAG_ISSUES.join("|")}> [--json]`,
    );
    process.exitCode = 1;
    return;
  }

  const db = requireDb();
  const bills = await selectRetagBills(db, issueArg);

  if (asJson) {
    console.log(
      JSON.stringify(
        bills.map((b) => b.id),
        null,
        2,
      ),
    );
    return;
  }

  console.error(
    `[retag-selector] issue=${issueArg} states=${RETAG_TARGET_STATES[issueArg].join(",")} ` +
      `keywords=${buildKeywordList(issueArg).length} matched_bills=${bills.length}`,
  );
  for (const b of bills.slice(0, 30)) {
    console.log(`${b.id}\t${b.jurisdiction}\t${b.title.slice(0, 80)}`);
  }
  if (bills.length > 30) console.log(`…and ${bills.length - 30} more`);
}

if (isCliExecution()) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[retag-selector] fatal: ${message}`);
    process.exitCode = 1;
  });
}
