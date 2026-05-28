/**
 * raceDeriver — pure module that turns Google Civic API contest data (and any
 * fallback shape) into the `Race[]` array consumed by the workspace shell.
 *
 * Phase 3 owns this module. Phase 7 (printable PDF) and Phase 4 (candidate
 * cards) consume the same `Race` shape — keep this file synchronous and
 * dependency-free so consumers can use it in any environment.
 */

import { normalizeRaceLabel } from "./normalizeRaceLabel";

/** A single contest row from the Civic API or any equivalent source. */
export interface ContestLike {
  office: string;
  district?: string;
  type?: string;
  candidates: { name: string; party: string }[];
}

/** Input shape: anything that may have a `contests` array. */
export interface RaceDeriverInput {
  contests?: ContestLike[] | undefined;
}

/**
 * Sections used to group races on the rail and in the ballot pane.
 *
 * Stable order:
 *   Federal → State → County → Municipal → Judicial → Propositions →
 *   Constitutional Amendments → County Questions → Ballot Measures →
 *   Judicial Retention → Bond Measures → Local (catch-all)
 *
 * The first four (Federal/State/Propositions/Local) are the legacy buckets
 * that the Google Civic API path uses. The remaining names mirror the
 * extraction schema's `SectionName` so the structured-extraction path
 * (`extractionToRaces`) can preserve the source bucket without lossy
 * normalization. Renderers iterate by string, so widening this union does
 * not require WorkspaceRail / BallotPane changes.
 */
export type RaceSection =
  | "Federal"
  | "State"
  | "County"
  | "Municipal"
  | "Judicial"
  | "Propositions"
  | "Constitutional Amendments"
  | "County Questions"
  | "Ballot Measures"
  | "Judicial Retention"
  | "Bond Measures"
  | "Local";

export interface Race {
  /** Stable id derived from `office + district` so re-renders stay stable. */
  id: string;
  /** Section bucket — Federal / State / Propositions / Local. */
  section: RaceSection;
  /** Human-readable race label (the contest's `office` plus any district). */
  label: string;
  /** Whether the voter has committed a pick for this race. Always false from the deriver. */
  decided: boolean;
  /**
   * Candidate roster, propagated verbatim from the input ContestLike. The
   * chat path's race-deep-dive builder uses this to render its
   * `<ground_truth>` tag; the workspace pick CTA also uses it to surface
   * the default candidate. Empty for propositions (no candidates) and for
   * inputs that didn't supply a roster.
   */
  candidates: { name: string; party: string }[];
}

const SECTION_ORDER: RaceSection[] = [
  "Federal",
  "State",
  "County",
  "Municipal",
  "Judicial",
  "Propositions",
  "Constitutional Amendments",
  "County Questions",
  "Ballot Measures",
  "Judicial Retention",
  "Bond Measures",
  "Local",
];

// Patterns are case-insensitive and ordered by specificity.
//
// The bare "House of Representatives" pattern is anchored at start-of-string
// (after optional "Member of the ") so state-prefixed forms like
// "Texas House of Representatives" don't match. PR #55 added a label
// normalizer that maps the bare form to "U.S. House" for display, but
// Civic API + several state PDF extractions emit the bare phrasing for the
// federal lower chamber — we want those classified Federal, not Local.
const FEDERAL_PATTERNS: RegExp[] = [
  /\bpresident\b/i,
  /\bu\.?\s?s\.?\s*(?:senate|senator|house|representative|congress)/i,
  /\bunited\s+states\s+(?:senate|senator|house|representative|congress)/i,
  /^(?:member of the )?house of representatives\b/i,
];

const STATE_PATTERNS: RegExp[] = [
  /\bgovernor\b/i,
  /\blieutenant\s+governor\b/i,
  /\bstate\s+(?:senate|senator|house|assembly|representative)\b/i,
  /\bsecretary\s+of\s+state\b/i,
  /\battorney\s+general\b/i,
  /\b(state\s+)?treasurer\b/i,
  /\b(state\s+)?comptroller\b/i,
  /\b(state\s+)?auditor\b/i,
  /\bsuperintendent\s+of\s+public\s+instruction\b/i,
];

// Specific ballot-measure types — check BEFORE the generic Proposition regex.
// "Constitutional Amendment 5" contains \bamendment\b which would otherwise
// pull it into Propositions; ditto "County Question 1" / \bquestion\b and
// "Bond Measure 4" / \bmeasure\b.
const CONSTITUTIONAL_AMENDMENT_PATTERNS: RegExp[] = [
  /\bconstitutional\s+amendment\b/i,
];

const COUNTY_QUESTION_PATTERNS: RegExp[] = [
  /^county\s+question\b/i,
  /^county\s+charter\s+amendment\b/i,
];

const BOND_MEASURE_PATTERNS: RegExp[] = [
  /^bond\s+measure\b/i,
  /^bond\s+issue\b/i,
];

// Judicial retention patterns — must check BEFORE Judicial so
// "Justice Smith retention" lands in the retention bucket.
const JUDICIAL_RETENTION_PATTERNS: RegExp[] = [
  /\bretention\b/i,
  /\bmerit\s+retention\b/i,
  /\bretain\s+(?:judge|justice)\b/i,
];

// Generic propositions and measures — checked AFTER the specific measure
// types above so "Constitutional Amendment", "County Question", "Bond
// Measure", and "Ballot Measure" land in their own buckets.
const PROPOSITION_PATTERNS: RegExp[] = [
  /\bproposition\b/i,
  /^prop\.?\s+\w+/i,
  /\b(?:ballot\s+)?measure\b/i,
  /\bamendment\b/i,
  /\bquestion\b/i,
  /\breferendum\b/i,
];

const JUDICIAL_PATTERNS: RegExp[] = [
  /\bjudge\b/i,
  /\bjustice\b/i,
  /\bcourt\b/i,
  /\bmagistrate\b/i,
];

const COUNTY_PATTERNS: RegExp[] = [
  /\bcounty\s+commissioner/i,
  /\bcounty\s+judge\b/i,
  /\bsheriff\b/i,
  /\bdistrict\s+attorney\b/i,
];

const MUNICIPAL_PATTERNS: RegExp[] = [
  /\bmayor\b/i,
  /\bcity\s+council\b/i,
  /\balderman\b/i,
  /\btownship\b/i,
  /\bcommittee\b/i,
  /\bschool\s+board\b/i,
  /\bboard\s+of\s+education\b/i,
];

/**
 * Classify a race office string into a section bucket.
 *
 * Order is load-bearing — specific buckets check BEFORE generic ones:
 *   1. Constitutional Amendments / County Questions / Bond Measures /
 *      Judicial Retention — these contain words (amendment, question,
 *      measure, retention) that the broader Proposition / Judicial patterns
 *      would otherwise catch.
 *   2. Federal (President / US Senate / US House)
 *   3. State (Governor / state legislature / statewide constitutional offices)
 *   4. Propositions (anything that still looks like a ballot measure)
 *   5. Judicial (courts, judges, justices — after retention check)
 *   6. County (commissioners, sheriff, DA — after county-judge check above)
 *   7. Municipal (mayor, council, school board)
 *   8. Local (catch-all)
 *
 * Pure / synchronous / no allocations beyond the regex.
 */
export function classifyRaceSection(office: string): RaceSection {
  const text = office ?? "";

  // Specific measure buckets first.
  if (CONSTITUTIONAL_AMENDMENT_PATTERNS.some((re) => re.test(text))) {
    return "Constitutional Amendments";
  }
  if (COUNTY_QUESTION_PATTERNS.some((re) => re.test(text))) {
    return "County Questions";
  }
  if (BOND_MEASURE_PATTERNS.some((re) => re.test(text))) return "Bond Measures";
  if (JUDICIAL_RETENTION_PATTERNS.some((re) => re.test(text))) {
    return "Judicial Retention";
  }

  if (FEDERAL_PATTERNS.some((re) => re.test(text))) return "Federal";
  if (STATE_PATTERNS.some((re) => re.test(text))) return "State";

  if (PROPOSITION_PATTERNS.some((re) => re.test(text))) return "Propositions";
  if (JUDICIAL_PATTERNS.some((re) => re.test(text))) return "Judicial";
  if (COUNTY_PATTERNS.some((re) => re.test(text))) return "County";
  if (MUNICIPAL_PATTERNS.some((re) => re.test(text))) return "Municipal";
  return "Local";
}

/**
 * Derive `Race[]` from a contests array. Output races are grouped in section
 * order (Federal → State → Propositions → Local); within a section the input
 * order is preserved.
 *
 * Stability rule: the same input produces the same `id` strings every call,
 * so React reconciliation and localStorage keys stay coherent.
 */
export function deriveRaces(input: RaceDeriverInput | null): Race[] {
  const contests = input?.contests;
  if (!contests || contests.length === 0) return [];

  const raw: Race[] = contests.map((c) => {
    const office = (c.office ?? "").trim();
    const district = (c.district ?? "").trim();
    // Canonical short labels for the rail + ballot pane. Raw office and
    // district are NOT mutated here — they're still owned by the input
    // contest and propagate into downstream prompt construction via the
    // unchanged ChatPanel codepath.
    const label = normalizeRaceLabel(office, district);
    const id = makeRaceId(office, district);
    // Propagate the candidate roster verbatim. Empty array for propositions
    // and any input that didn't supply candidates — downstream consumers
    // can treat the field as load-bearing without optional-chaining.
    const candidates = Array.isArray(c.candidates) ? c.candidates : [];
    return {
      id,
      section: classifyRaceSection(office),
      label,
      decided: false,
      candidates,
    };
  });

  // Group by section in stable order.
  const grouped: Race[] = [];
  for (const section of SECTION_ORDER) {
    for (const race of raw) {
      if (race.section === section) grouped.push(race);
    }
  }
  return grouped;
}

/**
 * Build a stable id from office + district. Lowercased, whitespace-collapsed,
 * non-alphanumerics dropped. Intentionally not a hash so debugging shows what
 * the id refers to.
 *
 * Exported so `extractionToRaces` (the structured-extraction bridge) can
 * derive ids consistent with this module — same office + district produces
 * the same id whether the contest came from Civic or from `/api/extract-ballot`.
 */
export function makeRaceId(office: string, district: string): string {
  const raw = `${office} ${district}`.toLowerCase().trim();
  const slug = raw.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "race";
}
