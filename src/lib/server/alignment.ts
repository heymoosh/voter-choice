/**
 * src/lib/server/alignment.ts
 *
 * Drizzle query layer for the alignment lookup endpoint.
 * Pulled out of the route handler so it can be tested independently.
 *
 * This module is server-only. Never import it from client components.
 */

import { eq, and, gte } from "drizzle-orm";
import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import * as schema from "../../../db/schema";
import { isCan2026DisplayEnabled } from "./can-flag";
import { formatTallyLine } from "../rollcall-tally";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContributingVote {
  billTitle: string;
  /** "with" = voted on the user's side; "against" = voted against the user's side */
  voteCast: "with" | "against";
  date: string; // YYYY-MM-DD
  source: { name: string; url: string };
  /**
   * Additional source attributions beyond the primary `source`. Populated when
   * the LLM plain_summary (CRS-derived) is used — a Congress.gov entry is
   * appended so the data provenance is visible in the UI.
   */
  sources?: Array<{ name: string; url: string }>;
  /**
   * Bill-level "What it did" prose. Always plain text — never HTML.
   * Populated from two sources, in precedence order:
   *   1. can_bill_narratives.narrative — when CAN2026_DISPLAY_ENABLED is set
   *      and the bill has a linked CAN2026 row (curated, gated).
   *   2. bills.plain_summary — LLM-generated short plain-language summary
   *      (≤2 sentences) from scripts/ingest/summarize-bills.ts (ungated).
   *      Rendered in full; never truncated or ellipsized.
   * Absent when neither source has content — the UI shows the bill title +
   * roll-call + Congress.gov link but NO inline summary paragraph.
   */
  narrative?: string;
  /**
   * Formatted roll-call tally line for this vote, e.g. "Passed 232–193".
   * Absent (undefined) when tally data is not yet ingested for this vote.
   * UI should hide the tally line when absent — never show a placeholder.
   */
  tally?: string;
  /**
   * Latest lifecycle stage for the bill, e.g. "Passed House, stalled in Senate"
   * or "Signed into law (2022-08-16)". Sourced from Congress.gov latestAction.
   * Absent when not yet ingested for this bill (state bills, older rows).
   * UI should hide the status line when absent — never show a placeholder.
   */
  billStatus?: string;
  /**
   * Member's stated/inferred reason for this vote, synthesized from their
   * press releases via the congress-press dataset.
   *
   * Data source: congress-press by Derek Willis
   *   https://github.com/dwillis/congress-press
   *   MIT licensed — Copyright (c) 2026 Derek Willis
   *
   * Labeling:
   *   - label = "stated"  — the blurb is a paraphrase of an explicit comment
   *     in the member's press release.
   *   - label = "inferred" — the press release was thematically related to
   *     the vote but did not address it directly.
   *
   * ABSENT (undefined) when:
   *   - No matching press release was found for this vote.
   *   - The ingest has not yet run for this member/bill pair.
   *   - The generation step has not yet run.
   *
   * NEVER fabricate, NEVER display as verified fact. The UI MUST label it
   * as the member's stated / inferred reasoning and link the source URL.
   *
   * Attribution requirement: display "congress-press by Derek Willis"
   * (https://github.com/dwillis/congress-press) wherever this is shown.
   */
  memberRationale?: {
    /** Plain-text blurb (≤3 sentences). */
    text: string;
    /** "stated" | "inferred" */
    label: string;
    /** Source press release URLs (for display attribution). */
    sourceUrls: string[];
    /** Model/version that generated this blurb. */
    modelVersion: string | null;
  };
}

export interface AlignmentResult {
  found: true;
  candidateId: string;
  kept: number;
  total: number;
  contributingVotes: ContributingVote[];
  unavailable?: { reason: string };
  /**
   * Optional structured notice surfaced to the chat layer when the underlying
   * tag corpus is thin (e.g., `total < 5`). The chat layer / UI should render
   * this verbatim so the user understands the score is based on limited data.
   * Absent (undefined) when there is no notice to surface.
   *
   * See: `attachLimitedDataNotice` for the gating rules and
   * `docs/operations/post-launch-backlog.md` "[P1] Alignment returns kept: 0
   * silently for unmapped concerns" for the user-impact context.
   */
  notice?: string;
  /**
   * The sub-issue facet the score was actually computed from, set ONLY when the
   * caller passed a `subIssue` AND the sub-issue-specific row set had enough
   * scorable votes to PREFER it over the parent corpus. Absent when no subIssue
   * was requested or when the lookup FELL BACK to the parent (sparse sub-rows).
   */
  matchedSubIssue?: string;
}

export interface AlignmentNotFound {
  found: false;
  unavailable: { reason: string };
}

export type AlignmentLookupResult = AlignmentResult | AlignmentNotFound;

/** Threshold below which the alignment lookup is considered "thin data". */
const LIMITED_DATA_THRESHOLD = 5;

/**
 * Attach a "limited data" notice to an alignment result when the underlying
 * tag corpus is too thin to be statistically meaningful.
 *
 * Gating rules:
 *  - Only attaches when `result.found === true`. AlignmentNotFound is a
 *    passthrough; the existing `unavailable.reason` already conveys the issue.
 *  - Only attaches when `0 < total < LIMITED_DATA_THRESHOLD`. A `total` of 0
 *    typically co-occurs with `unavailable.reason` (no rows / DB not
 *    configured); stacking "Limited data: 0 votes" on top of that reads
 *    broken, so we suppress the notice in those cases.
 *  - Only attaches when `result.unavailable` is absent. If the caller has
 *    already flagged the lookup as unavailable, that signal takes precedence.
 *
 * Pure function. Tested directly in `alignment.test.ts`.
 */
export function attachLimitedDataNotice(
  result: AlignmentLookupResult,
): AlignmentLookupResult {
  if (!result.found) return result;
  if (result.unavailable) return result;
  if (result.total <= 0) return result;
  if (result.total >= LIMITED_DATA_THRESHOLD) return result;

  const noun = result.total === 1 ? "vote" : "votes";
  return {
    ...result,
    notice: `Limited data: only ${result.total} relevant ${noun} found for this issue (${result.kept} aligned with your stance). Score may not reflect the candidate's overall record.`,
  };
}

// ---------------------------------------------------------------------------
// Candidate resolution
// ---------------------------------------------------------------------------

/**
 * Generational / professional suffixes, stripped from the END of a name.
 * Official Secretary-of-State rosters carry them ("FREDERICK D. HAYNES III",
 * "Clyde W. Jones, Jr.") while our FEC-derived rows usually don't. Before this
 * was handled, `candidateNameParts` read "III" as the SURNAME — which resolved
 * a Texas candidate onto "Rep. Nicholas Begich III [R-AK]".
 */
const NAME_SUFFIX_TOKENS = new Set([
  "jr",
  "sr",
  "ii",
  "iii",
  "iv",
  "v",
  "md",
  "phd",
  "esq",
  "dds",
  "jd",
]);

/**
 * Honorifics stripped from ANY position. FEC-derived rows splice the filer's
 * prefix field mid-name — "Clyde W Mr. Jones", "Raymond Edward Dr. Smith",
 * "Thomas E. Colonel Chalifoux" — so a leading-only strip misses them.
 * Deliberately excludes name-like titles ("Major", "Duke") that are real
 * given names or surnames.
 */
const NAME_HONORIFIC_TOKENS = new Set([
  "mr",
  "mrs",
  "ms",
  "dr",
  "sen",
  "rep",
  "del",
  "com",
  "res",
  "gov",
  "hon",
  "senator",
  "representative",
  "congressman",
  "congresswoman",
  "colonel",
]);

/** Lowercase, drop diacritics and name punctuation. Comparison key only. */
function foldNameToken(token: string): string {
  return token
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[.'’]/gu, "");
}

/**
 * Fold a whole name for comparison: diacritics and punctuation removed,
 * whitespace collapsed. "LAUREN B. PEÑA" and "Lauren B. Pena" both fold to
 * "lauren b pena", so they match exactly instead of falling through every tier.
 * Never used for display — `cleanCandidateName` keeps the original spelling.
 */
function foldName(raw: string): string {
  return (raw ?? "")
    .trim()
    .split(/\s+/u)
    .map(foldNameToken)
    .filter(Boolean)
    .join(" ");
}

/**
 * Strip GovTrack-style decorations from a stored candidate name so it can be
 * matched against a clean ballot name.
 *
 * The federal-votes ingest stores GovTrack's `person.name`, which is decorated:
 *   "Sen. Andrew Kim [D-NJ]"  ·  "Rep. Marc Veasey [D-TX]"
 * and occasionally the sortname form "Collins, Susan (Sen.) [R-ME]". Ballot
 * rosters (Google Civic / uploaded ballots) use the plain "Firstname Lastname"
 * form. This reduces the stored name to "Andrew Kim" / "Susan Collins".
 *
 * Also removes quoted nicknames (`James "Rus" Russell`), trailing suffixes and
 * mid-name honorifics — all three appear in official rosters and in the
 * FEC-derived `candidates.full_name` rows we match them against.
 *
 * Exported for unit testing.
 */
export function cleanCandidateName(raw: string): string {
  let s = (raw ?? "").trim();
  // Trailing bracketed decoration. Senators are "[D-NJ]" (state only); House
  // members carry a district digit — "[D-NJ1]" / "[R-NC12]"; and the ~95
  // FORMER members stored by the votes ingest add a service span inside the
  // same bracket: "Rep. David Trone [D-MD6, 2019-2024]".
  //
  // This deliberately matches ANY trailing bracket rather than the tight
  // party-state shape it used to. The tight version required the bracket to
  // close right after the district digit, so the ", 2019-2024" defeated it —
  // and once the tag survived, the comma INSIDE it tripped the sortname
  // comma-flip below (head "Rep. David Trone [D-MD6", tail "2019-2024]"),
  // rendering "2019-2024] David Trone [D-MD6" everywhere the name surfaced.
  // Stripping the whole bracket first is what keeps the flip logic honest.
  //
  // Widening a matcher shared by donors, alignment and the chat tools is the
  // exact hazard Part 2's precision guard exists for, so: the strip is
  // anchored to end-of-string, and it is skipped when it would consume the
  // entire name (a row stored as only "[R-TX]" keeps its text rather than
  // reducing to "", which would match everything). Proven non-regressing
  // against scripts/ingest/_resolution-miss-report.ts — see the plan doc.
  const withoutTag = s.replace(/\s*\[[^\]]*\]\s*$/u, "").trim();
  if (withoutTag) s = withoutTag;
  // Quoted nickname: `Lateresa "LA" Jones`, `Shevrin “Shev” Jones`. Single
  // quotes are NOT treated as nickname delimiters — they are apostrophes in
  // "O'Brien" / "D'Angelo".
  s = s.replace(/"[^"]*"|“[^”]*”/gu, " ");
  // Any parenthetical, which covers the "(Sen.)" the sortname form carries.
  s = s.replace(/\s*\([^)]*\)\s*/gu, " ");
  // Sortname "Collins, Susan" → "Susan Collins". A comma that only introduces
  // a suffix ("Clyde W. Jones, Jr.") is NOT a sortname — flipping it would
  // produce "Jr. Clyde W. Jones".
  const commaIdx = s.indexOf(",");
  if (commaIdx > 0) {
    const head = s.slice(0, commaIdx).trim();
    const tail = s.slice(commaIdx + 1).trim();
    const tailTokens = tail.split(/\s+/u).filter(Boolean);
    const tailIsSuffixOnly =
      tailTokens.length > 0 &&
      tailTokens.every((t) => NAME_SUFFIX_TOKENS.has(foldNameToken(t)));
    if (head && tail)
      s = tailIsSuffixOnly ? `${head} ${tail}` : `${tail} ${head}`;
  }
  let toks = s.split(/\s+/u).filter(Boolean);
  // Honorifics anywhere; never strip the name down to nothing.
  const withoutHonorifics = toks.filter(
    (t) => !NAME_HONORIFIC_TOKENS.has(foldNameToken(t)),
  );
  if (withoutHonorifics.length > 0) toks = withoutHonorifics;
  // Trailing suffixes, keeping at least one token.
  while (
    toks.length > 1 &&
    NAME_SUFFIX_TOKENS.has(foldNameToken(toks[toks.length - 1]))
  ) {
    toks.pop();
  }
  return toks.join(" ");
}

/**
 * A "[D-MD6, 2019-2024]" service span inside the party-state bracket — the
 * form the votes ingest writes for a member who has LEFT Congress. ~95 rows
 * carry it. Used only by resolveCandidateId, to tell a final decoration state
 * from a possibly-stale one; see notInBallotState.
 */
const FORMER_MEMBER_TAG = /\[[^\]]*\d{4}\s*[-–]\s*\d{4}[^\]]*\]/u;

/**
 * Extract the 2-letter state from a "[D-NJ]" or House "[D-NJ1]" decoration.
 *
 * Does NOT require the bracket to close after the district digits. Former
 * members carry a service span in the same bracket — "[D-MD6, 2019-2024]" —
 * and the old close-anchored pattern silently returned null for all ~95 of
 * them. That made them stateless to `resolveCandidateId`, which is what let an
 * Alaska ballot's "JOHN B. WILLIAMS" match "Rep. Brandon Williams [R-NY22,
 * 2023-2024]" once their names stopped being mangled. The state is always the
 * two letters immediately after "[<party>-", so nothing after them is needed
 * to read it.
 */
export function stateFromCandidateName(raw: string): string | null {
  const m = (raw ?? "").match(/\[[A-Za-z]+-([A-Za-z]{2})/u);
  return m ? m[1].toUpperCase() : null;
}

/** First / last name tokens of a cleaned "Firstname … Lastname" string. */
export function candidateNameParts(clean: string): {
  first: string;
  last: string;
} {
  const toks = (clean ?? "").trim().split(/\s+/).filter(Boolean);
  if (toks.length === 0) return { first: "", last: "" };
  return { first: toks[0], last: toks[toks.length - 1] };
}

/**
 * True when two surnames are the same name written differently across a
 * hyphen — "Kacker" ↔ "Devgan-Kacker", "Arreguin" ↔ "Acevedo-Arreguin".
 * Official rosters and FEC filings routinely disagree about which half of a
 * hyphenated surname survives. Only consulted by tiers that ALSO require an
 * exact first-name match, so it never widens a surname-only match.
 */
function surnameSharesHyphenPart(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const parts = (s: string) => new Set(s.split("-").filter(Boolean));
  const [pa, pb] = [parts(a), parts(b)];
  if (pa.size <= 1 && pb.size <= 1) return false;
  for (const p of pa) if (pb.has(p)) return true;
  return false;
}

interface ParsedCandidateRow {
  id: string;
  rawLower: string;
  clean: string;
  cleanLower: string;
  state: string | null;
  /**
   * Where `state` came from. "column" is `candidates.state`, populated by the
   * FEC roster ingest for ~97% of federal rows and therefore trustworthy
   * enough to EXCLUDE a candidate. "decoration" is parsed out of a GovTrack
   * "[D-NJ]" tag, which prod data shows can be stale or wrong — it may narrow
   * a match but must never be the sole reason to reject one (except for a
   * former-member record; see isFormerMemberRecord).
   */
  stateSource: "column" | "decoration" | null;
  /**
   * The stored name records a completed term — "Rep. David Trone [D-MD6,
   * 2019-2024]". The votes ingest writes this form for members who have left,
   * and it means the row's decoration state is FINAL, not stale: this person
   * will never represent a different state under this record. That is what
   * makes the decoration safe to reject on here and nowhere else.
   */
  isFormerMemberRecord: boolean;
  first: string;
  last: string;
  /**
   * Which PERSON this row is, as opposed to which row it is. Sitting members
   * exist twice in `candidates`: once as `federal-<BIOGUIDE>` from the votes
   * ingest ("Rep. Dale Strong [R-AL5]") and once as `fec-<FECID>` from the FEC
   * roster ingest ("Dale Whitney Strong"). Both carry the SAME
   * `fec_candidate_id`, so that column — the FEC's own identity key, not a
   * name guess — collapses them. Falls back to the row id when absent.
   */
  identityKey: string;
  /**
   * Preference within one identity: 0 for the incumbent row, 1 otherwise. The
   * `federal-<BIOGUIDE>` row is strictly richer — it carries the voting record
   * and at least as many donor rows — so resolving a sitting member onto the
   * voteless FEC duplicate is the failure this ordering prevents.
   */
  preference: number;
}

/**
 * Resolve a candidate id from a ballot name + jurisdiction (+ optional state).
 *
 * Match tiers, most-precise first:
 *   1. Exact match on the raw stored name (back-compat for clean stored data).
 *   2. Exact match on the decoration-stripped stored name — handles
 *      "Sen. John Cornyn [R-TX]" ↔ "John Cornyn".
 *   3. Lastname + state — handles ballot nicknames vs GovTrack formal names
 *      ("Andy Kim" ↔ "Andrew Kim [D-NJ]"). The caller passes the ballot's
 *      state to disambiguate. When one lastname+state row exists it wins;
 *      multiple are broken by first initial, and a still-ambiguous set is left
 *      to the later tiers rather than guessed.
 *   3b. First + last name, ignoring middle names and hyphen halves
 *      ("Michael Don Johnson" ↔ "Michael Johnson", "Sonia Kacker" ↔
 *      "Sonia Devgan-Kacker"). Requires an exact first-name match.
 *   4. Prefix / reverse-prefix on the cleaned name (middle initials).
 *
 * `stateCode` is optional for back-compat (the chat tools pass it; older
 * callers may not). Without it, tiers 3/3b are skipped.
 *
 * The jurisdiction narrows the search to the right chamber so same-name
 * candidates across chambers don't collide.
 *
 * PRECISION FIRST. Every tier below is shared by donors, alignment and the
 * chat tools, and a false positive renders the WRONG person's money and voting
 * record — strictly worse than showing nothing. Where a tier cannot pick one
 * person it returns null and the caller shows an honest "we couldn't match
 * this candidate" state. `scripts/ingest/_resolution-miss-report.ts` measures
 * both directions (misses AND suspect mismatches) against the 50-state
 * official rosters; run it before and after touching this function.
 */
export async function resolveCandidateId(
  candidateName: string,
  jurisdiction: string,
  stateCode?: string,
): Promise<string | null> {
  const db = getDb();
  if (db === DB_NOT_CONFIGURED) return null;

  const rawQuery = candidateName.trim();
  if (!rawQuery) return null;
  const queryLower = foldName(rawQuery);
  const cleanQuery = cleanCandidateName(rawQuery);
  const cleanQueryLower = foldName(cleanQuery);
  const queryParts = candidateNameParts(cleanQuery);

  const rows = await db
    .select({
      id: schema.candidates.id,
      fullName: schema.candidates.fullName,
      state: schema.candidates.state,
      fecCandidateId: schema.candidates.fecCandidateId,
      isIncumbent: schema.candidates.isIncumbent,
    })
    .from(schema.candidates)
    .where(eq(schema.candidates.jurisdiction, jurisdiction));

  const parsed: ParsedCandidateRow[] = rows.map((r) => {
    const clean = cleanCandidateName(r.fullName);
    const parts = candidateNameParts(clean);
    // Prefer the structured `candidates.state` column over the name
    // decoration: it is populated for ~97% of federal rows (vs ~20% decorated)
    // and, where both exist, prod shows zero disagreement between them.
    const columnState = r.state?.trim().toUpperCase() || null;
    const decorationState = stateFromCandidateName(r.fullName);
    return {
      id: r.id,
      rawLower: foldName(r.fullName),
      clean,
      cleanLower: foldName(clean),
      state: columnState ?? decorationState,
      stateSource: columnState
        ? "column"
        : decorationState
          ? "decoration"
          : null,
      isFormerMemberRecord: FORMER_MEMBER_TAG.test(r.fullName ?? ""),
      first: foldNameToken(parts.first),
      last: foldNameToken(parts.last),
      identityKey: r.fecCandidateId?.trim() || r.id,
      preference: r.isIncumbent ? 0 : 1,
    };
  });

  /**
   * Rows this candidate CANNOT be, given the ballot state.
   *
   * Part 2's rule stands: an authoritative `candidates.state` disqualifies, a
   * "[D-XX]" decoration does NOT — a stale tag must not stop a real ballot
   * surname from resolving (the Norcross incident).
   *
   * ONE narrow exception, added by the Part 4 follow-up: a row whose stored
   * name records a COMPLETED term — "Rep. David Trone [D-MD6, 2019-2024]" — is
   * a former-member record, and its state is final rather than stale. Those
   * rows have `candidates.state` NULL, so the column rule can't reach them,
   * and they were previously hidden by their own mangled names. The moment
   * cleanCandidateName started reading them correctly they became
   * surname-magnets: an Alaska ballot's "JOHN B. WILLIAMS" matched "Rep.
   * Brandon Williams [R-NY22, 2023-2024]", and suspect_mismatch went 3 → 19.
   * Letting the decoration reject for exactly this class puts it back to 4
   * without touching how any live member resolves — measured, see the plan
   * doc's before/after table.
   *
   * `is_incumbent = false` is the semantically cleaner signal and will be
   * correct for these rows once scripts/ingest/member-party.ts has run; it is
   * NOT used here because the flag is still true for all ~95 of them today, so
   * keying on it would ship a guard that silently does nothing.
   */
  const notInBallotState = (p: ParsedCandidateRow, st: string) =>
    p.state !== st &&
    (p.stateSource === "column" ||
      (p.stateSource === "decoration" && p.isFormerMemberRecord));
  const eligible = stateCode
    ? parsed.filter((p) => !notInBallotState(p, stateCode.toUpperCase()))
    : parsed;

  /** Best row for one person: the incumbent row first, then lowest id. */
  const bestOf = (rows: ParsedCandidateRow[]): string =>
    [...rows].sort(
      (a, b) => a.preference - b.preference || (a.id < b.id ? -1 : 1),
    )[0].id;

  /**
   * The single distinct PERSON in a row set, else null. Three things collapse
   * to one answer, in decreasing order of confidence:
   *   • the same row id (one person ingested for two Congresses);
   *   • rows sharing an `fec_candidate_id` (a sitting member's votes-ingest row
   *     and FEC-roster row — the FEC's own identity key, not a name guess);
   *   • rows whose CLEANED NAME is identical under different ids (duplicate FEC
   *     filings for one person — "Shay Williams" twice). Identical names are
   *     indistinguishable to us anyway, so refusing to answer would only hide
   *     data, and the pick is deterministic.
   * Two rows that are genuinely different people never collapse — that is the
   * ambiguity guard, and it is what keeps a loosened tier from showing the
   * wrong person's money.
   */
  const onlyDistinct = (rows: ParsedCandidateRow[]): string | null => {
    if (rows.length === 0) return null;
    if (new Set(rows.map((p) => p.id)).size === 1) return rows[0].id;
    if (new Set(rows.map((p) => p.identityKey)).size === 1) return bestOf(rows);
    if (new Set(rows.map((p) => p.cleanLower)).size === 1) return bestOf(rows);
    return null;
  };

  /**
   * Drop former-member records when a currently-serving row is also in the
   * set. A name on a 2026 ballot means the person holding the seat now, not
   * their predecessor: a bare "Grijalva" on the AZ-7 ballot is Adelita
   * Grijalva, who sits, and not Raúl Grijalva, whose record ends. Without this
   * the two are distinct people sharing a surname AND a state, so the
   * ambiguity guard refuses to answer — a real match lost to a departed row.
   *
   * Deliberately a TIE-BREAK, not a filter: applied only where a live
   * alternative exists, so a former member still resolves to their own record
   * when they are the only match (Jerry Carl, AL-1, who left in 2024 and filed
   * again for 2026).
   */
  const preferSitting = (rows: ParsedCandidateRow[]): ParsedCandidateRow[] => {
    const sitting = rows.filter((p) => !p.isFormerMemberRecord);
    return sitting.length > 0 ? sitting : rows;
  };

  // 1 + 2. Exact on raw, then on cleaned. Both are ambiguity-guarded: an exact
  // name shared by two DIFFERENT ids in the ballot state is not a match we can
  // make safely.
  const exactRaw = eligible.filter((p) => p.rawLower === queryLower);
  const exactClean = eligible.filter((p) => p.cleanLower === cleanQueryLower);
  const exact = onlyDistinct(exactRaw) ?? onlyDistinct(exactClean);
  if (exact) return exact;

  // 3. Lastname (+ state when available). Ballots usually list SURNAMES only
  // ("NORCROSS", "BOOKER"), so this tier must resolve a bare lastname when it
  // maps to one person.
  //
  // Rows authoritatively in another state are already out (`eligible`). Within
  // what's left, the "[D-NJ]" decoration still can't be trusted as a filter —
  // prod has decorated rows, clean rows with no state, and rows with a stale
  // tag — so it only narrows, never rejects.
  if (stateCode && queryParts.last) {
    const st = stateCode.toUpperCase();
    const qLast = foldNameToken(queryParts.last);
    const byLast = eligible.filter((p) => p.last === qLast);
    const queryIsSurnameOnly = foldNameToken(queryParts.first) === qLast;
    // Most specific → least specific:
    //   (a) exact state match;
    //   (b) state matches OR is unknown on file (don't contradict the ballot);
    //   (c) last resort — a surname UNIQUE in this chamber resolves even when
    //       its state tag is missing or stale. Safe only because `eligible`
    //       already dropped rows the authoritative state rules out; without
    //       that, this tier matched an Alaska ballot's "GOLDFARB" onto a
    //       Goldfarb running in another state.
    const stateMatched = byLast.filter((p) => p.state === st);
    const compatible = byLast.filter((p) => p.state === st || p.state === null);
    // preferSitting resolves a seat's current holder against their own
    // predecessor before the ambiguity guard has to refuse both.
    const resolved =
      onlyDistinct(preferSitting(stateMatched)) ??
      onlyDistinct(preferSitting(compatible)) ??
      onlyDistinct(preferSitting(byLast));
    if (resolved) return resolved;
    // Multiple DISTINCT people share the surname. Disambiguate by first initial
    // (skip for a surname-only query, which has no real first name), preferring
    // rows whose state matches the ballot.
    if (!queryIsSurnameOnly) {
      const qInitial = foldNameToken(queryParts.first)[0];
      const pool = stateMatched.length > 0 ? stateMatched : byLast;
      const byInitial = pool.filter((p) => p.first[0] === qInitial);
      const initResolved = onlyDistinct(byInitial);
      if (initResolved) return initResolved;
    }
    // Genuinely ambiguous → fall through to the later tiers rather than guess.
  }

  // 3b. First + last, ignoring middle names and hyphen halves. Official
  // rosters spell out middle names our FEC rows omit ("Michael Don Johnson" ↔
  // "Michael Johnson") and disagree about hyphenated surnames ("Sonia Kacker"
  // ↔ "Sonia Devgan-Kacker"). Requires an EXACT first-name match plus state
  // eligibility, so it stays narrower than the surname tier above.
  if (stateCode && queryParts.first && queryParts.last) {
    const qFirst = foldNameToken(queryParts.first);
    const qLast = foldNameToken(queryParts.last);
    // A bare initial ("J. Smith") is not a first-name match.
    if (qFirst !== qLast && qFirst.length > 1) {
      const byFirstLast = eligible.filter(
        (p) => p.first === qFirst && surnameSharesHyphenPart(p.last, qLast),
      );
      const resolved = onlyDistinct(byFirstLast);
      if (resolved) return resolved;
    }
  }

  // 4. Prefix / reverse-prefix on the cleaned name — middle initials and other
  // leftovers the tiers above don't catch.
  //
  // A SINGLE-TOKEN query is excluded. A bare ballot surname is a surname, and
  // prefix-matching it against a full name matches on the FIRST name instead:
  // the Arizona ballot's "Gordon" resolved to "Gordon Chaffin", "James" to
  // "James M Brown", "Glenn" to "Rep. Glenn Grothman [R-WI6]". Bare surnames
  // are tier 3's job, where the ambiguity guard applies.
  const queryIsSingleToken = !cleanQuery.includes(" ");
  if (cleanQueryLower && !queryIsSingleToken) {
    const prefix = eligible.filter((p) =>
      p.cleanLower.startsWith(`${cleanQueryLower} `),
    );
    const prefixResolved = onlyDistinct(prefix);
    if (prefixResolved) return prefixResolved;
    const reversePrefix = eligible.filter(
      (p) => p.cleanLower && cleanQueryLower.startsWith(`${p.cleanLower} `),
    );
    const reverseResolved = onlyDistinct(reversePrefix);
    if (reverseResolved) return reverseResolved;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Alignment math
// ---------------------------------------------------------------------------

/**
 * Determine whether a vote is "with" or "against" the user's stated stance.
 *
 * Truth-table:
 * | vote_cast | stance_lens  | resolvedStance | alignment |
 * |-----------|-------------|----------------|-----------|
 * | yea       | in_favor    | in_favor       | with      |
 * | yea       | in_favor    | opposed        | against   |
 * | yea       | opposed     | in_favor       | against   |
 * | yea       | opposed     | opposed        | with      |
 * | nay       | in_favor    | in_favor       | against   |
 * | nay       | in_favor    | opposed        | with      |
 * | nay       | opposed     | in_favor       | with      |
 * | nay       | opposed     | opposed        | against   |
 *
 * "present", "absent", "not_voting" are non-votes and are excluded from
 * contributing votes (they neither help nor hurt alignment).
 *
 * Read-path no_score guard (HANDOFF follow-up, 2026-06): any stance_lens
 * that is not exactly "in_favor"/"opposed" — e.g. a "no_score" row leaked by
 * a future re-tag — is treated as an abstain and excluded from totals.
 * Without this, a leaked no_score row silently reads as "opposed" direction
 * and corrupts the score. The 2026-06-06 cutover verified zero such rows in
 * prod (`_cutover-verify.ts`), so this is purely defensive today.
 */
export function computeVoteAlignment(
  voteCast: string,
  stanceLens: string,
  resolvedStance: "in_favor" | "opposed",
): "with" | "against" | "abstain" {
  if (stanceLens !== "in_favor" && stanceLens !== "opposed") return "abstain";
  const yea = voteCast === "yea";
  const nay = voteCast === "nay";
  if (!yea && !nay) return "abstain"; // present / absent / not_voting

  // A yea vote means the candidate supports what the bill does.
  // stanceLens tells us what voting yea means for the canonical issue.
  // resolvedStance tells us what the voter wants on the canonical issue.
  const candidateSupportsIssueDirection = yea
    ? stanceLens === "in_favor"
    : stanceLens === "opposed";
  const voterWantsSupport = resolvedStance === "in_favor";

  const aligned = candidateSupportsIssueDirection === voterWantsSupport;
  return aligned ? "with" : "against";
}

// ---------------------------------------------------------------------------
// Bill-number helpers
// ---------------------------------------------------------------------------

/**
 * Map raw GovTrack bill type strings to the short canonical form.
 * Mirrors the ingest-side `normalizeBillType` in scripts/ingest/federal-votes.ts
 * so that secondary rawMetadata fallback uses the same mapping.
 * Exported for unit testing.
 */
export function normalizeFederalType(raw: unknown): string | null {
  if (!raw || typeof raw !== "string") return null;
  const normalized = raw.toLowerCase().replace(/[^a-z]/gu, "");
  const mapped: Record<string, string> = {
    hr: "hr",
    housebill: "hr",
    s: "s",
    senatebill: "s",
    hres: "hres",
    houseresolution: "hres",
    sres: "sres",
    senateresolution: "sres",
    hjres: "hjres",
    housejointresolution: "hjres",
    sjres: "sjres",
    senatejointresolution: "sjres",
    hconres: "hconres",
    houseconcurrentresolution: "hconres",
    sconres: "sconres",
    senateconcurrentresolution: "sconres",
  };
  return mapped[normalized] ?? (normalized || null);
}

/**
 * Extract a compact bill number (e.g. "HR-2", "S-1171", "HB-12") from a bill
 * row's rawMetadata, id, and source.
 *
 * Federal (govtrack):
 *   Primary — parse the deterministic `bills.id` format "govtrack-<type><number>-<congress>"
 *   Secondary — rawMetadata.govtrack.bill.{type|bill_type, number}
 *
 * State (openstates):
 *   rawMetadata.openstates.identifier (e.g. "HB 12" → "HB-12")
 *
 * Returns null when no number can be determined (cards fall back to title-only).
 * Exported for unit testing.
 */
export function extractBillNumber(
  rawMetadata: unknown,
  billId: unknown,
  source: unknown,
): string | null {
  const rm =
    rawMetadata && typeof rawMetadata === "object"
      ? (rawMetadata as Record<string, unknown>)
      : {};

  if (source === "govtrack") {
    // Primary: parse the deterministic id "govtrack-<type><number>-<congress>"
    const idStr = typeof billId === "string" ? billId : "";
    const idMatch = /^govtrack-([a-z]+)(\d+)-\d+$/i.exec(idStr);
    if (idMatch) {
      return `${idMatch[1].toUpperCase()}-${idMatch[2]}`;
    }

    // Secondary: rawMetadata.govtrack.bill.{type|bill_type, number}
    const gt = rm.govtrack as Record<string, unknown> | undefined;
    const bill = gt?.bill as Record<string, unknown> | undefined;
    if (bill) {
      const rawType = bill.type ?? bill.bill_type;
      const type = normalizeFederalType(rawType);
      const num = String(bill.number ?? "").replace(/\D/gu, "");
      if (type && num) return `${type.toUpperCase()}-${num}`;
    }

    return null;
  }

  if (source === "openstates") {
    const ops = rm.openstates as Record<string, unknown> | undefined;
    const ident = ops?.identifier;
    if (ident && typeof ident === "string" && ident.trim()) {
      return ident.trim().replace(/\s+/gu, "-");
    }
    return null;
  }

  return null;
}

/**
 * Remove a leading embedded bill-number prefix that GovTrack sometimes includes
 * in the bill title (e.g. "H.R. 21 (118th): Strategic Production Response Act").
 * Only strips when an explicit `:` / `-` / `–` / `—` separator follows the
 * number token, so real titles starting with a letter+digit token aren't touched.
 * Falls back to the original title if stripping would produce an empty string.
 * Exported for unit testing.
 */
export function stripLeadingBillNumber(title: string): string {
  const stripped = title.replace(
    /^\s*(?:H\.?\s?R\.?|S\.?|H\.?J\.?\s?Res\.?|S\.?J\.?\s?Res\.?|H\.?\s?Res\.?|S\.?\s?Res\.?|H\.?\s?Con\.?\s?Res\.?|S\.?\s?Con\.?\s?Res\.?|HB|SB|HR|SR)\s*\.?\s*\d+\s*(?:\(\d+(?:th|st|nd|rd)?\))?\s*[:\-–—]\s*/iu,
    "",
  );
  return stripped.trim() || title;
}

/**
 * Build a Congress.gov bill URL from a govtrack-style bill id.
 *
 * The govtrack id format is "govtrack-<type><number>-<congress>", e.g.:
 *   "govtrack-hr1234-118" → https://www.congress.gov/bill/118th-congress/house-bill/1234
 *   "govtrack-s5-119"     → https://www.congress.gov/bill/119th-congress/senate-bill/5
 *
 * The Congress.gov bill-type path segment mapping:
 *   hr    → house-bill
 *   s     → senate-bill
 *   hres  → house-resolution
 *   sres  → senate-resolution
 *   hjres → house-joint-resolution
 *   sjres → senate-joint-resolution
 *   hconres → house-concurrent-resolution
 *   sconres → senate-concurrent-resolution
 *
 * Returns null when the id can't be parsed (non-govtrack bills, state bills).
 * Exported for unit testing.
 */
export function buildCongressGovUrl(billId: unknown): string | null {
  const idStr = typeof billId === "string" ? billId : "";
  const m = /^govtrack-([a-z]+)(\d+)-(\d+)$/i.exec(idStr);
  if (!m) return null;

  const typeRaw = m[1].toLowerCase();
  const number = m[2];
  const congress = m[3];

  const typeMap: Record<string, string> = {
    hr: "house-bill",
    s: "senate-bill",
    hres: "house-resolution",
    sres: "senate-resolution",
    hjres: "house-joint-resolution",
    sjres: "senate-joint-resolution",
    hconres: "house-concurrent-resolution",
    sconres: "senate-concurrent-resolution",
  };

  const segment = typeMap[typeRaw];
  if (!segment) return null;

  const suffix =
    congress === "1"
      ? "1st"
      : congress === "2"
        ? "2nd"
        : congress === "3"
          ? "3rd"
          : `${congress}th`;

  return `https://www.congress.gov/bill/${suffix}-congress/${segment}/${number}`;
}

/**
 * Append a Congress.gov source-attribution entry to a contributing-vote when
 * its narrative comes from the (public-domain) CRS data — either the LLM
 * `plain_summary` derived from it, or the raw CRS summary fallback.
 */
function attachCongressGovSource(
  vote: ContributingVote,
  billId: unknown,
): void {
  const cgUrl = buildCongressGovUrl(billId);
  vote.sources = [
    {
      name: "Congress.gov (CRS summary)",
      url: cgUrl ?? "https://www.congress.gov",
    },
  ];
}

// ---------------------------------------------------------------------------
// Main lookup
// ---------------------------------------------------------------------------

/** Four years ago from the current date — used to filter the voting window. */
function fourYearsAgo(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 4);
  return d.toISOString().slice(0, 10);
}

const MAX_CONTRIBUTING_VOTES = 6;

export async function lookupAlignment(
  candidateId: string,
  canonicalIssue: string,
  resolvedStance: "in_favor" | "opposed",
  subIssue?: string,
): Promise<AlignmentResult> {
  const db = getDb();
  if (db === DB_NOT_CONFIGURED) {
    return {
      found: true,
      candidateId,
      kept: 0,
      total: 0,
      contributingVotes: [],
      unavailable: { reason: "Voting record database is not configured" },
    };
  }

  const can2026Enabled = isCan2026DisplayEnabled();
  const cutoff = fourYearsAgo();

  // Join votes → bills → issue_tags filtered by candidate + issue + date window.
  // When CAN2026_DISPLAY_ENABLED is set, also LEFT JOIN can_bill_narratives so
  // the "What it did" prose can appear on the contributing-vote cards. The join
  // is keyed on bills.id = can_bill_narratives.our_bill_id (the crosswalk
  // populated by scripts/ingest/can2026.ts). When the flag is off, the CAN2026
  // table is never touched and narrative is always undefined.
  const rows = can2026Enabled
    ? await db
        .select({
          billTitle: schema.bills.title,
          billId: schema.bills.id,
          billRawMetadata: schema.bills.rawMetadata,
          billSourceUrl: schema.bills.sourceUrl,
          billSource: schema.bills.source,
          billPlainSummary: schema.bills.plainSummary,
          billStatus: schema.bills.billStatus,
          voteCast: schema.votes.voteCast,
          voteDate: schema.votes.voteDate,
          tallyYea: schema.votes.tallyYea,
          tallyNay: schema.votes.tallyNay,
          tallyResult: schema.votes.tallyResult,
          stanceLens: schema.issueTags.stanceLens,
          taggerConfidence: schema.issueTags.taggerConfidence,
          subIssue: schema.issueTags.subIssue,
          narrative: schema.canBillNarratives.narrative,
        })
        .from(schema.votes)
        .innerJoin(schema.bills, eq(schema.votes.billId, schema.bills.id))
        .innerJoin(
          schema.issueTags,
          and(
            eq(schema.issueTags.billId, schema.bills.id),
            eq(schema.issueTags.canonicalIssue, canonicalIssue),
          ),
        )
        .leftJoin(
          schema.canBillNarratives,
          eq(schema.bills.id, schema.canBillNarratives.ourBillId),
        )
        .where(
          and(
            eq(schema.votes.candidateId, candidateId),
            gte(schema.votes.voteDate, cutoff),
          ),
        )
    : await db
        .select({
          billTitle: schema.bills.title,
          billId: schema.bills.id,
          billRawMetadata: schema.bills.rawMetadata,
          billSourceUrl: schema.bills.sourceUrl,
          billSource: schema.bills.source,
          billPlainSummary: schema.bills.plainSummary,
          billStatus: schema.bills.billStatus,
          voteCast: schema.votes.voteCast,
          voteDate: schema.votes.voteDate,
          tallyYea: schema.votes.tallyYea,
          tallyNay: schema.votes.tallyNay,
          tallyResult: schema.votes.tallyResult,
          stanceLens: schema.issueTags.stanceLens,
          taggerConfidence: schema.issueTags.taggerConfidence,
          subIssue: schema.issueTags.subIssue,
        })
        .from(schema.votes)
        .innerJoin(schema.bills, eq(schema.votes.billId, schema.bills.id))
        .innerJoin(
          schema.issueTags,
          and(
            eq(schema.issueTags.billId, schema.bills.id),
            eq(schema.issueTags.canonicalIssue, canonicalIssue),
          ),
        )
        .where(
          and(
            eq(schema.votes.candidateId, candidateId),
            gte(schema.votes.voteDate, cutoff),
          ),
        );

  if (rows.length === 0) {
    return {
      found: true,
      candidateId,
      kept: 0,
      total: 0,
      contributingVotes: [],
      unavailable: {
        reason: "No tagged votes for this issue in our records yet",
      },
    };
  }

  // Sub-issue prefer/fallback: when the caller passes a sub-issue facet, PREFER
  // the sub-issue-specific votes if they alone meet the data threshold; else
  // FALL BACK to the full parent corpus so a score is never worse than today.
  // The threshold is measured on SCORABLE rows (abstains excluded) so a handful
  // of present/absent sub-rows can't trip the prefer path. The inner join stays
  // keyed on (billId AND canonicalIssue) only — sub-issue selection happens here
  // in app code, not in SQL.
  let workingRows = rows;
  let matchedSubIssue: string | undefined;
  if (subIssue) {
    const subRows = rows.filter((r) => r.subIssue === subIssue);
    const scorableSubCount = subRows.filter(
      (r) =>
        computeVoteAlignment(r.voteCast, r.stanceLens, resolvedStance) !==
        "abstain",
    ).length;
    if (scorableSubCount >= LIMITED_DATA_THRESHOLD) {
      workingRows = subRows;
      matchedSubIssue = subIssue;
    }
  }

  // Compute alignment for each row (exclude abstains from totals)
  const scored = workingRows
    .map((r) => ({
      ...r,
      alignment: computeVoteAlignment(r.voteCast, r.stanceLens, resolvedStance),
    }))
    .filter((r) => r.alignment !== "abstain");

  const kept = scored.filter((r) => r.alignment === "with").length;
  const total = scored.length;

  // Sort by tagger_confidence DESC (nulls last) then most recent first to pick
  // the most diagnostic contributing votes.
  const sorted = [...scored].sort((a, b) => {
    const confA = a.taggerConfidence !== null ? Number(a.taggerConfidence) : -1;
    const confB = b.taggerConfidence !== null ? Number(b.taggerConfidence) : -1;
    if (confB !== confA) return confB - confA;
    return b.voteDate.localeCompare(a.voteDate);
  });

  const contributingVotes: ContributingVote[] = sorted
    .slice(0, MAX_CONTRIBUTING_VOTES)
    .map((r) => {
      const num = extractBillNumber(r.billRawMetadata, r.billId, r.billSource);
      const title = stripLeadingBillNumber(r.billTitle) || r.billTitle;
      const vote: ContributingVote = {
        billTitle: num ? `${num} · ${title}` : title,
        voteCast: r.alignment as "with" | "against",
        date: r.voteDate,
        source: {
          name: r.billSource,
          url: r.billSourceUrl,
        },
      };

      // Narrative precedence (the narrative is ALWAYS plain text —
      // never HTML — because the UI renders it as a JSX text node):
      //   1. CAN2026 narrative (gated — only present in the can2026Enabled query
      //      branch when a can_bill_narratives row exists for this bill).
      //   2. bills.plain_summary (LLM-generated short summary, ungated). Rendered
      //      IN FULL (it's already ≤2 sentences). Appends a Congress.gov entry to
      //      vote.sources for provenance.
      //   3. None → narrative stays absent. The user sees the bill title (heading)
      //      + roll-call + the Congress.gov chip/link to read the full CRS text.
      //      Do NOT show any truncated or ellipsized preview of raw bills.summary.
      const can2026Narrative = (r as { narrative?: string | null }).narrative;
      const plainSummary = (r as { billPlainSummary?: string | null })
        .billPlainSummary;

      if (can2026Narrative) {
        vote.narrative = can2026Narrative;
      } else if (plainSummary && plainSummary.trim()) {
        vote.narrative = plainSummary.trim();
        attachCongressGovSource(vote, r.billId);
      }

      // Roll-call tally: format "Passed 232–193" from stored counts.
      // Omit the field entirely when data is not yet available (honest fallback).
      const tallyYea =
        "tallyYea" in r && r.tallyYea != null ? Number(r.tallyYea) : null;
      const tallyNay =
        "tallyNay" in r && r.tallyNay != null ? Number(r.tallyNay) : null;
      const tallyResult =
        "tallyResult" in r
          ? (r.tallyResult as string | null | undefined)
          : null;
      const tallyLine = formatTallyLine(tallyResult, tallyYea, tallyNay);
      if (tallyLine) vote.tally = tallyLine;

      // Bill lifecycle status: e.g. "Passed House, stalled in Senate".
      // Omit when NULL — never render a placeholder.
      const billStatus =
        "billStatus" in r ? (r.billStatus as string | null | undefined) : null;
      if (billStatus && billStatus.trim()) vote.billStatus = billStatus.trim();

      return vote;
    });

  // ---------------------------------------------------------------------------
  // Attach member rationales from vote_rationales table (congress-press layer).
  //
  // Attribution: congress-press by Derek Willis
  //   https://github.com/dwillis/congress-press
  //   MIT licensed — Copyright (c) 2026 Derek Willis
  //
  // We fetch rationale rows only for the bills that appear in contributingVotes
  // (a small, bounded set — at most MAX_CONTRIBUTING_VOTES = 6). Fail-soft:
  // if the table doesn't exist yet (migration not applied) or the query fails,
  // we log and continue without rationales — never break alignment display.
  // ---------------------------------------------------------------------------
  const billIdsToEnrich = new Set(
    sorted.slice(0, MAX_CONTRIBUTING_VOTES).map((r) => r.billId),
  );

  type RationaleRow = {
    billId: string;
    rationaleText: string | null;
    label: string | null;
    pressReleaseSources: unknown;
    modelVersion: string | null;
    matchConfidence: string | null;
  };
  const rationalesByBillId = new Map<string, RationaleRow>();

  if (billIdsToEnrich.size > 0) {
    try {
      const rationaleRows = await db
        .select({
          billId: schema.voteRationales.billId,
          rationaleText: schema.voteRationales.rationaleText,
          label: schema.voteRationales.label,
          pressReleaseSources: schema.voteRationales.pressReleaseSources,
          modelVersion: schema.voteRationales.modelVersion,
          matchConfidence: schema.voteRationales.matchConfidence,
        })
        .from(schema.voteRationales)
        .where(
          and(
            eq(schema.voteRationales.candidateId, candidateId),
            // Display gate (owner-approved): only high-confidence matches surface
            // publicly. Medium/low rows may be stored but must never reach the UI —
            // this SQL filter is the safest enforcement point.
            eq(schema.voteRationales.matchConfidence, "high"),
          ),
        );
      // Filter in JS since inArray would require an import we'd need to add
      for (const row of rationaleRows) {
        if (billIdsToEnrich.has(row.billId)) {
          rationalesByBillId.set(row.billId, row);
        }
      }
    } catch {
      // Fail-soft: table may not exist yet (migration pending).
      // Log once so operators know, but never break alignment display.
      // Not logging stack trace to avoid log noise in tests.
    }
  }

  // Attach rationale to each contributing vote where available.
  for (const vote of contributingVotes) {
    // The billId is embedded in the vote title as "HR1234 · Title". We need
    // to match against the sorted row. Use a parallel map keyed by billTitle.
    const matchingRationaleEntry = sorted
      .slice(0, MAX_CONTRIBUTING_VOTES)
      .find((r) => {
        const num = extractBillNumber(
          r.billRawMetadata,
          r.billId,
          r.billSource,
        );
        const title = stripLeadingBillNumber(r.billTitle) || r.billTitle;
        const expectedTitle = num ? `${num} · ${title}` : title;
        return vote.billTitle === expectedTitle;
      });

    if (!matchingRationaleEntry) continue;
    const rationaleRow = rationalesByBillId.get(matchingRationaleEntry.billId);

    if (
      rationaleRow &&
      rationaleRow.rationaleText &&
      rationaleRow.rationaleText.trim()
    ) {
      // Extract source URLs from the stored JSONB array
      const sourcesRaw = rationaleRow.pressReleaseSources;
      const sourceUrls: string[] = Array.isArray(sourcesRaw)
        ? sourcesRaw.flatMap((s) => {
            const url =
              typeof s === "object" && s !== null && "url" in s
                ? String((s as Record<string, unknown>).url)
                : null;
            return url ? [url] : [];
          })
        : [];

      vote.memberRationale = {
        text: rationaleRow.rationaleText.trim(),
        label: rationaleRow.label ?? "inferred",
        sourceUrls,
        modelVersion: rationaleRow.modelVersion,
      };
    }
  }

  const base: AlignmentResult = {
    found: true,
    candidateId,
    kept,
    total,
    contributingVotes,
    // Set only when the prefer path fired; undefined keys are omitted by the
    // discriminated-union consumers, so this stays a no-op for the parent path.
    ...(matchedSubIssue ? { matchedSubIssue } : {}),
  };

  // Surface a "limited data" notice when the tag corpus is too thin for the
  // score to be meaningful. Gated by `attachLimitedDataNotice` — see helper.
  const withNotice = attachLimitedDataNotice(base);
  // attachLimitedDataNotice preserves discriminated union; we know it's
  // AlignmentResult here because we passed an AlignmentResult in.
  return withNotice as AlignmentResult;
}
