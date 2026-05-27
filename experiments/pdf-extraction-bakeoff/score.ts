/**
 * PDF Extraction Bakeoff — score.ts
 *
 * Loads ground-truth and contender outputs, computes per-cell scores for all 8
 * criteria in decision-design.md, writes results/score-matrix.json.
 *
 * Auto-scored: 1 (race coverage), 2 (candidate completeness), 5 (schema
 * compliance), 6 (cost), 7 (latency).
 * Heuristic-suggested (with confidence): 3 (structural accuracy),
 * 4 (non-ballot filtering), 8 (bilingual handling — Hidalgo only).
 *
 * --- Judgment calls documented inline ---
 * - Race-match key: (normalized_office, normalized_party_context). District is
 *   informational, not a key. The decision-design says "match by normalized
 *   office string" but that was written before the NJ multi-party reality —
 *   match-by-office-only collapses 6 NJ races into 3 and breaks scoring.
 * - Candidate matching: layered rules — Lev ≤ 2 OR substring after
 *   normalization OR shared token of length ≥ 4. The spec's literal "Lev ≤ 2"
 *   would zero out C2's NJ output (which emits surnames only) and fails to
 *   reflect that names WERE captured, just truncated.
 * - Criterion 2 score for unmatched races: counted as 0% candidate coverage
 *   for that race (not skipped), matching spec line 197 "for each MATCHED race"
 *   read in context with the design's overall "extract everything" goal.
 * - Schema validation: hand-rolled (no ajv in deps; not adding a dep for one
 *   script). Validates structural shape + enum values.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ---------- paths ----------

const BAKEOFF_DIR = dirname(fileURLToPath(import.meta.url));
const GROUND_TRUTH_DIR = join(BAKEOFF_DIR, "ground-truth");
const RESULTS_DIR = join(BAKEOFF_DIR, "results");

// ---------- shared types (mirror runners/_shared.ts shapes) ----------

type Candidate = {
  name: string | null;
  party: string | null;
  ballot_position: string | null;
  placeholder_reason: "no_petition_filed" | "write_in" | null;
};

type Race = {
  office: string;
  district: string | null;
  position: string | null;
  vote_for_n: number;
  party_context: string | null;
  candidates: Candidate[];
};

type Section = {
  section_name: string;
  races: Race[];
};

type Ballot = {
  election_metadata: {
    election_date: string | null;
    election_type: string | null;
    jurisdiction: string | null;
    ballot_style?: string | null;
  };
  sections: Section[];
};

// ---------- fixture/contender registry ----------

const FIXTURES = [
  "tx-harris-2026-dem-runoff.pdf",
  "fl-orange-2026-composite.pdf",
  "tx-hidalgo-2026-bilingual.pdf",
  "nj-camden-2026-primary.pdf",
];

const WEIGHTS: Record<string, number> = {
  "tx-harris-2026-dem-runoff.pdf": 1,
  "fl-orange-2026-composite.pdf": 1.5,
  "tx-hidalgo-2026-bilingual.pdf": 2,
  "nj-camden-2026-primary.pdf": 2,
};

const CONTENDERS = ["01-textract-sonnet", "02-sonnet-vision", "03-docling-sonnet"];

// ---------- normalization ----------

function normOffice(office: string | null | undefined): string {
  if (!office) return "";
  let s = office.toLowerCase();
  // Strip punctuation
  s = s.replace(/[.,;:'"!?()/\\-]/g, " ");
  // Collapse whitespace. Do NOT strip "district"/"position"/court-pattern
  // tokens — that previously caused 13th Court of Appeals to falsely match
  // Supreme Court Justice. The fuzzy office matcher (substring + 80%
  // token-subset) handles the legitimate "shorter office vs longer office"
  // cases without over-collapsing distinct races.
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function normPartyContext(pc: string | null | undefined): string {
  if (!pc) return "";
  return pc.toLowerCase().trim();
}

function normName(name: string | null | undefined): string {
  if (!name) return "";
  return name.toLowerCase().replace(/[.,;:'"!?()/\\-]/g, " ").replace(/\s+/g, " ").trim();
}

function normSection(name: string | null | undefined): string {
  if (!name) return "";
  return name.toLowerCase().trim();
}

// ---------- Levenshtein (small inputs; O(mn) is fine) ----------

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

// ---------- name matching (layered) ----------

function namesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normName(a);
  const nb = normName(b);
  if (!na || !nb) return false;
  // Rule 1: Levenshtein ≤ 2 on normalized full name
  if (levenshtein(na, nb) <= 2) return true;
  // Rule 2: substring (catches "booker" in "cory booker")
  if (na.includes(nb) || nb.includes(na)) return true;
  // Rule 3: shared token of length ≥ 4 (catches "MILLER, JR." vs "Joseph MILLER, JR.")
  const ta = new Set(na.split(" ").filter((t) => t.length >= 4));
  const tb = new Set(nb.split(" ").filter((t) => t.length >= 4));
  for (const t of ta) if (tb.has(t)) return true;
  return false;
}

// ---------- race matching ----------
//
// Key components:
// - normalized office string
// - normalized district (informational disambiguator — matters for "State
//   Representative district 35" vs "State Representative district 37")
// - normalized position (e.g. "Place 7", "Group 15")
// - party_context (matters for NJ multi-party — both DEM and REP versions
//   of the same office must NOT collapse)
//
// party_context match is relaxed:
// - Both null → match
// - Both same non-null value → match
// - One null, one non-null → treat as match (covers the case where GT marks
//   a single-party ballot's party_context=null while an extractor over-tags
//   it with the primary's party). The structural disagreement is penalized
//   under criterion 3 (structural accuracy), not criterion 1 (race coverage).
// - Both non-null but different → no match

type RaceKey = {
  office: string;
  district: string;
  position: string;
  party_context: string;
};

function normField(s: string | null | undefined): string {
  // Used for district/position field normalization.
  if (!s) return "";
  let out = s.toLowerCase().replace(/[.,;:'"!?()/\\-]/g, " ");
  // Strip the leading word "district " so "District 8" normalizes to "8"
  // and matches the contender that emits district="8" without the label.
  // Same for "position".
  out = out.replace(/^\s*district\b/g, " ").replace(/^\s*position\b/g, " ");
  out = out.replace(/\s+/g, " ").trim();
  return out;
}

function raceKey(r: Race): RaceKey {
  return {
    office: normOffice(r.office),
    district: normField(r.district),
    position: normField(r.position),
    party_context: normPartyContext(r.party_context),
  };
}

function nullableCompatible(a: string, b: string): boolean {
  // Both null/empty → match. Both same non-null → match.
  // One null one non-null → match (treat null as wildcard).
  // Both non-null but different → no match.
  if (a === b) return true;
  if (a === "" || b === "") return true;
  return false;
}

function districtCompatible(a: string, b: string): boolean {
  // Like nullableCompatible but with substring match on non-empty values.
  // Catches the case where GT carries verbose district ("206th Judicial
  // District") while contender emits the leading number ("206"). Either
  // way, the underlying race is the same.
  if (a === b) return true;
  if (a === "" || b === "") return true;
  // Number-prefix match: if one side is a pure number and the other starts
  // with that number followed by ordinal-suffix or non-digit, match.
  const numA = a.match(/^\d+/);
  const numB = b.match(/^\d+/);
  if (numA && numB && numA[0] === numB[0]) return true;
  // Substring match in either direction
  if (a.includes(b) || b.includes(a)) return true;
  return false;
}

const OFFICE_STOPWORDS = new Set([
  "of", "the", "and", "for", "in", "on", "at", "to", "a", "an", "or",
  "be", "is", "shall", "no", "office", // "no" appears in "no 1 constitutional amendment"
]);

function officeSigTokens(s: string): Set<string> {
  return new Set(
    s.split(" ").filter((t) => t.length > 0 && !OFFICE_STOPWORDS.has(t)),
  );
}

function officesFuzzyMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  // Substring match (catches "Sixth District Court of Appeal Judge" being a
  // substring of "Shall Judge X of the Sixth District Court of Appeal").
  if (a.includes(b) || b.includes(a)) return true;
  // Token-near-subset match: the smaller side's significant tokens must
  // be ≥(size-1) overlapping with the larger side. Allows one off-by-one
  // (e.g., "retention" vs "retained" — same idea, different inflection).
  // To avoid collapsing distinct races (e.g., Amendment 1 vs Amendment 2),
  // require ≥3 significant tokens AND ≥80% overlap of the smaller set.
  const ta = officeSigTokens(a);
  const tb = officeSigTokens(b);
  if (ta.size === 0 || tb.size === 0) return false;
  const [smaller, larger] = ta.size <= tb.size ? [ta, tb] : [tb, ta];
  if (smaller.size < 3) return false;
  let shared = 0;
  for (const t of smaller) if (larger.has(t)) shared++;
  if (shared / smaller.size >= 0.8) return true;
  return false;
}

function raceKeyEqual(a: RaceKey, b: RaceKey): boolean {
  // Office: fuzzy match (substring or token overlap). Captures different
  // structural conventions in the office name (e.g., GT uses prose-y
  // "Shall Judge X of Sixth District Court be retained" while contender
  // uses crisp "Sixth District Court of Appeal Judge" with position field).
  // District: number-prefix or substring match (handles "206" vs "206th
  // Judicial District"). Nullable wildcard.
  // Position, party_context: nullable wildcard semantics — informational
  // fields where the GT may carry context the extractor omits, or vice versa.
  // Strict disagreements are penalized under criterion 3 (structural).
  return (
    officesFuzzyMatch(a.office, b.office) &&
    districtCompatible(a.district, b.district) &&
    nullableCompatible(a.position, b.position) &&
    nullableCompatible(a.party_context, b.party_context)
  );
}

function flattenRaces(ballot: Ballot): Array<{ section_name: string; race: Race }> {
  const out: Array<{ section_name: string; race: Race }> = [];
  for (const sec of ballot.sections ?? []) {
    for (const race of sec.races ?? []) {
      out.push({ section_name: sec.section_name, race });
    }
  }
  return out;
}

// ---------- criterion 1: race coverage ----------

type Crit1Result = {
  score: 0 | 1 | 2;
  raw_pct: number;
  matched: number;
  total: number;
  matched_pairs: Array<{ gt_index: number; ex_index: number }>;
};

function scoreCriterion1(gt: Ballot, ex: Ballot): Crit1Result {
  const gtRaces = flattenRaces(gt);
  const exRaces = flattenRaces(ex);
  const used = new Set<number>();
  const matched_pairs: Array<{ gt_index: number; ex_index: number }> = [];
  let matched = 0;
  for (let i = 0; i < gtRaces.length; i++) {
    const gtKey = raceKey(gtRaces[i].race);
    let found = -1;
    for (let j = 0; j < exRaces.length; j++) {
      if (used.has(j)) continue;
      if (raceKeyEqual(raceKey(exRaces[j].race), gtKey)) {
        found = j;
        break;
      }
    }
    if (found >= 0) {
      matched++;
      used.add(found);
      matched_pairs.push({ gt_index: i, ex_index: found });
    }
  }
  const total = gtRaces.length;
  const raw_pct = total === 0 ? 0 : (matched / total) * 100;
  let score: 0 | 1 | 2;
  if (raw_pct >= 90) score = 2;
  else if (raw_pct >= 70) score = 1;
  else score = 0;
  return { score, raw_pct: Number(raw_pct.toFixed(2)), matched, total, matched_pairs };
}

// ---------- criterion 2: candidate completeness ----------

type Crit2Result = {
  score: 0 | 1 | 2;
  raw_pct: number;
  per_race: Array<{ office: string; party_context: string; matched: number; total: number; pct: number }>;
};

function scoreCriterion2(gt: Ballot, ex: Ballot, c1: Crit1Result): Crit2Result {
  const gtRaces = flattenRaces(gt);
  const exRaces = flattenRaces(ex);
  const per_race: Crit2Result["per_race"] = [];
  const pcts: number[] = [];
  // For every ground-truth race, score candidate completeness. If the race
  // wasn't matched in criterion 1, that race contributes 0% (not skipped).
  for (let i = 0; i < gtRaces.length; i++) {
    const gtRace = gtRaces[i].race;
    const matched_pair = c1.matched_pairs.find((p) => p.gt_index === i);
    const gtCandidates = gtRace.candidates ?? [];
    const total = gtCandidates.length;
    let raceMatched = 0;
    if (matched_pair) {
      const exRace = exRaces[matched_pair.ex_index].race;
      const exCandidates = exRace.candidates ?? [];
      const used = new Set<number>();
      for (const gtC of gtCandidates) {
        // Special handling: placeholder candidates (write_in, no_petition_filed)
        // match on placeholder_reason rather than name.
        if (gtC.placeholder_reason) {
          let found = -1;
          for (let j = 0; j < exCandidates.length; j++) {
            if (used.has(j)) continue;
            if (exCandidates[j].placeholder_reason === gtC.placeholder_reason) {
              found = j;
              break;
            }
          }
          if (found >= 0) {
            raceMatched++;
            used.add(found);
          }
        } else {
          // Real candidate: match by name with layered rules
          let found = -1;
          for (let j = 0; j < exCandidates.length; j++) {
            if (used.has(j)) continue;
            if (exCandidates[j].placeholder_reason) continue; // skip placeholders for name match
            if (namesMatch(gtC.name, exCandidates[j].name)) {
              found = j;
              break;
            }
          }
          if (found >= 0) {
            raceMatched++;
            used.add(found);
          }
        }
      }
    }
    const pct = total === 0 ? 100 : (raceMatched / total) * 100;
    per_race.push({
      office: normOffice(gtRace.office),
      party_context: normPartyContext(gtRace.party_context),
      matched: raceMatched,
      total,
      pct: Number(pct.toFixed(2)),
    });
    pcts.push(pct);
  }
  const raw_pct = pcts.length === 0 ? 0 : pcts.reduce((s, x) => s + x, 0) / pcts.length;
  let score: 0 | 1 | 2;
  if (raw_pct >= 90) score = 2;
  else if (raw_pct >= 70) score = 1;
  else score = 0;
  return { score, raw_pct: Number(raw_pct.toFixed(2)), per_race };
}

// ---------- criterion 5: schema compliance ----------

const SECTION_NAMES = new Set([
  "Federal",
  "State",
  "County",
  "Municipal",
  "Judicial",
  "Propositions",
]);

const ELECTION_TYPES = new Set(["primary", "primary_runoff", "general", "special"]);

const PLACEHOLDER_REASONS = new Set([null, "no_petition_filed", "write_in"]);

type Crit5Result = {
  score: 0 | 1 | 2;
  valid: boolean;
  warnings: string[];
  errors: string[];
};

function scoreCriterion5(ex: Ballot): Crit5Result {
  const warnings: string[] = [];
  const errors: string[] = [];
  // election_metadata
  if (!ex.election_metadata) {
    errors.push("missing election_metadata");
  } else {
    const em = ex.election_metadata;
    if (!em.election_date) warnings.push("election_metadata.election_date is null");
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(em.election_date))
      errors.push(`election_date not YYYY-MM-DD: ${em.election_date}`);
    if (!em.election_type) warnings.push("election_metadata.election_type is null");
    else if (!ELECTION_TYPES.has(em.election_type))
      errors.push(`election_type not in enum: ${em.election_type}`);
    if (!em.jurisdiction) warnings.push("election_metadata.jurisdiction is null");
  }
  // sections
  if (!Array.isArray(ex.sections)) {
    errors.push("sections is not an array");
  } else {
    for (let si = 0; si < ex.sections.length; si++) {
      const sec = ex.sections[si];
      if (!SECTION_NAMES.has(sec.section_name)) {
        warnings.push(`sections[${si}].section_name not in enum: ${sec.section_name}`);
      }
      if (!Array.isArray(sec.races)) {
        errors.push(`sections[${si}].races is not an array`);
        continue;
      }
      for (let ri = 0; ri < sec.races.length; ri++) {
        const r = sec.races[ri];
        if (typeof r.office !== "string" || !r.office) {
          errors.push(`sections[${si}].races[${ri}].office invalid`);
        }
        if (typeof r.vote_for_n !== "number" || r.vote_for_n < 1) {
          errors.push(`sections[${si}].races[${ri}].vote_for_n invalid`);
        }
        if (!Array.isArray(r.candidates)) {
          errors.push(`sections[${si}].races[${ri}].candidates not an array`);
          continue;
        }
        for (let ci = 0; ci < r.candidates.length; ci++) {
          const c = r.candidates[ci];
          if (!PLACEHOLDER_REASONS.has(c.placeholder_reason)) {
            errors.push(
              `sections[${si}].races[${ri}].candidates[${ci}].placeholder_reason invalid: ${c.placeholder_reason}`,
            );
          }
          if (c.placeholder_reason === null && (c.name === null || c.name === "")) {
            warnings.push(
              `sections[${si}].races[${ri}].candidates[${ci}] has null name without placeholder_reason`,
            );
          }
        }
      }
    }
  }
  let score: 0 | 1 | 2;
  if (errors.length > 0) score = 0;
  else if (warnings.length > 0) score = 1;
  else score = 2;
  return { score, valid: errors.length === 0, warnings, errors };
}

// ---------- criterion 3: structural accuracy (heuristic) ----------

type Crit3Result = {
  score: 0 | 1 | 2;
  suggested_by: "auto";
  confidence: "high" | "medium" | "low";
  reasoning: string;
  sub_checks: {
    section_match_pct: number; // % of matched races where section_name matches GT
    vote_for_n_match_pct: number; // % of matched races where vote_for_n matches GT
    placeholder_count_match_pct: number; // % of matched races where (write_in count, no_petition count) match
    party_context_exact_match_pct: number; // % of matched races where party_context EXACTLY matches GT (penalizes null-vs-Democratic_Primary)
  };
};

function scoreCriterion3(gt: Ballot, ex: Ballot, c1: Crit1Result): Crit3Result {
  const gtRaces = flattenRaces(gt);
  const exRaces = flattenRaces(ex);
  let sectionMatch = 0;
  let voteForNMatch = 0;
  let placeholderMatch = 0;
  let partyContextExact = 0;
  let total = 0;
  for (const pair of c1.matched_pairs) {
    total++;
    const gtPair = gtRaces[pair.gt_index];
    const exPair = exRaces[pair.ex_index];
    if (normSection(gtPair.section_name) === normSection(exPair.section_name)) {
      sectionMatch++;
    }
    if (gtPair.race.vote_for_n === exPair.race.vote_for_n) {
      voteForNMatch++;
    }
    // placeholder count match: count write_in and no_petition placeholders
    const gtWriteIn = (gtPair.race.candidates ?? []).filter((c) => c.placeholder_reason === "write_in").length;
    const exWriteIn = (exPair.race.candidates ?? []).filter((c) => c.placeholder_reason === "write_in").length;
    const gtNoPet = (gtPair.race.candidates ?? []).filter((c) => c.placeholder_reason === "no_petition_filed").length;
    const exNoPet = (exPair.race.candidates ?? []).filter((c) => c.placeholder_reason === "no_petition_filed").length;
    if (gtWriteIn === exWriteIn && gtNoPet === exNoPet) {
      placeholderMatch++;
    }
    // party_context strict equality
    if (normPartyContext(gtPair.race.party_context) === normPartyContext(exPair.race.party_context)) {
      partyContextExact++;
    }
  }
  const section_match_pct = total === 0 ? 0 : (sectionMatch / total) * 100;
  const vote_for_n_match_pct = total === 0 ? 0 : (voteForNMatch / total) * 100;
  const placeholder_count_match_pct = total === 0 ? 0 : (placeholderMatch / total) * 100;
  const party_context_exact_match_pct = total === 0 ? 0 : (partyContextExact / total) * 100;
  // Score 2 if all four pass at ≥95%; 1 if at least one passes at ≥95%; 0 otherwise.
  // Penalize empty-sections cases (total == 0) with score 0.
  const subPasses = [
    section_match_pct,
    vote_for_n_match_pct,
    placeholder_count_match_pct,
    party_context_exact_match_pct,
  ].filter((p) => p >= 95).length;
  let score: 0 | 1 | 2;
  if (total === 0) score = 0;
  else if (subPasses === 4) score = 2;
  else if (subPasses >= 1) score = 1;
  else score = 0;
  // Confidence: high if all-pass or all-fail; medium when partial (judgment territory).
  const confidence: Crit3Result["confidence"] = subPasses === 4 || subPasses === 0 ? "high" : "medium";
  const reasoning =
    total === 0
      ? "no matched races to score against"
      : `section_match=${section_match_pct.toFixed(0)}%, vote_for_n_match=${vote_for_n_match_pct.toFixed(0)}%, placeholder_count_match=${placeholder_count_match_pct.toFixed(0)}%, party_context_exact=${party_context_exact_match_pct.toFixed(0)}% across ${total} matched races`;
  return {
    score,
    suggested_by: "auto",
    confidence,
    reasoning,
    sub_checks: {
      section_match_pct: Number(section_match_pct.toFixed(2)),
      vote_for_n_match_pct: Number(vote_for_n_match_pct.toFixed(2)),
      placeholder_count_match_pct: Number(placeholder_count_match_pct.toFixed(2)),
      party_context_exact_match_pct: Number(party_context_exact_match_pct.toFixed(2)),
    },
  };
}

// ---------- criterion 4: non-ballot filtering (heuristic) ----------

type Crit4Result = {
  score: 0 | 1 | 2;
  suggested_by: "auto";
  confidence: "high" | "medium" | "low";
  extras: number;
  extra_office_keys: string[];
};

function scoreCriterion4(gt: Ballot, ex: Ballot, c1: Crit1Result): Crit4Result {
  const exRaces = flattenRaces(ex);
  const matchedExIndices = new Set(c1.matched_pairs.map((p) => p.ex_index));
  const extras = exRaces.length - matchedExIndices.size;
  const extra_office_keys: string[] = [];
  for (let i = 0; i < exRaces.length; i++) {
    if (!matchedExIndices.has(i)) {
      const k = raceKey(exRaces[i].race);
      extra_office_keys.push(`${k.office} (${k.party_context || "no_pc"})`);
    }
  }
  let score: 0 | 1 | 2;
  if (extras === 0) score = 2;
  else if (extras <= 2) score = 1;
  else score = 0;
  return {
    score,
    suggested_by: "auto",
    confidence: "high",
    extras,
    extra_office_keys,
  };
}

// ---------- criterion 8: bilingual handling (Hidalgo only, heuristic) ----------

type Crit8Result = {
  score: 0 | 1 | 2;
  suggested_by: "auto";
  confidence: "high" | "medium" | "low";
  reasoning: string;
  gt_race_count: number;
  ex_race_count: number;
  spanish_chars_detected: boolean;
};

function scoreCriterion8(gt: Ballot, ex: Ballot, fixture: string): Crit8Result | null {
  if (!fixture.startsWith("tx-hidalgo")) return null;
  const gtCount = flattenRaces(gt).length;
  const exCount = flattenRaces(ex).length;
  // Check for Spanish-specific characters in office names
  let spanish = false;
  const spanishRegex = /[ñáéíóúü¿¡èà]/i;
  for (const sec of ex.sections ?? []) {
    for (const r of sec.races ?? []) {
      if (r.office && spanishRegex.test(r.office)) {
        spanish = true;
        break;
      }
    }
    if (spanish) break;
  }
  // Duplication check: ex_count should be roughly ≤ gt_count (allow +1 slack
  // for legitimate disagreements). Hard fail if ex_count > gt_count * 1.5 →
  // strongly suggests each race got duplicated as English+Spanish.
  const ratio = gtCount === 0 ? 0 : exCount / gtCount;
  let score: 0 | 1 | 2;
  let reasoning: string;
  if (ratio > 1.5) {
    score = 0;
    reasoning = `ex_count=${exCount} > gt_count=${gtCount} * 1.5 — likely duplicated as English+Spanish`;
  } else if (spanish) {
    score = 1;
    reasoning = `Spanish characters detected in office names — possible leakage`;
  } else {
    score = 2;
    reasoning = `no duplication (ex=${exCount}, gt=${gtCount}), no Spanish leakage`;
  }
  return {
    score,
    suggested_by: "auto",
    confidence: "high",
    reasoning,
    gt_race_count: gtCount,
    ex_race_count: exCount,
    spanish_chars_detected: spanish,
  };
}

// ---------- cell scoring ----------

type Cell = {
  contender: string;
  fixture: string;
  weight: number;
  outcome: "scored" | "missing" | "skipped";
  ground_truth_path: string | null;
  extraction_path: string | null;
  metrics_path: string | null;
  criteria: {
    "1_race_coverage": Crit1Result | null;
    "2_candidate_completeness": Crit2Result | null;
    "3_structural_accuracy": Crit3Result | null;
    "4_non_ballot_filtering": Crit4Result | null;
    "5_schema_compliance": Crit5Result | null;
    "6_cost_usd": number | null;
    "7_latency_ms": number | null;
    "8_bilingual_handling": Crit8Result | null;
  };
  // Sum of scored criteria 1,2,3,4,5,8 (skip 6 & 7 per spec). Multiply by weight.
  weighted_total: number | null;
  max_possible_for_cell: number | null; // 2 * active_criteria * weight
  note?: string;
};

function scoreCell(contender: string, fixture: string): Cell {
  const weight = WEIGHTS[fixture] ?? 1;
  const fixtureStem = fixture.replace(/\.pdf$/i, "");
  const gtPath = join(GROUND_TRUTH_DIR, `${fixtureStem}.json`);
  const exPath = join(RESULTS_DIR, contender, `${fixtureStem}.json`);
  const metricsPath = join(RESULTS_DIR, contender, `${fixtureStem}.metrics.json`);

  const cell: Cell = {
    contender,
    fixture,
    weight,
    outcome: "scored",
    ground_truth_path: existsSync(gtPath) ? `ground-truth/${fixtureStem}.json` : null,
    extraction_path: existsSync(exPath) ? `results/${contender}/${fixtureStem}.json` : null,
    metrics_path: existsSync(metricsPath) ? `results/${contender}/${fixtureStem}.metrics.json` : null,
    criteria: {
      "1_race_coverage": null,
      "2_candidate_completeness": null,
      "3_structural_accuracy": null,
      "4_non_ballot_filtering": null,
      "5_schema_compliance": null,
      "6_cost_usd": null,
      "7_latency_ms": null,
      "8_bilingual_handling": null,
    },
    weighted_total: null,
    max_possible_for_cell: null,
  };

  // Skipped contender (01-textract-sonnet has no runs)
  if (contender === "01-textract-sonnet") {
    cell.outcome = "skipped";
    cell.note = "Contender skipped — no AWS credentials";
    return cell;
  }

  if (!cell.extraction_path) {
    cell.outcome = "missing";
    cell.note = "Extraction file missing";
    return cell;
  }
  if (!cell.ground_truth_path) {
    cell.outcome = "missing";
    cell.note = "Ground-truth file missing";
    return cell;
  }

  const gt = JSON.parse(readFileSync(gtPath, "utf8")) as Ballot;
  const ex = JSON.parse(readFileSync(exPath, "utf8")) as Ballot;

  const c1 = scoreCriterion1(gt, ex);
  const c2 = scoreCriterion2(gt, ex, c1);
  const c3 = scoreCriterion3(gt, ex, c1);
  const c4 = scoreCriterion4(gt, ex, c1);
  const c5 = scoreCriterion5(ex);
  const c8 = scoreCriterion8(gt, ex, fixture);

  cell.criteria["1_race_coverage"] = c1;
  cell.criteria["2_candidate_completeness"] = c2;
  cell.criteria["3_structural_accuracy"] = c3;
  cell.criteria["4_non_ballot_filtering"] = c4;
  cell.criteria["5_schema_compliance"] = c5;
  cell.criteria["8_bilingual_handling"] = c8;

  if (cell.metrics_path) {
    const m = JSON.parse(readFileSync(metricsPath, "utf8"));
    cell.criteria["6_cost_usd"] = m.cost_usd ?? null;
    cell.criteria["7_latency_ms"] = m.latency_ms ?? null;
  }

  // Weighted total = (c1.score + c2.score + c3.score + c4.score + c5.score [+ c8.score if active]) * weight
  const activeScores = [c1.score, c2.score, c3.score, c4.score, c5.score];
  let activeCount = 5;
  if (c8 !== null) {
    activeScores.push(c8.score);
    activeCount = 6;
  }
  const sum = activeScores.reduce((s, x) => s + x, 0);
  cell.weighted_total = sum * weight;
  cell.max_possible_for_cell = 2 * activeCount * weight;
  return cell;
}

// ---------- per-contender summary ----------

type ContenderSummary = {
  fixtures_scored: number;
  total_weighted_score: number;
  max_possible_weighted_score: number;
  score_pct: number;
  total_cost_usd: number;
  mean_latency_ms: number;
  p95_latency_ms: number;
  status?: string;
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function summarize(cells: Cell[], contender: string): ContenderSummary {
  const own = cells.filter((c) => c.contender === contender && c.outcome === "scored");
  if (own.length === 0) {
    return {
      fixtures_scored: 0,
      total_weighted_score: 0,
      max_possible_weighted_score: 0,
      score_pct: 0,
      total_cost_usd: 0,
      mean_latency_ms: 0,
      p95_latency_ms: 0,
      status: "SKIPPED — no AWS credentials",
    };
  }
  const total = own.reduce((s, c) => s + (c.weighted_total ?? 0), 0);
  const max = own.reduce((s, c) => s + (c.max_possible_for_cell ?? 0), 0);
  const totalCost = own.reduce((s, c) => s + (c.criteria["6_cost_usd"] ?? 0), 0);
  const latencies = own
    .map((c) => c.criteria["7_latency_ms"] ?? 0)
    .filter((x) => x > 0)
    .sort((a, b) => a - b);
  const meanLat = latencies.length === 0 ? 0 : latencies.reduce((s, x) => s + x, 0) / latencies.length;
  const p95Lat = percentile(latencies, 95);
  return {
    fixtures_scored: own.length,
    total_weighted_score: Number(total.toFixed(2)),
    max_possible_weighted_score: Number(max.toFixed(2)),
    score_pct: max === 0 ? 0 : Number(((total / max) * 100).toFixed(2)),
    total_cost_usd: Number(totalCost.toFixed(6)),
    mean_latency_ms: Math.round(meanLat),
    p95_latency_ms: Math.round(p95Lat),
  };
}

// ---------- main ----------

function main(): void {
  const cells: Cell[] = [];
  for (const contender of CONTENDERS) {
    for (const fixture of FIXTURES) {
      cells.push(scoreCell(contender, fixture));
    }
  }
  const summary: Record<string, ContenderSummary> = {};
  for (const c of CONTENDERS) summary[c] = summarize(cells, c);
  const out = {
    scored_at: new Date().toISOString(),
    rubric_version: "v1",
    judgment_calls: [
      "Race-match key: (normalized_office, normalized_district, normalized_position, party_context). District/position are part of the key with nullable wildcard semantics so 'State Representative district 35' does not collide with district 37 while still allowing GT-with-district vs EX-with-null cases to match.",
      "Office normalization: lowercase + strip punctuation + collapse whitespace. NO stripping of 'district'/'position' keywords — that previously caused 13th Court of Appeals to falsely match Supreme Court Justice.",
      "Office fuzzy match (criterion 1): exact equality OR substring (catches 'Sixth District Court of Appeal Judge' ⊂ 'Shall Judge X of the Sixth District Court of Appeal be retained') OR ≥80% token overlap of smaller-set's significant tokens (requires ≥3 sig tokens to avoid collapsing Amendment 1 vs Amendment 2). Office stopwords {of, the, and, for, in, on, at, to, a, an, or, be, is, shall, no, office}.",
      "District match: number-prefix or substring with nullable wildcard. Catches GT='206th Judicial District' vs EX='206'.",
      "party_context match: nullable wildcard. Both null → match, both equal → match, one null one non-null → match (e.g. GT null vs extraction 'Democratic Primary' on single-party ballots). Both non-null and different → no match (preserves NJ multi-party correctness). The structural disagreement on null-vs-explicit is penalized under criterion 3, not criterion 1.",
      "Candidate name match: Lev ≤ 2 OR substring after normalization OR shared token ≥ 4 chars (catches 'BOOKER' ⊂ 'Cory BOOKER' for C2 NJ which emits surnames only).",
      "Criterion 2 for unmatched races: counts as 0% candidate coverage for that race (not skipped) — consistent with spec line 197 read in context of 'extract everything' design intent.",
      "Placeholder candidates (write_in, no_petition_filed) match on placeholder_reason, not name.",
      "Criterion 3 sub-checks: section_match_pct, vote_for_n_match_pct, placeholder_count_match_pct, party_context_exact_match_pct — score 2 if all ≥95%, 1 if any ≥95%, 0 otherwise. Confidence: high if all-pass or all-fail; medium when partial (judgment territory).",
      "Criterion 3 includes an explicit party_context_exact_match sub-check that penalizes single-party ballots over-tagged with 'Democratic Primary' instead of null (per design schema: single-party ballots → party_context=null; election_type carries the info).",
      "Criterion 4 (non-ballot filtering): extras = (extraction races that didn't match any GT race using the same fuzzy matcher). Note: an extra is NOT proof of non-ballot content — it could be a wrong district number that genuinely should match (e.g., C2 FL Orange Senator district 21 ≠ GT district 25, which is the contender mis-extracting, not adding non-ballot content). Score 0 (3+ extras) still reasonable here since 3+ extras indicates systemic issue.",
      "Schema validation: hand-rolled; ajv not in deps.",
    ],
    weights: WEIGHTS,
    cells,
    per_contender_summary: summary,
  };
  const outPath = join(RESULTS_DIR, "score-matrix.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  // brief console summary
  console.log(`Wrote ${outPath}`);
  for (const c of CONTENDERS) {
    const s = summary[c];
    if (s.status) {
      console.log(`  ${c}: ${s.status}`);
    } else {
      console.log(
        `  ${c}: scored ${s.fixtures_scored} fixtures, ${s.total_weighted_score}/${s.max_possible_weighted_score} (${s.score_pct}%), cost=$${s.total_cost_usd}, mean_latency=${s.mean_latency_ms}ms, p95=${s.p95_latency_ms}ms`,
      );
    }
  }
}

main();
