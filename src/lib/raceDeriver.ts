/**
 * raceDeriver — pure module that turns Google Civic API contest data (and any
 * fallback shape) into the `Race[]` array consumed by the workspace shell.
 *
 * Phase 3 owns this module. Phase 7 (printable PDF) and Phase 4 (candidate
 * cards) consume the same `Race` shape — keep this file synchronous and
 * dependency-free so consumers can use it in any environment.
 */

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
 * Sections used to group races on the rail and in the ballot pane. Stable
 * order: Federal → State → Propositions → Local.
 */
export type RaceSection = "Federal" | "State" | "Propositions" | "Local";

export interface Race {
  /** Stable id derived from `office + district` so re-renders stay stable. */
  id: string;
  /** Section bucket — Federal / State / Propositions / Local. */
  section: RaceSection;
  /** Human-readable race label (the contest's `office` plus any district). */
  label: string;
  /** Whether the voter has committed a pick for this race. Always false from the deriver. */
  decided: boolean;
}

const SECTION_ORDER: RaceSection[] = [
  "Federal",
  "State",
  "Propositions",
  "Local",
];

// Patterns are case-insensitive and ordered by specificity.
const FEDERAL_PATTERNS: RegExp[] = [
  /\bpresident\b/i,
  /\bu\.?\s?s\.?\s*(?:senate|senator|house|representative|congress)/i,
  /\bunited\s+states\s+(?:senate|senator|house|representative|congress)/i,
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

const PROPOSITION_PATTERNS: RegExp[] = [
  /\bproposition\b/i,
  /\bmeasure\b/i,
  /\bamendment\b/i,
  /\bquestion\b/i,
  /\breferendum\b/i,
];

/**
 * Classify a race office string into a section bucket. The order is:
 *   1. Federal (President / US Senate / US House)
 *   2. State (Governor / state legislature / statewide constitutional offices)
 *   3. Propositions (anything that looks like a ballot measure)
 *   4. Local (everything else)
 *
 * Pure / synchronous / no allocations beyond the regex.
 */
export function classifyRaceSection(office: string): RaceSection {
  const text = office ?? "";
  if (FEDERAL_PATTERNS.some((re) => re.test(text))) return "Federal";
  if (STATE_PATTERNS.some((re) => re.test(text))) return "State";
  if (PROPOSITION_PATTERNS.some((re) => re.test(text))) return "Propositions";
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
    const label = district ? `${office} — ${district}` : office;
    const id = makeRaceId(office, district);
    return {
      id,
      section: classifyRaceSection(office),
      label,
      decided: false,
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
 */
function makeRaceId(office: string, district: string): string {
  const raw = `${office} ${district}`.toLowerCase().trim();
  const slug = raw.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "race";
}
